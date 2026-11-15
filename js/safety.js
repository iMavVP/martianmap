/* Safety center: current conditions, site hazards, go / no-go, consumables, emergency protocols and HUD warnings.
   Everything here is a planning aid for the Space Apps prototype. Formulas and their sources are listed in README.md.
   - Mars clock, season, sunrise and sunset: Allison & McEwen (2000), the algorithm behind NASA GISS Mars24.
   - Surface radiation: Curiosity RAD average, about 0.64 mSv per day (Hassler et al. 2014).
   - Space weather: NASA DONKI solar flare and solar energetic particle lists (optional, see js/config.js).
   - Elevation: NASA Trek MOLA elevation tiles, read pixel by pixel along the route. */
(() => {
  const M = window.MM, $ = M.$, esc = M.esc, state = M.state, CFG = window.MM_CONFIG || {};
  const S = { on: false, tab: "brief", checks: {}, crew: 2, work: 1, reserve: 30, open: "leak", wx: null, wxAt: 0, elev: null, elevKey: "", ring: null };
  const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI, mod = (a, n) => ((a % n) + n) % n;
  const hhmm = (h) => { h = mod(h, 24); let m = Math.round(h * 60); if (m >= 1440) m = 0; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
  const SOL_H = 24.6597, RAD_DAY = 0.64;

  /* ---------- Mars clock and sky (Mars24 algorithm) ---------- */
  function marsNow(date) {
    const jdUT = 2440587.5 + (date ? +date : Date.now()) / 86400000, jdTT = jdUT + 69.184 / 86400, dt = jdTT - 2451545.0;
    const Mm = mod(19.3871 + 0.52402073 * dt, 360), aFMS = mod(270.3871 + 0.524038496 * dt, 360);
    const PB = [[0.0071, 2.2353, 49.409], [0.0057, 2.7543, 168.173], [0.0039, 1.1177, 191.837], [0.0037, 15.7866, 21.736], [0.0021, 2.1354, 15.704], [0.0020, 2.4694, 95.528], [0.0018, 32.8493, 49.095]];
    const pbs = PB.reduce((s, [A, tau, phi]) => s + A * Math.cos(rad(0.985626 * dt / tau + phi)), 0);
    const m = rad(Mm), vM = (10.691 + 3e-7 * dt) * Math.sin(m) + 0.623 * Math.sin(2 * m) + 0.050 * Math.sin(3 * m) + 0.005 * Math.sin(4 * m) + 0.0005 * Math.sin(5 * m) + pbs;
    const ls = mod(aFMS + vM, 360), L = rad(ls);
    const eot = 2.861 * Math.sin(2 * L) - 0.071 * Math.sin(4 * L) + 0.002 * Math.sin(6 * L) - vM; // degrees
    const msd = (jdTT - 2405522.0028779) / 1.0274912517, mtc = mod(24 * msd, 24);
    const decl = deg(Math.asin(0.42565 * Math.sin(L))) + 0.25 * Math.sin(L);
    const rM = 1.52367934 * (1.00436 - 0.09309 * Math.cos(m) - 0.004336 * Math.cos(2 * m) - 0.00031 * Math.cos(3 * m) - 0.00003 * Math.cos(4 * m));
    // Heliocentric positions of Mars and Earth give the distance and the radio delay.
    const lM = rad(ls + 85.061 - 0.015 * Math.sin(rad(71 + 2 * ls)) - 5.5e-6 * dt), bM = rad(-(1.8497 - 2.23e-5 * dt) * Math.sin(rad(ls - 144.50 + 2.57e-6 * dt)));
    const g = rad(mod(357.528 + 0.9856003 * dt, 360)), lE = rad(mod(280.460 + 0.9856474 * dt + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g) + 180, 360));
    const rE = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);
    const dist = Math.sqrt(rE * rE + rM * rM - 2 * rE * rM * Math.cos(bM) * Math.cos(lM - lE));
    const sem = deg(Math.acos(Math.max(-1, Math.min(1, (rE * rE + dist * dist - rM * rM) / (2 * rE * dist))))); // Sun-Earth-Mars angle
    return { msd, mtc, ls, eot, decl, rM, dist, lightMin: dist * 499.004784 / 60, sem };
  }
  function sun(lat, lng, t) {
    t = t || marsNow();
    const ltst = mod(t.mtc + lng / 15 + t.eot / 15, 24), c = -Math.tan(rad(lat)) * Math.tan(rad(t.decl));
    if (c <= -1) return { ltst, polar: "day", up: true, left: Infinity };
    if (c >= 1) return { ltst, polar: "night", up: false, left: 0 };
    const H = deg(Math.acos(c)) / 15, rise = 12 - H, set = 12 + H, up = ltst > rise && ltst < set;
    return { ltst, rise, set, up, left: up ? (set - ltst) * SOL_H / 24 : 0, toRise: up ? 0 : mod(rise - ltst, 24) * SOL_H / 24 };
  }
  const season = (ls, lat) => { const n = ["spring", "summer", "autumn", "winter"][Math.floor(ls / 90) % 4], s = ["autumn", "winter", "spring", "summer"][Math.floor(ls / 90) % 4]; return lat >= 0 ? `northern ${n}` : `southern ${s}`; };
  const dusty = (ls) => ls >= 180;

  /* ---------- where and what are we planning? ---------- */
  function ref() {
    if (state.planet !== "mars") return null;
    const st = window.MM_TOOL ? MM_TOOL.stats() : null;
    if (st && st.pts.length && state.region) return { lat: st.pts[0][0], lng: st.pts[0][1], label: "stop A" };
    if (state.site) return { lat: state.site.lat, lng: state.site.lng, label: state.site.name };
    if (state.region) { const c = M.maps.mars.getCenter(); return { lat: c.lat, lng: c.lng, label: "the map center" }; }
    return null;
  }
  const route = () => { const st = window.MM_TOOL && MM_TOOL.stats(); return st && st.planet === "mars" && state.region && st.pts.length >= 2 ? st : null; };
  const usable = (st) => st.suit * (1 - S.reserve / 100);
  // Furthest a crew may be from stop A and still walk home on suit reserves. On foot the suit clock is already running, so the limit is half.
  const walkBackKm = (st) => (st.walk / st.terrain) * usable(st) * (st.mode === "eva" ? 0.5 : 1);
  const farthest = (st) => st.pts.reduce((mx, p) => Math.max(mx, MM_TOOL.hav(st.pts[0], p, st.R)), 0);
  const F = () => MM_TOOL.fmt;

  /* ---------- site hazards ---------- */
  const HZ = ["Terrain", "Slopes", "Dust", "Cold", "Exposure"];
  const HAZ = {
    perseverance: [[2, 2, 2, 2, 2], ["The delta front and the crater rim are steep rubble. Route around them, not over.", "Sand ripples on the crater floor can swallow a wheel or a boot.", "Boulders below the delta scarp block straight lines and hide drops."]],
    curiosity: [[3, 3, 2, 2, 2], ["Sharp, wind-carved rocks punctured Curiosity's wheels. They will cut gloves and boots too.", "Deep sand ripples fill the gaps between ridges. Probe before you step.", "Mount Sharp's layered slopes and canyon walls mean fall risk above and rockfall below."]],
    spirit: [[2, 2, 3, 2, 2], ["Crusted soil hid the loose sand that trapped Spirit for good. Test the ground before trusting it.", "The Columbia Hills are loose underfoot. Climb roped or not at all.", "Dust settles thickly on equipment between cleaning winds."]],
    opportunity: [[1, 1, 3, 2, 3], ["Sand ripples: Opportunity was stuck in one for weeks.", "The plain offers no wall to shelter behind in a storm or a solar event.", "A planet-wide dust storm blocked the Sun and ended the Opportunity mission in 2018."]],
    insight: [[1, 1, 3, 2, 3], ["Dust on the solar panels ended the InSight mission. Power margins shrink every sol.", "Flat ground with nothing to shelter behind.", "The soil clumps and gives poor grip, so anchors and stakes may not hold."]],
    pathfinder: [[3, 1, 2, 2, 2], ["A flood-laid boulder field. Every step is a trip or suit-tear hazard.", "Rocks hide the ground between them. Keep three points of contact when carrying loads.", "Line of sight to your partner is easily lost among boulders."]],
    viking1: [[2, 1, 2, 2, 3], ["Scattered rocks and drifts on open ground.", "No terrain shelter. Carry or pre-place a storm shelter.", "Fine drift material is soft. Skirt the drifts."]],
    viking2: [[2, 1, 2, 3, 3], ["A boulder-strewn plain with troughs between the rocks.", "Winter frost coats the surface. Cold-soak time is the limit, not distance.", "High latitude means short winter days. Watch the sunset clock."]],
    phoenix: [[1, 1, 1, 3, 3], ["Extreme cold. Winter carbon dioxide frost buried the Phoenix lander.", "Polar night lasts for months with no solar power.", "Ice sits just under the soil and is slick where exposed."]]
  };
  const bandHaz = (r) => (r.band.includes("polar") ? [2, 1, 1, 3, 3] : r.band.includes("mid-latitudes") ? [2, 2, 2, 3, 2] : r.band.includes("plains") ? [1, 1, 2, 3, 3] : [2, 2, 2, 2, 2]);
  const LVL = ["", "Low", "Moderate", "High"];
  const hazGrid = (v) => `<div class="hazgrid">${HZ.map((n, i) => `<div class="haz h${v[i]}"><small>${n}</small><b>${LVL[v[i]]}</b><span class="pips"><i></i><i></i><i></i></span></div>`).join("")}</div>`;
  function siteCard(s) {
    const h = HAZ[s.id];
    if (!h) return "";
    return `<p class="group-label">Hazard rating</p>${hazGrid(h[0])}<ul class="notes warnlist">${h[1].map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <div class="actions"><button class="choice is-on" type="button" data-safe-open="go">Run go / no-go check</button><button class="choice" type="button" data-safe-open="sos">Emergency protocols</button></div>`;
  }

  /* ---------- space weather (NASA DONKI) ---------- */
  function loadWx() {
    if (CFG.spaceWeather === false) { S.wx = "off"; return; }
    // Refresh every 30 minutes; after a failure wait 5 minutes (a failed lookup used to retry on every redraw, making the panel flash).
    if (S.wx === "loading") return;
    if (S.wx && Date.now() - S.wxAt < (S.wx === "err" ? 5 : 30) * 60000) return;
    S.wx = "loading"; S.wxAt = Date.now();
    const d = (ms) => new Date(ms).toISOString().slice(0, 10), q = `?startDate=${d(Date.now() - 7 * 864e5)}&endDate=${d(Date.now())}&api_key=${encodeURIComponent(CFG.nasaApiKey || "DEMO_KEY")}`;
    const get = (k) => fetch("https://api.nasa.gov/DONKI/" + k + q).then((r) => { if (!r.ok) throw 0; return r.text(); }).then((t) => (t.trim() ? JSON.parse(t) : []));
    Promise.all([get("FLR"), get("SEP")]).then(([flr, sep]) => {
      const rank = (c) => ({ X: 3, M: 2, C: 1 }[(c || "")[0]] || 0) * 100 + (parseFloat((c || "").slice(1)) || 0);
      const recent = (t) => Date.now() - Date.parse(t) < 72 * 36e5;
      const fl = (Array.isArray(flr) ? flr : []).map((f) => ({ c: f.classType || "?", t: f.peakTime || f.beginTime })).sort((a, b) => rank(b.c) - rank(a.c));
      const sp = (Array.isArray(sep) ? sep : []).map((x) => x.eventTime).filter(Boolean);
      S.wx = { top: fl[0] || null, n: fl.length, x72: fl.some((f) => f.c[0] === "X" && recent(f.t)), m72: fl.some((f) => f.c[0] === "M" && recent(f.t)), sep72: sp.some(recent), sepN: sp.length };
    }).catch(() => { S.wx = "err"; }).then(() => { if (S.on) rerender(); });
  }
  function wxLevel() {
    const w = S.wx;
    if (!w || w === "loading" || w === "err" || w === "off") return ["warn", w === "loading" ? "Checking NASA's space weather database…" : "Live space weather is unavailable. Confirm with mission control before going out."];
    if (w.sep72) return ["fail", "Solar energetic particle event in the last 72 hours. Stay near shielding."];
    if (w.x72) return ["warn", "X-class solar flare in the last 72 hours. Keep a shelter within reach."];
    if (w.m72) return ["pass", "Moderate solar flares only in the last 72 hours."];
    return ["pass", "No strong solar flares or particle events in the last 72 hours."];
  }

  /* ---------- elevation profile from MOLA tiles ---------- */
  const tiles = {};
  function tile(z, x, y) {
    const k = z + "/" + x + "/" + y;
    if (tiles[k]) return tiles[k];
    const L0 = M.A.marsLayers.find((l) => l.id === "elevation"), fill = (u) => u.replace("{z}", z).replace("{y}", y).replace("{x}", x);
    const load = (u) => new Promise((res) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { try { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0, 256, 256); res(g.getImageData(0, 0, 256, 256).data); } catch (_) { res(null); } }; im.onerror = () => res(null); im.src = u; });
    return (tiles[k] = load(fill(L0.url)).then((d) => d || load(fill(M.altName(L0.url)))));
  }
  const MOLA = [-8201, 21241]; // metres spanned by the 8-bit MOLA elevation mosaic (approximate)
  async function elevAt(lat, lng) {
    const z = 6, cols = 2 ** (z + 1), rows = 2 ** z, fx = (lng + 180) / 360 * cols, fy = (90 - lat) / 180 * rows;
    const x = Math.min(cols - 1, Math.floor(fx)), y = Math.min(rows - 1, Math.floor(fy)), d = await tile(z, x, y);
    if (!d) return null;
    const px = Math.min(255, Math.floor((fx - x) * 256)), py = Math.min(255, Math.floor((fy - y) * 256));
    return MOLA[0] + d[(py * 256 + px) * 4] / 255 * (MOLA[1] - MOLA[0]);
  }
  function loadElev() {
    const st = route();
    if (!st) { S.elev = null; S.elevKey = ""; return; }
    const key = JSON.stringify(st.pts);
    if (key === S.elevKey) return;
    S.elevKey = key; S.elev = "loading";
    const per = Math.max(4, Math.floor(48 / (st.pts.length - 1))), path = [];
    for (let i = 1; i < st.pts.length; i++) MM_TOOL.interp(st.pts[i - 1], st.pts[i], per).slice(i > 1 ? 1 : 0).forEach((p) => path.push(p));
    Promise.all(path.map((p) => elevAt(p[0], p[1]))).then((h) => {
      if (key !== S.elevKey) return;
      if (h.some((v) => v === null)) S.elev = "err";
      else {
        const d = [0]; for (let i = 1; i < path.length; i++) d.push(d[i - 1] + MM_TOOL.hav(path[i - 1], path[i], st.R));
        let steep = 0;
        for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) if (d[j] - d[i] >= 5) { steep = Math.max(steep, deg(Math.atan(Math.abs(h[j] - h[i]) / ((d[j] - d[i]) * 1000)))); break; }
        S.elev = { h, d, steep, lo: Math.min(...h), hi: Math.max(...h) };
      }
      if (S.on) rerender();
    });
  }
  function elevHtml() {
    const e = S.elev, st = route();
    if (!st) return "";
    let h = `<p class="group-label">Elevation along the route</p>`;
    if (!e || e === "loading") return h + `<p class="muted hint">Reading NASA MOLA elevation tiles…</p>`;
    if (e === "err") return h + `<p class="muted hint">Elevation tiles could not be read here. Turn on the MOLA elevation layer and judge the climb by eye.</p>`;
    if (st.km < 5) return h + `<p class="muted hint">This route is shorter than the MOLA map can resolve (about 460 m per pixel, in height steps of about 115 m). Judge slopes from rover images and the relief layer.</p>`;
    const W = 320, H = 70, span = Math.max(e.hi - e.lo, 1), pts = e.h.map((v, i) => `${(e.d[i] / e.d[e.d.length - 1] * W).toFixed(1)},${(H - 6 - (v - e.lo) / span * (H - 12)).toFixed(1)}`).join(" ");
    const km = (m) => (Math.abs(m) >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m) + " m");
    h += `<svg class="elev" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Elevation profile of the route"><polygon points="0,${H} ${pts} ${W},${H}"/><polyline points="${pts}"/></svg>
      <div class="kv"><div><small>Lowest</small><b>${km(e.lo)}</b></div><div><small>Highest</small><b>${km(e.hi)}</b></div><div><small>Start to end</small><b>${e.h[e.h.length - 1] >= e.h[0] ? "+" : "−"}${km(Math.abs(e.h[e.h.length - 1] - e.h[0]))}</b></div><div><small>Relief on route</small><b>${km(e.hi - e.lo)}</b></div></div>`;
    if (e.steep >= 15) h += `<p class="alert bad"><strong>Steep section: about ${Math.round(e.steep)}° averaged over 5 km.</strong> Too steep to walk in a suit. Reroute.</p>`;
    else if (e.steep >= 8) h += `<p class="alert warn"><strong>Sustained grade of about ${Math.round(e.steep)}°.</strong> Use the "Slopes &amp; sand" terrain setting and plan rest stops.</p>`;
    return h + `<p class="hint muted">Heights are relative to the Mars datum, read from the 8-bit MOLA mosaic on NASA Trek, so treat them as approximate (±120 m).</p>`;
  }

  /* ---------- go / no-go ---------- */
  const MANUAL = [
    ["Suit", [["s1", "Suit pressure holds for 5 minutes with no leak"], ["s2", "Primary and backup oxygen full"], ["s3", "CO₂ scrubber fresh, battery charged, cooling loop flowing"], ["s4", "Gloves, boots and visor inspected for cuts and dust on the seals"]]],
    ["Communications", [["c1", "Voice check with partner and with the habitat"], ["c2", "Check-in interval agreed (default every 30 minutes)"], ["c3", "Habitat watch officer assigned and awake for the whole EVA"]]],
    ["Navigation", [["n1", "Route loaded on the HUD and bearings written on the cuff checklist"], ["n2", "Turn-back time briefed and set"], ["n3", "Nearest shelter and the way back to stop A known by everyone"]]],
    ["Equipment", [["e1", "Suit patch kit, tether and buddy-breathing hose packed"], ["e2", "Science tools tethered, sample bags counted"], ["e3", "Rover charged, or confirmed not needed"]]],
    ["Crew", [["m1", "Everyone rested, fed, hydrated and medically cleared"], ["m2", "Emergency protocols reviewed in the last 24 hours"]]]
  ];
  function autoChecks() {
    const st = route(), r = ref(), t = marsNow(), out = [], add = (s, title, detail) => out.push({ s, title, detail });
    if (!st) add("fail", "Route planned", "Add at least two stops with the route tool. Stop A is your habitat or rover.");
    else {
      const f = F(), pc = st.hours / st.suit, lim = 1 - S.reserve / 100;
      add(pc <= lim ? "pass" : pc <= 1 ? "warn" : "fail", "Suit endurance", `${f.T(st.hours, "mars")} planned of ${st.suit} h suit time (${Math.round(pc * 100)}%). The limit with a ${S.reserve}% reserve is ${Math.round(lim * 100)}%.`);
      const far = farthest(st), wb = walkBackKm(st);
      add(far <= wb ? "pass" : "fail", st.mode === "eva" ? "Turn-back distance" : "Walk-back rule", `Farthest point is ${f.D(far)} from stop A. ${st.mode === "eva" ? "On foot you can safely reach" : "If the vehicle fails the crew can walk back from"} ${f.D(wb)}.`);
      add(st.pair ? "pass" : "fail", "Buddy rule", st.pair ? "Two-person team selected." : "Nobody walks alone. Tick “Two-person team” in the route tool.");
    }
    if (r) {
      const s = sun(r.lat, r.lng, t), need = (st ? st.hours : 0) + 1;
      if (s.polar === "night") add("fail", "Daylight", "Polar night at this latitude. No surface EVA without a lit, surveyed route.");
      else if (!s.up) add("fail", "Daylight", `The Sun is down at ${r.label}. Sunrise in ${F().T(s.toRise, "mars")}.`);
      else add(s.left >= need ? "pass" : "fail", "Daylight", s.polar === "day" ? "Midnight sun: daylight for the whole EVA." : `${F().T(s.left, "mars")} of daylight left at ${r.label}. This EVA needs ${F().T(need, "mars")} including a 1 h margin.`);
      add(dusty(t.ls) ? "warn" : "pass", "Dust season", dusty(t.ls) ? `Ls ${Math.round(t.ls)}°: dust storm season. Check the sky and the opacity report before leaving.` : `Ls ${Math.round(t.ls)}°: outside the main dust storm season.`);
    }
    const w = wxLevel(); add(w[0], "Space weather", w[1]);
    add(t.sem < 3 ? "warn" : "pass", "Earth link", t.sem < 3 ? "Solar conjunction: the Sun blocks the link to Earth. The crew is fully on its own." : `One-way delay ${t.lightMin.toFixed(1)} min. Earth cannot help in real time, so the habitat is your mission control.`);
    return out;
  }
  function verdict() {
    const a = autoChecks(), man = MANUAL.flatMap((g) => g[1]), done = man.filter((m) => S.checks[m[0]]).length;
    const fails = a.filter((x) => x.s === "fail").length, warns = a.filter((x) => x.s === "warn").length;
    const v = fails ? ["bad", "NO-GO", `${fails} safety check${fails > 1 ? "s" : ""} failed. Fix ${fails > 1 ? "them" : "it"} before anyone suits up.`] : done < man.length ? ["warn", "HOLD", `Automatic checks passed. ${man.length - done} crew checklist item${man.length - done > 1 ? "s" : ""} still open.`] : warns ? ["warn", "GO WITH CAUTION", `All checks done. ${warns} caution${warns > 1 ? "s" : ""} to brief before leaving.`] : ["ok", "GO", "All automatic checks passed and the crew checklist is complete."];
    return { a, v, done, total: man.length };
  }

  /* ---------- consumables ---------- */
  const WORK = [[0.75, "Light (survey, photos)"], [1, "Moderate (walking, sampling)"], [1.4, "Heavy (climbing, hauling)"]];
  function supplies(st) {
    const h = st.hours, k = S.work, r = 1 + S.reserve / 100, row = (per, unit, dp) => { const one = h * per * k * r; return [one.toFixed(dp) + " " + unit, (one * S.crew).toFixed(dp) + " " + unit]; };
    return { o2: row(0.08, "kg", 2), water: row(0.25, "L", 1), power: row(90, "Wh", 0), dose: h / 24 * RAD_DAY, turn: usable(st) / 2 };
  }

  /* ---------- emergency protocols ---------- */
  const PROTO = [
    ["leak", "Suit leak or pressure drop", ["Stop. Call “SUIT LEAK” on voice. Your partner comes to you.", "Find the leak: gloves and boots first. Press a hand or the patch over it.", "Open the backup oxygen supply. It buys roughly 30 minutes.", "Apply the suit patch kit. Do not remove anything stuck in the suit.", "Abort the EVA. Take the shortest safe path to the rover or habitat, leak side shielded.", "If pressure keeps falling, your partner connects the buddy hose and you move together."]],
    ["spe", "Solar storm (particle event) warning", ["Abort science immediately. Every minute in the open adds dose.", "Go to the nearest shielding: habitat storm shelter first, then the rover, then a cave, overhang or the foot of a cliff.", "If caught in the open, put terrain between you and the sky and keep the pack toward the Sun.", "Report dose readings to the habitat every 15 minutes.", "Stay sheltered until the habitat gives an all-clear. Events can last hours to days.", "Log the exposure for every crew member afterward."]],
    ["dust", "Dust storm or sudden loss of visibility", ["Stop walking as soon as you cannot see your next waypoint.", "Close up with your partner and clip the tether.", "Switch the HUD to the return bearing for stop A and follow your own tracks while they last.", "Move slowly. Probe ahead on slopes and near boulders.", "If the route home is not safe, shelter in the rover and wait.", "Brush seals, visor and radiators before the airlock. Report panel power loss."]],
    ["comms", "Lost communications", ["Try the backup channel, then hand signals with your partner.", "Stay within sight of each other. Clip the tether if visibility is poor.", "Climb only if it is safe: line of sight to the habitat or rover relay often restores the link.", "If there is no contact by the next scheduled check-in, end the EVA and return along the planned route.", "The habitat starts a search along the filed route after two missed check-ins, so stay on it."]],
    ["down", "Crewmate down or not responding", ["Check your own safety first: slope, rockfall, suit alarms.", "Read their suit display: pressure, oxygen, CO₂, temperature.", "Call “CREW DOWN” with your position to the habitat.", "If a suit alarm is active, connect the buddy hose or patch the leak before moving them.", "Do not remove the helmet or any part of the suit outside.", "Call the rover to your position if you can. Carry or drag only on flat ground.", "Give the habitat a suit-data update every 5 minutes until you are inside."]],
    ["o2", "Oxygen low or CO₂ rising", ["Stop work and stand still. Slow your breathing.", "Call the alarm and your readings on voice.", "Switch to the backup oxygen supply. For CO₂, purge the helmet as trained.", "Headache, dizziness or tunnel vision means CO₂: your partner takes over navigation.", "Abort and return by the shortest safe path. Your partner stays within arm's reach."]],
    ["thermal", "Overheating or cold soak", ["Overheating: stop, raise cooling to maximum, rest in your own shadow, sip water.", "Cold: keep moving your fingers and toes, raise glove heaters, get off cold rock and out of shadow.", "Fogged visor, shivering or numb hands end the EVA.", "Tell your partner and the habitat. Return at an easy pace.", "After sunset the ground cools fast. Never let an EVA run past the daylight margin."]],
    ["rover", "Rover breakdown", ["Stay inside while it holds pressure and power. It is your shelter.", "Report position, power level and cabin pressure to the habitat.", "Check the walk-back ring on the map. Inside it, you can walk home on suit reserves.", "Outside the ring, stay with the rover, save power and wait for the second rover.", "If you walk, take the patch kit and the beacon, and leave a note of your route and time."]],
    ["lost", "Lost or navigation failure", ["Stop. Moving while unsure makes it worse.", "Read your position on the HUD and compare it with a landmark and the Sun direction.", "No HUD? Use the bearings on your cuff checklist, reversed, to head back.", "Follow your own boot or wheel tracks while they are visible.", "Tell the habitat what you can see. They can fix your position from the map.", "If you are still unsure after 10 minutes, stay put, save oxygen and wait."]],
    ["fall", "Fall, stuck in sand or trapped limb", ["Do not thrash. Sand digs you in and sharp rock cuts suits.", "Check suit pressure first, then call your partner.", "Partner: approach from uphill or from firm ground, anchor, then pass the tether.", "Free the limb slowly and inspect the suit before putting weight on it.", "Any cut or scuff through the outer layer ends the EVA."]]
  ];

  /* ---------- panel ---------- */
  const TABS = [["brief", "Conditions"], ["go", "Go / No-Go"], ["plan", "Supplies"], ["sos", "Emergency"]];
  const pill = (s) => `<i class="st ${s}" aria-hidden="true">${s === "pass" ? "✓" : s === "warn" ? "!" : "✕"}</i><span class="sr-only">${s === "pass" ? "Pass" : s === "warn" ? "Caution" : "Fail"}: </span>`;
  function briefHtml() {
    const t = marsNow(), r = ref(), f = window.MM_TOOL && F();
    let h = "";
    if (r) {
      const s = sun(r.lat, r.lng, t);
      const day = s.polar === "day" ? "Midnight sun" : s.polar === "night" ? "Polar night" : s.up ? f.T(s.left, "mars") + " left" : "Night · sunrise in " + f.T(s.toRise, "mars");
      h += `<div class="kv"><div><small>Local solar time</small><b>${hhmm(s.ltst)}</b></div><div><small>Daylight</small><b class="${s.up && s.left > 2 ? "" : "bad-t"}">${day}</b></div><div><small>Sunrise</small><b>${s.rise === undefined ? "—" : hhmm(s.rise)}</b></div><div><small>Sunset</small><b>${s.set === undefined ? "—" : hhmm(s.set)}</b></div></div>
        <p class="hint muted">True solar time at ${esc(r.label)} (${Math.abs(r.lat).toFixed(2)}°${r.lat >= 0 ? "N" : "S"}, ${Math.abs(r.lng).toFixed(2)}°${r.lng >= 0 ? "E" : "W"}), sol ${Math.floor(t.msd).toLocaleString()}. Sunrise and sunset are for flat ground. Crater walls and ridges shorten the day.</p>`;
      if (!s.up) h += `<p class="alert bad"><strong>It is night here.</strong> Surface temperatures fall far below what a suit is planned for. Stay inside.</p>`;
      else if (s.left < 2) h += `<p class="alert warn"><strong>Less than two hours of daylight.</strong> Only short EVAs close to the airlock.</p>`;
      h += `<p class="group-label">Season</p><div class="kv"><div><small>Solar longitude</small><b>Ls ${Math.round(t.ls)}°</b></div><div><small>Here it is</small><b>${season(t.ls, r.lat)}</b></div></div>`;
      h += dusty(t.ls) ? `<p class="alert warn"><strong>Dust storm season (Ls 180° to 360°).</strong> Regional storms can form in a few sols and cut solar power and visibility. Check the sky before every EVA.</p>` : `<p class="alert ok">Outside the main dust storm season. Local dust devils and gusts are still possible.</p>`;
    } else h += `<p class="alert warn">${state.planet === "mars" ? "Enter a region or open a landing site to get local time, daylight and season for that spot." : "You are on Earth. Travel to Mars and enter a region for local conditions. The Earth link and space weather below apply everywhere."}</p>`;
    const w = wxLevel();
    h += `<p class="group-label">Radiation</p><div class="kv"><div><small>Typical surface dose</small><b>${RAD_DAY} mSv / day</b></div><div><small>8-hour EVA</small><b>≈ ${(RAD_DAY / 3).toFixed(2)} mSv</b></div></div>
      <p class="alert ${w[0] === "pass" ? "ok" : w[0] === "warn" ? "warn" : "bad"}"><strong>Space weather:</strong> ${esc(w[1])}${S.wx && S.wx.top ? ` Strongest flare this week: ${esc(S.wx.top.c)} (${S.wx.n} recorded).` : ""}</p>
      <p class="hint muted">Dose is the Curiosity RAD average. A solar particle event can deliver far more in hours, which is why the storm shelter drill exists. Flare data is NASA DONKI, observed from Earth. Mars may face a different side of the Sun, so treat it as early warning, not a forecast.</p>
      <p class="group-label">Link to Earth</p><div class="kv"><div><small>Distance</small><b>${Math.round(t.dist * 149.5979)} million km</b></div><div><small>One-way delay</small><b>${t.lightMin.toFixed(1)} min</b></div></div>
      <p class="alert ${t.sem < 3 ? "bad" : "ok"}">${t.sem < 3 ? "<strong>Solar conjunction.</strong> The Sun is between the planets and the link is unreliable." : `A question to Earth takes at least ${Math.ceil(t.lightMin * 2)} minutes to answer. In an emergency the crew decides.`}</p>`;
    if (state.site && HAZ[state.site.id]) h += `<p class="group-label">Hazards at ${esc(state.site.name)}</p>${hazGrid(HAZ[state.site.id][0])}<ul class="notes warnlist">${HAZ[state.site.id][1].map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    else if (state.planet === "mars" && state.region) h += `<p class="group-label">Hazards in ${esc(state.region.name)} (regional estimate)</p>${hazGrid(bandHaz(state.region))}<p class="hint muted">No lander has surveyed this chart on the ground. Ratings come from latitude and terrain type. Check the THEMIS and MOLA layers.</p>`;
    h += `<p class="group-label">Rules that never change</p><ul class="rules">${M.A.globalRules.concat(["Nobody goes outside alone, and nobody goes outside without a watch officer inside.", "Turn back at the turn-back time, even if the target is in sight."]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    return h;
  }
  function goHtml() {
    const { a, v, done, total } = verdict();
    let h = `<div class="verdict ${v[0]}" role="status"><b>${v[1]}</b><span>${v[2]}</span></div><p class="group-label">Automatic checks</p>`;
    h += a.map((x) => `<div class="chk ${x.s}">${pill(x.s)}<div><strong>${x.title}</strong><small>${esc(x.detail)}</small></div></div>`).join("");
    h += `<p class="group-label">Crew checklist · ${done} of ${total}</p>`;
    h += MANUAL.map(([g, items]) => `<p class="sub-label">${g}</p>` + items.map(([id, t]) => `<label class="check"><input type="checkbox" data-sfc="chk" data-id="${id}" ${S.checks[id] ? "checked" : ""}/><span>${t}</span></label>`).join("")).join("");
    h += `<div class="actions"><button class="choice" type="button" data-sf="all">Tick all</button><button class="choice" type="button" data-sf="none">Reset</button><button class="choice" type="button" data-sf="route">${route() ? "Edit route" : "Plan a route"}</button><button class="choice" type="button" data-sf="copy">Copy safety plan</button></div>`;
    return h;
  }
  function planHtml() {
    const st = route(), f = window.MM_TOOL && F();
    const opts = `<div class="evagrid"><label class="date-field">Crew outside<select class="sel" data-sfc="crew">${[1, 2, 3, 4].map((n) => `<option ${S.crew === n ? "selected" : ""}>${n}</option>`).join("")}</select></label><label class="date-field">Reserve<select class="sel" data-sfc="reserve">${[20, 30, 40, 50].map((n) => `<option value="${n}" ${S.reserve === n ? "selected" : ""}>${n}%</option>`).join("")}</select></label></div><label class="date-field">Work rate<select class="sel" data-sfc="work">${WORK.map(([v, n]) => `<option value="${v}" ${S.work === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>`;
    if (!st) return `<p class="alert warn">Plan a route with at least two stops to size the oxygen, water, power and radiation budget for it.</p><div class="actions"><button class="choice is-on" type="button" data-sf="route">Plan a route</button></div>${opts}`;
    const s = supplies(st), far = farthest(st), wb = walkBackKm(st);
    let h = `<div class="kv"><div><small>Time outside</small><b>${f.T(st.hours, "mars")}</b></div><div><small>${st.modeName}${st.round ? " · round trip" : ""}</small><b>${f.D(st.km * (st.round ? 2 : 1))}</b></div><div><small>Turn back by</small><b>T+${hhmm(s.turn)}</b></div><div><small>Radiation dose</small><b>≈ ${s.dose.toFixed(2)} mSv</b></div></div>${opts}
      <p class="group-label">Carry at least</p><table class="supply"><tr><th></th><th>Each</th><th>Team of ${S.crew}</th></tr><tr><td>Oxygen</td><td>${s.o2[0]}</td><td>${s.o2[1]}</td></tr><tr><td>Drinking water</td><td>${s.water[0]}</td><td>${s.water[1]}</td></tr><tr><td>Suit power</td><td>${s.power[0]}</td><td>${s.power[1]}</td></tr></table>
      <p class="hint muted">Planning rates per person: 0.08 kg oxygen, 0.25 L water and 90 Wh each hour at moderate work, scaled by work rate, plus the ${S.reserve}% reserve. Replace them with your suit's real numbers.</p>
      <p class="group-label">${st.mode === "eva" ? "Turn-back ring" : "Walk-back ring"}</p><p class="alert ${far <= wb ? "ok" : "bad"}"><strong>${f.D(wb)} from stop A.</strong> ${st.mode === "eva" ? "Beyond this ring you cannot get home on foot with your reserve intact." : "If the vehicle fails inside this ring, the crew can walk home on suit reserves."} Your farthest point is ${f.D(far)}${far <= wb ? "." : ", which is outside it."}</p>
      <p class="hint muted">The dashed ring is drawn on the map around stop A. It shrinks with rougher terrain and a bigger reserve.</p>`;
    return h + elevHtml();
  }
  function sosHtml() {
    const st = window.MM_TOOL && MM_TOOL.stats(), t = marsNow();
    let h = "";
    if (state.planet === "mars" && state.region && st && st.pts.length) {
      const c = M.maps.mars.getCenter(), a = st.pts[0], km = MM_TOOL.hav([c.lat, c.lng], a, st.R), b = MM_TOOL.brg([c.lat, c.lng], a);
      h += `<div class="verdict bad"><b>SHELTER: STOP A</b><span>${km < 0.05 ? "You are at stop A." : `${F().D(km)} away, bearing ${String(Math.round(b)).padStart(3, "0")}° ${F().dir(b)} · ${F().T(km * st.terrain / st.walk, "mars")} on foot from the map center.`}</span></div>`;
    } else h += `<p class="alert warn">Set stop A of your route at the habitat or rover. This panel will then always show the bearing and walking time back to it.</p>`;
    h += `<div class="actions"><button class="choice sos-btn" type="button" data-sf="sos">Broadcast SOS to crew</button><button class="choice" type="button" data-sf="rtb">Show way back on map</button></div>
      <p class="hint muted">Earth is ${t.lightMin.toFixed(1)} light-minutes away. These steps are written to be done by the crew alone.</p>`;
    h += PROTO.map(([id, title, steps]) => `<div class="proto ${S.open === id ? "open" : ""}"><button type="button" class="proto-h" data-sf="proto" data-id="${id}" aria-expanded="${S.open === id}"><span>${title}</span><i aria-hidden="true">${S.open === id ? "−" : "+"}</i></button>${S.open === id ? `<ol>${steps.map((x) => `<li>${x}</li>`).join("")}</ol>` : ""}</div>`).join("");
    return h + `<p class="hint muted">Concept procedures for this prototype, modeled on how NASA trains spacewalkers. They are not official NASA flight rules.</p>`;
  }
  function html() {
    loadWx(); if (S.tab === "plan") loadElev();
    const v = verdict().v;
    return `<button class="back" type="button" data-sf="close">← Back to guide</button><p class="kicker">Safety center · ${state.planet === "mars" ? (state.site ? esc(state.site.name) : state.region ? esc(state.region.name) : "Mars") : "Earth"}</p><h2>Crew safety <span class="vchip ${v[0]}">${v[1]}</span></h2>
      <div class="tabs" role="tablist">${TABS.map(([k, n]) => `<button type="button" role="tab" aria-selected="${S.tab === k}" class="tab ${S.tab === k ? "is-on" : ""}" data-sf="tab" data-v="${k}">${n}</button>`).join("")}</div>
      ${S.tab === "brief" ? briefHtml() : S.tab === "go" ? goHtml() : S.tab === "plan" ? planHtml() : sosHtml()}`;
  }
  function rerender(top) { const b = $("drawer-body"), s = b.scrollTop; M.renderDrawer(); b.scrollTop = top ? 0 : s; }
  function routeCard() {
    const st = route();
    if (!st) return "";
    const { v } = verdict(), far = farthest(st), wb = walkBackKm(st);
    return `<p class="group-label">Safety check</p><button type="button" class="verdict ${v[0]} as-btn" data-safe-open="go"><b>${v[1]}</b><span>${v[2]} ${far > wb ? "Farthest point is outside the walk-back ring." : ""} Open the safety center →</span></button>`;
  }
  function planText() {
    const st = route(), t = marsNow(), { a, v, done, total } = verdict(), L = [`MARTIAN MAP · EVA SAFETY PLAN`, `Verdict: ${v[1]} · ${v[2]}`];
    if (state.region) L.push(`Chart: ${state.region.id} ${state.region.name}${state.site ? " · " + state.site.name : ""}`);
    if (st) { const s = supplies(st); L.push(`Route: ${st.pts.map((p, i) => String.fromCharCode(65 + i) + " " + F().C(p)).join(" → ")}`, `Distance ${F().D(st.km * (st.round ? 2 : 1))} · ${st.modeName} · ${F().T(st.hours, "mars")} outside · turn back by T+${hhmm(s.turn)}`, `Per person: O2 ${s.o2[0]}, water ${s.water[0]}, power ${s.power[0]} (includes ${S.reserve}% reserve) · dose ≈ ${s.dose.toFixed(2)} mSv`, `Walk-back ring: ${F().D(walkBackKm(st))} from stop A`); }
    L.push(`Mars: sol ${Math.floor(t.msd)}, Ls ${Math.round(t.ls)}° · Earth delay ${t.lightMin.toFixed(1)} min one way`, "", "Automatic checks:");
    a.forEach((x) => L.push(` [${x.s === "pass" ? "PASS" : x.s === "warn" ? "CAUTION" : "FAIL"}] ${x.title}: ${x.detail}`));
    L.push(`Crew checklist: ${done} of ${total} complete`);
    return L.join("\n");
  }

  /* ---------- map ring ---------- */
  function routeChanged() {
    if (S.ring) { S.ring.remove(); S.ring = null; }
    const st = route();
    if (st) {
      const ok = farthest(st) <= walkBackKm(st);
      // Leaflet sizes circles with Earth's radius, so scale the Mars distance to draw the right size.
      S.ring = L.circle(st.pts[0], { radius: walkBackKm(st) * 1000 * (6371000 / 3389500), color: ok ? "#15803d" : "#b91c1c", weight: 2, dashArray: "7 7", fillColor: ok ? "#15803d" : "#b91c1c", fillOpacity: 0.05, interactive: false }).addTo(M.maps.mars);
    }
    if (S.on && S.tab === "plan") loadElev();
  }

  /* ---------- HUD lines ---------- */
  function hud(c, el) {
    const out = { sun: "", rtb: "", warn: "", chk: "" };
    if (state.planet !== "mars") return out;
    const t = marsNow(), s = sun(c[0], c[1], t), st = window.MM_TOOL && MM_TOOL.stats(), f = F();
    out.sun = `LTST ${hhmm(s.ltst)} · ` + (s.polar === "day" ? "MIDNIGHT SUN" : !s.up ? "NIGHT" : "SUNSET IN " + f.T(s.left, "mars").toUpperCase());
    const cyc = 1800 - (el % 1800); out.chk = el % 1800 < 20 && el > 20 ? "COMM CHECK NOW" : `CHECK-IN ${String(Math.floor(cyc / 60)).padStart(2, "0")}:${String(cyc % 60).padStart(2, "0")}`;
    const W = [];
    if (st && st.pts.length && state.region) {
      const km = MM_TOOL.hav(c, st.pts[0], st.R), b = MM_TOOL.brg(c, st.pts[0]), back = km * st.terrain / st.walk, left = usable(st) - el / 3600;
      out.rtb = km < 0.05 ? "RTB · AT SHELTER (STOP A)" : `RTB A ${String(Math.round(b)).padStart(3, "0")}° ${f.dir(b)} · ${f.D(km)} · ${f.T(back, "mars")}`;
      if (left <= 0) W.push("SUIT RESERVE REACHED · RETURN NOW");
      else if (back >= left) W.push("TURN BACK NOW · WALK HOME EQUALS TIME LEFT");
      else if (el / 3600 >= usable(st) / 2) W.push("TURN-BACK TIME PASSED");
      if (km > walkBackKm(st)) W.push("OUTSIDE WALK-BACK RING");
    } else out.rtb = "RTB — set stop A at your shelter";
    if (!s.up) W.push("NIGHT · NO EVA"); else if (s.left < 1) W.push("SUNSET IN UNDER 1 H");
    if (S.wx && S.wx.sep72) W.push("SOLAR PARTICLE EVENT · SHELTER");
    out.warn = W.join("  ▲  ");
    return out;
  }

  /* ---------- events ---------- */
  function toggle(on, quiet) {
    S.on = on === undefined ? !S.on : on;
    $("safe-btn").setAttribute("aria-pressed", String(S.on));
    if (S.on) {
      if (window.MM_TOOL && MM_TOOL.active()) $("route-btn").click();
      if (document.body.classList.contains("drawer-closed")) $("panel-btn").click();
    }
    if (!quiet) rerender(true);
  }
  function open(tab) { S.tab = tab || "brief"; if (S.on) rerender(true); else toggle(true); }
  document.addEventListener("click", (e) => { const o = e.target.closest("[data-safe-open]"); if (o) open(o.dataset.safeOpen); });
  $("drawer-body").addEventListener("click", (e) => {
    const t = e.target.closest("[data-sf]");
    if (!t || !S.on) return;
    const a = t.dataset.sf;
    if (a === "close") return toggle(false);
    if (a === "tab") { S.tab = t.dataset.v; return rerender(true); }
    if (a === "proto") S.open = S.open === t.dataset.id ? null : t.dataset.id;
    else if (a === "all") MANUAL.forEach((g) => g[1].forEach((m) => (S.checks[m[0]] = true)));
    else if (a === "none") S.checks = {};
    else if (a === "route") return $("route-btn").click();
    else if (a === "copy") { try { navigator.clipboard.writeText(planText()); } catch (_) {} return M.note(state.planet, "Safety plan copied to your clipboard."); }
    else if (a === "sos") {
      const c = M.maps[state.planet].getCenter(), txt = `SOS · ${Math.abs(c.lat).toFixed(3)}°${c.lat >= 0 ? "N" : "S"}, ${Math.abs(c.lng).toFixed(3)}°${c.lng >= 0 ? "E" : "W"} on ${state.planet === "mars" ? "Mars" : "Earth"}${state.region && state.planet === "mars" ? " (" + state.region.name + ")" : ""}`;
      return M.note(state.planet, window.MM_CREW && MM_CREW.alert(txt) ? "SOS sent to your crew chat with your position." : "Sign in and join a crew to broadcast an SOS.");
    }
    else if (a === "rtb") {
      const st = window.MM_TOOL && MM_TOOL.stats();
      if (!(st && st.pts.length && state.planet === "mars" && state.region)) return M.note(state.planet, "Set stop A with the route tool first.");
      const c = M.maps.mars.getCenter(), line = L.polyline(MM_TOOL.interp([c.lat, c.lng], st.pts[0]), { color: "#b91c1c", weight: 4, dashArray: "2 9", lineCap: "round", interactive: false }).addTo(M.maps.mars);
      M.maps.mars.fitBounds(line.getBounds(), { padding: [90, 90], maxZoom: M.maps.mars.getZoom() });
      return setTimeout(() => line.remove(), 9000);
    }
    rerender();
  });
  $("drawer-body").addEventListener("change", (e) => {
    const k = e.target.dataset.sfc;
    if (!k || !S.on) return;
    if (k === "chk") S.checks[e.target.dataset.id] = e.target.checked; else S[k] = +e.target.value;
    routeChanged(); rerender();
  });
  $("safe-btn").addEventListener("click", () => toggle());
  setInterval(() => { if (S.on && S.tab !== "go" && !document.hidden && !$("drawer-body").contains(document.activeElement)) rerender(); }, 30000);

  window.MM_SAFE = { active: () => S.on, html, toggle, open, siteCard, routeCard, routeChanged, hud, math: { marsNow, sun } };
})();
