import * as THREE from "three";
import { BRASS_MAT, STEEL_MAT, WHEEL_MAT, FRAME_MAT, BEAM_MAT, BOILER_MAT, CAB_MAT, BRICK_MAT, DARK_MAT, STONE_MAT, WOOD_MAT } from "./materials.js";
import { MINERALS, COAL, IRON, GOLD, MAX_WAGONS, WAGON_PITCH } from "./constants.js";

// Box-Helper
export function addBox(group, [w, h, d], [x, y, z], material) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  box.position.set(x, y, z);
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);
  return box;
}

// Stream-Helper
function createLumpStream(material) {
  const textureSize = 64;
  const canvas = document.createElement("canvas");
  canvas.width = textureSize;
  canvas.height = textureSize;
  const ctx = canvas.getContext("2d");

  // Hintergrund
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, textureSize, textureSize);

  // Zufällige Steine
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * textureSize;
    const y = Math.random() * textureSize;
    const size = 5 + Math.random() * 10;
    ctx.fillStyle = "#4a3b2e";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1, 8),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.8 })
  );
}

function createLumpStreamArray(material) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1, 8),
    material
  );
  return mesh;
}

// Kopfgerüst (Headframe)
export function addHeadframe(group, x, z, frameMat, height, wheelMat, baseY = 0) {
  const frame = new THREE.Group();
  frame.position.set(x, baseY, z);

  const half = 0.8;
  for (const dx of [-half, half]) {
    for (const dz of [-half, half]) {
      addBox(frame, [0.2, height, 0.2], [dx, height / 2, dz], frameMat);
    }
  }
  for (let y = 1.5; y < height - 0.5; y += 1.7) {
    for (const dz of [-half, half]) {
      addBox(frame, [half * 2 + 0.2, 0.14, 0.14], [0, y, dz], frameMat);
    }
    for (const dx of [-half, half]) {
      addBox(frame, [0.14, 0.14, half * 2 + 0.2], [dx, y, 0], frameMat);
    }
  }
  addBox(frame, [half * 2 + 0.4, 0.24, half * 2 + 0.4], [0, height, 0], frameMat);

  const strut = addBox(frame, [0.2, height + 0.2, 0.2], [height * 0.35, height * 0.48, 0], frameMat);
  strut.rotation.z = 0.42;

  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 8, 24), wheelMat);
  wheel.position.set(0, height + 0.85, 0);
  wheel.castShadow = true;
  frame.add(wheel);

  if (baseY === 0) {
    const house = addBox(
      frame,
      [2.4, 1.8, 2],
      [3.6, 0.9, 0],
      new THREE.MeshStandardMaterial({ color: 0x8a4b3a, roughness: 0.85 })
    );
    house.receiveShadow = true;
    addBox(frame, [2.7, 0.16, 2.3], [3.6, 1.88, 0], new THREE.MeshStandardMaterial({ color: 0x3c3f44, roughness: 0.7 }));
  }

  group.add(frame);
}

// Zeichenposten (Schilder)
export function addSignPost(group, text, color, x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 3),
    new THREE.MeshStandardMaterial({ color: 0x5a3b26, roughness: 0.9 })
  );
  pole.position.set(x, 1.5, z);
  group.add(pole);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.5, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  sign.position.set(x, 3.25, z);
  group.add(sign);
}

// Pfählen (Piles)
export function addPiles(group, piles, material) {
  for (const [x, z, radius, height] of piles) {
    const pile = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 9), material);
    pile.position.set(x, 0.02 + height / 2, z);
    pile.rotation.y = x;
    pile.castShadow = true;
    pile.receiveShadow = true;
    group.add(pile);
  }
}

// Grundpatches
export function addGroundPatch(group, x, z, radius, color) {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 40),
    new THREE.MeshStandardMaterial({ color, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(x, 0.021, z);
  ground.receiveShadow = true;
  group.add(ground);
}

// Tripper (Halden-Abladung)
export function addTipple(group, { chuteX, trackZ, mineral, beltStart, timber }) {
  const binZ = trackZ - 2.9;
  const binTop = 4.4;
  const binX = chuteX + ((MAX_WAGONS - 1) * WAGON_PITCH) / 2;
  const binLength = (MAX_WAGONS - 1) * WAGON_PITCH + 2.4;
  
  addBox(group, [binLength, 1.3, 1.8], [binX, binTop - 0.65, binZ], timber);
  addBox(group, [binLength - 0.4, 0.1, 1.4], [binX, binTop - 0.02, binZ], MINERALS[mineral]);

  const half = binLength / 2 - 0.2;
  for (const dx of [-half, 0, half]) {
    for (const dz of [-0.75, 0.75]) {
      addBox(group, [0.22, 3.1, 0.22], [binX + dx, 1.55, binZ + dz], timber);
    }
    addBox(group, [0.12, 0.12, 1.7], [binX + dx, 1.6, binZ], timber);
  }
  addBox(group, [binLength - 0.3, 0.12, 0.12], [binX, 1.6, binZ + 0.75], timber);

  const chuteTopZ = binZ + 0.9;
  const tipZ = trackZ - 0.25;
  
  // Chutes
  const streams = [];
  for (const x of [-0.35, 0.35]) {
    const chute = new THREE.Group();
    const chuteLength = 1.5;
    addBox(chute, [0.2, chuteLength, 0.3], [x, 1.65, 0], timber);
    addBox(chute, [0.06, 0.28, chuteLength], [x + (x > 0 ? -0.15 : 0.15), 1.5, 0], timber);
    for (const side of [-0.35, 0.35]) {
      addBox(chute, [0.06, 0.28, chuteLength], [side, 0.12, 0], timber);
    }
    group.add(chute);

    const stream = createLumpStreamArray(
      new THREE.MeshStandardMaterial({ color: MINERALS[mineral].color, roughness: 0.9 })
    );
    stream.position.set(x, binTop - 1.2, tipZ + 0.15);
    group.add(stream);
    streams.push(stream);
  }

  // Band
  const beltEnd = new THREE.Vector3(binX, binTop + 0.05, binZ - 0.9);
  const rise = beltEnd.y - beltStart.y;
  const run = beltEnd.z - beltStart.z;
  const belt = new THREE.Group();
  belt.position.copy(beltStart).lerp(beltEnd, 0.5);
  belt.rotation.x = -Math.atan2(rise, run);
  const beltLength = Math.hypot(rise, run);
  
  addBox(
    belt,
    [0.8, 0.12, beltLength],
    [0, 0, 0],
    new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6 })
  );
  for (const side of [-0.42, 0.42]) {
    addBox(belt, [0.06, 0.22, beltLength], [side, 0.08, 0], timber);
  }
  addBox(group, [0.2, belt.position.y, 0.2], [binX, belt.position.y / 2, belt.position.z], timber);
  
  group.add(belt);

  return streams;
}