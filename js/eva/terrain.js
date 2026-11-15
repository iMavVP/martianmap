/* The ground where the EVA starts (Jezero crater by default, or any spot picked on the Mars map).
   Large-scale shape: NASA MGS MOLA elevation tiles from NASA Trek (about 460 m per pixel), so the crater rim and the
   delta on the horizon are where they really are. Ground color: NASA Viking MDIM 2.1 color mosaic from NASA Trek.
   Walking-scale detail (small craters, wind ripples, pebbles, boulders) is generated, because no orbital data set
   resolves the ground at boot scale. Rock sizes follow the power-law size spread measured at Mars landing sites. */
import * as THREE from "three";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { MARS, SITE } from "./mars.js";
import { regionAt } from "./regions.js";
import { createMartianPbrTextures, createRockPbrTextures, valueNoise2D } from "./ares/terrain.js";

const T = "https://trek.nasa.gov/tiles/Mars/EQ/", TS = "/1.0.0/default/default028mm/{z}/{y}/{x}";
export const TREK = { dem: T + "Mars_MGS_MOLA_DEM_mosaic_global_463m_8" + TS + ".png", color: T + "Viking_MDIM21_ClrMosaic_global_232m" + TS + ".jpg" };
const altName = (u) => u.replace(/\/EQ\/(Mars_)?([^/]+)\//, (m, p, n) => `/EQ/${p ? "" : "Mars_"}${n}/`);
const MOLA = [-8201, 21241];                 // metres spanned by the 8-bit MOLA mosaic (approximate)
export const M_PER_DEG = MARS.R * Math.PI / 180;
// Local map around the start point: x east, z south, in metres. Longitudes wrap at 180 degrees.
const wrapLon = (l) => ((l + 540) % 360) - 180;
export const toLatLon = (x, z) => { const lat = SITE.lat - z / M_PER_DEG; return { lat, lon: SITE.lon + x / (M_PER_DEG * Math.cos(lat * Math.PI / 180)) }; };
export const toXZ = (lat, lon) => ({ x: wrapLon(lon - SITE.lon) * M_PER_DEG * Math.cos(lat * Math.PI / 180), z: (SITE.lat - lat) * M_PER_DEG });

/* ---------- NASA data ---------- */
function loadImg(url) {
  return new Promise((res) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
}
async function mosaic(tpl, z, lat0, lat1, lon0, lon1, onTile) {
  const cols = 2 ** (z + 1), rows = 2 ** z, deg = 360 / cols;
  const x0 = Math.floor((lon0 + 180) / deg), x1 = Math.floor((lon1 + 180) / deg), y0 = Math.floor((90 - lat1) / deg), y1 = Math.floor((90 - lat0) / deg);
  const c = document.createElement("canvas"); c.width = (x1 - x0 + 1) * 256; c.height = (y1 - y0 + 1) * 256;
  const g = c.getContext("2d", { willReadFrequently: true }); let ok = 0;
  const jobs = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) jobs.push((async () => {
    const u = tpl.replace("{z}", z).replace("{x}", ((x % cols) + cols) % cols).replace("{y}", y);
    const im = (await loadImg(u)) || (await loadImg(altName(u)));
    if (im) { g.drawImage(im, (x - x0) * 256, (y - y0) * 256); ok++; }
    if (onTile) onTile();
  })());
  await Promise.all(jobs);
  if (ok < jobs.length) return null;
  let data; try { data = g.getImageData(0, 0, c.width, c.height).data; } catch (_) { return null; }
  // pixel -> lat/lon of the mosaic
  return { data, w: c.width, h: c.height, lon0: x0 * deg - 180, lat1: 90 - y0 * deg, ppd: 256 / deg };
}
/* Sharper NASA imagery read pixel by pixel as you walk (Jezero only): HiRISE (25 cm) for the ground at your feet and CTX
   (6 m) for the next few hundred metres. Tiles load in the background; the ground brightens with real detail as they land. */
export class TileSampler {
  constructor(tpl, z, bounds) { this.tpl = tpl; this.z = z; this.b = bounds; this.cache = new Map(); this.onTile = null; this.loaded = 0; this.failed = 0; }
  inside(lat, lon) { const b = this.b; return lat >= b[0][0] && lat <= b[1][0] && lon >= b[0][1] && lon <= b[1][1]; }
  sample(lat, lon) {
    if (!this.inside(lat, lon)) return null;
    const cols = 2 ** (this.z + 1), deg = 360 / cols, fx = (lon + 180) / deg, fy = (90 - lat) / deg, x = Math.floor(fx), y = Math.floor(fy), k = x + "," + y;
    let t = this.cache.get(k);
    if (t === undefined) { this.load(x, y, k); return null; }
    if (!t || t === 1) return null;
    // bilinear, so pixels don't show as squares on the ground
    const u = Math.min(254.999, Math.max(0, (fx - x) * 256 - 0.5)), w = Math.min(254.999, Math.max(0, (fy - y) * 256 - 0.5)), px = Math.floor(u), py = Math.floor(w), tx = u - px, ty = w - py, d = t.d;
    const i00 = (py * 256 + px) * 4, i10 = i00 + 4, i01 = i00 + 1024, i11 = i01 + 4;
    if (d[i00 + 3] < 128) return null;
    const v = d[i00] * (1 - tx) * (1 - ty) + d[i10] * tx * (1 - ty) + d[i01] * (1 - tx) * ty + d[i11] * tx * ty;
    return v / this.mean; // one brightness reference for all tiles, so no seams between them
  }
  load(x, y, k) {
    this.cache.set(k, 1);
    loadImg(this.tpl.replace("{z}", this.z).replace("{x}", x).replace("{y}", y)).then((im) => {
      if (!im) { this.cache.set(k, null); this.failed++; return; }
      try {
        const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0, 256, 256);
        const d = g.getImageData(0, 0, 256, 256).data; let s = 0, n = 0;
        for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 128) { s += d[i]; n++; }
        if (n > 50 && !this.mean) this.mean = Math.max(8, s / n);
        this.cache.set(k, n > 50 ? { d } : null); this.loaded++;
      } catch (_) { this.cache.set(k, null); this.failed++; }
      if (this.onTile) this.onTile();
    });
  }
}
const JEZERO_DETAIL = {
  hirise: { tpl: T + "JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd" + TS + ".png", z: 15, b: [[18.3068, 77.2229], [18.6693, 77.584]] },
  ctx: { tpl: T + "Jezero_CTX_BlockAdj_dd" + TS + ".png", z: 13, b: [[15.9058, 75.1538], [19.4453, 78.8717]] }
};
export async function loadNasa(onProgress) {
  const R = 0.9; // degrees around the site (about 53 km)
  let done = 0; const tick = () => onProgress && onProgress(++done);
  const lonR = R / Math.cos(SITE.lat * Math.PI / 180), la0 = Math.max(-89.99, SITE.lat - R), la1 = Math.min(89.99, SITE.lat + R);
  // The same two NASA layers the website's Mars map shows: MOLA elevation for the shape, Viking color for the look.
  const [dem, col] = await Promise.all([
    mosaic(TREK.dem, 6, la0, la1, SITE.lon - lonR, SITE.lon + lonR, tick),
    mosaic(TREK.color, 7, la0, la1, SITE.lon - lonR, SITE.lon + lonR, tick)
  ]);
  const out = { mola: !!dem, viking: !!col };
  if (dem) {
    // Read heights, then blur to remove the 8-bit steps (about 115 m each) of the MOLA mosaic.
    const { w, h } = dem, raw = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) raw[i] = MOLA[0] + dem.data[i * 4] / 255 * (MOLA[1] - MOLA[0]);
    const blur = (src, r) => { const k = [], dst = new Float32Array(src.length), tmp = new Float32Array(src.length); let s = 0; for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (r * r * 0.5)); k.push(v); s += v; } k.forEach((v, i) => (k[i] = v / s));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let i = -r; i <= r; i++) a += src[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + r]; tmp[y * w + x] = a; }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let i = -r; i <= r; i++) a += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r]; dst[y * w + x] = a; } return dst; };
    const hf = blur(raw, 3);
    const at = (lat, lon) => {
      const fx = (lon - dem.lon0) * dem.ppd - 0.5, fy = (dem.lat1 - lat) * dem.ppd - 0.5, x = Math.max(0, Math.min(w - 2, Math.floor(fx))), y = Math.max(0, Math.min(h - 2, Math.floor(fy))), tx = Math.min(1, Math.max(0, fx - x)), ty = Math.min(1, Math.max(0, fy - y));
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = hf[y * w + x], b = hf[y * w + x + 1], c = hf[(y + 1) * w + x], d = hf[(y + 1) * w + x + 1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
    out.heightAt = at;
  } else if (Math.hypot(SITE.lat - 18.4, SITE.lon - 77.5) > 1) {
    // Fallback away from Jezero: gentle plains at the planet's mean level (MOLA datum), since the real shape isn't known.
    out.heightAt = () => 0;
  } else {
    // Fallback: Jezero's real geometry (USGS): 45 km across, centred 18.38 N 77.58 E, rim about 600 m above the floor.
    const c = toXZ(18.38, 77.58), Rr = 22500;
    out.heightAt = (lat, lon) => { const p = toXZ(lat, lon), r = Math.hypot(p.x - c.x, p.z - c.z) / Rr; return -2640 + (r < 1 ? 60 * r * r : 600 * Math.exp(-(((r - 1.05) / 0.16) ** 2)) + 120 * Math.max(0, 1.3 - r)); };
  }
  if (col) {
    out.colorAt = (lat, lon) => { const x = Math.max(0, Math.min(col.w - 1, Math.round((lon - col.lon0) * col.ppd))), y = Math.max(0, Math.min(col.h - 1, Math.round((col.lat1 - lat) * col.ppd))), k = (y * col.w + x) * 4; return [col.data[k] / 255, col.data[k + 1] / 255, col.data[k + 2] / 255]; };
    let r = 0, g = 0, b = 0, n = 0; for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) { const c = out.colorAt(SITE.lat + dy * 0.01, SITE.lon + dx * 0.01); r += c[0]; g += c[1]; b += c[2]; n++; }
    out.tint = [r / n, g / n, b / n];
  } else { out.colorAt = () => [0.55, 0.36, 0.24]; out.tint = [0.55, 0.36, 0.24]; }
  out.siteElevation = out.heightAt(SITE.lat, SITE.lon);
  // per level of detail: HiRISE at your feet, CTX for the middle distance, Viking beyond
  const H = JEZERO_DETAIL.hirise, C = JEZERO_DETAIL.ctx, mk = (d) => new TileSampler(d.tpl, d.z, d.b);
  out.detail = [mk(H), mk(C), null];
  if (!out.detail[1].inside(SITE.lat, SITE.lon)) out.detail = [null, null, null];
  return out;
}

/* ---------- height ---------- */
const H = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
// Gullies down a crater's inner wall, spaced at least a few metres apart: finer ripples than the 1 m ground mesh can show
// would be felt underfoot as invisible steps.
const gully = (ang, D, a, b) => { const c = Math.PI * D * 0.72, k1 = Math.max(3, Math.round(c / 7)), k2 = Math.max(5, Math.round(c / 4.5)); return (Math.sin(ang * k1 + a) * 0.5 + Math.sin(ang * k2 - b) * 0.3) * Math.min(D * 0.004, 0.3); };
export class Ground {
  constructor(nasa) {
    this.nasa = nasa; this.base = nasa.siteElevation; this.n = new ImprovedNoise();
    this.mc = new Map(); this.R = regionAt(SITE.lat, SITE.lon, nasa);
    // keep the start point's height: the generated relief is measured from it
    this.r0 = 0; this.r0 = this.relief(0, 0, 0);
  }
  // Ridged noise: sharp crests and rounded valleys, the shape of eroded mountain ranges.
  ridged(x, z, f, o) { const v = 1 - Math.abs(this.n.noise(x * f, o, z * f)); return v * v; }
  // Regional relief on top of the NASA elevation (see regions.js): hills, mountains, lava flows, polar troughs and layers.
  relief(x, z, lod) {
    const R = this.R, n = this.n; let h = 0;
    h += R.hills * (n.noise(x / 700, 12.1, z / 700) + 0.45 * n.noise(x / 260, 13.7, z / 260));
    if (R.mount) {
      const w = R.mountWave, m = this.ridged(x, z, 1 / w, 21.3) * 1.0 + this.ridged(x, z, 2.1 / w, 23.9) * 0.42 + (lod < 2 ? this.ridged(x, z, 5.3 / w, 27.1) * 0.12 : 0.05);
      // ranges come and go across the land, with open valleys between them
      const belt = Math.max(0, Math.min(1, 0.55 + 1.3 * n.noise(x / (w * 3.2), 31.1, z / (w * 3.2))));
      h += R.mount * (m - 0.38) * belt;
    }
    if (R.lava) { const f = x * 0.6 + z * 0.8 + 90 * n.noise(x / 400, 41.2, z / 400); h += R.lava * (2.2 * Math.pow(Math.abs(Math.sin(f / 55)), 0.4) + 1.4 * this.ridged(x, z, 1 / 90, 43.3)); }
    if (R.troughs) { const a = Math.atan2(z + 4000, x + 2500), r = Math.hypot(x + 2500, z + 4000), f = r / 4200 + a * 0.35 + 0.3 * n.noise(x / 3000, 51.5, z / 3000); h -= R.troughs * Math.pow(Math.max(0, Math.sin(f * Math.PI * 2)), 3); }
    if (R.pits && lod < 2) { const v = n.noise(x / 60, 61.1, z / 60) + 0.5 * n.noise(x / 23, 62.3, z / 23); h -= 6 * Math.max(0, Math.min(1, (v - 0.18) * 6)); }
    // Layers: the slope breaks into steps where harder beds stand out (canyon walls, Mount Sharp, polar scarps).
    if (R.layers) { const L = R.layers, t = h / L, k = Math.floor(t), fr = t - k; h = L * (k + fr * fr * (3 - 2 * fr) * 0.7 + fr * 0.3); }
    return h - this.r0;
  }
  macro(x, z) { const p = toLatLon(x, z); return this.nasa.heightAt(p.lat, p.lon) - this.base; }
  // Impact craters on a random but repeatable grid. Size spread follows the steep power law of Mars crater counts (many
  // small, few large). Fresh simple craters on Mars are about 1/5 as deep as they are wide (MOLA measurements); older ones
  // fill with dust and get shallower. Inner walls carry gullies, rims are raised, and an ejecta apron surrounds them.
  craters(x, z, cell, prob, dMin, dMax, seed, info) {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell); let h = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const a = cx + i + seed, b = cz + j - seed;
      if (H(a, b) > prob) continue;
      const D = dMin * Math.pow(1 - H(b, a) * 0.98, -1 / 1.8), Dc = Math.min(D, dMax);
      const ox = (cx + i + H(a * 1.3, b)) * cell, oz = (cz + j + H(a, b * 1.7)) * cell, dx = x - ox, dz = z - oz, r = Math.hypot(dx, dz) / (Dc / 2);
      if (r > 2.6) continue;
      const fresh = H(a * 2.1, b * 0.7), depth = Dc * (0.07 + 0.13 * fresh), rim = Dc * (0.02 + 0.035 * fresh);
      if (r < 1) {
        const ang = Math.atan2(dz, dx), band = Math.max(0, 1 - Math.abs(r - 0.72) / 0.25);
        h += rim * (1 + 0.22 * fresh) - depth * Math.pow(1 - r * r, 1.25) + gully(ang, Dc, a, b) * fresh * band;
      } else h += rim * Math.exp(-(((r - 1) / 0.3) ** 2)) + rim * 0.22 * fresh * Math.exp(-(r - 1) / 0.5);
      if (info && Dc > 5) info.rim = Math.max(info.rim, fresh * Math.exp(-(((r - 1) / 0.35) ** 2)));
    }
    return h;
  }
  // lod 0: everything (walking scale), lod 1: no fine detail, lod 2: NASA MOLA shape and the largest craters.
  // Crater counts on Mars plains rise steeply toward small sizes, so there are four scales of them (plus the real
  // large ones in the NASA elevation): hundreds of metres, tens of metres, about ten metres and a few metres.
  height(x, z, lod = 0) {
    const C = this.R.crater;
    let h = this.macro(x, z) + this.relief(x, z, lod) + this.craters(x, z, 900, 0.18 * C, 110, 520, 29) + (this.R.showcase ? this.showcase(x, z) : 0);
    if (lod >= 2) return h;
    const n = this.n;
    h += 2.4 * n.noise(x * 0.005, 0.3, z * 0.005) + 1.1 * n.noise(x * 0.016, 1.7, z * 0.016);
    h += this.craters(x, z, 220, 0.42 * C, 16, 140, 11) + this.craters(x, z, 70, 0.3 * C, 6, 40, 17);
    if (lod >= 1) return h;
    h += 0.32 * n.noise(x * 0.06, 2.1, z * 0.06) + 0.07 * n.noise(x * 0.35, 3.3, z * 0.35) + 0.02 * n.noise(x * 1.4, 5.1, z * 1.4);
    h += this.craters(x, z, 26, 0.22 * C, 3, 10, 3); // smaller pits than ~3 m can't be shaped on a 1 m ground mesh
    // Transverse aeolian ridges: wind ripples a few metres apart in patches, as seen by HiRISE across Jezero.
    const patch = this.sand(x, z);
    if (patch > 0) { const d = x * 0.83 + z * 0.56 + 1.6 * n.noise(x * 0.05, 9.1, z * 0.05); h += 0.11 * patch * Math.pow(0.5 + 0.5 * Math.sin(d * 2 * Math.PI / (3.6 + 1.2 * n.noise(x * 0.02, 2.2, z * 0.02))), 2.2); }
    return h;
  }
  // Two fresh craters near every starting point, so there is always a deep one to walk to: 64 m and 34 m across,
  // one fifth as deep as wide with raised, rocky rims, like young craters on the plains of Jezero and Gale.
  showcase(x, z) {
    let h = 0;
    for (const [cx, cz, D] of [[-60, -95, 64], [110, 40, 34]]) {
      const r = Math.hypot(x - cx, z - cz) / (D / 2); if (r > 2.6) continue;
      const depth = D * 0.2, rim = D * 0.04, ang = Math.atan2(z - cz, x - cx);
      h += r < 1 ? rim * 1.22 - depth * Math.pow(1 - r * r, 1.25) + gully(ang, D, 0, 0) * Math.max(0, 1 - Math.abs(r - 0.72) / 0.25) : rim * Math.exp(-(((r - 1) / 0.3) ** 2)) + rim * 0.22 * Math.exp(-(r - 1) / 0.5);
    }
    return h;
  }
  showRim(x, z) { let m = 0; for (const [cx, cz, D] of [[-60, -95, 64], [110, 40, 34]]) { const r = Math.hypot(x - cx, z - cz) / (D / 2); m = Math.max(m, Math.exp(-(((r - 1) / 0.35) ** 2))); } return m; }
  sand(x, z) { return this.R.sand * Math.max(0, Math.min(1, (this.n.noise(x * 0.007, 7.7, z * 0.007) - 0.22) * 2.5)); }
  rockiness(x, z) { return this.R.rock * (0.5 + 0.9 * Math.max(0, this.n.noise(x * 0.012, 6.6, z * 0.012))); }
  // How icy the surface is (0..1): bright ice on flats, dusty layers exposed on steep scarps; frost on pole-facing slopes.
  iceAt(x, z, ny, nz) {
    const R = this.R; let v = 0;
    if (R.ice) v = R.ice * (0.75 + 0.25 * this.n.noise(x / 90, 71.1, z / 90)) * (1 - Math.max(0, Math.min(1, (0.93 - ny) / 0.12)) * 0.75);
    if (R.frost) { const pole = SITE.lat > 0 ? -nz : nz; v = Math.max(v, R.frost * Math.max(0, Math.min(1, pole * 4 + 0.15 * this.n.noise(x / 40, 73.3, z / 40) - 0.2)) * 0.8); }
    return Math.max(0, Math.min(1, v));
  }
  // How close (x, z) is to the rim of a fresh crater (0..1): impacts throw out blocks, so rims are rockier.
  rim(x, z) { const info = { rim: 0 }, C = this.R.crater; this.craters(x, z, 220, 0.42 * C, 16, 140, 11, info); this.craters(x, z, 70, 0.3 * C, 6, 40, 17, info); this.craters(x, z, 26, 0.22 * C, 3, 10, 3, info); this.craters(x, z, 900, 0.18 * C, 110, 520, 29, info); return Math.max(info.rim, this.R.showcase ? this.showRim(x, z) : 0); }
  // The ground under a wheel or boot: loose sand in ripple fields, rocky ground near crater rims and in boulder patches,
  // dusty regolith elsewhere; bedrock where slopes are steep enough that dust can't stay.
  surface(x, z) {
    const sand = this.sand(x, z), rock = this.rockiness(x, z) * 0.5 + this.rim(x, z) * 0.8, n = this.normal(x, z, 0, 0.6), slope = Math.acos(Math.min(1, n.y)) * 180 / Math.PI;
    const ice = this.R.ice || this.R.frost ? this.iceAt(x, z, n.y, n.z) : 0;
    const type = ice > 0.55 ? "ice" : slope > 22 ? "bedrock" : sand > 0.35 ? "sand" : rock > 0.75 ? "rocky" : "regolith";
    return { type, sand, rock, slope, n, ice };
  }
  normal(x, z, lod = 0, e = 0.5) {
    const hx = this.height(x + e, z, lod) - this.height(x - e, z, lod), hz = this.height(x, z + e, lod) - this.height(x, z - e, lod);
    return new THREE.Vector3(-hx, 2 * e, -hz).normalize();
  }
}

/* ---------- shader additions shared by everything on the ground ---------- */
// Mars curves away faster than Earth: the horizon is about 3.4 km away for a standing astronaut (Earth: 4.7 km).
export const WORLD_U = { uCam: { value: new THREE.Vector3() }, uR: { value: MARS.R } };
export function curveMaterial(mat, extra) {
  const lower = extra ? extra : null;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCam = WORLD_U.uCam; sh.uniforms.uR = WORLD_U.uR;
    if (lower) { sh.uniforms.uInC = lower.c; sh.uniforms.uInH = lower.h; sh.uniforms.uDrop = lower.d; }
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
uniform vec3 uCam; uniform float uR;${lower ? "uniform vec2 uInC; uniform float uInH; uniform float uDrop; varying vec2 vInXZ;" : ""}`)
      .replace("#include <project_vertex>", `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
mvPosition = instanceMatrix * mvPosition;
#endif
vec4 wP = modelMatrix * mvPosition;
vec2 dxz = wP.xz - uCam.xz;
wP.y -= dot(dxz, dxz) / (2.0 * uR);
${lower ? "vInXZ = wP.xz;" : ""}
mvPosition = viewMatrix * wP;
gl_Position = projectionMatrix * mvPosition;`);
    // A coarser ground grid is cut away where the finer one covers it. (Pushing it down instead let it show through
    // the floors of craters deeper than the push.)
    if (lower) sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform vec2 uInC; uniform float uInH; varying vec2 vInXZ;`).replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
if (abs(vInXZ.x - uInC.x) < uInH && abs(vInXZ.y - uInC.y) < uInH) discard;`);
  };
  return mat;
}

// Add more shader code after what a material already has (several effects stack on one material).
export function chainShader(mat, fn) { const prev = mat.onBeforeCompile; mat.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); fn(sh); }; return mat; }
// Regolith detail on the ground, from the ARES surface-operations build: bedrock showing on steep walls, layered strata,
// and large-scale brightness changes so the texture never looks tiled.
function groundDetail(mat) {
  return chainShader(mat, (sh) => {
    sh.vertexShader = "attribute float ice; varying float vIce; varying vec3 vGW; varying vec3 vGN;\n" + sh.vertexShader.replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
      vGW = (modelMatrix * vec4(transformed, 1.0)).xyz; vGN = normalize(mat3(modelMatrix) * objectNormal); vIce = ice;`);
    sh.fragmentShader = "varying float vIce; varying vec3 vGW; varying vec3 vGN;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float slopeRock = smoothstep(0.93, 0.74, abs(vGN.y));
      float strata = 0.5 + 0.5 * sin(vGW.y * 2.6 + sin(vGW.x * 0.08) * 1.5);
      vec3 bedrock = mix(vec3(0.30, 0.19, 0.15), vec3(0.56, 0.34, 0.24), strata);
      diffuseColor.rgb = mix(diffuseColor.rgb, bedrock * 1.15, slopeRock * 0.55);
      float drift = 0.5 + 0.5 * sin(vGW.x * 0.18 + vGW.z * 0.09 + sin(vGW.z * 0.05) * 2.2);
      diffuseColor.rgb *= 0.9 + 0.12 * sin(vGW.x * 0.025 + vGW.z * 0.019) + (drift - 0.5) * 0.08;
      // Polar ice and frost: bright, slightly blue-white, with thin dust bands like the layers HiRISE sees in scarps.
      if (vIce > 0.001) {
        float bands = 0.5 + 0.5 * sin(vGW.y * 3.1 + sin(vGW.x * 0.03) * 2.0);
        vec3 iceC = mix(vec3(0.93, 0.92, 0.9), vec3(0.78, 0.68, 0.6), bands * 0.35) * (0.92 + 0.08 * drift);
        diffuseColor.rgb = mix(diffuseColor.rgb, iceC, vIce);
      }`);
  });
}
// Rock shading from the same build: cool grey fractured faces, warm dust settled on top faces, fine strata.
function rockDetail(mat) {
  return chainShader(mat, (sh) => {
    sh.vertexShader = "varying vec3 vRW; varying vec3 vRN;\n" + sh.vertexShader.replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
      mat4 iM = mat4(1.0);
      #ifdef USE_INSTANCING
      iM = instanceMatrix;
      #endif
      vRW = (modelMatrix * iM * vec4(transformed, 1.0)).xyz; vRN = normalize(mat3(modelMatrix) * mat3(iM) * objectNormal);`);
    sh.fragmentShader = "varying vec3 vRW; varying vec3 vRN;\n" + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float topDust = smoothstep(0.28, 0.78, vRN.y);
      float band = 0.5 + 0.5 * sin(vRW.y * 14.0 + vRW.x * 2.5 + vRW.z * 2.1);
      vec3 slate = mix(vec3(0.28, 0.30, 0.33), vec3(0.50, 0.51, 0.53), band), ochre = mix(vec3(0.76, 0.50, 0.33), vec3(0.92, 0.69, 0.47), band);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * mix(slate, ochre, topDust) * 1.48, 0.76);`);
  });
}

/* ---------- procedural regolith textures ---------- */
function canvasTex(size, paint, srgb) {
  const c = document.createElement("canvas"); c.width = c.height = size; paint(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
function regolith(size) {
  const n = new ImprovedNoise(), hgt = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, per = (f, o) => { // tileable noise via torus mapping
      const a = u * 2 * Math.PI, b = v * 2 * Math.PI, r = f / (2 * Math.PI);
      return n.noise(Math.cos(a) * r + o, Math.sin(a) * r + o * 0.7, Math.cos(b) * r + Math.sin(b) * r * 0.5 + o * 1.3);
    };
    hgt[y * size + x] = per(4, 0) * 0.5 + per(11, 3) * 0.3 + per(29, 7) * 0.15 + per(70, 9) * 0.08;
  }
  // pebbles and grains
  let seed = 9; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const peb = [];
  for (let i = 0; i < 900; i++) peb.push([rnd() * size, rnd() * size, 0.6 + Math.pow(rnd(), 6) * 6, rnd()]);
  peb.forEach(([px, py, r]) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y) / r; if (d > 1) continue; const X = ((Math.round(px + x) % size) + size) % size, Y = ((Math.round(py + y) % size) + size) % size; hgt[Y * size + X] += 0.25 * Math.sqrt(1 - d * d) * (r / 4); } });
  const color = canvasTex(size, (g) => {
    const img = g.createImageData(size, size), o = img.data;
    for (let i = 0; i < size * size; i++) {
      const h = hgt[i], k = 0.86 + h * 0.5 + (H(i % size, Math.floor(i / size)) - 0.5) * 0.12;
      o[i * 4] = Math.min(255, 255 * 0.78 * k); o[i * 4 + 1] = Math.min(255, 255 * 0.70 * k); o[i * 4 + 2] = Math.min(255, 255 * 0.64 * k); o[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    peb.forEach(([px, py, r, t]) => { if (r < 1.2) return; g.fillStyle = t < 0.5 ? "rgba(60,44,36,.55)" : "rgba(150,120,100,.35)"; g.beginPath(); g.arc(px, py, r * 0.8, 0, 7); g.fill(); });
  }, true);
  const normal = canvasTex(size, (g) => {
    const img = g.createImageData(size, size), o = img.data, s = 6;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x, hx = hgt[y * size + (x + 1) % size] - hgt[y * size + (x - 1 + size) % size], hy = hgt[((y + 1) % size) * size + x] - hgt[((y - 1 + size) % size) * size + x];
      const nx = -hx * s, ny = -hy * s, nz = 1, l = Math.hypot(nx, ny, nz);
      o[i * 4] = (nx / l * 0.5 + 0.5) * 255; o[i * 4 + 1] = (ny / l * 0.5 + 0.5) * 255; o[i * 4 + 2] = (nz / l * 0.5 + 0.5) * 255; o[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  return { color, normal };
}

/* ---------- terrain grids that follow the astronaut ---------- */
export class Terrain {
  constructor(scene, ground, nasa) {
    this.g = ground; this.nasa = nasa; this.dirty = [false, false, false];
    (nasa.detail || []).forEach((d, i) => { if (d) d.onTile = () => { this.dirty[i] = true; }; });
    const tx = createMartianPbrTextures(8);
    [tx.colorMap, tx.normalMap, tx.roughnessMap].forEach((t) => { t.repeat.set(1, 1); t.wrapS = t.wrapT = THREE.RepeatWrapping; });
    // ARES colour and roughness; the bump detail is our own rounded-grain regolith (the ARES normal map shows a blocky
    // pattern at walking distance)
    const tex = { color: tx.colorMap, normal: regolith(512).normal, rough: tx.roughnessMap };
    const tint = new THREE.Color(...nasa.tint.map((v) => Math.min(1, v * 1.25 + 0.05)));
    this.levels = [
      { N: 200, s: 1, lod: 0, snap: 16, shadow: true, uv: 18 },
      { N: 200, s: 6, lod: 1, snap: 96, shadow: false, uv: 37 },
      { N: 200, s: 320, lod: 2, snap: 1280, shadow: false, uv: 400 }
    ];
    this.levels.forEach((L, i) => {
      L.lower = i > 0 ? { c: { value: new THREE.Vector2() }, h: { value: 0 }, d: { value: i === 1 ? 2.5 : 6 } } : null;
      const mat = new THREE.MeshStandardMaterial({ map: tex.color, normalMap: tex.normal, normalScale: new THREE.Vector2(0.9, 0.9), roughnessMap: tex.rough, roughness: 0.95, metalness: 0.02, vertexColors: true, color: tint });
      if (i < 2) mat.side = THREE.DoubleSide; // so the edge skirts show from either side
      if (i > 0) { mat.polygonOffset = true; mat.polygonOffsetFactor = i * 2; mat.polygonOffsetUnits = i * 8; }
      // The regolith texture is quite orange; this brings it back to the tan-brown of Mastcam-Z color images.
      if (i < 2) mat.color.setRGB(0.8, 1.22, 1.85).multiplyScalar(0.92);
      if (i === 2) {
        // No texture this far out, so take the texture's average colour into the material: the far ground then matches
        // the near ground instead of showing as a pale band on the horizon.
        mat.map = null; mat.normalMap = null; mat.roughnessMap = null;
        try {
          const im = tx.colorMap.image, c = document.createElement("canvas"); c.width = c.height = 16; const g2 = c.getContext("2d"); g2.drawImage(im, 0, 0, 16, 16);
          const d = g2.getImageData(0, 0, 16, 16).data; let r = 0, gg = 0, b = 0; for (let k = 0; k < d.length; k += 4) { r += d[k]; gg += d[k + 1]; b += d[k + 2]; }
          const lin = (v) => Math.pow(v / 256 / 255, 2.2), avg = new THREE.Color(lin(r), lin(gg), lin(b));
          mat.color.setRGB(0.8, 1.22, 1.85).multiplyScalar(0.92).multiply(avg);
        } catch (_) {}
      }
      curveMaterial(mat, L.lower); groundDetail(mat);
      // each level's shader differs (the coarser ones cut a hole for the finer ones), so they need their own programs:
      // three.js would otherwise reuse level 0's compiled shader for all three, since the hook code is the same
      mat.customProgramCacheKey = () => "ground-level-" + i;
      const geo = new THREE.PlaneGeometry(1, 1, L.N - 1, L.N - 1);
      geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(L.N * L.N * 3), 3));
      geo.setAttribute("ice", new THREE.BufferAttribute(new Float32Array(L.N * L.N), 1));
      const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.receiveShadow = i < 2; m.castShadow = L.shadow; m.renderOrder = i; // nearest first, so the GPU skips hidden pixels
      L.mesh = m; L.cx = L.cz = NaN; scene.add(m);
    });
  }
  build(L, cx, cz, inner, outer) {
    const g = this.g, N = L.N, half = (N - 1) * L.s / 2, geo = L.mesh.geometry, P = geo.attributes.position.array, C = geo.attributes.color.array, U = geo.attributes.uv.array;
    const band = half * 0.18;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, x = cx - half + i * L.s, z = cz - half + j * L.s;
      let h = g.height(x, z, L.lod);
      // Blend toward the next coarser level near the edge so neighbouring grids meet without seams.
      const edge = Math.max(Math.abs(x - cx), Math.abs(z - cz)), t = Math.min(1, Math.max(0, (edge - (half - band)) / band));
      if (t > 0 && L.lod < 2) h = h + ((outer ? this.coarseAt(outer, x, z) : g.height(x, z, L.lod + 1)) - h) * t;
      P[k * 3] = x; P[k * 3 + 1] = h; P[k * 3 + 2] = z;
      U[k * 2] = x / L.uv; U[k * 2 + 1] = z / L.uv;
      this.color(L, C, k, x, z);
    }
    // Hollows (crater bowls, troughs) catch less sky light: darken them a little, so pits read as pits.
    if (L.lod < 2) {
      if (!L.ao) L.ao = new Float32Array(N * N);
      const st = L.lod === 0 ? 2 : 1;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const k = j * N + i, at = (ii, jj) => P[(Math.max(0, Math.min(N - 1, jj)) * N + Math.max(0, Math.min(N - 1, ii))) * 3 + 1];
        const conc = (at(i - st, j) + at(i + st, j) + at(i, j - st) + at(i, j + st)) / 4 - P[k * 3 + 1];
        L.ao[k] = Math.max(0.6, Math.min(1.08, 1 - conc / (L.s * st) * 2.2));
        C[k * 3] *= L.ao[k]; C[k * 3 + 1] *= L.ao[k]; C[k * 3 + 2] *= L.ao[k];
      }
    }
    // A skirt: the outer ring of vertices hangs straight down under the next ring, so no sliver of sky shows where this
    // grid meets the coarser one around it (they sample hills at different spacings, so their edges don't match exactly).
    if (L.lod < 2) {
      const drop = L.lod === 0 ? 12 : 90;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        if (i > 0 && i < N - 1 && j > 0 && j < N - 1) continue;
        const k = j * N + i, ii = Math.min(N - 2, Math.max(1, i)), jj = Math.min(N - 2, Math.max(1, j)), m = jj * N + ii;
        P[k * 3] = P[m * 3]; P[k * 3 + 2] = P[m * 3 + 2]; P[k * 3 + 1] = P[m * 3 + 1] - drop;
      }
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.attributes.uv.needsUpdate = true;
    geo.computeVertexNormals(); geo.computeBoundingSphere();
    if (L.lod < 2) { // the skirt would tilt the normals of the last real ring: give both rings the normals from inside
      const Nn = geo.attributes.normal.array;
      for (const ring of [1, 0]) for (let j = ring; j < N - ring; j++) for (let i = ring; i < N - ring; i++) {
        if (i > ring && i < N - 1 - ring && j > ring && j < N - 1 - ring) continue;
        const k = j * N + i, m = Math.min(N - 3, Math.max(2, j)) * N + Math.min(N - 3, Math.max(2, i));
        Nn[k * 3] = Nn[m * 3]; Nn[k * 3 + 1] = Nn[m * 3 + 1]; Nn[k * 3 + 2] = Nn[m * 3 + 2];
      }
      geo.attributes.normal.needsUpdate = true;
    }
    if (g.R.ice || g.R.frost) {
      const I = geo.attributes.ice.array, Nn = geo.attributes.normal.array;
      for (let k = 0; k < N * N; k++) I[k] = g.iceAt(P[k * 3], P[k * 3 + 2], Nn[k * 3 + 1], Nn[k * 3 + 2]);
      geo.attributes.ice.needsUpdate = true;
    }
    L.cx = cx; L.cz = cz;
    if (L.lower && inner) { L.lower.c.value.set(inner.cx, inner.cz); L.lower.h.value = inner.half - inner.s * 2; }
  }
  // The height of the next coarser grid's surface at (x, z), exactly as its triangles draw it, so this grid's edge can
  // meet it without a gap.
  coarseAt(o, x, z) {
    const half = (o.N - 1) * o.s / 2, fx = (x - (o.cx - half)) / o.s, fz = (z - (o.cz - half)) / o.s, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const H0 = (ii, jj) => { const k = ii + "," + jj; let h = o.cache.get(k); if (h === undefined) { h = this.g.height(o.cx - half + ii * o.s, o.cz - half + jj * o.s, o.lod); o.cache.set(k, h); } return h; };
    if (u + v <= 1) { const a = H0(i, j); return a + (H0(i + 1, j) - a) * u + (H0(i, j + 1) - a) * v; }
    const c = H0(i + 1, j + 1); return c + (H0(i, j + 1) - c) * (1 - u) + (H0(i + 1, j) - c) * (1 - v);
  }
  // Ground color: NASA Viking mosaic for the landscape; near Jezero, real CTX and HiRISE brightness detail on top.
  color(L, C, k, x, z) {
    const g = this.g, ll = toLatLon(x, z), vc = this.nasa.colorAt(ll.lat, ll.lon), base = this.nasa.tint, det = this.nasa.detail && this.nasa.detail[L.lod];
    const df = det ? det.sample(ll.lat, ll.lon) : null;
    const v = df != null ? Math.max(0.5, Math.min(1.55, 1 + (df - 1) * 0.9)) * (0.97 + 0.03 * g.n.noise(x * 0.3, 1.1, z * 0.3)) : 0.9 + 0.2 * g.n.noise(x * 0.02, 4.4, z * 0.02) + 0.08 * g.n.noise(x * 0.3, 1.1, z * 0.3);
    const t = g.R.tint;
    C[k * 3] = Math.min(1.4, (vc[0] / base[0]) * 0.5 + 0.5) * v * t[0]; C[k * 3 + 1] = Math.min(1.4, (vc[1] / base[1]) * 0.5 + 0.5) * v * 0.98 * t[1]; C[k * 3 + 2] = Math.min(1.4, (vc[2] / base[2]) * 0.5 + 0.5) * v * 0.95 * t[2];
  }
  recolor(L) {
    const N = L.N, half = (N - 1) * L.s / 2, geo = L.mesh.geometry, C = geo.attributes.color.array;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; this.color(L, C, k, L.cx - half + i * L.s, L.cz - half + j * L.s); if (L.ao) { C[k * 3] *= L.ao[k]; C[k * 3 + 1] *= L.ao[k]; C[k * 3 + 2] *= L.ao[k]; } }
    geo.attributes.color.needsUpdate = true;
  }
  update(px, pz, force) {
    let changed = false;
    // new imagery tiles arrived: refresh colors (at most one level per frame)
    const di = this.dirty.findIndex((d) => d);
    if (di >= 0 && !force) { this.dirty[di] = false; if (isFinite(this.levels[di].cx)) this.recolor(this.levels[di]); }
    this.levels.forEach((L, i) => {
      const cx = Math.round(px / L.snap) * L.snap, cz = Math.round(pz / L.snap) * L.snap;
      if (force || cx !== L.cx || cz !== L.cz) { L.pending = [cx, cz]; }
    });
    // when a coarser grid moves, the finer one inside rebuilds too, so its edge follows the new coarse surface
    for (let i = this.levels.length - 1; i > 0; i--) { const A = this.levels[i], B = this.levels[i - 1]; if (A.pending && !B.pending && isFinite(B.cx)) B.pending = [B.cx, B.cz]; }
    // rebuild finest first; inner info comes from the level inside
    this.levels.forEach((L, i) => {
      if (!L.pending) return;
      const inner = i > 0 ? this.levels[i - 1] : null;
      const innerInfo = inner ? { cx: inner.pending ? inner.pending[0] : inner.cx, cz: inner.pending ? inner.pending[1] : inner.cz, half: (inner.N - 1) * inner.s / 2, s: inner.s } : null;
      const O = this.levels[i + 1], oc = O ? (O.pending || [O.cx, O.cz]) : null;
      const outerInfo = O && isFinite(oc[0]) ? { cx: oc[0], cz: oc[1], N: O.N, s: O.s, lod: O.lod, cache: new Map() } : null;
      this.build(L, L.pending[0], L.pending[1], innerInfo, outerInfo);
      if (i === 0) changed = true;
    });
    this.levels.forEach((L, i) => { if (i < 2 && this.levels[i + 1].lower && !this.levels[i + 1].pending) { this.levels[i + 1].lower.c.value.set(L.cx, L.cz); this.levels[i + 1].lower.h.value = (L.N - 1) * L.s / 2 - L.s * 2; } });
    this.levels.forEach((L) => (L.pending = null));
    return changed;
  }
}

/* ---------- rocks ----------
   Four kinds, shaped as in the ARES surface-operations build after rocks photographed by Curiosity and Perseverance:
   wedge-shaped layered boulders, flat fractured slabs, angular scree, and pebbles. Their sizes follow the power-law
   spread measured at Mars landing sites (many small, few large), and they gather on fresh crater rims as ejecta. */
function boulderGeo(detail) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), len = Math.hypot(vx, vy, vz) || 1, nx = vx / len, ny = vy / len, nz = vz / len;
    const ridge = valueNoise2D(nx * 2.8 + ny * 1.4 + 4.1, nz * 2.8 - ny * 1.1 + 7.3), step = Math.sin(ny * 16 + nx * 3.5) * 0.045;
    const cleave = Math.abs(nx * 0.65 + ny * 0.45 - nz * 0.35) > 0.58 ? 0.84 : 1, d = (0.76 + ridge * 0.46 + step) * cleave, wedge = ny > 0 ? 1 - ny * 0.22 : 1;
    p.setXYZ(i, vx * d * wedge, vy * d * 0.72, vz * d * wedge);
  }
  g.computeVertexNormals(); return g;
}
function slabGeo() {
  const g = new THREE.CylinderGeometry(1, 1.14, 0.44, 9, 3), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), a = Math.atan2(vz, vx), e = 0.74 + valueNoise2D(Math.cos(a) * 3.1 + 5.2, Math.sin(a) * 3.1 - 2.4) * 0.52, pit = vy > 0.08 ? (valueNoise2D(vx * 3.4 + 2.1, vz * 3.4 - 4.7) - 0.5) * 0.12 : 0;
    p.setXYZ(i, vx * e, vy + pit, vz * e);
  }
  g.computeVertexNormals(); return g;
}
function screeGeo() {
  const g = new THREE.DodecahedronGeometry(1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), n = 0.72 + H(vx * 17.3 + vy * 11.1, vz * 23.7) * 0.55; p.setXYZ(i, vx * n, vy * (0.55 + n * 0.3), vz * n); }
  g.computeVertexNormals(); return g;
}
export class Rocks {
  constructor(scene, ground) {
    this.g = ground; this.list = []; this.hash = new Map();
    const rt = createRockPbrTextures(8);
    const mk = (curve) => { const m = new THREE.MeshStandardMaterial({ map: rt.rockColorMap, normalMap: rt.rockNormalMap, normalScale: new THREE.Vector2(1.6, 1.6), roughnessMap: rt.rockRoughnessMap, roughness: 0.88, metalness: 0.06 }); curveMaterial(m); rockDetail(m); return m; };
    const near = mk(), far = mk();
    const inst = (geo, mat, n, shadow) => { const a = new THREE.InstancedMesh(geo, mat, n); a.castShadow = shadow; a.receiveShadow = true; a.frustumCulled = false; a.count = 0; a.setColorAt(0, new THREE.Color()); scene.add(a); return a; };
    this.kinds = {
      boulder: inst(boulderGeo(3), near, 1500, true), slab: inst(slabGeo(), near, 900, true), scree: inst(screeGeo(), near, 3200, true), pebble: inst(new THREE.IcosahedronGeometry(1, 1), near, 4500, false),
      farBoulder: inst(boulderGeo(1), far, 2600, false), farSlab: inst(slabGeo(), far, 900, false)
    };
  }
  place(cx, cz) {
    const g = this.g, m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    const n = {}; Object.keys(this.kinds).forEach((k) => (n[k] = 0));
    this.list = []; this.hash.clear();
    const add = (k, x, y, z, sx, sy, sz, rot, tx, tz, tint) => {
      const a = this.kinds[k]; if (n[k] >= a.instanceMatrix.count) return false;
      e.set(tx, rot, tz); q.setFromEuler(e); sc.set(sx, sy, sz); p.set(x, y, z); m.compose(p, q, sc); a.setMatrixAt(n[k], m);
      if (tint > 0.7) col.setRGB(0.72 + tint * 0.16, 0.74 + tint * 0.15, 0.78 + tint * 0.16); else col.setRGB(0.84 + tint * 0.24, 0.74 + tint * 0.2, 0.66 + tint * 0.18);
      a.setColorAt(n[k]++, col); return true;
    };
    const collide = (x, z, r, top) => { const o = { x, z, r, top }; this.list.push(o); const key = Math.floor(x / 4) + "," + Math.floor(z / 4); if (!this.hash.has(key)) this.hash.set(key, []); this.hash.get(key).push(o); };
    // near field: every kind, within 150 m
    const C = 1.5, R = 150;
    for (let j = Math.floor((cz - R) / C); j <= Math.floor((cz + R) / C); j++) for (let i = Math.floor((cx - R) / C); i <= Math.floor((cx + R) / C); i++) {
      const x0 = i * C, z0 = j * C, dd0 = Math.hypot(x0 - cx, z0 - cz); if (dd0 > R) continue;
      const rim = dd0 < 110 ? g.rim(x0, z0) : 0, density = 0.085 * g.rockiness(x0, z0) * (1 + 1.8 * rim) * (1 - 0.7 * g.sand(x0, z0));
      if (H(i, j) > density) continue;
      const d = Math.min(2.8, 0.07 * Math.pow(1 - H(j, i) * 0.995, -1 / 1.5) * (1 + rim)), x = x0 + H(i * 1.1, j) * C, z = z0 + H(i, j * 1.3) * C, dd = Math.hypot(x - cx, z - cz);
      if (dd > 40 && d < 0.3) continue; // too small to see from here
      const rot = H(i * 3, j) * 6.28, tint = H(i, j * 12.4), tx = (H(i, j * 2) - 0.5) * 0.4, tz = (H(i * 2, j) - 0.5) * 0.4, gy = g.height(x, z, 0);
      if (d < 0.14) { add("pebble", x, gy, z, d * 0.5, d * 0.32, d * 0.45, rot, tx, tz, tint); continue; }
      if (d < 0.38) { add("scree", x, gy - d * 0.08, z, d * 0.5, d * 0.36, d * 0.5, rot, tx, tz, tint); if (d > 0.24) collide(x, z, d * 0.45, gy + d * 0.28); continue; }
      const slab = H(i * 5.1, j * 0.3) < 0.35, far = dd > 55;
      if (slab) { const sx = d * 0.55, sy = d * 0.22; add(far ? "farSlab" : "slab", x, gy + sy * 0.04, z, sx, sy, sx * (0.8 + tint * 0.4), rot, tx * 0.4, tz * 0.4, tint); collide(x, z, sx * 0.95, gy + sy * 0.3); }
      else { const sx = d * 0.5, sy = d * 0.4; add(far ? "farBoulder" : "boulder", x, gy + sy * 0.12, z, sx, sy, sx * (0.85 + tint * 0.35), rot, tx, tz, tint); collide(x, z, sx * 0.9, gy + sy * 0.9); }
    }
    // dense pebbles right around you
    const PC = 0.55, PR = 24;
    for (let j = Math.floor((cz - PR) / PC); j <= Math.floor((cz + PR) / PC); j++) for (let i = Math.floor((cx - PR) / PC); i <= Math.floor((cx + PR) / PC); i++) {
      const x0 = i * PC, z0 = j * PC; if (Math.hypot(x0 - cx, z0 - cz) > PR || H(i + 0.3, j + 0.7) > 0.05 * (1 - 0.8 * g.sand(x0, z0))) continue;
      const d = 0.03 + 0.08 * H(j + 0.1, i), x = x0 + H(i * 1.7, j) * PC, z = z0 + H(i, j * 1.9) * PC;
      add("pebble", x, g.height(x, z, 0), z, d, d * 0.6, d * 0.85, H(i, j) * 6.28, 0, 0, H(i * 3, j));
    }
    // far field: boulders and slabs out to 900 m, more on crater rims
    const FC = 9;
    for (let j = Math.floor((cz - 900) / FC); j <= Math.floor((cz + 900) / FC); j++) for (let i = Math.floor((cx - 900) / FC); i <= Math.floor((cx + 900) / FC); i++) {
      const x0 = i * FC, z0 = j * FC, dd = Math.hypot(x0 - cx, z0 - cz); if (dd < R || dd > 900) continue;
      if (H(i + 0.5, j + 0.5) > 0.05 * g.rockiness(x0, z0)) continue;
      const d = 0.7 + 2.8 * Math.pow(H(j + 0.5, i), 3), x = x0 + H(i, j + 0.3) * FC, z = z0 + H(i + 0.3, j) * FC, slab = H(i * 2.3, j) < 0.3, y = g.height(x, z, dd < 600 ? 1 : 2);
      add(slab ? "farSlab" : "farBoulder", x, y - d * 0.1, z, d * 0.5, d * (slab ? 0.2 : 0.4), d * 0.5, H(i, j * 5) * 6.28, 0, 0, H(i * 7, j));
    }
    Object.entries(this.kinds).forEach(([k, a]) => { a.count = n[k]; a.instanceMatrix.needsUpdate = true; if (a.instanceColor) a.instanceColor.needsUpdate = true; });
  }
  near4(x, z) { const out = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const l = this.hash.get((Math.floor(x / 4) + i) + "," + (Math.floor(z / 4) + j)); if (l) out.push(...l); } return out; }
}
