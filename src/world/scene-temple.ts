import * as THREE from 'three';
import { rng, Lines, instances, boxAt, waterRect } from './geo';
import { assemblyMaterial, traceMaterial, waterMaterial } from './materials';
import { wordCells } from './palette';
import { STONE, HOLE } from './scene-horizon';

type Item = { p: [number, number, number]; s?: [number, number, number]; r?: number; asm?: [number, number] };

/** The Hall of Columns (About) and the Nilometer shaft (Research). */
export function buildTemple(scene: THREE.Scene) {
  const r = rng(23);
  const uAssemble = { value: 0 };
  const stone = assemblyMaterial(STONE, uAssemble);
  const stoneDark = assemblyMaterial(0x8d7f6c, uAssemble);

  const ZS = Array.from({ length: 9 }, (_, k) => -12 - k * 8);
  const zN = (z: number) => (-z - 8) / 72; // 0 at the gate → 1 at the far end
  const drums: Item[] = [], capsOpen: Item[] = [], capsBud: Item[] = [], blocks: Item[] = [];

  for (const x of [-13, -6.5, 6.5, 13]) {
    const central = Math.abs(x) < 10;
    const n = central ? 10 : 7;
    for (const z of ZS) {
      const o = zN(z) * 0.5;
      for (let i = 0; i < n; i++) {
        const k = i % 2 ? 0.93 : 1;
        drums.push({ p: [x, i * 1.48, z], s: [k, 1, k], r: (i * Math.PI) / 8, asm: [r(), o + (i / n) * 0.12] });
      }
      const top = n * 1.48;
      (central ? capsOpen : capsBud).push({ p: [x, top, z], asm: [r(), o + 0.16] });
      const capH = central ? 2.2 : 1.8;
      blocks.push({ p: [x, top + capH + 0.32, z], s: [2.6, 0.7, 2.6], asm: [r(), o + 0.2] });
    }
  }
  const drumGeo = new THREE.CylinderGeometry(1.45, 1.45, 1.5, 8);
  drumGeo.translate(0, 0.75, 0);
  scene.add(instances(drumGeo, stone, drums, 'hall-drums'));
  const openGeo = new THREE.CylinderGeometry(2.5, 1.45, 2.2, 8);
  openGeo.translate(0, 1.1, 0);
  scene.add(instances(openGeo, stone, capsOpen, 'hall-capitals-open'));
  const budGeo = new THREE.CylinderGeometry(1.0, 1.75, 1.8, 8);
  budGeo.translate(0, 0.9, 0);
  scene.add(instances(budGeo, stone, capsBud, 'hall-capitals-bud'));

  // Abaci, architraves, roof slabs, clerestory grilles, side walls — all unit boxes, scaled per instance
  const centralTop = 10 * 1.48 + 2.2 + 0.67; // ≈ 17.67
  const outerTop = 7 * 1.48 + 1.8 + 0.67; // ≈ 12.83
  for (const x of [-13, -6.5, 6.5, 13]) {
    const y = Math.abs(x) < 10 ? centralTop : outerTop;
    for (let k = 0; k < 9; k++) {
      const z = -12 - k * 8;
      blocks.push({ p: [x, y + 0.6, z - 4], s: [2.2, 1.4, 8.06], asm: [r(), zN(z) * 0.5 + 0.24] });
    }
  }
  for (let k = 0; k < 9; k++) {
    const z = -12 - k * 8;
    const o = zN(z) * 0.5 + 0.3;
    blocks.push({ p: [0, centralTop + 1.65, z - 4], s: [16.4, 0.9, 7.8], asm: [r(), o] }); // central roof (gaps let light in)
    for (const sx of [-1, 1]) {
      blocks.push({ p: [sx * 12.9, outerTop + 1.6, z - 4], s: [9.4, 0.8, 7.8], asm: [r(), o] });
      for (let g = 0; g < 4; g++) blocks.push({ p: [sx * 7.6, outerTop + 3.6, z - 1 - g * 2], s: [0.5, 4.2, 0.5], asm: [r(), o + 0.02] });
      blocks.push({ p: [sx * 17.6, 7.5, z - 4], s: [1.2, 15, 8.06], asm: [r(), zN(z) * 0.5] });
    }
  }
  const unit = new THREE.BoxGeometry(1, 1, 1);
  scene.add(instances(unit, stoneDark, blocks, 'hall-blocks'));

  // Floor circuit: the hall is a circuit board, columns are its components
  const tr = new Lines();
  const Y = 0.07;
  const V = (x: number, z: number) => new THREE.Vector3(x, Y, z);
  for (const x of [-9.75, -3.2, -0.45, 0.45, 3.2, 9.75]) tr.poly([V(x, -4), V(x, -84)], 0);
  for (const z of ZS) {
    for (const sx of [-1, 1]) {
      tr.poly([V(sx * 3.2, z + 2.2), V(sx * 4.8, z + 0.6), V(sx * 4.95, z)], -z);
      tr.poly([V(sx * 9.75, z + 2.2), V(sx * 8.1, z + 0.6), V(sx * 8.0, z)], -z);
      tr.poly([V(sx * 9.75, z - 2.2), V(sx * 11.4, z - 0.6), V(sx * 11.5, z)], -z);
      tr.poly([V(sx * 0.45, z - 3), V(sx * 1.6, z - 4), V(sx * 3.2, z - 4)], -z);
    }
  }
  const trMat = traceMaterial({ color: 0x6a3b16, pulse: 0xffd27a, speed: 16, spacing: 34 });
  scene.add(tr.build(trMat, 'hall-circuit'));

  // Light shafts through the clerestory
  const shaftPos: number[] = [];
  for (let k = 0; k < 7; k++) {
    const z = -14 - k * 8;
    const a = [7.4, outerTop + 4.8, z - 0.5], b = [7.4, outerTop + 4.8, z + 0.5];
    const c = [-3.5, 0.12, z - 3.5], d = [-3.5, 0.12, z - 2.5];
    shaftPos.push(...a, ...b, ...c, ...b, ...d, ...c);
  }
  const shaftGeo = new THREE.BufferGeometry();
  shaftGeo.setAttribute('position', new THREE.Float32BufferAttribute(shaftPos, 3));
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0x3a2410, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const shafts = new THREE.Mesh(shaftGeo, shaftMat);
  shafts.name = 'hall-light';
  shafts.renderOrder = 5;
  scene.add(shafts);

  // ── Nilometer ────────────────────────────────────────────────────────────
  const shaftWall = new THREE.MeshLambertMaterial({ color: 0x9a8a70, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const cz = (HOLE.z0 + HOLE.z1) / 2; // -95
  const D = -50;
  const walls = [
    boxAt(-7.2, -6, D, 0.9, -102.2, -87.8),
    boxAt(6, 7.2, D, 0.9, -102.2, -87.8),
    boxAt(-7.1, 7.1, D, 0.9, -102.2, -101),
    boxAt(-7.1, 7.1, D, 0.9, -89, -87.8),
  ];
  for (const g of walls) {
    const m = new THREE.Mesh(g, shaftWall);
    m.name = 'nilometer-wall';
    scene.add(m);
  }
  // Stairs spiralling down the walls
  const steps: Item[] = [];
  let y = -0.6;
  const perim: [number, number, number, number][] = []; // x, z, sx, sz (size)
  for (let i = 0; i < 9; i++) perim.push([-5.4 + i * 1.35, -89.95, 1.4, 2.3]); // along the south wall, going +x
  for (let i = 0; i < 9; i++) perim.push([5.05, -89.6 - i * 1.35, 2.3, 1.4]); // east wall, going -z
  for (let i = 0; i < 9; i++) perim.push([5.4 - i * 1.35, -100.05, 1.4, 2.3]); // north wall, going -x
  for (let i = 0; i < 9; i++) perim.push([-5.05, -100.4 + i * 1.35, 2.3, 1.4]); // west wall, going +z
  let k = 0;
  while (y > D + 1) {
    const [x, z, sx, sz] = perim[k % perim.length];
    steps.push({ p: [x, y, z], s: [sx, 0.5, sz] });
    y -= 0.62;
    k++;
  }
  scene.add(instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xb59e78 }), steps, 'nilometer-steps'));

  // Central graduated column + the beam across the top
  const colGeo = new THREE.CylinderGeometry(1.1, 1.1, 54, 8);
  colGeo.translate(0, D + 27, cz);
  const column = new THREE.Mesh(colGeo, new THREE.MeshLambertMaterial({ color: 0xd8c39a, flatShading: true }));
  column.name = 'nilometer-column';
  scene.add(column);
  const beam = new THREE.Mesh(boxAt(-6.5, 6.5, 2.4, 3.3, cz - 0.7, cz + 0.7), shaftWall);
  beam.name = 'nilometer-beam';
  scene.add(beam);
  const cap = new THREE.Mesh(boxAt(-1.6, 1.6, 3.3, 4.2, cz - 1.6, cz + 1.6), shaftWall);
  cap.name = 'nilometer-cap';
  scene.add(cap);

  const marks = new Lines();
  const Rm = 1.1 / Math.cos(Math.PI / 8) + 0.04; // just outside the faces
  for (let yy = D + 1; yy < 3.5; yy += 1) {
    const major = Math.round(yy) % 5 === 0;
    for (let f = 0; f < 8; f++) {
      const a0 = (f / 8) * Math.PI * 2, a1 = ((f + (major ? 1 : 0.45)) / 8) * Math.PI * 2;
      marks.seg(
        new THREE.Vector3(Math.sin(a0) * Rm * 0.93, yy, cz + Math.cos(a0) * Rm * 0.93),
        new THREE.Vector3(Math.sin(a1) * Rm * 0.93, yy, cz + Math.cos(a1) * Rm * 0.93),
        yy * -4, yy * -4,
      );
    }
  }
  const markMat = traceMaterial({ color: 0x8a5a20, pulse: 0xfff0cf, speed: 9, spacing: 70 });
  scene.add(marks.build(markMat, 'nilometer-marks'));

  // "RESEARCH" inscribed in voxels on the north wall, facing the stairs
  const word = wordCells('RESEARCH');
  const vs = 0.25;
  const letters: Item[] = word.cells.map(([cx, cy]) => ({
    p: [-6 + 0.08, -4 - cy * vs, cz - (cx - (word.cols - 1) / 2) * vs],
    s: [0.3, vs * 0.9, vs * 0.9],
  }));
  scene.add(instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xe8a040 }), letters, 'nilometer-word'));

  // Water inside the shaft, rising with the research chapter
  const poolMat = waterMaterial({ base: 0x2848d8 });
  const pool = new THREE.Mesh(waterRect(-6.05, 6.05, -101.05, -88.95, 0, 'z'), poolMat);
  pool.name = 'nilometer-water';
  scene.add(pool);

  // Light in the shaft
  const lamp = new THREE.PointLight(0xffb060, 65, 70, 1.2);
  lamp.position.set(0, -6, cz);
  scene.add(lamp);

  return {
    update(s: { hall: number; water: number }) {
      uAssemble.value = s.hall;
      pool.position.y = -47 + s.water * 30;
      lamp.position.y = pool.position.y + 14;
    },
  };
}
