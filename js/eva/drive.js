/* Rover driving. The rover is the Perseverance-class six-wheel rover from the ARES recon build (rocker-bogie
   suspension, corner-wheel steering, mast and arm). Physics is worked out from forces on the ground under each wheel:
   - Weight on Mars: m·g with g = 3.721 m/s² (NASA Mars Fact Sheet); mass 1,025 kg (Perseverance, NASA/JPL).
   - Grip: drive force can't exceed μ·N. Beyond that the wheels spin and the rover slips (shown as slip %).
   - Rolling resistance Crr·N and sinkage depend on the ground: loose sand in ripple fields (where Spirit and
     Opportunity got stuck), dusty regolith, rocky crater ejecta, or bare bedrock on steep slopes.
   - Slopes pull along the ground at g·sin(slope). The rover tips if pitch or roll goes past 45° (its design limit);
     the helmet display warns from 25°, the steepest NASA lets Perseverance drive on purpose.
   - Rocks up to about one wheel diameter are climbed by the wheels (the body pitches and rolls over them); bigger
     ones are obstacles. */
import * as THREE from "three";
import { buildMarsRover } from "./ares/roverBuilder.js";
import { createProceduralTextures } from "./ares/textures.js";

export const SURFACES = {
  regolith: { name: "Dusty regolith", mu: 0.55, crr: 0.08, sink: 0.02, dust: 1 },
  sand: { name: "Loose sand (ripples)", mu: 0.32, crr: 0.24, sink: 0.07, dust: 1.8 },
  rocky: { name: "Rocky ejecta", mu: 0.72, crr: 0.13, sink: 0.005, dust: 0.5, bump: 1 },
  bedrock: { name: "Bedrock", mu: 0.8, crr: 0.04, sink: 0, dust: 0.3 },
  // Ice at -100 °C or colder is much less slippery than ice near 0 °C on Earth, but still less grippy than rock.
  ice: { name: "Dusty ice", mu: 0.3, crr: 0.03, sink: 0, dust: 0.15 }
};
// force: the most the motors can push, as an acceleration (m/s²). 2.4 lets the rover climb about 30° slopes where the
// ground grips (Perseverance is rated for 30°), while loose regolith and sand slip first.
export const PROFILES = {
  crew: { name: "Crew rover speeds (up to 14 km/h, like Apollo's lunar rover)", vmax: 3.9, force: 2.4 },
  real: { name: "Perseverance's real top speed (0.15 km/h)", vmax: 0.042, force: 2.4 }
};
const M = 1025, G = 3.721, TIP = 45 * Math.PI / 180;
const tmp = new THREE.Vector3(), n1 = new THREE.Vector3(), fw = new THREE.Vector3(), rt = new THREE.Vector3(), up = new THREE.Vector3(), mtx = new THREE.Matrix4(), qt = new THREE.Quaternion();

export class Rover {
  constructor(scene, ground, groundAt, rocks) {
    this.g = ground; this.at = groundAt; this.rocks = rocks;
    this.rig = buildMarsRover(createProceduralTextures(8), false);
    this.rig.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(this.rig.root);
    this.s = { x: 0, z: 0, y: 0, heading: 0, v: 0, vLat: 0, w: 0, steer: 0, spin: 0, slip: 0, odo: 0, battery: 100, pitch: 0, roll: 0, tipped: false, surface: SURFACES.regolith, slope: 0, bounce: 0, bounceV: 0 };
    this.wh = new Float32Array(6); this.cam = "chase"; this.orbit = 0; this.camPos = new THREE.Vector3(); this.lights = false;
  }
  place(x, z, heading) { const s = this.s; s.x = x; s.z = z; s.heading = heading; s.v = s.vLat = s.w = 0; s.tipped = false; this.update(0, {}); this.rig.root.quaternion.copy(qt); }
  get pos() { return this.rig.root.position; }
  update(dt, keys, profile = PROFILES.crew) {
    const s = this.s, r = this.rig;
    const fx = -Math.sin(s.heading), fz = -Math.cos(s.heading), rx = Math.cos(s.heading), rz = -Math.sin(s.heading);
    const surf = this.g.surface(s.x, s.z), S = SURFACES[surf.type]; s.surface = S; s.surfaceType = surf.type;
    // slope along the rover and across it
    const hF = this.g.height(s.x + fx * 1.4, s.z + fz * 1.4, 0), hB = this.g.height(s.x - fx * 1.4, s.z - fz * 1.4, 0);
    const slopeF = Math.atan2(hF - hB, 2.8); s.slope = surf.slope;
    const N = M * G * Math.cos(Math.min(1.2, surf.slope * Math.PI / 180));
    if (dt > 0 && !s.tipped) {
      const thr = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
      const turn = (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) - (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
      const brake = keys.has("Space");
      // motors: force up to profile limit, fading out toward top speed; traction caps it at μN
      const vmax = profile.vmax * (thr < 0 ? 0.5 : 1), want = thr * vmax;
      let Fd = Math.abs(thr) > 0 ? Math.sign(want - s.v) * Math.min(1, Math.abs(want - s.v) / Math.max(0.02, vmax * 0.25)) * M * profile.force : 0;
      const grip = S.mu * N, demand = Math.abs(Fd);
      s.slip += ((demand > grip ? (demand - grip) / demand * 100 : 0) + Math.abs(s.vLat) * 12 - s.slip) * Math.min(1, dt * 5);
      if (demand > grip) Fd = Math.sign(Fd) * grip;
      const Fg = -M * G * Math.sin(slopeF), Frr = -Math.sign(s.v) * Math.min(Math.abs(s.v) * M / Math.max(dt, 1e-3), S.crr * N);
      const Fb = brake ? -Math.sign(s.v) * Math.min(Math.abs(s.v) * M / Math.max(dt, 1e-3), grip) : 0;
      // hold position on gentle slopes when idle (motors brake), roll back on steep ones where grip fails
      const hold = !thr && Math.abs(s.v) < 0.05 && Math.abs(Fg) < grip ? -Fg : 0;
      s.v += (Fd + Fg + Frr + Fb + hold) / M * dt;
      // sideways: slopes push the rover sideways, tyres resist up to their grip
      const slopeR = Math.atan2(this.g.height(s.x + rx * 1.3, s.z + rz * 1.3, 0) - this.g.height(s.x - rx * 1.3, s.z - rz * 1.3, 0), 2.6);
      s.vLat += -G * Math.sin(slopeR) * dt; s.vLat *= Math.exp(-dt * 7 * S.mu);
      // corner-wheel steering; turns on the spot when stopped
      s.steer += (turn * 0.5 - s.steer) * Math.min(1, dt * 6);
      const turnFactor = Math.abs(s.v) > 0.05 ? Math.sign(s.v) * Math.min(1, Math.abs(s.v) / (profile.vmax * 0.6)) : 0.35;
      s.w += (s.steer * turnFactor * (profile === PROFILES.real ? 0.25 : 1.1) - s.w) * Math.min(1, dt * 8);
      s.heading += s.w * dt;
    } else if (dt > 0) { s.v *= Math.exp(-dt * 3); s.vLat = 0; s.w = 0; }
    // move, then push out of rocks too big to climb (taller than about one wheel diameter)
    let nx = s.x + (fx * s.v + rx * s.vLat) * dt, nz = s.z + (fz * s.v + rz * s.vLat) * dt;
    if (this.rocks) for (let a = -1; a <= 1; a += 2) {
      const cx = nx + fx * 0.9 * a, cz = nz + fz * 0.9 * a, gy = this.g.height(cx, cz, 0);
      for (const o of this.rocks.near4(cx, cz)) {
        if (o.top - gy < 0.8) continue;
        const dx = cx - o.x, dz = cz - o.z, d = Math.hypot(dx, dz), m = o.r + 1.25;
        if (d < m && d > 1e-4) { nx += dx / d * (m - d); nz += dz / d * (m - d); const vn = (fx * dx + fz * dz) / d * s.v; if (vn < 0) { const hit = Math.abs(s.v); s.v *= -0.2; s.bounceV -= Math.min(1.5, hit * 0.4); this.hit = hit; } }
      }
    }
    const moved = Math.hypot(nx - s.x, nz - s.z); s.x = nx; s.z = nz; s.odo += moved;
    s.battery = Math.max(0, Math.min(100, s.battery - Math.abs(s.v) * 0.0025 * dt * (1 + s.slip / 50) + 0.0006 * dt)); // drive draw vs MMRTG trickle
    s.spin -= (s.v * (1 + s.slip / 100)) / 0.42 * dt;
    // wheels on the ground (rocks included): body follows the plane through the six contact points
    const W = r.wheels, wh = this.wh;
    for (let i = 0; i < W.length; i++) { const o = W[i].localOffset; wh[i] = this.at(s.x + rx * o.x - fx * o.z, s.z + rz * o.x - fz * o.z); }
    const avg = (wh[0] + wh[1] + wh[2] + wh[3] + wh[4] + wh[5]) / 6, left = (wh[0] + wh[1] + wh[2]) / 3, right = (wh[3] + wh[4] + wh[5]) / 3, front = (wh[0] + wh[3]) / 2, rear = (wh[2] + wh[5]) / 2;
    const zSpan = Math.abs(W[0].localOffset.z - W[2].localOffset.z) || 2.5;
    fw.set(fx * zSpan, front - rear, fz * zSpan); rt.set(rx * 2.48, right - left, rz * 2.48);
    up.crossVectors(rt, fw).normalize(); fw.set(fx, 0, fz); rt.crossVectors(fw, up).normalize(); fw.crossVectors(up, rt).normalize();
    tmp.copy(fw).negate(); mtx.makeBasis(rt, up, tmp); qt.setFromRotationMatrix(mtx);
    s.pitch = Math.asin(Math.max(-1, Math.min(1, fw.y))); s.roll = Math.asin(Math.max(-1, Math.min(1, rt.y)));
    if (Math.abs(s.pitch) > TIP || Math.abs(s.roll) > TIP) { if (!s.tipped) this.tippedAt = performance.now(); s.tipped = true; }
    // suspension spring and rocky-ground chatter
    s.bounceV += (-s.bounce * 85 - s.bounceV * 13) * dt + (S.bump ? (Math.random() - 0.5) * Math.abs(s.v) * 0.6 * dt * 10 : 0);
    s.bounce = Math.max(-0.15, Math.min(0.15, s.bounce + s.bounceV * dt));
    s.y = avg - S.sink;
    r.root.position.set(s.x, s.y + s.bounce, s.z);
    if (dt > 0) r.root.quaternion.slerp(qt, 1 - Math.exp(-10 * dt)); else r.root.quaternion.copy(qt);
    if (s.tipped) r.root.rotateZ(Math.sign(s.roll || 1) * 0.6);
    for (let i = 0; i < W.length; i++) {
      const w = W[i]; w.spinGroup.rotation.x = s.spin;
      if (w.isFront) w.pivot.rotation.y = s.steer * 0.75; else if (w.isRear) w.pivot.rotation.y = -s.steer * 0.75;
      w.pivot.position.y = 0.42 + Math.max(-0.22, Math.min(0.22, wh[i] - avg)) * 0.65;
    }
    r.leftRocker.rotation.x = Math.max(-0.26, Math.min(0.26, (wh[0] - wh[2]) * 0.14)); r.rightRocker.rotation.x = Math.max(-0.26, Math.min(0.26, (wh[3] - wh[5]) * 0.14));
    r.mastHead.rotation.y += (s.steer * 0.45 - r.mastHead.rotation.y) * Math.min(1, dt * 5);
    r.headlights.forEach((l) => (l.intensity = this.lights ? 18 : 0));
    return moved;
  }
  // camera: chase behind, or the mast camera (the rover's own eyes, as NASA drivers see it)
  camera(camera, dt, look) {
    const s = this.s, fx = -Math.sin(s.heading), fz = -Math.cos(s.heading);
    if (this.cam === "mast") {
      this.rig.mastCameraAnchor.getWorldPosition(tmp); camera.position.copy(tmp);
      camera.rotation.set(look.pitch, s.heading + look.yaw, 0, "YXZ"); return;
    }
    const a = s.heading + this.orbit + look.yaw, d = 9 + Math.abs(s.v) * 0.4, h = 3.6 - look.pitch * 6;
    const want = tmp.set(s.x + Math.sin(a) * d, 0, s.z + Math.cos(a) * d); want.y = Math.max(this.g.height(want.x, want.z, 0) + 0.6, s.y + h);
    if (dt > 0) this.camPos.lerp(want, 1 - Math.exp(-dt * 5)); else this.camPos.copy(want);
    camera.position.copy(this.camPos); camera.lookAt(s.x + fx * 2, s.y + 1.2, s.z + fz * 2);
  }
}
