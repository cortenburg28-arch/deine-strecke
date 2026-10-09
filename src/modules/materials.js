import * as THREE from "three";
import { MINERALS, COAL, IRON, GOLD } from "./constants.js";

// Mineral-Materialien
export const MINERAL_MATERIALS = {
  [COAL]: new THREE.MeshStandardMaterial({ color: MINERALS[COAL].color, roughness: 0.9, flatShading: true }),
  [IRON]: new THREE.MeshStandardMaterial({ color: MINERALS[IRON].color, roughness: 0.9, flatShading: true }),
  [GOLD]: new THREE.MeshStandardMaterial({
    color: MINERALS[GOLD].color,
    emissive: 0x6b4a00,
    roughness: 0.35,
    metalness: 0.7,
    flatShading: true,
  }),
};

// Farben als Konstanten
const BRASS_MAT = new THREE.MeshStandardMaterial({ color: 0xd9af86, roughness: 0.2, metalness: 0.7 });
const STEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.5, metalness: 0.6 });

// Standard-Materialien für Bauwerke
const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x3c3f44, roughness: 0.6 });
const FRAME_MAT = new THREE.MeshStandardMaterial({ color: 0x4e2a24, roughness: 0.7 });
const BEAM_MAT = new THREE.MeshStandardMaterial({ color: 0x3c3f44, roughness: 0.6 });
const BOILER_MAT = new THREE.MeshStandardMaterial({ color: 0x8d4336, roughness: 0.5 });
const CAB_MAT = new THREE.MeshStandardMaterial({ color: 0x8a4b3a, roughness: 0.85 });
const BRICK_MAT = new THREE.MeshStandardMaterial({ color: 0x8d4336, roughness: 0.92 });
const DARK_MAT = new THREE.MeshStandardMaterial({ color: 0x4e2a24, roughness: 0.95 });
const STONE_MAT = new THREE.MeshStandardMaterial({ color: 0x6e6860, roughness: 1 });
const WOOD_MAT = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.88 });

// Textur-Helper
function createLumpStream(material) {
  const textureSize = 64;
  const canvas = document.createElement("canvas");
  canvas.width = textureSize;
  canvas.height = textureSize;
  const ctx = canvas.getContext("2d");

  // Hintergrund
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, textureSize, textureSize);

  // ZufälligeSteine
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

// Stream-Arrays
function createLumpStreamArray(material) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1, 8),
    material
  );
  return mesh;
}

export {
  BRASS_MAT,
  STEEL_MAT,
  WHEEL_MAT,
  FRAME_MAT,
  BEAM_MAT,
  BOILER_MAT,
  CAB_MAT,
  BRICK_MAT,
  DARK_MAT,
  STONE_MAT,
  WOOD_MAT,
  createLumpStream,
  createLumpStreamArray
};