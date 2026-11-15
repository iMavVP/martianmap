/* The Martian sky. Dust makes the daytime sky butterscotch and scatters blue light forward around the Sun, which is
   why Curiosity and Perseverance photograph blue sunsets. The Sun looks about two-thirds the size it does from Earth.
   Earth is a bright blue-white point at night; its position comes from NASA JPL orbital elements.
   Thin water-ice clouds drift high overhead, as Curiosity and Perseverance have filmed; they glow after sunset because
   they are still in sunlight high above the ground. */
import * as THREE from "three";
import { MARS } from "./mars.js";

export class Sky {
  constructor(scene) {
    this.uni = { sunDir: { value: new THREE.Vector3(0, 1, 0) }, uT: { value: Math.random() * 1000 }, uA: { value: 1 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uni, side: THREE.BackSide, depthWrite: false, fog: false, transparent: true,
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: `uniform vec3 sunDir; uniform float uT; uniform float uA; varying vec3 vDir;
      float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float nn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * nn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
      void main(){
        vec3 v = normalize(vDir); float up = clamp(v.y, 0.0, 1.0); float sunE = sunDir.y;
        float day = smoothstep(-0.14, 0.12, sunE), mu = dot(v, sunDir), ang = acos(clamp(mu, -1.0, 1.0));
        vec3 zen = vec3(0.30, 0.205, 0.145), hor = vec3(0.86, 0.64, 0.45);
        vec3 c = mix(hor, zen, pow(up, 0.42)) * (0.72 + 0.45 * max(0.0, mu));
        float low = 1.0 - smoothstep(0.0, 0.5, sunE);
        c += vec3(0.40, 0.56, 0.86) * exp(-ang * 3.4) * (0.22 + 1.5 * low);
        c += vec3(1.0, 0.92, 0.8) * exp(-ang * 26.0) * 0.8;
        c *= day;
        float tw = smoothstep(-0.25, 0.02, sunE) * (1.0 - day * 0.8);
        c += vec3(0.10, 0.17, 0.34) * exp(-ang * 1.8) * tw;
        // high thin clouds, stretched by the wind
        if (v.y > 0.02) {
          vec2 cp = v.xz / (v.y + 0.12) * 1.6 + vec2(uT * 0.012, uT * 0.004);
          float cl = smoothstep(0.52, 0.86, fbm(vec2(cp.x * 0.7, cp.y * 2.4))) * smoothstep(0.02, 0.3, v.y);
          float lit = smoothstep(-0.2, 0.05, sunE);
          vec3 cc = mix(vec3(0.42, 0.55, 0.85) * 0.9, vec3(1.0, 0.93, 0.84), day) * (0.35 + 0.65 * lit) * (0.85 + 0.4 * max(0.0, mu));
          c = mix(c, cc, cl * 0.28 * lit);
        }
        c = mix(c, c * 0.75, smoothstep(0.0, -0.2, v.y));
        gl_FragColor = vec4(c, uA);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(70000, 64, 32), mat); this.dome.renderOrder = -2; this.dome.frustumCulled = false; scene.add(this.dome);
    // stars
    const N = 3200, pos = new Float32Array(N * 3), mag = new Float32Array(N); let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) { const z = r() * 2 - 1, a = r() * 6.283, q = Math.sqrt(1 - z * z); pos.set([q * Math.cos(a) * 60000, z * 60000, q * Math.sin(a) * 60000], i * 3); mag[i] = Math.pow(r(), 5); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); sg.setAttribute("mag", new THREE.BufferAttribute(mag, 1));
    this.starU = { night: { value: 0 } };
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: this.starU, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      vertexShader: "attribute float mag; varying float m; void main(){ m = mag; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; gl_PointSize = 1.2 + 2.6 * mag; }",
      fragmentShader: "uniform float night; varying float m; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.96, 0.9) * (0.35 + m), (1.0 - smoothstep(0.2, 0.5, d)) * night); }" }));
    this.stars.renderOrder = -1; this.stars.frustumCulled = false; scene.add(this.stars);
    const disc = (inner, outer, col) => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, col[0]); gr.addColorStop(inner, col[1]); gr.addColorStop(outer, col[2]); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const sprite = (tex, add) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false }));
    this.sun = sprite(disc(0.45, 0.5, ["#fffdf6", "#fff6e2", "rgba(255,235,200,.0)"]), true);
    this.glow = sprite(disc(0.08, 0.35, ["rgba(255,245,225,.9)", "rgba(220,230,255,.35)", "rgba(160,190,255,.08)"]), true);
    this.earth = sprite(disc(0.18, 0.6, ["#ffffff", "rgba(140,190,255,.95)", "rgba(80,140,255,.2)"]), true);
    [this.glow, this.sun, this.earth].forEach((x) => { x.renderOrder = -1; x.frustumCulled = false; scene.add(x); });
    const D = 60000, sunR = Math.tan((MARS.sunAngle / 2) * Math.PI / 180) * D;
    this.sun.scale.setScalar(sunR * 2 * 1.4); this.glow.scale.setScalar(sunR * 40); this.earth.scale.setScalar(D * 0.0045);
    this.D = D;
  }
  // dirs in world space (x east, y up, z south). Returns colors for fog and lighting.
  update(camPos, sunW, earthW, dt = 0) {
    this.uni.uT.value += dt;
    this.dome.position.copy(camPos); this.stars.position.copy(camPos);
    this.uni.sunDir.value.copy(sunW);
    this.sun.position.copy(camPos).addScaledVector(sunW, this.D); this.glow.position.copy(this.sun.position);
    this.earth.position.copy(camPos).addScaledVector(earthW, this.D);
    const e = sunW.y, day = THREE.MathUtils.smoothstep(e, -0.14, 0.12), dusk = 1 - THREE.MathUtils.smoothstep(e, 0.0, 0.4);
    this.starU.night.value = 1 - THREE.MathUtils.smoothstep(e, -0.2, -0.02);
    this.sun.visible = this.glow.visible = e > -0.03;
    this.glow.material.opacity = 0.5 + 0.5 * dusk;
    this.earth.visible = earthW.y > 0 && e < -0.06; this.earth.material.opacity = Math.min(1, (-0.06 - e) * 12);
    const hor = new THREE.Color(0.86, 0.64, 0.45).multiplyScalar(0.62 * day + 0.004).lerp(new THREE.Color(0.25, 0.3, 0.42).multiplyScalar(0.25 * day), dusk * 0.3);
    return {
      day, dusk,
      fog: hor,
      sky: new THREE.Color(0.8, 0.6, 0.44).multiplyScalar(day),
      ground: new THREE.Color(0.42, 0.25, 0.16).multiplyScalar(day),
      sunC: new THREE.Color(1, 0.93, 0.84).lerp(new THREE.Color(1, 0.8, 0.62), dusk),
      sunI: 3.1 * THREE.MathUtils.smoothstep(e, -0.02, 0.22) * MARS.sunlight / 0.43
    };
  }
}
