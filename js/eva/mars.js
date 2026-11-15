/* Mars constants, Mars time and the sky above the landing site, all from NASA sources.
   - Gravity, radius, atmosphere: NASA Mars Fact Sheet (NSSDCA).
   - Planet positions: NASA JPL "Keplerian Elements for Approximate Positions of the Major Planets".
   - Mars orientation (north pole and prime meridian): IAU WGCCRE report, as used by NASA JPL and NAIF.
   - Mars sol date and local solar time: Allison & McEwen (2000), the algorithm behind NASA GISS Mars24. */

export const MARS = {
  g: 3.721,            // surface gravity, m/s²  (Earth 9.807)
  R: 3389500,          // mean radius, m
  air: 0.020,          // surface air density, kg/m³ (Earth 1.217)
  pressure: 610,       // mean surface pressure, Pa
  sunAngle: 0.35,      // apparent diameter of the Sun, degrees (0.53 from Earth)
  sunlight: 0.43       // sunlight compared with Earth at the same Sun angle
};
export const EARTH_G = 9.807;
// Where the EVA starts: eva.html?lat=..&lon=..&name=.. (chosen on the Mars map). Default: Octavia E. Butler Landing,
// where Perseverance touched down in Jezero crater. Latitude stays inside 85 degrees, where the local flat map holds.
const _q = new URLSearchParams(location.search), _n = (k, d) => { const v = parseFloat(_q.get(k)); return isFinite(v) ? v : d; };
const _lat = Math.max(-85, Math.min(85, _n("lat", 18.4447))), _lon = ((_n("lon", 77.4508) + 540) % 360) - 180;
export const SITE = { id: _q.get("site") || (_q.has("lat") ? "" : "perseverance"), name: (_q.get("name") || (_q.has("lat") ? "" : "Jezero crater")).slice(0, 60), lat: _lat, lon: _lon };

const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI, mod = (a, n) => ((a % n) + n) % n;
const DAY = 864e5;
const EL = {
  earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]
};
function helio(id, t) {
  const e = EL[id], T = (t / DAY + 2440587.5 - 2451545) / 36525;
  const [a, ec, I, L, wb, Om] = [0, 1, 2, 3, 4, 5].map((i) => e[i] + e[i + 6] * T);
  const w = rad(wb - Om), O = rad(Om), inc = rad(I);
  const M = rad(mod(L - wb + 180, 360) - 180); let E = M + ec * Math.sin(M);
  for (let k = 0; k < 8; k++) E -= (E - ec * Math.sin(E) - M) / (1 - ec * Math.cos(E));
  const xp = a * (Math.cos(E) - ec), yp = a * Math.sqrt(1 - ec * ec) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(inc), sI = Math.sin(inc);
  return [(cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp, (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp, sw * sI * xp + cw * sI * yp];
}

// Mars24: sol date, local mean and true solar time, solar longitude (season).
export function marsTime(t, lonE) {
  const jdTT = t / DAY + 2440587.5 + 69.184 / 86400, dt = jdTT - 2451545.0;
  const Mm = mod(19.3871 + 0.52402073 * dt, 360), aFMS = mod(270.3871 + 0.524038496 * dt, 360);
  const PB = [[0.0071, 2.2353, 49.409], [0.0057, 2.7543, 168.173], [0.0039, 1.1177, 191.837], [0.0037, 15.7866, 21.736], [0.0021, 2.1354, 15.704], [0.0020, 2.4694, 95.528], [0.0018, 32.8493, 49.095]];
  const pbs = PB.reduce((s, [A, tau, phi]) => s + A * Math.cos(rad(0.985626 * dt / tau + phi)), 0);
  const m = rad(Mm), vM = (10.691 + 3e-7 * dt) * Math.sin(m) + 0.623 * Math.sin(2 * m) + 0.050 * Math.sin(3 * m) + 0.005 * Math.sin(4 * m) + 0.0005 * Math.sin(5 * m) + pbs;
  const ls = mod(aFMS + vM, 360), L = rad(ls);
  const eot = 2.861 * Math.sin(2 * L) - 0.071 * Math.sin(4 * L) + 0.002 * Math.sin(6 * L) - vM;
  const msd = (jdTT - 2405522.0028779) / 1.0274912517, mtc = mod(24 * msd, 24);
  const lmst = mod(mtc + lonE / 15, 24), ltst = mod(lmst + eot / 15, 24);
  return { msd, sol: Math.floor(msd), ltst, lmst, ls, season: ["northern spring", "northern summer", "northern autumn", "northern winter"][Math.floor(ls / 90) % 4] };
}

// Directions to the Sun and Earth in the local sky at (lat, lonE), as [east, north, up] unit vectors.
export function skyDirs(t, lat, lonE) {
  const d = t / DAY + 2440587.5 - 2451545, T = d / 36525;
  const m = helio("mars", t), e = helio("earth", t);
  const eps = rad(23.4392911), ce = Math.cos(eps), se = Math.sin(eps);
  const toEq = (v) => [v[0], v[1] * ce - v[2] * se, v[1] * se + v[2] * ce];
  const a0 = rad(317.68143 - 0.1061 * T), d0 = rad(52.88650 - 0.0609 * T), W = rad(mod(176.630 + 350.89198226 * d, 360));
  const P = [Math.cos(d0) * Math.cos(a0), Math.cos(d0) * Math.sin(a0), Math.sin(d0)], N = [-Math.sin(a0), Math.cos(a0), 0];
  const PxN = [P[1] * N[2] - P[2] * N[1], P[2] * N[0] - P[0] * N[2], P[0] * N[1] - P[1] * N[0]];
  const X = N.map((n, i) => n * Math.cos(W) + PxN[i] * Math.sin(W)), Y = [P[1] * X[2] - P[2] * X[1], P[2] * X[0] - P[0] * X[2], P[0] * X[1] - P[1] * X[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const la = rad(lat), lo = rad(lonE);
  const U = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)], E = [-Math.sin(lo), Math.cos(lo), 0], Nn = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  const local = (vEcl) => { const q = toEq(vEcl), L = Math.hypot(...q), b = [dot(q, X) / L, dot(q, Y) / L, dot(q, P) / L]; return [dot(b, E), dot(b, Nn), dot(b, U)]; };
  const toEarth = [e[0] - m[0], e[1] - m[1], e[2] - m[2]];
  return { sun: local([-m[0], -m[1], -m[2]]), earth: local(toEarth), sunAU: Math.hypot(...m), earthAU: Math.hypot(...toEarth) };
}

export const fmtTime = (h) => { const mm = Math.round(mod(h, 24) * 60) % 1440; return String(Math.floor(mm / 60)).padStart(2, "0") + ":" + String(mm % 60).padStart(2, "0"); };
export const altAz = (v) => ({ alt: deg(Math.asin(Math.max(-1, Math.min(1, v[2])))), az: mod(deg(Math.atan2(v[0], v[1])), 360) });
