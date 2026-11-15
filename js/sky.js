/* Shared planet rendering and NASA data for the loading screen, the solar system navigator and the launch animation.
   Imagery: NASA Trek Viking MDIM 2.1 color mosaic and MOLA elevation (Mars), NASA GIBS Blue Marble and VIIRS Black Marble
   city lights (Earth), and NASA Solar Dynamics Observatory (SDO) latest full-disk images of the Sun.
   Planet positions: NASA JPL "Keplerian Elements for Approximate Positions of the Major Planets" (Standish), valid 1800-2050.
   Planet facts: NASA Planetary Fact Sheet (NSSDCA). Jezero weather: Perseverance MEDA via the mars.nasa.gov feed. */
(() => {
  const A = window.ATLAS;
  const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI, mod = (a, n) => ((a % n) + n) % n;
  const altName = (u) => u.replace(/\/EQ\/(Mars_)?([^/]+)\//, (m, p, n) => `/EQ/${p ? "" : "Mars_"}${n}/`);
  const DAY = 864e5, AU_KM = 149597870.7;
  const progress = { done: 0, total: 0 };

  /* ---------- NASA textures ---------- */
  const texCache = {};
  function stitch(tpl, cols, rows, z) {
    const c = document.createElement("canvas"); c.width = cols * 256; c.height = rows * 256;
    const g = c.getContext("2d"); let ok = 0;
    const jobs = [];
    progress.total += cols * rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) jobs.push(new Promise((res) => {
      const im = new Image(); im.crossOrigin = "anonymous"; im.decoding = "async";
      im.onload = () => { g.drawImage(im, x * 256, y * 256, 256, 256); ok++; progress.done++; res(); };
      im.onerror = () => { progress.done++; res(); };
      im.src = tpl.replace("{z}", z).replace("{y}", y).replace("{x}", x).replace("{date}", "");
    }));
    return Promise.all(jobs).then(() => ({ c, ok, total: cols * rows }));
  }
  const URLS = {
    mars: () => A.marsLayers.find((l) => l.id === "viking").url,
    mola: () => A.marsLayers.find((l) => l.id === "elevation").url,
    earth: () => A.earthLayers.find((l) => l.id === "blue-marble").url,
    lights: () => A.earthLayers.find((l) => l.id === "lights").url
  };
  // Resolves to { canvas, merc } or null. Trek (Mars) is equirectangular; GIBS (Earth) is Web Mercator.
  function texture(name, z) {
    const k = name + z;
    if (texCache[k]) return texCache[k];
    const url = URLS[name](), trek = name === "mars" || name === "mola";
    let p;
    if (trek) {
      const cols = 2 ** (z + 1), rows = 2 ** z;
      p = stitch(url, cols, rows, z).then((r) => (r.ok < r.total * 0.5 ? stitch(altName(url), cols, rows, z).then((r2) => (r2.ok > r.ok ? r2 : r)) : r))
        .then((r) => (r.ok >= r.total * 0.3 ? { canvas: r.c, merc: false } : null));
    } else {
      const n = 2 ** z;
      p = stitch(url, n, n, z).then((r) => (r.ok >= r.total * 0.3 ? { canvas: r.c, merc: true } : null));
    }
    return (texCache[k] = p);
  }
  // Small RGBA copy of a texture for CPU sprites. Null when the browser blocks reading the pixels.
  const pixCache = {};
  function pixels(name) {
    if (pixCache[name]) return pixCache[name];
    return (pixCache[name] = texture(name, 2).then((t) => {
      if (!t) return null;
      try {
        const w = 1024, h = 512, c = document.createElement("canvas"); c.width = w; c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(t.canvas, 0, 0, w, h);
        return { data: g.getImageData(0, 0, w, h).data, w, h, merc: t.merc };
      } catch (_) { return null; }
    }));
  }

  /* ---------- NASA SDO: the Sun as it looks right now ---------- */
  // Latest full-disk images, refreshed by NASA every few minutes. HMIIC = visible light (sunspots), 0304 = chromosphere
  // and prominences, 0171 = corona and magnetic loops. The disk fills about 78% of each 1024 px frame.
  const SDO = (ch) => `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_${ch}.jpg`;
  const sdoCache = {};
  function sdo(ch) {
    if (sdoCache[ch]) return sdoCache[ch];
    return (sdoCache[ch] = new Promise((res) => { const im = new Image(); im.decoding = "async"; im.onload = () => res(im); im.onerror = () => res(null); im.src = SDO(ch); }));
  }

  /* ---------- Perseverance MEDA weather at Jezero ---------- */
  let wxP = null;
  function weather() {
    if (wxP) return wxP;
    return (wxP = fetch("https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json&ver=1.0").then((r) => r.json()).then((j) => {
      const s = (j.sols || []).filter((x) => x && x.max_temp !== undefined && x.max_temp !== "--").sort((a, b) => +b.sol - +a.sol)[0];
      return s ? { sol: +s.sol, date: s.terrestrial_date, hi: +s.max_temp, lo: +s.min_temp, p: +s.pressure, sunrise: s.sunrise, sunset: s.sunset, season: s.season } : null;
    }).catch(() => null));
  }

  /* ---------- procedural surfaces for bodies without a NASA texture in this app ---------- */
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.27 + vnoise(x * 4.3, y * 4.3) * 0.15 + vnoise(x * 8.7, y * 8.7) * 0.08;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // Colors follow NASA mission imagery: Juno and Cassini (Jupiter), Cassini (Saturn), Voyager 2 (Uranus, Neptune), New Horizons (Pluto).
  const SURF = {
    mercury: (la, lo) => { const n = fbm(lo * 7, la * 7), c = Math.max(0, 1 - Math.abs(vnoise(lo * 18, la * 18) - 0.5) * 6) * 0.25; return mix([92, 88, 84], [176, 168, 158], n - c); },
    venus: (la, lo) => { const n = fbm(lo * 1.6 + la * 2.4, la * 5 + vnoise(lo * 2, la * 2)); return mix([200, 170, 112], [246, 226, 176], n); },
    jupiter: (la, lo) => {
      const w = fbm(lo * 2.5, la * 9) * 0.6, b = Math.sin(la * 13.5 + w * 1.6), z = Math.abs(la) > 1.1 ? 0.75 : 1;
      let c = b > 0 ? mix([232, 220, 196], [246, 238, 220], b) : mix([202, 154, 112], [150, 98, 70], -b);
      const grs = Math.exp(-(((la + 0.39) / 0.065) ** 2 + ((mod(lo, 6.283) - 1.2) / 0.2) ** 2));
      c = mix(c, [196, 92, 62], Math.min(1, grs * 1.4));
      return [c[0] * z, c[1] * z, c[2] * z + (1 - z) * 30];
    },
    saturn: (la, lo) => { const b = Math.sin(la * 15 + fbm(lo * 1.5, la * 10) * 0.7), pol = Math.max(0, Math.abs(la) - 1.15) * 2; return mix(mix([226, 206, 160], [196, 168, 118], (b + 1) / 2 * 0.6), [150, 170, 175], Math.min(1, pol)); },
    uranus: (la, lo) => { const b = Math.sin(la * 7) * 0.5 + fbm(lo * 2, la * 6) * 0.3; return mix([150, 206, 216], [190, 228, 232], (b + 0.5) / 1.5); },
    neptune: (la, lo) => { const n = fbm(lo * 3, la * 7), spot = Math.exp(-(((la + 0.35) / 0.08) ** 2 + ((mod(lo, 6.283) - 2) / 0.18) ** 2)), cl = Math.max(0, vnoise(lo * 6, la * 30) - 0.82) * 4; return mix(mix([46, 84, 196], [84, 128, 226], n), [240, 246, 255], Math.min(1, cl)).map((v) => v * (1 - spot * 0.45)); },
    pluto: (la, lo) => { const n = fbm(lo * 4, la * 4), h = Math.exp(-(((la - 0.05) / 0.38) ** 2 + ((mod(lo, 6.283) - 3.1) / 0.55) ** 2)); return mix(mix([120, 84, 64], [204, 176, 150], n), [242, 232, 222], Math.min(1, h * 1.3)); },
    mars: (la, lo) => { const n = fbm(lo * 4, la * 4); return [176 + n * 40, 96 + n * 30, 60 + n * 22]; },
    earth: (la, lo) => { const n = fbm(lo * 3, la * 3), land = n > 0.55; return land ? [110 + n * 60, 120 + n * 40, 70] : [28, 70 + n * 30, 140 + n * 40]; }
  };
  const samp = (pix, la, lo) => {
    const u = mod(lo / (2 * Math.PI) + 0.5, 1);
    const v = pix.merc ? 0.5 - Math.log(Math.tan(Math.PI / 4 + Math.max(-1.484, Math.min(1.484, la)) / 2)) / (2 * Math.PI) : 0.5 - la / Math.PI;
    const k = ((Math.min(pix.h - 1, Math.floor(v * pix.h)) * pix.w) + Math.floor(u * pix.w)) * 4; return [pix.data[k], pix.data[k + 1], pix.data[k + 2]];
  };

  /* ---------- CPU sphere sprite (used where many small planets are drawn) ---------- */
  // Draws a lit sphere into canvas `cv` (sized to 2r). light = [x, y, z] in screen space (y down), rot = spin in radians.
  // opt.night: pixels of NASA city lights, shown on the dark side. opt.tilt: axis tilt in radians.
  function sprite(cv, r, planet, pix, light, rot, atm, opt) {
    opt = opt || {};
    const d = Math.max(2, Math.ceil(r * 2)); if (cv.width !== d) { cv.width = d; cv.height = d; }
    const g = cv.getContext("2d"), img = g.createImageData(d, d), o = img.data;
    const L = Math.hypot(...light), lx = light[0] / L, ly = light[1] / L, lz = light[2] / L, f = SURF[planet] || SURF.mercury;
    const ar = atm ? atm[0] : 0, ag = atm ? atm[1] : 0, ab = atm ? atm[2] : 0, ct = Math.cos(opt.tilt || 0), st = Math.sin(opt.tilt || 0), night = opt.night;
    for (let j = 0; j < d; j++) for (let i = 0; i < d; i++) {
      const sx = (i + 0.5) / d * 2 - 1, sy = (j + 0.5) / d * 2 - 1, d2 = sx * sx + sy * sy;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2), nx = sx * ct + sy * st, ny = -sx * st + sy * ct, la = Math.asin(-ny), lo = Math.atan2(nx, nz) + rot;
      const c = pix ? samp(pix, la, lo) : f(la, lo);
      if (pix && pix.merc && Math.abs(la) > 1.43) { c[0] = 236; c[1] = 242; c[2] = 248; }
      const dot = sx * lx + sy * ly + nz * lz, lit = Math.max(0, Math.min(1, (dot + 0.08) / 0.75)) ** 1.1, rim = Math.pow(1 - nz, 2.6) * Math.max(0, dot + 0.25);
      let er = 0, eg = 0, eb = 0;
      if (night && lit < 0.35) { const n = samp(night, la, lo), w = (0.35 - lit) / 0.35 * (n[0] + n[1] + n[2]) / 765; er = 255 * w; eg = 200 * w; eb = 120 * w; }
      const edge = Math.min(1, (1 - Math.sqrt(d2)) * r * 1.2), k = (j * d + i) * 4;
      o[k] = Math.min(255, c[0] * (0.02 + 1.05 * lit) + ar * rim * 160 + er);
      o[k + 1] = Math.min(255, c[1] * (0.02 + 1.05 * lit) + ag * rim * 160 + eg);
      o[k + 2] = Math.min(255, c[2] * (0.02 + 1.05 * lit) + ab * rim * 160 + eb);
      o[k + 3] = 255 * edge;
    }
    g.putImageData(img, 0, 0);
    return cv;
  }
  // Saturn's rings as photographed by Cassini: C ring, bright B ring, the Cassini Division, then the A ring with the Encke Gap.
  const RINGS = [[1.24, 1.52, 0.18, [170, 150, 120]], [1.53, 1.95, 0.85, [232, 214, 176]], [1.99, 2.03, 0.05, [80, 70, 60]], [2.03, 2.21, 0.6, [214, 196, 158]], [2.22, 2.27, 0.45, [200, 184, 150]]];
  function rings(g, x, y, r, tilt, front, alpha) {
    g.save(); g.translate(x, y); g.rotate(tilt);
    RINGS.forEach(([a, b, op, c]) => { g.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${op * (alpha || 1)})`; g.lineWidth = (b - a) * r; g.beginPath(); g.ellipse(0, 0, (a + b) / 2 * r, (a + b) / 2 * r * 0.3, 0, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI); g.stroke(); });
    g.restore();
  }

  /* ---------- WebGL globe (loading screen) with MOLA relief ---------- */
  function globe(cv, o) {
    let gl = null;
    try { gl = cv.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false }); } catch (_) {}
    if (!gl) return null;
    const VS = `attribute vec3 p;uniform float ay,ax,az,R,hs;uniform vec2 C,V;varying vec3 n,po,vT,vB;
    vec3 rot(vec3 v,float cy,float sy,float cx,float sx,float cz,float sz){vec3 q=vec3(cy*v.x+sy*v.z,v.y,-sy*v.x+cy*v.z);q=vec3(q.x,cx*q.y-sx*q.z,sx*q.y+cx*q.z);return vec3(cz*q.x-sz*q.y,sz*q.x+cz*q.y,q.z);}
    void main(){float cy=cos(ay),sy=sin(ay),cx=cos(ax),sx=sin(ax),cz=cos(az),sz=sin(az);
    float lat=asin(clamp(p.y,-1.,1.)),lon=atan(p.x,p.z);
    vec3 T=vec3(cos(lon),0.,-sin(lon)),B=vec3(-sin(lat)*sin(lon),cos(lat),-sin(lat)*cos(lon));
    vec3 q=rot(p,cy,sy,cx,sx,cz,sz);vT=rot(T,cy,sy,cx,sx,cz,sz);vB=rot(B,cy,sy,cx,sx,cz,sz);
    n=q;po=p;vec2 s=C+vec2(q.x,-q.y)*R*hs;gl_Position=vec4(s.x/V.x*2.-1.,1.-s.y/V.y*2.,-q.z*.5,1.);}`;
    const FS = `precision highp float;uniform sampler2D tx,dm;uniform float ht,hd,merc,mode,det,bump,ex;uniform vec2 dt;uniform vec3 L,atm;varying vec3 n,po,vT,vB;
    const float PI=3.14159265;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    void main(){vec3 nn=normalize(n);vec3 l=normalize(L);
    if(mode>.5){float a=pow(max(nn.z,0.),1.6)*smoothstep(-.35,.5,dot(normalize(vec3(nn.xy,0.)+1e-4),l));gl_FragColor=vec4(atm,a*.75);return;}
    vec3 p=normalize(po);float lat=asin(clamp(p.y,-1.,1.)),lon=atan(p.x,p.z);
    vec2 uv=vec2(lon/(2.*PI)+.5,merc>.5?.5-log(tan(PI/4.+clamp(lat,-1.484,1.484)/2.))/(2.*PI):.5-lat/PI);
    vec3 sn=nn;
    if(hd>.5){float e1=texture2D(dm,uv+vec2(dt.x,0.)).r-texture2D(dm,uv-vec2(dt.x,0.)).r;float e2=texture2D(dm,uv-vec2(0.,dt.y)).r-texture2D(dm,uv+vec2(0.,dt.y)).r;
      sn=normalize(nn-bump*(e1*normalize(vT)+e2*normalize(vB)));}
    vec3 b=ht>.5?texture2D(tx,uv).rgb:vec3(.55,.27,.15);
    b=pow(b,vec3(1.1))*ex;
    if(det>.5){float g=vn(uv*vec2(2400.,1200.))*.5+vn(uv*vec2(5200.,2600.))*.5;b*=.88+.24*g;}
    float d=dot(nn,l),ds=dot(sn,l);
    float lit=smoothstep(-.12,.65,d)*clamp(mix(1.,ds/max(d,.08),.85),0.,1.9);
    float rim=pow(1.-max(nn.z,0.),2.6);
    vec3 c=b*(.012+1.08*lit)+atm*rim*(.06+.9*smoothstep(-.3,.6,d))+atm*.05*smoothstep(.25,-.05,d)*smoothstep(-.4,-.05,d);
    gl_FragColor=vec4(c,1.);}`;
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    const N = o.seg || 128, K = Math.round(N * 0.75), pos = [], idx = [];
    for (let j = 0; j <= K; j++) { const ph = Math.PI / 2 - (j / K) * Math.PI; for (let i = 0; i <= N; i++) { const la = (i / N - 0.5) * 2 * Math.PI; pos.push(Math.cos(ph) * Math.sin(la), Math.sin(ph), Math.cos(ph) * Math.cos(la)); } }
    for (let j = 0; j < K; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + N + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    const U = {}; ["ay", "ax", "az", "R", "hs", "C", "V", "ht", "hd", "merc", "mode", "det", "bump", "ex", "dt", "L", "atm", "tx", "dm"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
    gl.uniform1i(U.tx, 0); gl.uniform1i(U.dm, 1);
    const st = { ay: o.ay || 0, ax: o.ax || 0, az: o.az || 0, tex: null, dem: null, merc: 0, dt: [0, 0] };
    const maxT = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    function upload(t, unit) {
      if (!t || t.canvas.width > maxT) return null;
      try {
        gl.activeTexture(gl.TEXTURE0 + unit);
        const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, t.canvas);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.activeTexture(gl.TEXTURE0);
        return tx;
      } catch (_) { gl.activeTexture(gl.TEXTURE0); return null; }
    }
    const setTexture = (t) => { const x = upload(t, 0); if (x) { st.tex = x; st.merc = t.merc ? 1 : 0; } return !!x; };
    const setRelief = (t) => { const x = upload(t, 1); if (x) { st.dem = x; st.dt = [1.5 / t.canvas.width, 1.5 / t.canvas.height]; } return !!x; };
    function draw() {
      const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
      if (!w || !h) return;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const lay = o.layout(w, h);
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(U.ay, st.ay); gl.uniform1f(U.ax, st.ax); gl.uniform1f(U.az, st.az); gl.uniform1f(U.R, lay.R); gl.uniform2f(U.C, lay.cx, lay.cy); gl.uniform2f(U.V, w, h);
      gl.uniform3f(U.L, ...o.light); gl.uniform3f(U.atm, ...o.atm); gl.uniform1f(U.det, o.detail ? 1 : 0); gl.uniform1f(U.bump, o.bump || 9); gl.uniform1f(U.ex, o.exposure || 1.15); gl.uniform2f(U.dt, st.dt[0], st.dt[1]);
      if (o.halo) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
        gl.uniform1f(U.mode, 1); gl.uniform1f(U.hs, o.halo); gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.BLEND); gl.depthMask(true);
      }
      gl.enable(gl.DEPTH_TEST);
      gl.uniform1f(U.mode, 0); gl.uniform1f(U.hs, 1); gl.uniform1f(U.merc, st.merc); gl.uniform1f(U.ht, st.tex ? 1 : 0); gl.uniform1f(U.hd, st.dem ? 1 : 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, st.dem); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, st.tex);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    }
    return { draw, setTexture, setRelief, st, maxT };
  }

  /* ---------- planet positions (NASA JPL, Standish) ---------- */
  // a (AU), e, I, L, long. perihelion, long. node (deg) and their rates per Julian century.
  const EL = {
    mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    venus: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    uranus: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503, -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
    neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
    pluto: [39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684, -0.00031596, 0.00005170, 0.00004818, 145.20780515, -0.04062942, -0.01183482]
  };
  const jd = (t) => 2440587.5 + t / DAY;
  function elements(id, t) { const e = EL[id], T = (jd(t) - 2451545) / 36525; return [0, 1, 2, 3, 4, 5].map((i) => e[i] + e[i + 6] * T); }
  function xyz(a, e, I, Lm, wb, Om, Mdeg) {
    const w = rad(wb - Om), O = rad(Om), i = rad(I);
    let M = rad(mod((Mdeg === undefined ? Lm - wb : Mdeg) + 180, 360) - 180), E = M + e * Math.sin(M);
    for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(i), sI = Math.sin(i);
    return [(cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp, (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp, sw * sI * xp + cw * sI * yp];
  }
  function pos(id, t) { const [a, e, I, L, wb, Om] = elements(id, t); const p = xyz(a, e, I, L, wb, Om); return { x: p[0], y: p[1], z: p[2], r: Math.hypot(p[0], p[1], p[2]), lon: mod(deg(Math.atan2(p[1], p[0])), 360) }; }
  function orbit(id, t, n = 180) { const [a, e, I, L, wb, Om] = elements(id, t), out = []; for (let k = 0; k <= n; k++) out.push(xyz(a, e, I, L, wb, Om, k / n * 360 - 180)); return out; }
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);

  // Earth -> Mars launch period from planet geometry. Real launches (Spirit, MRO, Curiosity, InSight, Perseverance...) left
  // with Mars 17-63 deg ahead of Earth, so 20-58 deg is used as an approximate period. Mission design sets the real dates.
  const PHASE = 39, HALF = 19, TRANSIT = 230;
  const phase = (t) => mod(pos("mars", t).lon - pos("earth", t).lon + 180, 360) - 180;
  function launchWindow(t) {
    const now = phase(t);
    if (Math.abs(now - PHASE) <= HALF) {
      let d = 0; while (d < 120 && Math.abs(phase(t + d * DAY) - PHASE) <= HALF) d++;
      let s = 0; while (s < 120 && Math.abs(phase(t - s * DAY) - PHASE) <= HALF) s++;
      return { open: true, opens: t - (s - 1) * DAY, closes: t + d * DAY, best: bestDay(t - s * DAY, t + d * DAY), transit: TRANSIT };
    }
    for (let d = 1; d < 900; d++) if (Math.abs(phase(t + d * DAY) - PHASE) <= HALF) {
      const opens = t + d * DAY; let e = d; while (e < d + 120 && Math.abs(phase(t + e * DAY) - PHASE) <= HALF) e++;
      return { open: false, opens, closes: t + e * DAY, best: bestDay(opens, t + e * DAY), transit: TRANSIT, inDays: d };
    }
    return null;
  }
  function bestDay(a, b) { let best = a, bv = 1e9; for (let t = a; t <= b; t += DAY) { const v = Math.abs(phase(t) - PHASE); if (v < bv) { bv = v; best = t; } } return best; }

  /* ---------- NASA Planetary Fact Sheet ---------- */
  const FACT = {
    mercury: { d: 4879, g: 3.7, day: "4,222.6 h", yr: "88 days", T: "167 °C", tilt: 0.03, rotH: 1407.6 },
    venus: { d: 12104, g: 8.9, day: "2,802 h", yr: "224.7 days", T: "464 °C", tilt: 177.4, rotH: -5832.5 },
    earth: { d: 12756, g: 9.8, day: "24 h", yr: "365.2 days", T: "15 °C", tilt: 23.4, rotH: 23.9 },
    mars: { d: 6792, g: 3.7, day: "24 h 39 min", yr: "687 days", T: "−65 °C", tilt: 25.2, rotH: 24.6 },
    jupiter: { d: 142984, g: 23.1, day: "9.9 h", yr: "11.9 years", T: "−110 °C", tilt: 3.1, rotH: 9.9 },
    saturn: { d: 120536, g: 9.0, day: "10.7 h", yr: "29.4 years", T: "−140 °C", tilt: 26.7, rotH: 10.7 },
    uranus: { d: 51118, g: 8.7, day: "17.2 h", yr: "83.7 years", T: "−195 °C", tilt: 97.8, rotH: -17.2 },
    neptune: { d: 49528, g: 11.0, day: "16.1 h", yr: "163.7 years", T: "−200 °C", tilt: 28.3, rotH: 16.1 },
    pluto: { d: 2376, g: 0.7, day: "153.3 h", yr: "248 years", T: "−225 °C", tilt: 119.5, rotH: -153.3 }
  };

  window.MM_SKY = { texture, pixels, sprite, rings, globe, sdo, weather, pos, orbit, dist, launchWindow, phase, FACT, EL, AU_KM, DAY, altName, fbm, mod, progress };
})();
