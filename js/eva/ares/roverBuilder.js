import * as THREE from 'three';


                                 
                     
                         
                   
                  
               
                             
 

                               
                    
                            
                        
                                   
                         
                         
                        
                          
                                
                                
                           
                          
                           
                            
                      
 

/**
 * Builds a photorealistic Perseverance-class 6-wheel Mars rover matching real NASA JPL geometry:
 * - Hollow open-sided machined titanium wheels with 3D tread grousers + 6 curved S-spokes + steering actuators
 * - White ceramic-coated Warm Electronics Box (WEB) with recessed mechanical bays & gold Kapton MLI cable blankets
 * - Angled rear MMRTG power unit flanked by twin white radiator fin wings
 * - Hexagonal gimbaled High-Gain Antenna + UHF mast + SuperCam rectangular white head & Mastcam-Z stereo chin pod
 * - Articulated 5-DOF Robotic Sample Arm with circular PIXL/SHERLOC/drill turret
 */
export function buildMarsRover(textures                      , isSoftwareGl         )               {
  const disposables                            = [];
  const track =                                    (item   )    => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  // Ground clearance matching real Perseverance (~0.66m belly clearance over 0.42m radius wheels)
  chassisGroup.position.y = 0.84;
  root.add(chassisGroup);

  // Calibrated PBR Materials
  const whiteChassisMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.chassisWhiteMap,
      color: 0xf0ede8,
      metalness: 0.12,
      roughness: 0.46,
    })
  );

  const deckMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.deckMap,
      metalness: 0.16,
      roughness: 0.54,
    })
  );

  const kaptonMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.kaptonMap,
      normalMap: textures.kaptonNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      metalness: 0.9,
      roughness: 0.24,
    })
  );

  const titaniumMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xaeb6c2,
      metalness: 0.84,
      roughness: 0.32,
    })
  );

  const darkGunmetalMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x22262d,
      metalness: 0.72,
      roughness: 0.42,
    })
  );

  const copperAnodizedMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xc96c2b,
      metalness: 0.86,
      roughness: 0.25,
    })
  );

  const armDecalMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.armDecalMap,
      metalness: 0.25,
      roughness: 0.45,
    })
  );

  const wheelRimOuterMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.wheelTreadMap,
      color: 0x2b3038,
      metalness: 0.76,
      roughness: 0.44,
      side: THREE.DoubleSide,
    })
  );

  const wheelSpokeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x9aa3af,
      metalness: 0.88,
      roughness: 0.28,
    })
  );

  const lensMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      metalness: 0.95,
      roughness: 0.08,
    })
  );

  // 1. Primary Chassis: White Aerospace WEB Hull + Gold Kapton Belly Thermal Blanket
  const hullShape = new THREE.Shape();
  const hw = 0.84;
  const hl = 1.32;
  const ch = 0.14;
  hullShape.moveTo(-hw + ch, -hl);
  hullShape.lineTo(hw - ch, -hl);
  hullShape.lineTo(hw, -hl + ch);
  hullShape.lineTo(hw, hl - ch);
  hullShape.lineTo(hw - ch, hl);
  hullShape.lineTo(-hw + ch, hl);
  hullShape.lineTo(-hw, hl - ch);
  hullShape.lineTo(-hw, -hl + ch);
  hullShape.closePath();

  const hullGeo = track(
    new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.48,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 2,
    })
  );
  hullGeo.rotateX(Math.PI / 2);
  const hullMesh = new THREE.Mesh(hullGeo, whiteChassisMat);
  hullMesh.position.y = 0.42;
  hullMesh.castShadow = !isSoftwareGl;
  hullMesh.receiveShadow = true;
  chassisGroup.add(hullMesh);

  // Belly thermal protection shroud (gold Kapton underneath)
  const bellyGeo = track(new THREE.BoxGeometry(1.42, 0.14, 2.28));
  const bellyMesh = new THREE.Mesh(bellyGeo, kaptonMat);
  bellyMesh.position.set(0, -0.1, 0.05);
  bellyMesh.castShadow = !isSoftwareGl;
  chassisGroup.add(bellyMesh);

  // Recessed side electronics bay ribs + front Hazcam stereo window bar
  const frontHazBar = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.18, 0.12, 0.1)),
    darkGunmetalMat
  );
  frontHazBar.position.set(0, 0.24, -1.36);
  chassisGroup.add(frontHazBar);

  [-0.36, 0.36].forEach((hx) => {
    const hazEye = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.028, 0.028, 0.05, 12)),
      lensMat
    );
    hazEye.rotation.x = Math.PI / 2;
    hazEye.position.set(hx, 0.24, -1.41);
    chassisGroup.add(hazEye);
  });

  // Top Deck Plate + Kapton Cable Conduit Bundles
  const deckMesh = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.66, 0.06, 2.58)),
    deckMat
  );
  deckMesh.position.set(0, 0.47, 0);
  deckMesh.castShadow = !isSoftwareGl;
  deckMesh.receiveShadow = true;
  chassisGroup.add(deckMesh);

  // Deck mechanical equipment boxes & Kapton harness ribbons
  const deckEquip1 = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.48, 0.18, 0.56)),
    whiteChassisMat
  );
  deckEquip1.position.set(-0.35, 0.58, -0.15);
  deckEquip1.castShadow = !isSoftwareGl;
  chassisGroup.add(deckEquip1);

  const deckGoldPack = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.42, 0.14, 0.62)),
    kaptonMat
  );
  deckGoldPack.position.set(0.28, 0.56, 0.24);
  deckGoldPack.castShadow = !isSoftwareGl;
  chassisGroup.add(deckGoldPack);

  // Differential Rocker-Bogie Crossbar across top deck
  const diffBar = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.036, 0.036, 1.88, 10)),
    titaniumMat
  );
  diffBar.rotation.z = Math.PI / 2;
  diffBar.position.set(0, 0.56, 0.02);
  chassisGroup.add(diffBar);

  // 2. Rear Angled MMRTG Nuclear Power Unit + Flanking White Radiator Fin Wings
  const rtgGroup = new THREE.Group();
  rtgGroup.position.set(0, 0.42, 1.46);
  rtgGroup.rotation.x = -0.38;
  chassisGroup.add(rtgGroup);

  const rtgCore = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.18, 0.21, 0.88, 16)),
    darkGunmetalMat
  );
  rtgCore.rotation.x = Math.PI / 2;
  rtgCore.castShadow = !isSoftwareGl;
  rtgGroup.add(rtgCore);

  // 8 radial cooling fins around MMRTG
  const finGeo = track(new THREE.BoxGeometry(0.62, 0.024, 0.74));
  for (let f = 0; f < 4; f++) {
    const fin = new THREE.Mesh(finGeo, whiteChassisMat);
    fin.rotation.z = (f * Math.PI) / 4;
    rtgGroup.add(fin);
  }
  // Twin angled white heat-rejection radiator wings flanking the MMRTG (distinctive Perseverance rear silhouette)
  [-0.44, 0.44].forEach((rx) => {
    const wing = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.08, 0.46, 0.68)),
      whiteChassisMat
    );
    wing.position.set(rx, 0.04, 0.05);
    wing.rotation.z = rx < 0 ? 0.35 : -0.35;
    wing.castShadow = !isSoftwareGl;
    rtgGroup.add(wing);
  });

  // 3. Gimbaled Hexagonal High-Gain Antenna (HGA) + UHF Helical Mast (Right Rear Deck)
  const dishGroup = new THREE.Group();
  dishGroup.position.set(-0.5, 0.56, 0.72);
  chassisGroup.add(dishGroup);

  const hgaStem = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.03, 0.04, 0.36, 10)),
    titaniumMat
  );
  hgaStem.position.y = 0.16;
  dishGroup.add(hgaStem);

  const hgaPaddle = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 6)),
    whiteChassisMat
  );
  hgaPaddle.position.set(0, 0.38, 0);
  hgaPaddle.rotation.x = 0.55;
  hgaPaddle.castShadow = !isSoftwareGl;
  dishGroup.add(hgaPaddle);

  const hgaRim = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.24, 0.24, 0.045, 6)),
    kaptonMat
  );
  hgaRim.position.copy(hgaPaddle.position);
  hgaRim.rotation.copy(hgaPaddle.rotation);
  dishGroup.add(hgaRim);

  // UHF Cylindrical Antenna (Image 3 rear-left tall cylinder)
  const uhfPole = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.08, 0.09, 0.42, 14)),
    titaniumMat
  );
  uhfPole.position.set(0.55, 0.72, 0.92);
  uhfPole.castShadow = !isSoftwareGl;
  chassisGroup.add(uhfPole);

  // 4. Remote Sensing Mast + White Rectangular SuperCam Head + Mastcam-Z Chin + MEDA Wind Sensors
  const mastPivot = new THREE.Group();
  mastPivot.position.set(0.46, 0.5, -0.76);
  chassisGroup.add(mastPivot);

  const mastPole = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.052, 0.068, 1.04, 14)),
    whiteChassisMat
  );
  mastPole.position.y = 0.52;
  mastPole.castShadow = !isSoftwareGl;
  mastPivot.add(mastPole);

  // Kapton neck collar + Twin MEDA Horizontal Wind Sensor Fingers (clearly visible in Image 1 & 3!)
  const mastCollar = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.082, 0.082, 0.12, 12)),
    kaptonMat
  );
  mastCollar.position.y = 0.78;
  mastPivot.add(mastCollar);

  const medaBoom = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.018, 0.022, 0.52, 8)),
    whiteChassisMat
  );
  medaBoom.rotation.z = Math.PI / 2;
  medaBoom.position.set(0.14, 0.74, 0);
  mastPivot.add(medaBoom);

  const mastHead = new THREE.Group();
  mastHead.position.y = 1.12;
  mastPivot.add(mastHead);

  // White SuperCam rectangular upper enclosure (with angled visor brow)
  const headBox = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.46, 0.24, 0.34)),
    whiteChassisMat
  );
  headBox.castShadow = !isSoftwareGl;
  mastHead.add(headBox);

  // Large Circular Black Cyclops SuperCam Aperture (right side of head, Image 1 & 2!)
  const superCamRing = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.088, 0.088, 0.06, 20)),
    darkGunmetalMat
  );
  superCamRing.rotation.x = Math.PI / 2;
  superCamRing.position.set(0.11, 0.02, -0.175);
  mastHead.add(superCamRing);

  const superCamGlass = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.065, 20)),
    lensMat
  );
  superCamGlass.rotation.y = Math.PI;
  superCamGlass.position.set(0.11, 0.02, -0.207);
  mastHead.add(superCamGlass);

  // Lower dark Mastcam-Z stereo camera chin + Navcam pair
  const chinPod = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.42, 0.14, 0.26)),
    darkGunmetalMat
  );
  chinPod.position.set(0, -0.17, -0.02);
  chinPod.castShadow = !isSoftwareGl;
  mastHead.add(chinPod);

  [-0.12, 0.12].forEach((mx) => {
    const mastCamLens = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.08, 0.06, 0.05)),
      lensMat
    );
    mastCamLens.position.set(mx, -0.17, -0.155);
    mastHead.add(mastCamLens);
  });

  // 1st-Person Mastcam Camera Anchor
  const mastCameraAnchor = new THREE.Object3D();
  mastCameraAnchor.position.set(0, 0.18, -0.26);
  mastHead.add(mastCameraAnchor);

  // 3D SuperCam LIBS Laser Beam + Impact Glow
  const laserGeo = track(new THREE.CylinderGeometry(0.014, 0.026, 1, 8));
  laserGeo.translate(0, 0.5, 0);
  laserGeo.rotateX(-Math.PI / 2);
  const laserMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const laserBeam = new THREE.Mesh(laserGeo, laserMat);
  laserBeam.position.set(0.11, 0.02, -0.21);
  laserBeam.visible = false;
  mastHead.add(laserBeam);

  const laserImpact = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.24, 12, 12)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  );
  laserImpact.visible = false;
  root.add(laserImpact);

  // 5. Front 5-DOF Robotic Sample Arm & Multi-Instrument Turret (Image 1 & 3 iconic silhouette!)
  const sampleArm = new THREE.Group();
  sampleArm.position.set(-0.34, 0.2, -1.34);
  chassisGroup.add(sampleArm);

  // Upper boom sloping down-forward
  const upperArm = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.13, 0.13, 0.68)),
    armDecalMat
  );
  upperArm.position.set(0.06, -0.1, -0.3);
  upperArm.rotation.x = 0.36;
  upperArm.castShadow = !isSoftwareGl;
  sampleArm.add(upperArm);

  // Elbow rotary actuator drum
  const elbowJoint = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 14)),
    darkGunmetalMat
  );
  elbowJoint.rotation.z = Math.PI / 2;
  elbowJoint.position.set(0.06, -0.22, -0.62);
  sampleArm.add(elbowJoint);

  // Forearm "PERSEVERANCE / MARS 2020" vertical strut rising to the massive circular instrument turret
  const forearm = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.12, 0.62, 0.14)),
    armDecalMat
  );
  forearm.position.set(0.06, 0.08, -0.66);
  forearm.castShadow = !isSoftwareGl;
  sampleArm.add(forearm);

  // Circular Instrument Turret (Rotary Drill + PIXL + SHERLOC)
  const turretGroup = new THREE.Group();
  turretGroup.position.set(0.06, 0.42, -0.76);
  sampleArm.add(turretGroup);

  const turretCore = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.24, 0.24, 0.24, 16)),
    darkGunmetalMat
  );
  turretCore.rotation.x = Math.PI / 2;
  turretCore.castShadow = !isSoftwareGl;
  turretGroup.add(turretCore);

  const turretCap = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.16, 0.16, 0.27, 14)),
    titaniumMat
  );
  turretCap.rotation.x = Math.PI / 2;
  turretGroup.add(turretCap);

  // Percussive Coring Drill Barrel + PIXL Copper Pod
  const drillBarrel = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.055, 0.045, 0.34, 12)),
    copperAnodizedMat
  );
  drillBarrel.rotation.x = Math.PI / 2;
  drillBarrel.position.set(-0.18, -0.05, -0.14);
  turretGroup.add(drillBarrel);

  // 6. Dual Tactical LED Headlights + Rear Marker Lights
  const headlights                    = [];
  const headlightMeshes               = [];
  const ledMat = track(new THREE.MeshBasicMaterial({ color: 0xfff7ed }));

  [-0.56, 0.56].forEach((hx) => {
    const housing = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.065, 0.075, 0.1, 12)),
      darkGunmetalMat
    );
    housing.rotation.x = Math.PI / 2;
    housing.position.set(hx, 0.38, -1.36);
    chassisGroup.add(housing);

    const bulb = new THREE.Mesh(track(new THREE.CircleGeometry(0.054, 12)), ledMat);
    bulb.rotation.y = Math.PI;
    bulb.position.set(hx, 0.38, -1.415);
    chassisGroup.add(bulb);
    headlightMeshes.push(bulb);

    const spot = new THREE.SpotLight(0xfff1d6, 18, 52, Math.PI / 5, 0.45, 1.4);
    spot.position.set(hx, 0.38, -1.42);
    spot.target.position.set(hx * 1.1, -1.2, -16);
    chassisGroup.add(spot);
    chassisGroup.add(spot.target);
    headlights.push(spot);
  });

  const tailMat = track(new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  [-0.62, 0.62].forEach((tx) => {
    const tail = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 0.045, 0.04)), tailMat);
    tail.position.set(tx, 0.34, 1.35);
    chassisGroup.add(tail);
  });

  // 7. Articulated Rocker-Bogie Tubular Titanium Suspension
  const leftRocker = new THREE.Group();
  const rightRocker = new THREE.Group();
  leftRocker.position.set(-0.88, 0.22, 0);
  rightRocker.position.set(0.88, 0.22, 0);
  chassisGroup.add(leftRocker, rightRocker);

  const makeStrut = (p1               , p2               , radius        , parent             ) => {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const strut = new THREE.Mesh(
      track(new THREE.CylinderGeometry(radius, radius, len, 10)),
      darkGunmetalMat
    );
    strut.position.copy(p1).addScaledVector(dir, 0.5);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    strut.castShadow = !isSoftwareGl;
    parent.add(strut);
  };

  [-1, 1].forEach((sideSign) => {
    const rocker = sideSign < 0 ? leftRocker : rightRocker;
    const xOut = sideSign * 0.36;
    // Main pivot joint drum
    const pivotDrum = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 12)),
      titaniumMat
    );
    pivotDrum.rotation.z = Math.PI / 2;
    pivotDrum.position.set(0, 0.04, 0);
    rocker.add(pivotDrum);

    // Front rocker leg -> Front wheel actuator top
    makeStrut(new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(xOut, -0.18, -1.28), 0.046, rocker);
    // Rear rocker arm -> Bogie pivot
    makeStrut(new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(xOut * 0.6, -0.16, 0.64), 0.046, rocker);
    // Bogie arms -> Middle & Rear wheel hubs
    makeStrut(new THREE.Vector3(xOut * 0.6, -0.16, 0.64), new THREE.Vector3(xOut, -0.32, 0.02), 0.038, rocker);
    makeStrut(new THREE.Vector3(xOut * 0.6, -0.16, 0.64), new THREE.Vector3(xOut, -0.18, 1.28), 0.038, rocker);
  });

  // 8. Photorealistic Hollow Open-Sided Machined Wheels (3D Grousers + 6 Curved S-Spokes!)
  const wheels                   = [];
  const wheelZ = [-1.28, 0.02, 1.28];
  const wRadius = 0.42;
  const wWidth = 0.36;

  // Hollow Open-Ended Outer Wheel Drum + Inner Flange Ring
  const outerDrumGeo = track(new THREE.CylinderGeometry(wRadius, wRadius, wWidth, 28, 1, true));
  outerDrumGeo.rotateZ(Math.PI / 2);
  const innerRimLipGeo = track(new THREE.TorusGeometry(wRadius - 0.015, 0.018, 8, 28));
  innerRimLipGeo.rotateY(Math.PI / 2);

  // 3D Cleated Grouser Bars around the tire circumference
  const grouserGeo = track(new THREE.BoxGeometry(wWidth + 0.01, 0.022, 0.022));
  // Curved S-Spoke Shape (ExtrudeGeometry) matching Perseverance Image 3!
  const spokeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.08, 0),
    new THREE.Vector3(0, 0.2, 0.08),
    new THREE.Vector3(0, 0.31, -0.05),
    new THREE.Vector3(0, wRadius - 0.02, 0.02),
  ]);
  const sSpokeGeo = track(new THREE.TubeGeometry(spokeCurve, 10, 0.018, 6, false));
  const hubCylGeo = track(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 14));
  hubCylGeo.rotateZ(Math.PI / 2);
  const hubCollarGeo = track(new THREE.CylinderGeometry(0.065, 0.065, 0.22, 12));
  hubCollarGeo.rotateZ(Math.PI / 2);

  // Steering Actuator + C-Fork over each wheel
  const steerPodGeo = track(new THREE.CylinderGeometry(0.075, 0.075, 0.24, 12));
  const cForkVerticalGeo = track(new THREE.BoxGeometry(0.06, 0.44, 0.09));
  const cForkAxleGeo = track(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 10));
  cForkAxleGeo.rotateZ(Math.PI / 2);

  ([-1, 1]         ).forEach((side) => {
    wheelZ.forEach((wz, idx) => {
      const pivot = new THREE.Group();
      const xPos = side * 1.24;
      pivot.position.set(xPos, wRadius, wz);
      root.add(pivot);

      // Steering Actuator + Curved Fork Assembly (rotates with wheel steering, does NOT spin)
      if (idx === 0 || idx === 2) {
        const steerActuator = new THREE.Mesh(steerPodGeo, darkGunmetalMat);
        steerActuator.position.set(0, 0.56, 0);
        pivot.add(steerActuator);
      }
      const forkVert = new THREE.Mesh(cForkVerticalGeo, titaniumMat);
      forkVert.position.set(-side * 0.23, 0.24, 0);
      pivot.add(forkVert);

      const forkAxle = new THREE.Mesh(cForkAxleGeo, darkGunmetalMat);
      forkAxle.position.set(-side * 0.11, 0, 0);
      pivot.add(forkAxle);

      // Spinning Hollow Wheel Assembly
      const spinGroup = new THREE.Group();
      pivot.add(spinGroup);

      const drum = new THREE.Mesh(outerDrumGeo, wheelRimOuterMat);
      drum.castShadow = !isSoftwareGl;
      drum.receiveShadow = true;
      spinGroup.add(drum);

      // Left & right machined rim lips
      [-wWidth * 0.48, wWidth * 0.48].forEach((lx) => {
        const lip = new THREE.Mesh(innerRimLipGeo, wheelSpokeMat);
        lip.position.x = lx;
        spinGroup.add(lip);
      });

      // 28 3D Raised Titanium Cleat Grousers around the tread
      const grouserCount = 28;
      for (let g = 0; g < grouserCount; g++) {
        const ang = (g / grouserCount) * Math.PI * 2;
        const bar = new THREE.Mesh(grouserGeo, wheelSpokeMat);
        bar.position.set(0, Math.cos(ang) * (wRadius + 0.005), Math.sin(ang) * (wRadius + 0.005));
        bar.rotation.x = ang;
        // Slight alternating wave tilt like Perseverance's grouser pattern
        bar.rotation.y = (g % 2 === 0 ? 1 : -1) * 0.12;
        spinGroup.add(bar);
      }

      // 6 Curved Springy Titanium S-Spokes radiating from central drive hub
      for (let s = 0; s < 6; s++) {
        const spoke = new THREE.Mesh(sSpokeGeo, wheelSpokeMat);
        spoke.rotation.x = (s / 6) * Math.PI * 2;
        spinGroup.add(spoke);
      }

      const hub = new THREE.Mesh(hubCylGeo, darkGunmetalMat);
      const collar = new THREE.Mesh(hubCollarGeo, copperAnodizedMat);
      spinGroup.add(hub, collar);

      wheels.push({
        pivot,
        spinGroup,
        isFront: idx === 0,
        isRear: idx === 2,
        side,
        localOffset: new THREE.Vector3(xPos, wRadius, wz),
      });
    });
  });

  // 9. Soft Radial Contact Shadow Plane beneath Rover
  const shadowGeo = track(new THREE.PlaneGeometry(3.8, 4.5));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = track(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
    })
  );
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.05;
  root.add(contactShadow);

  return {
    root,
    chassisGroup,
    mastHead,
    mastCameraAnchor,
    dishGroup,
    sampleArm,
    laserBeam,
    laserImpact,
    headlights,
    headlightMeshes,
    wheels,
    leftRocker,
    rightRocker,
    contactShadow,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
