import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Flag,
  Heart,
  Lock,
  MessageSquarePlus,
  RefreshCw,
  ShieldCheck,
  ThumbsUp,
} from 'lucide-react';
import {
  CommentCategory,
  CommentStatus,
  CommunitySummaryResponse,
  ModerationComment,
  PublicComment,
} from '../types/port';

const VISITOR_STORAGE_KEY = 'chancay_visitor_id';
const PAGE_SIZE = 6;

const COMMENT_CATEGORIES: CommentCategory[] = [
  'Comentario',
  'Sugerencia de mejora',
  'Corrección de información',
];

function getOrCreateVisitorId(): string {
  const isValid = (val: string | null): val is string =>
    Boolean(val && /^[a-zA-Z0-9_-]{8,64}$/.test(val));

  try {
    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (isValid(existing)) {
      return existing;
    }
  } catch {
    // localStorage can be blocked in strict third-party iframe modes
  }

  try {
    const sessionExisting = window.sessionStorage.getItem(VISITOR_STORAGE_KEY);
    if (isValid(sessionExisting)) {
      return sessionExisting;
    }
  } catch {
    // ignore sessionStorage access error
  }

  const generated =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID().replace(/-/g, '')
      : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

  try {
    window.localStorage.setItem(VISITOR_STORAGE_KEY, generated);
  } catch {
    // fallback below
  }
  try {
    window.sessionStorage.setItem(VISITOR_STORAGE_KEY, generated);
  } catch {
    // fallback only in memory
  }
  return generated;
}

function formatDatePE(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export const CommunityFeedbackSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activated, setActivated] = useState(false);

  const [visitorId] = useState<string>(() =>
    typeof window !== 'undefined' ? getOrCreateVisitorId() : 'server_ssr'
  );

  // Public community state (loaded strictly from server)
  const [hasLoadedSummary, setHasLoadedSummary] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [likedByVisitor, setLikedByVisitor] = useState<boolean>(false);
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [totalApproved, setTotalApproved] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [moderationConfigured, setModerationConfigured] = useState<boolean>(true);

  // Like request state
  const [likeBusy, setLikeBusy] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  // Comment form state
  const [category, setCategory] = useState<CommentCategory>('Comentario');
  const [asVisitor, setAsVisitor] = useState<boolean>(false);
  const [authorName, setAuthorName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [honeypot, setHoneypot] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Report inline state
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportBusy, setReportBusy] = useState<boolean>(false);
  const [reportFeedback, setReportFeedback] = useState<{
    id: string;
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Discreet protected moderation panel (token kept strictly in React state)
  const [moderationOpen, setModerationOpen] = useState(false);
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [activeAdminToken, setActiveAdminToken] = useState<string | null>(null);
  const [modLoading, setModLoading] = useState(false);
  const [modError, setModError] = useState<string | null>(null);
  const [modComments, setModComments] = useState<ModerationComment[]>([]);
  const [modFilter, setModFilter] = useState<'all' | CommentStatus>('pending');

  // Activate prompt initial fetch + intersection trigger
  useEffect(() => {
    if (activated) return;
    const node = sectionRef.current;

    const timer = window.setTimeout(() => {
      setActivated(true);
    }, 250);

    if (!node || typeof IntersectionObserver === 'undefined') {
      setActivated(true);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActivated(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(node);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [activated]);

  const fetchSummaryPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingSummary(true);
      }
      setSummaryError(null);

      try {
        const res = await fetch(
          `/api/community/summary?page=${targetPage}&pageSize=${PAGE_SIZE}`,
          {
            cache: 'no-store',
            headers: {
              'x-visitor-id': visitorId,
            },
          }
        );

        const data = (await res.json()) as CommunitySummaryResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo cargar la sección de opiniones.');
        }

        setLikesCount(data.likesCount);
        setLikedByVisitor(data.likedByVisitor);
        setTotalApproved(data.totalApproved);
        setHasMore(data.hasMore);
        setPage(data.page);
        setModerationConfigured(data.moderationConfigured);
        setHasLoadedSummary(true);
        setComments((prev) => (append ? [...prev, ...data.comments] : data.comments));
      } catch (err) {
        setSummaryError(
          err instanceof Error
            ? err.message
            : 'No fue posible conectar con el servicio de opiniones.'
        );
      } finally {
        setLoadingSummary(false);
        setLoadingMore(false);
      }
    },
    [visitorId]
  );

  useEffect(() => {
    if (activated) {
      void fetchSummaryPage(1, false);
    }
  }, [activated, fetchSummaryPage]);

  // Re-sync if browser restores page from bfcache
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void fetchSummaryPage(1, false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [fetchSummaryPage]);

  const handleToggleLike = async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    setLikeError(null);

    try {
      const action = likedByVisitor ? 'unlike' : 'like';
      const res = await fetch('/api/community/like', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'x-visitor-id': visitorId,
        },
        body: JSON.stringify({ action }),
      });

      const data = (await res.json()) as {
        likesCount?: number;
        likedByVisitor?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar tu reacción.');
      }

      if (typeof data.likesCount === 'number') setLikesCount(data.likesCount);
      if (typeof data.likedByVisitor === 'boolean') setLikedByVisitor(data.likedByVisitor);
    } catch (err) {
      setLikeError(
        err instanceof Error ? err.message : 'Error al registrar tu reacción.'
      );
    } finally {
      setLikeBusy(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitError(null);
    setSubmitSuccess(null);

    const trimmedMsg = message.trim();
    if (trimmedMsg.length < 10) {
      setSubmitError('El mensaje debe tener al menos 10 caracteres.');
      return;
    }
    if (trimmedMsg.length > 500) {
      setSubmitError('El mensaje excede el límite máximo de 500 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          authorName: asVisitor ? 'Visitante' : authorName.trim(),
          message: trimmedMsg,
          honeypot,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo enviar el comentario.');
      }

      setMessage('');
      if (!asVisitor) setAuthorName('');
      setSubmitSuccess(
        data.message ||
          'Tu aporte fue enviado y permanecerá en estado pendiente hasta su aprobación por moderación.'
      );

      // Refresh moderation list if moderator session is currently active
      if (activeAdminToken) {
        void loadModerationQueue(activeAdminToken);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Error al enviar el comentario.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReport = async (commentId: string) => {
    if (reportBusy) return;
    const cleanReason = reportReason.trim();
    if (cleanReason.length < 4) {
      setReportFeedback({
        id: commentId,
        type: 'err',
        text: 'Describe brevemente el motivo (mínimo 4 caracteres).',
      });
      return;
    }

    setReportBusy(true);
    setReportFeedback(null);

    try {
      const res = await fetch(`/api/community/comments/${commentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cleanReason }),
      });
      const data = (await res.json()) as {
        reportsCount?: number;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo registrar el reporte.');
      }

      setReportingId(null);
      setReportReason('');
      setReportFeedback({
        id: commentId,
        type: 'ok',
        text: data.message || 'Reporte enviado para revisión.',
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId && typeof data.reportsCount === 'number'
            ? { ...c, reportsCount: data.reportsCount }
            : c
        )
      );
    } catch (err) {
      setReportFeedback({
        id: commentId,
        type: 'err',
        text: err instanceof Error ? err.message : 'Error al reportar comentario.',
      });
    } finally {
      setReportBusy(false);
    }
  };

  const loadModerationQueue = useCallback(async (token: string) => {
    setModLoading(true);
    setModError(null);
    try {
      const res = await fetch('/api/moderation/comments', {
        cache: 'no-store',
        headers: { 'x-admin-token': token },
      });
      const data = (await res.json()) as {
        comments?: ModerationComment[];
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 401) {
          setActiveAdminToken(null);
        }
        throw new Error(data.error || 'No autorizado para acceder a moderación.');
      }
      setActiveAdminToken(token);
      setModComments(data.comments || []);
    } catch (err) {
      setModError(err instanceof Error ? err.message : 'Error al cargar moderación.');
    } finally {
      setModLoading(false);
    }
  }, []);

  const handleModerationAction = async (
    commentId: string,
    status: 'approved' | 'rejected' | 'removed'
  ) => {
    if (!activeAdminToken) return;
    setModError(null);
    try {
      const res = await fetch(`/api/moderation/comments/${commentId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': activeAdminToken,
        },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar el estado.');
      }
      await loadModerationQueue(activeAdminToken);
      await fetchSummaryPage(1, false);
    } catch (err) {
      setModError(err instanceof Error ? err.message : 'Error de moderación.');
    }
  };

  const filteredModComments = modComments.filter((c) =>
    modFilter === 'all' ? true : c.status === modFilter
  );

  const handleExportModerationCsv = () => {
    const escapeCsv = (val: string | number) =>
      `"${String(val).replace(/"/g, '""')}"`;
    const headers = ['id', 'fecha', 'autor', 'categoria', 'estado', 'reportes', 'mensaje'];
    const rows = filteredModComments.map((c) =>
      [
        escapeCsv(c.id),
        escapeCsv(c.createdAt),
        escapeCsv(c.authorName),
        escapeCsv(c.category),
        escapeCsv(c.status),
        escapeCsv(c.reportsCount),
        escapeCsv(c.message),
      ].join(',')
    );
    const csv = `\uFEFF${headers.join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chancay-comentarios-${modFilter}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      ref={sectionRef}
      id="opiniones"
      className="border-t border-slate-200 bg-[#F6F8FB] py-14"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        {/* Header */}
        <div className="border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2A5C82]">
            Sección H · Participación y Mejora Continua
          </p>
          <h2 className="font-display mt-1 text-2xl font-bold text-[#0A192F] sm:text-3xl">
            Opiniones y sugerencias
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Espacio abierto para que visitantes, docentes y estudiantes valoren la maqueta digital
            educativa, propongan mejoras o reporten correcciones documentales sin requerir registro
            previo.
          </p>
        </div>

        {/* Main 2-column layout */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* Left: Like button + Comment Form */}
          <div className="space-y-6 lg:col-span-5">
            {/* Public Reaction Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-bold text-[#0A192F]">
                    Valoración del recurso
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Reacciones reales compartidas en el servidor.
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-mono-tech text-2xl font-bold text-[#0A192F]">
                    {hasLoadedSummary ? likesCount : '—'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {likesCount === 1 ? 'Me gusta' : 'Me gusta totales'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  aria-pressed={likedByVisitor}
                  disabled={likeBusy || loadingSummary}
                  onClick={handleToggleLike}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 ${
                    likedByVisitor
                      ? 'border-[#C83228] bg-[#C83228] text-white hover:bg-[#A92820]'
                      : 'border-slate-300 bg-slate-50 text-[#0A192F] hover:bg-slate-100'
                  }`}
                >
                  {likedByVisitor ? (
                    <>
                      <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
                      <span>Te gusta (retirar)</span>
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                      <span>Me gusta</span>
                    </>
                  )}
                </button>
              </div>

              {likeError && (
                <p role="alert" className="mt-3 text-xs font-medium text-[#C83228]">
                  {likeError}
                </p>
              )}

              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Nota técnica: Para evitar registro obligatorio o solicitud de correo electrónico, se
                asocia una reacción por identificador de sesión del navegador en el servidor. Puedes
                retirar tu «Me gusta» en cualquier momento.
              </p>
            </div>

            {/* Brief Comment Form */}
            <form
              onSubmit={handleSubmitComment}
              className="rounded-xl border border-slate-200 bg-white p-5"
              noValidate
            >
              <h3 className="font-display flex items-center gap-2 text-base font-bold text-[#0A192F]">
                <MessageSquarePlus className="h-4 w-4 text-[#2A5C82]" aria-hidden="true" />
                Enviar comentario o corrección
              </h3>

              {/* Category */}
              <div className="mt-4">
                <label
                  htmlFor="feedback-category"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Categoría
                </label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CommentCategory)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2A5C82] focus:outline-none"
                >
                  {COMMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Public Name or Visitante */}
              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="feedback-author"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Nombre público (opcional)
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={asVisitor}
                      onChange={(e) => setAsVisitor(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#0A192F]"
                    />
                    <span>Publicar como «Visitante»</span>
                  </label>
                </div>
                <input
                  id="feedback-author"
                  type="text"
                  maxLength={50}
                  disabled={asVisitor}
                  value={asVisitor ? 'Visitante' : authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Ej. Estudiante de Ingeniería Civil (o dejar vacío)"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:border-[#2A5C82] focus:outline-none"
                />
              </div>

              {/* Message with live char counter */}
              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="feedback-message"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Mensaje
                  </label>
                  <span
                    className={`font-mono-tech text-[11px] ${
                      message.length > 500
                        ? 'font-bold text-[#C83228]'
                        : 'text-slate-500'
                    }`}
                  >
                    {message.length} / 500 caracteres
                  </span>
                </div>
                <textarea
                  id="feedback-message"
                  rows={4}
                  minLength={10}
                  maxLength={500}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Comparte una observación técnica, sugerencia sobre la maqueta o corrección documental (mínimo 10 caracteres)..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2A5C82] focus:outline-none"
                />
              </div>

              {/* Honeypot anti-spam field */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="feedback-website">Sitio web</label>
                <input
                  id="feedback-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {/* Pre-submit moderation notice */}
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                Antes de publicar, todo aporte pasa por revisión de moderación. No incluyas correos
                electrónicos, teléfonos ni datos personales privados.
              </p>

              {submitError && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C83228]" aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div
                  role="status"
                  className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 w-full rounded-lg bg-[#0A192F] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A5F] disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Enviando aporte...' : 'Enviar para revisión'}
              </button>
            </form>
          </div>

          {/* Right: Paginated Approved Comments */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-[#0A192F]">
                    Comentarios y sugerencias publicados ({totalApproved})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Únicamente se muestran aportes revisados y aprobados.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchSummaryPage(1, false)}
                  disabled={loadingSummary}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingSummary ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  Actualizar
                </button>
              </div>

              {summaryError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900"
                >
                  {summaryError}
                </div>
              )}

              {loadingSummary && comments.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Cargando opiniones compartidas...
                </p>
              ) : comments.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Aún no hay comentarios aprobados publicados.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Los primeros aportes aparecerán aquí una vez revisados por moderación.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {comments.map((c) => (
                    <article
                      key={c.id}
                      className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-bold text-[#0A192F]">
                            {c.authorName}
                          </span>
                          <span className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#2A5C82]">
                            {c.category}
                          </span>
                        </div>
                        <time
                          dateTime={c.createdAt}
                          className="font-mono-tech text-[11px] text-slate-500"
                        >
                          {formatDatePE(c.createdAt)}
                        </time>
                      </div>

                      <p className="mt-2 text-sm leading-relaxed text-slate-800">{c.message}</p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReportingId(reportingId === c.id ? null : c.id);
                            setReportReason('');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#C83228] cursor-pointer"
                        >
                          <Flag className="h-3 w-3" aria-hidden="true" />
                          Reportar
                        </button>

                        {reportFeedback?.id === c.id && (
                          <span
                            className={`text-xs font-medium ${
                              reportFeedback.type === 'ok'
                                ? 'text-emerald-700'
                                : 'text-[#C83228]'
                            }`}
                          >
                            {reportFeedback.text}
                          </span>
                        )}
                      </div>

                      {reportingId === c.id && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white p-2.5">
                          <label htmlFor={`report-${c.id}`} className="sr-only">
                            Motivo del reporte
                          </label>
                          <input
                            id={`report-${c.id}`}
                            type="text"
                            maxLength={180}
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="Motivo del reporte (ej. dato incorrecto o spam)"
                            className="min-w-0 flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#2A5C82] focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={reportBusy}
                            onClick={() => handleSubmitReport(c.id)}
                            className="rounded bg-[#C83228] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#A92820] disabled:opacity-60 cursor-pointer"
                          >
                            Enviar reporte
                          </button>
                        </div>
                      )}
                    </article>
                  ))}

                  {hasMore && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => fetchSummaryPage(page + 1, true)}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0A192F] hover:bg-slate-100 disabled:opacity-60 cursor-pointer"
                      >
                        {loadingMore ? 'Cargando más...' : 'Cargar más comentarios'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Discreet Protected Moderation Panel */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setModerationOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0A192F] cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  {moderationOpen
                    ? 'Ocultar panel de moderación'
                    : 'Moderación académica (acceso protegido)'}
                </button>
                <span className="text-[11px] text-slate-400">
                  Estado servidor: persistencia JSON compartida
                </span>
              </div>

              {moderationOpen && (
                <div className="mt-4 border-t border-slate-200 pt-4 text-xs">
                  {!moderationConfigured ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
                      Para habilitar el panel de moderación en este entorno, define la variable de
                      entorno <code className="font-mono-tech font-bold">ADMIN_MODERATION_TOKEN</code>{' '}
                      en el servidor (nunca en el código del navegador).
                    </p>
                  ) : !activeAdminToken ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (adminTokenInput.trim()) {
                          void loadModerationQueue(adminTokenInput.trim());
                        }
                      }}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <label htmlFor="admin-mod-token" className="sr-only">
                        Token de moderación del servidor
                      </label>
                      <input
                        id="admin-mod-token"
                        type="password"
                        value={adminTokenInput}
                        onChange={(e) => setAdminTokenInput(e.target.value)}
                        placeholder="Ingresa el token de moderación del servidor"
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={modLoading}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#0A192F] px-3 py-1.5 font-semibold text-white hover:bg-[#1E3A5F] cursor-pointer"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Acceder
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              { id: 'pending', label: 'Pendientes' },
                              { id: 'approved', label: 'Aprobados' },
                              { id: 'rejected', label: 'Rechazados' },
                              { id: 'removed', label: 'Retirados' },
                              { id: 'all', label: 'Todos' },
                            ] as { id: 'all' | CommentStatus; label: string }[]
                          ).map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setModFilter(st.id)}
                              className={`rounded border px-2.5 py-1 font-medium cursor-pointer ${
                                modFilter === st.id
                                  ? 'border-[#0A192F] bg-[#0A192F] text-white'
                                  : 'border-slate-300 bg-white text-slate-700'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          {filteredModComments.length > 0 && (
                            <button
                              type="button"
                              onClick={handleExportModerationCsv}
                              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#0A192F] hover:bg-slate-100 cursor-pointer"
                            >
                              <Download className="h-3 w-3" aria-hidden="true" />
                              Exportar CSV
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAdminToken(null);
                              setAdminTokenInput('');
                              setModComments([]);
                            }}
                            className="text-xs font-semibold text-[#C83228] hover:underline cursor-pointer"
                          >
                            Cerrar sesión de moderación
                          </button>
                        </div>
                      </div>

                      {filteredModComments.length === 0 ? (
                        <p className="py-3 text-slate-500">
                          No hay elementos en esta bandeja de moderación.
                        </p>
                      ) : (
                        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                          {filteredModComments.map((mc) => (
                            <div
                              key={mc.id}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-[#0A192F]">
                                  {mc.authorName} · {mc.category}
                                </span>
                                <span className="font-mono-tech text-[11px] uppercase text-slate-600">
                                  {mc.status}
                                  {mc.reportsCount > 0 ? ` · Reportes: ${mc.reportsCount}` : ''}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-800">{mc.message}</p>
                              {mc.reportReasons.length > 0 && (
                                <p className="mt-1 text-[11px] text-amber-800">
                                  Motivos reportados: {mc.reportReasons.join(' | ')}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {mc.status !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleModerationAction(mc.id, 'approved')}
                                    className="rounded bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                                  >
                                    Aprobar
                                  </button>
                                )}
                                {mc.status !== 'rejected' && (
                                  <button
                                    type="button"
                                    onClick={() => handleModerationAction(mc.id, 'rejected')}
                                    className="rounded bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-800 cursor-pointer"
                                  >
                                    Rechazar
                                  </button>
                                )}
                                {mc.status !== 'removed' && (
                                  <button
                                    type="button"
                                    onClick={() => handleModerationAction(mc.id, 'removed')}
                                    className="rounded bg-[#C83228] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#A92820] cursor-pointer"
                                  >
                                    Retirar
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {modError && (
                    <p role="alert" className="mt-2 text-xs font-medium text-[#C83228]">
                      {modError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
