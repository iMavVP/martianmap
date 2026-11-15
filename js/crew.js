/* Crew accounts, teams, live presence, chat and shared expeditions.
   DEMO SCOPE: accounts and crews are stored in this browser (localStorage). Tabs of the same browser sync live via BroadcastChannel.
   Sharing across devices uses "expedition codes" you copy and paste. Google sign-in confirms who the user is (client ID in
   js/config.js), but crews, chat and SOS alerts still live in this browser. Real multi-device sync and a verified NASA ID
   login need a backend. See README.md. */
(() => {
  const M = window.MM, $ = M.$, esc = M.esc;
  const GOOGLE_CLIENT_ID = (window.MM_CONFIG && MM_CONFIG.googleClientId) || ""; // set in js/config.js
  const ls = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
  const COL = ["#ef4444", "#22c55e", "#a855f7", "#f59e0b", "#06b6d4", "#ec4899"];
  const colorOf = (k) => COL[[...k].reduce((a, c) => a + c.charCodeAt(0), 0) % COL.length];
  const users = () => ls.get("mm.users", {}), crews = () => ls.get("mm.crews", {});
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("martianmap-crew") : null;
  const ROLES = ["Commander", "Geologist", "Pilot", "Engineer", "Medic", "Scientist"];
  let user = null, tab = "in", msg = "";
  const pres = {};

  async function hash(pw, salt) {
    const enc = new TextEncoder();
    if (window.crypto && crypto.subtle) {
      const k = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
      const b = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 120000, hash: "SHA-256" }, k, 256);
      return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
    }
    let h = 5381; for (const c of salt + pw) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
    return "w" + h;
  }

  /* ---------- accounts ---------- */
  function openSession(key) { user = { key, ...users()[key] }; ls.set("mm.session", key); badge(); }
  async function register(kind, id, pw, name, role) {
    const key = kind + ":" + id.trim().toLowerCase(), all = users();
    if (!id.trim() || pw.length < 6) return "Enter an ID and a password of at least 6 characters.";
    if (all[key]) return "That ID is already registered. Sign in instead.";
    const salt = window.crypto && crypto.getRandomValues ? [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(16).padStart(2, "0")).join("") : Math.random().toString(36).slice(2);
    all[key] = { salt, hash: await hash(pw, salt), name: (name || id).trim(), role: role || "Crew", kind };
    ls.set("mm.users", all); openSession(key); return "";
  }
  async function signIn(kind, id, pw) {
    const key = kind + ":" + id.trim().toLowerCase(), u = users()[key];
    if (!u || u.hash !== await hash(pw, u.salt)) return "Wrong ID or password.";
    openSession(key); return "";
  }
  function signOut() { user = null; ls.set("mm.session", null); Object.keys(pres).forEach(dropMate); badge(); }
  function badge() {
    $("crew-av").textContent = user ? user.name.trim().charAt(0).toUpperCase() : "☺";
    $("crew-lbl").textContent = user ? user.name : "Crew login";
    $("crew-btn").classList.toggle("is-in", !!user);
  }
  /* Google sign-in. The official Google button is rendered into the dialog, so it keeps working even when
     the One Tap popup has been dismissed. Needs http(s) and an origin listed in the Google Cloud console. */
  let gState = "idle";
  function onGoogle(r) {
    let p;
    try {
      const b64 = r.credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)))); // UTF-8 safe, so names in any script survive
    } catch (_) { msg = "Google sign-in returned something unreadable. Try again."; return render(); }
    if (p.aud !== GOOGLE_CLIENT_ID || !p.email || (p.exp && p.exp * 1000 < Date.now())) { msg = "That Google sign-in was not issued for this app."; return render(); }
    const key = "g:" + p.email.toLowerCase(), all = users();
    if (!all[key]) { all[key] = { name: p.name || p.email, role: "Crew", kind: "g" }; ls.set("mm.users", all); }
    msg = ""; openSession(key); render();
  }
  function mountGoogle() {
    const el = dlg.querySelector("#g-btn");
    if (!el) return;
    const why = !GOOGLE_CLIENT_ID ? "Google sign-in needs an OAuth client ID in js/config.js." : !/^https?:$/.test(location.protocol) ? "Google sign-in only works when the site is served over http or https, not opened as a file. See README.md." : gState === "fail" ? "Google sign-in could not load. Check your connection, then reopen this window." : "";
    if (why) { el.innerHTML = `<p class="hint muted">${why} You can still use a username.</p>`; return; }
    const draw = () => { try { google.accounts.id.renderButton(el, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: Math.min(360, el.clientWidth || 320) }); } catch (_) { gState = "fail"; mountGoogle(); } };
    if (gState === "ready") return draw();
    el.innerHTML = `<p class="hint muted">Loading Google sign-in…</p>`;
    if (gState === "loading") return;
    gState = "loading";
    const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => { try { google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogle }); gState = "ready"; } catch (_) { gState = "fail"; } mountGoogle(); };
    s.onerror = () => { gState = "fail"; mountGoogle(); };
    document.head.appendChild(s);
  }

  /* ---------- crews ---------- */
  const myCrew = () => (user && users()[user.key].crew ? crews()[users()[user.key].crew] : null);
  const myCode = () => user && users()[user.key].crew;
  function setCrew(code) { const all = users(); all[user.key].crew = code; ls.set("mm.users", all); }
  function createCrew(name) {
    const code = Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join(""), all = crews();
    all[code] = { name: name || "Crew " + code, members: [{ key: user.key, name: user.name, role: user.role }], chat: [], exps: [] };
    ls.set("mm.crews", all); setCrew(code);
  }
  function joinCrew(code) {
    code = code.trim().toUpperCase(); const all = crews();
    if (!all[code]) return "No crew with that code on this device.";
    if (!all[code].members.some((m) => m.key === user.key)) all[code].members.push({ key: user.key, name: user.name, role: user.role });
    ls.set("mm.crews", all); setCrew(code); return "";
  }
  const leaveCrew = () => { const all = users(); delete all[user.key].crew; ls.set("mm.users", all); };
  function chat(text) {
    const all = crews(), c = all[myCode()];
    c.chat.push({ k: user.key, n: user.name, t: Date.now(), x: text.slice(0, 280) }); c.chat = c.chat.slice(-40);
    ls.set("mm.crews", all); bc && bc.postMessage({ t: "chat", crew: myCode() });
  }

  /* ---------- expeditions ---------- */
  const enc = (o) => "MMX1." + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const dec = (s) => JSON.parse(decodeURIComponent(escape(atob(s.trim().replace(/^MMX1\./, "")))));
  function share(title) {
    const r = MM_TOOL.getRoute();
    if (r.pts.length < 2) return null;
    return enc({ n: title || "Expedition", p: r.planet, m: r.mode, pts: r.pts, by: user.name, c: myCrew() ? myCrew().name : "" });
  }
  function load(code) {
    let x; try { x = dec(code); if (!x.pts || !x.pts.length) throw 0; } catch (_) { return "That expedition code isn't valid."; }
    if (x.p !== M.state.planet) return `This expedition is on ${x.p === "mars" ? "Mars" : "Earth"}. Travel there first, then load it.`;
    if (x.p === "mars") {
      const r = M.regions.find((g) => x.pts[0][0] >= g.south && x.pts[0][0] <= g.north && x.pts[0][1] >= g.west && x.pts[0][1] <= g.east);
      if (r && (!M.state.region || M.state.region.id !== r.id)) M.enterRegion(r.id);
    }
    MM_TOOL.setRoute(x.pts, x.m);
    M.maps[x.p].fitBounds(x.pts, { padding: [90, 90], maxZoom: 9 });
    return `Loaded “${x.n}” from ${x.by}.`;
  }

  /* ---------- live presence on the map ---------- */
  function mate(k) { return pres[k]; }
  function dropMate(k) { const p = pres[k]; if (p && p.mk) p.mk.remove(); delete pres[k]; }
  function onMsg(m) {
    if (!user || m.crew !== myCode()) return;
    if (m.t === "chat") { if (dlg.open) render(); return; }
    if (m.t === "sos") { M.note(M.state.planet, `🆘 ${m.by}: ${m.x}`); document.body.classList.add("sos-flash"); setTimeout(() => document.body.classList.remove("sos-flash"), 6000); if (dlg.open) render(); return; }
    if (m.t === "exp") { M.note(M.state.planet, `${m.by} started “${m.n}”. Open Crew to load it.`); if (dlg.open) render(); return; }
    if (m.t !== "pos" || m.key === user.key) return;
    let p = mate(m.key);
    if (p && p.planet !== m.planet) { dropMate(m.key); p = null; }
    if (!p) {
      p = pres[m.key] = { planet: m.planet, name: m.name, role: m.role };
      p.mk = L.marker([m.lat, m.lng], { icon: L.divIcon({ className: "mate-icon", html: `<span style="background:${colorOf(m.key)}">${esc(m.name.charAt(0).toUpperCase())}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).bindTooltip(`${esc(m.name)} · ${esc(m.role)}`, { direction: "top", offset: [0, -12], className: "region-tip" }).addTo(M.maps[m.planet]);
    }
    p.t = Date.now(); p.mk.setLatLng([m.lat, m.lng]);
    if (dlg.open) render();
  }
  if (bc) bc.onmessage = (e) => onMsg(e.data);
  setInterval(() => {
    if (user && myCode() && bc) { const c = M.maps[M.state.planet].getCenter(); bc.postMessage({ t: "pos", crew: myCode(), key: user.key, name: user.name, role: user.role, planet: M.state.planet, lat: c.lat, lng: c.lng }); }
    Object.keys(pres).forEach((k) => { if (Date.now() - pres[k].t > 9000) dropMate(k); });
  }, 2000);

  /* ---------- dialog ---------- */
  const dlg = document.createElement("dialog");
  dlg.className = "card-dialog crew";
  document.body.appendChild(dlg);
  const kindName = { u: "Username", n: "NASA ID (demo)", g: "Google" };
  function render() {
    const keep = dlg.querySelector(".chat-log"), sc = keep ? keep.scrollTop : 0;
    let h = `<button class="text-btn" type="button" data-c="close">Close</button>`;
    if (!user) {
      h += `<h2>Crew login <span class="demo-tag">Demo</span></h2><p class="muted">Sign in to join a crew, share routes and plan expeditions together. In this demo, crews, chat and SOS alerts stay in this browser (tabs sync live); a real mission would run them on a habitat server.</p>
        <div class="filters"><button class="choice ${tab === "in" ? "is-on" : ""}" data-c="tab" data-v="in" type="button">Sign in</button><button class="choice ${tab === "up" ? "is-on" : ""}" data-c="tab" data-v="up" type="button">Create account</button><button class="choice ${tab === "nasa" ? "is-on" : ""}" data-c="tab" data-v="nasa" type="button">NASA ID</button></div>`;
      const f = (n, l, t = "text", x = "") => `<label class="date-field">${l}<input class="sel" name="${n}" type="${t}" autocomplete="off" ${x}/></label>`;
      if (tab === "in") h += `<form data-f="in">${f("id", "Username")}${f("pw", "Password", "password")}<button class="choice is-on" type="submit">Sign in</button></form>`;
      else if (tab === "up") h += `<form data-f="up">${f("name", "Callsign (display name)")}${f("id", "Username")}${f("pw", "Password (6+ characters)", "password")}<label class="date-field">Role<select class="sel" name="role">${ROLES.map((r) => `<option>${r}</option>`).join("")}</select></label><button class="choice is-on" type="submit">Create account</button></form>`;
      else h += `<form data-f="nasa">${f("id", "NASA ID")}${f("pw", "Password", "password")}<button class="choice is-on" type="submit">Sign in with NASA ID</button></form><p class="hint muted">Demo mode: your NASA ID creates a profile on this device and is not verified with NASA. A real NASA login needs NASA's identity service and a server.</p>`;
      h += `<div class="or"><span>or</span></div><div id="g-btn" class="g-btn"></div>`;
    } else {
      const crew = myCrew(), code = myCode();
      h += `<div class="profile"><span class="av" style="background:${colorOf(user.key)}">${esc(user.name.charAt(0).toUpperCase())}</span><div><h2>${esc(user.name)}</h2><small>${esc(user.role)} · ${kindName[user.kind] || ""} · <span class="demo-tag">Demo: stored in this browser</span></small></div><button class="choice" type="button" data-c="out">Sign out</button></div>`;
      if (!crew) h += `<p class="group-label">Crew</p><form data-f="mk"><label class="date-field">Start a crew<input class="sel" name="n" placeholder="Crew name" autocomplete="off"/></label><button class="choice is-on" type="submit">Create crew</button></form><form data-f="jn" style="margin-top:12px"><label class="date-field">Join with a crew code<input class="sel" name="c" placeholder="e.g. K7M2QX" autocomplete="off"/></label><button class="choice" type="submit">Join crew</button></form>`;
      else {
        h += `<p class="group-label">${esc(crew.name)}</p><p class="muted" style="margin:0">Crew code <strong class="code">${code}</strong> <button class="mini" type="button" data-c="cpcode">Copy</button> <button class="mini" type="button" data-c="leave">Leave</button></p><div class="roster">`
          + crew.members.map((m) => { const on = m.key === user.key || Object.keys(pres).includes(m.key) || false, here = pres[m.key]; return `<div class="mem"><i class="dot ${on ? "on" : ""}" style="${on ? "" : ""}"></i><strong>${esc(m.name)}</strong><small>${esc(m.role)}${here ? " · on " + (here.planet === "mars" ? "Mars" : "Earth") : m.key === user.key ? " · you" : ""}</small></div>`; }).join("") + `</div>`;
        h += `<p class="group-label">Team chat</p><div class="chat-log">${crew.chat.map((c) => `<p><b style="color:${colorOf(c.k)}">${esc(c.n)}</b> ${esc(c.x)}</p>`).join("") || '<p class="muted">No messages yet.</p>'}</div><form data-f="chat" class="chat-form"><input class="sel" name="x" placeholder="Message your crew" autocomplete="off"/><button class="choice is-on" type="submit">Send</button></form>`;
        h += `<p class="group-label">Expeditions</p><form data-f="exp"><label class="date-field">Start an expedition from your current route<input class="sel" name="n" placeholder="Expedition name" autocomplete="off"/></label><button class="choice is-on" type="submit">Start with crew</button></form>`
          + (crew.exps.length ? crew.exps.map((x, i) => `<div class="mem"><strong>${esc(x.n)}</strong><small>by ${esc(x.by)} · ${x.p === "mars" ? "Mars" : "Earth"}</small><button class="mini" type="button" data-c="load" data-i="${i}">Load</button></div>`).join("") : "");
      }
      h += `<p class="group-label">Share across devices</p><form data-f="imp"><label class="date-field">Paste an expedition code<input class="sel" name="c" placeholder="MMX1.…" autocomplete="off"/></label><div class="actions"><button class="choice" type="submit">Load expedition</button><button class="choice" type="button" data-c="cpexp">Copy my route code</button></div></form><p class="hint muted">Crew chat, roster and live positions sync between tabs of this browser. Expedition codes work between any devices.</p>`;
    }
    h += msg ? `<p class="hint" role="status"><strong>${esc(msg)}</strong></p>` : "";
    dlg.innerHTML = h;
    const lg = dlg.querySelector(".chat-log"); if (lg) lg.scrollTop = keep ? sc : lg.scrollHeight;
    mountGoogle();
  }
  dlg.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-c]"); if (!t) return;
    const c = t.dataset.c, crew = user && myCrew();
    if (c === "close") return dlg.close();
    if (c === "tab") { tab = t.dataset.v; msg = ""; }
    else if (c === "out") signOut();
    else if (c === "leave") leaveCrew();
    else if (c === "cpcode") { try { navigator.clipboard.writeText(myCode()); } catch (_) {} msg = "Crew code copied."; }
    else if (c === "cpexp") { const x = share("Route"); if (!x) msg = "Add at least two stops with the route tool first."; else { try { navigator.clipboard.writeText(x); } catch (_) {} msg = "Route code copied. Send it to a teammate."; } }
    else if (c === "load") msg = load(crew.exps[+t.dataset.i].code) || "Expedition loaded.";
    render();
  });
  dlg.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.dataset.f, d = Object.fromEntries(new FormData(e.target));
    msg = "";
    if (f === "in") msg = await signIn("u", d.id, d.pw);
    else if (f === "up") msg = await register("u", d.id, d.pw, d.name, d.role);
    else if (f === "nasa") msg = users()["n:" + d.id.trim().toLowerCase()] ? await signIn("n", d.id, d.pw) : await register("n", d.id, d.pw, d.id, "Astronaut");
    else if (f === "mk") createCrew(d.n);
    else if (f === "jn") msg = joinCrew(d.c);
    else if (f === "chat" && d.x.trim()) chat(d.x);
    else if (f === "imp") msg = load(d.c);
    else if (f === "exp") {
      const x = share(d.n);
      if (!x) msg = "Add at least two stops with the route tool first.";
      else { const all = crews(), c = all[myCode()], o = dec(x); c.exps.unshift({ n: o.n, by: user.name, p: o.p, code: x }); c.exps = c.exps.slice(0, 8); ls.set("mm.crews", all); bc && bc.postMessage({ t: "exp", crew: myCode(), by: user.name, n: o.n }); msg = `Expedition “${o.n}” started. Your crew can load it.`; }
    }
    render();
  });
  $("crew-btn").addEventListener("click", () => { if (gState === "fail") gState = "idle"; msg = ""; render(); dlg.showModal(); });
  window.MM_CREW = { alert(text) { if (!user || !myCrew()) return false; chat("🆘 " + text); bc && bc.postMessage({ t: "sos", crew: myCode(), by: user.name, x: text }); return true; } };
  const saved = ls.get("mm.session", null);
  if (saved && users()[saved]) openSession(saved);
  badge();
})();
