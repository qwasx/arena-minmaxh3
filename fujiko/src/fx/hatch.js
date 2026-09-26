// 「2012 画风」后期：致敬《峰不二子という女》的粗排线、胶片颗粒、褪色色调（保留红色）
import * as THREE from 'three';

const fs = `
uniform sampler2D tDiffuse;
uniform float time; uniform float dpr; uniform float amount;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float hatchLine(vec2 p, float ang, float spacing, float width, float wob, float seed){
  float s = sin(ang), c = cos(ang);
  vec2 r = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  float w = (noise(r * vec2(0.02, 0.15) + seed) - 0.5) * wob;
  float d = abs(fract((r.y + w) / spacing) - 0.5) * spacing;
  float brk = smoothstep(0.12, 0.3, noise(r * vec2(0.035, 0.5) + seed * 3.0));
  return (1.0 - smoothstep(width * 0.5, width * 0.5 + 0.9, d)) * brk;
}
void main(){
  vec3 col = pow(max(texture2D(tDiffuse, vUv).rgb, 0.0), vec3(1.0 / 2.2));
  float L = dot(col, vec3(0.299, 0.587, 0.114));
  vec2 frag = gl_FragCoord.xy / dpr;
  float boil = floor(time * 8.0);
  vec2 jit = vec2(hash(vec2(boil, 1.3)), hash(vec2(2.7, boil))) * 2.0;
  float h1 = hatchLine(frag + jit, 0.85, 6.5, 1.7, 3.6, boil) * (1.0 - smoothstep(0.34, 0.58, L));
  float h2 = hatchLine(frag - jit, -0.72, 7.0, 1.5, 3.6, boil + 5.0) * (1.0 - smoothstep(0.2, 0.36, L));
  float h3 = hatchLine(frag + jit.yx, 0.06, 5.0, 1.3, 2.8, boil + 9.0) * (1.0 - smoothstep(0.06, 0.18, L));
  float h = max(max(h1, h2), h3);
  float redness = clamp((col.r - max(col.g, col.b)) * 3.2, 0.0, 1.0);
  vec3 muted = mix(vec3(L), col, 0.28 + 0.67 * redness);
  muted = smoothstep(0.02, 0.95, muted);
  muted = mix(muted, muted * vec3(1.12, 0.98, 0.8) + vec3(0.035, 0.025, 0.0), 0.75);
  vec3 ink = vec3(0.08, 0.05, 0.06);
  vec3 outc = mix(muted, ink, h * 0.8);
  float g = hash(gl_FragCoord.xy * 0.37 + boil * 17.0) - 0.5;
  outc += g * 0.085;
  outc *= 0.94 + 0.06 * noise(frag * 0.3 + boil);
  vec2 q = vUv - 0.5;
  outc *= 1.0 - dot(q, q) * 1.0;
  float sx = hash(vec2(boil, 9.1));
  float scratch = step(0.72, hash(vec2(boil, 3.3))) * (1.0 - smoothstep(0.0, 0.0012, abs(vUv.x - sx)));
  outc = mix(outc, vec3(0.93, 0.88, 0.78), scratch * 0.35);
  outc = mix(col, outc, amount);
  gl_FragColor = vec4(pow(max(outc, 0.0), vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}`;
const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function createHatch(renderer) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { samples: 4, type: THREE.HalfFloatType });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, time: { value: 0 }, dpr: { value: renderer.getPixelRatio() }, amount: { value: 0 } },
    vertexShader: vs, fragmentShader: fs, depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    rt, mat,
    amount: 0,
    resize() {
      renderer.getDrawingBufferSize(size);
      rt.setSize(size.x, size.y);
      mat.uniforms.dpr.value = renderer.getPixelRatio();
    },
    render(effect, sceneMain, camera, t) {
      renderer.setRenderTarget(rt);
      effect.render(sceneMain, camera);
      renderer.setRenderTarget(null);
      mat.uniforms.time.value = t;
      mat.uniforms.amount.value = this.amount;
      renderer.render(scene, cam);
    },
  };
}
