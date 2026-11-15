/* Sharper NASA data where it exists.
   - Jezero crater: NASA Trek's MRO CTX mosaic (about 6 m per pixel) and HiRISE mosaic (25 cm per pixel), shown on top of
     the Viking base map as you zoom in, so the map goes from planet scale down to individual boulders and dunes.
   - Perseverance's real traverse (NASA/JPL MMGIS waypoints in js/m20-traverse.js): the drive line, end-of-drive points
     with sol and distance, and the rover's last known position. */
(() => {
  const M = window.MM;
  if (!M) return;
  const { maps, esc } = M, map = maps.mars;
  const T = "https://trek.nasa.gov/tiles/Mars/EQ/", TS = "/1.0.0/default/default028mm/{z}/{y}/{x}.png";
  const LAYERS = [
    { id: "ctx", name: "CTX Jezero (6 m)", product: "Jezero_CTX_BlockAdj_dd", native: 12, min: 7, bounds: [[15.9058, 75.1538], [19.4453, 78.8717]], credit: "NASA Trek · MRO CTX mosaic of Jezero (NASA/JPL-Caltech/MSSS)" },
    { id: "hirise", name: "HiRISE Jezero (25 cm)", product: "JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd", native: 17, min: 11, bounds: [[18.3068, 77.2229], [18.6693, 77.584]], credit: "NASA Trek · MRO HiRISE mosaic of Jezero (NASA/JPL-Caltech/UArizona)" }
  ];
  const blank = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  LAYERS.forEach((d, i) => {
    d.url = T + d.product + TS;
    d.layer = L.tileLayer(d.url, { bounds: d.bounds, minZoom: d.min, maxNativeZoom: d.native, maxZoom: 18, noWrap: true, zIndex: 5 + i, errorTileUrl: blank, className: "detail-tiles" }).addTo(map);
  });
  // Tell the status bar when the sharp imagery is on screen.
  const credit = () => {
    const z = map.getZoom(), c = map.getCenter(), on = LAYERS.filter((d) => z >= d.min && L.latLngBounds(d.bounds).contains(c)).pop();
    const el = M.$("credit"); if (!el || M.state.planet !== "mars") return;
    el.dataset.detail = on ? on.credit : "";
    if (on && !el.textContent.includes("MRO")) el.textContent = on.credit;
  };
  map.on("zoomend moveend", credit);

  /* ---------- Perseverance traverse ---------- */
  const TR = window.M20_TRAVERSE;
  const fmtKm = (m) => (m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(1) + " km");
  const ll = (la, lo) => `${Math.abs(la).toFixed(5)}°${la >= 0 ? "N" : "S"} ${Math.abs(lo).toFixed(5)}°E`;
  const group = L.layerGroup();
  if (TR && TR.pts.length) {
    const path = TR.pts.map((p) => [p[1], p[2]]);
    L.polyline(path, { color: "#000", weight: 6, opacity: 0.35, interactive: false }).addTo(group);
    L.polyline(path, { color: "#ffd7a8", weight: 2.5, opacity: 0.95, interactive: false }).addTo(group);
    TR.pts.forEach((p, i) => {
      const last = i === TR.pts.length - 1;
      if (!last && i % 12 !== 0) return;
      L.circleMarker([p[1], p[2]], { radius: last ? 7 : 3.2, color: last ? "#fff" : "#ffd7a8", weight: last ? 3 : 1, fillColor: last ? "#ff7a3d" : "#2a160d", fillOpacity: 1, bubblingMouseEvents: false })
        .bindPopup(`<b>${last ? "Perseverance · last known position" : "Perseverance · sol " + p[0]}</b><br><small>Sol ${p[0]} · ${ll(p[1], p[2])}<br>${fmtKm(p[3])} driven since landing</small><div class="pop-actions"><button class="pop-btn pop-walk" data-walk="${p[1]},${p[2]}">Walk here</button></div>`, { className: "trav-pop" })
        .addTo(group);
    });
    group.addTo(map);
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-walk]"); if (!b) return;
      const [la, lo] = b.dataset.walk.split(",").map(Number); map.closePopup();
      if (window.MM_WALK) MM_WALK.start(la, lo);
    });
  }
  const last = TR && TR.pts[TR.pts.length - 1];

  window.MM_DETAIL = {
    layers: LAYERS,
    maxZoom: (regionId) => (regionId === "MC-13" ? 17 : 10),
    last: () => (last ? { sol: last[0], lat: last[1], lon: last[2], dist: last[3] } : null),
    card(site) {
      if (!TR || site.id !== "perseverance") return "";
      return `<p class="group-label">Rover traverse · NASA/JPL</p><div class="trav-card"><div><b>${fmtKm(last[3])}</b><small>driven, sol ${TR.pts[0][0]} to ${last[0]}</small></div><div><b>${TR.pts.length}</b><small>end-of-drive positions</small></div></div>
        <p class="muted hint">The cream line on the map is the rover's real path. Click a point for its sol. Zoom in to switch to NASA's CTX and then HiRISE imagery (down to 25 cm per pixel).</p>
        <div class="actions"><button class="choice is-on" type="button" data-trav="fit">Show the whole traverse</button><button class="choice" type="button" data-trav="last">Rover's last position</button><button class="choice" type="button" data-walk="${last[1]},${last[2]}">Walk to the rover</button></div>`;
    }
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-trav]"); if (!b || !TR) return;
    if (b.dataset.trav === "fit") map.flyToBounds(L.latLngBounds(TR.pts.map((p) => [p[1], p[2]])).pad(0.15));
    else map.flyTo([last[1], last[2]], 14);
  });
})();
