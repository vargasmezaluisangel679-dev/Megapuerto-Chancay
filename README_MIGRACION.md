# Guía de Migración y Reproducción — Megapuerto de Chancay (Maqueta Digital Educativa 3D)

Este documento describe con exactitud cómo instalar, ejecutar, compilar y desplegar esta aplicación fuera de Google AI Studio conservando su diseño, escena 3D procedural, contenido académico y sistema de opiniones con persistencia en servidor.

---

## 1. Tecnologías y versiones utilizadas

Según `package.json` y el entorno de desarrollo verificado:

| Tecnología | Versión declarada / verificada | Función en el proyecto |
| --- | --- | --- |
| **Node.js** | `v22.23.2` (recomendado `>= 22.18.0`) | Ejecución de servidor Express (`server.ts` directo en Node 22) y compilación Vite |
| **React / React DOM** | `^19.0.1` | Interfaz web y estado interactivo |
| **TypeScript** | `^7.0.2` (verificación vía `tsc --noEmit`) | Tipado estático del frontend y backend |
| **Vite** | `^8.3.0` (`@vitejs/plugin-react ^6.1.1`) | Empaquetador y servidor de desarrollo |
| **Three.js** | `^0.187.0` (`@types/three ^0.187.0`) | Escena 3D WebGL, `OrbitControls`, `RoomEnvironment`, `GLTFExporter`, `GLTFLoader` |
| **Tailwind CSS** | `^4.3.3` (`@tailwindcss/vite ^4.3.3`) | Estilos utilitarios CSS |
| **Express** | `^4.21.2` (`@types/express ^4.17.21`) | Servidor HTTP, API `/api/*` y servicio de `dist/` en producción |
| **tsx** | `^4.21.0` | Ejecutor TypeScript en modo desarrollo (`npm run dev`) |
| **dotenv** | `^17.2.3` | Carga de variables desde `.env` en servidor |
| **lucide-react** | `^0.546.0` | Iconografía de interfaz |
| **qrcode** | `^1.5.4` (`@types/qrcode ^1.5.6`) | Generación local en `<canvas>` del código QR para exposición |
| **motion** | `^12.23.24` | Declarada en `package.json` |
| **@google/genai** | `^2.4.0` | Declarada en `package.json` (sin llamadas activas en el código actual) |

- **Gestor de paquetes y lockfile incluido:** El repositorio incluye `bun.lock`. Puede instalarse con `bun install` o con `npm install` (generará `package-lock.json` en el nuevo entorno si se utiliza npm).

---

## 2. Comandos reales de instalación, desarrollo y compilación

Todos los scripts reales declarados en `package.json`:

```json
{
  "dev": "tsx server.ts",
  "start": "node server.ts",
  "build": "vite build",
  "preview": "vite preview",
  "clean": "rm -rf dist server.js",
  "lint": "tsc --noEmit"
}
```

### Paso a paso en un entorno nuevo

1. **Instalar dependencias:**
   ```bash
   npm install
   # o si utilizas Bun:
   # bun install
   ```

2. **Configurar variables de entorno (opcional en desarrollo, obligatorio para habilitar moderación):**
   Copia `.env.example` a `.env` (no subas `.env` a Git):
   ```bash
   cp .env.example .env
   ```

3. **Iniciar entorno de desarrollo (Vite middleware + Express API en puerto 3000):**
   ```bash
   npm run dev
   ```
   Disponible en `http://localhost:3000`.

4. **Verificar tipos TypeScript:**
   ```bash
   npm run lint
   ```

5. **Compilar para producción (genera carpeta `dist/`):**
   ```bash
   npm run build
   ```

6. **Ejecutar servidor de producción:**
   ```bash
   NODE_ENV=production npm start
   ```
   > **Nota sobre Node.js:** `"start": "node server.ts"` aprovecha el soporte nativo de Node 22 para ejecutar TypeScript sin compilación separada del servidor (`import type` ya está separado en `server.ts`). Si despliegas en una versión de Node anterior a 22.18, ejecuta el servidor con `npx tsx server.ts` o transpílalo previamente.

---

## 3. Variables de entorno y seguridad

Consulta `.env.example` para referencia sin secretos.

| Variable | Ámbito | Obligatoria | Descripción |
| --- | --- | --- | --- |
| `PORT` | Solo servidor | No (`3000` por defecto) | Puerto HTTP de Express (en PaaS como Render/Railway suele inyectarse automáticamente) |
| `NODE_ENV` | Solo servidor | Sí en producción (`production`) | Con `production`, Express sirve archivos estáticos desde `dist/` y fallback SPA `index.html`; sin ella monta `vite.middlewares` |
| `ADMIN_MODERATION_TOKEN` | Solo servidor | No (requerida para moderar) | Clave secreta validada en servidor (`crypto.timingSafeEqual`) mediante cabecera `x-admin-token` o `Authorization: Bearer`. Si no se define, `/api/moderation/*` responde HTTP `503`. **Nunca usar prefijo `VITE_` ni escribirla en código cliente.** |
| `COMMUNITY_DATA_PATH` | Solo servidor | No (`./data/community-store.json`) | Ruta del archivo JSON donde el servidor persiste reacciones y comentarios |
| `APP_URL` | Referencial / servidor | No | URL pública donde se aloja la aplicación |
| `GEMINI_API_KEY` | Solo servidor | No | Reservada en `.env.example`; actualmente la aplicación **no** realiza llamadas a Gemini API |

---

## 4. Arquitectura de la interfaz y páginas

La aplicación es una **Single Page Application (SPA)** con navegación por anclas suaves y modo Exposición a pantalla completa:

1. **Barra de navegación (`src/components/Navbar.tsx`):** Enlaces `Inicio`, `Explorador 3D`, `Infraestructura`, `Ingeniería`, `Participantes`, `Documentación`, `Opiniones` y CTA `Explorar Maqueta`. Menú hamburguesa bajo breakpoint `lg`.
2. **Portada (`src/components/HeroSection.tsx`):** Fondo `#0A192F`, logotipo oficial UPC (`/assets/aistudio/images__3__5707f9f7.jpeg`), título principal, métricas clave de Fase 1 (`14 Nov 2024`, `~2.7 km`, `~1.8 km`, `4 muelles`), botón `EXPLORAR MAQUETA 3D`, botón `Recorrido guiado (1 min)` (activa modo presentación + tour guiado) y nota metodológica académica.
3. **Visor 3D (`src/components/PortExplorer3D.tsx` + `src/components/TechnicalSheetDrawer.tsx`):**
   - Contenedor WebGL (`80vh`, `min-h-[580px]`, `max-h-[860px]`, o `fixed inset-0` en modo Exposición).
   - Barra HUD superior (estado Fase 1, ciclo STS #1 en tiempo real, buscador/índice, selector de iluminación `Día / Atardecer / Maqueta`, calidad `Estándar / Ligera`, modo `Exposición`).
   - Dock inferior colapsable con 4 pestañas: `Vistas de cámara` (8 presets), `Modos de exploración` (5 modos), `Operaciones y cortes` (pausa/reanuda grúa, oleaje, mar estático, vehículos, personal, corte túnel y corte pilotes muelle 4), `Capas y exportar GLB` (6 capas + exportar/importar `.GLB`).
   - Panel lateral `TechnicalSheetDrawer`: se abre al seleccionar una obra o trabajador sin mover automáticamente la cámara; pestañas `Resumen`, `Ingeniería`, `Fuentes y certeza` y enlace directo a `Participantes e inversión`.
4. **Secciones Académicas A–H (`src/components/AcademicSections.tsx` + `TechnicalSchematicSVG.tsx`):**
   - A. Infraestructura Portuaria (10 fichas interactivas + botón enfocar en 3D).
   - B. Especialidades de Ingeniería Civil (6 disciplinas con resaltado en 3D).
   - C. Cronología e Historia del Proyecto (con nivel de certeza).
   - D. Procesos Constructivos en 5 etapas interactivas.
   - E. Operaciones Portuarias, Importaciones y Exportaciones (tabla comparativa + esquemas SVG).
   - F. Glosario Técnico.
   - G. Galería Institucional y Kit para Exposición (enlaces oficiales + generador local de código QR en `<canvas>`).
   - H. Referencias Académicas en formato APA 7 + pie de página académico.
5. **Sección I — Participantes e Inversión (`src/components/ParticipantsAndInvestmentSection.tsx`):**
   - Filtros por categoría (`Todos`, `Propietarios y operador`, `Constructoras y contratistas`, `Consultoras y supervisión`, `Proveedores de equipos`).
   - Ficha de profesionales con cargo públicamente documentado + tarjeta explícita de equipos multidisciplinarios.
   - Tarjetas y tabla de inversiones en USD originales con advertencia anti-duplicación y referencias APA 7 propias.
6. **Sección J — Opiniones y Sugerencias (`src/components/CommunityFeedbackSection.tsx`):**
   - Carga diferida (`IntersectionObserver` con `rootMargin: 250px` y respaldo a 1800 ms).
   - Botón `Me gusta` / `Te gusta (retirar)` con contador compartido real.
   - Formulario (`Comentario`, `Sugerencia de mejora`, `Corrección de información`), nombre opcional o `Visitante`, contador visible `10–500` caracteres, honeypot oculto.
   - Lista paginada (`pageSize=6`) de comentarios aprobados con botón `Reportar` y panel colapsable protegido de moderación.

- **Paleta y tipografías (`src/index.css`, `index.html`):**
  - Colores base: fondo `#F6F8FB`, texto `#0B1D33`, marino institucional `#0A192F`, acero técnico `#2A5C82`, acento operativo `#C83228`.
  - Tipografías vía Google Fonts: `Outfit` (títulos), `Plus Jakarta Sans` (cuerpo) e `IBM Plex Mono` (`tabular-nums` para datos).

---

## 5. Configuración exacta de la maqueta 3D

Todo el modelo tridimensional se construye mediante código en `src/three/`:

- **Raíz y grupos (`PortSceneManager.ts`, `infrastructure.ts`, `terrain.ts`, `ocean.ts`, `operations.ts`):**
  - Grupo raíz: `MegapuertoChancay_Maqueta3D`.
  - Subgrupos con `userData.componentId` seleccionable por raycasting: `terreno`, `oceano`, `rompeolas`, `muelle`, `grua-sts`, `buque`, `patio`, `tunel`, `ingreso`, `camiones`, `trabajadores`, `senalizacion`, `explicativos`.
- **Unidades y disposición espacial:** Escala didáctica proporcional (eje X oeste→este desde mar hacia tierra; eje Z norte→sur).
  - Océano: `270 x 250` centrado en `x = -52`.
  - Rompeolas principal curvo: desde Punta Chancay `(10, 0, -68)` hasta `(-59, 0, 20)`.
  - Terreno costero (`terrain.ts`): malla `188 x 224` desplazada `+70` en X (`x ∈ [-24, +164]`, `z ∈ [-112, +112]`), plataforma ZOP nivelada en `y = 1.84`, Cerro Trinidad alrededor de `x = 66`, plataforma de ingreso ZCI en `y = 3.22`. Altura calculada de forma determinista por `computeChancayTerrainHeight(x, z)`.
- **Cámara inicial y presets (`CAMERA_PRESETS` en `PortSceneManager.ts`):**
  - `PerspectiveCamera(45, width/height, 0.5, 650)`.
  - `general`: pos `[-92, 58, 86]`, target `[20, 2, -2]` (en móviles con `aspect < 1.0`, `computeAspectAdjustedPreset` multiplica el rayo por un factor entre `1.0` y `1.58` para encuadrar todo el puerto).
  - `superior`: `[24, 175, 2]` → `[24, 0, -2]` (vista superior).
  - `maritima`: `[-98, 25, 36]` → `[-34, 2, -14]`.
  - `muelles`: `[-42, 22, 30]` → `[-10, 2.5, -12]`.
  - `gruas`: `[-30, 18, 26]` → `[-10, 7.5, 6]`.
  - `patio`: `[40, 36, 46]` → `[20, 2, 0]`.
  - `tunel`: `[66, 26, 36]` → `[66, 2.8, 4]`.
  - `ingreso`: `[138, 30, 44]` → `[114, 3.5, 4]`.
  - Límites `OrbitControls`: `dampingFactor = 0.06`, `minDistance = 12`, `maxDistance = 260`, `minPolarAngle = 0.08`, `maxPolarAngle = Math.PI * 0.47`.
- **Iluminación y renderizado:**
  - `SRGBColorSpace`, `ACESFilmicToneMapping`, `PCFSoftShadowMap` (`2048x2048` en calidad estándar; desactivado en `ligera` o GL por software), entorno PMREM `RoomEnvironment` (`environmentIntensity = 0.55`).
  - Tres modos: `dia` (predeterminado: fondo `#dce6f2`, `sunLight` `1.85` en `[-65, 95, 65]`), `atardecer` (`#e6ccb5`, sol `2.05` en `[-110, 32, 48]`), `maqueta` (`#f1f5f9`, sol `1.45` en `[-55, 115, 75]`).
- **Mar y animaciones (`ocean.ts`, `operations.ts`):**
  - Malla de océano `112x112` segmentos (`56x56` en `ligera`) con 4 armónicos sinusoidales y atenuación de amplitud del ~86 % dentro de la dársena abrigada; modo estático (`oceanStatic`) aplana `y = 0`.
  - Grúa STS #1: ciclo coordinado de `18.0` segundos (`CYCLE_DURATION = 18.0`) dividido en las 9 fases de `STS_CYCLE_STEPS` sincronizado con desplazamiento de carro, cables, spreader, contenedor izado y camión en espera bajo pórtico.
- **Generación aleatoria:**
  - La geometría, el relieve (`computeChancayTerrainHeight`) y la distribución de rocas (`InstancedMesh`) son **100 % deterministas**.
  - Únicamente `src/three/materials.ts` utiliza `Math.random()` sin semilla al crear las texturas procedurales en `<canvas>` (`makeConcreteTextures`, `makeYardPavingTexture`, `makeAsphaltTexture`), lo que produce ligeras variaciones aleatorias de ruido granular de 2×2 px en cada recarga sin alterar formas ni posiciones.

---

## 6. Servicios externos, almacenamiento y esquema de datos

- **Servicios externos utilizados:**
  - **Google Fonts** (solo hojas de estilo y fuentes externas en `index.html`). Si el usuario estuviera completamente sin internet, la aplicación sigue funcionando usando fuentes del sistema (`system-ui`, `ui-monospace`).
  - **No se utilizan** Firebase, Firestore, Supabase, Cloud SQL ni llamadas activas a Gemini API.
- **Almacenamiento de «Opiniones y sugerencias»:**
  - Los contadores de «Me gusta» y comentarios **se almacenan en el servidor** (`server.ts`), no únicamente en el navegador. El navegador solo guarda en `localStorage` la clave `chancay_visitor_id` para identificar la sesión al alternar o retirar un único «Me gusta» sin exigir inicio de sesión.
  - Persistencia atómica en archivo JSON (`COMMUNITY_DATA_PATH`, por defecto `./data/community-store.json`) con cola secuencial de escritura (`mutateStore`) y reemplazo atómico vía `.tmp`.

### Esquema JSON de almacenamiento (ejemplo ficticio ilustrativo)

> *Nota: El archivo de datos real de producción no se incluye en el paquete para evitar exportar identificadores de visitantes.*

```json
{
  "likesCount": 1,
  "likedVisitorHashes": [
    "a1b2c3d4e5f60718293a4b5c"
  ],
  "comments": [
    {
      "id": "00000000-0000-4000-8000-000000000001",
      "category": "Sugerencia de mejora",
      "authorName": "Visitante",
      "message": "Ejemplo ficticio de comentario en espera de moderación.",
      "status": "pending",
      "createdAt": "2026-11-17T12:00:00.000Z",
      "updatedAt": "2026-11-17T12:00:00.000Z",
      "reportsCount": 0,
      "reportReasons": []
    }
  ]
}
```

### Rutas API del servidor (`server.ts`)

- `GET /api/health` — Estado del servidor y si `ADMIN_MODERATION_TOKEN` está configurado.
- `GET /api/community/summary?page=1&pageSize=6` — Contador de «Me gusta» y solo comentarios `approved`.
- `POST /api/community/like` — Alterna reacción (`{ action: 'like' | 'unlike' | 'toggle' }`, requiere `x-visitor-id` válido, límite 20/min).
- `POST /api/community/comments` — Crea comentario en estado `pending` (validación `10–500` chars, sanitización, antispam/duplicados 24h, honeypot, límite 3/10 min por IP).
- `POST /api/community/comments/:id/report` — Registra motivo de reporte sobre comentario aprobado (límite 5/10 min por IP).
- `POST /api/moderation/verify`, `GET /api/moderation/comments`, `POST /api/moderation/comments/:id/status` — Protegidas con `x-admin-token` + bloqueo temporal tras 5 intentos fallidos.

---

## 7. Publicación, acceso y despliegue fuera de Google AI Studio

- **Estado actual en AI Studio:** Las URLs de vista previa/compartición (`ais-dev-*.run.app` / `ais-pre-*.run.app`) dependen de la infraestructura de Google AI Studio y su política de acceso.
- **Para acceso público directo sin cuenta de Google (y moderación protegida):**
  1. Despliega el proyecto en un proveedor compatible con **Node.js** (por ejemplo **Render**, **Railway**, **Fly.io** o un servidor VPS con Nginx/Caddy).
  2. Configura:
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `npm start`
     - **Variables de entorno:** `NODE_ENV=production` y `ADMIN_MODERATION_TOKEN=<tu_clave_secreta>`.
  3. **Persistencia en la nube:** Si el proveedor usa disco efímero (como el plan gratuito de Render), monta un **Volume / Persistent Disk** y asigna `COMMUNITY_DATA_PATH` dentro de ese volumen para conservar comentarios y reacciones entre reinicios.
  4. Con esta configuración, cualquier visitante abre el sitio y explora la maqueta 3D sin iniciar sesión, mientras que el panel de moderación permanece protegido por `ADMIN_MODERATION_TOKEN` en el servidor.
