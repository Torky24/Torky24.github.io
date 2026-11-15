import * as THREE from 'three';
import { rng, Lines, waterRect, batteredBox, boxAt } from './geo';
import { sunMaterial, skyMaterial, waterMaterial, traceMaterial } from './materials';

export const STONE = 0xc8b08a;
export const STONE_DARK = 0x6d6478;
export const GROUND = 0x2a2a3c;
export const HOLE = { x0: -7, x1: 7, z0: -102, z1: -88 }; // Nilometer opening

export function buildHorizon(scene: THREE.Scene, tier: 'high' | 'low') {
  const r = rng(11);

  // Sky dome (follows the camera)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), skyMaterial());
  sky.name = 'sky';
  sky.renderOrder = -10;
  scene.add(sky);

  // Pixel stars
  const sp: number[] = [];
  for (let i = 0; i < 520; i++) {
    const th = r() * Math.PI * 2, y = 0.06 + Math.pow(r(), 0.7) * 0.9;
    const k = Math.sqrt(1 - y * y);
    sp.push(Math.cos(th) * k * 1200, y * 1200, Math.sin(th) * k * 1200);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8da0e0, size: 1, sizeAttenuation: false, fog: false }));
  stars.name = 'stars';
  stars.frustumCulled = false;
  scene.add(stars);

  // Ground: four slabs around the Nilometer opening
  const groundMat = new THREE.MeshLambertMaterial({ color: GROUND });
  const E = 1600;
  const pieces: [number, number, number, number][] = [
    [-E, E, -E, HOLE.z0],
    [-E, E, HOLE.z1, E],
    [-E, HOLE.x0, HOLE.z0, HOLE.z1],
    [HOLE.x1, E, HOLE.z0, HOLE.z1],
  ];
  for (const [x0, x1, z0, z1] of pieces) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const m = new THREE.Mesh(g, groundMat);
    m.name = 'ground';
    scene.add(m);
  }

  // The river in front of the temple, the canal feeding the Nilometer
  const riverMat = waterMaterial({ reflect: 1 });
  const river = new THREE.Mesh(waterRect(-900, 900, 16, 30, 0.1, 'x'), riverMat);
  river.name = 'river';
  scene.add(river);
  const canalMat = waterMaterial({ base: 0x1636a8 });
  const canal = new THREE.Mesh(waterRect(22, 25, -93.5, 16, 0.1, '-z'), canalMat);
  canal.name = 'canal';
  scene.add(canal);
  const feed = new THREE.Mesh(waterRect(7.4, 22, -96.5, -93.5, 0.1, 'x'), canalMat);
  feed.name = 'canal-feed';
  scene.add(feed);
  // The sea beyond the delta, where the journey ends
  const seaMat = waterMaterial({ reflect: 1, base: 0x14309a });
  const sea = new THREE.Mesh(waterRect(-2400, 2400, -3000, -560, 0.1, 'x'), seaMat);
  sea.name = 'sea';
  scene.add(sea);

  // Pylon: two battered towers framing the sun (the hieroglyph for "horizon")
  const stone = new THREE.MeshLambertMaterial({ color: STONE, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const pylon = new THREE.Group();
  pylon.name = 'pylon';
  const edges: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const tower = new THREE.Mesh(batteredBox(15, 26, 7, 11.5, 5.5), stone);
    tower.position.set(sx * 10.5, 0, 0);
    tower.name = 'pylon-tower';
    pylon.add(tower);
    const eg = new THREE.EdgesGeometry(tower.geometry);
    eg.translate(sx * 10.5, 0, 0);
    edges.push(eg);
    const cornice = new THREE.Mesh(boxAt(sx * 10.5 - 6.4, sx * 10.5 + 6.4, 25.7, 27.5, -3.3, 3.3), stone);
    cornice.name = 'pylon-cornice';
    pylon.add(cornice);
  }
  const portalParts = [
    boxAt(-3.6, -2.2, 0, 11.2, -2.2, 2.2),
    boxAt(2.2, 3.6, 0, 11.2, -2.2, 2.2),
    boxAt(-3.6, 3.6, 11, 15.5, -2.2, 2.2),
    boxAt(-4.2, 4.2, 15.3, 16.6, -2.6, 2.6),
  ];
  for (const g of portalParts) {
    const m = new THREE.Mesh(g, stone);
    m.name = 'pylon-portal';
    pylon.add(m);
  }
  scene.add(pylon);
  const edgeLines = new THREE.LineSegments(
    mergeLines(edges),
    new THREE.LineBasicMaterial({ color: 0xd9973a }),
  );
  edgeLines.name = 'pylon-edges';
  scene.add(edgeLines);

  // Inscription registers on the pylon faces — rows of "text" read by a slow pulse
  const ins = new Lines();
  for (const sx of [-1, 1]) {
    for (let row = 0; row < 10; row++) {
      const y = 3.2 + row * 2.05;
      const zf = 3.5 - (0.75 * y) / 26 + 0.14;
      const hw = 7.5 - (1.75 * y) / 26 - 1.1;
      let x = -hw;
      while (x < hw) {
        const len = 0.35 + r() * 1.9;
        const x1 = Math.min(hw, x + len);
        const a = new THREE.Vector3(sx * 10.5 + x, y, zf), b = new THREE.Vector3(sx * 10.5 + x1, y, zf);
        ins.seg(a, b, x + row * 9 + 30, x1 + row * 9 + 30);
        if (r() < 0.35) ins.seg(new THREE.Vector3(a.x, y - 0.55, zf + 0.012), new THREE.Vector3(a.x, y + 0.3, zf + 0.012), x + row * 9 + 30, x + row * 9 + 30);
        x = x1 + 0.25 + r() * 0.7;
      }
    }
  }
  const insMat = traceMaterial({ color: 0x24409a, pulse: 0x9fc0ff, speed: 5, spacing: 46 });
  scene.add(ins.build(insMat, 'pylon-inscriptions'));

  // The pixel sun
  const cell = tier === 'high' ? 2.4 : 3.4;
  const R = 80;
  const homes: number[] = [], seeds: number[] = [];
  for (let y = -R; y <= R; y += cell) {
    for (let x = -R; x <= R; x += cell) {
      if (x * x + y * y <= R * R) {
        homes.push(x, y);
        seeds.push(r(), r(), r(), r());
      }
    }
  }
  const count = homes.length / 2;
  const sunGeo = new THREE.BoxGeometry(1, 1, 1);
  sunGeo.setAttribute('aHome', new THREE.InstancedBufferAttribute(new Float32Array(homes), 2));
  sunGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(seeds), 4));
  const sunMat = sunMaterial();
  sunMat.uniforms.uCell.value = cell;
  sunMat.uniforms.uRadius.value = R;
  const sun = new THREE.InstancedMesh(sunGeo, sunMat, count);
  sun.name = 'sun';
  sun.frustumCulled = false;
  scene.add(sun);

  const TEMPLE_SUN = new THREE.Vector3(0, 62, -330), FAR_SUN = new THREE.Vector3(0, 60, -1300);
  const tmp = new THREE.Vector3();

  return {
    sunCount: count,
    update(s: { sun: number; horizon: number }, cam: THREE.Camera) {
      sky.position.copy(cam.position);
      stars.position.copy(cam.position);
      tmp.copy(TEMPLE_SUN).lerp(FAR_SUN, s.horizon);
      sunMat.uniforms.uCenter.value.copy(tmp);
      sunMat.uniforms.uScale.value = 1.4 + s.horizon * 1.2;
      sunMat.uniforms.uFracture.value = s.sun;
      const glow = Math.max(0, 1 - s.sun * 1.4);
      (sky.material as THREE.ShaderMaterial).uniforms.uSun.value.copy(tmp);
      (sky.material as THREE.ShaderMaterial).uniforms.uGlow.value = glow;
      riverMat.uniforms.uGlow.value = glow;
      seaMat.uniforms.uGlow.value = Math.max(0, 1 - s.sun * 1.2) * s.horizon;
    },
  };
}

function mergeLines(list: THREE.BufferGeometry[]) {
  const pos: number[] = [];
  for (const g of list) pos.push(...(g.attributes.position.array as Float32Array));
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return out;
}
