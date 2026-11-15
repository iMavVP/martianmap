/* What kind of Martian ground the EVA starts on, so every region looks and walks differently, as on Earth.
   The large shapes (Olympus Mons, the walls of Valles Marineris, the polar domes) come from NASA MOLA elevation. MOLA
   pixels are about 460 m across, so everything smaller is generated, at the strength each kind of terrain shows in
   NASA HiRISE and CTX images and in MOLA roughness maps (Kreslavsky & Head): the northern plains are among the
   smoothest surfaces in the solar system, the southern highlands, basin rims and canyon walls are among the roughest.
   Feature positions and sizes are from the USGS Gazetteer of Planetary Nomenclature. */

const D2R = Math.PI / 180;
// Great-circle angle in degrees between two points on Mars.
const ang = (la1, lo1, la2, lo2) => {
  const a = Math.sin((la2 - la1) * D2R / 2) ** 2 + Math.cos(la1 * D2R) * Math.cos(la2 * D2R) * Math.sin((lo2 - lo1) * D2R / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a))) / D2R;
};
const KM_PER_DEG = 59.16;

// [name, lat, lon (east), radius in km]
const VOLCANOES = [
  ["Olympus Mons", 18.65, -133.8, 300, 40], ["Ascraeus Mons", 11.92, -104.08, 230, 30], ["Pavonis Mons", 1.48, -112.96, 190, 25],
  ["Arsia Mons", -8.26, -120.09, 220, 60], ["Elysium Mons", 25.02, 147.21, 120, 7], ["Alba Mons", 40.5, -109.6, 500, 60],
  ["Hecates Tholus", 32.12, 150.24, 90, 6], ["Tharsis Tholus", 13.4, -90.8, 80, 15], ["Syrtis Major volcano", 8.4, 66.4, 300, 25]
];
const BASINS = [["Hellas Planitia", -42.4, 70.5, 1150], ["Argyre Planitia", -49.7, -43.4, 400]];
const MASSIFS = [["Aeolis Mons (Mount Sharp)", -5.08, 137.85, 45], ["Holden crater rim", -26.0, -34.0, 80]];

export function regionAt(lat, lon, nasa) {
  const R = {
    kind: "plains", name: "Plains", hills: 5, mount: 0, mountWave: 2600, crater: 1, rock: 1, lava: 0, layers: 0, ice: 0, frost: 0,
    snow: 0, troughs: 0, pits: 0, sand: 1, tint: [1, 1, 1], showcase: true, note: ""
  };
  const north = lat > 0;
  // Equatorial plains still carry knobs, mesas and streamlined hills (Pathfinder's Twin Peaks are about 30 m high, 1 km
  // away); the far-northern lowlands are the smoothest ground on Mars.
  if (lat < 30) Object.assign(R, { hills: 10, mount: 30, mountWave: 1600 }); else Object.assign(R, { hills: 6, mount: 10 });
  // Old, battered southern highlands: rolling hills and knobs between craters.
  if (!north || lat < 8) { const e = nasa.siteElevation || 0; if (e > 500 && lat < 8) Object.assign(R, { kind: "highlands", name: "Cratered highlands", hills: 22, mount: 90, crater: 1.6, rock: 1.25 }); }
  // Mid and high latitudes: ground ice under a smooth dusty mantle, frost on pole-facing slopes on cold mornings.
  if (Math.abs(lat) > 45) Object.assign(R, { frost: Math.min(1, (Math.abs(lat) - 45) / 25), hills: Math.max(R.hills, 8), sand: 0.5, note: "ground ice below the dust" });
  if (Math.abs(lat) > 60) Object.assign(R, { snow: 0.35, note: "snow observed falling here by Phoenix (68° N)" });
  for (const [name, la, lo, rkm] of BASINS) {
    const r = ang(lat, lon, la, lo) * KM_PER_DEG / rkm;
    if (r > 0.8 && r < 1.35) Object.assign(R, { kind: "mountains", name: name.split(" ")[0] + " rim mountains", hills: 40, mount: 420, mountWave: 3200, crater: 0.9, rock: 1.7, layers: 0 });
  }
  for (const [name, la, lo, rkm] of MASSIFS) {
    const r = ang(lat, lon, la, lo) * KM_PER_DEG / rkm;
    if (r < 1.6) Object.assign(R, { kind: "mountains", name, hills: 30, mount: 300, mountWave: 2400, layers: 18, crater: 0.7, rock: 1.5 });
  }
  for (const [name, la, lo, rkm, cal] of VOLCANOES) {
    const dk = ang(lat, lon, la, lo) * KM_PER_DEG;
    if (dk < rkm) Object.assign(R, {
      kind: "volcano", name: dk < cal ? name + " caldera" : name + " lava flows", hills: dk < cal ? 25 : 12, mount: dk < cal ? 140 : 35, mountWave: 1800,
      lava: 1, crater: 0.35, rock: 1.7, sand: 0.3, tint: [0.62, 0.58, 0.6], layers: dk < cal ? 22 : 0, note: "young basalt: few craters, blocky lava"
    });
  }
  // Valles Marineris: canyon walls of layered rock, landslides and spurs, up to 7 km deep.
  if (lat > -16 && lat < -2 && lon > -96 && lon < -30) Object.assign(R, { kind: "canyon", name: "Valles Marineris", hills: 40, mount: 260, mountWave: 2000, layers: 30, crater: 0.5, rock: 1.6, tint: [1.05, 0.98, 0.95] });
  // Polar layered deposits: kilometres of water ice and dust. Spiral troughs about 500 m deep cut the domes, and their
  // walls show the layers. The south cap's top is CO2 ice pitted into "Swiss cheese" terrain. In polar winter CO2 snow
  // falls (Mars Climate Sounder, Hayne et al. 2012).
  const northCap = lat > 80, southCap = ang(lat, lon, -87, -45) < 4.5, southPLD = lat < -76;
  if (northCap || southCap || southPLD) Object.assign(R, {
    kind: "ice", name: northCap ? "Planum Boreum ice cap" : southCap ? "South polar residual cap" : "Planum Australe ice",
    hills: 14, mount: 0, troughs: 260, layers: 9, ice: southPLD && !southCap ? 0.75 : 1, frost: 1, snow: 1, crater: 0.12, rock: 0.15, sand: 0,
    pits: southCap ? 1 : 0, showcase: false, note: northCap ? "water ice, layered with dust" : "CO₂ and water ice"
  });
  // MOLA tells how rugged the kilometres around the site are: steep, broken ground gets rougher detail too.
  if (nasa.heightAt) {
    let s = 0, s2 = 0, n = 0;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const h = nasa.heightAt(lat + j * 0.06, lon + i * 0.06 / Math.max(0.2, Math.cos(lat * D2R))); s += h; s2 += h * h; n++; }
    R.rugged = Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
    R.mount += Math.min(260, R.rugged * 0.18); R.hills += Math.min(30, R.rugged * 0.03);
  }
  return R;
}
