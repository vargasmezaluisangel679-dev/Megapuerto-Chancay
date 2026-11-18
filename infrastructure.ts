import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PortMaterialLibrary } from './materials';
import { ComponentId } from '../types/port';

function tagComponent(obj: THREE.Object3D, id: ComponentId) {
  obj.userData.componentId = id;
  obj.traverse((child) => {
    child.userData.componentId = id;
  });
}

function createAccropodeGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const mainSpine = new THREE.BoxGeometry(0.46, 1.32, 0.46).toNonIndexed();
  parts.push(mainSpine);

  const crossArmX = new THREE.BoxGeometry(1.32, 0.44, 0.42).toNonIndexed();
  parts.push(crossArmX);

  const crossArmZ = new THREE.BoxGeometry(0.42, 0.44, 1.32).toNonIndexed();
  parts.push(crossArmZ);

  const anvilTop = new THREE.BoxGeometry(0.76, 0.24, 0.76).toNonIndexed();
  anvilTop.translate(0, 0.46, 0);
  parts.push(anvilTop);

  const anvilBot = new THREE.BoxGeometry(0.76, 0.24, 0.76).toNonIndexed();
  anvilBot.translate(0, -0.46, 0);
  parts.push(anvilBot);

  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

export interface STSCraneRig {
  group: THREE.Group;
  trolley: THREE.Group;
  spreaderGroup: THREE.Group;
  cables: THREE.Mesh[];
  hoistedContainer: THREE.Mesh;
  baseX: number;
  baseZ: number;
}

export interface InfrastructureHandles {
  breakwaterGroup: THREE.Group;
  pierGroup: THREE.Group;
  cranesGroup: THREE.Group;
  shipsGroup: THREE.Group;
  yardGroup: THREE.Group;
  tunnelGroup: THREE.Group;
  entranceGroup: THREE.Group;
  signageGroup: THREE.Group;
  explanatoryGroup: THREE.Group;
  heroCrane: STSCraneRig;
  heroShipGroup: THREE.Group;
  feederShipGroup: THREE.Group;
  radarMeshes: THREE.Object3D[];
  setStructuralCutaway: (enabled: boolean) => void;
  setTunnelCutaway: (enabled: boolean) => void;
  dispose: () => void;
}

export function buildPortInfrastructure(
  materials: PortMaterialLibrary,
  isLigera: boolean
): InfrastructureHandles {
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const radarMeshes: THREE.Object3D[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  const signageGroup = new THREE.Group();
  signageGroup.name = 'senalizacion';

  const explanatoryGroup = new THREE.Group();
  explanatoryGroup.name = 'explicativos';

  const dummy = new THREE.Object3D();

  // =========================================================================
  // 1. ROMPEOLAS PRINCIPAL (~2.7 KM REF.) + ROMPEOLAS SECUNDARIO (Punta Chancay)
  // =========================================================================
  const breakwaterGroup = new THREE.Group();
  breakwaterGroup.name = 'rompeolas';

  // Main curved breakwater anchored into Punta Chancay headland
  const bwPoints = [
    new THREE.Vector3(10, 0, -68),
    new THREE.Vector3(-16, 0, -70),
    new THREE.Vector3(-42, 0, -67),
    new THREE.Vector3(-56, 0, -50),
    new THREE.Vector3(-62, 0, -18),
    new THREE.Vector3(-59, 0, 20),
  ];
  const bwCurve = new THREE.CatmullRomCurve3(bwPoints);

  // Submerged & emersed quarry-run core
  const coreTube = trackGeo(new THREE.TubeGeometry(bwCurve, isLigera ? 32 : 60, 3.8, 7, false));
  coreTube.scale(1, 0.78, 1);
  const coreMesh = new THREE.Mesh(coreTube, materials.rockCore);
  coreMesh.position.y = 0.55;
  coreMesh.castShadow = true;
  coreMesh.receiveShadow = true;
  breakwaterGroup.add(coreMesh);

  // Outer riprap rock armor slope
  const armorTube = trackGeo(new THREE.TubeGeometry(bwCurve, isLigera ? 32 : 60, 4.7, 8, false));
  armorTube.scale(1, 0.55, 1);
  const armorMesh = new THREE.Mesh(armorTube, materials.rockArmor);
  armorMesh.position.y = 0.15;
  armorMesh.castShadow = true;
  armorMesh.receiveShadow = true;
  breakwaterGroup.add(armorMesh);

  // Concrete crown wall (espaldón) + crest service deck
  const crownPoints = bwPoints.map((p) => new THREE.Vector3(p.x, 1.8, p.z));
  const crownCurve = new THREE.CatmullRomCurve3(crownPoints);
  const crownGeo = trackGeo(new THREE.TubeGeometry(crownCurve, isLigera ? 28 : 52, 1.45, 4, false));
  crownGeo.scale(1, 0.42, 1);
  const crownMesh = new THREE.Mesh(crownGeo, materials.concreteDeck);
  crownMesh.position.y = 1.65;
  crownMesh.castShadow = true;
  crownMesh.receiveShadow = true;
  breakwaterGroup.add(crownMesh);

  // Raised concrete wave-deflector parapet along seaward crest
  const parapetPoints = bwPoints.map((p) => new THREE.Vector3(p.x - 0.65, 2.35, p.z - 0.45));
  const parapetCurve = new THREE.CatmullRomCurve3(parapetPoints);
  const parapetGeo = trackGeo(new THREE.TubeGeometry(parapetCurve, isLigera ? 24 : 44, 0.46, 4, false));
  parapetGeo.scale(0.8, 1.15, 0.8);
  const parapetMesh = new THREE.Mesh(parapetGeo, materials.concretePrecast);
  parapetMesh.castShadow = !isLigera;
  parapetMesh.receiveShadow = true;
  breakwaterGroup.add(parapetMesh);

  // Instanced interlocking 3D concrete accropode armor units on outer seaward slope
  const armorCount = isLigera ? 140 : 320;
  const accropodeGeo = trackGeo(createAccropodeGeometry());
  const accropodes = new THREE.InstancedMesh(accropodeGeo, materials.accropodeConcrete, armorCount);
  const upVec = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3();
  const normalOut = new THREE.Vector3();

  for (let i = 0; i < armorCount; i++) {
    const t = i / (armorCount - 1);
    const pt = bwCurve.getPointAt(t);
    bwCurve.getTangentAt(t, tangent);
    normalOut.crossVectors(tangent, upVec).normalize();

    const row = i % 3;
    const radialOffset = 2.6 + row * 0.78 + ((i * 19) % 7) * 0.08;
    const heightOffset = 1.75 - row * 0.56 + ((i * 11) % 5) * 0.06;

    dummy.position.set(
      pt.x - normalOut.x * radialOffset,
      heightOffset,
      pt.z - normalOut.z * radialOffset
    );
    dummy.rotation.set(i * 1.13, i * 0.77, i * 0.49);
    const sc = 0.72 + ((i * 13) % 9) * 0.032;
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    accropodes.setMatrixAt(i, dummy.matrix);
  }
  accropodes.instanceMatrix.needsUpdate = true;
  accropodes.computeBoundingSphere();
  accropodes.castShadow = !isLigera;
  accropodes.receiveShadow = true;
  breakwaterGroup.add(accropodes);

  // Pierhead navigation lighthouse (Faro de morro) at (-59, 20)
  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(-59, 2.2, 20);
  const beaconCaisson = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.5, 1.9, 2.6, 14)),
    materials.concretePrecast
  );
  beaconCaisson.position.y = 1.1;
  const beaconTower = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.45, 0.75, 3.6, 12)),
    materials.zpmcWhite
  );
  beaconTower.position.y = 4.0;
  const beaconGallery = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.85, 0.85, 0.25, 12)),
    materials.zpmcRed
  );
  beaconGallery.position.y = 5.75;
  const beaconLantern = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.42, 0.48, 0.85, 10)),
    materials.glassBridge
  );
  beaconLantern.position.y = 6.3;
  const beaconCap = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.55, 0.45, 10)),
    materials.zpmcRed
  );
  beaconCap.position.y = 6.95;
  beaconGroup.add(beaconCaisson, beaconTower, beaconGallery, beaconLantern, beaconCap);
  breakwaterGroup.add(beaconGroup);

  // Secondary Northern Protection Breakwater shielding Muelle 1 approach
  const secBwCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-16, 0, -57),
    new THREE.Vector3(-30, 0, -54.5),
    new THREE.Vector3(-42, 0, -49.5),
  ]);
  const secBwMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(secBwCurve, 18, 2.5, 7, false)),
    materials.rockArmor
  );
  secBwMesh.scale.set(1, 0.58, 1);
  secBwMesh.position.y = 0.45;
  secBwMesh.castShadow = !isLigera;
  secBwMesh.receiveShadow = true;
  breakwaterGroup.add(secBwMesh);

  // Southern Harbor Entrance Rock Spur
  const spurCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(18, 0, 56),
    new THREE.Vector3(2, 0, 56),
    new THREE.Vector3(-14, 0, 53),
  ]);
  const spurMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(spurCurve, 16, 2.7, 7, false)),
    materials.rockArmor
  );
  spurMesh.scale.set(1, 0.56, 1);
  spurMesh.position.y = 0.42;
  spurMesh.receiveShadow = true;
  breakwaterGroup.add(spurMesh);

  tagComponent(breakwaterGroup, 'rompeolas');

  // =========================================================================
  // 2. MUELLES DIFERENCIADOS FASE 1 (M1 Espigón + M2 Granel + M3-M4 Contenedores)
  // =========================================================================
  const pierGroup = new THREE.Group();
  pierGroup.name = 'muelle';

  // --- Muelle 1: Espigón Carga General / Ro-Ro (x = -28..+4, z = -44.3..-37.7, top y = 1.90) ---
  const m1Deck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(32, 0.64, 6.6)),
    materials.concreteDeck
  );
  m1Deck.position.set(-12, 1.58, -41.0);
  m1Deck.castShadow = true;
  m1Deck.receiveShadow = true;
  pierGroup.add(m1Deck);

  // Ro-Ro transition ramp apron connecting Muelle 1 to Muelle 2 landside
  const roroApron = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8, 0.62, 6.0)),
    materials.concretePrecast
  );
  roroApron.position.set(0, 1.59, -35.2);
  roroApron.receiveShadow = true;
  pierGroup.add(roroApron);

  // Harbor Pedestal / Mobile Slewing Crane on Muelle 1 (differentiated from STS gantries)
  const m1Crane = new THREE.Group();
  m1Crane.position.set(-14, 1.90, -41.0);
  const m1Pedestal = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.65, 0.95, 2.6, 12)),
    materials.zpmcBlue
  );
  m1Pedestal.position.y = 1.3;
  const m1House = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.7, 1.3, 2.2)),
    materials.zpmcWhite
  );
  m1House.position.set(0, 3.2, -0.2);
  const m1Jib = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.45, 0.48, 8.6)),
    materials.zpmcRed
  );
  m1Jib.position.set(0, 5.5, 3.4);
  m1Jib.rotation.x = -0.45;
  const m1Mast = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.4, 3.4, 0.4)),
    materials.zpmcBlue
  );
  m1Mast.position.set(0, 5.2, -0.6);
  m1Crane.add(m1Pedestal, m1House, m1Jib, m1Mast);
  pierGroup.add(m1Crane);

  // --- Muelle 2: Marginal Multipropósito / Granel (x = -12..+4, z = -37.7..-16.0) ---
  // --- Muelles 3 & 4: Frente Continuo de Contenedores (x = -12..+4, z = -16.0..+30.0 solid, +30..+42 cutaway) ---
  const mainMarginalDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(16, 0.64, 67.7)),
    materials.concreteDeck
  );
  mainMarginalDeck.position.set(-4, 1.58, -3.85);
  mainMarginalDeck.castShadow = true;
  mainMarginalDeck.receiveShadow = true;
  pierGroup.add(mainMarginalDeck);

  // Berth 4 Structural Cutaway Deck Slab (z = +30..+42)
  const cutawayMat = trackMat(materials.concreteDeck.clone());
  const cutawayDeckGeo = trackGeo(new THREE.BoxGeometry(16, 0.64, 12));
  const cutawayDeck = new THREE.Mesh(cutawayDeckGeo, cutawayMat);
  cutawayDeck.position.set(-4, 1.58, 36.0);
  cutawayDeck.receiveShadow = true;
  pierGroup.add(cutawayDeck);

  // Concrete coping beam along marginal quay edge (x = -11.7) & Muelle 1 south edge (z = -37.85)
  const marginalCoping = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.85, 0.9, 79.7)),
    materials.concretePrecast
  );
  marginalCoping.position.set(-11.7, 1.54, 2.15);
  pierGroup.add(marginalCoping);

  const m1Coping = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(32, 0.85, 0.7)),
    materials.concretePrecast
  );
  m1Coping.position.set(-12, 1.54, -37.95);
  pierGroup.add(m1Coping);

  // Safety edge stripes along quay edge
  const edgeStripeGeo = trackGeo(new THREE.PlaneGeometry(0.48, 79.7));
  edgeStripeGeo.rotateX(-Math.PI / 2);
  const edgeStripe = new THREE.Mesh(edgeStripeGeo, materials.safetyStripe);
  edgeStripe.position.set(-11.1, 1.915, 2.15);
  signageGroup.add(edgeStripe);

  const m1StripeGeo = trackGeo(new THREE.PlaneGeometry(31.5, 0.45));
  m1StripeGeo.rotateX(-Math.PI / 2);
  const m1Stripe = new THREE.Mesh(m1StripeGeo, materials.safetyStripe);
  m1Stripe.position.set(-12, 1.915, -38.35);
  signageGroup.add(m1Stripe);

  // Sub-deck Precast Beams & Pile Caps (visible especially in Berth 4 cutaway)
  const longBeamGeo = trackGeo(new THREE.BoxGeometry(0.65, 0.85, 79.5));
  [-11.2, -6.7, -3.2, 2.2].forEach((bx) => {
    const beam = new THREE.Mesh(longBeamGeo, materials.concretePrecast);
    beam.position.set(bx, 0.82, 2.15);
    pierGroup.add(beam);
  });

  const transBeamGeo = trackGeo(new THREE.BoxGeometry(15.2, 0.74, 0.7));
  for (let bz = -36; bz <= 40; bz += 8) {
    const tb = new THREE.Mesh(transBeamGeo, materials.concretePrecast);
    tb.position.set(-4, 0.84, bz);
    pierGroup.add(tb);
  }

  // Muelle 1 sub-deck transverse pile caps
  const m1BeamGeo = trackGeo(new THREE.BoxGeometry(0.65, 0.72, 6.2));
  for (let bx = -26; bx <= 0; bx += 6.5) {
    const mb = new THREE.Mesh(m1BeamGeo, materials.concretePrecast);
    mb.position.set(bx, 0.84, -41.0);
    pierGroup.add(mb);
  }

  // Deep Marine Tubular Piles (InstancedMesh) for Marginal Quay + Muelle 1
  const pileCoords: [number, number][] = [];
  [-11.2, -6.7, -3.2, 2.2].forEach((px) => {
    for (let pz = -36; pz <= 40; pz += 8) {
      pileCoords.push([px, pz]);
    }
  });
  for (let bx = -26; bx <= -6.5; bx += 6.5) {
    pileCoords.push([bx, -43.2], [bx, -38.8]);
  }
  const pileGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 4.6, isLigera ? 8 : 12));
  const pilesInstanced = new THREE.InstancedMesh(pileGeo, materials.steelGalvanized, pileCoords.length);
  pileCoords.forEach(([px, pz], idx) => {
    dummy.position.set(px, -1.15, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    pilesInstanced.setMatrixAt(idx, dummy.matrix);
  });
  pilesInstanced.instanceMatrix.needsUpdate = true;
  pilesInstanced.computeBoundingSphere();
  pierGroup.add(pilesInstanced);

  // Crane rails along Muelles 3 & 4 (also extending into Muelle 2 apron)
  const railGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.14, 70));
  [-10.2, -3.2].forEach((rx) => {
    const rail = new THREE.Mesh(railGeo, materials.steelGalvanized);
    rail.position.set(rx, 1.97, 6.0);
    pierGroup.add(rail);
  });

  // Elastomeric Berthing Fenders (cone + frontal UHMW-PE panel) along Marginal Quay & Muelle 1
  const fenderCoords: { x: number; z: number; rotY: number }[] = [];
  for (let fz = -34; fz <= 38; fz += 5.5) {
    fenderCoords.push({ x: -12.35, z: fz, rotY: 0 });
  }
  for (let fx = -26; fx <= -13; fx += 4.3) {
    fenderCoords.push({ x: fx, z: -37.45, rotY: Math.PI / 2 });
  }
  const fenderGeo = trackGeo(new THREE.BoxGeometry(0.56, 0.95, 1.45));
  const fenders = new THREE.InstancedMesh(fenderGeo, materials.rubberFender, fenderCoords.length);
  fenderCoords.forEach((fc, idx) => {
    dummy.position.set(fc.x, 1.12, fc.z);
    dummy.rotation.set(0, fc.rotY, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    fenders.setMatrixAt(idx, dummy.matrix);
  });
  fenders.instanceMatrix.needsUpdate = true;
  fenders.computeBoundingSphere();
  pierGroup.add(fenders);

  // Twin-bitt Mooring Bollards along Marginal Quay (x = -11.55) & Muelle 1 (z = -38.15)
  const bollardCoords: [number, number][] = [];
  for (let bz = -34; bz <= 39; bz += 6.0) {
    bollardCoords.push([-11.55, bz]);
  }
  for (let bx = -26; bx <= -13; bx += 4.3) {
    bollardCoords.push([bx, -38.15]);
  }
  const bollardGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 0.56, 10));
  const bollards = new THREE.InstancedMesh(bollardGeo, materials.steelYellow, bollardCoords.length);
  bollardCoords.forEach(([bx, bz], idx) => {
    dummy.position.set(bx, 2.14, bz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    bollards.setMatrixAt(idx, dummy.matrix);
  });
  bollards.instanceMatrix.needsUpdate = true;
  bollards.computeBoundingSphere();
  pierGroup.add(bollards);

  // Bulk Receiving Hoppers & Covered Conveyor Gallery on Muelle 2 (x = -2.5 -> +11, z = -26)
  [-29, -22].forEach((hz) => {
    const hopperBase = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.6, 2.2, 2.6)),
      materials.steelGalvanized
    );
    hopperBase.position.set(-2.5, 3.0, hz);
    const hopperCone = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.6, 0.65, 1.4, 8)),
      materials.zpmcBlue
    );
    hopperCone.position.set(-2.5, 4.7, hz);
    pierGroup.add(hopperBase, hopperCone);
  });

  const conveyorGallery = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(17.5, 0.95, 1.25)),
    materials.steelGalvanized
  );
  conveyorGallery.position.set(6.2, 5.85, -26);
  conveyorGallery.rotation.z = 0.055;
  conveyorGallery.castShadow = !isLigera;
  pierGroup.add(conveyorGallery);

  // Trestle support bents anchoring the elevated transfer gallery to deck/warehouse
  [0.8, 7.6, 13.8].forEach((bx) => {
    const galleryTopY = 5.85 + (bx - 6.2) * Math.tan(0.055) - 0.35;
    const baseY = 1.9;
    const colH = Math.max(1.0, galleryTopY - baseY);
    [-0.45, 0.45].forEach((cz) => {
      const bentLeg = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.24, colH, 0.24)),
        materials.zpmcBlue
      );
      bentLeg.position.set(bx, baseY + colH * 0.5, -26 + cz);
      bentLeg.castShadow = !isLigera;
      pierGroup.add(bentLeg);
    });
    const crossTie = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.22, 0.22, 1.15)),
      materials.zpmcBlue
    );
    crossTie.position.set(bx, baseY + colH * 0.65, -26);
    pierGroup.add(crossTie);
  });

  // Cutaway highlight wireframe
  const cutawayHighlightGeo = trackGeo(new THREE.EdgesGeometry(cutawayDeckGeo));
  const cutawayOutline = new THREE.LineSegments(
    cutawayHighlightGeo,
    trackMat(new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.8 }))
  );
  cutawayOutline.position.copy(cutawayDeck.position);
  cutawayOutline.visible = false;
  explanatoryGroup.add(cutawayOutline);

  tagComponent(pierGroup, 'muelle');

  // =========================================================================
  // 3. GRÚAS ZPMC STS DE ÚLTIMA GENERACIÓN (Blue / White / Red COSCO Livery)
  // =========================================================================
  const cranesGroup = new THREE.Group();
  cranesGroup.name = 'grua-sts';

  function createSTSCrane(zPos: number, isHero: boolean): STSCraneRig {
    const crane = new THREE.Group();
    crane.position.set(-6.7, 1.97, zPos);

    const halfGauge = 3.5; // rail gauge x = -3.5..+3.5 local (world -10.2..-3.2)
    const halfSpanZ = 3.0; // clear portal Z-span = 6.0 for trucks & safety clearance

    // 8-wheel Bogie Trucks + Equalizer Beams + Rail Clamps + Yellow Bumpers
    const bogieBeamGeo = trackGeo(new THREE.BoxGeometry(0.66, 0.46, 2.55));
    const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.32, 12));
    wheelGeo.rotateZ(Math.PI / 2);
    const bumperGeo = trackGeo(new THREE.BoxGeometry(0.5, 0.34, 0.3));
    const legGeo = trackGeo(new THREE.BoxGeometry(0.58, 11.1, 0.58));

    const corners: [number, number][] = [
      [-halfGauge, -halfSpanZ],
      [halfGauge, -halfSpanZ],
      [-halfGauge, halfSpanZ],
      [halfGauge, halfSpanZ],
    ];

    corners.forEach(([lx, lz]) => {
      const bogie = new THREE.Mesh(bogieBeamGeo, materials.zpmcBlue);
      bogie.position.set(lx, 0.36, lz);
      bogie.castShadow = !isLigera;
      crane.add(bogie);

      [-0.85, -0.3, 0.3, 0.85].forEach((wz) => {
        const wheel = new THREE.Mesh(wheelGeo, materials.steelGalvanized);
        wheel.position.set(lx, 0.22, lz + wz);
        crane.add(wheel);
      });

      const bumper = new THREE.Mesh(bumperGeo, materials.steelYellow);
      bumper.position.set(lx, 0.35, lz + (lz > 0 ? 1.38 : -1.38));
      crane.add(bumper);

      // Lower ZPMC blue steel portal legs
      const leg = new THREE.Mesh(legGeo, materials.zpmcBlue);
      leg.position.set(lx, 6.0, lz);
      leg.castShadow = true;
      crane.add(leg);
    });

    // Sill beams & portal tie arches (bottom clearance y = 6.6 -> world y = 8.57, ample room for trucks!)
    const sillGeo = trackGeo(new THREE.BoxGeometry(0.5, 0.58, halfSpanZ * 2));
    [-halfGauge, halfGauge].forEach((lx) => {
      const sill = new THREE.Mesh(sillGeo, materials.zpmcBlue);
      sill.position.set(lx, 1.35, 0);
      const midTie = new THREE.Mesh(sillGeo, materials.zpmcBlue);
      midTie.position.set(lx, 5.2, 0);
      crane.add(sill, midTie);
    });

    const portalArchGeo = trackGeo(new THREE.BoxGeometry(halfGauge * 2 + 0.6, 0.68, 0.52));
    [-halfSpanZ, halfSpanZ].forEach((lz) => {
      const arch = new THREE.Mesh(portalArchGeo, materials.zpmcBlue);
      arch.position.set(0, 6.65, lz);
      crane.add(arch);
    });

    // Diagonal portal X-lattice truss bracing + gusset plates
    const diagGeo = trackGeo(new THREE.BoxGeometry(0.24, 5.2, 0.24));
    [-halfGauge, halfGauge].forEach((lx) => {
      const d1 = new THREE.Mesh(diagGeo, materials.zpmcWhite);
      d1.position.set(lx, 8.3, 0);
      d1.rotation.x = Math.PI / 4.8;
      const d2 = new THREE.Mesh(diagGeo, materials.zpmcWhite);
      d2.position.set(lx, 8.3, 0);
      d2.rotation.x = -Math.PI / 4.8;
      crane.add(d1, d2);
    });

    // Upper Portal Box Girders (White)
    const topGirderGeo = trackGeo(new THREE.BoxGeometry(halfGauge * 2 + 0.8, 0.92, 0.64));
    [-halfSpanZ, halfSpanZ].forEach((lz) => {
      const tg = new THREE.Mesh(topGirderGeo, materials.zpmcWhite);
      tg.position.set(0, 11.45, lz);
      crane.add(tg);
    });

    // Tall A-Frame Apex Masts (ZPMC White + Red crown cap)
    const apexPostGeo = trackGeo(new THREE.BoxGeometry(0.52, 7.1, 0.52));
    [-halfSpanZ + 0.45, halfSpanZ - 0.45].forEach((lz) => {
      const post = new THREE.Mesh(apexPostGeo, materials.zpmcWhite);
      post.position.set(-halfGauge + 0.45, 14.8, lz);
      post.rotation.z = -0.14;
      crane.add(post);
    });
    const apexCross = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.15, 0.72, halfSpanZ * 2)),
      materials.zpmcRed
    );
    apexCross.position.set(-halfGauge + 0.9, 18.25, 0);
    crane.add(apexCross);

    // Waterside Boom & Landside Backreach Double Box Girders (x from -17.5 to +10.2)
    const boomLength = 27.7;
    const boomCenterLocalX = -3.65;
    const boomGirderGeo = trackGeo(new THREE.BoxGeometry(boomLength, 0.76, 0.48));
    [-1.4, 1.4].forEach((bz) => {
      const girder = new THREE.Mesh(boomGirderGeo, materials.zpmcWhite);
      girder.position.set(boomCenterLocalX, 11.35, bz);
      girder.castShadow = true;
      crane.add(girder);
    });

    // Red safety nose tip on boom & backreach ends
    const tipBandGeo = trackGeo(new THREE.BoxGeometry(1.8, 0.8, 3.3));
    const frontTip = new THREE.Mesh(tipBandGeo, materials.zpmcRed);
    frontTip.position.set(-16.7, 11.35, 0);
    const backTip = new THREE.Mesh(tipBandGeo, materials.zpmcRed);
    backTip.position.set(9.4, 11.35, 0);
    crane.add(frontTip, backTip);

    // Boom Cross Ties & Maintenance Catwalk Handrail
    const boomTieGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.34, 2.85));
    for (let tx = -15.5; tx <= 8.5; tx += 3.0) {
      const tie = new THREE.Mesh(boomTieGeo, materials.zpmcBlue);
      tie.position.set(tx, 11.75, 0);
      crane.add(tie);
    }

    const catwalkRail = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(boomLength - 1.5, 0.08, 0.08)),
      materials.steelYellow
    );
    catwalkRail.position.set(boomCenterLocalX, 12.25, 1.72);
    crane.add(catwalkRail);

    // Forestay & Backstay Steel Tension Bars
    const createStayRod = (p1: THREE.Vector3, p2: THREE.Vector3) => {
      const dist = p1.distanceTo(p2);
      const rod = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.085, 0.085, dist, 6)),
        materials.steelGalvanized
      );
      rod.position.copy(p1).add(p2).multiplyScalar(0.5);
      rod.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        p2.clone().sub(p1).normalize()
      );
      crane.add(rod);
    };
    [-1.4, 1.4].forEach((bz) => {
      createStayRod(new THREE.Vector3(-halfGauge + 0.9, 18.25, bz), new THREE.Vector3(-16.2, 11.7, bz));
      createStayRod(new THREE.Vector3(-halfGauge + 0.9, 18.25, bz), new THREE.Vector3(-8.5, 11.7, bz));
      createStayRod(new THREE.Vector3(-halfGauge + 0.9, 18.25, bz), new THREE.Vector3(9.2, 11.7, bz));
    });

    // Machinery House (White with ZPMC Blue trim & louver stripe)
    const machHouse = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.2, 2.2, 3.6)),
      materials.zpmcWhite
    );
    machHouse.position.set(5.4, 12.7, 0);
    machHouse.castShadow = !isLigera;
    crane.add(machHouse);

    const machStripe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.26, 0.45, 3.66)),
      materials.zpmcBlue
    );
    machStripe.position.set(5.4, 12.0, 0);
    crane.add(machStripe);

    // Moving Trolley + Glazed Operator Cabin + 4 Hoist Cables + Spreader
    const trolley = new THREE.Group();
    trolley.position.set(isHero ? -10.3 : -6.2, 11.0, 0);

    const trolleyFrame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.5, 0.56, 3.2)),
      materials.zpmcBlue
    );
    trolley.add(trolleyFrame);

    const cabinBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.35, 1.08, 1.18)),
      materials.zpmcWhite
    );
    cabinBody.position.set(0.1, -0.88, 1.32);
    const cabinRoof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.42, 0.16, 1.24)),
      materials.zpmcRed
    );
    cabinRoof.position.set(0.1, -0.32, 1.32);
    const cabinGlass = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.38, 0.65, 1.2)),
      materials.glassBridge
    );
    cabinGlass.position.set(0.1, -0.96, 1.32);
    trolley.add(cabinBody, cabinRoof, cabinGlass);

    // 4 Hoist Cables
    const cables: THREE.Mesh[] = [];
    const cableGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 1.0, 6));
    const cableOffsets: [number, number][] = [
      [-0.58, -0.98],
      [0.58, -0.98],
      [-0.58, 0.98],
      [0.58, 0.98],
    ];
    cableOffsets.forEach(([cx, cz]) => {
      const cable = new THREE.Mesh(cableGeo, materials.steelGalvanized);
      cable.position.set(cx, -1.8, cz);
      trolley.add(cable);
      cables.push(cable);
    });

    // Telescoping Spreader + Corner Flipper Guides + Hoisted Container
    const spreaderGroup = new THREE.Group();
    spreaderGroup.position.set(0, -3.5, 0);

    const spreaderBar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.46, 0.36, 3.16)),
      materials.steelYellow
    );
    spreaderGroup.add(spreaderBar);

    const hoistedContainer = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.36, 1.34, 3.05)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: materials.containerMetal.map,
          bumpMap: materials.containerMetal.bumpMap,
          bumpScale: 0.035,
          color: 0x0e4f92,
          roughness: 0.45,
          metalness: 0.5,
        })
      )
    );
    hoistedContainer.position.set(0, -0.88, 0);
    hoistedContainer.visible = false;
    hoistedContainer.castShadow = !isLigera;
    spreaderGroup.add(hoistedContainer);

    trolley.add(spreaderGroup);
    crane.add(trolley);
    cranesGroup.add(crane);

    return {
      group: crane,
      trolley,
      spreaderGroup,
      cables,
      hoistedContainer,
      baseX: -6.7,
      baseZ: zPos,
    };
  }

  // Hero Crane #1 positioned at z = +6.0 directly aligned over Hero ULCV Container Ship!
  const heroCrane = createSTSCrane(6.0, true);
  createSTSCrane(-8.0, false);
  createSTSCrane(20.0, false);
  tagComponent(cranesGroup, 'grua-sts');

  // =========================================================================
  // 4. BUQUES PORTACONTENEDORES Y CARGA GENERAL (Ships with Superstructure & Railings)
  // =========================================================================
  const shipsGroup = new THREE.Group();
  shipsGroup.name = 'buque';

  function createContainerShip(
    x: number,
    z: number,
    length: number,
    beam: number,
    leaveBayOpenAtLocalZ?: number
  ): THREE.Group {
    const ship = new THREE.Group();
    ship.position.set(x, 0, z);

    const halfL = length / 2;
    const halfB = beam / 2;
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-halfB * 0.84, -halfL);
    hullShape.lineTo(halfB * 0.84, -halfL);
    hullShape.lineTo(halfB, -halfL * 0.68);
    hullShape.lineTo(halfB, halfL * 0.58);
    hullShape.quadraticCurveTo(halfB * 0.84, halfL * 0.89, 0, halfL);
    hullShape.quadraticCurveTo(-halfB * 0.84, halfL * 0.89, -halfB, halfL * 0.58);
    hullShape.lineTo(-halfB, -halfL * 0.68);
    hullShape.closePath();

    // Anti-fouling lower hull
    const lowerHullGeo = trackGeo(
      new THREE.ExtrudeGeometry(hullShape, { depth: 2.2, bevelEnabled: false })
    );
    lowerHullGeo.rotateX(Math.PI / 2);
    const lowerHull = new THREE.Mesh(lowerHullGeo, materials.shipBootRed);
    lowerHull.position.y = 0.58;
    ship.add(lowerHull);

    // Freeboard dark navy hull with subtle bow flare bevel
    const upperHullGeo = trackGeo(
      new THREE.ExtrudeGeometry(hullShape, {
        depth: 2.35,
        bevelEnabled: true,
        bevelThickness: 0.09,
        bevelSize: 0.08,
        bevelSegments: 2,
      })
    );
    upperHullGeo.rotateX(Math.PI / 2);
    const upperHull = new THREE.Mesh(upperHullGeo, materials.shipHullDark);
    upperHull.position.y = 2.93;
    upperHull.castShadow = true;
    upperHull.receiveShadow = true;
    ship.add(upperHull);

    // Bulbous bow
    const bulb = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(halfB * 0.25, 12, 10)),
      materials.shipBootRed
    );
    bulb.scale.set(0.82, 0.72, 2.0);
    bulb.position.set(0, -0.22, halfL * 0.96);
    ship.add(bulb);

    // Main weather deck + green non-slip hatch covers
    const mainDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(beam * 0.9, 0.2, length * 0.74)),
      materials.shipDeckGreen
    );
    mainDeck.position.set(0, 2.98, -length * 0.03);
    ship.add(mainDeck);

    // Raised cargo hatch coamings along deck
    const coamingGeo = trackGeo(new THREE.BoxGeometry(beam * 0.82, 0.35, 3.05));
    for (let hz = -halfL * 0.44; hz <= halfL * 0.6; hz += 3.45) {
      if (Math.abs(hz - -halfL * 0.66) < 3.6) continue;
      const coaming = new THREE.Mesh(coamingGeo, materials.concretePrecast);
      coaming.position.set(0, 3.18, hz);
      ship.add(coaming);
    }

    // Forecastle windlasses + breakwater shield at bow (+Z)
    const bowShield = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(beam * 0.56, 0.65, 0.25)),
      materials.shipHullDark
    );
    bowShield.position.set(0, 3.25, halfL * 0.72);
    ship.add(bowShield);

    [-0.75, 0.75].forEach((wx) => {
      const windlass = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.5, 8)),
        materials.steelYellow
      );
      windlass.rotation.z = Math.PI / 2;
      windlass.position.set(wx, 3.25, halfL * 0.8);
      ship.add(windlass);
    });

    // Deck perimeter safety railings (port & starboard)
    const railSideGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.35, length * 0.66));
    [-halfB * 0.92, halfB * 0.92].forEach((rx) => {
      const r = new THREE.Mesh(railSideGeo, materials.shipWhite);
      r.position.set(rx, 3.16, -length * 0.03);
      ship.add(r);
    });

    // Aft 6-Tier Accommodation Superstructure & Bridge Wings
    const bridgeZ = -halfL * 0.66;
    const accomBase = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(beam * 0.84, 4.1, 4.5)),
      materials.shipWhite
    );
    accomBase.position.set(0, 5.0, bridgeZ);
    accomBase.castShadow = true;
    ship.add(accomBase);

    const bridgeWing = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(beam * 1.12, 0.95, 1.9)),
      materials.shipWhite
    );
    bridgeWing.position.set(0, 7.35, bridgeZ + 0.5);
    ship.add(bridgeWing);

    const bridgeGlass = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(beam * 1.14, 0.48, 1.94)),
      materials.glassBridge
    );
    bridgeGlass.position.set(0, 7.42, bridgeZ + 0.52);
    ship.add(bridgeGlass);

    // Lifeboat davits on aft sides
    [-halfB * 0.92, halfB * 0.92].forEach((lx) => {
      const lifeboat = new THREE.Mesh(
        trackGeo(new THREE.CapsuleGeometry(0.28, 0.95, 4, 8)),
        materials.zpmcRed
      );
      lifeboat.rotation.x = Math.PI / 2;
      lifeboat.position.set(lx, 4.8, bridgeZ - 0.5);
      ship.add(lifeboat);
    });

    // Funnel + Twin Exhaust Pipes
    const funnel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.4, 2.1, 1.85)),
      materials.zpmcBlue
    );
    funnel.position.set(0, 7.85, bridgeZ - 1.25);
    const funnelBand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.44, 0.45, 1.9)),
      materials.zpmcRed
    );
    funnelBand.position.set(0, 8.65, bridgeZ - 1.25);
    ship.add(funnel, funnelBand);

    // Radar Mast + Rotating Navigation Radar Scanner
    const mast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.22, 2.7, 8)),
      materials.shipWhite
    );
    mast.position.set(0, 9.1, bridgeZ + 0.5);
    ship.add(mast);

    const radarScanner = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.6, 0.14, 0.22)),
      materials.zpmcWhite
    );
    radarScanner.position.set(0, 10.5, bridgeZ + 0.5);
    ship.add(radarScanner);
    radarMeshes.push(radarScanner);

    // Corrugated ISO Deck Containers (InstancedMesh)
    const palette = [0x0e4f92, 0xc83228, 0xd99b18, 0x2f6f4e, 0x3b82a6, 0x475569];
    const contGeo = trackGeo(new THREE.BoxGeometry(1.32, 1.34, 3.05));
    const slotPositions: { x: number; y: number; z: number; color: number }[] = [];

    const rowXs = [-beam * 0.29, 0, beam * 0.29];
    for (let bz = -halfL * 0.42; bz <= halfL * 0.62; bz += 3.45) {
      if (Math.abs(bz - bridgeZ) < 3.8) continue;
      for (const rx of rowXs) {
        const isTargetBay =
          leaveBayOpenAtLocalZ !== undefined &&
          Math.abs(bz - leaveBayOpenAtLocalZ) < 1.8 &&
          Math.abs(rx) < 0.5;
        // Target bay has 1 tier (top at 4.39) so STS Crane picks/places Tier 2 cleanly at y=5.06!
        const maxTier = isTargetBay ? 1 : 2 + ((Math.abs(Math.round(bz + rx)) % 2));
        for (let tier = 0; tier < maxTier; tier++) {
          slotPositions.push({
            x: rx,
            y: 3.72 + tier * 1.34,
            z: bz,
            color: palette[(slotPositions.length + Math.round(Math.abs(bz))) % palette.length],
          });
        }
      }
    }

    const shipConts = new THREE.InstancedMesh(
      contGeo,
      materials.containerMetal,
      slotPositions.length
    );
    const tmpCol = new THREE.Color();
    slotPositions.forEach((slot, idx) => {
      dummy.position.set(slot.x, slot.y, slot.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      shipConts.setMatrixAt(idx, dummy.matrix);
      shipConts.setColorAt(idx, tmpCol.setHex(slot.color));
    });
    shipConts.instanceMatrix.needsUpdate = true;
    if (shipConts.instanceColor) shipConts.instanceColor.needsUpdate = true;
    shipConts.computeBoundingSphere();
    shipConts.castShadow = !isLigera;
    shipConts.receiveShadow = true;
    ship.add(shipConts);

    // Taut Mooring Lines tied from starboard hull chocks to marginal quay bollards (world x = -11.55)
    const lineMat = trackMat(new THREE.LineBasicMaterial({ color: 0x1e293b }));
    const quayXLocal = -11.55 - x;
    [-halfL * 0.78, -halfL * 0.24, halfL * 0.3, halfL * 0.78].forEach((mz) => {
      const pts = [
        new THREE.Vector3(halfB * 0.88, 3.05, mz),
        new THREE.Vector3(quayXLocal, 2.14, mz + 1.1),
      ];
      ship.add(new THREE.Line(trackGeo(new THREE.BufferGeometry().setFromPoints(pts)), lineMat));
    });

    return ship;
  }

  function createGeneralBulkShip(x: number, z: number): THREE.Group {
    const ship = new THREE.Group();
    ship.position.set(x, 0, z);
    ship.rotation.y = Math.PI / 2; // Parallel to Muelle 1 espigón (bow pointing west)

    const length = 20.5;
    const beam = 4.8;
    const halfL = length / 2;
    const halfB = beam / 2;

    const hullShape = new THREE.Shape();
    hullShape.moveTo(-halfB * 0.82, -halfL);
    hullShape.lineTo(halfB * 0.82, -halfL);
    hullShape.lineTo(halfB, -halfL * 0.6);
    hullShape.lineTo(halfB, halfL * 0.56);
    hullShape.quadraticCurveTo(halfB * 0.8, halfL * 0.9, 0, halfL);
    hullShape.quadraticCurveTo(-halfB * 0.8, halfL * 0.9, -halfB, halfL * 0.56);
    hullShape.lineTo(-halfB, -halfL * 0.6);
    hullShape.closePath();

    const lowerGeo = trackGeo(new THREE.ExtrudeGeometry(hullShape, { depth: 1.9, bevelEnabled: false }));
    lowerGeo.rotateX(Math.PI / 2);
    const lower = new THREE.Mesh(lowerGeo, materials.shipBootRed);
    lower.position.y = 0.48;
    ship.add(lower);

    const upperGeo = trackGeo(
      new THREE.ExtrudeGeometry(hullShape, { depth: 1.95, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05 })
    );
    upperGeo.rotateX(Math.PI / 2);
    const upper = new THREE.Mesh(upperGeo, materials.shipHullDark);
    upper.position.y = 2.43;
    upper.castShadow = true;
    ship.add(upper);

    // 3 Cargo Hold Hatch Covers + 2 Shipboard Deck Cranes
    [-3.8, 0.4, 4.6].forEach((hz) => {
      const hatch = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.3, 0.55, 3.2)),
        materials.zpmcRed
      );
      hatch.position.set(0, 2.7, hz);
      ship.add(hatch);
    });

    [-1.7, 2.5].forEach((cz) => {
      const post = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.28, 0.34, 1.9, 8)),
        materials.steelYellow
      );
      post.position.set(0, 3.4, cz);
      const jib = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.22, 0.24, 3.6)),
        materials.steelYellow
      );
      jib.position.set(0.3, 4.7, cz + 1.2);
      jib.rotation.x = -0.5;
      ship.add(post, jib);
    });

    // Aft bridge + funnel
    const bridge = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.6, 2.6, 3.0)),
      materials.shipWhite
    );
    bridge.position.set(0, 3.7, -halfL * 0.72);
    const bGlass = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.8, 0.42, 1.4)),
      materials.glassBridge
    );
    bGlass.position.set(0, 4.65, -halfL * 0.72 + 0.4);
    const funnel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.95, 1.35, 1.2)),
      materials.zpmcBlue
    );
    funnel.position.set(0, 5.4, -halfL * 0.72 - 0.8);
    ship.add(bridge, bGlass, funnel);

    // Mooring lines from Muelle 1 side (world z = -37.2 -> bollards z = -38.15)
    const lineMat = trackMat(new THREE.LineBasicMaterial({ color: 0x1e293b }));
    [-6.5, 0.5, 6.8].forEach((mz) => {
      const pts = [
        new THREE.Vector3(-halfB * 0.9, 2.5, mz),
        new THREE.Vector3(-halfB - 0.95, 2.14, mz),
      ];
      ship.add(new THREE.Line(trackGeo(new THREE.BufferGeometry().setFromPoints(pts)), lineMat));
    });

    return ship;
  }

  // Hero ULCV Container Ship at Muelles 3 & 4 (starboard edge at x=-13.0 flush against fenders at x=-12.35!)
  const heroShipGroup = createContainerShip(-17.0, 6.0, 44, 8.0, 0);
  shipsGroup.add(heroShipGroup);

  // Bulk / General Cargo Vessel berthed at Muelle 1 Espigón south face
  const feederShipGroup = createGeneralBulkShip(-15.5, -34.8);
  shipsGroup.add(feederShipGroup);

  tagComponent(shipsGroup, 'buque');

  // =========================================================================
  // 5. PATIO DE CONTENEDORES, ALMACENES Y GRÚAS DE PATIO RMG/RTG
  // =========================================================================
  const yardGroup = new THREE.Group();
  yardGroup.name = 'patio';

  // Full ZOP operational paving slab (x in [+4..+41], z in [-46..+41], top y = 1.90)
  const yardSlab = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(37, 0.36, 87)),
    materials.yardPaving
  );
  yardSlab.position.set(22.5, 1.72, -2.5);
  yardSlab.receiveShadow = true;
  yardGroup.add(yardSlab);

  // Internal paved haul roads (top y = 1.93, zero z-fighting)
  const createRoadStrip = (cx: number, cz: number, w: number, l: number) => {
    const m = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, 0.04, l)), materials.asphaltRoad);
    m.position.set(cx, 1.91, cz);
    m.receiveShadow = true;
    yardGroup.add(m);
  };

  // North-South port haul lanes
  createRoadStrip(-6.7, 2.0, 3.2, 74); // Under STS crane portals
  createRoadStrip(1.8, -2.5, 3.2, 83); // Quay transfer road
  createRoadStrip(19.5, 12.0, 3.4, 54); // Central container yard spine
  createRoadStrip(36.5, -2.5, 3.4, 83); // East yard perimeter haul road

  // East-West cross connectors (North z=-42, Mid z=+4.0 linking to Tunnel!, South z=+38.5)
  createRoadStrip(15.5, -42.0, 45, 3.4);
  createRoadStrip(21.5, 4.0, 45, 4.0);
  createRoadStrip(15.5, 38.5, 45, 3.4);

  // Dashed road markings on signage layer
  const markingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const dashGeo = trackGeo(new THREE.PlaneGeometry(0.18, 1.6));
  dashGeo.rotateX(-Math.PI / 2);
  const dashCount = 60;
  const dashes = new THREE.InstancedMesh(dashGeo, markingMat, dashCount);
  let dIdx = 0;
  for (let dz = -32; dz <= 36; dz += 3.2) {
    if (dIdx < dashCount) {
      dummy.position.set(-6.7, 1.938, dz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      dashes.setMatrixAt(dIdx++, dummy.matrix);
    }
    if (dIdx < dashCount && dz >= -14) {
      dummy.position.set(19.5, 1.938, dz);
      dummy.updateMatrix();
      dashes.setMatrixAt(dIdx++, dummy.matrix);
    }
  }
  dashes.count = dIdx;
  dashes.instanceMatrix.needsUpdate = true;
  dashes.computeBoundingSphere();
  signageGroup.add(dashes);

  // Bulk Silos & General Cargo Warehouse behind Muelle 1 & 2 (z in [-40..-20])
  [18.5, 24.5].forEach((sx) => {
    const silo = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.3, 2.3, 7.6, 16)),
      materials.concretePrecast
    );
    silo.position.set(sx, 1.9 + 3.8, -35.5);
    silo.castShadow = !isLigera;
    silo.receiveShadow = true;
    const siloRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.4, 1.4, 16)),
      materials.zpmcBlue
    );
    siloRoof.position.set(sx, 1.9 + 8.3, -35.5);
    yardGroup.add(silo, siloRoof);
  });

  const warehouse = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(12.5, 3.8, 11.5)),
    materials.concretePrecast
  );
  warehouse.position.set(13.5, 1.9 + 1.9, -24.5);
  warehouse.castShadow = !isLigera;
  warehouse.receiveShadow = true;
  const warehouseRoof = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(13.1, 0.45, 12.1)),
    materials.zpmcBlue
  );
  warehouseRoof.position.set(13.5, 1.9 + 4.0, -24.5);
  yardGroup.add(warehouse, warehouseRoof);

  // Container Stack Blocks for Muelles 3 & 4 Yard (cleanly separated from z=+4 tunnel road and x=+19.5 spine!)
  const yardContGeo = trackGeo(new THREE.BoxGeometry(1.4, 1.34, 3.1));
  const yardColors = [0x0e4f92, 0xc83228, 0xd99b18, 0x2f6f4e, 0x475569, 0x0e7490];
  const yardPositions: { x: number; y: number; z: number; color: number }[] = [];

  const blocks = [
    { xStart: 7.2, xCols: 4, zStart: -13.5, zRows: 4 },
    { xStart: 25.0, xCols: 4, zStart: -13.5, zRows: 4 },
    { xStart: 7.2, xCols: 4, zStart: 10.5, zRows: 7 },
    { xStart: 25.0, xCols: 4, zStart: 10.5, zRows: 7 },
  ];

  blocks.forEach((b, bIdx) => {
    for (let c = 0; c < b.xCols; c++) {
      for (let r = 0; r < b.zRows; r++) {
        const cx = b.xStart + c * 2.15;
        const cz = b.zStart + r * 3.55;
        const tiers = 1 + ((c * 3 + r + bIdx) % 3);
        for (let t = 0; t < tiers; t++) {
          yardPositions.push({
            x: cx,
            y: 1.9 + 0.67 + t * 1.34,
            z: cz,
            color: yardColors[(c + r * 2 + t + bIdx) % yardColors.length],
          });
        }
      }
    }
  });

  const yardContainers = new THREE.InstancedMesh(
    yardContGeo,
    materials.containerMetal,
    yardPositions.length
  );
  const yCol = new THREE.Color();
  yardPositions.forEach((p, idx) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    yardContainers.setMatrixAt(idx, dummy.matrix);
    yardContainers.setColorAt(idx, yCol.setHex(p.color));
  });
  yardContainers.instanceMatrix.needsUpdate = true;
  if (yardContainers.instanceColor) yardContainers.instanceColor.needsUpdate = true;
  yardContainers.computeBoundingSphere();
  yardContainers.castShadow = !isLigera;
  yardContainers.receiveShadow = true;
  yardGroup.add(yardContainers);

  // Automated ZPMC RMG / RTG Yard Gantry Cranes (Blue / White / Red Livery)
  const createYardGantryCrane = (cx: number, cz: number) => {
    const rmg = new THREE.Group();
    rmg.position.set(cx, 1.9, cz);
    const spanX = 9.4;
    const legH = 6.4;

    const legGeo = trackGeo(new THREE.BoxGeometry(0.36, legH, 0.36));
    const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.4, 0.4, 0.34, 10));
    wheelGeo.rotateZ(Math.PI / 2);

    [-spanX / 2, spanX / 2].forEach((lx) => {
      [-1.5, 1.5].forEach((lz) => {
        const leg = new THREE.Mesh(legGeo, materials.zpmcBlue);
        leg.position.set(lx, legH / 2 + 0.45, lz);
        leg.castShadow = !isLigera;
        rmg.add(leg);

        const wh = new THREE.Mesh(wheelGeo, materials.rubberFender);
        wh.position.set(lx, 0.4, lz);
        rmg.add(wh);
      });
      const sill = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.46, 0.46, 3.7)),
        materials.zpmcBlue
      );
      sill.position.set(lx, 0.6, 0);
      rmg.add(sill);
    });

    const topSpan = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(spanX + 0.8, 0.68, 3.4)),
      materials.zpmcWhite
    );
    topSpan.position.set(0, legH + 0.55, 0);
    topSpan.castShadow = !isLigera;
    rmg.add(topSpan);

    const rmgTrolley = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.9, 0.58, 1.9)),
      materials.zpmcRed
    );
    rmgTrolley.position.set(0.9, legH + 0.2, 0);
    rmg.add(rmgTrolley);

    yardGroup.add(rmg);
  };

  createYardGantryCrane(10.4, -8.5);
  createYardGantryCrane(28.2, 18.0);
  createYardGantryCrane(10.4, 24.5);

  // Port Control Tower & Operations Building (east perimeter)
  const opsBuilding = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.6, 4.4, 11.2)),
    materials.zpmcWhite
  );
  opsBuilding.position.set(39.8, 1.9 + 2.2, -25);
  opsBuilding.castShadow = !isLigera;
  opsBuilding.receiveShadow = true;
  yardGroup.add(opsBuilding);

  const opsRoof = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.0, 0.36, 11.6)),
    materials.zpmcBlue
  );
  opsRoof.position.set(39.8, 1.9 + 4.55, -25);
  yardGroup.add(opsRoof);

  const controlTower = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.2, 4.2, 3.2)),
    materials.zpmcWhite
  );
  controlTower.position.set(39.8, 1.9 + 6.7, -21);
  const towerGlass = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.4, 1.1, 3.4)),
    materials.glassBridge
  );
  towerGlass.position.set(39.8, 1.9 + 8.3, -21);
  yardGroup.add(controlTower, towerGlass);

  // High-mast yard floodlights
  const poleGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.17, 11.0, 6));
  const lampGeo = trackGeo(new THREE.BoxGeometry(1.2, 0.25, 0.52));
  [
    [4.6, -15],
    [4.6, 33],
    [34.5, -15],
    [34.5, 33],
  ].forEach(([px, pz]) => {
    const pole = new THREE.Mesh(poleGeo, materials.steelGalvanized);
    pole.position.set(px, 1.9 + 5.5, pz);
    const lamp = new THREE.Mesh(lampGeo, materials.zpmcWhite);
    lamp.position.set(px, 1.9 + 11.1, pz);
    yardGroup.add(pole, lamp);
  });

  tagComponent(yardGroup, 'patio');

  // =========================================================================
  // 6. TÚNEL VIADUCTO SUBTERRÁNEO Y CORTE DIDÁCTICO (Tunnel)
  // =========================================================================
  const tunnelGroup = new THREE.Group();
  tunnelGroup.name = 'tunel';

  const tunnelStart = new THREE.Vector3(43.5, 1.9, 4.0);
  const tunnelEnd = new THREE.Vector3(88.5, 3.25, 4.0);
  const tunnelLen = tunnelStart.distanceTo(tunnelEnd);
  const tunnelMid = tunnelStart.clone().add(tunnelEnd).multiplyScalar(0.5);
  const tunnelSlopeAngle = Math.atan2(tunnelEnd.y - tunnelStart.y, tunnelEnd.x - tunnelStart.x);

  const tunnelTubeGroup = new THREE.Group();
  tunnelTubeGroup.position.copy(tunnelMid);
  tunnelTubeGroup.rotation.z = tunnelSlopeAngle;

  const tunnelRoad = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(tunnelLen + 2, 0.24, 4.4)),
    materials.asphaltRoad
  );
  tunnelRoad.position.y = 0.08;
  tunnelTubeGroup.add(tunnelRoad);

  // Center yellow road divider + side safety curbs & drainage gutters
  const tunnelCenterLine = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(tunnelLen + 1, 0.02, 0.14)),
    materials.steelYellow
  );
  tunnelCenterLine.position.y = 0.21;
  tunnelTubeGroup.add(tunnelCenterLine);

  [-2.4, 2.4].forEach((wz) => {
    const curb = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(tunnelLen, 0.45, 0.55)),
      materials.concretePrecast
    );
    curb.position.set(0, 0.26, wz);
    const drain = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(tunnelLen, 0.14, 0.28)),
      materials.steelGalvanized
    );
    drain.position.set(0, 0.12, wz * 0.82);
    tunnelTubeGroup.add(curb, drain);
  });

  const shotcreteFullGeo = trackGeo(
    new THREE.CylinderGeometry(3.45, 3.45, tunnelLen, 16, 1, true, 0, Math.PI)
  );
  shotcreteFullGeo.rotateZ(Math.PI / 2);
  shotcreteFullGeo.rotateX(Math.PI / 2);
  const shotcreteVault = new THREE.Mesh(shotcreteFullGeo, materials.tunnelShotcrete);
  shotcreteVault.position.y = 0.1;
  tunnelTubeGroup.add(shotcreteVault);

  const liningGeo = trackGeo(
    new THREE.CylinderGeometry(3.05, 3.05, tunnelLen - 0.6, 16, 1, true, 0, Math.PI)
  );
  liningGeo.rotateZ(Math.PI / 2);
  liningGeo.rotateX(Math.PI / 2);
  const liningVault = new THREE.Mesh(liningGeo, materials.tunnelLining);
  liningVault.position.y = 0.1;
  tunnelTubeGroup.add(liningVault);

  const fanGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 8));
  fanGeo.rotateZ(Math.PI / 2);
  for (let fx = -tunnelLen * 0.35; fx <= tunnelLen * 0.35; fx += 9) {
    const fan = new THREE.Mesh(fanGeo, materials.zpmcBlue);
    fan.position.set(fx, 2.65, 0);
    tunnelTubeGroup.add(fan);
  }

  const cutawayArchMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const cutawayHalfGeo = trackGeo(
    new THREE.CylinderGeometry(3.52, 3.52, tunnelLen, 14, 1, true, 0, Math.PI * 0.45)
  );
  cutawayHalfGeo.rotateZ(Math.PI / 2);
  cutawayHalfGeo.rotateX(Math.PI / 2);
  const cutawayHalfMesh = new THREE.Mesh(cutawayHalfGeo, cutawayArchMat);
  cutawayHalfMesh.position.y = 0.1;
  cutawayHalfMesh.visible = false;
  tunnelTubeGroup.add(cutawayHalfMesh);

  tunnelGroup.add(tunnelTubeGroup);

  const createPortal = (px: number, py: number, pz: number, rotY: number) => {
    const portal = new THREE.Group();
    portal.position.set(px, py, pz);
    portal.rotation.y = rotY;

    const wall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.5, 5.4, 9.8)),
      materials.concretePrecast
    );
    wall.position.y = 2.4;
    portal.add(wall);

    const collar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(3.2, 0.45, 8, 16, Math.PI)),
      materials.concreteDeck
    );
    collar.rotation.y = Math.PI / 2;
    collar.position.set(-0.5, 0.2, 0);
    portal.add(collar);

    const mouth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.6, 3.2, 5.4)),
      materials.rubberFender
    );
    mouth.position.set(-0.55, 1.6, 0);
    portal.add(mouth);

    tunnelGroup.add(portal);
  };
  createPortal(43.5, 1.9, 4.0, 0);
  createPortal(88.5, 3.25, 4.0, Math.PI);

  tagComponent(tunnelGroup, 'tunel');

  // =========================================================================
  // 7. COMPLEJO DE INGRESO Y ANTEPUERTO LOGÍSTICO (Entrance Complex)
  // =========================================================================
  const entranceGroup = new THREE.Group();
  entranceGroup.name = 'ingreso';

  const antepuertoSlab = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(51, 0.28, 46)),
    materials.yardPaving
  );
  antepuertoSlab.position.set(113.5, 3.16, 3);
  antepuertoSlab.receiveShadow = true;
  entranceGroup.add(antepuertoSlab);

  const gateApproach = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(49, 0.06, 5.4)),
    materials.asphaltRoad
  );
  gateApproach.position.set(113.5, 3.33, 4);
  gateApproach.receiveShadow = true;
  entranceGroup.add(gateApproach);

  const highway = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.6, 0.16, 194)),
    materials.asphaltRoad
  );
  highway.position.set(141, 3.26, 0);
  highway.receiveShadow = true;
  entranceGroup.add(highway);

  const hwyRamp = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(10, 0.08, 6.4)),
    materials.asphaltRoad
  );
  hwyRamp.position.set(137, 3.31, 4);
  entranceGroup.add(hwyRamp);

  // Inspection & Customs Gate Canopy (ZPMC Blue & White) + Grounded Structural Columns
  const canopy = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.6, 0.5, 16.5)),
    materials.zpmcBlue
  );
  canopy.position.set(114, 7.15, 4);
  canopy.castShadow = !isLigera;
  entranceGroup.add(canopy);

  const canopyColumnGeo = trackGeo(new THREE.BoxGeometry(0.42, 3.85, 0.42));
  [
    [112.0, -3.5],
    [116.0, -3.5],
    [112.0, 11.5],
    [116.0, 11.5],
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(canopyColumnGeo, materials.steelGalvanized);
    col.position.set(cx, 3.3 + 1.925, cz);
    col.castShadow = !isLigera;
    entranceGroup.add(col);
  });

  [-3.5, 1.5, 6.5, 11.5].forEach((bz) => {
    const booth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.8, 2.8, 1.25)),
      materials.zpmcWhite
    );
    booth.position.set(114, 3.3 + 1.4, bz);
    entranceGroup.add(booth);
  });

  // Customs & Security Building
  const customsBldg = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(11.5, 3.8, 14)),
    materials.concreteDeck
  );
  customsBldg.position.set(106, 3.3 + 1.9, -11);
  customsBldg.castShadow = !isLigera;
  customsBldg.receiveShadow = true;
  entranceGroup.add(customsBldg);

  const customsRoof = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(12.0, 0.35, 14.5)),
    materials.zpmcBlue
  );
  customsRoof.position.set(106, 3.3 + 3.9, -11);
  entranceGroup.add(customsRoof);

  // Truck staging bays (south side)
  for (let s = 0; s < 5; s++) {
    const parkedTrailer = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.2, 1.4, 1.55)),
      materials.steelGalvanized
    );
    parkedTrailer.position.set(100 + s * 6.2, 3.3 + 0.7, 17);
    entranceGroup.add(parkedTrailer);
  }

  tagComponent(entranceGroup, 'ingreso');

  // =========================================================================
  // 8. TOGGLES DIDÁCTICOS (Cutaways)
  // =========================================================================
  function setStructuralCutaway(enabled: boolean) {
    if (enabled) {
      cutawayMat.transparent = true;
      cutawayMat.opacity = 0.24;
      cutawayMat.color.setHex(0x38bdf8);
      cutawayOutline.visible = true;
    } else {
      cutawayMat.transparent = false;
      cutawayMat.opacity = 1.0;
      cutawayMat.color.setHex(0xd5dbe2);
      cutawayOutline.visible = false;
    }
    cutawayMat.needsUpdate = true;
  }

  function setTunnelCutaway(enabled: boolean) {
    shotcreteVault.visible = !enabled;
    liningVault.visible = !enabled;
    cutawayHalfMesh.visible = enabled;
  }

  function dispose() {
    disposableGeos.forEach((g) => g.dispose());
    disposableMats.forEach((m) => m.dispose());
  }

  return {
    breakwaterGroup,
    pierGroup,
    cranesGroup,
    shipsGroup,
    yardGroup,
    tunnelGroup,
    entranceGroup,
    signageGroup,
    explanatoryGroup,
    heroCrane,
    heroShipGroup,
    feederShipGroup,
    radarMeshes,
    setStructuralCutaway,
    setTunnelCutaway,
    dispose,
  };
}
