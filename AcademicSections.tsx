import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  Maximize2,
  Printer,
  X,
} from 'lucide-react';
import {
  APA_REFERENCES,
  ENGINEERING_SPECIALTIES,
  GALLERY_RESOURCES,
  MEGAPORT_INFO_CARDS,
  PROJECT_TIMELINE,
  STS_CYCLE_STEPS,
  TECHNICAL_GLOSSARY,
  TECHNICAL_SHEETS,
} from '../data/portData';
import { CameraPresetId, ComponentId, GalleryResource } from '../types/port';
import { TechnicalSchematicSVG } from './TechnicalSchematicSVG';

interface AcademicSectionsProps {
  onFocusComponentIn3D: (
    id: ComponentId,
    preset: CameraPresetId,
    options?: { tunnelCutaway?: boolean; structuralCutaway?: boolean }
  ) => void;
  onHighlightSpecialtyIn3D: (specialtyId: string, preset: CameraPresetId) => void;
  onActivateOperationsIn3D: () => void;
}

export const AcademicSections: React.FC<AcademicSectionsProps> = ({
  onFocusComponentIn3D,
  onHighlightSpecialtyIn3D,
  onActivateOperationsIn3D,
}) => {
  const [comparatorTarget, setComparatorTarget] = useState<'muelle' | 'rompeolas' | 'tunel'>('muelle');
  const [comparatorView, setComparatorView] = useState<'general' | 'detalle'>('detalle');
  const [expandedGalleryItem, setExpandedGalleryItem] = useState<GalleryResource | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [publicUrlInput, setPublicUrlInput] = useState(
    typeof window !== 'undefined' ? window.location.href : 'https://chancay-maqueta-3d.example'
  );
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastGalleryTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!expandedGalleryItem) return;
    lastGalleryTriggerRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => modalCloseBtnRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setExpandedGalleryItem(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      if (lastGalleryTriggerRef.current && document.contains(lastGalleryTriggerRef.current)) {
        lastGalleryTriggerRef.current.focus();
      }
    };
  }, [expandedGalleryItem]);

  useEffect(() => {
    if (!qrCanvasRef.current || !publicUrlInput.trim()) return;
    QRCode.toCanvas(
      qrCanvasRef.current,
      publicUrlInput.trim(),
      {
        width: 148,
        margin: 1,
        color: { dark: '#0A192F', light: '#FFFFFF' },
      },
      () => {}
    );
  }, [publicUrlInput]);

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrlInput);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setCopiedUrl(false);
    }
  };

  const infraList = [
    TECHNICAL_SHEETS.rompeolas,
    TECHNICAL_SHEETS.muelle,
    TECHNICAL_SHEETS['grua-sts'],
    TECHNICAL_SHEETS.buque,
    TECHNICAL_SHEETS.patio,
    TECHNICAL_SHEETS.tunel,
    TECHNICAL_SHEETS.ingreso,
  ];

  return (
    <div className="bg-[#F6F8FB] text-[#0B1D33]">
      {/* =================================================================== */}
      {/* C. INFRAESTRUCTURA + COMPARADOR GENERAL VS DETALLE                  */}
      {/* =================================================================== */}
      <section id="infraestructura" className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2A5C82]">
              Sección A · Componentes Portuarios
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold text-[#0A192F] sm:text-3xl">
              Infraestructura del Terminal Portuario
            </h2>
          </div>
          <p className="max-w-xl text-sm text-slate-600">
            Cada ficha distingue explícitamente entre parámetros documentados en fuentes públicas y
            proporciones esquemáticas adoptadas para comprensión académica en la maqueta 3D.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {infraList.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{item.categoria}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium capitalize text-[#2A5C82]">{item.certeza}</span>
                </div>
                <h3 className="font-display mt-1.5 text-lg font-bold text-[#0A192F]">
                  {item.nombre}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.funcion}</p>
                <div className="mt-4">
                  <TechnicalSchematicSVG tipo={item.esquemaTipo} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">{item.especialidades.slice(0, 2).join(' · ')}</span>
                <button
                  type="button"
                  onClick={() => onFocusComponentIn3D(item.id, item.cameraPreset)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#0A192F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E3A5F] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver en maqueta
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Comparator: General View vs Structural Detail */}
        <div className="mt-12 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-[#0A192F]">
                Comparador: Vista General vs. Detalle Estructural
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Contrasta la función macro en el puerto frente a la sección constructiva interna.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'muelle', label: 'Muelle sobre pilotes' },
                  { id: 'rompeolas', label: 'Rompeolas' },
                  { id: 'tunel', label: 'Túnel viaducto' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setComparatorTarget(t.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    comparatorTarget === t.id
                      ? 'bg-[#2A5C82] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setComparatorView('general')}
                  className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                    comparatorView === 'general'
                      ? 'bg-[#0A192F] text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Vista general (implantación)
                </button>
                <button
                  type="button"
                  onClick={() => setComparatorView('detalle')}
                  className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                    comparatorView === 'detalle'
                      ? 'bg-[#C83228] text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Detalle estructural (corte)
                </button>
              </div>
              <TechnicalSchematicSVG
                tipo={
                  comparatorView === 'general'
                    ? comparatorTarget === 'tunel'
                      ? 'ingreso'
                      : comparatorTarget === 'rompeolas'
                      ? 'oceano'
                      : 'buque'
                    : comparatorTarget
                }
              />
            </div>

            <div className="lg:col-span-6 space-y-3 text-sm leading-relaxed text-slate-700">
              <h4 className="font-display text-lg font-bold text-[#0A192F]">
                {TECHNICAL_SHEETS[comparatorTarget].nombre}
              </h4>
              <p>
                {comparatorView === 'general'
                  ? TECHNICAL_SHEETS[comparatorTarget].funcion
                  : TECHNICAL_SHEETS[comparatorTarget].procesoConstructivo}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-slate-600">
                {TECHNICAL_SHEETS[comparatorTarget].elementosEstructurales.map((el) => (
                  <li key={el}>{el}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() =>
                  onFocusComponentIn3D(
                    comparatorTarget,
                    TECHNICAL_SHEETS[comparatorTarget].cameraPreset,
                    comparatorView === 'detalle'
                      ? {
                          tunnelCutaway: comparatorTarget === 'tunel',
                          structuralCutaway: comparatorTarget === 'muelle',
                        }
                      : undefined
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0A192F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A5F] cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                {comparatorView === 'detalle' &&
                (comparatorTarget === 'tunel' || comparatorTarget === 'muelle')
                  ? 'Inspeccionar corte en 3D'
                  : 'Inspeccionar en escena 3D'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* D. INGENIERÍA CIVIL                                                 */}
      {/* =================================================================== */}
      <section id="ingenieria" className="border-t border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="border-b border-slate-200 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C83228]">
              Sección B · Especialidades de Ingeniería Civil
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold text-[#0A192F] sm:text-3xl">
              El rol del Ingeniero Civil en el Megapuerto de Chancay
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Selecciona cualquier especialidad para resaltar directamente en la maqueta 3D los
              elementos físicos vinculados a su campo de acción.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ENGINEERING_SPECIALTIES.map((spec) => (
              <article
                key={spec.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] p-5"
              >
                <div>
                  <h3 className="font-display text-lg font-bold text-[#0A192F]">{spec.nombre}</h3>
                  <p className="mt-2 text-sm text-slate-700">{spec.resumen}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    <strong className="text-[#0A192F]">Aplicación visible:</strong>{' '}
                    {spec.aplicacionChancay}
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-600">
                    {spec.aspectosClave.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                  <span className="text-xs text-slate-500">
                    Objetos:{' '}
                    {spec.componentesRelacionados
                      .map((id) => TECHNICAL_SHEETS[id].nombre.split(' ')[0])
                      .join(', ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => onHighlightSpecialtyIn3D(spec.id, spec.cameraPreset)}
                    className="rounded-md bg-[#2A5C82] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E4463] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Resaltar en 3D
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* E. OPERACIONES PORTUARIAS + PANEL ACADÉMICO DEL MEGAPUERTO          */}
      {/* =================================================================== */}
      <section id="operaciones" className="border-t border-slate-200 bg-[#F6F8FB] py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2A5C82]">
                Sección C · Logística, Operaciones y Contexto Perú–Asia
              </p>
              <h2 className="font-display mt-1 text-2xl font-bold text-[#0A192F] sm:text-3xl">
                Operaciones Portuarias y Datos Estratégicos
              </h2>
            </div>
            <button
              type="button"
              onClick={onActivateOperationsIn3D}
              className="rounded-lg bg-[#C83228] px-4 py-2 text-xs font-semibold text-white hover:bg-[#A92820] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ver ciclo STS en vivo en el visor 3D
            </button>
          </div>

          {/* 9-Step STS Cycle */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-display text-lg font-bold text-[#0A192F]">
              Secuencia operativa de transferencia buque–muelle–patio (representación educativa)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Esta animación (ciclo ilustrativo de 18 segundos) explica visualmente la secuencia
              coordinada; no constituye una simulación física certificada de cargas ni velocidades
              nominales reales de operación portuaria.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {STS_CYCLE_STEPS.map((step) => (
                <div
                  key={step}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-800"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Bilateral Context (Peru & China Flags strictly in appropriate trade/institutional context) */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0A192F]">
                  Corredor Marítimo Perú – Asia y Estructura Empresarial
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Información académica verificada con diferenciación de etapa, fecha y moneda.
                </p>
              </div>
              <div className="flex items-center gap-3" aria-label="Banderas informativas de Perú y China">
                {/* Peru Flag SVG */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <svg width="24" height="16" viewBox="0 0 24 16" className="rounded-xs border border-slate-300" role="img" aria-label="Bandera del Perú">
                    <rect width="8" height="16" x="0" fill="#D91023" />
                    <rect width="8" height="16" x="8" fill="#FFFFFF" />
                    <rect width="8" height="16" x="16" fill="#D91023" />
                  </svg>
                  <span>Perú</span>
                </div>
                <span aria-hidden="true" className="text-slate-400">↔</span>
                {/* China Flag SVG */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <svg width="24" height="16" viewBox="0 0 24 16" className="rounded-xs border border-slate-300" role="img" aria-label="Bandera de la República Popular China">
                    <rect width="24" height="16" fill="#DE2910" />
                    <polygon points="4.5,2.2 5.1,4 7,4 5.5,5.1 6.1,6.9 4.5,5.8 2.9,6.9 3.5,5.1 2,4 3.9,4" fill="#FFDE00" />
                    <circle cx="8.8" cy="2.2" r="0.65" fill="#FFDE00" />
                    <circle cx="10.1" cy="3.7" r="0.65" fill="#FFDE00" />
                    <circle cx="10.1" cy="5.7" r="0.65" fill="#FFDE00" />
                    <circle cx="8.8" cy="7.2" r="0.65" fill="#FFDE00" />
                  </svg>
                  <span>China / Asia-Pacífico</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {MEGAPORT_INFO_CARDS.map((card) => (
                <div key={card.titulo} className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
                  <p className="font-mono-tech text-[11px] font-medium text-[#2A5C82]">
                    {card.etiqueta}
                  </p>
                  <h4 className="font-display mt-1 text-base font-bold text-[#0A192F]">
                    {card.titulo}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{card.contenido}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* F. HISTORIA DEL PROYECTO                                            */}
      {/* =================================================================== */}
      <section id="historia" className="border-t border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="border-b border-slate-200 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2A5C82]">
              Sección D · Línea de Tiempo Documentada
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold text-[#0A192F] sm:text-3xl">
              Historia del Desarrollo Portuario en Chancay
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PROJECT_TIMELINE.map((ev) => (
              <article
                key={ev.fecha}
                className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono-tech font-semibold text-[#C83228]">{ev.fecha}</span>
                  <span className="text-slate-500 capitalize">{ev.certeza}</span>
                </div>
                <h3 className="font-display mt-2 text-base font-bold text-[#0A192F]">
                  {ev.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{ev.descripcion}</p>
                <p className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500">
                  Fuente: {ev.fuente}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* G. GALERÍA, GLOSARIO, GUÍA RÁPIDA, QR Y EXPORTACIÓN                 */}
      {/* =================================================================== */}
      <section id="documentacion" className="border-t border-slate-200 bg-[#F6F8FB] py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="border-b border-slate-200 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2A5C82]">
              Sección E · Recursos Educativos y Documentación
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold text-[#0A192F] sm:text-3xl">
              Láminas Técnicas, Glosario y Exportación del Proyecto
            </h2>
          </div>

          {/* Interactive Technical Sheets & Official Portals */}
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {GALLERY_RESOURCES.map((item) => (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="text-[11px] font-medium text-[#2A5C82]">{item.tipo}</p>
                  <h3 className="font-display mt-1 text-sm font-bold text-[#0A192F]">
                    {item.titulo}
                  </h3>
                  <div className="mt-3">
                    <TechnicalSchematicSVG tipo={item.esquema} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.descripcion}</p>
                  <p className="mt-2 text-[11px] font-medium text-slate-500">
                    {item.estadoImagen}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExpandedGalleryItem(item)}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" />
                      Ampliar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onFocusComponentIn3D(
                          item.componentId,
                          TECHNICAL_SHEETS[item.componentId].cameraPreset,
                          { tunnelCutaway: item.requiresTunnelCutaway }
                        )
                      }
                      className="inline-flex items-center gap-1 rounded bg-[#0A192F] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A5F] cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      {item.requiresTunnelCutaway ? 'Ver corte 3D' : 'Ver en 3D'}
                    </button>
                  </div>
                  <a
                    href={item.urlOficial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2A5C82] hover:underline"
                  >
                    Fuente oficial
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </article>
            ))}
          </div>

          {/* Glossary + Quick Guide + Share & QR */}
          <div className="mt-10 grid gap-6 lg:grid-cols-12">
            {/* Technical Glossary */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-display text-lg font-bold text-[#0A192F]">
                Glosario Técnico Portuario
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {TECHNICAL_GLOSSARY.map((g) => (
                  <div key={g.termino} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-display text-sm font-bold text-[#0A192F]">{g.termino}</h4>
                      <button
                        type="button"
                        onClick={() =>
                          onFocusComponentIn3D(
                            g.relacionMaqueta,
                            TECHNICAL_SHEETS[g.relacionMaqueta].cameraPreset
                          )
                        }
                        className="text-[11px] font-semibold text-[#2A5C82] hover:underline cursor-pointer"
                      >
                        Ver en 3D
                      </button>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{g.definicion}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Guide + Share/QR + Export */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-display text-lg font-bold text-[#0A192F]">
                  Guía Rápida y Compartir Exposición
                </h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-700">
                  <li>
                    <strong>Órbita y zoom:</strong> arrastra con clic izquierdo o un dedo; rueda del
                    ratón o botones inferiores para acercar/alejar.
                  </li>
                  <li>
                    <strong>Selección:</strong> haz clic directo sobre muelles, grúas, buque,
                    rompeolas o túnel, o usa el selector accesible por teclado.
                  </li>
                  <li>
                    <strong>Modo Exposición:</strong> amplía el visor 3D a pantalla completa y usa
                    el recorrido guiado de 6 pasos (~1 minuto) frente al jurado.
                  </li>
                  <li>
                    <strong>Conservación y publicación abierta:</strong> el botón <em>Exportar .GLB</em>{' '}
                    descarga la geometría visible con GLTFExporter. Para publicar la web completa en
                    internet sin requerir cuenta de Google (conservando opiniones y moderación),
                    compila con <code className="font-mono-tech">npm run build</code> y ejecuta{' '}
                    <code className="font-mono-tech">npm start</code> en un alojamiento Node.js con
                    disco persistente (Render, Railway, Fly.io o VPS).
                  </li>
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                  <span className="text-xs text-slate-600">
                    Material impreso para exposición universitaria:
                  </span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="no-print inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#0A192F] hover:bg-slate-100 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-[#2A5C82]" aria-hidden="true" />
                    Imprimir ficha resumen
                  </button>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <label htmlFor="qr-url-input" className="block text-xs font-semibold text-slate-700">
                    Dirección pública para compartir y código QR:
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      id="qr-url-input"
                      type="url"
                      value={publicUrlInput}
                      onChange={(e) => setPublicUrlInput(e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 font-mono-tech text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleCopyShareUrl}
                      className="inline-flex items-center gap-1 rounded-md bg-[#0A192F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A5F] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedUrl ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <canvas
                      ref={qrCanvasRef}
                      aria-label="Código QR de la dirección configurada"
                      className="rounded border border-slate-200 bg-white p-1"
                    />
                    <p className="text-xs leading-relaxed text-slate-600">
                      Código QR generado localmente en el navegador. Actualiza la URL superior
                      con tu enlace público tras desplegar la aplicación para proyectarlo en
                      diapositivas o láminas de exposición.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* H. REFERENCIAS ACADÉMICAS (APA 7)                                   */}
      {/* =================================================================== */}
      <section id="referencias" className="border-t border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="border-b border-slate-200 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2A5C82]">
              Sección F · Bibliografía
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold text-[#0A192F]">
              Referencias Académicas (Formato APA 7)
            </h2>
          </div>

          <ol className="mt-6 space-y-4">
            {APA_REFERENCES.map((ref) => (
              <li
                key={ref.id}
                className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 text-sm text-slate-800"
              >
                <p className="leading-relaxed">{ref.cita}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{ref.notaVerificacion}</span>
                  {ref.url && (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#2A5C82] hover:underline"
                    >
                      {ref.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
            <p>
              Megapuerto de Chancay — Maqueta Digital Educativa 3D (referencia Fase 1, noviembre
              2024). Recurso académico elaborado con React, TypeScript y Three.js con fines de
              exposición universitaria en Ingeniería Civil (UPC). No constituye documento oficial de
              obra ni cuenta con aval institucional del concesionario o entidades estatales.
            </p>
          </footer>
        </div>
      </section>

      {/* Gallery Expanded Modal */}
      {expandedGalleryItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={expandedGalleryItem.titulo}
          onClick={(e) => {
            if (e.target === e.currentTarget) setExpandedGalleryItem(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
        >
          <div className="w-full max-w-2xl rounded-xl border border-slate-300 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#2A5C82]">{expandedGalleryItem.entidad}</p>
                <h3 className="font-display mt-0.5 text-xl font-bold text-[#0A192F]">
                  {expandedGalleryItem.titulo}
                </h3>
              </div>
              <button
                ref={modalCloseBtnRef}
                type="button"
                onClick={() => setExpandedGalleryItem(null)}
                aria-label="Cerrar vista ampliada"
                className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <TechnicalSchematicSVG tipo={expandedGalleryItem.esquema} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              {expandedGalleryItem.descripcion}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs">
              <span className="font-medium text-slate-500">{expandedGalleryItem.estadoImagen}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const target = expandedGalleryItem;
                    setExpandedGalleryItem(null);
                    onFocusComponentIn3D(
                      target.componentId,
                      TECHNICAL_SHEETS[target.componentId].cameraPreset,
                      { tunnelCutaway: target.requiresTunnelCutaway }
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded bg-[#0A192F] px-3 py-1.5 font-semibold text-white hover:bg-[#1E3A5F] cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {expandedGalleryItem.requiresTunnelCutaway ? 'Ver corte en 3D' : 'Explorar en 3D'}
                </button>
                <a
                  href={expandedGalleryItem.urlOficial}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#2A5C82] hover:underline"
                >
                  Visitar portal oficial
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
