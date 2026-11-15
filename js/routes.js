/* Directions and measuring tools: waypoints, distance, travel time, pins, route preview. Works on Earth and Mars. */
(() => {
  const M = window.MM, { maps, state, esc } = M, $ = M.$;
  const PL = {
    earth: { R: 6371.0088, day: 24, dayName: "day", accent: "#1d4ed8", modes: [["walk", "Walk", 5], ["bike", "Bike", 16], ["drive", "Drive", 65], ["fly", "Fly", 850]] },
    mars: { R: 3389.5, day: 24.6598, dayName: "sol", accent: "#c2410c", modes: [["eva", "EVA walk", 2.5], ["rover", "Pressurized rover", 14], ["hop", "Rocket hop", 120]] }
  };
  const T = { on: false, mi: false, pts: { earth: [], mars: [] }, mode: { earth: "walk", mars: "eva" }, terrain: 1, suit: 8, round: false, pair: false, wp: {}, ln: {}, anim: 0, rid: null };
  const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
  const hav = (a, b, R) => { const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))); };
  const brg = (a, b) => { const dl = rad(b[1] - a[1]); return (deg(Math.atan2(Math.sin(dl) * Math.cos(rad(b[0])), Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(dl))) + 360) % 360; };
  const dir = (b) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(b / 45) % 8];
  const fD = (km) => { const u = T.mi ? km * 0.621371 : km; if (u < 1) return Math.round(T.mi ? u * 5280 : u * 1000) + (T.mi ? " ft" : " m"); return (u < 100 ? u.toFixed(1) : Math.round(u).toLocaleString()) + (T.mi ? " mi" : " km"); };
  const fT = (h, p) => {
    if (h * 60 < 1) return "<1 min";
    if (h < 1) return Math.round(h * 60) + " min";
    const P = PL[p];
    if (h < P.day) { const m = Math.round((h % 1) * 60); return Math.floor(h) + " h" + (m && m < 60 ? ` ${m} min` : ""); }
    const d = Math.floor(h / P.day), r = Math.round(h - d * P.day);
    return `${d.toLocaleString()} ${P.dayName}${d > 1 ? "s" : ""}${r ? ` ${r} h` : ""}`;
  };
  const fC = (pt) => `${Math.abs(pt[0]).toFixed(3)}°${pt[0] >= 0 ? "N" : "S"}, ${Math.abs(pt[1]).toFixed(3)}°${pt[1] >= 0 ? "E" : "W"}`;
  const wrap = (lng) => ((lng + 180) % 360 + 360) % 360 - 180;
  const letter = (i) => String.fromCharCode(65 + (i % 26));

  function interp(a, b, n = 24) {
    const [la1, lo1, la2, lo2] = [rad(a[0]), rad(a[1]), rad(b[0]), rad(b[1])];
    const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
    if (d < 1e-9) return [a, b];
    const out = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2), y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2), z = A * Math.sin(la1) + B * Math.sin(la2);
      out.push([deg(Math.atan2(z, Math.hypot(x, y))), deg(Math.atan2(y, x))]);
    }
    return out;
  }
  const legs = (p) => { const pts = T.pts[p], out = []; for (let i = 1; i < pts.length; i++) out.push({ a: pts[i - 1], b: pts[i], km: hav(pts[i - 1], pts[i], PL[p].R), br: brg(pts[i - 1], pts[i]) }); return out; };
  const total = (p) => legs(p).reduce((s, l) => s + l.km, 0);
  const mult = (p, id) => (p === "mars" && id !== "hop" ? T.terrain : 1);
  const speed = (p) => PL[p].modes.find((m) => m[0] === T.mode[p])[2];
  const inRegion = (lat, lng) => { const r = state.region; return r && lat >= r.south && lat <= r.north && lng >= r.west && lng <= r.east; };

  /* ---------- drawing ---------- */
  function drawLines(p) {
    const g = T.ln[p] || (T.ln[p] = L.layerGroup().addTo(maps[p]));
    g.clearLayers();
    const ls = legs(p);
    if (!ls.length || (p === "mars" && !state.region)) return;
    const path = ls.flatMap((l, i) => interp(l.a, l.b).slice(i ? 1 : 0));
    L.polyline(path, { color: "#fff", weight: 9, opacity: 0.9, interactive: false }).addTo(g);
    L.polyline(path, { color: PL[p].accent, weight: 4.5, interactive: false }).addTo(g);
    ls.forEach((l) => {
      const mid = interp(l.a, l.b)[12];
      L.marker(mid, { interactive: false, keyboard: false, icon: L.divIcon({ className: "leg-icon", iconSize: [0, 0], html: `<span class="leg-label">${fD(l.km)}</span>` }) }).addTo(g);
    });
  }
  function drawMarkers(p) {
    const g = T.wp[p] || (T.wp[p] = L.layerGroup().addTo(maps[p]));
    g.clearLayers();
    const pts = T.pts[p];
    if (p === "mars" && !state.region) return;
    pts.forEach((pt, i) => {
      const cls = i === 0 ? "start" : i === pts.length - 1 ? "end" : "mid";
      const mk = L.marker(pt, { draggable: true, title: `Stop ${letter(i)}`, icon: L.divIcon({ className: "wp " + cls, html: `<span>${letter(i)}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) });
      mk.on("drag", (e) => { pts[i] = [e.latlng.lat, e.latlng.lng]; drawLines(p); });
      mk.on("dragend", () => {
        if (p === "mars" && state.region) { const r = state.region; pts[i] = [Math.min(r.north, Math.max(r.south, pts[i][0])), Math.min(r.east, Math.max(r.west, pts[i][1]))]; }
        refresh();
      });
      mk.addTo(g);
    });
  }
  function refresh() {
    const p = state.planet;
    drawMarkers(p); drawLines(p);
    if (p === "mars") T.rid = T.pts.mars.length && state.region ? state.region.id : T.pts.mars.length ? T.rid : null;
    if (window.MM_SAFE) MM_SAFE.routeChanged();
    if (T.on || (window.MM_SAFE && MM_SAFE.active())) { const b = $("drawer-body"), s = b.scrollTop; M.renderDrawer(); b.scrollTop = s; }
  }

  /* ---------- editing ---------- */
  function add(lat, lng, at) {
    const p = state.planet;
    lng = wrap(lng);
    if (p === "mars" && !inRegion(lat, lng)) { M.note("mars", state.region ? "Stay inside this chart to plan a route." : "Enter a chart region first."); return false; }
    if (!T.on && !(window.MM_SAFE && MM_SAFE.active())) toggle(true);
    T.pts[p].splice(at === undefined ? T.pts[p].length : at, 0, [lat, lng]);
    refresh();
    return true;
  }
  function toggle(on) {
    T.on = on === undefined ? !T.on : on;
    if (T.on && window.MM_SAFE && MM_SAFE.active()) MM_SAFE.toggle(false, true);
    $("route-btn").setAttribute("aria-pressed", String(T.on));
    document.querySelectorAll(".map").forEach((m) => m.classList.toggle("is-routing", T.on));
    if (T.on && document.body.classList.contains("drawer-closed")) $("panel-btn").click();
    M.renderDrawer();
    if (M.renderChips) M.renderChips();
  }

  /* ---------- pins and context popups ---------- */
  function popupFor(p, ll) {
    const lat = +ll.lat.toFixed(5), lng = +wrap(ll.lng).toFixed(5);
    let extra = "";
    if (p === "mars") {
      let best = null;
      M.A.sites.forEach((s) => { const d = hav([lat, lng], [s.lat, s.lng], PL.mars.R); if (!best || d < best.d) best = { d, s }; });
      extra = `<br><small>${esc(state.region.name)} · ${state.region.id}</small>` + (best ? `<br><small>Nearest site: ${esc(best.s.mission)}, ${fD(best.d)}</small>` : "");
    }
    return `<b>${fC([lat, lng])}</b>${extra}<div class="pop-actions" data-ll="${lat},${lng}"><button class="pop-btn" data-pop="from">From here</button><button class="pop-btn" data-pop="to">To here</button><button class="pop-btn" data-pop="stop">Add stop</button><button class="pop-btn" data-pop="copy">Copy</button>${p === "mars" && window.MM_WALK ? '<button class="pop-btn pop-walk" data-pop="walk">Walk here</button><button class="pop-btn pop-walk" data-pop="drive">Drive here</button>' : ""}</div>`;
  }
  const pin = (p, ll) => L.popup({ offset: [0, -4] }).setLatLng(ll).setContent(popupFor(p, ll)).openOn(maps[p]);
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".pop-btn");
    if (!b) return;
    const [lat, lng] = b.parentElement.dataset.ll.split(",").map(Number), k = b.dataset.pop;
    if (k === "walk" || k === "drive") { maps[state.planet].closePopup(); if (window.MM_WALK) MM_WALK.start(lat, lng, { mode: k === "drive" ? "rover" : "walk" }); return; }
    if (k === "copy") { try { navigator.clipboard.writeText(`${lat}, ${lng}`); } catch (_) {} M.note(state.planet, "Coordinates copied."); }
    else if (k === "from") add(lat, lng, 0);
    else add(lat, lng);
    maps[state.planet].closePopup();
  });
  ["earth", "mars"].forEach((p) => {
    maps[p].on("click", (e) => {
      if (state.planet !== p || (p === "mars" && !state.region) || state.walkPick) return;
      if (T.on) add(e.latlng.lat, e.latlng.lng);
      else if (p === "earth" || inRegion(e.latlng.lat, e.latlng.lng)) pin(p, e.latlng);
    });
    maps[p].on("contextmenu", (e) => { if (state.planet === p && (p === "earth" || state.region) && !state.walkPick) pin(p, e.latlng); });
  });

  /* ---------- route preview ---------- */
  function preview() {
    const p = state.planet, ls = legs(p);
    if (!ls.length) return;
    if (p === "mars" && T.mode.mars === "hop" && window.MM_HOP) return MM_HOP.fly(T.pts.mars.map((q) => q.slice())); // a rocket hop flies
    cancelAnimationFrame(T.anim);
    const path = ls.flatMap((l) => interp(l.a, l.b, 40));
    const mk = L.circleMarker(path[0], { radius: 9, color: "#fff", weight: 3, fillColor: "#111", fillOpacity: 1, interactive: false }).addTo(maps[p]);
    const t0 = performance.now(), dur = Math.min(14000, 4000 + ls.length * 2500);
    const step = (now) => {
      const f = Math.min(1, (now - t0) / dur), i = f * (path.length - 1), k = Math.floor(i), a = path[k], b = path[Math.min(k + 1, path.length - 1)], r = i - k;
      const ll = [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
      mk.setLatLng(ll);
      maps[p].panTo(ll, { animate: false });
      if (f < 1) T.anim = requestAnimationFrame(step); else setTimeout(() => mk.remove(), 1200);
    };
    T.anim = requestAnimationFrame(step);
  }

  /* ---------- panel ---------- */
  function html() {
    const p = state.planet, P = PL[p], pts = T.pts[p], ls = legs(p), km = total(p), mode = speed(p);
    let h = `<button class="back" type="button" data-act="close">← Back to guide</button><p class="kicker">Directions · ${p === "mars" ? "Mars" : "Earth"}</p><h2>Plan a route</h2>`;
    if (p === "mars" && !state.region) return h + `<p class="lede">Mars is explored one chart at a time. Enter a region from the guide or the map, then come back to set waypoints inside it.</p>`;
    h += `<p class="lede muted">Click the map to add stops, drag a marker to adjust it, or type coordinates in the search bar. Right-click or long-press for a pin menu.</p>`;
    h += `<div class="chips">${P.modes.map(([id, name, v]) => `<button class="choice ${T.mode[p] === id ? "is-on" : ""}" type="button" data-act="mode" data-v="${id}">${name}${km ? `<br><small>${fT(km * mult(p, id) / v, p)}</small>` : ""}</button>`).join("")}</div>`;
    h += `<p class="group-label">Stops</p>`;
    h += pts.length ? pts.map((pt, i) => `<div class="stop"><span class="ltr ${i === 0 ? "start" : i === pts.length - 1 && i ? "end" : ""}">${letter(i)}</span><span class="grow"><strong>${fC(pt)}</strong></span><button class="mini" type="button" data-act="up" data-i="${i}" aria-label="Move up" ${i ? "" : "disabled"}>↑</button><button class="mini" type="button" data-act="down" data-i="${i}" aria-label="Move down" ${i < pts.length - 1 ? "" : "disabled"}>↓</button><button class="mini" type="button" data-act="rm" data-i="${i}" aria-label="Remove stop">✕</button></div>`).join("") : `<p class="muted hint">No stops yet. Click the map to place stop A.</p>`;
    if (p === "earth") h += `<div class="actions"><button class="choice" type="button" data-act="myloc">Use my location</button></div>`;
    else if (state.region.sites.length) h += `<label class="date-field">Add a landing site as a stop<select class="sel" data-act="site"><option value="">Choose a site…</option>${state.region.sites.map((s) => `<option value="${s.id}">${esc(s.mission)} · ${esc(s.name)}</option>`).join("")}</select></label>`;
    if (ls.length) {
      // a rocket hop's time is its ballistic flight time (js/hop.js), not a cruising speed
      const hopT = (k) => (window.MM_HOP ? MM_HOP.ballistic(k / P.R).T / 3600 : k / mode);
      const isHop = p === "mars" && T.mode[p] === "hop";
      h += `<div class="stat"><div><small>Distance</small><b>${fD(km)}</b></div><div><small>${P.modes.find((m) => m[0] === T.mode[p])[1]}</small><b>${isHop ? fT(ls.reduce((s2, l) => s2 + hopT(l.km), 0), p) + " flying" : fT(km * mult(p, T.mode[p]) / mode, p)}</b></div></div>`;
      if (p === "mars") {
        const eh = km * mult(p, T.mode[p]) / mode * (T.round ? 2 : 1), pc = eh / T.suit;
        const v = pc <= 0.6 ? ["ok", "Comfortable margin for one EVA."] : pc <= 1 ? ["warn", "Tight. Keep a contingency reserve."] : ["bad", "Exceeds suit endurance. Split it into several EVAs or switch to the rover."];
        h += `<p class="group-label">EVA budget</p><div class="evagrid"><label class="date-field">Terrain<select class="sel" data-eva="terrain">${[[1, "Plains ×1"], [1.5, "Rocky ×1.5"], [2, "Slopes & sand ×2"]].map(([x, n]) => `<option value="${x}" ${T.terrain === x ? "selected" : ""}>${n}</option>`).join("")}</select></label><label class="date-field">Suit hours<input class="sel" type="number" min="1" max="12" step="0.5" value="${T.suit}" data-eva="suit"/></label></div><label class="check"><input type="checkbox" data-eva="round" ${T.round ? "checked" : ""}/><span>Return to start (round trip)</span></label><label class="check"><input type="checkbox" data-eva="pair" ${T.pair ? "checked" : ""}/><span>Two-person team (buddy rule)</span></label><div class="meter"><i class="${v[0]}" style="width:${Math.min(100, pc * 100)}%"></i></div><p class="hint"><strong>${Math.round(pc * 100)}% of suit time (${fT(eh, p)})</strong><br>${v[1]}${T.pair ? " Stay within sight of your partner." : ""}</p>`;
      }
      if (window.MM_SAFE) h += MM_SAFE.routeCard();
      if (p === "mars" && window.MM_WALK) h += `<button class="walk-route" type="button" data-plan-walk>${M.ICONS.walk}<span><b>Walk this route</b><small>Step out at ${letter(0)} in first person. The path, waypoints and your oxygen margin show on the helmet display.</small></span></button><button class="walk-route" type="button" data-plan-walk="rover">${M.ICONS.rover}<span><b>Drive this route</b><small>Take the rover from ${letter(0)}. Traction changes with sand, dust and rock; watch slip and tilt.</small></span></button>`;
      if (p === "mars" && T.mode.mars === "hop" && window.MM_HOP) h += `<button class="walk-route" type="button" data-hop-fly>${M.ICONS.rocket}<span><b>Fly this hop</b><small>Watch the rocket hop from ${letter(0)} to ${letter(pts.length - 1)} on a ballistic arc under Mars gravity.</small></span></button>`;
      h += `<p class="group-label">Legs</p>` + ls.map((l, i) => `<div class="leg"><strong>${letter(i)} → ${letter(i + 1)}</strong> · ${fD(l.km)} · ${isHop ? fT(hopT(l.km), p) + " ballistic" : fT(l.km * mult(p, T.mode[p]) / mode, p)}<br><small>Head ${dir(l.br)} (${Math.round(l.br)}°)</small></div>`).join("");
      h += `<p class="hint muted">Straight-line great-circle estimates at constant speed. Terrain, hazards and rest stops will add time.${p === "mars" ? " One sol is about 24 h 40 min." : ""}</p>`;
    }
    h += `<div class="actions"><button class="choice" type="button" data-act="preview" ${ls.length ? "" : "disabled"}>Preview route</button><button class="choice" type="button" data-act="rev" ${pts.length > 1 ? "" : "disabled"}>Reverse</button><button class="choice" type="button" data-act="opt" ${pts.length > 2 ? "" : "disabled"}>Shortest order</button><button class="choice" type="button" data-act="copy" ${pts.length ? "" : "disabled"}>Copy route</button><button class="choice" type="button" data-act="units">${T.mi ? "Show km" : "Show miles"}</button><button class="choice" type="button" data-act="clear" ${pts.length ? "" : "disabled"}>Clear</button></div>`;
    return h;
  }
  $("drawer-body").addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t || t.tagName === "SELECT") return;
    const p = state.planet, pts = T.pts[p], i = +t.dataset.i, a = t.dataset.act;
    if (a === "close") return toggle(false);
    if (a === "mode") T.mode[p] = t.dataset.v;
    else if (a === "rm") pts.splice(i, 1);
    else if (a === "up" || a === "down") { const j = a === "up" ? i - 1 : i + 1; [pts[i], pts[j]] = [pts[j], pts[i]]; }
    else if (a === "rev") pts.reverse();
    else if (a === "clear") pts.length = 0;
    else if (a === "units") T.mi = !T.mi;
    else if (a === "opt") {
      const rest = pts.slice(1), out = [pts[0]];
      while (rest.length) { const last = out[out.length - 1]; let k = 0; rest.forEach((q, n) => { if (hav(last, q, PL[p].R) < hav(last, rest[k], PL[p].R)) k = n; }); out.push(rest.splice(k, 1)[0]); }
      pts.splice(0, pts.length, ...out);
    }
    else if (a === "preview") return preview();
    else if (a === "copy") {
      const txt = pts.map((pt, k) => `${letter(k)}: ${pt[0].toFixed(5)}, ${pt[1].toFixed(5)}`).join("\n") + `\nDistance: ${fD(total(p))}\n` + PL[p].modes.map(([id, n, v]) => `${n}: ${fT(total(p) * mult(p, id) / v, p)}`).join("\n");
      try { navigator.clipboard.writeText(txt); } catch (_) {}
      return M.note(p, "Route copied to your clipboard.");
    }
    else if (a === "myloc") {
      if (!navigator.geolocation) return M.note(p, "Location is not available in this browser.");
      return navigator.geolocation.getCurrentPosition((pos) => { add(pos.coords.latitude, pos.coords.longitude, 0); maps.earth.flyTo([pos.coords.latitude, pos.coords.longitude], 10); }, () => M.note(p, "Could not get your location."));
    }
    refresh();
  });
  $("drawer-body").addEventListener("change", (e) => {
    const k = e.target.dataset.eva;
    if (k) { if (k === "terrain") T.terrain = +e.target.value; else if (k === "suit") T.suit = Math.max(1, +e.target.value || 8); else T[k] = e.target.checked; return refresh(); }
    if (e.target.dataset.act !== "site" || !e.target.value) return;
    const s = M.siteById[e.target.value];
    add(s.lat, s.lng);
  });

  /* ---------- hooks used by app.js ---------- */
  window.MM_TOOL = {
    active: () => T.on,
    html, add: (lat, lng) => add(lat, lng),
    cfg: () => T,
    interp,
    getRoute: () => ({ planet: state.planet, mode: T.mode[state.planet], pts: T.pts[state.planet].map((q) => [+q[0].toFixed(5), +q[1].toFixed(5)]) }),
    setRoute: (pts, mode) => { T.pts[state.planet] = pts.map((q) => q.slice()); if (state.planet === "mars") T.rid = state.region ? state.region.id : null; if (mode && PL[state.planet].modes.some((m) => m[0] === mode)) T.mode[state.planet] = mode; toggle(true); refresh(); }, // ignore a mode from the other planet (e.g. a shared Mars route opened on Earth)
    next: (c) => {
      const p = state.planet, pts = T.pts[p], tg = pts.find((q) => hav(c, q, PL[p].R) > 0.3);
      if (!tg) return null;
      const km = hav(c, tg, PL[p].R), b = brg(c, tg);
      return { label: letter(pts.indexOf(tg)), dist: fD(km), time: fT(km * mult(p, T.mode[p]) / speed(p), p), br: b, dir: dir(b) };
    },
    regionChanged: () => {
      // Only a move to a DIFFERENT chart clears the Mars route. Recentering, the overview, or a trip to Earth keeps it.
      const r = state.region;
      if (r && T.rid && r.id !== T.rid) { T.pts.mars.length = 0; T.rid = null; }
      drawMarkers("mars"); drawLines("mars");
      if (window.MM_SAFE) MM_SAFE.routeChanged();
    },
    stats: () => {
      const p = state.planet, m = PL[p].modes.find((x) => x[0] === T.mode[p]), km = total(p);
      const oneWay = km * mult(p, T.mode[p]) / m[2];
      return { planet: p, pts: T.pts[p], km, mode: m[0], modeName: m[1], speed: m[2], terrain: p === "mars" ? T.terrain : 1, oneWay, hours: oneWay * (T.round ? 2 : 1), round: T.round, pair: T.pair, suit: T.suit, walk: PL.mars.modes[0][2], R: PL[p].R };
    },
    fmt: { D: fD, T: fT, C: fC, dir }, hav, brg, interp
  };
  $("route-btn").addEventListener("click", () => toggle());
})();
