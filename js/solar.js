/* Solar system navigator. Real planet positions for any date (NASA JPL orbital elements), NASA-textured Earth and Mars,
   NASA Planetary Fact Sheet data, and the Earth-to-Mars launch period. Earth and Mars are destinations; the rest are locked. */
(() => {
  const M = window.MM, $ = M.$, esc = M.esc, S = window.MM_SKY, DAY = S.DAY;
  const reduced = () => !!(window.MM_PREFS && !MM_PREFS.motion);
  const PL = [
    { id: "mercury", n: "Mercury", sz: 4.5, des: "SOL-1" },
    { id: "venus", n: "Venus", sz: 7, des: "SOL-2" },
    { id: "earth", n: "Earth", sz: 8.5, des: "SOL-3", open: 1, atm: [0.35, 0.6, 1], d: "Home. NASA launch pads, mission centers and the Deep Space Network antennas that carry every message to and from Mars. Live NASA Worldview imagery." },
    { id: "mars", n: "Mars", sz: 7, des: "SOL-4", open: 1, atm: [1, 0.5, 0.25], d: "The charted surface: 30 USGS regions and 9 landing sites, layered NASA orbiter data, route planning on foot or by rover, and the crew safety center." },
    { id: "jupiter", n: "Jupiter", sz: 17, des: "SOL-5" },
    { id: "saturn", n: "Saturn", sz: 14, des: "SOL-6", rings: 1 },
    { id: "uranus", n: "Uranus", sz: 10, des: "SOL-7" },
    { id: "neptune", n: "Neptune", sz: 10, des: "SOL-8" },
    { id: "pluto", n: "Pluto", sz: 3.6, des: "DWARF" }
  ];
  const byId = Object.fromEntries(PL.map((p) => [p.id, p]));
  const FMAX = Math.log(1 + 41 / 0.25), cr = (r) => Math.log(1 + r / 0.25) / FMAX; // compressed radius so inner and outer planets both fit
  const fmtDate = (t) => new Date(t).toISOString().slice(0, 10);
  const mkm = (au) => (au * S.AU_KM / 1e6 >= 1000 ? (au * S.AU_KM / 1e9).toFixed(2) + " billion km" : Math.round(au * S.AU_KM / 1e6).toLocaleString() + " million km");

  const el = document.createElement("section");
  el.id = "solar"; el.className = "nav"; el.setAttribute("aria-label", "Solar system navigator");
  el.innerHTML = `<canvas class="nav-cv" aria-hidden="true"></canvas>
  <div class="nav-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <header class="nav-top">
    <div class="nav-tl"><span class="tag y">NAV</span><span class="tag">SOL</span><span class="nav-sys">HELIOCENTRIC · ECLIPTIC J2000 · NASA JPL · NASA SDO</span></div>
    <div class="nav-title"><div class="ruler" aria-hidden="true"></div><b>MARTIAN MAP</b><small>INTERPLANETARY NAVIGATION</small></div>
    <div class="nav-tr"><div class="nav-clock"><b id="nav-utc">--:--:--</b><small id="nav-msd">UTC</small></div><button class="nav-x" id="nav-close" type="button" hidden>Return to map <span aria-hidden="true">✕</span></button></div>
  </header>
  <aside class="nav-panel" id="nav-panel" aria-live="polite"></aside>
  <div class="nav-time" role="group" aria-label="Date">
    <button type="button" data-t="-30" aria-label="Back 30 days">◀ 30 D</button>
    <label class="sr-only" for="nav-range">Days from today</label><input id="nav-range" type="range" min="-400" max="1200" step="1" value="0"/>
    <button type="button" data-t="30" aria-label="Forward 30 days">30 D ▶</button>
    <button type="button" data-t="0" class="today">TODAY</button>
    <button type="button" id="nav-play" class="play" aria-pressed="false">▶ PLAY</button>
    <span id="nav-date" class="nav-date"></span>
  </div>
  <footer class="nav-bot"><span><i class="dia"></i>Destination</span><span><i class="lk-ico"></i>Locked</span><span><i class="tx-ico"></i>Transfer orbit</span>
    <span class="keys"><kbd>Click</kbd> Select <kbd>Drag</kbd> Rotate <kbd>Scroll</kbd> Zoom <kbd>Enter</kbd> Confirm <kbd>Esc</kbd> Back</span></footer>
  <div class="sr-only" id="nav-list">${PL.map((p) => `<button type="button" data-pick="${p.id}">${p.n}${p.open ? "" : " (locked)"}</button>`).join("")}</div>`;
  document.body.appendChild(el);
  const cv = el.querySelector(".nav-cv"), g = cv.getContext("2d");

  const V = { yaw: -0.5, sq: 0.42, zoom: 1, off: 0, hover: null, sel: "earth", entered: false, on: false, raf: 0, t0: performance.now() };
  let W = 0, H = 0, dpr = 1, stars = [], belt = [], orbits = {}, orbitKey = "", sprites = {}, pix = { earth: null, mars: null }, spriteTick = 0;

  /* ---------- geometry ---------- */
  const tNow = () => Date.now() + V.off * DAY;
  const wide = () => W / dpr > 900;
  function view() { const cx = W * (wide() ? 0.6 : 0.5), cy = H * (wide() ? 0.5 : 0.34); const k = V.zoom * Math.min(W * (wide() ? 0.56 : 0.62), (H * (wide() ? 0.47 : 0.36)) / V.sq); return { cx, cy, k }; }
  function proj(x, y, vw) { const r = Math.hypot(x, y), th = Math.atan2(y, x) + V.yaw, rr = vw.k * cr(r); return [vw.cx + rr * Math.cos(th), vw.cy - rr * Math.sin(th) * V.sq, Math.sin(th)]; }
  function rebuild() {
    dpr = Math.min(2, devicePixelRatio || 1); W = cv.width = Math.round(innerWidth * dpr); H = cv.height = Math.round(innerHeight * dpr);
    let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    stars = Array.from({ length: 520 }, () => [rnd() * W, rnd() * H, Math.pow(rnd(), 3) * 1.6 + 0.3, rnd() * 6.28, rnd()]);
    belt = Array.from({ length: 900 }, () => [2.15 + rnd() * 1.15 + (rnd() - 0.5) * 0.2, rnd() * 360, rnd()]);
    orbitKey = "";
  }
  function ensureOrbits() {
    const key = Math.round(V.off / 30) + "";
    if (key === orbitKey) return;
    orbitKey = key; const t = tNow();
    PL.forEach((p) => (orbits[p.id] = S.orbit(p.id, t, 240)));
  }

  /* ---------- drawing ---------- */
  function drawBg(time) {
    const gr = g.createRadialGradient(W * 0.62, H * 0.5, 0, W * 0.62, H * 0.5, Math.max(W, H) * 0.75);
    gr.addColorStop(0, "#0d2622"); gr.addColorStop(0.45, "#061412"); gr.addColorStop(1, "#010504");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    stars.forEach(([x, y, r, ph, b]) => { g.globalAlpha = 0.25 + 0.45 * b + (reduced() ? 0 : 0.2 * Math.sin(time / 900 + ph)); g.fillStyle = b > 0.85 ? "#ffe6c8" : "#e8fff6"; g.fillRect(x, y, r * dpr, r * dpr); });
    g.globalAlpha = 1;
  }
  function drawPlane(vw) {
    // Reference rings at 1, 2, 5, 10, 20 and 40 AU, with spokes every 30 degrees.
    g.lineWidth = dpr; g.font = `${9 * dpr}px "JetBrains Mono",ui-monospace,monospace`; g.textAlign = "left";
    [1, 2, 5, 10, 20, 40].forEach((au) => {
      const rr = vw.k * cr(au);
      g.strokeStyle = "rgba(120,220,200,.07)"; g.setLineDash([2 * dpr, 6 * dpr]);
      g.beginPath(); g.ellipse(vw.cx, vw.cy, rr, rr * V.sq, 0, 0, 7); g.stroke();
      g.setLineDash([]); g.fillStyle = "rgba(150,230,210,.32)"; g.fillText(au + " AU", vw.cx + rr * 0.97 * Math.cos(-0.35), vw.cy - rr * V.sq * Math.sin(-0.35) + 12 * dpr);
    });
    g.strokeStyle = "rgba(120,220,200,.045)";
    for (let a = 0; a < 12; a++) { const th = a * Math.PI / 6 + V.yaw, rr = vw.k; g.beginPath(); g.moveTo(vw.cx, vw.cy); g.lineTo(vw.cx + rr * Math.cos(th), vw.cy - rr * Math.sin(th) * V.sq); g.stroke(); }
    // Vernal equinox direction (0 deg ecliptic longitude).
    const [vx, vy] = proj(45, 0, vw); g.fillStyle = "rgba(150,230,210,.35)"; g.fillText("♈ 0°", vx + 4 * dpr, vy);
  }
  function drawOrbits(vw) {
    PL.forEach((p) => {
      const pts = orbits[p.id], hi = p.id === V.sel || p.id === V.hover, dest = p.open;
      g.beginPath(); pts.forEach((q, i) => { const s = proj(q[0], q[1], vw); i ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); });
      g.strokeStyle = hi ? "rgba(140,255,225,.75)" : dest ? "rgba(110,230,200,.42)" : "rgba(110,230,200,.2)";
      g.lineWidth = (hi ? 1.8 : 1.1) * dpr; g.shadowColor = "rgba(110,255,210,.6)"; g.shadowBlur = hi ? 10 * dpr : 4 * dpr; g.stroke(); g.shadowBlur = 0;
    });
  }
  function drawBelt(vw) {
    const days = V.off + (Date.now() - Date.parse("2026-01-01")) / DAY;
    g.fillStyle = "rgba(200,230,220,.5)";
    belt.forEach(([r, a0, b]) => { const th = (a0 + 360 / (Math.pow(r, 1.5) * 365.25) * days) * Math.PI / 180, s = proj(r * Math.cos(th), r * Math.sin(th), vw); g.globalAlpha = 0.15 + b * 0.35; g.fillRect(s[0], s[1], dpr * (b > 0.9 ? 1.6 : 1), dpr * (b > 0.9 ? 1.6 : 1)); });
    g.globalAlpha = 1;
  }
  // The Sun: NASA SDO visible light, 304 A chromosphere and 171 A corona, with an animated corona drawn at low resolution
  // and scaled up so it blurs into soft plasma, plus prominences that rise and fade on the limb.
  const cor = document.createElement("canvas"), cg = cor.getContext("2d"), proms = [];
  let nextProm = 0;
  function drawSun(vw, time) {
    const { cx, cy } = vw, R = Math.min(W, H) * 0.042 * (0.75 + 0.25 * V.zoom), t = time / 1000, still = reduced();
    const glow = (r, c0, c1) => { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); };
    const pulse = still ? 1 : 1 + 0.04 * Math.sin(t * 1.1) + 0.02 * Math.sin(t * 2.7);
    g.globalCompositeOperation = "lighter";
    glow(R * 14 * pulse, "rgba(255,170,90,.16)", "rgba(255,120,50,0)");
    glow(R * 5.5 * pulse, "rgba(255,215,150,.42)", "rgba(255,150,70,0)");
    // corona buffer: 10R square around the Sun at quarter resolution
    const S4 = Math.ceil(R * 10 / 4); if (cor.width !== S4) { cor.width = cor.height = S4; }
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, S4, S4); cg.setTransform(0.25, 0, 0, 0.25, S4 / 2, S4 / 2);
    cg.globalCompositeOperation = "lighter"; cg.filter = still ? "none" : "blur(1.5px)";
    const cgr = cg.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 4.6); cgr.addColorStop(0, "rgba(255,200,130,.55)"); cgr.addColorStop(0.3, "rgba(255,150,80,.15)"); cgr.addColorStop(1, "rgba(255,120,60,0)");
    cg.fillStyle = cgr; cg.beginPath(); cg.arc(0, 0, R * 4.6, 0, 7); cg.fill();
    for (let i = 0; i < 80; i++) {
      const a = (i / 80) * Math.PI * 2 + 0.03 * Math.sin(t * 0.3 + i), n = noise1(i * 0.77 + (still ? 0 : t * 0.45)), len = R * (1.2 + 2.4 * n * n), wv = 0.09 + 0.07 * n, bend = 0.14 * Math.sin(t * 0.6 + i * 1.7);
      const sg = cg.createRadialGradient(0, 0, R * 0.95, 0, 0, len); sg.addColorStop(0, `rgba(255,214,150,${0.2 + 0.3 * n})`); sg.addColorStop(1, "rgba(255,140,70,0)");
      const mr = (R + len) / 2;
      cg.fillStyle = sg; cg.beginPath(); cg.moveTo(Math.cos(a - wv) * R, Math.sin(a - wv) * R);
      cg.quadraticCurveTo(Math.cos(a + bend * 0.5) * mr, Math.sin(a + bend * 0.5) * mr, Math.cos(a + bend) * len, Math.sin(a + bend) * len);
      cg.quadraticCurveTo(Math.cos(a + bend * 0.5) * mr, Math.sin(a + bend * 0.5) * mr, Math.cos(a + wv) * R, Math.sin(a + wv) * R); cg.fill();
    }
    if (!still && time > nextProm) { proms.push({ a: Math.random() * 6.283, w: 0.1 + Math.random() * 0.14, h: 0.12 + Math.random() * 0.25, t0: time, life: 4000 + Math.random() * 4000 }); nextProm = time + 900 + Math.random() * 1500; }
    for (let i = proms.length - 1; i >= 0; i--) {
      const p = proms[i], k = (time - p.t0) / p.life; if (k >= 1) { proms.splice(i, 1); continue; }
      const al = Math.sin(Math.PI * k), hh = R * p.h * (0.6 + 0.4 * Math.sin(Math.PI * k));
      cg.strokeStyle = `rgba(255,110,60,${0.9 * al})`; cg.lineWidth = R * 0.07;
      cg.beginPath(); cg.moveTo(Math.cos(p.a - p.w) * R, Math.sin(p.a - p.w) * R); cg.quadraticCurveTo(Math.cos(p.a) * (R + hh * 2), Math.sin(p.a) * (R + hh * 2), Math.cos(p.a + p.w) * R, Math.sin(p.a + p.w) * R); cg.stroke();
    }
    cg.filter = "none";
    g.imageSmoothingEnabled = true; g.drawImage(cor, cx - R * 5, cy - R * 5, R * 10, R * 10); g.drawImage(cor, cx - R * 5, cy - R * 5, R * 10, R * 10);
    // anamorphic streak
    const st = g.createLinearGradient(cx - R * 16, 0, cx + R * 16, 0); st.addColorStop(0, "rgba(255,200,140,0)"); st.addColorStop(0.5, "rgba(255,225,180,.5)"); st.addColorStop(1, "rgba(255,200,140,0)");
    g.fillStyle = st; g.fillRect(cx - R * 16, cy - R * 0.035, R * 32, R * 0.07);
    g.globalCompositeOperation = "source-over";
    // the disk, right now, from NASA SDO
    const frame = (2 * R) / 0.78, spin = still ? 0 : t / 60;
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
    const base = g.createRadialGradient(cx, cy, 0, cx, cy, R); base.addColorStop(0, "#fff7dc"); base.addColorStop(0.55, "#ffd27a"); base.addColorStop(0.88, "#ff9a3c"); base.addColorStop(1, "#c4521a");
    g.fillStyle = base; g.fillRect(cx - R, cy - R, R * 2, R * 2);
    g.translate(cx, cy); g.rotate(spin);
    if (sun.hmi) { g.filter = "saturate(1.6) contrast(1.15) brightness(1.05)"; g.drawImage(sun.hmi, -frame / 2, -frame / 2, frame, frame); g.filter = "none"; }
    if (sun.chromo) { g.globalCompositeOperation = "screen"; g.globalAlpha = 0.7; g.drawImage(sun.chromo, -frame / 2, -frame / 2, frame, frame); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
    else if (!sun.hmi) { g.globalCompositeOperation = "overlay"; for (let i = 0; i < 140; i++) { const r = Math.sqrt(noise1(i * 3.1)) * R, a = noise1(i * 7.7) * 6.28; g.fillStyle = `rgba(255,${200 + 40 * noise1(i)},140,.18)`; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, R * 0.08, 0, 7); g.fill(); } g.globalCompositeOperation = "source-over"; }
    g.restore();
    // limb glow and the 171 A corona loops just outside the disk
    g.globalCompositeOperation = "lighter";
    const limb = g.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.12); limb.addColorStop(0, "rgba(255,170,80,0)"); limb.addColorStop(0.6, "rgba(255,190,110,.45)"); limb.addColorStop(1, "rgba(255,160,80,0)");
    g.fillStyle = limb; g.beginPath(); g.arc(cx, cy, R * 1.12, 0, 7); g.fill();
    if (sun.aia) { g.save(); g.beginPath(); g.arc(cx, cy, R * 1.22, 0, 7); g.arc(cx, cy, R * 0.98, 0, 7, true); g.clip(); g.globalAlpha = 0.6; g.translate(cx, cy); g.rotate(spin); g.drawImage(sun.aia, -frame / 2, -frame / 2, frame, frame); g.restore(); }
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "rgba(255,214,160,.75)"; g.font = `700 ${9 * dpr}px "JetBrains Mono",monospace`; g.textAlign = "center"; g.fillText(sun.hmi ? "SUN · NASA SDO LIVE" : "SUN", cx, cy + R * 2.3 + 10 * dpr);
  }
  const noise1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), h = (k) => { const s = Math.sin(k * 127.1) * 43758.5453; return s - Math.floor(s); }; return h(i) + (h(i + 1) - h(i)) * u; };
  const sun = { hmi: null, chromo: null, aia: null };
  S.sdo("HMIIC").then((im) => (sun.hmi = im)); S.sdo("0304").then((im) => (sun.chromo = im)); S.sdo("0171").then((im) => (sun.aia = im));
  function drawSweep(vw, time) {
    if (reduced() || !g.createConicGradient) return;
    const a = (time / 9000) % 1 * Math.PI * 2;
    g.save(); g.translate(vw.cx, vw.cy); g.scale(1, V.sq);
    const cg = g.createConicGradient(a, 0, 0); cg.addColorStop(0, "rgba(120,255,215,.10)"); cg.addColorStop(0.08, "rgba(120,255,215,0)"); cg.addColorStop(1, "rgba(120,255,215,0)");
    g.fillStyle = cg; g.beginPath(); g.arc(0, 0, vw.k * cr(42), 0, 7); g.fill(); g.restore();
  }
  function drawTrails(vw, pos) {
    PL.forEach((p) => {
      const pts = orbits[p.id], q = pos[p.id]; let best = 0, bd = 1e9;
      pts.forEach((o, i) => { const d = (o[0] - q.x) ** 2 + (o[1] - q.y) ** 2; if (d < bd) { bd = d; best = i; } });
      const n = 26, sp = proj(q.x, q.y, vw);
      for (let k = 0; k < n; k++) {
        const o0 = pts[(best - k + pts.length * 2) % (pts.length - 1)], o1 = pts[(best - k - 1 + pts.length * 2) % (pts.length - 1)];
        const a = k === 0 ? [sp[0], sp[1]] : proj(o0[0], o0[1], vw), b = proj(o1[0], o1[1], vw);
        g.strokeStyle = p.open ? `rgba(246,214,120,${0.55 * (1 - k / n)})` : `rgba(160,255,225,${0.4 * (1 - k / n)})`; g.lineWidth = (2.4 - 1.6 * k / n) * dpr;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
    });
  }
  function spriteFor(p, r, lx, ly) {
    const key = p.id; let s = sprites[key];
    if (!s) s = sprites[key] = { cv: document.createElement("canvas"), r: 0, lx: 9, ly: 9, rot: 0 };
    const f = S.FACT[p.id], rot = reduced() ? 0.7 : 0.7 + (performance.now() - V.t0) / 1000 * (2 * Math.PI) / (Math.sign(f.rotH) * Math.max(14, Math.abs(f.rotH) ** 0.6 * 6));
    const stale = Math.abs(s.r - r) > 0.5 || Math.hypot(s.lx - lx, s.ly - ly) > 0.06 || Math.abs(s.rot - rot) > 0.03;
    if (stale && (spriteTick % 2 === 0 || !s.r)) { S.sprite(s.cv, r, p.id, pix[p.id] || null, [lx, ly, 0.38], rot, p.atm || null, { tilt: -Math.min(f.tilt, 180 - f.tilt) * Math.PI / 180 * 0.8, night: p.id === "earth" ? pix.lights : null }); s.r = r; s.lx = lx; s.ly = ly; s.rot = rot; }
    return s.cv;
  }
  function drawPlanets(vw, time, pos) {
    const list = PL.map((p) => ({ p, s: proj(pos[p.id].x, pos[p.id].y, vw) })).sort((a, b) => a.s[1] - b.s[1]);
    list.forEach(({ p, s }) => {
      const [x, y] = s, r = p.sz * dpr * (0.82 + 0.28 * V.zoom), dx = vw.cx - x, dy = vw.cy - y, dl = Math.hypot(dx, dy) || 1;
      p._x = x; p._y = y; p._r = r;
      if (p.rings) S.rings(g, x, y, r, -0.32, false);
      const sp = spriteFor(p, r, dx / dl, dy / dl);
      g.drawImage(sp, x - r, y - r, r * 2, r * 2);
      if (p.rings) S.rings(g, x, y, r, -0.32, true);
      const sel = p.id === V.sel, hov = p.id === V.hover;
      // label
      g.font = `${sel ? 700 : 600} ${9.5 * dpr}px "JetBrains Mono",monospace`; g.textAlign = "center";
      g.fillStyle = sel ? "#ffd84d" : hov ? "#ffffff" : p.open ? "#d9fff2" : "rgba(200,235,225,.6)";
      g.shadowColor = "#000"; g.shadowBlur = 4 * dpr;
      g.fillText(p.n.toUpperCase().split("").join(String.fromCharCode(8202)), x, y + r + 16 * dpr);
      g.shadowBlur = 0;
      if (!p.open) drawLock(x + r + 5 * dpr, y - r - 3 * dpr);
      else drawDiamond(x + r + 8 * dpr, y - r - 6 * dpr, time);
      if (sel) drawReticle(x, y, r, time);
      else if (hov) { g.strokeStyle = "rgba(220,255,245,.55)"; g.lineWidth = dpr; g.beginPath(); g.arc(x, y, r + 7 * dpr, 0, 7); g.stroke(); }
    });
  }
  function drawLock(x, y) {
    const u = dpr; g.fillStyle = "rgba(220,245,238,.7)"; g.strokeStyle = "rgba(220,245,238,.7)"; g.lineWidth = 1.3 * u;
    g.fillRect(x - 4 * u, y, 8 * u, 6 * u); g.beginPath(); g.arc(x, y, 2.6 * u, Math.PI, 0); g.stroke();
  }
  function drawDiamond(x, y, time) {
    const s = 5.5 * dpr, a = reduced() ? 1 : 0.65 + 0.35 * Math.sin(time / 380);
    g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.globalAlpha = a; g.fillStyle = "#f6c945"; g.shadowColor = "#f6c945"; g.shadowBlur = 10 * dpr; g.fillRect(-s / 2, -s / 2, s, s);
    g.shadowBlur = 0; g.strokeStyle = "rgba(246,201,69,.6)"; g.lineWidth = dpr; g.strokeRect(-s, -s, s * 2, s * 2); g.restore(); g.globalAlpha = 1;
  }
  function drawReticle(x, y, r, time) {
    const R = r + 13 * dpr, a = reduced() ? 0 : time / 1600;
    g.strokeStyle = "rgba(235,255,248,.9)"; g.lineWidth = 1.5 * dpr;
    for (const o of [0, Math.PI]) { g.beginPath(); g.arc(x, y, R, a + o - 0.75, a + o + 0.75); g.stroke(); }
    g.strokeStyle = "rgba(235,255,248,.5)"; g.lineWidth = dpr;
    g.beginPath(); g.arc(x, y, R + 6 * dpr, -a * 1.3, -a * 1.3 + 0.5); g.stroke();
    const t = 5 * dpr; g.beginPath();
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([u, v]) => { g.moveTo(x + u * (R - t), y + v * (R - t)); g.lineTo(x + u * (R + t), y + v * (R + t)); });
    g.stroke();
  }
  function drawTransfer(vw, pos) {
    if (V.sel !== "mars" && V.sel !== "earth") return;
    const w = S.launchWindow(tNow()); if (!w) return;
    const tL = w.open ? tNow() : w.best, tA = tL + w.transit * DAY, e = S.pos("earth", tL), m = S.pos("mars", tA);
    const r1 = e.r, r2 = Math.hypot(m.x, m.y), l0 = Math.atan2(e.y, e.x);
    let dl = Math.atan2(m.y, m.x) - l0; dl = ((dl % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) || Math.PI;
    g.setLineDash([6 * dpr, 6 * dpr]); g.strokeStyle = "rgba(246,201,69,.85)"; g.lineWidth = 1.6 * dpr; g.shadowColor = "#f6c945"; g.shadowBlur = 8 * dpr;
    g.beginPath();
    for (let i = 0; i <= 90; i++) { const nu = (i / 90) * dl, rr = r1 + (r2 - r1) * (1 - Math.cos(Math.PI * i / 90)) / 2; const s = proj(rr * Math.cos(l0 + nu), rr * Math.sin(l0 + nu), vw); i ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); }
    g.stroke(); g.setLineDash([]); g.shadowBlur = 0;
    const lab = (pt, txt) => { const s = proj(pt.x, pt.y, vw); g.strokeStyle = "rgba(246,201,69,.9)"; g.lineWidth = 1.2 * dpr; g.beginPath(); g.arc(s[0], s[1], 5 * dpr, 0, 7); g.stroke(); g.fillStyle = "#f6c945"; g.font = `600 ${8.5 * dpr}px "JetBrains Mono",monospace`; g.textAlign = "left"; g.fillText(txt, s[0] + 9 * dpr, s[1] - 7 * dpr); };
    if (!w.open) lab(e, "LAUNCH " + fmtDate(tL));
    lab(m, "ARRIVE " + fmtDate(tA));
  }

  function frame(time) {
    if (!V.on) { V.raf = 0; return; }
    if (V.play) { V.off = V.off + 2 > 1200 ? -400 : V.off + 2; $("nav-range").value = V.off; if (spriteTick % 20 === 0) panel(); }
    ensureOrbits(); spriteTick++;
    const vw = view(), t = tNow(), pos = Object.fromEntries(PL.map((p) => [p.id, S.pos(p.id, t)]));
    drawBg(time); drawPlane(vw); drawSweep(vw, time); drawOrbits(vw); drawTrails(vw, pos); drawBelt(vw); drawTransfer(vw, pos); drawSun(vw, time); drawPlanets(vw, time, pos);
    if (spriteTick % 15 === 0) clock();
    V.raf = requestAnimationFrame(frame);
  }

  /* ---------- panel ---------- */
  const PADS = () => (window.MM_LAUNCH ? MM_LAUNCH.pads() : []);
  function panel() {
    const p = byId[V.sel], t = tNow(), here = S.pos(p.id, t), e = S.pos("earth", t), f = S.FACT[p.id], cur = M.state.planet, today = V.off === 0;
    const dE = p.id === "earth" ? 0 : S.dist(here, e);
    const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    let h = `<div class="np-hdr"><span>${p.n.toUpperCase()}</span><em>${p.des}${p.open ? (p.id === "earth" ? " · HOME" : " · SURVIVAL MAP") : " · LOCKED"}</em></div><div class="np-bd">`;
    h += `<p>${p.open ? p.d : `${p.n} has not been charted in this guide. Earth and Mars are the first two destinations. Data shown from NASA.`}</p>`;
    h += `<dl class="np-stats">${row("From Sun", mkm(here.r))}${p.id !== "earth" ? row("From Earth", mkm(dE)) + row("Signal delay", fmtLight(dE)) : row("Orbit", "1.000 AU")}${row("Diameter", f.d.toLocaleString() + " km")}${row("Gravity", f.g + " m/s²")}${row("Day", f.day)}${row("Year", f.yr)}${row("Mean temp", f.T)}</dl>`;
    if (!today) h += `<p class="np-note">Showing ${fmtDate(t)}. Press TODAY to return.</p>`;
    if (p.id === "mars") {
      const w = S.launchWindow(t), dd = (x) => Math.round((x - t) / DAY);
      if (w) h += `<div class="np-win ${w.open ? "open" : ""}"><b>LAUNCH PERIOD · ${w.open ? "OPEN" : "CLOSED"}</b><span>${w.open ? `Closes in about ${dd(w.closes)} days. Best around ${fmtDate(w.best)}.` : `Opens in about ${dd(w.opens)} days (${fmtDate(w.opens)}).`} Cruise about ${Math.round(w.transit / 30.4)} months.</span></div>`;
      const pads = PADS(), cp = window.MM_LAUNCH ? MM_LAUNCH.pad() : null;
      if (pads.length) h += `<label class="np-field">Launch site<select id="nav-pad">${pads.map((x) => `<option value="${x.id}" ${cp && cp.id === x.id ? "selected" : ""}>${esc(x.name)} · ${esc(x.site)}</option>`).join("")}</select></label>`;
      h += `<button class="np-go" id="nav-go" type="button">${cur === "mars" ? "Return to Mars map" : "Launch to Mars"}</button>`;
    } else if (p.id === "earth") h += `<button class="np-go" id="nav-go" type="button">${cur === "earth" ? "Return to Earth map" : "Go to Earth"}</button>`;
    else h += `<p class="np-lock"><i class="lk-ico"></i>NOT CHARTED · DATA ONLY</p>`;
    h += `<p class="np-src">Positions: NASA JPL orbital elements · Facts: NASA Planetary Fact Sheet</p></div>`;
    $("nav-panel").innerHTML = h;
  }
  const fmtLight = (au) => { const m = au * 499.005 / 60; return m < 60 ? m.toFixed(1) + " min" : (m / 60).toFixed(1) + " h"; };
  function clock() {
    const d = new Date(), msd = window.MM_SAFE ? MM_SAFE.math.marsNow().msd : null;
    $("nav-utc").textContent = d.toISOString().slice(11, 19) + " UTC";
    $("nav-msd").textContent = (msd ? `MARS SOL DATE ${msd.toFixed(2)}` : d.toISOString().slice(0, 10));
    $("nav-date").textContent = `${fmtDate(tNow())}${V.off ? ` · ${V.off > 0 ? "+" : ""}${V.off} D` : " · TODAY"}`;
  }

  /* ---------- interaction ---------- */
  function select(id) { V.sel = id; panel(); }
  function pick(cx, cy) {
    const x = cx * dpr, y = cy * dpr; let best = null, bd = 1e9;
    PL.forEach((p) => { if (p._x === undefined) return; const d = Math.hypot(p._x - x, p._y - y) - p._r; if (d < bd) { bd = d; best = p; } });
    return bd < 22 * dpr ? best : null;
  }
  let drag = null;
  cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, yaw: V.yaw, sq: V.sq, moved: 0 }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", (e) => {
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy)); if (drag.moved > 4) { V.yaw = drag.yaw + dx / 300; V.sq = Math.max(0.18, Math.min(0.9, drag.sq + dy / 600)); cv.classList.add("grab"); } }
    const h = pick(e.clientX, e.clientY); V.hover = h ? h.id : null; cv.style.cursor = drag && drag.moved > 4 ? "grabbing" : h ? "pointer" : "grab";
  });
  cv.addEventListener("pointerup", (e) => { const d = drag; drag = null; cv.classList.remove("grab"); if (d && d.moved <= 4) { const h = pick(e.clientX, e.clientY); if (h) { if (h.id === V.sel && e.detail > 1) confirm(); else select(h.id); } } });
  cv.addEventListener("dblclick", (e) => { const h = pick(e.clientX, e.clientY); if (h && h.open) { select(h.id); confirm(); } });
  cv.addEventListener("wheel", (e) => { e.preventDefault(); V.zoom = Math.max(0.6, Math.min(4, V.zoom * (e.deltaY < 0 ? 1.12 : 0.89))); }, { passive: false });
  el.querySelector("#nav-list").addEventListener("click", (e) => { const b = e.target.closest("[data-pick]"); if (b) select(b.dataset.pick); });
  el.querySelector(".nav-time").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (!b) return; const v = +b.dataset.t; if (!v && V.play) $("nav-play").click(); V.off = v ? Math.max(-400, Math.min(1200, V.off + v)) : 0; $("nav-range").value = V.off; panel(); clock(); });
  $("nav-range").addEventListener("input", (e) => { V.off = +e.target.value; panel(); clock(); });
  $("nav-play").addEventListener("click", () => { V.play = !V.play; $("nav-play").setAttribute("aria-pressed", V.play); $("nav-play").textContent = V.play ? "❚❚ PAUSE" : "▶ PLAY"; if (!V.play) panel(); });
  $("nav-panel").addEventListener("click", (e) => { if (e.target.closest("#nav-go")) confirm(); });
  $("nav-panel").addEventListener("change", (e) => { if (e.target.id === "nav-pad" && window.MM_LAUNCH) MM_LAUNCH.setPad(e.target.value); });
  $("nav-close").addEventListener("click", hide);
  document.addEventListener("keydown", (e) => {
    if (!V.on) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (e.key === "Escape" && V.entered) { e.preventDefault(); hide(); }
    else if (e.key === "Enter" && tag !== "BUTTON" && tag !== "SELECT" && tag !== "INPUT") confirm();
    else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && tag !== "INPUT") { const i = PL.findIndex((p) => p.id === V.sel); select(PL[(i + (e.key === "ArrowRight" ? 1 : PL.length - 1)) % PL.length].id); }
  });
  addEventListener("resize", () => { if (V.on) rebuild(); });

  function confirm() {
    const p = byId[V.sel];
    if (!p.open) return;
    const padSel = $("nav-pad"); if (padSel && window.MM_LAUNCH) MM_LAUNCH.setPad(padSel.value);
    V.entered = true;
    const same = p.id === M.state.planet;
    // Going to Earth is immediate. Going to Mars plays the launch, which covers the screen before this panel fades.
    if (!same) M.travel(p.id, { instant: p.id === "earth" });
    setTimeout(hide, same || p.id === "earth" ? 0 : 250);
  }
  function show() {
    rebuild(); V.sel = M.state.planet; V.off = 0; $("nav-range").value = 0; panel(); clock();
    $("nav-close").hidden = !V.entered;
    el.classList.add("on"); V.on = true;
    if (!V.raf) V.raf = requestAnimationFrame(frame);
    S.pixels("earth").then((p) => { pix.earth = p; sprites.earth = null; });
    S.pixels("mars").then((p) => { pix.mars = p; sprites.mars = null; });
    S.pixels("lights").then((p) => { pix.lights = p; sprites.earth = null; });
  }
  function hide() { el.classList.remove("on"); V.on = false; }
  $("solar-btn").addEventListener("click", show);
  window.MM_SOLAR = { show, hide, active: () => V.on };
})();
