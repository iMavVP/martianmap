# Martian Map · Interplanetary Survival Guide

A layered NASA map and crew safety system for the first astronauts on Mars.
Built for the 2026 NASA Space Apps Challenge.

## What you see

1. **Loading screen.** Mars turning on its real 25.2° axis, lit with relief from NASA MOLA elevation and colored by
   NASA Trek's Viking mosaic, with Phobos and Deimos orbiting. The Sun is today's Sun from NASA's Solar Dynamics
   Observatory (visible light, 304 Å and 171 Å), with an animated corona, prominences, coronal mass ejections and solar
   wind. Live facts: distance, radio delay, launch period and the latest Perseverance weather at Jezero.
2. **Solar system navigator.** Every planet at its real position for any date (slider), NASA-textured Earth and Mars,
   NASA Planetary Fact Sheet data, and the Earth-to-Mars launch period with the transfer path drawn. Choose Earth or Mars
   and you go straight there.
3. **The map.** Google Maps for Mars, laid out the same way: search with a directions button, quick chips, a side panel
   with place cards (collapse it with the tab on its edge), a layers tile bottom left, and bottom right only what you
   need all the time: Walk and Drive (the Street View of this map), zoom and recenter. Everything else (safety center,
   3D globe, helmet display, solar system, settings, sources) is in the ☰ menu. On Earth it shows NASA's launch pads, field centers and the three Deep Space
   Network complexes. Pick a pad and launch: a rocket flies you to Mars.
4. **Plan a Marswalk.** The guided path through the whole app in five steps: choose a landing site, read the stacked
   NASA layers, draw a route (a suggestion is ready; at Jezero it follows Perseverance's first real drives), check
   go / no-go in the safety center, then walk the route in first person.
5. **Sharper NASA data at Jezero.** Zooming in switches from Viking (232 m per pixel) to NASA Trek's MRO CTX mosaic
   (about 6 m) and then HiRISE (25 cm), close enough to see boulders, dunes and the rover's tracks. Perseverance's real
   traverse (703 end-of-drive positions, sol 13 to 1980, 45 km, from NASA/JPL) is drawn on the map with each sol.
6. **Rocket hops.** Choose "Rocket hop" in Directions and press "Fly this hop": a rocket flies each leg on a real
   ballistic arc over a round Mars (minimum-energy trajectory under 3.721 m/s²), with launch speed, angle, highest
   point and flight time shown. A 55 km hop climbs about 14 km and takes under 3 minutes.
7. **Walk on Mars, or drive.** The Street View of this map. Press the astronaut button (or the "Walk on Mars" chip, or "Walk here"
   on a landing site or a dropped pin), click any spot on Mars, and you step out there in first person. The ground is
   built from the same NASA layers the map shows (MOLA elevation and the Viking color mosaic) for that exact spot, so
   the craters, hills and crater rims on the horizon are the real ones. Gravity, air pressure and sunlight follow the
   NASA Mars Fact Sheet, and the Sun and Earth sit where they really are in that sky right now. Press **T** to raise
   your EVA tablet: it runs this whole website, fully working, and you can keep walking while you use it.
   "Back to map" returns you to the map at the spot where you stopped.
   Walking a route from Directions draws it on the ground with a light beacon at each stop, and the helmet display
   counts down to the next stop and checks your oxygen margin for the walk back. Your EVA partner (EV2) walks with you,
   as NASA plans EVAs for two. At Jezero the ground under your feet is tinted with real HiRISE and CTX imagery,
   Perseverance's real wheel tracks cross the ground, and the rover stands at its last known position.

## Run it

The app is plain HTML, CSS and JavaScript. There is nothing to build.

1. Open this folder in VS Code and start **Live Server** (or run `python -m http.server 8000` in this folder).
2. Open `http://127.0.0.1:5500/index.html` (Live Server) or `http://localhost:8000`.

It has to run from a web server: Google sign-in and the 3D surface walk don't work from a file opened directly.
To put it online, upload the folder as it is to GitHub Pages, Netlify or Vercel.

## Questions judges may ask

- **"Is the ground real?"** Its shape and colour at every scale NASA has mapped are real: MOLA elevation, the Viking
  colour mosaic, and at Jezero the CTX (6 m) and HiRISE (25 cm) images. Anything smaller than a few hundred metres
  outside Jezero (small craters, ripples, rocks) is generated to match Mars statistics, because no orbiter maps it.
- **"Why drive Perseverance at 14 km/h?"** The rover is driven remotely, the way NASA drives Perseverance. Crew-rover
  speed (like Apollo's lunar rover) makes the demo usable; settings switch to Perseverance's real 4.2 cm/s.
- **"How do you know the physics is right?"** Every constant (gravity, air pressure, scale height, rover mass) is from
  NASA, and the formulas are standard: Froude number for the walk-to-lope speed, μ·N for wheel grip, a numerically
  integrated ballistic arc for rocket hops. The comments in the code show each one.

## Put it online (free)

**GitHub Pages** (recommended: free, https, works with Google sign-in and offline mode):
1. Create a public repository on GitHub and upload the contents of this folder (so `index.html` is at the top level).
2. In the repository: Settings → Pages → Source: "Deploy from a branch", Branch: `main`, folder `/ (root)` → Save.
3. After a minute the site is live at `https://<your-username>.github.io/<repository-name>/`.
4. Google sign-in: in Google Cloud Console → APIs & Services → Credentials → your OAuth client, add
   `https://<your-username>.github.io` under "Authorized JavaScript origins". Without it, sign-in is refused on the live
   site (everything else works).

**Netlify Drop** is the fastest alternative: drag this folder onto https://app.netlify.com/drop. Add the Netlify address
to the Google OAuth origins the same way.

Before demo day: open the live site once, then Settings → "Save Jezero for offline use". The map, the CTX/HiRISE
close-ups and the surface walk at Jezero then work even if the venue Wi-Fi drops. Replace `DEMO_KEY` in
`js/config.js` with a free personal NASA API key from https://api.nasa.gov/ (the demo key allows about 30 requests an hour).

## Settings (`js/config.js`)

| Setting | What it does |
| --- | --- |
| `googleClientId` | Your Google OAuth client ID. Public by design. Never put the client secret in this project. |
| `nasaApiKey` | Key for NASA's DONKI space weather lookup. `DEMO_KEY` works (about 30 requests an hour). A free personal key from https://api.nasa.gov/ is better for demo day. |
| `spaceWeather` | Set to `false` to switch the DONKI lookup off. |

### Making Google sign-in work

In the Google Cloud console, open your OAuth client and add every address the site is served from under
**Authorized JavaScript origins**, for example `http://localhost:8000` and `https://your-site.example`.
Google sign-in confirms who the user is. Accounts, crews, chat and SOS alerts are still stored in the
browser, and live crew sync only works between tabs of one browser. Sharing between devices uses expedition codes.

## How it answers the challenge

| The challenge asks for | Where it is in the app |
| --- | --- |
| A layered view from several NASA missions | Map layers: Viking color (optical), MOLA relief and elevation (topographic), THEMIS day and night (thermal), TES albedo (spectral). One-tap stacks: Safe EVA, Climb & cold, Dust & solar. |
| At least three kinds of data | Optical, topographic, thermal and spectral, plus radiation and space weather in the safety center. |
| Science goals and a location | A mission brief for each of the 9 landing sites, such as boxwork formations on Mount Sharp. |
| A route that accounts for the suit | Route tool: walking, rover or hop, terrain factor, suit hours, round trip, buddy team. |
| Astronaut safety first | Safety center (shield button), described below. |
| Updates on current conditions | Local Mars solar time, daylight left, season, dust season, Earth link delay, live solar flare alerts. |
| HUD format | HUD button: heading, target, EVA clock, check-in timer, sunset countdown, way back to shelter, flashing warnings. |
| Point-of-view imagery | Latest Perseverance raw images at Jezero, and Curiosity's Mount Sharp path animation. |
| Rovers and working in pairs | Pressurized rover mode, walk-back ring, buddy rule in the go / no-go check. |

## The safety center

Open it with the red shield button. It has four tabs.

- **Conditions.** Mars local solar time, sunrise, sunset and daylight left at your site. Season and dust
  storm season. Typical radiation dose. Live solar flare and particle-event status. Distance and radio delay
  to Earth, with a solar conjunction warning. Hazard ratings for the site or region.
- **Go / No-Go.** Seven automatic checks (suit endurance, turn-back distance, buddy rule, daylight,
  dust season, space weather, Earth link) and a 15-item crew checklist. The verdict is NO-GO, HOLD,
  GO WITH CAUTION or GO. "Copy safety plan" puts the whole plan on the clipboard.
- **Supplies.** Oxygen, water and power per person and per team with a reserve, the turn-back time,
  the radiation dose for the EVA, the walk-back ring (also drawn on the map), and an elevation profile
  of the route read from NASA MOLA tiles.
- **Emergency.** Bearing, distance and walking time back to shelter (stop A), an SOS broadcast to the
  crew chat, and ten step-by-step protocols: suit leak, solar storm, dust storm, lost communications,
  crewmate down, oxygen or CO2 alarm, overheating or cold, rover breakdown, lost, and falls.

### Where the numbers come from

| Number | Source |
| --- | --- |
| Mars sol date, solar time, season (Ls), sunrise and sunset, Earth distance | Allison & McEwen (2000), the algorithm behind NASA GISS Mars24. Checked against the published reference values and the 2025 and 2027 oppositions. |
| Surface radiation, 0.64 mSv per day | Curiosity RAD average (Hassler et al. 2014). |
| Solar flares and particle events | NASA DONKI, last 7 days. Observed from Earth, so it is early warning for Mars, not a forecast. |
| Elevation along the route | NASA Trek 8-bit MOLA elevation mosaic. About 460 m per pixel and 115 m per height step, so values are approximate. |
| Oxygen 0.08 kg, water 0.25 L, power 90 Wh per person per hour | Planning assumptions for moderate work. Replace them with real suit numbers. |
| Walking 2.5 km/h, rover 14 km/h, terrain factors | Planning assumptions set in `js/routes.js`. |
| Planet positions in the navigator | NASA JPL "Keplerian Elements for Approximate Positions of the Major Planets" (valid 1800 to 2050). Checked against the 2025 and 2027 oppositions and the January 2026 conjunction. |
| Launch period | Planet geometry: Mars 20° to 58° ahead of Earth, the range real missions such as Curiosity, InSight and Perseverance launched in. Approximate. Real dates come from trajectory design. |
| Planet facts and axial tilts | NASA Planetary Fact Sheet. |
| The Sun | NASA SDO latest full-disk images (HMI intensitygram, AIA 304 Å, AIA 171 Å), loaded live. A drawn Sun is shown if they can't load. |
| Mars relief on the loading screen | NASA Trek MOLA elevation, used as a bump map so craters and volcanoes catch the light. |
| Earth's night side | NASA GIBS VIIRS Black Marble city lights. |
| Jezero weather | Perseverance MEDA, from the mars.nasa.gov weather feed. Hidden if the feed can't be reached. |
| NASA facility locations | Public NASA and U.S. Space Force locations, accurate to about 100 m. |

The galaxy, star field, Sun glare and the outer planets' surfaces on the loading screen and navigator are drawn by code.
All imagery of Mars and Earth comes from NASA Trek and NASA GIBS (Worldview). Fonts load from Google Fonts and fall back to
system fonts offline.

### Honest limits

- The emergency protocols and the checklist are concept procedures modeled on how NASA trains spacewalkers.
  They are not official NASA flight rules.
- Hazard ratings are judgments based on what each mission met on the ground. Regions with no lander get an
  estimate from latitude and terrain type.
- There is no live surface weather feed (temperature, wind, dust opacity) in this build.
- DONKI is a NASA source beyond the five challenge references. Turn it off in `js/config.js` if your team
  wants to stay strictly within those five.

## Walk on Mars (surface EVA)

| Key | Action |
| --- | --- |
| Mouse | Look (click the view to capture the mouse, Esc for the menu) |
| W A S D | Walk. Shift lopes (the bounding run Apollo crews used), Space jumps |
| V | First or third person (see your suit) |
| F | Take the rover's controls when you're within 6 m of it, and back to your suit |
| T | Raise or stow the tablet. With it up: W A S D still walk, Q and E turn, hold the right mouse button off the tablet to look |
| L, H, M | Helmet lamps, helmet display, suit sound |
| [ and ], \\ | Move the clock 30 Mars minutes, back to real local time |

The settings panel (gear, or Esc) has mouse sensitivity, field of view, invert mouse, hold or toggle running, graphics
quality (Automatic lowers the resolution if the computer can't keep up), head bob, the helmet display, sound volume and
the time of day.

Physics on Mars: g = 3.721 m/s² (NASA Mars Fact Sheet). A jump that rises 0.16 m on Earth rises 0.41 m here and keeps
you in the air almost a second. Walking turns into a lope at 1.29 m/s, the Froude-number transition for Mars gravity
(2.10 m/s on Earth). Grip is lower, so you speed up and stop more slowly. Slopes steeper than 32°, the angle of repose
of loose sand, can't be climbed. Kicked-up dust flies on ballistic arcs. Air pressure on the helmet display follows the
spot's MOLA elevation with the Fact Sheet's 11.1 km scale height.

**The rover** (Drive here, Drive this route, or F next to it) is the Perseverance-class six-wheel rover from the
ARES recon build. Its physics works from forces at the wheels: weight on Mars (1,025 kg × 3.721 m/s²), grip limited
to μ × normal force (wheels slip beyond it), rolling resistance and sinkage that change with the ground (loose sand in
ripple fields, dusty regolith, rocky crater ejecta, bedrock on steep slopes), slope pull, rocker-bogie suspension
following each wheel over rocks, and a 45° tip-over limit. Speed is either crew-rover speed (up to 14 km/h, like
Apollo's lunar rover) or Perseverance's real 4.2 cm/s. W S throttle, A D steer, Space brake, C chase or mast camera,
L headlights.

**Every region looks and walks differently** (`js/eva/regions.js`). The start point is classed from its position and
from how rugged MOLA says the surrounding kilometres are: smooth northern plains, cratered southern highlands, the
mountain rings of Hellas and Argyre, Mount Sharp's layered slopes, young blocky lava with few craters on Olympus Mons and
the Tharsis volcanoes, the layered walls of Valles Marineris, and the polar ice caps (bright water and CO2 ice with dusty
layers, spiral troughs about 250 m deep, Swiss-cheese pits on the south cap, frost on pole-facing slopes and falling
snow, which Phoenix saw at 68° N and Mars Climate Sounder detected in the polar night). Mars's great mountains are wide:
Olympus Mons rises 21.9 km but its flanks average about 5°, so from its slopes it looks like a vast tilted plain, as it
would to a real astronaut.

**Walking physics.** Speed on slopes follows Tobler's hiking function (fastest slightly downhill, much slower uphill);
sand, rubble and ice slow you down and change grip (ice μ 0.3, so it gets slippery above about 17°); steep crater
walls are climbed at a scramble and only slopes past the limit make you slide; loping is only possible on gentle,
non-icy ground; a hard landing makes you stumble. The suit's work rate (Pandolf load-carriage equation scaled to Mars
gravity, about 230 W on flat ground like the Apollo moonwalks) sets how fast oxygen is used.

**From the ARES builds:** the spacesuit (third person and EV2), the ground and rock textures, the four rock shapes
(layered boulders, slabs, scree, pebbles), the night sky (Milky Way, Sun corona, Phobos and Deimos), drifting dust,
the rover model and rock climbing (Space next to a knee-to-chest-high rock). Walking speeds stay at the realistic
suited values rather than the ARES game's faster ones.

What is NASA data and what is generated: the large-scale ground (anything bigger than a few hundred metres), its color,
the Sun, Earth, gravity and air come from NASA. Small craters, ripples, pebbles and boulders are generated to match the
look of Mars landing sites, because no orbital map is that sharp. NASA's MOLA tiles store height in 8-bit steps (about
115 m each), so they are smoothed; small crater rims are therefore softer than in reality. Temperatures are an estimate
built from Perseverance's MEDA readings at Jezero. If NASA Trek can't be reached, the ground shape is modeled and the
loading screen says so.

## NASA sources

- NASA Trek CTX and HiRISE mosaics of Jezero (layers `Jezero_CTX_BlockAdj_dd`, `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd`)
- Perseverance traverse: NASA/JPL Mars 2020 MMGIS waypoints (https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json), stored as a snapshot because that service doesn't allow other websites to load it

- NASA Trek Mars: https://trek.nasa.gov/mars/
- USGS Astrogeology Mars maps: https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars
- Curiosity's proposed path up Mount Sharp: https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/
- NASA Worldview: https://worldview.earthdata.nasa.gov/
- Perseverance raw images: https://mars.nasa.gov/mars2020/multimedia/raw-images/
- NASA DONKI space weather (optional): https://api.nasa.gov/

## Files

| File | What it holds |
| --- | --- |
| `index.html`, `css/app.css` | Page and styles |
| `js/data.js` | Layers, the 30 regions, the 9 landing sites |
| `js/config.js` | Your keys and settings |
| `js/app.js` | Maps, layers, regions, search |
| `js/routes.js` | Route tool and EVA budget |
| `js/safety.js` | Safety center, Mars clock, hazards, protocols |
| `js/mission.js` | Mission briefs, HUD, loading screen |
| `js/crew.js` | Accounts, Google sign-in, crews, chat, SOS |
| `js/sky.js` | NASA texture loading, globe renderer, JPL planet positions, launch period, fact sheet |
| `js/globe.js` | Loading screen and the settings panel |
| `js/solar.js` | Solar system navigator |
| `js/launch.js` | NASA launch pads, centers and Deep Space Network, and the flight animation |
| `js/globe3d.js` | 3D globe view on the map |
| `css/ui.css` | Mission console theme shared by every screen |
| `js/walk.js` | Walk on Mars: the astronaut button, picking a spot, opening and closing the surface EVA |
| `js/embed.js` | Tablet mode: the website as it runs on the astronaut's tablet |
| `eva.html`, `css/eva.css` | The surface EVA page |
| `js/eva/` | Surface EVA: `main.js` (controls, physics, HUD, settings), `terrain.js` (NASA ground, rocks), `sky.js`, `mars.js` (Mars time, Sun and Earth positions), `astronaut.js` (suit arms, gloves, tablet), `audio.js` (suit sounds) |
| `vendor/leaflet` | Leaflet 1.9.4 map library |
| `vendor/three` | three.js r160 (3D for the surface EVA) |
| `js/plan.js` | Plan a Marswalk, the five-step guided flow |
| `js/detail.js`, `js/m20-traverse.js` | Jezero CTX and HiRISE layers; Perseverance's traverse (NASA/JPL MMGIS waypoints snapshot) |
| `js/eva/drive.js` | The rover and its surface-aware physics |
| `js/eva/ares/` | Code from the two ARES builds (suit, sky, textures, rocks, rover model), converted to run here |
| `js/hop.js` | Rocket hop: ballistic trajectory and the animation on the map |
| `js/eva/extras.js` | Rover, wheel tracks, your route on the ground, and your EVA partner |
| `sw.js` | Offline support: keeps the app and NASA tiles you've used |
| `DEMO.md` | A two-minute demo script for judging |
