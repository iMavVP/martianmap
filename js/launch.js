/* NASA on Earth: launch pads, NASA centers and the Deep Space Network, plus the Earth <-> Mars flight animation.
   Coordinates are approximate (to about 100 m) and taken from public NASA and U.S. Space Force facility locations. */
(() => {
  const M = window.MM, $ = M.$, esc = M.esc, S = window.MM_SKY;
  const ls = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
  const FAC = [
    // Launch pads
    { id: "lc39b", kind: "pad", name: "Launch Complex 39B", site: "Kennedy Space Center, Florida", lat: 28.6272, lng: -80.6208, note: "NASA's Space Launch System pad. Artemis I (2022) and Artemis II (2026) lifted off from here. The natural pad for a crewed SLS mission." },
    { id: "lc39a", kind: "pad", name: "Launch Complex 39A", site: "Kennedy Space Center, Florida", lat: 28.6084, lng: -80.6043, note: "Apollo 11 and 82 Space Shuttle missions launched here. Now used for crew and heavy-lift flights." },
    { id: "slc41", kind: "pad", name: "Space Launch Complex 41", site: "Cape Canaveral, Florida", lat: 28.5833, lng: -80.5829, note: "Curiosity (2011), MAVEN (2013) and Perseverance (2020) all left for Mars from this pad on Atlas V rockets." },
    { id: "slc40", kind: "pad", name: "Space Launch Complex 40", site: "Cape Canaveral, Florida", lat: 28.5620, lng: -80.5772, note: "Falcon 9 pad used for NASA crew, cargo and science launches." },
    { id: "slc3e", kind: "pad", name: "Space Launch Complex 3E", site: "Vandenberg, California", lat: 34.6401, lng: -120.5895, note: "InSight launched here in 2018, the first interplanetary mission to leave from the U.S. West Coast." },
    { id: "slc4e", kind: "pad", name: "Space Launch Complex 4E", site: "Vandenberg, California", lat: 34.6321, lng: -120.6107, note: "Falcon 9 pad for NASA Earth science missions into polar orbit." },
    { id: "w0a", kind: "pad", name: "Pad 0A", site: "Wallops Flight Facility, Virginia", lat: 37.8338, lng: -75.4881, note: "Antares cargo flights to the International Space Station launch from NASA's own range at Wallops." },
    { id: "w0b", kind: "pad", name: "Pad 0B", site: "Wallops Flight Facility, Virginia", lat: 37.8312, lng: -75.4913, note: "A Minotaur V launched the LADEE lunar mission from this pad in 2013." },
    // NASA centers
    { id: "hq", kind: "center", name: "NASA Headquarters", site: "Washington, D.C.", lat: 38.8830, lng: -77.0163, note: "Sets the agency's missions and budget." },
    { id: "jsc", kind: "center", name: "Johnson Space Center", site: "Houston, Texas", lat: 29.5593, lng: -95.0900, note: "Mission Control and astronaut training. Crewed flights are run from here." },
    { id: "ksc", kind: "center", name: "Kennedy Space Center", site: "Merritt Island, Florida", lat: 28.5240, lng: -80.6510, note: "NASA's launch operations center. Rockets are stacked in the Vehicle Assembly Building." },
    { id: "jpl", kind: "center", name: "Jet Propulsion Laboratory", site: "Pasadena, California", lat: 34.2013, lng: -118.1714, note: "Builds and drives NASA's Mars rovers, including Curiosity and Perseverance, and runs the Deep Space Network." },
    { id: "gsfc", kind: "center", name: "Goddard Space Flight Center", site: "Greenbelt, Maryland", lat: 38.9917, lng: -76.8526, note: "Builds science spacecraft and runs NASA's near-Earth communications network." },
    { id: "msfc", kind: "center", name: "Marshall Space Flight Center", site: "Huntsville, Alabama", lat: 34.6466, lng: -86.6745, note: "Manages the Space Launch System rocket." },
    { id: "arc", kind: "center", name: "Ames Research Center", site: "Moffett Field, California", lat: 37.4089, lng: -122.0644, note: "Entry heat shields, astrobiology and supercomputing." },
    { id: "afrc", kind: "center", name: "Armstrong Flight Research Center", site: "Edwards, California", lat: 34.9592, lng: -117.8842, note: "Flight research and test aircraft." },
    { id: "grc", kind: "center", name: "Glenn Research Center", site: "Cleveland, Ohio", lat: 41.4134, lng: -81.8618, note: "Space power and propulsion, including solar electric propulsion." },
    { id: "larc", kind: "center", name: "Langley Research Center", site: "Hampton, Virginia", lat: 37.0855, lng: -76.3804, note: "Tested Mars entry, descent and landing systems, and NASA's oldest field center." },
    { id: "ssc", kind: "center", name: "Stennis Space Center", site: "Hancock County, Mississippi", lat: 30.3624, lng: -89.6006, note: "Test-fires the RS-25 engines that power the SLS core stage." },
    { id: "maf", kind: "center", name: "Michoud Assembly Facility", site: "New Orleans, Louisiana", lat: 30.0278, lng: -89.9156, note: "Builds the SLS core stage and the Orion crew capsule structure." },
    { id: "wstf", kind: "center", name: "White Sands Test Facility", site: "Las Cruces, New Mexico", lat: 32.5021, lng: -106.6106, note: "Tests rocket propulsion and hazardous spacecraft materials." },
    // Deep Space Network
    { id: "gdscc", kind: "dsn", name: "Goldstone Complex", site: "Mojave Desert, California", lat: 35.4267, lng: -116.8900, note: "One of three Deep Space Network sites, spaced about 120° apart so a Mars crew is always in view of one." },
    { id: "mdscc", kind: "dsn", name: "Madrid Complex", site: "Robledo de Chavela, Spain", lat: 40.4314, lng: -4.2481, note: "Deep Space Network site covering Europe's part of each day." },
    { id: "cdscc", kind: "dsn", name: "Canberra Complex", site: "Tidbinbilla, Australia", lat: -35.4014, lng: 148.9817, note: "Deep Space Network site in the southern hemisphere. It often has the best view of spacecraft far south of the ecliptic." }
  ];
  const ICON = {
    pad: '<path d="M12 2.5c2.8 2.3 4.2 5.6 4.2 9.3l-1.7 3.2H9.5l-1.7-3.2c0-3.7 1.4-7 4.2-9.3Z"/><path d="M9.5 15 7 19.5l3-1M14.5 15l2.5 4.5-3-1"/><circle cx="12" cy="9.6" r="1.5"/>',
    center: '<path d="M4 20h16M6 20V9.5l6-4 6 4V20M10 20v-5h4v5"/>',
    dsn: '<path d="M5.3 13.4a7 7 0 0 0 9.9 0L5.3 3.5a7 7 0 0 0 0 9.9Z"/><path d="M10.3 8.4 14 4.7M9 16.5 7.3 20.5h8L13.6 16.5"/>'
  };
  const KIND = { pad: { many: "Launch pads", one: "Launch pad", c: "#ff7a3d" }, center: { many: "NASA centers", one: "NASA center", c: "#5b9bff" }, dsn: { many: "Deep Space Network", one: "Deep Space Network", c: "#b18cff" } };
  const svg = (k, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  const byId = Object.fromEntries(FAC.map((f) => [f.id, f]));
  let padId = byId[ls.get("mm.pad", "lc39b")] && byId[ls.get("mm.pad", "lc39b")].kind === "pad" ? ls.get("mm.pad", "lc39b") : "lc39b";
  let sel = null, group = "all";
  const fmt = (lat, lng) => `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(3)}°${lng >= 0 ? "E" : "W"}`;

  /* ---------- markers ---------- */
  const layer = L.layerGroup().addTo(M.maps.earth), marks = {};
  function drawMarkers() {
    layer.clearLayers();
    FAC.forEach((f) => {
      const cur = f.id === padId;
      const mk = L.marker([f.lat, f.lng], { title: f.name, riseOnHover: true, zIndexOffset: cur ? 500 : f.kind === "pad" ? 200 : 0,
        icon: L.divIcon({ className: "fac-icon", html: `<span class="fac fac-${f.kind}${cur ? " is-home" : ""}${sel === f.id ? " is-sel" : ""}">${svg(f.kind, 15)}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) })
        .bindTooltip(`${esc(f.name)}${cur ? " · launch site" : ""}`, { direction: "top", offset: [0, -14], className: "region-tip" });
      mk.on("click", () => open(f.id));
      marks[f.id] = mk.addTo(layer);
    });
  }

  /* ---------- drawer (Earth) ---------- */
  function launchLine() {
    const w = S.launchWindow(Date.now()), d = (t) => Math.max(0, Math.round((t - Date.now()) / S.DAY));
    return w ? (w.open ? `<span class="pill-ok">Launch period open</span> about ${d(w.closes)} days left` : `<span class="pill-warn">Launch period closed</span> opens in about ${d(w.opens)} days`) : "";
  }
  function drawer() {
    const p = byId[padId];
    if (sel) {
      const f = byId[sel], k = KIND[f.kind], isPad = f.kind === "pad", cur = f.id === padId;
      return `<button class="back" type="button" data-fx="back">← NASA on Earth</button>
        ${M.heroHtml("earth", f.lat, f.lng, 7)}
        <p class="kicker" style="color:${k.c}">${k.one}</p><h2>${esc(f.name)}</h2>
        <p class="muted">${esc(f.site)} · ${fmt(f.lat, f.lng)}</p>
        <div class="acts">${isPad ? `<button class="act primary" type="button" data-fx="go" data-id="${f.id}">${M.ICONS.rocket}<span>Launch</span></button>` : ""}
          ${isPad ? `<button class="act" type="button" data-fx="pad" data-id="${f.id}" ${cur ? "disabled" : ""}>${M.ICONS.pin}<span>${cur ? "Launch site" : "Use this pad"}</span></button>` : ""}
          <button class="act" type="button" data-fx="route" data-id="${f.id}">${M.ICONS.route}<span>Directions</span></button>
          <button class="act" type="button" data-fx="zoom" data-id="${f.id}">${M.ICONS.zoom}<span>Zoom in</span></button>
          <button class="act" type="button" data-fx="copy" data-id="${f.id}">${M.ICONS.share}<span>Share</span></button></div>
        <p class="lede">${esc(f.note)}</p>
        ${isPad ? `<p class="group-label">Next Mars departure</p><p class="hint">${launchLine()}</p>` : ""}
        <p class="group-label">Sources</p><div class="sources"><a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noopener">NASA Worldview</a></div>`;
    }
    const list = FAC.filter((f) => group === "all" || f.kind === group), groups = group === "all" ? ["pad", "center", "dsn"] : [group];
    return `<p class="kicker">Earth · NASA ground network</p><h1>NASA on Earth</h1>
      <p class="lede">Every Mars expedition starts here. Choose a launch pad, explore the NASA centers that build and run the mission, and see the antennas that carry every message to Mars.</p>
      <div class="launch-card"><div class="lc-ico">${svg("pad", 22)}</div><div class="lc-main"><small>Launch site</small><strong>${esc(p.name)}</strong><span>${esc(p.site)}</span></div>
        <button class="choice is-on" type="button" data-fx="go" data-id="${p.id}">Launch</button></div>
      <p class="hint">${launchLine()}</p>
      <div class="filters">${[["all", "All"], ["pad", "Launch pads"], ["center", "Centers"], ["dsn", "Deep Space Network"]].map(([v, n]) => `<button class="choice ${group === v ? "is-on" : ""}" type="button" data-fx="group" data-v="${v}">${n}</button>`).join("")}</div>
      ${groups.map((g) => `<p class="group-label">${KIND[g].many} · ${list.filter((f) => f.kind === g).length}</p>` + list.filter((f) => f.kind === g).map((f) => `<button class="row" type="button" data-fx="open" data-id="${f.id}"><span class="ico-b" style="--c:${KIND[f.kind].c}">${svg(f.kind, 17)}</span><span class="meta grow"><strong>${esc(f.name)}</strong><small>${esc(f.site)}</small></span>${f.id === padId ? '<span class="badge">Launch site</span>' : ""}</button>`).join("")).join("")}
      <p class="group-label">Imagery</p><p class="muted hint">Open Layers for Blue Marble, shaded relief, city lights, or one day of VIIRS true color from NASA Worldview.</p>
      <p class="group-label">Sources</p><div class="sources"><a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noopener">NASA Worldview</a></div>`;
  }
  function open(id) {
    const f = byId[id]; if (!f) return;
    sel = id; drawMarkers();
    if (M.state.planet === "earth") M.maps.earth.flyTo([f.lat, f.lng], Math.max(M.maps.earth.getZoom(), 7), { animate: !reduced() });
    M.renderDrawer();
  }
  function setGroup(k) {
    group = k; sel = null; drawMarkers();
    const pts = FAC.filter((f) => k === "all" || f.kind === k).map((f) => [f.lat, f.lng]);
    if (M.state.planet === "earth" && pts.length) M.maps.earth.fitBounds(pts, { padding: [80, 80], maxZoom: 6, paddingTopLeft: [innerWidth > 800 && !document.body.classList.contains("drawer-closed") ? 430 : 40, 90] });
    M.renderDrawer();
  }
  function setPad(id) { if (!byId[id] || byId[id].kind !== "pad") return; padId = id; ls.set("mm.pad", id); M.home = [byId[id].lat, byId[id].lng]; drawMarkers(); if (M.state.planet === "earth") M.renderDrawer(); }
  $("drawer-body").addEventListener("click", (e) => {
    const t = e.target.closest("[data-fx]"); if (!t || M.state.planet !== "earth") return;
    const a = t.dataset.fx, f = byId[t.dataset.id];
    if (a === "back") { sel = null; drawMarkers(); M.renderDrawer(); }
    else if (a === "open") open(f.id);
    else if (a === "group") setGroup(t.dataset.v);
    else if (a === "pad") setPad(f.id);
    else if (a === "go") { setPad(f.id); M.travel("mars"); }
    else if (a === "zoom") M.maps.earth.flyTo([f.lat, f.lng], 10, { animate: !reduced() });
    else if (a === "route") { if (window.MM_TOOL) MM_TOOL.add(f.lat, f.lng); }
    else if (a === "copy") { try { navigator.clipboard.writeText(`${f.name}, ${f.site} · ${fmt(f.lat, f.lng)}`); } catch (_) {} M.note("earth", "Location copied to your clipboard."); }
  });
  function search(q) {
    const n = q.trim().toLowerCase(); if (!n) return [];
    return FAC.filter((f) => `${f.name} ${f.site} ${KIND[f.kind].one}`.toLowerCase().includes(n)).slice(0, 7).map((f) => ({ label: f.name, sub: `${KIND[f.kind].one} · ${f.site}`, ico: f.kind, run: () => open(f.id) }));
  }

  /* ---------- flight animation ---------- */
  const reduced = () => !!(window.MM_PREFS && !MM_PREFS.motion);
  const sprCache = {}, sprReady = {};
  function bigSprite(planet) {
    const k = planet;
    if (sprCache[k]) return sprCache[k];
    const cv = document.createElement("canvas");
    S.sprite(cv, 150, planet, null, [-0.55, -0.45, 0.7], planet === "earth" ? 1.4 : 0.6, planet === "earth" ? [0.35, 0.6, 1] : [1, 0.5, 0.25]);
    Promise.all([S.pixels(planet), planet === "earth" ? S.pixels("lights") : null]).then(([p, nl]) => { sprReady[planet] = true; if (p) S.sprite(cv, 300, planet, p, [-0.55, -0.45, 0.7], planet === "earth" ? 1.4 : 0.6, planet === "earth" ? [0.35, 0.6, 1] : [1, 0.5, 0.25], { tilt: -(planet === "earth" ? 23.4 : 25.2) * Math.PI / 180, night: nl }); });
    return (sprCache[k] = cv);
  }
  function drawSLS(g, L, flick) {
    const cyl = (x0, x1, y0, y1, c0, c1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, c1); gr.addColorStop(0.35, c0); gr.addColorStop(0.6, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0); };
    // flames
    g.globalCompositeOperation = "lighter";
    [[-0.105, 0.03, 0.40], [0, 0.045, 0.44], [0.105, 0.03, 0.40]].forEach(([x, w, y]) => {
      const fl = L * (0.5 + 0.12 * flick + (x ? 0.08 : 0)), X = x * L, Y = y * L, gr = g.createLinearGradient(0, Y, 0, Y + fl);
      gr.addColorStop(0, "rgba(255,255,235,1)"); gr.addColorStop(0.2, "rgba(255,210,120,.95)"); gr.addColorStop(0.6, "rgba(255,120,40,.55)"); gr.addColorStop(1, "rgba(255,80,20,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(X - w * L, Y); g.quadraticCurveTo(X - w * L * 1.6, Y + fl * 0.45, X, Y + fl); g.quadraticCurveTo(X + w * L * 1.6, Y + fl * 0.45, X + w * L, Y); g.fill();
    });
    const halo = g.createRadialGradient(0, L * 0.5, 0, 0, L * 0.5, L * 0.45); halo.addColorStop(0, "rgba(255,170,80,.55)"); halo.addColorStop(1, "rgba(255,120,40,0)");
    g.fillStyle = halo; g.beginPath(); g.arc(0, L * 0.5, L * 0.45, 0, 7); g.fill();
    g.globalCompositeOperation = "source-over";
    // boosters
    [-1, 1].forEach((s) => {
      const x = s * 0.105 * L, w = 0.03 * L;
      cyl(x - w, x + w, -0.12 * L, 0.4 * L, "#f4f2ee", "#9a978f");
      g.fillStyle = "#3b3a37"; [0.0, 0.18].forEach((y) => g.fillRect(x - w, y * L, w * 2, 0.012 * L));
      g.fillStyle = "#e9e6df"; g.beginPath(); g.moveTo(x - w, -0.12 * L); g.quadraticCurveTo(x - w, -0.19 * L, x, -0.2 * L); g.quadraticCurveTo(x + w, -0.19 * L, x + w, -0.12 * L); g.fill();
      g.fillStyle = "#2a2927"; g.beginPath(); g.moveTo(x - w * 0.8, 0.4 * L); g.lineTo(x - w, 0.425 * L); g.lineTo(x + w, 0.425 * L); g.lineTo(x + w * 0.8, 0.4 * L); g.fill();
    });
    // core stage (orange foam insulation)
    cyl(-0.07 * L, 0.07 * L, -0.2 * L, 0.42 * L, "#d9813a", "#7a3d14");
    g.fillStyle = "rgba(60,25,8,.35)"; [0.02, 0.24].forEach((y) => g.fillRect(-0.07 * L, y * L, 0.14 * L, 0.006 * L));
    g.fillStyle = "#2a2927"; [-0.045, -0.015, 0.015, 0.045].forEach((x) => { g.beginPath(); g.moveTo((x - 0.012) * L, 0.42 * L); g.lineTo((x - 0.018) * L, 0.445 * L); g.lineTo((x + 0.018) * L, 0.445 * L); g.lineTo((x + 0.012) * L, 0.42 * L); g.fill(); });
    // upper stage, adapter, Orion
    g.fillStyle = "#cfccc5"; g.beginPath(); g.moveTo(-0.07 * L, -0.2 * L); g.lineTo(-0.05 * L, -0.25 * L); g.lineTo(0.05 * L, -0.25 * L); g.lineTo(0.07 * L, -0.2 * L); g.fill();
    cyl(-0.05 * L, 0.05 * L, -0.33 * L, -0.25 * L, "#f3f1ec", "#99968e");
    cyl(-0.05 * L, 0.05 * L, -0.385 * L, -0.33 * L, "#dedbd4", "#85827b");
    g.fillStyle = "#f6f4f0"; g.beginPath(); g.moveTo(-0.05 * L, -0.385 * L); g.lineTo(-0.022 * L, -0.455 * L); g.lineTo(0.022 * L, -0.455 * L); g.lineTo(0.05 * L, -0.385 * L); g.fill();
    g.fillStyle = "#c9c6bf"; g.fillRect(-0.006 * L, -0.55 * L, 0.012 * L, 0.1 * L);
    g.beginPath(); g.moveTo(-0.012 * L, -0.55 * L); g.lineTo(0, -0.585 * L); g.lineTo(0.012 * L, -0.55 * L); g.fill();
    g.fillStyle = "#1d4ed8"; g.fillRect(-0.016 * L, 0.06 * L, 0.032 * L, 0.05 * L); // agency stripe
  }
  // Earth <-> Mars flight. Liftoff, then a cruise that holds until the destination planet's NASA texture and the
  // destination map's NASA tiles have loaded (up to about 20 s), then arrival. The map switches early, under the overlay.
  function fly(to, swap, done) {
    const from = to === "mars" ? "earth" : "mars", p = byId[padId];
    const lines = to === "mars"
      ? [["LIFTOFF", `${p.name} · ${p.site}`], ["TRANS-MARS INJECTION", "Leaving Earth orbit"], ["CRUISE", "About 7 months to Mars"], ["MARS ORBIT INSERTION", "Entry, descent and landing"]]
      : [["MARS ASCENT", "Leaving the surface"], ["TRANS-EARTH INJECTION", "Leaving Mars orbit"], ["CRUISE", "About 7 months to Earth"], ["EARTH ENTRY", "Splashdown"]];
    const ov = document.createElement("div");
    ov.className = "fly"; ov.setAttribute("role", "status");
    ov.innerHTML = `<canvas></canvas><div class="fly-hud"><p class="fly-k">${from.toUpperCase()} <span>→</span> ${to.toUpperCase()}</p><p class="fly-t"></p><p class="fly-s"></p><div class="fly-bar"><i></i></div><p class="fly-data"></p></div><button class="fly-skip" type="button">Skip</button>`;
    document.body.appendChild(ov);
    const tEl = ov.querySelector(".fly-t"), sEl = ov.querySelector(".fly-s"), bar = ov.querySelector(".fly-bar i"), dEl = ov.querySelector(".fly-data");
    let swapped = false, ended = false, raf = 0;
    const doSwap = () => { if (!swapped) { swapped = true; swap(); } };
    const finish = () => { if (ended) return; ended = true; cancelAnimationFrame(raf); doSwap(); ov.classList.add("out"); setTimeout(() => { ov.remove(); if (done) done(); }, 700); };
    ov.querySelector(".fly-skip").onclick = finish;
    const A0 = bigSprite(from), A1 = bigSprite(to), started = performance.now();
    // How much of the destination is ready: the planet texture, and the NASA map tiles behind the overlay.
    // A tile counts as done once it has finished, loaded or failed (img.complete), so a missing tile can't stall the flight.
    const tiles = () => { const el = document.getElementById("map-" + to); if (!el) return 1; const all = [...el.querySelectorAll("img.leaflet-tile")]; return all.length ? all.filter((i) => i.complete).length / all.length : 0; };
    const readiness = () => (sprReady[to] ? 0.4 : 0) + 0.6 * Math.min(1, swapped ? tiles() / 0.85 : 0);
    const isReady = () => readiness() >= 0.999 || performance.now() - started > 20000;
    const dataLine = () => { const r = Math.round(readiness() * 100); dEl.textContent = r < 100 ? `Receiving NASA ${to === "mars" ? "Trek" : "Worldview"} imagery · ${r}%` : `NASA ${to === "mars" ? "Trek" : "Worldview"} imagery received`; };
    if (reduced()) {
      ov.classList.add("calm"); tEl.textContent = lines[2][0]; sEl.textContent = lines[2][1];
      setTimeout(doSwap, 200);
      const wait = () => { if (ended) return; dataLine(); bar.style.width = Math.round(readiness() * 100) + "%"; if (isReady()) { tEl.textContent = lines[3][0]; sEl.textContent = lines[3][1]; setTimeout(finish, 500); } else setTimeout(wait, 200); };
      return wait();
    }
    const cv = ov.querySelector("canvas"), g = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
    const W = (cv.width = Math.round(innerWidth * dpr)), H = (cv.height = Math.round(innerHeight * dpr));
    const T = 8000, HOLD = 0.66;
    const dir = (() => { const dx = 0.7, dy = -0.72, l = Math.hypot(dx, dy); return [dx / l, dy / l]; })();
    const stars = Array.from({ length: 420 }, () => [Math.random() * W, Math.random() * H, Math.random() * 0.8 + 0.2]);
    const puffs = [];
    const eOut = (x) => 1 - Math.pow(1 - x, 3), eIn = (x) => x * x * x, ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    let vt = 0, last = performance.now();
    function step(now) {
      const dt = Math.min(250, Math.max(0, now - last)); last = now; // real time, so slow computers don't stretch the flight
      // Virtual time runs at full speed, except at the cruise hold point while NASA imagery is still arriving.
      vt += dt * (vt / T >= HOLD && !isReady() ? 0.03 : 1);
      const t = Math.min(1, vt / T);
      const sp = t < 0.3 ? eOut(t / 0.3) : 1;
      g.fillStyle = "#02030a"; g.fillRect(0, 0, W, H);
      const neb = g.createRadialGradient(W * 0.6, H * 0.4, 0, W * 0.6, H * 0.4, W * 0.7); neb.addColorStop(0, "rgba(40,50,90,.25)"); neb.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = neb; g.fillRect(0, 0, W, H);
      // stars stream past, opposite the direction of travel
      g.lineCap = "round";
      stars.forEach((s) => {
        const v = (1 + sp * 55) * s[2] * dpr * (dt / 16.7); s[0] -= dir[0] * v; s[1] -= dir[1] * v;
        if (s[0] < -50 || s[1] > H + 50) { if (Math.random() < 0.5) { s[0] = W + 20; s[1] = Math.random() * H; } else { s[0] = Math.random() * W * 1.2; s[1] = -20; } }
        const len = Math.max(1, v * 3); g.strokeStyle = `rgba(230,240,255,${0.35 + s[2] * 0.6})`; g.lineWidth = s[2] * 1.6 * dpr;
        g.beginPath(); g.moveTo(s[0], s[1]); g.lineTo(s[0] + dir[0] * len, s[1] + dir[1] * len); g.stroke();
      });
      // origin planet falls away bottom-left
      const o = ease(Math.min(1, t / 0.4)), r0 = H * 0.62 * (1 - 0.6 * o);
      g.globalAlpha = Math.max(0, 1 - Math.max(0, t - 0.3) * 4);
      if (g.globalAlpha > 0) g.drawImage(A0, W * 0.1 - r0 - o * W * 0.3, H * 1.08 - r0 + o * H * 0.45, r0 * 2, r0 * 2);
      // destination planet grows top-right
      const k = Math.max(0, (t - 0.5) / 0.5), r1 = H * (0.05 + 0.62 * ease(k));
      g.globalAlpha = Math.min(1, k * 4);
      if (k > 0) g.drawImage(A1, W * 0.9 - r1 + (1 - ease(k)) * W * 0.1, H * -0.02 - r1 + ease(k) * H * 0.12, r1 * 2, r1 * 2);
      g.globalAlpha = 1;
      // rocket: climbs in, cruises mid-screen (holding there if needed), then burns out of frame
      const bob = Math.sin(now / 700) * 0.008;
      const u = t < 0.3 ? -0.18 + 0.68 * eOut(t / 0.3) : t < 0.72 ? 0.5 + 0.06 * (t - 0.3) / 0.42 + bob : 0.56 + 0.8 * eIn((t - 0.72) / 0.28);
      const x = W * (0.12 + 0.76 * u), y = H * (0.94 - 0.84 * u), Lr = Math.min(W, H) * 0.3;
      const shake = t < 0.15 ? (0.15 - t) * 14 * dpr : 0, sx = x + (Math.random() - 0.5) * shake, sy = y + (Math.random() - 0.5) * shake;
      const ang = Math.atan2(dir[1], dir[0]) + Math.PI / 2;
      const tx = sx - dir[0] * Lr * 0.5, ty = sy - dir[1] * Lr * 0.5, n = t > 0.3 && t < 0.72 ? 3 : 6;
      for (let i = 0; i < n; i++) puffs.push({ x: tx, y: ty, vx: -dir[0] * (4 + Math.random() * 6) * dpr + (Math.random() - 0.5) * 3 * dpr, vy: -dir[1] * (4 + Math.random() * 6) * dpr + (Math.random() - 0.5) * 3 * dpr, life: 1, r: (6 + Math.random() * 10) * dpr });
      g.globalCompositeOperation = "lighter";
      for (let i = puffs.length - 1; i >= 0; i--) {
        const q = puffs[i]; q.x += q.vx; q.y += q.vy; q.life -= 0.035; q.r *= 1.035;
        if (q.life <= 0) { puffs.splice(i, 1); continue; }
        const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r), hot = q.life > 0.6;
        gr.addColorStop(0, hot ? `rgba(255,190,110,${q.life * 0.5})` : `rgba(170,170,180,${q.life * 0.22})`); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill();
      }
      g.globalCompositeOperation = "source-over";
      g.save(); g.translate(sx, sy); g.rotate(ang); drawSLS(g, Lr, Math.random()); g.restore();
      // HUD
      const ph = t < 0.2 ? 0 : t < 0.35 ? 1 : t < 0.75 ? 2 : 3;
      if (tEl.textContent !== lines[ph][0]) { tEl.textContent = lines[ph][0]; sEl.textContent = lines[ph][1]; }
      bar.style.width = (t * 100).toFixed(1) + "%";
      dataLine();
      if (t >= 0.25) doSwap();
      if (t >= 1) return finish();
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    setTimeout(finish, 32000); // never leave the overlay stuck
  }

  M.home = [byId[padId].lat, byId[padId].lng];
  drawMarkers();
  setTimeout(() => { if (M.state.planet === "earth") M.renderDrawer(); }, 0);
  window.MM_LAUNCH = {
    fly, drawer, open, search, setGroup, setPad,
    pad: () => byId[padId], pads: () => FAC.filter((f) => f.kind === "pad"), home: () => M.home,
    reset: () => { sel = null; drawMarkers(); }, group: () => group, key: () => sel + group, svg
  };
})();
