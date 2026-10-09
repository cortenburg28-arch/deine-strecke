import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MODEL_FILES = [
  "express_loco",
  "minecart",
  "crusher",
  "headframe",
  "tunnel_portal",
  "mine_entrance",
  "rock_a",
  "rock_b",
  "rock_c",
];
const RECOLOR = {
  crusher: { blue: 0x4a5058, orange: 0x8d3a32, cream: 0xb9ad94, light: 0x9aa4ad },
  headframe: { steel: 0x5a626b, hiVis: 0x8d3a32 },
  tunnel_portal: { concrete: 0x8f887c, dark: 0x2a2826 },
  mine_entrance: { stone: 0x8b8378, dirt: 0x121010 },
  minecart: { paint: 0x8a5a2b },
};
const HIDDEN_PARTS = { tunnel_portal: ["steel", "rubber"] };
const BUCKETS_PER_LINE = 16;
const CABLE_VISUAL_SPEED = 2.4;
const UP = new THREE.Vector3(0, 1, 0);

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

function prepareModel(name, scene) {
  scene.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const color = RECOLOR[name]?.[material.name];
      if (color !== undefined) material.color.setHex(color);
      if (HIDDEN_PARTS[name]?.includes(material.name)) object.visible = false;
    }
  });
  if (name !== "express_loco") return scene;
  const holder = new THREE.Group();
  scene.scale.set(1.15, 1.45, 1.93);
  scene.rotation.y = Math.PI / 2;
  scene.position.y = 0.24;
  holder.add(scene);
  return holder;
}

export async function loadModels() {
  const loader = new GLTFLoader();
  const base = import.meta.env.BASE_URL;
  const entries = await Promise.all(
    MODEL_FILES.map(async (name) => {
      try {
        const gltf = await Promise.race([loader.loadAsync(`${base}models/${name}.glb`), timeout(10000)]);
        return [name, prepareModel(name, gltf.scene)];
      } catch {
        return [name, null];
      }
    }),
  );
  return Object.fromEntries(entries.filter(([, model]) => model));
}

function box(parent, [w, h, d], [x, y, z], material, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, [top, bottom, height, segments = 16], [x, y, z], material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function strut(parent, a, b, thickness, material) {
  const dir = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, dir.length(), thickness), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function gableRoof(parent, length, width, height, [x, y, z], material) {
  const shape = new THREE.Shape([
    new THREE.Vector2(-width / 2, 0),
    new THREE.Vector2(width / 2, 0),
    new THREE.Vector2(0, height),
  ]);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-length / 2, 0, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sparkleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.25, "rgba(200,240,255,0.7)");
  glow.addColorStop(1, "rgba(160,220,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(30, 4, 4, 56);
  ctx.fillRect(4, 30, 56, 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function limitTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c62f1d";
  ctx.strokeStyle = "#fff4e0";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 112, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff4e0";
  ctx.font = "bold 54px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeLoop(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i += 1) cum.push(cum[i - 1] + points[i].distanceTo(points[i - 1]));
  return { points, cum, length: cum[cum.length - 1] };
}

function sampleLoop(loop, u, out) {
  const s = ((u % loop.length) + loop.length) % loop.length;
  let lo = 0;
  let hi = loop.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (loop.cum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const a = loop.points[lo];
  const b = loop.points[hi];
  const t = (s - loop.cum[lo]) / Math.max(loop.cum[hi] - loop.cum[lo], 1e-6);
  out.lerpVectors(a, b, t);
  return { s, dx: b.x - a.x, dz: b.z - a.z };
}

function sagSpan(a, b, sag, count, skipFirst) {
  const points = [];
  for (let k = skipFirst ? 1 : 0; k <= count; k += 1) {
    const t = k / count;
    points.push(new THREE.Vector3().lerpVectors(a, b, t).setY(THREE.MathUtils.lerp(a.y, b.y, t) - 4 * sag * t * (1 - t)));
  }
  return points;
}

export function createDiamondWorld({ layout, heightAt, models, createSign, createLumpStream, addHeadframe, materials }) {
  const group = new THREE.Group();
  const site = new THREE.Group();
  site.visible = false;
  group.add(site);

  const mat = {
    timber: new THREE.MeshStandardMaterial({ color: 0x5a3b26, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.88 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.95 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 1, flatShading: true }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xa39c90, roughness: 0.95 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.5, metalness: 0.6 }),
    lightSteel: new THREE.MeshStandardMaterial({ color: 0x9aa4ad, roughness: 0.4, metalness: 0.6 }),
    binSteel: new THREE.MeshStandardMaterial({ color: 0x3d5466, roughness: 0.55, metalness: 0.4 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x8d3a32, roughness: 0.7 }),
    slate: new THREE.MeshStandardMaterial({ color: 0x3d5466, roughness: 0.7 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xdccdb0, roughness: 0.85 }),
    blueWall: new THREE.MeshStandardMaterial({ color: 0x9fb7c6, roughness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 1 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x2e4756, roughness: 0.3, metalness: 0.3 }),
    showcase: new THREE.MeshStandardMaterial({ color: 0xcfefff, roughness: 0.05, transparent: true, opacity: 0.25 }),
    water: new THREE.MeshStandardMaterial({ color: 0x3f8fc0, roughness: 0.1, transparent: true, opacity: 0.8 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xf2c21b, roughness: 0.5 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x5a5a50, emissive: 0xffd27a, emissiveIntensity: 0, roughness: 0.4 }),
    beacon: new THREE.MeshStandardMaterial({ color: 0x8a1c14, emissive: 0xff2a1a, emissiveIntensity: 0, roughness: 0.4 }),
    diamond: materials.diamond,
    brass: materials.brass,
  };
  const sparkleMap = sparkleTexture();
  const sparkles = [];
  const addSparkle = (parent, [x, y, z], size, phase = Math.random() * 10) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sparkleMap,
        color: 0xdff6ff,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(size);
    sprite.userData = { size, phase };
    parent.add(sprite);
    sparkles.push(sprite);
    return sprite;
  };
  const place = (name, parent, [x, y, z], rotation = 0, scale = 1) => {
    if (!models[name]) return null;
    const clone = models[name].clone(true);
    clone.position.set(x, y, z);
    clone.rotation.y = rotation;
    clone.scale.setScalar(scale);
    parent.add(clone);
    return clone;
  };
  const signPost = (parent, text, [x, y, z], rotation = -0.5, background = "#24506e", width = 2.6) => {
    box(parent, [0.14, 2.2, 0.14], [x, y + 1.1, z], mat.wood);
    const sign = createSign(text, background, "#f4f1e8", width, 0.55);
    sign.position.set(x, y + 2.0, z + 0.1);
    sign.rotation.y = rotation;
    parent.add(sign);
    return sign;
  };
  const gemCluster = (parent, [x, y, z], scale, count = 4) => {
    const cluster = new THREE.Group();
    cluster.position.set(x, y, z);
    for (let i = 0; i < count; i += 1) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 + (i % 3) * 0.05, 0), mat.diamond);
      const angle = (i / count) * Math.PI * 2;
      gem.position.set(Math.cos(angle) * 0.18, (i % 2) * 0.08, Math.sin(angle) * 0.18);
      gem.rotation.set(i, i * 2, 0);
      cluster.add(gem);
    }
    cluster.scale.setScalar(scale);
    parent.add(cluster);
    return cluster;
  };

  const { trackX, sidingX, loadZ, pitch, wagons, bottom, store, plateau, rig, cableZ, pylonX, portals, laneZ, farZ } = layout;

  const station = { mineral: "diamond", streams: [], siding: { group: new THREE.Group(), streams: [] } };
  const binX = trackX + 2.9;
  const binZ = loadZ + ((wagons - 1) * pitch) / 2;
  const binLength = (wagons - 1) * pitch + 2.4;
  const binTop = 4.4;
  const bin = new THREE.Group();
  site.add(bin);
  for (const dz of [-binLength / 2 + 0.2, 0, binLength / 2 - 0.2]) {
    for (const dx of [-0.75, 0.75]) box(bin, [0.22, 3.1, 0.22], [binX + dx, 1.55, binZ + dz], mat.steel);
  }
  box(bin, [1.8, 1.4, binLength], [binX, binTop - 0.7, binZ], mat.binSteel);
  box(bin, [1.9, 0.12, binLength + 0.1], [binX, binTop - 0.35, binZ], mat.lightSteel);
  const binFill = box(bin, [1.5, 0.12, binLength - 0.3], [binX, binTop - 1.2, binZ], mat.diamond, false);
  const chuteDrop = 0.45;
  const chuteRun = binX - 0.9 - (trackX + 0.25);
  for (let i = 0; i < wagons; i += 1) {
    const z = loadZ + i * pitch;
    const chute = new THREE.Group();
    chute.position.set((binX - 0.9 + trackX + 0.25) / 2, binTop - 1.15 - chuteDrop / 2, z);
    chute.rotation.z = Math.atan2(chuteDrop, chuteRun);
    const length = Math.hypot(chuteRun, chuteDrop);
    box(chute, [length, 0.06, 0.7], [0, 0, 0], mat.lightSteel);
    for (const side of [-0.35, 0.35]) box(chute, [length, 0.28, 0.06], [0, 0.12, side], mat.lightSteel);
    bin.add(chute);
    const stream = createLumpStream(mat.diamond);
    stream.position.set(trackX + 0.15, binTop - 1.2 - chuteDrop, z);
    stream.rotation.y = -Math.PI / 2;
    bin.add(stream);
    station.streams.push(stream);
  }
  signPost(site, "Diamant-Ladestation", [trackX + 4.3, 0, loadZ + binLength + 1.5], -0.9, "#24506e", 3.2);

  const sidingGroup = station.siding.group;
  sidingGroup.visible = false;
  site.add(sidingGroup);
  {
    const bridgeY = 5.2;
    const fromX = binX - 0.9;
    const toX = sidingX - 0.6;
    box(sidingGroup, [fromX - toX, 0.5, binLength], [(fromX + toX) / 2, bridgeY, binZ], mat.binSteel);
    box(sidingGroup, [fromX - toX + 0.1, 0.1, binLength + 0.1], [(fromX + toX) / 2, bridgeY + 0.3, binZ], mat.lightSteel);
    for (const dz of [-binLength / 2 + 0.3, binLength / 2 - 0.3]) {
      box(sidingGroup, [0.24, bridgeY, 0.24], [sidingX - 1.6, bridgeY / 2, binZ + dz], mat.steel);
      strut(
        sidingGroup,
        new THREE.Vector3(sidingX - 1.6, 1.2, binZ + dz),
        new THREE.Vector3(sidingX - 0.6, bridgeY - 0.25, binZ + dz),
        0.14,
        mat.steel,
      );
    }
    for (let i = 0; i < wagons; i += 1) {
      const z = loadZ + i * pitch;
      const chute = box(sidingGroup, [0.6, 1.1, 0.6], [sidingX + 0.35, bridgeY - 0.75, z], mat.lightSteel);
      chute.rotation.z = -0.25;
      const stream = createLumpStream(mat.diamond);
      stream.position.set(sidingX + 0.2, bridgeY - 1.4, z);
      stream.rotation.y = -Math.PI / 2;
      sidingGroup.add(stream);
      station.siding.streams.push(stream);
    }
    signPost(sidingGroup, "Ladegleis 2", [sidingX - 2.6, 0, loadZ - 3], -0.9, "#2f5a3f");
  }

  const deckY = 6;
  const deck = new THREE.Group();
  site.add(deck);
  const deckLength = cableZ[0] - cableZ[1];
  const deckZ = (cableZ[0] + cableZ[1]) / 2;
  box(deck, [7, 0.3, Math.abs(deckLength) + 6], [bottom.x, deckY, deckZ], mat.wood);
  for (const dx of [-3.2, 3.2]) {
    for (const dz of [-1, 0, 1]) box(deck, [0.3, deckY, 0.3], [bottom.x + dx, deckY / 2, deckZ + dz * 4.8], mat.timber);
  }
  box(deck, [5.4, 3.2, 8], [bottom.x + 0.6, 1.6, deckZ], mat.wall);
  gableRoof(deck, 5.6, 8.6, 1.2, [bottom.x + 0.6, 3.2, deckZ], mat.roof);
  box(deck, [1.6, 2.2, 0.1], [bottom.x + 0.6, 1.1, deckZ + 4.02], mat.timber);
  {
    const from = new THREE.Vector3(bottom.x - 2.8, deckY - 0.4, deckZ);
    const to = new THREE.Vector3(binX + 0.3, binTop + 0.05, binZ);
    const belt = new THREE.Group();
    belt.position.copy(from).lerp(to, 0.5);
    const dir = to.clone().sub(from);
    belt.rotation.y = Math.atan2(-dir.z, dir.x);
    belt.rotation.z = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
    box(belt, [dir.length(), 0.14, 0.8], [0, 0, 0], mat.belt);
    for (const side of [-0.42, 0.42]) box(belt, [dir.length(), 0.24, 0.06], [0, 0.08, side], mat.timber);
    deck.add(belt);
  }
  const deckSign = createSign("Seilbahn · Talstation", "#5b3a22", "#f4f1e8", 3.4, 0.55);
  deckSign.position.set(bottom.x - 3.56, deckY + 0.5, deckZ);
  deckSign.rotation.y = -Math.PI / 2;
  deck.add(deckSign);

  const topX = plateau.x - 15;
  const topDeckY = plateau.y + 7.4;
  const topStation = new THREE.Group();
  site.add(topStation);
  box(topStation, [6.4, 0.3, Math.abs(deckLength) + 6], [topX + 0.6, topDeckY, deckZ], mat.wood);
  for (const dx of [-2.6, 3.4]) {
    for (const dz of [-1, 0, 1]) {
      box(topStation, [0.3, topDeckY - plateau.y + 0.6, 0.3], [topX + dx, (topDeckY + plateau.y) / 2 - 0.3, deckZ + dz * 4.8], mat.timber);
    }
  }
  box(topStation, [5, 3.4, 7], [topX + 1.2, plateau.y + 1.7, deckZ], mat.wall);
  gableRoof(topStation, 5.2, 7.6, 1.2, [topX + 1.2, plateau.y + 3.4, deckZ], mat.roof);
  const topSign = createSign("Seilbahn · Bergstation", "#5b3a22", "#f4f1e8", 3.4, 0.55);
  topSign.position.set(topX - 1.35, plateau.y + 2.5, deckZ);
  topSign.rotation.y = -Math.PI / 2;
  topStation.add(topSign);
  const motor = new THREE.Group();
  motor.visible = false;
  box(motor, [2.2, 1.6, 2.2], [topX + 2.2, topDeckY + 0.95, deckZ], mat.binSteel);
  box(motor, [2.4, 0.16, 2.4], [topX + 2.2, topDeckY + 1.83, deckZ], mat.steel);
  const bolt = createSign("⚡ Elektro", "#f2c21b", "#1d2a38", 1.6, 0.42);
  bolt.position.set(topX + 1.08, topDeckY + 1.0, deckZ);
  bolt.rotation.y = -Math.PI / 2;
  motor.add(bolt);
  topStation.add(motor);

  const bucketBody = new THREE.CylinderGeometry(0.42, 0.28, 0.6, 10);
  const lines = cableZ.map((z, index) => {
    const line = new THREE.Group();
    line.visible = index === 0;
    site.add(line);
    const half = 0.9;
    const bottomWheel = new THREE.Vector3(bottom.x - 1.2, deckY + 0.9, z);
    const topWheel = new THREE.Vector3(topX + 0.4, topDeckY + 0.9, z);
    const ground = heightAt(pylonX, z);
    let pylonTop = ground + 7.5;
    const clearance = (top) => {
      let worst = Infinity;
      const spans = [
        [topWheel, new THREE.Vector3(pylonX, top, z)],
        [new THREE.Vector3(pylonX, top, z), bottomWheel],
      ];
      for (const [a, b] of spans) {
        for (const p of sagSpan(a, b, a.distanceTo(b) * 0.02, 20, false)) {
          worst = Math.min(worst, p.y - heightAt(p.x, p.z + half) - 2.4, p.y - heightAt(p.x, p.z - half) - 2.4);
        }
      }
      return worst;
    };
    for (let k = 0; k < 40 && clearance(pylonTop) < 0; k += 1) pylonTop += 0.5;
    const pylon = new THREE.Vector3(pylonX, pylonTop, z);

    const run = (from, to, dz) => {
      const a = from.clone().setZ(z + dz);
      const b = to.clone().setZ(z + dz);
      return sagSpan(a, b, a.distanceTo(b) * 0.02, 16, true);
    };
    const down = [topWheel.clone().setZ(z + half), ...run(topWheel, pylon, half), ...run(pylon, bottomWheel, half)];
    const up = [bottomWheel.clone().setZ(z - half), ...run(bottomWheel, pylon, -half), ...run(pylon, topWheel, -half)];
    const turn = (center, from, to) =>
      Array.from({ length: 9 }, (_, k) => {
        const angle = from + ((to - from) * (k + 1)) / 10;
        return new THREE.Vector3(center.x + Math.sin(angle) * half, center.y, center.z + Math.cos(angle) * half);
      });
    const loopPoints = [
      ...down,
      ...turn(bottomWheel, 0, -Math.PI),
      ...up,
      ...turn(topWheel, Math.PI, 0),
      down[0].clone(),
    ];
    const loop = makeLoop(loopPoints);
    const downLength = makeLoop(down).length;

    const cables = { thin: new THREE.Group(), thick: new THREE.Group() };
    for (const [key, radius] of [["thin", 0.035], ["thick", 0.07]]) {
      for (const points of [down, up]) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, radius, 5), mat.steel);
        tube.castShadow = true;
        cables[key].add(tube);
      }
      line.add(cables[key]);
    }
    cables.thick.visible = false;

    for (const center of [bottomWheel, topWheel]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(half, 0.09, 8, 28), mat.steel);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.copy(center);
      wheel.castShadow = true;
      line.add(wheel);
      box(line, [0.16, 0.9, 0.16], [center.x, center.y - 0.45, center.z], mat.steel);
      const funnel = cylinder(line, [0.9, 0.3, 1.0, 12], [center.x, center.y - 1.6, center.z], mat.binSteel);
      funnel.castShadow = false;
    }

    const tower = new THREE.Group();
    tower.position.set(pylonX, ground - 0.3, z);
    const height = pylonTop - ground + 0.3;
    const legs = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    const at = (sx, sz, y) => {
      const w = THREE.MathUtils.lerp(1.5, 0.4, y / height);
      return new THREE.Vector3(sx * w, y, sz * w);
    };
    for (const [sx, sz] of legs) strut(tower, at(sx, sz, 0), at(sx, sz, height - 0.3), 0.2, mat.steel);
    for (let y = 1.6; y < height - 0.8; y += 1.8) {
      for (let k = 0; k < 4; k += 1) {
        const [ax, az] = legs[k];
        const [bx, bz] = legs[(k + 1) % 4];
        strut(tower, at(ax, az, y), at(bx, bz, y), 0.09, mat.lightSteel);
        strut(tower, at(ax, az, y), at(bx, bz, Math.min(y + 1.8, height - 0.3)), 0.07, mat.lightSteel);
      }
    }
    box(tower, [0.36, 0.3, half * 2 + 1.4], [0, height - 0.2, 0], mat.steel);
    const lamps = [];
    for (const side of [-1, 1]) {
      const sheave = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 16), mat.lightSteel);
      sheave.position.set(0, height + 0.1, side * half);
      tower.add(sheave);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat.lamp);
      lamp.position.set(0, height + 0.15, side * (half + 0.7));
      tower.add(lamp);
      const halo = addSparkle(tower, [0, height + 0.15, side * (half + 0.7)], 1.4);
      halo.visible = false;
      lamps.push(halo);
    }
    line.add(tower);

    const buckets = [];
    for (let i = 0; i < BUCKETS_PER_LINE; i += 1) {
      const bucket = new THREE.Group();
      box(bucket, [0.24, 0.18, 0.32], [0, 0, 0], mat.steel);
      box(bucket, [0.05, 1.0, 0.05], [0, -0.55, 0], mat.steel);
      const body = new THREE.Group();
      body.position.y = -1.3;
      box(body, [0.95, 0.05, 0.05], [0, 0.32, 0], mat.steel);
      const shell = new THREE.Mesh(bucketBody, mat.binSteel);
      shell.castShadow = true;
      body.add(shell);
      const load = gemCluster(body, [0, 0.3, 0], 1.1, 4);
      bucket.add(body);
      line.add(bucket);
      buckets.push({ bucket, body, load });
    }
    return { group: line, loop, downLength, cables, buckets, lamps, pylon };
  });

  const mine = { carts: [] };
  const P = plateau;
  const adit = (x, z) =>
    place("mine_entrance", site, [x, P.y - 0.05, z], -Math.PI / 2, 0.62) ??
    (() => {
      const portal = new THREE.Group();
      portal.position.set(x, P.y, z);
      box(portal, [1.2, 4, 5.4], [0, 2, 0], mat.stone);
      box(portal, [0.12, 2.6, 2.2], [-0.62, 1.3, 0], mat.dark);
      box(portal, [0.3, 0.3, 2.8], [-0.7, 2.75, 0], mat.timber);
      site.add(portal);
      return portal;
    })();
  adit(P.x + 15.5, P.z - 6.5);
  {
    const from = new THREE.Vector3(P.x + 11.5, P.y + 0.5, P.z - 6.2);
    const to = new THREE.Vector3(topX + 3.6, topDeckY - 0.5, deckZ - 2);
    const belt = new THREE.Group();
    belt.position.copy(from).lerp(to, 0.5);
    const dir = to.clone().sub(from);
    belt.rotation.y = Math.atan2(-dir.z, dir.x);
    belt.rotation.z = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
    box(belt, [dir.length(), 0.14, 0.8], [0, 0, 0], mat.belt);
    for (const side of [-0.42, 0.42]) box(belt, [dir.length(), 0.24, 0.06], [0, 0.08, side], mat.timber);
    site.add(belt);
    for (const k of [0.25, 0.5, 0.75]) {
      const p = from.clone().lerp(to, k);
      box(site, [0.2, p.y - P.y, 0.2], [p.x, (p.y + P.y) / 2, p.z], mat.timber);
    }
  }
  const heap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.6, 8), mat.rock);
  heap.position.set(P.x + 9, P.y + 0.8, P.z - 12);
  heap.castShadow = true;
  heap.receiveShadow = true;
  site.add(heap);
  const heapGems = gemCluster(site, [P.x + 9, P.y + 1.35, P.z - 12], 1.6, 6);
  {
    const hut = new THREE.Group();
    box(hut, [4, 2.6, 3.2], [P.x - 6, P.y + 1.3, P.z + 9], mat.wall);
    gableRoof(hut, 4.2, 3.8, 1, [P.x - 6, P.y + 2.6, P.z + 9], mat.roof);
    box(hut, [0.9, 1.8, 0.08], [P.x - 6, P.y + 0.9, P.z + 10.62], mat.timber);
    site.add(hut);
    signPost(site, "Diamantmine", [P.x - 9.5, P.y, P.z + 4], -0.8);
  }

  mine.headframe =
    place("headframe", site, [P.x + 5, P.y, P.z + 10], -Math.PI / 2, 0.55) ??
    (() => {
      const frame = new THREE.Group();
      addHeadframe(frame, P.x + 5, P.z + 10, materials.frame, 9, materials.wheel, P.y);
      site.add(frame);
      return frame;
    })();
  mine.adit2 = adit(P.x + 13, P.z - 15.5);

  mine.crusher =
    place("crusher", site, [P.x - 6, P.y, P.z - 13], 0, 1.7) ??
    (() => {
      const crusher = new THREE.Group();
      crusher.position.set(P.x - 6, P.y, P.z - 13);
      box(crusher, [2.6, 1.6, 2.4], [0, 0.8, 0], mat.binSteel);
      cylinder(crusher, [1.2, 0.5, 1.2, 8], [0, 2.2, 0], mat.steel);
      site.add(crusher);
      return crusher;
    })();
  mine.crusherBase = mine.crusher.position.clone();
  mine.bigGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), mat.diamond);
  mine.bigGem.scale.y = 1.3;
  mine.bigGem.position.set(P.x - 6, P.y + 3.9, P.z - 13);
  site.add(mine.bigGem);
  mine.bigSparkle = addSparkle(site, [P.x - 6, P.y + 3.9, P.z - 13], 2.2);

  mine.railway = new THREE.Group();
  site.add(mine.railway);
  const cartTracks = [
    [P.x - 9, P.x + 9, P.z - 14],
    [P.x - 9, P.x + 9, P.z - 16.8],
  ];
  for (const [x0, x1, z] of cartTracks) {
    for (const side of [-0.32, 0.32]) box(mine.railway, [x1 - x0 + 1.5, 0.08, 0.07], [(x0 + x1) / 2, P.y + 0.14, z + side], mat.lightSteel);
    for (let x = x0 - 0.5; x <= x1 + 0.5; x += 0.9) box(mine.railway, [0.18, 0.08, 0.95], [x, P.y + 0.06, z], mat.timber, false);
    const cart =
      place("minecart", mine.railway, [x0, P.y + 0.1, z], Math.PI / 2, 0.42) ??
      (() => {
        const fallback = new THREE.Group();
        fallback.position.set(x0, P.y + 0.1, z);
        box(fallback, [1.0, 0.55, 0.7], [0, 0.45, 0], mat.wood);
        mine.railway.add(fallback);
        return fallback;
      })();
    gemCluster(cart, [0, 1.25, 0], 2.2, 4);
    mine.carts.push({ cart, x0, x1 });
  }

  mine.rig = new THREE.Group();
  mine.rig.position.set(rig.x, rig.y, rig.z);
  site.add(mine.rig);
  {
    const red = new THREE.MeshStandardMaterial({ color: 0xa3231b, roughness: 0.55 });
    const white = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.6 });
    box(mine.rig, [8, 0.5, 8], [0, 0.0, 0], mat.concrete);
    const height = 17;
    const corner = (sx, sz, y) => {
      const w = THREE.MathUtils.lerp(2.3, 0.5, y / height);
      return new THREE.Vector3(sx * w, y, sz * w);
    };
    const legs = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    for (const [sx, sz] of legs) strut(mine.rig, corner(sx, sz, 0.25), corner(sx, sz, height), 0.22, red);
    let band = 0;
    for (let y = 2; y < height - 0.5; y += 2.2) {
      for (let k = 0; k < 4; k += 1) {
        const [ax, az] = legs[k];
        const [bx, bz] = legs[(k + 1) % 4];
        strut(mine.rig, corner(ax, az, y), corner(bx, bz, y), 0.1, band % 2 ? white : red);
        strut(mine.rig, corner(ax, az, y), corner(bx, bz, Math.min(y + 2.2, height)), 0.08, white);
      }
      band += 1;
    }
    box(mine.rig, [3.2, 0.25, 3.2], [0, 5, 0], mat.steel);
    box(mine.rig, [1.5, 0.9, 1.5], [0, height + 0.45, 0], mat.steel);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat.beacon);
    beacon.position.set(0, height + 1.15, 0);
    mine.rig.add(beacon);
    mine.beacon = beacon;
    mine.pipe = cylinder(mine.rig, [0.14, 0.14, 13, 8], [0, 6.5, 0], mat.lightSteel);
    mine.block = box(mine.rig, [0.7, 1.0, 0.5], [0, 12, 0], mat.yellow);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.6 });
    mine.blockCable = box(mine.rig, [0.04, 1, 0.04], [0, 14, 0], cableMat, false);
    box(mine.rig, [3.4, 2.2, 2.6], [4.6, 1.35, 0.5], mat.blueWall);
    gableRoof(mine.rig, 3.6, 3.0, 0.8, [4.6, 2.45, 0.5], mat.slate);
    const tank = cylinder(mine.rig, [0.9, 0.9, 3.2, 14], [-4.2, 1.0, -1.5], mat.steel);
    tank.rotation.z = Math.PI / 2;
    signPost(mine.rig, "Tiefbohrung", [-3.4, 0.2, 3.2], -0.7);
  }

  const rockSpots = [
    [282, -52, 7, "rock_a"],
    [292, -10, 6, "rock_c"],
    [305, -58, 8, "rock_b"],
    [336, -40, 9, "rock_a"],
    [328, 2, 7, "rock_c"],
    [266, -64, 5, "rock_b"],
    [238, 30, 5, "rock_c"],
    [210, 18, 4, "rock_a"],
    [196, -38, 5, "rock_b"],
    [143, 30, 4, "rock_c"],
    [356, -48, 10, "rock_b"],
    [300, 22, 8, "rock_a"],
  ];
  for (const [x, z, scale, name] of rockSpots) {
    place(name, group, [x, heightAt(x, z) - 0.3, z], x * 0.37, scale);
  }

  const storeGroup = new THREE.Group();
  storeGroup.visible = false;
  site.add(storeGroup);
  {
    box(storeGroup, [9, 0.2, 7.5], [store.x, 0.1, store.z], mat.concrete);
    box(storeGroup, [8, 4.4, 6.4], [store.x, 2.2, store.z], mat.blueWall);
    gableRoof(storeGroup, 8.2, 7, 1.6, [store.x, 4.4, store.z], mat.slate);
    box(storeGroup, [0.1, 3, 3], [store.x - 4.03, 1.5, store.z], mat.timber);
    const sign = createSign("Diamantlager", "#24506e", "#f4f1e8", 3.2, 0.6);
    sign.position.set(store.x - 4.08, 3.6, store.z);
    sign.rotation.y = -Math.PI / 2;
    storeGroup.add(sign);
    for (const dz of [-2.2, 2.2]) {
      cylinder(storeGroup, [1.1, 1.1, 5.2, 14], [store.x + 5.6, 3.0, store.z + dz], mat.lightSteel);
      const cone = cylinder(storeGroup, [0.15, 1.1, 1.2, 14], [store.x + 5.6, 0.0, store.z + dz], mat.lightSteel);
      cone.position.y = 0.4 + 0.6;
      box(storeGroup, [0.15, 1.0, 0.15], [store.x + 5.6, 0.5, store.z + dz], mat.steel);
    }
    const from = new THREE.Vector3(store.x - 2, 4.8, store.z - 3.2);
    const to = new THREE.Vector3(bottom.x + 1.5, deckY + 0.2, deckZ + 7.5);
    const bridge = new THREE.Group();
    bridge.position.copy(from).lerp(to, 0.5);
    const dir = to.clone().sub(from);
    bridge.rotation.y = Math.atan2(-dir.z, dir.x);
    bridge.rotation.z = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
    box(bridge, [dir.length(), 0.7, 1.1], [0, 0, 0], mat.binSteel);
    storeGroup.add(bridge);
    const mid = from.clone().lerp(to, 0.5);
    box(storeGroup, [0.25, mid.y, 0.25], [mid.x, mid.y / 2, mid.z], mat.steel);
  }

  const viaducts = [0, sidingX - trackX].map((z) => {
    const viaduct = new THREE.Group();
    viaduct.visible = false;
    group.add(viaduct);
    const [x0, x1] = layout.viaduct;
    const spans = 6;
    const w = (x1 - x0) / spans;
    const deckBottom = -1.0;
    box(viaduct, [x1 - x0 + 2, 1.0, 3.6], [(x0 + x1) / 2, -0.48, z], mat.stone);
    for (const side of [-1.7, 1.7]) box(viaduct, [x1 - x0 + 2, 0.55, 0.25], [(x0 + x1) / 2, 0.27, z + side], mat.stone);
    const radius = w / 2 - 0.9;
    const spring = deckBottom - radius - 0.4;
    const shape = new THREE.Shape();
    shape.moveTo(0, spring);
    shape.lineTo(w / 2 - radius, spring);
    shape.absarc(w / 2, spring, radius, Math.PI, 0, true);
    shape.lineTo(w, spring);
    shape.lineTo(w, deckBottom);
    shape.lineTo(0, deckBottom);
    shape.closePath();
    const spandrel = new THREE.ExtrudeGeometry(shape, { depth: 3.4, bevelEnabled: false, curveSegments: 14 });
    spandrel.translate(0, 0, -1.7);
    for (let k = 0; k < spans; k += 1) {
      const mesh = new THREE.Mesh(spandrel, mat.stone);
      mesh.position.set(x0 + k * w, 0, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      viaduct.add(mesh);
    }
    for (let k = 0; k <= spans; k += 1) {
      const x = x0 + k * w;
      const groundY = Math.min(heightAt(x - 0.9, z), heightAt(x + 0.9, z)) - 0.6;
      if (groundY >= spring) continue;
      box(viaduct, [1.8, spring - groundY, 3.6], [x, (spring + groundY) / 2, z], mat.stone);
    }
    return viaduct;
  });

  const tunnel = { main: new THREE.Group(), lane: new THREE.Group() };
  for (const [key, z, modelZ] of [
    ["main", farZ, farZ - 0.8],
    ["lane", laneZ, laneZ + 0.4],
  ]) {
    const bore = tunnel[key];
    bore.visible = false;
    group.add(bore);
    for (const [face, facing] of [
      [portals[0], -1],
      [portals[1], 1],
    ]) {
      const depth = 3.6;
      const px = face - facing * depth;
      const portal = place("tunnel_portal", bore, [px, -0.02, modelZ], facing * (Math.PI / 2), 0.6);
      if (!portal) {
        const fallback = new THREE.Group();
        box(fallback, [5.6, 5.2, 7], [face - facing * 2.8, 2.6, z], mat.stone);
        box(fallback, [0.2, 3.6, 3.8], [face, 1.8, z], mat.dark);
        bore.add(fallback);
      }
      box(bore, [8, 5.2, 7.2], [face - facing * 9.6, 2.6, z], mat.rock);
    }
    box(bore, [portals[1] - portals[0] - 6, 4, 4.4], [(portals[0] + portals[1]) / 2, 2, z], mat.dark, false);
  }

  const workshop = new THREE.Group();
  workshop.visible = false;
  group.add(workshop);
  const ws = layout.workshop;
  {
    box(workshop, [10, 0.12, 8], [ws.x, 0.06, ws.z], mat.concrete, false);
    box(workshop, [7, 3.2, 5], [ws.x, 1.6, ws.z], mat.wall);
    gableRoof(workshop, 7.2, 5.6, 1.5, [ws.x, 3.2, ws.z], mat.slate);
    box(workshop, [3.6, 1.3, 0.08], [ws.x + 0.8, 1.9, ws.z + 2.53], mat.glass);
    box(workshop, [1.2, 2.2, 0.08], [ws.x - 2.3, 1.1, ws.z + 2.53], mat.timber);
    const sign = createSign("Diamantschleiferei", "#24506e", "#f4f1e8", 3.6, 0.55);
    sign.position.set(ws.x, 2.95, ws.z + 2.56);
    workshop.add(sign);
    box(workshop, [0.7, 1.6, 0.7], [ws.x + 2.6, 4.1, ws.z - 1.2], mat.stone);
    cylinder(workshop, [0.35, 0.45, 0.9, 12], [ws.x + 3.4, 0.45, ws.z + 3.4], mat.stone);
    box(workshop, [0.9, 0.9, 0.9], [ws.x + 3.4, 1.35, ws.z + 3.4], mat.showcase, false);
  }
  const showGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), mat.diamond);
  showGem.scale.y = 1.3;
  showGem.position.set(ws.x + 3.4, 1.35, ws.z + 3.4);
  workshop.add(showGem);
  addSparkle(workshop, [ws.x + 3.4, 1.4, ws.z + 3.4], 1.2);
  const grinder = new THREE.Group();
  grinder.position.set(ws.x - 4.3, 1.15, ws.z + 0.8);
  {
    const stand = new THREE.Group();
    box(stand, [0.5, 0.9, 0.5], [ws.x - 4.3, 0.45, ws.z + 0.8], mat.steel);
    box(stand, [1.3, 0.1, 1.6], [ws.x - 4.3, 2.6, ws.z + 0.8], mat.slate);
    for (const dz of [-0.7, 0.7]) box(stand, [0.1, 2.6, 0.1], [ws.x - 4.85, 1.3, ws.z + 0.8 + dz], mat.timber);
    workshop.add(stand);
    const wheel = cylinder(grinder, [0.55, 0.55, 0.16, 20], [0, 0, 0], mat.stone);
    wheel.rotation.x = Math.PI / 2;
    box(grinder, [0.08, 0.08, 0.6], [0, 0, 0], mat.steel);
    workshop.add(grinder);
  }
  const grindSparkle = addSparkle(workshop, [ws.x - 3.75, 1.0, ws.z + 0.8], 0.8);

  const washer = new THREE.Group();
  washer.visible = false;
  group.add(washer);
  const waterWheel = new THREE.Group();
  {
    const wx = ws.x + 7.2;
    box(washer, [4.5, 0.12, 5], [wx, 0.06, ws.z], mat.concrete, false);
    for (const [dx, dz] of [
      [-0.9, -0.9],
      [0.9, -0.9],
      [0.9, 0.9],
      [-0.9, 0.9],
    ]) {
      box(washer, [0.18, 2.2, 0.18], [wx + dx, 1.1, ws.z - 1 + dz], mat.timber);
    }
    cylinder(washer, [1.3, 1.3, 2.2, 18], [wx, 3.3, ws.z - 1], mat.binSteel);
    cylinder(washer, [1.35, 1.35, 0.16, 18], [wx, 4.45, ws.z - 1], mat.steel);
    box(washer, [3.4, 0.5, 0.9], [wx - 1, 0.95, ws.z + 1.4], mat.wood);
    box(washer, [3.2, 0.06, 0.7], [wx - 1, 1.18, ws.z + 1.4], mat.water, false);
    box(washer, [0.14, 1.5, 0.14], [wx + 0.8, 2.0, ws.z + 0.1], mat.steel);
    const pipe = box(washer, [3.4, 0.16, 0.16], [ws.x + 4.6, 2.6, ws.z - 1], mat.steel);
    pipe.castShadow = false;
    waterWheel.position.set(wx + 1.3, 1.2, ws.z + 1.4);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 6, 20), mat.wood);
    waterWheel.add(rim);
    for (let k = 0; k < 8; k += 1) {
      const paddle = box(waterWheel, [0.12, 0.9, 0.5], [0, 0, 0], mat.wood);
      const angle = (k / 8) * Math.PI * 2;
      paddle.position.set(Math.cos(angle) * 0.6, Math.sin(angle) * 0.6, 0);
      paddle.rotation.z = angle + Math.PI / 2;
    }
    washer.add(waterWheel);
    const sign = createSign("Waschanlage", "#2f5a7a", "#f4f1e8", 2.2, 0.48);
    sign.position.set(wx, 4.9, ws.z - 1 + 1.36);
    washer.add(sign);
  }

  const crown = new THREE.Group();
  crown.visible = false;
  group.add(crown);
  const crownGems = [];
  {
    const c = layout.crown;
    crown.position.set(c.x, c.y, c.z);
    cylinder(crown, [1.15, 1.15, 0.28, 24], [0, 1.72, 0], mat.brass);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.55, 24, 1, true), mat.brass);
    band.position.y = 2.1;
    band.castShadow = true;
    crown.add(band);
    for (let k = 0; k < 8; k += 1) {
      const angle = (k / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 1.15;
      const z = Math.sin(angle) * 1.15;
      cylinder(crown, [0.02, 0.17, 0.85, 6], [x, 2.78, z], mat.brass);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), mat.diamond);
      gem.position.set(x, 3.3, z);
      crown.add(gem);
      const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mat.diamond);
      jewel.position.set(Math.cos(angle + 0.39) * 1.22, 2.1, Math.sin(angle + 0.39) * 1.22);
      crown.add(jewel);
    }
    for (let k = 0; k < 4; k += 1) {
      const angle = (k / 4) * Math.PI * 2;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 6, 20, Math.PI), mat.brass);
      arch.position.y = 2.35;
      arch.rotation.y = angle;
      arch.scale.y = 1.2;
      crown.add(arch);
    }
    const big = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat.diamond);
    big.scale.y = 1.35;
    big.position.y = 4.6;
    big.castShadow = true;
    crown.add(big);
    crownGems.push(big);
    for (const [x, y, z] of [
      [0, 4.6, 0],
      [0.9, 3.4, 0.5],
      [-0.8, 3.1, -0.6],
      [0.3, 2.4, -1.2],
    ]) {
      addSparkle(crown, [x, y, z], 1.6);
    }
  }

  const tmp = new THREE.Vector3();
  let levels = { cable: 0, mine: 0, line: 0, proc: 0 };

  const limitSpots = {
    mine: { text: "Engpass: Mine", at: new THREE.Vector3(plateau.x - 2, plateau.y + 13, plateau.z - 4) },
    cable: { text: "Engpass: Seilbahn", at: new THREE.Vector3(topX + 1, topDeckY + 7, deckZ) },
    trains: { text: "Engpass: Züge", at: new THREE.Vector3(binX, binTop + 7, binZ) },
    workshop: { text: "Engpass: Schleiferei", at: new THREE.Vector3(ws.x, 9, ws.z) },
  };
  for (const spot of Object.values(limitSpots)) spot.map = limitTexture(spot.text);
  const limitSign = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
  limitSign.scale.set(12, 3, 1);
  limitSign.renderOrder = 20;
  limitSign.visible = false;
  group.add(limitSign);

  return {
    group,
    station,
    apply(built, next) {
      levels = next;
      site.visible = built;
      lines[1].group.visible = built && levels.cable >= 3;
      for (const line of lines) {
        line.cables.thin.visible = levels.cable < 2;
        line.cables.thick.visible = levels.cable >= 2;
        line.buckets.forEach(({ bucket, body }, index) => {
          bucket.visible = levels.cable >= 1 || index % 2 === 0;
          body.scale.setScalar(levels.cable >= 4 ? 1.5 : 1);
        });
        for (const halo of line.lamps) halo.visible = levels.cable >= 5;
      }
      mat.lamp.emissiveIntensity = levels.cable >= 5 ? 2.2 : 0;
      motor.visible = levels.cable >= 5;
      mine.headframe.visible = levels.mine >= 1;
      mine.adit2.visible = levels.mine >= 2;
      mine.crusher.visible = levels.mine >= 3;
      mine.bigGem.visible = levels.mine >= 3;
      mine.bigSparkle.visible = levels.mine >= 3;
      mine.railway.visible = levels.mine >= 4;
      mine.rig.visible = levels.mine >= 5;
      storeGroup.visible = levels.line >= 1;
      sidingGroup.visible = levels.line >= 2;
      viaducts[0].visible = built && levels.line >= 3;
      tunnel.main.visible = built && levels.line >= 4;
      viaducts[1].visible = built && levels.line >= 5;
      tunnel.lane.visible = built && levels.line >= 5;
      workshop.visible = built && levels.proc >= 1;
      washer.visible = built && levels.proc >= 2;
      crown.visible = built && levels.proc >= 5;
    },
    animate({ time, dt, built, travel, buffer, top, cutting, limit }) {
      const spot = built && limitSpots[limit];
      limitSign.visible = Boolean(spot);
      if (spot) {
        if (limitSign.material.map !== spot.map) {
          limitSign.material.map = spot.map;
          limitSign.material.needsUpdate = true;
        }
        limitSign.position.copy(spot.at);
        limitSign.position.y += Math.sin(time * 2.2) * 0.5;
      }
      for (const sprite of sparkles) {
        const { size, phase } = sprite.userData;
        const twinkle = 0.55 + 0.45 * Math.sin(time * 5.3 + phase * 7.1) * Math.sin(time * 2.1 + phase);
        sprite.scale.setScalar(size * (0.4 + Math.max(twinkle, 0) * 0.9));
        sprite.material.rotation = time * 0.6 + phase;
      }
      if (!built) return;
      for (const line of lines) {
        if (!line.group.visible) continue;
        const shown = line.buckets.filter(({ bucket }) => bucket.visible);
        shown.forEach(({ bucket, load }, index) => {
          const { s, dx, dz } = sampleLoop(line.loop, travel * CABLE_VISUAL_SPEED + (index * line.loop.length) / shown.length, tmp);
          bucket.position.copy(tmp);
          bucket.rotation.y = Math.atan2(-dz, dx);
          load.visible = s < line.downLength && top > 0.02;
        });
      }
      binFill.visible = buffer > 0.02;
      binFill.position.y = binTop - 1.25 + Math.min(buffer, 1) * 1.15;
      heapGems.visible = top > 0.05;
      mat.lamp.emissiveIntensity = levels.cable >= 5 ? 2 + Math.sin(time * 3) * 0.3 : 0;
      for (const [index, { cart, x0, x1 }] of mine.carts.entries()) {
        const k = 0.5 - 0.5 * Math.cos(time * 0.45 + index * 2.1);
        cart.position.x = THREE.MathUtils.lerp(x0, x1, k);
      }
      if (mine.crusher.visible) {
        mine.crusher.position.set(
          mine.crusherBase.x + Math.sin(time * 37) * 0.02,
          mine.crusherBase.y + Math.abs(Math.sin(time * 23)) * 0.03,
          mine.crusherBase.z,
        );
        mine.bigGem.rotation.y = time * 1.4;
        mine.bigGem.position.y = plateau.y + 3.9 + Math.sin(time * 1.7) * 0.15;
      }
      if (mine.rig.visible) {
        mine.pipe.rotation.y = time * 4;
        const lift = 9.5 + (Math.sin(time * 0.5) * 0.5 + 0.5) * 5;
        mine.block.position.y = lift;
        mine.blockCable.scale.y = 17 - lift;
        mine.blockCable.position.y = (17 + lift) / 2;
        mat.beacon.emissiveIntensity = Math.sin(time * 4) > 0.6 ? 3 : 0.2;
      }
      if (workshop.visible) {
        showGem.rotation.y = time * 1.2;
        if (cutting) grinder.rotation.x += dt * 14;
        grindSparkle.visible = cutting;
        if (washer.visible) waterWheel.rotation.z -= dt * 1.6;
      }
      if (crown.visible) {
        for (const gem of crownGems) {
          gem.rotation.y = time * 0.9;
          gem.position.y = 4.6 + Math.sin(time * 1.3) * 0.12;
        }
      }
    },
    focus(groupId, level = 0) {
      const v = (x, y, z) => new THREE.Vector3(x, y, z);
      if (groupId === "cable") return { point: v(pylonX, 12, (cableZ[0] + cableZ[1]) / 2), distance: 70 };
      if (groupId === "mine") {
        return level >= 5
          ? { point: v(rig.x, rig.y + 6, rig.z), distance: 55 }
          : { point: v(plateau.x - 2, plateau.y + 2, plateau.z - 4), distance: 50 };
      }
      if (groupId === "line") {
        if (level === 1) return { point: v(store.x - 4, 2, store.z - 6), distance: 40 };
        if (level === 2) return { point: v(trackX - 2, 1, loadZ + 5), distance: 35 };
        if (level === 3) return { point: v(170, -3, -3), distance: 80 };
        if (level === 4) return { point: v(portals[0] - 6, 2, farZ + 3), distance: 55 };
        return { point: v(185, 0, -28), distance: 130 };
      }
      if (groupId === "proc") {
        if (level === 4) return { point: v(18, 1, 2), distance: 35 };
        if (level === 5) return { point: v(layout.crown.x, layout.crown.y + 2, layout.crown.z), distance: 30 };
        return { point: v(ws.x + 2, 1.5, ws.z), distance: 26 };
      }
      return { point: v(trackX + 25, 10, loadZ), distance: 115 };
    },
  };
}
