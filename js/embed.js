/* Tablet mode: Martian Map running on the astronaut's EVA tablet inside the surface EVA (eva.html).
   index.html?tablet=1&lat=..&lon=..[&site=id] skips the intro and opens Mars at the astronaut's position. Everything
   else works exactly as on the full website. The suit sends its position by message, shown as a blue "you" dot with a
   heading cone, and movement keys pressed while the tablet has the keyboard are passed back so you can keep walking. */
(() => {
  const q = new URLSearchParams(location.search);
  if (!q.has("tablet") || !window.MM) return;
  const M = window.MM, $ = M.$;
  document.body.classList.add("tablet-mode");
  const intro = $("intro"); if (intro) intro.remove();
  const site = q.get("site"), lat0 = parseFloat(q.get("lat")), lon0 = parseFloat(q.get("lon"));
  const regionAt = (lat, lon) => M.regions.find((r) => lat >= r.south && lat <= r.north && lon >= r.west && lon <= r.east);
  const start = () => {
    if (window.MM_SOLAR && MM_SOLAR.active()) MM_SOLAR.hide();
    M.travel("mars", { instant: true });
    if (site && M.siteById[site]) M.openSite(site);
    else if (isFinite(lat0) && isFinite(lon0)) { const r = regionAt(lat0, lon0); if (r) M.enterRegion(r.id); M.maps.mars.setView([lat0, lon0], 9, { animate: false }); }
    // the route being walked, shown in Directions on the tablet
    const route = (q.get("route") || "").split(";").map((s) => s.split(",").map(Number)).filter((p) => p.length === 2 && p.every(isFinite));
    if (route.length > 1 && window.MM_TOOL) setTimeout(() => { MM_TOOL.setRoute(route, "eva"); M.maps.mars.setView([lat0, lon0], 12, { animate: false }); }, 50);
  };
  setTimeout(start, 0);

  // "You are here": the suit's position and heading on the Mars map.
  let you = null, first = true;
  const icon = () => L.divIcon({ className: "you-icon", iconSize: [44, 44], iconAnchor: [22, 22], html: '<span class="you-cone"></span><span class="you-dot"></span>' });
  M.setYou = (lat, lon, heading) => {
    const map = M.maps.mars;
    if (!you) {
      you = L.marker([lat, lon], { icon: icon(), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(map);
      const b = document.createElement("button");
      b.className = "you-btn"; b.type = "button"; b.innerHTML = '<span class="you-mini"></span>My position';
      b.onclick = () => {
        if (M.state.planet !== "mars") M.travel("mars", { instant: true });
        const p = you.getLatLng(), r = regionAt(p.lat, ((p.lng + 540) % 360) - 180);
        if (r && (!M.state.region || M.state.region.id !== r.id)) M.enterRegion(r.id);
        map.flyTo(p, Math.max(map.getZoom(), 9));
      };
      document.body.appendChild(b);
    } else you.setLatLng([lat, lon]);
    const el = you.getElement(); if (el) { const c = el.querySelector(".you-cone"); if (c) c.style.transform = `rotate(${heading}deg)`; }
    if (first && M.state.planet === "mars" && M.state.region) { first = false; setTimeout(() => M.toast("The blue dot is you. The cone shows which way you face."), 400); }
  };
  addEventListener("message", (e) => {
    const d = e.data;
    if (e.source === parent && d && d.mm === "you" && isFinite(d.lat) && isFinite(d.lon)) M.setYou(d.lat, d.lon, +d.heading || 0);
  });

  // Keys: T stows the tablet; walking and turning keys go to the suit unless you are typing in the website.
  const MOVE = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ShiftLeft", "ShiftRight"]);
  const typing = (t) => /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable;
  const send = (m) => { if (parent !== window) parent.postMessage(m, location.origin); };
  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
    if (e.code === "KeyT") send({ mm: "stow" });
    else if (MOVE.has(e.code) && !e.repeat) send({ mm: "key", t: "down", code: e.code });
  });
  addEventListener("keyup", (e) => { if (MOVE.has(e.code)) send({ mm: "key", t: "up", code: e.code }); });
  addEventListener("blur", () => send({ mm: "keys-clear" }));
})();
