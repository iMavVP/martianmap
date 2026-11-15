/* Plan a Marswalk: the guided path through the whole app in five steps.
   1 Choose a site · 2 Read the ground (NASA layers stacked) · 3 Draw the route · 4 Go / no-go · 5 Walk it in first person.
   Each step uses the same tools as the rest of the app (layers, Directions, the safety center, Walk on Mars). */
(() => {
  const M = window.MM;
  if (!M) return;
  const { $, state, esc, A } = M;
  const P = { on: false, step: 1 };
  const STEPS = ["Site", "Ground", "Route", "Go / no-go", "Walk"];
  const R = 3389.5;
  const dest = (lat, lon, km, brg) => { const r = Math.PI / 180, d = km / R, b = brg * r, p1 = lat * r, l1 = lon * r, p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b)), l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2)); return [+(p2 / r).toFixed(5), +(l2 / r).toFixed(5)]; };

  // A first route to start from: Perseverance's own first drives at Jezero (NASA/JPL traverse), elsewhere a short loop.
  function suggest(site) {
    const T = window.M20_TRAVERSE;
    if (site.id === "perseverance" && T) {
      const out = [], want = [0, 450, 900, 1400];
      want.forEach((m) => { const p = T.pts.find((q) => q[3] >= m); if (p) out.push([p[1], p[2]]); });
      return { pts: out, why: "Follows Perseverance's first drives from the landing site (NASA/JPL traverse), about 1.4 km of ground the rover already crossed." };
    }
    return { pts: [[site.lat, site.lng], dest(site.lat, site.lng, 0.6, 40), dest(site.lat, site.lng, 1.0, 100), dest(site.lat, site.lng, 0.5, 170)], why: "A short loop of about 2.3 km near the landing site. Drag the stops onto smooth ground using the layers." };
  }
  const route = () => (window.MM_TOOL ? MM_TOOL.getRoute() : { pts: [] });

  function html() {
    if (P.step > 1 && !state.site) P.step = 1; // the site was closed elsewhere: start again from step 1
    const s = P.step, site = state.site;
    const bar = `<div class="plan-steps">${STEPS.map((n, i) => `<span class="${i + 1 === s ? "on" : i + 1 < s ? "done" : ""}"><i>${i + 1 < s ? "✓" : i + 1}</i>${n}</span>`).join("")}</div>`;
    let h = `<button class="back" type="button" data-plan="exit">← Leave the planner</button><p class="kicker">Plan a Marswalk · step ${s} of 5</p>${bar}`;
    if (s === 1) {
      h += `<h2>Where are you going?</h2><p class="lede">Pick a landing site. Each one has a NASA mission's ground truth behind it.</p>`;
      h += A.sites.map((x) => `<button class="row" type="button" data-plan-site="${x.id}"><span class="meta grow"><strong>${esc(x.name)}</strong><small>${esc(x.mission)} · ${esc(x.kind)}</small></span>${x.id === "perseverance" ? '<span class="badge">Sharpest data</span>' : ""}</button>`).join("");
    } else if (s === 2) {
      const types = M.activeTypes("mars");
      h += `<h2>Read the ground</h2><p class="lede">${esc(site.name)}: the map now stacks ${types.length} kinds of NASA data. Look for smooth, warm, gentle ground for your route.</p>
        <ul class="plan-list"><li><b>Viking color</b> · what the ground looks like from orbit</li><li><b>MOLA elevation</b> · brighter is higher; avoid steep changes</li><li><b>THEMIS day</b> · warm ground is rock, cool is loose dust</li>${site.id === "perseverance" ? "<li><b>CTX and HiRISE</b> · zoom in for 6 m and then 25 cm detail: boulders, dunes, the rover's tracks</li><li><b>Perseverance traverse</b> · the cream line, ground a rover already crossed</li>" : ""}</ul>
        <p class="muted hint">Change or add layers any time with the Layers tile.</p>`;
    } else if (s === 3) {
      const r = route(), n = r.pts.length;
      h += `<h2>Draw your route</h2><p class="lede">Click the map to add stops, drag them to adjust. A suggested route is already on the map.</p><p class="muted hint">${esc(P.why || "")}</p>
        <div class="trav-card"><div><b>${n}</b><small>stops</small></div><div><b>${n > 1 ? km(r.pts).toFixed(2) + " km" : "–"}</b><small>one way, straight lines</small></div></div>
        <div class="actions"><button class="choice" type="button" data-plan="suggest">Use the suggested route</button><button class="choice" type="button" data-plan="clear">Clear and draw my own</button></div>`;
    } else if (s === 4) {
      h += `<h2>Go or no-go?</h2><p class="lede">The safety center checks daylight, dust season, space weather, the Earth link, your oxygen and the walk-back distance for this route.</p>`;
      h += window.MM_SAFE ? MM_SAFE.routeCard() : "";
      h += `<div class="actions"><button class="choice is-on" type="button" data-safe-open="go">Open the full go / no-go</button><button class="choice" type="button" data-safe-open="sos">Emergency protocols</button></div>`;
    } else {
      const r = route();
      h += `<h2>Walk it</h2><p class="lede">Step out at stop A in first person, with your partner. The route glows on the ground, the helmet display counts down to each stop and watches your oxygen margin, and your tablet runs this map.</p>
        <button class="walk-route" type="button" data-plan-walk>${M.ICONS.walk}<span><b>Walk this route</b><small>${r.pts.length} stops · ${r.pts.length > 1 ? km(r.pts).toFixed(2) + " km" : ""} · W A S D to walk, T for the tablet</small></span></button>
        <button class="walk-route" type="button" data-plan-walk="rover">${M.ICONS.rover}<span><b>Or drive it</b><small>Take the rover instead: surface-aware traction, slip and tilt limits on the helmet display.</small></span></button>
        <p class="muted hint">Back on the map afterwards, you'll land where you stopped walking.</p>`;
    }
    h += `<div class="plan-nav">${s > 1 ? '<button class="choice" type="button" data-plan="prev">← Back</button>' : "<span></span>"}${s > 1 && s < 5 ? `<button class="choice is-on" type="button" data-plan="next" ${s === 3 && route().pts.length < 2 ? "disabled" : ""}>Next →</button>` : ""}</div>`;
    return h;
  }
  const km = (pts) => { let d = 0; for (let i = 1; i < pts.length; i++) { const [a, b] = pts[i - 1], [c, e] = pts[i], r = Math.PI / 180; d += 2 * R * Math.asin(Math.sqrt(Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((e - b) * r / 2) ** 2)); } return d; };

  function go(step) {
    P.step = Math.max(1, Math.min(5, step));
    if (P.step === 2 && state.site) { M.applyPreset("safe"); M.maps.mars.flyTo([state.site.lat, state.site.lng], state.site.id === "perseverance" ? 12 : 9); }
    if (P.step === 3 && state.site && route().pts.length < 2) useSuggested();
    M.renderDrawer();
  }
  function useSuggested() {
    const sg = suggest(state.site); P.why = sg.why;
    if (window.MM_TOOL) MM_TOOL.setRoute(sg.pts, "eva");
    M.maps.mars.flyToBounds(L.latLngBounds(sg.pts).pad(0.6), { maxZoom: 14 });
  }
  function open() {
    if (state.planet !== "mars") { M.travel("mars"); return M.toast("Travel to Mars first, then plan your Marswalk."); }
    if (window.MM_SAFE && MM_SAFE.active()) MM_SAFE.toggle(false, true);
    P.on = true; P.step = state.site ? 2 : 1; P.why = ""; if (P.step === 2) go(2); else M.renderDrawer();
    if (document.body.classList.contains("drawer-closed")) $("panel-btn").click();
  }
  function close() { P.on = false; M.renderDrawer(); }
  $("drawer-body").addEventListener("click", (e) => {
    if (!P.on) return;
    const t = e.target.closest("[data-plan],[data-plan-site]"); if (!t) return;
    e.stopPropagation();
    if (t.dataset.planSite) { M.openSite(t.dataset.planSite); if (window.MM_TOOL) MM_TOOL.setRoute([], "eva"); return go(2); }
    const a = t.dataset.plan;
    if (a === "exit") close();
    else if (a === "next") go(P.step + 1);
    else if (a === "prev") go(P.step - 1);
    else if (a === "suggest") { useSuggested(); M.renderDrawer(); }
    else if (a === "clear") { if (window.MM_TOOL) MM_TOOL.setRoute([], "eva"); M.renderDrawer(); }
  }, true);
  document.addEventListener("click", (e) => { if (e.target.closest('[data-chip-go="plan"]')) open(); });
  window.MM_PLAN = { active: () => P.on, step: () => P.step, html, open, close };
})();
