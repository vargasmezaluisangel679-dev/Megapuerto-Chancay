# Estado del Proyecto — Megapuerto de Chancay (Maqueta Digital Educativa 3D)

**Fecha de corte documental de la maqueta:** Fase 1 (inaugurada el 14 de noviembre de 2024) y hechos societarios públicos hasta enero de 2025.  
**Propósito:** Recurso académico estudiantil de Ingeniería Civil (sin valor contractual, BIM ni respaldo institucional oficial del concesionario ni de la UPC).

---

## 1. Funciones implementadas

- **Portada e identidad académica (`HeroSection.tsx`):** Encabezado con logotipo oficial de la UPC (`/assets/aistudio/images__3__5707f9f7.jpeg`), métricas documentadas de Fase 1, acceso al explorador 3D y lanzamiento del recorrido guiado en modo exposición.
- **Visor 3D interactivo procedural (`src/three/*`, `PortExplorer3D.tsx`):**
  - Terreno costero continuo (`terreno`), océano Pacífico con atenuación de oleaje tras rompeolas (`oceano`), rompeolas principal y secundario (`rompeolas`), cuatro muelles sobre pilotes (`muelle`), grúas pórtico STS (`grua-sts`), buque portacontenedores principal y alimentador (`buque`), patio de contenedores (`patio`), túnel viaducto subterráneo (`tunel`), complejo de ingreso (`ingreso`), flota de camiones (`camiones`), cuadrillas de trabajadores (`trabajadores`), señalización y elementos explicativos.
  - 8 presets de cámara (`general`, `superior`, `maritima`, `muelles`, `gruas`, `patio`, `tunel`, `ingreso`) con adaptación automática a pantallas verticales.
  - 5 modos de exploración (`libre`, `guiado`, `ingenieria`, `operaciones`, `construccion`).
  - 3 modos de iluminación (`dia`, `atardecer`, `maqueta`) y 2 perfiles de calidad (`estandar`, `ligera`).
  - Cortes didácticos interactivos (`showTunnelCutaway` y `showStructuralCutaway`), control de 6 capas, pausa de simulación/oleaje (`oceanStatic`) y exportación/importación `.GLB`.
  - Fichas técnicas contextuales (`TechnicalSheetDrawer.tsx`) con niveles de certeza (`documentado`, `aproximado`, `esquemático`), esquemas SVG técnicos y enlace bidireccional hacia empresas participantes.
- **Contenido académico y participantes (`AcademicSections.tsx`, `ParticipantsAndInvestmentSection.tsx`):**
  - Secciones A–H (Infraestructura, Especialidades, Cronología, Procesos Constructivos, Operaciones/Import-Export, Glosario, Galería/QR local en `<canvas>`, Bibliografía APA 7).
  - Sección I (`Participantes e inversión del proyecto`): actores clasificados con alcance contractual delimitado, profesionales con cargo público verificable, equipos multidisciplinarios, tarjetas y tabla de inversiones en USD sin doble conteo y referencias APA 7 específicas.
- **Opiniones, «Me gusta» y moderación (`CommunityFeedbackSection.tsx`, `server.ts`):**
  - Carga diferida del módulo comunitario para no afectar el arranque WebGL.
  - Botón «Me gusta» con retiro de reacción y contador real en servidor.
  - Envío de comentarios categorizados (`10–500` caracteres), modo «Visitante», validación/sanitización en servidor, honeypot, límite de frecuencia y paginación de aportes aprobados.
  - Reporte en línea y panel de moderación protegido mediante `ADMIN_MODERATION_TOKEN`.

---

## 2. Funciones incompletas, simplificadas o didácticas

- **Representación 3D educativa (no BIM/topográfica oficial):** Las dimensiones en unidades Three.js, distribución de contenedores, detalles de acrópodos y pilotes son proporciones didácticas consistentes, no planos ejecutivos ni levantamiento batimétrico/topográfico contractual.
- **Datos económicos unitarios:** No existe desglose público oficial auditado del costo por muelle, del túnel viaducto o de cada grúa STS; se indica expresamente en lugar de estimar cifras sin respaldo.
- **Galería fotográfica externa:** Los elementos de galería muestran esquemas SVG técnicos locales y enlaces oficiales externos (pendientes de incorporar fotografías propias o con licencia libre verificada si se desea reemplazar los esquemas).
- **Capturas de pantalla de referencia:** No fue posible generar capturas automáticas desde este entorno de entrega porque el contenedor carece de navegador headless (Chromium/Playwright).

---

## 3. Errores u observaciones conocidos

1. **Persistencia en archivo JSON local (`COMMUNITY_DATA_PATH`):** Funciona entre recargas y distintos visitantes sobre un mismo servidor activo, pero en servicios PaaS con disco efímero requiere montar un volumen persistente o migrar `mutateStore` en `server.ts` a una base de datos externa para no perder datos al reiniciar contenedores.
2. **Identificador de «Me gusta» sin inicio de sesión:** Al evitar registro obligatorio por correo, se limita una reacción por `x-visitor-id` (almacenado en `localStorage`) e IP; si un visitante borra datos del navegador puede volver a emitir un voto como sesión nueva.
3. **Favicon e icono HTML:** Existen `/public/favicon.ico` y `/favicon.ico` (archivo subido en formato JPEG); `index.html` no declara una etiqueta explícita `<link rel="icon" href="/favicon.ico" />`, por lo que depende de la solicitud automática `/favicon.ico` del navegador.
4. **Archivos residuales en workspace conservados:**
   - `public/assets/aistudio/Paste_November_12__2026_-_3_38PM_b97b95e6` (25 KB): texto histórico pegado anteriormente, no referenciado por el código.
   - `src/three_backup_v1/` y `src/three_backup_v2/`: respaldos de iteraciones anteriores de la escena 3D no importados por la versión activa.

---

## 4. Dependencias externas y recursos

- **Google Fonts (`index.html`):** Carga en línea de `Outfit`, `Plus Jakarta Sans` e `IBM Plex Mono` (`https://fonts.googleapis.com/css2?...`). Sin conexión, el CSS degrada a fuentes del sistema sin fallos funcionales.
- **Activos locales requeridos en `public/`:**
  - `public/assets/aistudio/images__3__5707f9f7.jpeg` — Logotipo UPC usado en `src/components/HeroSection.tsx`.
  - `public/favicon.ico` — Favicon servido en `/favicon.ico`.
- **Enlaces documentales externos (solo consulta en nueva pestaña):** `gob.pe/apn`, `gob.pe/mtc`, `gob.pe/senace`, `coscochancay.pe`, `bvl.com.pe`, `smv.gob.pe`, `ports.coscoshipping.com`, `chec.bj.cn`, `systra.com`, `zpmc.com`.

---

## 5. Verificación de integridad realizada vs. pendiente

### Comprobaciones realizadas
- Verificación de tipos TypeScript (`npm run lint` / `tsc --noEmit`) sin errores.
- Compilación de producción (`npm run build` / `vite build`) completada correctamente.
- Verificación de importaciones internas, existencia de `public/assets/aistudio/images__3__5707f9f7.jpeg` y `server.ts` ejecutable con `node server.ts` (Node v22).
- Comprobación de que el paquete de entrega excluye `node_modules/`, `dist/`, `.env` con secretos, cachés y `data/community-store.json` (sin datos de visitantes).

### Comprobaciones pendientes en el nuevo entorno
- Revisión visual e interactiva en navegador real (escritorio, tableta y teléfono) del render WebGL, modo Exposición y carga de la sección `Opiniones y sugerencias`.
- Captura de pantalla real de las 7 vistas de referencia tras el despliegue en navegador con GPU/WebGL.
- Configuración de `ADMIN_MODERATION_TOKEN` (y volumen persistente para `COMMUNITY_DATA_PATH`) en el servidor destino.

---

## 6. Pasos rápidos para reproducir

```bash
npm install
cp .env.example .env
# (Opcional) Define ADMIN_MODERATION_TOKEN en .env para habilitar moderación
npm run lint
npm run build
NODE_ENV=production npm start
```
