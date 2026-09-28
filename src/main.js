import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./style.css";

const CURVE_RADIUS = 10;
const RAIL_TOP_Y = 0.29;
const GAUGE = 1.05;
const WAGON_PITCH = 2.7;
const WAGON_HALF = 1.2;
const MAX_WAGONS = 5;

const WEST_X = -45;
const FAR_Z = -55;
const GOLD_Z = 120;
const UNLOAD_X = 18;
const COAL_CHUTE_X = 0;
const IRON_CHUTE_X = 65;
const GOLD_CHUTE_X = 10;
const STATION_S = UNLOAD_X - (WEST_X + CURVE_RADIUS);
const SWITCH_RADIUS = 6;
const PLATFORMS = [
  { z: 0, unloadX: UNLOAD_X, bypass: [] },
  {
    z: 5.6,
    unloadX: 12,
    bypass: [[-18, 0, SWITCH_RADIUS], [-11, 5.6, SWITCH_RADIUS], [23, 5.6, SWITCH_RADIUS], [30, 0, SWITCH_RADIUS]],
  },
  {
    z: 11.2,
    unloadX: 11,
    bypass: [[-24, 0, SWITCH_RADIUS], [-14, 11.2, SWITCH_RADIUS], [20, 11.2, SWITCH_RADIUS], [32, 0, SWITCH_RADIUS]],
  },
];
const HEAD_SHARED_S = 8;
const TAIL_SHARED_S = 70;
const SWITCH_ZONES = [
  { x0: -50, x1: -30, z0: -14, z1: 14 },
  { x0: -31, x1: -12.5, z0: -1.5, z1: 3.2 },
  { x0: 23, x1: 36, z0: -1.5, z1: 12.5 },
];

const TOP_SPEED = 8;
const ACCELERATION = 2.5;
const TRAIN_CLEARANCE = 2.2;
const STOP_WAIT = { station: 3.5, mine: 4 };

const COAL = "coal";
const IRON = "iron";
const GOLD = "gold";
const MINERALS = {
  [COAL]: { name: "Kohle", color: 0x1b1b1e },
  [IRON]: { name: "Eisenerz", color: 0xa4553a },
  [GOLD]: { name: "Golderz", color: 0xf5c518 },
};
const MINERAL_MATERIALS = {
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

const LINES = {
  iron: { cost: { [COAL]: 4 }, name: "Gleis zur Eisenmine" },
  gold: { cost: { [COAL]: 4, [IRON]: 4 }, name: "Goldstrecke" },
};
const SMELTER = { cost: { [COAL]: 6, [IRON]: 3 }, name: "Schmelzhütte" };
const PLATFORM_COSTS = [null, { [COAL]: 8 }, { [COAL]: 6, [IRON]: 4 }];
const RECIPES = {
  steel: { id: "steel", name: "Stahl", cost: { [COAL]: 2, [IRON]: 1 }, time: 5 },
  goldbar: { id: "goldbar", name: "Goldbarren", cost: { [COAL]: 2, [GOLD]: 1 }, time: 7 },
};
const STATION_UPGRADES = [
  {
    name: "Güterschuppen",
    wait: 2,
    cost: { steel: 2 },
    desc: "Die Züge entladen am Bahnhof schneller.",
  },
  {
    name: "Schnellrampe",
    wait: 1,
    cost: { steel: 2, goldbar: 1 },
    desc: "Eine zweite Rampe leert die Wagen noch schneller.",
  },
];
const GOOD_NAMES = {
  [COAL]: "Kohle",
  [IRON]: "Eisenerz",
  [GOLD]: "Golderz",
  steel: "Stahl",
  goldbar: "Goldbarren",
};
const SAVE_KEY = "deine-strecke-v1";

const TRAIN_MODELS = [
  {
    id: "dampf",
    name: "Dampflok",
    rarity: "Gewöhnlich",
    look: "Grüne Dampflok mit einem Holzwagen.",
    capacity: 1,
    cost: {},
    build: buildSteamTrain,
  },
  {
    id: "diesel",
    name: "Diesellok",
    rarity: "Ungewöhnlich",
    look: "Kantige rote Diesellok, graue Stahlwagen.",
    capacity: 2,
    cost: { [COAL]: 4 },
    build: buildDieselTrain,
  },
  {
    id: "erz",
    name: "Erz-Zug",
    rarity: "Selten",
    look: "Blaue Lok mit Tender und Trichterwagen.",
    capacity: 3,
    cost: { [COAL]: 3, [IRON]: 3 },
    build: buildOreTrain,
  },
  {
    id: "schwer",
    name: "Schwere Güterlok",
    rarity: "Episch",
    look: "Riesiger schwarzer Kessel, rote Räder, Windleitbleche.",
    capacity: 4,
    cost: { [COAL]: 4, [IRON]: 6 },
    build: buildHeavyTrain,
  },
  {
    id: "goldzug",
    name: "Goldzug",
    rarity: "Legendär",
    look: "Stromlinie in Violett mit Messing und Goldrändern.",
    capacity: 5,
    cost: { [GOLD]: 4, [IRON]: 2 },
    build: buildGoldTrain,
  },
];
const MODELS_BY_ID = Object.fromEntries(TRAIN_MODELS.map((model) => [model.id, model]));

const CAMERA_OFFSET = new THREE.Vector3(-15, 20, 18);
const SUN_OFFSET = new THREE.Vector3(-20, 34, 14);
const TRACK_PAN_SPEED = 24;

const app = document.querySelector("#app");
const hud = {
  cargo: document.querySelector("#cargo"),
  stock: document.querySelector("#stock"),
  trainName: document.querySelector("#train-name"),
  message: document.querySelector("#message"),
  buildPanel: document.querySelector(".build-panel"),
  trainList: document.querySelector("#train-list"),
  slider: document.querySelector("#track-slider"),
  follow: document.querySelector("#cam-follow"),
  station: document.querySelector("#cam-station"),
  coalMine: document.querySelector("#cam-coal"),
  ironMine: document.querySelector("#cam-iron"),
  goldMine: document.querySelector("#cam-gold"),
  lines: Object.fromEntries(
    Object.keys(LINES).map((id) => [
      id,
      {
        card: document.querySelector(`#build-${id}-card`),
        bar: document.querySelector(`#build-${id}-bar`),
        status: document.querySelector(`#build-${id}-status`),
        button: document.querySelector(`#build-${id}`),
      },
    ]),
  ),
  smelter: {
    card: document.querySelector("#build-smelter-card"),
    bar: document.querySelector("#build-smelter-bar"),
    status: document.querySelector("#build-smelter-status"),
    button: document.querySelector("#build-smelter"),
    jobs: document.querySelector("#smelter-jobs"),
    steel: document.querySelector("#smelt-steel"),
    goldbar: document.querySelector("#smelt-goldbar"),
  },
  platform: {
    card: document.querySelector("#build-platform-card"),
    title: document.querySelector("#platform-title"),
    desc: document.querySelector("#platform-desc"),
    bar: document.querySelector("#build-platform-bar"),
    status: document.querySelector("#build-platform-status"),
    button: document.querySelector("#build-platform"),
  },
  stationUpgrade: {
    card: document.querySelector("#build-station-card"),
    title: document.querySelector("#station-title"),
    desc: document.querySelector("#station-desc"),
    bar: document.querySelector("#build-station-bar"),
    status: document.querySelector("#build-station-status"),
    button: document.querySelector("#build-station"),
  },
};

const ROUTE_CORNERS = {
  short: [[45, 0], [45, FAR_Z], [WEST_X, FAR_Z]],
  iron: [[95, 0], [95, FAR_Z], [WEST_X, FAR_Z]],
  gold: [[70, 0], [70, GOLD_Z], [WEST_X, GOLD_Z]],
};
const ROUTE_MINES = {
  short: { [COAL]: [COAL_CHUTE_X, FAR_Z] },
  iron: { [COAL]: [COAL_CHUTE_X, FAR_Z], [IRON]: [IRON_CHUTE_X, FAR_Z] },
  gold: { [GOLD]: [GOLD_CHUTE_X, GOLD_Z] },
};
const routes = Object.fromEntries(
  Object.keys(ROUTE_CORNERS).map((route) => [
    route,
    PLATFORMS.map((platform, index) => {
      const path = createPath([[WEST_X, 0], ...platform.bypass, ...ROUTE_CORNERS[route]]);
      path.route = route;
      path.platform = index;
      path.stationS = index === 0 ? STATION_S : nearestS(path, platform.unloadX, platform.z);
      for (const [mineral, [x, z]] of Object.entries(ROUTE_MINES[route])) path.spots[mineral] = nearestS(path, x, z);
      if (platform.bypass.length > 0) {
        path.bypassFrom = path.segments[0].len;
        path.bypassTo = path.segments[8].s0;
      }
      return path;
    }),
  ]),
);
const paths = { short: routes.short[0], iron: routes.iron[0], gold: routes.gold[0] };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9eb8c9);
scene.fog = new THREE.Fog(0x9eb8c9, 150, 400);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  500,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 170;
controls.maxPolarAngle = Math.PI / 2 - 0.08;

const hemi = new THREE.HemisphereLight(0xd7e7f5, 0x6a5a3a, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1d6, 1.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 120;
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -45;
scene.add(sun, sun.target);

const TRACK_MATERIALS = {
  ballast: new THREE.MeshStandardMaterial({ color: 0x9a9186, roughness: 1 }),
  planned: new THREE.MeshStandardMaterial({ color: 0xc9bfa9, roughness: 1 }),
  sleeper: new THREE.MeshStandardMaterial({ color: 0x6b4630, roughness: 0.92 }),
  rail: new THREE.MeshStandardMaterial({ color: 0xc5ced6, roughness: 0.4, metalness: 0.6 }),
};
const FRAME_MAT = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.55 });
const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x2a2c2f, roughness: 0.5, metalness: 0.6 });
const BRASS_MAT = new THREE.MeshStandardMaterial({ color: 0xd9a92b, roughness: 0.3, metalness: 0.85 });

scene.add(createGround());
const tracks = createTracks();
scene.add(tracks.group);

const station = createStation();
const coalMine = createCoalMine();
const ironMine = createIronMine();
const goldMine = createGoldMine();
const mines = [coalMine, ironMine, goldMine];
const smelter = createSmelter();
for (const item of [station, ...mines, smelter]) {
  scene.add(item.group);
}

const game = {
  built: { iron: false, gold: false, smelter: false },
  owned: new Set(["dampf"]),
  savedRuns: [{ id: "dampf", modelId: "dampf", target: COAL }],
  focusId: "dampf",
  runs: [],
  stock: { [COAL]: 0, [IRON]: 0, [GOLD]: 0 },
  smelted: { steel: 0, goldbar: 0 },
  smelter: { recipe: null, time: 0 },
  stationLevel: 0,
  platforms: 1,
};
loadGame();

const clock = new THREE.Clock();
const trainItems = createTrainList();
let trackCamera = null;
bootRuns();
applyBuiltWorld();

trackCamera = {
  follow: true,
  path: focusedRun().sim.path,
  s: focusedRun().sim.s + focusedRun().mesh.centerOffset,
  keys: new Set(),
  showcase: null,
};
setupTrackCamera();
setupShop();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  updateViewOffset();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
updateViewOffset();

function updateViewOffset() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const shift = width < 1200 ? -Math.min(150, width * 0.18) : 0;
  camera.setViewOffset(width, height, shift, 0, width, height);
  camera.updateProjectionMatrix();
}

if (import.meta.env.DEV) {
  window.strecke = {
    game,
    paths,
    routes,
    tracks,
    updateHud,
    get sim() {
      return focusedRun().sim;
    },
    camera,
    controls,
    trackCamera,
    advance(seconds) {
      for (let left = seconds; left > 0; left -= 0.05) stepWorld(Math.min(left, 0.05));
    },
    renderNow() {
      renderTrains();
      renderSmelter(clock.getElapsedTime());
      for (let i = 0; i < 12; i += 1) updateTrackCamera(0.25);
      controls.update();
      renderer.render(scene, camera);
    },
    get train() {
      return focusedRun().mesh;
    },
  };
}

let lastElapsed = 0;
let lastSimElapsed = 0;

function tick() {
  const elapsed = clock.getElapsedTime();
  const dt = Math.min(elapsed - lastElapsed, 0.25);
  lastElapsed = elapsed;

  let remaining = Math.min(elapsed - lastSimElapsed, 4);
  lastSimElapsed = elapsed;
  while (remaining > 0) {
    const step = Math.min(remaining, 0.05);
    stepWorld(step);
    remaining -= step;
  }

  renderTrains();
  renderSmelter(elapsed);
  updateTrackCamera(dt);
  controls.update();
  sun.target.position.copy(controls.target);
  sun.position.copy(controls.target).add(SUN_OFFSET);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

updateHud();
tick();

function stepWorld(step) {
  for (const run of game.runs) simulateRun(run, step);
  updateSmelter(step);
}

function stationWait() {
  return STATION_UPGRADES[game.stationLevel - 1]?.wait ?? STOP_WAIT.station;
}

function wrap(distance, length) {
  return ((distance % length) + length) % length;
}

function createPath(corners) {
  const points = corners.map(([x, z]) => new THREE.Vector2(x, z));
  const n = points.length;
  const corner = (i) => {
    const p = points[i];
    const dIn = p.clone().sub(points[(i + n - 1) % n]).normalize();
    const dOut = points[(i + 1) % n].clone().sub(p).normalize();
    const radius = corners[i][2] ?? CURVE_RADIUS;
    const cross = dIn.x * dOut.y - dIn.y * dOut.x;
    const angle = Math.acos(THREE.MathUtils.clamp(dIn.dot(dOut), -1, 1));
    return { p, dIn, dOut, radius, angle, turn: Math.sign(cross), tangent: radius * Math.tan(angle / 2) };
  };

  const segments = [];
  let length = 0;
  for (let i = 0; i < n; i += 1) {
    const a = corner(i);
    const b = corner((i + 1) % n);
    const start = a.p.clone().addScaledVector(a.dOut, a.tangent);
    const end = b.p.clone().addScaledVector(b.dIn, -b.tangent);
    const lineLength = start.distanceTo(end);
    segments.push({ type: "line", s0: length, len: lineLength, start, dir: a.dOut });
    length += lineLength;
    const normal = new THREE.Vector2(-b.dIn.y, b.dIn.x).multiplyScalar(b.turn);
    const center = end.clone().addScaledVector(normal, b.radius);
    const arcLength = b.radius * b.angle;
    segments.push({
      type: "arc",
      s0: length,
      len: arcLength,
      center,
      radius: b.radius,
      turn: b.turn,
      from: end.clone().sub(center),
      dIn: b.dIn,
    });
    length += arcLength;
  }

  const point = (distance) => {
    const s = wrap(distance, length);
    const seg = segments.find((candidate) => s < candidate.s0 + candidate.len) ?? segments[segments.length - 1];
    const t = s - seg.s0;
    if (seg.type === "line") {
      return { x: seg.start.x + seg.dir.x * t, z: seg.start.y + seg.dir.y * t, dx: seg.dir.x, dz: seg.dir.y };
    }
    const phi = (seg.turn * t) / seg.radius;
    const cos = Math.cos(phi);
    const sin = Math.sin(phi);
    return {
      x: seg.center.x + seg.from.x * cos - seg.from.y * sin,
      z: seg.center.y + seg.from.x * sin + seg.from.y * cos,
      dx: seg.dIn.x * cos - seg.dIn.y * sin,
      dz: seg.dIn.x * sin + seg.dIn.y * cos,
    };
  };

  return { length, segments, point, spots: {} };
}

function nearestS(path, x, z) {
  let best = 0;
  let bestDistance = Infinity;
  for (let s = 0; s < path.length; s += 0.05) {
    const p = path.point(s);
    const distance = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = s;
    }
  }
  return best;
}

function placeOnPath(object, path, distance, y = 0) {
  const p = path.point(distance);
  object.position.set(p.x, y, p.z);
  object.rotation.set(0, Math.atan2(-p.dz, p.dx), 0);
}

function createGround() {
  const group = new THREE.Group();

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ color: 0x6d914c, roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(25, 0, 30);
  grass.receiveShadow = true;
  group.add(grass);

  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(58, 38),
    new THREE.MeshStandardMaterial({ color: 0x8b7d68, roughness: 1 }),
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(10, 0.02, 3);
  yard.receiveShadow = true;
  group.add(yard);
  return group;
}

function createStation() {
  const group = new THREE.Group();
  const x0 = 10;
  const concrete = new THREE.MeshStandardMaterial({ color: 0xa39c90, roughness: 0.95 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xdccdb0, roughness: 0.85 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x8d3a32, roughness: 0.7 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x5b4a3a, roughness: 0.8 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x2e4756, roughness: 0.3, metalness: 0.3 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd9c35a, roughness: 0.7 });

  addBox(group, [46, 0.5, 3], [x0, 0.25, -3.1], concrete);
  addBox(group, [46, 0.06, 0.18], [x0, 0.53, -1.75], yellow);

  addBox(group, [24, 5, 8], [x0, 2.5, -10], wall);
  group.add(prismRoof(24, 8.6, 2.2, [x0, 5, -10], roof));
  for (const dx of [-16, 16]) {
    addBox(group, [8, 3.6, 6.5], [x0 + dx, 1.8, -9.6], wall);
    group.add(prismRoof(8, 7, 1.6, [x0 + dx, 3.6, -9.6], roof));
  }
  for (let i = 0; i < 9; i += 1) {
    const x = x0 - 10.5 + i * 2.625;
    if (Math.abs(x - x0) < 1.5) continue;
    addBox(group, [1.1, 1.5, 0.08], [x, 2.9, -5.97], glass);
  }
  for (const dx of [-5, 0, 5]) {
    addBox(group, [1.6, 2.4, 0.1], [x0 + dx, 1.2, -5.96], trim);
  }
  for (const dx of [-17.5, -14.5, 14.5, 17.5]) {
    addBox(group, [1.1, 1.2, 0.08], [x0 + dx, 2.1, -6.32], glass);
  }

  addBox(group, [3.2, 11, 3.2], [x0, 5.5, -7.4], wall);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.4, 4), roof);
  cap.rotation.y = Math.PI / 4;
  cap.position.set(x0, 12.2, -7.4);
  cap.castShadow = true;
  group.add(cap);
  const clockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.1, 28),
    new THREE.MeshStandardMaterial({ color: 0xf6f2e6, roughness: 0.5 }),
  );
  clockFace.rotation.x = Math.PI / 2;
  clockFace.position.set(x0, 8.6, -5.78);
  group.add(clockFace);
  const hand = addBox(group, [0.1, 0.8, 0.04], [x0, 8.9, -5.7], FRAME_MAT);
  hand.castShadow = false;
  const hand2 = addBox(group, [0.55, 0.1, 0.04], [x0 + 0.25, 8.6, -5.7], FRAME_MAT);
  hand2.castShadow = false;

  const sign = createSign("Hauptbahnhof", "#1f3a5f", "#f4f1e8", 7, 1.1);
  sign.position.set(x0 - 6.5, 5.35, -5.5);
  group.add(sign);

  for (let x = x0 - 21; x <= x0 + 21; x += 6) {
    addBox(group, [0.18, 3.1, 0.18], [x, 2.05, -4.1], trim);
  }
  addBox(group, [44, 0.16, 3.2], [x0, 3.65, -3.2], roof);

  const pitLength = (MAX_WAGONS - 1) * WAGON_PITCH + 3;
  const pitMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 1 });
  const addPit = (parent, unloadX, trackZ) => {
    const x = unloadX - ((MAX_WAGONS - 1) * WAGON_PITCH) / 2;
    const z = trackZ + 2.8;
    addBox(parent, [pitLength, 0.06, 2.2], [x, 0.04, z], pitMat);
    for (const dz of [-1.15, 1.15]) addBox(parent, [pitLength + 0.3, 0.4, 0.25], [x, 0.2, z + dz], concrete);
    for (const dx of [-1, 1]) addBox(parent, [0.25, 0.4, 2.55], [x + (dx * (pitLength + 0.05)) / 2, 0.2, z], concrete);
    for (let i = 0; i < 12; i += 1) {
      addBox(parent, [0.08, 0.05, 2.1], [x - pitLength / 2 + 0.6 + i * ((pitLength - 1.2) / 11), 0.09, z], trim);
    }
  };
  const addStreams = (parent, unloadX, trackZ) =>
    Array.from({ length: MAX_WAGONS }, (_, i) => {
      const stream = createLumpStream(MINERAL_MATERIALS[COAL]);
      stream.position.set(unloadX - i * WAGON_PITCH, 1.55, trackZ + 0.5);
      parent.add(stream);
      return stream;
    });
  const pitX = UNLOAD_X - ((MAX_WAGONS - 1) * WAGON_PITCH) / 2;
  const pitZ = 2.8;
  addPit(group, UNLOAD_X, 0);

  const platforms = PLATFORMS.map((platform, index) => {
    if (index === 0) return { group, streams: addStreams(group, platform.unloadX, platform.z) };
    const extra = new THREE.Group();
    extra.visible = false;
    addPit(extra, platform.unloadX, platform.z);
    const signX = platform.unloadX + 3;
    addBox(extra, [0.14, 2.2, 0.14], [signX, 1.1, platform.z + 2.8], trim);
    const sign = createSign(`Gleis ${index + 1}`, "#1f3a5f", "#f4f1e8", 1.6, 0.5);
    sign.position.set(signX, 2.0, platform.z + 2.9);
    sign.rotation.y = -0.4;
    extra.add(sign);
    group.add(extra);
    return { group: extra, streams: addStreams(extra, platform.unloadX, platform.z) };
  });

  const heaps = {};
  const bayXs = { [COAL]: pitX - 5, [IRON]: pitX, [GOLD]: pitX + 5 };
  const bayZ = 18;
  for (const mineral of [COAL, IRON, GOLD]) {
    const x = bayXs[mineral];
    addBox(group, [4.2, 1.1, 0.3], [x, 0.55, bayZ + 1.8], concrete);
    for (const dx of [-2.1, 2.1]) addBox(group, [0.3, 1.1, 3.4], [x + dx, 0.55, bayZ + 0.3], concrete);
    const heap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1, 9), MINERAL_MATERIALS[mineral]);
    heap.geometry.translate(0, 0.5, 0);
    heap.position.set(x, 0.02, bayZ + 0.3);
    heap.castShadow = true;
    heap.visible = false;
    group.add(heap);
    heaps[mineral] = heap;
  }

  const postX = UNLOAD_X + 3;
  addBox(group, [0.14, 2.6, 0.14], [postX, 1.3, pitZ], trim);
  const unloadSign = createSign("Entladestelle: Kohle · Eisen · Gold", "#2f5a3f", "#f4f1e8", 4.6, 0.6);
  unloadSign.position.set(postX, 2.3, pitZ + 0.1);
  unloadSign.rotation.y = -0.4;
  group.add(unloadSign);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4 }),
  );
  lamp.position.set(postX, 2.95, pitZ);
  group.add(lamp);

  const shed = new THREE.Group();
  shed.visible = false;
  addBox(shed, [6.2, 3.1, 4.4], [36, 1.55, -8.2], wall);
  shed.add(prismRoof(6.2, 5, 1.35, [36, 3.1, -8.2], roof));
  addBox(shed, [1.5, 2.1, 0.1], [36, 1.05, -5.95], trim);
  const shedSign = createSign("Güterschuppen", "#5b3a22", "#f4f1e8", 2.6, 0.48);
  shedSign.position.set(36, 2.55, -5.88);
  shed.add(shedSign);
  group.add(shed);

  const ramp = new THREE.Group();
  ramp.visible = false;
  const crane = new THREE.MeshStandardMaterial({ color: 0xc4552a, roughness: 0.55 });
  addBox(ramp, [0.28, 3.5, 0.28], [UNLOAD_X - 6.5, 1.75, 1.15], crane);
  addBox(ramp, [0.28, 3.5, 0.28], [UNLOAD_X + 6.5, 1.75, 1.15], crane);
  addBox(ramp, [14, 0.24, 0.24], [UNLOAD_X, 3.5, 1.15], crane);
  addBox(ramp, [0.16, 1.15, 0.16], [UNLOAD_X, 2.75, 1.15], FRAME_MAT);
  group.add(ramp);

  return { group, heaps, platforms, lamp, shed, ramp };
}

function prismRoof(length, width, height, [x, y, z], material) {
  const shape = new THREE.Shape([
    new THREE.Vector2(-width / 2, 0),
    new THREE.Vector2(width / 2, 0),
    new THREE.Vector2(0, height),
  ]);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length + 0.4, bevelEnabled: false });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-(length + 0.4) / 2, 0, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createSign(text, background, color, width = 2.2, height = 0.55) {
  const canvas = document.createElement("canvas");
  canvas.height = 128;
  canvas.width = Math.round((128 * width) / height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  let size = 64;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > canvas.width - 24 && size > 20) {
    size -= 2;
    ctx.font = `bold ${size}px system-ui, sans-serif`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }),
  );
  sign.castShadow = true;
  return sign;
}

function addSignPost(group, text, background, x, z) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.88 });
  addBox(group, [0.14, 2.2, 0.14], [x, 1.1, z], wood);
  const sign = createSign(text, background, "#f4f1e8");
  sign.position.set(x, 2.0, z + 0.1);
  sign.rotation.y = -0.5;
  group.add(sign);
}

function createLumpStream(material) {
  const stream = new THREE.Group();
  const lumpGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  stream.visible = false;
  for (let i = 0; i < 7; i += 1) {
    const lump = new THREE.Mesh(lumpGeo, material);
    lump.userData.phase = i / 7;
    lump.userData.dx = ((i * 37) % 7) / 7 - 0.5;
    lump.castShadow = true;
    stream.add(lump);
  }
  return stream;
}

function animateStream(stream, time, drop, drift) {
  for (const lump of stream.children) {
    const k = (time * 2.2 + lump.userData.phase) % 1;
    lump.position.set(lump.userData.dx * 0.3, -k * drop, k * drift);
    lump.rotation.set(k * 5, k * 3, 0);
  }
}

function createTracks() {
  const group = new THREE.Group();
  const shortSegs = paths.short.segments;
  const stationEnd = shortSegs[0].len;
  const shortTurnEnd = shortSegs[4].s0;
  const ironEnd = nearestS(paths.iron, 35, FAR_Z);
  const goldStart = paths.gold.segments[1].s0;

  const common = new THREE.Group();
  common.add(
    createTrackSection(paths.short, 0, stationEnd),
    createTrackSection(paths.short, shortTurnEnd, paths.short.length),
  );
  const shortTurn = createTrackSection(paths.short, stationEnd, shortTurnEnd);
  const iron = createTrackSection(paths.iron, stationEnd, ironEnd);
  const ironPlanned = createTrackSection(paths.iron, stationEnd + 12, ironEnd, { planned: true });
  const gold = createTrackSection(paths.gold, goldStart, paths.gold.length);
  const goldPlanned = createTrackSection(paths.gold, goldStart, paths.gold.length, { planned: true });
  iron.visible = false;
  gold.visible = false;

  const ironSign = new THREE.Group();
  addSignPost(ironSign, "Baustelle: Eisen", "#b8860b", 80, -4);
  const goldSign = new THREE.Group();
  addSignPost(goldSign, "Baustelle: Gold", "#b8860b", 74, 30);

  const platforms = routes.short.map((path) => {
    if (path.bypassFrom === undefined) return null;
    const built = createTrackSection(path, path.bypassFrom, path.bypassTo);
    const planned = createTrackSection(path, path.bypassFrom, path.bypassTo, { planned: true });
    built.visible = false;
    group.add(built, planned);
    return { built, planned };
  });

  group.add(common, shortTurn, iron, ironPlanned, gold, goldPlanned, ironSign, goldSign);
  return { group, shortTurn, iron, ironPlanned, ironSign, gold, goldPlanned, goldSign, platforms };
}

function createTrackSection(path, from, to, { planned = false } = {}) {
  const track = new THREE.Group();
  const segments = Math.max(1, Math.round((to - from) / 1.1));
  const step = (to - from) / segments;
  const dummy = new THREE.Object3D();
  const setAt = (mesh, index, s, y) => {
    placeOnPath(dummy, path, s, y);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  };

  if (planned) {
    const count = Math.ceil(segments / 2);
    const ballast = new THREE.InstancedMesh(
      new THREE.BoxGeometry(step - 0.2, 0.04, 2.4),
      TRACK_MATERIALS.planned,
      count,
    );
    for (let i = 0; i < count; i += 1) setAt(ballast, i, from + (2 * i + 0.5) * step, 0.04);
    ballast.receiveShadow = true;
    ballast.frustumCulled = false;
    track.add(ballast);
    return track;
  }

  const ballast = new THREE.InstancedMesh(
    new THREE.BoxGeometry(step + 0.35, 0.08, 2.4),
    TRACK_MATERIALS.ballast,
    segments,
  );
  const sleepers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.28, 0.1, 1.7),
    TRACK_MATERIALS.sleeper,
    segments * 2,
  );
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.1, 0.08), TRACK_MATERIALS.rail, segments * 2);

  for (let i = 0; i < segments; i += 1) {
    const s0 = from + i * step;
    setAt(ballast, i, s0 + step / 2, 0.06);
    setAt(sleepers, 2 * i, s0 + step * 0.25, 0.14);
    setAt(sleepers, 2 * i + 1, s0 + step * 0.75, 0.14);

    const a = path.point(s0);
    const b = path.point(s0 + step);
    for (const [k, side] of [-1, 1].entries()) {
      const offset = (side * GAUGE) / 2;
      const ax = a.x - a.dz * offset;
      const az = a.z + a.dx * offset;
      const bx = b.x - b.dz * offset;
      const bz = b.z + b.dx * offset;
      dummy.position.set((ax + bx) / 2, 0.24, (az + bz) / 2);
      dummy.rotation.set(0, Math.atan2(-(bz - az), bx - ax), 0);
      dummy.scale.set(Math.hypot(bx - ax, bz - az) + 0.02, 1, 1);
      dummy.updateMatrix();
      rails.setMatrixAt(2 * i + k, dummy.matrix);
    }
  }

  for (const mesh of [ballast, sleepers, rails]) {
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    track.add(mesh);
  }
  sleepers.castShadow = true;
  rails.castShadow = true;
  return track;
}

function createCoalMine() {
  const group = new THREE.Group();
  const binX = COAL_CHUTE_X + ((MAX_WAGONS - 1) * WAGON_PITCH) / 2;
  const portalZ = -64;

  addGroundPatch(group, binX, -65, 14, 0x5e5446);

  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x6a6a4c, roughness: 1, flatShading: true }),
  );
  hill.scale.set(1.6, 0.7, 1.1);
  hill.position.set(binX, 0, portalZ - 9);
  hill.castShadow = true;
  hill.receiveShadow = true;
  group.add(hill);

  const stone = new THREE.MeshStandardMaterial({ color: 0x7d776e, roughness: 0.95 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x5a3b26, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 1 });

  addBox(group, [5, 3.4, 0.8], [binX, 1.7, portalZ - 0.4], stone);
  addBox(group, [1.9, 2.3, 0.12], [binX, 1.15, portalZ + 0.04], dark);
  for (const dx of [-1.05, 1.05]) {
    addBox(group, [0.26, 2.5, 0.26], [binX + dx, 1.25, portalZ + 0.12], timber);
  }
  addBox(group, [2.6, 0.3, 0.3], [binX, 2.6, portalZ + 0.12], timber);

  addHeadframe(group, binX + 11, -63, timber, 6, WHEEL_MAT);
  addPiles(group, [
    [-6, -61, 1.4, 1.2],
    [-3.5, -62.8, 1.0, 0.85],
    [-7.5, -63.6, 0.8, 0.7],
  ], MINERAL_MATERIALS[COAL]);
  addSignPost(group, "Kohlemine", "#23262b", -4, -58.6);

  const streams = addTipple(group, {
    chuteX: COAL_CHUTE_X,
    trackZ: FAR_Z,
    mineral: COAL,
    beltStart: new THREE.Vector3(binX, 0.4, portalZ + 0.3),
    timber,
  });
  return { group, mineral: COAL, streams };
}

function createIronMine() {
  const group = new THREE.Group();
  const binX = IRON_CHUTE_X + ((MAX_WAGONS - 1) * WAGON_PITCH) / 2;
  const pitX = binX + 1;
  const pitZ = -69.5;

  addGroundPatch(group, binX, -66, 14, 0x7b5a45);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(4.4, 0.8, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0x9a5b3c, roughness: 1, flatShading: true }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.scale.set(1, 1, 0.55);
  rim.position.set(pitX, 0, pitZ);
  rim.castShadow = true;
  rim.receiveShadow = true;
  group.add(rim);

  const terraces = [
    [4.0, 0x84472d],
    [3.1, 0x6a3622],
    [2.2, 0x4f2819],
    [1.2, 0x2a150e],
  ];
  for (const [i, [radius, color]] of terraces.entries()) {
    const terrace = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.04, 32),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    terrace.position.set(pitX, 0.03 + i * 0.01, pitZ);
    terrace.receiveShadow = true;
    group.add(terrace);
  }

  const timber = new THREE.MeshStandardMaterial({ color: 0x5a3b26, roughness: 0.9 });
  const crane = new THREE.Group();
  crane.position.set(pitX + 3.2, 0, pitZ + 2.4);
  for (const [dx, dz] of [
    [-0.7, -0.7],
    [0.7, -0.7],
    [0, 0.8],
  ]) {
    const leg = addBox(crane, [0.18, 4.6, 0.18], [dx * 0.5, 2.2, dz * 0.5], timber);
    leg.rotation.set(dz * 0.14, 0, -dx * 0.14);
  }
  const boom = addBox(crane, [0.16, 0.16, 4.2], [0, 4.4, -1.6], timber);
  boom.rotation.x = 0.25;
  const hook = addBox(crane, [0.04, 2.4, 0.04], [0, 2.9, -3.4], WHEEL_MAT);
  hook.castShadow = false;
  group.add(crane);

  addPiles(group, [
    [binX - 9, -61.8, 1.3, 1.1],
    [binX - 7.5, -63.3, 0.9, 0.8],
    [binX + 9, -62, 1.0, 0.9],
  ], MINERAL_MATERIALS[IRON]);
  addSignPost(group, "Eisenmine", "#7a3b24", IRON_CHUTE_X - 4, -58.6);

  const streams = addTipple(group, {
    chuteX: IRON_CHUTE_X,
    trackZ: FAR_Z,
    mineral: IRON,
    beltStart: new THREE.Vector3(binX, 0.7, pitZ + 4.4),
    timber,
  });
  return { group, mineral: IRON, streams };
}

function createGoldMine() {
  const group = new THREE.Group();
  const binX = GOLD_CHUTE_X + ((MAX_WAGONS - 1) * WAGON_PITCH) / 2;
  const mountainZ = 99;

  addGroundPatch(group, binX, 108, 17, 0xb59a5a);

  const rock = new THREE.MeshStandardMaterial({ color: 0x857b8c, roughness: 1, flatShading: true });
  const mountain = new THREE.Mesh(new THREE.SphereGeometry(9, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), rock);
  mountain.scale.set(1.7, 1.7, 1);
  mountain.position.set(binX, 0, mountainZ);
  mountain.castShadow = true;
  mountain.receiveShadow = true;
  group.add(mountain);
  const peak = new THREE.Mesh(new THREE.ConeGeometry(6, 9, 7), rock);
  peak.position.set(binX - 5, 17, mountainZ - 2);
  peak.castShadow = true;
  group.add(peak);

  const vein = MINERAL_MATERIALS[GOLD];
  for (const [dx, y, dz, rot] of [
    [-6, 7, 5.5, 0.4],
    [4, 10, 5, -0.6],
    [9, 5, 6, 0.9],
    [-10, 4, 5, -0.3],
  ]) {
    const streak = addBox(group, [2.2, 0.25, 0.3], [binX + dx, y, mountainZ + dz], vein);
    streak.rotation.z = rot;
  }

  const portalZ = mountainZ + 8.6;
  const stone = new THREE.MeshStandardMaterial({ color: 0x6d6573, roughness: 0.95 });
  addBox(group, [5.4, 4.2, 1.2], [binX, 2.1, portalZ], stone);
  addBox(
    group,
    [2.2, 2.8, 0.12],
    [binX, 1.4, portalZ + 0.62],
    new THREE.MeshStandardMaterial({ color: 0xffc94a, emissive: 0xc98a10, roughness: 0.6 }),
  );
  addBox(group, [3, 0.35, 0.35], [binX, 3.1, portalZ + 0.7], BRASS_MAT);

  const steel = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.5, metalness: 0.6 });
  addHeadframe(group, binX, mountainZ - 1, steel, 10, BRASS_MAT, 14.5);

  addPiles(group, [
    [binX - 10, 111, 1.5, 1.4],
    [binX - 12.5, 109, 1.0, 0.9],
    [binX + 10, 111.5, 1.2, 1.1],
  ], vein);
  addSignPost(group, "Goldmine", "#9c7310", GOLD_CHUTE_X - 4, GOLD_Z - 3.4);

  const timber = new THREE.MeshStandardMaterial({ color: 0x5a3b26, roughness: 0.9 });
  const streams = addTipple(group, {
    chuteX: GOLD_CHUTE_X,
    trackZ: GOLD_Z,
    mineral: GOLD,
    beltStart: new THREE.Vector3(binX, 0.5, portalZ + 0.8),
    timber,
  });
  return { group, mineral: GOLD, streams };
}

function addGroundPatch(group, x, z, radius, color) {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 40),
    new THREE.MeshStandardMaterial({ color, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(x, 0.021, z);
  ground.receiveShadow = true;
  group.add(ground);
}

function addPiles(group, piles, material) {
  for (const [x, z, radius, height] of piles) {
    const pile = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 9), material);
    pile.position.set(x, 0.02 + height / 2, z);
    pile.rotation.y = x;
    pile.castShadow = true;
    pile.receiveShadow = true;
    group.add(pile);
  }
}

function addTipple(group, { chuteX, trackZ, mineral, beltStart, timber }) {
  const binZ = trackZ - 2.9;
  const binTop = 4.4;
  const binX = chuteX + ((MAX_WAGONS - 1) * WAGON_PITCH) / 2;
  const binLength = (MAX_WAGONS - 1) * WAGON_PITCH + 2.4;
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.88 });

  addBox(group, [binLength, 1.3, 1.8], [binX, binTop - 0.65, binZ], wood);
  addBox(group, [binLength - 0.4, 0.1, 1.4], [binX, binTop - 0.02, binZ], MINERAL_MATERIALS[mineral]);

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
  const drop = 0.45;
  const chuteLength = Math.hypot(tipZ - chuteTopZ, drop);
  const streams = [];
  for (let i = 0; i < MAX_WAGONS; i += 1) {
    const x = chuteX + i * WAGON_PITCH;
    const chute = new THREE.Group();
    chute.position.set(x, binTop - 1.15 - drop / 2, (chuteTopZ + tipZ) / 2);
    chute.rotation.x = Math.atan2(drop, tipZ - chuteTopZ);
    addBox(chute, [0.7, 0.06, chuteLength], [0, 0, 0], wood);
    for (const side of [-0.35, 0.35]) {
      addBox(chute, [0.06, 0.28, chuteLength], [side, 0.12, 0], wood);
    }
    group.add(chute);

    const stream = createLumpStream(MINERAL_MATERIALS[mineral]);
    stream.position.set(x, binTop - 1.2 - drop, tipZ + 0.15);
    group.add(stream);
    streams.push(stream);
  }

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
    new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6 }),
  );
  for (const side of [-0.42, 0.42]) {
    addBox(belt, [0.06, 0.22, beltLength], [side, 0.08, 0], timber);
  }
  group.add(belt);
  addBox(group, [0.2, belt.position.y, 0.2], [binX, belt.position.y / 2, belt.position.z], timber);

  return streams;
}

function addHeadframe(group, x, z, frameMat, height, wheelMat, baseY = 0) {
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
      new THREE.MeshStandardMaterial({ color: 0x8a4b3a, roughness: 0.85 }),
    );
    house.receiveShadow = true;
    addBox(frame, [2.7, 0.16, 2.3], [3.6, 1.88, 0], new THREE.MeshStandardMaterial({ color: 0x3c3f44, roughness: 0.7 }));
  }

  group.add(frame);
}

function createSmelter() {
  const group = new THREE.Group();
  group.position.set(28, 0, 18.5);
  group.visible = false;

  const brick = new THREE.MeshStandardMaterial({ color: 0x8d4336, roughness: 0.92 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4e2a24, roughness: 0.95 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x6e6860, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.88 });

  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 24),
    new THREE.MeshStandardMaterial({ color: 0x6a5c4c, roughness: 1 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.03;
  pad.receiveShadow = true;
  group.add(pad);

  addBox(group, [4.4, 0.35, 3.4], [0, 0.2, 0], stone);
  addBox(group, [3.3, 2.15, 2.5], [0, 1.45, 0], brick);
  addBox(group, [3.6, 0.28, 2.8], [0, 2.66, 0], dark);
  addBox(group, [1.55, 0.22, 0.22], [0, 1.4, 1.28], stone);
  addBox(group, [0.18, 1.15, 0.22], [-0.7, 0.85, 1.28], stone);
  addBox(group, [0.18, 1.15, 0.22], [0.7, 0.85, 1.28], stone);

  const mouth = addBox(
    group,
    [1.15, 0.85, 0.12],
    [0, 0.78, 1.32],
    new THREE.MeshStandardMaterial({
      color: 0xff6a1a,
      emissive: 0xff4a00,
      emissiveIntensity: 0.15,
      roughness: 0.45,
    }),
  );
  mouth.castShadow = false;

  addBox(group, [0.85, 2.8, 0.85], [0.95, 4.05, -0.45], dark);
  addBox(group, [1.15, 0.22, 1.15], [0.95, 5.55, -0.45], stone);

  const glow = new THREE.PointLight(0xff6a22, 0, 9);
  glow.position.set(0, 1.1, 1.8);
  group.add(glow);

  const smoke = new THREE.Group();
  smoke.position.set(0.95, 5.8, -0.45);
  const smokeMat = new THREE.MeshStandardMaterial({
    color: 0xd5d8dc,
    transparent: true,
    opacity: 0.35,
    roughness: 1,
    depthWrite: false,
  });
  for (let i = 0; i < 6; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), smokeMat.clone());
    puff.userData.phase = i / 6;
    puff.castShadow = false;
    puff.receiveShadow = false;
    smoke.add(puff);
  }
  group.add(smoke);

  const steelMat = new THREE.MeshStandardMaterial({ color: 0xb7c0c8, metalness: 0.75, roughness: 0.32 });
  const goldBarMat = new THREE.MeshStandardMaterial({
    color: 0xf0c14a,
    metalness: 0.82,
    roughness: 0.28,
    emissive: 0x6b4a00,
  });
  const steelStack = new THREE.Group();
  steelStack.position.set(-2.55, 0, 0.55);
  const goldStack = new THREE.Group();
  goldStack.position.set(-2.55, 0, -0.85);
  for (let i = 0; i < 8; i += 1) {
    addBox(steelStack, [0.85, 0.14, 0.32], [(i % 2) * 0.08, 0.12 + i * 0.15, 0], steelMat);
    addBox(goldStack, [0.85, 0.14, 0.32], [(i % 2) * 0.08, 0.12 + i * 0.15, 0], goldBarMat);
  }
  for (const ingot of [...steelStack.children, ...goldStack.children]) ingot.visible = false;
  group.add(steelStack, goldStack);

  addBox(group, [0.12, 1.7, 0.12], [-2.35, 0.85, 2.55], wood);
  const sign = createSign("Schmelzhütte", "#6b2e24", "#f4f1e8", 1.9, 0.46);
  sign.position.set(-2.35, 1.85, 2.68);
  sign.rotation.y = -0.6;
  group.add(sign);

  return { group, mouth, glow, smoke, steelStack, goldStack };
}

function createTrainMesh(model) {
  const kit = {
    group: new THREE.Group(),
    cars: [],
    loads: [],
    wheels: [],
    cursor: WAGON_HALF + 0.3,
  };
  model.build(kit, model.capacity);
  const front = Math.max(...kit.cars.map((car) => car.offset + car.half));
  const back = Math.min(...kit.cars.map((car) => car.offset - car.half));
  kit.centerOffset = (front + back) / 2;
  kit.length = front - back;
  kit.front = front;
  return kit;
}

function addAhead(kit, object, length) {
  kit.cars.push({ object, offset: kit.cursor + length / 2, half: length / 2 });
  kit.cursor += length + 0.3;
  kit.group.add(object);
}

function addAxle(kit, parent, x, radius = 0.22, material = WHEEL_MAT) {
  const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 16);
  geometry.rotateX(Math.PI / 2);
  for (const z of [-GAUGE / 2, GAUGE / 2]) {
    const wheel = new THREE.Mesh(geometry, material);
    wheel.position.set(x, RAIL_TOP_Y + radius, z);
    wheel.castShadow = true;
    parent.add(wheel);
    kit.wheels.push({ mesh: wheel, radius });
  }
}

function addWagons(kit, count, style) {
  const height = style.height ?? 0.62;
  const floorY = 0.96;
  for (let i = 0; i < count; i += 1) {
    const wagon = new THREE.Group();
    addBox(wagon, [2.4, 0.16, 1.35], [0, 0.84, 0], FRAME_MAT);
    addBox(wagon, [2.4, 0.08, 1.4], [0, floorY, 0], style.body);

    if (style.hopper) {
      for (const z of [-1, 1]) {
        const side = addBox(wagon, [2.4, height, 0.08], [0, floorY + height / 2, z * 0.74], style.body);
        side.rotation.x = z * 0.22;
      }
      for (const x of [-1.16, 1.16]) {
        addBox(wagon, [0.08, height, 1.5], [x, floorY + height / 2, 0], style.body);
      }
      for (const x of [-0.35, 0.35]) {
        const chute = addBox(wagon, [0.5, 0.35, 0.9], [x, 0.62, 0], style.body);
        chute.rotation.z = x > 0 ? 0.3 : -0.3;
      }
    } else {
      for (const z of [-0.66, 0.66]) {
        addBox(wagon, [2.4, height, 0.08], [0, floorY + height / 2, z], style.body);
      }
      for (const x of [-1.16, 1.16]) {
        addBox(wagon, [0.08, height, 1.24], [x, floorY + height / 2, 0], style.body);
      }
    }
    if (style.ribs) {
      for (let x = -0.9; x <= 0.91; x += 0.6) {
        for (const z of [-0.71, 0.71]) {
          addBox(wagon, [0.07, height, 0.04], [x, floorY + height / 2, z], style.ribs);
        }
      }
    }
    if (style.rim) {
      const top = floorY + height + 0.03;
      for (const z of [-0.68, 0.68]) addBox(wagon, [2.44, 0.07, 0.12], [0, top, z], style.rim);
      for (const x of [-1.18, 1.18]) addBox(wagon, [0.12, 0.07, 1.4], [x, top, 0], style.rim);
      addBox(wagon, [2.3, 0.06, 0.04], [0, 0.72, 0.7], style.rim);
      addBox(wagon, [2.3, 0.06, 0.04], [0, 0.72, -0.7], style.rim);
    }
    addBox(wagon, [0.3, 0.1, 0.1], [WAGON_HALF + 0.15, 0.8, 0], FRAME_MAT);
    for (const x of [-0.75, 0.75]) addAxle(kit, wagon, x, 0.22, style.wheel ?? WHEEL_MAT);

    const load = new THREE.Group();
    load.position.y = floorY + 0.04 + (height - 0.62) * 0.6;
    addBox(load, [2.2, 0.45, 1.2], [0, 0.225, 0], MINERAL_MATERIALS[COAL]);
    const heap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.38, 4), MINERAL_MATERIALS[COAL]);
    heap.rotation.y = Math.PI / 4;
    heap.scale.set(1.8, 1, 1);
    heap.position.y = 0.45 + 0.19;
    heap.castShadow = true;
    load.add(heap);
    load.visible = false;
    wagon.add(load);
    kit.loads.push(load);

    kit.group.add(wagon);
    kit.cars.push({ object: wagon, offset: -i * WAGON_PITCH, half: WAGON_HALF });
  }
}

function steamLoco(kit, o) {
  const { length: L, boilerRadius: r, wheelRadius: wr, axles } = o;
  const width = o.width ?? 1;
  const frameY = 0.86 + (wr - 0.22);
  const loco = new THREE.Group();

  addBox(loco, [L, 0.22, 1.35 * width], [0, frameY, 0], o.frame);
  addBox(loco, [0.14, 0.3, 1.5 * width], [L / 2 - 0.07, frameY - 0.14, 0], o.beam);

  const cabLength = o.cabLength ?? 1.05;
  const boilerLength = L - cabLength - 0.3;
  const boilerX = L / 2 - 0.2 - boilerLength / 2;
  const boilerY = frameY + 0.11 + r;
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(r, r, boilerLength, 20), o.boiler);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(boilerX, boilerY, 0);
  boiler.castShadow = true;
  loco.add(boiler);

  if (o.nose) {
    const nose = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), o.boiler);
    nose.rotation.z = -Math.PI / 2;
    nose.scale.set(1, 0.75, 1);
    nose.position.set(boilerX + boilerLength / 2, boilerY, 0);
    nose.castShadow = true;
    loco.add(nose);
  }

  const chimneyHeight = 0.6 * (o.chimneyScale ?? 1);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, chimneyHeight, 12), o.chimney);
  chimney.position.set(boilerX + boilerLength / 2 - 0.45, boilerY + r + chimneyHeight / 2 - 0.08, 0);
  chimney.castShadow = true;
  loco.add(chimney);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), o.dome);
  dome.position.set(boilerX - 0.1, boilerY + r - 0.06, 0);
  dome.castShadow = true;
  loco.add(dome);

  for (const k of o.bands ?? []) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.04, 0.08, 20), o.trim);
    band.rotation.z = Math.PI / 2;
    band.position.set(boilerX + k * boilerLength, boilerY, 0);
    loco.add(band);
  }

  const cabHeight = 1.35 * (o.cabScale ?? 1);
  const cabX = -L / 2 + cabLength / 2;
  addBox(loco, [cabLength, cabHeight, 1.4 * width], [cabX, frameY + 0.11 + cabHeight / 2, 0], o.cab);
  addBox(loco, [cabLength + 0.25, 0.12, 1.62 * width], [cabX, frameY + 0.17 + cabHeight, 0], o.roof);
  for (const z of [-1, 1]) {
    addBox(loco, [cabLength * 0.5, 0.45, 0.04], [cabX, frameY + cabHeight * 0.72, z * 0.71 * width], FRAME_MAT);
  }

  if (o.deflectors) {
    for (const z of [-1, 1]) {
      addBox(loco, [1.1, 0.95, 0.05], [boilerX + boilerLength / 2 - 0.55, boilerY + 0.05, z * (r + 0.14)], o.frame);
    }
  }
  if (o.pilot) {
    const pilot = addBox(loco, [0.45, 0.35, 1.3], [L / 2 + 0.1, 0.55, 0], o.beam);
    pilot.rotation.z = -0.5;
  }
  if (o.lamp) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 12), o.lamp);
    lamp.rotation.z = Math.PI / 2;
    lamp.position.set(boilerX + boilerLength / 2 + (o.nose ? r * 0.7 : 0.05), boilerY + r * 0.55, 0);
    loco.add(lamp);
  }

  for (const x of axles) addAxle(kit, loco, x, wr, o.wheel ?? WHEEL_MAT);
  addAhead(kit, loco, L);
}

function buildSteamTrain(kit, capacity) {
  const green = new THREE.MeshStandardMaterial({ color: 0x2f5a3f, roughness: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8d3a32, roughness: 0.7 });
  addWagons(kit, capacity, { body: new THREE.MeshStandardMaterial({ color: 0x6e4a32, roughness: 0.85 }) });
  steamLoco(kit, {
    length: 3.2,
    boilerRadius: 0.52,
    wheelRadius: 0.22,
    axles: [1.05, 0.2, -1.0],
    boiler: green,
    cab: green,
    dome: green,
    roof: FRAME_MAT,
    frame: FRAME_MAT,
    beam: red,
    chimney: FRAME_MAT,
  });
}

function buildDieselTrain(kit, capacity) {
  const red = new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.55 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xefe3c4, roughness: 0.6 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x5c6166, roughness: 0.6, metalness: 0.3 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c21b, roughness: 0.5 });
  addWagons(kit, capacity, {
    body: new THREE.MeshStandardMaterial({ color: 0x86929b, roughness: 0.55, metalness: 0.35 }),
    ribs: new THREE.MeshStandardMaterial({ color: 0x5d676f, roughness: 0.6, metalness: 0.3 }),
    height: 0.72,
  });

  const L = 3.8;
  const loco = new THREE.Group();
  addBox(loco, [L, 0.25, 1.42], [0, 0.82, 0], FRAME_MAT);
  for (const x of [-1.05, 1.05]) {
    addBox(loco, [1.4, 0.3, 1.2], [x, 0.58, 0], grey);
    addAxle(kit, loco, x - 0.4, 0.2);
    addAxle(kit, loco, x + 0.4, 0.2);
  }
  addBox(loco, [2.3, 1.0, 1.1], [0.62, 1.45, 0], red);
  addBox(loco, [1.25, 1.6, 1.42], [-1.22, 1.75, 0], red);
  addBox(loco, [L - 0.1, 0.16, 1.44], [0, 1.1, 0], cream);
  addBox(loco, [2.32, 0.1, 1.12], [0.62, 1.7, 0], cream);
  addBox(loco, [1.4, 0.1, 1.55], [-1.22, 2.6, 0], grey);
  for (const z of [-0.72, 0.72]) {
    addBox(loco, [0.8, 0.5, 0.03], [-1.22, 2.05, z], FRAME_MAT);
    addBox(loco, [2.2, 0.05, 0.05], [0.62, 1.3, z * 0.8], yellow);
  }
  addBox(loco, [0.03, 0.45, 1.0], [-0.585, 2.05, 0], FRAME_MAT);
  addBox(loco, [0.04, 0.6, 0.8], [1.78, 1.45, 0], FRAME_MAT);
  for (let k = 0; k < 4; k += 1) {
    addBox(loco, [0.05, 0.05, 0.7], [1.81, 1.25 + k * 0.13, 0], grey);
  }
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xe8c860 }),
  );
  lamp.position.set(1.79, 1.85, 0);
  loco.add(lamp);
  for (const z of [-0.2, 0.2]) {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.3, 8), grey);
    horn.rotation.z = Math.PI / 2;
    horn.position.set(-1.0, 2.75, z);
    loco.add(horn);
  }
  addAhead(kit, loco, L);
}

function buildOreTrain(kit, capacity) {
  const blue = new THREE.MeshStandardMaterial({ color: 0x24477a, roughness: 0.55 });
  const lightBlue = new THREE.MeshStandardMaterial({ color: 0x7fa6d6, roughness: 0.5 });
  const rust = new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.9 });
  addWagons(kit, capacity, { body: rust, hopper: true, height: 0.7 });

  const tender = new THREE.Group();
  addBox(tender, [2.2, 0.18, 1.35], [0, 0.84, 0], FRAME_MAT);
  addBox(tender, [2.1, 0.85, 1.35], [0, 1.37, 0], blue);
  addBox(tender, [2.12, 0.08, 1.37], [0, 1.2, 0], lightBlue);
  const coalTop = addBox(tender, [1.6, 0.25, 1.1], [0.1, 1.85, 0], MINERAL_MATERIALS[COAL]);
  coalTop.rotation.z = 0.08;
  for (const x of [-0.65, 0.65]) addAxle(kit, tender, x);
  addAhead(kit, tender, 2.2);

  steamLoco(kit, {
    length: 3.4,
    boilerRadius: 0.5,
    wheelRadius: 0.24,
    axles: [1.0, 0.1, -0.8],
    boiler: blue,
    cab: blue,
    dome: lightBlue,
    roof: lightBlue,
    frame: FRAME_MAT,
    beam: lightBlue,
    chimney: FRAME_MAT,
    trim: lightBlue,
    bands: [-0.3, 0.3],
    pilot: true,
    chimneyScale: 1.3,
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xe8c860 }),
  });
}

function buildHeavyTrain(kit, capacity) {
  const black = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.45, metalness: 0.2 });
  const red = new THREE.MeshStandardMaterial({ color: 0xa3231b, roughness: 0.55 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.35, metalness: 0.8 });
  addWagons(kit, capacity, {
    body: new THREE.MeshStandardMaterial({ color: 0x2e3d33, roughness: 0.8 }),
    ribs: red,
    height: 0.8,
  });
  steamLoco(kit, {
    length: 4.4,
    boilerRadius: 0.7,
    wheelRadius: 0.33,
    width: 1.14,
    cabLength: 1.2,
    cabScale: 1.1,
    axles: [1.5, 0.7, -0.1, -0.9],
    boiler: black,
    cab: black,
    dome: black,
    roof: red,
    frame: black,
    beam: red,
    chimney: black,
    wheel: red,
    trim: steel,
    bands: [-0.35, 0, 0.35],
    deflectors: true,
    chimneyScale: 0.8,
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xe8c860 }),
  });
}

function buildGoldTrain(kit, capacity) {
  const violet = new THREE.MeshStandardMaterial({ color: 0x3f2461, roughness: 0.4, metalness: 0.3 });
  addWagons(kit, capacity, {
    body: new THREE.MeshStandardMaterial({ color: 0x4b2a6b, roughness: 0.5, metalness: 0.2 }),
    rim: BRASS_MAT,
    wheel: BRASS_MAT,
    height: 0.66,
  });
  steamLoco(kit, {
    length: 3.9,
    boilerRadius: 0.58,
    wheelRadius: 0.26,
    axles: [1.2, 0.35, -0.5, -1.35],
    boiler: violet,
    cab: violet,
    dome: BRASS_MAT,
    roof: BRASS_MAT,
    frame: FRAME_MAT,
    beam: BRASS_MAT,
    chimney: BRASS_MAT,
    wheel: BRASS_MAT,
    trim: BRASS_MAT,
    bands: [-0.4, -0.15, 0.1, 0.35],
    nose: true,
    chimneyScale: 0.7,
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffd76a }),
  });
}

function capacityOf(run) {
  return MODELS_BY_ID[run.modelId].capacity;
}

function runLabel(run) {
  const same = game.runs.filter((item) => item.modelId === run.modelId);
  const index = same.findIndex((item) => item.id === run.id) + 1;
  const name = MODELS_BY_ID[run.modelId].name;
  return same.length > 1 ? `${name} ${index}` : name;
}

function copyCost(model) {
  if (model.id === "dampf") return { [COAL]: 3 };
  return model.cost;
}

function buyLabel(model) {
  const again = game.runs.some((run) => run.modelId === model.id);
  const cost = formatCost(copyCost(model));
  const verb = again ? "Noch eine kaufen" : "Kaufen";
  return cost ? `${verb} (${cost})` : verb;
}

function routeOf(run) {
  if (run.target === GOLD && game.built.gold) return "gold";
  if (run.target === IRON && game.built.iron) return "iron";
  return "short";
}

function desiredPath(run) {
  return routes[routeOf(run)][run.sim?.path?.platform ?? 0];
}

function routeName(path) {
  if (path.route === "gold") return "auf die Goldstrecke";
  if (path.route === "iron") return "auf die Eisenstrecke";
  return "auf die kurze Kohlestrecke";
}

function toSharedS(path, s) {
  const here = wrap(s, path.length);
  if (here < HEAD_SHARED_S) return here;
  const offset = path.length - routes[path.route][0].length;
  if (here >= TAIL_SHARED_S + offset) return here - offset;
  return null;
}

function fromSharedS(path, shared) {
  if (shared < HEAD_SHARED_S) return shared;
  return shared + path.length - routes[path.route][0].length;
}

function platformLoad(run) {
  const load = PLATFORMS.map(() => 0);
  for (const other of game.runs) {
    if (other === run || !other.sim.phase) continue;
    if (other.sim.phase.stop?.station) load[other.sim.path.platform] += 1;
  }
  return load;
}

function choosePlatform(run) {
  const shared = toSharedS(run.sim.path, run.sim.s);
  if (shared === null) return;
  const load = platformLoad(run);
  let best = 0;
  for (let k = 1; k < game.platforms; k += 1) {
    if (load[k] < load[best]) best = k;
  }
  const path = routes[run.sim.path.route][best];
  if (path === run.sim.path) return;
  run.sim.path = path;
  run.sim.s = fromSharedS(path, shared);
}

function routeStops(path) {
  const stops = [{ id: "station", s: path.stationS, wait: stationWait(), station: true }];
  for (const mine of mines) {
    const s = path.spots[mine.mineral];
    if (s !== undefined) stops.push({ id: mine.mineral, s, wait: STOP_WAIT.mine, mine });
  }
  return stops;
}

function wantsStop(run, stop) {
  if (stop.station) return true;
  if (run.sim.path.route !== routeOf(run)) return false;
  return stop.mine.mineral === run.target && run.cargo.length < capacityOf(run);
}

function nextStop(run) {
  const length = run.sim.path.length;
  const here = wrap(run.sim.s, length);
  let best = null;
  for (const stop of routeStops(run.sim.path)) {
    if (!wantsStop(run, stop)) continue;
    let distance = wrap(stop.s - here, length);
    if (distance < 0.5) distance += length;
    if (!best || distance < best.distance) best = { stop, distance };
  }
  return best;
}

function focusedRun() {
  return game.runs.find((run) => run.id === game.focusId) ?? game.runs[0];
}

function bootRuns() {
  for (const entry of game.savedRuns) createRun(entry.modelId, entry.target, entry.id);
}

function nextRunId(modelId) {
  if (!game.runs.some((run) => run.id === modelId)) return modelId;
  let n = 2;
  while (game.runs.some((run) => run.id === `${modelId}-${n}`)) n += 1;
  return `${modelId}-${n}`;
}

function createRun(modelId, target, id = nextRunId(modelId)) {
  const mesh = createTrainMesh(MODELS_BY_ID[modelId]);
  scene.add(mesh.group);
  const run = {
    id,
    modelId,
    target,
    cargo: [],
    mesh,
    sim: {
      path: desiredPath({ target }),
      s: 0,
      odometer: 0,
      phase: null,
      record: null,
    },
  };
  game.runs.push(run);
  for (let k = 0; k < game.platforms; k += 1) {
    const path = routes[run.sim.path.route][k];
    run.sim.path = path;
    run.sim.s = path.stationS;
    if (!overlaps(run, path.stationS)) break;
  }
  if (overlaps(run, run.sim.s)) {
    run.sim.path = routes[run.sim.path.route][0];
    run.sim.s = run.sim.path.stationS;
  }
  separateFromOthers(run);
  const stationS = run.sim.path.stationS;
  const stationDistance = wrap(stationS - run.sim.s, run.sim.path.length);
  const station = routeStops(run.sim.path)[0];
  if (stationDistance < 1.5 && !overlaps(run, stationS)) {
    run.sim.s = stationS;
    startStop(run, station);
  } else {
    run.sim.phase = {
      type: "drive",
      time: 0,
      from: run.sim.s,
      distance: stationDistance,
      profile: driveProfile(stationDistance),
      stop: station,
    };
    run.sim.record = { stop: station, kind: "idle", before: [], loaded: [], removed: [] };
    renderRun(run);
  }
  return run;
}

function trainSamples(run, s) {
  const back = Math.min(...run.mesh.cars.map((car) => car.offset - car.half));
  const front = Math.max(...run.mesh.cars.map((car) => car.offset + car.half));
  const points = [];
  for (let distance = back; distance <= front; distance += 1.2) {
    points.push(run.sim.path.point(s + distance));
  }
  points.push(run.sim.path.point(s + front));
  return points;
}

function consistHits(run, s, other, otherS) {
  const mine = trainSamples(run, s);
  const theirs = trainSamples(other, otherS);
  for (const a of mine) {
    for (const b of theirs) {
      if ((a.x - b.x) ** 2 + (a.z - b.z) ** 2 < TRAIN_CLEARANCE ** 2) return true;
    }
  }
  return false;
}

function consistGap(run, s, other) {
  const mine = trainSamples(run, s);
  const theirs = trainSamples(other, other.sim.s);
  let min = Infinity;
  for (const a of mine) {
    for (const b of theirs) min = Math.min(min, (a.x - b.x) ** 2 + (a.z - b.z) ** 2);
  }
  return Math.sqrt(min);
}

function overlaps(run, s) {
  return game.runs.some((other) => other !== run && consistHits(run, s, other, other.sim.s));
}

function movementBlocker(run, s, ignore = null) {
  return (
    game.runs.find((other) => {
      if (other === run || other === ignore) return false;
      const next = consistGap(run, s, other);
      if (next >= TRAIN_CLEARANCE) return false;
      return next <= consistGap(run, run.sim.s, other) + 0.01;
    }) ?? null
  );
}

function movementBlocked(run, s, ignore = null) {
  return Boolean(movementBlocker(run, s, ignore));
}

function zonesTouched(points) {
  return SWITCH_ZONES.filter((zone) =>
    points.some((p) => p.x >= zone.x0 && p.x <= zone.x1 && p.z >= zone.z0 && p.z <= zone.z1),
  );
}

function switchBlocked(run, s) {
  const now = zonesTouched(trainSamples(run, run.sim.s));
  const entering = zonesTouched(trainSamples(run, s)).filter((zone) => !now.includes(zone));
  if (entering.length === 0) return false;
  return game.runs.some(
    (other) => other !== run && zonesTouched(trainSamples(other, other.sim.s)).some((zone) => entering.includes(zone)),
  );
}

function shouldYield(run, other) {
  const here = run.sim.path.point(run.sim.s);
  const there = other.sim.path.point(other.sim.s);
  const dot = here.dx * there.dx + here.dz * there.dz;
  if (dot > 0.5) {
    return (there.x - here.x) * here.dx + (there.z - here.z) * here.dz > 0;
  }
  const dRun = Math.hypot(here.x - WEST_X, here.z);
  const dOther = Math.hypot(there.x - WEST_X, there.z);
  if (Math.abs(dRun - dOther) > 1) return dRun > dOther;
  return run.id > other.id;
}

function pathBlockedBy(run, other, reach) {
  for (let distance = 0; distance <= reach; distance += 1.5) {
    if (consistHits(run, run.sim.s + distance, other, other.sim.s)) return true;
  }
  return false;
}

function retargetDrive(run) {
  const next = nextStop(run);
  if (!next) return;
  run.sim.phase = {
    type: "drive",
    time: 0,
    from: run.sim.s,
    distance: next.distance,
    profile: driveProfile(next.distance),
    stop: next.stop,
  };
}

function yieldWay(run, other) {
  const length = run.sim.path.length;
  const start = run.sim.s;
  for (let i = 0; i < 70 && pathBlockedBy(run, other, 18); i += 1) {
    const back = wrap(run.sim.s - 0.8, length);
    if (movementBlocked(run, back, other)) break;
    run.sim.s = back;
  }
  if (consistHits(other, other.sim.s + 1.5, run, run.sim.s)) {
    run.sim.s = start;
    return false;
  }
  retargetDrive(run);
  run.sim.yieldTo = other.id;
  run.sim.yieldMark = other.sim.odometer;
  run.sim.yieldTicks = 0;
  return true;
}

function holdingYield(run) {
  if (!run.sim.yieldTo) return false;
  const other = game.runs.find((item) => item.id === run.sim.yieldTo);
  run.sim.yieldTicks += 1;
  const passed = other && other.sim.odometer - run.sim.yieldMark > 14 && !pathBlockedBy(run, other, 18);
  if (!other || passed || run.sim.yieldTicks > 200) run.sim.yieldTo = null;
  return Boolean(run.sim.yieldTo);
}

function breakStandoff(run) {
  const other = movementBlocker(run, run.sim.s + 1.5);
  if (!other || other.sim.yieldTo === run.id) return;
  if (movementBlocker(other, other.sim.s + 1.5) !== run) return;
  const [loser, winner] = shouldYield(run, other) ? [run, other] : [other, run];
  if (!yieldWay(loser, winner)) yieldWay(winner, loser);
}

function separateFromOthers(run) {
  const length = run.sim.path.length;
  let s = run.sim.s;
  for (let i = 0; i < 40 && overlaps(run, s); i += 1) s = wrap(s - 3, length);
  run.sim.s = s;
}

function driveProfile(distance) {
  const accelTime = TOP_SPEED / ACCELERATION;
  const accelDistance = 0.5 * ACCELERATION * accelTime ** 2;
  if (distance >= 2 * accelDistance) {
    return { accelTime, peak: TOP_SPEED, duration: 2 * accelTime + (distance - 2 * accelDistance) / TOP_SPEED };
  }
  const t = Math.sqrt(distance / ACCELERATION);
  return { accelTime: t, peak: ACCELERATION * t, duration: 2 * t };
}

function drivenDistance({ accelTime, peak, duration }, distance, time) {
  if (time >= duration) return distance;
  if (time <= accelTime) return 0.5 * ACCELERATION * time * time;
  if (time <= duration - accelTime) return 0.5 * peak * accelTime + peak * (time - accelTime);
  const left = duration - time;
  return distance - 0.5 * ACCELERATION * left * left;
}

function simulateRun(run, dt) {
  const sim = run.sim;
  const phase = sim.phase;
  if (holdingYield(run)) return;

  if (phase.type === "stop") {
    if (phase.stop.station) applyStationChanges(run);
    if (phase.time >= phase.duration) {
      let next = nextStop(run);
      if (!next) return;
      if (next.stop.station && game.platforms > 1) {
        const before = { path: sim.path, s: sim.s };
        choosePlatform(run);
        if (sim.path !== before.path && overlaps(run, sim.s)) {
          sim.path = before.path;
          sim.s = before.s;
        }
        next = nextStop(run);
        if (!next) return;
      }
      if (movementBlocked(run, sim.s + 1.5)) {
        breakStandoff(run);
        return;
      }
      if (switchBlocked(run, sim.s + 1.5)) return;
      sim.phase = {
        type: "drive",
        time: 0,
        from: sim.s,
        distance: next.distance,
        profile: driveProfile(next.distance),
        stop: next.stop,
      };
      return;
    }
    phase.time += dt;
    return;
  }

  const nextTime = phase.time + dt;
  const proposed = phase.from + drivenDistance(phase.profile, phase.distance, Math.min(nextTime, phase.profile.duration));
  if (movementBlocked(run, proposed)) {
    breakStandoff(run);
    return;
  }
  if (switchBlocked(run, proposed)) return;

  const previous = sim.s;
  phase.time = nextTime;
  if (phase.time >= phase.profile.duration) {
    const arrived = phase.from + phase.distance;
    sim.odometer += arrived - previous;
    sim.s = wrap(arrived, sim.path.length);
    startStop(run, phase.stop);
    return;
  }
  sim.s = proposed;
  sim.odometer += proposed - previous;
}

function applyStationChanges(run) {
  const path = desiredPath(run);
  if (run.sim.path === path) return;
  run.sim.path = path;
  run.sim.s = path.stationS;
  showMessage(`${runLabel(run)} fährt jetzt ${routeName(path).replace("auf ", "")}.`, "good");
}

function startStop(run, stop) {
  const wanted = wantsStop(run, stop);
  run.sim.phase = { type: "stop", time: 0, duration: wanted ? stop.wait : 0, stop };
  const before = run.cargo;
  const record = { stop, kind: "idle", before, loaded: [], removed: [] };

  if (stop.station) {
    record.removed = [...before];
    if (before.length > 0) {
      record.kind = "deliver";
      const counts = {};
      for (const unit of before) {
        counts[unit.mineral] = (counts[unit.mineral] ?? 0) + 1;
        game.stock[unit.mineral] += 1;
      }
      const summary = Object.entries(counts)
        .map(([mineral, count]) => `${count}× ${MINERALS[mineral].name}`)
        .join(", ");
      showMessage(`${runLabel(run)}: ${summary} ins Lager`, "good");
    }
  } else if (wanted) {
    const mineral = stop.mine.mineral;
    record.kind = "load";
    record.loaded = Array.from({ length: capacityOf(run) - before.length }, (_, k) => ({
      mineral,
      wagon: before.length + k,
    }));
  }

  run.cargo = before.filter((unit) => !record.removed.includes(unit)).concat(record.loaded);
  run.sim.record = record;
  updateHud();
}

function renderTrains() {
  for (const run of game.runs) renderRun(run);
  renderYard();
}

function renderRun(run) {
  const { mesh, sim } = run;
  for (const car of mesh.cars) {
    placeOnPath(car.object, sim.path, sim.s + car.offset);
  }
  for (const wheel of mesh.wheels) {
    wheel.mesh.rotation.z = -sim.odometer / wheel.radius;
  }

  const record = sim.record;
  const stopped = sim.phase.type === "stop";
  const t = stopped ? sim.phase.time : 0;
  const ramp = (from, to) => smoothstep(THREE.MathUtils.clamp((t - from) / (to - from), 0, 1));
  const levels = mesh.loads.map(() => ({ mineral: null, level: 0 }));
  const show = (unit, level) => {
    if (levels[unit.wagon]) levels[unit.wagon] = { mineral: unit.mineral, level };
  };
  if (stopped) {
    for (const unit of record.before) {
      show(unit, record.removed.includes(unit) ? 1 - ramp(0.4, 2.6) : 1);
    }
    for (const unit of record.loaded) show(unit, ramp(0.5, 3.5));
  } else {
    for (const unit of run.cargo) show(unit, 1);
  }

  for (const [i, load] of mesh.loads.entries()) {
    const { mineral, level } = levels[i];
    load.visible = level > 0.01;
    load.scale.y = Math.max(level, 0.01);
    if (mineral) {
      for (const part of load.children) part.material = MINERAL_MATERIALS[mineral];
    }
  }
}

function renderYard() {
  const pending = { [COAL]: 0, [IRON]: 0, [GOLD]: 0 };
  let lampOn = false;
  const unloading = PLATFORMS.map(() => Array.from({ length: MAX_WAGONS }, () => null));
  const loading = new Map(mines.map((mine) => [mine, Array.from({ length: MAX_WAGONS }, () => null)]));

  for (const run of game.runs) {
    const record = run.sim.record;
    const stopped = run.sim.phase.type === "stop";
    if (!stopped || !record) continue;
    const t = run.sim.phase.time;
    const ramp = (from, to) => smoothstep(THREE.MathUtils.clamp((t - from) / (to - from), 0, 1));
    const delivering = record.stop.station && record.kind === "deliver";
    if (delivering) {
      const left = 1 - ramp(0.4, 2.6);
      for (const unit of record.removed) pending[unit.mineral] += left;
      if (t < 3.1) lampOn = true;
      if (t > 0.4 && t < 2.4) {
        const slots = unloading[run.sim.path.platform];
        for (const unit of record.removed) {
          if (!slots[unit.wagon]) slots[unit.wagon] = { unit, t };
        }
      }
    }
    const mine = record.stop.mine;
    if (mine && record.kind === "load" && t > 0.3 && t < 3.4) {
      const slots = loading.get(mine);
      for (const unit of record.loaded) {
        if (!slots[unit.wagon]) slots[unit.wagon] = t;
      }
    }
  }

  for (const mineral of [COAL, IRON, GOLD]) {
    const shown = game.stock[mineral] - pending[mineral];
    const heap = station.heaps[mineral];
    heap.visible = shown > 0.01;
    const size = Math.min(0.35 + Math.max(shown, 0) * 0.06, 1.3);
    heap.scale.set(size, Math.max(Math.min(0.3 + Math.max(shown, 0) * 0.08, 1.6), 0.01), size);
  }
  station.platforms.forEach((platform, k) => {
    for (const [i, stream] of platform.streams.entries()) {
      const drop = unloading[k][i];
      stream.visible = Boolean(drop);
      if (drop) {
        for (const lump of stream.children) lump.material = MINERAL_MATERIALS[drop.unit.mineral];
        animateStream(stream, drop.t, 1.3, 1.6);
      }
    }
  });
  const lampColor = lampOn ? 0x3ddc62 : 0x3a3a3a;
  station.lamp.material.color.setHex(lampColor);
  station.lamp.material.emissive.setHex(lampColor === 0x3a3a3a ? 0x000000 : lampColor);

  for (const mine of mines) {
    const slots = loading.get(mine);
    for (const [i, stream] of mine.streams.entries()) {
      stream.visible = slots[i] != null;
      if (stream.visible) animateStream(stream, slots[i], 1.1, 0.25);
    }
  }
}

function cargoLabel(run) {
  const counts = {};
  for (const unit of run.cargo) counts[unit.mineral] = (counts[unit.mineral] ?? 0) + 1;
  const names = Object.entries(counts)
    .map(([mineral, count]) => (count > 1 ? `${count}× ${MINERALS[mineral].name}` : MINERALS[mineral].name))
    .join(", ");
  return `${names || "leer"} (${run.cargo.length}/${capacityOf(run)})`;
}

function updateHud() {
  const focus = focusedRun();
  hud.cargo.textContent = focus ? cargoLabel(focus) : "leer";
  hud.stock.textContent = stockLabel();
  hud.trainName.textContent = focus ? runLabel(focus) : "—";

  const smelterReady = refreshSmelterHud();
  const stationReady = refreshStationHud();
  const platformReady = refreshPlatformHud();
  let anyReady = smelterReady || stationReady || platformReady;
  for (const [id, line] of Object.entries(LINES)) {
    const ui = hud.lines[id];
    const built = game.built[id];
    const locked = id === "gold" && !game.built.iron;
    const affordable = canAfford(line.cost);
    const canBuild = !built && !locked && affordable;
    anyReady ||= canBuild;
    ui.card.classList.toggle("done", built);
    ui.card.classList.toggle("locked", locked);
    ui.button.hidden = built || locked;
    ui.button.classList.toggle("waiting", !affordable);
    ui.bar.style.width = `${built || locked ? (built ? 100 : 0) : Math.min(costProgress(line.cost), 1) * 100}%`;
    if (built) {
      ui.status.textContent =
        id === "iron"
          ? "Gebaut ✓ In der Zugliste „Kohle“ oder „Eisen“ wählen."
          : "Gebaut ✓ In der Zugliste „Gold“ wählen.";
    } else if (locked) {
      ui.status.textContent = "Gesperrt: erst das Gleis zur Eisenmine bauen.";
    } else if (canBuild) {
      ui.status.textContent = "Genug Erz! Jetzt bauen, die Gleise erscheinen sofort.";
      ui.button.textContent = `Jetzt bauen (${formatCost(line.cost)})`;
    } else {
      ui.status.textContent = `Dir fehlen noch ${formatMissing(line.cost)}.`;
      ui.button.textContent = `Bauen (${formatStocked(line.cost)})`;
    }
  }
  hud.buildPanel.classList.toggle("ready", anyReady);
  saveGame();

  for (const model of TRAIN_MODELS) {
    const { button } = trainItems[model.id];
    const cost = copyCost(model);
    const affordable = canAfford(cost);
    button.classList.toggle("waiting", !affordable);
    button.textContent = affordable ? buyLabel(model) : `Kaufen: fehlen ${formatMissing(cost)}`;
    for (const run of game.runs) {
      if (run.modelId !== model.id) continue;
      const row = ensureInstanceRow(run);
      row.label.textContent = runLabel(run);
      row.item.classList.toggle("running", game.focusId === run.id);
      row.cargo.textContent = `Ladung: ${cargoLabel(run)}`;
      row.follow.classList.toggle("active", game.focusId === run.id && trackCamera?.follow);
      for (const destButton of row.destButtons) {
        const target = destButton.dataset.target;
        destButton.hidden = (target === IRON && !game.built.iron) || (target === GOLD && !game.built.gold);
        destButton.classList.toggle("active", run.target === target);
      }
    }
  }
}

let messageTimer;

function showMessage(text, tone) {
  hud.message.textContent = text;
  hud.message.className = `message ${tone} visible`;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    hud.message.classList.remove("visible");
  }, 4000);
}

function createTrainList() {
  const items = {};
  for (const model of TRAIN_MODELS) {
    const item = document.createElement("div");
    item.className = `train-item rarity-${model.id}`;
    const head = document.createElement("div");
    head.className = "train-head";
    const name = document.createElement("strong");
    name.textContent = model.name;
    const rarity = document.createElement("span");
    rarity.className = "train-rarity";
    rarity.textContent = model.rarity;
    const cap = document.createElement("span");
    cap.className = "train-cap";
    cap.textContent = `${model.capacity} ${model.capacity === 1 ? "Einheit" : "Einheiten"}`;
    head.append(name, rarity, cap);
    const look = document.createElement("div");
    look.className = "train-desc";
    look.textContent = model.look;
    const instances = document.createElement("div");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "build-button train-button";
    button.addEventListener("click", () => {
      buyTrain(model.id);
      button.blur();
    });
    item.append(head, look, instances, button);
    hud.trainList.append(item);
    items[model.id] = { item, button, instances, rows: new Map() };
  }
  return items;
}

function ensureInstanceRow(run) {
  const bucket = trainItems[run.modelId];
  const existing = bucket.rows.get(run.id);
  if (existing) return existing;
  const item = document.createElement("div");
  item.className = "train-instance";
  const label = document.createElement("div");
  label.className = "train-instance-label";
  const dest = document.createElement("div");
  dest.className = "target-choice train-dest";
  const destLabel = { [COAL]: "Kohle", [IRON]: "Eisen", [GOLD]: "Gold" };
  const destButtons = [COAL, IRON, GOLD].map((target) => {
    const destButton = document.createElement("button");
    destButton.type = "button";
    destButton.dataset.target = target;
    destButton.textContent = destLabel[target];
    destButton.addEventListener("click", () => {
      setRunTarget(run.id, target);
      destButton.blur();
    });
    dest.append(destButton);
    return destButton;
  });
  const cargo = document.createElement("div");
  cargo.className = "train-cargo";
  const follow = document.createElement("button");
  follow.type = "button";
  follow.className = "train-follow";
  follow.textContent = "Kamera folgen";
  follow.addEventListener("click", () => {
    focusTrain(run.id);
    follow.blur();
  });
  item.append(label, dest, cargo, follow);
  bucket.instances.append(item);
  const row = { item, label, destButtons, cargo, follow };
  bucket.rows.set(run.id, row);
  return row;
}

function buyTrain(modelId) {
  const model = MODELS_BY_ID[modelId];
  const cost = copyCost(model);
  if (!canAfford(cost)) {
    showMessage(`${model.name}: es fehlen noch ${formatMissing(cost)}.`, "bad");
    return;
  }
  payCost(cost);
  game.owned.add(modelId);
  const run = createRun(modelId, COAL);
  showMessage(`${runLabel(run)} fährt los. Das Ziel stellst du darunter ein.`, "good");
  updateHud();
}

function setRunTarget(id, target) {
  const run = game.runs.find((candidate) => candidate.id === id);
  if (!run) return;
  if (target === IRON && !game.built.iron) return;
  if (target === GOLD && !game.built.gold) return;
  run.target = target;
  updateHud();
  const path = desiredPath(run);
  const atStation = run.sim.phase.type === "stop" && run.sim.phase.stop.station;
  if (path === run.sim.path || atStation) return;
  showMessage(`${runLabel(run)} wechselt am Bahnhof ${routeName(path)}.`, "good");
}

function focusTrain(id) {
  if (!game.runs.some((run) => run.id === id)) return;
  game.focusId = id;
  if (trackCamera) {
    const run = focusedRun();
    trackCamera.path = run.sim.path;
    trackCamera.s = run.sim.s + run.mesh.centerOffset;
    trackCamera.setFollow(true);
  }
  updateHud();
}

function setupShop() {
  for (const id of Object.keys(LINES)) {
    hud.lines[id].button.addEventListener("click", () => {
      buildLine(id);
      hud.lines[id].button.blur();
    });
  }
  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key.toLowerCase() === "b") {
      if (!game.built.iron) buildLine("iron");
      else if (!game.built.gold) buildLine("gold");
      else if (PLATFORM_COSTS[game.platforms] && canAfford(PLATFORM_COSTS[game.platforms])) buildPlatform();
      else if (!game.built.smelter) buildSmelter();
      else upgradeStation();
    }
  });
  hud.smelter.button.addEventListener("click", () => {
    buildSmelter();
    hud.smelter.button.blur();
  });
  hud.smelter.steel.addEventListener("click", () => {
    startSmelt("steel");
    hud.smelter.steel.blur();
  });
  hud.smelter.goldbar.addEventListener("click", () => {
    startSmelt("goldbar");
    hud.smelter.goldbar.blur();
  });
  hud.platform.button.addEventListener("click", () => {
    buildPlatform();
    hud.platform.button.blur();
  });
  hud.stationUpgrade.button.addEventListener("click", () => {
    upgradeStation();
    hud.stationUpgrade.button.blur();
  });
}

function buildLine(id) {
  const line = LINES[id];
  if (game.built[id]) return;
  if (id === "gold" && !game.built.iron) {
    showMessage("Die Goldstrecke gibt es erst nach dem Gleis zur Eisenmine.", "bad");
    return;
  }
  if (!canAfford(line.cost)) {
    showMessage(`${line.name}: es fehlen noch ${formatMissing(line.cost)}.`, "bad");
    return;
  }

  payCost(line.cost);
  game.built[id] = true;
  applyBuiltWorld();
  if (id === "iron") {
    showMessage("Gleis zur Eisenmine gebaut! Die kurze Kohlestrecke bleibt. Das Ziel wählst du je Zug.", "good");
    showcaseCamera(new THREE.Vector3(60, 0.6, -30), 95, 5000);
  } else {
    showMessage("Goldstrecke gebaut! In der Zugliste wählst du, welcher Zug hinfährt.", "good");
    showcaseCamera(new THREE.Vector3(15, 0.6, 62), 150, 6000);
  }
  updateHud();
}

function applyBuiltWorld() {
  tracks.iron.visible = game.built.iron;
  tracks.ironPlanned.visible = !game.built.iron;
  tracks.ironSign.visible = !game.built.iron;
  hud.ironMine.hidden = !game.built.iron;

  tracks.gold.visible = game.built.gold;
  tracks.goldPlanned.visible = !game.built.gold;
  tracks.goldSign.visible = !game.built.gold;
  hud.goldMine.hidden = !game.built.gold;

  tracks.shortTurn.visible = true;
  smelter.group.visible = game.built.smelter;
  tracks.platforms.forEach((track, index) => {
    if (!track) return;
    track.built.visible = index < game.platforms;
    track.planned.visible = index === game.platforms;
    station.platforms[index].group.visible = index < game.platforms;
  });
  station.shed.visible = game.stationLevel >= 1;
  station.ramp.visible = game.stationLevel >= 2;
}

function stockLabel() {
  const parts = [];
  for (const mineral of [COAL, IRON, GOLD]) {
    const count = game.stock[mineral];
    if (count > 0) parts.push(`${count}× ${MINERALS[mineral].name}`);
  }
  if (game.smelted.steel > 0) parts.push(`${game.smelted.steel}× Stahl`);
  if (game.smelted.goldbar > 0) parts.push(`${game.smelted.goldbar}× Goldbarren`);
  return parts.join(", ") || "leer";
}

function pileOf(id) {
  return id === "steel" || id === "goldbar" ? game.smelted : game.stock;
}

function costList(cost = {}) {
  return Object.keys(GOOD_NAMES).flatMap((id) => (cost[id] ? [[id, cost[id]]] : []));
}

function formatCost(cost) {
  return costList(cost)
    .map(([id, amount]) => `${amount} ${GOOD_NAMES[id]}`)
    .join(" + ");
}

function formatStocked(cost) {
  return costList(cost)
    .map(([id, amount]) => `${Math.min(pileOf(id)[id], amount)}/${amount} ${GOOD_NAMES[id]}`)
    .join(", ");
}

function formatMissing(cost) {
  return costList(cost)
    .filter(([id, amount]) => pileOf(id)[id] < amount)
    .map(([id, amount]) => `${amount - pileOf(id)[id]} ${GOOD_NAMES[id]}`)
    .join(" und ");
}

function canAfford(cost) {
  return costList(cost).every(([id, amount]) => pileOf(id)[id] >= amount);
}

function payCost(cost) {
  for (const [id, amount] of costList(cost)) pileOf(id)[id] -= amount;
}

function costProgress(cost) {
  const list = costList(cost);
  if (list.length === 0) return 1;
  return Math.min(...list.map(([id, amount]) => pileOf(id)[id] / amount));
}

function refreshSmelterHud() {
  const ui = hud.smelter;
  const built = game.built.smelter;
  const locked = !game.built.iron;
  const affordable = canAfford(SMELTER.cost);
  const canBuild = !built && !locked && affordable;
  ui.card.classList.toggle("done", built);
  ui.card.classList.toggle("locked", locked && !built);
  ui.button.hidden = built || locked;
  ui.button.classList.toggle("waiting", !built && !affordable);
  ui.jobs.hidden = !built;
  const job = built ? RECIPES[game.smelter.recipe] : null;
  for (const recipe of Object.values(RECIPES)) {
    const button = ui[recipe.id];
    const busy = Boolean(job);
    button.disabled = busy;
    button.classList.toggle("waiting", !busy && !canAfford(recipe.cost));
    button.textContent =
      job?.id === recipe.id
        ? `Schmilzt ${recipe.name} …`
        : canAfford(recipe.cost)
          ? `${recipe.name} gießen (${formatCost(recipe.cost)})`
          : `${recipe.name}: fehlen ${formatMissing(recipe.cost)}`;
  }
  if (built) {
    ui.status.textContent = job
      ? `${job.name} ist im Ofen.`
      : "Gießt Stahl und Goldbarren. Damit baust du den Bahnhof aus.";
    ui.bar.style.width = job ? `${Math.min(game.smelter.time / job.time, 1) * 100}%` : "100%";
  } else if (locked) {
    ui.status.textContent = "Gesperrt: erst das Gleis zur Eisenmine bauen.";
    ui.bar.style.width = "0%";
  } else if (canBuild) {
    ui.status.textContent = "Genug Erz! Die Hütte steht sofort neben den Lagern.";
    ui.button.textContent = `Jetzt bauen (${formatCost(SMELTER.cost)})`;
    ui.bar.style.width = "100%";
  } else {
    ui.status.textContent = `Dir fehlen noch ${formatMissing(SMELTER.cost)}.`;
    ui.button.textContent = `Bauen (${formatStocked(SMELTER.cost)})`;
    ui.bar.style.width = `${Math.min(costProgress(SMELTER.cost), 1) * 100}%`;
  }
  return canBuild || (built && !job && Object.values(RECIPES).some((recipe) => canAfford(recipe.cost)));
}

function refreshStationHud() {
  const ui = hud.stationUpgrade;
  const next = STATION_UPGRADES[game.stationLevel];
  ui.card.classList.toggle("done", !next);
  if (!next) {
    ui.title.textContent = "Bahnhof · Schnellrampe";
    ui.desc.textContent = "Die Wagen sind in einer Sekunde leer.";
    ui.status.textContent = "Voll ausgebaut.";
    ui.bar.style.width = "100%";
    ui.button.hidden = true;
    return false;
  }
  const affordable = canAfford(next.cost);
  ui.title.textContent = `Bahnhof · ${next.name}`;
  ui.desc.textContent = `${next.desc} Dauert dann ${next.wait} Sekunden.`;
  ui.button.hidden = false;
  ui.button.classList.toggle("waiting", !affordable);
  ui.button.textContent = affordable
    ? `Ausbauen (${formatCost(next.cost)})`
    : `Ausbauen: fehlen ${formatMissing(next.cost)}`;
  ui.status.textContent = affordable
    ? "Genug Material. Der Bahnhof kann wachsen."
    : "Stahl und Goldbarren kommen aus der Schmelzhütte.";
  ui.bar.style.width = `${Math.min(costProgress(next.cost), 1) * 100}%`;
  return affordable;
}

function refreshPlatformHud() {
  const ui = hud.platform;
  const cost = PLATFORM_COSTS[game.platforms];
  ui.card.classList.toggle("done", !cost);
  if (!cost) {
    ui.title.textContent = `Bahnhofsgleise · ${game.platforms} Gleise`;
    ui.desc.textContent = "Mehrere Züge entladen gleichzeitig.";
    ui.status.textContent = "Alle Gleise gebaut.";
    ui.bar.style.width = "100%";
    ui.button.hidden = true;
    return false;
  }
  const affordable = canAfford(cost);
  ui.title.textContent = `Bahnhofsgleise · Gleis ${game.platforms + 1}`;
  ui.desc.textContent = "Ein weiteres Gleis mit eigener Entladestelle. Züge nehmen automatisch ein freies Gleis.";
  ui.button.hidden = false;
  ui.button.classList.toggle("waiting", !affordable);
  ui.button.textContent = affordable ? `Bauen (${formatCost(cost)})` : `Bauen: fehlen ${formatMissing(cost)}`;
  ui.status.textContent =
    game.platforms === 1 ? "Jetzt hat der Bahnhof 1 Gleis." : `Jetzt hat der Bahnhof ${game.platforms} Gleise.`;
  ui.bar.style.width = `${Math.min(costProgress(cost), 1) * 100}%`;
  return affordable;
}

function buildPlatform() {
  const cost = PLATFORM_COSTS[game.platforms];
  if (!cost) return;
  if (!canAfford(cost)) {
    showMessage(`Gleis ${game.platforms + 1}: es fehlen noch ${formatMissing(cost)}.`, "bad");
    return;
  }
  payCost(cost);
  game.platforms += 1;
  applyBuiltWorld();
  const platform = PLATFORMS[game.platforms - 1];
  showMessage(`Gleis ${game.platforms} ist fertig. Züge verteilen sich jetzt auf die Gleise.`, "good");
  showcaseCamera(new THREE.Vector3(platform.unloadX, 1, platform.z), 30, 4500);
  updateHud();
}

function updateSmelter(dt) {
  const recipe = RECIPES[game.smelter.recipe];
  if (!game.built.smelter || !recipe) return;
  game.smelter.time += dt;
  if (game.smelter.time < recipe.time) return;
  game.smelter.recipe = null;
  game.smelter.time = 0;
  game.smelted[recipe.id] += 1;
  showMessage(`Die Schmelzhütte hat 1 ${recipe.name} gegossen.`, "good");
  updateHud();
}

function startSmelt(id) {
  const recipe = RECIPES[id];
  if (!game.built.smelter || !recipe || game.smelter.recipe) return;
  if (!canAfford(recipe.cost)) {
    showMessage(`${recipe.name}: es fehlen noch ${formatMissing(recipe.cost)}.`, "bad");
    return;
  }
  payCost(recipe.cost);
  game.smelter.recipe = id;
  game.smelter.time = 0;
  showMessage(`Die Schmelzhütte schmilzt ${recipe.name}.`, "good");
  updateHud();
}

function upgradeStation() {
  const next = STATION_UPGRADES[game.stationLevel];
  if (!next) return;
  if (!canAfford(next.cost)) {
    showMessage(`${next.name}: es fehlen noch ${formatMissing(next.cost)}.`, "bad");
    return;
  }
  payCost(next.cost);
  game.stationLevel += 1;
  applyBuiltWorld();
  showMessage(`${next.name} steht. Die Züge entladen jetzt in ${next.wait} Sekunden.`, "good");
  showcaseCamera(station.group.position.clone().set(18, 2, -4), 28, 4500);
  updateHud();
}

function renderSmelter(time) {
  if (!smelter.group.visible) return;
  const active = Boolean(game.smelter.recipe);
  const pulse = active ? 0.55 + Math.sin(time * 8) * 0.35 : 0.12;
  smelter.mouth.material.emissiveIntensity = pulse;
  smelter.glow.intensity = active ? 1.5 + Math.sin(time * 8) * 0.45 : 0;
  const rise = active ? 0.38 : 0.07;
  for (const puff of smelter.smoke.children) {
    const k = (time * rise + puff.userData.phase) % 1;
    puff.position.set(Math.sin(k * 6.2) * 0.18, k * 2.1, Math.cos(k * 5.1) * 0.14);
    puff.scale.setScalar(0.45 + k * 1.5);
    puff.material.opacity = (1 - k) * (active ? 0.55 : 0.18);
  }
  if (active && RECIPES[game.smelter.recipe]) {
    hud.smelter.bar.style.width = `${Math.min(game.smelter.time / RECIPES[game.smelter.recipe].time, 1) * 100}%`;
  }
  const steelShown = Math.min(game.smelted.steel, smelter.steelStack.children.length);
  const goldShown = Math.min(game.smelted.goldbar, smelter.goldStack.children.length);
  smelter.steelStack.children.forEach((ingot, index) => {
    ingot.visible = index < steelShown;
  });
  smelter.goldStack.children.forEach((ingot, index) => {
    ingot.visible = index < goldShown;
  });
}

function buildSmelter() {
  if (game.built.smelter) return;
  if (!game.built.iron) {
    showMessage("Die Schmelzhütte gibt es erst nach dem Gleis zur Eisenmine.", "bad");
    return;
  }
  if (!canAfford(SMELTER.cost)) {
    showMessage(`${SMELTER.name}: es fehlen noch ${formatMissing(SMELTER.cost)}.`, "bad");
    return;
  }
  payCost(SMELTER.cost);
  game.built.smelter = true;
  applyBuiltWorld();
  showMessage("Schmelzhütte steht. Sie gießt Stahl und Goldbarren für den Bahnhof.", "good");
  showcaseCamera(smelter.group.position.clone().setY(1.2), 22, 4500);
  updateHud();
}

function sanitizeTarget(target) {
  if (target === IRON && game.built.iron) return IRON;
  if (target === GOLD && game.built.gold) return GOLD;
  return COAL;
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || (data.v !== 1 && data.v !== 2)) return;
    for (const id of ["iron", "gold", "smelter"]) {
      if (data.built?.[id]) game.built[id] = true;
    }
    if (Array.isArray(data.owned)) {
      for (const id of data.owned) {
        if (MODELS_BY_ID[id]) game.owned.add(id);
      }
    }
    const savedRuns = [];
    const used = new Set();
    const remember = (entry) => {
      const modelId = MODELS_BY_ID[entry?.modelId] ? entry.modelId : MODELS_BY_ID[entry?.id] ? entry.id : null;
      if (!modelId) return;
      let id = typeof entry.id === "string" && !used.has(entry.id) ? entry.id : modelId;
      if (used.has(id)) {
        let n = 2;
        while (used.has(`${modelId}-${n}`)) n += 1;
        id = `${modelId}-${n}`;
      }
      used.add(id);
      game.owned.add(modelId);
      savedRuns.push({ id, modelId, target: sanitizeTarget(entry.target) });
    };
    if (Array.isArray(data.runs)) {
      for (const entry of data.runs) remember(entry);
    } else if (Array.isArray(data.owned)) {
      for (const id of data.owned) remember({ id, target: id === data.trainId ? data.target : COAL });
    }
    if (savedRuns.length === 0) remember({ id: "dampf", modelId: "dampf", target: COAL });
    game.savedRuns = savedRuns;
    if (savedRuns.some((run) => run.id === data.focusId)) game.focusId = data.focusId;
    for (const mineral of [COAL, IRON, GOLD]) {
      const count = data.stock?.[mineral];
      if (Number.isFinite(count)) game.stock[mineral] = Math.max(0, Math.floor(count));
    }
    for (const kind of ["steel", "goldbar"]) {
      const count = data.smelted?.[kind];
      if (Number.isFinite(count)) game.smelted[kind] = Math.max(0, Math.floor(count));
    }
    if (Number.isInteger(data.platforms)) {
      game.platforms = Math.min(PLATFORMS.length, Math.max(1, data.platforms));
    }
    if (Number.isInteger(data.stationLevel)) {
      game.stationLevel = Math.min(STATION_UPGRADES.length, Math.max(0, data.stationLevel));
    }
    if (RECIPES[data.smelter?.recipe]) {
      game.smelter.recipe = data.smelter.recipe;
      game.smelter.time = Number.isFinite(data.smelter.time) ? Math.max(0, data.smelter.time) : 0;
    }
  } catch {
    // kaputter Speicher bleibt ungenutzt
  }
}

function saveGame() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        v: 2,
        built: game.built,
        owned: [...game.owned],
        focusId: game.focusId,
        runs: game.runs.map((run) => ({ id: run.id, modelId: run.modelId, target: run.target })),
        stock: game.stock,
        smelted: game.smelted,
        smelter: game.smelter,
        stationLevel: game.stationLevel,
        platforms: game.platforms,
      }),
    );
  } catch {
    // privates Fenster ohne Speicher
  }
}

function showcaseCamera(point, distance, duration) {
  const offset = camera.position.clone().sub(controls.target);
  const restore = trackCamera.showcase?.restore ?? offset.length();
  if (offset.length() < distance) offset.setLength(distance);
  camera.position.copy(controls.target).add(offset);
  trackCamera.showcase = { point, until: performance.now() + duration, restore };
}

function setupTrackCamera() {
  const focus = trackFocus();
  controls.target.copy(focus);
  camera.position.copy(focus).add(CAMERA_OFFSET);
  controls.update();

  const setFollow = (follow) => {
    trackCamera.follow = follow;
    hud.follow.classList.toggle("active", follow);
    updateHud();
  };
  trackCamera.setFollow = setFollow;
  setFollow(true);

  const jumpTo = (path, s) => {
    setFollow(false);
    trackCamera.showcase = null;
    trackCamera.path = path;
    trackCamera.s = s + focusedRun().mesh.centerOffset;
  };
  hud.slider.addEventListener("input", () => {
    setFollow(false);
    trackCamera.s = Number(hud.slider.value);
  });
  hud.slider.addEventListener("change", () => hud.slider.blur());
  hud.follow.addEventListener("click", () => setFollow(!trackCamera.follow));
  hud.station.addEventListener("click", () => jumpTo(focusedRun().sim.path, focusedRun().sim.path.stationS));
  hud.coalMine.addEventListener("click", () => jumpTo(paths.short, paths.short.spots[COAL]));
  hud.ironMine.addEventListener("click", () => jumpTo(paths.iron, paths.iron.spots[IRON]));
  hud.goldMine.addEventListener("click", () => jumpTo(paths.gold, paths.gold.spots[GOLD]));

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    const key = event.key.toLowerCase();
    if (key === "f") setFollow(!trackCamera.follow);
    if (["a", "d", "arrowleft", "arrowright"].includes(key)) {
      trackCamera.keys.add(key);
      event.preventDefault();
    }
  });
  window.addEventListener("keyup", (event) => {
    trackCamera.keys.delete(event.key.toLowerCase());
  });
  window.addEventListener("blur", () => trackCamera.keys.clear());
}

function trackFocus() {
  const p = trackCamera.path.point(trackCamera.s);
  return new THREE.Vector3(p.x, 0.6, p.z);
}

function updateTrackCamera(dt) {
  const { keys } = trackCamera;
  const direction =
    (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
    (keys.has("a") || keys.has("arrowleft") ? 1 : 0);

  if (direction !== 0) {
    trackCamera.setFollow(false);
    trackCamera.showcase = null;
    trackCamera.s += direction * TRACK_PAN_SPEED * dt;
  }
  if (trackCamera.follow) {
    const run = focusedRun();
    trackCamera.path = run.sim.path;
    trackCamera.s = run.sim.s + run.mesh.centerOffset;
  }
  const length = trackCamera.path.length;
  trackCamera.s = wrap(trackCamera.s, length);
  hud.slider.max = length.toFixed(1);
  if (document.activeElement !== hud.slider) {
    hud.slider.value = trackCamera.s.toFixed(1);
  }

  const { showcase } = trackCamera;
  const showing = showcase && performance.now() < showcase.until;
  const ease = 1 - Math.exp(-dt * 5);
  const delta = (showing ? showcase.point.clone() : trackFocus()).sub(controls.target);
  delta.multiplyScalar(ease);
  controls.target.add(delta);
  camera.position.add(delta);

  if (showcase && !showing) {
    const offset = camera.position.clone().sub(controls.target);
    const length = THREE.MathUtils.lerp(offset.length(), showcase.restore, ease);
    camera.position.copy(controls.target).add(offset.setLength(length));
    if (Math.abs(length - showcase.restore) < 0.5) trackCamera.showcase = null;
  }
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function addBox(group, [w, h, d], [x, y, z], material) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  box.position.set(x, y, z);
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);
  return box;
}
