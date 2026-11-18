import * as THREE from 'three';
import { STSCraneRig } from './infrastructure';
import { PortMaterialLibrary } from './materials';
import { STS_CYCLE_STEPS } from '../data/portData';

export interface OperationsController {
  vehiclesGroup: THREE.Group;
  workersGroup: THREE.Group;
  getWorkerObjectById: (workerId: string) => THREE.Object3D | null;
  update: (
    dt: number,
    craneActive: boolean,
    vehiclesActive: boolean,
    workersActive: boolean
  ) => { phaseIndex: number; phaseLabel: string };
  resetCycle: () => void;
  dispose: () => void;
}

interface AnimatedWorker {
  workerId: string;
  group: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  mode: 'walk' | 'survey' | 'inspect' | 'signal';
  path?: THREE.CatmullRomCurve3;
  progress: number;
  initialProgress: number;
  speed: number;
  walkPhase: number;
}

interface TruckRig {
  group: THREE.Group;
  cargoBox: THREE.Mesh;
  wheels: THREE.Mesh[];
  frontWheelPivots: THREE.Group[];
  path: THREE.CatmullRomCurve3;
  progress: number;
  initialProgress: number;
  speed: number;
  isHeroCraneTruck: boolean;
  hasGatePause?: boolean;
}

const _pos = new THREE.Vector3();
const _nextPos = new THREE.Vector3();
const _prevPos = new THREE.Vector3();
const _tanA = new THREE.Vector3();
const _tanB = new THREE.Vector3();

export function createPortOperations(
  materials: PortMaterialLibrary,
  heroCrane: STSCraneRig,
  terrainHeightAt: (x: number, z: number) => number,
  isLigera: boolean
): OperationsController {
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  // =========================================================================
  // 1. FLEET OF TERMINAL TRUCKS (Camiones con giro direccional y rodadura)
  // =========================================================================
  const vehiclesGroup = new THREE.Group();
  vehiclesGroup.name = 'camiones';

  const cabMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.28 })
  );
  const chassisMat = materials.zpmcBlue;
  const tireMat = materials.rubberFender;
  const cargoColors = [0x0e4f92, 0xc83228, 0xd99b18, 0x2f6f4e];

  function buildTruck(cargoColorHex: number): {
    group: THREE.Group;
    cargoBox: THREE.Mesh;
    wheels: THREE.Mesh[];
    frontWheelPivots: THREE.Group[];
  } {
    const truck = new THREE.Group();
    const wheels: THREE.Mesh[] = [];
    const frontWheelPivots: THREE.Group[] = [];

    const chassis = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.16, 0.25, 3.85)),
      chassisMat
    );
    chassis.position.set(0, 0.42, 0);
    truck.add(chassis);

    const cab = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.18, 1.06, 1.08)),
      cabMat
    );
    cab.position.set(0, 0.96, 1.36);
    cab.castShadow = !isLigera;
    truck.add(cab);

    const windshield = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.06, 0.42, 0.08)),
      materials.glassBridge
    );
    windshield.position.set(0, 1.12, 1.9);
    truck.add(windshield);

    const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 12));
    wheelGeo.rotateZ(Math.PI / 2);

    [-1.4, -0.7, 1.35].forEach((wz) => {
      const isFront = wz > 1.0;
      [-0.58, 0.58].forEach((wx) => {
        const w = new THREE.Mesh(wheelGeo, tireMat);
        wheels.push(w);
        if (isFront) {
          const pivot = new THREE.Group();
          pivot.position.set(wx, 0.24, wz);
          pivot.add(w);
          truck.add(pivot);
          frontWheelPivots.push(pivot);
        } else {
          w.position.set(wx, 0.24, wz);
          truck.add(w);
        }
      });
    });

    const cargoBox = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.24, 1.24, 2.75)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: materials.containerMetal.map,
          bumpMap: materials.containerMetal.bumpMap,
          bumpScale: 0.03,
          color: cargoColorHex,
          roughness: 0.48,
          metalness: 0.48,
        })
      )
    );
    cargoBox.position.set(0, 1.16, -0.45);
    cargoBox.castShadow = !isLigera;
    truck.add(cargoBox);

    return { group: truck, cargoBox, wheels, frontWheelPivots };
  }

  // Hero Truck Loop: parks cleanly at (-6.7, 1.93, +6.0) under Hero STS Crane #1!
  const heroPath = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-6.7, 1.93, 6.0),
      new THREE.Vector3(-6.7, 1.93, 28.0),
      new THREE.Vector3(-6.7, 1.93, 38.5),
      new THREE.Vector3(19.5, 1.93, 38.5),
      new THREE.Vector3(19.5, 1.93, 18.0),
      new THREE.Vector3(19.5, 1.93, 4.0),
      new THREE.Vector3(1.8, 1.93, 4.0),
      new THREE.Vector3(1.8, 1.93, -34.0),
      new THREE.Vector3(-6.7, 1.93, -34.0),
      new THREE.Vector3(-6.7, 1.93, -12.0),
    ],
    true,
    'catmullrom',
    0.16
  );

  // Yard Loop 2: clear outer circulation around container blocks
  const yardPath = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(1.8, 1.93, -42.0),
      new THREE.Vector3(1.8, 1.93, 38.5),
      new THREE.Vector3(36.5, 1.93, 38.5),
      new THREE.Vector3(36.5, 1.93, -42.0),
    ],
    true,
    'catmullrom',
    0.14
  );

  // Entrance & Highway Loop 3: Antepuerto gate approach -> Panamericana Norte corridor
  const entrancePath = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(93.0, 3.36, 4.0),
      new THREE.Vector3(114.0, 3.36, 4.0),
      new THREE.Vector3(141.0, 3.36, 4.0),
      new THREE.Vector3(141.0, 3.36, -34.0),
      new THREE.Vector3(135.0, 3.36, -34.0),
      new THREE.Vector3(135.0, 3.36, 13.0),
      new THREE.Vector3(94.0, 3.36, 13.0),
    ],
    true,
    'catmullrom',
    0.16
  );

  const trucks: TruckRig[] = [];

  const t1 = buildTruck(0x0e4f92);
  t1.cargoBox.visible = false;
  vehiclesGroup.add(t1.group);
  trucks.push({
    ...t1,
    path: heroPath,
    progress: 0.0,
    initialProgress: 0.0,
    speed: 0.044,
    isHeroCraneTruck: true,
  });

  [
    { path: yardPath, prog: 0.16, speed: 0.032, col: cargoColors[1], gate: false },
    { path: yardPath, prog: 0.64, speed: 0.032, col: cargoColors[2], gate: false },
    { path: entrancePath, prog: 0.08, speed: 0.028, col: cargoColors[3], gate: true },
    { path: entrancePath, prog: 0.56, speed: 0.028, col: cargoColors[0], gate: true },
  ].forEach((cfg) => {
    const tr = buildTruck(cfg.col);
    vehiclesGroup.add(tr.group);
    trucks.push({
      ...tr,
      path: cfg.path,
      progress: cfg.prog,
      initialProgress: cfg.prog,
      speed: cfg.speed,
      isHeroCraneTruck: false,
      hasGatePause: cfg.gate,
    });
  });

  vehiclesGroup.traverse((c) => {
    c.userData.componentId = 'camiones';
  });

  // =========================================================================
  // 2. WORKERS & CIVIL ENGINEERS (Trabajadores e Ingenieros seleccionables)
  // =========================================================================
  const workersGroup = new THREE.Group();
  workersGroup.name = 'trabajadores';

  const vestOrange = trackMat(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7 }));
  const vestLime = trackMat(new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.7 }));
  const pantsMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }));
  const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd9a886, roughness: 0.75 }));
  const helmetWhite = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }));
  const helmetYellow = trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }));

  const legGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.44, 0.15));
  const armGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.38, 0.12));
  const torsoGeo = trackGeo(new THREE.BoxGeometry(0.34, 0.42, 0.2));
  const headGeo = trackGeo(new THREE.SphereGeometry(0.13, 8, 8));
  const hatGeo = trackGeo(
    new THREE.SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55)
  );

  const workers: AnimatedWorker[] = [];
  const workerObjectMap = new Map<string, THREE.Object3D>();

  function tagWorker(obj: THREE.Object3D, workerId: string, componentId: string) {
    obj.userData.workerId = workerId;
    obj.userData.componentId = componentId;
    obj.traverse((child) => {
      child.userData.workerId = workerId;
      child.userData.componentId = componentId;
    });
  }

  function createWorkerFigure(isEngineer: boolean): {
    group: THREE.Group;
    leftLeg: THREE.Object3D;
    rightLeg: THREE.Object3D;
    leftArm: THREE.Object3D;
    rightArm: THREE.Object3D;
  } {
    const g = new THREE.Group();

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.09, 0.44, 0);
    const lLeg = new THREE.Mesh(legGeo, pantsMat);
    lLeg.position.y = -0.22;
    leftLegPivot.add(lLeg);
    g.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.09, 0.44, 0);
    const rLeg = new THREE.Mesh(legGeo, pantsMat);
    rLeg.position.y = -0.22;
    rightLegPivot.add(rLeg);
    g.add(rightLegPivot);

    const torso = new THREE.Mesh(torsoGeo, isEngineer ? vestLime : vestOrange);
    torso.position.y = 0.65;
    g.add(torso);

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.23, 0.82, 0);
    const lArm = new THREE.Mesh(armGeo, isEngineer ? vestLime : vestOrange);
    lArm.position.y = -0.18;
    leftArmPivot.add(lArm);
    g.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.23, 0.82, 0);
    const rArm = new THREE.Mesh(armGeo, isEngineer ? vestLime : vestOrange);
    rArm.position.y = -0.18;
    rightArmPivot.add(rArm);
    g.add(rightArmPivot);

    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 0.99;
    g.add(head);

    const hat = new THREE.Mesh(hatGeo, isEngineer ? helmetWhite : helmetYellow);
    hat.position.y = 1.03;
    g.add(hat);

    g.scale.setScalar(1.25);

    return {
      group: g,
      leftLeg: leftLegPivot,
      rightLeg: rightLegPivot,
      leftArm: leftArmPivot,
      rightArm: rightArmPivot,
    };
  }

  // Worker 1: Quay safety inspector walking strictly along safe quay apron sidewalk (x = -10.75)
  const walkPathQuay = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-10.75, 1.91, -14),
      new THREE.Vector3(-10.75, 1.91, 24),
      new THREE.Vector3(-10.75, 1.91, -14),
    ],
    false
  );
  const w1 = createWorkerFigure(false);
  tagWorker(w1.group, 'quay_inspector', 'muelle');
  workersGroup.add(w1.group);
  workerObjectMap.set('quay_inspector', w1.group);
  workers.push({
    workerId: 'quay_inspector',
    ...w1,
    mode: 'walk',
    path: walkPathQuay,
    progress: 0.1,
    initialProgress: 0.1,
    speed: 0.032,
    walkPhase: 0,
  });

  // Worker 2: Yard supervisor along segregated walkway (x = +4.6, safe gap from x=+1.8 road & x=+7.2 stacks)
  const walkPathYard = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(4.6, 1.91, -12),
      new THREE.Vector3(4.6, 1.91, 26),
      new THREE.Vector3(4.6, 1.91, -12),
    ],
    false
  );
  const w2 = createWorkerFigure(true);
  tagWorker(w2.group, 'yard_supervisor', 'patio');
  workersGroup.add(w2.group);
  workerObjectMap.set('yard_supervisor', w2.group);
  workers.push({
    workerId: 'yard_supervisor',
    ...w2,
    mode: 'walk',
    path: walkPathYard,
    progress: 0.48,
    initialProgress: 0.48,
    speed: 0.028,
    walkPhase: Math.PI,
  });

  // Worker 3: Topographer with Total Station Tripod + Prism Pole on Cerro Trinidad overlooking port
  const surveyX = 52.2;
  const surveyZ = -18.0;
  const surveyY = terrainHeightAt(surveyX, surveyZ);
  const w3 = createWorkerFigure(true);
  w3.group.position.set(surveyX, surveyY, surveyZ);
  w3.group.rotation.y = -Math.PI / 2;
  tagWorker(w3.group, 'topographer', 'terreno');
  workersGroup.add(w3.group);
  workerObjectMap.set('topographer', w3.group);
  workers.push({
    workerId: 'topographer',
    ...w3,
    mode: 'survey',
    progress: 0,
    initialProgress: 0,
    speed: 0,
    walkPhase: 0,
  });

  const tripodGroup = new THREE.Group();
  tripodGroup.position.set(surveyX - 0.9, surveyY, surveyZ);
  const legTripodGeo = trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 1.35, 6));
  [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((ang) => {
    const tl = new THREE.Mesh(legTripodGeo, materials.steelYellow);
    tl.position.set(Math.cos(ang) * 0.25, 0.62, Math.sin(ang) * 0.25);
    tl.rotation.z = Math.cos(ang) * 0.24;
    tl.rotation.x = -Math.sin(ang) * 0.24;
    tripodGroup.add(tl);
  });
  const totalStation = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.28, 0.34, 0.24)),
    materials.zpmcRed
  );
  totalStation.position.y = 1.38;
  tripodGroup.add(totalStation);

  // Surveying prism pole (jalón + prisma) nearby on Cerro Trinidad
  const prismX = 51.0;
  const prismZ = -14.2;
  const prismY = terrainHeightAt(prismX, prismZ);
  const prismPole = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 1.75, 6)),
    materials.zpmcWhite
  );
  prismPole.position.set(prismX - (surveyX - 0.9), prismY - surveyY + 0.87, prismZ - surveyZ);
  const prismHead = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.16, 0)),
    materials.zpmcRed
  );
  prismHead.position.set(prismX - (surveyX - 0.9), prismY - surveyY + 1.82, prismZ - surveyZ);
  tripodGroup.add(prismPole, prismHead);

  tagWorker(tripodGroup, 'topographer', 'terreno');
  workersGroup.add(tripodGroup);

  // Worker 4: Structural engineer reviewing tablet near Berth 4 pile cutaway (z = +32)
  const w4 = createWorkerFigure(true);
  w4.group.position.set(-2.0, 1.91, 32.0);
  w4.group.rotation.y = -0.6;
  const tablet = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.28, 0.04, 0.36)),
    materials.zpmcWhite
  );
  tablet.position.set(0.18, 0.72, 0.26);
  w4.group.add(tablet);
  tagWorker(w4.group, 'structural_engineer', 'muelle');
  workersGroup.add(w4.group);
  workerObjectMap.set('structural_engineer', w4.group);
  workers.push({
    workerId: 'structural_engineer',
    ...w4,
    mode: 'inspect',
    progress: 0,
    initialProgress: 0,
    speed: 0,
    walkPhase: 0,
  });

  // Worker 5: Signal coordinator safely stationed beside Hero STS Crane #1 transfer zone (x=-4.3, z=+8.8)
  const w5 = createWorkerFigure(false);
  w5.group.position.set(-4.3, 1.91, 8.8);
  w5.group.rotation.y = -Math.PI * 0.65;
  const paddle = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.08, 0.26, 0.18)),
    materials.steelYellow
  );
  paddle.position.set(0.26, 0.56, 0.14);
  w5.group.add(paddle);
  tagWorker(w5.group, 'signal_coordinator', 'grua-sts');
  workersGroup.add(w5.group);
  workerObjectMap.set('signal_coordinator', w5.group);
  workers.push({
    workerId: 'signal_coordinator',
    ...w5,
    mode: 'signal',
    progress: 0,
    initialProgress: 0,
    speed: 0,
    walkPhase: 0,
  });

  // =========================================================================
  // 3. 9-PHASE COORDINATED STS CRANE #1 OPERATION CYCLE
  // =========================================================================
  const CYCLE_DURATION = 18.0;
  let craneTime = 0;
  let idleClock = 0;

  // Trolley local X positions relative to heroCrane (-6.7, z = +6.0):
  const TROLLEY_SHIP_X = -10.3; // World x = -17.0 (above Hero Ship target bay)
  const TROLLEY_TRUCK_X = 0.0; // World x = -6.7 (directly above Hero Truck lane)

  // Spreader local Y positions relative to trolley (world y = 12.97):
  const SPREADER_HIGH_Y = -2.2;
  const SPREADER_SHIP_PICK_Y = -7.06;
  const SPREADER_TRUCK_DROP_Y = -8.94;

  function updateCraneAndHeroTruck(dt: number, active: boolean) {
    if (active) {
      craneTime = (craneTime + dt) % CYCLE_DURATION;
    }

    const u = craneTime / CYCLE_DURATION;
    const phaseIndex = Math.min(8, Math.floor(u * 9));

    let trolleyX = TROLLEY_TRUCK_X;
    let spreaderY = SPREADER_HIGH_Y;
    let containerOnSpreader = false;
    let truckWaitingAtCrane = false;
    let truckHasCargo = false;

    const sub = (a: number, b: number) =>
      THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((u - a) / (b - a), 0, 1), 0, 1);

    if (u < 1 / 9) {
      trolleyX = TROLLEY_TRUCK_X;
      spreaderY = SPREADER_HIGH_Y;
      truckWaitingAtCrane = true;
    } else if (u < 2 / 9) {
      trolleyX = THREE.MathUtils.lerp(TROLLEY_TRUCK_X, TROLLEY_SHIP_X, sub(1 / 9, 2 / 9));
      spreaderY = SPREADER_HIGH_Y;
      truckWaitingAtCrane = true;
    } else if (u < 3 / 9) {
      trolleyX = TROLLEY_SHIP_X;
      spreaderY = THREE.MathUtils.lerp(SPREADER_HIGH_Y, SPREADER_SHIP_PICK_Y, sub(2 / 9, 3 / 9));
      truckWaitingAtCrane = true;
    } else if (u < 4 / 9) {
      trolleyX = TROLLEY_SHIP_X;
      spreaderY = SPREADER_SHIP_PICK_Y;
      containerOnSpreader = u > 3.45 / 9;
      truckWaitingAtCrane = true;
    } else if (u < 5 / 9) {
      trolleyX = TROLLEY_SHIP_X;
      spreaderY = THREE.MathUtils.lerp(SPREADER_SHIP_PICK_Y, SPREADER_HIGH_Y, sub(4 / 9, 5 / 9));
      containerOnSpreader = true;
      truckWaitingAtCrane = true;
    } else if (u < 6 / 9) {
      trolleyX = THREE.MathUtils.lerp(TROLLEY_SHIP_X, TROLLEY_TRUCK_X, sub(5 / 9, 6 / 9));
      spreaderY = SPREADER_HIGH_Y;
      containerOnSpreader = true;
      truckWaitingAtCrane = true;
    } else if (u < 7 / 9) {
      trolleyX = TROLLEY_TRUCK_X;
      spreaderY = THREE.MathUtils.lerp(SPREADER_HIGH_Y, SPREADER_TRUCK_DROP_Y, sub(6 / 9, 7 / 9));
      containerOnSpreader = true;
      truckWaitingAtCrane = true;
    } else if (u < 8 / 9) {
      trolleyX = TROLLEY_TRUCK_X;
      spreaderY = THREE.MathUtils.lerp(
        SPREADER_TRUCK_DROP_Y,
        SPREADER_HIGH_Y * 1.15,
        sub(7.4 / 9, 8 / 9)
      );
      containerOnSpreader = u < 7.35 / 9;
      truckHasCargo = u >= 7.35 / 9;
      truckWaitingAtCrane = u < 7.8 / 9;
    } else {
      trolleyX = TROLLEY_TRUCK_X;
      spreaderY = THREE.MathUtils.lerp(SPREADER_HIGH_Y * 1.15, SPREADER_HIGH_Y, sub(8 / 9, 1.0));
      truckHasCargo = true;
      truckWaitingAtCrane = false;
    }

    heroCrane.trolley.position.x = trolleyX;
    heroCrane.spreaderGroup.position.y = spreaderY;
    heroCrane.hoistedContainer.visible = containerOnSpreader;

    const cableLen = Math.max(0.4, Math.abs(spreaderY + 0.18) - 0.28);
    const cableMidY = -0.28 - cableLen * 0.5;
    heroCrane.cables.forEach((c) => {
      c.scale.y = cableLen;
      c.position.y = cableMidY;
    });

    return {
      phaseIndex,
      truckWaitingAtCrane,
      truckHasCargo,
      u,
    };
  }

  function positionWorkersInitial() {
    workers.forEach((w) => {
      if (w.mode === 'walk' && w.path) {
        w.path.getPointAt(w.progress, _pos);
        w.path.getPointAt(Math.min(0.999, w.progress + 0.015), _nextPos);
        w.group.position.copy(_pos);
        const dx = _nextPos.x - _pos.x;
        const dz = _nextPos.z - _pos.z;
        if (dx * dx + dz * dz > 1e-6) {
          w.group.rotation.y = Math.atan2(dx, dz);
        }
        w.leftLeg.rotation.x = 0;
        w.rightLeg.rotation.x = 0;
        w.leftArm.rotation.x = 0;
        w.rightArm.rotation.x = 0;
      }
    });
  }

  function update(
    dt: number,
    craneActive: boolean,
    vehiclesActive: boolean,
    workersActive: boolean
  ) {
    idleClock += dt;

    const craneState = updateCraneAndHeroTruck(dt, craneActive);

    trucks.forEach((tr) => {
      tr.path.getPointAt(tr.progress, _prevPos);

      // Compute local curvature for speed damping and front-wheel steering angle
      tr.path.getTangentAt(tr.progress, _tanA);
      tr.path.getTangentAt((tr.progress + 0.025) % 1, _tanB);
      const crossY = _tanA.z * _tanB.x - _tanA.x * _tanB.z;
      const turnAngle = Math.acos(THREE.MathUtils.clamp(_tanA.dot(_tanB), -1, 1));
      const steerAngle = THREE.MathUtils.clamp(crossY * 2.4, -0.45, 0.45);

      if (vehiclesActive) {
        let speedScale = 1.0 - THREE.MathUtils.clamp(turnAngle * 1.35, 0, 0.55);

        if (tr.hasGatePause) {
          if (Math.abs(_prevPos.z - 4.0) < 2.2 && Math.abs(_prevPos.x - 114.0) < 5.0) {
            speedScale *= 0.42;
          }
        }

        if (tr.isHeroCraneTruck && craneActive) {
          if (craneState.truckWaitingAtCrane) {
            tr.progress = THREE.MathUtils.lerp(tr.progress, 0.0, Math.min(1, dt * 6));
            tr.cargoBox.visible = false;
          } else {
            tr.progress = (tr.progress + dt * tr.speed * speedScale) % 1;
            tr.cargoBox.visible = craneState.truckHasCargo || tr.progress < 0.55;
          }
        } else {
          tr.progress = (tr.progress + dt * tr.speed * speedScale) % 1;
        }
      }

      tr.path.getPointAt(tr.progress, _pos);
      tr.path.getPointAt((tr.progress + 0.01) % 1, _nextPos);
      tr.group.position.copy(_pos);

      const dx = _nextPos.x - _pos.x;
      const dz = _nextPos.z - _pos.z;
      if (dx * dx + dz * dz > 1e-6) {
        tr.group.rotation.y = Math.atan2(dx, dz);
      }

      // Spin wheels proportional to actual linear displacement along path (prevents wheel skidding)
      const movedDist = _pos.distanceTo(_prevPos);
      if (movedDist > 1e-4 && movedDist < 5.0) {
        const wheelSpin = movedDist / 0.24;
        for (const w of tr.wheels) {
          w.rotation.x += wheelSpin;
        }
      }

      // Orient front steering pivots toward turn curvature
      for (const piv of tr.frontWheelPivots) {
        piv.rotation.y = THREE.MathUtils.lerp(piv.rotation.y, steerAngle, Math.min(1, dt * 8 + 0.2));
      }
    });

    if (workersActive) {
      workers.forEach((w) => {
        if (w.mode === 'walk' && w.path) {
          w.path.getPointAt(w.progress, _prevPos);
          w.progress = (w.progress + dt * w.speed) % 1;
          w.path.getPointAt(w.progress, _pos);
          w.path.getPointAt(Math.min(0.999, w.progress + 0.015), _nextPos);

          const stepDist = _pos.distanceTo(_prevPos);
          w.group.position.copy(_pos);
          const dx = _nextPos.x - _pos.x;
          const dz = _nextPos.z - _pos.z;
          if (dx * dx + dz * dz > 1e-6) {
            w.group.rotation.y = Math.atan2(dx, dz);
          }

          // Stride phase strictly coupled to actual linear displacement so feet never slide
          if (stepDist > 1e-5 && stepDist < 3.0) {
            w.walkPhase += stepDist * 4.2;
          }
          const stride = Math.sin(w.walkPhase) * 0.5;
          w.leftLeg.rotation.x = stride;
          w.rightLeg.rotation.x = -stride;
          w.leftArm.rotation.x = -stride * 0.65;
          w.rightArm.rotation.x = stride * 0.65;
        } else if (w.mode === 'survey') {
          w.rightArm.rotation.x = -0.75 + Math.sin(idleClock * 1.4) * 0.08;
          w.leftArm.rotation.x = -0.35;
        } else if (w.mode === 'inspect') {
          w.leftArm.rotation.x = -0.72;
          w.rightArm.rotation.x = -0.68 + Math.sin(idleClock * 1.8) * 0.06;
        } else if (w.mode === 'signal') {
          w.rightArm.rotation.z = 0.6 + Math.sin(idleClock * 3.0) * 0.35;
          w.rightArm.rotation.x = -0.45;
        }
      });
    }

    return {
      phaseIndex: craneState.phaseIndex,
      phaseLabel: STS_CYCLE_STEPS[craneState.phaseIndex],
    };
  }

  function resetCycle() {
    craneTime = 0;
    idleClock = 0;
    trucks.forEach((tr) => {
      tr.progress = tr.initialProgress;
      if (tr.isHeroCraneTruck) {
        tr.cargoBox.visible = false;
      }
    });
    workers.forEach((w) => {
      w.progress = w.initialProgress;
      w.walkPhase = 0;
    });
    positionWorkersInitial();
    update(0, false, false, false);
  }

  function getWorkerObjectById(workerId: string): THREE.Object3D | null {
    return workerObjectMap.get(workerId) ?? null;
  }

  function dispose() {
    disposableGeos.forEach((g) => g.dispose());
    disposableMats.forEach((m) => m.dispose());
  }

  return {
    vehiclesGroup,
    workersGroup,
    getWorkerObjectById,
    update,
    resetCycle,
    dispose,
  };
}
