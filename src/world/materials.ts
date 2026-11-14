import * as THREE from 'three';
import { COOL, WARM, MAL, hex3 } from './palette';

/** Shared uniforms (time, fog) — every custom material references the same objects. */
export const shared = {
  uTime: { value: 0 },
  uFogColor: { value: new THREE.Color(0.035, 0.05, 0.16) },
  uFogNear: { value: 60 },
  uFogFar: { value: 420 },
};

const FOG_V = /* glsl */ `varying float vFogDepth;`;
const FOG_F = /* glsl */ `
  uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; varying float vFogDepth;
  vec3 applyFog(vec3 c, float k) { return mix(c, uFogColor, smoothstep(uFogNear, uFogFar, vFogDepth) * k); }`;

/** Water: river, canal, Nilometer pool and delta channels. Uses attribute aFlow (distance along the flow). */
export function waterMaterial(opts: { reflect?: number; base?: THREE.ColorRepresentation } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uReflect: { value: opts.reflect ?? 0 },
      uBase: { value: new THREE.Color(opts.base ?? 0x1a3dbb) },
      uSunX: { value: 0 },
      uGlow: { value: 1 },
      uGrow: { value: 9 },
    },
    vertexShader: /* glsl */ `
      attribute float aFlow; attribute float aT; varying float vFlow; varying float vT; varying vec3 vW; ${FOG_V}
      void main() {
        vFlow = aFlow; vT = aT;
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vec4 mv = viewMatrix * w; vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uReflect; uniform vec3 uBase; uniform float uSunX; uniform float uGlow; uniform float uGrow;
      varying float vFlow; varying float vT; varying vec3 vW; ${FOG_F}
      float h(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      void main() {
        if (vT > uGrow) discard;
        float band = sin(vFlow * 0.35 - uTime * 1.6 + sin(vW.x * 0.21 + vW.z * 0.17) * 2.0) * 0.5 + 0.5;
        vec3 c = uBase * (0.55 + 0.35 * band);
        vec2 cell = floor(vec2(vFlow * 0.9 - uTime * 3.0, (vW.x + vW.z) * 0.7));
        float spark = step(0.965, h(cell + floor(uTime * 0.7)));
        c += vec3(0.45, 0.6, 1.0) * spark * 0.55;
        float dash = step(0.9, fract(vFlow * 0.045 - uTime * 0.35));
        c += vec3(0.25, 0.4, 0.9) * dash * 0.5;
        // reflection of the sun: a warm, rippling column on the river
        float col = exp(-pow((vW.x - uSunX) / 7.0, 2.0)) * uReflect * uGlow;
        float rip = step(0.45, fract(vW.z * 0.9 + sin(vW.x * 1.7 + uTime * 2.0) * 0.3));
        c = mix(c, vec3(1.0, 0.72, 0.35) * (0.9 + 0.3 * rip), col * (0.55 + 0.45 * rip));
        gl_FragColor = vec4(applyFog(c, 1.0), 1.0);
      }`,
  });
}

/** Glowing traces with pulses running along them (circuit, inscriptions, delta branches). */
export function traceMaterial(opts: { color: THREE.ColorRepresentation; pulse: THREE.ColorRepresentation; speed?: number; spacing?: number; growable?: boolean }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uColor: { value: new THREE.Color(opts.color) },
      uPulse: { value: new THREE.Color(opts.pulse) },
      uSpeed: { value: opts.speed ?? 14 },
      uSpacing: { value: opts.spacing ?? 60 },
      uGrow: { value: 1 },
      uHi: { value: -1 },
    },
    vertexShader: /* glsl */ `
      attribute float aDist; attribute float aT; attribute float aBranch;
      varying float vDist; varying float vT; varying float vBranch; ${FOG_V}
      void main() {
        vDist = aDist; vT = aT; vBranch = aBranch;
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform vec3 uPulse; uniform float uSpeed; uniform float uSpacing;
      uniform float uGrow; uniform float uHi;
      varying float vDist; varying float vT; varying float vBranch; ${FOG_F}
      void main() {
        if (vT > uGrow) discard;
        float p = fract((vDist - uTime * uSpeed) / uSpacing);
        float pulse = smoothstep(0.0, 0.04, p) * (1.0 - smoothstep(0.04, 0.16, p));
        vec3 c = mix(uColor, uPulse, pulse);
        if (uHi >= 0.0 && abs(vBranch - uHi) < 0.5) c = mix(vec3(0.3, 1.0, 0.55), vec3(0.75, 1.0, 0.85), pulse);
        gl_FragColor = vec4(applyFog(c, 0.85), 1.0);
      }`,
  });
}

/** The pixel sun: instanced cubes on a disk, fractured into a stream of data by uFracture. */
export function sunMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uCenter: { value: new THREE.Vector3(0, 34, -300) },
      uScale: { value: 1 },
      uCell: { value: 2.4 },
      uRadius: { value: 80 },
      uFracture: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec2 aHome; attribute vec4 aSeed;
      uniform vec3 uCenter; uniform float uScale; uniform float uCell; uniform float uRadius; uniform float uFracture; uniform float uTime;
      varying float vBright; ${FOG_V}
      void main() {
        float r = length(aHome) / uRadius;
        float delay = aSeed.x * 0.5 + r * 0.22;
        float t = clamp((uFracture * 1.35 - delay) / 0.55, 0.0, 1.0);
        float e = t * t * (3.0 - 2.0 * t);
        vec3 home = uCenter + vec3(aHome * uScale, 0.0);
        vec3 spread = vec3(aHome * uScale * (0.4 + aSeed.y * 0.9), 0.0) + vec3((aSeed.z - 0.5) * 70.0, (aSeed.w - 0.6) * 50.0, 0.0);
        vec3 away = home + spread + vec3(0.0, -18.0 * aSeed.y, 140.0 + aSeed.y * 320.0);
        vec3 p = mix(home, away, e);
        float ang = e * (2.0 + aSeed.z * 7.0);
        vec3 lp = position * uCell * uScale * 0.86 * (1.0 - e * 0.92);
        lp.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * lp.xz;
        lp.xy = mat2(cos(ang * 0.7), -sin(ang * 0.7), sin(ang * 0.7), cos(ang * 0.7)) * lp.xy;
        vec4 mv = modelViewMatrix * vec4(p + lp, 1.0); vFogDepth = -mv.z;
        float shimmer = 0.04 * sin(uTime * 0.8 + aSeed.x * 40.0);
        vBright = mix(1.0 - r * r * 0.42 + shimmer, 0.95, e);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vBright; ${FOG_F}
      void main() {
        vec3 c = vec3(1.0, 0.8, 0.52) * vBright;
        gl_FragColor = vec4(applyFog(c, 0.25), 1.0);
      }`,
  });
}

/** Sky dome: night ink at the zenith, Egyptian blue at the horizon, warm halo around the sun. */
export function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uSun: { value: new THREE.Vector3(0, 34, -300) }, uGlow: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vDir = w.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; uniform float uGlow; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 top = vec3(0.012, 0.016, 0.05), hor = vec3(0.08, 0.13, 0.42);
        vec3 c = mix(hor, top, smoothstep(-0.02, 0.5, d.y));
        c = mix(c, vec3(0.03, 0.035, 0.09), smoothstep(0.0, -0.08, d.y));
        vec3 s = normalize(uSun - cameraPosition);
        float g = max(dot(d, s), 0.0);
        c += vec3(1.0, 0.5, 0.2) * (pow(g, 60.0) * 0.55 + pow(g, 9.0) * 0.22) * uGlow;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

/**
 * Lambert material whose instances fall into place: per-instance attribute
 * aAsm = (seed, order). uAssemble 0 → pieces hang high in the sky, 1 → built.
 */
export function assemblyMaterial(color: THREE.ColorRepresentation, uAssemble: { value: number }, extra: THREE.MeshLambertMaterialParameters = {}) {
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...extra });
  m.onBeforeCompile = (s) => {
    s.uniforms.uAssemble = uAssemble;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aAsm;\nuniform float uAssemble;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float asmT = clamp(uAssemble * 1.7 - aAsm.y * 0.7 - aAsm.x * 0.12, 0.0, 1.0);
        float asmE = 1.0 - pow(1.0 - asmT, 3.0);
        transformed.y += (1.0 - asmE) * (22.0 + aAsm.x * 34.0);
        transformed *= asmE;`,
      );
  };
  m.customProgramCacheKey = () => 'asm';
  return m;
}

/** Post-process: map every pixel onto the palette with ordered (Bayer 8×8) dithering. */
export function ditherMaterial(tex: THREE.Texture) {
  const v3 = (a: string[]) => a.map((h) => new THREE.Vector3(...hex3(h)));
  return new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tScene: { value: tex },
      uCool: { value: v3(COOL) },
      uWarm: { value: v3(WARM) },
      uMal: { value: v3(MAL) },
      uGain: { value: 1.0 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene; uniform vec3 uCool[6]; uniform vec3 uWarm[6]; uniform vec3 uMal[6]; uniform float uGain;
      varying vec2 vUv;
      float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
      float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
      void main() {
        vec3 c = texture2D(tScene, vUv).rgb * uGain;
        float L = clamp(dot(c, vec3(0.3, 0.55, 0.15)), 0.0, 1.0);
        L = pow(L, 0.85);
        float d = bayer8(gl_FragCoord.xy);
        float x = L * 5.0;
        float fi = floor(x) + step(d, fract(x));
        int i = int(clamp(fi, 0.0, 5.0));
        float warm = (c.r - c.b) * 3.0 + (d - 0.5) * 0.35;
        bool green = c.g > c.r * 1.25 && c.g > c.b * 1.1;
        vec3 o = green ? uMal[i] : (warm > 0.0 ? uWarm[i] : uCool[i]);
        gl_FragColor = vec4(o, 1.0);
      }`,
  });
}
