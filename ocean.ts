import * as THREE from 'three';

export interface OceanMetrics {
  lastUpdateMs: number;
  vertexCount: number;
}

export interface OceanController {
  group: THREE.Group;
  oceanMesh: THREE.Mesh;
  foamMesh: THREE.Mesh;
  update: (time: number) => void;
  setQuality: (ligera: boolean) => void;
  setStaticMode: (isStatic: boolean) => void;
  getMetrics: () => OceanMetrics;
  dispose: () => void;
}

/**
 * Generates an interactive Pacific Ocean surface calibrated to the real Chancay layout:
 * - Slate blue-teal tones natural to the central Peruvian coast (Humboldt current palette)
 * - Multi-directional swells outside the ~2.7 km breakwater & Punta Chancay headland
 * - Visibly calmer basin behind both main and secondary breakwaters (~86% visual attenuation)
 * - Optional static mode (flat water plane without wave displacement) for low-end devices or clear inspection
 */
export function createPacificOcean(isLigera: boolean): OceanController {
  const group = new THREE.Group();
  group.name = 'oceano';
  group.userData.componentId = 'oceano';

  const width = 270;
  const depth = 250;
  const segX = isLigera ? 56 : 112;
  const segZ = isLigera ? 56 : 112;

  const geometry = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const basePositions = new Float32Array(posAttr.array.length);
  basePositions.set(posAttr.array);

  const colors = new Float32Array(posAttr.count * 3);
  const cDeep = new THREE.Color(0x13354b);
  const cMid = new THREE.Color(0x1b4b68);
  const cBasin = new THREE.Color(0x235f7d);
  const tmpColor = new THREE.Color();

  // Shelter mask: harbor basin x in [-58, +4], z in [-64, +44]
  const shelterFactor = new Float32Array(posAttr.count);
  for (let i = 0; i < posAttr.count; i++) {
    const lx = basePositions[i * 3];
    const lz = basePositions[i * 3 + 2];
    const wx = lx - 52; // oceanMesh sits at x = -52

    const inX =
      THREE.MathUtils.smoothstep(wx, -64, -46) * (1 - THREE.MathUtils.smoothstep(wx, -2, 14));
    const inZ =
      THREE.MathUtils.smoothstep(lz, -68, -50) * (1 - THREE.MathUtils.smoothstep(lz, 26, 52));
    const shelter = THREE.MathUtils.clamp(inX * inZ, 0, 1);
    shelterFactor[i] = shelter;

    const coastalShallow = THREE.MathUtils.smoothstep(wx, -38, 12);
    tmpColor.copy(cDeep).lerp(cMid, coastalShallow * 0.6).lerp(cBasin, shelter * 0.58);
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const oceanMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: isLigera ? 0.34 : 0.24,
    metalness: 0.1,
    envMapIntensity: isLigera ? 0.55 : 0.82,
    transparent: true,
    opacity: 0.95,
  });

  const oceanMesh = new THREE.Mesh(geometry, oceanMat);
  oceanMesh.position.set(-52, 0, 0);
  oceanMesh.receiveShadow = true;
  oceanMesh.userData.componentId = 'oceano';
  group.add(oceanMesh);

  // Subtle wave-break foam strip strictly along outer seaward face of main breakwater
  const foamCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-12, 0.05, -72.5),
    new THREE.Vector3(-44, 0.05, -71.0),
    new THREE.Vector3(-62.5, 0.05, -48),
    new THREE.Vector3(-66.0, 0.05, -16),
    new THREE.Vector3(-62.0, 0.05, 19),
  ]);
  const foamGeo = new THREE.TubeGeometry(foamCurve, isLigera ? 28 : 56, 0.65, 6, false);
  foamGeo.scale(1, 0.12, 1);
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xdcebf5,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const foamMesh = new THREE.Mesh(foamGeo, foamMat);
  foamMesh.userData.componentId = 'oceano';
  group.add(foamMesh);

  let frameCounter = 0;
  let currentLigera = isLigera;
  let staticMode = false;
  let lastUpdateMs = 0;

  function flattenToStatic() {
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, 0);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    foamMat.opacity = 0.24;
    foamMesh.position.y = 0.02;
  }

  function update(time: number) {
    if (staticMode) {
      lastUpdateMs = 0;
      return;
    }

    const t0 = performance.now();
    frameCounter++;
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      const wx = basePositions[i * 3] - 52;
      const bz = basePositions[i * 3 + 2];
      const shelter = shelterFactor[i];

      // 4 combined wave harmonics to avoid repetitive grid patterning
      const w1 = Math.sin(wx * 0.078 + bz * 0.036 + time * 1.05) * 0.18;
      const w2 = Math.cos(wx * 0.044 - bz * 0.068 + time * 0.82) * 0.11;
      const w3 = Math.sin(wx * 0.145 + bz * 0.115 - time * 1.48) * 0.045;
      const w4 = Math.cos((wx + bz) * 0.025 + time * 0.55) * 0.06;

      const amplitudeScale = 1.0 - shelter * 0.86;
      positions.setY(i, (w1 + w2 + w3 + w4) * amplitudeScale);
    }
    positions.needsUpdate = true;

    const normalInterval = currentLigera ? 4 : 2;
    if (frameCounter % normalInterval === 0) {
      geometry.computeVertexNormals();
    }

    foamMat.opacity = 0.28 + 0.12 * Math.sin(time * 1.25);
    foamMesh.position.y = 0.03 + 0.045 * Math.sin(time * 1.15);
    lastUpdateMs = performance.now() - t0;
  }

  function setQuality(ligera: boolean) {
    currentLigera = ligera;
    oceanMat.roughness = ligera ? 0.34 : 0.24;
    oceanMat.envMapIntensity = ligera ? 0.55 : 0.82;
  }

  function setStaticMode(isStatic: boolean) {
    if (staticMode === isStatic) return;
    staticMode = isStatic;
    if (staticMode) {
      flattenToStatic();
    }
  }

  function getMetrics(): OceanMetrics {
    return {
      lastUpdateMs,
      vertexCount: posAttr.count,
    };
  }

  function dispose() {
    geometry.dispose();
    oceanMat.dispose();
    foamGeo.dispose();
    foamMat.dispose();
  }

  return {
    group,
    oceanMesh,
    foamMesh,
    update,
    setQuality,
    setStaticMode,
    getMetrics,
    dispose,
  };
}
