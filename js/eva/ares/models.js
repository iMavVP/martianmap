import * as THREE from 'three';
import { getTerrainHeight } from './terrain.js';

function makeSolarTexture(maxAnisotropy        )                      {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d') ;
  ctx.fillStyle = '#0d1e3a';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#3878c4';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  ctx.strokeStyle = '#7bb8f5';
  ctx.lineWidth = 1;
  for (let i = 16; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makeHabHullTexture(maxAnisotropy        )                      {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d') ;
  ctx.fillStyle = '#dad4cc';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#9b9389';
  ctx.lineWidth = 3;
  for (let x = 0; x <= 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#c85028';
  ctx.fillRect(0, 178, 512, 18);
  ctx.fillStyle = '#252930';
  ctx.fillRect(0, 198, 512, 6);

  const grad = ctx.createLinearGradient(0, 190, 0, 256);
  grad.addColorStop(0, 'rgba(155, 70, 42, 0)');
  grad.addColorStop(1, 'rgba(155, 70, 42, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 190, 512, 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function makeSuitFabricTextures()   
                              
                            
                               
                              
                                
  {
  // 1. Quilted TMG thermal fabric albedo + bump
  const sz = 256;
  const aCan = document.createElement('canvas');
  aCan.width = sz;
  aCan.height = sz;
  const aCtx = aCan.getContext('2d') ;

  const bCan = document.createElement('canvas');
  bCan.width = sz;
  bCan.height = sz;
  const bCtx = bCan.getContext('2d') ;

  aCtx.fillStyle = '#e7e5df';
  aCtx.fillRect(0, 0, sz, sz);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, sz, sz);

  // Ripstop micro-weave + fabric folds/creases
  for (let y = 0; y < sz; y += 4) {
    aCtx.fillStyle = y % 8 === 0 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
    aCtx.fillRect(0, y, sz, 2);
    bCtx.fillStyle = y % 16 === 0 ? 'rgba(40,40,40,0.45)' : 'rgba(210,210,210,0.22)';
    bCtx.fillRect(0, y, sz, 3);
  }
  for (let x = 0; x < sz; x += 4) {
    aCtx.fillStyle = 'rgba(0,0,0,0.02)';
    aCtx.fillRect(x, 0, 1, sz);
  }
  // Quilted diagonal & seam lines
  aCtx.strokeStyle = 'rgba(130, 124, 118, 0.35)';
  aCtx.lineWidth = 2;
  bCtx.strokeStyle = '#303030';
  bCtx.lineWidth = 3;
  for (let y = 32; y < sz; y += 64) {
    aCtx.beginPath();
    aCtx.moveTo(0, y);
    aCtx.lineTo(sz, y);
    aCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.lineTo(sz, y);
    bCtx.stroke();
  }

  const albedo = new THREE.CanvasTexture(aCan);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;

  const bump = new THREE.CanvasTexture(bCan);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;

  // 2. PLSS Tactical/Thermal Backpack Texture (webbing + recessed panels)
  const pCan = document.createElement('canvas');
  pCan.width = 256;
  pCan.height = 256;
  const pCtx = pCan.getContext('2d') ;
  pCtx.fillStyle = '#d4d0c8';
  pCtx.fillRect(0, 0, 256, 256);
  // Horizontal tactical webbing strips
  pCtx.fillStyle = '#8b8780';
  for (let y = 26; y < 230; y += 28) {
    pCtx.fillRect(18, y, 220, 8);
  }
  // Recessed equipment modules
  pCtx.fillStyle = '#2f343a';
  pCtx.fillRect(92, 46, 72, 42);
  pCtx.fillRect(92, 112, 72, 42);
  pCtx.strokeStyle = '#60666e';
  pCtx.lineWidth = 3;
  pCtx.strokeRect(92, 46, 72, 42);
  pCtx.strokeRect(92, 112, 72, 42);
  // Circular O2 valve dial
  pCtx.fillStyle = '#1e2226';
  pCtx.beginPath();
  pCtx.arc(128, 184, 18, 0, Math.PI * 2);
  pCtx.fill();
  pCtx.strokeStyle = '#9aa0a8';
  pCtx.stroke();

  const plssTex = new THREE.CanvasTexture(pCan);
  plssTex.colorSpace = THREE.SRGBColorSpace;

  // 3. Chest DCM (Display & Control Module)
  const dCan = document.createElement('canvas');
  dCan.width = 128;
  dCan.height = 128;
  const dCtx = dCan.getContext('2d') ;
  dCtx.fillStyle = '#cfcac2';
  dCtx.fillRect(0, 0, 128, 128);
  dCtx.fillStyle = '#182228';
  dCtx.fillRect(14, 16, 100, 34);
  dCtx.fillStyle = '#45f2ff';
  dCtx.fillRect(20, 24, 52, 8);
  dCtx.fillStyle = '#35ff8a';
  dCtx.fillRect(20, 36, 34, 6);
  // Toggle switches & knobs
  dCtx.fillStyle = '#40454d';
  for (let x = 22; x <= 96; x += 24) {
    dCtx.fillRect(x, 66, 12, 20);
  }
  dCtx.fillStyle = '#d43b24';
  dCtx.fillRect(20, 98, 36, 14);
  dCtx.fillStyle = '#2472d4';
  dCtx.fillRect(72, 98, 36, 14);

  const dcmTex = new THREE.CanvasTexture(dCan);
  dcmTex.colorSpace = THREE.SRGBColorSpace;

  // 4. Shoulder Mission Flag/Patch
  const fCan = document.createElement('canvas');
  fCan.width = 64;
  fCan.height = 40;
  const fCtx = fCan.getContext('2d') ;
  fCtx.fillStyle = '#ffffff';
  fCtx.fillRect(0, 0, 64, 40);
  fCtx.fillStyle = '#b92b27';
  for (let y = 0; y < 40; y += 8) fCtx.fillRect(0, y, 64, 4);
  fCtx.fillStyle = '#1c3a70';
  fCtx.fillRect(0, 0, 28, 22);

  const patchTex = new THREE.CanvasTexture(fCan);
  patchTex.colorSpace = THREE.SRGBColorSpace;

  return { albedo, bump, plssTex, dcmTex, patchTex };
}

function makeMartianVisorEnvMap(sunDir               )                      {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d') ;

  // 1. Sky-to-horizon-to-regolith equirectangular sphere (matches Apollo/EMU visor high-contrast reflection!)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.54);
  skyGrad.addColorStop(0.0, '#160d0c'); // dark high-altitude Martian zenith
  skyGrad.addColorStop(0.45, '#4b271e');
  skyGrad.addColorStop(0.82, '#aa5b3e');
  skyGrad.addColorStop(1.0, '#eab286'); // bright dusty horizon scatter
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, Math.ceil(h * 0.54));

  const groundGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
  groundGrad.addColorStop(0.0, '#e39e6d');
  groundGrad.addColorStop(0.18, '#b8633d');
  groundGrad.addColorStop(0.65, '#7e3c26');
  groundGrad.addColorStop(1.0, '#3a1b13');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, Math.floor(h * 0.5), w, Math.ceil(h * 0.5));

  // Distant mesa/crater silhouettes along the horizon band
  ctx.fillStyle = 'rgba(72, 33, 22, 0.55)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.52);
  for (let x = 0; x <= w; x += 8) {
    const t = (x / w) * Math.PI * 2;
    const ridge = Math.sin(t * 3 + 0.6) * 5 + Math.cos(t * 7 - 1.1) * 3 + Math.sin(t * 13) * 1.5;
    ctx.lineTo(x, h * 0.5 - Math.max(0, ridge));
  }
  ctx.lineTo(w, h * 0.54);
  ctx.lineTo(0, h * 0.54);
  ctx.closePath();
  ctx.fill();

  // Sunlit Martian rocks & dust ripples on lower hemisphere
  for (let i = 0; i < 160; i++) {
    const rx = ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1;
    const ry = ((Math.sin(i * 311.7) * 23421.631) % 1 + 1) % 1;
    const x = rx * w;
    const y = h * (0.53 + ry * 0.44);
    const rw = 4 + (i % 7) * 3.5;
    const rh = 1.5 + (i % 3) * 1.2;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(245, 184, 132, 0.28)' : 'rgba(42, 18, 14, 0.34)';
    ctx.fillRect(x, y, rw, rh);
  }

  // White HAB dome reflection hint on horizon
  ctx.fillStyle = 'rgba(245, 240, 234, 0.55)';
  ctx.beginPath();
  ctx.arc(w * 0.25, h * 0.515, 7, Math.PI, 0);
  ctx.fill();

  // Bright Sun disc & atmospheric halo aligned to exact sunDir
  const sd = sunDir.clone().normalize();
  const u = Math.atan2(sd.z, sd.x) / (Math.PI * 2) + 0.5;
  const vTex = Math.asin(THREE.MathUtils.clamp(sd.y, -1, 1)) / Math.PI + 0.5;
  const sunX = u * w;
  const sunY = (1 - vTex) * h;

  for (const ox of [sunX - w, sunX, sunX + w]) {
    const halo = ctx.createRadialGradient(ox, sunY, 2, ox, sunY, 64);
    halo.addColorStop(0.0, 'rgba(255, 252, 240, 1.0)');
    halo.addColorStop(0.14, 'rgba(255, 232, 178, 0.92)');
    halo.addColorStop(0.45, 'rgba(255, 184, 108, 0.38)');
    halo.addColorStop(1.0, 'rgba(255, 150, 90, 0.0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(ox, sunY, 64, 0, Math.PI * 2);
    ctx.fill();
  }

  const envTex = new THREE.CanvasTexture(c);
  envTex.colorSpace = THREE.SRGBColorSpace;
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  return envTex;
}

                               
                     
                                
                                            
                                       
                                    
                      
 

export function createHabitatBase(renderer                     )               {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const group = new THREE.Group();
  const baseY = getTerrainHeight(0, 0);
  group.position.set(0, baseY, 0);

  const solarTex = makeSolarTexture(maxAniso);
  const hullTex = makeHabHullTexture(maxAniso);

  const padMat = new THREE.MeshStandardMaterial({ color: 0x3b3835, roughness: 0.85, metalness: 0.25 });
  const hullMat = new THREE.MeshStandardMaterial({ map: hullTex, roughness: 0.48, metalness: 0.22 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x262b31, roughness: 0.35, metalness: 0.8 });
  const goldFoilMat = new THREE.MeshStandardMaterial({ color: 0xd99b26, roughness: 0.24, metalness: 0.92 });
  const airlockGlowMat = new THREE.MeshStandardMaterial({
    color: 0x45e8ff,
    emissive: 0x1ac8e8,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    roughness: 0.2,
    metalness: 0.85,
  });

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.4, 0.7, 8), padMat);
  pad.position.y = 0.35;
  pad.receiveShadow = true;
  pad.castShadow = true;
  group.add(pad);

  const mainCyl = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 4.4, 24), hullMat);
  mainCyl.position.y = 2.9;
  mainCyl.castShadow = true;
  mainCyl.receiveShadow = true;
  group.add(mainCyl);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(5.6, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    hullMat,
  );
  dome.position.y = 5.1;
  dome.castShadow = true;
  dome.receiveShadow = true;
  group.add(dome);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(5.65, 0.22, 10, 32), darkMetalMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 5.1;
  group.add(collar);

  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 0.7, 12), darkMetalMat);
  cupola.position.y = 10.6;
  cupola.castShadow = true;
  group.add(cupola);

  const airlockBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.3, 3.6), hullMat);
  airlockBody.position.set(0, 2.35, 6.4);
  airlockBody.castShadow = true;
  airlockBody.receiveShadow = true;
  group.add(airlockBody);

  const airlockFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.8, 0.35), darkMetalMat);
  airlockFrame.position.set(0, 2.1, 8.2);
  airlockFrame.castShadow = true;
  group.add(airlockFrame);

  const airlockDoor = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.35, 0.2), darkMetalMat);
  airlockDoor.position.set(0, 1.95, 8.32);
  group.add(airlockDoor);

  const airlockStrip = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.14), airlockGlowMat);
  airlockStrip.position.set(0, 3.32, 8.38);
  group.add(airlockStrip);

  const airlockWindow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.12), airlockGlowMat);
  airlockWindow.position.set(0, 2.35, 8.4);
  group.add(airlockWindow);

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 2.2), padMat);
  ramp.position.set(0, 0.35, 9.1);
  ramp.rotation.x = 0.26;
  ramp.receiveShadow = true;
  group.add(ramp);

  [-1, 1].forEach((side) => {
    const arrayGroup = new THREE.Group();
    arrayGroup.position.set(side * 9.8, 0, -1.5);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.4, 8), darkMetalMat);
    mast.position.y = 1.7;
    mast.castShadow = true;
    arrayGroup.add(mast);

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 0.16), darkMetalMat);
    crossbar.position.y = 3.2;
    arrayGroup.add(crossbar);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.08, 2.5), solarMat);
    wing.position.set(side * 0.4, 3.32, 0);
    wing.rotation.x = 0.35;
    wing.castShadow = true;
    wing.receiveShadow = true;
    arrayGroup.add(wing);

    group.add(arrayGroup);
  });

  const towerGroup = new THREE.Group();
  towerGroup.position.set(-4.5, 0, -4.8);

  const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, 1.4, 6), goldFoilMat);
  towerBase.position.y = 0.7;
  towerBase.castShadow = true;
  towerGroup.add(towerBase);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 16.5, 8), darkMetalMat);
  mast.position.y = 9.0;
  mast.castShadow = true;
  towerGroup.add(mast);

  const dishPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.6, 0.14),
    new THREE.Vector2(1.15, 0.45),
    new THREE.Vector2(1.2, 0.48),
  ];
  const dish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 18), hullMat);
  dish.position.set(0.3, 12.2, 0.2);
  dish.rotation.x = Math.PI * 0.32;
  dish.rotation.z = -0.3;
  dish.castShadow = true;
  towerGroup.add(dish);

  const beaconBulbMat = new THREE.MeshStandardMaterial({
    color: 0xff2a1f,
    emissive: 0xff2211,
    emissiveIntensity: 3.0,
    roughness: 0.2,
  });
  const beaconBulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), beaconBulbMat);
  beaconBulb.position.y = 17.4;
  towerGroup.add(beaconBulb);

  const beaconLight = new THREE.PointLight(0xff3322, 6, 35, 1.8);
  beaconLight.position.y = 17.6;
  towerGroup.add(beaconLight);

  group.add(towerGroup);

  const safeRingGeo = new THREE.RingGeometry(15.65, 16.15, 72);
  safeRingGeo.rotateX(-Math.PI / 2);
  const safeRingMat = new THREE.MeshBasicMaterial({
    color: 0x35ff8a,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const safeRing = new THREE.Mesh(safeRingGeo, safeRingMat);
  safeRing.position.y = 0.08;
  group.add(safeRing);

  const innerRingGeo = new THREE.RingGeometry(14.9, 15.05, 72);
  innerRingGeo.rotateX(-Math.PI / 2);
  const innerRing = new THREE.Mesh(innerRingGeo, safeRingMat);
  innerRing.position.y = 0.08;
  group.add(innerRing);

  return {
    group,
    beaconLight,
    beaconBulbMat,
    safeRingMat,
    update: (elapsed        ) => {
      const pulse = Math.sin(elapsed * 4.2) > 0.25 ? 1.0 : 0.12;
      beaconBulbMat.emissiveIntensity = pulse * 3.5;
      beaconLight.intensity = pulse * 7.0;
      safeRingMat.opacity = 0.42 + 0.25 * (0.5 + 0.5 * Math.sin(elapsed * 2.4));
    },
    dispose: () => {
      solarTex.dispose();
      hullTex.dispose();
      padMat.dispose();
      hullMat.dispose();
      darkMetalMat.dispose();
      goldFoilMat.dispose();
      airlockGlowMat.dispose();
      solarMat.dispose();
      beaconBulbMat.dispose();
      safeRingMat.dispose();
      group.traverse((obj) => {
        if ((obj              ).isMesh) {
          (obj              ).geometry.dispose();
        }
      });
    },
  };
}

                                   
             
                     
                                         
                                          
                     
                                         
                                                      
                      
 

export function createAnomalySite(
  id        ,
  x        ,
  z        ,
  accentColor        ,
)                   {
  const y = getTerrainHeight(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x3b2a24,
    roughness: 0.9,
    metalness: 0.08,
    flatShading: true,
  });

  const crystalMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.5,
    roughness: 0.18,
    metalness: 0.45,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xb9c0c7,
    roughness: 0.35,
    metalness: 0.85,
  });

  const baseRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), rockMat);
  baseRock.scale.set(1.3, 0.55, 1.2);
  baseRock.position.y = 0.25;
  baseRock.castShadow = true;
  baseRock.receiveShadow = true;
  group.add(baseRock);

  const crystalOffsets = [
    { x: 0, z: 0, h: 1.65, r: 0.36, rx: 0.12, rz: -0.1 },
    { x: 0.65, z: 0.35, h: 1.2, r: 0.26, rx: 0.32, rz: 0.22 },
    { x: -0.6, z: 0.4, h: 1.05, r: 0.24, rx: -0.25, rz: 0.28 },
    { x: 0.15, z: -0.68, h: 1.3, r: 0.28, rx: -0.35, rz: -0.15 },
  ];
  crystalOffsets.forEach((c) => {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(c.r, c.h, 5), crystalMat);
    shard.position.set(c.x, c.h * 0.45, c.z);
    shard.rotation.set(c.rx, 0.4, c.rz);
    shard.castShadow = true;
    group.add(shard);
  });

  const tripod = new THREE.Group();
  tripod.position.set(1.65, 0, 1.1);
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5, 6), metalMat);
    leg.position.set(Math.cos(ang) * 0.32, 0.65, Math.sin(ang) * 0.32);
    leg.rotation.z = Math.cos(ang) * 0.36;
    leg.rotation.x = -Math.sin(ang) * 0.36;
    leg.castShadow = true;
    tripod.add(leg);
  }
  const coreUnit = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.45, 8), metalMat);
  coreUnit.position.y = 1.32;
  coreUnit.castShadow = true;
  tripod.add(coreUnit);

  const rotor = new THREE.Group();
  rotor.position.y = 1.68;
  const sensorBar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.12), crystalMat);
  rotor.add(sensorBar);
  tripod.add(rotor);
  group.add(tripod);

  const ringGeo = new THREE.RingGeometry(4.25, 4.5, 48);
  ringGeo.rotateX(-Math.PI / 2);
  const scannerRingMat = new THREE.MeshBasicMaterial({
    color: accentColor,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const ring = new THREE.Mesh(ringGeo, scannerRingMat);
  ring.position.y = 0.14;
  group.add(ring);

  return {
    id,
    group,
    crystalMat,
    scannerRingMat,
    rotor,
    setScanned: (scanned         ) => {
      const col = scanned ? 0x35ff8a : accentColor;
      crystalMat.color.setHex(col);
      crystalMat.emissive.setHex(col);
      scannerRingMat.color.setHex(col);
    },
    update: (elapsed        , scanned         ) => {
      rotor.rotation.y = elapsed * (scanned ? 3.2 : 0.7);
      crystalMat.emissiveIntensity = scanned ? 1.8 : 1.15 + 0.55 * Math.sin(elapsed * 3.1);
      scannerRingMat.opacity = scanned ? 0.32 : 0.35 + 0.25 * Math.sin(elapsed * 2.8);
    },
    dispose: () => {
      rockMat.dispose();
      crystalMat.dispose();
      metalMat.dispose();
      scannerRingMat.dispose();
      group.traverse((o) => {
        if ((o              ).isMesh) (o              ).geometry.dispose();
      });
    },
  };
}

                                  
                    
                         
                       
                        
                       
                        
                              
                             
                                              
                                                           
                                                                                                
                           
                    
               
                  
                     
                       
                    
                      
                        
                      
                      
                           
                        
                  
                          
                           
                     
                      
                       
                            
                          
                     
                     
                     
             
                      
 

export function createAstronautAvatar(
  sunDir                = new THREE.Vector3(78, 42, -52).normalize(),
)                  {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const { albedo, bump, plssTex, dcmTex, patchTex } = makeSuitFabricTextures();
  const visorEnvMap = makeMartianVisorEnvMap(sunDir);
  const visorSunUniform = { value: sunDir.clone().normalize() };
  const visorDayUniform = { value: 1.0 };
  const visorTwilightUniform = { value: 0.0 };

  const suitFabric = new THREE.MeshStandardMaterial({
    map: albedo,
    bumpMap: bump,
    bumpScale: 0.025,
    roughness: 0.68,
    metalness: 0.04,
  });
  const suitDustyLower = new THREE.MeshStandardMaterial({
    map: albedo,
    bumpMap: bump,
    bumpScale: 0.03,
    color: 0xdcc2b0, // subtle Martian regolith dust coating on lower legs
    roughness: 0.82,
    metalness: 0.02,
  });
  const suitSafetyRed = new THREE.MeshStandardMaterial({
    color: 0xd93c24,
    roughness: 0.45,
    metalness: 0.12,
  });
  const tacticalDark = new THREE.MeshStandardMaterial({
    color: 0x26292e,
    roughness: 0.72,
    metalness: 0.18,
  });
  const visorRubberSeal = new THREE.MeshStandardMaterial({
    color: 0x16181c,
    roughness: 0.82,
    metalness: 0.08,
  });
  const metalTrim = new THREE.MeshStandardMaterial({
    color: 0x626b74,
    roughness: 0.28,
    metalness: 0.88,
  });
  const plssMat = new THREE.MeshStandardMaterial({
    map: plssTex,
    bumpMap: bump,
    bumpScale: 0.015,
    roughness: 0.58,
    metalness: 0.15,
  });
  const dcmMat = new THREE.MeshStandardMaterial({
    map: dcmTex,
    roughness: 0.35,
    metalness: 0.45,
  });
  const patchMat = new THREE.MeshStandardMaterial({
    map: patchTex,
    roughness: 0.65,
  });
  const goldVisor = new THREE.MeshPhysicalMaterial({
    color: 0xe3a83b,
    metalness: 0.96,
    roughness: 0.055,
    clearcoat: 1.0,
    clearcoatRoughness: 0.025,
    envMap: visorEnvMap,
    envMapIntensity: 2.35,
  });
  goldVisor.onBeforeCompile = (shader) => {
    shader.uniforms.uVisorSunDir = visorSunUniform;
    shader.uniforms.uVisorDay = visorDayUniform;
    shader.uniforms.uVisorTwilight = visorTwilightUniform;
    shader.vertexShader =
      `varying vec3 vVisorWPos;\nvarying vec3 vVisorWNorm;\n` +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vVisorWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vVisorWNorm = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader =
      `uniform vec3 uVisorSunDir;\nuniform float uVisorDay;\nuniform float uVisorTwilight;\nvarying vec3 vVisorWPos;\nvarying vec3 vVisorWNorm;\n` +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        vec3 vN = normalize(vVisorWNorm);
        vec3 vV = normalize(cameraPosition - vVisorWPos);
        vec3 vL = normalize(uVisorSunDir);
        vec3 vH = normalize(vL + vV);
        vec3 vR = reflect(-vV, vN);
        float sunAbove = smoothstep(-0.08, 0.16, vL.y);
        float sunFace = smoothstep(-0.12, 0.42, dot(vN, vL)) * sunAbove;
        float specTight = pow(max(dot(vN, vH), 0.0), 220.0) * sunAbove;
        float specBloom = pow(max(dot(vN, vH), 0.0), 26.0) * sunAbove;
        float specBroad = pow(max(dot(vN, vH), 0.0), 5.5) * sunAbove;
        float sunMirror = pow(max(dot(vR, vL), 0.0), 110.0) * sunAbove;
        float fresnel = pow(1.0 - max(dot(vN, vV), 0.0), 3.4);
        float horizonShine = exp(-pow((vR.y - 0.02) * 5.0, 2.0)) * (0.22 + 0.78 * uVisorDay + 0.45 * uVisorTwilight);
        vec3 sunCoreCol = mix(vec3(1.0, 0.76, 0.52), vec3(1.0, 0.96, 0.84), clamp(vL.y * 3.0, 0.0, 1.0));
        totalEmissiveRadiance += sunCoreCol * (specTight * 2.8 + sunMirror * 2.2);
        totalEmissiveRadiance += vec3(1.0, 0.70, 0.28) * (specBloom * 0.75 + specBroad * 0.22 * sunFace);
        vec3 rimCol = mix(vec3(0.45, 0.62, 0.88), vec3(0.95, 0.66, 0.24), clamp(uVisorDay + uVisorTwilight * 0.6, 0.0, 1.0));
        totalEmissiveRadiance += rimCol * (fresnel * (0.14 + 0.58 * sunFace + 0.18 * uVisorTwilight) + horizonShine * 0.22);`,
      );
  };
  const clearOuterVisorMat = new THREE.MeshPhysicalMaterial({
    color: 0xfff5e4,
    metalness: 0.08,
    roughness: 0.02,
    transparent: true,
    opacity: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMap: visorEnvMap,
    envMapIntensity: 2.6,
    depthWrite: false,
  });
  const headlampMeshMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xdff6ff,
    emissiveIntensity: 2.6,
  });

  // Biomechanical articulated skeleton: Pelvis -> Upper Torso (counter-twist & brace) + Legs (Hip -> Knee -> Ankle)
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 0.74, 0);
  bodyGroup.add(pelvisGroup);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.12, 0);
  pelvisGroup.add(torsoGroup);

  // 1. Bulky Quilted Torso + Pelvis + Waist Harness Belt
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.56, 16), suitFabric);
  torso.position.y = 0.27;
  torso.scale.set(1.12, 1, 0.86);
  torso.castShadow = true;
  torsoGroup.add(torso);

  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.21, 0.22, 14), suitFabric);
  pelvis.position.y = 0.06;
  pelvis.scale.set(1.08, 1, 0.88);
  pelvis.castShadow = true;
  pelvisGroup.add(pelvis);

  // Dark waist harness strap (seen in rear/front EMU reference images)
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.028, 8, 20), tacticalDark);
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.08, 0.88, 1);
  belt.position.y = 0.02;
  torsoGroup.add(belt);

  // 2. Front Chest DCM (Display & Control Module) + Red/Blue Umbilical Fittings + Tether Brackets
  const dcm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.11), dcmMat);
  dcm.position.set(0, 0.32, -0.22);
  dcm.castShadow = true;
  torsoGroup.add(dcm);

  // Anodized umbilical quick-disconnect fittings (Apollo/EMU style)
  const redPort = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.06, 10),
    new THREE.MeshStandardMaterial({ color: 0xc92a2a, metalness: 0.8, roughness: 0.25 }),
  );
  redPort.rotation.x = Math.PI / 2;
  redPort.position.set(-0.08, 0.14, -0.21);
  torsoGroup.add(redPort);

  const bluePort = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.06, 10),
    new THREE.MeshStandardMaterial({ color: 0x2266cc, metalness: 0.8, roughness: 0.25 }),
  );
  bluePort.rotation.x = Math.PI / 2;
  bluePort.position.set(0.08, 0.14, -0.21);
  torsoGroup.add(bluePort);

  // Curved umbilical hoses routing around waist to PLSS backpack
  [-1, 1].forEach((side) => {
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.08, 0.14, -0.22),
      new THREE.Vector3(side * 0.24, 0.1, -0.08),
      new THREE.Vector3(side * 0.23, 0.12, 0.18),
      new THREE.Vector3(side * 0.14, 0.18, 0.28),
    ]);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 14, 0.018, 8, false), suitFabric);
    torsoGroup.add(hose);
  });

  // 3. Detailed PLSS Backpack + Overhead Oxygen Manifold Hoses + RCS Thruster Nozzles
  const plss = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.25), plssMat);
  plss.position.set(0, 0.3, 0.25);
  plss.castShadow = true;
  torsoGroup.add(plss);

  const plssTopHood = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.26), suitFabric);
  plssTopHood.position.set(0, 0.58, 0.24);
  plssTopHood.castShadow = true;
  torsoGroup.add(plssTopHood);

  // Overhead corrugated hoses connecting PLSS top corners to helmet collar
  [-1, 1].forEach((side) => {
    const topHose = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.16, 0.59, 0.22),
      new THREE.Vector3(side * 0.22, 0.66, 0.12),
      new THREE.Vector3(side * 0.16, 0.58, 0.0),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(topHose, 10, 0.022, 8, false), tacticalDark);
    torsoGroup.add(tube);
  });

  const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.44, 6), metalTrim);
  whip.position.set(0.16, 0.82, 0.3);
  torsoGroup.add(whip);

  // Twin Gimbaled RCS Thruster Nozzles & Plumes
  const plumeMeshes               = [];
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0x7aeaff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  [-0.14, 0.14].forEach((nx) => {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.052, 0.14, 10), metalTrim);
    nozzle.position.set(nx, -0.02, 0.3);
    nozzle.rotation.x = 0.25;
    torsoGroup.add(nozzle);

    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.65, 8), plumeMat);
    plume.position.set(nx, -0.35, 0.39);
    plume.rotation.x = Math.PI + 0.25;
    torsoGroup.add(plume);
    plumeMeshes.push(plume);
  });

  // 4. Sculpted Signature EVA Helmet Assembly: Neck Disconnect Ring + LEVA Sunshield Hood + Dark Gasket + Gold Bubble Visor + Dual LED Headlamp Pods
  const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.188, 0.032, 12, 26), metalTrim);
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.set(0, 0.55, -0.01);
  torsoGroup.add(neckRing);

  const neckSeal = new THREE.Mesh(new THREE.TorusGeometry(0.194, 0.016, 8, 26), visorRubberSeal);
  neckSeal.rotation.x = Math.PI / 2;
  neckSeal.position.set(0, 0.57, -0.01);
  torsoGroup.add(neckSeal);

  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(0, 0.725, -0.01);
  torsoGroup.add(helmetGroup);

  // Outer sculpted LEVA thermal sunshield shell (open at the front visor face)
  const helmetShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.232, 28, 22, -Math.PI * 0.68, Math.PI * 1.36, 0, Math.PI),
    suitFabric,
  );
  helmetShell.rotation.y = Math.PI * 0.5;
  helmetShell.scale.set(1.02, 1.05, 1.08);
  helmetShell.castShadow = true;
  helmetGroup.add(helmetShell);

  // Top & forward-projecting LEVA visor sunshade cowl / hood arch (characteristic silhouette in Apollo & EMU photos)
  const sunshadeArch = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 26, 16, -Math.PI * 0.92, Math.PI * 0.84, Math.PI * 0.08, Math.PI * 0.28),
    suitFabric,
  );
  sunshadeArch.rotation.x = -0.14;
  sunshadeArch.position.set(0, -0.002, -0.012);
  sunshadeArch.castShadow = true;
  helmetGroup.add(sunshadeArch);

  // Dark inner sunshield lining under the brow hood
  const browUnderside = new THREE.Mesh(
    new THREE.TorusGeometry(0.186, 0.016, 8, 22, Math.PI * 1.05),
    visorRubberSeal,
  );
  browUnderside.rotation.z = -Math.PI * 0.025;
  browUnderside.rotation.x = -0.35;
  browUnderside.position.set(0, 0.005, -0.172);
  helmetGroup.add(browUnderside);

  // Thick molded dark rubber visor gasket & inner metallic clamp ring
  const visorBezel = new THREE.Mesh(new THREE.TorusGeometry(0.178, 0.026, 12, 32), visorRubberSeal);
  visorBezel.position.set(0, 0.0, -0.118);
  visorBezel.scale.set(1.02, 0.96, 1.0);
  helmetGroup.add(visorBezel);

  const visorInnerRim = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.008, 8, 32), metalTrim);
  visorInnerRim.position.set(0, 0.0, -0.132);
  visorInnerRim.scale.set(1.02, 0.96, 1.0);
  helmetGroup.add(visorInnerRim);

  // Side visor hinge bosses (seen flanking visor bezel in both photos)
  [-1, 1].forEach((side) => {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.036, 12), metalTrim);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(side * 0.215, 0.0, -0.06);
    helmetGroup.add(hinge);
  });

  // Top-center sun-visor pull-down handle tab (Apollo/EMU signature center brow clasp)
  const visorTab = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.028, 0.035), metalTrim);
  visorTab.position.set(0, 0.178, -0.155);
  visorTab.rotation.x = 0.35;
  helmetGroup.add(visorTab);

  // Signature High-Curvature Gold-Vapor Mirror Bubble Visor (bulging convex fishbowl dome)
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.192, 40, 32, -Math.PI * 0.92, Math.PI * 0.84, Math.PI * 0.15, Math.PI * 0.7),
    goldVisor,
  );
  visor.position.set(0, 0.0, -0.066);
  visor.scale.set(1.02, 0.97, 1.05);
  helmetGroup.add(visor);

  // Outer clear protective polycarbonate bubble layer for dual glass+gold mirror reflections
  const clearBubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.197, 32, 24, -Math.PI * 0.92, Math.PI * 0.84, Math.PI * 0.15, Math.PI * 0.7),
    clearOuterVisorMat,
  );
  clearBubble.position.set(0, 0.0, -0.065);
  clearBubble.scale.set(1.02, 0.97, 1.05);
  helmetGroup.add(clearBubble);

  // Dual Upper-Brow LED Floodlight Pods + Side Helmet Camera Housing (matching EMU photo)
  [-0.178, 0.178].forEach((lx) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.068, 0.125), suitFabric);
    pod.position.set(lx, 0.132, -0.105);
    pod.castShadow = true;
    helmetGroup.add(pod);

    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.018, 12), visorRubberSeal);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(lx, 0.132, -0.165);
    helmetGroup.add(bezel);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), headlampMeshMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(lx, 0.132, -0.17);
    helmetGroup.add(lens);
  });

  const sideCam = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.055, 0.105), tacticalDark);
  sideCam.position.set(-0.228, 0.085, -0.06);
  helmetGroup.add(sideCam);

  // Helmet SpotLight
  const helmetLamp = new THREE.SpotLight(0xeef8ff, 14, 62, Math.PI / 5.5, 0.48, 1.4);
  helmetLamp.position.set(0, 1.72, -0.2);
  const lampTarget = new THREE.Object3D();
  lampTarget.position.set(0, 1.45, -10);
  root.add(helmetLamp);
  root.add(lampTarget);
  helmetLamp.target = lampTarget;

  // 5. Articulated Pleated Arms (Shoulder -> Elbow -> Wrist/Glove)
                            
                          
                       
                       
   
  function buildArm(side        )                 {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.31, 0.46, 0);

    const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), suitFabric);
    shoulderJoint.castShadow = true;
    shoulder.add(shoulderJoint);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.075, 0.28, 10), suitFabric);
    upper.position.y = -0.14;
    upper.castShadow = true;
    shoulder.add(upper);

    // Shoulder Flag / Mission Patch
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.09), patchMat);
    patch.position.set(side * 0.082, -0.09, 0);
    shoulder.add(patch);

    // Pleated elbow joint pivot at y = -0.28
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(0, -0.28, 0);
    elbowGroup.rotation.x = 0.32;
    shoulder.add(elbowGroup);

    const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.018, 8, 14), suitFabric);
    elbow.rotation.x = Math.PI / 2;
    elbowGroup.add(elbow);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.06, 0.26, 10), suitFabric);
    lower.position.set(0, -0.13, 0);
    lower.castShadow = true;
    elbowGroup.add(lower);

    // Articulated Wrist Disconnect Ring & Tactical Glove
    const wristGroup = new THREE.Group();
    wristGroup.position.set(0, -0.25, 0);
    elbowGroup.add(wristGroup);

    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 8, 14), metalTrim);
    cuff.rotation.x = Math.PI / 2;
    wristGroup.add(cuff);

    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.1), tacticalDark);
    glove.position.set(0, -0.05, -0.01);
    glove.castShadow = true;
    wristGroup.add(glove);
    return { shoulder, elbow: elbowGroup, wrist: wristGroup };
  }

  const leftArmRig = buildArm(-1);
  const rightArmRig = buildArm(1);
  torsoGroup.add(leftArmRig.shoulder, rightArmRig.shoulder);

  // 6. Articulated Legs (Hip -> Knee -> Ankle -> Boot) for real human knee bend, heel-strike, and toe-off
                            
                     
                      
                       
   
  const THIGH_LEN = 0.36;
  const SHIN_LEN = 0.31;
  const ANKLE_HEIGHT = 0.07;

  function buildLeg(side        )                 {
    const hip = new THREE.Group();
    hip.position.set(side * 0.135, 0, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.092, THIGH_LEN, 12), suitFabric);
    thigh.position.y = -THIGH_LEN * 0.5;
    thigh.castShadow = true;
    hip.add(thigh);

    // Red/Orange thigh safety band (visible in both EMU & Artemis photos!)
    const safetyBand = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.094, 0.04, 12), suitSafetyRed);
    safetyBand.position.y = -0.29;
    hip.add(safetyBand);

    // Knee pivot at -THIGH_LEN
    const kneeGroup = new THREE.Group();
    kneeGroup.position.set(0, -THIGH_LEN, 0);
    hip.add(kneeGroup);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), suitDustyLower);
    kneeGroup.add(knee);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.076, SHIN_LEN + 0.03, 12), suitDustyLower);
    shin.position.y = -SHIN_LEN * 0.5;
    shin.castShadow = true;
    kneeGroup.add(shin);

    // Ankle pivot at -SHIN_LEN (bottom of boot sole sits exactly at -ANKLE_HEIGHT)
    const ankleGroup = new THREE.Group();
    ankleGroup.position.set(0, -SHIN_LEN, 0);
    kneeGroup.add(ankleGroup);

    const bootUpper = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.095, 0.24), tacticalDark);
    bootUpper.position.set(0, -0.022, -0.04);
    bootUpper.castShadow = true;
    ankleGroup.add(bootUpper);

    const bootSole = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.035, 0.26), metalTrim);
    bootSole.position.set(0, -0.053, -0.04);
    ankleGroup.add(bootSole);

    return { hip, knee: kneeGroup, ankle: ankleGroup };
  }

  const leftLegRig = buildLeg(-1);
  const rightLegRig = buildLeg(1);
  pelvisGroup.add(leftLegRig.hip, rightLegRig.hip);

  // Helper: compute asymmetric human leg pose for a given gait phase, slope, & landing crouch
  function computeHumanLegPose(
    phase        ,
    strideAmp        ,
    runBlend        ,
    dirSign        ,
    crouchHip        ,
    crouchKnee        ,
    slopeFwd        ,
  )                                                                     {
    const s = Math.sin(phase) * dirSign; // +1 = foot forward, -1 = foot back
    const c = Math.cos(phase) * dirSign; // +1 = swinging forward, -1 = stance pushing back
    const forwardSwing = Math.max(0, c);
    const stanceLoad = Math.max(0, -c);

    // Uphill climbing raises swing hip slightly and bends knees deeper to clear rocks/slopes
    const uphillLift = Math.max(0, slopeFwd) * 0.18 * forwardSwing * strideAmp;
    const uphillKnee = -Math.max(0, slopeFwd) * 0.28 * (0.3 + 0.7 * forwardSwing) * strideAmp;
    const downhillKnee = -Math.max(0, -slopeFwd) * 0.22 * (0.4 + 0.6 * stanceLoad) * strideAmp;

    // Hip swings forward (+), backward (-), biased forward during crouch/landing absorption
    const hipX = s * (0.48 + runBlend * 0.26) * strideAmp + crouchHip + uphillLift;

    // Human knee bends steeply during mid-swing for foot clearance, gently cushions at heel strike
    const swingKneeBend = -Math.pow(forwardSwing, 0.85) * (0.78 + runBlend * 0.52) * strideAmp;
    const heelCushion = -Math.max(0, s) * (1 - forwardSwing) * (0.14 + runBlend * 0.14) * strideAmp;
    const baseStanceBend = -0.06 * strideAmp;
    const kneeX = Math.min(0, swingKneeBend + heelCushion + baseStanceBend + crouchKnee + uphillKnee + downhillKnee);

    // Ankle: dorsiflex (+, toe up) before heel strike, plantarflex (-, toe down) on toe-off,
    // and conform stance boot sole to actual slope angle under the astronaut's feet
    const heelDorsiflex = Math.max(0, s) * 0.22 * strideAmp;
    const toeOffPush = -Math.max(0, -s) * (0.28 + runBlend * 0.2) * strideAmp * (0.3 + 0.7 * stanceLoad);
    const slopeAnkle = THREE.MathUtils.clamp(slopeFwd * 0.75 * (0.4 + 0.6 * stanceLoad), -0.35, 0.35);
    const crouchAnkleLevel = -(crouchHip + crouchKnee) * 0.85;
    const ankleX = heelDorsiflex + toeOffPush + slopeAnkle + crouchAnkleLevel;

    // Exact vertical reach from hip pivot down to boot sole
    const reachY =
      THIGH_LEN * Math.cos(hipX) +
      SHIN_LEN * Math.cos(hipX + kneeX) +
      ANKLE_HEIGHT * Math.cos(Math.max(-0.35, Math.min(0.35, hipX + kneeX + ankleX)));

    return { hipX, kneeX, ankleX, footDownY: reachY };
  }

  return {
    root,
    bodyGroup,
    leftArm: leftArmRig.shoulder,
    rightArm: rightArmRig.shoulder,
    leftLeg: leftLegRig.hip,
    rightLeg: rightLegRig.hip,
    helmetLamp,
    lampTarget,
    headlampMeshMat,
    updateSunLighting: (nextSunDir, dayFactor, twilightFactor) => {
      visorSunUniform.value.copy(nextSunDir).normalize();
      visorDayUniform.value = dayFactor;
      visorTwilightUniform.value = twilightFactor;
      goldVisor.envMapIntensity = 0.75 + dayFactor * 1.65 + twilightFactor * 0.55;
      clearOuterVisorMat.envMapIntensity = 0.85 + dayFactor * 1.75 + twilightFactor * 0.65;
    },
    setJetpackPlumes: (throttle, dt) => {
      const targetOp = THREE.MathUtils.clamp(throttle, 0, 1) * 0.9;
      plumeMat.opacity = THREE.MathUtils.damp(plumeMat.opacity, targetOp, 18, dt);
      plumeMeshes.forEach((p, idx) => {
        p.visible = plumeMat.opacity > 0.02;
        if (p.visible) {
          const thrScale = 0.35 + THREE.MathUtils.clamp(throttle, 0, 1) * 0.85;
          const jitter = thrScale * (0.85 + Math.random() * 0.38);
          p.scale.set(0.75 + throttle * 0.35, jitter, 0.75 + throttle * 0.35 + idx * 0.02);
        }
      });
    },
    updateAnimation: ({
      elapsed,
      dt,
      speed,
      localFwd,
      localRight,
      wishFwd,
      wishRight,
      verticalVel,
      walkPhase,
      grounded,
      jetpackActive,
      rcsThrottle,
      pitch,
      landingSquash,
      groundSlopeFwd,
      accelFwd,
      climbing,
      climbPhase,
      climbHeightNorm,
      climbLeadSide,
      turnRate,
      stepLift,
      visible,
    }) => {
      bodyGroup.visible = visible;
      lampTarget.position.set(0, 1.55 + Math.sin(pitch) * 10, -Math.cos(pitch) * 10);

      if (!visible) return;

      // Never squash scale like rubber — humans absorb landings via hip/knee flexion & torso brace!
      bodyGroup.scale.set(1, 1, 1);

      const smooth = (a        , b        , x        ) => {
        const u = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
        return u * u * (3 - 2 * u);
      };

      const crouchAmt = THREE.MathUtils.clamp(landingSquash, 0, 1);
      const crouchHip = crouchAmt * 0.68;
      const crouchKnee = -crouchAmt * 1.32;
      const clampedTurn = THREE.MathUtils.clamp(turnRate, -4.5, 4.5);

      if (climbing) {
        // Two-stage biomechanical human rock-scrambling & mantling across all joints!
        const p = THREE.MathUtils.clamp(climbPhase, 0, 1);
        const hNorm = THREE.MathUtils.clamp(climbHeightNorm, 0.15, 1.0);
        const pullBell = Math.sin(Math.min(1, p / 0.62) * Math.PI);
        const reachAmt = smooth(0.0, 0.24, p) * (1 - smooth(0.48, 0.85, p));
        const pressDownAmt = smooth(0.46, 0.72, p) * (1 - smooth(0.84, 1.0, p));

        // Stagger left & right reach like a human reaching up to find holds
        const leadIsLeft = climbLeadSide < 0;
        const pL = THREE.MathUtils.clamp(p + (leadIsLeft ? 0.07 : -0.04), 0, 1);
        const pR = THREE.MathUtils.clamp(p + (leadIsLeft ? -0.04 : 0.07), 0, 1);

        const armClimb = (armP        , side        ) => {
          const rCurve = smooth(0.0, 0.22, armP) * (1 - smooth(0.48, 0.86, armP));
          const pCurve = smooth(0.48, 0.72, armP) * (1 - smooth(0.86, 1.0, armP));
          const shX =
            rCurve * (1.35 + hNorm * 0.65) +
            pCurve * 0.28 +
            (1 - rCurve - pCurve) * 0.15;
          const shZ = side * THREE.MathUtils.lerp(0.14, 0.28, pCurve) + side * 0.04 * pullBell;
          const shY = -side * (0.22 * rCurve);
          const elX = 0.28 + pullBell * 1.15 * (1 - pCurve * 0.6) + pCurve * 0.22;
          const wrX = -0.58 * Math.max(rCurve, pCurve);
          return { shX, shZ, shY, elX, wrX };
        };

        const aL = armClimb(pL, -1);
        const aR = armClimb(pR, 1);

        leftArmRig.shoulder.rotation.x = THREE.MathUtils.damp(leftArmRig.shoulder.rotation.x, aL.shX, 20, dt);
        leftArmRig.shoulder.rotation.y = THREE.MathUtils.damp(leftArmRig.shoulder.rotation.y, aL.shY, 16, dt);
        leftArmRig.shoulder.rotation.z = THREE.MathUtils.damp(leftArmRig.shoulder.rotation.z, aL.shZ, 18, dt);
        leftArmRig.elbow.rotation.x = THREE.MathUtils.damp(leftArmRig.elbow.rotation.x, aL.elX, 20, dt);
        leftArmRig.wrist.rotation.x = THREE.MathUtils.damp(leftArmRig.wrist.rotation.x, aL.wrX, 18, dt);

        rightArmRig.shoulder.rotation.x = THREE.MathUtils.damp(rightArmRig.shoulder.rotation.x, aR.shX, 20, dt);
        rightArmRig.shoulder.rotation.y = THREE.MathUtils.damp(rightArmRig.shoulder.rotation.y, aR.shY, 16, dt);
        rightArmRig.shoulder.rotation.z = THREE.MathUtils.damp(rightArmRig.shoulder.rotation.z, aR.shZ, 18, dt);
        rightArmRig.elbow.rotation.x = THREE.MathUtils.damp(rightArmRig.elbow.rotation.x, aR.elX, 20, dt);
        rightArmRig.wrist.rotation.x = THREE.MathUtils.damp(rightArmRig.wrist.rotation.x, aR.wrX, 18, dt);

        // Lead leg drives high to plant boot on ledge -> extends powerfully to stand up!
        // Trail leg pushes off toe behind -> steps cleanly over lip onto crest!
        const leadDrive = smooth(0.08, 0.44, p) * (1 - smooth(0.56, 0.94, p));
        const leadHipX = leadDrive * (0.95 + hNorm * 0.48);
        const leadKneeX = -leadDrive * (1.28 + hNorm * 0.48);
        const leadAnkleX = leadDrive * 0.32 - pressDownAmt * 0.12;

        const trailPush = smooth(0.04, 0.34, p) * (1 - smooth(0.36, 0.54, p));
        const trailStep = smooth(0.46, 0.72, p) * (1 - smooth(0.76, 0.98, p));
        const trailHipX = -trailPush * 0.24 + trailStep * (0.72 + hNorm * 0.32);
        const trailKneeX = -trailPush * 0.42 - trailStep * (1.15 + hNorm * 0.35);
        const trailAnkleX = -trailPush * 0.32 + trailStep * 0.22;

        const lLegTarget = leadIsLeft
          ? { hipX: leadHipX, kneeX: leadKneeX, ankleX: leadAnkleX, hipZ: -0.07 * leadDrive }
          : { hipX: trailHipX, kneeX: trailKneeX, ankleX: trailAnkleX, hipZ: -0.05 * trailStep };
        const rLegTarget = leadIsLeft
          ? { hipX: trailHipX, kneeX: trailKneeX, ankleX: trailAnkleX, hipZ: 0.05 * trailStep }
          : { hipX: leadHipX, kneeX: leadKneeX, ankleX: leadAnkleX, hipZ: 0.07 * leadDrive };

        leftLegRig.hip.rotation.x = THREE.MathUtils.damp(leftLegRig.hip.rotation.x, lLegTarget.hipX, 20, dt);
        leftLegRig.hip.rotation.z = THREE.MathUtils.damp(leftLegRig.hip.rotation.z, lLegTarget.hipZ, 16, dt);
        leftLegRig.knee.rotation.x = THREE.MathUtils.damp(leftLegRig.knee.rotation.x, lLegTarget.kneeX, 20, dt);
        leftLegRig.ankle.rotation.x = THREE.MathUtils.damp(leftLegRig.ankle.rotation.x, lLegTarget.ankleX, 18, dt);

        rightLegRig.hip.rotation.x = THREE.MathUtils.damp(rightLegRig.hip.rotation.x, rLegTarget.hipX, 20, dt);
        rightLegRig.hip.rotation.z = THREE.MathUtils.damp(rightLegRig.hip.rotation.z, rLegTarget.hipZ, 16, dt);
        rightLegRig.knee.rotation.x = THREE.MathUtils.damp(rightLegRig.knee.rotation.x, rLegTarget.kneeX, 20, dt);
        rightLegRig.ankle.rotation.x = THREE.MathUtils.damp(rightLegRig.ankle.rotation.x, rLegTarget.ankleX, 18, dt);

        // Pelvis & torso lean naturally into the rock and shift over center of gravity on top-out
        const hipTuck = Math.sin(p * Math.PI);
        pelvisGroup.position.y = THREE.MathUtils.damp(pelvisGroup.position.y, 0.74 - hipTuck * (0.12 + hNorm * 0.1), 18, dt);
        pelvisGroup.position.x = THREE.MathUtils.damp(pelvisGroup.position.x, -climbLeadSide * 0.04 * leadDrive, 14, dt);
        pelvisGroup.position.z = THREE.MathUtils.damp(pelvisGroup.position.z, hipTuck * 0.08, 16, dt);
        pelvisGroup.rotation.x = THREE.MathUtils.damp(pelvisGroup.rotation.x, -hipTuck * 0.18, 16, dt);
        pelvisGroup.rotation.y = THREE.MathUtils.damp(pelvisGroup.rotation.y, climbLeadSide * 0.16 * pullBell, 14, dt);
        pelvisGroup.rotation.z = THREE.MathUtils.damp(pelvisGroup.rotation.z, climbLeadSide * 0.05 * leadDrive, 14, dt);

        const torsoPitch = -reachAmt * (0.24 + hNorm * 0.2) - pressDownAmt * 0.36;
        torsoGroup.rotation.x = THREE.MathUtils.damp(torsoGroup.rotation.x, torsoPitch, 18, dt);
        torsoGroup.rotation.y = THREE.MathUtils.damp(torsoGroup.rotation.y, -climbLeadSide * 0.14 * pullBell, 14, dt);
        torsoGroup.rotation.z = THREE.MathUtils.damp(torsoGroup.rotation.z, -climbLeadSide * 0.06 * leadDrive, 14, dt);

        const headPitch = reachAmt * (0.34 + hNorm * 0.18) - pressDownAmt * 0.16;
        helmetGroup.rotation.x = THREE.MathUtils.damp(helmetGroup.rotation.x, headPitch, 14, dt);
        helmetGroup.rotation.y = THREE.MathUtils.damp(helmetGroup.rotation.y, 0, 12, dt);
        helmetGroup.rotation.z = THREE.MathUtils.damp(helmetGroup.rotation.z, 0, 12, dt);
      } else if (grounded) {
        const moveBlend = THREE.MathUtils.clamp((speed - 0.12) / 1.4, 0, 1);
        const runBlend = THREE.MathUtils.clamp((speed - 3.3) / 3.2, 0, 1);
        const dirSign = localFwd < -0.25 ? -1 : 1;
        const strafeFrac = THREE.MathUtils.clamp(localRight / Math.max(0.8, speed), -1, 1);

        const lPose = computeHumanLegPose(
          walkPhase,
          moveBlend,
          runBlend,
          dirSign,
          crouchHip,
          crouchKnee,
          groundSlopeFwd,
        );
        const rPose = computeHumanLegPose(
          walkPhase + Math.PI,
          moveBlend,
          runBlend,
          dirSign,
          crouchHip,
          crouchKnee,
          groundSlopeFwd,
        );

        // Low-rock step-up knee lift boost (makes stepping onto slabs/ledges look unmistakably human)
        const stepBell = Math.sin(THREE.MathUtils.clamp(stepLift, 0, 1) * Math.PI);
        const leadStepLeft = climbLeadSide < 0 ? 1 : 0;
        const lStepHip = stepBell * (leadStepLeft ? 0.56 : 0.16);
        const lStepKnee = -stepBell * (leadStepLeft ? 0.85 : 0.25);
        const rStepHip = stepBell * (leadStepLeft ? 0.16 : 0.56);
        const rStepKnee = -stepBell * (leadStepLeft ? 0.25 : 0.85);

        // Lateral leg step for strafing & natural idle weight shift
        const idleWeight = (1 - moveBlend) * Math.sin(elapsed * 0.58) * 0.014;
        const strafeStepL = Math.sin(walkPhase) * strafeFrac * 0.22 * moveBlend;
        const strafeStepR = -Math.sin(walkPhase) * strafeFrac * 0.22 * moveBlend;

        leftLegRig.hip.rotation.x = THREE.MathUtils.damp(leftLegRig.hip.rotation.x, lPose.hipX + lStepHip, 18, dt);
        leftLegRig.hip.rotation.z = THREE.MathUtils.damp(leftLegRig.hip.rotation.z, strafeStepL - 0.025 * (1 - moveBlend), 14, dt);
        leftLegRig.knee.rotation.x = THREE.MathUtils.damp(leftLegRig.knee.rotation.x, Math.min(0, lPose.kneeX + lStepKnee), 18, dt);
        leftLegRig.ankle.rotation.x = THREE.MathUtils.damp(leftLegRig.ankle.rotation.x, lPose.ankleX + stepBell * 0.15, 16, dt);

        rightLegRig.hip.rotation.x = THREE.MathUtils.damp(rightLegRig.hip.rotation.x, rPose.hipX + rStepHip, 18, dt);
        rightLegRig.hip.rotation.z = THREE.MathUtils.damp(rightLegRig.hip.rotation.z, strafeStepR + 0.025 * (1 - moveBlend), 14, dt);
        rightLegRig.knee.rotation.x = THREE.MathUtils.damp(rightLegRig.knee.rotation.x, Math.min(0, rPose.kneeX + rStepKnee), 18, dt);
        rightLegRig.ankle.rotation.x = THREE.MathUtils.damp(rightLegRig.ankle.rotation.x, rPose.ankleX + stepBell * 0.15, 16, dt);

        // Ground-locked pelvis height + subtle 0.38g Martian lope flight lift when sprinting
        const stanceReach = Math.max(lPose.footDownY, rPose.footDownY);
        const martianLopeBounce = Math.abs(Math.sin(walkPhase)) * 0.048 * runBlend;
        const targetPelvisY = Math.max(0.46, stanceReach + martianLopeBounce);
        const lateralShiftX = Math.cos(walkPhase) * 0.024 * moveBlend * dirSign + idleWeight;
        pelvisGroup.position.y = THREE.MathUtils.damp(pelvisGroup.position.y, targetPelvisY, 20, dt);
        pelvisGroup.position.x = THREE.MathUtils.damp(pelvisGroup.position.x, lateralShiftX, 14, dt);
        pelvisGroup.position.z = THREE.MathUtils.damp(pelvisGroup.position.z, 0, 14, dt);
        pelvisGroup.rotation.x = THREE.MathUtils.damp(pelvisGroup.rotation.x, -crouchAmt * 0.12, 14, dt);

        // Natural pelvic twist + list (counter-balanced by upper torso)
        const pelvicYaw = Math.sin(walkPhase) * (0.09 + runBlend * 0.06) * moveBlend * dirSign;
        const pelvicRoll = Math.cos(walkPhase) * 0.035 * moveBlend + idleWeight * 1.4;
        pelvisGroup.rotation.y = THREE.MathUtils.damp(pelvisGroup.rotation.y, pelvicYaw, 14, dt);
        pelvisGroup.rotation.z = THREE.MathUtils.damp(pelvisGroup.rotation.z, pelvicRoll, 14, dt);

        // Upper torso counter-twist + speed/slope/turn-bank lean + subtle breathing chest sway
        const accelLean = -THREE.MathUtils.clamp(accelFwd * 0.022, -0.14, 0.16);
        const slopeLean = -THREE.MathUtils.clamp(groundSlopeFwd * 0.18, -0.12, 0.16);
        const breathPitch = Math.sin(elapsed * 1.65) * 0.015 * (1 - moveBlend * 0.5);
        const fwdLean =
          -THREE.MathUtils.clamp(localFwd * 0.035, -0.08, 0.22) + accelLean + slopeLean - crouchAmt * 0.28 + breathPitch;
        const turnBank = THREE.MathUtils.clamp(clampedTurn * 0.042 * (0.3 + 0.7 * moveBlend), -0.12, 0.12);
        const strafeLean = -strafeFrac * 0.065 * moveBlend;
        torsoGroup.rotation.y = THREE.MathUtils.damp(torsoGroup.rotation.y, -pelvicYaw * 1.15 + clampedTurn * 0.05, 14, dt);
        torsoGroup.rotation.x = THREE.MathUtils.damp(torsoGroup.rotation.x, fwdLean, 14, dt);
        torsoGroup.rotation.z = THREE.MathUtils.damp(torsoGroup.rotation.z, strafeLean - pelvicRoll * 0.65 + turnBank, 14, dt);

        // Human gaze & head stabilization: leads turns & glances gently when idle
        const idleHeadYaw = (1 - moveBlend) * Math.sin(elapsed * 0.42) * 0.09;
        const turnHeadLead = THREE.MathUtils.clamp(clampedTurn * 0.12, -0.32, 0.32);
        helmetGroup.rotation.x = THREE.MathUtils.damp(
          helmetGroup.rotation.x,
          pitch * 0.45 + crouchAmt * 0.16 + Math.sin(elapsed * 1.65) * 0.012,
          12,
          dt,
        );
        helmetGroup.rotation.y = THREE.MathUtils.damp(helmetGroup.rotation.y, pelvicYaw * 0.2 + idleHeadYaw + turnHeadLead, 12, dt);
        helmetGroup.rotation.z = THREE.MathUtils.damp(helmetGroup.rotation.z, -turnBank * 0.6, 12, dt);

        // Counter-phase arm swing with articulated shoulder inward arc, elbow flexion, wrist follow-through & slope balance
        const slopeBalanceOut = Math.min(0.16, Math.abs(groundSlopeFwd) * 0.24);
        const armSwingAmp = (0.36 + runBlend * 0.44) * moveBlend;
        const idleBreathArm = Math.sin(elapsed * 1.65) * 0.028 * (1 - moveBlend);
        const lArmTargetX = -Math.sin(walkPhase) * dirSign * armSwingAmp + crouchAmt * 0.35 + idleBreathArm + stepBell * 0.24;
        const rArmTargetX = Math.sin(walkPhase) * dirSign * armSwingAmp + crouchAmt * 0.35 - idleBreathArm + stepBell * 0.16;
        const armOut = 0.07 + crouchAmt * 0.34 + runBlend * 0.08 + slopeBalanceOut + stepBell * 0.12;
        const elbowFlex = 0.28 + runBlend * 0.68 + crouchAmt * 0.55 + Math.max(0, -Math.sin(walkPhase)) * 0.14 * moveBlend;

        leftArmRig.shoulder.rotation.x = THREE.MathUtils.damp(leftArmRig.shoulder.rotation.x, lArmTargetX, 15, dt);
        leftArmRig.shoulder.rotation.y = THREE.MathUtils.damp(leftArmRig.shoulder.rotation.y, -Math.max(0, lArmTargetX) * 0.24, 14, dt);
        leftArmRig.shoulder.rotation.z = THREE.MathUtils.damp(leftArmRig.shoulder.rotation.z, -armOut, 12, dt);
        leftArmRig.elbow.rotation.x = THREE.MathUtils.damp(
          leftArmRig.elbow.rotation.x,
          elbowFlex + Math.max(0, lArmTargetX) * 0.3,
          14,
          dt,
        );
        leftArmRig.wrist.rotation.x = THREE.MathUtils.damp(leftArmRig.wrist.rotation.x, -Math.sin(walkPhase - 0.5) * 0.14 * moveBlend, 14, dt);

        rightArmRig.shoulder.rotation.x = THREE.MathUtils.damp(rightArmRig.shoulder.rotation.x, rArmTargetX, 15, dt);
        rightArmRig.shoulder.rotation.y = THREE.MathUtils.damp(rightArmRig.shoulder.rotation.y, Math.max(0, rArmTargetX) * 0.24, 14, dt);
        rightArmRig.shoulder.rotation.z = THREE.MathUtils.damp(rightArmRig.shoulder.rotation.z, armOut, 12, dt);
        rightArmRig.elbow.rotation.x = THREE.MathUtils.damp(
          rightArmRig.elbow.rotation.x,
          elbowFlex + Math.max(0, rArmTargetX) * 0.3,
          14,
          dt,
        );
        rightArmRig.wrist.rotation.x = THREE.MathUtils.damp(rightArmRig.wrist.rotation.x, Math.sin(walkPhase - 0.5) * 0.14 * moveBlend, 14, dt);
      } else {
        // Airborne human jump, RCS hover stabilization & landing anticipation pose!
        const fallingBlend = THREE.MathUtils.clamp((-verticalVel - 0.5) / 5.5, 0, 1);
        const hoverSway = Math.sin(elapsed * 7.2) * 0.035 * rcsThrottle;
        const hoverLegTrail = -wishFwd * 0.14 * rcsThrottle;
        const leadHip = (jetpackActive ? 0.22 + hoverSway : THREE.MathUtils.lerp(0.58, 0.34, fallingBlend)) + hoverLegTrail;
        const leadKnee = jetpackActive ? -0.44 - Math.abs(hoverSway) * 0.8 : THREE.MathUtils.lerp(-0.95, -0.48, fallingBlend);
        const trailHip = (jetpackActive ? -0.12 - hoverSway : THREE.MathUtils.lerp(-0.22, 0.22, fallingBlend)) + hoverLegTrail;
        const trailKnee = jetpackActive ? -0.26 : THREE.MathUtils.lerp(-0.28, -0.42, fallingBlend);

        leftLegRig.hip.rotation.x = THREE.MathUtils.damp(leftLegRig.hip.rotation.x, leadHip, 10, dt);
        leftLegRig.hip.rotation.z = THREE.MathUtils.damp(leftLegRig.hip.rotation.z, -0.06 - wishRight * 0.1 * rcsThrottle, 10, dt);
        leftLegRig.knee.rotation.x = THREE.MathUtils.damp(leftLegRig.knee.rotation.x, leadKnee, 10, dt);
        leftLegRig.ankle.rotation.x = THREE.MathUtils.damp(leftLegRig.ankle.rotation.x, -0.14, 10, dt);

        rightLegRig.hip.rotation.x = THREE.MathUtils.damp(rightLegRig.hip.rotation.x, trailHip, 10, dt);
        rightLegRig.hip.rotation.z = THREE.MathUtils.damp(rightLegRig.hip.rotation.z, 0.06 - wishRight * 0.1 * rcsThrottle, 10, dt);
        rightLegRig.knee.rotation.x = THREE.MathUtils.damp(rightLegRig.knee.rotation.x, trailKnee, 10, dt);
        rightLegRig.ankle.rotation.x = THREE.MathUtils.damp(rightLegRig.ankle.rotation.x, -0.2, 10, dt);

        pelvisGroup.position.y = THREE.MathUtils.damp(pelvisGroup.position.y, 0.74, 10, dt);
        pelvisGroup.position.x = THREE.MathUtils.damp(pelvisGroup.position.x, 0, 10, dt);
        pelvisGroup.position.z = THREE.MathUtils.damp(pelvisGroup.position.z, 0, 10, dt);
        pelvisGroup.rotation.x = THREE.MathUtils.damp(pelvisGroup.rotation.x, 0, 10, dt);
        pelvisGroup.rotation.y = THREE.MathUtils.damp(pelvisGroup.rotation.y, 0, 10, dt);
        pelvisGroup.rotation.z = THREE.MathUtils.damp(pelvisGroup.rotation.z, -wishRight * 0.08 * rcsThrottle, 10, dt);

        // Lean whole upper torso into RCS attitude thrust vector!
        const rcsPitch = -wishFwd * (0.2 * rcsThrottle + 0.06);
        const rcsRoll = -wishRight * (0.18 * rcsThrottle + 0.04);
        const baseAirPitch = THREE.MathUtils.lerp(-0.08, -0.18, fallingBlend);
        torsoGroup.rotation.x = THREE.MathUtils.damp(
          torsoGroup.rotation.x,
          THREE.MathUtils.lerp(baseAirPitch, rcsPitch - 0.1, rcsThrottle) + hoverSway * 0.5,
          9,
          dt,
        );
        torsoGroup.rotation.y = THREE.MathUtils.damp(torsoGroup.rotation.y, 0, 10, dt);
        torsoGroup.rotation.z = THREE.MathUtils.damp(torsoGroup.rotation.z, rcsRoll, 9, dt);

        helmetGroup.rotation.x = THREE.MathUtils.damp(helmetGroup.rotation.x, pitch * 0.45, 10, dt);
        helmetGroup.rotation.y = THREE.MathUtils.damp(helmetGroup.rotation.y, THREE.MathUtils.clamp(clampedTurn * 0.1, -0.25, 0.25), 10, dt);
        helmetGroup.rotation.z = THREE.MathUtils.damp(helmetGroup.rotation.z, 0, 10, dt);

        // Arms raise naturally for mid-air attitude control & landing readiness
        const airArmX = jetpackActive ? 0.22 + hoverSway : THREE.MathUtils.lerp(0.45, 0.32, fallingBlend);
        const airArmOut = jetpackActive ? 0.28 : 0.36;
        leftArmRig.shoulder.rotation.x = THREE.MathUtils.damp(leftArmRig.shoulder.rotation.x, airArmX, 8, dt);
        leftArmRig.shoulder.rotation.y = THREE.MathUtils.damp(leftArmRig.shoulder.rotation.y, 0, 8, dt);
        leftArmRig.shoulder.rotation.z = THREE.MathUtils.damp(leftArmRig.shoulder.rotation.z, -airArmOut, 8, dt);
        leftArmRig.elbow.rotation.x = THREE.MathUtils.damp(leftArmRig.elbow.rotation.x, 0.75, 8, dt);
        leftArmRig.wrist.rotation.x = THREE.MathUtils.damp(leftArmRig.wrist.rotation.x, -0.15 * rcsThrottle, 8, dt);

        rightArmRig.shoulder.rotation.x = THREE.MathUtils.damp(rightArmRig.shoulder.rotation.x, airArmX * 0.85, 8, dt);
        rightArmRig.shoulder.rotation.y = THREE.MathUtils.damp(rightArmRig.shoulder.rotation.y, 0, 8, dt);
        rightArmRig.shoulder.rotation.z = THREE.MathUtils.damp(rightArmRig.shoulder.rotation.z, airArmOut, 8, dt);
        rightArmRig.elbow.rotation.x = THREE.MathUtils.damp(rightArmRig.elbow.rotation.x, 0.75, 8, dt);
        rightArmRig.wrist.rotation.x = THREE.MathUtils.damp(rightArmRig.wrist.rotation.x, -0.15 * rcsThrottle, 8, dt);
      }
    },
    dispose: () => {
      albedo.dispose();
      bump.dispose();
      plssTex.dispose();
      dcmTex.dispose();
      patchTex.dispose();
      suitFabric.dispose();
      suitDustyLower.dispose();
      suitSafetyRed.dispose();
      tacticalDark.dispose();
      metalTrim.dispose();
      plssMat.dispose();
      dcmMat.dispose();
      patchMat.dispose();
      visorEnvMap.dispose();
      visorRubberSeal.dispose();
      goldVisor.dispose();
      clearOuterVisorMat.dispose();
      headlampMeshMat.dispose();
      plumeMat.dispose();
      root.traverse((o) => {
        if ((o              ).isMesh) (o              ).geometry.dispose();
      });
    },
  };
}

export function createBreadcrumbStake(x        , z        )              {
  const y = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const stakeMat = new THREE.MeshStandardMaterial({ color: 0xd0d4da, roughness: 0.4, metalness: 0.7 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffc83d,
    emissive: 0xffaa1d,
    emissiveIntensity: 2.2,
  });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.4, 8), stakeMat);
  pole.position.y = 0.7;
  pole.castShadow = true;
  g.add(pole);

  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), glowMat);
  head.position.y = 1.48;
  g.add(head);

  const footRing = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.38, 20),
    new THREE.MeshBasicMaterial({ color: 0xffc83d, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }),
  );
  footRing.rotation.x = -Math.PI / 2;
  footRing.position.y = 0.08;
  g.add(footRing);

  return g;
}

                                 
                     
           
                             
                      
                             
                    
                    
            
                      
 

export function createArChevronTrail()                 {
  const group = new THREE.Group();
  const count = 12;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0.45);
  shape.lineTo(0.55, -0.2);
  shape.lineTo(0.32, -0.35);
  shape.lineTo(0, 0.08);
  shape.lineTo(-0.32, -0.35);
  shape.lineTo(-0.55, -0.2);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);

  const chevrons                                                       = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x45f2ff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    chevrons.push({ mesh, mat });
  }

  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const dirToTarget = new THREE.Vector3();
  const playerFwd = new THREE.Vector3();
  const samplePos = new THREE.Vector3();
  const nextSample = new THREE.Vector3();

  return {
    group,
    update: (playerPos, playerYaw, targetPos, elapsed, active) => {
      group.visible = active;
      if (!active) return;

      const dist = Math.hypot(targetPos.x - playerPos.x, targetPos.z - playerPos.z);
      if (dist < 4.5) {
        group.visible = false;
        return;
      }

      dirToTarget.set(targetPos.x - playerPos.x, 0, targetPos.z - playerPos.z).normalize();
      playerFwd.set(-Math.sin(playerYaw), 0, -Math.cos(playerYaw)).normalize();

      const trailLen = Math.min(20, dist - 2.0);
      p0.set(playerPos.x + dirToTarget.x * 2.2, 0, playerPos.z + dirToTarget.z * 2.2);
      p1.set(
        playerPos.x + (playerFwd.x * 0.45 + dirToTarget.x * 0.55) * (trailLen * 0.48 + 2.2),
        0,
        playerPos.z + (playerFwd.z * 0.45 + dirToTarget.z * 0.55) * (trailLen * 0.48 + 2.2),
      );
      p2.set(
        playerPos.x + dirToTarget.x * (trailLen + 2.2),
        0,
        playerPos.z + dirToTarget.z * (trailLen + 2.2),
      );

      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const omt = 1 - t;
        samplePos.set(
          omt * omt * p0.x + 2 * omt * t * p1.x + t * t * p2.x,
          0,
          omt * omt * p0.z + 2 * omt * t * p1.z + t * t * p2.z,
        );
        const t2 = Math.min(1, t + 0.04);
        const omt2 = 1 - t2;
        nextSample.set(
          omt2 * omt2 * p0.x + 2 * omt2 * t2 * p1.x + t2 * t2 * p2.x,
          0,
          omt2 * omt2 * p0.z + 2 * omt2 * t2 * p1.z + t2 * t2 * p2.z,
        );

        const groundY = getTerrainHeight(samplePos.x, samplePos.z);
        const c = chevrons[i];
        c.mesh.position.set(samplePos.x, groundY + 0.35, samplePos.z);

        const yaw = Math.atan2(-(nextSample.x - samplePos.x), -(nextSample.z - samplePos.z));
        c.mesh.rotation.y = yaw;

        const wave = 0.5 + 0.5 * Math.sin(elapsed * 6.5 - i * 0.75);
        const edgeFade = Math.sin(t * Math.PI * 0.85 + 0.15);
        c.mat.opacity = (0.25 + 0.65 * wave) * edgeFade;
        const sc = 0.72 + 0.22 * wave;
        c.mesh.scale.set(sc, 1, sc);
      }
    },
    dispose: () => {
      geo.dispose();
      chevrons.forEach((c) => c.mat.dispose());
    },
  };
}

function hash2D(ix        , iz        )         {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2(x        , z        )         {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm2(x        , z        , octaves = 4)         {
  let value = 0;
  let amp = 0.5;
  let norm = 0;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * valueNoise2(x * freq, z * freq);
    norm += amp;
    freq *= 2.03;
    amp *= 0.48;
  }
  return value / (norm || 1);
}

export const MARS_LAT_RAD = (33 * Math.PI) / 180;
export const MARS_POLE = new THREE.Vector3(0, Math.sin(MARS_LAT_RAD), -Math.cos(MARS_LAT_RAD)).normalize();
export const MARS_EQ_EAST = new THREE.Vector3(1, 0, 0);
export const MARS_EQ_MERID = new THREE.Vector3(0, Math.cos(MARS_LAT_RAD), Math.sin(MARS_LAT_RAD)).normalize();

export function computeMarsSunDirection(solTime        , target = new THREE.Vector3())                {
  // Smooth continuous diurnal timing at Martian northern solstice (+18° dec) so Day lasts ~67% of each Sol
  // (Sunrise ~03:55, Noon 12:00, Sunset ~20:05) while Night fills the remaining ~33%
  const theta = (solTime - 0.5) * Math.PI * 2;
  const hourAngle = theta - 0.38 * Math.sin(theta);
  const sunDec = (18 * Math.PI) / 180;
  const cosD = Math.cos(sunDec);
  const sinD = Math.sin(sunDec);
  const sH = Math.sin(hourAngle);
  const cH = Math.cos(hourAngle);
  return target
    .set(0, 0, 0)
    .addScaledVector(MARS_EQ_EAST, -sH * cosD)
    .addScaledVector(MARS_EQ_MERID, cH * cosD)
    .addScaledVector(MARS_POLE, sinD)
    .normalize();
}

                                  
                      
                           
                        
                         
                         
                           
                                                                          
           
                             
                             
                          
                    
               
                    
                       
            
                      
 

export function createMartianSkyAndDust(sunDir               )                  {
  // 1. Natural Astronaut-View Milky Way Galaxy + Martian Atmosphere Sky Dome
  // Tuned to human night-adapted / helmet-visor perception through thin Martian air:
  // powdery silver-cream star clouds, dark Great Rift molecular dust lanes, subtle ferric horizon haze,
  // and resolved pinpoint starlight without neon/synthetic noise artifacts.
  const skyGeo = new THREE.SphereGeometry(1100, 48, 32);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSunDir: { value: sunDir.clone().normalize() },
      uMarsPole: { value: MARS_POLE.clone() },
      uZenithColor: { value: new THREE.Color(0x7c4334) },
      uHorizonColor: { value: new THREE.Color(0xd99670) },
      uDayFactor: { value: 1.0 },
      uTwilightFactor: { value: 0.0 },
      uTime: { value: 0.0 },
      uSiderealAngle: { value: 0.0 },
      uZoomLevel: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uMarsPole;
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform float uDayFactor;
      uniform float uTwilightFactor;
      uniform float uTime;
      uniform float uSiderealAngle;
      uniform float uZoomLevel;
      varying vec3 vWorldDir;

      vec3 rotateAroundAxis(vec3 v, vec3 k, float a) {
        float c = cos(a);
        float s = sin(a);
        return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
      }

      float hash31(vec3 p) {
        p = fract(p * vec3(0.1031, 0.1030, 0.0973));
        p += dot(p, p.yxz + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      vec3 hash33(vec3 p) {
        p = vec3(
          dot(p, vec3(127.1, 311.7, 74.7)),
          dot(p, vec3(269.5, 183.3, 246.1)),
          dot(p, vec3(113.5, 271.9, 124.6))
        );
        return fract(sin(p) * 43758.5453123);
      }

      float vnoise3(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(
            mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
            mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
            f.y
          ),
          mix(
            mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
            mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
            f.y
          ),
          f.z
        );
      }

      float fbm3(vec3 p) {
        float sum = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 5; i++) {
          sum += amp * vnoise3(p);
          p = p * 2.07 + vec3(13.1, 7.7, 19.3);
          amp *= 0.49;
        }
        return sum;
      }

      // Ridged multifractal for organic Great Rift dust tendrils & dark absorption filaments
      float ridgeFbm3(vec3 p) {
        float sum = 0.0;
        float amp = 0.52;
        float weight = 1.0;
        for (int i = 0; i < 5; i++) {
          float n = 1.0 - abs(vnoise3(p) * 2.0 - 1.0);
          n = n * n * weight;
          weight = clamp(n * 1.4, 0.15, 1.0);
          sum += n * amp;
          p = p * 2.15 + vec3(5.3, -9.1, 14.7);
          amp *= 0.5;
        }
        return sum;
      }

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float vnoise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float fbmCloud(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          s += a * vnoise2(p);
          p = p * 2.08 + vec2(11.3, 7.1);
          a *= 0.5;
        }
        return s;
      }

      // Zero-distortion 3D-angular pinpoint star sheet (renders razor-sharp faint stars at 1x -> 10x zoom)
      vec3 cubeStarSheet(vec3 dir, float scale, float densityCut, float zoomBoost, float brightScale) {
        vec3 ad = abs(dir);
        vec2 uv;
        float faceId;
        vec3 fAxis, uAxis, vAxis;
        if (ad.x >= ad.y && ad.x >= ad.z) {
          float sx = dir.x > 0.0 ? 1.0 : -1.0;
          fAxis = vec3(sx, 0.0, 0.0);
          uAxis = vec3(0.0, 1.0, 0.0);
          vAxis = vec3(0.0, 0.0, 1.0);
          uv = dir.yz / ad.x;
          faceId = sx > 0.0 ? 1.0 : 2.0;
        } else if (ad.y >= ad.x && ad.y >= ad.z) {
          float sy = dir.y > 0.0 ? 1.0 : -1.0;
          fAxis = vec3(0.0, sy, 0.0);
          uAxis = vec3(1.0, 0.0, 0.0);
          vAxis = vec3(0.0, 0.0, 1.0);
          uv = dir.xz / ad.y;
          faceId = sy > 0.0 ? 3.0 : 4.0;
        } else {
          float sz = dir.z > 0.0 ? 1.0 : -1.0;
          fAxis = vec3(0.0, 0.0, sz);
          uAxis = vec3(1.0, 0.0, 0.0);
          vAxis = vec3(0.0, 1.0, 0.0);
          uv = dir.xy / ad.z;
          faceId = sz > 0.0 ? 5.0 : 6.0;
        }
        vec2 grid = (uv * 0.5 + 0.5) * scale;
        vec2 cell = floor(grid);
        vec3 seed = hash33(vec3(cell, faceId * 19.7 + scale * 0.17));
        if (seed.z < densityCut) return vec3(0.0);

        vec2 cellUv = ((cell + 0.16 + 0.68 * seed.xy) / scale) * 2.0 - 1.0;
        vec3 starDir = normalize(fAxis + uAxis * cellUv.x + vAxis * cellUv.y);
        float angDist = length(starDir - dir) * scale;
        float sharpness = mix(5.0, 8.6, clamp((zoomBoost - 1.0) / 7.0, 0.0, 1.0));
        float salpeter = pow((seed.z - densityCut) / (1.0 - densityCut), 4.0);
        float lum = exp(-angDist * angDist * sharpness * sharpness) * salpeter * brightScale;
        vec3 tint = seed.x < 0.20 ? vec3(0.76, 0.88, 1.0)
                  : seed.x < 0.74 ? vec3(0.99, 0.97, 0.93)
                  : vec3(1.0, 0.83, 0.62);
        return tint * lum;
      }

      vec3 evalMilkyWayCosmos(vec3 celDir, float zoomBoost) {
        // Authentic Martian Night Milky Way: Sagittarius core rising cleanly above S-SE horizon,
        // arching across Zenith toward Cygnus/Perseus in the NW
        vec3 gx = normalize(vec3(0.42, 0.56, 0.71));
        vec3 tmpZ = vec3(-0.74, 0.64, -0.21);
        vec3 gz = normalize(tmpZ - gx * dot(tmpZ, gx));
        vec3 gy = normalize(cross(gz, gx));
        vec3 gPos = vec3(dot(celDir, gx), dot(celDir, gy), dot(celDir, gz));

        float gLat = asin(clamp(gPos.z, -1.0, 1.0));
        float gLon = atan(gPos.y, gPos.x);

        // Anisotropic domain warp: stretches star clouds & dust filaments organically along galactic plane
        vec3 anisoPos = vec3(gPos.x * 2.4, gPos.y * 2.4, gPos.z * 6.8);
        float wMacro = fbm3(anisoPos + vec3(1.7, -2.9, 4.3));
        vec3 warped = normalize(gPos + vec3(wMacro - 0.5) * 0.115);
        float nCloud = fbm3(vec3(warped.x * 3.8, warped.y * 3.8, warped.z * 9.5) + vec3(5.2, -3.1, 1.8));
        float nPatch = fbm3(warped * 11.2 - vec3(4.1, 7.6, -2.4));
        float nFine = fbm3(gPos * 28.0 + vec3(nCloud * 1.4));

        // Natural stellar disk profile + Sagittarius/Scutum/Cygnus star-cloud structure
        float lonAsym = 0.28 + 0.72 * pow(0.5 + 0.5 * cos(gLon * 0.9 - 0.08), 1.45);
        float diskCore = exp(-(gLat * gLat) / (2.0 * 0.086 * 0.086));
        float diskHalo = exp(-(gLat * gLat) / (2.0 * 0.255 * 0.255));

        // Distinct Galactic Bulge + Scutum & Cygnus Star Clouds
        float bulge = exp(-(gLon * gLon) / 0.25 - (gLat * gLat) / 0.044);
        float scutumCloud = exp(-pow((gLon - 0.42) / 0.26, 2.0) - pow((gLat + 0.025) / 0.07, 2.0)) * 0.55;
        float cygnusCloud = exp(-pow((gLon - 1.32) / 0.34, 2.0) - pow((gLat - 0.015) / 0.075, 2.0)) * 0.42;
        float cloudClump = smoothstep(0.28, 0.78, nCloud * 0.62 + nPatch * 0.38);
        float starDensity = (diskCore * (0.44 + 0.78 * cloudClump) + diskHalo * 0.19 * (0.45 + 0.55 * nCloud)) * lonAsym
                          + (scutumCloud + cygnusCloud) * (0.55 + 0.45 * nCloud);

        // Multi-scale Great Rift dark molecular dust lanes (Cygnus -> Aquila -> Pipe -> Rho Ophiuchi)
        float riftDrift = (nCloud - 0.5) * 0.055;
        vec3 rCoord = vec3(warped.x * 3.4, warped.y * 3.4, warped.z * 11.2);
        float r1 = ridgeFbm3(rCoord + vec3(nPatch * 0.45));
        float r2 = ridgeFbm3(rCoord * 2.5 + vec3(6.4, -3.2, 5.1));
        float r3 = ridgeFbm3(rCoord * 5.1 - vec3(2.8, 4.1, -6.3));
        float riftBand = exp(-pow((gLat - riftDrift) * 11.5, 2.0));
        float ophiuchusSpur = exp(-pow((gLat - 0.085 - nPatch * 0.03) * 14.0, 2.0)) * pow(0.5 + 0.5 * cos(gLon - 0.12), 3.0) * 0.78;
        float dustTau = (smoothstep(0.34, 0.76, r1 * 0.56 + r2 * 0.28 + r3 * 0.16) * (riftBand + ophiuchusSpur)) * 3.55;

        // Physical Beer-Lambert dust absorption + warm forward-scattered translucent dust rim
        vec3 dustExtinction = exp(-dustTau * vec3(0.80, 1.32, 2.08));
        float dustEdgeScatter = smoothstep(0.25, 1.25, dustTau) * exp(-dustTau * 0.68) * (starDensity + bulge * 0.8);

        // True deep charcoal-indigo space void (high dynamic range, not washed-out grey)
        vec3 deepSpace = vec3(0.0024, 0.0038, 0.0092) + vec3(0.006, 0.008, 0.018) * diskHalo;

        // Astronaut-eye Milky Way palette: powdery pearl-silver outer river -> soft champagne-cream core (never neon!)
        vec3 riverSilver = mix(vec3(0.24, 0.27, 0.35), vec3(0.43, 0.43, 0.48), nPatch);
        vec3 coreChampagne = mix(vec3(0.68, 0.56, 0.40), vec3(0.92, 0.78, 0.56), bulge);
        float dustPowder = pow(vnoise3(gPos * 190.0 + vec3(nFine)), 3.8) * 0.58
                         + pow(vnoise3(gPos * 380.0), 4.5) * 0.80;
        vec3 stellarHaze = riverSilver * starDensity * 0.56
                         + coreChampagne * bulge * (0.50 + 0.50 * nCloud) * 0.90
                         + vec3(0.76, 0.52, 0.32) * dustEdgeScatter * 0.24
                         + vec3(0.94, 0.90, 0.84) * dustPowder * (starDensity + bulge * 0.85) * 0.32;

        // Subtle astronomical emission & reflection nebulae (Lagoon/Trifid, Carina, Cygnus, Orion, Pleiades)
        vec3 lagoonDir = normalize(vec3(0.98, 0.14, -0.05));
        vec3 carinaDir = normalize(vec3(0.34, -0.94, -0.04));
        vec3 cygnusNebDir = normalize(vec3(0.26, 0.96, 0.05));
        vec3 orionDir = normalize(vec3(-0.74, -0.60, -0.30));
        float nebTex = smoothstep(0.38, 0.78, nPatch * 0.6 + nFine * 0.4);
        float hAlpha = (pow(max(dot(gPos, lagoonDir), 0.0), 64.0) * 0.62
                      + pow(max(dot(gPos, carinaDir), 0.0), 48.0) * 0.50
                      + pow(max(dot(gPos, cygnusNebDir), 0.0), 54.0) * 0.42
                      + pow(max(dot(gPos, orionDir), 0.0), 42.0) * 0.36) * nebTex;
        float refBlue = (pow(max(dot(gPos, normalize(vec3(-0.76, -0.52, -0.38))), 0.0), 72.0) * 0.48
                       + pow(max(dot(gPos, normalize(vec3(0.96, 0.18, -0.08))), 0.0), 110.0) * 0.32)
                      * smoothstep(0.38, 0.76, nCloud);

        // Large & Small Magellanic Clouds (powdery dwarf satellite galaxies off the galactic plane)
        vec3 lmcDir = normalize(vec3(0.24, -0.78, -0.57));
        vec3 lmcT = normalize(cross(lmcDir, vec3(0.0, 1.0, 0.0)));
        vec3 lmcB = cross(lmcDir, lmcT);
        vec2 lmcD = vec2(dot(gPos - lmcDir, lmcT), dot(gPos - lmcDir, lmcB));
        float lmcR = length(vec2(lmcD.x * 11.5, lmcD.y * 17.0));
        float lmcGlow = step(0.0, dot(gPos, lmcDir)) * exp(-lmcR * 2.2) * (0.20 + 0.24 * nPatch);
        float tarantula = step(0.0, dot(gPos, lmcDir)) * exp(-length((lmcD - vec2(0.015, 0.008)) * 75.0)) * 0.22;

        vec3 smcDir = normalize(vec3(0.46, -0.56, -0.68));
        float smcDist = length(gPos - smcDir);
        float smcGlow = step(0.0, dot(gPos, smcDir)) * exp(-smcDist * 26.0) * (0.14 + 0.16 * nCloud);

        // Upgraded M31 Andromeda Spiral Galaxy: tilted spiral disc + warm nucleus + dust modulation
        vec3 m31Axis = normalize(vec3(-0.52, 0.64, -0.56));
        vec3 m31T = normalize(cross(m31Axis, vec3(0.0, 1.0, 0.0)));
        vec3 m31B = cross(m31Axis, m31T);
        vec2 m31D = vec2(dot(gPos - m31Axis, m31T), dot(gPos - m31Axis, m31B));
        float m31Theta = atan(m31D.y * 2.6, m31D.x);
        float m31R = length(vec2(m31D.x * 15.0, m31D.y * 44.0));
        float m31Spiral = 0.72 + 0.28 * cos(2.0 * m31Theta - log(m31R + 0.06) * 3.8);
        float m31Front = step(0.0, dot(gPos, m31Axis));
        float m31Core = m31Front * exp(-m31R * 9.5) * 0.44;
        float m31Disc = m31Front * exp(-m31R * 2.1) * m31Spiral * 0.23;

        vec3 subtleEmission = vec3(0.65, 0.30, 0.33) * (hAlpha + tarantula) + vec3(0.36, 0.54, 0.84) * refBlue;
        vec3 satelliteGalaxies = vec3(0.66, 0.71, 0.82) * (lmcGlow + smcGlow)
                               + vec3(0.95, 0.86, 0.72) * m31Core
                               + vec3(0.72, 0.74, 0.84) * m31Disc;

        vec3 cosmos = deepSpace
                    + (stellarHaze + subtleEmission) * dustExtinction
                    + satelliteGalaxies;

        // Dense 5-tier resolved pinpoint star sheets packed inside star clouds & LMC, occluded cleanly by dark dust lanes
        float armMask = clamp(0.10 + (starDensity * 0.82 + bulge * 0.60 + lmcGlow * 0.9) * dustExtinction.g, 0.0, 1.30);
        vec3 s1 = cubeStarSheet(celDir, 145.0, 0.89 - 0.15 * armMask, zoomBoost, 1.28);
        vec3 s2 = cubeStarSheet(celDir, 270.0, 0.89 - 0.21 * armMask, zoomBoost, 0.98);
        vec3 s3 = cubeStarSheet(celDir, 440.0, 0.90 - 0.24 * armMask, zoomBoost, 0.74);
        vec3 s4 = cubeStarSheet(celDir, 700.0, 0.92 - 0.24 * armMask, zoomBoost, 0.60);
        vec3 s5 = cubeStarSheet(celDir, 1040.0, 0.93 - 0.22 * armMask, zoomBoost, 0.48);
        float zoomReveal = smoothstep(1.15, 4.8, zoomBoost);
        float ultraZoomReveal = smoothstep(2.0, 7.5, zoomBoost);
        cosmos += s1
                + s2 * (0.60 + 0.40 * zoomReveal)
                + s3 * (0.30 + 0.68 * zoomReveal)
                + s4 * (0.12 + 0.82 * zoomReveal)
                + s5 * (0.04 + 0.90 * ultraZoomReveal);

        return cosmos;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);

        // Base Martian sky gradient (dusty butterscotch zenith -> ochre horizon)
        vec3 col = mix(uHorizonColor, uZenithColor, pow(h, 0.48));

        // Authentic Martian Mie Forward Scattering + Cold Blue Sunset Aureole
        float sunCos = max(dot(dir, uSunDir), 0.0);
        float sunElev = uSunDir.y;
        float lowSun = smoothstep(-0.18, 0.34, sunElev) * (1.0 - smoothstep(0.28, 0.72, sunElev));
        float sunVis = smoothstep(-0.14, 0.12, sunElev);

        vec3 dayAureole = vec3(1.0, 0.85, 0.68) * pow(sunCos, 6.0) * (0.22 * uDayFactor);
        vec3 blueSunsetCone = vec3(0.36, 0.64, 0.94) * pow(sunCos, 6.5) * (0.80 * lowSun);
        vec3 crimsonHorizon = vec3(0.94, 0.41, 0.21) * pow(sunCos, 2.2) * (1.0 - pow(h, 0.45)) * (0.45 * uTwilightFactor);
        col += (dayAureole + blueSunsetCone) * sunVis + crimsonHorizon;

        // Subtle Zodiacal Light near twilight horizon + faint Zodiacal dust band across ecliptic at night
        float zodiacal = pow(max(dot(dir, normalize(vec3(uSunDir.x, max(uSunDir.y, 0.18), uSunDir.z))), 0.0), 6.0)
                       * smoothstep(0.0, 0.35, h) * uTwilightFactor * 0.14;
        col += vec3(0.76, 0.63, 0.52) * zodiacal;

        // Rotate world direction inversely around Mars's tilted Celestial Pole to lookup fixed deep sky
        vec3 celDir = normalize(rotateAroundAxis(dir, uMarsPole, uSiderealAngle));
        vec3 cosmos = evalMilkyWayCosmos(celDir, uZoomLevel);

        // Martian ferric dust optical extinction near horizon + daylight glare suppression
        float airMass = 1.0 / max(dir.y + 0.075, 0.045);
        float horizonTrans = exp(-airMass * (0.045 + 0.07 * uDayFactor)) * smoothstep(-0.015, 0.12, dir.y);
        float dayGlare = clamp(uDayFactor * 1.15 + pow(sunCos, 3.5) * (0.58 * uDayFactor + 0.36 * uTwilightFactor), 0.0, 1.0);
        float nightWeight = (1.0 - dayGlare * 0.992) * horizonTrans;

        col += cosmos * (nightWeight * 1.42);

        // Faint dusty amber horizon airglow under Mars night sky
        float limbBand = exp(-pow((dir.y - 0.014) * 14.0, 2.0));
        col += vec3(0.72, 0.38, 0.20) * limbBand * (0.08 + 0.26 * uTwilightFactor) * (1.0 - uDayFactor * 0.80);

        // Tenuous high-altitude Martian CO2 ice & dust cirrus wisps
        if (dir.y > -0.02 && dir.y < 0.38) {
          vec2 cUv = vec2(atan(dir.z, dir.x) * 2.6 + uTime * 0.003, dir.y * 12.5);
          float wisp = fbmCloud(cUv);
          float bandMask = smoothstep(0.0, 0.05, dir.y) * (1.0 - smoothstep(0.11, 0.34, dir.y));
          float cloudDensity = smoothstep(0.51, 0.83, wisp) * bandMask;
          vec3 cloudLit = mix(vec3(0.055, 0.055, 0.08), vec3(0.76, 0.48, 0.34), uDayFactor * 0.65 + uTwilightFactor * 0.55 * pow(sunCos, 2.0));
          col = mix(col, cloudLit, cloudDensity * (0.38 - 0.14 * uDayFactor));
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.frustumCulled = false;
  skyMesh.renderOrder = -10;

  // 2. Volumetric 6,800-Star GPU Spectral Starfield + Bright Celestial Planets (Earth & Jupiter)
  const starCount = 6800;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  const starSize = new Float32Array(starCount);
  const starSeed = new Float32Array(starCount);

  const gxA = new THREE.Vector3(0.42, 0.56, 0.71).normalize();
  const tmpZA = new THREE.Vector3(-0.74, 0.64, -0.21);
  const gzA = tmpZA.addScaledVector(gxA, -tmpZA.dot(gxA)).normalize();
  const gyA = new THREE.Vector3().crossVectors(gzA, gxA).normalize();
  const _sDir = new THREE.Vector3();

  for (let i = 0; i < starCount; i++) {
    const shellR = 960 + hash2D(i, 11.1) * 55;
    if (i === 0) {
      // Bright pale-blue Earth evening/morning star
      _sDir.set(0.58, 0.42, -0.70).normalize();
      starCol[0] = 0.64;
      starCol[1] = 0.87;
      starCol[2] = 1.0;
      starSize[0] = 8.8;
      starSeed[0] = 1.0;
      starPos[0] = _sDir.x * shellR;
      starPos[1] = _sDir.y * shellR;
      starPos[2] = _sDir.z * shellR;
      continue;
    }
    if (i === 1) {
      // Cream-gold Jupiter
      _sDir.set(-0.48, 0.55, -0.68).normalize();
      starCol[3] = 1.0;
      starCol[4] = 0.91;
      starCol[5] = 0.74;
      starSize[1] = 7.8;
      starSeed[1] = 2.0;
      starPos[3] = _sDir.x * shellR;
      starPos[4] = _sDir.y * shellR;
      starPos[5] = _sDir.z * shellR;
      continue;
    }

    if (i < 4300) {
      const lon = hash2D(i * 1.71, 3.11) * Math.PI * 2;
      const lat = (hash2D(i * 2.13, 9.4) + hash2D(i * 4.17, 2.8) + hash2D(i * 5.71, 6.2) - 1.5) * 0.19;
      _sDir
        .set(0, 0, 0)
        .addScaledVector(gxA, Math.cos(lon))
        .addScaledVector(gyA, Math.sin(lon))
        .addScaledVector(gzA, lat)
        .normalize();
    } else {
      const z = hash2D(i * 1.37, 5.19) * 2 - 1;
      const t = hash2D(i * 3.91, 8.23) * Math.PI * 2;
      const rxy = Math.sqrt(Math.max(0, 1 - z * z));
      _sDir.set(rxy * Math.cos(t), z, rxy * Math.sin(t));
    }

    starPos[i * 3] = _sDir.x * shellR;
    starPos[i * 3 + 1] = _sDir.y * shellR;
    starPos[i * 3 + 2] = _sDir.z * shellR;

    const spec = hash2D(i, 17.7);
    if (spec < 0.22) {
      starCol[i * 3] = 0.74;
      starCol[i * 3 + 1] = 0.87;
      starCol[i * 3 + 2] = 1.0;
    } else if (spec < 0.68) {
      starCol[i * 3] = 0.99;
      starCol[i * 3 + 1] = 0.97;
      starCol[i * 3 + 2] = 0.94;
    } else if (spec < 0.90) {
      starCol[i * 3] = 1.0;
      starCol[i * 3 + 1] = 0.87;
      starCol[i * 3 + 2] = 0.68;
    } else {
      starCol[i * 3] = 1.0;
      starCol[i * 3 + 1] = 0.69;
      starCol[i * 3 + 2] = 0.48;
    }

    const mag = Math.pow(hash2D(i, 41.3), 7.8);
    starSize[i] = 1.05 + mag * 5.6;
    starSeed[i] = hash2D(i, 63.1) * 100;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(starCol, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
  starGeo.setAttribute('aSeed', new THREE.BufferAttribute(starSeed, 1));

  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uNightVis: { value: 0 },
      uZoomBoost: { value: 1 },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aSeed;
      uniform float uTime;
      uniform float uZoomBoost;
      varying vec3 vColor;
      varying float vElev;
      varying float vTwinkle;
      varying float vSize;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 d = normalize(worldPos.xyz - cameraPosition);
        vElev = d.y;
        vColor = aColor;
        float scintRate = aSeed <= 2.5 ? 0.45 : (2.2 + (1.0 - clamp(d.y, 0.0, 1.0)) * 3.0);
        float scintAmp = aSeed <= 2.5 ? 0.04 : (0.11 + (1.0 - clamp(d.y, 0.0, 1.0)) * 0.18);
        vTwinkle = (1.0 - scintAmp) + scintAmp * sin(uTime * scintRate + aSeed);
        vSize = aSize;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
        gl_PointSize = aSize * clamp(uZoomBoost, 1.0, 2.0);
      }
    `,
    fragmentShader: `
      uniform float uNightVis;
      varying vec3 vColor;
      varying float vElev;
      varying float vTwinkle;
      varying float vSize;
      void main() {
        if (vElev < -0.02 || uNightVis <= 0.01) discard;
        vec2 uv = gl_PointCoord - 0.5;
        float dist = length(uv);
        float core = exp(-dist * dist * 42.0);
        float halo = exp(-dist * 8.5) * 0.20 * step(4.8, vSize);
        float airy = exp(-pow((dist - 0.28) / 0.045, 2.0)) * 0.11 * step(6.2, vSize);
        float crossSpike = (exp(-abs(uv.x) * 40.0) * exp(-abs(uv.y) * 6.8) + exp(-abs(uv.y) * 40.0) * exp(-abs(uv.x) * 6.8)) * step(4.6, vSize);
        float alpha = (core + halo + airy + crossSpike * 0.36) * smoothstep(-0.01, 0.14, vElev) * uNightVis * vTwinkle;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.frustumCulled = false;
  starPoints.renderOrder = -8;

  // 3. Calibrated Two-Layer Photorealistic Solar Disc (~1.96 deg apparent diameter) + Calm Mie Dust Halo
  // Sized clearly as a real circular star disc (not a tiny pinpoint dot, and not a noisy flaming ball).
  const sunGroup = new THREE.Group();

  const sunDiscGeo = new THREE.PlaneGeometry(52, 52);
  const sunDiscMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uHorizonVis: { value: 1 },
      uSunElev: { value: 0.4 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uHorizonVis;
      uniform float uSunElev;
      varying vec2 vUv;

      float hash31(vec3 p) {
        p = fract(p * vec3(0.1031, 0.1030, 0.0973));
        p += dot(p, p.yxz + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float vnoise3(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(
            mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
            mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
            f.y
          ),
          mix(
            mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
            mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
            f.y
          ),
          f.z
        );
      }

      float fbm3(vec3 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          s += a * vnoise3(p);
          p = p * 2.09 + vec3(7.3, 11.9, 5.1);
          a *= 0.5;
        }
        return s;
      }

      float solarGranules(vec3 sPos, float t) {
        float n1 = fbm3(sPos * 20.0 + vec3(t * 0.08, -t * 0.05, t * 0.07));
        float n2 = fbm3(sPos * 48.0 - vec3(t * 0.12, t * 0.09, -t * 0.10));
        float n3 = vnoise3(sPos * 96.0 + vec3(t * 0.16, -t * 0.14, t * 0.11));
        float cell = abs(n1 * 2.0 - 1.0);
        float fineCell = abs(n2 * 2.0 - 1.0);
        return (1.0 - cell) * 0.52 + (1.0 - fineCell) * 0.30 + n3 * 0.18;
      }

      void main() {
        if (uHorizonVis <= 0.005) discard;
        vec2 p = vUv - 0.5;
        float r = length(p);
        float sunR = 0.29; // 15.08m radius at 880m distance (~1.96 deg apparent disc)
        float rr = r / sunR;
        if (rr > 1.16) discard;

        float lowSun = 1.0 - smoothstep(0.04, 0.42, uSunElev);

        // Crisp circular photosphere boundary with smooth optical AA limb
        float discAlpha = 1.0 - smoothstep(0.988, 1.010, rr);
        float clR = min(rr, 0.999);
        float mu = sqrt(max(0.0, 1.0 - clR * clR));

        // Differential solar axial rotation (equator rotates slightly faster than polar latitudes)
        vec3 spRaw = normalize(vec3(p.x / sunR, p.y / sunR, mu));
        float rot = uTime * (0.017 - 0.005 * spRaw.y * spRaw.y);
        vec3 sp = vec3(
          spRaw.x * cos(rot) - spRaw.z * sin(rot),
          spRaw.y,
          spRaw.x * sin(rot) + spRaw.z * cos(rot)
        );

        // Multi-scale solar granulation + realistic active-belt sunspot pores & limb facular network
        float gran = solarGranules(sp, uTime);
        float activeBelt = exp(-pow((abs(sp.y) - 0.21) * 5.8, 2.0));
        float spotField = fbm3(sp * 7.2 + vec3(4.2, -1.5, 7.8));
        float penumbra = smoothstep(0.66, 0.735, spotField * (0.30 + 0.70 * activeBelt));
        float umbra = smoothstep(0.735, 0.795, spotField * (0.30 + 0.70 * activeBelt));
        float facularNet = smoothstep(0.56, 0.67, spotField) * (1.0 - penumbra) * pow(1.0 - mu, 0.75);

        // Smooth empirical solar limb darkening (luminous warm-cream core -> clean amber-gold rim)
        float limbDark = 0.30 + 0.70 * pow(mu, 0.45);
        float plasmaMod = clamp(0.93 + (gran - 0.5) * 0.14 + facularNet * 0.22 - penumbra * 0.40 - umbra * 0.48, 0.12, 1.18);

        vec3 coreColor = mix(vec3(1.18, 1.13, 1.00), vec3(0.96, 0.97, 1.03), lowSun * 0.40);
        vec3 midColor = mix(vec3(1.07, 0.89, 0.57), vec3(0.91, 0.81, 0.73), lowSun * 0.44);
        vec3 limbColor = mix(vec3(0.98, 0.53, 0.22), vec3(0.78, 0.49, 0.38), lowSun * 0.48);

        vec3 photosphere = mix(limbColor, mix(midColor, coreColor, smoothstep(0.32, 0.92, mu)), smoothstep(0.04, 0.54, mu));
        photosphere *= plasmaMod * limbDark;

        // Delicate chromospheric rose-amber hairline + subtle calm solar prominence arcs on limb
        float limbAngle = atan(p.y, p.x);
        float promArch = exp(-pow(sin(limbAngle * 2.0 + 0.9), 2.0) * 14.0) * 0.65
                       + exp(-pow(sin(limbAngle * 3.0 - 1.4), 2.0) * 20.0) * 0.45;
        float promShimmer = 0.75 + 0.25 * sin(uTime * 0.45 + limbAngle * 5.0);
        float outDist = max(0.0, rr - 1.0);
        float chromoRim = exp(-outDist * 46.0) * step(0.985, rr) * 0.38;
        float chromoProm = exp(-outDist * (24.0 - 10.0 * promArch)) * step(0.992, rr) * promArch * promShimmer * 0.22;

        vec3 rimTint = mix(vec3(1.0, 0.66, 0.34), vec3(0.72, 0.86, 1.0), lowSun * 0.62);
        vec3 promTint = mix(vec3(1.0, 0.46, 0.30), vec3(0.84, 0.74, 0.92), lowSun * 0.45);

        vec3 limbGlowCol = rimTint * chromoRim + promTint * chromoProm;
        vec3 col = mix(limbGlowCol, photosphere, discAlpha);
        float alpha = clamp(max(discAlpha, chromoRim + chromoProm) * uHorizonVis, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const sunDiscMesh = new THREE.Mesh(sunDiscGeo, sunDiscMat);
  sunDiscMesh.renderOrder = -7;
  sunGroup.add(sunDiscMesh);

  // Layer 2: Calm Mie Atmospheric Dust Scattering Aureole + Subtle K-Corona Streamers & 22-deg Martian Ice Halo
  const sunCoronaGeo = new THREE.PlaneGeometry(250, 250);
  const sunCoronaMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uHorizonVis: { value: 1 },
      uSunElev: { value: 0.4 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uHorizonVis;
      uniform float uSunElev;
      varying vec2 vUv;

      void main() {
        if (uHorizonVis <= 0.005) discard;
        vec2 p = vUv - 0.5;
        float r = length(p);
        if (r > 0.5) discard;

        // World radius of disc is 15.08m inside a 250m quad -> sunR = 15.08 / 250 = 0.0603
        float sunR = 0.0603;
        float outerMask = smoothstep(sunR * 0.96, sunR * 1.15, r);
        if (outerMask <= 0.001) discard;

        float dLimb = max(0.0, r - sunR);
        float lowSun = 1.0 - smoothstep(0.04, 0.45, uSunElev);
        float ang = atan(p.y, p.x);

        // Smooth equatorial K-corona streamer envelope (subtle photographic asymmetry, zero harsh spikes)
        float streamer = 1.0 + 0.16 * pow(abs(cos(ang + 0.22)), 2.2) * (0.72 + 0.28 * sin(ang * 2.0 + uTime * 0.06));

        // Smooth physical forward-scattering falloff (daytime warm cream-gold -> Martian twilight blue aureole)
        float innerBloom = exp(-dLimb * 35.0) * 0.36 * streamer;
        float midMie = exp(-dLimb * 10.2) * 0.20 * (0.9 + 0.1 * streamer);
        float outerDust = exp(-r * 4.4) * (1.0 - smoothstep(0.26, 0.5, r)) * 0.12;
        float totalGlow = innerBloom + midMie + outerDust;

        // Faint 22-deg Martian high-altitude CO2/water-ice crystal halo ring
        float halo22 = exp(-pow((r - 0.345) / 0.014, 2.0)) * 0.055 * (0.45 + 0.55 * lowSun) * (1.0 - smoothstep(0.38, 0.49, r));

        vec3 dayGlow = vec3(1.0, 0.85, 0.59);
        vec3 blueMie = vec3(0.56, 0.78, 1.0);
        vec3 col = mix(dayGlow, blueMie, lowSun * 0.70) * totalGlow
                 + mix(vec3(0.98, 0.88, 0.72), vec3(0.68, 0.84, 1.0), lowSun * 0.55) * halo22;
        float alpha = clamp((totalGlow + halo22) * outerMask * uHorizonVis, 0.0, 1.0);
        gl_FragColor = vec4(col * outerMask * uHorizonVis, alpha);
      }
    `,
  });
  const sunCoronaMesh = new THREE.Mesh(sunCoronaGeo, sunCoronaMat);
  sunCoronaMesh.renderOrder = -7;
  sunGroup.add(sunCoronaMesh);

  // Layer 3: Refined Anamorphic Visor Glint & Optical Diffraction Ghost
  const sunFlareGeo = new THREE.PlaneGeometry(235, 84);
  const sunFlareMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uHorizonVis: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uHorizonVis;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        if (uHorizonVis <= 0.005) discard;
        vec2 p = vUv - 0.5;
        float horiz = exp(-abs(p.y) * 34.0) * exp(-abs(p.x) * 4.5);
        float diagA = exp(-abs(p.y - p.x * 0.35) * 42.0) * exp(-length(p) * 7.0) * 0.35;
        float diagB = exp(-abs(p.y + p.x * 0.35) * 42.0) * exp(-length(p) * 7.0) * 0.35;
        float ringDist = abs(length(vec2(p.x * 2.8, p.y)) - 0.28);
        float haloRing = exp(-ringDist * 40.0) * 0.085;
        vec3 col = vec3(1.0, 0.84, 0.58) * (horiz * 0.15 + (diagA + diagB) * 0.09)
                 + vec3(0.62, 0.80, 1.0) * haloRing;
        float alpha = clamp((horiz * 0.15 + (diagA + diagB) * 0.09 + haloRing) * uHorizonVis, 0.0, 1.0);
        gl_FragColor = vec4(col * uHorizonVis, alpha);
      }
    `,
  });
  const sunFlareMesh = new THREE.Mesh(sunFlareGeo, sunFlareMat);
  sunFlareMesh.renderOrder = -6;
  sunGroup.add(sunFlareMesh);

  // 4. Sculpted High-Resolution 3D Phobos & Deimos in Authentic Keplerian Mars-Centered Orbits (+ Eclipsing Mars Shadow!)
  function buildMoonGeometry(radius        , isPhobos         )                       {
    const geo = new THREE.IcosahedronGeometry(radius, isPhobos ? 5 : 4);
    const pos = geo.attributes.position;
    const normDirs = new Float32Array(pos.count * 3);
    const stickneyDir = new THREE.Vector3(0.72, 0.24, 0.65).normalize();
    const hallDir = new THREE.Vector3(-0.62, -0.35, 0.70).normalize();
    const rocheDir = new THREE.Vector3(0.18, 0.88, -0.44).normalize();
    const swiftDir = new THREE.Vector3(0.55, 0.35, 0.76).normalize();
    const _v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      const len = _v.length() || 1;
      const nx = _v.x / len;
      const ny = _v.y / len;
      const nz = _v.z / len;
      normDirs[i * 3] = nx;
      normDirs[i * 3 + 1] = ny;
      normDirs[i * 3 + 2] = nz;

      const lump =
        0.87 +
        0.13 * Math.sin(nx * 2.9 + ny * 2.3) +
        0.08 * Math.cos(nz * 4.1 - nx * 2.2) +
        (fbm2(nx * 2.6 + 3.0, nz * 2.6 - ny * 2.0, 4) - 0.5) * 0.18;
      let s = lump;

      if (isPhobos) {
        const dStick = nx * stickneyDir.x + ny * stickneyDir.y + nz * stickneyDir.z;
        if (dStick > 0.72) {
          const bowl = (dStick - 0.72) / 0.28;
          s -= Math.pow(bowl, 1.15) * 0.22;
        } else if (dStick > 0.61) {
          const rim = 1.0 - Math.abs(dStick - 0.69) / 0.08;
          s += Math.max(0, rim) * 0.055;
        }

        const dHall = nx * hallDir.x + ny * hallDir.y + nz * hallDir.z;
        if (dHall > 0.85) s -= ((dHall - 0.85) / 0.15) * 0.11;
        else if (dHall > 0.79) s += 0.025;

        const dRoche = nx * rocheDir.x + ny * rocheDir.y + nz * rocheDir.z;
        if (dRoche > 0.87) s -= ((dRoche - 0.87) / 0.13) * 0.09;

        _v.set(nx * radius * s * 1.30, ny * radius * s * 0.86, nz * radius * s * 0.94);
      } else {
        const saddle = Math.max(0, -ny * 0.7 + nz * 0.5);
        s -= Math.pow(saddle, 2.2) * 0.09;
        const dSwift = nx * swiftDir.x + ny * swiftDir.y + nz * swiftDir.z;
        if (dSwift > 0.86) s -= ((dSwift - 0.86) / 0.14) * 0.10;
        _v.set(nx * radius * s * 1.17, ny * radius * s * 0.90, nz * radius * s * 0.96);
      }
      pos.setXYZ(i, _v.x, _v.y, _v.z);
    }
    geo.setAttribute('aUnitDir', new THREE.BufferAttribute(normDirs, 3));
    geo.computeVertexNormals();
    return geo;
  }

  function createMoonMaterial(isPhobos         )                       {
    return new THREE.ShaderMaterial({
      fog: false,
      depthTest: true,
      depthWrite: true,
      uniforms: {
        uSunDir: { value: sunDir.clone().normalize() },
        uSkyBehind: { value: new THREE.Color(0xd99670) },
        uDayWashout: { value: 0.75 },
        uMarsShadow: { value: 0.0 },
        uIsPhobos: { value: isPhobos ? 1.0 : 0.0 },
      },
      vertexShader: `
        attribute vec3 aUnitDir;
        varying vec3 vUnitDir;
        varying vec3 vWNorm;
        varying vec3 vWPos;
        void main() {
          vUnitDir = normalize(aUnitDir);
          vWNorm = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uSkyBehind;
        uniform float uDayWashout;
        uniform float uMarsShadow;
        uniform float uIsPhobos;
        varying vec3 vUnitDir;
        varying vec3 vWNorm;
        varying vec3 vWPos;

        float hash31(vec3 p) {
          p = fract(p * vec3(0.1031, 0.1030, 0.0973));
          p += dot(p, p.yxz + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        vec3 hash33(vec3 p) {
          p = vec3(
            dot(p, vec3(127.1, 311.7, 74.7)),
            dot(p, vec3(269.5, 183.3, 246.1)),
            dot(p, vec3(113.5, 271.9, 124.6))
          );
          return fract(sin(p) * 43758.5453123);
        }

        float vnoise3(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(
              mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
              mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
              f.y
            ),
            mix(
              mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
              mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
              f.y
            ),
            f.z
          );
        }

        float fbm3(vec3 p) {
          float s = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            s += a * vnoise3(p);
            p = p * 2.09 + vec3(5.3, 9.7, 3.1);
            a *= 0.49;
          }
          return s;
        }

        float craterOctave(vec3 p, float freq) {
          vec3 q = p * freq;
          vec3 cell = floor(q);
          vec3 frac = fract(q);
          float minD = 1.6;
          for (int dz = -1; dz <= 1; dz++) {
            for (int dy = -1; dy <= 1; dy++) {
              for (int dx = -1; dx <= 1; dx++) {
                vec3 nb = cell + vec3(float(dx), float(dy), float(dz));
                vec3 j = hash33(nb);
                if (j.z > 0.32) {
                  vec3 ctr = vec3(float(dx), float(dy), float(dz)) + 0.18 + 0.64 * j;
                  minD = min(minD, length(ctr - frac));
                }
              }
            }
          }
          float bowl = smoothstep(0.0, 0.48, minD) - 1.0;
          float rim = exp(-pow((minD - 0.52) / 0.14, 2.0)) * 0.42;
          return bowl * 0.85 + rim;
        }

        float evalMoonRelief(vec3 p) {
          float regolith = fbm3(p * 4.5) * 0.35 + fbm3(p * 14.0) * 0.16;
          float cr1 = craterOctave(p, uIsPhobos > 0.5 ? 4.2 : 3.2) * (uIsPhobos > 0.5 ? 0.55 : 0.34);
          float cr2 = craterOctave(p + vec3(3.1), 10.5) * (uIsPhobos > 0.5 ? 0.32 : 0.18);
          float grooves = 0.0;
          if (uIsPhobos > 0.5) {
            float grooveWave = sin(dot(p, normalize(vec3(0.42, 0.82, -0.38))) * 58.0 + regolith * 3.8);
            grooves = -smoothstep(0.55, 0.95, grooveWave) * 0.24;
          }
          return regolith + cr1 + cr2 + grooves;
        }

        void main() {
          vec3 p = normalize(vUnitDir);
          vec3 baseN = normalize(vWNorm);
          vec3 V = normalize(cameraPosition - vWPos);
          vec3 L = normalize(uSunDir);

          vec3 refUp = abs(p.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
          vec3 T = normalize(cross(refUp, p));
          vec3 B = cross(p, T);

          float eps = 0.012;
          float h0 = evalMoonRelief(p);
          float hT = evalMoonRelief(normalize(p + T * eps));
          float hB = evalMoonRelief(normalize(p + B * eps));
          float reliefStrength = uIsPhobos > 0.5 ? 1.65 : 0.95;

          vec3 wUp = abs(baseN.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
          vec3 wT = normalize(cross(wUp, baseN));
          vec3 wB = cross(baseN, wT);
          vec3 N = normalize(baseN - (wT * (hT - h0) + wB * (hB - h0)) / eps * (0.012 * reliefStrength));

          float ndlRaw = dot(N, L);
          float ndlGeo = dot(baseN, L);
          float termMask = smoothstep(-0.04, 0.08, ndlGeo);
          float ndl = max(ndlRaw, 0.0) * termMask;
          float ndv = max(dot(N, V), 0.08);
          float lommel = ndl / (ndl + ndv + 0.14);
          float oppSurge = pow(max(dot(V, L), 0.0), 6.0) * 0.35;
          float sunlit = (lommel * 2.15 + ndl * 0.45) * (1.0 + oppSurge);

          vec3 stickDir = normalize(vec3(0.72, 0.24, 0.65));
          float stickProx = smoothstep(0.55, 0.95, dot(p, stickDir)) * uIsPhobos;
          float mineralVar = fbm3(p * 3.8 + vec3(9.1));
          vec3 darkCarbon = vec3(0.29, 0.25, 0.24);
          vec3 dustyRust = vec3(0.56, 0.41, 0.33);
          vec3 blueEjecta = vec3(0.68, 0.69, 0.72);

          vec3 albedo = mix(darkCarbon, dustyRust, smoothstep(0.28, 0.75, mineralVar));
          albedo = mix(albedo, blueEjecta, stickProx * 0.55 + clamp(h0 * 0.6, 0.0, 0.32));
          albedo *= uIsPhobos > 0.5 ? 1.18 : 1.32;

          // Mars shadow umbra eclipse fades sunlight smoothly to deep coppery rust
          vec3 directSolar = sunlit * mix(vec3(1.06, 0.98, 0.90), vec3(0.14, 0.032, 0.018), uMarsShadow);
          float marsBounce = smoothstep(0.6, -0.6, dot(N, L)) * (0.28 + 0.72 * max(-baseN.y, 0.0));
          vec3 indirectMars = vec3(0.075, 0.036, 0.022) * marsBounce + vec3(0.014, 0.016, 0.024);

          vec3 litMoon = albedo * (directSolar + indirectMars);
          vec3 atmMoon = litMoon * (1.0 - 0.25 * uDayWashout) + uSkyBehind * (0.94 * uDayWashout);
          vec3 finalCol = mix(litMoon, atmMoon, smoothstep(0.04, 0.74, uDayWashout));

          gl_FragColor = vec4(finalCol, 1.0);
        }
      `,
    });
  }

  const phobosGeo = buildMoonGeometry(15.6, true);
  const phobosMat = createMoonMaterial(true);
  const phobosMesh = new THREE.Mesh(phobosGeo, phobosMat);
  phobosMesh.frustumCulled = false;
  phobosMesh.renderOrder = -5;

  const deimosGeo = buildMoonGeometry(6.8, false);
  const deimosMat = createMoonMaterial(false);
  const deimosMesh = new THREE.Mesh(deimosGeo, deimosMat);
  deimosMesh.frustumCulled = false;
  deimosMesh.renderOrder = -6;

  // 5. Ambient Windblown Martian Dust + Pooled Boot-Kickup Particles
  const ambientCount = 220;
  const kickupCount = 60;
  const totalCount = ambientCount + kickupCount;
  const positions = new Float32Array(totalCount * 3);
  const kickupVel = new Float32Array(kickupCount * 3);
  const kickupLife = new Float32Array(kickupCount);
  let kickupCursor = 0;

  for (let i = 0; i < ambientCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = Math.random() * 14;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  for (let i = ambientCount; i < totalCount; i++) {
    positions[i * 3 + 1] = -999;
  }

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // Round, soft-edged motes (a plain PointsMaterial draws hard squares that look like objects floating in the air).
  const moteTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const dustMat = new THREE.PointsMaterial({
    color: 0xe39e74,
    map: moteTex,
    size: 0.05,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;

  const _moonSkyTint = new THREE.Color();
  const _zenDay = new THREE.Color(0x7c4334);
  const _zenTwil = new THREE.Color(0x281c2e);
  const _zenNight = new THREE.Color(0x040610);
  const _horDay = new THREE.Color(0xd99670);
  const _horTwil = new THREE.Color(0xc95e3a);
  const _horNight = new THREE.Color(0x160f14);
  const _dustDay = new THREE.Color(0xe39e74);
  const _dustNight = new THREE.Color(0x4a3536);

  // Keplerian Mars-Centered Orbital Helpers for Phobos & Deimos
  const R_MARS = 300;
  const A_PHOBOS = 830; // 2.766 * R_MARS -> zenith dist 530, horizon dist 774 (1.46x true parallax!)
  const A_DEIMOS = 2076; // 6.920 * R_MARS
  const _moonFromMars = new THREE.Vector3();
  const _moonFromObs = new THREE.Vector3();
  const _shadowPerp = new THREE.Vector3();

  // Tilted equatorial plane vectors for Phobos (inc ~5.5 deg) & Deimos (inc ~7.8 deg)
  const phobosU = MARS_EQ_EAST.clone();
  const phobosV = MARS_EQ_MERID.clone().addScaledVector(MARS_POLE, 0.095).normalize();
  const deimosU = MARS_EQ_EAST.clone().addScaledVector(MARS_POLE, -0.07).normalize();
  const deimosV = MARS_EQ_MERID.clone().addScaledVector(MARS_POLE, -0.125).normalize();

  return {
    skyMesh,
    starPoints,
    sunGroup,
    phobosMesh,
    deimosMesh,
    dustPoints,
    emitBootDust: (x, y, z, count = 8) => {
      const attr = dustGeo.attributes.position                         ;
      for (let n = 0; n < count; n++) {
        const k = kickupCursor;
        kickupCursor = (kickupCursor + 1) % kickupCount;
        const idx = ambientCount + k;
        attr.setXYZ(idx, x + (Math.random() - 0.5) * 0.45, y + 0.08, z + (Math.random() - 0.5) * 0.45);
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.7 + Math.random() * 1.4;
        kickupVel[k * 3] = Math.cos(ang) * spd;
        kickupVel[k * 3 + 1] = 0.65 + Math.random() * 0.9;
        kickupVel[k * 3 + 2] = Math.sin(ang) * spd;
        kickupLife[k] = 0.65 + Math.random() * 0.4;
      }
      attr.needsUpdate = true;
    },
    update: (cameraPos, playerPos, nextSunDir, solTime, dt, elapsed, zoomLevel = 1) => {
      const sunElev = nextSunDir.y;
      const dayFactor = THREE.MathUtils.smoothstep(sunElev, -0.05, 0.34);
      const twilightFactor =
        THREE.MathUtils.smoothstep(sunElev, -0.24, 0.02) * (1 - THREE.MathUtils.smoothstep(sunElev, 0.04, 0.36));
      const nightFactor = 1.0 - THREE.MathUtils.smoothstep(sunElev, -0.16, 0.14);

      // Update Sky Dome centered on camera & rotating around Mars's true Celestial Pole
      const siderealAngle = solTime * Math.PI * 2;
      skyMesh.position.copy(cameraPos);
      skyMat.uniforms.uSunDir.value.copy(nextSunDir);
      skyMat.uniforms.uDayFactor.value = dayFactor;
      skyMat.uniforms.uTwilightFactor.value = twilightFactor;
      skyMat.uniforms.uTime.value = elapsed;
      skyMat.uniforms.uZoomLevel.value = zoomLevel;
      skyMat.uniforms.uSiderealAngle.value = siderealAngle;

      const zCol = skyMat.uniforms.uZenithColor.value               ;
      zCol.copy(_zenNight).lerp(_zenTwil, twilightFactor).lerp(_zenDay, dayFactor);
      const hCol = skyMat.uniforms.uHorizonColor.value               ;
      hCol.copy(_horNight).lerp(_horTwil, twilightFactor).lerp(_horDay, dayFactor);

      // Rotate 4,800-starfield quaternion in exact lockstep around MARS_POLE
      starPoints.position.copy(cameraPos);
      starPoints.quaternion.setFromAxisAngle(MARS_POLE, -siderealAngle);
      starMat.uniforms.uTime.value = elapsed;
      starMat.uniforms.uNightVis.value = Math.max(nightFactor, twilightFactor * 0.65);
      starMat.uniforms.uZoomBoost.value = 1.0 + Math.max(0, zoomLevel - 1) * 0.22;
      starPoints.visible = starMat.uniforms.uNightVis.value > 0.015;

      // Position 2-Layer Sun along live sunDir
      sunGroup.position.copy(cameraPos).addScaledVector(nextSunDir, 880);
      sunGroup.lookAt(cameraPos);
      const horVis = THREE.MathUtils.smoothstep(sunElev, -0.05, 0.07);
      sunDiscMat.uniforms.uTime.value = elapsed;
      sunDiscMat.uniforms.uHorizonVis.value = horVis;
      sunDiscMat.uniforms.uSunElev.value = sunElev;
      sunCoronaMat.uniforms.uTime.value = elapsed;
      sunCoronaMat.uniforms.uHorizonVis.value = horVis;
      sunCoronaMat.uniforms.uSunElev.value = sunElev;
      sunFlareMat.uniforms.uHorizonVis.value = horVis * (0.35 + 0.65 * twilightFactor);
      sunFlareMat.uniforms.uTime.value = elapsed;
      sunGroup.visible = horVis > 0.005;

      // Phobos Keplerian Orbit (prograde West-to-East synodic +2.226 rev/Sol around Mars center at y = -R_MARS)
      // Rises in the WEST (-X), sweeps overhead (+1.46x larger at zenith!), sets in the EAST (+X), and enters Mars's shadow!
      const phAngle = solTime * Math.PI * 2 * 2.226 + 4.35;
      _moonFromMars
        .set(0, 0, 0)
        .addScaledVector(phobosU, Math.cos(phAngle) * A_PHOBOS)
        .addScaledVector(phobosV, Math.sin(phAngle) * A_PHOBOS);
      _moonFromObs.copy(_moonFromMars);
      _moonFromObs.y -= R_MARS;

      // Geometric Mars cylinder shadow test along -sunDir
      const phProj = _moonFromMars.dot(nextSunDir);
      let phShadow = 0;
      if (phProj < 0) {
        _shadowPerp.copy(_moonFromMars).addScaledVector(nextSunDir, -phProj);
        phShadow = 1 - THREE.MathUtils.smoothstep(_shadowPerp.length(), R_MARS - 14, R_MARS + 18);
      }

      phobosMesh.position.copy(cameraPos).add(_moonFromObs);
      phobosMesh.lookAt(cameraPos);
      phobosMesh.rotateY(0.28);
      _moonSkyTint.copy(hCol).lerp(zCol, THREE.MathUtils.clamp(_moonFromObs.y / 540, 0, 1));
      phobosMat.uniforms.uSunDir.value.copy(nextSunDir);
      phobosMat.uniforms.uSkyBehind.value.copy(_moonSkyTint);
      phobosMat.uniforms.uDayWashout.value = dayFactor * 0.70;
      phobosMat.uniforms.uMarsShadow.value = phShadow;
      phobosMesh.visible = _moonFromObs.y > -45;

      // Deimos Keplerian Orbit (slow East-to-West synodic -0.187 rev/Sol around Mars center)
      // Rises in the EAST (+X), drifts slowly westward across the sky over ~60h, positioned inside [805..845] preserving angular parallax
      const deAngle = -solTime * Math.PI * 2 * 0.187 + 1.08;
      _moonFromMars
        .set(0, 0, 0)
        .addScaledVector(deimosU, Math.cos(deAngle) * A_DEIMOS)
        .addScaledVector(deimosV, Math.sin(deAngle) * A_DEIMOS);
      _moonFromObs.copy(_moonFromMars);
      _moonFromObs.y -= R_MARS;
      const deTrueDist = _moonFromObs.length() || 1;
      const deMappedDist = 805 + ((deTrueDist - (A_DEIMOS - R_MARS)) / (2 * R_MARS)) * 38;
      _moonFromObs.multiplyScalar(deMappedDist / deTrueDist);

      const deProj = _moonFromMars.dot(nextSunDir);
      let deShadow = 0;
      if (deProj < 0) {
        _shadowPerp.copy(_moonFromMars).addScaledVector(nextSunDir, -deProj);
        deShadow = 1 - THREE.MathUtils.smoothstep(_shadowPerp.length(), R_MARS - 16, R_MARS + 22);
      }

      deimosMesh.position.copy(cameraPos).add(_moonFromObs);
      deimosMesh.lookAt(cameraPos);
      _moonSkyTint.copy(hCol).lerp(zCol, THREE.MathUtils.clamp(_moonFromObs.y / 650, 0, 1));
      deimosMat.uniforms.uSunDir.value.copy(nextSunDir);
      deimosMat.uniforms.uSkyBehind.value.copy(_moonSkyTint);
      deimosMat.uniforms.uDayWashout.value = dayFactor * 0.74;
      deimosMat.uniforms.uMarsShadow.value = deShadow;
      deimosMesh.visible = _moonFromObs.y > -40;

      // Tint ambient Martian dust to match day/night illumination
      dustMat.color.copy(_dustNight).lerp(_dustDay, Math.max(dayFactor, twilightFactor * 0.65));
      dustMat.opacity = 0.22 + 0.28 * dayFactor;

      const attr = dustGeo.attributes.position                         ;
      for (let i = 0; i < ambientCount; i++) {
        let px = attr.getX(i) + dt * 2.4;
        let py = attr.getY(i) + Math.sin(elapsed * 0.9 + i) * dt * 0.18;
        let pz = attr.getZ(i) + dt * 0.8;
        if (px - playerPos.x > 30) px -= 60;
        if (px - playerPos.x < -30) px += 60;
        if (pz - playerPos.z > 30) pz -= 60;
        if (pz - playerPos.z < -30) pz += 60;
        if (py < playerPos.y - 2) py = playerPos.y + 11;
        if (py > playerPos.y + 13) py = playerPos.y + 1;
        attr.setXYZ(i, px, py, pz);
      }
      for (let k = 0; k < kickupCount; k++) {
        if (kickupLife[k] > 0) {
          kickupLife[k] -= dt;
          const idx = ambientCount + k;
          kickupVel[k * 3 + 1] -= 3.721 * 0.55 * dt;
          attr.setXYZ(
            idx,
            attr.getX(idx) + kickupVel[k * 3] * dt,
            attr.getY(idx) + kickupVel[k * 3 + 1] * dt,
            attr.getZ(idx) + kickupVel[k * 3 + 2] * dt,
          );
          if (kickupLife[k] <= 0) {
            attr.setY(idx, -999);
          }
        }
      }
      attr.needsUpdate = true;
    },
    dispose: () => {
      skyGeo.dispose();
      skyMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      sunDiscGeo.dispose();
      sunDiscMat.dispose();
      sunCoronaGeo.dispose();
      sunCoronaMat.dispose();
      sunFlareGeo.dispose();
      sunFlareMat.dispose();
      phobosGeo.dispose();
      phobosMat.dispose();
      deimosGeo.dispose();
      deimosMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
    },
  };
}

