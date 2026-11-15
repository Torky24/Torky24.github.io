import * as THREE from 'three';
import { SHOTS, SCALARS, type Shot } from './timeline';
import { shared, ditherMaterial } from './materials';
import { buildHorizon } from './scene-horizon';
import { buildTemple } from './scene-temple';
import { buildDelta } from './scene-delta';

export type Tier = 'high' | 'low';
export interface WorldState { fov: number; sun: number; hall: number; water: number; delta: number; horizon: number }

export interface World {
  /** key-space parameter, 0 … SHOTS.length-1 */
  setTarget(u: number): void;
  snap(): void;
  setPointer(x: number, y: number): void;
  highlight(branch: number): void;
  start(): void;
  stop(): void;
  resize(): void;
  renderAt(u: number, time?: number): void;
  still(u: number, w: number, h: number): string;
  info(): { tier: Tier; px: number; w: number; h: number; fps: number; u: number };
  majorBranches: number;
  three: { THREE: { Raycaster: typeof THREE.Raycaster; Vector2: typeof THREE.Vector2 }; scene: THREE.Scene; camera: THREE.PerspectiveCamera };
}

export function createWorld(canvas: HTMLCanvasElement, tier: Tier, adaptive = true): World | null {
  let renderer: THREE.WebGLRenderer;
  try {
    THREE.ColorManagement.enabled = false;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(1);
  } catch (e) {
    console.warn('[world] WebGL unavailable — falling back to still plates.', e);
    return null;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.8, 2600);
  scene.add(new THREE.HemisphereLight(0x3a5ad0, 0x140c0a, 1.15));
  const sunLight = new THREE.DirectionalLight(0xffc27a, 2.1);
  sunLight.position.set(0.75, 0.85, -0.55);
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0xff8a40, 0.6);
  fill.position.set(-0.6, 0.35, 1);
  scene.add(fill);

  const horizon = buildHorizon(scene, tier);
  const temple = buildTemple(scene);
  const delta = buildDelta(scene, tier);

  // Low-res target + palette pass
  const target = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ditherMaterial(target.texture));
  post.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(post);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const posCurve = new THREE.CatmullRomCurve3(SHOTS.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(SHOTS.map((s) => new THREE.Vector3(...s.look)), false, 'centripetal');
  const N = SHOTS.length - 1;

  let targetU = 0, u = 0, running = false, raf = 0, last = performance.now(), time = 0;
  let px = 3, W = 4, H = 4, hi = -1;
  const pointer = new THREE.Vector2(), pointerS = new THREE.Vector2();
  let frameAvg = 16, slowFor = 0, fps = 60;

  const state = (uu: number): WorldState => {
    const i = Math.min(Math.floor(uu), N - 1), t = uu - i;
    const a = SHOTS[i] as Shot, b = SHOTS[Math.min(i + 1, N)] as Shot;
    const o: any = {};
    for (const k of SCALARS) o[k] = a[k] + (b[k] - a[k]) * t;
    return o as WorldState;
  };

  const look = new THREE.Vector3();
  function apply(uu: number) {
    const s = state(uu);
    const p = uu / N;
    camera.position.copy(posCurve.getPoint(p));
    lookCurve.getPoint(p, look);
    camera.position.x += pointerS.x * 0.9;
    camera.position.y += pointerS.y * 0.45;
    // portrait screens: widen the vertical field of view so the composition still fits
    const aspect = W / H;
    let fov = s.fov;
    if (aspect < 1.25) {
      const h = Math.tan(THREE.MathUtils.degToRad(s.fov / 2)) * 1.6 * 0.66;
      fov = Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(h / aspect)));
    }
    camera.fov = fov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.lookAt(look);
    horizon.update(s, camera);
    temple.update(s);
    delta.update(s, hi);
    // fog: denser in the shaft, longer over the delta and the horizon
    shared.uFogNear.value = 40 + s.delta * 120 + s.horizon * 200;
    shared.uFogFar.value = 330 + s.delta * 260 + s.horizon * 900;
  }

  function draw() {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  }

  function resize() {
    const cw = canvas.clientWidth || window.innerWidth, ch = canvas.clientHeight || window.innerHeight;
    // one world pixel ≈ 3 CSS px on desktop, 2 on phones (bigger when the device is slow)
    px = Math.max(2, Math.round(Math.min(cw, ch) / (tier === 'high' ? 300 : 190))) + bump;
    W = Math.max(64, Math.ceil(cw / px));
    H = Math.max(64, Math.ceil(ch / px));
    renderer.setSize(W, H, false);
    target.setSize(W, H);
  }
  let bump = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    if (tier === 'low' && now - last < 30) return; // ~30 fps on small devices
    last = now;
    time += dt;
    shared.uTime.value = time;
    u += (targetU - u) * (1 - Math.exp(-dt * 7));
    if (Math.abs(targetU - u) < 1e-4) u = targetU;
    pointerS.lerp(pointer, 1 - Math.exp(-dt * 3));
    apply(u);
    const t0 = performance.now();
    draw();
    // adaptive quality: if frames are slow for ~2 s, render bigger pixels
    frameAvg = frameAvg * 0.95 + dt * 1000 * 0.05;
    fps = 1000 / frameAvg;
    if (adaptive && frameAvg > 42 && bump < 3) {
      if ((slowFor += dt) > 2) {
        bump++;
        slowFor = 0;
        resize();
      }
    } else slowFor = 0;
    void t0;
  }

  resize();
  apply(0);

  return {
    majorBranches: delta.majorBranches,
    three: { THREE: { Raycaster: THREE.Raycaster, Vector2: THREE.Vector2 }, scene, camera },
    setTarget(v) {
      targetU = THREE.MathUtils.clamp(v, 0, N);
    },
    snap() {
      u = targetU;
    },
    setPointer(x, y) {
      pointer.set(x, y);
    },
    highlight(b) {
      hi = b;
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    resize,
    renderAt(v, t) {
      targetU = u = v;
      if (t !== undefined) shared.uTime.value = time = t;
      apply(u);
      draw();
    },
    still(v, w, h) {
      const keep = { W, H };
      W = w;
      H = h;
      renderer.setSize(w, h, false);
      target.setSize(w, h);
      shared.uTime.value = 3.0;
      apply(v);
      draw();
      const url = canvas.toDataURL('image/png');
      W = keep.W;
      H = keep.H;
      resize();
      return url;
    },
    info: () => ({ tier, px, w: W, h: H, fps: Math.round(fps), u }),
  };
}
