/* Martian Map · Surface EVA. Walk on Mars in first person at any spot picked on the Mars map, with Martian Map running
   on the astronaut's tablet. The ground comes from the same NASA layers as the map (MOLA elevation, Viking color);
   gravity, air and sunlight come from the NASA Mars Fact Sheet (see js/eva/mars.js). */
import * as THREE from "three";
import { MARS, EARTH_G, SITE, marsTime, skyDirs, fmtTime, altAz } from "./mars.js";
import { loadNasa, Ground, Terrain, Rocks, WORLD_U, curveMaterial, toLatLon, toXZ } from "./terrain.js";
import { roverTracks, rover, RoutePath, AvatarBuddy, SuitFigure } from "./extras.js";
import { Rover, PROFILES, SURFACES } from "./drive.js";
import { createMartianSkyAndDust, makeSuitFabricTextures } from "./ares/models.js";
import { Sky } from "./sky.js";
import { Astronaut } from "./astronaut.js";
import { SuitAudio } from "./audio.js";

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const ATLAS = window.ATLAS || { sites: [], regions: [], features: [] };
const EMBEDDED = window.parent !== window;
const fmtLL = (lat, lon, d = 4) => `${Math.abs(lat).toFixed(d)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(d)}°${lon >= 0 ? "E" : "W"}`;
const wrapLon = (l) => ((l + 540) % 360) - 180;
const region = ATLAS.regions.find((r) => SITE.lat >= r.south && SITE.lat <= r.north && SITE.lon >= r.west && SITE.lon <= r.east);
if (!SITE.name) SITE.name = region ? region.name : "Mars";
// A route planned in Directions on the map: eva.html?route=lat,lon;lat,lon;...
// eva.html?mode=rover starts at the rover's controls; otherwise on foot, with the rover parked beside you.
const MODE = q.get("mode") === "rover" ? "rover" : "walk";
const ROUTE = (q.get("route") || "").split(";").map((s) => s.split(",").map(Number)).filter((p) => p.length === 2 && p.every(isFinite)).slice(0, 40);
const TRAV = window.M20_TRAVERSE, ROVER = TRAV && TRAV.pts.length ? TRAV.pts[TRAV.pts.length - 1] : null;

/* ---------- settings (kept in this browser) ---------- */
const DEF = { sens: 1, fov: 72, invert: false, runToggle: false, buddy: true, view: "first", speed: "crew", quality: q.get("quality") === "low" ? "low" : "auto", bob: true, hud: true, vol: 0.8 };
const prefs = (() => { try { return { ...DEF, ...JSON.parse(localStorage.getItem("mm-eva") || "{}") }; } catch (_) { return { ...DEF }; } })();
if (q.get("quality")) prefs.quality = q.get("quality");
const savePrefs = () => { try { localStorage.setItem("mm-eva", JSON.stringify(prefs)); } catch (_) {} };

/* ---------- physics constants ---------- */
const P = {
  g: MARS.g,
  legLength: 0.9,
  // Walk-to-run transition happens near Froude number 0.5 on any planet: v = sqrt(0.5 g L). On Mars that is 1.29 m/s.
  get vTransition() { return Math.sqrt(0.5 * this.g * this.legLength); },
  walk: 1.05, lope: 2.3, tabletWalk: 0.8,
  mu: 0.62,                 // boot-on-regolith friction (planning value)
  jump: 1.75,               // takeoff speed in a pressurized suit, m/s (planning value)
  hop: 0.85,                // small hop in each loping stride
  eye: 1.66,                // eye height inside the helmet, m
  radius: 0.32,             // body radius for collisions
  step: 0.32,               // largest rock you can step up onto
  scramble: 26 * Math.PI / 180, // above this you climb slower, leaning in (Apollo crews slowed on crater walls)
  repose: 44 * Math.PI / 180,   // beyond this loose regolith gives way: no grip uphill, and you slide
  massCrew: 80, massSuit: 125,
  scaleH: 11100, p0: 636    // NASA Mars Fact Sheet: atmospheric scale height 11.1 km, 6.36 mb at the mean radius
};

/* ---------- renderer and scenes ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 1); renderer.autoClear = false;
renderer.domElement.id = "world"; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(prefs.fov, innerWidth / innerHeight, 0.05, 140000);
scene.fog = new THREE.FogExp2(0xc89a72, 0.000055);
const sunL = new THREE.DirectionalLight(0xffffff, 3); sunL.shadow.mapSize.set(2048, 2048);
Object.assign(sunL.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 400 }); sunL.shadow.bias = -0.0003; sunL.shadow.normalBias = 0.04;
scene.add(sunL, sunL.target);
const hemi = new THREE.HemisphereLight(0xcc9a74, 0x6a3c26, 1); scene.add(hemi);
const lamp = new THREE.SpotLight(0xfff1dc, 0, 60, 0.42, 0.55, 1.6); lamp.position.set(0, 0, 0); scene.add(lamp, lamp.target);
const sky = new Sky(scene);
// The sky itself (Milky Way, Sun disc and corona, Phobos and Deimos, drifting dust) is the ARES surface-operations sky,
// driven by the real Sun direction for this spot. The older sky still provides Earth at night and the light colors.
const ares = createMartianSkyAndDust(new THREE.Vector3(0, 1, 0));
[ares.skyMesh, ares.starPoints, ares.sunGroup, ares.phobosMesh, ares.deimosMesh, ares.dustPoints].forEach((o) => { o.frustumCulled = false; scene.add(o); });
// sun and moons draw over the day sky
ares.sunGroup.traverse((o) => { if (o.isMesh) o.renderOrder = -1; }); ares.phobosMesh.renderOrder = ares.deimosMesh.renderOrder = -1;
// Phobos and Deimos at their true sizes in the sky (about 0.2° and 0.03° across, NASA moon fact sheets), and only
// after dark: in the dusty daytime sky they are lost in the glare.
ares.phobosMesh.scale.setScalar(0.062); ares.deimosMesh.scale.setScalar(0.06);
let audio = null, shadows = true;
// Graphics: "auto" starts sharp and lowers the resolution if the computer can't keep up (aims for about 45 frames a second).
const PR_MAX = Math.min(devicePixelRatio, 1.5);
let autoPR = PR_MAX;
function applyQuality() {
  const Q = { auto: [autoPR, 2048], high: [Math.min(devicePixelRatio, 2), 2048], medium: [1, 1024], low: [0.6, 0] }[prefs.quality] || [1, 1024];
  renderer.setPixelRatio(Q[0]); renderer.setSize(innerWidth, innerHeight);
  shadows = Q[1] > 0;
  if (shadows && sunL.shadow.mapSize.x !== Q[1]) { if (sunL.shadow.map) { sunL.shadow.map.dispose(); sunL.shadow.map = null; } sunL.shadow.mapSize.set(Q[1], Q[1]); }
}
applyQuality();

/* ---------- state ---------- */
const S = {
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: Math.PI * 0.85, pitch: 0.02, grounded: true, air: 0, phase: 0, lastStep: 0,
  land: 0, landV: 0, walked: 0, jumpStartY: 0, apex: 0, lastApex: null, lastImpact: null, o2: 1, started: false, lampOn: false,
  timeOffset: 0, realTime: true, foot: 1, runOn: false, menu: false, look: false
};
let ground, terrain, rocks, nasa, astro, devils, route = null, buddy = null, roverObj = null, me = null, car = null;
const keys = new Set();

/* ---------- dust and footprints ---------- */
const DUST = 2400, dPos = new Float32Array(DUST * 3), dVel = new Float32Array(DUST * 3), dLife = new Float32Array(DUST), dSize = new Float32Array(DUST);
const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3)); dGeo.setAttribute("life", new THREE.BufferAttribute(dLife, 1)); dGeo.setAttribute("size", new THREE.BufferAttribute(dSize, 1));
const dustMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { col: { value: new THREE.Color(0.62, 0.42, 0.29) }, scale: { value: innerHeight } },
  vertexShader: "attribute float life; attribute float size; varying float l; uniform float scale; void main(){ l = life; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = life > 0.0 ? size * scale / -mv.z : 0.0; }",
  fragmentShader: "uniform vec3 col; varying float l; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(col, (1.0 - smoothstep(0.1, 0.5, d)) * clamp(l, 0.0, 1.0) * 0.55); }" });
const dust = new THREE.Points(dGeo, dustMat); dust.frustumCulled = false; scene.add(dust);
let dHead = 0;
function puff(x, y, z, n, speed, spread) {
  for (let i = 0; i < n; i++) {
    const k = dHead = (dHead + 1) % DUST, a = Math.random() * 6.283, up = 0.4 + Math.random() * 0.8, v = speed * (0.4 + Math.random() * 0.8);
    dPos.set([x + (Math.random() - 0.5) * spread, y + 0.03, z + (Math.random() - 0.5) * spread], k * 3);
    dVel.set([Math.cos(a) * v, up * v, Math.sin(a) * v], k * 3); dLife[k] = 2.5 + Math.random() * 2.5; dSize[k] = 0.025 + Math.random() * 0.05;
  }
}
function updateDust(dt) {
  // Grains fly on ballistic arcs under Mars gravity. The thin air slows only the finest ones.
  for (let k = 0; k < DUST; k++) {
    if (dLife[k] <= 0) continue;
    dLife[k] -= dt;
    const i = k * 3, drag = dSize[k] < 0.04 ? 0.9 : 0.25;
    dVel[i + 1] -= P.g * dt; dVel[i] *= 1 - drag * dt; dVel[i + 1] *= 1 - drag * dt * 0.5; dVel[i + 2] *= 1 - drag * dt;
    dPos[i] += dVel[i] * dt; dPos[i + 1] += dVel[i + 1] * dt; dPos[i + 2] += dVel[i + 2] * dt;
    const gy = ground.height(dPos[i], dPos[i + 2], 0);
    if (dPos[i + 1] < gy) { dPos[i + 1] = gy; dVel[i] = dVel[i + 1] = dVel[i + 2] = 0; dLife[k] = Math.min(dLife[k], 0.8); }
  }
  dGeo.attributes.position.needsUpdate = true; dGeo.attributes.life.needsUpdate = true; dGeo.attributes.size.needsUpdate = true;
}
/* ---------- snow (polar regions and high latitudes) ----------
   Mars has two kinds: CO2 snow in the polar night (Mars Climate Sounder, Hayne et al. 2012) and water-ice snow falling
   from clouds, seen by the Phoenix lander's lidar at 68° N in 2008. Flakes are tiny and fall slowly in the thin air. */
let snow = null;
function makeSnow(k) {
  const N = Math.round(2600 * k), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) pos.set([(Math.random() - 0.5) * 70, Math.random() * 30, (Math.random() - 0.5) * 70], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { scale: { value: innerHeight } },
    vertexShader: "uniform float scale; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(0.05 * scale / -mv.z, 1.0, 6.0); }",
    fragmentShader: "void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.97,0.97,1.0), (1.0 - smoothstep(0.15, 0.5, d)) * 0.75); }" });
  snow = new THREE.Points(g, m); snow.frustumCulled = false; scene.add(snow); snow.userData.t = 0;
}
function updateSnow(dt) {
  if (!snow) return;
  const a = snow.geometry.attributes.position.array, t = (snow.userData.t += dt);
  for (let i = 0; i < a.length; i += 3) {
    a[i + 1] -= dt * (0.5 + (i % 7) * 0.06); a[i] += dt * (0.35 + Math.sin(t * 0.7 + i) * 0.25); a[i + 2] += dt * Math.cos(t * 0.5 + i * 0.3) * 0.2;
    if (a[i + 1] < 0) { a[i + 1] += 30; a[i] = (Math.random() - 0.5) * 70; a[i + 2] = (Math.random() - 0.5) * 70; }
    if (a[i] > 35) a[i] -= 70;
  }
  snow.position.set(camera.position.x, camera.position.y - 12, camera.position.z); snow.geometry.attributes.position.needsUpdate = true;
}
const PRINTS = 500;
const printTex = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 160; const g = c.getContext("2d"); g.fillStyle = "rgba(40,22,14,.55)"; g.beginPath(); g.ellipse(32, 52, 22, 42, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(32, 128, 18, 26, 0, 0, 7); g.fill(); g.fillStyle = "rgba(255,210,170,.18)"; for (let y = 16; y < 150; y += 12) g.fillRect(12, y, 40, 4); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const prints = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.13, 0.32).rotateX(-Math.PI / 2), curveMaterial(new THREE.MeshStandardMaterial({ map: printTex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })), PRINTS);
prints.count = 0; prints.frustumCulled = false; prints.receiveShadow = true; scene.add(prints);
let pHead = 0;
function footprint(x, z, yaw, side) {
  const n = ground.normal(x, z, 0, 0.15), y = ground.height(x, z, 0) + 0.01, m = new THREE.Matrix4(), qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  const off = new THREE.Vector3(side * 0.13, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  m.compose(new THREE.Vector3(x + off.x, y, z + off.z), qq, new THREE.Vector3(1, 1, 1));
  prints.setMatrixAt(pHead, m); pHead = (pHead + 1) % PRINTS; prints.count = Math.max(prints.count, pHead); prints.instanceMatrix.needsUpdate = true;
}

/* ---------- dust devils ----------
   Whirlwinds that lift dust in the afternoon, when the ground is hottest. Perseverance's cameras and MEDA sensors
   recorded hundreds of them at Jezero, some hundreds of metres tall. */
class DustDevils {
  constructor() {
    this.u = { t: { value: 0 }, col: { value: new THREE.Color(0.72, 0.5, 0.34) }, alpha: { value: 0 } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: "varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vD = length(w.xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `uniform float t; uniform vec3 col; uniform float alpha; varying vec2 vUv; varying float vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){ float a = vUv.x * 6.0 + t * 1.8 + vUv.y * 4.0, s = n(vec2(a, vUv.y * 9.0 - t * 0.9)) * 0.6 + n(vec2(a * 2.3, vUv.y * 22.0 - t * 2.0)) * 0.4;
          float f = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y)) * (0.55 + 0.45 * s) * exp(-vD * 0.00012);
          gl_FragColor = vec4(col, f * alpha * 0.32); }` });
    this.list = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(22, 5, 420, 24, 12, true).translate(0, 210, 0), mat); m.frustumCulled = false; m.renderOrder = 1; scene.add(m); return { m, a: i * 2.6 + 0.8, r: 2200 + i * 1700, w: 0.004 + i * 0.002 }; });
  }
  update(dt, cx, cz, ltst, day, dusk) {
    this.u.t.value += dt;
    // strongest from late morning to mid-afternoon local time
    const act = Math.max(0, 1 - Math.abs(ltst - 13.5) / 3.2) * day;
    this.u.alpha.value = act; this.u.col.value.setRGB(0.72, 0.5, 0.34).multiplyScalar(0.55 + 0.45 * (1 - dusk));
    this.list.forEach((d) => {
      d.a += d.w * dt; const x = cx + Math.cos(d.a) * d.r, z = cz + Math.sin(d.a) * d.r, dd = Math.hypot(x - cx, z - cz);
      d.m.visible = act > 0.02; d.m.position.set(x, ground.height(x, z, 2) - dd * dd / (2 * MARS.R) - 4, z); d.m.rotation.y += dt * 2.2;
    });
  }
}

/* ---------- loading ---------- */
const steps = $("load-steps");
const stepLine = (txt) => { const li = document.createElement("li"); li.textContent = txt; steps.appendChild(li); return li; };
const TABLET_URL = `index.html?tablet=1&lat=${SITE.lat.toFixed(5)}&lon=${SITE.lon.toFixed(5)}${SITE.id ? "&site=" + encodeURIComponent(SITE.id) : ""}${ROUTE.length > 1 ? "&route=" + encodeURIComponent(q.get("route")) : ""}`;
async function boot() {
  $("ld-title").textContent = MODE === "rover" ? `Driving at ${SITE.name}` : `Stepping out at ${SITE.name}`;
  if (MODE === "rover") { $("begin").firstChild.textContent = "Start driving "; document.querySelector(".ld-kicker").textContent = "Martian Map · Rover drive"; }
  $("ld-lede").textContent = `${fmtLL(SITE.lat, SITE.lon, 3)}${region ? ` · ${region.id} ${region.name}` : ""}. The ground, the craters and hills on the horizon, the Sun and Earth in the sky and the pull of gravity all come from NASA data for this exact spot. Raise your tablet to use Martian Map while you walk.`;
  if (location.protocol === "file:") { $("load-msg").textContent = "Open Martian Map through a local web server (for example VS Code Live Server). Browsers block 3D modules opened as files."; return; }
  const l1 = stepLine("Downloading NASA MOLA elevation and Viking color for this spot…");
  let tiles = 0;
  nasa = await loadNasa(() => { tiles++; l1.textContent = `Downloading NASA MOLA elevation and Viking color for this spot… ${tiles} tiles`; });
  l1.textContent = nasa.mola ? `NASA MOLA elevation and Viking color loaded (${tiles} tiles), the same layers as the Mars map` : "NASA Trek is unreachable right now, so the large-scale ground shape is modeled";
  l1.className = nasa.mola ? "ok" : "warn";
  const l2 = stepLine("Building the ground and placing rocks…"); await new Promise((r) => setTimeout(r, 30));
  ground = new Ground(nasa); terrain = new Terrain(scene, ground, nasa); rocks = new Rocks(scene, ground); devils = new DustDevils();
  if (ground.R.snow) makeSnow(ground.R.snow);
  { const l = stepLine(`Terrain: ${ground.R.name}${ground.R.note ? " · " + ground.R.note : ""}`); l.className = "ok"; }
  S.y = ground.height(0, 0, 0); terrain.update(S.x, S.z, true); rocks.place(S.x, S.z);
  l2.textContent = `Ground built at ${Math.round(nasa.siteElevation).toLocaleString()} m elevation: 3 levels of detail out to 32 km, with the real craters and hills on the horizon`; l2.className = "ok";
  if (nasa.detail && nasa.detail[0]) { const l = stepLine("Sharper NASA imagery for Jezero: HiRISE (25 cm per pixel) at your feet and CTX (6 m) around you, loading as you walk"); l.className = "ok"; }
  // Perseverance: real wheel tracks from NASA/JPL's traverse, and the rover at its last known position
  if (TRAV) {
    const near = TRAV.pts.some((p) => { const v = toXZ(p[1], p[2]); return Math.hypot(v.x, v.z) < 2000; });
    if (near) { roverTracks(scene, ground, TRAV.pts, toXZ); const l = stepLine(`Perseverance's real wheel tracks drawn from NASA/JPL's traverse (sol ${TRAV.pts[0][0]} to ${TRAV.lastSol})`); l.className = "ok"; }
    const rv = toXZ(ROVER[1], ROVER[2]), pv = TRAV.pts[TRAV.pts.length - 2], pp = toXZ(pv[1], pv[2]);
    if (Math.hypot(rv.x, rv.z) < 3000) {
      if (Math.hypot(rv.x, rv.z) < 9) S.realRover = { x: rv.x, z: rv.z, h: Math.atan2(-(rv.x - pp.x), -(rv.z - pp.z)) }; // the drivable rover stands in for Perseverance here
      else roverObj = rover(scene, ground, rv.x, rv.z, Math.atan2(-(rv.x - pp.x), -(rv.z - pp.z)));
    }
  }
  if (ROUTE.length > 1) {
    route = new RoutePath(scene, ground, ROUTE.map(([la, lo]) => ({ ...toXZ(la, lo), lat: la, lon: lo })));
    const l = stepLine(`Your route from the map: ${ROUTE.length} stops, ${fmtD(route.remaining(0, 0) + 0)} to walk`); l.className = "ok";
    const p1 = route.pts[1]; S.yaw = Math.atan2(-p1.x, -p1.z); // face the first leg
  }
  if (prefs.buddy) buddy = new AvatarBuddy(scene, ground, groundAt, rocks);
  me = new SuitFigure(scene, ground, groundAt); me.visible = false; // you, seen in third person
  // your rover: parked 7 m to your right (or standing where Perseverance really is), or under your control in rover mode
  car = new Rover(scene, ground, groundAt, rocks);
  if (S.realRover) { car.place(S.realRover.x, S.realRover.z, S.realRover.h); S.x = S.realRover.x; S.z = S.realRover.z + 7; S.yaw = 0; }
  else car.place(S.x + Math.cos(S.yaw) * 7, S.z - Math.sin(S.yaw) * 7, S.yaw);
  { const l = stepLine(MODE === "rover" ? "Rover ready: Perseverance-class, 6-wheel rocker-bogie, surface-aware traction" : "Your rover is parked beside you: walk up to it and press F to drive"); l.className = "ok"; }
  S.y = ground.height(S.x, S.z, 0); terrain.update(S.x, S.z, true); rocks.place(S.x, S.z);
  const l3 = stepLine("Starting the EVA tablet (Martian Map)…");
  astro = new Astronaut(renderer, TABLET_URL);
  // gloves and sleeves in the same suit fabric as the ARES suit seen in third person
  { const st = makeSuitFabricTextures(); ["fabric", "pad"].forEach((k) => { const m = astro.M[k]; m.map = st.albedo; m.bumpMap = st.bump; m.bumpScale = 0.02; m.normalMap = null; m.color.set(k === "pad" ? 0xc4c6ca : 0xffffff); m.needsUpdate = true; }); }
  astro.iframe.addEventListener("load", () => { l3.textContent = "EVA tablet ready: Martian Map, full version"; l3.className = "ok"; hookTablet(); });
  setTimeout(() => { if (!l3.className) l3.textContent = "EVA tablet still loading (it will finish in the background)"; }, 6000);
  // Start at the real local time. If it is night there right now, start at mid-morning instead (\ returns to real time).
  { const t = Date.now(), mt = marsTime(t, SITE.lon), sun = altAz(skyDirs(t, SITE.lat, SITE.lon).sun);
    if (sun.alt < 8) { S.realTime = false; S.timeOffset = ((10.5 - mt.ltst + 24) % 24) * 3600 * 1027.49; S.nightNote = `It is ${fmtTime(mt.ltst)} here right now, so the EVA starts at 10:30 local time. Press \\ for the real time.`; } }
  $("begin").disabled = false; $("load-msg").textContent = "Ready. Put the helmet on.";
  requestAnimationFrame(loop);
}

/* ---------- leaving ---------- */
function exitEva() {
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (_) {}
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (_) {}
  const ll = toLatLon(S.x, S.z), msg = { mm: "eva-exit", lat: ll.lat, lon: wrapLon(ll.lon), walked: S.walked };
  if (document.pointerLockElement) document.exitPointerLock();
  if (audio && audio.ctx) audio.ctx.close().catch(() => {});
  if (EMBEDDED) parent.postMessage(msg, location.origin);
  else location.href = "index.html";
}
$("exit").addEventListener("click", exitEva);
$("m-exit").addEventListener("click", exitEva);
$("ld-exit").addEventListener("click", exitEva);

/* ---------- menu and settings ---------- */
const form = $("set");
function syncForm() {
  form.sens.value = prefs.sens; form.fov.value = prefs.fov; form.invert.checked = prefs.invert; form.runToggle.checked = prefs.runToggle;
  form.view.value = prefs.view; form.speed.value = prefs.speed; form.buddy.checked = prefs.buddy; form.quality.value = prefs.quality; form.bob.checked = prefs.bob; form.hud.value = prefs.hudLevel; form.vol.value = prefs.vol; form.real.checked = S.realTime;
  $("o-sens").textContent = (+prefs.sens).toFixed(2) + "×"; $("o-fov").textContent = prefs.fov + "°"; $("o-vol").textContent = Math.round(prefs.vol * 100) + "%";
  form.time.disabled = S.realTime;
}
form.addEventListener("input", (e) => {
  const n = e.target.name;
  if (n === "sens") prefs.sens = +form.sens.value;
  else if (n === "fov") { prefs.fov = +form.fov.value; camera.fov = prefs.fov; camera.updateProjectionMatrix(); }
  else if (n === "invert") prefs.invert = form.invert.checked;
  else if (n === "runToggle") { prefs.runToggle = form.runToggle.checked; S.runOn = false; }
  else if (n === "quality") { prefs.quality = form.quality.value; applyQuality(); }
  else if (n === "bob") prefs.bob = form.bob.checked;
  else if (n === "buddy") { prefs.buddy = form.buddy.checked; if (prefs.buddy && !buddy && ground) buddy = new AvatarBuddy(scene, ground, groundAt, rocks); if (buddy) buddy.root.visible = prefs.buddy; if (!prefs.buddy) S.buddy = null; }
  else if (n === "view") prefs.view = form.view.value;
  else if (n === "speed") prefs.speed = form.speed.value;
  else if (n === "hud") { prefs.hudLevel = form.hud.value; applyHud(); }
  else if (n === "vol") { prefs.vol = +form.vol.value; if (audio) audio.setVolume(prefs.vol); }
  else if (n === "real") { S.realTime = form.real.checked; if (S.realTime) S.timeOffset = 0; }
  else if (n === "time") setLocalTime(+form.time.value);
  savePrefs(); syncForm();
});
function setLocalTime(h) { S.realTime = false; const mt = marsTime(Date.now(), SITE.lon); S.timeOffset = ((h - mt.ltst + 24) % 24) * 3600 * 1027.49; }
function showMenu(on, settings) {
  S.menu = on; $("menu").hidden = !on; document.body.classList.toggle("menu-open", on);
  $("menu").classList.toggle("only-set", !!settings && !S.started);
  $("menu-title").textContent = S.started ? "Paused" : "Settings";
  $("menu-acts").hidden = !S.started;
  if (on) { syncForm(); keys.clear(); }
}
$("resume").addEventListener("click", () => { showMenu(false); if (astro && astro.target !== 1) lock(); });
$("m-tablet").addEventListener("click", () => { showMenu(false); toggleTablet(true); });
$("gear").addEventListener("click", () => { if (document.pointerLockElement) document.exitPointerLock(); showMenu(true, true); });
$("ld-set").addEventListener("click", () => showMenu(true, true));
$("menu").addEventListener("click", (e) => { if (e.target === $("menu")) { showMenu(false); if (S.started && astro && astro.target !== 1) lock(); } });
// Helmet display: "simple" (two panels: suit or rover, and navigation), "full" (all four) or "off". H cycles.
if (!prefs.hudLevel) prefs.hudLevel = prefs.hud === false ? "off" : "simple";
function applyHud() { document.body.classList.toggle("nohud", prefs.hudLevel === "off"); document.body.classList.toggle("hud-simple", prefs.hudLevel === "simple"); }
applyHud();

/* ---------- input ---------- */
const TOUCH = matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches;
function lock() { if (TOUCH) return; if (!astro || astro.target === 1 || S.menu) return; const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); }
$("begin").addEventListener("click", () => {
  $("loader").classList.add("gone"); S.started = true; document.body.classList.add("started"); showMenu(false);
  audio = audio || new SuitAudio(prefs.vol); audio.start(); lock();
  if (S.nightNote) setTimeout(() => toast(S.nightNote), 600);
  if (EMBEDDED) parent.postMessage({ mm: "eva-started" }, location.origin);
  if (TOUCH) {
    $("touch").hidden = false; document.body.classList.add("touch-ui");
    // Phones: go full screen and hold landscape where the browser allows it (Android); elsewhere the "turn your phone"
    // screen asks for it.
    const el = document.documentElement, fs = el.requestFullscreen || el.webkitRequestFullscreen;
    const lockL = () => { try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape"); if (p && p.catch) p.catch(() => {}); } catch (_) {} };
    if (fs && !(document.fullscreenElement || document.webkitFullscreenElement)) { try { const p = fs.call(el, { navigationUI: "hide" }); if (p && p.then) p.then(lockL, () => {}); else lockL(); } catch (_) {} } else lockL();
  }
  if (MODE === "rover") setDrive(true);
});
// On phones the stick drives the rover too: push up to go, down to reverse, sideways to steer.
function driveKeys() {
  if (!S.joy) return keys;
  const k = new Set(keys); if (S.joy.y < -0.25) k.add("KeyW"); if (S.joy.y > 0.25) k.add("KeyS"); if (S.joy.x < -0.25) k.add("KeyA"); if (S.joy.x > 0.25) k.add("KeyD"); return k;
}
/* ---------- touch: left stick walks, drag anywhere else to look, buttons to lope and jump ---------- */
(() => {
  const stick = $("stick"), knob = stick.querySelector("i"); let sid = null, lid = null, lx = 0, ly = 0;
  stick.addEventListener("pointerdown", (e) => { sid = e.pointerId; stick.setPointerCapture(sid); move(e); });
  const move = (e) => { if (e.pointerId !== sid) return; const r = stick.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2), l = Math.max(1, Math.hypot(x, y)); S.joy = { x: x / l, y: y / l }; knob.style.transform = `translate(${x / l * 36}px, ${y / l * 36}px)`; };
  stick.addEventListener("pointermove", move);
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; S.joy = null; knob.style.transform = ""; };
  stick.addEventListener("pointerup", end); stick.addEventListener("pointercancel", end);
  renderer.domElement.addEventListener("pointerdown", (e) => { if (!TOUCH || e.pointerType === "mouse") return; lid = e.pointerId; lx = e.clientX; ly = e.clientY; });
  addEventListener("pointermove", (e) => { if (e.pointerId !== lid) return; look((e.clientX - lx) * 1.6, (e.clientY - ly) * 1.6); lx = e.clientX; ly = e.clientY; });
  addEventListener("pointerup", (e) => { if (e.pointerId === lid) lid = null; });
  // Walking: Lope toggles, Jump jumps. Driving: the same buttons switch camera and brake (hold).
  $("t-run").addEventListener("click", () => { if (S.drive) { keyDown("KeyC"); return; } S.runOn = !S.runOn; $("t-run").classList.toggle("on", S.runOn); });
  $("t-jump").addEventListener("click", () => { if (!S.drive) keys.add("Space"); });
  $("t-jump").addEventListener("pointerdown", () => { if (S.drive) keys.add("Space"); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => $("t-jump").addEventListener(ev, () => { if (S.drive) keys.delete("Space"); }));
  $("t-car").addEventListener("click", () => keyDown("KeyF"));
})();
renderer.domElement.addEventListener("click", () => { if (S.started && !S.menu) lock(); });
document.addEventListener("pointerlockchange", () => {
  const on = document.pointerLockElement === renderer.domElement; document.body.classList.toggle("locked", on);
  if (!on && S.started && astro && astro.target !== 1 && !S.menu) showMenu(true);
});
function look(dx, dy) {
  const k = 0.0022 * prefs.sens * (prefs.fov / 72);
  S.yaw -= dx * k; S.pitch = Math.max(-1.35, Math.min(1.35, S.pitch - dy * k * (prefs.invert ? -1 : 1)));
}
document.addEventListener("mousemove", (e) => {
  if (S.drive && (document.pointerLockElement === renderer.domElement || S.look)) { const k = 0.0022 * prefs.sens; S.rlook.yaw -= e.movementX * k; S.rlook.pitch = Math.max(-0.6, Math.min(0.6, S.rlook.pitch - e.movementY * k * (prefs.invert ? -1 : 1))); return; }
  if (document.pointerLockElement === renderer.domElement || S.look) look(e.movementX, e.movementY);
});
// With the tablet up the mouse works the tablet, so hold the right button anywhere off the tablet to look around.
document.addEventListener("mousedown", (e) => { if (e.button === 2 && astro && astro.target === 1 && !S.menu) { S.look = true; e.preventDefault(); } });
document.addEventListener("mouseup", (e) => { if (e.button === 2) S.look = false; });
document.addEventListener("contextmenu", (e) => { if (S.started) e.preventDefault(); });
/* ---------- driving the rover ---------- */
S.rlook = { yaw: 0, pitch: 0 };
function setDrive(on) {
  if (!car || on === !!S.drive) return;
  if (on) {
    if (astro.target === 1) toggleTablet(false);
    S.walker = { x: S.x, y: S.y, z: S.z, yaw: S.yaw }; S.drive = true; S.vx = S.vz = S.vy = 0; S.rlook.yaw = S.rlook.pitch = 0; car.camPos.set(0, 0, 0); car.camera(camera, 0, S.rlook);
    document.body.classList.add("driving"); toast(TOUCH ? "Driving: push the stick up to go, down to reverse, sideways to steer. Hold Brake to stop." : MODE === "rover" ? "Driving the rover. W S throttle, A D steer, Space brake, C camera, L headlights." : "You have the rover's controls. F returns you to your suit. C camera, L headlights.");
  } else {
    if (MODE === "rover") return;
    S.drive = false; Object.assign(S, { x: S.walker.x, y: S.walker.y, z: S.walker.z, yaw: S.walker.yaw }); S.walker = null; document.body.classList.remove("driving");
  }
}
function keyDown(k, e) {
  if (!S.started || S.menu) return;
  if (S.drive && k === "KeyT") { toast(MODE === "rover" ? "The tablet is with the astronaut. Start a walk from the map to use it." : "Press F to go back to your suit first."); }
  else if (k === "KeyT") toggleTablet();
  else if (k === "KeyF") { if (S.drive) setDrive(false); else if (car && Math.hypot(car.s.x - S.x, car.s.z - S.z) < 6) setDrive(true); else if (car) toast(`The rover is ${fmtD(Math.hypot(car.s.x - S.x, car.s.z - S.z))} away. Walk within 6 m and press F.`); }
  else if (k === "KeyR" && S.drive && car.s.tipped) { car.place(car.s.x + 1, car.s.z, car.s.heading); S.tipNote = false; toast("Rover righted (in reality this would need help from the crew)."); }
  else if (k === "KeyC" && S.drive) { car.cam = car.cam === "chase" ? "mast" : "chase"; S.rlook.yaw = S.rlook.pitch = 0; toast(car.cam === "mast" ? "Mast camera: the view NASA drivers plan from" : "Chase camera"); }
  else if (k === "KeyL" && S.drive) { car.lights = !car.lights; toast(car.lights ? "Rover headlights on" : "Rover headlights off"); }
  else if (k === "KeyL") { S.lampOn = !S.lampOn; toast(S.lampOn ? "Helmet lamps on" : "Helmet lamps off"); }
  else if (k === "KeyH") { prefs.hudLevel = { simple: "full", full: "off", off: "simple" }[prefs.hudLevel] || "simple"; applyHud(); savePrefs(); toast({ simple: "Helmet display: simple", full: "Helmet display: full", off: "Helmet display off" }[prefs.hudLevel]); }
  else if (k === "KeyV") { prefs.view = prefs.view === "third" ? "first" : "third"; savePrefs(); toast(prefs.view === "third" ? "Third-person view (V to switch back)" : "First-person view"); }
  else if (k === "KeyM") { if (audio) toast(audio.toggle() ? "Suit sound on" : "Suit sound off"); }
  else if (k === "BracketRight" || k === "BracketLeft") { S.realTime = false; S.timeOffset += (k === "BracketRight" ? 1 : -1) * 30 * 60 * 1027.49; }
  else if (k === "Backslash") { S.realTime = true; S.timeOffset = 0; toast("Back to the real local time"); }
  else if ((k === "ShiftLeft" || k === "ShiftRight") && prefs.runToggle && !keys.has(k)) S.runOn = !S.runOn;
  keys.add(k);
  if (e && ["Space", "ArrowUp", "ArrowDown"].includes(k)) e.preventDefault();
}
addEventListener("keydown", (e) => { if (e.target.closest && e.target.closest("#menu")) return; keyDown(e.code, e); });
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => { if (!document.activeElement || document.activeElement.tagName !== "IFRAME") keys.clear(); });
// Keys pressed while the tablet has the keyboard come from the website by message, so you can walk while using it.
addEventListener("message", (e) => {
  const d = e.data;
  if (!d || !astro || e.source !== astro.iframe.contentWindow) return;
  if (d.mm === "stow") toggleTablet(false);
  else if (d.mm === "key" && typeof d.code === "string") { if (d.t === "down") { if (d.code !== "KeyT") keyDown(d.code); } else keys.delete(d.code); }
  else if (d.mm === "keys-clear") keys.clear();
});
function hookTablet() {
  // The website is on the same address, so its keys can also be read directly (the message route is the fallback).
  try { astro.iframe.contentWindow.addEventListener("blur", () => keys.clear()); } catch (_) {}
}
$("stow").addEventListener("click", () => toggleTablet(false));
$("tab-btn").addEventListener("click", () => toggleTablet(true));
function toggleTablet(v) {
  if (!astro) return;
  const open = v === undefined ? astro.target !== 1 : v;
  if (open === (astro.target === 1)) return;
  astro.open(open); S.look = false;
  document.body.classList.toggle("tablet-open", open);
  if (open) { document.exitPointerLock(); if (audio) audio.click(); setTimeout(() => { try { astro.iframe.focus(); } catch (_) {} }, 1200); }
  else { keys.clear(); try { astro.iframe.blur(); window.focus(); } catch (_) {} setTimeout(lock, 50); }
}

/* ---------- physics ---------- */
function groundAt(x, z) {
  let h = ground.height(x, z, 0);
  for (const r of rocks.near4(x, z)) { const d = Math.hypot(x - r.x, z - r.z); if (d < r.r * 0.8 && r.top > h) h = Math.max(h, r.top - (d / r.r) * 0.08); }
  return h;
}
function physics(dt) {
  const tabletUp = astro.target === 1;
  if (S.climb) { // climbing onto a rock: up first, then over the edge
    const c = S.climb; c.t += dt; const k = Math.min(1, c.t / c.dur), up = Math.min(1, k / 0.6), over = Math.max(0, (k - 0.35) / 0.65);
    S.x = c.x0 + (c.x1 - c.x0) * over; S.z = c.z0 + (c.z1 - c.z0) * over; S.y = c.y0 + (c.y1 - c.y0) * (1 - (1 - up) * (1 - up));
    if (k >= 1) { S.climb = null; S.grounded = true; S.land = 0.04; }
    return;
  }
  // Q and E turn on the spot (handy with the tablet up)
  if (keys.has("KeyQ")) S.yaw += 1.5 * dt;
  if (keys.has("KeyE")) S.yaw -= 1.5 * dt;
  const fwd = new THREE.Vector2(-Math.sin(S.yaw), -Math.cos(S.yaw)), right = new THREE.Vector2(Math.cos(S.yaw), -Math.sin(S.yaw));
  let ix = 0, iz = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) { ix += fwd.x; iz += fwd.y; }
  if (keys.has("KeyS") || keys.has("ArrowDown")) { ix -= fwd.x; iz -= fwd.y; }
  if (keys.has("KeyD") || keys.has("ArrowRight")) { ix += right.x; iz += right.y; }
  if (keys.has("KeyA") || keys.has("ArrowLeft")) { ix -= right.x; iz -= right.y; }
  if (S.joy) { ix += -fwd.x * S.joy.y + right.x * S.joy.x; iz += -fwd.y * S.joy.y + right.y * S.joy.x; }
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  // Reading the tablet, you walk carefully and don't lope or jump.
  const loping = !tabletUp && (prefs.runToggle || TOUCH ? S.runOn : keys.has("ShiftLeft") || keys.has("ShiftRight"));
  const n = ground.normal(S.x, S.z, 0, 0.4), slope = Math.acos(Math.min(1, n.y));
  // What's underfoot (checked a few times a second): grip and effort depend on it.
  S.surfT = (S.surfT || 0) - dt; if (S.surfT <= 0 || !S.surf) { S.surf = ground.surface(S.x, S.z); S.surfT = 0.25; }
  const surf = S.surf.type, mu = { regolith: P.mu, sand: 0.45, rocky: 0.7, bedrock: 0.75, ice: 0.3 }[surf] || P.mu;
  // Walking speed on slopes follows Tobler's hiking function (fastest slightly downhill, much slower uphill), and loose
  // sand, rubble and ice slow you down. Loping is only safe on fairly gentle ground, as on the Apollo traverses.
  const grade = il > 0 ? -(ix * n.x + iz * n.z) / Math.max(0.2, n.y) / il : 0;
  const tobler = Math.max(0.45, Math.min(1.15, Math.exp(-3.5 * Math.abs(grade + 0.05)) / Math.exp(-0.175)));
  const footing = { sand: 0.8, rocky: 0.88, ice: 0.8 }[surf] || 1;
  const canLope = loping && slope < 15 * Math.PI / 180 && surf !== "ice";
  S.stumble = Math.max(0, (S.stumble || 0) - dt);
  const target = il > 0 ? (tabletUp ? P.tabletWalk : canLope ? P.lope : P.walk) * (keys.has("KeyS") && !keys.has("KeyW") ? 0.6 : 1) * tobler * footing * (S.stumble > 0 ? 0.3 : 1) : 0;
  S.grade = grade;
  if (S.grounded) {
    // Traction limits how fast you can speed up or stop: a = mu * g. On Mars that is 38% of Earth's.
    const aMax = mu * P.g, dvx = ix * target - S.vx, dvz = iz * target - S.vz, dv = Math.hypot(dvx, dvz), step = Math.min(dv, aMax * dt);
    if (dv > 0) { S.vx += dvx / dv * step; S.vz += dvz / dv * step; }
    // Steep crater walls: you scramble up more slowly. Only slopes past the limit give no grip and make you slide.
    const limit = surf === "ice" ? Math.atan(mu) + 0.05 : P.repose;
    if (slope > P.scramble && slope <= limit) {
      const dx = n.x, dz = n.z, dl = Math.hypot(dx, dz) || 1, uphill = -(S.vx * dx + S.vz * dz) / dl;
      const keep = 1 - 0.6 * Math.min(1, (slope - P.scramble) / Math.max(0.05, limit - P.scramble));
      if (uphill > 0) { S.vx += dx / dl * uphill * (1 - keep) * Math.min(1, dt * 8); S.vz += dz / dl * uphill * (1 - keep) * Math.min(1, dt * 8); }
    }
    if (slope > limit) {
      const dx = n.x, dz = n.z, dl = Math.hypot(dx, dz) || 1, uphill = -(S.vx * dx + S.vz * dz) / dl;
      if (uphill > 0) { S.vx += dx / dl * uphill; S.vz += dz / dl * uphill; }
      const slide = P.g * (Math.sin(slope) - mu * 0.6 * Math.cos(slope)); if (slide > 0) { S.vx += dx / dl * slide * dt; S.vz += dz / dl * slide * dt; }
    }
  }
  // Jumping, with the ARES build's forgiving timing: a press shortly before landing or just after stepping off an edge
  // still counts. Next to a rock between knee and chest height, Space climbs onto it instead.
  if (keys.has("Space")) { S.jumpBuf = 0.15; keys.delete("Space"); }
  S.jumpBuf = Math.max(0, (S.jumpBuf || 0) - dt); S.coyote = S.grounded ? 0.12 : Math.max(0, (S.coyote || 0) - dt);
  if (S.jumpBuf > 0 && S.coyote > 0 && !tabletUp) {
    S.jumpBuf = 0; S.coyote = 0;
    const ax = S.x + fwd.x * 0.75, az = S.z + fwd.y * 0.75;
    const ledge = rocks.near4(ax, az).find((r) => Math.hypot(ax - r.x, az - r.z) < r.r + 0.35 && r.top - S.y > 0.35 && r.top - S.y < 1.15);
    if (ledge) { const h = ledge.top - S.y; S.climb = { t: 0, dur: 0.45 + h * 0.4, x0: S.x, y0: S.y, z0: S.z, x1: ledge.x + (S.x - ledge.x) * 0.3, y1: ledge.top, z1: ledge.z + (S.z - ledge.z) * 0.3 }; S.vx = S.vz = S.vy = 0; if (audio) audio.step(0.8); return; }
    S.vy = P.jump; S.grounded = false; S.jumpStartY = S.y; S.apex = S.y; S.air = 0; puff(S.x, S.y, S.z, 30, 0.9, 0.4); if (audio) audio.step(1.2);
  }
  // gravity
  S.vy -= P.g * dt;
  // move, with rock collisions
  let nx = S.x + S.vx * dt, nz = S.z + S.vz * dt;
  for (const r of rocks.near4(nx, nz)) {
    if (r.top < S.y + P.step) continue;
    const dx = nx - r.x, dz = nz - r.z, d = Math.hypot(dx, dz), min = r.r + P.radius;
    if (d < min && d > 1e-4) { nx = r.x + dx / d * min; nz = r.z + dz / d * min; const vn = (S.vx * dx + S.vz * dz) / d; if (vn < 0) { S.vx -= dx / d * vn; S.vz -= dz / d * vn; } }
  }
  const moved = Math.hypot(nx - S.x, nz - S.z); S.x = nx; S.z = nz; S.y += S.vy * dt;
  const gy = groundAt(S.x, S.z);
  if (S.y <= gy) {
    if (!S.grounded) {
      const impact = -S.vy; S.lastImpact = impact; S.land = Math.min(0.12, impact * 0.04); S.landV = 0;
      if (S.apex - S.jumpStartY > 0.05) S.lastApex = S.apex - S.jumpStartY;
      if (impact > 3.2) { S.stumble = 0.8; S.vx *= 0.4; S.vz *= 0.4; toast(`Hard landing at ${impact.toFixed(1)} m/s: you stumble. Suit joints and boots take the hit.`); }
      if (impact > 0.6) { puff(S.x, gy, S.z, Math.min(90, impact * 30), impact * 0.5, 0.5); footprint(S.x, S.z, S.yaw, -0.6); footprint(S.x, S.z, S.yaw, 0.6); if (audio) audio.step(impact * 0.7); }
    }
    S.y = gy; S.vy = 0; S.grounded = true; S.air = 0;
  } else if (S.y > gy + 0.06 || S.vy > 0) { if (S.grounded && S.vy <= 0 && S.y - gy < 0.25) { S.y = gy; S.vy = 0; } else { S.grounded = false; S.air += dt; S.apex = Math.max(S.apex, S.y); } }
  // steps, dust and footprints
  const speed = Math.hypot(S.vx, S.vz);
  if (S.grounded && speed > 0.15) {
    const stride = speed > P.vTransition ? 1.35 : 0.72;
    S.phase += speed * dt / stride;
    if (Math.floor(S.phase) !== S.lastStep) {
      S.lastStep = Math.floor(S.phase); S.foot *= -1;
      footprint(S.x, S.z, S.yaw, S.foot);
      puff(S.x - S.vx * 0.15, S.y, S.z - S.vz * 0.15, 6 + speed * 6, 0.35 + speed * 0.25, 0.25);
      if (audio) audio.step(0.4 + speed * 0.3);
      // Above the walk-run transition, each stride becomes a low hop, the "lope" Apollo crews used on the Moon.
      if (speed > P.vTransition && canLope) { S.vy = P.hop; S.grounded = false; S.jumpStartY = S.y; S.apex = S.y; }
    }
  }
  S.walked += moved;
  // landing dip spring
  S.landV += (-S.land * 60 - S.landV * 9) * dt; S.land = Math.max(0, S.land + S.landV * dt);
  // Work rate, from the Pandolf load-carriage equation scaled to Mars gravity: body plus 125 kg suit, terrain factor for
  // loose ground, and the extra cost of climbing. Apollo moonwalkers averaged about 230 W (Waligora & Horrigan 1975).
  const eta = { sand: 1.8, rocky: 1.5, ice: 1.3, bedrock: 1.1 }[surf] || 1.2, ML = P.massCrew + P.massSuit, gr = Math.max(0, S.grade || 0) * 100;
  S.watts = 110 + eta * ML * (P.g / EARTH_G) * (1.5 * speed * speed + 0.35 * speed * gr) + (S.grounded ? 0 : 40);
  S.wattsAvg = (S.wattsAvg || S.watts) + (S.watts - (S.wattsAvg || S.watts)) * Math.min(1, dt * 0.5);
  // 8 hours of oxygen at an average 250 W
  S.o2 = Math.max(0, S.o2 - dt / (8 * 3600) * (S.watts / 250));
}

/* ---------- HUD ---------- */
const hud = { tape: $("tape"), suit: $("hud-suit"), env: $("hud-env"), phys: $("hud-phys"), nav: $("hud-nav") };
(() => { let h = ""; for (let d = -360; d <= 720; d += 5) { const l = ((d % 360) + 360) % 360, lab = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" }[l]; h += `<i class="${l % 15 === 0 ? "m" : ""}" style="left:${(d + 360) * 4}px">${lab ? `<b>${lab}</b>` : l % 30 === 0 ? `<b class="n">${l}</b>` : ""}</i>`; } hud.tape.innerHTML = h; })();
const GROUND_NAMES = { regolith: "dusty regolith", sand: "loose sand", rocky: "rocky ejecta", bedrock: "bedrock", ice: "ice" };
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 3200); }
function tempEstimate(ltst, lat) {
  // Typical Jezero (18°N) air temperatures from Perseverance's MEDA: about -80 °C before dawn, about -20 °C mid-afternoon.
  // Away from Jezero this is a rough estimate that gets colder toward the poles.
  const x = ((ltst - 5.5 + 24) % 24) / 24, w = Math.max(0, Math.sin(Math.PI * Math.min(1, x / 0.62)));
  return Math.round(-80 + 60 * Math.pow(w, 1.4) - 0.6 * Math.max(0, Math.abs(lat) - 20));
}
// Great-circle distance (m) and bearing (degrees) on Mars.
function gc(la1, lo1, la2, lo2) {
  const r = Math.PI / 180, p1 = la1 * r, p2 = la2 * r, dl = (lo2 - lo1) * r;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2, d = 2 * MARS.R * Math.asin(Math.min(1, Math.sqrt(a)));
  const b = Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / r;
  return { d, b: (b + 360) % 360 };
}
const fmtD = (m) => (m < 1000 ? Math.round(m) + " m" : m < 100000 ? (m / 1000).toFixed(1) + " km" : Math.round(m / 1000).toLocaleString() + " km");
// Landing sites and named landmarks from the website's data, shown as markers on the visor when they are near.
const LANDMARKS = [...ATLAS.sites.map((s) => (s.id === "perseverance" && ROVER ? { name: "Perseverance", sub: "last known position, sol " + ROVER[0], lat: ROVER[1], lon: ROVER[2], site: true } : { name: s.mission, sub: s.name, lat: s.lat, lon: s.lng, site: true })), ...(ATLAS.features || []).map(([n, la, lo]) => ({ name: n, lat: la, lon: lo }))];
if (ROUTE.length > 1) ROUTE.forEach(([la, lo], i) => { if (i) LANDMARKS.push({ name: "STOP " + String.fromCharCode(65 + i), lat: la, lon: lo, stop: i }); });
const marks = $("marks");
LANDMARKS.forEach((m) => { m.el = document.createElement("div"); m.el.className = "mark" + (m.site ? " site" : "") + (m.stop ? " stop" : ""); m.el.hidden = true; marks.appendChild(m.el); });
let hudT = 0;
function routeLine() {
  const p = route.pts[route.next], g = gc(toLatLon(S.x, S.z).lat, wrapLon(toLatLon(S.x, S.z).lon), p.lat, p.lon), left = route.remaining(S.x, S.z);
  return route.done ? `<span>ROUTE <em>complete</em> · all ${route.pts.length} stops</span>` : `<span>NEXT STOP ${String.fromCharCode(65 + route.next)} <em>${fmtD(g.d)} · ${String(Math.round(g.b)).padStart(3, "0")}°</em></span><span>ROUTE LEFT <em>${fmtD(left)}</em> · ${Math.ceil(left / (2500 / 3600) / 60)} min at 2.5 km/h</span>`;
}
function updateHud(dt, mt, dirs) {
  hudT += dt; const hd = ((-S.yaw * 180 / Math.PI) % 360 + 360) % 360;
  hud.tape.style.transform = `translateX(${-(hd + 360) * 4}px)`;
  $("hdg").textContent = String(Math.round(hd) % 360).padStart(3, "0") + "°";
  const ll = toLatLon(S.x, S.z); ll.lon = wrapLon(ll.lon);
  // landmark markers on the horizon, every frame so they stay put while you turn
  LANDMARKS.forEach((m) => {
    const g = m.g = gc(ll.lat, ll.lon, m.lat, m.lon), on = (m.stop ? route && m.stop === route.next && !route.done : g.d < (m.site ? 200000 : 120000)) && g.d > (m.stop ? 4 : 30);
    if (!on) { m.el.hidden = true; return; }
    const a = g.b * Math.PI / 180, p = camera.position.clone().add(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)).multiplyScalar(1000)).project(camera);
    const vis = p.z < 1 && Math.abs(p.x) < 1.05; m.el.hidden = !vis;
    if (vis) { m.el.style.transform = `translate(${((p.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - p.y) / 2 * innerHeight).toFixed(1)}px)`; m.el.innerHTML = `<b>${m.name}</b><span>${fmtD(g.d)}</span>`; }
  });
  if (hudT < 0.15) return; hudT = 0;
  const speed = Math.hypot(S.vx, S.vz), gait = !S.grounded ? "AIRBORNE" : speed < 0.1 ? "STANDING" : speed > P.vTransition ? "LOPING" : "WALKING";
  const sun = altAz(dirs.sun), elev = Math.round(nasa.siteElevation + S.y), pa = Math.round(P.p0 * Math.exp(-elev / P.scaleH));
  const o2 = Math.round(S.o2 * 100), mins = Math.round(S.o2 * 8 * 60);
  // Walk-back check: time to return to the start at the planning pace (2.5 km/h, as in Directions), against the oxygen
  // left minus a 30-minute reserve. The same rule as the safety center's go / no-go.
  const back = Math.hypot(S.x, S.z) / (2500 / 3600) / 60, margin = mins - back - 30, mc = margin > 60 ? "" : margin > 0 ? "warn" : "bad";
  const hm = (m) => `${Math.floor(Math.max(0, m) / 60)} h ${String(Math.round(Math.max(0, m) % 60)).padStart(2, "0")} m`;
  hud.suit.innerHTML = `<b>SUIT</b><span>O₂ PRIMARY <em>${o2}%</em> · ${hm(mins)}</span><span>PRESSURE <em>29.6 kPa</em> (4.3 psi) · CO₂ <em>0.4 kPa</em></span><span>WALK BACK <em>${Math.ceil(back)} min</em> · margin <em class="${mc}">${hm(margin)}</em> ${mc === "bad" ? "· <em class=\"bad\">TURN BACK</em>" : mc ? "· <em class=\"warn\">CAUTION</em>" : "· GO"}</span>${buddy && S.buddy ? `<span>EV2 PARTNER <em>${S.buddy.d.toFixed(0)} m</em> · ${S.buddy.d < 15 ? "in sight" : "<em class=\"warn\">regroup</em>"}</span>` : `<span>MASS crew ${P.massCrew} + suit ${P.massSuit} kg</span>`}`;
  if (mc === "bad" && !S.warned) { S.warned = true; toast("Oxygen margin gone: turn back to the start now."); }
  S.sunAlt = sun.alt;
  hud.env.innerHTML = `<b>${SITE.name.toUpperCase()}</b><span>TERRAIN <em>${ground.R.name}</em></span><span>SOL <em>${mt.sol.toLocaleString()}</em> · LTST <em>${fmtTime(mt.ltst)}</em>${S.realTime ? " (now)" : " (sim)"}</span><span>SUN alt <em>${Math.round(sun.alt)}°</em> az <em>${Math.round(sun.az)}°</em> · ${mt.season}</span><span>AIR <em>${tempEstimate(mt.ltst, ll.lat)} °C</em> est. · <em>${pa} Pa</em></span><span>EARTH <em>${dirs.earthAU.toFixed(2)} AU</em> · radio <em>${(dirs.earthAU * 8.317).toFixed(1)} min</em></span>`;
  const apex = S.lastApex;
  // near the rover on foot: offer to drive
  { const pr = $("prompt"); const near = car && !S.drive && Math.hypot(car.s.x - S.x, car.s.z - S.z) < 6; pr.hidden = !near; }
  if (TOUCH) {
    const near = car && !S.drive && Math.hypot(car.s.x - S.x, car.s.z - S.z) < 6, tc = $("t-car");
    tc.hidden = MODE === "rover" || !(near || S.drive); tc.textContent = S.drive ? "Get out" : "Drive";
    $("t-run").textContent = S.drive ? "Camera" : "Lope"; $("t-jump").textContent = S.drive ? "Brake" : "Jump";
    if (S.drive) $("t-run").classList.remove("on");
  }
  if (S.drive) {
    const c = car.s, kmh = Math.abs(c.v) * 3.6, tilt = Math.max(Math.abs(c.pitch), Math.abs(c.roll)) * 180 / Math.PI, tc = tilt > 35 ? "bad" : tilt > 25 ? "warn" : "";
    hud.phys.innerHTML = `<b>ROVER · ${c.tipped ? '<em class="bad">ROLLED OVER</em>' : kmh < 0.05 ? "STOPPED" : c.v > 0 ? "DRIVING" : "REVERSING"}</b><span>SPEED <em>${kmh < 1 ? (Math.abs(c.v) * 100).toFixed(1) + " cm/s" : kmh.toFixed(1) + " km/h"}</em> · ${prefs.speed === "real" ? "real Perseverance speed" : "crew rover speed"}</span><span>GROUND <em>${c.surface.name}</em> · grip μ ${c.surface.mu}</span><span>WHEEL SLIP <em class="${c.slip > 40 ? "bad" : c.slip > 15 ? "warn" : ""}">${Math.round(c.slip)}%</em> · SLOPE <em>${Math.round(c.slope)}°</em></span><span>PITCH <em class="${tc}">${(c.pitch * 180 / Math.PI).toFixed(0)}°</em> · ROLL <em class="${tc}">${(c.roll * 180 / Math.PI).toFixed(0)}°</em> · limit 45°</span>`;
    if (MODE === "rover") hud.suit.innerHTML = `<b>ROVER SYSTEMS</b><span>BATTERY <em>${c.battery.toFixed(1)}%</em> · MMRTG charging</span><span>ODOMETER <em>${fmtD(c.odo)}</em></span><span>MASS <em>1,025 kg</em> · weight on Mars <em>${Math.round(1025 * P.g).toLocaleString()} N</em></span><span>CAMERA <em>${car.cam === "mast" ? "mast" : "chase"}</em> (C)</span>`;
  } else hud.phys.innerHTML = `<b>GRAVITY <em>${P.g.toFixed(3)} m/s²</em> · ${(P.g / EARTH_G).toFixed(2)} g</b><span>SPEED <em>${speed.toFixed(2)} m/s</em> · ${gait} · <em>${Math.round(S.wattsAvg || 0)} W</em> work</span>${S.grounded ? `<span>GROUND <em>${GROUND_NAMES[S.surf ? S.surf.type : "regolith"]}</em> · grade <em>${Math.round((S.grade || 0) * 100)}%</em></span>` : `<span>VERTICAL <em>${(S.vy >= 0 ? "+" : "") + S.vy.toFixed(2)} m/s</em> · ${S.air.toFixed(1)} s up</span>`}<span>${apex ? `LAST JUMP <em>${apex.toFixed(2)} m</em> · Earth ${(apex * P.g / EARTH_G).toFixed(2)} m` : `JUMP takeoff ${P.jump} m/s → ${(P.jump ** 2 / (2 * P.g)).toFixed(2)} m here`}</span><span>WALK→LOPE at <em>${P.vTransition.toFixed(2)} m/s</em> (Earth ${Math.sqrt(0.5 * EARTH_G * P.legLength).toFixed(2)})</span>`;
  const dist = Math.hypot(S.x, S.z), brg = ((Math.atan2(S.x, -S.z) * 180 / Math.PI) % 360 + 360) % 360;
  const near = LANDMARKS.filter((m) => m.g).sort((a, b) => a.g.d - b.g.d), ns = near.find((m) => m.site), nf = near.find((m) => !m.site && !m.stop);
  hud.nav.innerHTML = `<b>${fmtLL(ll.lat, ll.lon, 5)}</b><span>ELEVATION <em>${elev.toLocaleString()} m</em> ${nasa.mola ? "(NASA MOLA)" : "(model)"}</span>${route ? routeLine() : ""}<span>START POINT <em>${dist < 1 ? "here" : `${fmtD(dist)} · ${String(Math.round((brg + 180) % 360)).padStart(3, "0")}°`}</em> · walked <em>${fmtD(S.walked)}</em></span>${ns ? `<span>${ns.name.toUpperCase()} <em>${fmtD(ns.g.d)} · ${String(Math.round(ns.g.b)).padStart(3, "0")}°</em></span>` : ""}${nf ? `<span>${nf.name.toUpperCase()} <em>${fmtD(nf.g.d)}</em></span>` : ""}`;
  // Earth label in the night sky
  const lab = $("earth-label"), ew = new THREE.Vector3(dirs.earth[0], dirs.earth[2], -dirs.earth[1]);
  if (sky.earth.visible) { const p = camera.position.clone().addScaledVector(ew, 1000).project(camera); const on = p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1; lab.hidden = !on; if (on) { lab.style.left = ((p.x + 1) / 2 * innerWidth) + "px"; lab.style.top = ((1 - p.y) / 2 * innerHeight) + "px"; lab.textContent = `EARTH · ${dirs.earthAU.toFixed(2)} AU`; } } else lab.hidden = true;
  if (S.menu && S.realTime) form.time.value = mt.ltst.toFixed(1);
  if (S.menu) $("o-time").textContent = fmtTime(mt.ltst);
  // tell the tablet where we are
  try { const w = astro.iframe.contentWindow; if (w) w.postMessage({ mm: "you", lat: ll.lat, lon: ll.lon, heading: hd }, location.origin); } catch (_) {}
}

/* ---------- main loop ---------- */
let last = performance.now(), ft = 1 / 60, ftT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
  // automatic resolution
  ft += (Math.min(0.2, raw) - ft) * 0.05; ftT += raw;
  if (prefs.quality === "auto" && S.started && ftT > 2 && !document.hidden) {
    ftT = 0;
    const want = ft > 1 / 40 ? autoPR * 0.85 : ft < 1 / 55 ? autoPR * 1.08 : autoPR, next = Math.max(0.6, Math.min(PR_MAX, want));
    if (Math.abs(next - autoPR) > 0.02) { autoPR = next; applyQuality(); }
  }
  if (S.started && !S.menu && !S.drive) { const n = Math.max(1, Math.ceil(dt / (1 / 120))); for (let i = 0; i < n; i++) physics(dt / n); }
  if (car) {
    const live = S.drive && S.started && !S.menu, n = live ? Math.max(1, Math.ceil(dt / (1 / 60))) : 1;
    for (let i = 0; i < n; i++) { const moved = car.update(live ? dt / n : 0, live ? driveKeys() : new Set(), PROFILES[prefs.speed] || PROFILES.crew); if (live) S.walked += moved; }
    if (S.drive) {
      // the world follows the rover while you drive
      S.x = car.s.x; S.z = car.s.z; S.y = car.s.y; S.vx = -Math.sin(car.s.heading) * car.s.v; S.vz = -Math.cos(car.s.heading) * car.s.v; S.grounded = true;
      const sp = Math.abs(car.s.v); if (sp > 0.05 && Math.random() < dt * 30) { const bx = car.s.x + Math.sin(car.s.heading) * 1.4, bz = car.s.z + Math.cos(car.s.heading) * 1.4; puff(bx, car.s.y, bz, Math.ceil(3 * car.s.surface.dust), 0.3 + sp * 0.25, 2.2); }
      if (car.s.tipped && !S.tipNote) { S.tipNote = true; toast("Rollover: the rover passed its 45° tilt limit. Open the menu and choose Back to the Mars map, or press R to have the rover righted."); }
      if (car.hit > 1 && audio) { audio.step(car.hit); car.hit = 0; }
    }
  }
  // keep the ground detail centred on the astronaut
  if (terrain.update(S.x, S.z)) rocks.place(S.x, S.z);
  updateDust(dt); updateSnow(dt);
  // camera
  const speed = Math.hypot(S.vx, S.vz), bk = prefs.bob ? 1 : 0.25, bob = S.grounded ? Math.sin(S.phase * Math.PI * 2) * Math.min(1, speed) * 0.022 * bk : 0;
  const third = prefs.view === "third" && astro.target !== 1 && astro.k < 0.05 && !S.drive;
  if (S.drive) { car.camera(camera, dt, S.rlook); if (me) { me.visible = MODE !== "rover"; if (S.walker) me.pose(dt, S.walker.x, S.walker.y, S.walker.z, S.walker.yaw, 0, 0, 0, true, 0, 0, S.lampOn); } }
  // first person, or third person (the ARES suit) unless the tablet is up
  else {
  if (me) {
    me.visible = third;
    if (speed > 0.25) S.bodyYaw = Math.atan2(-S.vx, -S.vz); else if (S.bodyYaw === undefined) S.bodyYaw = S.yaw;
    if (third || !me.visible) { const dy = ((((third ? S.bodyYaw : S.yaw) - (S.figYaw ?? S.yaw)) + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; S.figYaw = (S.figYaw ?? S.yaw) + Math.max(-dt * 6, Math.min(dt * 6, dy)); }
    me.pose(dt, S.x, S.y - S.land * 0.5, S.z, S.figYaw, S.vx, S.vy, S.vz, S.grounded, S.pitch, S.land, S.lampOn);
  }
  if (third) {
    const dist = 4.2, cp = Math.cos(S.pitch), tgt = new THREE.Vector3(S.x, S.y + 1.55, S.z);
    const cam = tgt.clone().add(new THREE.Vector3(Math.sin(S.yaw) * cp * dist, -Math.sin(S.pitch) * dist + 0.6, Math.cos(S.yaw) * cp * dist));
    cam.y = Math.max(cam.y, ground.height(cam.x, cam.z, 0) + 0.35);
    camera.position.copy(cam); camera.lookAt(tgt);
  } else {
    camera.position.set(S.x, S.y + P.eye + bob - S.land, S.z);
    camera.rotation.set(S.pitch, S.yaw, Math.sin(S.phase * Math.PI) * Math.min(1, speed) * 0.006 * bk, "YXZ");
  }
  }
  WORLD_U.uCam.value.copy(camera.position);
  // sky and light for the real (or chosen) local time
  const t = Date.now() + S.timeOffset, mt = marsTime(t, SITE.lon), dirs = skyDirs(t, SITE.lat, SITE.lon);
  const sunW = new THREE.Vector3(dirs.sun[0], dirs.sun[2], -dirs.sun[1]).normalize(), earthW = new THREE.Vector3(dirs.earth[0], dirs.earth[2], -dirs.earth[1]).normalize();
  const L = sky.update(camera.position, sunW, earthW, dt);
  // Daytime: the butterscotch dust sky calibrated to rover images (with the blue glow round the Sun). As the Sun sets it
  // fades out and the ARES night sky takes over: Milky Way, stars, Phobos and Deimos.
  sky.uni.uA.value = Math.pow(L.day, 0.7); sky.dome.visible = L.day > 0.002; sky.stars.visible = sky.sun.visible = sky.glow.visible = false;
  ares.update(camera.position, camera.position, sunW, mt.ltst / 24, dt, now / 1000, 1);
  if (L.day > 0.08) ares.phobosMesh.visible = ares.deimosMesh.visible = false;
  scene.fog.color.copy(L.fog);
  sunL.position.copy(camera.position).addScaledVector(sunW, 150); sunL.target.position.copy(camera.position); sunL.intensity = L.sunI; sunL.color.copy(L.sunC);
  sunL.castShadow = shadows && L.sunI > 0.05;
  hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground); hemi.intensity = 0.95 * L.day + 0.035;
  lamp.intensity = S.lampOn ? 140 : 0; lamp.position.copy(camera.position); lamp.target.position.copy(camera.position).add(new THREE.Vector3(0, -0.35, -1).applyEuler(camera.rotation).multiplyScalar(10));
  devils.update(dt, S.x, S.z, mt.ltst, L.day, L.dusk);
  if (route) { const r = route.update(dt, S.x, S.z); if (r) toast(r.last ? "Final stop reached. Check your oxygen margin before heading back." : `Stop ${String.fromCharCode(65 + r.reached)} reached. Next: ${String.fromCharCode(66 + r.reached)}.`); }
  if (buddy && prefs.buddy) { buddy.root.visible = MODE !== "rover"; S.buddy = buddy.update(S.started && !S.menu ? dt : 0, S.drive ? { x: S.walker ? S.walker.x : S.x, z: S.walker ? S.walker.z : S.z, vx: 0, vz: 0 } : S, P.g, S.lampOn); }
  { const tw = THREE.MathUtils.smoothstep(sunW.y, -0.24, 0.02) * (1 - THREE.MathUtils.smoothstep(sunW.y, 0.04, 0.36)); if (me) me.light(sunW, L.day, tw); if (buddy) buddy.fig.light(sunW, L.day, tw); }
  // first-person arms and tablet
  const inv = camera.quaternion.clone().invert();
  astro.update(dt, { speed: S.grounded ? speed * bk : 0, phase: S.phase * 2, airborne: !S.grounded, land: S.land }, {
    sunView: sunW.clone().applyQuaternion(inv), upView: new THREE.Vector3(0, 1, 0).applyQuaternion(inv), sunI: L.sunI * 0.85, sunC: L.sunC, sky: L.sky, ground: L.ground, hemiI: 0.9 * L.day + 0.05, env: 0.35 * L.day + 0.03, lamp: S.lampOn
  });
  renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); if (!third && !S.drive) astro.render();
  if (S.started) updateHud(dt, mt, dirs);
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  dustMat.uniforms.scale.value = innerHeight; if (astro) astro.resize();
});
window.EVA = { S, P, prefs, physics, keys, toggleTablet, showMenu, exitEva, scene, camera, renderer, get astro() { return astro; }, get terrain() { return terrain; }, get ground() { return ground; }, get car() { return car; }, setDrive };
boot();
