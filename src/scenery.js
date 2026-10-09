import * as THREE from "three";

const CENTER_X = 25;
const CENTER_Z = 32;
const FLAT_HALF_X = 120;
const FLAT_HALF_Z = 140;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise(x, z) {
  return (
    Math.sin(x * 0.043 + Math.sin(z * 0.031) * 2.1) * 0.5 +
    Math.sin(z * 0.051 + x * 0.019) * 0.5 +
    Math.sin((x - z) * 0.13) * 0.18 +
    Math.sin(x * 0.27 + z * 0.21) * 0.08
  );
}

const FLAT_BOXES = [
  [CENTER_X - FLAT_HALF_X, CENTER_X + FLAT_HALF_X, CENTER_Z - FLAT_HALF_Z, CENTER_Z + FLAT_HALF_Z],
  [145, 268, -118, 110],
];
export const VALLEY = { x: 170, z0: -15, z1: 70, floor: 15, bank: 12, depth: 8 };
export const RIDGE = { x: 185, z: -56, rx: 55, rz: 26, height: 22 };
export const PEAK = { x: 370, z: -20, radius: 130, height: 125 };
const terrainShape = { corridors: [], pads: [] };

function edgeRise(x, z) {
  let d = Infinity;
  for (const [x0, x1, z0, z1] of FLAT_BOXES) {
    d = Math.min(d, Math.hypot(Math.max(x0 - x, x - x1, 0), Math.max(z0 - z, z - z1, 0)));
  }
  if (d <= 0) return 0;
  const rise = THREE.MathUtils.smoothstep(d, 0, 70);
  return rise * (6 + noise(x, z) * 5) + Math.max(d - 70, 0) * 0.22;
}

function valleyDepth(x, z) {
  const cz = THREE.MathUtils.clamp(z, VALLEY.z0, VALLEY.z1);
  const d = Math.max(Math.hypot(x - VALLEY.x, z - cz) - VALLEY.floor, 0);
  return VALLEY.depth * (1 - THREE.MathUtils.smoothstep(d, 0, VALLEY.bank));
}

function ridgeHeight(x, z) {
  const r2 = ((x - RIDGE.x) / RIDGE.rx) ** 2 + ((z - RIDGE.z) / RIDGE.rz) ** 2;
  return r2 < 1 ? RIDGE.height * (1 - r2) ** 2 * (1 + noise(x * 3, z * 3) * 0.08) : 0;
}

function peakHeight(x, z) {
  const d = Math.hypot(x - PEAK.x, z - PEAK.z);
  if (d >= PEAK.radius) return 0;
  const k = 1 - d / PEAK.radius;
  return PEAK.height * k * k * (1 + noise(x * 1.7, z * 1.7) * 0.12) + k * noise(x * 4, z * 4) * 3;
}

function corridorMask(x, z) {
  let mask = 1;
  for (const { a, b, capA, capB } of terrainShape.corridors) {
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz;
    const t = ((x - a[0]) * vx + (z - a[1]) * vz) / len2;
    const tc = THREE.MathUtils.clamp(t, 0, 1);
    const len = Math.sqrt(len2);
    const perp = Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t));
    let m;
    if ((t < 0 && capA) || (t > 1 && capB)) {
      const beyond = (t < 0 ? -t : t - 1) * len;
      m = Math.max(THREE.MathUtils.smoothstep(perp, 6, 20), THREE.MathUtils.smoothstep(beyond, 0, 3));
    } else {
      m = THREE.MathUtils.smoothstep(Math.hypot(x - (a[0] + vx * tc), z - (a[1] + vz * tc)), 6, 20);
    }
    mask = Math.min(mask, m);
    if (mask === 0) break;
  }
  return mask;
}

function rawHeight(x, z) {
  return (edgeRise(x, z) + ridgeHeight(x, z) + peakHeight(x, z)) * corridorMask(x, z) - valleyDepth(x, z);
}

export function shapeTerrain({ corridors = [], pads = [] }) {
  terrainShape.corridors = corridors;
  terrainShape.pads = pads.map((pad) => ({ ...pad, y: pad.y ?? rawHeight(pad.x, pad.z) }));
  return terrainShape.pads;
}

export function heightAt(x, z) {
  let h = rawHeight(x, z);
  for (const pad of terrainShape.pads) {
    const r = Math.hypot(x - pad.x, z - pad.z);
    if (r < pad.r + pad.fall) h += (pad.y - h) * (1 - THREE.MathUtils.smoothstep(r, pad.r, pad.r + pad.fall));
  }
  return h;
}

export function createSky(sunDirection) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x3d7ec9) },
      horizon: { value: new THREE.Color(0xd6e8f2) },
      bottom: { value: new THREE.Color(0xb4cbd6) },
      sunDir: { value: sunDirection.clone().normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 horizon;
      uniform vec3 bottom;
      uniform vec3 sunDir;
      varying vec3 vDir;
      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y;
        vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, min(-h * 5.0, 1.0));
        float s = max(dot(dir, sunDir), 0.0);
        col += vec3(1.0, 0.92, 0.75) * (pow(s, 900.0) * 4.0 + pow(s, 40.0) * 0.35 + pow(s, 6.0) * 0.12);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), material);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  return sky;
}

function createTerrain() {
  const size = 1700;
  const segments = 300;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(CENTER_X, 0, CENTER_Z);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const grassA = new THREE.Color(0x5f8a3c);
  const grassB = new THREE.Color(0x83a64e);
  const dry = new THREE.Color(0xa3a35c);
  const rock = new THREE.Color(0x7c7867);
  const snow = new THREE.Color(0xf1f4f8);
  const mud = new THREE.Color(0x6f6450);
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    const n = noise(x * 2.3, z * 2.3) * 0.5 + 0.5;
    color.copy(grassA).lerp(grassB, n);
    color.lerp(dry, Math.max(noise(z * 0.7 + 40, x * 0.7) - 0.35, 0) * 0.9);
    color.lerp(rock, THREE.MathUtils.smoothstep(y, 18, 45));
    color.lerp(snow, THREE.MathUtils.smoothstep(y, 92, 112));
    color.lerp(mud, THREE.MathUtils.smoothstep(-y, 3, 7));
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  );
  terrain.receiveShadow = true;
  return terrain;
}

function createMountains(random) {
  const group = new THREE.Group();
  const rockMats = [0x6f7480, 0x7d7a74, 0x5f6a6e].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
  );
  const snow = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.8, flatShading: true });
  const count = 46;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + random() * 0.1;
    const dist = 470 + random() * 160;
    const radius = 55 + random() * 70;
    const height = 70 + random() * 110;
    const x = CENTER_X + Math.cos(angle) * dist;
    const z = CENTER_Z + Math.sin(angle) * dist;
    const geometry = new THREE.ConeGeometry(radius, height, 7 + Math.floor(random() * 3), 4);
    const p = geometry.attributes.position;
    for (let k = 0; k < p.count; k += 1) {
      const t = (p.getY(k) + height / 2) / height;
      if (t > 0.02 && t < 0.98) {
        p.setX(k, p.getX(k) * (0.85 + random() * 0.3));
        p.setZ(k, p.getZ(k) * (0.85 + random() * 0.3));
        p.setY(k, p.getY(k) + (random() - 0.5) * height * 0.06);
      }
    }
    geometry.computeVertexNormals();
    const mountain = new THREE.Mesh(geometry, rockMats[i % rockMats.length]);
    const baseY = heightAt(x, z) - 4;
    mountain.position.set(x, baseY + height / 2, z);
    mountain.rotation.y = random() * Math.PI;
    group.add(mountain);

    if (height > 110) {
      const capHeight = height * 0.3;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.31, capHeight, 7), snow);
      cap.position.set(x, baseY + height - capHeight / 2 + 0.5, z);
      cap.rotation.y = mountain.rotation.y;
      group.add(cap);
    }
  }
  return group;
}

function createLake(x, z, radius) {
  const group = new THREE.Group();
  const sand = new THREE.Mesh(
    new THREE.CircleGeometry(radius + 3.5, 48),
    new THREE.MeshStandardMaterial({ color: 0xcdbb8a, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(x, 0.03, z);
  sand.scale.set(1.4, 1, 1);
  sand.receiveShadow = true;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x2f7fae,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
      clearcoat: 1,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, 0.06, z);
  water.scale.set(1.4, 1, 1);
  water.receiveShadow = true;
  group.add(sand, water);
  group.userData.water = water;
  return group;
}

function instanced(geometry, material, matrices, colors) {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  if (colors) colors.forEach((c, i) => mesh.setColorAt(i, c));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createVegetation(random, blocked, lake) {
  const group = new THREE.Group();
  const conifers = [];
  const leafy = [];
  const rocks = [];
  const bushes = [];
  const flowers = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const inLake = (x, z) => ((x - lake.x) / (lake.r * 1.4 + 5)) ** 2 + ((z - lake.z) / (lake.r + 5)) ** 2 < 1;

  const place = (list, margin, tries, forestBias) => {
    for (let i = 0; i < tries; i += 1) {
      const x = CENTER_X + (random() - 0.5) * 860;
      const z = CENTER_Z + (random() - 0.5) * 860;
      if (forestBias && noise(x * 0.8 + 100, z * 0.8) < forestBias) continue;
      if (blocked(x, z, margin) || inLake(x, z)) continue;
      const y = heightAt(x, z);
      if (y > 60 || y < -5.5) continue;
      list.push({ x, y, z, s: 0.7 + random() * 0.7, r: random() * Math.PI * 2, c: random() });
    }
  };
  place(conifers, 2, 5200, -0.1);
  place(leafy, 2, 2600, 0.15);
  place(rocks, 1, 500, null);
  place(bushes, 1, 1800, -0.3);
  place(flowers, 0.5, 2200, null);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3b25, roughness: 1 });
  const needleMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
  const rockMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const flowerMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.6, 6);
  trunkGeo.translate(0, 0.8, 0);
  const coneLow = new THREE.ConeGeometry(1.5, 2.8, 7);
  coneLow.translate(0, 2.6, 0);
  const coneHigh = new THREE.ConeGeometry(1.05, 2.3, 7);
  coneHigh.translate(0, 4.0, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1.5, 1);
  crownGeo.translate(0, 2.9, 0);
  const rockGeo = new THREE.DodecahedronGeometry(0.9, 0);
  const bushGeo = new THREE.IcosahedronGeometry(0.6, 0);
  bushGeo.translate(0, 0.35, 0);
  const flowerGeo = new THREE.IcosahedronGeometry(0.12, 0);
  flowerGeo.translate(0, 0.15, 0);

  const matrices = (list, sy = 1, tilt = 0) =>
    list.map(({ x, y, z, s, r }) => {
      q.setFromAxisAngle(up, r);
      if (tilt) q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt * (random() - 0.5), 0, tilt * (random() - 0.5))));
      return m.clone().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * sy, s));
    });
  const tint = (list, a, b) => list.map(({ c }) => new THREE.Color(a).lerp(new THREE.Color(b), c));

  const allTrees = [...conifers, ...leafy];
  group.add(instanced(trunkGeo, trunkMat, matrices(allTrees)));
  const coniferMatrices = matrices(conifers, 1.15);
  const coniferColors = tint(conifers, 0x2c5a2e, 0x3f7a3a);
  group.add(instanced(coneLow, needleMat, coniferMatrices, coniferColors));
  group.add(instanced(coneHigh, needleMat, coniferMatrices, coniferColors));
  group.add(instanced(crownGeo, leafMat, matrices(leafy), tint(leafy, 0x4f8a34, 0x8fb04a)));
  group.add(instanced(rockGeo, rockMat, matrices(rocks, 0.6, 0.6), tint(rocks, 0x76736c, 0x9a958a)));
  group.add(instanced(bushGeo, leafMat, matrices(bushes, 0.8), tint(bushes, 0x3e6e2c, 0x6f9a3c)));
  const petals = [0xf2e15c, 0xffffff, 0xe0607e, 0x9b7fe0];
  const flowerMesh = instanced(
    flowerGeo,
    flowerMat,
    matrices(flowers),
    flowers.map(({ c }) => new THREE.Color(petals[Math.floor(c * petals.length)])),
  );
  flowerMesh.castShadow = false;
  group.add(flowerMesh);
  return group;
}

function createClouds(random) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    emissive: 0x8a96a8,
    emissiveIntensity: 0.35,
    flatShading: true,
  });
  const puff = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 22; i += 1) {
    const cloud = new THREE.Group();
    const blobs = 4 + Math.floor(random() * 5);
    for (let k = 0; k < blobs; k += 1) {
      const blob = new THREE.Mesh(puff, material);
      const s = 5 + random() * 7;
      blob.scale.set(s * 1.3, s * 0.7, s);
      blob.position.set((k - blobs / 2) * 7 + random() * 4, random() * 3, (random() - 0.5) * 8);
      cloud.add(blob);
    }
    cloud.position.set(CENTER_X + (random() - 0.5) * 900, 85 + random() * 50, CENTER_Z + (random() - 0.5) * 900);
    cloud.userData.speed = 2 + random() * 3;
    group.add(cloud);
  }
  return group;
}

function createRiver() {
  const length = VALLEY.z1 - VALLEY.z0 + 14;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40),
    new THREE.MeshPhysicalMaterial({
      color: 0x2f7fae,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
      clearcoat: 1,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.set(VALLEY.floor - 3, length / 2, 1);
  water.position.set(VALLEY.x, -VALLEY.depth + 0.9, (VALLEY.z0 + VALLEY.z1) / 2);
  water.receiveShadow = true;
  return water;
}

export function createScenery(blocked) {
  const random = rng(1337);
  const group = new THREE.Group();
  const lake = { x: -115, z: 40, r: 24 };
  const lakeGroup = createLake(lake.x, lake.z, lake.r);
  const clouds = createClouds(random);
  const river = createRiver();
  group.add(
    createTerrain(),
    createMountains(random),
    lakeGroup,
    river,
    createVegetation(random, blocked, lake),
    clouds,
  );

  const water = lakeGroup.userData.water;
  const update = (dt, time) => {
    for (const cloud of clouds.children) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > CENTER_X + 480) cloud.position.x -= 960;
    }
    water.material.color.setHSL(0.56, 0.58, 0.42 + Math.sin(time * 0.8) * 0.02);
    river.material.color.setHSL(0.56, 0.58, 0.4 + Math.sin(time * 0.9 + 1) * 0.02);
  };
  return { group, update };
}

export function createSmoke(scene, size = 260) {
  const geometry = new THREE.IcosahedronGeometry(0.32, 1);
  const puffs = [];
  for (let i = 0; i < size; i += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    puffs.push({ mesh, life: 0, max: 1, vel: new THREE.Vector3(), grow: 1 });
  }
  let next = 0;

  return {
    emit(position, { dark = false, strength = 1 } = {}) {
      const puff = puffs[next];
      next = (next + 1) % size;
      puff.mesh.position.copy(position);
      puff.mesh.visible = true;
      puff.mesh.scale.setScalar(0.6 + strength * 0.3);
      puff.mesh.material.color.setHex(dark ? 0x55575c : 0xf2f2f2);
      puff.life = 0;
      puff.max = 2.2 + Math.random() * 1.2;
      puff.grow = 1.4 + Math.random() * 0.8;
      puff.vel.set((Math.random() - 0.5) * 0.9, 1.6 + strength * 0.8, (Math.random() - 0.5) * 0.9);
    },
    update(dt) {
      for (const puff of puffs) {
        if (!puff.mesh.visible) continue;
        puff.life += dt;
        const t = puff.life / puff.max;
        if (t >= 1) {
          puff.mesh.visible = false;
          continue;
        }
        puff.vel.y *= 1 - dt * 0.6;
        puff.vel.x += dt * 0.35;
        puff.mesh.position.addScaledVector(puff.vel, dt);
        puff.mesh.scale.addScalar(puff.grow * dt);
        puff.mesh.material.opacity = Math.min(t * 6, 1) * (1 - t) * 0.55;
      }
    },
  };
}
