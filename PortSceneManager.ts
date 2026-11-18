import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  CameraPresetId,
  ComponentId,
  LayerVisibility,
  LightingMode,
  QualityMode,
  SimulationState,
} from '../types/port';
import { createPortMaterialLibrary, PortMaterialLibrary } from './materials';
import { createPacificOcean, OceanController } from './ocean';
import { createCoastalTerrain, TerrainController } from './terrain';
import { buildPortInfrastructure, InfrastructureHandles } from './infrastructure';
import { createPortOperations, OperationsController } from './operations';

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  general: {
    position: [-92, 58, 86],
    target: [20, 2, -2],
  },
  superior: {
    position: [24, 175, 2],
    target: [24, 0, -2],
  },
  maritima: {
    position: [-98, 25, 36],
    target: [-34, 2, -14],
  },
  muelles: {
    position: [-42, 22, 30],
    target: [-10, 2.5, -12],
  },
  gruas: {
    position: [-30, 18, 26],
    target: [-10, 7.5, 6],
  },
  patio: {
    position: [40, 36, 46],
    target: [20, 2, 0],
  },
  tunel: {
    position: [66, 26, 36],
    target: [66, 2.8, 4],
  },
  ingreso: {
    position: [138, 30, 44],
    target: [114, 3.5, 4],
  },
};

const COMPONENT_FOCUS_PRESETS: Record<ComponentId, CameraPreset> = {
  rompeolas: { position: [-92, 28, -32], target: [-46, 1.5, -38] },
  muelle: { position: [-38, 18, 28], target: [-8, 2.0, -8] },
  'grua-sts': { position: [-28, 18, 24], target: [-10, 7.5, 6] },
  buque: { position: [-44, 15, 24], target: [-17.0, 3.5, 6] },
  patio: { position: [38, 32, 42], target: [20, 2, 0] },
  camiones: { position: [12, 16, 24], target: [4, 2.5, 6] },
  tunel: { position: [66, 22, 30], target: [66, 3, 4] },
  ingreso: { position: [136, 26, 38], target: [114, 3.5, 4] },
  terreno: { position: [86, 48, 72], target: [54, 4, -8] },
  oceano: { position: [-104, 24, 32], target: [-48, 0, -10] },
};

export interface PerformanceSnapshot {
  oceanUpdateMs: number;
  renderMs: number;
  oceanVertices: number;
  quality: QualityMode;
  viewport: { width: number; height: number };
}

export interface PortSceneCallbacks {
  onSelectComponent: (id: ComponentId | null) => void;
  onSelectWorker: (workerId: string | null) => void;
  onCranePhaseChange: (phaseIndex: number, label: string) => void;
  onCameraHistoryChange?: (hasPrevious: boolean) => void;
  onCameraAzimuthChange?: (degrees: number) => void;
  onWebGLError: (message: string) => void;
}

export class PortSceneManager {
  private container: HTMLElement;
  private callbacks: PortSceneCallbacks;
  private isSoftwareGl: boolean;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private envRT: THREE.WebGLRenderTarget | null = null;

  private portRoot = new THREE.Group();
  private materials!: PortMaterialLibrary;
  private ocean!: OceanController;
  private terrain!: TerrainController;
  private infra!: InfrastructureHandles;
  private ops!: OperationsController;

  private selectionBoxHelper: THREE.Box3Helper | null = null;
  private specialtyHighlights: THREE.Box3Helper[] = [];
  private externalGroup = new THREE.Group();

  private simState: SimulationState = {
    isPlaying: true,
    oceanPlaying: true,
    oceanStatic: false,
    craneOperationActive: true,
    showVehicles: true,
    showWorkers: true,
    showTunnelCutaway: false,
    showStructuralCutaway: false,
  };

  private layers: LayerVisibility = {
    terreno: true,
    estructuras: true,
    vehiculos: true,
    trabajadores: true,
    explicativos: true,
    senalizacion: true,
  };

  private quality: QualityMode = 'estandar';
  private lightingMode: LightingMode = 'dia';
  private activeConstructionComponents: ComponentId[] | null = null;

  // Camera damping & history state
  private camAnimating = false;
  private camTargetPos = new THREE.Vector3();
  private camTargetLook = new THREE.Vector3();
  private previousCameraState: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;

  // Loop, performance & raycasting state
  private frameId = 0;
  private clock = new THREE.Clock();
  private oceanTime = 0;
  private lastPhaseIdx = -1;
  private lastAzimuthDeg = 999;
  private lastRenderMs = 0;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerDownPos = { x: 0, y: 0 };
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, callbacks: PortSceneCallbacks, initialQuality: QualityMode) {
    this.container = container;
    this.callbacks = callbacks;
    this.quality = initialQuality;

    this.isSoftwareGl = PortSceneManager.detectSoftwareGL();
    this.init();
  }

  private static detectSoftwareGL(): boolean {
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private computeAspectAdjustedPreset(preset: CameraPreset): {
    pos: THREE.Vector3;
    look: THREE.Vector3;
  } {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const aspect = w / h;

    const look = new THREE.Vector3(...preset.target);
    const pos = new THREE.Vector3(...preset.position);

    // On narrow mobile portrait viewports, gently pull back camera along its viewing ray
    // so the full terminal footprint remains visible inside the viewport.
    if (aspect < 1.0) {
      const pullFactor = THREE.MathUtils.clamp(1.08 / Math.max(aspect, 0.58), 1.0, 1.58);
      const offset = pos.clone().sub(look).multiplyScalar(pullFactor);
      pos.copy(look).add(offset);
    }

    return { pos, look };
  }

  private init() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl && this.quality === 'estandar',
        powerPreference: 'high-performance',
      });
    } catch {
      this.callbacks.onWebGLError(
        'El navegador no pudo inicializar un contexto WebGL compatible para la maqueta 3D.'
      );
      return;
    }

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setPixelRatio(
      this.isSoftwareGl || this.quality === 'ligera'
        ? 1
        : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.quality === 'estandar';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xdce6f2);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0xdce6f2, 0.0018);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.55;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 650);
    const initialCam = this.computeAspectAdjustedPreset(CAMERA_PRESETS.general);
    this.camera.position.copy(initialCam.pos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minPolarAngle = 0.08;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 260;
    this.controls.target.copy(initialCam.look);
    this.controls.update();

    this.controls.addEventListener('start', () => {
      this.camAnimating = false;
    });

    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x9c8b75, 0.85);
    this.hemiLight.position.set(0, 120, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e4, 1.85);
    this.sunLight.position.set(-65, 95, 65);
    this.sunLight.castShadow = !this.isSoftwareGl && this.quality === 'estandar';
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 15;
    this.sunLight.shadow.camera.far = 280;
    const d = 105;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0xc7dfff, 0.42);
    this.rimLight.position.set(95, 45, -80);
    this.scene.add(this.rimLight);

    const isLigera = this.quality === 'ligera';
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.materials = createPortMaterialLibrary(maxAniso, this.isSoftwareGl);
    this.ocean = createPacificOcean(isLigera);
    this.terrain = createCoastalTerrain(this.materials, isLigera);
    this.infra = buildPortInfrastructure(this.materials, isLigera);
    this.ops = createPortOperations(
      this.materials,
      this.infra.heroCrane,
      this.terrain.groundHeightAt,
      isLigera
    );

    this.portRoot.name = 'MegapuertoChancay_Maqueta3D';
    this.portRoot.add(
      this.ocean.group,
      this.terrain.group,
      this.infra.breakwaterGroup,
      this.infra.pierGroup,
      this.infra.cranesGroup,
      this.infra.shipsGroup,
      this.infra.yardGroup,
      this.infra.tunnelGroup,
      this.infra.entranceGroup,
      this.infra.signageGroup,
      this.infra.explanatoryGroup,
      this.ops.vehiclesGroup,
      this.ops.workersGroup,
      this.externalGroup
    );
    this.scene.add(this.portRoot);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('resize', this.onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }

    this.ops.update(0, false, false, false);
    this.clock.start();
    this.startLoop();
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.callbacks.onWebGLError('Se perdió temporalmente el contexto gráfico WebGL.');
  };

  private handleContextRestored = () => {
    this.startLoop();
  };

  private onResize = () => {
    if (this.disposed || !this.renderer || !this.camera) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onPointerDown = (e: PointerEvent) => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent) => {
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist > 5) return;

    const hit = this.raycastScene(e);
    if (hit.workerId) {
      this.callbacks.onSelectWorker(hit.workerId);
    } else {
      this.callbacks.onSelectComponent(hit.componentId);
    }
  };

  private lastHoverTime = 0;
  private onPointerMove = (e: PointerEvent) => {
    const now = performance.now();
    if (now - this.lastHoverTime < 60) return;
    this.lastHoverTime = now;
    const hit = this.raycastScene(e);
    this.renderer.domElement.style.cursor = hit.workerId || hit.componentId ? 'pointer' : 'grab';
  };

  private raycastScene(e: PointerEvent): {
    componentId: ComponentId | null;
    workerId: string | null;
  } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.portRoot.children, true);

    for (const hit of intersects) {
      if (!hit.object.visible) continue;
      let cur: THREE.Object3D | null = hit.object;
      let foundWorker: string | null = null;
      let foundComponent: ComponentId | null = null;
      while (cur && cur !== this.portRoot) {
        if (!foundWorker && cur.userData && cur.userData.workerId) {
          foundWorker = String(cur.userData.workerId);
        }
        if (!foundComponent && cur.userData && cur.userData.componentId) {
          foundComponent = cur.userData.componentId as ComponentId;
        }
        if (foundWorker) {
          return { componentId: foundComponent, workerId: foundWorker };
        }
        cur = cur.parent;
      }
      if (foundComponent) {
        return { componentId: foundComponent, workerId: null };
      }
    }
    return { componentId: null, workerId: null };
  }

  private getGroupByComponentId(id: ComponentId): THREE.Object3D | null {
    switch (id) {
      case 'rompeolas':
        return this.infra.breakwaterGroup;
      case 'muelle':
        return this.infra.pierGroup;
      case 'grua-sts':
        return this.infra.cranesGroup;
      case 'buque':
        return this.infra.shipsGroup;
      case 'patio':
        return this.infra.yardGroup;
      case 'camiones':
        return this.ops.vehiclesGroup;
      case 'tunel':
        return this.infra.tunnelGroup;
      case 'ingreso':
        return this.infra.entranceGroup;
      case 'terreno':
        return this.terrain.group;
      case 'oceano':
        return this.ocean.group;
    }
  }

  private clearSelectionHelper() {
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }
  }

  public setSelectedComponent(id: ComponentId | null) {
    this.clearSelectionHelper();
    if (!id) return;

    const targetObj =
      id === 'grua-sts'
        ? this.infra.heroCrane.group
        : id === 'buque'
        ? this.infra.heroShipGroup
        : this.getGroupByComponentId(id);

    if (targetObj && targetObj.visible) {
      const box = new THREE.Box3().setFromObject(targetObj);
      if (!box.isEmpty()) {
        this.selectionBoxHelper = new THREE.Box3Helper(box, new THREE.Color(0xc83228));
        this.scene.add(this.selectionBoxHelper);
      }
    }
  }

  public setSelectedWorker(workerId: string | null) {
    this.clearSelectionHelper();
    if (!workerId) return;

    const targetObj = this.ops.getWorkerObjectById(workerId);
    if (targetObj && targetObj.visible) {
      const box = new THREE.Box3().setFromObject(targetObj);
      if (!box.isEmpty()) {
        box.expandByScalar(0.35);
        this.selectionBoxHelper = new THREE.Box3Helper(box, new THREE.Color(0xf59e0b));
        this.scene.add(this.selectionBoxHelper);
      }
    }
  }

  public setSpecialtyHighlight(ids: ComponentId[] | null) {
    this.specialtyHighlights.forEach((h) => {
      this.scene.remove(h);
      h.dispose();
    });
    this.specialtyHighlights = [];

    if (!ids) return;
    ids.forEach((id) => {
      const obj =
        id === 'grua-sts'
          ? this.infra.heroCrane.group
          : id === 'buque'
          ? this.infra.heroShipGroup
          : this.getGroupByComponentId(id);
      if (obj && obj.visible) {
        const box = new THREE.Box3().setFromObject(obj);
        if (!box.isEmpty()) {
          const helper = new THREE.Box3Helper(box, new THREE.Color(0x0284c7));
          this.scene.add(helper);
          this.specialtyHighlights.push(helper);
        }
      }
    });
  }

  private saveCameraForReturn() {
    this.previousCameraState = {
      pos: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
    this.callbacks.onCameraHistoryChange?.(true);
  }

  public hasPreviousCamera(): boolean {
    return this.previousCameraState !== null;
  }

  public restorePreviousCamera() {
    if (!this.previousCameraState) return;
    this.camTargetPos.copy(this.previousCameraState.pos);
    this.camTargetLook.copy(this.previousCameraState.target);
    this.previousCameraState = null;
    this.callbacks.onCameraHistoryChange?.(false);
    this.camAnimating = true;
  }

  public setCameraPreset(presetId: CameraPresetId, recordHistory = false) {
    const preset = CAMERA_PRESETS[presetId];
    if (!preset) return;
    if (recordHistory) {
      this.saveCameraForReturn();
    }
    const adjusted = this.computeAspectAdjustedPreset(preset);
    this.camTargetPos.copy(adjusted.pos);
    this.camTargetLook.copy(adjusted.look);
    this.camAnimating = true;
  }

  public focusComponent(id: ComponentId) {
    const preset = COMPONENT_FOCUS_PRESETS[id];
    if (!preset) return;
    this.saveCameraForReturn();
    const adjusted = this.computeAspectAdjustedPreset(preset);
    this.camTargetPos.copy(adjusted.pos);
    this.camTargetLook.copy(adjusted.look);
    this.camAnimating = true;
  }

  public focusWorker(workerId: string) {
    const obj = this.ops.getWorkerObjectById(workerId);
    if (!obj) return;
    this.saveCameraForReturn();
    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);
    this.camTargetLook.copy(worldPos).add(new THREE.Vector3(0, 0.8, 0));
    this.camTargetPos.copy(worldPos).add(new THREE.Vector3(-9.5, 6.0, 9.5));
    this.camAnimating = true;
  }

  public nudgeCamera(dx: number, dy: number, zoomFactor: number) {
    this.camAnimating = false;
    const offset = this.camera.position.clone().sub(this.controls.target);
    if (zoomFactor !== 1) {
      offset.multiplyScalar(zoomFactor);
      const len = offset.length();
      if (len < this.controls.minDistance) offset.setLength(this.controls.minDistance);
      if (len > this.controls.maxDistance) offset.setLength(this.controls.maxDistance);
    }
    if (dx !== 0 || dy !== 0) {
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += dx;
      spherical.phi = THREE.MathUtils.clamp(
        spherical.phi + dy,
        this.controls.minPolarAngle,
        this.controls.maxPolarAngle
      );
      offset.setFromSpherical(spherical);
    }
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  public setLightingMode(mode: LightingMode) {
    this.lightingMode = mode;
    if (mode === 'dia') {
      const sky = new THREE.Color(0xdce6f2);
      this.scene.background = sky;
      this.scene.fog = new THREE.FogExp2(0xdce6f2, 0.0018);
      this.hemiLight.color.setHex(0xdbeafe);
      this.hemiLight.groundColor.setHex(0x9c8b75);
      this.hemiLight.intensity = 0.85;
      this.sunLight.color.setHex(0xfff5e4);
      this.sunLight.intensity = 1.85;
      this.sunLight.position.set(-65, 95, 65);
      this.rimLight.intensity = 0.42;
      this.renderer.toneMappingExposure = 1.06;
    } else if (mode === 'atardecer') {
      const dusk = new THREE.Color(0xe6ccb5);
      this.scene.background = dusk;
      this.scene.fog = new THREE.FogExp2(0xe6ccb5, 0.0021);
      this.hemiLight.color.setHex(0xfde68a);
      this.hemiLight.groundColor.setHex(0x52463d);
      this.hemiLight.intensity = 0.65;
      this.sunLight.color.setHex(0xffb56b);
      this.sunLight.intensity = 2.05;
      this.sunLight.position.set(-110, 32, 48);
      this.rimLight.intensity = 0.52;
      this.renderer.toneMappingExposure = 1.02;
    } else {
      // 'maqueta' — Estudio arquitectónico limpio con contraste suave
      const studio = new THREE.Color(0xf1f5f9);
      this.scene.background = studio;
      this.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.0011);
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0xcbd5e1);
      this.hemiLight.intensity = 1.05;
      this.sunLight.color.setHex(0xffffff);
      this.sunLight.intensity = 1.45;
      this.sunLight.position.set(-55, 115, 75);
      this.rimLight.intensity = 0.62;
      this.renderer.toneMappingExposure = 1.04;
    }
  }

  public updateSimulationState(next: SimulationState) {
    const prevTunnelCutaway = this.simState.showTunnelCutaway;
    const prevStructCutaway = this.simState.showStructuralCutaway;
    const prevOceanStatic = this.simState.oceanStatic;
    this.simState = { ...next };

    if (next.showTunnelCutaway !== prevTunnelCutaway) {
      this.terrain.setTunnelCutaway(next.showTunnelCutaway);
      this.infra.setTunnelCutaway(next.showTunnelCutaway);
    }
    if (next.showStructuralCutaway !== prevStructCutaway) {
      this.infra.setStructuralCutaway(next.showStructuralCutaway);
    }
    if (next.oceanStatic !== prevOceanStatic) {
      this.ocean.setStaticMode(next.oceanStatic);
    }
    this.applyVisibility();
  }

  public updateLayerVisibility(next: LayerVisibility) {
    this.layers = { ...next };
    this.applyVisibility();
  }

  public setConstructionComponents(activeIds: ComponentId[] | null) {
    this.activeConstructionComponents = activeIds;
    this.applyVisibility();
  }

  private applyVisibility() {
    const isAllowedByPhase = (id: ComponentId) =>
      this.activeConstructionComponents === null || this.activeConstructionComponents.includes(id);

    this.terrain.group.visible = this.layers.terreno && isAllowedByPhase('terreno');
    this.ocean.group.visible = isAllowedByPhase('oceano');

    this.infra.breakwaterGroup.visible = this.layers.estructuras && isAllowedByPhase('rompeolas');
    this.infra.pierGroup.visible = this.layers.estructuras && isAllowedByPhase('muelle');
    this.infra.cranesGroup.visible = this.layers.estructuras && isAllowedByPhase('grua-sts');
    this.infra.shipsGroup.visible = this.layers.estructuras && isAllowedByPhase('buque');
    this.infra.yardGroup.visible = this.layers.estructuras && isAllowedByPhase('patio');
    this.infra.tunnelGroup.visible = this.layers.estructuras && isAllowedByPhase('tunel');
    this.infra.entranceGroup.visible = this.layers.estructuras && isAllowedByPhase('ingreso');

    this.infra.signageGroup.visible = this.layers.senalizacion && this.layers.estructuras;
    this.infra.explanatoryGroup.visible = this.layers.explicativos;

    this.ops.vehiclesGroup.visible =
      this.layers.vehiculos && this.simState.showVehicles && isAllowedByPhase('camiones');
    this.ops.workersGroup.visible = this.layers.trabajadores && this.simState.showWorkers;
  }

  public resetOperations() {
    this.ops.resetCycle();
    this.lastPhaseIdx = -1;
    this.callbacks.onCranePhaseChange(0, '1. Preparación de maniobra');
  }

  public setQualityMode(mode: QualityMode) {
    this.quality = mode;
    const isLigera = mode === 'ligera';
    this.renderer.setPixelRatio(
      this.isSoftwareGl || isLigera ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && !isLigera;
    this.sunLight.castShadow = !this.isSoftwareGl && !isLigera;
    this.ocean.setQuality(isLigera);
  }

  public getPerformanceSnapshot(): PerformanceSnapshot {
    const oceanMetrics = this.ocean.getMetrics();
    return {
      oceanUpdateMs: Number(oceanMetrics.lastUpdateMs.toFixed(2)),
      renderMs: Number(this.lastRenderMs.toFixed(2)),
      oceanVertices: oceanMetrics.vertexCount,
      quality: this.quality,
      viewport: {
        width: this.container.clientWidth,
        height: this.container.clientHeight,
      },
    };
  }

  public exportPortGLB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      exporter.parse(
        this.portRoot,
        (result) => {
          const blob =
            result instanceof ArrayBuffer
              ? new Blob([result], { type: 'model/gltf-binary' })
              : new Blob([JSON.stringify(result)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download =
            result instanceof ArrayBuffer
              ? 'megapuerto-chancay-maqueta-3d.glb'
              : 'megapuerto-chancay-maqueta-3d.gltf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        },
        (err) => {
          reject(err);
        },
        { binary: true, onlyVisible: true }
      );
    });
  }

  public async importExternalGLB(file: File): Promise<string> {
    const loader = new GLTFLoader();
    const buffer = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      loader.parse(
        buffer,
        '',
        (gltf) => {
          const model = gltf.scene;
          model.position.set(16, 2.0, 22);
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 20) {
            model.scale.setScalar(10 / maxDim);
          }
          model.traverse((c) => {
            c.userData.componentId = 'patio';
          });
          this.externalGroup.add(model);
          resolve(file.name);
        },
        (err) => reject(err)
      );
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.1);

      if (this.camAnimating) {
        const lambda = 5.5;
        this.camera.position.x = THREE.MathUtils.damp(
          this.camera.position.x,
          this.camTargetPos.x,
          lambda,
          dt
        );
        this.camera.position.y = THREE.MathUtils.damp(
          this.camera.position.y,
          this.camTargetPos.y,
          lambda,
          dt
        );
        this.camera.position.z = THREE.MathUtils.damp(
          this.camera.position.z,
          this.camTargetPos.z,
          lambda,
          dt
        );
        this.controls.target.x = THREE.MathUtils.damp(
          this.controls.target.x,
          this.camTargetLook.x,
          lambda,
          dt
        );
        this.controls.target.y = THREE.MathUtils.damp(
          this.controls.target.y,
          this.camTargetLook.y,
          lambda,
          dt
        );
        this.controls.target.z = THREE.MathUtils.damp(
          this.controls.target.z,
          this.camTargetLook.z,
          lambda,
          dt
        );
        if (
          this.camera.position.distanceTo(this.camTargetPos) < 0.18 &&
          this.controls.target.distanceTo(this.camTargetLook) < 0.12
        ) {
          this.camAnimating = false;
        }
      }

      this.controls.update();

      if (this.callbacks.onCameraAzimuthChange) {
        const dx = this.controls.target.x - this.camera.position.x;
        const dz = this.controls.target.z - this.camera.position.z;
        const horizLen = Math.hypot(dx, dz);
        if (horizLen > 0.001) {
          const fx = dx / horizLen;
          const fz = dz / horizLen;
          const deg = Math.round(Math.atan2(-fx, -fz) * (180 / Math.PI));
          if (Math.abs(deg - this.lastAzimuthDeg) >= 1) {
            this.lastAzimuthDeg = deg;
            this.callbacks.onCameraAzimuthChange(deg);
          }
        }
      }

      if (this.simState.isPlaying && this.simState.oceanPlaying && !this.simState.oceanStatic) {
        this.oceanTime += dt;
        this.ocean.update(this.oceanTime);
        this.infra.heroShipGroup.position.y = Math.sin(this.oceanTime * 0.9) * 0.032;
        this.infra.feederShipGroup.position.y = Math.cos(this.oceanTime * 1.1) * 0.036;
        for (const radar of this.infra.radarMeshes) {
          radar.rotation.y += dt * 0.85;
        }
      } else if (this.simState.oceanStatic) {
        this.infra.heroShipGroup.position.y = 0;
        this.infra.feederShipGroup.position.y = 0;
      }

      const opsResult = this.ops.update(
        this.simState.isPlaying ? dt : 0,
        this.simState.isPlaying && this.simState.craneOperationActive,
        this.simState.isPlaying && this.simState.showVehicles,
        this.simState.isPlaying && this.simState.showWorkers
      );

      if (opsResult.phaseIndex !== this.lastPhaseIdx) {
        this.lastPhaseIdx = opsResult.phaseIndex;
        this.callbacks.onCranePhaseChange(opsResult.phaseIndex, opsResult.phaseLabel);
      }

      const r0 = performance.now();
      this.renderer.render(this.scene, this.camera);
      this.lastRenderMs = performance.now() - r0;

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
      this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
      this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
      this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
      this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    }

    this.clearSelectionHelper();
    this.specialtyHighlights.forEach((h) => h.dispose());

    this.ocean?.dispose();
    this.terrain?.dispose();
    this.infra?.dispose();
    this.ops?.dispose();
    this.materials?.dispose();
    this.envRT?.dispose();
    this.controls?.dispose();
    this.renderer?.dispose();

    if (this.renderer?.domElement?.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
