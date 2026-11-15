/* Rocket hop: a suborbital flight from one stop to the next, shown on the Mars map.
   The trajectory is worked out, not drawn freehand: a minimum-energy ballistic arc over a round Mars
   (radius 3,389.5 km, surface gravity 3.721 m/s², NASA Mars Fact Sheet), integrated step by step. It gives the launch
   speed, launch angle, highest point and flight time. Mars's air is about 1% of Earth's, so drag is left out.
   The rocket on screen rises and shrinks with altitude; its shadow stays on the ground track. */
(() => {
  const M = window.MM;
  if (!M) return;
  const { maps, state, esc } = M, map = maps.mars;
  const R = 3389500, g = 3.721, GM = g * R * R;
  const rad = Math.PI / 180;
  const gcDist = (a, b) => { const h = Math.sin((b[0] - a[0]) * rad / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin((b[1] - a[1]) * rad / 2) ** 2; return 2 * Math.asin(Math.min(1, Math.sqrt(h))); };
  // point a fraction f along the great circle from a to b
  const slerp = (a, b, f) => {
    const p1 = a[0] * rad, l1 = a[1] * rad, p2 = b[0] * rad, l2 = b[1] * rad, d = gcDist(a, b); if (d < 1e-9) return a.slice();
    const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2), y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2), z = A * Math.sin(p1) + B * Math.sin(p2);
    return [Math.atan2(z, Math.hypot(x, y)) / rad, Math.atan2(y, x) / rad];
  };
  // Minimum-energy ballistic hop over angle th: v² = gR·2s/(1+s), s = sin(th/2); launch angle 45° − th/4 above the horizon.
  function ballistic(th) {
    const s = Math.sin(th / 2), v = Math.sqrt(g * R * 2 * s / (1 + s)), al = Math.PI / 4 - th / 4;
    let r = R, phi = 0, vr = v * Math.sin(al), vt = v * Math.cos(al), t = 0, hMax = 0; const track = [[0, 0, 0]];
    const dt = Math.max(0.05, Math.sqrt(2 * Math.max(th * R, 1) / g) / 4000);
    for (let i = 0; i < 400000; i++) {
      // polar equations of motion: r'' = r φ'² − GM/r², (r² φ')' = 0
      const h = r * vt, ar = vt * vt / r - GM / (r * r);
      vr += ar * dt; r += vr * dt; vt = h / r; phi += vt / r * dt; t += dt;
      hMax = Math.max(hMax, r - R); if (i % 20 === 0) track.push([t, phi, r - R]);
      if (r <= R && vr < 0) break;
    }
    track.push([t, phi, 0]);
    return { v, al, T: t, hMax, phi, track };
  }
  const fmtT = (s) => (s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")} s` : `${(s / 3600).toFixed(1)} h`);
  const fmtD = (m) => (m < 10000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m / 1000).toLocaleString()} km`);

  const card = document.createElement("div"); card.className = "hop-card"; card.hidden = true; document.body.appendChild(card);
  const rocketSvg = `<svg viewBox="0 0 40 80" aria-hidden="true"><path d="M20 2c7 9 10 21 10 34v20H10V36C10 23 13 11 20 2Z" fill="#eef0f3" stroke="#8a8f98" stroke-width="1.5"/><circle cx="20" cy="28" r="4.5" fill="#2c3a55" stroke="#9aa3b3" stroke-width="1.5"/><path d="M10 44 2 60v6l8-4M30 44l8 16v6l-8-4" fill="#c2410c"/><rect x="13" y="56" width="14" height="5" rx="1.5" fill="#55595f"/></svg>`;
  let run = null;
  function stop() { if (!run) return; cancelAnimationFrame(run.raf); run.layers.forEach((l) => l.remove()); card.hidden = true; run = null; }
  function fly(pts) {
    stop(); if (state.planet !== "mars" || pts.length < 2) return;
    const legs = []; for (let i = 1; i < pts.length; i++) { const th = gcDist(pts[i - 1], pts[i]); legs.push({ a: pts[i - 1], b: pts[i], th, ...ballistic(Math.max(th, 1e-7)) }); }
    const calm = !!(window.MM_PREFS && !MM_PREFS.motion);
    const rocket = L.marker(pts[0], { interactive: false, keyboard: false, zIndexOffset: 2000, icon: L.divIcon({ className: "hop-rocket", iconSize: [0, 0], html: `<span class="hop-body">${rocketSvg}<i class="hop-flame"></i></span>` }) }).addTo(map);
    const shadow = L.marker(pts[0], { interactive: false, keyboard: false, zIndexOffset: 1900, icon: L.divIcon({ className: "hop-shadow", iconSize: [0, 0], html: "<i></i>" }) }).addTo(map);
    const arcs = legs.map((l) => L.polyline(Array.from({ length: 41 }, (_, k) => slerp(l.a, l.b, k / 40)), { color: "#ffb27a", weight: 2, dashArray: "4 8", opacity: 0.8, interactive: false }).addTo(map));
    run = { layers: [rocket, shadow, ...arcs], raf: 0 };
    let leg = 0, t0 = 0;
    const puff = (ll) => { const m = L.marker(ll, { interactive: false, keyboard: false, icon: L.divIcon({ className: "hop-dust", iconSize: [0, 0], html: "<i></i><i></i>" }) }).addTo(map); run.layers.push(m); setTimeout(() => m.remove(), 1800); };
    const startLeg = () => {
      const l = legs[leg]; map.flyToBounds(L.latLngBounds([l.a, l.b]).pad(0.6), { duration: calm ? 0.01 : 0.8, maxZoom: Math.min(map.getMaxZoom(), 14) });
      card.hidden = false;
      card.innerHTML = `<p class="kicker">Rocket hop · ${String.fromCharCode(65 + leg)} → ${String.fromCharCode(66 + leg)}</p><div class="hop-grid"><div><b>${fmtD(l.th * R)}</b><small>ground distance</small></div><div><b>${l.v < 1000 ? l.v.toFixed(0) + " m/s" : (l.v / 1000).toFixed(2) + " km/s"}</b><small>launch speed</small></div><div><b>${(l.al / rad).toFixed(1)}°</b><small>launch angle</small></div><div><b>${fmtD(l.hMax)}</b><small>highest point</small></div><div><b>${fmtT(l.T)}</b><small>real flight time</small></div><div><b>${(2 * l.v / 1000).toFixed(2)} km/s</b><small>Δv, launch + landing</small></div></div><p class="hop-note">Minimum-energy ballistic arc over a round Mars, g = 3.721 m/s². The animation is sped up.</p>`;
      setTimeout(() => { puff(l.a); t0 = performance.now(); run.raf = requestAnimationFrame(step); }, calm ? 30 : 900);
    };
    const step = (now) => {
      if (!run) return;
      const l = legs[leg], dur = calm ? 600 : Math.min(9000, 4200 + Math.sqrt(l.th * R / 1000) * 400), k = Math.min(1, (now - t0) / dur);
      // time along the real flight, then position and altitude from the integrated track
      const tt = k * l.T; let j = 1; while (j < l.track.length - 1 && l.track[j][0] < tt) j++;
      const [ta, pa, ha] = l.track[j - 1], [tb, pb, hb] = l.track[j], u = tb > ta ? (tt - ta) / (tb - ta) : 1, phi = pa + (pb - pa) * u, h = ha + (hb - ha) * u;
      const ll = slerp(l.a, l.b, Math.min(1, phi / l.phi)); rocket.setLatLng(ll); shadow.setLatLng(ll);
      const hn = l.hMax > 0 ? h / l.hMax : 0, el = rocket.getElement();
      if (el) {
        const body = el.firstChild, p0 = map.latLngToLayerPoint(l.a), p1 = map.latLngToLayerPoint(l.b), ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI + 90;
        const climb = k < 0.5 ? 1 - k * 2 : (k - 0.5) * 2, tilt = (k < 0.5 ? 1 : -1) * (1 - climb) * 50, burn = k < 0.06 || k > 0.92;
        body.style.transform = `translate(-50%, calc(-50% - ${(hn * 70).toFixed(1)}px)) rotate(${(k < 0.5 ? ang * (1 - climb) : ang * (1 - climb) + 180 * 0).toFixed(1)}deg) scale(${(0.7 + hn * 0.6).toFixed(3)})`;
        body.classList.toggle("burn", burn); body.classList.toggle("descent", k > 0.5);
        el.style.opacity = "1";
      }
      const se = shadow.getElement(); if (se) se.firstChild.style.transform = `translate(-50%,-50%) scale(${(1 - hn * 0.6).toFixed(3)})`; if (se) se.firstChild.style.opacity = String(0.55 - hn * 0.35);
      if (k < 1) { run.raf = requestAnimationFrame(step); return; }
      puff(l.b); leg++;
      if (leg < legs.length) setTimeout(startLeg, 900);
      else setTimeout(() => { M.toast(`Hop complete: ${legs.length} leg${legs.length > 1 ? "s" : ""}, ${fmtD(legs.reduce((s, x) => s + x.th * R, 0))}, ${fmtT(legs.reduce((s, x) => s + x.T, 0))} of real flight.`); stop(); }, 2200);
    };
    startLeg();
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-hop-fly]") && window.MM_TOOL) fly(MM_TOOL.getRoute().pts); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") stop(); });
  window.MM_HOP = { fly, stop, ballistic };
})();
