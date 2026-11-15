/* Things on the ground besides rocks: Perseverance and its real wheel tracks, your planned route, and your EVA partner.
   - Tracks follow NASA/JPL's end-of-drive positions (js/m20-traverse.js). Between two positions the rover's exact path
     isn't recorded, so the track is drawn straight between them.
   - The rover is a simplified model at its last known position, at Perseverance's real size (about 3 m long, 2.7 m wide,
     2.2 m to the top of the mast).
   - The route comes from Directions on the map: a glowing line on the ground and a light beacon at each stop.
   - NASA plans Mars EVAs, like ISS spacewalks, for two crew together; EV2 walks with you. */
import * as THREE from "three";
import { curveMaterial } from "./terrain.js";
import { createAstronautAvatar } from "./ares/models.js";

const canvasTex = (w, h, paint) => { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// A ribbon of quads that hugs the ground along a polyline (x, z points), sampled every `step` metres.
function ribbon(line, widths, ground, step, lift) {
  const pos = [], uv = [], idx = []; let along = 0, base = 0;
  for (let s = 0; s < line.length - 1; s++) {
    const a = line[s], b = line[s + 1], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz); if (len < 0.01) continue;
    const nx = -dz / len, nz = dx / len, n = Math.max(1, Math.ceil(len / step));
    for (let i = 0; i <= n; i++) {
      if (s > 0 && i === 0) continue;
      const t = i / n, x = a.x + dx * t, z = a.z + dz * t, d = along + len * t;
      widths.forEach(([o0, o1], w) => {
        [o0, o1].forEach((o, side) => { const px = x + nx * o, pz = z + nz * o; pos.push(px, ground.height(px, pz, 0) + lift, pz); uv.push(side, d); });
      });
    }
    along += len;
  }
  const per = widths.length * 2, rows = pos.length / 3 / per;
  for (let r = 0; r < rows - 1; r++) for (let w = 0; w < widths.length; w++) { const i = base + r * per + w * 2, j = i + per; idx.push(i, j, i + 1, i + 1, j, j + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ---------- Perseverance's wheel tracks and the rover ---------- */
export function roverTracks(scene, ground, pts, toXZ, near = 1800) {
  // keep the parts of the traverse within `near` metres of the start
  const runs = []; let cur = [];
  pts.forEach((p) => { const q = toXZ(p[1], p[2]), ok = Math.hypot(q.x, q.z) < near; if (ok) cur.push(q); else if (cur.length) { runs.push(cur); cur = []; } });
  if (cur.length) runs.push(cur);
  const tex = canvasTex(32, 64, (g, w, h) => { g.fillStyle = "rgba(60,36,22,.28)"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(40,22,14,.34)"; for (let y = 0; y < h; y += 8) g.fillRect(2, y, w - 4, 3); });
  const mat = curveMaterial(new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  tex.repeat.set(1, 1 / 0.45);
  const out = [];
  runs.filter((r) => r.length > 1).forEach((r) => { const m = new THREE.Mesh(ribbon(r, [[-1.25, -0.95], [0.95, 1.25]], ground, 1, 0.02), mat); m.receiveShadow = true; m.frustumCulled = false; scene.add(m); out.push(m); });
  return out;
}
export function rover(scene, ground, x, z, heading) {
  const g = new THREE.Group(), M = (c, r = 0.6, m = 0.1) => curveMaterial(new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }));
  const white = M(0xd9d5cc, 0.55), grey = M(0x6d6a66, 0.6, 0.3), dark = M(0x2a2826, 0.7), gold = M(0xc9a24a, 0.35, 0.8), al = M(0xb8b6b0, 0.4, 0.7);
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  box(2.0, 0.42, 1.6, white, 0, 1.0, 0); box(1.9, 0.08, 1.5, gold, 0, 1.25, 0); // body and deck
  box(0.5, 0.5, 0.55, dark, 0, 1.0, 1.05).rotation.x = -0.35; // nuclear power source (MMRTG) at the back
  for (let i = 0; i < 6; i++) {
    const sx = i < 3 ? -1 : 1, k = i % 3, w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 20), al);
    w.rotation.z = Math.PI / 2; w.position.set(sx * 1.25, 0.26, -0.95 + k * 0.95); w.castShadow = true; g.add(w);
    box(0.06, 0.55, 0.06, grey, sx * 1.05, 0.62, -0.95 + k * 0.95); // suspension legs
  }
  box(0.08, 0.06, 2.0, grey, -1.05, 0.88, 0); box(0.08, 0.06, 2.0, grey, 1.05, 0.88, 0); // rocker-bogie beams
  const mast = box(0.1, 1.0, 0.1, white, 0.55, 1.75, -0.55); box(0.42, 0.22, 0.24, white, 0.55, 2.28, -0.55); box(0.3, 0.07, 0.04, dark, 0.55, 2.28, -0.68); // remote sensing mast and head
  box(0.09, 0.09, 1.3, white, -0.7, 1.1, -1.25).rotation.y = 0.5; // robotic arm, stowed
  mast.castShadow = true;
  g.position.set(x, ground.height(x, z, 0), z); g.rotation.y = heading;
  scene.add(g); return g;
}

/* ---------- your planned route ---------- */
export class RoutePath {
  constructor(scene, ground, pts) {
    this.pts = pts; // [{x, z, lat, lon}]
    const tex = canvasTex(16, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,138,61,0)"); gr.addColorStop(0.5, "rgba(255,170,100,1)"); gr.addColorStop(1, "rgba(255,138,61,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h * 0.62); });
    this.tex = tex; tex.repeat.set(1, 1 / 1.6);
    const mat = curveMaterial(new THREE.MeshBasicMaterial({ map: tex, color: 0x9a6438, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    this.line = new THREE.Mesh(ribbon(pts, [[-0.16, 0.16]], ground, 0.75, 0.05), mat); this.line.frustumCulled = false; this.line.renderOrder = 2; scene.add(this.line);
    // beacons: tall soft light columns at each stop, easy to see from a distance
    const bt = canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(255,190,120,.9)"); gr.addColorStop(1, "rgba(255,150,80,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    this.beacons = pts.map((p, i) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 40, 12, 1, true).translate(0, 20, 0), curveMaterial(new THREE.MeshBasicMaterial({ map: bt, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false })));
      m.position.set(p.x, ground.height(p.x, p.z, 0), p.z); m.frustumCulled = false; m.renderOrder = 3; scene.add(m); return m;
    });
    this.next = 1; this.done = false;
  }
  update(dt, x, z) {
    this.tex.offset.y -= dt * 0.8; // light flowing along the path, toward the next stop
    this.beacons.forEach((b, i) => { b.material.opacity = i === this.next ? 0.95 : i < this.next ? 0.18 : 0.45; b.scale.x = b.scale.z = i === this.next ? 1 + 0.15 * Math.sin(performance.now() / 300) : 1; });
    if (this.done) return null;
    const p = this.pts[this.next], d = Math.hypot(p.x - x, p.z - z);
    if (d < 6) { const reached = this.next; this.next++; if (this.next >= this.pts.length) { this.done = true; this.next = this.pts.length - 1; } return { reached, last: this.done }; }
    return null;
  }
  // distance along the route still to walk, from (x, z)
  remaining(x, z) {
    const P = this.pts; if (this.done) return 0;
    let d = Math.hypot(P[this.next].x - x, P[this.next].z - z);
    for (let i = this.next; i < P.length - 1; i++) d += Math.hypot(P[i + 1].x - P[i].x, P[i + 1].z - P[i].z);
    return d;
  }
}

/* ---------- EV2, your EVA partner ---------- */
export class Buddy {
  constructor(scene, ground) {
    this.g = ground; const root = new THREE.Group(); this.root = root;
    const M = (c, r = 0.85, m = 0) => curveMaterial(new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }));
    const suit = M(0xe8e6e1), pad = M(0xa9abb0, 0.7), dark = M(0x2b2d31, 0.6), visor = M(0xd8a23a, 0.15, 1), red = M(0xc8322b, 0.7);
    const cap = (r, l, m) => { const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m); x.castShadow = true; return x; };
    const torso = cap(0.24, 0.45, suit); torso.position.y = 1.25; root.add(torso);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.26), pad); pack.position.set(0, 1.32, 0.3); pack.castShadow = true; root.add(pack); // life-support backpack
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), suit); helmet.position.y = 1.78; helmet.castShadow = true; root.add(helmet);
    const vis = new THREE.Mesh(new THREE.SphereGeometry(0.205, 24, 16, Math.PI * 1.12, Math.PI * 0.76, Math.PI * 0.3, Math.PI * 0.42), visor); vis.position.set(0, 1.78, -0.02); root.add(vis);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20, 1, true), red); band.position.set(0, 1.28, 0); band.scale.set(1.45, 1, 1.1); root.add(band); // EV2 stripe
    const limb = (x, y, len, r, m) => { const p = new THREE.Group(); p.position.set(x, y, 0); const c = cap(r, len, m); c.position.y = -len / 2 - r * 0.5; p.add(c); root.add(p); return p; };
    this.legL = limb(-0.13, 0.95, 0.62, 0.11, suit); this.legR = limb(0.13, 0.95, 0.62, 0.11, suit);
    this.armL = limb(-0.33, 1.5, 0.48, 0.085, suit); this.armR = limb(0.33, 1.5, 0.48, 0.085, suit);
    [this.legL, this.legR].forEach((l) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.32), dark); b.position.set(0, -0.86, -0.05); b.castShadow = true; l.add(b); });
    scene.add(root);
    this.x = 3; this.z = 2; this.vx = 0; this.vz = 0; this.phase = 0; this.yaw = 0; this.y = 0; this.vy = 0;
  }
  // follow about 3 m to your right and a little behind, walking in Mars gravity
  update(dt, S, g) {
    const rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw), bx = Math.sin(S.yaw), bz = Math.cos(S.yaw);
    const tx = S.x + rx * 3 + bx * 1.2, tz = S.z + rz * 3 + bz * 1.2, dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    const want = d < 0.6 ? 0 : Math.min(2.2, d * 0.9), ax = (d > 0 ? dx / d : 0) * want - this.vx, az = (d > 0 ? dz / d : 0) * want - this.vz, al = Math.hypot(ax, az), lim = 0.62 * g * dt;
    if (al > 0) { this.vx += ax / al * Math.min(al, lim); this.vz += az / al * Math.min(al, lim); }
    if (d > 60) { this.x = tx; this.z = tz; this.vx = this.vz = 0; }
    this.x += this.vx * dt; this.z += this.vz * dt;
    const sp = Math.hypot(this.vx, this.vz), gy = this.g.height(this.x, this.z, 0);
    // loping hops above the walk-run transition, like you
    if (this.y <= gy + 0.001 && sp > 1.29 && this.vy <= 0) this.vy = 0.85;
    this.vy -= g * dt; this.y = Math.max(gy, this.y + this.vy * dt); if (this.y === gy) this.vy = Math.max(0, this.vy);
    this.phase += sp * dt / (sp > 1.29 ? 1.35 : 0.72);
    if (sp > 0.2) { const t = Math.atan2(-this.vx, -this.vz), dy = ((t - this.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; this.yaw += Math.max(-dt * 3, Math.min(dt * 3, dy)); }
    const sw = Math.sin(this.phase * Math.PI) * Math.min(1, sp) * 0.55;
    this.legL.rotation.x = sw; this.legR.rotation.x = -sw; this.armL.rotation.x = -sw * 0.6; this.armR.rotation.x = sw * 0.6;
    this.root.position.set(this.x, this.y, this.z); this.root.rotation.y = this.yaw;
    return { d: Math.hypot(this.x - S.x, this.z - S.z), sp };
  }
}

/* ---------- the ARES suit, animated: used for you in third person and for EV2 ---------- */
// Feeds a suit avatar the walking state it needs (speed in its own frame, stride phase, slope, landing...).
export class SuitFigure {
  constructor(scene, ground, groundAt) {
    this.a = createAstronautAvatar(new THREE.Vector3(0, 1, 0)); scene.add(this.a.root);
    this.a.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.g = ground; this.at = groundAt; this.phase = 0; this.prevFwd = 0; this.acc = 0; this.yaw = 0; this.prevYaw = 0; this.t = 0;
  }
  set visible(v) { this.a.root.visible = v; }
  get visible() { return this.a.root.visible; }
  pose(dt, x, y, z, yaw, vx, vy, vz, grounded, pitch, land, lamp) {
    this.t += dt;
    const a = this.a, s = Math.sin(yaw), c = Math.cos(yaw), fx = -s, fz = -c, rx = c, rz = -s;
    const lf = vx * fx + vz * fz, lr = vx * rx + vz * rz, sp = Math.hypot(vx, vz);
    this.acc += (Math.max(-18, Math.min(18, (lf - this.prevFwd) / Math.max(dt, 1e-3))) - this.acc) * Math.min(1, dt * 10); this.prevFwd = lf;
    if (grounded && sp > 0.12) this.phase += (sp * dt / 1.42) * Math.PI * 2;
    else if (grounded) this.phase += (Math.round(this.phase / Math.PI) * Math.PI - this.phase) * Math.min(1, dt * 10);
    const turn = dt > 0 ? (((yaw - this.prevYaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) / dt : 0; this.prevYaw = yaw;
    const slope = (this.g.height(x + fx * 0.35, z + fz * 0.35, 0) - this.g.height(x - fx * 0.35, z - fz * 0.35, 0)) / 0.7;
    a.root.position.set(x, y, z); a.root.rotation.y = yaw;
    a.setJetpackPlumes(0, dt);
    a.updateAnimation({ elapsed: this.t, dt, speed: sp, localFwd: lf, localRight: lr, wishFwd: sp > 0.1 ? lf / sp : 0, wishRight: sp > 0.1 ? lr / sp : 0, verticalVel: vy, walkPhase: this.phase, grounded, jetpackActive: false, rcsThrottle: 0, pitch: pitch || 0, landingSquash: land || 0, groundSlopeFwd: slope, accelFwd: this.acc, climbing: false, climbPhase: 0, climbHeightNorm: 0, climbLeadSide: 1, turnRate: turn, stepLift: 0, visible: a.root.visible });
    if (a.helmetLamp) a.helmetLamp.intensity = lamp ? 40 : 0;
  }
  light(sunDir, day, tw) { this.a.updateSunLighting(sunDir, day, tw); }
}

/* EV2: walks your path a few metres behind and to one side, the way EVA partners keep each other in view.
   It follows the trail you actually walked (so it doesn't swing round when you only turn your head), keeps a
   comfortable 2.5 to 4 m gap, uses the same Mars-gravity gait as you, steps round rocks and faces you when you stop. */
export class AvatarBuddy {
  constructor(scene, ground, groundAt, rocks) {
    this.fig = new SuitFigure(scene, ground, groundAt); this.g = ground; this.at = groundAt; this.rocks = rocks;
    this.x = 2.5; this.z = 2.5; this.y = ground.height(2.5, 2.5, 0); this.vx = this.vz = this.vy = 0; this.yaw = 0; this.trail = []; this.grounded = true;
  }
  get root() { return this.fig.a.root; }
  update(dt, S, g, lamp) {
    if (dt <= 0) { this.fig.pose(0, this.x, this.y, this.z, this.yaw, 0, 0, 0, true, 0, 0, lamp); return { d: Math.hypot(this.x - S.x, this.z - S.z), sp: 0 }; }
    // breadcrumbs of where you walked
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(S.x - last.x, S.z - last.z) > 0.5) { this.trail.push({ x: S.x, z: S.z }); if (this.trail.length > 80) this.trail.shift(); }
    const dist = Math.hypot(this.x - S.x, this.z - S.z);
    if (dist > 60) { this.x = S.x + 2.5; this.z = S.z + 2.5; this.y = this.at(this.x, this.z); this.trail.length = 0; }
    // slot: about 3.2 m back along your trail, 1.6 m to the side of your direction of travel
    let tx = this.x, tz = this.z, back = 0;
    for (let i = this.trail.length - 1; i > 0; i--) { const a = this.trail[i], b = this.trail[i - 1], l = Math.hypot(a.x - b.x, a.z - b.z); if (back + l >= 3.2) { const k = (3.2 - back) / l; tx = a.x + (b.x - a.x) * k; tz = a.z + (b.z - a.z) * k; const dx = a.x - b.x, dz = a.z - b.z; tx += (-dz / l) * -1.6; tz += (dx / l) * -1.6; back = -1; break; } back += l; }
    const moving = Math.hypot(S.vx, S.vz) > 0.2;
    if (back !== -1 || (!moving && dist < 4)) { tx = this.x; tz = this.z; }
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    const yourSp = Math.hypot(S.vx, S.vz), want = d < 0.4 ? 0 : Math.min(2.3, yourSp + d * 0.6);
    let ax = (d > 0 ? dx / d : 0) * want - this.vx, az = (d > 0 ? dz / d : 0) * want - this.vz;
    const al = Math.hypot(ax, az), lim = 0.62 * g * dt; if (al > lim) { ax *= lim / al; az *= lim / al; }
    if (this.grounded) { this.vx += ax; this.vz += az; }
    // keep personal space from you
    if (dist < 1.6 && dist > 0.01) { this.vx += (this.x - S.x) / dist * 1.5 * dt; this.vz += (this.z - S.z) / dist * 1.5 * dt; }
    let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    if (this.rocks) for (const r of this.rocks.near4(nx, nz)) { if (r.top < this.y + 0.32) continue; const ex = nx - r.x, ez = nz - r.z, e = Math.hypot(ex, ez), m = r.r + 0.32; if (e < m && e > 1e-4) { nx = r.x + ex / e * m; nz = r.z + ez / e * m; } }
    this.x = nx; this.z = nz;
    const sp = Math.hypot(this.vx, this.vz), gy = this.at(this.x, this.z);
    const hs = Math.floor(this.fig.phase / Math.PI); if (this.grounded && sp > 1.29 && hs !== this.hs) { this.vy = 0.85; this.grounded = false; } this.hs = hs; // lope hops, like yours
    this.vy -= g * dt; this.y += this.vy * dt;
    if (this.y <= gy) { this.y = gy; this.vy = 0; this.grounded = true; } else if (this.y > gy + 0.05) this.grounded = false;
    // face where it walks, or you when stopped
    const face = sp > 0.25 ? Math.atan2(-this.vx, -this.vz) : Math.atan2(-(S.x - this.x), -(S.z - this.z));
    const dy = ((face - this.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; this.yaw += Math.max(-dt * 2.6, Math.min(dt * 2.6, dy));
    this.fig.pose(dt, this.x, this.y, this.z, this.yaw, this.vx, this.vy, this.vz, this.grounded, 0, 0, lamp);
    return { d: dist, sp };
  }
}
