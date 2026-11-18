export type ComponentId =
  | 'rompeolas'
  | 'muelle'
  | 'grua-sts'
  | 'buque'
  | 'patio'
  | 'camiones'
  | 'tunel'
  | 'ingreso'
  | 'terreno'
  | 'oceano';

export type CameraPresetId =
  | 'general'
  | 'superior'
  | 'maritima'
  | 'muelles'
  | 'gruas'
  | 'patio'
  | 'tunel'
  | 'ingreso';

export type ExplorationMode =
  | 'libre'
  | 'guiado'
  | 'ingenieria'
  | 'operaciones'
  | 'construccion';

export type QualityMode = 'estandar' | 'ligera';

export type LightingMode = 'dia' | 'atardecer' | 'maqueta';

export type CertaintyLevel = 'documentado' | 'aproximado' | 'esquemático';

export interface LayerVisibility {
  terreno: boolean;
  estructuras: boolean;
  vehiculos: boolean;
  trabajadores: boolean;
  explicativos: boolean;
  senalizacion: boolean;
}

export interface SimulationState {
  isPlaying: boolean;
  oceanPlaying: boolean;
  oceanStatic: boolean;
  craneOperationActive: boolean;
  showVehicles: boolean;
  showWorkers: boolean;
  showTunnelCutaway: boolean;
  showStructuralCutaway: boolean;
}

export interface ModelingScopeBreakdown {
  documentado: string;
  aproximado: string;
  didactico: string;
}

export interface TechnicalSheet {
  id: ComponentId;
  nombre: string;
  categoria: string;
  funcion: string;
  materialesDocumentados: string[];
  materialesHabituales: string[];
  elementosEstructurales: string[];
  procesoConstructivo: string;
  operacionResumen: string;
  especialidades: string[];
  relaciones: string[];
  alcanceModelado: ModelingScopeBreakdown;
  esquemaTipo:
    | 'rompeolas'
    | 'muelle'
    | 'grua'
    | 'buque'
    | 'patio'
    | 'camiones'
    | 'tunel'
    | 'ingreso'
    | 'terreno'
    | 'oceano';
  esquemaDescripcion: string;
  fuente: string;
  fechaReferencia: string;
  certeza: CertaintyLevel;
  notaCerteza: string;
  cameraPreset: CameraPresetId;
  datosReferencia: {
    label: string;
    valor: string;
    tipo: 'Oficial / Público' | 'Referencia académica';
  }[];
}

export interface WorkerProfile {
  id: string;
  rol: string;
  disciplina: string;
  ubicacion: string;
  actividad: string;
  instrumentos: string[];
  criterioSeguridad: string;
  componenteRelacionado: ComponentId;
}

export interface EngineeringSpecialty {
  id: string;
  nombre: string;
  resumen: string;
  aplicacionChancay: string;
  aspectosClave: string[];
  componentesRelacionados: ComponentId[];
  cameraPreset: CameraPresetId;
}

export interface GuidedTourStep {
  id: string;
  titulo: string;
  subtitulo: string;
  duracionAprox: string;
  narrativa: string;
  componentId: ComponentId;
  cameraPreset: CameraPresetId;
  modoSugerido?: ExplorationMode;
}

export interface ConstructionPhase {
  fase: number;
  titulo: string;
  descripcion: string;
  hitosTecnicos: string[];
  componentesActivos: ComponentId[];
  cameraPreset: CameraPresetId;
}

export interface TimelineEvent {
  fecha: string;
  titulo: string;
  descripcion: string;
  fuente: string;
  certeza: CertaintyLevel;
}

export interface GlossaryTerm {
  termino: string;
  sigla?: string;
  definicion: string;
  relacionMaqueta: ComponentId;
}

export interface GalleryResource {
  id: string;
  titulo: string;
  entidad: string;
  tipo: string;
  descripcion: string;
  estadoImagen:
    | 'Esquema técnico interactivo local'
    | 'Referencia institucional externa verificada';
  urlOficial: string;
  esquema: TechnicalSheet['esquemaTipo'];
  componentId: ComponentId;
  requiresTunnelCutaway?: boolean;
}

export interface ApaReference {
  id: string;
  cita: string;
  url?: string;
  notaVerificacion: string;
}

export type ParticipantCategory =
  | 'propietarios'
  | 'constructores'
  | 'consultoras'
  | 'equipos';

export interface ProjectParticipant {
  id: string;
  nombre: string;
  categoria: ParticipantCategory;
  categoriaEtiqueta: string;
  funcion: string;
  alcanceEspecifico: string;
  etapa: string;
  componentesRelacionados: ComponentId[];
  periodoReferencia: string;
  notaAclaratoria?: string;
  fuenteNombre: string;
  fuenteUrl: string;
}

export interface DocumentedProfessional {
  id: string;
  nombre: string;
  cargoPeriodo: string;
  entidad: string;
  especialidadVerificada: string;
  contribucionProyecto: string;
  periodoReferencia: string;
  fuenteNombre: string;
  fuenteUrl: string;
}

export type InvestmentConceptType =
  | 'Inversión estimada / ejecutada'
  | 'Monto contractual reportado (subconjunto)'
  | 'Inversión proyectada multietapa'
  | 'Desglose unitario no público';

export interface InvestmentRecord {
  id: string;
  titulo: string;
  importeOriginal: string;
  moneda: 'USD' | 'Sin desglose público';
  fechaReferencia: string;
  etapaContratoComponente: string;
  concepto: InvestmentConceptType;
  notaAlcance: string;
  esSubconjuntoDeFase1?: boolean;
  fuenteNombre: string;
  fuenteUrl: string;
}

export type CommentCategory =
  | 'Comentario'
  | 'Sugerencia de mejora'
  | 'Corrección de información';

export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'removed';

export interface PublicComment {
  id: string;
  category: CommentCategory;
  authorName: string;
  message: string;
  createdAt: string;
  reportsCount: number;
}

export interface ModerationComment extends PublicComment {
  status: CommentStatus;
  updatedAt: string;
  reportReasons: string[];
}

export interface CommunitySummaryResponse {
  likesCount: number;
  likedByVisitor: boolean;
  comments: PublicComment[];
  totalApproved: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  persistenceMode: 'server-json';
  moderationConfigured: boolean;
}

