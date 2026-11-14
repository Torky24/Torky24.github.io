import * as THREE from 'three';

/** Deterministic random so the world is identical on every visit (and in the plates). */
export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Collects line segments with per-vertex distance / growth / branch attributes. */
export class Lines {
  pos: number[] = [];
  dist: number[] = [];
  t: number[] = [];
  branch: number[] = [];
  seg(a: THREE.Vector3Like, b: THREE.Vector3Like, d0 = 0, d1 = 0, t0 = 0, t1 = 0, br = -9) {
    this.pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    this.dist.push(d0, d1);
    this.t.push(t0, t1);
    this.branch.push(br, br);
  }
  /** polyline with cumulative distance */
  poly(pts: THREE.Vector3[], d0 = 0, t0 = 0, t1 = 0, br = -9) {
    let d = d0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = pts[i].distanceTo(pts[i + 1]);
      const ta = t0 + ((t1 - t0) * i) / (pts.length - 1), tb = t0 + ((t1 - t0) * (i + 1)) / (pts.length - 1);
      this.seg(pts[i], pts[i + 1], d, d + l, ta, tb, br);
      d += l;
    }
    return d;
  }
  build(material: THREE.Material, name: string) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('aDist', new THREE.Float32BufferAttribute(this.dist, 1));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(this.t, 1));
    g.setAttribute('aBranch', new THREE.Float32BufferAttribute(this.branch, 1));
    const l = new THREE.LineSegments(g, material);
    l.name = name;
    l.frustumCulled = false;
    return l;
  }
}

/** Flat ribbon in the XZ plane along a polyline (for rivers and channels). aFlow = distance along. */
export function ribbon(pts: THREE.Vector3[], widths: number | ((i: number) => number), y: number, flow0 = 0, t0 = 0, t1 = 0) {
  const pos: number[] = [], flow: number[] = [], idx: number[] = [], tt: number[] = [];
  let d = flow0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
    const n = new THREE.Vector3(-dir.z, 0, dir.x);
    const w = (typeof widths === 'number' ? widths : widths(i)) / 2;
    if (i > 0) d += p.distanceTo(pts[i - 1]);
    pos.push(p.x + n.x * w, y, p.z + n.z * w, p.x - n.x * w, y, p.z - n.z * w);
    flow.push(d, d);
    const tv = t0 + ((t1 - t0) * i) / Math.max(1, pts.length - 1);
    tt.push(tv, tv);
    if (i < pts.length - 1) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 1));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
  g.setIndex(idx);
  return g;
}

/** Axis-aligned flat rectangle (XZ) as a water surface with aFlow along an axis. */
export function waterRect(x0: number, x1: number, z0: number, z1: number, y: number, flowAxis: 'x' | 'z' | '-z') {
  const g = new THREE.BufferGeometry();
  const P = [x0, y, z0, x1, y, z0, x0, y, z1, x1, y, z1];
  const f = (x: number, z: number) => (flowAxis === 'x' ? x : flowAxis === 'z' ? z : -z);
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute([f(x0, z0), f(x1, z0), f(x0, z1), f(x1, z1)], 1));
  g.setAttribute('aT', new THREE.Float32BufferAttribute([0, 0, 0, 0], 1));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  return g;
}

/** Box whose top is narrower than its base — the battered wall of a pylon. Base sits on y=0. */
export function batteredBox(w: number, h: number, d: number, topW: number, topD: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > h / 2) {
      p.setX(i, (p.getX(i) * topW) / w);
      p.setZ(i, (p.getZ(i) * topD) / d);
    }
  }
  g.computeVertexNormals();
  return g;
}

export function boxAt(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/** InstancedMesh from a list of [x,y,z,(sx,sy,sz),(ry)] with optional assembly attribute. */
export function instances(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  items: { p: [number, number, number]; s?: [number, number, number]; r?: number; asm?: [number, number] }[],
  name: string,
) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  m.name = name;
  const o = new THREE.Object3D();
  const asm = new Float32Array(items.length * 2);
  items.forEach((it, i) => {
    o.position.set(...it.p);
    o.scale.set(...(it.s ?? [1, 1, 1]));
    o.rotation.set(0, it.r ?? 0, 0);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    asm[i * 2] = it.asm?.[0] ?? 0;
    asm[i * 2 + 1] = it.asm?.[1] ?? 0;
  });
  geo.setAttribute('aAsm', new THREE.InstancedBufferAttribute(asm, 2));
  m.instanceMatrix.needsUpdate = true;
  m.frustumCulled = false;
  return m;
}
