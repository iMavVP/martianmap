/* Loading screen: live NASA Sun (SDO), Mars with MOLA relief on its tilted axis, Phobos and Deimos, and live NASA facts.
   Also the shared settings panel and the About / NASA data sources dialog used on every screen. */
(() => {
  const S = window.MM_SKY, $ = (id) => document.getElementById(id);
  const reducedOS = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- preferences (shared) ---------- */
  const ls = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
  const P = Object.assign({ units: "km", motion: true, wx: true }, ls.get("mm.prefs", {}));
  window.MM_PREFS = P;
  const calm = () => !P.motion;
  function apply() {
    document.body.classList.toggle("calm", !P.motion);
    if (window.MM_TOOL) MM_TOOL.cfg().mi = P.units === "mi";
    if (window.MM_CONFIG) MM_CONFIG.spaceWeather = P.wx;
    if (window.MM && MM.renderDrawer) MM.renderDrawer();
  }
  const pop = document.createElement("div");
  pop.id = "set-pop"; pop.className = "set-pop"; pop.hidden = true; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Settings");
  document.body.appendChild(pop);
  const seg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, n]) => `<button type="button" data-pk="${k}" data-pv="${v}" class="${String(P[k]) === String(v) ? "is-on" : ""}">${n}</button>`).join("")}</div>`;
  function renderSet() {
    pop.innerHTML = `<p class="set-h">Settings</p>
      <label>Distance units</label>${seg("units", [["km", "Kilometres"], ["mi", "Miles"]])}
      <label>Animations</label>${seg("motion", [[true, "Full"], [false, "Reduced"]])}
      <label>Live space weather (NASA DONKI)</label>${seg("wx", [[true, "On"], [false, "Off"]])}
      <label>Offline</label><button type="button" class="set-link" data-offline>${OFF.msg || "Save Jezero for offline use"} <span aria-hidden="true">↓</span></button>
      <button type="button" class="set-link" data-about>About &amp; NASA data sources <span aria-hidden="true">→</span></button>
      <p class="set-note">Saved in this browser.</p>`;
  }
  function openSet(btn) {
    if (!pop.hidden && pop._btn === btn) { pop.hidden = true; return; }
    renderSet(); pop.hidden = false; pop._btn = btn;
    // the settings button can sit inside the Map tools card; anchor to whatever is on screen
    const anchor = btn.getBoundingClientRect().width ? btn : document.getElementById("tools-btn") || btn;
    const r = anchor.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.top = Math.max(8, Math.min(innerHeight - pop.offsetHeight - 8, r.bottom + 8)) + "px";
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
    if (r.left > innerWidth - 120) { pop.style.left = (r.left - w - 10) + "px"; pop.style.top = Math.max(8, Math.min(innerHeight - pop.offsetHeight - 104, r.top - 40)) + "px"; }
  }
  /* Save for offline: fetch the map and surface-walk tiles for Jezero (and the app itself) so the service worker keeps
     them. Handy for a demo on unreliable Wi-Fi. */
  const OFF = { msg: "", busy: false };
  async function saveOffline() {
    if (OFF.busy) return;
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) { OFF.msg = "Offline saving needs the site on http(s) and one reload"; renderSet(); return; }
    OFF.busy = true;
    const T = "https://trek.nasa.gov/tiles/Mars/EQ/", TS = "/1.0.0/default/default028mm/";
    const tiles = (prod, ext, z, la0, la1, lo0, lo1) => { const cols = 2 ** (z + 1), d = 360 / cols, out = []; for (let y = Math.floor((90 - la1) / d); y <= Math.floor((90 - la0) / d); y++) for (let x = Math.floor((lo0 + 180) / d); x <= Math.floor((lo1 + 180) / d); x++) out.push(`${T}${prod}${TS}${z}/${y}/${x}.${ext}`); return out; };
    const lat = 18.4447, lon = 77.4508, map = [], px = [];
    for (let z = 0; z <= 7; z++) { const r = z < 4 ? 30 : 2.5; map.push(...tiles("Viking_MDIM21_ClrMosaic_global_232m", "jpg", z, lat - r, lat + r, lon - r, lon + r)); }
    for (let z = 7; z <= 12; z++) { const r = z <= 9 ? 1.2 : 0.25; map.push(...tiles("Jezero_CTX_BlockAdj_dd", "png", z, lat - r, lat + r, lon - r, lon + r)); }
    for (let z = 11; z <= 15; z++) map.push(...tiles("JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd", "png", z, lat - 0.02, lat + 0.02, lon - 0.02, lon + 0.02));
    px.push(...tiles("Mars_MGS_MOLA_DEM_mosaic_global_463m_8", "png", 6, lat - 0.9, lat + 0.9, lon - 0.95, lon + 0.95), ...tiles("Viking_MDIM21_ClrMosaic_global_232m", "jpg", 7, lat - 0.9, lat + 0.9, lon - 0.95, lon + 0.95));
    px.push(...tiles("Jezero_CTX_BlockAdj_dd", "png", 13, lat - 0.02, lat + 0.02, lon - 0.02, lon + 0.02), ...tiles("JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd", "png", 15, lat - 0.004, lat + 0.004, lon - 0.004, lon + 0.004));
    const own = ["eva.html", "js/eva/main.js", "js/eva/terrain.js", "js/eva/regions.js", "js/eva/sky.js", "js/eva/mars.js", "js/eva/astronaut.js", "js/eva/audio.js", "js/eva/extras.js", "js/eva/drive.js", "js/eva/ares/models.js", "js/eva/ares/terrain.js", "js/eva/ares/roverBuilder.js", "js/eva/ares/textures.js", "js/hop.js", "vendor/three/three.module.min.js", "vendor/three/addons/math/ImprovedNoise.js", "vendor/three/addons/geometries/RoundedBoxGeometry.js", "js/m20-traverse.js"];
    const jobs = [...own.map((u) => [u, "same-origin"]), ...map.map((u) => [u, "no-cors"]), ...px.map((u) => [u, "cors"])];
    let done = 0, ok = 0;
    const next = async () => { while (jobs.length) { const [u, mode] = jobs.shift(); try { const r = await fetch(u, { mode }); if (r.ok || r.type === "opaque") ok++; } catch (_) {} done++; if (done % 10 === 0) { OFF.msg = `Saving… ${done} files`; if (!pop.hidden) renderSet(); } } };
    await Promise.all([next(), next(), next(), next(), next(), next()]);
    OFF.busy = false; OFF.msg = `Saved ${ok} files: Jezero works offline`; if (!pop.hidden) renderSet();
    if (window.MM) MM.toast(`Jezero saved for offline use (${ok} files). The map, CTX/HiRISE close-ups and the surface walk there now work without a connection.`);
  }
  pop.addEventListener("click", (e) => {
    if (e.target.closest("[data-offline]")) { saveOffline(); return; }
    const b = e.target.closest("[data-pk]"); if (!b) return;
    const k = b.dataset.pk, v = b.dataset.pv;
    P[k] = v === "true" ? true : v === "false" ? false : v; ls.set("mm.prefs", P); apply(); renderSet();
  });
  document.addEventListener("click", (e) => { if (!pop.hidden && !e.target.closest("#set-pop,[data-settings]")) pop.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") pop.hidden = true; });
  document.querySelectorAll("#intro-set,#set-btn").forEach((b) => { b.dataset.settings = "1"; b.addEventListener("click", () => openSet(b)); });
  apply();
  window.MM_SETTINGS = { open: openSet };

  /* ---------- About and NASA data sources ---------- */
  const SRC = [
    ["NASA Trek · Mars", "https://trek.nasa.gov/mars/", "Viking MDIM 2.1 color mosaic, MGS MOLA elevation and shaded relief, Mars Odyssey THEMIS day and night infrared, MGS TES albedo."],
    ["USGS Astrogeology · NASA Planetary Geologic Mapping", "https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars", "The 30 Mars quadrangles used as regions."],
    ["NASA Worldview and GIBS", "https://worldview.earthdata.nasa.gov/", "Blue Marble, shaded relief, VIIRS true color and VIIRS Black Marble city lights for Earth."],
    ["NASA Solar Dynamics Observatory", "https://sdo.gsfc.nasa.gov/", "The live Sun: HMI visible light with sunspots, AIA 304 Å chromosphere and AIA 171 Å corona."],
    ["NASA JPL Solar System Dynamics", "https://ssd.jpl.nasa.gov/planets/approx_pos.html", "Orbital elements for every planet position, the Mars clock and the launch period."],
    ["NASA Planetary Fact Sheet (NSSDCA)", "https://nssdc.gsfc.nasa.gov/planetary/factsheet/", "Diameter, gravity, day, year, temperature and axial tilt."],
    ["Mars 2020 Perseverance", "https://mars.nasa.gov/mars2020/multimedia/raw-images/", "Latest raw images, and MEDA weather at Jezero crater."],
    ["Curiosity's proposed path up Mount Sharp", "https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/", "Route animation built from MRO HiRISE, CRISM and CTX data."],
    ["NASA DONKI space weather", "https://api.nasa.gov/", "Solar flares and solar energetic particle events for the safety center."],
    ["Curiosity RAD", "https://science.nasa.gov/mission/msl-curiosity/", "Average surface radiation dose on Mars."]
  ];
  const about = document.createElement("dialog");
  about.className = "about-dlg"; about.setAttribute("aria-label", "About Martian Map");
  about.innerHTML = `<form method="dialog" class="about-x"><button class="text-btn" value="close" aria-label="Close">Close</button></form>
    <p class="kicker">About</p><h2>Martian Map</h2>
    <p class="lede">An interplanetary survival guide for the first crews on Mars: a layered NASA map of the surface, route planning on foot or by rover, and a crew safety center. Built for the 2026 NASA Space Apps Challenge.</p>
    <p class="group-label">NASA data in this app</p>
    <ul class="src-list">${SRC.map(([n, u, d]) => `<li><a href="${u}" target="_blank" rel="noopener">${n}</a><span>${d}</span></li>`).join("")}</ul>
    <p class="hint muted">Not an official NASA product. Safety procedures are concept procedures, not NASA flight rules. Star fields, the galaxy and the outer planets' surfaces are drawn by code, colored after NASA mission imagery.</p>`;
  document.body.appendChild(about);
  document.addEventListener("click", (e) => { if (e.target.closest("[data-about]")) { pop.hidden = true; if (!about.open) about.showModal(); } });
  about.addEventListener("click", (e) => { if (e.target === about) about.close(); });

  /* ---------- loading screen ---------- */
  const intro = $("intro");
  if (!intro) return;
  const fs = $("intro-fs");
  if (fs) fs.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); };
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;
  const dprOf = () => Math.min(2, devicePixelRatio || 1);

  // Static sky: field stars, the Milky Way and warm dust near the Sun.
  const sky = $("intro-stars");
  function paintSky() {
    seed = 7;
    const dpr = dprOf(), W = (sky.width = Math.round(sky.clientWidth * dpr)), H = (sky.height = Math.round(sky.clientHeight * dpr)), g = sky.getContext("2d");
    g.fillStyle = "#020309"; g.fillRect(0, 0, W, H);
    const glow = (x, y, r, c) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
    const ax = W * 1.05, ay = -H * 0.1, bx = W * 0.42, by = H * 1.1, len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len, px = -uy, py = ux;
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 80; i++) { const t = rnd(), o = gauss() * H * 0.12; glow(ax + ux * len * t + px * o, ay + uy * len * t + py * o, (40 + rnd() * 130) * dpr, `rgba(${90 + rnd() * 50},${90 + rnd() * 40},${150 + rnd() * 60},${0.025 + rnd() * 0.035})`); }
    for (let i = 0; i < 5200; i++) { const t = rnd(), o = gauss() * H * 0.09; const x = ax + ux * len * t + px * o, y = ay + uy * len * t + py * o; g.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.5})`; const s = dpr * (rnd() < 0.08 ? 1.4 : 0.8); g.fillRect(x, y, s, s); }
    g.globalCompositeOperation = "source-over";
    for (let i = 0; i < 26; i++) { const t = 0.15 + rnd() * 0.8, o = gauss() * H * 0.03; glow(ax + ux * len * t + px * o, ay + uy * len * t + py * o, (20 + rnd() * 50) * dpr, "rgba(2,3,9,.45)"); }
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 30; i++) glow(W * (0.0 + rnd() * 0.32), H * (0.22 + rnd() * 0.5), (50 + rnd() * 160) * dpr, `rgba(${200 + rnd() * 55},${90 + rnd() * 50},${40 + rnd() * 30},${0.02 + rnd() * 0.04})`);
    g.globalCompositeOperation = "source-over";
    for (let i = 0; i < 900; i++) { const r = Math.pow(rnd(), 4) * 1.6 + 0.35; g.globalAlpha = 0.2 + rnd() * 0.6; g.fillStyle = rnd() > 0.86 ? "#ffd9b0" : rnd() > 0.8 ? "#cfe0ff" : "#fff"; g.beginPath(); g.arc(rnd() * W, rnd() * H, r * dpr, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }

  // Spiral galaxy that slowly turns.
  const gal = $("intro-galaxy"), gg = gal.getContext("2d");
  const GP = []; for (let i = 0; i < 7000; i++) { const arm = i % 2, t = Math.pow(rnd(), 1.35); GP.push([t, arm * Math.PI + gauss() * 0.55, 0.06 + t * 0.94 + gauss() * 0.07, rnd() < 0.2, rnd()]); }
  function paintGalaxy(time) {
    const dpr = dprOf(), W = Math.round(gal.clientWidth * dpr), H = Math.round(gal.clientHeight * dpr);
    if (gal.width !== W || gal.height !== H) { gal.width = W; gal.height = H; }
    gg.clearRect(0, 0, W, H);
    const gx = W / 2, gy = H / 2, gr = Math.min(W, H) * 0.48, tilt = -0.42, sq = 0.38, spin = calm() ? 0 : time / 90000;
    gg.globalCompositeOperation = "lighter";
    const core = gg.createRadialGradient(gx, gy, 0, gx, gy, gr * 0.5); core.addColorStop(0, "rgba(255,240,215,.55)"); core.addColorStop(0.3, "rgba(255,225,190,.14)"); core.addColorStop(1, "rgba(0,0,0,0)");
    gg.fillStyle = core; gg.fillRect(0, 0, W, H);
    for (const [t, a0, rr, blue, b] of GP) {
      const th = t * 5.2 + a0 + spin / (0.3 + t), r = gr * rr, x0 = Math.cos(th) * r, y0 = Math.sin(th) * r * sq;
      gg.fillStyle = blue ? `rgba(170,190,255,${0.25 + b * 0.4})` : `rgba(255,${215 + b * 30},${195 + b * 40},${0.08 + b * 0.22})`;
      const s = dpr * (blue ? 1.3 : 0.9); gg.fillRect(gx + x0 * Math.cos(tilt) - y0 * Math.sin(tilt), gy + x0 * Math.sin(tilt) + y0 * Math.cos(tilt), s, s);
    }
    gg.globalCompositeOperation = "source-over";
  }

  // The live Sun from NASA SDO. If the images can't load, the drawn disk underneath stays.
  const sunEl = $("lx-sun");
  sunEl.querySelectorAll("img[data-sdo]").forEach((im) => {
    im.onload = () => im.classList.add("ok");
    im.onerror = () => { im.remove(); if (im.dataset.sdo === "HMIIC") sunEl.classList.add("no-sdo"); };
    im.src = `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_${im.dataset.sdo}.jpg`;
  });

  // Animated layer: corona streamers, prominences, coronal mass ejections, the solar wind and twinkling stars.
  const fx = $("intro-fx"), fg = fx.getContext("2d");
  const TW = Array.from({ length: 150 }, () => [rnd(), rnd(), 0.5 + rnd() * 1.6, rnd() * 6.28, 0.6 + rnd() * 2.4, rnd() > 0.8]);
  const wind = Array.from({ length: 240 }, () => ({ a: (rnd() - 0.5) * 2.3, r: 1 + rnd() * 6, v: 0.002 + rnd() * 0.006, w: rnd() }));
  const proms = [], cmes = [], co = document.createElement("canvas"), cx2 = co.getContext("2d");
  let nextProm = 0, nextCme = 2500;
  const n1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), h = (k) => { const s = Math.sin(k * 127.1) * 43758.5453; return s - Math.floor(s); }; return h(i) + (h(i + 1) - h(i)) * u; };
  function paintFx(time) {
    const dpr = dprOf(), W = Math.round(fx.clientWidth * dpr), H = Math.round(fx.clientHeight * dpr);
    if (fx.width !== W || fx.height !== H) { fx.width = W; fx.height = H; }
    fg.clearRect(0, 0, W, H);
    const sr = sunEl.getBoundingClientRect(), sx = (sr.left + sr.width / 2) * dpr, sy = (sr.top + sr.height / 2) * dpr, R = (sr.width / 2) * dpr, t = time / 1000, still = calm();
    // twinkling stars
    TW.forEach(([x, y, s, ph, f, big]) => {
      const a = still ? 0.6 : 0.25 + 0.75 * Math.abs(Math.sin(t * f * 0.6 + ph)); const X = x * W, Y = y * H;
      fg.globalAlpha = a; fg.fillStyle = "#fff"; fg.beginPath(); fg.arc(X, Y, s * dpr * 0.6, 0, 7); fg.fill();
      if (big) { fg.globalAlpha = a * 0.5; fg.fillRect(X - 6 * s * dpr, Y - 0.35 * dpr, 12 * s * dpr, 0.7 * dpr); fg.fillRect(X - 0.35 * dpr, Y - 6 * s * dpr, 0.7 * dpr, 12 * s * dpr); }
    });
    fg.globalAlpha = 1; fg.globalCompositeOperation = "lighter";
    // Corona, streamers, prominences and CMEs are drawn at quarter resolution, then scaled up so they blur into soft plasma.
    const q = 4, cw = Math.ceil(W / q), ch = Math.ceil(H / q);
    if (co.width !== cw || co.height !== ch) { co.width = cw; co.height = ch; }
    cx2.setTransform(1, 0, 0, 1, 0, 0); cx2.clearRect(0, 0, cw, ch); cx2.setTransform(1 / q, 0, 0, 1 / q, 0, 0); cx2.globalCompositeOperation = "lighter"; cx2.filter = calm() ? "none" : "blur(2.5px)";
    // wide corona
    const cg = cx2.createRadialGradient(sx, sy, R * 0.9, sx, sy, R * 4.2); cg.addColorStop(0, "rgba(255,196,130,.42)"); cg.addColorStop(0.25, "rgba(255,150,80,.12)"); cg.addColorStop(1, "rgba(255,120,60,0)");
    cx2.fillStyle = cg; cx2.beginPath(); cx2.arc(sx, sy, R * 4.2, 0, 7); cx2.fill();
    // corona streamers ("fumes"), each breathing on its own noise curve
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2 + 0.02 * Math.sin(t * 0.3 + i), n = n1(i * 0.73 + (still ? 0 : t * 0.35)), len = R * (1.15 + 1.9 * n * n), wv = 0.1 + 0.08 * n, bend = 0.12 * Math.sin(t * 0.5 + i * 1.7);
      const x0 = sx + Math.cos(a - wv) * R * 0.97, y0 = sy + Math.sin(a - wv) * R * 0.97, x1 = sx + Math.cos(a + wv) * R * 0.97, y1 = sy + Math.sin(a + wv) * R * 0.97;
      const tx = sx + Math.cos(a + bend) * len, ty = sy + Math.sin(a + bend) * len, mx = sx + Math.cos(a + bend * 0.5) * (R + len) / 2, my = sy + Math.sin(a + bend * 0.5) * (R + len) / 2;
      const sg = cx2.createRadialGradient(sx, sy, R * 0.95, sx, sy, len); sg.addColorStop(0, `rgba(255,214,150,${0.14 + 0.22 * n})`); sg.addColorStop(1, "rgba(255,140,70,0)");
      cx2.fillStyle = sg; cx2.beginPath(); cx2.moveTo(x0, y0); cx2.quadraticCurveTo(mx, my, tx, ty); cx2.quadraticCurveTo(mx, my, x1, y1); cx2.closePath(); cx2.fill();
    }
    // prominences: glowing plasma loops on the visible limb
    if (!still && time > nextProm) { proms.push({ a: (rnd() - 0.5) * 2.2, w: 0.08 + rnd() * 0.14, h: 0.08 + rnd() * 0.22, t0: time, life: 5000 + rnd() * 5000 }); nextProm = time + 1400 + rnd() * 2200; }
    for (let i = proms.length - 1; i >= 0; i--) {
      const p = proms[i], k = (time - p.t0) / p.life; if (k >= 1) { proms.splice(i, 1); continue; }
      const al = Math.sin(Math.PI * k), hh = R * p.h * (0.6 + 0.4 * Math.sin(Math.PI * k));
      const a0 = p.a - p.w, a1 = p.a + p.w, cx0 = sx + Math.cos(p.a) * (R + hh * 2), cy0 = sy + Math.sin(p.a) * (R + hh * 2);
      cx2.strokeStyle = `rgba(255,120,70,${0.75 * al})`; cx2.lineWidth = R * 0.045;
      cx2.beginPath(); cx2.moveTo(sx + Math.cos(a0) * R, sy + Math.sin(a0) * R); cx2.quadraticCurveTo(cx0, cy0, sx + Math.cos(a1) * R, sy + Math.sin(a1) * R); cx2.stroke();
    }
    // coronal mass ejections drifting out toward Mars
    if (!still && time > nextCme) { cmes.push({ a: (rnd() - 0.5) * 1.4, t0: time, life: 7000 }); nextCme = time + 9000 + rnd() * 7000; }
    for (let i = cmes.length - 1; i >= 0; i--) {
      const c = cmes[i], k = (time - c.t0) / c.life; if (k >= 1) { cmes.splice(i, 1); continue; }
      const rr = R * (1.1 + k * 5.5), w = 0.35 + k * 0.3, cx = sx + Math.cos(c.a) * rr * 0.55, cy = sy + Math.sin(c.a) * rr * 0.55;
      const cgr = cx2.createRadialGradient(cx, cy, rr * 0.25, cx, cy, rr * 0.55); cgr.addColorStop(0, "rgba(255,200,150,0)"); cgr.addColorStop(0.8, `rgba(255,190,140,${0.16 * (1 - k)})`); cgr.addColorStop(1, "rgba(255,190,140,0)");
      cx2.fillStyle = cgr; cx2.beginPath(); cx2.arc(cx, cy, rr * 0.55, c.a - w * 2.4, c.a + w * 2.4); cx2.lineTo(sx, sy); cx2.fill();
    }
    fg.globalCompositeOperation = "lighter"; fg.imageSmoothingEnabled = true; fg.drawImage(co, 0, 0, W, H); fg.drawImage(co, 0, 0, W, H);
    // solar wind streaming outward
    fg.lineCap = "round";
    wind.forEach((p) => {
      if (!still) { p.r += p.v * (1 + p.r * 0.35); if (p.r > 14) { p.r = 1.05; p.a = (rnd() - 0.5) * 2.3; } }
      const x = sx + Math.cos(p.a) * R * p.r, y = sy + Math.sin(p.a) * R * p.r, l = R * p.v * 6 * (1 + p.r * 0.35), al = Math.max(0, 0.5 - p.r / 28) * (0.4 + p.w * 0.6);
      fg.strokeStyle = `rgba(255,215,170,${al})`; fg.lineWidth = dpr * (0.6 + p.w * 0.8);
      fg.beginPath(); fg.moveTo(x, y); fg.lineTo(x - Math.cos(p.a) * l, y - Math.sin(p.a) * l); fg.stroke();
    });
    fg.globalCompositeOperation = "source-over";
    // lens ghosts along the line from the Sun through the screen centre
    const gx = innerWidth / 2 + px * 40, gy = innerHeight / 2 + py * 30, ssx = sx / dpr, ssy = sy / dpr;
    ghosts.forEach((el, k) => { const f = [0.62, 0.95, 1.32, 1.7][k]; el.style.transform = `translate(${ssx + (gx - ssx) * f}px,${ssy + (gy - ssy) * f}px) translate(-50%,-50%)`; });
  }
  const ghosts = [...$("lx-ghosts").children];
  let px = 0, py = 0;
  document.addEventListener("pointermove", (e) => {
    if (!document.body.contains(sky)) return;
    px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5;
    if (calm()) return;
    sky.style.transform = `translate(${px * -12}px,${py * -12}px) scale(1.03)`;
    gal.style.transform = `translate(${px * -18}px,${py * -14}px)`;
    $("intro-horizon").style.transform = `translate(${px * -24}px,${py * -14}px)`;
  });

  // Mars: Viking color over MOLA relief, turning slowly on its 25.2 degree axis. The Sun is to the left.
  const TILT = -25.19 * Math.PI / 180, SPIN = 0.0011;
  const hero = S.globe($("intro-globe"), { layout: (w, h) => ({ cx: w / 2, cy: h / 2, R: Math.min(w, h) * 0.43 }), light: [-0.86, 0.12, 0.5], atm: [1, 0.5, 0.26], halo: 1.1, ay: 1.25, ax: 0.18, az: TILT, seg: 144, bump: 10 });
  const horizon = S.globe($("intro-horizon"), { layout: (w, h) => { const R = Math.max(h * 1.25, w * 0.62); return { cx: w * 0.12, cy: h + R * 0.68, R }; }, light: [-0.85, 0.5, 0.16], atm: [1, 0.48, 0.24], halo: 1.035, ay: 1.9, ax: -1.22, seg: 192, detail: true, bump: 16, exposure: 1 });
  if (!hero) $("intro-globe").classList.add("no-gl");
  const both = (fn) => { if (hero) fn(hero); if (horizon) fn(horizon); };
  S.texture("mars", 2).then((t) => { if (t) both((g) => g.setTexture(t)); return S.texture("mola", 2); })
    .then((t) => { if (t) both((g) => g.setRelief(t)); return S.texture("mars", 3); })
    .then((t) => { if (t) both((g) => g.setTexture(t)); return S.texture("mola", 3); })
    .then((t) => { if (t) both((g) => g.setRelief(t)); });

  // Phobos and Deimos in Mars's equatorial plane (orbit sizes compressed so both fit). Periods 7.65 h and 30.3 h.
  const mc = $("intro-moons"), mg = mc.getContext("2d");
  const MOONS = [{ n: "PHOBOS", r: 1.42, k: 24.62 / 7.65, ph: 0.6, s: 3.6 }, { n: "DEIMOS", r: 1.95, k: 24.62 / 30.3, ph: 2.6, s: 2.6 }];
  function paintMoons() {
    const dpr = dprOf(), W = Math.round(mc.clientWidth * dpr), H = Math.round(mc.clientHeight * dpr);
    if (!W) return;
    if (mc.width !== W || mc.height !== H) { mc.width = W; mc.height = H; }
    mg.clearRect(0, 0, W, H);
    const gw = $("intro-globe").clientWidth * dpr, R = gw * 0.43, cx = W / 2, cy = H / 2, ax = 0.18, cxp = Math.cos(ax), sxp = Math.sin(ax), cz = Math.cos(TILT), sz = Math.sin(TILT);
    const P3 = (r, a) => { const x = r * Math.cos(a), y = 0, z = r * Math.sin(a); const y1 = cxp * y - sxp * z, z1 = sxp * y + cxp * z; return [cz * x - sz * y1, sz * x + cz * y1, z1]; };
    const hidden = (q) => q[2] < 0 && q[0] * q[0] + q[1] * q[1] < 1;
    MOONS.forEach((m) => {
      mg.lineWidth = dpr;
      for (let i = 0; i < 160; i++) { const q0 = P3(m.r, (i / 160) * 6.283), q1 = P3(m.r, ((i + 1) / 160) * 6.283); if (hidden(q0)) continue; mg.strokeStyle = `rgba(255,220,190,${q0[2] > 0 ? 0.16 : 0.06})`; mg.beginPath(); mg.moveTo(cx + q0[0] * R, cy - q0[1] * R); mg.lineTo(cx + q1[0] * R, cy - q1[1] * R); mg.stroke(); }
      const q = P3(m.r, m.ph); if (hidden(q)) return;
      const x = cx + q[0] * R, y = cy - q[1] * R, s = m.s * dpr * (1 + q[2] * 0.12);
      const gr = mg.createRadialGradient(x - s * 0.5, y - s * 0.2, 0, x, y, s * 1.3); gr.addColorStop(0, "#f2e6da"); gr.addColorStop(0.55, "#8d7c6c"); gr.addColorStop(1, "#2a221c");
      mg.fillStyle = gr; mg.beginPath(); mg.ellipse(x, y, s * 1.15, s, 0.4, 0, 7); mg.fill();
      mg.font = `600 ${8.5 * dpr}px "JetBrains Mono",monospace`; mg.fillStyle = "rgba(255,230,210,.55)"; mg.fillText(m.n, x + 7 * dpr, y - 6 * dpr);
    });
  }

  paintSky();
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => document.body.contains(sky) && paintSky(), 200); });
  let fact = 0;
  (function frame(time) {
    if (!document.body.contains(intro)) return;
    if (!calm()) { if (hero) hero.st.ay += SPIN; if (horizon) horizon.st.ay += SPIN * 0.06; MOONS.forEach((m) => (m.ph += SPIN * m.k)); }
    if (hero) hero.draw();
    if (horizon) horizon.draw();
    paintMoons(); paintFx(time || 0);
    if ((fact++ & 1) === 0) paintGalaxy(time || 0);
    requestAnimationFrame(frame);
  })(0);

  // Fact card thumbnail: a tiny lit Mars drawn from the same NASA texture.
  const fgl = $("fact-globe");
  const paintFact = (pix) => { const dpr = dprOf(); S.sprite(fgl, 23 * dpr, "mars", pix, [-0.7, -0.35, 0.6], 1.3, [1, 0.5, 0.25], { tilt: TILT }); };
  paintFact(null); S.pixels("mars").then((p) => p && paintFact(p));

  // Facts: live distances from NASA JPL orbital elements, Jezero weather from Perseverance, the rest from NASA fact sheets.
  const now = Date.now(), e = S.pos("earth", now), m = S.pos("mars", now), dE = S.dist(e, m), mkm = (au) => Math.round(au * S.AU_KM / 1e6).toLocaleString();
  const win = S.launchWindow(now), dd = (t) => Math.max(0, Math.round((t - now) / S.DAY));
  const FACTS = [
    ["MARS", `${mkm(m.r)} million km from the Sun today`],
    ["DISTANCE", `${mkm(dE)} million km from Earth today`],
    ["RADIO DELAY", `${(dE * 499.005 / 60).toFixed(1)} min each way at light speed`],
    ["LAUNCH PERIOD", win ? (win.open ? `Open now · closes in about ${dd(win.closes)} days` : `Opens in about ${dd(win.opens)} days`) : "Computed from planet positions"],
    ["THE SUN NOW", "Live images from NASA's Solar Dynamics Observatory"],
    ["GRAVITY", "3.71 m/s², 38% of Earth's"],
    ["AXIAL TILT", "25.2°, so Mars has seasons like Earth"],
    ["A SOL", "One Mars day lasts 24 h 39 min 35 s"]
  ];
  const dots = $("intro-dots"), ft = $("fact-t"), fd = $("fact-d");
  let i = 0, timer;
  const show = (n) => { i = (n + FACTS.length) % FACTS.length; ft.textContent = FACTS[i][0]; fd.textContent = FACTS[i][1]; dots.querySelectorAll("i").forEach((d, k) => d.classList.toggle("on", k === i)); const card = ft.closest(".lx-fact"); card.classList.remove("swap"); void card.offsetWidth; card.classList.add("swap"); };
  const drawDots = () => { dots.innerHTML = FACTS.map((_, k) => `<i role="button" tabindex="0" aria-label="Fact ${k + 1}" data-k="${k}"></i>`).join(""); };
  const restart = () => { clearInterval(timer); timer = setInterval(() => (document.body.contains(dots) ? show(i + 1) : clearInterval(timer)), 5200); };
  dots.addEventListener("click", (ev) => { const d = ev.target.closest("[data-k]"); if (d) { show(+d.dataset.k); restart(); } });
  dots.addEventListener("keydown", (ev) => { const d = ev.target.closest("[data-k]"); if (d && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); show(+d.dataset.k); restart(); } });
  drawDots(); show(0); restart();
  S.weather().then((w) => {
    if (!w || !document.body.contains(dots)) return;
    FACTS.splice(1, 0, ["JEZERO TODAY", `High ${Math.round(w.hi)} °C, low ${Math.round(w.lo)} °C on sol ${w.sol} (Perseverance)`]);
    drawDots(); show(i);
  });
})();
