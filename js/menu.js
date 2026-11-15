/* Map tools: a small card that opens from the grid button above the zoom controls (like Google Maps' layer and
   tool cards). Everything that isn't needed on screen all the time lives here, so the map itself only shows search,
   quick chips, the surface buttons (walk / drive), tools, zoom and recenter. ☰ hides and shows the side panel. */
(() => {
  const M = window.MM;
  if (!M) return;
  const { $, state } = M, I = M.ICONS;
  const sv = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    globe: sv('<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.4 2.6 3.6 5.2 3.6 8s-1.2 5.4-3.6 8c-2.4-2.6-3.6-5.2-3.6-8s1.2-5.4 3.6-8Z"/>'),
    gear: sv('<circle cx="12" cy="12" r="3.2"/><path d="M19.3 13.6a7.4 7.4 0 0 0 0-3.2l2-1.5-2-3.4-2.3 1a7.4 7.4 0 0 0-2.8-1.6L13.9 2.5h-3.8l-.3 2.4A7.4 7.4 0 0 0 7 6.5l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 3.2l-2 1.5 2 3.4 2.3-1a7.4 7.4 0 0 0 2.8 1.6l.3 2.4h3.8l.3-2.4a7.4 7.4 0 0 0 2.8-1.6l2.3 1 2-3.4Z"/>'),
    info: sv('<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.2M12 7.6v.4"/>'),
    panel: sv('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/>'),
    fs: sv('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'),
    sos: sv('<path d="M12 3 2.5 20h19Z"/><path d="M12 9.5v5M12 17v.4"/>')
  };
  const ITEMS = () => [
    ["Explore", [
      ["plan", I.route, "Plan a Marswalk", "Five guided steps from site to surface", () => (window.MM_PLAN ? MM_PLAN.open() : 0)],
      ["walk", I.walk, "Walk on Mars", "First person, Mars gravity, tablet in hand", () => window.MM_WALK && MM_WALK.pick(true, "walk")],
      ["drive", I.rover, "Drive a rover", "Six-wheel rover, grip changes with the ground", () => window.MM_WALK && MM_WALK.pick(true, "rover")],
      ["route", I.route, "Directions and rocket hops", "Routes, EVA budget, ballistic hops", () => $("route-btn").click()],
      ["sites", I.pin, "Landing sites", "Every NASA mission that reached the surface", () => { const c = document.querySelector('[data-chip="sites"]'); if (c) c.click(); }]
    ]],
    ["Safety", [
      ["safe", I.shield, "Safety center", "Go / no-go, supplies, radiation, weather", () => $("safe-btn").click()],
      ["sos", ICON.sos, "Emergency protocols", "What to do, step by step", () => window.MM_SAFE && MM_SAFE.open("sos")]
    ]],
    ["Views", [
      ["globe", ICON.globe, "3D globe", "The planet as a sphere", () => $("globe-btn").click()],
      ["hud", I.hud, "Helmet display (HUD)", "The map as an astronaut sees it", () => $("hud-btn").click()],
      ["solar", I.sun, "Solar system", "Planets at their real positions", () => $("solar-btn").click()],
      ["travel", I.rocket, state.planet === "earth" ? "Travel to Mars" : "Return to Earth", "With the launch animation", () => $("travel").click()]
    ]],
    ["", [
      ["panel", ICON.panel, document.body.classList.contains("drawer-closed") ? "Show side panel" : "Hide side panel", "", () => $("panel-btn").click()],
      ...(window.MM_FS && MM_FS.can ? [["fs", ICON.fs, MM_FS.isFull() ? "Exit full screen" : "Full screen", "", () => MM_FS.toggle()]] : []),
      ["set", ICON.gear, "Settings", "Units, animations, offline use", () => $("set-btn").click()],
      ["about", ICON.info, "About and NASA sources", "", () => { const a = document.querySelector("[data-about]"); if (a) a.click(); }]
    ]]
  ];
  const menu = document.createElement("div"); menu.id = "nav-menu"; menu.className = "tools-pop"; menu.hidden = true; menu.setAttribute("role", "dialog"); menu.setAttribute("aria-label", "Map tools");
  const scrim = document.createElement("div"); scrim.className = "nav-scrim"; scrim.hidden = true;
  document.body.append(scrim, menu);
  const tbtn = document.createElement("button"); tbtn.id = "tools-btn"; tbtn.type = "button"; tbtn.className = "icon-btn stack-btn tools-btn"; tbtn.title = "Map tools"; tbtn.setAttribute("aria-label", "Map tools"); tbtn.setAttribute("aria-expanded", "false");
  tbtn.innerHTML = sv('<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>');
  const zb = document.querySelector(".zoom-box"); zb.parentNode.insertBefore(tbtn, zb);
  let acts = {};
  function render() {
    acts = {};
    menu.innerHTML = `<div class="tools-head"><b>Map tools</b><button class="icon-btn" type="button" data-nav-close aria-label="Close">${sv('<path d="M6 6l12 12M18 6 6 18"/>')}</button></div>` +
      ITEMS().filter(([h]) => h !== "Explore").map(([h, list]) => `<p class="nav-h">${h || "More"}</p><div class="tools-grid">${list.filter(([id]) => id !== "panel").map(([id, ic, t, d, fn]) => { acts[id] = fn; return `<button type="button" class="tool" data-nav="${id}" title="${d}">${ic}<span>${t}</span></button>`; }).join("")}</div>`).join("");
  }
  function open(on) {
    if (on) render();
    menu.hidden = scrim.hidden = !on; document.body.classList.toggle("nav-open", on);
    tbtn.setAttribute("aria-expanded", String(on));
  }
  tbtn.addEventListener("click", () => open(menu.hidden));
  // ☰ hides and shows the side panel, as before
  $("menu-btn").addEventListener("click", () => $("panel-btn").click());
  scrim.addEventListener("click", () => open(false));
  menu.addEventListener("click", (e) => {
    if (e.target.closest("[data-nav-close]")) return open(false);
    const b = e.target.closest("[data-nav]"); if (!b) return;
    open(false); const fn = acts[b.dataset.nav]; if (fn) setTimeout(fn, 60);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) open(false); });
  $("dir-btn").addEventListener("click", () => { if (state.planet === "mars" && !state.region) { const s = M.siteById.perseverance; if (s) M.openSite(s.id); } $("route-btn").click(); });
  // Quick chips: when they don't all fit, a small arrow scrolls them (nothing fades or slides under other buttons).
  const chips = $("chips"), more = document.createElement("button");
  more.type = "button"; more.className = "chip-more"; more.setAttribute("aria-label", "More quick actions"); more.innerHTML = sv('<path d="m9 6 6 6-6 6"/>');
  chips.parentNode.insertBefore(more, chips.nextSibling);
  const fit = () => { const over = chips.scrollWidth > chips.clientWidth + 2, end = chips.scrollLeft + chips.clientWidth >= chips.scrollWidth - 2; more.hidden = !over; more.classList.toggle("back", over && end); };
  more.addEventListener("click", () => { const end = more.classList.contains("back"); chips.scrollTo({ left: end ? 0 : chips.scrollLeft + chips.clientWidth * 0.7, behavior: "smooth" }); });
  chips.addEventListener("scroll", fit); addEventListener("resize", fit); new MutationObserver(fit).observe(chips, { childList: true }); setTimeout(fit, 300);
  window.MM_MENU = { open };
})();
