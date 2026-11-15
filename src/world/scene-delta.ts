import * as THREE from 'three';
import { rng, Lines, ribbon } from './geo';
import { traceMaterial, waterMaterial } from './materials';
import { wordCells } from './palette';

/**
 * The Delta (Writing): the Nile leaves the Nilometer and branches into a fan —
 * a search tree. Channels near the root are water; deeper branches are light.
 * Leaves are "results". Fields of the valley surround it; WRITING is spelled in crops.
 */
export function buildDelta(scene: THREE.Scene, tier: 'high' | 'low') {
  const r = rng(5);
  const MAXD = 6;
  const lines = new Lines();
  const waterGeos: THREE.BufferGeometry[] = [];
  const nodes: { p: THREE.Vector3; t: number; depth: number; branch: number }[] = [];
  const WIDTH = [7, 4.4, 2.6];

  const grow = (p: THREE.Vector3, ang: number, len: number, depth: number, branch: number, d0: number) => {
    const n = 7;
    const pts: THREE.Vector3[] = [p.clone()];
    const ph = r() * 6;
    let a = ang;
    for (let i = 1; i <= n; i++) {
      a = ang + Math.sin(i * 1.1 + ph) * 0.16;
      const q = pts[i - 1].clone().add(new THREE.Vector3(Math.sin(a) * (len / n), 0, -Math.cos(a) * (len / n)));
      pts.push(q);
    }
    const t0 = depth / (MAXD + 1), t1 = (depth + 1) / (MAXD + 1);
    if (depth < WIDTH.length) {
      waterGeos.push(ribbon(pts, (i) => WIDTH[depth] * (1 - (i / n) * 0.25), 0.42, d0, t0, t1));
    }
    const lp = pts.map((v) => new THREE.Vector3(v.x, 0.62, v.z));
    const d1 = lines.poly(lp, d0, t0, t1, depth >= 2 ? branch : -9);
    const end = pts[pts.length - 1];
    nodes.push({ p: end, t: t1, depth, branch });
    if (depth >= MAXD) return;
    const kids = depth >= 1 && depth <= 3 && r() < 0.35 ? 3 : 2;
    const spread = 0.34 + r() * 0.2 - depth * 0.02;
    for (let c = 0; c < kids; c++) {
      const off = kids === 2 ? (c ? 1 : -1) * spread : (c - 1) * spread;
      const nb = depth === 1 ? nodes.filter((nd) => nd.depth === 2).length : branch;
      grow(end, a * 0.85 + off, len * (0.7 + r() * 0.08), depth + 1, depth === 1 ? nb : branch, d1);
    }
  };
  grow(new THREE.Vector3(0, 0, -102.6), 0, 80, 0, -9, 0);

  // Water channels
  const water = waterMaterial({ base: 0x2244c8 });
  water.uniforms.uGrow.value = 0;
  for (const g of waterGeos) {
    const m = new THREE.Mesh(g, water);
    m.name = 'delta-water';
    m.frustumCulled = false;
    scene.add(m);
  }
  // Light branches
  const branchMat = traceMaterial({ color: 0x3355cc, pulse: 0xcfe0ff, speed: 26, spacing: 90 });
  branchMat.uniforms.uGrow.value = 0;
  scene.add(lines.build(branchMat, 'delta-branches'));

  // Nodes: junctions and results
  const nodeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), nodes.length);
  nodeMesh.name = 'delta-nodes';
  nodeMesh.frustumCulled = false;
  const ochre = new THREE.Color(0xf0a438), hiCol = new THREE.Color(0x4cff9a);
  nodes.forEach((_, i) => nodeMesh.setColorAt(i, ochre));
  scene.add(nodeMesh);

  // Fields of the valley
  const pitch = tier === 'high' ? 6.5 : 9;
  const word = wordCells('WRITING');
  const wp = 6;
  const wx0 = -((word.cols - 1) * wp) / 2, wz0 = -420;
  const plots: { x: number; z: number; c: THREE.Color }[] = [];
  const cA = new THREE.Color(0x1d2546), cB = new THREE.Color(0x1a3a2a), cC = new THREE.Color(0x272a3c);
  for (let x = -230; x <= 230; x += pitch) {
    for (let z = -112; z >= -545; z -= pitch) {
      // keep the word's area clear for the crop letters
      if (x > wx0 - wp * 1.5 && x < wx0 + (word.cols + 0.5) * wp && z < wz0 + wp * 1.5 && z > wz0 - 7.5 * wp) continue;
      if (Math.abs(x) < 9 && z > -130) continue;
      const v = r();
      plots.push({ x: x + (r() - 0.5) * 0.6, z, c: (v < 0.32 ? cB : v < 0.7 ? cA : cC).clone().multiplyScalar(0.8 + r() * 0.5) });
    }
  }
  const plotMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), plots.length);
  plotMesh.name = 'delta-fields';
  const o = new THREE.Object3D();
  plots.forEach((pl, i) => {
    o.position.set(pl.x, 0.15, pl.z);
    o.scale.set(pitch * 0.84, 0.3, pitch * 0.84);
    o.updateMatrix();
    plotMesh.setMatrixAt(i, o.matrix);
    plotMesh.setColorAt(i, pl.c);
  });
  plotMesh.frustumCulled = false;
  scene.add(plotMesh);

  const letterCells = word.cells.map(([c, rr]) => ({ x: wx0 + c * wp, z: wz0 - (6 - rr) * wp }));
  const letterMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xe39a3a }), letterCells.length);
  letterMesh.name = 'delta-word';
  letterMesh.frustumCulled = false;
  scene.add(letterMesh);

  let lastGrow = -1, lastHi = -2;
  const majorBranches = new Set(nodes.filter((n) => n.depth >= 2).map((n) => n.branch)).size;

  return {
    majorBranches,
    update(s: { delta: number }, hi: number) {
      const g = s.delta * 1.02;
      water.uniforms.uGrow.value = g;
      branchMat.uniforms.uGrow.value = g;
      branchMat.uniforms.uHi.value = hi;
      if (Math.abs(g - lastGrow) < 1e-4 && hi === lastHi) return;
      lastGrow = g;
      lastHi = hi;
      nodes.forEach((n, i) => {
        const k = THREE.MathUtils.clamp((g - n.t) * 14, 0, 1);
        const size = (n.depth >= MAXD ? 2.6 : 1.6) * k;
        o.position.set(n.p.x, 0.62 + size / 2, n.p.z);
        o.scale.set(size || 1e-4, size || 1e-4, size || 1e-4);
        o.updateMatrix();
        nodeMesh.setMatrixAt(i, o.matrix);
        nodeMesh.setColorAt(i, hi >= 0 && n.branch === hi ? hiCol : ochre);
      });
      nodeMesh.instanceMatrix.needsUpdate = true;
      if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
      letterCells.forEach((c, i) => {
        const k = THREE.MathUtils.clamp((g - 0.35 - (c.x - wx0) / 600) * 3, 0, 1);
        const h = 0.2 + k * 1.4;
        o.position.set(c.x, h / 2, c.z);
        o.scale.set(wp * 0.82, h, wp * 0.82);
        o.updateMatrix();
        letterMesh.setMatrixAt(i, o.matrix);
      });
      letterMesh.instanceMatrix.needsUpdate = true;
    },
  };
}
