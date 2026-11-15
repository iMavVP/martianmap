/* 3D globe view for Earth and Mars. Texture = the current base layer's NASA tiles (GIBS for Earth, Trek for Mars), stitched on the fly.
   Drag to rotate with momentum, scroll or +/- to zoom, click a spot to open the flat map there. */
(() => {
  const M = window.MM, $ = M.$;
  const box = $("globe3d"), cv = $("globe-cv"), pinsEl = $("globe-pins"), btn = $("globe-btn");
  let gl = null;
  try { gl = cv.getContext("webgl", { antialias: true, alpha: true }); } catch (_) {}
  if (!gl) { btn.style.display = "none"; return; }

  const VS = `attribute vec3 p;uniform float ay,ax,sc,asp,ox,rs;varying vec3 po,n;
  void main(){float cy=cos(ay),sy=sin(ay),cx=cos(ax),sx=sin(ax);
  vec3 q=vec3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);q=vec3(q.x,cx*q.y-sx*q.z,sx*q.y+cx*q.z);
  po=p;n=q;gl_Position=vec4(q.x*rs*sc/asp+ox,q.y*rs*sc,-q.z*rs*.5,1.);}`;
  const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform sampler2D tx;uniform float ht,merc,mode;uniform vec3 hc;varying vec3 po,n;
  const float PI=3.14159265;
  void main(){vec3 nn=normalize(n);
  if(mode>.5){gl_FragColor=vec4(hc,pow(max(nn.z,0.),1.4)*.8);return;}
  vec3 p=normalize(po);float lat=asin(clamp(p.y,-1.,1.)),lon=atan(p.x,p.z);
  float u=lon/(2.*PI)+.5;
  float v=merc>.5?.5-log(tan(PI/4.+clamp(lat,-1.4835,1.4835)/2.))/(2.*PI):.5-lat/PI;
  vec3 b=ht>.5?texture2D(tx,vec2(u,v)).rgb:vec3(.28);
  if(merc>.5)b=mix(b,vec3(.92,.95,.98),smoothstep(1.43,1.5,abs(lat)));
  float l=clamp(dot(nn,normalize(vec3(-.55,.4,.75))),0.,1.);float r=pow(1.-max(nn.z,0.),3.);
  gl_FragColor=vec4(b*(.2+1.0*l)+hc*r*.6,1.);}`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr); gl.useProgram(pr);
  const N = 96, K = 72, pos = [], idx = [];
  for (let j = 0; j <= K; j++) { const ph = Math.PI / 2 - (j / K) * Math.PI; for (let i = 0; i <= N; i++) { const la = (i / N - 0.5) * 2 * Math.PI; pos.push(Math.cos(ph) * Math.sin(la), Math.sin(ph), Math.cos(ph) * Math.cos(la)); } }
  for (let j = 0; j < K; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + N + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  const U = {}; ["ay", "ax", "sc", "asp", "ox", "rs", "ht", "merc", "mode", "hc"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const alt = (u) => u.replace(/\/EQ\/(Mars_)?([^/]+)\//, (m, p, n) => `/EQ/${p ? "" : "Mars_"}${n}/`);
  const cache = {};
  let on = false, planet = "earth", tex = null, ay = 0, ax = 0, vy = 0, vx = 0, sc = 0.8, tsc = 0.8, ox = 0, drag = false, moved = 0, lx = 0, ly = 0, raf = 0, token = 0, pins = [];

  /* ---------- texture from NASA tiles ---------- */
  function stitch(pln, layer, tpl, z) {
    const cols = pln === "earth" ? 2 ** z : 2 ** (z + 1), rows = 2 ** z;
    const c = document.createElement("canvas"); c.width = cols * 256; c.height = rows * 256;
    const g = c.getContext("2d"); let ok = 0, jobs = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) jobs.push(new Promise((res) => {
      const im = new Image(); im.crossOrigin = "anonymous";
      im.onload = () => { g.drawImage(im, x * 256, y * 256, 256, 256); ok++; res(); };
      im.onerror = res;
      im.src = tpl.replace("{z}", z).replace("{y}", y).replace("{x}", x).replace("{date}", M.state.date);
    }));
    return Promise.all(jobs).then(() => ({ c, ok, total: cols * rows }));
  }
  async function texFor(pln, layer) {
    const k = pln + ":" + layer.id + (layer.dated ? M.state.date : "");
    if (cache[k]) return cache[k];
    const maxT = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    let z = pln === "earth" ? 3 : Math.min(3, layer.maxZoom);
    while (256 * (pln === "earth" ? 2 ** z : 2 ** (z + 1)) > maxT && z > 1) z--;
    let r = await stitch(pln, layer, layer.url, z);
    if (pln === "mars" && r.ok < r.total * 0.5) { const r2 = await stitch(pln, layer, alt(layer.url), z); if (r2.ok > r.ok) r = r2; }
    if (r.ok < r.total * 0.3) return (cache[k] = null);
    try {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT === undefined ? gl.CLAMP_TO_EDGE : gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, r.c);
      return (cache[k] = t);
    } catch (_) { return (cache[k] = null); }
  }
  function sync() {
    if (!on) return;
    if (planet !== M.state.planet) { planet = M.state.planet; orient(); buildPins(); }
    const my = ++token, layer = M.state.layer[planet];
    $("globe-load").hidden = false;
    texFor(planet, layer).then((t) => { if (my !== token) return; tex = t; $("globe-load").hidden = true; if (!t) M.note(planet, "This layer's imagery couldn't be loaded for the globe. Try another base layer."); });
  }

  /* ---------- orientation, pins ---------- */
  function orient() { const c = M.maps[planet].getCenter(); ay = -(c.lng * Math.PI) / 180; ax = clamp((c.lat * Math.PI) / 180, -1.2, 1.2); vy = vx = 0; }
  function buildPins() {
    pinsEl.innerHTML = ""; pins = [];
    const list = planet === "mars" ? M.A.sites.map((s) => ({ lat: s.lat, lng: s.lng, label: s.mission, id: s.id })) : (M.home ? [{ lat: M.home[0], lng: M.home[1], label: "Launch site" }] : []);
    list.forEach((it) => { const b = document.createElement("button"); b.type = "button"; b.className = "gpin"; b.innerHTML = `<i></i><span>${M.esc(it.label)}</span>`; b.onclick = (e) => { e.stopPropagation(); if (it.id) { toggle(false); M.openSite(it.id); } else { toggle(false); M.maps.earth.setView([it.lat, it.lng], 8); } }; pinsEl.appendChild(b); it.el = b; pins.push(it); });
  }
  function project(lat, lng) {
    const ph = (lat * Math.PI) / 180, la = (lng * Math.PI) / 180, p = [Math.cos(ph) * Math.sin(la), Math.sin(ph), Math.cos(ph) * Math.cos(la)];
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    let q = [cy * p[0] + sy * p[2], p[1], -sy * p[0] + cy * p[2]]; q = [q[0], cx * q[1] - sx * q[2], sx * q[1] + cx * q[2]];
    return q;
  }
  function pick(cx, cy) {
    const r = cv.getBoundingClientRect(), asp = r.width / r.height, se = sc * (innerWidth > 800 ? 0.9 : 0.62);
    const nx = ((((cx - r.left) / r.width) * 2 - 1) - ox) * asp / se, ny = (1 - ((cy - r.top) / r.height) * 2) / se, d = nx * nx + ny * ny;
    if (d > 1) return null;
    const qz = Math.sqrt(1 - d), cxr = Math.cos(ax), sxr = Math.sin(ax), cyr = Math.cos(ay), syr = Math.sin(ay);
    const y1 = cxr * ny + sxr * qz, z1 = -sxr * ny + cxr * qz, px = cyr * nx - syr * z1, pz = syr * nx + cyr * z1;
    return { lat: (Math.asin(clamp(y1, -1, 1)) * 180) / Math.PI, lng: (Math.atan2(px, pz) * 180) / Math.PI };
  }

  /* ---------- render loop ---------- */
  function frame() {
    if (!on) { raf = 0; return; }
    const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(box.clientWidth * dpr), h = Math.round(box.clientHeight * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    if (!drag) { ay += vy + 0.0012; ax = clamp(ax + vx, -1.45, 1.45); vy *= 0.94; vx *= 0.94; }
    sc += (tsc - sc) * 0.14;
    ox = !document.body.classList.contains("drawer-closed") && innerWidth > 800 ? 424 / innerWidth : 0;
    const earth = planet === "earth";
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(U.ay, ay); gl.uniform1f(U.ax, ax); gl.uniform1f(U.sc, sc * (innerWidth > 800 ? 0.9 : 0.62)); gl.uniform1f(U.asp, w / h); gl.uniform1f(U.ox, ox);
    gl.uniform3f(U.hc, ...(earth ? [0.35, 0.65, 1] : [1, 0.58, 0.38]));
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
    gl.uniform1f(U.mode, 1); gl.uniform1f(U.rs, 1.13); gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
    gl.uniform1f(U.mode, 0); gl.uniform1f(U.rs, 1); gl.uniform1f(U.merc, earth ? 1 : 0);
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1f(U.ht, tex ? 1 : 0);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    const W = box.clientWidth, H = box.clientHeight, asp = w / h, s2 = sc * (innerWidth > 800 ? 0.9 : 0.62);
    pins.forEach((it) => { const q = project(it.lat, it.lng); const vis = q[2] > 0.1; it.el.style.display = vis ? "" : "none"; if (vis) { it.el.style.left = ((ox + (q[0] * s2) / asp + 1) / 2) * W + "px"; it.el.style.top = ((1 - q[1] * s2) / 2) * H + "px"; } });
    raf = requestAnimationFrame(frame);
  }

  /* ---------- interaction ---------- */
  const radius = () => (cv.clientHeight / 2) * sc * (innerWidth > 800 ? 0.9 : 0.62);
  cv.addEventListener("pointerdown", (e) => { drag = true; moved = 0; lx = e.clientX; ly = e.clientY; vy = vx = 0; cv.setPointerCapture(e.pointerId); cv.classList.add("grab"); });
  cv.addEventListener("pointermove", (e) => {
    if (drag) { const dx = e.clientX - lx, dy = e.clientY - ly, R = radius(); moved += Math.abs(dx) + Math.abs(dy); vy = dx / R; vx = dy / R; ay += vy; ax = clamp(ax + vx, -1.45, 1.45); lx = e.clientX; ly = e.clientY; }
    const p = pick(e.clientX, e.clientY);
    $("coords").textContent = p ? `${Math.abs(p.lat).toFixed(2)}°${p.lat >= 0 ? "N" : "S"}, ${Math.abs(p.lng).toFixed(2)}°${p.lng >= 0 ? "E" : "W"}` : "Drag to rotate · scroll to zoom";
  });
  cv.addEventListener("pointerup", (e) => {
    drag = false; cv.classList.remove("grab");
    if (moved > 6) return;
    const p = pick(e.clientX, e.clientY);
    if (!p) return;
    if (planet === "earth") { toggle(false); M.maps.earth.setView([p.lat, p.lng], 5, { animate: false }); }
    else { const r = M.regions.find((g) => p.lat >= g.south && p.lat <= g.north && p.lng >= g.west && p.lng <= g.east); if (r) { toggle(false); M.enterRegion(r.id); } }
  });
  cv.addEventListener("pointercancel", () => { drag = false; cv.classList.remove("grab"); });
  cv.addEventListener("wheel", (e) => { e.preventDefault(); tsc = clamp(tsc * (e.deltaY < 0 ? 1.12 : 0.89), 0.5, 2.6); }, { passive: false });
  // Zoom and reset buttons control the globe while it is open.
  document.querySelector(".zoom-box").addEventListener("click", (e) => { if (!on) return; e.stopPropagation(); tsc = clamp(tsc * (e.target.closest("#zoom-in") ? 1.25 : 0.8), 0.5, 2.6); }, true);
  $("reset-view").addEventListener("click", (e) => { if (!on) return; e.stopImmediatePropagation(); tsc = 0.8; orient(); }, true);

  function toggle(v) {
    on = v === undefined ? !on : v;
    document.body.classList.toggle("globe-on", on);
    box.hidden = !on;
    btn.setAttribute("aria-pressed", String(on));
    if (on) {
      planet = M.state.planet; orient(); buildPins(); tsc = 0.8; sync();
      M.note(planet, "Drag to rotate · scroll to zoom · click a spot to open the flat map there.");
      if (!raf) raf = requestAnimationFrame(frame);
    } else cancelAnimationFrame(raf), (raf = 0);
  }
  btn.addEventListener("click", () => toggle());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && on && !$("solar").classList.contains("on") && !document.querySelector("dialog[open]")) toggle(false); });
  window.MM_GLOBE = { sync: () => on && sync(), active: () => on, off: () => on && toggle(false) };
})();
