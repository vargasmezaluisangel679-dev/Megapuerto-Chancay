import * as THREE from 'three';
import { PortMaterialLibrary } from './materials';

export interface TerrainController {
  group: THREE.Group;
  groundHeightAt: (x: number, z: number) => number;
  setTunnelCutaway: (enabled: boolean) => void;
  dispose: () => void;
}

function fbm2D(x: number, z: number): number {
  const n1 = Math.sin(x * 0.038 + z * 0.024) * Math.cos(z * 0.035 - x * 0.018);
  const n2 = Math.sin(x * 0.088 - z * 0.064 + 1.3) * 0.45;
  const n3 = Math.cos(x * 0.17 + z * 0.14 + 2.5) * 0.21;
  const n4 = Math.sin(x * 0.31 - z * 0.27) * 0.08;
  return n1 + n2 + n3 + n4;
}

/**
 * Continuous heightfield representing the real coastal geography of Chancay, Lima, Perú:
 * - Punta Chancay rocky promontory on the northern shoreline (x in [-18..+35], z < -54)
 * - Graded Port Operational Zone (ZOP) platform (x in [4..42.5], z in [-48..+44]) at y = 1.84
 * - Cerro Trinidad coastal hill ridge (x in [45..87]) rising organically to ~15-21 units
 * - Graded Inland Entrance Complex (ZCI) plateau (x in [88..144], z in [-26..+32]) at y = 3.22
 * - Southern arid coastal cliffs & beaches (z > +48)
 */
export function computeChancayTerrainHeight(x: number, z: number): number {
  // Base natural coastline slope: seabed west of x = 4, rising gently inland
  const coastRise = THREE.MathUtils.smoothstep(x, -4, 26) * 3.6;
  const seaDrop = (1 - THREE.MathUtils.smoothstep(x, -14, 8)) * -4.2;

  // Cerro Trinidad coastal ridge behind the port (centered around x = 66)
  const ridgeMod = 0.82 + 0.35 * Math.sin(z * 0.042 + 0.6);
  const cerroTrinidad =
    Math.exp(-Math.pow((x - 66) / 18.5, 2)) *
    (12.2 * ridgeMod + 4.4 * fbm2D(x * 0.58, z * 0.48));

  // Punta Chancay rocky headland protruding west to anchor the 2.7 km main breakwater
  const puntaChancayMask =
    THREE.MathUtils.smoothstep(z, -52, -74) *
    THREE.MathUtils.smoothstep(x, -22, 16) *
    (1 - THREE.MathUtils.smoothstep(x, 38, 64));
  const puntaChancay = puntaChancayMask * (7.2 + 2.8 * fbm2D(x * 0.85, z * 0.78));

  // Northern inland hills continuing behind Punta Chancay
  const northCoastHills =
    THREE.MathUtils.smoothstep(z, -54, -88) *
    THREE.MathUtils.smoothstep(x, 10, 48) *
    (6.8 + 2.4 * fbm2D(x * 0.7, z * 0.6));

  // Southern coastal cliffs / arid dunes (Chancay south bay)
  const southBluff =
    THREE.MathUtils.smoothstep(z, 46, 82) *
    THREE.MathUtils.smoothstep(x, 12, 58) *
    (5.8 + 2.3 * fbm2D(x * 0.72 + 3.2, z * 0.65));

  // Far eastern coastal foothills (x > 136)
  const inlandHills =
    THREE.MathUtils.smoothstep(x, 134, 168) *
    (7.8 + 3.6 * fbm2D(x * 0.48, z * 0.38));

  let naturalH =
    seaDrop +
    coastRise +
    cerroTrinidad +
    puntaChancay +
    northCoastHills +
    southBluff +
    inlandHills;

  naturalH += fbm2D(x, z) * 0.62 * THREE.MathUtils.smoothstep(x, 4, 38);

  // 1. Grade flat ZOP Port Terminal footprint (x in [4, 42.5], z in [-48, 44]) -> y = 1.84
  const portMaskX =
    THREE.MathUtils.smoothstep(x, 0, 5.2) * (1 - THREE.MathUtils.smoothstep(x, 40.5, 45.5));
  const portMaskZ =
    THREE.MathUtils.smoothstep(z, -54, -46) * (1 - THREE.MathUtils.smoothstep(z, 41, 48));
  const portMask = portMaskX * portMaskZ;

  // 2. Grade flat ZCI Entrance Complex plateau (x in [88, 144], z in [-26, 32]) -> y = 3.22
  const ingMaskX =
    THREE.MathUtils.smoothstep(x, 84, 89) * (1 - THREE.MathUtils.smoothstep(x, 139, 146));
  const ingMaskZ =
    THREE.MathUtils.smoothstep(z, -32, -23) * (1 - THREE.MathUtils.smoothstep(z, 29, 37));
  const ingMask = ingMaskX * ingMaskZ;

  // 3. Grade Panamericana Norte highway alignment along x in [138, 150]
  const hwyMaskX =
    THREE.MathUtils.smoothstep(x, 134, 139) * (1 - THREE.MathUtils.smoothstep(x, 148, 154));

  // 4. Portal approach trenches at z = 4 around x=43.5 and x=88.5
  const portalWestDist = Math.hypot(x - 43.5, (z - 4) * 1.35);
  const portalWestCut = 1 - THREE.MathUtils.smoothstep(portalWestDist, 3.4, 8.8);

  const portalEastDist = Math.hypot(x - 88.5, (z - 4) * 1.35);
  const portalEastCut = 1 - THREE.MathUtils.smoothstep(portalEastDist, 3.4, 8.8);

  let h = THREE.MathUtils.lerp(naturalH, 1.84, portMask);
  h = THREE.MathUtils.lerp(h, 3.22, ingMask);
  h = THREE.MathUtils.lerp(h, 3.22, hwyMaskX * 0.92);
  h = THREE.MathUtils.lerp(h, 1.9, portalWestCut * 0.95);
  h = THREE.MathUtils.lerp(h, 3.25, portalEastCut * 0.95);

  return h;
}

export function createCoastalTerrain(
  materials: PortMaterialLibrary,
  isLigera: boolean
): TerrainController {
  const group = new THREE.Group();
  group.name = 'terreno';
  group.userData.componentId = 'terreno';

  const width = 188; // x from -24 to +164 (covers Punta Chancay promontory)
  const depth = 224; // z from -112 to +112
  const segX = isLigera ? 72 : 132;
  const segZ = isLigera ? 76 : 140;

  const geometry = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const baseHeights = new Float32Array(posAttr.count);
  const colors = new Float32Array(posAttr.count * 3);

  // Authentic Peruvian central-coast arid palette (sand, silt-loam, weathered andesite rock)
  const cSand = new THREE.Color(0xcab696);
  const cDryEarth = new THREE.Color(0xae9676);
  const cRock = new THREE.Color(0x766e64);
  const cDarkSlate = new THREE.Color(0x5c5751);
  const cGraded = new THREE.Color(0x8d939a);
  const cSeabed = new THREE.Color(0x656157);
  const tmpColor = new THREE.Color();

  // Offset X by +70 so mesh spans x in [-24, +164]
  const offsetX = 70;

  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const wx = lx + offsetX;
    const h = computeChancayTerrainHeight(wx, lz);
    posAttr.setY(i, h);
    baseHeights[i] = h;

    if (h < 0.25) {
      tmpColor.copy(cSeabed);
    } else if (h < 1.35) {
      tmpColor.copy(cSand);
    } else if (wx >= 4 && wx <= 42.5 && lz >= -48 && lz <= 44) {
      tmpColor.copy(cGraded);
    } else if (wx >= 88 && wx <= 144 && lz >= -26 && lz <= 32) {
      tmpColor.copy(cGraded);
    } else {
      const rockMix = THREE.MathUtils.smoothstep(h, 3.2, 13.5);
      const strata = 0.5 + 0.5 * Math.sin(wx * 0.12 + lz * 0.09 + h * 0.35);
      const isPuntaRock = lz < -55 && wx < 28 ? 0.55 : 0;
      tmpColor
        .copy(cDryEarth)
        .lerp(cSand, strata * 0.36)
        .lerp(cRock, Math.min(1, rockMix * 0.72 + isPuntaRock))
        .lerp(cDarkSlate, strata * rockMix * 0.25);
    }

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const terrainMesh = new THREE.Mesh(geometry, materials.terrainMaterial);
  terrainMesh.position.set(offsetX, 0, 0);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = false;
  terrainMesh.userData.componentId = 'terreno';
  group.add(terrainMesh);

  // Coastal rock revetments protecting northern & southern edges of the reclaimed ZOP platform
  const revetNorth = new THREE.Mesh(new THREE.BoxGeometry(39, 2.3, 2.8), materials.rockArmor);
  revetNorth.position.set(22, 1.05, -47.8);
  revetNorth.castShadow = true;
  revetNorth.receiveShadow = true;
  revetNorth.userData.componentId = 'terreno';
  group.add(revetNorth);

  const revetSouth = new THREE.Mesh(new THREE.BoxGeometry(39, 2.3, 2.8), materials.rockArmor);
  revetSouth.position.set(22, 1.05, 42.8);
  revetSouth.castShadow = true;
  revetSouth.receiveShadow = true;
  revetSouth.userData.componentId = 'terreno';
  group.add(revetSouth);

  // Natural angular coastal rock outcrops along Punta Chancay & Cerro Trinidad slopes (InstancedMesh)
  const outcropCount = isLigera ? 36 : 78;
  const boulderGeo = new THREE.DodecahedronGeometry(1.15, 0);
  const boulders = new THREE.InstancedMesh(boulderGeo, materials.rockArmor, outcropCount);
  const dummy = new THREE.Object3D();
  let bIdx = 0;

  for (let i = 0; i < outcropCount; i++) {
    const isPunta = i < outcropCount * 0.45;
    const rx = isPunta
      ? -12 + ((i * 7.3) % 34)
      : 48 + ((i * 11.7) % 34);
    const rz = isPunta
      ? -76 + ((i * 5.9) % 20)
      : -72 + ((i * 13.1) % 144);
    // Skip tunnel cutaway corridor so outcrops never float over open trench
    if (rx >= 42 && rx <= 90 && Math.abs(rz - 4) < 11) continue;

    const ry = computeChancayTerrainHeight(rx, rz);
    if (ry < 0.2) continue;

    dummy.position.set(rx, ry - 0.25, rz);
    dummy.rotation.set(i * 0.8, i * 1.4, i * 0.5);
    const sx = 0.7 + ((i * 17) % 10) * 0.08;
    const sy = 0.45 + ((i * 11) % 8) * 0.06;
    const sz = 0.65 + ((i * 13) % 9) * 0.07;
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    boulders.setMatrixAt(bIdx++, dummy.matrix);
  }
  boulders.count = bIdx;
  boulders.instanceMatrix.needsUpdate = true;
  boulders.computeBoundingSphere();
  boulders.castShadow = !isLigera;
  boulders.receiveShadow = true;
  boulders.userData.componentId = 'terreno';
  group.add(boulders);

  // Survey benchmark marker overlooking port on Cerro Trinidad
  const stake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 1.5, 8),
    materials.steelCraneRed
  );
  stake.position.set(53, computeChancayTerrainHeight(53, -18) + 0.75, -18);
  stake.userData.componentId = 'terreno';
  group.add(stake);

  function setTunnelCutaway(enabled: boolean) {
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const wx = positions.getX(i) + offsetX;
      const wz = positions.getZ(i);
      if (enabled && wx >= 43 && wx <= 89 && wz >= -4.8 && wz <= 12.8) {
        const xMask =
          THREE.MathUtils.smoothstep(wx, 43, 46.8) *
          (1 - THREE.MathUtils.smoothstep(wx, 85.2, 89));
        const zDist = Math.abs(wz - 4.0);
        const zMask = 1 - THREE.MathUtils.smoothstep(zDist, 3.4, 8.6);
        const cutMask = xMask * zMask;
        const trenchFloor = THREE.MathUtils.lerp(1.88, 3.22, (wx - 43) / 46);
        const h = THREE.MathUtils.lerp(baseHeights[i], trenchFloor + 0.25, cutMask);
        positions.setY(i, h);
      } else {
        positions.setY(i, baseHeights[i]);
      }
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  function dispose() {
    geometry.dispose();
    boulderGeo.dispose();
    revetNorth.geometry.dispose();
    revetSouth.geometry.dispose();
    stake.geometry.dispose();
  }

  return {
    group,
    groundHeightAt: computeChancayTerrainHeight,
    setTunnelCutaway,
    dispose,
  };
}
