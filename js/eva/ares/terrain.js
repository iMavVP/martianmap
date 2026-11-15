import * as THREE from 'three';

export const TERRAIN_SIZE = 1000;
export const TERRAIN_SEGMENTS = 256;

                     
            
            
                 
                
                    
 

                                  
            
            
            
             
             
             
                 
               
               
                            
               
                        
                      
 

// Integer hash for texture pixels (a sine hash on pixel coordinates leaves a visible grid pattern on the ground).
function ihash(x, y, seed) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function hash2(ix        , iz        )         {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothstep(t        )         {
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(x        , z        )         {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = smoothstep(fx);
  const v = smoothstep(fz);

  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);

  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x        , z        , octaves = 5)         {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * (valueNoise2D(x * freq, z * freq) * 2 - 1);
    freq *= 2.03;
    amp *= 0.48;
  }
  return value;
}

function ridgedNoise(x        , z        )         {
  const n = 1 - Math.abs(valueNoise2D(x, z) * 2 - 1);
  return n * n;
}

const CRATERS              = [
  { x: 68, z: -64, radius: 36, depth: 8.5, rimHeight: 3.6 },
  { x: -110, z: -95, radius: 52, depth: 12.0, rimHeight: 4.8 },
  { x: 145, z: 95, radius: 44, depth: 10.5, rimHeight: 4.2 },
  { x: -55, z: 135, radius: 34, depth: 7.5, rimHeight: 2.9 },
  { x: 210, z: -155, radius: 62, depth: 14.0, rimHeight: 5.6 },
  { x: -205, z: 60, radius: 48, depth: 11.0, rimHeight: 4.4 },
  { x: 35, z: -190, radius: 38, depth: 8.0, rimHeight: 3.2 },
  { x: -145, z: -225, radius: 56, depth: 13.0, rimHeight: 5.0 },
  { x: 185, z: 210, radius: 50, depth: 11.5, rimHeight: 4.2 },
  { x: -235, z: -165, radius: 58, depth: 13.5, rimHeight: 5.1 },
  { x: 92, z: 42, radius: 19, depth: 4.0, rimHeight: 1.8 },
  { x: -72, z: -38, radius: 22, depth: 4.8, rimHeight: 2.1 },
];

export function getTerrainHeight(x        , z        )         {
  const distFromOrigin = Math.hypot(x, z);

  // Rolling Martian plains + layered ridges + aeolian micro-dunes
  let h = fbm(x * 0.0055 + 11.3, z * 0.0055 - 7.1, 5) * 14.5;
  h += ridgedNoise(x * 0.012 - 3.4, z * 0.012 + 5.2) * 5.2;
  h += fbm(x * 0.032, z * 0.032, 3) * 1.4;
  // Wind-blown sand ripple undulation
  h += Math.sin(x * 0.38 + z * 0.14 + fbm(x * 0.08, z * 0.08, 2) * 2.5) * 0.14;

  // Impact craters with realistic radial inner-rim gully striations
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i];
    const dx = x - c.x;
    const dz = z - c.z;
    const d = Math.hypot(dx, dz);
    const rNorm = d / c.radius;
    if (rNorm < 1.7) {
      const ang = Math.atan2(dz, dx);
      const gully = Math.sin(ang * 19 + i * 2.1) * 0.5 + Math.sin(ang * 37 - i) * 0.35;
      if (rNorm < 1.0) {
        const bowl = 1 - rNorm * rNorm;
        const slopeBand = Math.max(0, 1 - Math.abs(rNorm - 0.72) / 0.25);
        h -= c.depth * Math.pow(bowl, 1.35);
        h += gully * 0.55 * slopeBand;
      }
      const rimDist = (rNorm - 1.0) / 0.28;
      const rim = Math.exp(-rimDist * rimDist);
      h += (c.rimHeight + gully * 0.38) * rim;
    }
  }

  // Natural perimeter canyon walls / stratified mesas beyond 320m
  if (distFromOrigin > 320) {
    const t = Math.min(1, (distFromOrigin - 320) / 160);
    const rawMesa = Math.pow(t, 1.6) * 50 + ridgedNoise(x * 0.018, z * 0.018) * 18 * t;
    // Slight geological terrace stepping
    h += rawMesa + Math.sin(rawMesa * 0.45) * 0.85 * t;
  }

  // Smooth landing pad plateau around HAB at (0, 0)
  if (distFromOrigin < 34) {
    const padBlend = Math.max(0, Math.min(1, (distFromOrigin - 17) / 17));
    const smoothPad = padBlend * padBlend * (3 - 2 * padBlend);
    h = h * smoothPad;
  }

  return h;
}

export function getTerrainNormal(x        , z        , out = new THREE.Vector3())                {
  const eps = 0.55;
  const hL = getTerrainHeight(x - eps, z);
  const hR = getTerrainHeight(x + eps, z);
  const hD = getTerrainHeight(x, z - eps);
  const hU = getTerrainHeight(x, z + eps);
  out.set(hL - hR, 2 * eps, hD - hU).normalize();
  return out;
}

export function getTerrainSlopeDeg(x        , z        )         {
  const n = getTerrainNormal(x, z);
  const clampedY = Math.max(-1, Math.min(1, n.y));
  return THREE.MathUtils.radToDeg(Math.acos(clampedY));
}

                                       
                   
                                       
                                
                             
                             
                               
                               
                 
                                          
                                   
                                  
                                  
    
                      
 

export function createMartianPbrTextures(maxAnisotropy        )   
                                
                                 
                                    
  {
  const size = 1024;
  const heightField = new Float32Array(size * size);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d') ;
  const cImg = cCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d') ;
  const rImg = rCtx.createImageData(size, size);

  // Tileable periodic noise helpers
  const tileNoise = (px        , py        , freq        , seed        ) => {
    const u = (px / size) * Math.PI * 2 * freq;
    const v = (py / size) * Math.PI * 2 * freq;
    const nx = Math.cos(u) * 1.8 + Math.sin(v) * 0.7 + seed;
    const nz = Math.sin(u) * 1.8 + Math.cos(v) * 0.7 - seed;
    return valueNoise2D(nx * 2.2, nz * 2.2);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const idx = i * 4;

      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;

      // Aeolian wind ripples (periodic across tile boundaries)
      const warp = Math.sin(u * 2 + Math.cos(v * 3)) * 0.8 + Math.cos(v * 2) * 0.5;
      const ripple = Math.sin(u * 14 + v * 4 + warp * 2.4) * 0.5 + 0.5;
      const fineRipple = Math.sin(u * 38 - v * 6 + warp * 4.0) * 0.5 + 0.5;

      const macroPatch = tileNoise(x, y, 1, 3.1);
      const basaltPatch = tileNoise(x, y, 2, 17.4);
      const pebbleSeed = ihash(x, y, 11);
      const fineGrit = ihash(x, y, 29);

      // Embedded gravel/pebble bumps like NASA Curiosity/Perseverance rover photos
      const isPebble = pebbleSeed > 0.965 ? (pebbleSeed - 0.965) / 0.035 : 0;
      const isCoarseSand = pebbleSeed > 0.72 ? (pebbleSeed - 0.72) / 0.28 : 0;

      const microH =
        ripple * 0.42 +
        fineRipple * 0.14 +
        macroPatch * 0.25 +
        isCoarseSand * 0.12 +
        isPebble * 0.68 +
        fineGrit * 0.08;
      heightField[i] = microH;

      // Photorealistic Martian palette matched to Curiosity/Perseverance reference imagery:
      // Wind-rippled tan/butterscotch regolith (#c88658), iron-oxide rust (#a85434), dark volcanic basalt (#472c24)
      let r = 178 + ripple * 26 + fineRipple * 8 + (macroPatch - 0.5) * 34 + (fineGrit - 0.5) * 20;
      let g = 98 + ripple * 18 + fineRipple * 6 + (macroPatch - 0.5) * 24 + (fineGrit - 0.5) * 14;
      let b = 58 + ripple * 12 + fineRipple * 4 + (macroPatch - 0.5) * 15 + (fineGrit - 0.5) * 10;

      // Dark basalt sand drifts & exposed volcanic gravel
      if (basaltPatch > 0.56) {
        const mix = Math.min(1, (basaltPatch - 0.56) / 0.3) * 0.68;
        r = r * (1 - mix) + 72 * mix;
        g = g * (1 - mix) + 48 * mix;
        b = b * (1 - mix) + 42 * mix;
      }

      // Bright sun-baked ochre/tan aeolian dust ripples in troughs
      if (macroPatch > 0.58) {
        const dust = Math.min(1, (macroPatch - 0.58) / 0.3) * 0.56;
        r = r * (1 - dust) + 214 * dust;
        g = g * (1 - dust) + 148 * dust;
        b = b * (1 - dust) + 96 * dust;
      }

      // Embedded angular mineral pebbles (pale sun-bleached plates + slate-grey basalt chips)
      if (isPebble > 0.08) {
        const pMix = Math.min(1, isPebble * 1.15);
        if (fineGrit > 0.55) {
          // Cool slate-grey basalt chip
          r = r * (1 - pMix) + 104 * pMix;
          g = g * (1 - pMix) + 108 * pMix;
          b = b * (1 - pMix) + 114 * pMix;
        } else {
          // Sun-baked ochre/tan mudstone chip
          r = r * (1 - pMix) + 188 * pMix;
          g = g * (1 - pMix) + 134 * pMix;
          b = b * (1 - pMix) + 94 * pMix;
        }
      }

      cImg.data[idx] = Math.max(0, Math.min(255, r));
      cImg.data[idx + 1] = Math.max(0, Math.min(255, g));
      cImg.data[idx + 2] = Math.max(0, Math.min(255, b));
      cImg.data[idx + 3] = 255;

      // Roughness: fine compacted dust ~0.88, coarse rocky gravel ~0.96, mineral chips ~0.78
      const roughVal = Math.max(
        175,
        Math.min(255, 224 + isPebble * 18 - (1 - ripple) * 14 + (fineGrit - 0.5) * 18),
      );
      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  // Tangent-Space Normal Map computed from heightField via Sobel operator
  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const nCtx = normCanvas.getContext('2d') ;
  const nImg = nCtx.createImageData(size, size);
  const strength = 4.1;

  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;

      const tl = heightField[ym1 * size + xm1];
      const t = heightField[ym1 * size + x];
      const tr = heightField[ym1 * size + xp1];
      const l = heightField[y * size + xm1];
      const r = heightField[y * size + xp1];
      const bl = heightField[yp1 * size + xm1];
      const b = heightField[yp1 * size + x];
      const br = heightField[yp1 * size + xp1];

      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * size + x) * 4;
      nImg.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      nImg.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nImg.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      nImg.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(44, 44);
  colorMap.anisotropy = maxAnisotropy;

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(44, 44);
  normalMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(44, 44);
  roughnessMap.anisotropy = maxAnisotropy;

  return { colorMap, normalMap, roughnessMap };
}

export function createRockPbrTextures(maxAnisotropy        )   
                                    
                                     
                                        
  {
  // 512x512 procedural Martian sedimentary + basaltic rock PBR suite
  // Captures laminar bedding striations, vesicular wind-pitted cavities, fractured mineral grain & trapped ochre dust
  const size = 512;
  const rockHeight = new Float32Array(size * size);

  const cCan = document.createElement('canvas');
  cCan.width = cCan.height = size;
  const cCtx = cCan.getContext('2d') ;
  const cImg = cCtx.createImageData(size, size);

  const rCan = document.createElement('canvas');
  rCan.width = rCan.height = size;
  const rCtx = rCan.getContext('2d') ;
  const rImg = rCtx.createImageData(size, size);

  const periodic = (px        , py        , fx        , fy        , seed        ) => {
    const u = (px / size) * Math.PI * 2 * fx;
    const v = (py / size) * Math.PI * 2 * fy;
    return valueNoise2D(Math.cos(u) * 1.9 + Math.sin(v) * 0.8 + seed, Math.sin(u) * 1.9 + Math.cos(v) * 0.8 - seed);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const idx = i * 4;

      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;

      // Parallel laminar strata grooves (visible in tilted Curiosity boulders & plates)
      const warp = Math.sin(u * 2 + Math.cos(v * 3)) * 0.35 + periodic(x, y, 2, 2, 4.7) * 0.65;
      const strata = Math.sin(v * 18 + warp * 5.2) * 0.5 + 0.5;
      const fineStrata = Math.sin(v * 46 - u * 4 + warp * 8.0) * 0.5 + 0.5;

      // Vesicular ventifact pits & sharp fracture cracks
      const pitField = periodic(x, y, 5, 5, 11.2);
      const microPit = periodic(x, y, 12, 12, 23.8);
      const pitDepth = pitField < 0.3 ? (0.3 - pitField) / 0.3 : 0;
      const smallPit = microPit < 0.24 ? (0.24 - microPit) / 0.24 : 0;
      const crackLine = Math.abs(Math.sin(u * 5 + v * 3 + warp * 4.5)) < 0.045 ? 1 : 0;
      const grain = ihash(x, y, 47);

      const h =
        0.55 +
        strata * 0.22 +
        fineStrata * 0.09 -
        pitDepth * 0.42 -
        smallPit * 0.22 -
        crackLine * 0.28 +
        (grain - 0.5) * 0.08;
      rockHeight[i] = h;

      // Neutral-warm mineral base (world-space shader will blend slate-grey cleavage vs ochre dust)
      let r = 132 + strata * 34 + fineStrata * 14 + (grain - 0.5) * 26 - pitDepth * 42 - crackLine * 48;
      let g = 112 + strata * 26 + fineStrata * 11 + (grain - 0.5) * 20 - pitDepth * 38 - crackLine * 42;
      let b = 98 + strata * 18 + fineStrata * 9 + (grain - 0.5) * 18 - pitDepth * 32 - crackLine * 34;

      // Trapped ochre dust inside crevices & pits
      if (pitDepth > 0.25 || crackLine > 0) {
        const dMix = Math.min(0.65, pitDepth * 0.65 + crackLine * 0.45);
        r = r * (1 - dMix) + 198 * dMix;
        g = g * (1 - dMix) + 132 * dMix;
        b = b * (1 - dMix) + 84 * dMix;
      }

      cImg.data[idx] = Math.max(0, Math.min(255, r));
      cImg.data[idx + 1] = Math.max(0, Math.min(255, g));
      cImg.data[idx + 2] = Math.max(0, Math.min(255, b));
      cImg.data[idx + 3] = 255;

      // Roughness: exposed crystalline cleavage edges ~0.72, dusty pits ~0.96
      const rVal = Math.max(175, Math.min(252, 206 + pitDepth * 42 + crackLine * 35 - strata * 18 + (grain - 0.5) * 20));
      rImg.data[idx] = rImg.data[idx + 1] = rImg.data[idx + 2] = rVal;
      rImg.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  // Sobel tangent-space normal map for crisp relief under low-angle Martian sun
  const nCan = document.createElement('canvas');
  nCan.width = nCan.height = size;
  const nCtx = nCan.getContext('2d') ;
  const nImg = nCtx.createImageData(size, size);
  const strength = 5.2;

  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;
      const dX =
        (rockHeight[ym1 * size + xp1] + 2 * rockHeight[y * size + xp1] + rockHeight[yp1 * size + xp1]) -
        (rockHeight[ym1 * size + xm1] + 2 * rockHeight[y * size + xm1] + rockHeight[yp1 * size + xm1]);
      const dY =
        (rockHeight[yp1 * size + xm1] + 2 * rockHeight[yp1 * size + x] + rockHeight[yp1 * size + xp1]) -
        (rockHeight[ym1 * size + xm1] + 2 * rockHeight[ym1 * size + x] + rockHeight[ym1 * size + xp1]);
      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv;
      ny *= inv;
      nz *= inv;
      const idx = (y * size + x) * 4;
      nImg.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      nImg.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nImg.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      nImg.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const mkTex = (canvas                   , srgb         ) => {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAnisotropy;
    return t;
  };

  return {
    rockColorMap: mkTex(cCan, true),
    rockNormalMap: mkTex(nCan, false),
    rockRoughnessMap: mkTex(rCan, false),
  };
}

export function createMartianTerrain(renderer                     )                       {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const { colorMap, normalMap, roughnessMap } = createMartianPbrTextures(maxAniso);
  const { rockColorMap, rockNormalMap, rockRoughnessMap } = createRockPbrTextures(maxAniso);

  const geometry = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    TERRAIN_SEGMENTS,
    TERRAIN_SEGMENTS,
  );
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = getTerrainHeight(x, z);
    posAttr.setY(i, y);

    // Geological strata & dust-vs-basalt macro tinting
    const elevFactor = THREE.MathUtils.clamp((y + 12) / 38, 0, 1);
    const basaltVar = valueNoise2D(x * 0.035 + 5, z * 0.035 - 9);
    const strataBand = Math.sin(y * 1.15 + x * 0.03) * 0.05;
    tmpColor.setRGB(
      0.88 + elevFactor * 0.14 - basaltVar * 0.16 + strataBand,
      0.76 + elevFactor * 0.16 - basaltVar * 0.15 + strataBand * 0.7,
      0.70 + elevFactor * 0.12 - basaltVar * 0.12 + strataBand * 0.5,
    );
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const pingUniforms = {
    uPingOrigin: { value: new THREE.Vector3(0, 0, 0) },
    uPingRadius: { value: -10.0 },
    uPingAlpha: { value: 0.0 },
    uSlopeFade: { value: 0.0 },
  };

  const material = new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap,
    normalScale: new THREE.Vector2(1.55, 1.55),
    roughnessMap,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.03,
  });

  // Extend PBR terrain shader:
  // 1) Anti-tiling macro+micro detail modulation & exposed bedrock on steep crater walls
  // 2) Q-key expanding topographic sonar ring + steep slope hazard highlight
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPingOrigin = pingUniforms.uPingOrigin;
    shader.uniforms.uPingRadius = pingUniforms.uPingRadius;
    shader.uniforms.uPingAlpha = pingUniforms.uPingAlpha;
    shader.uniforms.uSlopeFade = pingUniforms.uSlopeFade;

    shader.vertexShader =
      `varying vec3 vTerrainWorldPos;\nvarying vec3 vTerrainWorldNormal;\n` +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTerrainWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      );

    shader.fragmentShader =
      `uniform vec3 uPingOrigin;
      uniform float uPingRadius;
      uniform float uPingAlpha;
      uniform float uSlopeFade;
      varying vec3 vTerrainWorldPos;
      varying vec3 vTerrainWorldNormal;\n` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          // Geological strata & exposed bedrock on steep crater walls (breaks up texture tiling)
          float slopeRock = smoothstep(0.92, 0.75, abs(vTerrainWorldNormal.y));
          float strata = 0.5 + 0.5 * sin(vTerrainWorldPos.y * 2.6 + sin(vTerrainWorldPos.x * 0.08) * 1.5);
          vec3 bedrockCol = mix(vec3(0.32, 0.19, 0.15), vec3(0.58, 0.34, 0.24), strata);
          diffuseColor.rgb = mix(diffuseColor.rgb, bedrockCol, slopeRock * 0.52);
          // Aeolian wind-ripple shadow & bright sand-crest modulation to eliminate any planar tiling
          float sandDrift = 0.5 + 0.5 * sin(vTerrainWorldPos.x * 0.18 + vTerrainWorldPos.z * 0.09 + sin(vTerrainWorldPos.z * 0.05) * 2.2);
          float macroVar = 0.88 + 0.16 * sin(vTerrainWorldPos.x * 0.025 + vTerrainWorldPos.z * 0.019) + (sandDrift - 0.5) * 0.08;
          diffuseColor.rgb *= macroVar;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          if (uPingAlpha > 0.001 || uSlopeFade > 0.001) {
            float distFromPing = distance(vTerrainWorldPos.xz, uPingOrigin.xz);
            float ringDist = abs(distFromPing - uPingRadius);
            float ringMask = (1.0 - smoothstep(0.0, 4.5, ringDist)) * uPingAlpha;
            float swept = 1.0 - smoothstep(uPingRadius - 3.0, uPingRadius + 1.0, distFromPing);
            float contour = 1.0 - smoothstep(0.0, 0.14, abs(fract(vTerrainWorldPos.y * 0.5) - 0.5));
            vec3 sonarCyan = vec3(0.18, 0.92, 0.98);
            totalEmissiveRadiance += sonarCyan * (ringMask * 1.7 + contour * swept * uSlopeFade * 0.42);

            float slopeFactor = smoothstep(0.84, 0.72, abs(vTerrainWorldNormal.y));
            float gridPulse = 0.55 + 0.45 * sin(vTerrainWorldPos.x * 1.4 + vTerrainWorldPos.z * 1.4);
            vec3 hazardRed = vec3(1.0, 0.16, 0.12);
            totalEmissiveRadiance += hazardRed * slopeFactor * swept * uSlopeFade * (0.65 + 0.35 * gridPulse) * 1.35;
          }`,
        );
  };

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;

  // World-space weathered rock PBR material (cool slate-grey fractured sides + warm ochre-dusted top faces)
  const rockMat = new THREE.MeshStandardMaterial({
    map: rockColorMap,
    normalMap: rockNormalMap,
    normalScale: new THREE.Vector2(1.75, 1.75),
    roughnessMap: rockRoughnessMap,
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.07,
  });

  rockMat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      `varying vec3 vRockWorldPos;\nvarying vec3 vRockWorldNormal;\n` +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        mat4 instMat = mat4(1.0);
        #ifdef USE_INSTANCING
          instMat = instanceMatrix;
        #endif
        vec4 rWp = modelMatrix * instMat * vec4(transformed, 1.0);
        vRockWorldPos = rWp.xyz;
        vRockWorldNormal = normalize(mat3(modelMatrix) * mat3(instMat) * objectNormal);`,
      );

    shader.fragmentShader =
      `varying vec3 vRockWorldPos;\nvarying vec3 vRockWorldNormal;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Match NASA Curiosity/Perseverance photos: cool slate-grey fractured rock faces + warm sun-baked ochre dust on top ledges
        float topDust = smoothstep(0.28, 0.78, vRockWorldNormal.y);
        float strataBand = 0.5 + 0.5 * sin(vRockWorldPos.y * 14.0 + vRockWorldPos.x * 2.5 + vRockWorldPos.z * 2.1);
        vec3 slateFracture = mix(vec3(0.28, 0.30, 0.33), vec3(0.50, 0.51, 0.53), strataBand);
        vec3 ochreDust = mix(vec3(0.76, 0.50, 0.33), vec3(0.92, 0.69, 0.47), strataBand);
        vec3 rockTint = mix(slateFracture, ochreDust, topDust);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * rockTint * 1.48, 0.76);`,
      );
  };

  // 1. Sculpted Stratified Wedge Boulders (high-resolution displaced cleavage + laminar ridges)
  const boulderGeo = new THREE.IcosahedronGeometry(1, 3);
  const bPos = boulderGeo.attributes.position;
  for (let i = 0; i < bPos.count; i++) {
    let vx = bPos.getX(i);
    let vy = bPos.getY(i);
    let vz = bPos.getZ(i);
    // Cleave flat planar fractures + laminar sedimentary steps
    const len = Math.hypot(vx, vy, vz) || 1;
    const nx = vx / len;
    const ny = vy / len;
    const nz = vz / len;
    const ridge = valueNoise2D(nx * 2.8 + ny * 1.4 + 4.1, nz * 2.8 - ny * 1.1 + 7.3);
    const strataStep = Math.sin(ny * 16.0 + nx * 3.5) * 0.045;
    const cleave = Math.abs(nx * 0.65 + ny * 0.45 - nz * 0.35) > 0.58 ? 0.84 : 1.0;
    const disp = (0.76 + ridge * 0.46 + strataStep) * cleave;
    // Slight angular wedge taper toward top like Photo 2
    const wedge = ny > 0 ? 1.0 - ny * 0.22 : 1.0;
    bPos.setXYZ(i, vx * disp * wedge, vy * disp * 0.72, vz * disp * wedge);
  }
  boulderGeo.computeVertexNormals();

  const boulderCount = 320;
  const boulders = new THREE.InstancedMesh(boulderGeo, rockMat, boulderCount);
  boulders.castShadow = true;
  boulders.receiveShadow = true;

  const colliders                    = [];
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  const largeRockCenters                                        = [];

  for (let i = 0; i < boulderCount; i++) {
    const angle = hash2(i + 1, 1.37) * Math.PI * 2;
    const radius = 23 + Math.pow(hash2(i + 1, 9.81), 0.78) * 330;
    const bx = Math.cos(angle) * radius;
    const bz = Math.sin(angle) * radius;
    const by = getTerrainHeight(bx, bz);
    const scale = 0.55 + Math.pow(hash2(i + 1, 4.19), 1.85) * 3.9;

    const sx = scale * (0.85 + hash2(i, 3.1) * 0.45);
    const sy = scale * (0.62 + hash2(i, 6.4) * 0.45);
    const sz = scale * (0.85 + hash2(i, 9.7) * 0.45);

    const rotY = hash2(i, 5.5) * Math.PI * 2;
    dummy.position.set(bx, by + sy * 0.16, bz);
    dummy.rotation.set(
      (hash2(i, 2.2) - 0.5) * 0.55,
      rotY,
      (hash2(i, 8.8) - 0.5) * 0.55,
    );
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    boulders.setMatrixAt(i, dummy.matrix);

    const tint = hash2(i, 12.4);
    if (tint > 0.7) {
      // Cool blue-grey basaltic outcrop
      c.setRGB(0.72 + tint * 0.16, 0.74 + tint * 0.15, 0.78 + tint * 0.16);
    } else {
      // Iron-oxide / tan sandstone
      c.setRGB(0.84 + tint * 0.24, 0.74 + tint * 0.2, 0.66 + tint * 0.18);
    }
    boulders.setColorAt(i, c);

    if (scale > 1.2) {
      largeRockCenters.push({ x: bx, z: bz, r: Math.max(sx, sz) });
    }
    const brx = sx * 0.96;
    const bry = sy * 0.84;
    const brz = sz * 0.96;
    colliders.push({
      x: bx,
      y: by + sy * 0.16,
      z: bz,
      rx: brx,
      ry: bry,
      rz: brz,
      boundR: Math.max(brx, brz),
      cosY: Math.cos(rotY),
      sinY: Math.sin(rotY),
      shape: 'boulder',
      topY: by + sy * 0.16 + bry,
      walkableTop: sy * 0.95 <= 0.36,
      climbable: true,
    });
  }
  boulders.instanceMatrix.needsUpdate = true;
  if (boulders.instanceColor) boulders.instanceColor.needsUpdate = true;
  boulders.computeBoundingSphere();

  // 2. Fractured Polygonal Mudstone Plates & Ventifact Slabs (Photos 1 & 3!)
  const slabGeo = new THREE.CylinderGeometry(1.0, 1.14, 0.44, 9, 3);
  const sPos = slabGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const vx = sPos.getX(i);
    const vy = sPos.getY(i);
    const vz = sPos.getZ(i);
    const ang = Math.atan2(vz, vx);
    const edgeNoise = 0.74 + valueNoise2D(Math.cos(ang) * 3.1 + 5.2, Math.sin(ang) * 3.1 - 2.4) * 0.52;
    const topPit = vy > 0.08 ? (valueNoise2D(vx * 3.4 + 2.1, vz * 3.4 - 4.7) - 0.5) * 0.12 : 0;
    sPos.setXYZ(i, vx * edgeNoise, vy + topPit, vz * edgeNoise);
  }
  slabGeo.computeVertexNormals();

  const slabCount = 380;
  const slabs = new THREE.InstancedMesh(slabGeo, rockMat, slabCount);
  slabs.castShadow = true;
  slabs.receiveShadow = true;

  for (let i = 0; i < slabCount; i++) {
    const angle = hash2(i + 500, 2.71) * Math.PI * 2;
    const radius = 18 + Math.pow(hash2(i + 500, 7.13), 0.72) * 300;
    const bx = Math.cos(angle) * radius;
    const bz = Math.sin(angle) * radius;
    const by = getTerrainHeight(bx, bz);
    const scale = 0.48 + Math.pow(hash2(i + 500, 5.19), 1.45) * 2.45;
    const sx = scale * (1.0 + hash2(i + 500, 8.2) * 0.35);
    const sy = scale * (0.52 + hash2(i + 500, 3.7) * 0.45);
    const rotY = hash2(i + 500, 4.4) * Math.PI * 2;

    dummy.position.set(bx, by + sy * 0.08, bz);
    dummy.rotation.set(
      (hash2(i + 500, 1.1) - 0.5) * 0.28,
      rotY,
      (hash2(i + 500, 7.7) - 0.5) * 0.28,
    );
    dummy.scale.set(sx, sy, scale);
    dummy.updateMatrix();
    slabs.setMatrixAt(i, dummy.matrix);

    const tint = hash2(i + 500, 9.4);
    if (tint > 0.66) {
      // Slate-grey mudstone plate (Photo 1 drill slab!)
      c.setRGB(0.76 + tint * 0.14, 0.77 + tint * 0.14, 0.8 + tint * 0.14);
    } else {
      // Pale ochre-tan bedrock plate (Photo 3!)
      c.setRGB(0.92 + tint * 0.18, 0.80 + tint * 0.16, 0.66 + tint * 0.14);
    }
    slabs.setColorAt(i, c);

    if (scale > 0.55) {
      const srx = sx * 1.02;
      const sry = sy * 0.26;
      const srz = scale * 1.02;
      colliders.push({
        x: bx,
        y: by + sy * 0.08,
        z: bz,
        rx: srx,
        ry: sry,
        rz: srz,
        boundR: Math.max(srx, srz),
        cosY: Math.cos(rotY),
        sinY: Math.sin(rotY),
        shape: 'slab',
        topY: by + sy * 0.08 + sry,
        walkableTop: sy * 0.34 <= 0.44,
        climbable: true,
      });
    }
  }
  slabs.instanceMatrix.needsUpdate = true;
  if (slabs.instanceColor) slabs.instanceColor.needsUpdate = true;
  slabs.computeBoundingSphere();

  // 3. Cleaved Scree Aprons Clustered Around Boulders & Crater Debris Fields (Photos 1 & 2!)
  const screeGeo = new THREE.DodecahedronGeometry(0.32, 2);
  const scPos = screeGeo.attributes.position;
  for (let i = 0; i < scPos.count; i++) {
    const vx = scPos.getX(i);
    const vy = scPos.getY(i);
    const vz = scPos.getZ(i);
    const n = 0.72 + hash2(vx * 17.3 + vy * 11.1, vz * 23.7) * 0.55;
    scPos.setXYZ(i, vx * n, vy * (0.55 + n * 0.3), vz * n);
  }
  screeGeo.computeVertexNormals();

  const screeCount = 900;
  const scree = new THREE.InstancedMesh(screeGeo, rockMat, screeCount);
  scree.castShadow = true;
  scree.receiveShadow = true;

  for (let i = 0; i < screeCount; i++) {
    let sx        ;
    let sz        ;
    if (i < 620 && largeRockCenters.length > 0) {
      // Cluster tightly in natural talus/scree aprons around large boulders!
      const host = largeRockCenters[i % largeRockCenters.length];
      const ang = hash2(i + 2000, 1.91) * Math.PI * 2;
      const dist = host.r * (0.78 + hash2(i + 2000, 4.37) * 2.1);
      sx = host.x + Math.cos(ang) * dist;
      sz = host.z + Math.sin(ang) * dist;
    } else {
      const ang = hash2(i + 2000, 6.13) * Math.PI * 2;
      const rad = 18 + Math.pow(hash2(i + 2000, 8.71), 0.72) * 260;
      sx = Math.cos(ang) * rad;
      sz = Math.sin(ang) * rad;
    }
    const sy = getTerrainHeight(sx, sz);
    const sc = 0.42 + Math.pow(hash2(i + 2000, 3.14), 1.4) * 1.45;
    const rotY = hash2(i, 2.2) * 6.28;

    dummy.position.set(sx, sy + sc * 0.04, sz);
    dummy.rotation.set(hash2(i, 1.1) * 1.2, rotY, hash2(i, 3.3) * 1.2);
    dummy.scale.set(sc * 1.2, sc * 0.68, sc * 0.95);
    dummy.updateMatrix();
    scree.setMatrixAt(i, dummy.matrix);

    const tint = hash2(i + 2000, 7.77);
    c.setRGB(0.72 + tint * 0.3, 0.62 + tint * 0.26, 0.56 + tint * 0.24);
    scree.setColorAt(i, c);

    if (sc > 0.85) {
      const qrx = sc * 0.39;
      const qry = sc * 0.23;
      const qrz = sc * 0.31;
      colliders.push({
        x: sx,
        y: sy + sc * 0.04,
        z: sz,
        rx: qrx,
        ry: qry,
        rz: qrz,
        boundR: Math.max(qrx, qrz),
        cosY: Math.cos(rotY),
        sinY: Math.sin(rotY),
        shape: 'boulder',
        topY: sy + sc * 0.04 + qry,
        walkableTop: sc * 0.27 <= 0.38,
        climbable: true,
      });
    }
  }
  scree.instanceMatrix.needsUpdate = true;
  if (scree.instanceColor) scree.instanceColor.needsUpdate = true;
  scree.computeBoundingSphere();

  // 4. Dense Surface Cobble & Pebble Scatter (adds immediate ground photorealism near EVA boots)
  const pebbleGeo = new THREE.IcosahedronGeometry(0.14, 1);
  const pebbleCount = 1100;
  const pebbles = new THREE.InstancedMesh(pebbleGeo, rockMat, pebbleCount);
  pebbles.castShadow = false;
  pebbles.receiveShadow = true;

  for (let i = 0; i < pebbleCount; i++) {
    const angle = hash2(i + 3200, 3.33) * Math.PI * 2;
    const radius = 16.5 + Math.pow(hash2(i + 3200, 6.28), 0.68) * 230;
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius;
    const py = getTerrainHeight(px, pz);
    const sc = 0.42 + hash2(i + 3200, 8.11) * 1.7;

    dummy.position.set(px, py + sc * 0.03, pz);
    dummy.rotation.set(hash2(i, 1.4), hash2(i, 2.8) * 6, hash2(i, 4.2));
    dummy.scale.set(sc * 1.25, sc * 0.52, sc);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);

    const tint = hash2(i + 3200, 5.5);
    c.setRGB(0.64 + tint * 0.38, 0.54 + tint * 0.32, 0.48 + tint * 0.28);
    pebbles.setColorAt(i, c);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  if (pebbles.instanceColor) pebbles.instanceColor.needsUpdate = true;
  pebbles.computeBoundingSphere();

  return {
    mesh,
    material,
    boulders,
    slabs,
    scree,
    pebbles,
    colliders,
    pingUniforms,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      colorMap.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      rockColorMap.dispose();
      rockNormalMap.dispose();
      rockRoughnessMap.dispose();
      boulderGeo.dispose();
      slabGeo.dispose();
      screeGeo.dispose();
      pebbleGeo.dispose();
      rockMat.dispose();
    },
  };
}
