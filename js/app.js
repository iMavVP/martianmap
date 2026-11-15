/* Martian Map: Earth and Mars in one maps-style app. Reads window.ATLAS from data.js. */
(() => {
  const A = window.ATLAS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const R = { earth: 6378137, mars: 3389500 };
  const calmNow = () => !!(window.MM_PREFS && !MM_PREFS.motion);

  const regions = A.regions.map((r) => ({ ...r, bounds: [[r.south, r.west], [r.north, r.east]], sites: A.sites.filter((s) => s.regionId === r.id) }));
  const regionById = Object.fromEntries(regions.map((r) => [r.id, r]));
  const siteById = Object.fromEntries(A.sites.map((s) => [s.id, s]));
  const WORLD = [[-90, -180], [90, 180]], LAT_ONLY = [[-90, -1e5], [90, 1e5]]; // Mars wraps east-west forever, like Earth
  const today = new Date().toISOString().slice(0, 10);

  const state = {
    planet: "earth", region: null, site: null, filter: "all", busy: false, marsReady: false,
    layer: { earth: A.earthLayers[0], mars: A.marsLayers[0] },
    tiles: {}, date: $("true-color-date").value
  };

  // On the EVA tablet the page is drawn through a 3D projection; canvas drawing shows up there reliably, SVG may not.
  const TABLET = new URLSearchParams(location.search).has("tablet");
  const maps = {
    earth: L.map("map-earth", { preferCanvas: TABLET, zoomControl: false, attributionControl: false, minZoom: 2, maxZoom: 10, worldCopyJump: true }).setView([20, 10], 2),
    // Trek tiles are equirectangular with a 2x1 grid at level 0, which matches Leaflet's EPSG:4326 grid, so zoom = tile level.
    mars: L.map("map-mars", { crs: L.CRS.EPSG4326, zoomControl: false, attributionControl: false, minZoom: 0, maxZoom: 10, zoomSnap: 0.25, maxBoundsViscosity: 1, worldCopyJump: true, renderer: TABLET ? L.canvas({ padding: 0.5 }) : L.svg({ padding: 1.5 }) }).setView([0, 0], 1)
  };
  const marsRegionLayer = L.layerGroup();
  const marsSiteLayer = L.layerGroup().addTo(maps.mars);
  const pins = {};

  /* ---------- tiles ---------- */
  state.over = { earth: {}, mars: {} }; state.opacity = 0.65;
  // A visible pop-up for short confirmations (copied, loaded, sent). Also announced to screen readers.
  const toastEl = document.createElement("div");
  toastEl.className = "toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
  document.body.appendChild(toastEl);
  function toast(text) { toastEl.textContent = text; toastEl.classList.remove("on"); void toastEl.offsetWidth; toastEl.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove("on"), 3600); }
  function note(planet, text) {
    if (state.planet !== planet) return;
    toast(text); // one message in one place (the status bar keeps the data credit)
  }
  // NASA Trek layer names appear with and without a "Mars_" prefix, so each Mars layer has a built-in second spelling to fall back on.
  const altName = (u) => u.replace(/\/EQ\/(Mars_)?([^/]+)\//, (m, p, n) => `/EQ/${p ? "" : "Mars_"}${n}/`);
  function setLayer(planet, layer, altIdx = -1) {
    const mars = planet === "mars", m = maps[planet];
    if (state.tiles[planet]) m.removeLayer(state.tiles[planet]);
    const alts = mars ? [altName(layer.url)] : [];
    const tl = L.tileLayer(altIdx < 0 ? layer.url : alts[altIdx], {
      date: state.date, maxNativeZoom: layer.maxZoom, maxZoom: 18,
      noWrap: false, keepBuffer: 4, updateWhenZooming: false
    });
    let ok = 0, bad = 0;
    tl.on("loading", () => { ok = 0; bad = 0; });
    tl.on("tileload", () => ok++);
    // Retry each failed tile once, since the Trek server sometimes drops requests under load.
    tl.on("tileerror", (e) => {
      const t = e.tile;
      if (!t._retried) { t._retried = 1; setTimeout(() => { t.src = tl.getTileUrl(e.coords) + (mars ? "?r=1" : ""); }, 700); }
      else bad++;
    });
    tl.on("load", () => setTimeout(() => {
      if (state.tiles[planet] !== tl || !bad) return;
      if (bad > ok && altIdx + 1 < alts.length) return setLayer(planet, layer, altIdx + 1);
      note(planet, ok ? "Some areas have no coverage in this layer." : "No tiles here for this layer. Try another one.");
    }, 2500));
    tl.addTo(m);
    state.tiles[planet] = tl;
    state.layer[planet] = layer;
    if (window.MM_GLOBE) MM_GLOBE.sync();
    if (state.over[planet][layer.id]) { m.removeLayer(state.over[planet][layer.id]); delete state.over[planet][layer.id]; }
    renderLayers();
    updateStatus();
  }

  /* ---------- Mars regions: the "countries" of Mars ---------- */
  function fitPadding() {
    const open = !document.body.classList.contains("drawer-closed");
    const wide = innerWidth > 800;
    return { paddingTopLeft: [open && wide ? 424 : 24, 76], paddingBottomRight: [76, open && !wide ? innerHeight * 0.5 : 56], animate: false };
  }

  function showOverview() {
    const m = maps.mars;
    state.region = null; state.site = null;
    marsSiteLayer.clearLayers();
    m.dragging.enable(); m.setMaxBounds(null);
    m.setMinZoom(0); m.setMaxZoom(10);
    // Fill the whole screen with Mars (like Earth does) instead of leaving empty margins.
    let z = m.getBoundsZoom(WORLD, true);
    if (!isFinite(z)) z = 2;
    m.setView([10, 0], z, { animate: false });
    m.setMinZoom(z); m.setMaxZoom(z);
    m.setMaxBounds(LAT_ONLY);
    m.dragging.enable();
    marsRegionLayer.addTo(m);
    updateLock(); renderDrawer();
    if (!showOverview.told) { showOverview.told = true; setTimeout(() => note("mars", "Mars wraps around like Earth. The dashed 180° line marks where the map repeats."), 900); }
  }

  function enterRegion(id) {
    const r = regionById[id], m = maps.mars;
    if (!r) return;
    state.region = r; state.site = null;
    marsRegionLayer.remove();
    marsSiteLayer.clearLayers();
    m.dragging.enable(); m.setMaxBounds(null);
    // Charts with sharper NASA imagery (see js/detail.js) let you zoom much closer.
    m.setMinZoom(0); m.setMaxZoom(window.MM_DETAIL ? MM_DETAIL.maxZoom(r.id) : 10);
    m.fitBounds(r.bounds, fitPadding());
    m.setMinZoom(m.getZoom());
    m.setMaxBounds(L.latLngBounds(r.bounds).pad(0.35));
    r.sites.forEach((s) => {
      const mk = L.marker([s.lat, s.lng], {
        title: `${s.mission} · ${s.name}`,
        icon: L.divIcon({ className: "site-icon", html: `<span class="site-dot" data-site="${s.id}"></span>`, iconSize: [20, 20], iconAnchor: [10, 10] })
      }).bindTooltip(s.mission, { direction: "top", offset: [0, -8], className: "region-tip" });
      mk.on("click", () => openSite(s.id));
      mk.addTo(marsSiteLayer);
    });
    updateLock(); renderDrawer();
  }

  function leaveRegion() { if (state.planet === "mars" && state.region) showOverview(); }

  function openSite(id) {
    const s = siteById[id];
    if (!s) return;
    if (!state.region || state.region.id !== s.regionId) enterRegion(s.regionId);
    state.site = s;
    document.querySelectorAll(".site-dot").forEach((d) => d.classList.toggle("is-active", d.dataset.site === id));
    maps.mars.flyTo([s.lat, s.lng], Math.max(maps.mars.getZoom(), 5), { animate: !calmNow() });
    renderDrawer();
  }

  function buildRegionShapes() {
    // Each chart is drawn on the main map and on the copies either side, so panning never runs out of regions.
    [-360, 0, 360].forEach((off) => regions.forEach((r) => {
      const base = { color: "#c2410c", weight: 1.5, fillColor: "#c2410c", fillOpacity: r.sites.length ? 0.14 : 0.05 };
      const rect = L.rectangle([[r.south, r.west + off], [r.north, r.east + off]], base).bindTooltip(r.name, { sticky: true, direction: "top", className: "region-tip" });
      rect.on("mouseover", () => rect.setStyle({ fillOpacity: 0.32, weight: 2.5 }));
      rect.on("mouseout", () => rect.setStyle(base));
      rect.on("click", () => enterRegion(r.id));
      rect.addTo(marsRegionLayer);
    }));
    // Landmarks (IAU names from the USGS Gazetteer of Planetary Nomenclature) and a longitude grid, so you can tell where
    // you are when the map repeats. The dashed 180 degree line is where Mars wraps around.
    const FEAT = A.features;
    const lon = (x) => (x === 0 ? "0°" : x === 180 || x === -180 ? "180°" : `${Math.abs(x)}°${x > 0 ? "E" : "W"}`);
    [-360, 0, 360].forEach((off) => {
      for (let x = -180; x < 180; x += 30) {
        const seam = x === -180, prime = x === 0;
        L.polyline([[-90, x + off], [90, x + off]], { color: seam ? "#ffd6b0" : prime ? "#ffb27a" : "#ffffff", weight: seam ? 2 : prime ? 1.5 : 1, opacity: seam ? 0.75 : prime ? 0.55 : 0.12, dashArray: seam ? "8 8" : null, interactive: false }).addTo(marsRegionLayer);
        L.marker([0, x + off], { interactive: false, keyboard: false, icon: L.divIcon({ className: "feat-icon", iconSize: [0, 0], html: `<span class="lon-label${seam ? " seam" : prime ? " prime" : ""}">${seam ? "180° · Mars repeats here" : prime ? "0° · prime meridian" : lon(x)}</span>` }) }).addTo(marsRegionLayer);
      }
      L.polyline([[0, -180 + off], [0, 180 + off]], { color: "#ffffff", weight: 1, opacity: 0.14, interactive: false }).addTo(marsRegionLayer);
      FEAT.filter((f) => f[3] !== "hud").forEach(([n, la, lo, size, kind]) => L.marker([la, lo + off], { interactive: false, keyboard: false, icon: L.divIcon({ className: "feat-icon", iconSize: [0, 0], html: `<span class="feat-label ${size} ${kind}">${n}</span>` }) }).addTo(marsRegionLayer));
    });
  }

  function updateLock() {
    const chip = $("lock-chip");
    chip.hidden = !(state.planet === "mars" && state.region);
    if (state.region) $("lock-name").textContent = `${state.region.id} · ${state.region.name}`;
    if (window.MM_TOOL) MM_TOOL.regionChanged();
  }

  /* ---------- drawer ---------- */
  const sourceLinks = (idx) => `<div class="sources">${idx.map((i) => `<a href="${esc(A.sources[i].href)}" target="_blank" rel="noopener">${esc(A.sources[i].name)}</a>`).join("")}</div>`;
  const fmtLat = (v) => (v === 0 ? "0°" : `${Math.abs(v)}°${v > 0 ? "N" : "S"}`);
  const fmtLng = (v) => (Math.abs(v) >= 179.99 ? `${v < 0 ? "180°W" : "180°E"}` : v === 0 ? "0°" : `${Math.abs(v)}°${v > 0 ? "E" : "W"}`);

  /* ---------- shared icons, NASA imagery heroes, quick chips ---------- */
  const ic = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    route: ic('<path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M8 17h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16"/>'),
    shield: ic('<path d="M12 3 5 6v5.5c0 4.3 2.9 7.6 7 9.5 4.1-1.9 7-5.2 7-9.5V6l-7-3Z"/><path d="M12 8v5M12 15.8v.4"/>'),
    layers: ic('<path d="M12 4 3 9l9 5 9-5-9-5Z"/><path d="m3 14 9 5 9-5"/>'),
    share: ic('<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>'),
    hud: ic('<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M8 12h8M12 9v6"/>'),
    rocket: ic('<path d="M12 2.5c2.8 2.3 4.2 5.6 4.2 9.3l-1.7 3.2H9.5l-1.7-3.2c0-3.7 1.4-7 4.2-9.3Z"/><path d="M9.5 15 7 19.5l3-1M14.5 15l2.5 4.5-3-1"/><circle cx="12" cy="9.6" r="1.5"/>'),
    pin: ic('<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>'),
    zoom: ic('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3M11 8.5v5M8.5 11h5"/>'),
    grid: ic('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
    sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
    coord: ic('<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.2"/>'),
    region: ic('<path d="M4 6.5 9 4l6 2.5L20 4v13.5L15 20l-6-2.5L4 20Z"/><path d="M9 4v13.5M15 6.5V20"/>'),
    site: ic('<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>'),
    data: ic('<path d="M4 18V9M10 18V5M16 18v-7M22 18H2"/>'),
    rover: ic('<rect x="5" y="8" width="14" height="6" rx="1.5"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="12" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/><path d="M15 8V4.5h3"/>'),
    walk: ic('<circle cx="12" cy="5.2" r="2.4"/><path d="M9.5 21l1.6-6.2L9 12.6V9.8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.8l-2.1 2.2 1.6 6.2"/><path d="M9 10.6 6.8 13M15 10.6l2.2 2.4"/>')
  };
  const heroHtml = (planet, lat, lng, z, cap) => `<div class="hero" data-hero="${planet},${lat},${lng},${z}"><canvas aria-hidden="true"></canvas><span class="hero-pin" aria-hidden="true"></span><small class="hero-cr">${cap || (planet === "mars" ? "NASA Trek · Viking MDIM 2.1" : "NASA GIBS · Blue Marble")}</small></div>`;
  function paintHeroes(root) {
    root.querySelectorAll("[data-hero]").forEach((el) => {
      const [planet, la, lo, zs] = el.dataset.hero.split(","), lat = +la, lng = +lo, z = +zs, mars = planet === "mars";
      const cv = el.querySelector("canvas"), dpr = Math.min(2, devicePixelRatio || 1), W = (cv.width = Math.round(el.clientWidth * dpr)), H = (cv.height = Math.round(el.clientHeight * dpr));
      if (!W || !H) return;
      const g = cv.getContext("2d"), n = 2 ** z, cols = mars ? n * 2 : n, rows = n, s = dpr * 1.25, ts = 256 * s;
      const px = (lng + 180) / 360 * cols * 256, py = mars ? (90 - lat) / 180 * rows * 256 : (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2 * rows * 256;
      const ox = W / 2 - px * s, oy = H / 2 - py * s, tpl = mars ? A.marsLayers[0].url : A.earthLayers[0].url;
      g.fillStyle = mars ? "#2a160d" : "#0b1830"; g.fillRect(0, 0, W, H);
      for (let ty = Math.floor(-oy / ts); ty <= Math.floor((H - oy) / ts); ty++) for (let tx = Math.floor(-ox / ts); tx <= Math.floor((W - ox) / ts); tx++) {
        if (ty < 0 || ty >= rows) continue;
        const X = ((tx % cols) + cols) % cols, url = (u) => u.replace("{z}", z).replace("{x}", X).replace("{y}", ty), im = new Image();
        im.onload = () => g.drawImage(im, ox + tx * ts, oy + ty * ts, ts, ts);
        im.onerror = () => { if (mars && !im._alt) { im._alt = 1; im.src = url(altName(tpl)); } };
        im.src = url(tpl);
      }
    });
  }
  const thumb = (lat, lng, z) => { const n = 2 ** z, x = Math.min(n * 2 - 1, Math.floor((lng + 180) / 360 * n * 2)), y = Math.min(n - 1, Math.floor((90 - lat) / 180 * n)); return A.marsLayers[0].url.replace("{z}", z).replace("{x}", x).replace("{y}", y); };
  const CHIPS = {
    mars: [["plan", "Plan a Marswalk", "route"], ["walk", "Walk", "walk"], ["drive", "Drive a rover", "rover"], ["sites", "Landing sites", "pin"], ["safety", "Safety", "shield"], ["p:safe", "Safe EVA data", "layers"], ["regions", "All regions", "grid"]],
    earth: [["g:pad", "Launch pads", "rocket"], ["g:center", "NASA centers", "region"], ["g:dsn", "Deep Space Network", "coord"], ["route", "Directions", "route"], ["solar", "Solar system", "sun"]]
  };
  function renderChips() {
    const p = state.planet, grp = window.MM_LAUNCH ? MM_LAUNCH.group() : "all";
    const on = (k) => (k === "sites" ? p === "mars" && !state.region && state.filter === "landed" : k === "regions" ? p === "mars" && !state.region && state.filter === "all" : k.startsWith("p:") ? state.preset === k.slice(2) : k.startsWith("g:") ? grp === k.slice(2) : k === "route" ? !!(window.MM_TOOL && MM_TOOL.active()) : k === "safety" ? !!(window.MM_SAFE && MM_SAFE.active()) : k === "walk" ? state.walkPick && state.walkHow !== "rover" : k === "drive" ? state.walkPick && state.walkHow === "rover" : k === "plan" ? !!(window.MM_PLAN && MM_PLAN.active()) : false);
    $("chips").innerHTML = CHIPS[p].map(([k, n, i]) => `<button type="button" class="qchip ${on(k) ? "is-on" : ""}" data-chip="${k}" aria-pressed="${on(k)}">${ICONS[i]}<span>${n}</span></button>`).join("");
  }
  $("chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-chip]"); if (!b) return;
    const k = b.dataset.chip;
    if (k === "sites" || k === "regions") { if (window.MM_SAFE && MM_SAFE.active()) MM_SAFE.toggle(false, true); if (window.MM_TOOL && MM_TOOL.active()) $("route-btn").click(); state.filter = k === "sites" && !(state.filter === "landed" && !state.region) ? "landed" : "all"; if (state.region) showOverview(); else renderDrawer(); }
    else if (k === "safety") { if (window.MM_SAFE) MM_SAFE.active() ? MM_SAFE.toggle(false) : MM_SAFE.open("brief"); }
    else if (k === "route") $("route-btn").click();
    else if (k === "solar") { if (window.MM_SOLAR) MM_SOLAR.show(); }
    else if (k === "walk" || k === "drive") { if (window.MM_WALK) MM_WALK.pick(undefined, k === "drive" ? "rover" : "walk"); }
    else if (k === "plan") { if (window.MM_PLAN) MM_PLAN.active() ? MM_PLAN.close() : MM_PLAN.open(); }
    else if (k.startsWith("p:")) { const id = k.slice(2); if (state.preset === id) { Object.keys(state.over.mars).forEach((o) => setOverlay("mars", o, false)); state.preset = null; } else { applyPreset(id); note("mars", `${PRESETS[id].name} loaded: ${PRESETS[id].over.length + 1} NASA data layers.`); } }
    else if (k.startsWith("g:") && window.MM_LAUNCH) { const g = k.slice(2); MM_LAUNCH.setGroup(MM_LAUNCH.group() === g ? "all" : g); }
    renderChips();
  });

  const regionRow = (r) => {
    const badge = r.sites.length ? `<span class="badge">${r.sites.length === 1 ? esc(r.sites[0].mission) : r.sites.length + " sites"}</span>` : "";
    const lat = (r.south + r.north) / 2, lng = (r.west + r.east) / 2;
    return `<button class="row" type="button" data-region="${r.id}"><img class="thumb" src="${esc(thumb(lat, lng, 2))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/><span class="meta grow"><strong>${esc(r.name)}</strong><small>${r.id} · ${esc(r.band)}</small></span>${badge}</button>`;
  };

  function renderDrawer() {
    const body = $("drawer-body");
    renderChips();
    // Animate the panel in only when its content changes, not on every refresh.
    const dk = [state.planet, state.region && state.region.id, state.site && state.site.id, window.MM_SAFE && MM_SAFE.active(), window.MM_TOOL && MM_TOOL.active(), window.MM_PLAN && MM_PLAN.active() && MM_PLAN.step(), window.MM_LAUNCH && MM_LAUNCH.key ? MM_LAUNCH.key() : ""].join("|");
    if (dk !== renderDrawer.k) { renderDrawer.k = dk; body.classList.remove("enter"); void body.offsetWidth; body.classList.add("enter"); clearTimeout(renderDrawer.et); renderDrawer.et = setTimeout(() => body.classList.remove("enter"), 700); }
    if (window.MM_SAFE && MM_SAFE.active()) { body.innerHTML = MM_SAFE.html(); return; }
    if (window.MM_PLAN && MM_PLAN.active() && state.planet === "mars") { body.innerHTML = MM_PLAN.html(); paintHeroes(body); return; }
    if (window.MM_TOOL && MM_TOOL.active()) { body.innerHTML = MM_TOOL.html(); return; }
    const { planet, region, site } = state;
    let html = "";
    if (planet === "earth" && window.MM_LAUNCH) html = MM_LAUNCH.drawer();
    else if (planet === "earth") {
      html = `<p class="kicker">Interplanetary Survival Guide</p><h1>Start on Earth</h1>
        <p class="lede">This is the home planet, mapped with live NASA Worldview imagery. Pan, zoom, and switch layers to get a feel for the controls.</p>
        <ol class="steps"><li>Open <strong>Map layers</strong> to try Blue Marble, relief, city lights, or a single day of true color.</li><li>Search coordinates such as <em>38.9, -77.0</em>.</li><li>Press <strong>Travel to Mars</strong> when you are ready.</li></ol>
        <p class="group-label">Sources</p>${sourceLinks([3])}`;
    } else if (!region) {
      const list = regions.filter((r) => state.filter === "all" || r.sites.length);
      const groups = [...new Set(list.map((r) => r.band))];
      html = `${heroHtml("mars", -8, -70, 2, "NASA Trek · Viking MDIM 2.1 · Valles Marineris")}<p class="kicker">Mars · 30 charted regions · ${A.sites.length} landing sites</p><h1>Explore Mars</h1>
        <p class="lede">Mars is charted as 30 USGS quadrangles. Pick one on the map or from this list to enter it, much like choosing a country on Earth. You stay inside a region until you leave.</p>
        <button class="walk-route plan-cta" type="button" data-chip-go="plan">${ICONS.route}<span><b>Plan a Marswalk</b><small>Five guided steps: pick a site, read the NASA layers, draw a route, check go / no-go, then walk it in first person.</small></span></button>
        <ul class="rules">${A.globalRules.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <div class="filters"><button class="choice ${state.filter === "all" ? "is-on" : ""}" data-filter="all" type="button">All regions</button><button class="choice ${state.filter === "landed" ? "is-on" : ""}" data-filter="landed" type="button">Landing sites</button></div>
        ${groups.map((g) => `<p class="group-label">${esc(g)}</p>${list.filter((r) => r.band === g).map(regionRow).join("")}`).join("")}
        <p class="group-label">Sources</p>${sourceLinks([0, 1])}`;
    } else if (!site) {
      const rl = (region.south + region.north) / 2, rg = (region.west + region.east) / 2;
      html = `<button class="back" type="button" data-back="overview">← All regions</button>
        ${heroHtml("mars", rl, rg, region.band.includes("polar") ? 2 : 3)}
        <p class="kicker">${region.id} · ${esc(region.band)}</p><h2>${esc(region.name)}</h2>
        <p class="muted">${fmtLat(region.south)} to ${fmtLat(region.north)} · ${fmtLng(region.west)} to ${fmtLng(region.east)}</p>
        <div class="acts"><button class="act primary" type="button" data-act2="route">${ICONS.route}<span>Directions</span></button><button class="act" type="button" data-act2="walk">${ICONS.walk}<span>Walk</span></button><button class="act" type="button" data-safe-open="brief">${ICONS.shield}<span>Safety</span></button><button class="act" type="button" data-act2="layers">${ICONS.layers}<span>Layers</span></button><button class="act" type="button" data-act2="hud">${ICONS.hud}<span>HUD</span></button><button class="act" type="button" data-act2="share" data-v="${esc(region.name)} (${region.id}), Mars · ${fmtLat(region.south)} to ${fmtLat(region.north)}, ${fmtLng(region.west)} to ${fmtLng(region.east)}">${ICONS.share}<span>Share</span></button></div>
        <p class="lede">${esc(region.summary)}</p>
        <p class="group-label">Landing sites</p>
        ${region.sites.length ? region.sites.map((s) => `<button class="row" type="button" data-site="${s.id}"><img class="thumb" src="${esc(thumb(s.lat, s.lng, 5))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/><span class="meta grow"><strong>${esc(s.name)}</strong><small>${esc(s.mission)} · ${esc(s.kind)}</small></span></button>`).join("") : `<p class="muted hint">No landed mission in this chart. Use the THEMIS and albedo layers to judge the ground yourself.</p>`}
        <p class="group-label">Layers worth checking</p><p class="muted hint">Open Map layers for relief, elevation, day and night temperature, and dust brightness.</p>
        <p class="group-label">Before you step outside</p><div class="actions"><button class="choice is-on" type="button" data-safe-open="brief">Open the safety center</button><button class="choice" type="button" data-safe-open="sos">Emergency protocols</button></div>`;
    } else {
      const media = site.media === "path"
        ? `<img class="path" src="${esc(A.mountSharpGif)}" alt="Animation of Curiosity's proposed path up Mount Sharp" data-zoom="Curiosity's proposed path up Mount Sharp" loading="lazy" onerror="this.remove()" />`
        : site.media === "raw" ? `<p class="group-label">Latest raw images</p><div class="film" id="film"><span class="muted">Loading rover images…</span></div>` : "";
      const ll = `${Math.abs(site.lat).toFixed(2)}°${site.lat >= 0 ? "N" : "S"}, ${Math.abs(site.lng).toFixed(2)}°${site.lng >= 0 ? "E" : "W"}`;
      html = `<button class="back" type="button" data-back="region">← ${esc(region.name)}</button>
        ${heroHtml("mars", site.lat, site.lng, 6)}
        <p class="kicker">${esc(site.mission)} · ${esc(site.kind)}</p><h2>${esc(site.name)}</h2>
        <p class="muted">${ll} · ${region.id} ${esc(region.name)}</p>
        <div class="acts"><button class="act primary" type="button" data-mid="route" data-sid="${site.id}">${ICONS.route}<span>Directions</span></button><button class="act" type="button" data-act2="walk" data-ll="${site.lat},${site.lng}">${ICONS.walk}<span>Walk</span></button><button class="act" type="button" data-act2="drive" data-ll="${site.lat},${site.lng}">${ICONS.rover}<span>Drive</span></button><button class="act" type="button" data-safe-open="go">${ICONS.shield}<span>Safety</span></button><button class="act" type="button" data-mid="layers" data-sid="${site.id}">${ICONS.layers}<span>Data</span></button><button class="act" type="button" data-act2="hud">${ICONS.hud}<span>HUD</span></button><button class="act" type="button" data-act2="share" data-v="${esc(site.name)} (${esc(site.mission)}), Mars · ${ll}">${ICONS.share}<span>Share</span></button></div>
        <p class="lede">${esc(site.summary)}</p>${media}
        <p class="group-label">Survival notes</p><ul class="notes">${site.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
        ${window.MM_SAFE ? MM_SAFE.siteCard(site) : ""}
        ${window.MM_DETAIL ? MM_DETAIL.card(site) : ""}
        ${window.MM_MISSION ? MM_MISSION.card(site) : ""}
        <p class="group-label">Sources</p>${sourceLinks(site.media === "path" ? [2, 0] : site.media === "raw" ? [4, 0] : [0, 1])}`;
    }
    body.innerHTML = html;
    body.scrollTop = 0;
    paintHeroes(body);
    if (planet === "mars" && site && site.media === "raw") loadRaw(site.id);
  }

  function loadRaw(id) {
    const film = () => (state.site && state.site.id === id ? $("film") : null);
    const fail = () => { const f = film(); if (f) f.innerHTML = `<span class="muted">Live frames are unavailable right now. <a class="inline-link" href="${esc(A.sources[4].href)}" target="_blank" rel="noopener">Open the raw image gallery</a>.</span>`; };
    fetch(A.rawFeed).then((r) => r.json()).then((j) => {
      const imgs = (j.images || j.items || []).map((i) => {
        const f = i.image_files || {};
        return { src: f.small || f.medium || i.url, big: f.large || f.medium || f.full_res || i.url, cap: `Sol ${i.sol ?? "?"}${i.camera && i.camera.full_name ? " · " + i.camera.full_name : ""}` };
      }).filter((i) => i.src).slice(0, 12);
      const f = film();
      if (!f) return;
      if (!imgs.length) return fail();
      f.innerHTML = imgs.map((i) => `<img src="${esc(i.src)}" alt="${esc(i.cap)}" data-big="${esc(i.big)}" data-zoom="${esc(i.cap)}" loading="lazy" />`).join("");
    }).catch(fail);
  }

  $("drawer-body").addEventListener("click", (e) => {
    const t = e.target.closest("[data-region],[data-site],[data-back],[data-filter],[data-zoom],[data-act2]");
    if (!t) return;
    const d = t.dataset;
    if (d.act2) {
      if (d.act2 === "route") $("route-btn").click();
      else if (d.act2 === "layers") togglePop(true);
      else if (d.act2 === "hud") $("hud-btn").click();
      else if (d.act2 === "walk" || d.act2 === "drive") { if (window.MM_WALK) { if (d.ll) { const [la, lo] = d.ll.split(",").map(Number); MM_WALK.start(la, lo, { mode: d.act2 === "drive" ? "rover" : "walk" }); } else MM_WALK.pick(); } }
      else if (d.act2 === "share") { try { navigator.clipboard.writeText(d.v); } catch (_) {} note(state.planet, "Location copied to your clipboard."); }
      return;
    }
    if (d.filter) { state.filter = d.filter; renderDrawer(); }
    else if (d.region) enterRegion(d.region);
    else if (d.site) openSite(d.site);
    else if (d.back === "overview") leaveRegion();
    else if (d.back === "region") { state.site = null; document.querySelectorAll(".site-dot").forEach((x) => x.classList.remove("is-active")); renderDrawer(); }
    else if (d.zoom !== undefined) { $("viewer-img").src = d.big || t.src; $("viewer-img").alt = d.zoom; $("viewer-caption").textContent = d.zoom; $("viewer").showModal(); }
  });

  /* ---------- layers popover ---------- */
  const TYPES = { viking: "Optical", mola: "Topographic", elevation: "Topographic", "themis-day": "Thermal", "themis-night": "Thermal", albedo: "Spectral", "blue-marble": "Optical", relief: "Topographic", "true-color": "Optical", lights: "Night lights" };
  const PRESETS = { safe: { name: "Safe EVA", base: "viking", over: ["themis-day", "elevation"] }, climb: { name: "Climb & cold", base: "viking", over: ["mola", "themis-night"] }, dust: { name: "Dust & solar", base: "viking", over: ["albedo", "themis-day"] } };
  const layerList = (p) => (p === "earth" ? A.earthLayers : A.marsLayers);
  const activeTypes = (p) => [...new Set([state.layer[p].id, ...Object.keys(state.over[p])].map((id) => TYPES[id]))];
  function setOverlay(p, id, on) {
    const m = maps[p], layer = layerList(p).find((l) => l.id === id);
    if (state.over[p][id]) { m.removeLayer(state.over[p][id]); delete state.over[p][id]; }
    if (on && layer) {
      const tl = L.tileLayer(layer.url, { date: state.date, maxNativeZoom: layer.maxZoom, maxZoom: 18, noWrap: false, opacity: state.opacity, zIndex: 5 });
      let ok = 0, bad = 0, swapped = false;
      tl.on("tileload", () => ok++); tl.on("tileerror", () => bad++);
      tl.on("load", () => {
        if (p === "mars" && !swapped && bad > ok) { swapped = true; ok = bad = 0; tl.setUrl(altName(layer.url)); }
        else if (swapped && bad > ok) note(p, `${layer.name} has no tiles here. Try another overlay.`);
      });
      state.over[p][id] = tl.addTo(m);
    }
    renderLayers(); updateStatus();
  }
  function applyPreset(k) {
    const pr = PRESETS[k];
    state.preset = k;
    Object.keys(state.over.mars).forEach((id) => setOverlay("mars", id, false));
    setLayer("mars", A.marsLayers.find((l) => l.id === pr.base));
    pr.over.forEach((id) => setOverlay("mars", id, true));
  }
  function renderLayers() {
    const p = state.planet, list = layerList(p), base = state.layer[p], ov = state.over[p], at = activeTypes(p);
    $("layers-kicker").textContent = p === "earth" ? "Base imagery · Earth" : "Base imagery · Mars";
    $("layer-options").innerHTML = list.map((l) => `<button type="button" class="choice block ${l.id === base.id ? "is-on" : ""}" data-layer="${l.id}">${esc(l.name)} <em class="tag">${TYPES[l.id]}</em><small>${esc(l.detail)}</small></button>`).join("");
    $("overlay-options").innerHTML = `<p class="kicker" style="margin-top:14px">Overlays</p>` + list.filter((l) => l.id !== base.id).map((l) => `<label class="check"><input type="checkbox" data-ov="${l.id}" ${ov[l.id] ? "checked" : ""}/><span>${esc(l.name)} <em class="tag">${TYPES[l.id]}</em></span></label>`).join("")
      + `<label class="date-field">Overlay opacity<input id="ov-op" type="range" min="0.2" max="1" step="0.05" value="${state.opacity}"/></label><p class="hint muted">Active data: ${at.join(" · ")} (${at.length} kind${at.length > 1 ? "s" : ""})</p>`
      + (p === "mars" ? `<p class="kicker" style="margin-top:14px">One-tap data stacks</p><div class="chips">${Object.entries(PRESETS).map(([k, v]) => `<button class="choice" type="button" data-preset="${k}">${v.name}</button>`).join("")}</div>` : "");
    $("date-field").hidden = !(p === "earth" && (base.dated || ov["true-color"]));
    const alt = p === "mars" ? (base.id === "viking" ? A.marsLayers[1] : A.marsLayers[0]) : (base.id === "blue-marble" ? A.earthLayers[1] : A.earthLayers[0]);
    const tu = p === "mars" ? alt.url.replace("{z}", 2).replace("{x}", 2).replace("{y}", 2) : alt.url.replace("{z}", 2).replace("{x}", 1).replace("{y}", 1).replace("{date}", state.date);
    $("ltile-img").style.backgroundImage = `url("${tu}")`; $("ltile-lbl").textContent = alt.name.split(" ")[0] === "MOLA" ? "Relief" : "Layers";
  }
  $("overlay-options").addEventListener("change", (e) => { if (e.target.dataset.ov) state.preset = null; if (e.target.dataset.ov) setOverlay(state.planet, e.target.dataset.ov, e.target.checked); });
  $("overlay-options").addEventListener("input", (e) => { if (e.target.id === "ov-op") { state.opacity = +e.target.value; Object.values(state.over[state.planet]).forEach((t) => t.setOpacity(state.opacity)); } });
  $("overlay-options").addEventListener("click", (e) => { const b = e.target.closest("[data-preset]"); if (b) applyPreset(b.dataset.preset); });
  $("layer-options").addEventListener("click", (e) => {
    const b = e.target.closest("[data-layer]");
    if (!b) return;
    state.preset = null;
    const list = state.planet === "earth" ? A.earthLayers : A.marsLayers;
    setLayer(state.planet, list.find((l) => l.id === b.dataset.layer));
  });
  $("true-color-date").max = today;
  $("true-color-date").addEventListener("change", (e) => {
    if (!e.target.value) return;
    state.date = e.target.value;
    if (state.layer.earth.dated) setLayer("earth", state.layer.earth);
    Object.keys(state.over.earth).forEach((id) => { if (A.earthLayers.find((l) => l.id === id).dated) { setOverlay("earth", id, false); setOverlay("earth", id, true); } });
  });
  const togglePop = (open) => {
    const pop = $("layers-pop");
    pop.hidden = open === undefined ? !pop.hidden : !open;
    $("layers-btn").setAttribute("aria-expanded", String(!pop.hidden));
  };
  $("layers-btn").addEventListener("click", () => togglePop());

  /* ---------- search ---------- */
  const COORD = /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/;
  function goTo(lat, lng) {
    const p = state.planet, m = maps[p];
    if (p === "mars") {
      const r = regions.find((x) => lat >= x.south && lat <= x.north && lng >= x.west && lng <= x.east);
      if (!r) return;
      if (!state.region || state.region.id !== r.id) enterRegion(r.id);
    }
    if (pins[p]) m.removeLayer(pins[p]);
    pins[p] = L.circleMarker([lat, lng], { radius: 7, color: "#fff", weight: 2, fillColor: p === "mars" ? "#c2410c" : "#1d4ed8", fillOpacity: 1 }).addTo(m);
    m.flyTo([lat, lng], Math.max(m.getZoom(), p === "mars" ? 5 : 8), { animate: !calmNow() });
    if (window.MM_TOOL && MM_TOOL.active()) MM_TOOL.add(lat, lng);
  }
  function searchItems(q) {
    const c = q.match(COORD), out = [];
    if (c) {
      const lat = +c[1], lng = +c[2];
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) out.push({ label: `Go to ${lat}, ${lng}`, sub: "Coordinates", ico: "coord", run: () => goTo(lat, lng) });
    }
    if (state.planet === "mars" && q.trim()) {
      const n = q.trim().toLowerCase();
      regions.filter((r) => `${r.id} ${r.name}`.toLowerCase().includes(n)).slice(0, 5).forEach((r) => out.push({ label: r.name, sub: `${r.id} · ${r.band}`, ico: "region", run: () => enterRegion(r.id) }));
      A.sites.filter((s) => `${s.name} ${s.mission}`.toLowerCase().includes(n)).slice(0, 5).forEach((s) => out.push({ label: s.name, sub: `${s.mission} · ${s.kind}`, ico: "site", run: () => openSite(s.id) }));
    }
    if (state.planet === "earth" && window.MM_LAUNCH) MM_LAUNCH.search(q).forEach((x) => out.push(x));
    return out;
  }
  let items = [];
  function renderResults() {
    const q = $("search").value;
    items = q.trim() ? searchItems(q) : [];
    const ul = $("results");
    ul.hidden = !q.trim();
    ul.innerHTML = items.length
      ? items.map((it, i) => `<li><button class="result" type="button" data-i="${i}"><span class="r-ico">${ICONS[it.ico] || (window.MM_LAUNCH ? MM_LAUNCH.svg(it.ico, 18) : "")}</span><span class="grow"><strong>${esc(it.label)}</strong><br><small>${esc(it.sub)}</small></span></button></li>`).join("")
      : `<li><p class="muted" style="margin:8px 12px">${state.planet === "mars" ? "No chart or site matches. Try Jezero, Gale or 18.4, 77.4." : "No NASA site matches. Try Kennedy, JPL or 28.6, -80.6."}</p></li>`;
  }
  const pick = (i) => { if (items[i]) { items[i].run(); $("results").hidden = true; } };
  $("search").addEventListener("input", renderResults);
  $("search-go").addEventListener("click", () => { if ($("search").value.trim()) { renderResults(); pick(0); } else $("search").focus(); });
  $("search").addEventListener("keydown", (e) => { if (e.key === "Enter") pick(0); });
  $("results").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) pick(+b.dataset.i); });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) $("results").hidden = true;
    if (!e.composedPath().some((n) => n.id === "layers-pop" || n.id === "layers-btn" || n.id === "layers-tile" || (n.dataset && n.dataset.act2 === "layers"))) togglePop(false);
  });

  /* ---------- status bar ---------- */
  function updateScale() {
    const m = maps[state.planet], z = m.getZoom(), lat = Math.min(Math.abs(m.getCenter().lat), 85);
    const mpp = state.planet === "earth"
      ? (2 * Math.PI * R.earth * Math.cos(lat * Math.PI / 180)) / (256 * Math.pow(2, z))
      : (360 / (512 * Math.pow(2, z))) * (Math.PI / 180) * R.mars * Math.max(Math.cos(lat * Math.PI / 180), 0.05);
    let best = 1;
    for (let k = 0; k < 9; k++) for (const f of [1, 2, 5]) { const v = f * Math.pow(10, k); if (v / mpp <= 110) best = v; }
    $("scale-bar").style.width = Math.max(best / mpp, 8) + "px";
    $("scale-label").textContent = best >= 1000 ? `${best / 1000} km` : `${best} m`;
  }
  function updateStatus() { const n = Object.keys(state.over[state.planet]).length; $("credit").textContent = state.layer[state.planet].credit + (n ? ` · +${n} overlay${n > 1 ? "s" : ""}` : ""); updateScale(); }
  Object.entries(maps).forEach(([p, m]) => {
    m.on("zoom move", () => { if (state.planet === p) updateScale(); });
    m.on("mousemove", (e) => {
      const ll = e.latlng.wrap();
      $("coords").textContent = `${Math.abs(ll.lat).toFixed(2)}°${ll.lat >= 0 ? "N" : "S"}, ${Math.abs(ll.lng).toFixed(2)}°${ll.lng >= 0 ? "E" : "W"}`;
    });
  });

  /* ---------- controls ---------- */
  $("zoom-in").addEventListener("click", () => {
    const m = maps[state.planet];
    if (state.planet === "mars" && !state.region) $("coords").textContent = "Choose a chart region to zoom in";
    else m.zoomIn();
  });
  $("zoom-out").addEventListener("click", () => {
    const m = maps[state.planet];
    if (state.planet === "mars" && m.getZoom() <= m.getMinZoom() + 0.01) return note("mars", state.region ? "This is the whole region. Use ← All regions or press Esc to see all of Mars." : "This is the whole of Mars. Drag sideways to go around.");
    m.zoomOut();
  });
  $("reset-view").addEventListener("click", () => {
    if (state.planet === "earth") maps.earth.setView([20, 10], 2);
    else if (state.region) enterRegion(state.region.id);
    else showOverview();
  });
  $("lock-chip").addEventListener("click", leaveRegion);
  // The side panel opens and closes from the tab on its edge (like Google Maps); the ☰ button opens the main menu (js/menu.js).
  $("panel-btn").addEventListener("click", () => {
    const closed = document.body.classList.toggle("drawer-closed");
    document.body.classList.toggle("drawer-open", !closed);
    $("panel-btn").setAttribute("aria-expanded", String(!closed));
    $("panel-btn").setAttribute("aria-label", closed ? "Show the side panel" : "Hide the side panel");
    setTimeout(() => maps[state.planet].invalidateSize(), 320);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.querySelector("dialog[open]") || document.querySelector("#solar.on") || (window.MM_GLOBE && MM_GLOBE.active())) return;
    if (!$("layers-pop").hidden) togglePop(false);
    else if (window.MM_SAFE && MM_SAFE.active()) MM_SAFE.toggle(false);
    else leaveRegion();
  });
  let rz;
  addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { maps[state.planet].invalidateSize(); if (state.planet === "mars" && !state.region) showOverview(); }, 150); });

  /* ---------- travel between planets ---------- */
  function switchPlanet(to) {
    state.planet = to;
    document.body.classList.remove("planet-earth", "planet-mars");
    document.body.classList.add("planet-" + to);
    $("map-earth").classList.toggle("is-active", to === "earth");
    $("map-mars").classList.toggle("is-active", to === "mars");
    $("map-earth").setAttribute("aria-hidden", String(to !== "earth"));
    $("map-mars").setAttribute("aria-hidden", String(to !== "mars"));
    $("travel-orb").className = "orb " + (to === "earth" ? "orb-earth" : "orb-mars");
    $("travel-kicker").textContent = to === "earth" ? "Now on Earth" : "Now on Mars";
    $("travel-label").textContent = to === "earth" ? "Travel to Mars" : "Return to Earth";
    $("search").value = ""; $("results").hidden = true;
    $("search").placeholder = to === "earth" ? "Search NASA sites or coordinates" : "Search Mars";
    $("reset-view").setAttribute("aria-label", to === "earth" ? "Show the whole planet" : "Recenter the map");
    $("coords").textContent = "Move across the map";
    togglePop(false);
    maps[to].invalidateSize();
    if (to === "mars" && !state.marsReady) { state.marsReady = true; showOverview(); }
    updateLock(); renderLayers(); renderDrawer(); updateStatus(); renderChips();
    if (window.MM_GLOBE) MM_GLOBE.sync();
  }
  // The travel button always names the destination, so Earth shows "Travel to Mars" and Mars shows "Return to Earth".
  // Travel straight to a planet. The launch animation covers the switch, so the other planet is never shown on the way.
  function travel(to, opts = {}) {
    if (state.busy || to === state.planet) return;
    if (window.MM_GLOBE) MM_GLOBE.off();
    state.busy = true;
    const done = () => { state.busy = false; };
    if (!opts.instant && window.MM_LAUNCH) MM_LAUNCH.fly(to, () => switchPlanet(to), done);
    else { switchPlanet(to); done(); }
  }
  $("travel").addEventListener("click", () => travel(state.planet === "earth" ? "mars" : "earth"));
  $("layers-tile").addEventListener("click", () => togglePop());

  /* ---------- start ---------- */
  buildRegionShapes();
  setLayer("earth", A.earthLayers[0]);
  setLayer("mars", A.marsLayers[0]);
  switchPlanet("earth");
  window.MM = { maps, state, A, $, esc, toast, siteById, regionById, altName, renderDrawer, travel, heroHtml, paintHeroes, ICONS, renderChips, note, applyPreset, enterRegion, regions, openSite, activeTypes: (p) => activeTypes(p || state.planet) };
})();
