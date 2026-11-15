/* First-person astronaut (EVA mode of Martian Map): suit arms, gloves and the EVA tablet that runs the Martian Map website.
   The suit follows the look of NASA's current EVA suits: white thermal fabric, grey pads, dark rubber grips,
   metal wrist disconnects and a red identification band on the commander's right arm.
   The tablet screen is the real website in an iframe. Each frame its four corners are projected to the screen and the
   iframe gets the matching flat projective transform (CSS matrix3d), so it lines up with the 3D tablet and every click,
   scroll and drag reaches the website exactly as on a normal page. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

function fabricTextures() {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d"), img = g.createImageData(S, S), o = img.data, hgt = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const weave = (Math.sin(x * Math.PI / 2) * Math.sin(y * Math.PI / 2)) * 0.25, quilt = (y % 64 < 3 ? -1 : 0) + (x % 96 < 2 ? -0.6 : 0);
    hgt[y * S + x] = weave + quilt + (Math.random() - 0.5) * 0.06;
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, hx = hgt[y * S + (x + 1) % S] - hgt[y * S + (x - 1 + S) % S], hy = hgt[((y + 1) % S) * S + x] - hgt[((y - 1 + S) % S) * S + x];
    const nx = -hx * 1.5, ny = -hy * 1.5, l = Math.hypot(nx, ny, 1);
    o[i * 4] = (nx / l * 0.5 + 0.5) * 255; o[i * 4 + 1] = (ny / l * 0.5 + 0.5) * 255; o[i * 4 + 2] = (1 / l * 0.5 + 0.5) * 255; o[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}

export class Astronaut {
  constructor(renderer, siteUrl) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.01, 20);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.4); this.sun.position.set(-1, 1, 1); this.scene.add(this.sun);
    this.hemi = new THREE.HemisphereLight(0xc9a07c, 0x6b3f28, 0.8); this.scene.add(this.hemi);
    this.lampFill = new THREE.PointLight(0xfff2e0, 0, 2, 2); this.lampFill.position.set(0, 0.15, 0.05); this.scene.add(this.lampFill);
    const fab = fabricTextures();
    this.M = {
      fabric: new THREE.MeshStandardMaterial({ color: 0xe9e7e2, roughness: 0.88, normalMap: fab, normalScale: new THREE.Vector2(0.45, 0.45) }),
      pad: new THREE.MeshStandardMaterial({ color: 0xa3a6ab, roughness: 0.72, normalMap: fab, normalScale: new THREE.Vector2(0.3, 0.3) }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.55 }),
      metal: new THREE.MeshStandardMaterial({ color: 0xc9cdd3, roughness: 0.3, metalness: 0.85 }),
      ring: new THREE.MeshStandardMaterial({ color: 0x2f5fb8, roughness: 0.35, metalness: 0.6 }),
      red: new THREE.MeshStandardMaterial({ color: 0xc8322b, roughness: 0.7 }),
      case: new THREE.MeshStandardMaterial({ color: 0x2b2e34, roughness: 0.62, metalness: 0.15 }),
      bumper: new THREE.MeshStandardMaterial({ color: 0xe8742c, roughness: 0.6 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.12, metalness: 0.3 }),
      hole: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, blending: THREE.NoBlending, toneMapped: false })
    };
    // A soft sky reflection so the metal rings and tablet read as metal.
    const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}", fragmentShader: "varying vec3 v;void main(){float u=normalize(v).y;gl_FragColor=vec4(mix(vec3(.45,.28,.18),mix(vec3(.85,.64,.46),vec3(.42,.3,.22),max(u,0.)),smoothstep(-.1,.05,u)),1.);}" })));
    this.scene.environment = pm.fromScene(env, 0.04).texture;
    this.right = this.arm(1); this.left = this.arm(-1);
    this.tablet = this.makeTablet();
    this.scene.add(this.right.root, this.left.root, this.right.sleeve, this.left.sleeve, this.tablet);
    this.k = 0; this.target = 0; this.t = 0;
    this.css(siteUrl);
    // Hand poses for the right hand in view space (the left is mirrored): wrist position, finger direction, back-of-hand direction.
    const Q = (f, bk) => { const z = new THREE.Vector3(...f).normalize().negate(), y = new THREE.Vector3(...bk); y.addScaledVector(z, -y.dot(z)).normalize(); const x = new THREE.Vector3().crossVectors(y, z); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
    this.pose = {
      idle: { p: new THREE.Vector3(0.215, -0.265, -0.46), q: Q([-0.22, 0.34, -0.91], [0.14, 0.95, 0.3]) },
      low: { p: new THREE.Vector3(0.22, -0.6, -0.3), q: Q([0, 0.2, -1], [0.2, 1, 0.2]) },
      grip: { p: new THREE.Vector3(0.128, -0.205, -0.292), q: Q([-0.22, 0.9, -0.36], [0.25, 0.12, -0.96]) }
    };
    this.shoulder = new THREE.Vector3(0.34, -0.72, 0.1);
    this.tabPose = { stow: { p: new THREE.Vector3(0, -0.6, -0.2), r: new THREE.Euler(-1.25, 0, 0) }, held: { p: new THREE.Vector3(0, -0.04, -0.3), r: new THREE.Euler(-0.15, 0, 0) } };
  }

  arm(side) {
    const root = new THREE.Group(), M = this.M;
    root.scale.x = side; // the left arm is the right arm mirrored
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
    // sleeve: its own object, stretched each frame from the wrist back to the shoulder (outside the view)
    const sleeve = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.084, 1, 40, 10, true), M.fabric); tube.position.y = 0.5; sleeve.add(tube);
    [0.22, 0.42, 0.62].forEach((d) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.07 + d * 0.026, 0.0065, 10, 40), M.pad); r.rotation.x = Math.PI / 2; r.position.y = d; sleeve.add(r); });
    if (side > 0) { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0735, 0.0755, 0.04, 40, 1, true), M.red); band.position.y = 0.12; sleeve.add(band); }
    // wrist: gauntlet, disconnect ring and bearing
    add(new THREE.CylinderGeometry(0.056, 0.06, 0.07, 40), M.fabric, 0, 0, 0.045, Math.PI / 2);
    add(new THREE.TorusGeometry(0.061, 0.0095, 14, 48), M.metal, 0, 0, 0.082);
    add(new THREE.TorusGeometry(0.058, 0.006, 12, 48), M.ring, 0, 0, 0.096);
    add(new THREE.CylinderGeometry(0.05, 0.055, 0.04, 36), M.pad, 0, 0, 0.006, Math.PI / 2);
    // hand
    const hand = new THREE.Group(); root.add(hand);
    add(new RoundedBoxGeometry(0.09, 0.036, 0.1, 4, 0.016), M.fabric, 0, 0, -0.055, 0, 0, 0, hand);
    add(new RoundedBoxGeometry(0.075, 0.013, 0.07, 4, 0.006), M.pad, 0, 0.02, -0.05, 0, 0, 0, hand);
    add(new RoundedBoxGeometry(0.082, 0.012, 0.016, 4, 0.005), M.pad, 0, 0.017, -0.098, 0, 0, 0, hand);
    add(new RoundedBoxGeometry(0.08, 0.009, 0.08, 4, 0.004), M.rubber, 0, -0.019, -0.056, 0, 0, 0, hand);
    const fingers = [], F = [[-0.03, [0.034, 0.024, 0.02], 0.0108], [-0.01, [0.038, 0.026, 0.021], 0.011], [0.01, [0.035, 0.024, 0.02], 0.0105], [0.03, [0.028, 0.019, 0.017], 0.0095]];
    const seg = (len, r, mat) => { const g = new THREE.CapsuleGeometry(r, len, 5, 14); g.rotateX(-Math.PI / 2); g.translate(0, 0, -len / 2); return new THREE.Mesh(g, mat); };
    F.forEach(([x, lens, r], fi) => {
      let parent = new THREE.Group(); parent.position.set(x, 0.002, -0.104); parent.rotation.y = (x * 6); hand.add(parent);
      const joints = [];
      lens.forEach((L, si) => {
        const j = si === 0 ? parent : new THREE.Group();
        if (si > 0) { j.position.set(0, 0, -lens[si - 1]); parent.add(j); }
        const m = seg(L, r * (1 - si * 0.07), si === 2 ? M.rubber : M.fabric); j.add(m);
        if (si === 0) { const k = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 14, 10), M.pad); k.position.set(0, 0.004, 0); j.add(k); }
        joints.push(j); parent = j;
      });
      fingers.push(joints);
    });
    const tb = new THREE.Group(); tb.position.set(-0.046, -0.006, -0.03); tb.rotation.set(-0.25, 0.75, 0.25); hand.add(tb);
    const t1 = seg(0.034, 0.0125, M.fabric); tb.add(t1);
    const tj = new THREE.Group(); tj.position.set(0, 0, -0.034); tb.add(tj); tj.add(seg(0.026, 0.0115, M.rubber));
    return { root, hand, fingers, thumb: [tb, tj], sleeve, side };
  }

  makeTablet() {
    const g = new THREE.Group(), M = this.M;
    const W = 0.3, H = 0.205;
    const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, 0.018, 5, 0.012), M.case); g.add(body);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const b = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.03, 0.024, 4, 0.008), M.bumper); b.position.set(sx * (W / 2 - 0.006), sy * (H / 2 - 0.006), 0); g.add(b); });
    [-1, 1].forEach((sx) => { const grip = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.09, 0.02, 4, 0.005), M.rubber); grip.position.set(sx * (W / 2 + 0.002), 0, 0); g.add(grip); });
    // label strip on the top bezel
    const c = document.createElement("canvas"); c.width = 512; c.height = 32; const x = c.getContext("2d");
    x.fillStyle = "#2b2e34"; x.fillRect(0, 0, 512, 32); x.fillStyle = "#c9ccd2"; x.font = "600 18px sans-serif"; x.textAlign = "center"; x.fillText("MARTIAN MAP  ·  EVA PAD 01", 256, 22);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.01), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), toneMapped: false }));
    lab.position.set(0, H / 2 - 0.0085, 0.0092); g.add(lab);
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 12), new THREE.MeshBasicMaterial({ color: 0x48ff9a, toneMapped: false })); led.position.set(W / 2 - 0.04, H / 2 - 0.0085, 0.0093); g.add(led);
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(0.272, 0.17), M.glass); this.screen.position.set(0, -0.004, 0.0092); g.add(this.screen);
    g.visible = false;
    return g;
  }

  css(siteUrl) {
    const el = document.createElement("div"); el.id = "tablet-layer"; el.style.visibility = "hidden"; document.body.appendChild(el);
    const wrap = document.createElement("div"); wrap.className = "tab-screen";
    wrap.innerHTML = `<div class="tab-boot"><b>MARTIAN MAP</b><span>EVA PAD · loading NASA data</span></div><iframe title="Martian Map on the EVA tablet" allow="clipboard-write; fullscreen"></iframe><i class="tab-glare"></i>`;
    el.appendChild(wrap);
    this.layer = el; this.iframe = wrap.querySelector("iframe"); this.wrap = wrap;
    this.iframe.addEventListener("load", () => { if (this.iframe.src && this.iframe.src !== "about:blank") wrap.classList.add("ready"); });
    if (siteUrl) this.load(siteUrl);
    this.SW = 1280; this.SH = 800; // CSS pixels of the tablet page (a 16:10 tablet)
  }
  // Projective transform taking the page rectangle (0,0)-(SW,SH) onto four screen points (TL, TR, BR, BL), as CSS matrix3d.
  homography(p) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p, W = this.SW, H = this.SH;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9, g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
    const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
    const m = [a / W, d / W, 0, g / W, b / H, e / H, 0, h / H, 0, 0, 1, 0, c, f, 0, 1];
    return `matrix3d(${m.map((v) => +v.toFixed(9)).join(",")})`;
  }
  // Point the tablet at the website.
  load(url) { const h = this.wrap.querySelector(".tab-help"); if (h) h.remove(); this.wrap.classList.remove("ready"); this.iframe.src = url; }
  // Show a message on the tablet screen instead of the website (used when the website can't be found).
  help(html) {
    let h = this.wrap.querySelector(".tab-help");
    if (!h) { h = document.createElement("div"); h.className = "tab-help"; this.wrap.insertBefore(h, this.iframe); }
    h.innerHTML = html; this.wrap.classList.remove("ready"); return h;
  }
  resize() { this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); }
  open(v) { this.target = v ? 1 : 0; }
  get isOpen() { return this.k > 0.999 && this.target === 1; }

  // motion: { speed, phase, airborne, land } ; light: sun direction in view space, colors, lamp
  update(dt, motion, light) {
    this.t += dt;
    const sp = 1 / 1.1; this.k = this.target === 1 ? Math.min(1, this.k + dt * sp) : Math.max(0, this.k - dt * sp * 1.3); // move toward the target, never past it
    const k = this.k, a = Math.min(1, k / 0.35), b = Math.max(0, (k - 0.35) / 0.65), ea = ease(a), eb = ease(b);
    const P = this.pose, br = Math.sin(this.t * 1.6) * 0.004, sw = Math.sin(motion.phase * Math.PI) * Math.min(1, motion.speed) * 0.018;
    const bob = new THREE.Vector3(0, br + Math.abs(Math.cos(motion.phase * Math.PI)) * Math.min(1, motion.speed) * -0.01 - motion.land * 0.05, 0);
    [[this.right, 1], [this.left, -1]].forEach(([arm, s]) => {
      const p = new THREE.Vector3(), q = new THREE.Quaternion();
      if (k <= 0.35) { p.lerpVectors(P.idle.p, P.low.p, ea); q.slerpQuaternions(P.idle.q, P.low.q, ea); }
      else { p.lerpVectors(P.low.p, P.grip.p, eb); q.slerpQuaternions(P.low.q, P.grip.q, eb); }
      p.add(bob); p.z += (1 - k) * s * sw; p.y += (1 - k) * (motion.airborne ? 0.03 : 0);
      // mirror the right-hand pose for the left hand
      arm.root.position.set(p.x * s, p.y, p.z);
      arm.root.quaternion.set(q.x, q.y * s, q.z * s, q.w);
      // sleeve from shoulder to wrist
      const wrist = new THREE.Vector3(0, 0, 0.1).applyQuaternion(arm.root.quaternion).multiply(new THREE.Vector3(s, 1, 1)).add(arm.root.position);
      const sh = this.shoulder.clone().multiply(new THREE.Vector3(s, 1, 1)).add(bob.clone().multiplyScalar(0.5)), d = new THREE.Vector3().subVectors(wrist, sh);
      arm.sleeve.position.copy(sh); arm.sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); arm.sleeve.scale.set(1, d.length(), 1);
      // keep rings and the ID band their real thickness while the sleeve stretches
      arm.sleeve.children.forEach((c, i) => { if (i > 0) c.scale.set(1, 1 / Math.max(0.2, d.length()), 1); });
      // fingers relax when idle and wrap round the tablet edge when holding it
      const curl = lerp(0.3 + 0.05 * Math.sin(this.t * 0.9 + s), -0.05, eb);
      arm.fingers.forEach((j, fi) => j.forEach((jj, si) => (jj.rotation.x = -(curl * (si === 0 ? 0.65 : 1.0) + fi * 0.05))));
      arm.thumb[0].rotation.x = lerp(-0.25, -0.05, eb); arm.thumb[1].rotation.x = lerp(-0.2, -0.35, eb);
    });
    const T = this.tabPose, tk = eb;
    this.tablet.visible = k > 0.3;
    this.tablet.position.lerpVectors(T.stow.p, T.held.p, tk).add(bob.clone().multiplyScalar(0.6 - 0.45 * tk)); // held steadier, so it stays easy to tap
    this.tablet.rotation.set(lerp(T.stow.r.x, T.held.r.x, tk), 0, 0);
    // lighting follows the sky
    this.sun.position.copy(light.sunView).multiplyScalar(5); this.sun.intensity = light.sunI; this.sun.color.copy(light.sunC);
    this.hemi.color.copy(light.sky); this.hemi.groundColor.copy(light.ground); this.hemi.intensity = light.hemiI; this.hemi.position.copy(light.upView);
    this.lampFill.intensity = light.lamp ? 0.6 : 0;
    this.scene.traverse((o) => { if (o.material && o.material.envMapIntensity !== undefined) o.material.envMapIntensity = light.env; });
    // the live website appears once the tablet is up
    const ready = k > 0.98 && this.target === 1;
    this.screen.material = ready ? this.M.hole : this.M.glass;
    const show = k > 0.6; this.layer.style.visibility = show ? "visible" : "hidden";
    this.wrap.classList.toggle("on", ready);
    if (show) {
      this.scene.updateMatrixWorld(); this.cam.updateMatrixWorld();
      const m = this.screen.matrixWorld, w = 0.136, h = 0.085, v = new THREE.Vector3();
      const pts = [[-w, h], [w, h], [w, -h], [-w, -h]].map(([x, y]) => { v.set(x, y, 0).applyMatrix4(m).project(this.cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
      this.wrap.style.transform = this.homography(pts);
    }
  }
  render() { this.renderer.render(this.scene, this.cam); }
}
