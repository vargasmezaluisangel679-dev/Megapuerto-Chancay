import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response } from 'express';

dotenv.config();

type CommentCategory = 'Comentario' | 'Sugerencia de mejora' | 'Corrección de información';
type CommentStatus = 'pending' | 'approved' | 'rejected' | 'removed';

interface StoredComment {
  id: string;
  category: CommentCategory;
  authorName: string;
  message: string;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  reportsCount: number;
  reportReasons: string[];
}

interface CommunityStore {
  likesCount: number;
  likedVisitorHashes: string[];
  comments: StoredComment[];
}

const PORT = Number(process.env.PORT || 3000);
const DATA_PATH = process.env.COMMUNITY_DATA_PATH
  ? path.resolve(process.env.COMMUNITY_DATA_PATH)
  : path.join(process.cwd(), 'data', 'community-store.json');
const BACKUP_PATH = `${DATA_PATH}.bak`;

const ALLOWED_CATEGORIES: CommentCategory[] = [
  'Comentario',
  'Sugerencia de mejora',
  'Corrección de información',
];

// Simple in-memory rate limit maps (per IP)
const commentRateMap = new Map<string, number[]>();
const likeRateMap = new Map<string, number[]>();
const reportRateMap = new Map<string, number[]>();
const authFailMap = new Map<string, { count: number; blockedUntil: number }>();

let writeQueue: Promise<void> = Promise.resolve();

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function hashVisitorKey(visitorId: string, ip: string): string {
  const raw = visitorId ? `vid:${visitorId}` : `ip:${ip}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
}

function checkRateLimit(
  map: Map<string, number[]>,
  key: string,
  maxHits: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const recent = (map.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= maxHits) {
    map.set(key, recent);
    return false;
  }
  recent.push(now);
  map.set(key, recent);
  return true;
}

function sanitizePlainText(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasSpamPatterns(text: string): boolean {
  const urlMatches = text.match(/https?:\/\/|www\./gi);
  if (urlMatches && urlMatches.length > 2) return true;
  if (/javascript:|data:text\/html|onerror=|onload=/i.test(text)) return true;
  return false;
}

function normalizeStore(parsed: Partial<CommunityStore>): CommunityStore {
  const uniqueHashes = Array.isArray(parsed.likedVisitorHashes)
    ? Array.from(
        new Set(
          parsed.likedVisitorHashes.filter(
            (v): v is string => typeof v === 'string' && v.trim().length > 0
          )
        )
      )
    : [];

  return {
    likesCount: uniqueHashes.length,
    likedVisitorHashes: uniqueHashes,
    comments: Array.isArray(parsed.comments) ? parsed.comments : [],
  };
}

function isEnoentError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: string }).code === 'ENOENT'
  );
}

async function readStoreFile(filePath: string): Promise<CommunityStore> {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as Partial<CommunityStore>;
  return normalizeStore(parsed);
}

async function readStore(): Promise<CommunityStore> {
  try {
    return await readStoreFile(DATA_PATH);
  } catch (primaryErr) {
    try {
      const restored = await readStoreFile(BACKUP_PATH);
      console.warn(
        `[community-store] Recuperado desde respaldo (${BACKUP_PATH}) tras error en archivo principal.`
      );
      return restored;
    } catch (backupErr) {
      if (isEnoentError(primaryErr) && isEnoentError(backupErr)) {
        return {
          likesCount: 0,
          likedVisitorHashes: [],
          comments: [],
        };
      }
      console.error('[community-store] Error crítico al leer persistencia:', primaryErr);
      throw primaryErr;
    }
  }
}

async function writeAtomicJson(targetPath: string, payload: string): Promise<void> {
  const tmpPath = `${targetPath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmpPath, payload, 'utf8');
  await fs.rename(tmpPath, targetPath);
}

async function mutateStore<T>(fn: (store: CommunityStore) => T): Promise<T> {
  const run = writeQueue.then(async () => {
    const store = await readStore();
    const result = fn(store);
    store.likedVisitorHashes = Array.from(new Set(store.likedVisitorHashes));
    store.likesCount = store.likedVisitorHashes.length;
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    const serialized = JSON.stringify(store, null, 2);
    await writeAtomicJson(DATA_PATH, serialized);
    await writeAtomicJson(BACKUP_PATH, serialized).catch((bakErr) => {
      console.warn('[community-store] No se pudo actualizar archivo de respaldo:', bakErr);
    });
    return result;
  });
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function verifyAdminToken(req: Request, res: Response): boolean {
  const configuredToken = process.env.ADMIN_MODERATION_TOKEN?.trim();
  if (!configuredToken) {
    res.status(503).json({
      error:
        'La moderación protegida aún no está habilitada: falta configurar ADMIN_MODERATION_TOKEN en las variables de entorno del servidor.',
      configMissing: true,
    });
    return false;
  }

  const ip = getClientIp(req);
  const failState = authFailMap.get(ip);
  if (failState && failState.blockedUntil > Date.now()) {
    res.status(429).json({
      error: 'Demasiados intentos fallidos de acceso. Intenta nuevamente en unos minutos.',
    });
    return false;
  }

  const headerToken =
    (typeof req.headers['x-admin-token'] === 'string' && req.headers['x-admin-token']) ||
    (typeof req.headers.authorization === 'string' &&
    req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : '');

  const candidateBuf = Buffer.from(headerToken.trim(), 'utf8');
  const expectedBuf = Buffer.from(configuredToken, 'utf8');

  const isMatch =
    candidateBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(candidateBuf, expectedBuf);

  if (!isMatch) {
    const nextCount = (failState?.count || 0) + 1;
    authFailMap.set(ip, {
      count: nextCount,
      blockedUntil: nextCount >= 5 ? Date.now() + 5 * 60 * 1000 : 0,
    });
    res.status(401).json({ error: 'Token de moderación inválido o ausente.' });
    return false;
  }

  authFailMap.delete(ip);
  return true;
}

async function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      persistenceMode: 'server-json',
      moderationConfigured: Boolean(process.env.ADMIN_MODERATION_TOKEN?.trim()),
    });
  });

  // Public summary: real shared likes + paginated approved comments ONLY
  app.get('/api/community/summary', async (req, res) => {
    try {
      const store = await readStore();
      const ip = getClientIp(req);
      const rawVisitorId =
        typeof req.headers['x-visitor-id'] === 'string'
          ? req.headers['x-visitor-id'].slice(0, 64)
          : '';
      const visitorHash = rawVisitorId ? hashVisitorKey(rawVisitorId, ip) : '';

      const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
      const pageSize = Math.min(
        20,
        Math.max(1, Number.parseInt(String(req.query.pageSize || '6'), 10) || 6)
      );

      const approved = store.comments
        .filter((c) => c.status === 'approved')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const start = (page - 1) * pageSize;
      const items = approved.slice(start, start + pageSize).map((c) => ({
        id: c.id,
        category: c.category,
        authorName: c.authorName,
        message: c.message,
        createdAt: c.createdAt,
        reportsCount: c.reportsCount,
      }));

      res.json({
        likesCount: store.likesCount,
        likedByVisitor: visitorHash ? store.likedVisitorHashes.includes(visitorHash) : false,
        comments: items,
        totalApproved: approved.length,
        page,
        pageSize,
        hasMore: start + pageSize < approved.length,
        persistenceMode: 'server-json',
        moderationConfigured: Boolean(process.env.ADMIN_MODERATION_TOKEN?.trim()),
      });
    } catch {
      res.status(500).json({ error: 'No se pudo consultar el estado público de opiniones.' });
    }
  });

  // Like / unlike reaction endpoint
  app.post('/api/community/like', async (req, res) => {
    const ip = getClientIp(req);
    const rawVisitorId =
      typeof req.headers['x-visitor-id'] === 'string'
        ? req.headers['x-visitor-id'].slice(0, 64)
        : '';

    if (!rawVisitorId || !/^[a-zA-Z0-9_-]{8,64}$/.test(rawVisitorId)) {
      res.status(400).json({ error: 'Identificador de sesión de navegador inválido.' });
      return;
    }

    if (!checkRateLimit(likeRateMap, `${ip}:${rawVisitorId}`, 20, 60 * 1000)) {
      res.status(429).json({ error: 'Demasiadas pulsaciones seguidas. Espera unos segundos.' });
      return;
    }

    const action = req.body?.action;
    if (action !== 'like' && action !== 'unlike' && action !== 'toggle') {
      res.status(400).json({ error: 'Acción de reacción no válida.' });
      return;
    }

    const visitorHash = hashVisitorKey(rawVisitorId, ip);

    try {
      const updated = await mutateStore((store) => {
        const idx = store.likedVisitorHashes.indexOf(visitorHash);
        const alreadyLiked = idx !== -1;

        const wantLike =
          action === 'like' ? true : action === 'unlike' ? false : !alreadyLiked;

        if (wantLike && !alreadyLiked) {
          store.likedVisitorHashes.push(visitorHash);
        } else if (!wantLike && alreadyLiked) {
          store.likedVisitorHashes.splice(idx, 1);
        }
        store.likedVisitorHashes = Array.from(new Set(store.likedVisitorHashes));
        store.likesCount = store.likedVisitorHashes.length;

        return {
          likesCount: store.likesCount,
          likedByVisitor: wantLike,
        };
      });

      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Error interno al registrar la reacción.' });
    }
  });

  // Submit new comment (always starts in 'pending' status)
  app.post('/api/community/comments', async (req, res) => {
    const ip = getClientIp(req);

    // Anti-spam honeypot check
    if (typeof req.body?.honeypot === 'string' && req.body.honeypot.trim().length > 0) {
      res.status(400).json({ error: 'Solicitud rechazada por validación anti-spam.' });
      return;
    }

    if (!checkRateLimit(commentRateMap, ip, 3, 10 * 60 * 1000)) {
      res.status(429).json({
        error: 'Límite de frecuencia alcanzado (máximo 3 envíos cada 10 minutos).',
      });
      return;
    }

    const rawCategory = req.body?.category;
    if (!ALLOWED_CATEGORIES.includes(rawCategory)) {
      res.status(400).json({ error: 'Categoría de aporte no válida.' });
      return;
    }

    const rawAuthor = typeof req.body?.authorName === 'string' ? req.body.authorName : '';
    const cleanAuthor = sanitizePlainText(rawAuthor).slice(0, 50) || 'Visitante';

    const rawMessage = typeof req.body?.message === 'string' ? req.body.message : '';
    const cleanMessage = sanitizePlainText(rawMessage);

    if (cleanMessage.length < 10 || cleanMessage.length > 500) {
      res.status(400).json({
        error: 'El mensaje debe tener entre 10 y 500 caracteres válidos.',
      });
      return;
    }

    if (hasSpamPatterns(cleanMessage) || hasSpamPatterns(cleanAuthor)) {
      res.status(400).json({
        error: 'El texto contiene patrones o exceso de enlaces no permitidos.',
      });
      return;
    }

    try {
      const created = await mutateStore((store) => {
        // Prevent immediate duplicate spam message
        const duplicate = store.comments.some(
          (c) =>
            c.message.toLowerCase() === cleanMessage.toLowerCase() &&
            Date.now() - Date.parse(c.createdAt) < 24 * 60 * 60 * 1000
        );
        if (duplicate) {
          return { duplicate: true as const };
        }

        const now = new Date().toISOString();
        const entry: StoredComment = {
          id: crypto.randomUUID(),
          category: rawCategory,
          authorName: cleanAuthor,
          message: cleanMessage,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
          reportsCount: 0,
          reportReasons: [],
        };
        store.comments.push(entry);
        return { duplicate: false as const, id: entry.id, status: entry.status };
      });

      if (created.duplicate) {
        res.status(409).json({ error: 'Ya existe un envío idéntico reciente en revisión.' });
        return;
      }

      res.status(201).json({
        ok: true,
        id: created.id,
        status: 'pending',
        message:
          'Comentario recibido correctamente. Permanecerá en estado pendiente hasta ser aprobado por moderación.',
      });
    } catch {
      res.status(500).json({ error: 'No se pudo guardar el comentario en el servidor.' });
    }
  });

  // Report an already approved comment
  app.post('/api/community/comments/:id/report', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(reportRateMap, ip, 5, 10 * 60 * 1000)) {
      res.status(429).json({ error: 'Demasiados reportes enviados en poco tiempo.' });
      return;
    }

    const id = req.params.id;
    const reason = sanitizePlainText(
      typeof req.body?.reason === 'string' ? req.body.reason : ''
    ).slice(0, 180);

    if (reason.length < 4) {
      res.status(400).json({ error: 'Indica brevemente el motivo del reporte (mín. 4 caracteres).' });
      return;
    }

    try {
      const outcome = await mutateStore((store) => {
        const target = store.comments.find((c) => c.id === id && c.status === 'approved');
        if (!target) return null;
        target.reportsCount += 1;
        if (target.reportReasons.length < 15) {
          target.reportReasons.push(reason);
        }
        target.updatedAt = new Date().toISOString();
        return { reportsCount: target.reportsCount };
      });

      if (!outcome) {
        res.status(404).json({ error: 'Comentario publicado no encontrado.' });
        return;
      }

      res.json({
        ok: true,
        reportsCount: outcome.reportsCount,
        message: 'Reporte registrado para revisión de moderación.',
      });
    } catch {
      res.status(500).json({ error: 'No se pudo registrar el reporte.' });
    }
  });

  // Protected Moderation Routes
  app.post('/api/moderation/verify', (req, res) => {
    if (!verifyAdminToken(req, res)) return;
    res.json({ ok: true });
  });

  app.get('/api/moderation/comments', async (req, res) => {
    if (!verifyAdminToken(req, res)) return;
    try {
      const store = await readStore();
      const sorted = [...store.comments].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      res.json({
        likesCount: store.likesCount,
        comments: sorted,
      });
    } catch {
      res.status(500).json({ error: 'No se pudo leer la cola de moderación.' });
    }
  });

  app.post('/api/moderation/comments/:id/status', async (req, res) => {
    if (!verifyAdminToken(req, res)) return;

    const id = req.params.id;
    const nextStatus = req.body?.status as CommentStatus;
    if (
      nextStatus !== 'approved' &&
      nextStatus !== 'rejected' &&
      nextStatus !== 'removed'
    ) {
      res.status(400).json({ error: 'Estado de moderación inválido.' });
      return;
    }

    try {
      const updated = await mutateStore((store) => {
        const target = store.comments.find((c) => c.id === id);
        if (!target) return null;
        target.status = nextStatus;
        target.updatedAt = new Date().toISOString();
        return target;
      });

      if (!updated) {
        res.status(404).json({ error: 'Comentario no encontrado.' });
        return;
      }

      res.json({ ok: true, comment: updated });
    } catch {
      res.status(500).json({ error: 'No se pudo actualizar el estado del comentario.' });
    }
  });

  // Vite middleware in dev vs static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Megapuerto de Chancay activo en http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
