import * as THREE from 'three';

export interface PortMaterialLibrary {
  concreteDeck: THREE.MeshStandardMaterial;
  concretePrecast: THREE.MeshStandardMaterial;
  asphaltRoad: THREE.MeshStandardMaterial;
  yardPaving: THREE.MeshStandardMaterial;
  zpmcBlue: THREE.MeshStandardMaterial;
  zpmcWhite: THREE.MeshStandardMaterial;
  zpmcRed: THREE.MeshStandardMaterial;
  steelNavy: THREE.MeshStandardMaterial;
  steelCraneRed: THREE.MeshStandardMaterial;
  steelGalvanized: THREE.MeshStandardMaterial;
  steelYellow: THREE.MeshStandardMaterial;
  shipHullDark: THREE.MeshStandardMaterial;
  shipBootRed: THREE.MeshStandardMaterial;
  shipWhite: THREE.MeshStandardMaterial;
  shipDeckGreen: THREE.MeshStandardMaterial;
  glassBridge: THREE.MeshPhysicalMaterial;
  rockArmor: THREE.MeshStandardMaterial;
  rockCore: THREE.MeshStandardMaterial;
  accropodeConcrete: THREE.MeshStandardMaterial;
  rubberFender: THREE.MeshStandardMaterial;
  safetyStripe: THREE.MeshStandardMaterial;
  containerMetal: THREE.MeshStandardMaterial;
  tunnelShotcrete: THREE.MeshStandardMaterial;
  tunnelLining: THREE.MeshStandardMaterial;
  terrainMaterial: THREE.MeshStandardMaterial;
  dispose: () => void;
}

function makeConcreteTextures(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 512;
  const cColor = document.createElement('canvas');
  cColor.width = size;
  cColor.height = size;
  const ctx = cColor.getContext('2d')!;

  const cBump = document.createElement('canvas');
  cBump.width = size;
  cBump.height = size;
  const bCtx = cBump.getContext('2d')!;

  ctx.fillStyle = '#c8cfd6';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#888888';
  bCtx.fillRect(0, 0, size, size);

  // Subtle aggregate grain & coastal weathering
  for (let i = 0; i < 11000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = 178 + Math.floor(Math.random() * 44);
    ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 4})`;
    ctx.fillRect(x, y, 2, 2);

    const bVal = 115 + Math.floor(Math.random() * 45);
    bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
    bCtx.fillRect(x, y, 2, 2);
  }

  // Expansion slab joints
  ctx.strokeStyle = 'rgba(65,78,94,0.32)';
  ctx.lineWidth = 2;
  bCtx.strokeStyle = '#303030';
  bCtx.lineWidth = 2.5;
  for (let p = 0; p < size; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(p, 0);
    bCtx.lineTo(p, size);
    bCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(0, p);
    bCtx.lineTo(size, p);
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(cColor);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(5, 16);

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(5, 16);

  return { map, bumpMap };
}

function makeYardPavingTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#757f8b';
  ctx.fillRect(0, 0, size, size);

  // Heavy interlocking industrial paver pattern
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 98 + Math.floor(Math.random() * 38);
    ctx.fillStyle = `rgb(${v},${v + 4},${v + 9})`;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = 'rgba(235,241,247,0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, size - 6, size - 6);

  // Container slot grid lines
  ctx.strokeStyle = 'rgba(248,250,252,0.22)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 14);
  return tex;
}

function makeAsphaltTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2f3640';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 5500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 38 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${v},${v + 3},${v + 6})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle tire wear bands
  ctx.fillStyle = 'rgba(20, 25, 32, 0.25)';
  ctx.fillRect(46, 0, 36, size);
  ctx.fillRect(size - 82, 0, 36, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 16);
  return tex;
}

function makeSafetyStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e09f1f';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#181e27';
  for (let i = -128; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 16, 0);
    ctx.lineTo(i + 144, 128);
    ctx.lineTo(i + 128, 128);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 28);
  return tex;
}

function makeContainerTextures(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 256;
  const cColor = document.createElement('canvas');
  cColor.width = size;
  cColor.height = size;
  const ctx = cColor.getContext('2d')!;

  const cBump = document.createElement('canvas');
  cBump.width = size;
  cBump.height = size;
  const bCtx = cBump.getContext('2d')!;

  ctx.fillStyle = '#edf1f5';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Corrugated steel ribs + top/bottom corner rails
  for (let x = 0; x < size; x += 12) {
    ctx.fillStyle = x % 24 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.16)';
    ctx.fillRect(x, 12, 6, size - 24);

    bCtx.fillStyle = x % 24 === 0 ? '#dcdcdc' : '#404040';
    bCtx.fillRect(x, 12, 6, size - 24);
  }

  // Structural corner posts & rails
  ctx.strokeStyle = 'rgba(15,23,42,0.28)';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, size - 10, size - 10);

  const map = new THREE.CanvasTexture(cColor);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

export function createPortMaterialLibrary(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): PortMaterialLibrary {
  const concreteTex = makeConcreteTextures();
  const pavingTex = makeYardPavingTexture();
  const asphaltTex = makeAsphaltTexture();
  const stripeTex = makeSafetyStripeTexture();
  const containerTex = makeContainerTextures();

  const textures = [
    concreteTex.map,
    concreteTex.bumpMap,
    pavingTex,
    asphaltTex,
    stripeTex,
    containerTex.map,
    containerTex.bumpMap,
  ];
  textures.forEach((t) => {
    t.anisotropy = Math.min(8, maxAnisotropy || 1);
  });

  const concreteDeck = new THREE.MeshStandardMaterial({
    map: concreteTex.map,
    bumpMap: concreteTex.bumpMap,
    bumpScale: 0.04,
    color: 0xd5dbe2,
    roughness: 0.87,
    metalness: 0.04,
  });

  const concretePrecast = new THREE.MeshStandardMaterial({
    color: 0xbac2cc,
    roughness: 0.9,
    metalness: 0.04,
  });

  const asphaltRoad = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    color: 0x454d58,
    roughness: 0.91,
    metalness: 0.03,
  });

  const yardPaving = new THREE.MeshStandardMaterial({
    map: pavingTex,
    color: 0x9aa4af,
    roughness: 0.86,
    metalness: 0.05,
  });

  // Real COSCO Shipping Ports Chancay ZPMC crane livery (Cobalt/Marine Blue + Crisp White + Red Safety)
  const zpmcBlue = new THREE.MeshStandardMaterial({
    color: 0x0e4f92,
    roughness: 0.34,
    metalness: 0.66,
  });

  const zpmcWhite = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.42,
    metalness: 0.28,
  });

  const zpmcRed = new THREE.MeshStandardMaterial({
    color: 0xc83228,
    roughness: 0.35,
    metalness: 0.58,
  });

  const steelNavy = new THREE.MeshStandardMaterial({
    color: 0x0f2d4d,
    roughness: 0.36,
    metalness: 0.72,
  });

  const steelCraneRed = new THREE.MeshStandardMaterial({
    color: 0xc83228,
    roughness: 0.34,
    metalness: 0.64,
  });

  const steelGalvanized = new THREE.MeshStandardMaterial({
    color: 0xa4b0bc,
    roughness: 0.28,
    metalness: 0.85,
  });

  const steelYellow = new THREE.MeshStandardMaterial({
    color: 0xe09f1f,
    roughness: 0.36,
    metalness: 0.52,
  });

  const shipHullDark = new THREE.MeshStandardMaterial({
    color: 0x16293f,
    roughness: 0.44,
    metalness: 0.48,
  });

  const shipBootRed = new THREE.MeshStandardMaterial({
    color: 0x8f2422,
    roughness: 0.56,
    metalness: 0.24,
  });

  const shipWhite = new THREE.MeshStandardMaterial({
    color: 0xf4f7fb,
    roughness: 0.48,
    metalness: 0.14,
  });

  const shipDeckGreen = new THREE.MeshStandardMaterial({
    color: 0x3b5249,
    roughness: 0.75,
    metalness: 0.18,
  });

  const glassBridge = new THREE.MeshPhysicalMaterial({
    color: 0x193b56,
    roughness: 0.08,
    metalness: 0.12,
    transmission: isSoftwareGl ? 0 : 0.42,
    transparent: true,
    opacity: isSoftwareGl ? 0.68 : 0.92,
    ior: 1.5,
  });

  const rockArmor = new THREE.MeshStandardMaterial({
    color: 0x7a7670,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  });

  const rockCore = new THREE.MeshStandardMaterial({
    color: 0x8c7f6f,
    roughness: 0.96,
    metalness: 0.02,
    flatShading: true,
  });

  const accropodeConcrete = new THREE.MeshStandardMaterial({
    color: 0xaab2bc,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: true,
  });

  const rubberFender = new THREE.MeshStandardMaterial({
    color: 0x1b1f25,
    roughness: 0.92,
    metalness: 0.04,
  });

  const safetyStripe = new THREE.MeshStandardMaterial({
    map: stripeTex,
    roughness: 0.72,
    metalness: 0.08,
  });

  const containerMetal = new THREE.MeshStandardMaterial({
    map: containerTex.map,
    bumpMap: containerTex.bumpMap,
    bumpScale: 0.035,
    color: 0xffffff,
    roughness: 0.48,
    metalness: 0.52,
  });

  const tunnelShotcrete = new THREE.MeshStandardMaterial({
    color: 0x6f747a,
    roughness: 0.95,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });

  const tunnelLining = new THREE.MeshStandardMaterial({
    color: 0xd3d8de,
    roughness: 0.78,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.93,
    metalness: 0.02,
  });

  const allMaterials = [
    concreteDeck,
    concretePrecast,
    asphaltRoad,
    yardPaving,
    zpmcBlue,
    zpmcWhite,
    zpmcRed,
    steelNavy,
    steelCraneRed,
    steelGalvanized,
    steelYellow,
    shipHullDark,
    shipBootRed,
    shipWhite,
    shipDeckGreen,
    glassBridge,
    rockArmor,
    rockCore,
    accropodeConcrete,
    rubberFender,
    safetyStripe,
    containerMetal,
    tunnelShotcrete,
    tunnelLining,
    terrainMaterial,
  ];

  return {
    concreteDeck,
    concretePrecast,
    asphaltRoad,
    yardPaving,
    zpmcBlue,
    zpmcWhite,
    zpmcRed,
    steelNavy,
    steelCraneRed,
    steelGalvanized,
    steelYellow,
    shipHullDark,
    shipBootRed,
    shipWhite,
    shipDeckGreen,
    glassBridge,
    rockArmor,
    rockCore,
    accropodeConcrete,
    rubberFender,
    safetyStripe,
    containerMetal,
    tunnelShotcrete,
    tunnelLining,
    terrainMaterial,
    dispose: () => {
      textures.forEach((t) => t.dispose());
      allMaterials.forEach((m) => m.dispose());
    },
  };
}
