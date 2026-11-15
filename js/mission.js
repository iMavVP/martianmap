/* Mission briefs, astronaut HUD, and the opening loading screen. */
(() => {
  const M = window.MM, $ = M.$, esc = M.esc;

  /* ---------- mission briefs ---------- */
  const BRIEF = {
    perseverance: ["Read the ancient lake record in the Jezero delta and choose rock worth caching.", "Pair on foot, pressurized rover standing by", "safe"],
    curiosity: ["Study boxwork formations on the lower slopes of Mount Sharp, where Curiosity observed them in 2025.", "Pair with rover support, staying on the proposed corridor", "climb"],
    spirit: ["Sample the Columbia Hills outcrops that rise above the Gusev plains.", "Pair on foot, scouting the hills before committing", "safe"],
    opportunity: ["Traverse the sulfate plain and sample bedrock along a long, easy drive.", "Rover-led, crew on foot only at sampling stops", "dust"],
    insight: ["Set up a surface station on quiet, flat ground and test radiation shielding.", "Pair, with shelter built first", "dust"],
    pathfinder: ["Study the flood-deposited boulder field in Ares Vallis.", "Pair, with one scout checking footing", "safe"],
    viking1: ["Revisit the first landing site and sample the Chryse outflow plain.", "Pair on foot or short rover hops", "safe"],
    viking2: ["Sample Utopia Planitia and measure winter frost at the surface.", "Pair, with cold-weather planning", "climb"],
    phoenix: ["Reach shallow water ice near the north polar plains.", "Pair with a rover, planned around polar light", "climb"]
  };
  const PRESET_NAMES = { safe: "Safe EVA", climb: "Climb & cold", dust: "Dust & solar" };
  window.MM_MISSION = {
    card(s) {
      const b = BRIEF[s.id];
      if (!b) return "";
      return `<p class="group-label">Mission brief</p><div class="brief"><p><strong>Science goal</strong><br>${esc(b[0])}</p><p><strong>Crew</strong><br>${esc(b[1])}</p><p><strong>Suggested data stack</strong><br>${PRESET_NAMES[b[2]]}</p></div>
        <div class="actions"><button class="choice" type="button" data-mid="layers" data-sid="${s.id}">Load data stack</button><button class="choice" type="button" data-mid="route" data-sid="${s.id}">Plan an EVA from here</button></div>`;
    }
  };
  $("drawer-body").addEventListener("click", (e) => {
    const t = e.target.closest("[data-mid]");
    if (!t) return;
    const s = M.siteById[t.dataset.sid];
    if (t.dataset.mid === "layers") { M.applyPreset(BRIEF[s.id][2]); M.note("mars", `${PRESET_NAMES[BRIEF[s.id][2]]} layers loaded. Open Map layers to adjust.`); }
    else if (window.MM_TOOL) MM_TOOL.add(s.lat, s.lng);
  });

  /* ---------- HUD ---------- */
  const hud = document.createElement("div");
  hud.id = "hud";
  hud.innerHTML = `<div class="hud-reticle"></div><div class="hud-top"><div class="hud-arrow" id="hud-arrow">▲</div><div id="hud-head">NO ROUTE</div></div><div id="hud-warn" class="hud-warn" role="alert" hidden></div><div class="hud-bot"><div id="hud-pos"></div><div id="hud-tgt"></div><div id="hud-eva"></div><div id="hud-sun"></div><div id="hud-rtb"></div><div id="hud-data"></div></div>`;
  document.body.appendChild(hud);
  let t0 = 0, timer = 0;
  const pad = (n) => String(n).padStart(2, "0");
  function tick() {
    const p = M.state.planet, c = M.maps[p].getCenter(), n = window.MM_TOOL && MM_TOOL.next([c.lat, c.lng]);
    const el = Math.floor((Date.now() - t0) / 1000), suit = MM_TOOL.cfg().suit;
    $("hud-pos").textContent = `POS ${Math.abs(c.lat).toFixed(3)}°${c.lat >= 0 ? "N" : "S"} ${Math.abs(c.lng).toFixed(3)}°${c.lng >= 0 ? "E" : "W"}`;
    $("hud-head").textContent = n ? `${String(Math.round(n.br)).padStart(3, "0")}° ${n.dir}` : "NO ROUTE";
    $("hud-arrow").style.transform = `rotate(${n ? n.br : 0}deg)`;
    $("hud-arrow").style.opacity = n ? 1 : 0.25;
    $("hud-tgt").textContent = n ? `TGT ${n.label} · ${n.dist} · ${n.time}` : "TGT — place stops with the route tool";
    $("hud-eva").textContent = `EVA ${pad(Math.floor(el / 3600))}:${pad(Math.floor(el / 60) % 60)}:${pad(el % 60)} / ${pad(Math.floor(suit))}:${pad(Math.round((suit % 1) * 60))}`;
    $("hud-data").textContent = `DATA ${M.activeTypes(p).join(" · ").toUpperCase()}`;
    const sf = window.MM_SAFE ? MM_SAFE.hud([c.lat, c.lng], el) : { sun: "", rtb: "", warn: "", chk: "" };
    $("hud-eva").textContent += sf.chk ? ` · ${sf.chk}` : "";
    $("hud-sun").textContent = sf.sun; $("hud-rtb").textContent = sf.rtb;
    $("hud-warn").hidden = !sf.warn; $("hud-warn").textContent = sf.warn ? "▲ " + sf.warn : "";
  }
  $("hud-btn").addEventListener("click", () => {
    const on = document.body.classList.toggle("hud");
    $("hud-btn").setAttribute("aria-pressed", String(on));
    clearInterval(timer);
    if (on) { t0 = Date.now(); tick(); timer = setInterval(tick, 400); }
  });

  /* ---------- intro / loading screen ---------- */
  const intro = $("intro"), bar = $("intro-bar"), msg = $("intro-msg"), go = $("intro-go");
  const lines = ["Contacting NASA Trek…", "Stitching the Viking mosaic and MOLA elevation…", "Reading the Sun from NASA SDO…", "Ready for departure"];
  let tilesReady = false;
  const base = M.state.tiles.earth;
  if (base) base.once("load", () => { tilesReady = true; });
  const start = performance.now(), minMs = 2800;
  (function step() {
    const el = performance.now() - start;
    let pct = Math.min(100, (el / minMs) * 100);
    if (!tilesReady && el < 7000) pct = Math.min(pct, 88);
    bar.style.width = pct + "%";
    const pg = window.MM_SKY && MM_SKY.progress, ln = lines[Math.min(3, Math.floor(pct / 34))];
    msg.textContent = pct < 100 && pg && pg.total ? `${ln} ${pg.done.toLocaleString()} of ${pg.total.toLocaleString()} NASA tiles` : ln;
    if (pct >= 100) { go.disabled = false; go.focus(); return; }
    requestAnimationFrame(step);
  })();
  const enter = () => {
    if (go.disabled) return;
    intro.classList.add("is-done");
    setTimeout(() => window.MM_SOLAR && MM_SOLAR.show(), 450);
    setTimeout(() => intro.remove(), 900);
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); } };
  go.addEventListener("click", enter);
  document.addEventListener("keydown", onKey);
})();
