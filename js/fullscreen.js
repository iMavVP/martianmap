/* Full screen on phones. Android browsers (and desktop) use the Fullscreen API; iPhone Safari has none for web pages,
   so there the button explains "Add to Home Screen", which opens Martian Map full screen like an app (see the
   manifest and apple-mobile-web-app-capable meta tag). A small banner offers it once per visit on phones. */
(() => {
  const $ = (id) => document.getElementById(id);
  if (new URLSearchParams(location.search).has("tablet")) return; // the EVA tablet runs the site inside the EVA
  const el = document.documentElement;
  const can = !!(el.requestFullscreen || el.webkitRequestFullscreen);
  const standalone = matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone;
  const phone = matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 820;
  const ios = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement) || standalone;
  const say = (t) => (window.MM && MM.toast ? MM.toast(t) : alert(t));
  function enter() {
    if (can) {
      const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : el.webkitRequestFullscreen();
      if (p && p.catch) p.catch(() => say("Your browser blocked full screen. Try the browser menu instead."));
    } else if (ios) say("On iPhone: tap Share, then Add to Home Screen. Martian Map then opens full screen, like an app.");
    else say("This browser doesn't offer full screen for web pages.");
  }
  function exit() { if (document.exitFullscreen) document.exitFullscreen().catch(() => {}); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); }
  const toggle = () => (document.fullscreenElement || document.webkitFullscreenElement ? exit() : enter());
  window.MM_FS = { toggle, isFull, can: can || ios };
  document.addEventListener("fullscreenchange", () => document.body.classList.toggle("is-full", isFull()));

  // one-time offer on phones, after the loading screen
  if (!phone || standalone) return;
  let shown = false; try { shown = sessionStorage.getItem("mm-fs-offer") === "1"; } catch (_) {}
  if (shown) return;
  const offer = () => {
    if (isFull() || document.querySelector(".fs-offer")) return;
    try { sessionStorage.setItem("mm-fs-offer", "1"); } catch (_) {}
    const b = document.createElement("div"); b.className = "fs-offer"; b.setAttribute("role", "status");
    b.innerHTML = `<span>Use the whole screen?</span><button type="button" class="fs-go">Full screen</button><button type="button" class="fs-x" aria-label="No thanks">✕</button>`;
    document.body.appendChild(b);
    const close = () => b.remove();
    b.querySelector(".fs-go").onclick = () => { close(); enter(); };
    b.querySelector(".fs-x").onclick = close;
    setTimeout(close, 12000);
  };
  const wait = () => { if ($("intro") && document.body.contains($("intro"))) setTimeout(wait, 700); else setTimeout(offer, 900); };
  wait();
})();
