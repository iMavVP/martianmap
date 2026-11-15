import * as THREE from 'three';

                                       
                                   
                                      
                                 
                                    
                                       
                               
                                   
                                     
                                    
                                  
                                     
                                 
                                    
                                 
                                  
                      
 

function makeNoiseCanvas(
  size        ,
  drawFn                                                       
)                    {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d') ;
  drawFn(ctx, size);
  return canvas;
}

export function createProceduralTextures(maxAnisotropy        )                       {
  // 1. High-Res Mars Regolith Albedo (wind-blown ripples + mineral pebbles + subtle fractures)
  const regolithCanvas = makeNoiseCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#ddd4ce';
    ctx.fillRect(0, 0, s, s);
    const img = ctx.getImageData(0, 0, s, s);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const px = (i / 4) % s;
      const py = Math.floor(i / 4 / s);
      const ripple = Math.sin(px * 0.098 + Math.sin(py * 0.049) * 2.4) * 14;
      const micro = Math.sin(px * 0.45 + py * 0.37) * 6;
      const grain = ((Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1 + 1) % 1;
      const delta = ripple + micro + (grain - 0.5) * 34;
      d[i] = Math.min(255, Math.max(95, 214 + delta));
      d[i + 1] = Math.min(255, Math.max(85, 201 + delta * 0.94));
      d[i + 2] = Math.min(255, Math.max(80, 192 + delta * 0.88));
    }
    ctx.putImageData(img, 0, 0);

    // Subtle sedimentary stone patches & gravel scatter
    for (let k = 0; k < 1200; k++) {
      const rx = (k * 97 + (k % 7) * 19) % s;
      const ry = (k * 151 + (k % 11) * 13) % s;
      const r = 0.8 + (k % 4) * 0.85;
      ctx.fillStyle =
        k % 3 === 0
          ? 'rgba(72, 48, 38, 0.28)'
          : k % 3 === 1
          ? 'rgba(245, 224, 208, 0.22)'
          : 'rgba(130, 82, 58, 0.22)';
      ctx.beginPath();
      ctx.ellipse(rx, ry, r * 1.3, r * 0.85, (k * 0.7) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const regolithMap = new THREE.CanvasTexture(regolithCanvas);
  regolithMap.colorSpace = THREE.SRGBColorSpace;
  regolithMap.wrapS = regolithMap.wrapT = THREE.RepeatWrapping;
  regolithMap.repeat.set(58, 58);
  regolithMap.anisotropy = maxAnisotropy;

  // 2. Crisp Mars Regolith Normal Map (aeolian ripples + gravel relief)
  const regNormalCanvas = makeNoiseCanvas(512, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    const d = img.data;
    const heightAt = (x        , y        ) => {
      const rip = Math.sin(x * 0.098 + Math.sin(y * 0.049) * 2.4) * 0.65;
      const grit =
        Math.sin(x * 0.85 + y * 0.95) * 0.22 +
        Math.cos(x * 1.9 - y * 1.7) * 0.16 +
        Math.sin(x * 3.7 + y * 4.1) * 0.09;
      return rip + grit;
    };
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = heightAt(x + 1, y) - heightAt(x - 1, y);
        const dy = heightAt(x, y + 1) - heightAt(x, y - 1);
        const idx = (y * s + x) * 4;
        d[idx] = Math.min(255, Math.max(0, 128 - dx * 56));
        d[idx + 1] = Math.min(255, Math.max(0, 128 - dy * 56));
        d[idx + 2] = 236;
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  const regolithNormal = new THREE.CanvasTexture(regNormalCanvas);
  regolithNormal.wrapS = regolithNormal.wrapT = THREE.RepeatWrapping;
  regolithNormal.repeat.set(58, 58);
  regolithNormal.anisotropy = maxAnisotropy;

  // 3. Gold Kapton MLI Crinkled Thermal Foil
  const kaptonCanvas = makeNoiseCanvas(256, (ctx, s) => {
    const grad = ctx.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, '#d89a2a');
    grad.addColorStop(0.5, '#f2c35a');
    grad.addColorStop(1, '#ad6d14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      const x = (i * 53) % s;
      const y = (i * 97) % s;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 244, 195, 0.32)' : 'rgba(95, 52, 8, 0.32)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + ((i % 5) - 2) * 14, y + (((i * 3) % 5) - 2) * 14);
      ctx.stroke();
    }
  });
  const kaptonMap = new THREE.CanvasTexture(kaptonCanvas);
  kaptonMap.colorSpace = THREE.SRGBColorSpace;
  kaptonMap.wrapS = kaptonMap.wrapT = THREE.RepeatWrapping;
  kaptonMap.anisotropy = maxAnisotropy;

  const kaptonNormalCanvas = makeNoiseCanvas(256, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    const d = img.data;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const crinkle =
          Math.sin(x * 0.25 + y * 0.19) * 0.52 +
          Math.cos(x * 0.44 - y * 0.39) * 0.36;
        const idx = (y * s + x) * 4;
        d[idx] = Math.floor(128 + crinkle * 60);
        d[idx + 1] = Math.floor(128 + Math.cos(x * 0.32 - y * 0.22) * 60);
        d[idx + 2] = 232;
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  const kaptonNormal = new THREE.CanvasTexture(kaptonNormalCanvas);
  kaptonNormal.wrapS = kaptonNormal.wrapT = THREE.RepeatWrapping;

  // 4. Aerospace White Ceramic Chassis Paint with subtle Martian dust weathering & fasteners
  const chassisWhiteCanvas = makeNoiseCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#e7e5e0';
    ctx.fillRect(0, 0, s, s);
    // Subtle panel seams & rivets
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, s - 20, s - 20);
    ctx.strokeRect(10, s * 0.5, s - 20, s * 0.46);
    ctx.fillStyle = '#64748b';
    for (let p = 24; p < s - 20; p += 36) {
      ctx.beginPath();
      ctx.arc(p, 20, 2.2, 0, Math.PI * 2);
      ctx.arc(p, s - 20, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fine reddish Martian dust mist along lower edge
    const dustGrad = ctx.createLinearGradient(0, s * 0.55, 0, s);
    dustGrad.addColorStop(0, 'rgba(180, 96, 56, 0)');
    dustGrad.addColorStop(1, 'rgba(166, 86, 52, 0.28)');
    ctx.fillStyle = dustGrad;
    ctx.fillRect(0, 0, s, s);
  });
  const chassisWhiteMap = new THREE.CanvasTexture(chassisWhiteCanvas);
  chassisWhiteMap.colorSpace = THREE.SRGBColorSpace;
  chassisWhiteMap.anisotropy = maxAnisotropy;

  // 5. Rover Top Deck Plate (radiator louvers, gold foil patches, NASA/JPL calibration target markings)
  const deckCanvas = makeNoiseCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#e2e0da';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, s - 28, s - 28);

    // Thermal radiator fins
    ctx.fillStyle = '#cbd5e1';
    for (let y = 44; y < 220; y += 16) {
      ctx.fillRect(44, y, 180, 8);
    }
    // Gold foil cable bay patch
    ctx.fillStyle = '#d99b26';
    ctx.fillRect(260, 46, 200, 150);
    ctx.strokeStyle = '#92400e';
    ctx.strokeRect(260, 46, 200, 150);

    // Dust weathering
    const dGrad = ctx.createRadialGradient(s / 2, s / 2, 40, s / 2, s / 2, s * 0.7);
    dGrad.addColorStop(0, 'rgba(175, 98, 62, 0.08)');
    dGrad.addColorStop(1, 'rgba(160, 82, 50, 0.24)');
    ctx.fillStyle = dGrad;
    ctx.fillRect(0, 0, s, s);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('MARS 2020 · ARES-07', 48, 300);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('JET PROPULSION LABORATORY', 48, 330);
  });
  const deckMap = new THREE.CanvasTexture(deckCanvas);
  deckMap.colorSpace = THREE.SRGBColorSpace;
  deckMap.anisotropy = maxAnisotropy;

  // 6. Robotic Arm "PERSEVERANCE / MARS 2020" Metallic Strut Decal
  const armCanvas = makeNoiseCanvas(256, (ctx, s) => {
    ctx.fillStyle = '#d9d6cf';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#b4532a';
    ctx.fillRect(0, 0, 42, s);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(42, 0, 16, s);
    ctx.save();
    ctx.translate(148, s * 0.82);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('PERSEVERANCE', 0, 0);
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#9a3412';
    ctx.fillText('MARS 2020', 0, 26);
    ctx.restore();
  });
  const armDecalMap = new THREE.CanvasTexture(armCanvas);
  armDecalMap.colorSpace = THREE.SRGBColorSpace;
  armDecalMap.anisotropy = maxAnisotropy;

  // 7. Machined Dark-Anodized Titanium Wheel Tread Texture
  const wheelCanvas = makeNoiseCanvas(256, (ctx, s) => {
    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(0, 0, s, s);
    // Subtle dusty crevices between grousers
    for (let y = 0; y < s; y += 16) {
      ctx.fillStyle = '#2d323b';
      ctx.fillRect(0, y, s, 6);
      ctx.fillStyle = 'rgba(155, 86, 56, 0.25)';
      ctx.fillRect(0, y + 6, s, 3);
      ctx.fillStyle = '#14171c';
      ctx.fillRect(0, y + 9, s, 7);
    }
  });
  const wheelTreadMap = new THREE.CanvasTexture(wheelCanvas);
  wheelTreadMap.colorSpace = THREE.SRGBColorSpace;
  wheelTreadMap.wrapS = wheelTreadMap.wrapT = THREE.RepeatWrapping;
  wheelTreadMap.anisotropy = maxAnisotropy;

  // 8. Rover Cleated Tire Track Imprint Decal
  const trackCanvas = makeNoiseCanvas(128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(78, 38, 24, 0.35)';
    ctx.fillRect(14, 0, s - 28, s);
    ctx.fillStyle = 'rgba(42, 18, 12, 0.62)';
    for (let y = 4; y < s; y += 18) {
      ctx.fillRect(18, y, s - 36, 7);
    }
  });
  const trackMarkMap = new THREE.CanvasTexture(trackCanvas);
  trackMarkMap.colorSpace = THREE.SRGBColorSpace;

  // 9. Soft Dust Particle Sprite
  const dustCanvas = makeNoiseCanvas(128, (ctx, s) => {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(225, 165, 125, 0.78)');
    grad.addColorStop(0.45, 'rgba(186, 114, 78, 0.32)');
    grad.addColorStop(1, 'rgba(160, 90, 58, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  });
  const dustSprite = new THREE.CanvasTexture(dustCanvas);
  dustSprite.colorSpace = THREE.SRGBColorSpace;

  // 10. Radial Soft Contact Shadow under Rover
  const shadowCanvas = makeNoiseCanvas(256, (ctx, s) => {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 18, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(12, 6, 4, 0.78)');
    grad.addColorStop(0.55, 'rgba(18, 8, 5, 0.38)');
    grad.addColorStop(1, 'rgba(18, 8, 5, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  });
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  // 11. Phobos Carbonaceous Chondrite Albedo + Stickney Crater & Parallel Grooves
  const phobosCanvas = document.createElement('canvas');
  phobosCanvas.width = 512;
  phobosCanvas.height = 256;
  const pCtx = phobosCanvas.getContext('2d') ;
  const pImg = pCtx.createImageData(512, 256);
  const pd = pImg.data;
  const phobosHeight = new Float32Array(512 * 256);

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 512; x++) {
      const u = x / 512;
      const v = y / 256;
      const lon = u * Math.PI * 2;
      const lat = (v - 0.5) * Math.PI;
      // Characteristic Phobos tidal stress grooves
      const groove = Math.sin(lon * 14 + lat * 10) * Math.cos(lat * 4) * 0.14;
      const grit =
        Math.sin(x * 0.25 + y * 0.31) * 0.12 +
        Math.cos(x * 0.65 - y * 0.52) * 0.08 +
        (((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1 - 0.5) * 0.16;

      // Stickney Crater centered near (u=0.28, v=0.52)
      const ds = Math.hypot((u - 0.28) * 2.0, v - 0.52);
      const stickneyBowl = ds < 0.22 ? -Math.cos((ds / 0.22) * (Math.PI * 0.5)) * 0.72 : 0;
      const stickneyRim = Math.exp(-Math.pow((ds - 0.22) / 0.035, 2)) * 0.28;

      const hVal = groove + grit + stickneyBowl + stickneyRim;
      phobosHeight[y * 512 + x] = hVal;

      const base = 112 + hVal * 48 + (ds < 0.26 && ds > 0.18 ? 18 : 0);
      const idx = (y * 512 + x) * 4;
      pd[idx] = Math.min(220, Math.max(48, base * 1.08));
      pd[idx + 1] = Math.min(205, Math.max(42, base * 0.96));
      pd[idx + 2] = Math.min(190, Math.max(38, base * 0.87));
      pd[idx + 3] = 255;
    }
  }
  pCtx.putImageData(pImg, 0, 0);
  // Secondary impact craters across Phobos
  for (let c = 0; c < 48; c++) {
    const cx = (c * 137 + 41) % 512;
    const cy = 24 + ((c * 83 + 17) % 208);
    const cr = 3 + (c % 5) * 2.8;
    const cg = pCtx.createRadialGradient(cx, cy, cr * 0.2, cx, cy, cr);
    cg.addColorStop(0, 'rgba(38, 30, 26, 0.52)');
    cg.addColorStop(0.75, 'rgba(65, 52, 46, 0.35)');
    cg.addColorStop(0.95, 'rgba(155, 138, 124, 0.28)');
    cg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pCtx.fillStyle = cg;
    pCtx.beginPath();
    pCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    pCtx.fill();
  }
  const phobosMap = new THREE.CanvasTexture(phobosCanvas);
  phobosMap.colorSpace = THREE.SRGBColorSpace;
  phobosMap.wrapS = THREE.RepeatWrapping;
  phobosMap.anisotropy = maxAnisotropy;

  const phobosNormalCanvas = document.createElement('canvas');
  phobosNormalCanvas.width = 512;
  phobosNormalCanvas.height = 256;
  const pnCtx = phobosNormalCanvas.getContext('2d') ;
  const pnImg = pnCtx.createImageData(512, 256);
  const pnd = pnImg.data;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 512; x++) {
      const xm = (x + 511) % 512;
      const xp = (x + 1) % 512;
      const ym = Math.max(0, y - 1);
      const yp = Math.min(255, y + 1);
      const dx = phobosHeight[y * 512 + xp] - phobosHeight[y * 512 + xm];
      const dy = phobosHeight[yp * 512 + x] - phobosHeight[ym * 512 + x];
      const idx = (y * 512 + x) * 4;
      pnd[idx] = Math.min(255, Math.max(0, 128 - dx * 95));
      pnd[idx + 1] = Math.min(255, Math.max(0, 128 - dy * 95));
      pnd[idx + 2] = 232;
      pnd[idx + 3] = 255;
    }
  }
  pnCtx.putImageData(pnImg, 0, 0);
  const phobosNormal = new THREE.CanvasTexture(phobosNormalCanvas);
  phobosNormal.wrapS = THREE.RepeatWrapping;

  // 12. Deimos Smoother Dusty Regolith Texture
  const deimosCanvas = document.createElement('canvas');
  deimosCanvas.width = 256;
  deimosCanvas.height = 128;
  const dCtx = deimosCanvas.getContext('2d') ;
  dCtx.fillStyle = '#9a8c7e';
  dCtx.fillRect(0, 0, 256, 128);
  for (let c = 0; c < 36; c++) {
    const cx = (c * 71 + 19) % 256;
    const cy = 14 + ((c * 43) % 100);
    const cr = 2.5 + (c % 4) * 2.2;
    const cg = dCtx.createRadialGradient(cx, cy, cr * 0.25, cx, cy, cr);
    cg.addColorStop(0, 'rgba(110, 96, 84, 0.45)');
    cg.addColorStop(0.85, 'rgba(182, 168, 154, 0.28)');
    cg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dCtx.fillStyle = cg;
    dCtx.beginPath();
    dCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    dCtx.fill();
  }
  const deimosMap = new THREE.CanvasTexture(deimosCanvas);
  deimosMap.colorSpace = THREE.SRGBColorSpace;
  deimosMap.wrapS = THREE.RepeatWrapping;
  deimosMap.anisotropy = maxAnisotropy;

  // 13. Crisp Airy-Disc Star Point Sprite
  const starCanvas = makeNoiseCanvas(64, (ctx, s) => {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 0.5, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.18, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.45, 'rgba(220, 235, 255, 0.22)');
    grad.addColorStop(1, 'rgba(200, 220, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  });
  const starSprite = new THREE.CanvasTexture(starCanvas);
  starSprite.colorSpace = THREE.SRGBColorSpace;

  return {
    regolithMap,
    regolithNormal,
    kaptonMap,
    kaptonNormal,
    chassisWhiteMap,
    deckMap,
    armDecalMap,
    wheelTreadMap,
    trackMarkMap,
    dustSprite,
    contactShadow,
    phobosMap,
    phobosNormal,
    deimosMap,
    starSprite,
    dispose: () => {
      regolithMap.dispose();
      regolithNormal.dispose();
      kaptonMap.dispose();
      kaptonNormal.dispose();
      chassisWhiteMap.dispose();
      deckMap.dispose();
      armDecalMap.dispose();
      wheelTreadMap.dispose();
      trackMarkMap.dispose();
      dustSprite.dispose();
      contactShadow.dispose();
      phobosMap.dispose();
      phobosNormal.dispose();
      deimosMap.dispose();
      starSprite.dispose();
    },
  };
}
