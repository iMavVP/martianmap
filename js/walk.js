/* Walk on Mars: the first-person surface EVA, entered from the map the way Street View is entered from Google Maps.
   Pick a spot (astronaut button, the "Walk on Mars" chip, "Walk here" on a landing site or in a map pin), the map
   dives to it, and eva.html opens over the map at that exact latitude and longitude. "Back to map" returns to where
   you finished walking. Not available inside the EVA tablet itself (tablet mode). */
(() => {
  const M = window.MM;
  if (!M || new URLSearchParams(location.search).has("tablet")) return;
  const { $, state, maps, esc } = M, A = M.A;
  const R = 3389.5; // Mars mean radius, km
  const fmtLL = (lat, lon) => `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(3)}°${lon >= 0 ? "E" : "W"}`;
  const wrap = (l) => ((l + 540) % 360) - 180;
  const km = (a, b, c, d) => { const r = Math.PI / 180, s = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(s))); };
  const regionAt = (lat, lon) => M.regions.find((r) => lat >= r.south && lat <= r.north && lon >= r.west && lon <= r.east);

  /* ---------- the astronaut button on the map ---------- */
  // Two buttons, like Google Maps' Street View figure: walk on foot, or drive a rover.
  const surf = document.createElement("div"); surf.className = "surface-box"; surf.setAttribute("role", "group"); surf.setAttribute("aria-label", "Go to the surface");
  surf.innerHTML = `<button id="walk-btn" class="icon-btn walk-btn" type="button" aria-label="Walk on Mars: pick a spot" title="Walk on Mars">${M.ICONS.walk}</button><button id="drive-btn" class="icon-btn walk-btn" type="button" aria-label="Drive a rover: pick a spot" title="Drive a rover">${M.ICONS.rover}</button>`;
  const zoomBox = document.querySelector(".zoom-box"); zoomBox.parentNode.insertBefore(surf, zoomBox);
  const btn = $("walk-btn"), dbtn = $("drive-btn");
  btn.addEventListener("click", () => pick(!(state.walkPick && how === "walk"), "walk"));
  dbtn.addEventListener("click", () => pick(!(state.walkPick && how === "rover"), "rover"));

  /* ---------- choosing a spot ---------- */
  const tip = document.createElement("div"); tip.className = "walk-tip"; tip.hidden = true; document.body.appendChild(tip);
  const banner = document.createElement("div"); banner.className = "walk-banner"; banner.hidden = true;
  let how = "walk";
  const paint = () => { banner.innerHTML = `<span class="walk-ico">${how === "rover" ? M.ICONS.rover : M.ICONS.walk}</span><span><b>${how === "rover" ? "Drive a rover" : "Walk on Mars"}</b><small>Click anywhere on the map to go there. Zoom in for a precise spot.</small></span><button type="button" class="walk-cancel">Cancel</button>`; banner.querySelector(".walk-cancel").addEventListener("click", () => pick(false)); };
  document.body.appendChild(banner);
  function pick(on = !state.walkPick, mode) {
    if (mode) how = mode;
    if (on && state.planet !== "mars") { M.travel("mars"); return M.toast("Travel to Mars first, then pick a spot."); }
    state.walkPick = on; state.walkHow = how; paint();
    document.body.classList.toggle("walk-pick", on);
    banner.hidden = !on; tip.hidden = true;
    btn.setAttribute("aria-pressed", String(on && how === "walk")); dbtn.setAttribute("aria-pressed", String(on && how === "rover"));
    if (M.renderChips) M.renderChips();
  }
  const map = maps.mars;
  map.on("mousemove", (e) => {
    if (!state.walkPick) return;
    const lat = e.latlng.lat, lon = wrap(e.latlng.lng), r = regionAt(lat, lon);
    tip.hidden = false; tip.style.transform = `translate(${e.originalEvent.clientX}px, ${e.originalEvent.clientY}px)`;
    tip.innerHTML = Math.abs(lat) > 85 ? "<b>Too close to the pole</b>" : `<b>${how === "rover" ? "Drive here" : "Walk here"}</b><small>${fmtLL(lat, lon)}${r ? " · " + esc(r.name) : ""}</small>`;
  });
  map.on("mouseout", () => { tip.hidden = true; });
  map.on("click", (e) => { if (state.walkPick) { const ll = e.latlng; pick(false); start(ll.lat, wrap(ll.lng), { mode: how }); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.walkPick) pick(false); });
  // leaving Mars (or opening another tool) ends picking
  new MutationObserver(() => { if (state.walkPick && state.planet !== "mars") pick(false); }).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  /* ---------- a name for the spot ---------- */
  function placeName(lat, lon) {
    let site = null, feat = null;
    A.sites.forEach((s) => { const d = km(lat, lon, s.lat, s.lng); if (d < 25 && (!site || d < site.d)) site = { d, s }; });
    if (site) return { name: site.s.name, site: site.s.id };
    (A.features || []).forEach(([n, la, lo, size]) => { const d = km(lat, lon, la, lo), lim = size === "tiny" || size === "hud" ? 80 : size === "big" ? 900 : 500; if (d < lim && (!feat || d < feat.d)) feat = { d, n }; });
    if (feat) return { name: feat.d < 20 ? feat.n : "Near " + feat.n };
    const r = regionAt(lat, lon);
    return { name: r ? r.name : "Mars" };
  }

  /* ---------- the EVA layer over the map ---------- */
  let layer = null, frame = null, marker = null;
  // "Walk this route" in Directions: start at the first stop with the whole route on the helmet display.
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-plan-walk]") || !window.MM_TOOL) return;
    const r = MM_TOOL.getRoute(); if (r.planet !== "mars" || r.pts.length < 2) return;
    start(r.pts[0][0], r.pts[0][1], { route: r.pts.slice(0, 40), mode: e.target.closest("[data-plan-walk]").dataset.planWalk === "rover" ? "rover" : "walk" });
  });
  function start(lat, lon, opts = {}) {
    if (layer) return;
    if (Math.abs(lat) > 85) return M.toast("Too close to the pole for a walk on this map. Pick a spot within 85° of the equator.");
    if (state.planet !== "mars") M.travel("mars", { instant: true });
    pick(false);
    const where = placeName(lat, lon), r = regionAt(lat, lon);
    if (r && (!state.region || state.region.id !== r.id)) M.enterRegion(r.id);
    if (marker) marker.remove();
    marker = L.marker([lat, lon], { interactive: false, keyboard: false, zIndexOffset: 900, icon: L.divIcon({ className: "walk-pin", iconSize: [34, 44], iconAnchor: [17, 42], html: `<span>${M.ICONS.walk}</span>` }) }).addTo(map);
    const calm = !!(window.MM_PREFS && !MM_PREFS.motion);
    map.flyTo([lat, lon], Math.min(map.getMaxZoom(), 9), { duration: calm ? 0.01 : 1.3 });
    layer = document.createElement("div"); layer.className = "eva-layer";
    layer.innerHTML = `<div class="eva-cover"><div class="eva-dive"><span class="eva-ring"></span><p class="kicker">${opts.mode === "rover" ? "Rover drive" : "Surface EVA"}</p><h2>${esc(where.name)}</h2><p>${fmtLL(lat, lon)}${r ? " · " + r.id + " " + esc(r.name) : ""}</p><small>${opts.mode === "rover" ? "Connecting to the rover…" : "Descending to the surface…"}</small></div></div>`;
    document.body.appendChild(layer);
    document.body.classList.add("eva-on");
    requestAnimationFrame(() => layer.classList.add("in"));
    const route = opts.route && opts.route.length > 1 ? "&route=" + opts.route.map((p) => p[0].toFixed(5) + "," + wrap(p[1]).toFixed(5)).join(";") : "";
    const url = `eva.html?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&name=${encodeURIComponent(where.name)}${where.site ? "&site=" + where.site : ""}${route}${opts.mode === "rover" ? "&mode=rover" : ""}`;
    setTimeout(() => {
      if (!layer) return;
      frame = document.createElement("iframe");
      frame.className = "eva-frame"; frame.title = "Surface EVA on Mars"; frame.src = url;
      frame.setAttribute("allow", "fullscreen; clipboard-write; autoplay");
      frame.addEventListener("load", () => { if (!layer) return; layer.classList.add("loaded"); try { frame.focus(); } catch (_) {} });
      layer.appendChild(frame);
    }, calm ? 50 : 1300);
  }
  function stop(lat, lon, walked) {
    if (!layer) return;
    const l = layer; layer = null;
    l.classList.remove("loaded");
    setTimeout(() => {
      if (frame) { frame.src = "about:blank"; frame.remove(); frame = null; }
      l.classList.remove("in"); document.body.classList.remove("eva-on");
      setTimeout(() => l.remove(), 600);
      if (isFinite(lat) && isFinite(lon)) {
        if (marker) marker.setLatLng([lat, lon]);
        map.setView([lat, lon], Math.max(map.getZoom(), 9), { animate: false });
        if (walked > 1) M.toast(`Back on the map. You walked ${walked < 1000 ? Math.round(walked) + " m" : (walked / 1000).toFixed(2) + " km"} on Mars; the astronaut marks where you stopped.`);
      }
      map.invalidateSize();
    }, 350);
  }
  addEventListener("message", (e) => {
    const d = e.data;
    if (!frame || e.source !== frame.contentWindow || !d) return;
    if (d.mm === "eva-exit") stop(+d.lat, +d.lon, +d.walked || 0);
  });

  window.MM_WALK = { pick, start, stop, active: () => !!layer };
})();
