import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sun,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CameraPresetId,
  ComponentId,
  ExplorationMode,
  LayerVisibility,
  LightingMode,
  QualityMode,
  SimulationState,
} from '../types/port';
import {
  CAMERA_PRESET_LABELS,
  CONSTRUCTION_PHASES,
  ENGINEERING_SPECIALTIES,
  GUIDED_TOUR_STEPS,
  TECHNICAL_SHEETS,
  WORKER_PROFILES,
} from '../data/portData';
import { PortSceneManager } from '../three/PortSceneManager';
import { TechnicalSheetDrawer } from './TechnicalSheetDrawer';

interface PortExplorer3DProps {
  selectedComponent: ComponentId | null;
  onSelectComponent: (id: ComponentId | null) => void;
  activePreset: CameraPresetId;
  onChangePreset: (preset: CameraPresetId) => void;
  mode: ExplorationMode;
  onChangeMode: (mode: ExplorationMode) => void;
  activeSpecialtyId: string;
  onChangeSpecialtyId: (id: string) => void;
  presentationMode: boolean;
  onTogglePresentationMode: () => void;
  externalFocusNonce: number;
  tunnelCutawayNonce?: number;
  structuralCutawayNonce?: number;
  onNavigateToParticipant?: (componentId: ComponentId, participantId?: string) => void;
}

type DockTab = 'vistas' | 'modos' | 'animaciones' | 'capas';

const LIGHTING_LABELS: Record<LightingMode, string> = {
  dia: 'Día',
  atardecer: 'Atardecer',
  maqueta: 'Maqueta',
};

export const PortExplorer3D: React.FC<PortExplorer3DProps> = ({
  selectedComponent,
  onSelectComponent,
  activePreset,
  onChangePreset,
  mode,
  onChangeMode,
  activeSpecialtyId,
  onChangeSpecialtyId,
  presentationMode,
  onTogglePresentationMode,
  externalFocusNonce,
  tunnelCutawayNonce = 0,
  structuralCutawayNonce = 0,
  onNavigateToParticipant,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<PortSceneManager | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [webglError, setWebglError] = useState<string | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [dockTab, setDockTab] = useState<DockTab>('vistas');
  const [quality, setQuality] = useState<QualityMode>('estandar');
  const [lightingMode, setLightingMode] = useState<LightingMode>('dia');
  const [craneStepLabel, setCraneStepLabel] = useState('1. Preparación de maniobra');
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [hasPreviousCamera, setHasPreviousCamera] = useState(false);
  const [azimuthDeg, setAzimuthDeg] = useState<number>(-52);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [tourIndex, setTourIndex] = useState(0);
  const [tourAutoPlay, setTourAutoPlay] = useState(!prefersReducedMotion);
  const [constructionPhase, setConstructionPhase] = useState(5);

  const [simState, setSimState] = useState<SimulationState>({
    isPlaying: !prefersReducedMotion,
    oceanPlaying: !prefersReducedMotion,
    oceanStatic: prefersReducedMotion,
    craneOperationActive: !prefersReducedMotion,
    showVehicles: true,
    showWorkers: true,
    showTunnelCutaway: false,
    showStructuralCutaway: false,
  });

  const [layers, setLayers] = useState<LayerVisibility>({
    terreno: true,
    estructuras: true,
    vehiculos: true,
    trabajadores: true,
    explicativos: true,
    senalizacion: true,
  });

  // Mount Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const manager = new PortSceneManager(
      container,
      {
        onSelectComponent: (id) => {
          setSelectedWorkerId(null);
          onSelectComponent(id);
        },
        onSelectWorker: (workerId) => {
          onSelectComponent(null);
          setSelectedWorkerId(workerId);
        },
        onCranePhaseChange: (_idx, label) => {
          setCraneStepLabel(label);
        },
        onCameraHistoryChange: (hasPrev) => {
          setHasPreviousCamera(hasPrev);
        },
        onCameraAzimuthChange: (deg) => {
          setAzimuthDeg(deg);
        },
        onWebGLError: (msg) => {
          setWebglError(msg);
        },
      },
      quality
    );

    managerRef.current = manager;
    return () => {
      manager.dispose();
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync simulation state
  useEffect(() => {
    managerRef.current?.updateSimulationState(simState);
  }, [simState]);

  // Sync layers
  useEffect(() => {
    managerRef.current?.updateLayerVisibility(layers);
  }, [layers]);

  // Sync quality
  useEffect(() => {
    managerRef.current?.setQualityMode(quality);
  }, [quality]);

  // Sync lighting mode
  useEffect(() => {
    managerRef.current?.setLightingMode(lightingMode);
  }, [lightingMode]);

  // Sync selection highlight (component or worker)
  useEffect(() => {
    if (selectedWorkerId) {
      managerRef.current?.setSelectedWorker(selectedWorkerId);
    } else {
      managerRef.current?.setSelectedComponent(selectedComponent);
    }
  }, [selectedComponent, selectedWorkerId]);

  // Sync external camera preset / focus triggers from AcademicSections
  useEffect(() => {
    if (externalFocusNonce > 0) {
      managerRef.current?.setCameraPreset(activePreset, true);
    }
  }, [activePreset, externalFocusNonce]);

  useEffect(() => {
    if (tunnelCutawayNonce > 0) {
      setSimState((s) => ({ ...s, showTunnelCutaway: true }));
    }
  }, [tunnelCutawayNonce]);

  useEffect(() => {
    if (structuralCutawayNonce > 0) {
      setSimState((s) => ({ ...s, showStructuralCutaway: true }));
    }
  }, [structuralCutawayNonce]);

  // Close component search popover on outside click or Escape
  useEffect(() => {
    if (!searchOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchOpen]);

  // Guided Tour 1-min auto-advance (~10s per step across 6 steps)
  useEffect(() => {
    if (mode !== 'guiado' || !tourAutoPlay) return;
    const timer = window.setInterval(() => {
      setTourIndex((prev) => (prev + 1) % GUIDED_TOUR_STEPS.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [mode, tourAutoPlay]);

  // Sync Exploration Mode behaviors
  useEffect(() => {
    const mgr = managerRef.current;
    if (!mgr) return;

    if (mode === 'libre') {
      mgr.setSpecialtyHighlight(null);
      mgr.setConstructionComponents(null);
    } else if (mode === 'guiado') {
      mgr.setSpecialtyHighlight(null);
      mgr.setConstructionComponents(null);
      const step = GUIDED_TOUR_STEPS[tourIndex];
      if (step) {
        mgr.setCameraPreset(step.cameraPreset);
        setSelectedWorkerId(null);
        onSelectComponent(step.componentId);
        if (step.componentId === 'tunel') {
          setSimState((s) => ({ ...s, showTunnelCutaway: true }));
        }
      }
    } else if (mode === 'ingenieria') {
      mgr.setConstructionComponents(null);
      const spec = ENGINEERING_SPECIALTIES.find((sp) => sp.id === activeSpecialtyId);
      if (spec) {
        mgr.setSpecialtyHighlight(spec.componentesRelacionados);
        mgr.setCameraPreset(spec.cameraPreset);
      }
    } else if (mode === 'operaciones') {
      mgr.setSpecialtyHighlight(null);
      mgr.setConstructionComponents(null);
      setSimState((s) => ({
        ...s,
        isPlaying: true,
        craneOperationActive: true,
        showVehicles: true,
      }));
      mgr.setCameraPreset('gruas');
    } else if (mode === 'construccion') {
      mgr.setSpecialtyHighlight(null);
      const ph = CONSTRUCTION_PHASES.find((p) => p.fase === constructionPhase);
      if (ph) {
        mgr.setConstructionComponents(ph.componentesActivos);
        mgr.setCameraPreset(ph.cameraPreset);
      }
    }
  }, [mode, tourIndex, activeSpecialtyId, constructionPhase, onSelectComponent]);

  const handlePresetClick = (preset: CameraPresetId) => {
    onChangePreset(preset);
    managerRef.current?.setCameraPreset(preset, true);
  };

  const handleExportGLB = async () => {
    if (!managerRef.current) return;
    setExportStatus('Generando archivo .GLB...');
    try {
      await managerRef.current.exportPortGLB();
      setExportStatus('Modelo 3D exportado en formato .GLB (geometría y materiales visibles).');
    } catch {
      setExportStatus('No se pudo generar el archivo .GLB en este navegador.');
    }
  };

  const handleImportGLB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !managerRef.current) return;
    try {
      const name = await managerRef.current.importExternalGLB(file);
      setExportStatus(`Modelo externo cargado en la maqueta: ${name}`);
    } catch {
      setExportStatus('El archivo seleccionado no es un modelo .GLB/.GLTF válido.');
    }
    e.target.value = '';
  };

  const filteredComponents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = Object.values(TECHNICAL_SHEETS);
    if (!q) return list;
    return list.filter(
      (s) =>
        s.nombre.toLowerCase().includes(q) ||
        s.categoria.toLowerCase().includes(q) ||
        s.especialidades.some((e) => e.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const filteredWorkers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = Object.values(WORKER_PROFILES);
    if (!q) return list;
    return list.filter(
      (w) => w.rol.toLowerCase().includes(q) || w.disciplina.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const selectedSheet = selectedComponent ? TECHNICAL_SHEETS[selectedComponent] : null;
  const selectedWorker = selectedWorkerId ? WORKER_PROFILES[selectedWorkerId] ?? null : null;
  const activeTourStep = GUIDED_TOUR_STEPS[tourIndex];
  const activeSpec = ENGINEERING_SPECIALTIES.find((s) => s.id === activeSpecialtyId);
  const activeConstruction = CONSTRUCTION_PHASES.find((p) => p.fase === constructionPhase);

  return (
    <section
      id="explorador-3d"
      aria-label="Explorador 3D interactivo del Megapuerto de Chancay"
      className={
        presentationMode
          ? 'fixed inset-0 z-50 flex flex-col bg-[#dce6f2]'
          : 'relative border-b border-slate-200 bg-[#dce6f2]'
      }
    >
      <div
        className={
          presentationMode
            ? 'relative h-full w-full overflow-hidden'
            : 'relative h-[80vh] min-h-[580px] max-h-[860px] w-full overflow-hidden'
        }
      >
        {/* Isolated WebGL Mount Container */}
        <div ref={mountRef} className="h-full w-full" />

        {/* WebGL Fallback if unavailable */}
        {webglError && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0A192F] p-6 text-white">
            <div className="max-w-lg rounded-xl border border-slate-700 bg-[#11243E] p-6">
              <h2 className="font-display text-xl font-bold">
                Visor 3D no disponible en este dispositivo
              </h2>
              <p className="mt-2 text-sm text-slate-300">{webglError}</p>
              <p className="mt-3 text-sm text-slate-300">
                La maqueta representa el Terminal Portuario Multipropósito de Chancay (Fase 1,
                noviembre 2024): rompeolas principal (~2.7 km) abrigando cuatro amarraderos sobre
                pilotes, grúas pórtico STS, patio de contenedores, túnel viaducto subterráneo
                (~1.8 km) y complejo de ingreso logístico. Puedes consultar las fichas técnicas y
                esquemas en las secciones inferiores.
              </p>
            </div>
          </div>
        )}

        {/* Unified Responsive Top HUD Bar (prevents overlap at 360px/390px/768px) */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-start justify-between gap-2">
          {/* Left Status + Contextual Mode Panel */}
          <div className="flex max-w-full flex-col gap-1.5 sm:max-w-md">
            <div className="pointer-events-auto rounded-lg border border-slate-700 bg-[#0A192F]/94 px-3 py-2 text-white shadow-md">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs">
                <span className="font-display font-semibold tracking-wide text-sky-200">
                  Maqueta Digital Educativa 3D · Fase 1 (Nov 2024)
                </span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="font-mono-tech text-slate-300">
                  {quality === 'estandar' ? 'Estándar' : 'Ligera'}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-300">
                Escala proporcional didáctica (aprox. sin valor contractual) · Clic en obras o
                personal para inspeccionar.
              </p>
              {(mode === 'operaciones' || simState.craneOperationActive) && (
                <p className="font-mono-tech mt-1 text-[11px] text-amber-200">
                  Ciclo STS #1 (18 s ilustrativo): {craneStepLabel}
                </p>
              )}
            </div>

            {/* Cutaway Explanatory Legend */}
            {(simState.showTunnelCutaway || simState.showStructuralCutaway) && (
              <div className="pointer-events-auto rounded-lg border border-sky-300 bg-white/95 px-3 py-2 text-[11px] text-[#0B1D33] shadow-md">
                <p className="font-display font-bold text-[#0A192F]">
                  Leyenda de corte didáctico activo
                </p>
                {simState.showTunnelCutaway && (
                  <p className="mt-0.5 text-slate-700">
                    <strong>Túnel:</strong> arco azul translúcido = sostenimiento primario
                    (shotcrete/pernos); bóveda interior clara = revestimiento definitivo; calzada con
                    cunetas laterales.
                  </p>
                )}
                {simState.showStructuralCutaway && (
                  <p className="mt-0.5 text-slate-700">
                    <strong>Muelle 4:</strong> losa en transparencia azul para exponer vigas
                    portacarril, vigas transversales y retícula de pilotes marinos.
                  </p>
                )}
              </div>
            )}

            {/* Contextual Mode Sub-Panel: Guided Tour */}
            {mode === 'guiado' && activeTourStep && (
              <div className="pointer-events-auto rounded-lg border border-slate-300 bg-white/95 p-3 text-[#0B1D33] shadow-lg">
                <div className="flex items-center justify-between gap-2 text-xs text-[#2A5C82]">
                  <span className="font-semibold">Recorrido guiado (1 min)</span>
                  <span className="font-mono-tech">{activeTourStep.duracionAprox}</span>
                </div>
                <h3 className="font-display mt-1 text-sm font-bold">{activeTourStep.titulo}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">
                  {activeTourStep.narrativa}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setTourIndex(
                          (i) => (i - 1 + GUIDED_TOUR_STEPS.length) % GUIDED_TOUR_STEPS.length
                        )
                      }
                      className="inline-flex items-center gap-0.5 rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Ant.
                    </button>
                    <button
                      type="button"
                      onClick={() => setTourAutoPlay((a) => !a)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 cursor-pointer"
                    >
                      {tourAutoPlay ? (
                        <>
                          <Pause className="h-3 w-3" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Auto
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTourIndex((i) => (i + 1) % GUIDED_TOUR_STEPS.length)
                      }
                      className="inline-flex items-center gap-0.5 rounded bg-[#0A192F] px-2 py-1 text-xs font-semibold text-white hover:bg-[#1E3A5F] cursor-pointer"
                    >
                      Sig.
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tech text-[11px] text-slate-500">
                      {tourIndex + 1}/{GUIDED_TOUR_STEPS.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeMode('libre')}
                      className="text-[11px] font-semibold text-[#C83228] hover:underline cursor-pointer"
                    >
                      Salir a modo libre
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Contextual Mode Sub-Panel: Engineering */}
            {mode === 'ingenieria' && activeSpec && (
              <div className="pointer-events-auto rounded-lg border border-slate-300 bg-white/95 p-3 text-[#0B1D33] shadow-lg">
                <label htmlFor="spec-selector" className="block text-xs font-semibold text-[#2A5C82]">
                  Especialidad de Ingeniería Civil resaltada:
                </label>
                <select
                  id="spec-selector"
                  value={activeSpecialtyId}
                  onChange={(e) => onChangeSpecialtyId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
                >
                  {ENGINEERING_SPECIALTIES.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.nombre}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">
                  {activeSpec.aplicacionChancay}
                </p>
              </div>
            )}

            {/* Contextual Mode Sub-Panel: Construction Phases */}
            {mode === 'construccion' && activeConstruction && (
              <div className="pointer-events-auto rounded-lg border border-slate-300 bg-white/95 p-3 text-[#0B1D33] shadow-lg">
                <div className="flex items-center justify-between text-xs font-semibold text-[#C83228]">
                  <span>Secuencia Constructiva Esquemática</span>
                  <span className="font-mono-tech">Fase {activeConstruction.fase} / 5</span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-900">{activeConstruction.titulo}</p>
                <p className="mt-1 text-xs text-slate-700">{activeConstruction.descripcion}</p>
                <div className="mt-2.5 flex items-center gap-1">
                  {CONSTRUCTION_PHASES.map((ph) => (
                    <button
                      key={ph.fase}
                      type="button"
                      onClick={() => setConstructionPhase(ph.fase)}
                      className={`flex-1 rounded py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        constructionPhase === ph.fase
                          ? 'bg-[#0A192F] text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      F{ph.fase}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Action Controls (Accessible Search/Select, Lighting, Quality, Presentation) */}
          <div className="pointer-events-auto relative flex flex-wrap items-center justify-end gap-1.5">
            <div ref={searchContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen((o) => !o)}
                aria-expanded={searchOpen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A192F]/94 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1E3A5F] whitespace-nowrap cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Índice / Buscar</span>
              </button>

              {searchOpen && (
                <div className="absolute right-0 mt-1.5 w-72 rounded-xl border border-slate-300 bg-white p-2.5 text-[#0B1D33] shadow-2xl z-40">
                  <label htmlFor="component-search-input" className="sr-only">
                    Buscar componente o rol técnico
                  </label>
                  <input
                    id="component-search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar muelle, túnel, topógrafo..."
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs focus:border-[#2A5C82] focus:outline-none"
                  />
                  <div className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Infraestructura ({filteredComponents.length})
                    </p>
                    {filteredComponents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedWorkerId(null);
                          onSelectComponent(s.id);
                          setSearchOpen(false);
                        }}
                        className={`block w-full rounded px-2 py-1.5 text-left hover:bg-slate-100 cursor-pointer ${
                          selectedComponent === s.id ? 'bg-sky-50 font-semibold text-[#0A192F]' : ''
                        }`}
                      >
                        {s.nombre}
                      </button>
                    ))}
                    <p className="px-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Personal en escena ({filteredWorkers.length})
                    </p>
                    {filteredWorkers.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          onSelectComponent(null);
                          setSelectedWorkerId(w.id);
                          setSearchOpen(false);
                        }}
                        className={`block w-full rounded px-2 py-1.5 text-left hover:bg-amber-50 cursor-pointer ${
                          selectedWorkerId === w.id ? 'bg-amber-50 font-semibold text-[#0A192F]' : ''
                        }`}
                      >
                        {w.rol}
                      </button>
                    ))}
                    {filteredComponents.length === 0 && filteredWorkers.length === 0 && (
                      <p className="px-2 py-2 text-slate-500">Sin coincidencias.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setLightingMode((m) =>
                  m === 'dia' ? 'atardecer' : m === 'atardecer' ? 'maqueta' : 'dia'
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#0A192F]/94 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1E3A5F] whitespace-nowrap cursor-pointer"
              title="Cambiar iluminación: Día (predeterminada), Atardecer o Estudio Maqueta"
            >
              <Sun className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span>Luz: {LIGHTING_LABELS[lightingMode]}</span>
            </button>

            <button
              type="button"
              onClick={() => setQuality((q) => (q === 'estandar' ? 'ligera' : 'estandar'))}
              className="rounded-lg border border-slate-700 bg-[#0A192F]/94 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1E3A5F] whitespace-nowrap shrink-0 cursor-pointer"
              title="Alternar configuración gráfica Estándar o Ligera"
            >
              {quality === 'estandar' ? 'Estándar' : 'Ligera'}
            </button>

            <button
              type="button"
              onClick={() => handlePresetClick('superior')}
              title="Orientación Norte geográfico en tiempo real (-X Océano Pacífico / +X Tierra firme). Clic para vista superior orientada al Norte."
              aria-label="Brújula de orientación Norte geográfico. Clic para vista superior."
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A192F]/94 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1E3A5F] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="shrink-0 transition-transform duration-150"
                style={{ transform: `rotate(${azimuthDeg}deg)` }}
              >
                <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(148,163,184,0.45)" strokeWidth="1.5" />
                <polygon points="12,3 15.2,12 12,10.2 8.8,12" fill="#C83228" />
                <polygon points="12,21 14.8,12 12,13.8 9.2,12" fill="#cbd5e1" />
              </svg>
              <span className="font-mono-tech text-[11px]">N</span>
            </button>

            <button
              type="button"
              onClick={onTogglePresentationMode}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#0A192F]/94 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A5F] whitespace-nowrap shrink-0 cursor-pointer"
              aria-label={presentationMode ? 'Salir de modo presentación' : 'Modo presentación'}
            >
              {presentationMode ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Salir exposición</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exposición</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Technical Sheet / Worker Drawer (Closed until an object or worker is selected; never auto-moves camera) */}
        <TechnicalSheetDrawer
          sheet={selectedSheet}
          worker={selectedWorker}
          hasPreviousCamera={hasPreviousCamera}
          dockCollapsed={dockCollapsed}
          onClose={() => {
            onSelectComponent(null);
            setSelectedWorkerId(null);
          }}
          onFocusComponent={(id) => managerRef.current?.focusComponent(id)}
          onFocusWorker={(workerId) => managerRef.current?.focusWorker(workerId)}
          onSelectRelatedComponent={(id) => {
            setSelectedWorkerId(null);
            onSelectComponent(id);
          }}
          onRestorePreviousCamera={() => managerRef.current?.restorePreviousCamera()}
          onResetCamera={() => handlePresetClick('general')}
          onNavigateToParticipant={onNavigateToParticipant}
        />

        {/* Collapsible Ergonomic Bottom Control Dock */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center px-3">
          <button
            type="button"
            onClick={() => setDockCollapsed((c) => !c)}
            className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-t-lg border border-slate-700 bg-[#0A192F] px-3.5 py-1 text-xs font-medium text-white shadow cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Mostrar controles 3D
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Ocultar controles
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="pointer-events-auto w-full max-w-[960px] rounded-xl border border-slate-700 bg-[#0A192F]/95 p-3 text-white shadow-2xl">
              {/* Dock Navigation Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2">
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      { id: 'vistas', label: 'Vistas de cámara' },
                      { id: 'modos', label: 'Modos de exploración' },
                      { id: 'animaciones', label: 'Operaciones y cortes' },
                      { id: 'capas', label: 'Capas y exportar GLB' },
                    ] as { id: DockTab; label: string }[]
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDockTab(t.id)}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        dockTab === t.id
                          ? 'bg-[#C83228] text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Quick Playback + Orbit Nudge Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSimState((s) => ({ ...s, isPlaying: !s.isPlaying }))
                    }
                    className="inline-flex items-center gap-1 rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 cursor-pointer"
                    aria-label={simState.isPlaying ? 'Pausar animaciones' : 'Iniciar animaciones'}
                  >
                    {simState.isPlaying ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        Iniciar
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => managerRef.current?.nudgeCamera(0.25, 0, 1)}
                    aria-label="Girar cámara a la izquierda"
                    className="rounded border border-slate-600 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => managerRef.current?.nudgeCamera(-0.25, 0, 1)}
                    aria-label="Girar cámara a la derecha"
                    className="rounded border border-slate-600 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => managerRef.current?.nudgeCamera(0, 0, 0.85)}
                    aria-label="Acercar cámara"
                    className="rounded border border-slate-600 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => managerRef.current?.nudgeCamera(0, 0, 1.18)}
                    aria-label="Alejar cámara"
                    className="rounded border border-slate-600 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('general')}
                    aria-label="Restablecer vista general"
                    className="rounded border border-slate-600 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Tab 1: 8 Camera Views */}
              {dockTab === 'vistas' && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {(Object.keys(CAMERA_PRESET_LABELS) as CameraPresetId[]).map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => handlePresetClick(pid)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activePreset === pid
                          ? 'bg-[#2A5C82] text-white'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {CAMERA_PRESET_LABELS[pid]}
                    </button>
                  ))}
                </div>
              )}

              {/* Tab 2: 5 Exploration Modes */}
              {dockTab === 'modos' && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'libre', label: 'Modo libre' },
                      { id: 'guiado', label: 'Recorrido guiado (1 min)' },
                      { id: 'ingenieria', label: 'Modo Ingeniería Civil' },
                      { id: 'operaciones', label: 'Modo Operaciones' },
                      { id: 'construccion', label: 'Modo Construcción' },
                    ] as { id: ExplorationMode; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeMode(m.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        mode === m.id
                          ? 'bg-[#2A5C82] text-white'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Tab 3: Operations, Ocean, Static Ocean, Vehicles, Workers, Cutaways */}
              {dockTab === 'animaciones' && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setSimState((s) => ({
                        ...s,
                        isPlaying: true,
                        craneOperationActive: !s.craneOperationActive,
                      }))
                    }
                    className={`rounded-md px-2.5 py-1.5 font-medium cursor-pointer ${
                      simState.craneOperationActive
                        ? 'bg-[#2A5C82] text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Grúa STS: {simState.craneOperationActive ? 'Activa' : 'Pausada'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSimState((s) => ({
                        ...s,
                        oceanStatic: false,
                        oceanPlaying: !s.oceanPlaying,
                      }))
                    }
                    className={`rounded-md px-2.5 py-1.5 font-medium cursor-pointer ${
                      simState.oceanPlaying && !simState.oceanStatic
                        ? 'bg-[#2A5C82] text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Oleaje: {simState.oceanPlaying && !simState.oceanStatic ? 'Activo' : 'Pausado'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSimState((s) => ({ ...s, oceanStatic: !s.oceanStatic }))
                    }
                    className={`rounded-md px-2.5 py-1.5 font-medium cursor-pointer ${
                      simState.oceanStatic
                        ? 'bg-[#2A5C82] text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Mar estático: {simState.oceanStatic ? 'Sí' : 'No'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSimState((s) => ({ ...s, showVehicles: !s.showVehicles }))
                    }
                    className={`rounded-md px-2.5 py-1.5 font-medium cursor-pointer ${
                      simState.showVehicles
                        ? 'bg-[#2A5C82] text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Vehículos: {simState.showVehicles ? 'Visibles' : 'Ocultos'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSimState((s) => ({ ...s, showWorkers: !s.showWorkers }))
                    }
                    className={`rounded-md px-2.5 py-1.5 font-medium cursor-pointer ${
                      simState.showWorkers
                        ? 'bg-[#2A5C82] text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Personal: {simState.showWorkers ? 'Visible' : 'Oculto'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !simState.showTunnelCutaway;
                      setSimState((s) => ({ ...s, showTunnelCutaway: next }));
                      if (next) handlePresetClick('tunel');
                    }}
                    className={`rounded-md px-2.5 py-1.5 font-medium cursor-pointer ${
                      simState.showTunnelCutaway
                        ? 'bg-[#C83228] text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Corte túnel
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !simState.showStructuralCutaway;
                      setSimState((s) => ({ ...s, showStructuralCutaway: next }));
                      if (next) handlePresetClick('muelles');
                    }}
                    className={`rounded-md px-2.5 py-1.5 font-medium cursor-pointer ${
                      simState.showStructuralCutaway
                        ? 'bg-[#C83228] text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Corte pilotes muelle
                  </button>

                  <button
                    type="button"
                    onClick={() => managerRef.current?.resetOperations()}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 font-medium text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reiniciar ciclo
                  </button>
                </div>
              )}

              {/* Tab 4: Visual Layers & GLB Export/Import */}
              {dockTab === 'capas' && (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1 font-semibold text-sky-200">
                      <Layers className="h-3.5 w-3.5" />
                      Capas:
                    </span>
                    {(
                      [
                        { key: 'terreno', label: 'Terreno' },
                        { key: 'estructuras', label: 'Estructuras' },
                        { key: 'vehiculos', label: 'Vehículos' },
                        { key: 'trabajadores', label: 'Personal' },
                        { key: 'explicativos', label: 'Explicativos' },
                        { key: 'senalizacion', label: 'Señalización' },
                      ] as { key: keyof LayerVisibility; label: string }[]
                    ).map((item) => (
                      <label key={item.key} className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={layers[item.key]}
                          onChange={(e) =>
                            setLayers((prev) => ({ ...prev, [item.key]: e.target.checked }))
                          }
                          className="h-3.5 w-3.5 accent-[#C83228]"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportGLB}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#2A5C82] px-3 py-1.5 font-semibold text-white hover:bg-[#1E4463] cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exportar .GLB
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".glb,.gltf"
                      onChange={handleImportGLB}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 font-medium text-slate-200 hover:bg-slate-700 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Cargar .GLB local
                    </button>
                  </div>

                  {exportStatus && (
                    <p className="w-full text-xs text-sky-200">
                      {exportStatus} (El archivo GLB (GL Transmission Format binario) exporta
                      geometría y materiales visibles estáticos, sin pistas de animación ni interfaz
                      web.)
                    </p>
                  )}
                </div>
              )}

              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Eye className="h-3 w-3 shrink-0" />
                <span>
                  Arrastra para rotar · Rueda/pellizco para zoom · Clic derecho para desplazar ·
                  Clic sobre cualquier obra o trabajador para abrir su ficha sin mover la cámara.
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
