import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Building2, Focus, HardHat, RotateCcw, Undo2, X } from 'lucide-react';
import { ComponentId, TechnicalSheet, WorkerProfile } from '../types/port';
import { getParticipantsByComponent } from '../data/participantsAndInvestmentData';
import { TechnicalSchematicSVG } from './TechnicalSchematicSVG';

interface TechnicalSheetDrawerProps {
  sheet: TechnicalSheet | null;
  worker: WorkerProfile | null;
  hasPreviousCamera: boolean;
  dockCollapsed?: boolean;
  onClose: () => void;
  onFocusComponent: (id: ComponentId) => void;
  onFocusWorker: (workerId: string) => void;
  onSelectRelatedComponent: (id: ComponentId) => void;
  onRestorePreviousCamera: () => void;
  onResetCamera: () => void;
  onNavigateToParticipant?: (componentId: ComponentId, participantId?: string) => void;
}

type DrawerTab = 'resumen' | 'ingenieria' | 'fuentes';

const CERTAINTY_LABELS: Record<TechnicalSheet['certeza'], { text: string; tone: string }> = {
  documentado: {
    text: 'Nivel de certeza: Documentado (fuente pública Fase 1)',
    tone: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  aproximado: {
    text: 'Nivel de certeza: Aproximado (reconstrucción por referencias)',
    tone: 'text-sky-900 bg-sky-50 border-sky-200',
  },
  esquemático: {
    text: 'Nivel de certeza: Esquemático (detalle didáctico general)',
    tone: 'text-amber-900 bg-amber-50 border-amber-200',
  },
};

export const TechnicalSheetDrawer: React.FC<TechnicalSheetDrawerProps> = ({
  sheet,
  worker,
  hasPreviousCamera,
  dockCollapsed = false,
  onClose,
  onFocusComponent,
  onFocusWorker,
  onSelectRelatedComponent,
  onRestorePreviousCamera,
  onResetCamera,
  onNavigateToParticipant,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('resumen');
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const isOpen = Boolean(sheet || worker);

  // Reset tab when entity changes
  useEffect(() => {
    setActiveTab('resumen');
  }, [sheet?.id, worker?.id]);

  // Keyboard Escape handler & focus management/restoration
  useEffect(() => {
    if (!isOpen) return;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKeyDown);
      if (lastFocusedRef.current && document.contains(lastFocusedRef.current)) {
        lastFocusedRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const drawerBoundsClass = dockCollapsed
    ? 'top-28 sm:top-16 bottom-14'
    : 'top-28 sm:top-16 bottom-36 sm:bottom-28';

  // =========================================================================
  // WORKER / ENGINEER PROFILE VIEW
  // =========================================================================
  if (worker) {
    return (
      <aside
        role="region"
        aria-label={`Rol técnico en escena: ${worker.rol}`}
        className={`absolute right-3 z-30 flex w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white text-[#0B1D33] shadow-2xl sm:w-[390px] ${drawerBoundsClass}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-[#0A192F] px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300">
              <HardHat className="h-3.5 w-3.5" aria-hidden="true" />
              Personal e Instrumentación en Escena
            </p>
            <h3 className="font-display mt-0.5 text-base font-bold leading-snug text-white">
              {worker.rol}
            </h3>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar ficha de personal"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-600 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2">
          <button
            type="button"
            onClick={() => onFocusWorker(worker.id)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#2A5C82] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E4463] whitespace-nowrap cursor-pointer"
          >
            <Focus className="h-3.5 w-3.5" aria-hidden="true" />
            Enfocar rol
          </button>
          {hasPreviousCamera && (
            <button
              type="button"
              onClick={onRestorePreviousCamera}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              Vista anterior
            </button>
          )}
          <button
            type="button"
            onClick={onResetCamera}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Vista general
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Representación didáctica de especialidad en obra (sin nombres propios ni cargos
            contractuales inventados).
          </div>

          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#2A5C82]">
              Especialidad y Ubicación
            </h4>
            <p className="mt-1 font-semibold text-slate-900">{worker.disciplina}</p>
            <p className="mt-0.5 text-xs text-slate-600">{worker.ubicacion}</p>
          </div>

          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#2A5C82]">
              Actividad técnica observada
            </h4>
            <p className="mt-1 text-slate-700">{worker.actividad}</p>
          </div>

          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#2A5C82]">
              Instrumentos y EPP (Equipo de Protección Personal)
            </h4>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-700">
              {worker.instrumentos.map((ins) => (
                <li key={ins}>{ins}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-emerald-900">
              Criterio de seguridad en maqueta
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-emerald-900">{worker.criterioSeguridad}</p>
          </div>

          <button
            type="button"
            onClick={() => onSelectRelatedComponent(worker.componenteRelacionado)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-[#0A192F] hover:bg-slate-100 cursor-pointer"
          >
            Ver ficha técnica de la infraestructura asociada
          </button>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // INFRASTRUCTURE COMPONENT TECHNICAL SHEET
  // =========================================================================
  if (!sheet) return null;
  const cert = CERTAINTY_LABELS[sheet.certeza];
  const linkedParticipants = getParticipantsByComponent(sheet.id);

  return (
    <aside
      role="region"
      aria-label={`Ficha técnica de ${sheet.nombre}`}
      className={`absolute right-3 z-30 flex w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white text-[#0B1D33] shadow-2xl sm:w-[400px] ${drawerBoundsClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-[#0A192F] px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="text-xs font-medium text-sky-200">{sheet.categoria}</p>
          <h3 className="font-display mt-0.5 text-base font-bold leading-snug text-white">
            {sheet.nombre}
          </h3>
        </div>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar ficha técnica"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-600 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Explicit Camera Actions (never moved automatically on selection) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2">
        <button
          type="button"
          onClick={() => onFocusComponent(sheet.id)}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#2A5C82] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E4463] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Focus className="h-3.5 w-3.5" aria-hidden="true" />
          Enfocar objeto
        </button>
        {hasPreviousCamera && (
          <button
            type="button"
            onClick={onRestorePreviousCamera}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            Vista anterior
          </button>
        )}
        <button
          type="button"
          onClick={onResetCamera}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Vista general
        </button>
      </div>

      {/* Organized Drawer Section Switcher */}
      <div
        role="tablist"
        aria-label="Secciones de la ficha técnica"
        className="grid grid-cols-3 border-b border-slate-200 bg-white text-xs font-semibold"
      >
        {(
          [
            { id: 'resumen', label: 'Resumen' },
            { id: 'ingenieria', label: 'Ingeniería' },
            { id: 'fuentes', label: 'Fuentes y certeza' },
          ] as { id: DrawerTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`border-b-2 py-2 text-center transition-colors cursor-pointer ${
              activeTab === t.id
                ? 'border-[#C83228] text-[#0A192F] bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
        {activeTab === 'resumen' && (
          <>
            <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${cert.tone}`}>
              <p>{cert.text}</p>
              <p className="mt-1 font-normal opacity-90">{sheet.notaCerteza}</p>
            </div>

            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#2A5C82]">
                Función dentro del puerto
              </h4>
              <p className="mt-1 text-slate-700">{sheet.funcion}</p>
            </div>

            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#2A5C82]">
                Operación y comportamiento en maqueta
              </h4>
              <p className="mt-1 text-slate-700">{sheet.operacionResumen}</p>
            </div>

            {sheet.datosReferencia.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-600">
                  Datos de referencia
                </h4>
                <dl className="mt-2 space-y-2">
                  {sheet.datosReferencia.map((d) => (
                    <div
                      key={d.label}
                      className="flex flex-col border-b border-slate-200/70 pb-1.5 last:border-none last:pb-0"
                    >
                      <dt className="text-xs text-slate-500">
                        {d.label} · {d.tipo}
                      </dt>
                      <dd className="font-mono-tech text-xs font-semibold text-[#0A192F]">
                        {d.valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#2A5C82]">
                Esquema explicativo
              </h4>
              <div className="mt-2">
                <TechnicalSchematicSVG tipo={sheet.esquemaTipo} />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{sheet.esquemaDescripcion}</p>
            </div>

            {linkedParticipants.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-display inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0A192F]">
                    <Building2 className="h-3.5 w-3.5 text-[#2A5C82]" aria-hidden="true" />
                    Participación documentada ({linkedParticipants.length})
                  </h4>
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                  {linkedParticipants.map((p) => (
                    <li key={p.id} className="border-b border-slate-200/70 pb-1.5 last:border-none last:pb-0">
                      <p className="font-semibold text-slate-900">{p.nombre}</p>
                      <p className="text-[11px] text-slate-600">{p.categoriaEtiqueta}</p>
                      {onNavigateToParticipant && (
                        <button
                          type="button"
                          onClick={() => onNavigateToParticipant(sheet.id, p.id)}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2A5C82] hover:underline cursor-pointer"
                        >
                          Ver en Participantes e inversión
                          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {activeTab === 'ingenieria' && (
          <>
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#2A5C82]">
                Materiales documentados en Chancay (Fase 1)
              </h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-700">
                {sheet.materialesDocumentados.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-700">
                Materiales habituales en este tipo de obra (contexto didáctico)
              </h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-slate-600">
                {sheet.materialesHabituales.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#2A5C82]">
                Principales elementos estructurales
              </h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-700">
                {sheet.elementosEstructurales.map((el) => (
                  <li key={el}>{el}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#2A5C82]">
                Proceso constructivo
              </h4>
              <p className="mt-1 text-slate-700">{sheet.procesoConstructivo}</p>
            </div>

            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#2A5C82]">
                Especialidades y relaciones
              </h4>
              <p className="mt-1 text-xs font-semibold text-slate-800">
                {sheet.especialidades.join(' · ')}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                {sheet.relaciones.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {activeTab === 'fuentes' && (
          <>
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <div>
                <p className="font-bold uppercase tracking-wider text-emerald-800">
                  Documentado (Fase 1 · {sheet.fechaReferencia})
                </p>
                <p className="mt-1 text-slate-700">{sheet.alcanceModelado.documentado}</p>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <p className="font-bold uppercase tracking-wider text-sky-900">
                  Reconstrucción aproximada por referencias
                </p>
                <p className="mt-1 text-slate-700">{sheet.alcanceModelado.aproximado}</p>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <p className="font-bold uppercase tracking-wider text-amber-900">
                  Detalle didáctico general de ingeniería
                </p>
                <p className="mt-1 text-slate-700">{sheet.alcanceModelado.didactico}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
              <p>
                <strong className="text-slate-800">Fuente pública base:</strong> {sheet.fuente}
              </p>
              <p className="mt-1">
                <strong className="text-slate-800">Etapa y fecha de referencia:</strong>{' '}
                {sheet.fechaReferencia}
              </p>
            </div>

            {linkedParticipants.length > 0 && onNavigateToParticipant && (
              <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-xs">
                <p className="font-semibold text-[#0A192F]">
                  Empresas y entidades vinculadas a este componente:
                </p>
                <p className="mt-1 text-slate-600">
                  {linkedParticipants.map((p) => p.nombre).join(' · ')}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToParticipant(sheet.id)}
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#0A192F] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A5F] cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Ir a ficha de participantes e inversión
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
