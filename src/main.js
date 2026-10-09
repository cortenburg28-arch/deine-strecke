import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createScenery, createSky, createSmoke, heightAt, shapeTerrain } from "./scenery.js";
import { createDiamondWorld, loadModels } from "./diamond-world.js";
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

const SIDING_GAP = 5.6;
const SIDINGS = [
  {
    id: "coal",
    bit: 1,
    mineral: "coal",
    name: "Kohle-Abschnitt",
    needs: null,
    cost: { coal: 6 },
    chuteX: 0,
    z: -55 + SIDING_GAP,
    corners: [[31, -55], [24, -55 + SIDING_GAP], [-23, -55 + SIDING_GAP], [-30, -55]],
    zone: { x0: -34, x1: -19, z0: -56.5, z1: -48 },
    camera: [0, 1, -52],
  },
  {
    id: "iron",
    bit: 2,
    mineral: "iron",
    name: "Eisen-Abschnitt",
    needs: "iron",
    cost: { coal: 6, iron: 4 },
    chuteX: 63,
    z: -55 + SIDING_GAP,
    corners: [[83, -55], [77, -55 + SIDING_GAP], [52, -55 + SIDING_GAP], [46, -55]],
    zone: { x0: 43.5, x1: 50.5, z0: -56.5, z1: -48 },
    camera: [65, 1, -52],
  },
  {
    id: "gold",
    bit: 4,
    mineral: "gold",
    name: "Gold-Abschnitt",
    needs: "gold",
    cost: { iron: 4, gold: 3 },
    chuteX: 10,
    z: 120 + SIDING_GAP,
    corners: [[57, 120], [50, 120 + SIDING_GAP], [-23, 120 + SIDING_GAP], [-30, 120]],
    zone: { x0: -34, x1: -19, z0: 118.5, z1: 127.5 },
    camera: [10, 1, 123],
  },
];
const ROUTE_SIDINGS = { short: ["coal"], iron: ["iron", "coal"], gold: ["gold"] };
const SIDINGS_BY_ID = Object.fromEntries(SIDINGS.map((siding) => [siding.id, siding]));

const EXPRESS_WEST_ZONE = { ...SWITCH_ZONES[0], z1: 4 };
const IRON_MERGE_ZONE = { x0: 32, x1: 50.5, z0: -56.5, z1: -43 };

const DIAMOND = "diamond";
const DIAMOND_X = 250;
const DIAMOND_SIDING_X = DIAMOND_X - SIDING_GAP;
const DIAMOND_LANE_Z = FAR_Z + SIDING_GAP;
const DIAMOND_LOAD_Z = -36;
const DIAMOND_SOUTH_Z = -100;
const DIAMOND_PORTALS = [150.5, 219.5];
const DIAMOND_ROUTES = ["diamond0", "diamond1", "diamond2"];
const DIAMOND_LAYOUT = {
  trackX: DIAMOND_X,
  sidingX: DIAMOND_SIDING_X,
  loadZ: DIAMOND_LOAD_Z,
  laneZ: DIAMOND_LANE_Z,
  farZ: FAR_Z,
  portals: DIAMOND_PORTALS,
  pitch: WAGON_PITCH,
  wagons: MAX_WAGONS,
  bottom: { x: 259, z: -31 },
  store: { x: 267, z: -12 },
  plateau: { x: 314, z: -30, y: 20 },
  rig: { x: 345, z: -12 },
  cableZ: [-35, -27],
  pylonX: 281,
  workshop: { x: 45, z: 20 },
  bay: { x: 2.6, z: 18 },
  crown: { x: 10, y: 11, z: -7.4 },
  viaduct: [141, 199],
  sign: [103, 4],
};
const DIAMOND_ZONES = {
  crossing: { x0: 86, x1: 101, z0: -6, z1: 7 },
  merge: { x0: 79, x1: 101, z0: -58, z1: -43 },
  viaduct: { x0: 237, x1: 256, z0: -15, z1: 6 },
  siding: { x0: 241, x1: 256, z0: -53, z1: -45 },
  tunnel: { x0: 101, x1: 121, z0: -68, z1: -50 },
  tunnelSiding: { x0: 220, x1: 237, z0: -57, z1: -47 },
  lane: { x0: 124, x1: 141, z0: -57, z1: -47 },
};
const DIAMOND_UNLOCK = { goldbar: 100, steel: 200 };
const DIAMOND_RATES = {
  mine: 0.2,
  cable: 0.17,
  cycle: 28,
  run: 20,
  top: 25,
  buffer: 12,
  bigBuffer: 60,
  cutCost: 2,
  cutTime: 6,
  bigChance: 0.12,
  bigValue: 5,
  loadGap: 0.4,
  minWait: 8,
  maxWait: 20,
};
const DIAMOND_GROUPS = [
  {
    id: "cable",
    name: "Seilbahn",
    base: "Wenige Kübel, und ab und zu macht die Seilbahn Pause.",
    upgrades: [
      { name: "Mehr Kübel", cost: { steel: 13 }, desc: "Doppelt so viele Kübel am Seil, doppelter Nachschub." },
      { name: "Stärkeres Seil", cost: { steel: 20, goldbar: 4 }, desc: "Ein dickeres Seil: die Kübel fahren 50 % schneller." },
      {
        name: "Zweite Seilbahn",
        cost: { steel: 38, goldbar: 10 },
        desc: "Eine zweite Linie direkt daneben bringt nochmal doppelt so viel.",
      },
      { name: "Großkübel", cost: { steel: 25, goldbar: 13 }, desc: "Jeder Kübel trägt doppelt so viel." },
      {
        name: "Elektroantrieb",
        cost: { steel: 50, goldbar: 20 },
        desc: "Ein Elektromotor: die Seilbahn läuft ohne Pause, an den Masten gehen Lichter an.",
      },
    ],
  },
  {
    id: "mine",
    name: "Diamantmine",
    base: "Ein Stollen im Berg, die Bergleute graben von Hand.",
    upgrades: [
      { name: "Förderturm", cost: { steel: 25, goldbar: 7 }, desc: "Ein Förderturm über dem Schacht: die Mine fördert doppelt so viel." },
      { name: "Zweiter Stollen", cost: { steel: 38, goldbar: 13 }, desc: "Ein zweiter Stollen in den Berg: 50 % mehr Diamanten." },
      {
        name: "Brecher",
        cost: { steel: 32, goldbar: 15 },
        desc: "Ein Steinbrecher legt ab und zu einen großen Diamanten frei. Der zählt fünffach.",
      },
      {
        name: "Grubenbahn",
        cost: { steel: 44, goldbar: 13 },
        desc: "Kleine Loren fahren an der Mine hin und her: 50 % mehr Förderung.",
      },
      {
        name: "Tiefbohrung",
        cost: { steel: 75, goldbar: 30 },
        desc: "Ein Bohrturm oben auf dem Berg holt die tiefen Adern: doppelte Förderung.",
      },
    ],
  },
  {
    id: "line",
    name: "Ladestation & Strecke",
    base: "Ein kleiner Bunker am Gleis, ein Ladegleis, die Strecke macht einen weiten Bogen ums Tal.",
    upgrades: [
      {
        name: "Großes Diamantlager",
        cost: { steel: 20 },
        desc: "Ein Lagerhaus an der Ladestation: fünfmal so viel Platz für Rohdiamanten.",
      },
      {
        name: "Zweites Ladegleis",
        cost: { steel: 32, goldbar: 10 },
        desc: "Ein zweites Gleis an der Ladestation. Zwei Züge laden gleichzeitig.",
      },
      {
        name: "Viadukt",
        cost: { steel: 63, goldbar: 20 },
        desc: "Eine Steinbrücke übers Tal: die Diamantstrecke wird viel kürzer.",
      },
      {
        name: "Tunnel durch den Berg",
        cost: { steel: 100, goldbar: 30 },
        desc: "Ein Tunnel durch den Hügel: die Rückfahrt wird noch kürzer.",
      },
      {
        name: "Zweigleisige Diamantstrecke",
        cost: { steel: 125, goldbar: 38 },
        desc: "Ein zweites Gleis auf der ganzen Diamantstrecke. Schnelle Züge überholen, viel mehr Züge haben Platz.",
      },
    ],
  },
  {
    id: "proc",
    name: "Verarbeitung & Züge",
    base: "Rohdiamanten liegen nur im Lager herum.",
    upgrades: [
      {
        name: "Diamantschleiferei",
        cost: { steel: 50, goldbar: 25 },
        desc: "Eine Werkstatt beim Bahnhof schleift aus je 2 Rohdiamanten einen funkelnden Diamanten.",
      },
      {
        name: "Waschanlage",
        cost: { steel: 38, goldbar: 19 },
        desc: "Die Rohdiamanten kommen gewaschen in die Schleiferei: sie schleift doppelt so schnell.",
      },
      {
        name: "Diamant-Express",
        cost: { cutdiamond: 7 },
        desc: "Schaltet einen elektrischen Schnellzug frei, dreimal so schnell wie normale Züge.",
      },
      {
        name: "Panzerwagen",
        cost: { cutdiamond: 10 },
        desc: "Gepanzerte Wagen: Züge zur Diamantmine laden doppelt so viel.",
      },
      {
        name: "Diamantkrone für den Bahnhof",
        cost: { cutdiamond: 30 },
        desc: "Eine funkelnde Krone auf dem Bahnhofsturm. Alle Züge entladen sofort.",
      },
    ],
  },
];
const DIAMOND_GROUPS_BY_ID = Object.fromEntries(DIAMOND_GROUPS.map((group) => [group.id, group]));

const TOP_SPEED = 8;
const MAX_SPEED_FACTOR = 3;
const ACCELERATION = 2.5;
const TRAIN_CLEARANCE = 2.2;
const SPAWN_CLEARANCE = 7;
const ZONE_LOOKAHEAD = 40;
const SIM_STEP = 0.05;
const STALL_LIMIT = 40;
const STALL_GIVE_UP = 600;
const SIGNAL_PATIENCE = 400;
const DEPOT_REACH = 70;
const SIGNAL_REACH = 90;
let depotTimer = 0;
const STOP_WAIT = { station: 3.5, mine: 4 };

const COAL = "coal";
const IRON = "iron";
const GOLD = "gold";
const MINERALS = {
  [COAL]: { name: "Kohle", color: 0x1b1b1e },
  [IRON]: { name: "Eisenerz", color: 0xa4553a },
  [GOLD]: { name: "Golderz", color: 0xf5c518 },
  [DIAMOND]: { name: "Rohdiamanten", color: 0xbfe9ff },
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
  [DIAMOND]: new THREE.MeshStandardMaterial({
    color: MINERALS[DIAMOND].color,
    emissive: 0x4f9fd0,
    emissiveIntensity: 0.6,
    roughness: 0.08,
    metalness: 0.35,
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
const PLAN_ORDER = ["goldbar", "steel"];
const MAX_PLAN_COUNT = 9;
const SMELTER_UPGRADES = [
  {
    name: "Blasebalg",
    cost: { steel: 2, goldbar: 1 },
    desc: "Ein Blasebalg facht das Feuer an. Die Hütte gießt doppelt so schnell.",
    speed: 2,
    coal: 2,
    batch: 1,
  },
  {
    name: "Hochofen",
    cost: { steel: 4, goldbar: 2 },
    desc: "Ein hoher Schlot: dreimal so schnell, und jeder Barren braucht nur noch 1 Kohle.",
    speed: 3,
    coal: 1,
    batch: 1,
  },
  {
    name: "Doppelofen",
    cost: { steel: 8, goldbar: 4 },
    desc: "Ein zweiter Ofen daneben: gießt zwei Barren auf einmal, wenn genug Material da ist.",
    speed: 3,
    coal: 1,
    batch: 2,
  },
];
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
const LINE_ROUTES = [
  { target: COAL, name: "Kohlestrecke", trains: "Kohlezüge", base: 4, needs: null },
  { target: IRON, name: "Eisenstrecke", trains: "Eisenzüge", base: 5, needs: "iron" },
];
const LINE_ROUTES_BY_TARGET = Object.fromEntries(LINE_ROUTES.map((line) => [line.target, line]));
const TRAIN_UPGRADES = [
  {
    name: "Hochbordwagen",
    cost: { [COAL]: { [COAL]: 12, [IRON]: 6 }, [IRON]: { [COAL]: 8, [IRON]: 10 } },
    desc: "Höhere Bordwände: jeder Zug lädt 50 % mehr, bei gleicher Länge.",
    capacity: 1.5,
  },
  {
    name: "Schnellverladung",
    cost: { [COAL]: { steel: 3, goldbar: 1 }, [IRON]: { steel: 4, goldbar: 1 } },
    desc: "Große Ladetrichter an der Mine: die Wagen sind in 2 statt 4 Sekunden voll.",
    load: 2,
  },
  {
    name: "Starke Loks",
    cost: { [COAL]: { steel: 6, goldbar: 3 }, [IRON]: { steel: 8, goldbar: 3 } },
    desc: "Stärkere Kessel und Motoren: die Züge fahren 25 % schneller.",
    speed: 1.25,
  },
  {
    name: "Großraumwagen",
    cost: { [COAL]: { steel: 10, goldbar: 5 }, [IRON]: { steel: 12, goldbar: 6 } },
    desc: "Breite Großraumwagen: jeder Zug lädt doppelt so viel wie am Anfang.",
    capacity: 2,
  },
];
const TRACK_UPGRADES = [
  {
    name: "Blocksignale",
    cost: { [COAL]: { [COAL]: 15, [IRON]: 8 }, [IRON]: { [COAL]: 10, [IRON]: 12 } },
    desc: "Signale vor jeder Weiche: ein Zug fährt erst in die Kreuzung, wenn dahinter Platz ist. 2 Züge mehr.",
    slots: 2,
  },
  {
    name: "Stellwerk",
    cost: { [COAL]: { steel: 5, goldbar: 2 }, [IRON]: { steel: 6, goldbar: 3 } },
    desc: "Ein Stellwerk am Bahnhof schickt Züge erst los, wenn die Ausfahrt frei ist. 2 Züge mehr.",
    slots: 2,
  },
  {
    name: "Depot-Ringgleis",
    cost: { [COAL]: { steel: 10, goldbar: 4 }, [IRON]: { steel: 12, goldbar: 5 } },
    desc: "Ein Abstellring am Depot: stockt es draußen, wartet ein Zug kurz im Depot statt auf der Strecke. 2 Züge mehr.",
    slots: 2,
  },
];
const GOOD_NAMES = {
  [COAL]: "Kohle",
  [IRON]: "Eisenerz",
  [GOLD]: "Golderz",
  [DIAMOND]: "Rohdiamanten",
  steel: "Stahl",
  goldbar: "Goldbarren",
  cutdiamond: "Diamanten",
};
const SMELTED_GOODS = ["steel", "goldbar", "cutdiamond"];
const SAVE_KEY = "deine-strecke-v1";
const SAVE_URL = "/api/save";
const FILE_SAVE_DELAY = 2000;
let fileSaveTimer = null;
let lastFileSave = null;

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
  {
    id: "blitz",
    name: "Blitz-Express",
    rarity: "Mythisch",
    look: "Weißer Hochgeschwindigkeitszug, doppelt so schnell wie alle anderen. Stromlinien-Nase und Lichtbänder.",
    capacity: 5,
    speed: 2,
    cost: { steel: 4, goldbar: 2 },
    build: buildBlitzTrain,
  },
  {
    id: "diamant",
    name: "Diamant-Express",
    rarity: "Diamant",
    look: "Elektrischer Schnellzug in Silber und Eisblau, dreimal so schnell wie normale Züge. Bezahlt wird mit Diamanten.",
    capacity: 5,
    speed: 3,
    cost: { cutdiamond: 7 },
    locked: () => game.diamond.levels.proc < 3,
    build: buildDiamondTrain,
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
  diamondMine: document.querySelector("#cam-diamond"),
  diamond: {
    card: document.querySelector("#build-diamond-card"),
    bar: document.querySelector("#build-diamond-bar"),
    status: document.querySelector("#build-diamond-status"),
    button: document.querySelector("#build-diamond"),
    flow: document.querySelector("#diamond-flow"),
    upgrades: document.querySelector("#diamond-upgrades"),
    groups: {},
  },
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
    upgrade: document.querySelector("#smelter-upgrade"),
    upgradeStage: document.querySelector("#smelter-stage"),
    upgradeDesc: document.querySelector("#smelter-upgrade-desc"),
    upgradeButton: document.querySelector("#smelter-upgrade-button"),
    auto: document.querySelector("#smelt-auto"),
    autoStatus: document.querySelector("#smelt-auto-status"),
    planButtons: document.querySelectorAll(".auto-plan button"),
    planCounts: {
      goldbar: document.querySelector("#plan-goldbar"),
      steel: document.querySelector("#plan-steel"),
    },
  },
  platform: {
    card: document.querySelector("#build-platform-card"),
    title: document.querySelector("#platform-title"),
    desc: document.querySelector("#platform-desc"),
    bar: document.querySelector("#build-platform-bar"),
    status: document.querySelector("#build-platform-status"),
    button: document.querySelector("#build-platform"),
  },
  express: {
    card: document.querySelector("#build-express-card"),
    bar: document.querySelector("#build-express-bar"),
    status: document.querySelector("#build-express-status"),
    button: document.querySelector("#build-express"),
  },
  siding: {
    card: document.querySelector("#build-siding-card"),
    title: document.querySelector("#siding-title"),
    desc: document.querySelector("#siding-desc"),
    bar: document.querySelector("#build-siding-bar"),
    status: document.querySelector("#build-siding-status"),
    button: document.querySelector("#build-siding"),
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
const EXPRESS = {
  ironx: {
    base: "iron",
    platform: 1,
    start: [[WEST_X, 0], [-18, 0, SWITCH_RADIUS], [-11, PLATFORMS[1].z, SWITCH_RADIUS]],
    corners: [[95, PLATFORMS[1].z], [95, FAR_Z], [WEST_X, FAR_Z]],
  },
  goldx: {
    base: "gold",
    platform: 2,
    start: [[WEST_X, PLATFORMS[2].z]],
    corners: [[70, PLATFORMS[2].z], [70, GOLD_Z], [WEST_X, GOLD_Z]],
  },
};
const EXPRESS_COST = { [COAL]: 8, [IRON]: 6, [GOLD]: 4 };
for (const [id, express] of Object.entries(EXPRESS)) {
  ROUTE_MINES[id] = ROUTE_MINES[express.base];
  ROUTE_SIDINGS[id] = ROUTE_SIDINGS[express.base];
}

function buildRouteVariants(route, index, start, routeCorners) {
  const platform = PLATFORMS[index];
  const sidings = ROUTE_SIDINGS[route].map((id) => SIDINGS_BY_ID[id]);
  const masks = [0];
  for (const siding of sidings) masks.push(...masks.map((mask) => mask | siding.bit));
  const variants = {};
  for (const mask of masks) {
    const corners = [...routeCorners];
    const last = corners.pop();
    for (const siding of sidings) {
      if (mask & siding.bit) corners.push(...siding.corners.map(([x, z]) => [x, z, SWITCH_RADIUS]));
    }
    const path = createPath([...start, ...corners, last]);
    path.route = route;
    path.platform = index;
    path.mask = mask;
    path.variants = variants;
    path.stationS = start.length === 1 && index === 0 ? STATION_S : nearestS(path, platform.unloadX, platform.z);
    path.sidingTrack = {};
    path.sectionEnd = {};
    for (const [mineral, [x, z]] of Object.entries(ROUTE_MINES[route])) {
      const siding = sidings.find((candidate) => candidate.mineral === mineral && mask & candidate.bit);
      path.spots[mineral] = siding ? nearestS(path, siding.chuteX, siding.z) : nearestS(path, x, z);
      path.sidingTrack[mineral] = siding ? 1 : 0;
    }
    for (const siding of sidings) {
      const [x, z] = siding.corners[3];
      path.sectionEnd[siding.id] = nearestS(path, x, z) + 3;
    }
    if (start.length > 1 && !EXPRESS[route]) {
      path.bypassFrom = path.segments[0].len;
      path.bypassTo = path.segments[8].s0;
    }
    variants[mask] = path;
  }
  return variants[0];
}

const routes = Object.fromEntries(
  Object.keys(ROUTE_CORNERS).map((route) => [
    route,
    PLATFORMS.map((platform, index) =>
      buildRouteVariants(route, index, [[WEST_X, 0], ...platform.bypass], ROUTE_CORNERS[route]),
    ),
  ]),
);
for (const [id, express] of Object.entries(EXPRESS)) {
  const path = buildRouteVariants(id, express.platform, express.start, express.corners);
  routes[id] = PLATFORMS.map(() => path);
}
for (const [level, id] of DIAMOND_ROUTES.entries()) {
  ROUTE_SIDINGS[id] = [];
  routes[id] = PLATFORMS.map((platform, index) => buildDiamondVariants(id, index, level));
}
const paths = { short: routes.short[0], iron: routes.iron[0], gold: routes.gold[0] };

function diamondCorners(level, mask) {
  const out = level === 0 ? [[125, 0], [125, 95], [DIAMOND_X, 95]] : [[DIAMOND_X, 0]];
  const back = level === 2 ? [[DIAMOND_X, FAR_Z]] : [[DIAMOND_X, DIAMOND_SOUTH_Z], [115, DIAMOND_SOUTH_Z], [115, FAR_Z]];
  const siding = [[DIAMOND_X, -14, SWITCH_RADIUS], [DIAMOND_SIDING_X, -21, SWITCH_RADIUS]];
  if (mask === 2) {
    return [
      [100, 0, SWITCH_RADIUS],
      [107, -SIDING_GAP, SWITCH_RADIUS],
      [DIAMOND_SIDING_X, -SIDING_GAP],
      [DIAMOND_SIDING_X, DIAMOND_LANE_Z],
      [136, DIAMOND_LANE_Z, SWITCH_RADIUS],
      [129, FAR_Z, SWITCH_RADIUS],
    ];
  }
  if (mask === 1 && level === 2) {
    return [
      ...out,
      ...siding,
      [DIAMOND_SIDING_X, DIAMOND_LANE_Z],
      [232, DIAMOND_LANE_Z, SWITCH_RADIUS],
      [225, FAR_Z, SWITCH_RADIUS],
    ];
  }
  if (mask === 1) {
    return [...out, ...siding, [DIAMOND_SIDING_X, -41, SWITCH_RADIUS], [DIAMOND_X, -48, SWITCH_RADIUS], ...back];
  }
  return [...out, ...back];
}

function buildDiamondVariants(route, index, level) {
  const platform = PLATFORMS[index];
  const variants = {};
  for (const mask of level === 2 ? [0, 1, 2] : [0, 1]) {
    const path = createPath([[WEST_X, 0], ...platform.bypass, ...diamondCorners(level, mask), [WEST_X, FAR_Z]]);
    path.route = route;
    path.platform = index;
    path.mask = mask;
    path.variants = variants;
    path.stationS = index === 0 ? STATION_S : nearestS(path, platform.unloadX, platform.z);
    path.spots[DIAMOND] = nearestS(path, mask ? DIAMOND_SIDING_X : DIAMOND_X, DIAMOND_LOAD_Z);
    path.sidingTrack = { [DIAMOND]: mask ? 1 : 0 };
    path.sectionEnd = {};
    variants[mask] = path;
  }
  return variants[0];
}

function diamondPolylines() {
  const lines = [];
  for (const level of [0, 1, 2]) {
    for (const mask of level === 2 ? [0, 1, 2] : [0, 1]) {
      lines.push([[85, 0], ...diamondCorners(level, mask).map(([x, z]) => [x, z]), [85, FAR_Z]]);
    }
  }
  return lines;
}

function diamondCorridors() {
  const corridors = [];
  const west = DIAMOND_PORTALS[0] + 5.6;
  const east = DIAMOND_PORTALS[1] - 5.6;
  for (const line of diamondPolylines()) {
    for (let i = 0; i < line.length - 1; i += 1) {
      const a = line[i];
      const b = line[i + 1];
      const throughRidge = a[1] === b[1] && a[1] <= DIAMOND_LANE_Z && Math.min(a[0], b[0]) < west && Math.max(a[0], b[0]) > east;
      if (!throughRidge) {
        corridors.push({ a, b });
        continue;
      }
      const [lo, hi] = a[0] < b[0] ? [a, b] : [b, a];
      corridors.push({ a: lo, b: [west, lo[1]], capB: true }, { a: [east, hi[1]], b: hi, capA: true });
    }
  }
  return corridors;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd6e8f2);
scene.fog = new THREE.Fog(0xd2e4ee, 180, 820);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2200,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 170;
controls.maxPolarAngle = Math.PI / 2 - 0.08;

const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x5a5530, 1.05);
scene.add(hemi);

const sky = createSky(SUN_OFFSET);
scene.add(sky);

const sun = new THREE.DirectionalLight(0xffe9c7, 2.1);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
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
const BUFFER_GEO = new THREE.CylinderGeometry(0.07, 0.07, 0.16, 10).rotateZ(Math.PI / 2);
const LOAD_HALF_X = WAGON_HALF - 0.11;
const LOAD_HALF_Z = 0.59;
const LOAD_HEAP_GEO = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const LOAD_LUMP_GEO = new THREE.DodecahedronGeometry(1, 0);
const BIG_GEM_GEO = new THREE.OctahedronGeometry(1, 0);
const ARMOR_MAT = new THREE.MeshStandardMaterial({ color: 0x55606b, roughness: 0.5, metalness: 0.7 });
const RIVET_MAT = new THREE.MeshStandardMaterial({ color: 0x9aa4ad, roughness: 0.35, metalness: 0.9 });

const terrainPads = shapeTerrain({
  corridors: diamondCorridors(),
  pads: [
    { ...DIAMOND_LAYOUT.bottom, r: 11, fall: 8, y: 0 },
    { ...DIAMOND_LAYOUT.store, r: 8, fall: 6, y: 0 },
    { ...DIAMOND_LAYOUT.plateau, r: 18, fall: 12 },
    { ...DIAMOND_LAYOUT.rig, r: 6, fall: 7 },
  ],
});
DIAMOND_LAYOUT.rig.y = terrainPads[3].y;
const models = await loadModels();

scene.add(createGround());
const tracks = createTracks();
scene.add(tracks.group);
const scenery = createScenery(sceneryBlocked());
scene.add(scenery.group);
const smoke = createSmoke(scene);

const station = createStation();
const coalMine = addSidingTipple(createCoalMine(), FAR_Z);
const ironMine = addSidingTipple(createIronMine(), FAR_Z);
const goldMine = addSidingTipple(createGoldMine(), GOLD_Z);
const diamondWorld = createDiamondWorld({
  layout: DIAMOND_LAYOUT,
  heightAt,
  models,
  createSign,
  createLumpStream,
  addHeadframe,
  materials: { diamond: MINERAL_MATERIALS[DIAMOND], frame: FRAME_MAT, wheel: WHEEL_MAT, brass: BRASS_MAT },
});
const diamondMine = diamondWorld.station;
const mines = [coalMine, ironMine, goldMine, diamondMine];
const smelter = createSmelter();
for (const item of [station, coalMine, ironMine, goldMine, smelter, diamondWorld]) {
  scene.add(item.group);
}
let cableTravel = 0;
let diamondHudTimer = 0;
const DIAMOND_WINDOW = 60;
const DIAMOND_BUCKET = 2;
const diamondStats = { clock: 0, buckets: [], trips: new Map(), limit: null };
const DIAMOND_FLOW_ROWS = [
  ["mine", "stage", "Mine"],
  ["top", "store", "Bergstation"],
  ["cable", "stage", "Seilbahn"],
  ["buffer", "store", "Ladestation"],
  ["trains", "stage", "Züge"],
  ["stock", "store", "Lager am Bahnhof"],
  ["workshop", "stage", "Schleiferei"],
];
const DIAMOND_LIMIT_STORE = { cable: "top", trains: "buffer", workshop: "stock" };

const game = {
  built: { iron: false, gold: false, smelter: false },
  owned: new Set(["dampf"]),
  savedRuns: [{ id: "dampf", modelId: "dampf", target: COAL }],
  focusId: "dampf",
  runs: [],
  stock: { [COAL]: 0, [IRON]: 0, [GOLD]: 0, [DIAMOND]: 0 },
  smelted: { steel: 0, goldbar: 0, cutdiamond: 0 },
  smelter: { recipe: null, time: 0, batch: 1, auto: false, plan: { goldbar: 1, steel: 2 }, step: 0 },
  smelterLevel: 0,
  stationLevel: 0,
  platforms: 1,
  sidings: new Set(),
  express: false,
  lines: Object.fromEntries(LINE_ROUTES.map((line) => [line.target, { train: 0, track: 0 }])),
  diamond: {
    built: false,
    levels: { cable: 0, mine: 0, line: 0, proc: 0 },
    top: 0,
    buffer: 0,
    cycle: 0,
    cutting: false,
    cut: 0,
    bigFound: 0,
  },
};
loadGame(await fetchFileSave());

const clock = new THREE.Clock();
const trainItems = createTrainList();
createDiamondUpgradeList();
const lineGroups = createLineUpgradeList();
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
      renderDiamonds(clock.getElapsedTime(), 0);
      for (let i = 0; i < 12; i += 1) updateTrackCamera(0.25);
      controls.update();
      renderer.render(scene, camera);
    },
    get train() {
      return focusedRun().mesh;
    },
    debug: {
      consistHits,
      movementBlocker,
      switchBlocker,
      zonesTouched,
      trainSamples,
      activeZones,
      blockingCycle,
      buildDiamond,
      upgradeDiamond,
      mineRate,
      cableRate,
      bufferCap,
      cutTime,
      diamondFlow,
      diamondStats,
      capacityOf,
      speedOf,
      stationWait,
      buyTrain,
      setRunTarget,
      saveSnapshot,
      lineSlots,
      lineActive,
      upgradeLine,
      diamondWorld,
      heightAt,
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
  renderDiamonds(elapsed, dt);
  emitSmoke(dt);
  smoke.update(dt);
  scenery.update(dt, elapsed);
  updateTrackCamera(dt);
  controls.update();
  sky.position.copy(camera.position);
  sun.target.position.copy(controls.target);
  sun.position.copy(controls.target).add(SUN_OFFSET);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

updateHud();
tick();

function stepWorld(step) {
  for (const run of activeRuns()) simulateRun(run, step);
  unparkWaiting(step);
  updateSmelter(step);
  updateDiamonds(step);
}

function stationWait() {
  if (game.diamond.levels.proc >= 5) return 0.3;
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
  const bends = points.map((_, i) => corner(i));
  for (let i = 0; i < n; i += 1) {
    const a = bends[i];
    const b = bends[(i + 1) % n];
    const room = a.p.distanceTo(b.p);
    if (a.tangent + b.tangent <= room) continue;
    const [tight, wide] = b.radius <= a.radius ? [b, a] : [a, b];
    if (tight.angle === 0) continue;
    tight.tangent = Math.max(0, room - wide.tangent);
    tight.radius = tight.tangent / Math.tan(tight.angle / 2);
  }

  const segments = [];
  let length = 0;
  for (let i = 0; i < n; i += 1) {
    const a = bends[i];
    const b = bends[(i + 1) % n];
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

function sceneryBlocked() {
  const cells = new Map();
  const cellKey = (cx, cz) => cx * 4096 + cz;
  for (const list of Object.values(routes)) {
    for (const path of [...new Set(list)].flatMap((base) => Object.values(base.variants))) {
      for (let s = 0; s < path.length; s += 1.5) {
        const p = path.point(s);
        const key = cellKey(Math.floor(p.x / 10), Math.floor(p.z / 10));
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(p.x, p.z);
      }
    }
  }
  const { bottom, store, plateau, rig, workshop } = DIAMOND_LAYOUT;
  const boxes = [
    [-24, 44, -20, 28],
    [workshop.x - 8, workshop.x + 9, workshop.z - 6, workshop.z + 6],
    [155, 185, -25, 80],
    [bottom.x, plateau.x, bottom.z - 9, bottom.z + 9],
  ];
  const circles = [
    [5.4, -70, 24],
    [70.4, -68, 24],
    [15.4, 104, 30],
    [bottom.x, bottom.z, 15],
    [store.x, store.z, 10],
    [plateau.x, plateau.z, 27],
    [rig.x, rig.z, 9],
    [DIAMOND_PORTALS[0] - 3, -52, 9],
    [DIAMOND_PORTALS[1] + 3, -52, 9],
  ];
  return (x, z, margin) => {
    if (x < -80 || x > 400 || z < -130 || z > 160) return false;
    if (boxes.some(([x0, x1, z0, z1]) => x > x0 - margin && x < x1 + margin && z > z0 - margin && z < z1 + margin)) {
      return true;
    }
    if (circles.some(([cx, cz, r]) => (x - cx) ** 2 + (z - cz) ** 2 < (r + margin) ** 2)) return true;
    const clear = (6 + margin) ** 2;
    const cx = Math.floor(x / 10);
    const cz = Math.floor(z / 10);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const samples = cells.get(cellKey(cx + dx, cz + dz));
        if (!samples) continue;
        for (let i = 0; i < samples.length; i += 2) {
          if ((x - samples[i]) ** 2 + (z - samples[i + 1]) ** 2 < clear) return true;
        }
      }
    }
    return false;
  };
}

const smokePoint = new THREE.Vector3();

function emitSmoke(dt) {
  if (dt <= 0) return;
  for (const run of activeRuns()) {
    const { mesh, sim } = run;
    if (!mesh.smoke?.length) continue;
    const speed = Math.abs(sim.odometer - (mesh.lastOdometer ?? sim.odometer)) / dt;
    mesh.lastOdometer = sim.odometer;
    const rate = 1.2 + speed * 1.1;
    mesh.smokeDebt = (mesh.smokeDebt ?? 0) + rate * dt;
    while (mesh.smokeDebt >= 1) {
      mesh.smokeDebt -= 1;
      for (const anchor of mesh.smoke) {
        anchor.object.updateMatrixWorld();
        smokePoint.copy(anchor.local).applyMatrix4(anchor.object.matrixWorld);
        smoke.emit(smokePoint, { dark: anchor.dark, strength: Math.min(speed / TOP_SPEED, 1) });
      }
    }
  }
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
  const diamondBay = new THREE.Group();
  diamondBay.visible = false;
  {
    const { x, z } = DIAMOND_LAYOUT.bay;
    const steel = new THREE.MeshStandardMaterial({ color: 0x5d6b78, roughness: 0.45, metalness: 0.6 });
    addBox(diamondBay, [4.2, 1.1, 0.3], [x, 0.55, z + 1.8], steel);
    for (const dx of [-2.1, 2.1]) addBox(diamondBay, [0.3, 1.1, 3.4], [x + dx, 0.55, z + 0.3], steel);
    const heap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1, 7), MINERAL_MATERIALS[DIAMOND]);
    heap.geometry.translate(0, 0.5, 0);
    heap.position.set(x, 0.02, z + 0.3);
    heap.castShadow = true;
    heap.visible = false;
    diamondBay.add(heap);
    heaps[DIAMOND] = heap;
    addBox(diamondBay, [0.12, 1.8, 0.12], [x - 2.6, 0.9, z - 1.2], trim);
    const sign = createSign("Rohdiamanten", "#24506e", "#f4f1e8", 1.9, 0.46);
    sign.position.set(x - 2.6, 1.9, z - 1.1);
    sign.rotation.y = -0.4;
    diamondBay.add(sign);
  }
  group.add(diamondBay);

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

  return { group, heaps, platforms, lamp, shed, ramp, diamondBay };
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
  const goldCurveEnd = nearestS(paths.gold, 70, 25);
  const gold = new THREE.Group();
  const goldEntry = createTrackSection(paths.gold, goldStart, goldCurveEnd);
  gold.add(goldEntry, createTrackSection(paths.gold, goldCurveEnd, paths.gold.length));
  const goldPlanned = createTrackSection(paths.gold, goldStart, paths.gold.length, { planned: true });

  const ironx = routes.ironx[0];
  const goldx = routes.goldx[0];
  const expressSections = [
    [ironx, nearestS(ironx, -11, PLATFORMS[1].z), nearestS(ironx, 95, -14)],
    [goldx, 0, nearestS(goldx, 70, 25) + 1],
    [goldx, nearestS(goldx, WEST_X, 25), goldx.length],
  ];
  const express = new THREE.Group();
  const expressPlanned = new THREE.Group();
  for (const [path, from, to] of expressSections) {
    express.add(createTrackSection(path, from, to));
    expressPlanned.add(createTrackSection(path, from, to, { planned: true }));
  }
  express.visible = false;
  expressPlanned.visible = false;
  group.add(express, expressPlanned);
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

  const sidingRoute = { coal: "short", iron: "iron", gold: "gold" };
  const sidings = Object.fromEntries(
    SIDINGS.map((siding) => {
      const path = routes[sidingRoute[siding.id]][0].variants[siding.bit];
      const [first, , , last] = siding.corners;
      const from = nearestS(path, first[0], first[1]) - 2;
      const to = nearestS(path, last[0], last[1]) + 2;
      const built = createTrackSection(path, from, to);
      const planned = createTrackSection(path, from, to, { planned: true });
      built.visible = false;
      planned.visible = false;
      group.add(built, planned);
      return [siding.id, { built, planned }];
    }),
  );

  const [d0, d1, d2] = DIAMOND_ROUTES.map((id) => routes[id][0]);
  const span = (path, [ax, az], [bx, bz]) => [path, nearestS(path, ax, az), nearestS(path, bx, bz)];
  const diamondSpans = {
    base: span(d0, [86, 0], [86, FAR_Z]),
    siding: span(d0.variants[1], [DIAMOND_X, -12], [DIAMOND_X, -50]),
    viaduct: span(d1, [114, 0], [DIAMOND_X, -11]),
    tunnel: span(d2, [DIAMOND_X, -44], [104, FAR_Z]),
    tunnelSiding: span(d2.variants[1], [DIAMOND_X, -12], [222, FAR_Z]),
    lane: span(d2.variants[2], [99, 0], [126, FAR_Z]),
  };
  const diamond = {};
  for (const [id, [path, from, to]] of Object.entries(diamondSpans)) {
    const built = createTrackSection(path, from, to);
    const planned = createTrackSection(path, from, to, { planned: true });
    built.visible = false;
    planned.visible = false;
    group.add(built, planned);
    diamond[id] = { built, planned };
  }
  const diamondSign = new THREE.Group();
  addSignPost(diamondSign, "Baustelle: Diamanten", "#24506e", ...DIAMOND_LAYOUT.sign);
  diamondSign.visible = false;

  group.add(common, shortTurn, iron, ironPlanned, gold, goldPlanned, ironSign, goldSign, diamondSign);
  return {
    diamond,
    diamondSign,
    group,
    shortTurn,
    iron,
    ironPlanned,
    ironSign,
    gold,
    goldEntry,
    goldPlanned,
    goldSign,
    platforms,
    sidings,
    express,
    expressPlanned,
  };
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

function addSidingTipple(mine, mainTrackZ) {
  const siding = SIDINGS.find((candidate) => candidate.mineral === mine.mineral);
  const group = new THREE.Group();
  const timber = new THREE.MeshStandardMaterial({ color: 0x5a3b26, roughness: 0.9 });
  const binX = siding.chuteX + ((MAX_WAGONS - 1) * WAGON_PITCH) / 2;
  const streams = addTipple(group, {
    chuteX: siding.chuteX,
    trackZ: siding.z,
    mineral: mine.mineral,
    beltStart: new THREE.Vector3(binX, 4.45, mainTrackZ - 2.0),
    timber,
    beltPost: false,
  });
  addSignPost(group, "Ladegleis 2", "#2f5a3f", siding.chuteX - 4, siding.z + 2.6);
  group.visible = false;
  mine.group.add(group);
  mine.siding = { group, streams };
  return mine;
}

function addTipple(group, { chuteX, trackZ, mineral, beltStart, timber, beltPost = true }) {
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
  if (beltPost) addBox(group, [0.2, belt.position.y, 0.2], [binX, belt.position.y / 2, belt.position.z], timber);

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

  const leather = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 });
  const bellowsStand = new THREE.Group();
  bellowsStand.position.set(2.15, 0, 0.75);
  addBox(bellowsStand, [0.9, 0.18, 0.7], [0, 0.45, 0], wood);
  const bellows = new THREE.Group();
  bellows.position.y = 0.54;
  addBox(bellows, [0.8, 0.5, 0.6], [0, 0.25, 0], leather);
  addBox(bellows, [0.9, 0.08, 0.7], [0, 0.52, 0], wood);
  bellowsStand.add(bellows);
  addBox(bellowsStand, [0.5, 0.14, 0.14], [-0.5, 0.75, 0], stone);
  bellowsStand.visible = false;
  group.add(bellowsStand);

  const tallStack = new THREE.Group();
  addBox(tallStack, [0.85, 2.6, 0.85], [0.95, 6.95, -0.45], brick);
  addBox(tallStack, [0.75, 0.16, 0.75], [0.95, 6.2, -0.45], stone);
  addBox(tallStack, [1.15, 0.22, 1.15], [0.95, 8.35, -0.45], stone);
  tallStack.visible = false;
  group.add(tallStack);

  const secondFurnace = new THREE.Group();
  secondFurnace.position.set(4.3, 0, -0.3);
  const secondPad = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 20),
    new THREE.MeshStandardMaterial({ color: 0x6a5c4c, roughness: 1 }),
  );
  secondPad.rotation.x = -Math.PI / 2;
  secondPad.position.y = 0.025;
  secondPad.receiveShadow = true;
  secondFurnace.add(secondPad);
  addBox(secondFurnace, [2.6, 0.32, 2.3], [0, 0.18, 0], stone);
  addBox(secondFurnace, [2.1, 1.7, 1.8], [0, 1.2, 0], brick);
  addBox(secondFurnace, [2.35, 0.24, 2.05], [0, 2.17, 0], dark);
  addBox(secondFurnace, [0.6, 1.6, 0.6], [0.55, 3.0, -0.35], dark);
  const secondMouth = addBox(secondFurnace, [0.85, 0.65, 0.12], [0, 0.72, 0.92], mouth.material.clone());
  secondMouth.castShadow = false;
  secondFurnace.visible = false;
  group.add(secondFurnace);

  return {
    group,
    mouth,
    glow,
    smoke,
    steelStack,
    goldStack,
    bellows,
    bellowsStand,
    tallStack,
    secondFurnace,
    secondMouth,
  };
}

function createTrainMesh(model) {
  const kit = {
    group: new THREE.Group(),
    cars: [],
    loads: [],
    wheels: [],
    rods: [],
    smoke: [],
    armor: [],
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
  const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 20);
  geometry.rotateX(Math.PI / 2);
  const flange = new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, 0.03, 20);
  flange.rotateX(Math.PI / 2);
  const pin = new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, 0.08, 8);
  pin.rotateX(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(radius * 0.32, radius * 0.32, 0.06, 10);
  hub.rotateX(Math.PI / 2);
  for (const z of [-GAUGE / 2, GAUGE / 2]) {
    const side = Math.sign(z);
    const wheel = new THREE.Mesh(geometry, material);
    wheel.position.set(x, RAIL_TOP_Y + radius, z);
    wheel.castShadow = true;
    const rim = new THREE.Mesh(flange, WHEEL_MAT);
    rim.position.z = -side * 0.05;
    const boss = new THREE.Mesh(hub, FRAME_MAT);
    boss.position.z = side * 0.06;
    const crank = new THREE.Mesh(pin, BRASS_MAT);
    crank.position.set(radius * 0.55, 0, side * 0.08);
    wheel.add(rim, boss, crank);
    parent.add(wheel);
    kit.wheels.push({ mesh: wheel, radius });
  }
}

function addRods(kit, parent, axles, radius) {
  const span = Math.max(...axles) - Math.min(...axles);
  const mid = (Math.max(...axles) + Math.min(...axles)) / 2;
  const material = new THREE.MeshStandardMaterial({ color: 0xb9c0c7, roughness: 0.3, metalness: 0.9 });
  for (const side of [-1, 1]) {
    const rod = addBox(parent, [span + 0.12, 0.06, 0.04], [mid, RAIL_TOP_Y + radius, side * (GAUGE / 2 + 0.13)], material);
    kit.rods.push({ mesh: rod, x: mid, y: RAIL_TOP_Y + radius, crank: radius * 0.55, radius });
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
    for (const x of [-1, 1]) {
      for (const z of [-0.45, 0.45]) {
        const buffer = new THREE.Mesh(BUFFER_GEO, FRAME_MAT);
        buffer.position.set(x * (WAGON_HALF + 0.06), 0.84, z);
        wagon.add(buffer);
      }
    }
    if (style.stripe) {
      for (const z of [-1, 1]) {
        addBox(wagon, [2.42, 0.1, 0.02], [0, floorY + height * 0.45, z * (style.hopper ? 0.8 : 0.71)], style.stripe);
      }
    }
    if (style.skirt) {
      for (const z of [-1, 1]) addBox(wagon, [2.0, 0.22, 0.04], [0, 0.66, z * 0.66], style.skirt);
    }
    for (const x of [-0.75, 0.75]) addAxle(kit, wagon, x, 0.22, style.wheel ?? WHEEL_MAT);

    const load = createLoad(height, i);
    load.position.y = floorY + 0.04;
    load.visible = false;
    wagon.add(load);
    kit.loads.push(load);

    const armor = new THREE.Group();
    armor.visible = false;
    const side = style.hopper ? 0.86 : 0.76;
    for (const z of [-1, 1]) {
      addBox(armor, [2.46, height + 0.16, 0.06], [0, floorY + height / 2 - 0.02, z * side], ARMOR_MAT);
      for (let x = -1; x <= 1.01; x += 0.5) {
        addBox(armor, [0.08, 0.08, 0.04], [x, floorY + height - 0.04, z * (side + 0.04)], RIVET_MAT);
      }
    }
    for (const x of [-1.23, 1.23]) addBox(armor, [0.06, height + 0.16, side * 2], [x, floorY + height / 2 - 0.02, 0], ARMOR_MAT);
    for (const x of [-0.7, 0, 0.7]) addBox(armor, [0.07, 0.07, side * 2], [x, floorY + height + 0.34, 0], ARMOR_MAT);
    wagon.add(armor);
    kit.armor.push(armor);

    kit.group.add(wagon);
    kit.cars.push({ object: wagon, offset: -i * WAGON_PITCH, half: WAGON_HALF });
  }
}

function createLoad(wallHeight, seed) {
  const load = new THREE.Group();
  const fill = wallHeight - 0.1;
  const material = MINERAL_MATERIALS[COAL];
  const bed = addBox(load, [LOAD_HALF_X * 2, fill, LOAD_HALF_Z * 2], [0, fill / 2, 0], material);
  bed.castShadow = false;

  const heapHeight = 0.26;
  const heap = new THREE.Mesh(LOAD_HEAP_GEO, material);
  heap.scale.set(LOAD_HALF_X * 0.97, heapHeight, LOAD_HALF_Z * 0.97);
  heap.position.y = fill;
  heap.castShadow = true;
  heap.receiveShadow = true;
  load.add(heap);

  let s = seed * 9301 + 49297;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let k = 0; k < 14; k += 1) {
    const u = (random() * 2 - 1) * 0.8;
    const v = (random() * 2 - 1) * 0.75;
    if (u * u + v * v > 0.7) continue;
    const size = 0.07 + random() * 0.07;
    const lump = new THREE.Mesh(LOAD_LUMP_GEO, material);
    const surface = heapHeight * Math.sqrt(1 - u * u - v * v);
    lump.position.set(u * LOAD_HALF_X, fill + surface - size * 0.3, v * LOAD_HALF_Z);
    lump.scale.set(size * 1.2, size * 0.8, size);
    lump.rotation.set(random() * 3, random() * 3, random() * 3);
    lump.castShadow = true;
    load.add(lump);
  }
  const gem = new THREE.Mesh(BIG_GEM_GEO, material);
  gem.position.y = fill + 0.42;
  gem.scale.set(0.3, 0.38, 0.3);
  gem.castShadow = true;
  gem.visible = false;
  load.add(gem);
  load.userData.gem = gem;
  return load;
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
  kit.smoke.push({
    object: loco,
    local: chimney.position.clone().setY(chimney.position.y + chimneyHeight / 2 + 0.1),
    dark: Boolean(o.darkSmoke),
  });

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
  addRods(kit, loco, axles, wr);
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
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 10), FRAME_MAT);
  exhaust.position.set(0.3, 2.0, 0);
  loco.add(exhaust);
  kit.smoke.push({ object: loco, local: new THREE.Vector3(0.3, 2.2, 0), dark: true });
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
    darkSmoke: true,
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

function buildBlitzTrain(kit, capacity) {
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf4f6f8, roughness: 0.25, metalness: 0.1, clearcoat: 1 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd3122a, roughness: 0.35 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0d1621, roughness: 0.05, metalness: 0.6, clearcoat: 1 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.5, metalness: 0.5 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xaeb6bf, roughness: 0.3, metalness: 0.9 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x66e0ff, emissive: 0x33ccff, emissiveIntensity: 1.6 });
  const head = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6d0, emissiveIntensity: 2.5 });

  addWagons(kit, capacity, {
    body: white,
    rim: red,
    stripe: red,
    skirt: grey,
    wheel: steel,
    height: 0.68,
  });

  const L = 5.2;
  const loco = new THREE.Group();
  const bodyY = 1.55;
  const bodyH = 1.3;
  const bodyLen = 3.2;
  const bodyX = -L / 2 + bodyLen / 2;

  addBox(loco, [bodyLen + 0.4, 0.2, 1.3], [bodyX + 0.2, 0.84, 0], FRAME_MAT);
  for (const x of [-1.6, 1.0]) {
    addBox(loco, [1.5, 0.32, 1.15], [x, 0.6, 0], grey);
    addAxle(kit, loco, x - 0.42, 0.21, steel);
    addAxle(kit, loco, x + 0.42, 0.21, steel);
  }
  for (const z of [-1, 1]) addBox(loco, [L - 1.2, 0.35, 0.05], [-0.3, 0.98, z * 0.7], grey);

  addBox(loco, [bodyLen, bodyH, 1.42], [bodyX, bodyY, 0], white);

  const noseLen = L - bodyLen;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI), white);
  nose.rotation.set(0, Math.PI / 2, 0);
  nose.scale.set(0.71, bodyH / 2, noseLen);
  nose.position.set(bodyX + bodyLen / 2, bodyY, 0);
  nose.castShadow = true;
  loco.add(nose);

  const chin = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 8, 0, Math.PI, Math.PI / 2, Math.PI / 2), grey);
  chin.rotation.set(0, Math.PI / 2, 0);
  chin.scale.set(0.68, 0.32, noseLen * 0.92);
  chin.position.set(bodyX + bodyLen / 2, bodyY - bodyH / 2 + 0.02, 0);
  loco.add(chin);
  addBox(loco, [bodyLen, 0.3, 1.36], [bodyX, bodyY - bodyH / 2 - 0.13, 0], grey);

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 12, Math.PI / 2 - 0.75, 1.5, Math.PI * 0.16, Math.PI * 0.26),
    glass,
  );
  shield.rotation.set(0, Math.PI / 2, 0);
  shield.scale.set(0.718, bodyH / 2 + 0.012, noseLen + 0.015);
  shield.position.copy(nose.position);
  loco.add(shield);

  for (const z of [-1, 1]) {
    addBox(loco, [bodyLen - 0.4, 0.34, 0.02], [bodyX - 0.1, bodyY + 0.28, z * 0.715], glass);
    addBox(loco, [bodyLen + 0.4, 0.12, 0.02], [bodyX + 0.15, bodyY - 0.28, z * 0.715], red);
    const strip = addBox(loco, [bodyLen + 0.6, 0.04, 0.02], [bodyX + 0.2, bodyY - 0.55, z * 0.72], glow);
    strip.castShadow = false;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), head);
    lamp.position.set(bodyX + bodyLen / 2 + noseLen * 0.7, bodyY - 0.32, z * 0.32);
    loco.add(lamp);
  }
  kit.glow = { material: glow };

  addBox(loco, [bodyLen - 0.6, 0.12, 0.9], [bodyX - 0.2, bodyY + bodyH / 2 + 0.06, 0], grey);
  const panto = new THREE.Group();
  panto.position.set(bodyX - 0.6, bodyY + bodyH / 2 + 0.12, 0);
  for (const z of [-0.25, 0.25]) {
    const lower = addBox(panto, [0.9, 0.04, 0.04], [0.3, 0.22, z], steel);
    lower.rotation.z = 0.5;
    const upper = addBox(panto, [0.9, 0.04, 0.04], [0.3, 0.62, z], steel);
    upper.rotation.z = -0.5;
  }
  addBox(panto, [0.08, 0.04, 0.9], [0.0, 0.82, 0], steel);
  for (const x of [-0.25, 0.65]) addBox(panto, [0.1, 0.1, 0.1], [x, 0.0, 0], grey);
  loco.add(panto);

  addAhead(kit, loco, L);
}

function buildDiamondTrain(kit, capacity) {
  const silver = new THREE.MeshStandardMaterial({ color: 0xd4dbe2, roughness: 0.25, metalness: 0.7 });
  const ice = new THREE.MeshStandardMaterial({ color: 0x5fc4e8, roughness: 0.3, metalness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d2a38, roughness: 0.4, metalness: 0.5 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x9be8ff, emissive: 0x52d4ff, emissiveIntensity: 1.6 });
  addWagons(kit, capacity, { body: silver, rim: ice, stripe: ice, skirt: dark, wheel: WHEEL_MAT, height: 0.7 });

  const L = 5.4;
  const loco = new THREE.Group();
  const model = models.express_loco;
  if (model) {
    const body = model.clone(true);
    loco.add(body);
    for (const z of [-1, 1]) {
      const strip = addBox(loco, [L - 1.4, 0.05, 0.03], [-0.3, 0.98, z * 0.78], glow);
      strip.castShadow = false;
    }
  } else {
    addBox(loco, [L - 0.4, 0.2, 1.3], [-0.2, 0.84, 0], FRAME_MAT);
    for (const x of [-1.7, 1.1]) {
      addBox(loco, [1.5, 0.32, 1.15], [x, 0.6, 0], dark);
      addAxle(kit, loco, x - 0.42, 0.21, WHEEL_MAT);
      addAxle(kit, loco, x + 0.42, 0.21, WHEEL_MAT);
    }
    addBox(loco, [3.4, 1.3, 1.42], [-0.9, 1.55, 0], silver);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI), silver);
    nose.rotation.set(0, Math.PI / 2, 0);
    nose.scale.set(0.71, 0.65, 1.9);
    nose.position.set(0.8, 1.55, 0);
    nose.castShadow = true;
    loco.add(nose);
    for (const z of [-1, 1]) {
      addBox(loco, [3.0, 0.34, 0.02], [-1.0, 1.83, z * 0.715], dark);
      addBox(loco, [3.6, 0.12, 0.02], [-0.8, 1.27, z * 0.715], ice);
      const strip = addBox(loco, [3.8, 0.04, 0.02], [-0.7, 1.0, z * 0.72], glow);
      strip.castShadow = false;
    }
    addBox(loco, [2.6, 0.12, 0.9], [-1.1, 2.26, 0], dark);
  }
  kit.glow = { material: glow };
  addAhead(kit, loco, L);
}

function capacityOf(run) {
  const armored = run.target === DIAMOND && game.diamond.levels.proc >= 4;
  const base = MODELS_BY_ID[run.modelId].capacity * (armored ? 2 : 1);
  return Math.ceil(base * lineBoost(run.target, "capacity"));
}

function lineBoost(target, key) {
  const level = game.lines[target]?.train ?? 0;
  const done = TRAIN_UPGRADES.slice(0, level).filter((upgrade) => upgrade[key]);
  if (key === "speed") return done.reduce((factor, upgrade) => factor * upgrade.speed, 1);
  return done.at(-1)?.[key] ?? (key === "load" ? STOP_WAIT.mine : 1);
}

function lineSlots(target) {
  const line = LINE_ROUTES_BY_TARGET[target];
  if (!line) return Infinity;
  const level = game.lines[target].track;
  return line.base + TRACK_UPGRADES.slice(0, level).reduce((sum, upgrade) => sum + upgrade.slots, 0);
}

function lineActive(target, except = null) {
  return activeRuns().filter((run) => run !== except && run.target === target).length;
}

function lineFull(run) {
  return lineActive(run.target, run) >= lineSlots(run.target);
}

function signalsOn(run) {
  return (game.lines[run.target]?.track ?? 0) >= 1;
}

function wagonOf(run, unit) {
  const wagons = run.mesh.loads.length;
  return Math.min(Math.floor((unit * wagons) / capacityOf(run)), wagons - 1);
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

function diamondShortcut() {
  const line = game.diamond.levels.line;
  return line >= 4 ? 2 : line >= 3 ? 1 : 0;
}

function isDiamondRoute(route) {
  return DIAMOND_ROUTES.includes(route);
}

function routeOf(run) {
  if (run.target === DIAMOND && game.diamond.built) return DIAMOND_ROUTES[diamondShortcut()];
  if (run.target === GOLD && game.built.gold) return game.express ? "goldx" : "gold";
  if (run.target === IRON && game.built.iron) return game.express ? "ironx" : "iron";
  return "short";
}

function platformUsable(route, index) {
  if (index >= game.platforms) return false;
  return !(game.express && index === EXPRESS.goldx.platform && !EXPRESS[route]);
}

function desiredPath(run) {
  return routes[routeOf(run)][run.sim?.path?.platform ?? 0];
}

function routeName(path) {
  if (isDiamondRoute(path.route)) return "auf die Diamantstrecke";
  const route = EXPRESS[path.route]?.base ?? path.route;
  if (route === "gold") return "auf die Goldstrecke";
  if (route === "iron") return "auf die Eisenstrecke";
  return "auf die kurze Kohlestrecke";
}

function samePlace(a, b) {
  return a.route === b.route && a.platform === b.platform;
}

function toSharedS(path, s) {
  const here = wrap(s, path.length);
  if (here < HEAD_SHARED_S) return here;
  const offset = path.length - routes[path.route][0].variants[path.mask].length;
  if (here >= TAIL_SHARED_S + offset) return here - offset;
  return null;
}

function fromSharedS(path, shared) {
  if (shared < HEAD_SHARED_S) return shared;
  return shared + path.length - routes[path.route][0].variants[path.mask].length;
}

function sidingTraffic(run, siding) {
  const traffic = [0, 0];
  for (const other of activeRuns()) {
    if (other === run || !ROUTE_SIDINGS[other.sim.path.route].includes(siding.id)) continue;
    const path = other.sim.path;
    const s = wrap(other.sim.s, path.length);
    if (s <= path.stationS + 1 || s > path.sectionEnd[siding.id]) continue;
    traffic[path.mask & siding.bit ? 1 : 0] += 1;
  }
  return traffic;
}

function chooseSidings(run) {
  const { path } = run.sim;
  let mask = 0;
  for (const id of ROUTE_SIDINGS[path.route]) {
    const siding = SIDINGS_BY_ID[id];
    if (!game.sidings.has(id)) continue;
    const [main, second] = sidingTraffic(run, siding);
    if (second < main) mask |= siding.bit;
  }
  const next = path.variants[mask];
  if (next === path) return;
  run.sim.path = next;
  if (overlaps(run, run.sim.s)) run.sim.path = path;
}

function activeZones() {
  const zones = game.express ? [EXPRESS_WEST_ZONE, ...SWITCH_ZONES.slice(1)] : [...SWITCH_ZONES];
  if (game.built.iron) zones.push(IRON_MERGE_ZONE);
  const sidings = SIDINGS.filter((siding) => game.sidings.has(siding.id) && !(game.built.iron && siding.id === "iron"));
  return zones.concat(sidings.map((siding) => siding.zone), diamondZones());
}

function diamondZones() {
  const { built, levels } = game.diamond;
  if (!built) return [];
  const zones = [DIAMOND_ZONES.crossing, DIAMOND_ZONES.merge];
  if (levels.line >= 2) zones.push(DIAMOND_ZONES.siding);
  if (levels.line >= 3) zones.push(DIAMOND_ZONES.viaduct);
  if (levels.line >= 4) zones.push(DIAMOND_ZONES.tunnel, DIAMOND_ZONES.tunnelSiding);
  if (levels.line >= 5) zones.push(DIAMOND_ZONES.lane);
  return zones;
}

function diamondTraffic(run) {
  const traffic = [0, 0];
  for (const other of activeRuns()) {
    if (other === run || !isDiamondRoute(other.sim.path.route)) continue;
    const path = other.sim.path;
    const s = wrap(other.sim.s, path.length);
    if (s <= path.stationS + 1 || s > path.spots[DIAMOND] + 20) continue;
    traffic[path.mask ? 1 : 0] += 1;
  }
  return traffic;
}

function chooseDiamondTrack(run) {
  const { path } = run.sim;
  const line = game.diamond.levels.line;
  if (!isDiamondRoute(path.route) || line < 2) return;
  const second = line >= 5 && path.variants[2] ? 2 : 1;
  const [main, side] = diamondTraffic(run);
  const next = path.variants[side < main ? second : 0];
  if (!next || next === path) return;
  run.sim.path = next;
  if (overlaps(run, run.sim.s)) run.sim.path = path;
}

function platformLoad(run) {
  const load = PLATFORMS.map(() => 0);
  for (const other of activeRuns()) {
    if (other === run || !other.sim.phase) continue;
    if (other.sim.phase.stop?.station) load[other.sim.path.platform] += 1;
  }
  return load;
}

function choosePlatform(run) {
  if (EXPRESS[run.sim.path.route]) return;
  const shared = toSharedS(run.sim.path, run.sim.s);
  if (shared === null) return;
  const load = platformLoad(run);
  let best = 0;
  for (let k = 1; k < PLATFORMS.length; k += 1) {
    if (platformUsable(run.sim.path.route, k) && load[k] < load[best]) best = k;
  }
  const path = routes[run.sim.path.route][best].variants[run.sim.path.mask];
  if (path === run.sim.path) return;
  run.sim.path = path;
  run.sim.s = fromSharedS(path, shared);
}

function routeStops(path) {
  const stops = [{ id: "station", s: path.stationS, wait: stationWait(), station: true }];
  for (const mine of mines) {
    const s = path.spots[mine.mineral];
    if (s !== undefined) {
      stops.push({ id: mine.mineral, s, wait: STOP_WAIT.mine, mine, track: path.sidingTrack[mine.mineral] });
    }
  }
  return stops;
}

function wantsStop(run, stop) {
  if (stop.station) return true;
  const route = routeOf(run);
  if (run.sim.path.route !== route && !(isDiamondRoute(route) && isDiamondRoute(run.sim.path.route))) return false;
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
  if (!placeRun(run)) parkRun(run);
  return run;
}

function activeRuns() {
  return game.runs.filter((run) => !run.parked);
}

function parkRun(run) {
  run.parked = true;
  run.sim.phase = null;
  run.sim.record = null;
  run.mesh.group.visible = false;
}

function spotFree(run, s) {
  const samples = trainSamples(run, s);
  if (zonesTouched(samples).length > 0) return false;
  return activeRuns().every((other) => {
    if (other === run) return true;
    const theirs = trainSamples(other, other.sim.s);
    return samples.every((a) => theirs.every((b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 >= SPAWN_CLEARANCE ** 2));
  });
}

function placeRun(run) {
  if (lineFull(run)) return false;
  const route = desiredPath(run).route;
  const reach = LINE_ROUTES_BY_TARGET[run.target] ? DEPOT_REACH : Infinity;
  const candidates = [];
  for (let k = 0; k < PLATFORMS.length; k += 1) {
    if (EXPRESS[route] ? k > 0 : !platformUsable(route, k)) continue;
    const path = routes[route][k];
    for (let back = 0; back < Math.min(path.length, reach); back += 2) {
      candidates.push({ path, s: wrap(path.stationS - back, path.length) });
    }
  }
  candidates.sort((a, b) => wrap(a.path.stationS - a.s, a.path.length) - wrap(b.path.stationS - b.s, b.path.length));
  const spot = candidates.find(({ path, s }) => {
    run.sim.path = path;
    return spotFree(run, s);
  });
  if (!spot) return false;
  run.parked = false;
  run.mesh.group.visible = true;
  run.sim.path = spot.path;
  run.sim.s = spot.s;
  startRun(run);
  return true;
}

function unparkWaiting(step) {
  depotTimer -= step;
  if (depotTimer > 0) return;
  depotTimer = 1;
  const waiting = game.runs.find((run) => run.parked && !lineFull(run) && placeRun(run));
  if (waiting) {
    showMessage(`${runLabel(waiting)} fährt aus dem Depot los.`, "good");
    updateHud();
  }
}

function startRun(run) {
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
      profile: driveProfile(stationDistance, speedOf(run)),
      stop: station,
    };
    run.sim.record = { stop: station, kind: "idle", before: [], loaded: [], removed: [] };
    renderRun(run);
  }
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
  return activeRuns().some((other) => other !== run && consistHits(run, s, other, other.sim.s));
}

function blocks(other, run, s) {
  const next = consistGap(run, s, other);
  if (next >= TRAIN_CLEARANCE) return false;
  const now = consistGap(run, run.sim.s, other);
  if (next < now - 0.05) return true;
  const probe = s >= run.sim.s ? Math.max(s, run.sim.s + 0.5) : Math.min(s, run.sim.s - 0.5);
  return consistGap(run, probe, other) <= now + 0.01;
}

function movementBlocker(run, s, ignore = null) {
  return activeRuns().find((other) => other !== run && other !== ignore && blocks(other, run, s)) ?? null;
}

function movementBlocked(run, s, ignore = null) {
  return Boolean(movementBlocker(run, s, ignore));
}

function zonesTouched(points) {
  return activeZones().filter((zone) =>
    points.some((p) => p.x >= zone.x0 && p.x <= zone.x1 && p.z >= zone.z0 && p.z <= zone.z1),
  );
}

function inZones(p, zones) {
  return zones.some((zone) => p.x >= zone.x0 && p.x <= zone.x1 && p.z >= zone.z0 && p.z <= zone.z1);
}

function pathAhead(run, s) {
  const back = Math.min(...run.mesh.cars.map((car) => car.offset - car.half));
  const front = Math.max(...run.mesh.cars.map((car) => car.offset + car.half));
  const points = [];
  for (let d = back; d <= front + ZONE_LOOKAHEAD; d += 1) points.push(run.sim.path.point(s + d));
  return points;
}

function near(a, b, distance) {
  return (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < distance ** 2;
}

function followsOn(other, track) {
  return trainSamples(other, other.sim.s).every((p) =>
    track.some((q) => near(p, q, 0.9) && p.dx * q.dx + p.dz * q.dz > 0.7),
  );
}

function enteringZones(run, s) {
  const now = zonesTouched(trainSamples(run, run.sim.s));
  return zonesTouched(trainSamples(run, s)).filter((zone) => !now.includes(zone));
}

function switchBlocker(run, s) {
  const entering = enteringZones(run, s);
  if (entering.length === 0) return null;
  const mine = pathAhead(run, run.sim.s);
  const mineInZone = mine.filter((p) => inZones(p, entering));
  const inside = (other) => zonesTouched(trainSamples(other, other.sim.s)).some((zone) => entering.includes(zone));
  const waitsLonger = (other) =>
    other.sim.waitZones?.some((zone) => entering.includes(zone)) && other.sim.stalled > (run.sim.stalled ?? 0) + STALL_LIMIT;
  const crosses = (other) => {
    if (followsOn(other, mine)) return false;
    const theirs = pathAhead(other, other.sim.s).filter((p) => inZones(p, entering));
    return theirs.some((p) => mineInZone.some((q) => near(p, q, TRAIN_CLEARANCE)));
  };
  return activeRuns().find((other) => other !== run && (inside(other) || waitsLonger(other)) && crosses(other)) ?? null;
}

function signalBlocker(run, s) {
  if (!signalsOn(run) || (run.sim.stalled ?? 0) > SIGNAL_PATIENCE) return null;
  const entering = enteringZones(run, s);
  if (entering.length === 0) return null;
  const back = Math.min(...run.mesh.cars.map((car) => car.offset - car.half));
  const front = Math.max(...run.mesh.cars.map((car) => car.offset + car.half));
  let inside = false;
  let exit = null;
  for (let d = 0; d <= SIGNAL_REACH; d += 1) {
    const within = inZones(run.sim.path.point(s + front + d), entering);
    if (within) inside = true;
    else if (inside) {
      exit = d;
      break;
    }
  }
  if (exit === null) return null;
  const room = [];
  for (let d = exit; d <= exit + front - back + TRAIN_CLEARANCE; d += 1.2) room.push(run.sim.path.point(s + front + d));
  const halted = (other) => other.sim.phase?.type === "stop" || other.sim.stalled > 0;
  return (
    activeRuns().find(
      (other) =>
        other !== run &&
        halted(other) &&
        trainSamples(other, other.sim.s).some((p) => room.some((q) => near(p, q, TRAIN_CLEARANCE))),
    ) ?? null
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
    profile: driveProfile(next.distance, speedOf(run)),
    stop: next.stop,
  };
}

function freeToGo(run) {
  const s = Math.max(nextS(run), run.sim.s + 0.5);
  return !movementBlocker(run, s) && !switchBlocker(run, s);
}

function yieldWay(run, other, strict = false) {
  const length = run.sim.path.length;
  const start = run.sim.s;
  for (let i = 0; i < 70 && pathBlockedBy(run, other, 18); i += 1) {
    const back = run.sim.s - 0.8;
    if (movementBlocked(run, back, other) || switchBlocker(run, back)) break;
    run.sim.s = wrap(back, length);
  }
  if (consistHits(other, other.sim.s + 1.5, run, run.sim.s) || (strict && !freeToGo(other))) {
    run.sim.s = start;
    return false;
  }
  retargetDrive(run);
  run.sim.yieldTo = other.id;
  run.sim.yieldMark = other.sim.odometer;
  run.sim.yieldTicks = 0;
  run.sim.stalled = 0;
  run.sim.blockedBy = null;
  run.sim.waitZones = null;
  return true;
}

function holdingYield(run) {
  if (!run.sim.yieldTo) return false;
  const other = game.runs.find((item) => item.id === run.sim.yieldTo);
  run.sim.yieldTicks += 1;
  const passed = other && other.sim.odometer - run.sim.yieldMark > 14 && !pathBlockedBy(run, other, 18);
  if (!other || other.parked || passed || run.sim.yieldTicks > 200) run.sim.yieldTo = null;
  return Boolean(run.sim.yieldTo);
}

function nextS(run) {
  const { phase, s } = run.sim;
  if (phase.type !== "drive") return s + 1.5;
  return phase.from + drivenDistance(phase.profile, phase.distance, Math.min(phase.time + SIM_STEP, phase.profile.duration));
}

function breakStandoff(run, other) {
  if (other.sim.yieldTo === run.id || !blocks(run, other, nextS(other))) return;
  const [loser, winner] = shouldYield(run, other) ? [run, other] : [other, run];
  if (!yieldWay(loser, winner)) yieldWay(winner, loser);
}

function blockingCycle(run) {
  const cycle = [run];
  for (let current = run; cycle.length <= game.runs.length; ) {
    const next = activeRuns().find((item) => item.id === current.sim.blockedBy);
    if (!next || !(next.sim.stalled > 0) || next.sim.yieldTo) return null;
    if (next === run) return cycle;
    if (cycle.includes(next)) return null;
    cycle.push(next);
    current = next;
  }
  return null;
}

function resolveDeadlock(run) {
  const cycle = blockingCycle(run) ?? (run.sim.stalled > STALL_GIVE_UP ? [run] : null);
  if (!cycle) return;
  const pairs = cycle.map((item) => [item, activeRuns().find((other) => other.id === item.sim.blockedBy)]);
  for (const [item, blocker] of pairs) {
    if (blocker && yieldWay(blocker, item, true)) return;
  }
  for (const [item, blocker] of pairs) {
    if (blocker && yieldWay(item, blocker, true)) return;
  }
}

function blockedAt(run, s) {
  const sim = run.sim;
  const pusher = movementBlocker(run, s);
  const switcher = pusher ? null : switchBlocker(run, s);
  const blocker = pusher ?? switcher ?? signalBlocker(run, s);
  if (!blocker) {
    sim.stalled = 0;
    sim.blockedBy = null;
    sim.waitZones = null;
    return false;
  }
  sim.stalled = (sim.stalled ?? 0) + 1;
  sim.blockedBy = blocker.id;
  sim.waitZones = switcher ? enteringZones(run, s) : null;
  if (pusher) breakStandoff(run, pusher);
  if (!sim.yieldTo && sim.stalled % STALL_LIMIT === 0) resolveDeadlock(run);
  return true;
}

function speedOf(run) {
  const base = MODELS_BY_ID[run.modelId].speed ?? 1;
  return Math.min(base * lineBoost(run.target, "speed"), Math.max(base, MAX_SPEED_FACTOR));
}

function driveProfile(distance, speed = 1) {
  const top = TOP_SPEED * speed;
  const accel = ACCELERATION * speed;
  const accelTime = top / accel;
  const accelDistance = 0.5 * accel * accelTime ** 2;
  if (distance >= 2 * accelDistance) {
    return { accel, accelTime, peak: top, duration: 2 * accelTime + (distance - 2 * accelDistance) / top };
  }
  const t = Math.sqrt(distance / accel);
  return { accel, accelTime: t, peak: accel * t, duration: 2 * t };
}

function drivenDistance({ accel, accelTime, peak, duration }, distance, time) {
  if (time >= duration) return distance;
  if (time <= accelTime) return 0.5 * accel * time * time;
  if (time <= duration - accelTime) return 0.5 * peak * accelTime + peak * (time - accelTime);
  const left = duration - time;
  return distance - 0.5 * accel * left * left;
}

function simulateRun(run, dt) {
  const sim = run.sim;
  const phase = sim.phase;
  if (holdingYield(run)) return;

  if (phase.type === "stop") {
    if (phase.stop.station) applyStationChanges(run);
    if (run.parked) return;
    if (phase.stop.mine?.mineral === DIAMOND && sim.record?.kind === "load") loadDiamonds(run, phase);
    if (phase.time >= phase.duration) {
      if (phase.stop.station && game.sidings.size > 0) chooseSidings(run);
      if (phase.stop.station) chooseDiamondTrack(run);
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
      if (blockedAt(run, sim.s + 1.5)) return;
      sim.phase = {
        type: "drive",
        time: 0,
        from: sim.s,
        distance: next.distance,
        profile: driveProfile(next.distance, speedOf(run)),
        stop: next.stop,
      };
      return;
    }
    phase.time += dt;
    return;
  }

  const nextTime = phase.time + dt;
  const proposed = phase.from + drivenDistance(phase.profile, phase.distance, Math.min(nextTime, phase.profile.duration));
  if (blockedAt(run, proposed)) return;

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
  if (samePlace(run.sim.path, path)) return;
  if (lineFull(run)) {
    parkRun(run);
    const line = LINE_ROUTES_BY_TARGET[run.target];
    showMessage(`${runLabel(run)} wartet im Depot: die ${line.name} ist voll.`, "bad");
    updateHud();
    return;
  }
  const before = { path: run.sim.path, s: run.sim.s };
  run.sim.path = path;
  run.sim.s = path.stationS;
  if (path.platform !== before.path.platform && overlaps(run, run.sim.s)) {
    run.sim.path = before.path;
    run.sim.s = before.s;
    return;
  }
  showMessage(`${runLabel(run)} fährt jetzt ${routeName(path).replace("auf ", "")}.`, "good");
}

function startStop(run, stop) {
  const wanted = wantsStop(run, stop);
  const wait = stop.mine && stop.mine.mineral !== DIAMOND ? lineBoost(run.target, "load") : stop.wait;
  run.sim.phase = { type: "stop", time: 0, duration: wanted ? wait : 0, stop };
  const before = run.cargo;
  const record = { stop, kind: "idle", before, loaded: [], removed: [], pace: stop.mine ? wait / STOP_WAIT.mine : 1 };

  if (stop.station) {
    record.removed = [...before];
    if (before.length > 0) {
      record.kind = "deliver";
      const counts = {};
      for (const unit of before) {
        const value = unit.big ? DIAMOND_RATES.bigValue : 1;
        counts[unit.mineral] = (counts[unit.mineral] ?? 0) + value;
        game.stock[unit.mineral] += value;
      }
      const summary = Object.entries(counts)
        .map(([mineral, count]) => `${count}× ${MINERALS[mineral].name}`)
        .join(", ");
      const bigs = before.filter((unit) => unit.big).length;
      const extra = bigs ? ` · ${bigs > 1 ? `${bigs} große Diamanten` : "ein großer Diamant"}!` : "";
      showMessage(`${runLabel(run)}: ${summary} ins Lager${extra}`, "good");
    }
  } else if (wanted && stop.mine.mineral === DIAMOND) {
    record.kind = "load";
    run.sim.phase.duration = DIAMOND_RATES.maxWait;
  } else if (wanted) {
    const mineral = stop.mine.mineral;
    record.kind = "load";
    record.loaded = Array.from({ length: capacityOf(run) - before.length }, (_, k) => ({
      mineral,
      wagon: wagonOf(run, before.length + k),
    }));
  }

  run.cargo = before.filter((unit) => !record.removed.includes(unit)).concat(record.loaded);
  run.sim.record = record;
  updateHud();
}

function loadDiamonds(run, phase) {
  const record = run.sim.record;
  const capacity = capacityOf(run);
  const d = game.diamond;
  trackDiamondTrip(run, record, phase, capacity);
  if (run.cargo.length < capacity && d.buffer >= 1 && phase.time >= (record.nextLoad ?? 0.3)) {
    d.buffer -= 1;
    diamondBucket().loaded += 1;
    const perWagon = Math.max(1, capacity / run.mesh.loads.length);
    const big = d.levels.mine >= 3 && Math.random() < DIAMOND_RATES.bigChance;
    if (big) d.bigFound += 1;
    const unit = {
      mineral: DIAMOND,
      wagon: Math.min(Math.floor(run.cargo.length / perWagon), run.mesh.loads.length - 1),
      at: phase.time,
      big,
    };
    run.cargo.push(unit);
    record.loaded.push(unit);
    record.nextLoad = phase.time + DIAMOND_RATES.loadGap;
    if (run.id === game.focusId) updateHud();
  }
  const full = run.cargo.length >= capacity;
  const settled = record.loaded.length > 0 && phase.time >= DIAMOND_RATES.minWait && d.buffer < 1;
  if (full || settled) phase.duration = Math.min(phase.duration, phase.time + (full ? 1.2 : 0));
}

function renderTrains() {
  for (const run of activeRuns()) renderRun(run);
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
  for (const rod of mesh.rods) {
    const angle = -sim.odometer / rod.radius;
    rod.mesh.position.x = rod.x + Math.cos(angle) * rod.crank;
    rod.mesh.position.y = rod.y + Math.sin(angle) * rod.crank;
  }
  if (mesh.glow) mesh.glow.material.emissiveIntensity = 1.6 + Math.sin(clock.elapsedTime * 3) * 0.6;

  const record = sim.record;
  const stopped = sim.phase.type === "stop";
  const t = stopped ? sim.phase.time : 0;
  const ramp = (from, to) => smoothstep(THREE.MathUtils.clamp((t - from) / (to - from), 0, 1));
  const levels = mesh.loads.map(() => ({ mineral: null, level: 0, big: false }));
  const show = (unit, level) => {
    const slot = levels[unit.wagon];
    if (!slot || level < slot.level) return;
    levels[unit.wagon] = { mineral: unit.mineral, level, big: slot.big || Boolean(unit.big) };
  };
  if (stopped) {
    for (const unit of record.before) {
      show(unit, record.removed.includes(unit) ? 1 - ramp(0.4, 2.6) : 1);
    }
    const pace = record.pace ?? 1;
    for (const unit of record.loaded) show(unit, ramp(0.5 * pace + (unit.at ?? 0), 3.5 * pace + (unit.at ?? 0)));
  } else {
    for (const unit of run.cargo) show(unit, 1);
  }

  for (const [i, load] of mesh.loads.entries()) {
    const { mineral, level, big } = levels[i];
    load.visible = level > 0.01;
    load.scale.y = Math.max(level, 0.01);
    load.userData.gem.visible = big;
    if (mineral) {
      for (const part of load.children) part.material = MINERAL_MATERIALS[mineral];
    }
  }
  const armored = run.target === DIAMOND && game.diamond.levels.proc >= 4;
  for (const armor of mesh.armor) armor.visible = armored;
}

function renderYard() {
  const pending = { [COAL]: 0, [IRON]: 0, [GOLD]: 0, [DIAMOND]: 0 };
  let lampOn = false;
  const unloading = PLATFORMS.map(() => Array.from({ length: MAX_WAGONS }, () => null));
  const loading = new Map(
    mines.map((mine) => [mine, [0, 1].map(() => Array.from({ length: MAX_WAGONS }, () => null))]),
  );

  for (const run of activeRuns()) {
    const record = run.sim.record;
    const stopped = run.sim.phase.type === "stop";
    if (!stopped || !record) continue;
    const t = run.sim.phase.time;
    const ramp = (from, to) => smoothstep(THREE.MathUtils.clamp((t - from) / (to - from), 0, 1));
    const delivering = record.stop.station && record.kind === "deliver";
    if (delivering) {
      const left = 1 - ramp(0.4, 2.6);
      for (const unit of record.removed) pending[unit.mineral] += left * (unit.big ? DIAMOND_RATES.bigValue : 1);
      if (t < 3.1) lampOn = true;
      if (t > 0.4 && t < 2.4) {
        const slots = unloading[run.sim.path.platform];
        for (const unit of record.removed) {
          if (!slots[unit.wagon]) slots[unit.wagon] = { unit, t };
        }
      }
    }
    const mine = record.stop.mine;
    if (mine && record.kind === "load") {
      const slots = loading.get(mine)[record.stop.track ?? 0];
      for (const unit of record.loaded) {
        const local = (t - (unit.at ?? 0)) / (record.pace ?? 1);
        if (local > 0.3 && local < 3.4 && slots[unit.wagon] == null) slots[unit.wagon] = local;
      }
    }
  }

  for (const mineral of [COAL, IRON, GOLD, DIAMOND]) {
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
    const tracks = loading.get(mine);
    for (const [track, streams] of [mine.streams, mine.siding.streams].entries()) {
      for (const [i, stream] of streams.entries()) {
        stream.visible = tracks[track][i] != null;
        if (stream.visible) animateStream(stream, tracks[track][i], 1.1, 0.25);
      }
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
  const sidingReady = refreshSidingHud();
  const expressReady = refreshExpressHud();
  const diamondReady = refreshDiamondHud();
  const lineReady = refreshLineHud();
  let anyReady = smelterReady || stationReady || platformReady || sidingReady || expressReady || diamondReady || lineReady;
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
    const { button, item } = trainItems[model.id];
    const cost = copyCost(model);
    const affordable = canAfford(cost);
    const locked = Boolean(model.locked?.());
    item.hidden = locked && !game.runs.some((run) => run.modelId === model.id);
    button.hidden = locked;
    button.classList.toggle("waiting", !affordable);
    button.textContent = affordable ? buyLabel(model) : `Kaufen: fehlen ${formatMissing(cost)}`;
    for (const run of game.runs) {
      if (run.modelId !== model.id) continue;
      const row = ensureInstanceRow(run);
      row.label.textContent = runLabel(run);
      row.item.classList.toggle("running", game.focusId === run.id);
      row.cargo.textContent = run.parked ? depotLabel(run) : `Ladung: ${cargoLabel(run)}`;
      row.follow.classList.toggle("active", game.focusId === run.id && trackCamera?.follow);
      row.sell.hidden = game.runs.length <= 1;
      row.sell.textContent = row.sell.classList.contains("confirm") ? "Wirklich verkaufen?" : sellLabel(run);
      for (const destButton of row.destButtons) {
        const target = destButton.dataset.target;
        destButton.hidden =
          (target === IRON && !game.built.iron) ||
          (target === GOLD && !game.built.gold) ||
          (target === DIAMOND && !game.diamond.built);
        destButton.classList.toggle("active", run.target === target);
      }
    }
  }
}

function depotLabel(run) {
  const line = LINE_ROUTES_BY_TARGET[run.target];
  if (!line || !lineFull(run)) return "Wartet im Depot, bis auf der Strecke Platz ist";
  return `Wartet im Depot: ${line.name} voll (${lineSlots(run.target)} Züge). Ausbau unter „Bauen“ oder anderes Ziel wählen`;
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
  const destLabel = { [COAL]: "Kohle", [IRON]: "Eisen", [GOLD]: "Gold", [DIAMOND]: "Diamant" };
  const destButtons = [COAL, IRON, GOLD, DIAMOND].map((target) => {
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
  const sell = document.createElement("button");
  sell.type = "button";
  sell.className = "train-sell";
  sell.addEventListener("click", () => {
    if (sell.classList.contains("confirm")) {
      sellTrain(run.id);
    } else {
      sell.classList.add("confirm");
      updateHud();
      clearTimeout(sell.resetTimer);
      sell.resetTimer = setTimeout(() => {
        sell.classList.remove("confirm");
        updateHud();
      }, 3000);
    }
    sell.blur();
  });
  const actions = document.createElement("div");
  actions.className = "train-actions";
  actions.append(follow, sell);
  item.append(label, dest, cargo, actions);
  bucket.instances.append(item);
  const row = { item, label, destButtons, cargo, follow, sell };
  bucket.rows.set(run.id, row);
  return row;
}

function buyTrain(modelId) {
  const model = MODELS_BY_ID[modelId];
  const cost = copyCost(model);
  if (model.locked?.()) return;
  if (!canAfford(cost)) {
    showMessage(`${model.name}: es fehlen noch ${formatMissing(cost)}.`, "bad");
    return;
  }
  payCost(cost);
  game.owned.add(modelId);
  const free = LINE_ROUTES.find(
    (line) => lineUnlocked(line) && lineActive(line.target) < lineSlots(line.target),
  );
  const run = createRun(modelId, free?.target ?? COAL);
  showMessage(
    run.parked
      ? `${runLabel(run)} ${depotLabel(run).replace("Wartet", "wartet")}.`
      : `${runLabel(run)} fährt los ${routeName(desiredPath(run))}. Das Ziel stellst du darunter ein.`,
    "good",
  );
  updateHud();
}

function sellRefund(model) {
  return Object.fromEntries(
    costList(copyCost(model))
      .map(([id, amount]) => [id, Math.floor(amount / 2)])
      .filter(([, amount]) => amount > 0),
  );
}

function sellLabel(run) {
  const refund = formatCost(sellRefund(MODELS_BY_ID[run.modelId]));
  return refund ? `Verkaufen (+${refund})` : "Verkaufen";
}

function sellTrain(id) {
  const run = game.runs.find((candidate) => candidate.id === id);
  if (!run) return;
  if (game.runs.length <= 1) {
    showMessage("Den letzten Zug kannst du nicht verkaufen.", "bad");
    return;
  }
  const label = runLabel(run);
  const refund = sellRefund(MODELS_BY_ID[run.modelId]);
  for (const [good, amount] of costList(refund)) pileOf(good)[good] += amount;

  scene.remove(run.mesh.group);
  run.mesh.group.traverse((object) => object.geometry?.dispose());
  game.runs = game.runs.filter((candidate) => candidate !== run);
  for (const other of game.runs) {
    if (other.sim.yieldTo === run.id) other.sim.yieldTo = null;
  }
  if (!game.runs.some((candidate) => candidate.modelId === run.modelId)) game.owned.delete(run.modelId);

  const bucket = trainItems[run.modelId];
  bucket.rows.get(run.id)?.item.remove();
  bucket.rows.delete(run.id);

  if (game.focusId === run.id) {
    game.focusId = game.runs[0].id;
    if (trackCamera) {
      trackCamera.path = focusedRun().sim.path;
      trackCamera.s = focusedRun().sim.s + focusedRun().mesh.centerOffset;
    }
  }
  const gained = formatCost(refund);
  showMessage(gained ? `${label} verkauft. Du bekommst ${gained} zurück.` : `${label} verkauft.`, "good");
  updateHud();
}

function setRunTarget(id, target) {
  const run = game.runs.find((candidate) => candidate.id === id);
  if (!run) return;
  if (target === IRON && !game.built.iron) return;
  if (target === GOLD && !game.built.gold) return;
  if (target === DIAMOND && !game.diamond.built) return;
  run.target = target;
  updateHud();
  const path = desiredPath(run);
  const atStation = run.parked || (run.sim.phase.type === "stop" && run.sim.phase.stop.station);
  if (samePlace(path, run.sim.path) || atStation) return;
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
      else if (nextSiding() && sidingUnlocked(nextSiding()) && canAfford(nextSiding().cost)) buildSiding();
      else if (!game.express && expressUnlocked() && canAfford(EXPRESS_COST)) buildExpress();
      else if (!game.diamond.built && diamondUnlocked() && canAfford(DIAMOND_UNLOCK)) buildDiamond();
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
  hud.smelter.auto.addEventListener("change", () => {
    game.smelter.auto = hud.smelter.auto.checked;
    game.smelter.step = 0;
    hud.smelter.auto.blur();
    showMessage(
      game.smelter.auto ? "Die Schmelzhütte gießt jetzt automatisch." : "Automatik der Schmelzhütte ist aus.",
      "good",
    );
    updateHud();
  });
  for (const button of hud.smelter.planButtons) {
    button.addEventListener("click", () => {
      const { recipe, delta } = button.dataset;
      const plan = game.smelter.plan;
      plan[recipe] = THREE.MathUtils.clamp(plan[recipe] + Number(delta), 0, MAX_PLAN_COUNT);
      if (planSequence().length === 0) plan[recipe] = 1;
      game.smelter.step = 0;
      button.blur();
      updateHud();
    });
  }
  hud.platform.button.addEventListener("click", () => {
    buildPlatform();
    hud.platform.button.blur();
  });
  hud.express.button.addEventListener("click", () => {
    buildExpress();
    hud.express.button.blur();
  });
  hud.siding.button.addEventListener("click", () => {
    buildSiding();
    hud.siding.button.blur();
  });
  hud.stationUpgrade.button.addEventListener("click", () => {
    upgradeStation();
    hud.stationUpgrade.button.blur();
  });
  hud.smelter.upgradeButton.addEventListener("click", () => {
    upgradeSmelter();
    hud.smelter.upgradeButton.blur();
  });
  hud.diamond.button.addEventListener("click", () => {
    buildDiamond();
    hud.diamond.button.blur();
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
  smelter.bellowsStand.visible = game.smelterLevel >= 1;
  smelter.tallStack.visible = game.smelterLevel >= 2;
  smelter.smoke.position.y = game.smelterLevel >= 2 ? 8.6 : 5.8;
  smelter.secondFurnace.visible = game.smelterLevel >= 3;
  tracks.platforms.forEach((track, index) => {
    if (!track) return;
    track.built.visible = index < game.platforms;
    track.planned.visible = index === game.platforms;
    station.platforms[index].group.visible = index < game.platforms;
  });
  station.shed.visible = game.stationLevel >= 1;
  station.ramp.visible = game.stationLevel >= 2;
  tracks.express.visible = game.express;
  tracks.expressPlanned.visible = !game.express && expressUnlocked();
  tracks.goldEntry.visible = !game.express;
  const next = nextSiding();
  for (const siding of SIDINGS) {
    const built = game.sidings.has(siding.id);
    tracks.sidings[siding.id].built.visible = built;
    tracks.sidings[siding.id].planned.visible = siding === next && sidingUnlocked(siding);
    mines.find((mine) => mine.mineral === siding.mineral).siding.group.visible = built;
  }

  const d = game.diamond;
  const line = d.built ? d.levels.line : -1;
  const plan = !d.built && diamondUnlocked();
  tracks.diamond.base.built.visible = d.built;
  tracks.diamond.base.planned.visible = plan;
  tracks.diamondSign.visible = plan;
  for (const [id, needed] of Object.entries({ siding: 2, viaduct: 3, tunnel: 4, tunnelSiding: 4, lane: 5 })) {
    tracks.diamond[id].built.visible = line >= needed;
    tracks.diamond[id].planned.visible = line === needed - 1;
  }
  hud.diamondMine.hidden = !d.built;
  station.diamondBay.visible = d.built;
  diamondWorld.apply(d.built, d.levels);
}

function expressUnlocked() {
  return game.built.iron && game.built.gold && game.platforms >= PLATFORMS.length;
}

function refreshExpressHud() {
  const ui = hud.express;
  ui.card.classList.toggle("done", game.express);
  if (game.express) {
    ui.status.textContent = "Gebaut ✓ Gold fährt auf Gleis 3, Eisen auf Gleis 2, Kohle auf Gleis 1 und 2.";
    ui.bar.style.width = "100%";
    ui.button.hidden = true;
    return false;
  }
  const unlocked = expressUnlocked();
  const affordable = canAfford(EXPRESS_COST);
  ui.card.classList.toggle("locked", !unlocked);
  ui.button.hidden = !unlocked;
  ui.button.classList.toggle("waiting", !affordable);
  ui.button.textContent = affordable
    ? `Bauen (${formatCost(EXPRESS_COST)})`
    : `Bauen: fehlen ${formatMissing(EXPRESS_COST)}`;
  const missing = [
    !game.built.iron && "Gleis zur Eisenmine",
    !game.built.gold && "Goldstrecke",
    game.platforms < PLATFORMS.length && `Bahnhofsgleis ${PLATFORMS.length}`,
  ].filter(Boolean);
  ui.status.textContent = unlocked
    ? affordable
      ? "Genug Material! Jetzt bauen."
      : `Dir fehlen noch ${formatMissing(EXPRESS_COST)}.`
    : `Gesperrt: erst ${missing.join(", ")} bauen.`;
  ui.bar.style.width = `${unlocked ? Math.min(costProgress(EXPRESS_COST), 1) * 100 : 0}%`;
  return unlocked && affordable;
}

function buildExpress() {
  if (game.express || !expressUnlocked()) return;
  if (!canAfford(EXPRESS_COST)) {
    showMessage(`Eigene Gleise: es fehlen noch ${formatMissing(EXPRESS_COST)}.`, "bad");
    return;
  }
  payCost(EXPRESS_COST);
  game.express = true;
  applyBuiltWorld();
  showMessage("Gold und Eisen haben jetzt eigene Gleise! Am Bahnhof fahren drei Züge nebeneinander.", "good");
  showcaseCamera(new THREE.Vector3(0, 1, 6), 90, 6000);
  updateHud();
}

function nextSiding() {
  return SIDINGS.find((siding) => !game.sidings.has(siding.id)) ?? null;
}

function sidingUnlocked(siding) {
  return !siding.needs || game.built[siding.needs];
}

function refreshSidingHud() {
  const ui = hud.siding;
  const siding = nextSiding();
  ui.card.classList.toggle("done", !siding);
  if (!siding) {
    ui.title.textContent = "Zweigleisig · alle Abschnitte";
    ui.desc.textContent = "Überall zwei Gleise und zwei Ladestellen an jeder Mine.";
    ui.status.textContent = "Komplett ausgebaut ✓";
    ui.bar.style.width = "100%";
    ui.button.hidden = true;
    return false;
  }
  const unlocked = sidingUnlocked(siding);
  const affordable = canAfford(siding.cost);
  ui.card.classList.toggle("locked", !unlocked);
  ui.title.textContent = `Zweigleisig · ${siding.name} · ${formatCost(siding.cost)}`;
  ui.desc.textContent =
    "Ein zweites Gleis an der Mine mit eigener Ladestelle. Züge weichen aus und überholen, " +
    "zwei Züge laden gleichzeitig.";
  ui.button.hidden = !unlocked;
  ui.button.classList.toggle("waiting", !affordable);
  ui.button.textContent = affordable ? `Bauen (${formatCost(siding.cost)})` : `Bauen: fehlen ${formatMissing(siding.cost)}`;
  const done = SIDINGS.filter((candidate) => game.sidings.has(candidate.id)).length;
  ui.status.textContent = unlocked
    ? `${done} von ${SIDINGS.length} Abschnitten zweigleisig.`
    : `Gesperrt: erst ${siding.needs === "iron" ? "das Gleis zur Eisenmine" : "die Goldstrecke"} bauen.`;
  ui.bar.style.width = `${unlocked ? Math.min(costProgress(siding.cost), 1) * 100 : 0}%`;
  return unlocked && affordable;
}

function buildSiding() {
  const siding = nextSiding();
  if (!siding || !sidingUnlocked(siding)) return;
  if (!canAfford(siding.cost)) {
    showMessage(`${siding.name}: es fehlen noch ${formatMissing(siding.cost)}.`, "bad");
    return;
  }
  payCost(siding.cost);
  game.sidings.add(siding.id);
  applyBuiltWorld();
  showMessage(`${siding.name} ist jetzt zweigleisig! Züge verteilen sich auf beide Ladegleise.`, "good");
  showcaseCamera(new THREE.Vector3(...siding.camera), 40, 5000);
  updateHud();
}

function diamondUnlocked() {
  return game.built.gold;
}

function mineRate() {
  const level = game.diamond.levels.mine;
  return DIAMOND_RATES.mine * (level >= 1 ? 2 : 1) * (level >= 2 ? 1.5 : 1) * (level >= 4 ? 1.5 : 1) * (level >= 5 ? 2 : 1);
}

function cableSpeed() {
  return game.diamond.levels.cable >= 2 ? 1.5 : 1;
}

function cableRate() {
  const level = game.diamond.levels.cable;
  return DIAMOND_RATES.cable * (level >= 1 ? 2 : 1) * cableSpeed() * (level >= 3 ? 2 : 1) * (level >= 4 ? 2 : 1);
}

function cableRunning() {
  return game.diamond.levels.cable >= 5 || game.diamond.cycle < DIAMOND_RATES.run;
}

function bufferCap() {
  return game.diamond.levels.line >= 1 ? DIAMOND_RATES.bigBuffer : DIAMOND_RATES.buffer;
}

function cutTime() {
  return DIAMOND_RATES.cutTime / (game.diamond.levels.proc >= 2 ? 2 : 1);
}

function cableAverage() {
  return cableRate() * (game.diamond.levels.cable >= 5 ? 1 : DIAMOND_RATES.run / DIAMOND_RATES.cycle);
}

function updateDiamonds(dt) {
  const d = game.diamond;
  if (!d.built) return;
  const before = d.top;
  d.top = Math.min(DIAMOND_RATES.top, d.top + mineRate() * dt);
  d.cycle = (d.cycle + dt) % DIAMOND_RATES.cycle;
  let moved = 0;
  if (cableRunning()) {
    cableTravel += cableSpeed() * dt;
    moved = Math.min(cableRate() * dt, d.top, Math.max(bufferCap() - d.buffer, 0));
    d.top -= moved;
    d.buffer += moved;
  }
  trackDiamondFlow(dt, Math.max(d.top + moved - before, 0), moved);
  if (d.levels.proc < 1) return;
  if (d.cutting) {
    d.cut += dt;
    if (d.cut < cutTime()) return;
    d.cutting = false;
    d.cut = 0;
    game.smelted.cutdiamond += 1;
    updateHud();
  } else if (game.stock[DIAMOND] >= DIAMOND_RATES.cutCost) {
    game.stock[DIAMOND] -= DIAMOND_RATES.cutCost;
    diamondBucket().used += DIAMOND_RATES.cutCost;
    d.cutting = true;
    d.cut = 0;
    updateHud();
  }
}

function formatRate(rate) {
  return rate.toLocaleString("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function emptyDiamondBucket(start) {
  return { start, time: 0, mined: 0, moved: 0, loaded: 0, used: 0, busy: 0, top: 0, buffer: 0, stock: 0, topFull: 0, bufferFull: 0 };
}

function diamondBucket() {
  const stats = diamondStats;
  let bucket = stats.buckets.at(-1);
  if (!bucket || stats.clock - bucket.start >= DIAMOND_BUCKET) {
    bucket = emptyDiamondBucket(stats.clock);
    stats.buckets.push(bucket);
    while (stats.clock - stats.buckets[0].start > DIAMOND_WINDOW) stats.buckets.shift();
  }
  return bucket;
}

function trackDiamondFlow(dt, mined, moved) {
  const d = game.diamond;
  diamondStats.clock += dt;
  const bucket = diamondBucket();
  bucket.time += dt;
  bucket.mined += mined;
  bucket.moved += moved;
  if (d.cutting) bucket.busy += dt;
  bucket.top += (d.top / DIAMOND_RATES.top) * dt;
  bucket.buffer += (d.buffer / bufferCap()) * dt;
  bucket.stock += game.stock[DIAMOND] * dt;
  if (d.top > DIAMOND_RATES.top - 0.5) bucket.topFull += dt;
  if (d.buffer > bufferCap() - 1) bucket.bufferFull += dt;
}

function trackDiamondTrip(run, record, phase, capacity) {
  const clock = diamondStats.clock;
  const trip = diamondStats.trips.get(run.id) ?? {};
  if (record.tripStart == null) {
    record.tripStart = clock;
    // Waiting for diamonds at the loader is not train capacity, so it is swapped for the time a full load would take.
    const cycle = trip.arrive == null ? Infinity : clock - trip.arrive;
    if (cycle < DIAMOND_WINDOW * 10) trip.rate = trip.capacity / Math.max(cycle - trip.held + trip.fill, 1);
    trip.arrive = clock;
  }
  trip.held = phase.time;
  trip.capacity = capacity;
  trip.fill = 1.5 + (capacity - 1) * DIAMOND_RATES.loadGap;
  diamondStats.trips.set(run.id, trip);
}

function diamondFlow() {
  const d = game.diamond;
  const total = emptyDiamondBucket(0);
  for (const bucket of diamondStats.buckets) {
    for (const key of Object.keys(total)) total[key] += bucket[key];
  }
  const time = Math.max(total.time, 1e-6);
  const perMinute = (key) => (total[key] / time) * 60;
  const share = (key) => total[key] / time;
  const runs = activeRuns().filter((run) => run.target === DIAMOND);
  const trips = runs.map((run) => diamondStats.trips.get(run.id)?.rate).filter((rate) => rate != null);
  const flow = {
    mine: { rate: perMinute("mined"), cap: mineRate() * 60 },
    top: { fill: share("top"), full: share("topFull"), now: d.top, cap: DIAMOND_RATES.top },
    cable: { rate: perMinute("moved"), cap: cableAverage() * 60 },
    buffer: { fill: share("buffer"), full: share("bufferFull"), now: d.buffer, cap: bufferCap() },
    trains: {
      rate: perMinute("loaded"),
      cap: trips.length ? trips.reduce((sum, rate) => sum + rate, 0) * 60 : null,
      partial: trips.length < runs.length,
      count: runs.length,
    },
    stock: { avg: share("stock"), now: game.stock[DIAMOND] },
    workshop: d.levels.proc >= 1 ? { rate: perMinute("used"), cap: (DIAMOND_RATES.cutCost / cutTime()) * 60, busy: share("busy") } : null,
  };
  flow.limit = diamondLimit(flow);
  diamondStats.limit = flow.limit;
  return flow;
}

// A stage limits the chain when the store in front of it backs up; checked from the end of the chain backwards.
function diamondLimit(flow) {
  const was = diamondStats.limit;
  const over = (id, value, enter) => value >= (was === id ? enter - 0.15 : enter);
  const { workshop, trains } = flow;
  if (trains.count === 0) return "trains";
  const piled = flow.stock.avg >= (was === "workshop" ? 1.5 : 3) * DIAMOND_RATES.cutCost;
  if (workshop && over("workshop", workshop.busy, 0.9) && piled) return "workshop";
  const supply = Math.min(flow.mine.cap, flow.cable.cap);
  const slowTrains = trains.cap != null && !trains.partial && trains.cap < supply * 0.85 && flow.buffer.fill >= 0.3;
  if (over("trains", Math.max(flow.buffer.fill, flow.buffer.full), 0.75) || slowTrains) return "trains";
  if (over("cable", Math.max(flow.top.fill, flow.top.full), 0.75) || flow.mine.cap > flow.cable.cap * 1.05) return "cable";
  return "mine";
}

function diamondLimitInfo(flow) {
  const d = game.diamond;
  const next = (groupId) => DIAMOND_GROUPS_BY_ID[groupId].upgrades[d.levels[groupId]]?.name;
  if (flow.limit === "mine") {
    return {
      title: "Engpass: Mine – Seilbahn und Züge warten auf Diamanten",
      hint: next("mine") ? `Hilft: Ausbau „${next("mine")}“ bei der Diamantmine.` : "Die Mine ist voll ausgebaut, mehr geht nicht.",
    };
  }
  if (flow.limit === "cable") {
    return {
      title: flow.top.fill >= 0.5 ? "Engpass: Seilbahn – Bergstation läuft voll" : "Engpass: Seilbahn – trägt weniger, als die Mine fördert",
      hint: next("cable") ? `Hilft: Ausbau „${next("cable")}“ bei der Seilbahn.` : "Die Seilbahn ist voll ausgebaut.",
    };
  }
  if (flow.limit === "trains") {
    if (flow.trains.count === 0) {
      return { title: "Engpass: Züge – kein Zug fährt zur Diamantmine", hint: "Hilft: In der Zugliste einen Zug auf „Diamant“ stellen." };
    }
    const ideas = ["mehr Züge auf „Diamant“ schicken"];
    if (next("line")) ideas.push(`Ausbau „${next("line")}“`);
    if (d.levels.proc === 3) ideas.push("Ausbau „Panzerwagen“");
    if (d.levels.proc >= 3 && !game.owned.has("diamant")) ideas.push("Diamant-Express kaufen");
    return {
      title: flow.buffer.fill >= 0.5 ? "Engpass: Züge – Ladestation läuft voll" : "Engpass: Züge – holen weniger ab, als die Seilbahn bringt",
      hint: `Hilft: ${ideas.join(", ")}.`,
    };
  }
  return {
    title: "Engpass: Schleiferei – Rohdiamanten stapeln sich im Lager",
    hint:
      d.levels.proc < 2
        ? "Hilft: Ausbau „Waschanlage“, dann schleift sie doppelt so schnell."
        : "Die Schleiferei ist voll ausgebaut, die übrigen Rohdiamanten bleiben im Lager.",
  };
}

function createDiamondFlow() {
  const ui = hud.diamond;
  const make = (className, parent, tag = "div") => {
    const element = document.createElement(tag);
    element.className = className;
    parent.append(element);
    return element;
  };
  const limit = make("diamond-limit", ui.flow);
  const title = make("diamond-limit-title", limit);
  const hint = make("diamond-limit-hint", limit);
  const rows = {};
  for (const [id, kind, name] of DIAMOND_FLOW_ROWS) {
    const row = make(`diamond-row diamond-${kind}`, ui.flow);
    const label = make("diamond-row-name", row, "span");
    label.textContent = name;
    const value = make("diamond-row-value", row, "span");
    const meter = make("diamond-meter", row, "span");
    const bar = make("", meter, "span");
    rows[id] = { row, label, value, meter, bar };
  }
  ui.flowParts = { limit, title, hint, rows };
}

function renderDiamondFlow() {
  const parts = hud.diamond.flowParts;
  const flow = diamondFlow();
  const info = diamondLimitInfo(flow);
  const setText = (element, text) => {
    if (element.textContent !== text) element.textContent = text;
  };
  setText(parts.title, `⚠ ${info.title}`);
  setText(parts.hint, info.hint);
  const show = (id, label, value, ratio) => {
    const { row, label: name, value: text, meter, bar } = parts.rows[id];
    row.hidden = value == null;
    if (value == null) return;
    if (label) setText(name, label);
    setText(text, value);
    meter.hidden = ratio == null;
    if (ratio != null) bar.style.width = `${Math.round(THREE.MathUtils.clamp(ratio, 0, 1) * 100)}%`;
    row.classList.toggle("limit", flow.limit === id);
    row.classList.toggle("full", DIAMOND_LIMIT_STORE[flow.limit] === id);
  };
  const rate = (stage, prefix = "") =>
    stage.cap == null ? `${formatRate(stage.rate)} pro Min.` : `${formatRate(stage.rate)} von ${prefix}${formatRate(stage.cap)} pro Min.`;
  const usage = (stage) => (stage.cap ? stage.rate / stage.cap : null);
  const { mine, top, cable, buffer, trains, stock, workshop } = flow;
  show("mine", null, rate(mine), usage(mine));
  show("top", null, `${Math.floor(top.now)}/${top.cap}`, top.now / top.cap);
  show("cable", null, `${rate(cable)}${cableRunning() ? "" : " · Pause"}`, usage(cable));
  show("buffer", null, `${Math.floor(buffer.now)}/${buffer.cap}`, buffer.now / buffer.cap);
  show("trains", `Züge (${trains.count})`, rate(trains, trains.partial ? "≥ " : "≈ "), usage(trains));
  show("stock", null, `${stock.now} Rohdiamanten`, null);
  show(
    "workshop",
    null,
    workshop && `${rate(workshop)} · ${game.diamond.cutting ? "schleift" : "wartet"}`,
    workshop && workshop.busy,
  );
}

function createDiamondUpgradeList() {
  const ui = hud.diamond;
  for (const group of DIAMOND_GROUPS) {
    const item = document.createElement("div");
    item.className = "diamond-group";
    const stage = document.createElement("div");
    stage.className = "build-title";
    const steps = document.createElement("div");
    steps.className = "diamond-steps";
    const dots = group.upgrades.map((upgrade) => {
      const dot = document.createElement("span");
      dot.title = upgrade.name;
      steps.append(dot);
      return dot;
    });
    const desc = document.createElement("div");
    desc.className = "build-desc";
    const status = document.createElement("div");
    status.className = "build-status";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "build-button";
    button.addEventListener("click", () => {
      upgradeDiamond(group.id);
      button.blur();
    });
    item.append(stage, steps, desc, status, button);
    ui.upgrades.append(item);
    ui.groups[group.id] = { item, stage, dots, desc, status, button };
  }
  createDiamondFlow();
}

function refreshDiamondHud() {
  const ui = hud.diamond;
  const d = game.diamond;
  const unlocked = diamondUnlocked();
  ui.card.classList.toggle("done", d.built);
  ui.card.classList.toggle("locked", !unlocked && !d.built);
  ui.upgrades.hidden = !d.built;
  ui.flow.hidden = !d.built;
  if (!d.built) {
    const affordable = canAfford(DIAMOND_UNLOCK);
    ui.button.hidden = !unlocked;
    ui.button.classList.toggle("waiting", !affordable);
    ui.button.textContent = affordable
      ? `Jetzt bauen (${formatCost(DIAMOND_UNLOCK)})`
      : `Bauen: fehlen ${formatMissing(DIAMOND_UNLOCK)}`;
    ui.status.textContent = !unlocked
      ? "Gesperrt: erst die Goldstrecke bauen."
      : affordable
        ? "Genug Material! Die lange Strecke zum Diamantberg kann gebaut werden."
        : `Dir fehlen noch ${formatMissing(DIAMOND_UNLOCK)}.`;
    ui.bar.style.width = `${unlocked ? Math.min(costProgress(DIAMOND_UNLOCK), 1) * 100 : 0}%`;
    return unlocked && affordable;
  }
  ui.button.hidden = true;
  ui.bar.style.width = "100%";
  ui.status.textContent = "Gebaut ✓ In der Zugliste „Diamant“ wählen.";
  renderDiamondFlow();
  let ready = false;
  for (const group of DIAMOND_GROUPS) {
    const g = ui.groups[group.id];
    const level = d.levels[group.id];
    const stage = group.upgrades[level - 1];
    const next = group.upgrades[level];
    const after = group.upgrades[level + 1];
    g.item.classList.toggle("done", !next);
    g.stage.textContent = `${group.name} · Stufe ${level + 1}${stage ? `: ${stage.name}` : ""}`;
    g.dots.forEach((dot, index) => dot.classList.toggle("on", index < level));
    g.desc.textContent = next ? `Nächster Ausbau · ${next.name}: ${next.desc}` : `Voll ausgebaut. ${stage.desc}`;
    g.button.hidden = !next;
    if (!next) {
      g.status.textContent = "";
      continue;
    }
    if (level === 0) g.status.textContent = group.base;
    else g.status.textContent = after ? `Danach: ${after.name}.` : "Das ist der letzte Ausbau.";
    const affordable = canAfford(next.cost);
    ready ||= affordable;
    g.button.classList.toggle("waiting", !affordable);
    g.button.textContent = affordable
      ? `Ausbauen (${formatCost(next.cost)})`
      : `Ausbauen: fehlen ${formatMissing(next.cost)}`;
  }
  return ready;
}

function buildDiamond() {
  const d = game.diamond;
  if (d.built) return;
  if (!diamondUnlocked()) {
    showMessage("Die Diamantmine gibt es erst nach der Goldstrecke.", "bad");
    return;
  }
  if (!canAfford(DIAMOND_UNLOCK)) {
    showMessage(`Diamantmine: es fehlen noch ${formatMissing(DIAMOND_UNLOCK)}.`, "bad");
    return;
  }
  payCost(DIAMOND_UNLOCK);
  d.built = true;
  applyBuiltWorld();
  showMessage(
    "Die Diamantstrecke ist fertig! Oben am Berg gräbt die Mine, die Seilbahn bringt die Rohdiamanten ans Gleis. In der Zugliste „Diamant“ wählen.",
    "good",
  );
  const { point, distance } = diamondWorld.focus("site");
  showcaseCamera(point, distance, 7000);
  updateHud();
}

function upgradeDiamond(groupId) {
  const d = game.diamond;
  const group = DIAMOND_GROUPS_BY_ID[groupId];
  if (!d.built || !group) return;
  const next = group.upgrades[d.levels[groupId]];
  if (!next) return;
  if (!canAfford(next.cost)) {
    showMessage(`${next.name}: es fehlen noch ${formatMissing(next.cost)}.`, "bad");
    return;
  }
  payCost(next.cost);
  d.levels[groupId] += 1;
  applyBuiltWorld();
  const shortcut = groupId === "line" && d.levels.line >= 3 && runsOnDiamond() > 0;
  showMessage(`${next.name} ist fertig. ${next.desc}${shortcut ? " Die Züge nehmen ab dem Bahnhof den neuen Weg." : ""}`, "good");
  const { point, distance } = diamondWorld.focus(groupId, d.levels[groupId]);
  showcaseCamera(point, distance, 5500);
  updateHud();
}

function runsOnDiamond() {
  return game.runs.filter((run) => run.target === DIAMOND).length;
}

function renderDiamonds(time, dt) {
  MINERAL_MATERIALS[DIAMOND].emissiveIntensity = 0.55 + Math.sin(time * 4.3) * 0.25 + Math.sin(time * 11.7) * 0.15;
  const d = game.diamond;
  diamondWorld.animate({
    time,
    dt,
    built: d.built,
    levels: d.levels,
    travel: cableTravel,
    running: cableRunning(),
    buffer: d.buffer / bufferCap(),
    top: d.top / DIAMOND_RATES.top,
    cutting: d.cutting,
    limit: d.built ? diamondStats.limit : null,
  });
  diamondHudTimer -= dt;
  if (d.built && diamondHudTimer <= 0) {
    diamondHudTimer = 0.25;
    renderDiamondFlow();
  }
}

function stockLabel() {
  const parts = [];
  for (const mineral of [COAL, IRON, GOLD, DIAMOND]) {
    const count = game.stock[mineral];
    if (count > 0) parts.push(`${count}× ${MINERALS[mineral].name}`);
  }
  if (game.smelted.steel > 0) parts.push(`${game.smelted.steel}× Stahl`);
  if (game.smelted.goldbar > 0) parts.push(`${game.smelted.goldbar}× Goldbarren`);
  if (game.smelted.cutdiamond > 0) parts.push(`${game.smelted.cutdiamond}× Diamanten`);
  return parts.join(", ") || "leer";
}

function pileOf(id) {
  return SMELTED_GOODS.includes(id) ? game.smelted : game.stock;
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
    const cost = recipeCost(recipe);
    button.disabled = busy;
    button.classList.toggle("waiting", !busy && !canAfford(cost));
    button.textContent =
      job?.id === recipe.id
        ? `Schmilzt ${game.smelter.batch > 1 ? `2× ` : ""}${recipe.name} …`
        : canAfford(cost)
          ? `${recipe.name} gießen (${formatCost(cost)})`
          : `${recipe.name}: fehlen ${formatMissing(cost)}`;
  }
  const { auto, plan } = game.smelter;
  ui.auto.checked = auto;
  for (const id of PLAN_ORDER) ui.planCounts[id].textContent = plan[id];
  if (built) {
    const next = auto ? nextAutoRecipe() : null;
    ui.autoStatus.textContent = !auto
      ? "Aus: du startest jeden Guss selbst."
      : next && !job && !canAfford(recipeCost(next))
        ? `Wartet auf ${formatMissing(recipeCost(next))} für ${next.name}.`
        : `Als Nächstes: ${next.name}.`;
  }
  const upgrade = built ? SMELTER_UPGRADES[game.smelterLevel] : null;
  const upgradeReady = Boolean(upgrade && canAfford(upgrade.cost));
  ui.upgrade.hidden = !built;
  if (built) {
    const stage = SMELTER_UPGRADES[game.smelterLevel - 1];
    ui.upgradeStage.textContent = stage ? `Stufe ${game.smelterLevel + 1}: ${stage.name}` : "Stufe 1: einfacher Ofen";
    ui.upgradeDesc.textContent = upgrade ? `Nächster Ausbau · ${upgrade.name}: ${upgrade.desc}` : "Voll ausgebaut.";
    ui.upgradeButton.hidden = !upgrade;
    if (upgrade) {
      ui.upgradeButton.classList.toggle("waiting", !upgradeReady);
      ui.upgradeButton.textContent = upgradeReady
        ? `Ausbauen (${formatCost(upgrade.cost)})`
        : `Ausbauen: fehlen ${formatMissing(upgrade.cost)}`;
    }
  }
  if (built) {
    ui.status.textContent = job
      ? `${game.smelter.batch > 1 ? "2× " : ""}${job.name} ist im Ofen.`
      : "Gießt Stahl und Goldbarren. Damit baust du den Bahnhof aus.";
    ui.bar.style.width = job ? `${Math.min(game.smelter.time / recipeTime(job), 1) * 100}%` : "100%";
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
  return (
    canBuild ||
    upgradeReady ||
    (built && !auto && !job && Object.values(RECIPES).some((recipe) => canAfford(recipeCost(recipe))))
  );
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

function planSequence() {
  return PLAN_ORDER.flatMap((id) => Array.from({ length: game.smelter.plan[id] }, () => id));
}

function nextAutoRecipe() {
  const sequence = planSequence();
  return sequence.length ? RECIPES[sequence[game.smelter.step % sequence.length]] : null;
}

function smelterStage() {
  return SMELTER_UPGRADES[game.smelterLevel - 1] ?? { speed: 1, coal: RECIPES.steel.cost[COAL], batch: 1 };
}

function recipeCost(recipe, batch = 1) {
  const cost = { ...recipe.cost, [COAL]: smelterStage().coal };
  return Object.fromEntries(Object.entries(cost).map(([good, amount]) => [good, amount * batch]));
}

function recipeTime(recipe) {
  return recipe.time / smelterStage().speed;
}

function beginSmelt(recipe) {
  const batch = smelterStage().batch > 1 && canAfford(recipeCost(recipe, 2)) ? 2 : 1;
  payCost(recipeCost(recipe, batch));
  game.smelter.recipe = recipe.id;
  game.smelter.time = 0;
  game.smelter.batch = batch;
}

function updateSmelter(dt) {
  if (!game.built.smelter) return;
  const recipe = RECIPES[game.smelter.recipe];
  if (!recipe) {
    const next = game.smelter.auto ? nextAutoRecipe() : null;
    if (next && canAfford(recipeCost(next))) {
      beginSmelt(next);
      game.smelter.step = (game.smelter.step + 1) % planSequence().length;
      updateHud();
    }
    return;
  }
  game.smelter.time += dt;
  if (game.smelter.time < recipeTime(recipe)) return;
  const batch = game.smelter.batch ?? 1;
  game.smelter.recipe = null;
  game.smelter.time = 0;
  game.smelter.batch = 1;
  game.smelted[recipe.id] += batch;
  if (!game.smelter.auto) showMessage(`Die Schmelzhütte hat ${batch} ${recipe.name} gegossen.`, "good");
  updateHud();
}

function startSmelt(id) {
  const recipe = RECIPES[id];
  if (!game.built.smelter || !recipe || game.smelter.recipe) return;
  if (!canAfford(recipeCost(recipe))) {
    showMessage(`${recipe.name}: es fehlen noch ${formatMissing(recipeCost(recipe))}.`, "bad");
    return;
  }
  beginSmelt(recipe);
  showMessage(`Die Schmelzhütte schmilzt ${recipe.name}.`, "good");
  updateHud();
}

function upgradeSmelter() {
  const next = SMELTER_UPGRADES[game.smelterLevel];
  if (!game.built.smelter || !next) return;
  if (!canAfford(next.cost)) {
    showMessage(`${next.name}: es fehlen noch ${formatMissing(next.cost)}.`, "bad");
    return;
  }
  payCost(next.cost);
  game.smelterLevel += 1;
  applyBuiltWorld();
  showMessage(`${next.name} ist fertig. ${next.desc}`, "good");
  showcaseCamera(smelter.group.position.clone().setY(1.5), 20, 4500);
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

function lineUnlocked(line) {
  return !line.needs || game.built[line.needs];
}

function lineUpgrades(kind) {
  return kind === "train" ? TRAIN_UPGRADES : TRACK_UPGRADES;
}

function upgradeLine(target, kind) {
  const line = LINE_ROUTES_BY_TARGET[target];
  if (!line || !lineUnlocked(line)) return;
  const levels = game.lines[target];
  const next = lineUpgrades(kind)[levels[kind]];
  if (!next) return;
  const cost = next.cost[target];
  if (!canAfford(cost)) {
    showMessage(`${next.name} (${line.name}): es fehlen noch ${formatMissing(cost)}.`, "bad");
    return;
  }
  payCost(cost);
  levels[kind] += 1;
  if (kind === "train") {
    for (const run of activeRuns()) {
      if (run.target === target && run.sim.phase?.type === "drive") retargetDrive(run);
    }
  }
  const more = kind === "track" ? ` Jetzt fahren bis zu ${lineSlots(target)} ${line.trains} gleichzeitig.` : "";
  showMessage(`${next.name} für die ${line.name} ist fertig. ${next.desc}${more}`, "good");
  updateHud();
}

function createLineUpgradeList() {
  const list = document.querySelector("#line-upgrades");
  const groups = {};
  for (const line of LINE_ROUTES) {
    const item = document.createElement("div");
    item.className = "diamond-group line-group";
    const title = document.createElement("div");
    title.className = "build-title";
    const slots = document.createElement("div");
    slots.className = "build-status line-slots";
    item.append(title, slots);
    const kinds = {};
    for (const kind of ["train", "track"]) {
      const stage = document.createElement("div");
      stage.className = "line-stage";
      const steps = document.createElement("div");
      steps.className = "diamond-steps";
      const dots = lineUpgrades(kind).map((upgrade) => {
        const dot = document.createElement("span");
        dot.title = upgrade.name;
        steps.append(dot);
        return dot;
      });
      const desc = document.createElement("div");
      desc.className = "build-desc";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "build-button";
      button.addEventListener("click", () => {
        upgradeLine(line.target, kind);
        button.blur();
      });
      item.append(stage, steps, desc, button);
      kinds[kind] = { stage, dots, desc, button };
    }
    list.append(item);
    groups[line.target] = { item, title, slots, kinds };
  }
  return groups;
}

function lineEffectText(target) {
  const parts = [];
  const capacity = lineBoost(target, "capacity");
  if (capacity > 1) parts.push(`+${Math.round((capacity - 1) * 100)} % Ladung`);
  const load = lineBoost(target, "load");
  if (load < STOP_WAIT.mine) parts.push(`Laden in ${load} s`);
  const speed = lineBoost(target, "speed");
  if (speed > 1) parts.push(`+${Math.round((speed - 1) * 100)} % Tempo`);
  return parts.join(", ");
}

function refreshLineHud() {
  let ready = false;
  for (const line of LINE_ROUTES) {
    const ui = lineGroups[line.target];
    const unlocked = lineUnlocked(line);
    ui.item.hidden = !unlocked;
    if (!unlocked) continue;
    const levels = game.lines[line.target];
    const active = lineActive(line.target);
    const waiting = game.runs.filter((run) => run.parked && run.target === line.target).length;
    ui.title.textContent = line.name;
    ui.slots.textContent =
      `${active} von ${lineSlots(line.target)} Plätzen belegt` + (waiting ? ` · ${waiting} im Depot` : "") + ".";
    for (const kind of ["train", "track"]) {
      const g = ui.kinds[kind];
      const upgrades = lineUpgrades(kind);
      const level = levels[kind];
      const stage = upgrades[level - 1];
      const next = upgrades[level];
      const label = kind === "train" ? line.trains : "Strecke";
      const effect = kind === "train" ? lineEffectText(line.target) : `${lineSlots(line.target)} Züge`;
      g.stage.textContent = `${label} · Stufe ${level + 1}${stage ? `: ${stage.name}` : ""}${effect ? ` (${effect})` : ""}`;
      g.dots.forEach((dot, index) => dot.classList.toggle("on", index < level));
      g.desc.textContent = next ? `Nächster Ausbau · ${next.name}: ${next.desc}` : "Voll ausgebaut.";
      g.button.hidden = !next;
      if (!next) continue;
      const cost = next.cost[line.target];
      const affordable = canAfford(cost);
      ready ||= affordable;
      g.button.classList.toggle("waiting", !affordable);
      g.button.textContent = affordable ? `Ausbauen (${formatCost(cost)})` : `Ausbauen: fehlen ${formatMissing(cost)}`;
    }
  }
  return ready;
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
    hud.smelter.bar.style.width = `${Math.min(game.smelter.time / recipeTime(RECIPES[game.smelter.recipe]), 1) * 100}%`;
  }
  smelter.bellows.scale.y = active && game.smelterLevel >= 1 ? 0.75 + Math.sin(time * 6) * 0.25 : 1;
  if (smelter.secondMouth.visible) smelter.secondMouth.material.emissiveIntensity = pulse;
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
  if (target === DIAMOND && game.diamond.built) return DIAMOND;
  return COAL;
}

async function fetchFileSave() {
  try {
    const response = await fetch(SAVE_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    lastFileSave = JSON.stringify(data);
    return data;
  } catch {
    return null;
  }
}

function readLocalSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

function loadGame(fileSave) {
  try {
    const localSave = readLocalSave();
    const data = (localSave?.savedAt ?? 0) > (fileSave?.savedAt ?? 0) ? localSave : (fileSave ?? localSave);
    if (!data || (data.v !== 1 && data.v !== 2)) return;
    for (const id of ["iron", "gold", "smelter"]) {
      if (data.built?.[id]) game.built[id] = true;
    }
    loadDiamond(data.diamond);
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
    for (const mineral of [COAL, IRON, GOLD, DIAMOND]) {
      const count = data.stock?.[mineral];
      if (Number.isFinite(count)) game.stock[mineral] = Math.max(0, Math.floor(count));
    }
    for (const kind of SMELTED_GOODS) {
      const count = data.smelted?.[kind];
      if (Number.isFinite(count)) game.smelted[kind] = Math.max(0, Math.floor(count));
    }
    if (Number.isInteger(data.platforms)) {
      game.platforms = Math.min(PLATFORMS.length, Math.max(1, data.platforms));
    }
    if (data.express === true) game.express = true;
    for (const line of LINE_ROUTES) {
      const saved = data.lines?.[line.target];
      for (const kind of ["train", "track"]) {
        const level = saved?.[kind];
        if (Number.isInteger(level)) game.lines[line.target][kind] = Math.min(lineUpgrades(kind).length, Math.max(0, level));
      }
    }
    if (Array.isArray(data.sidings)) {
      for (const id of data.sidings) if (SIDINGS_BY_ID[id]) game.sidings.add(id);
    }
    if (Number.isInteger(data.stationLevel)) {
      game.stationLevel = Math.min(STATION_UPGRADES.length, Math.max(0, data.stationLevel));
    }
    if (RECIPES[data.smelter?.recipe]) {
      game.smelter.recipe = data.smelter.recipe;
      game.smelter.time = Number.isFinite(data.smelter.time) ? Math.max(0, data.smelter.time) : 0;
    }
    if (data.smelter?.batch === 2) game.smelter.batch = 2;
    if (Number.isInteger(data.smelterLevel)) {
      game.smelterLevel = Math.min(SMELTER_UPGRADES.length, Math.max(0, data.smelterLevel));
    }
    if (data.smelter?.auto === true) game.smelter.auto = true;
    for (const id of PLAN_ORDER) {
      const count = data.smelter?.plan?.[id];
      if (Number.isInteger(count)) game.smelter.plan[id] = Math.min(MAX_PLAN_COUNT, Math.max(0, count));
    }
    if (planSequence().length === 0) game.smelter.plan.goldbar = 1;
    if (Number.isInteger(data.smelter?.step)) game.smelter.step = Math.max(0, data.smelter.step) % planSequence().length;
  } catch {
    // kaputter Speicher bleibt ungenutzt
  }
}

function loadDiamond(saved) {
  if (!saved || typeof saved !== "object" || saved.built !== true || !game.built.gold) return;
  const d = game.diamond;
  d.built = true;
  for (const group of DIAMOND_GROUPS) {
    const level = saved.levels?.[group.id];
    if (Number.isInteger(level)) d.levels[group.id] = Math.min(group.upgrades.length, Math.max(0, level));
  }
  const amount = (value, max) => (Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0);
  d.top = amount(saved.top, DIAMOND_RATES.top);
  d.buffer = amount(saved.buffer, bufferCap());
  d.cycle = amount(saved.cycle, DIAMOND_RATES.cycle - 0.001);
  d.cutting = saved.cutting === true && d.levels.proc >= 1;
  d.cut = d.cutting ? amount(saved.cut, cutTime()) : 0;
  d.bigFound = Number.isInteger(saved.bigFound) ? Math.max(0, saved.bigFound) : 0;
}

function saveSnapshot() {
  return {
    v: 2,
    savedAt: Date.now(),
    built: game.built,
    owned: [...game.owned],
    focusId: game.focusId,
    runs: game.runs.map((run) => ({ id: run.id, modelId: run.modelId, target: run.target })),
    stock: game.stock,
    smelted: game.smelted,
    smelter: game.smelter,
    stationLevel: game.stationLevel,
    smelterLevel: game.smelterLevel,
    platforms: game.platforms,
    sidings: [...game.sidings],
    express: game.express,
    lines: Object.fromEntries(Object.entries(game.lines).map(([target, levels]) => [target, { ...levels }])),
    diamond: diamondSnapshot(),
  };
}

function diamondSnapshot() {
  const d = game.diamond;
  return {
    built: d.built,
    levels: { ...d.levels },
    top: Math.floor(d.top),
    buffer: Math.floor(d.buffer),
    cycle: Math.floor(d.cycle),
    cutting: d.cutting,
    cut: d.cutting ? Math.floor(d.cut) : 0,
    bigFound: d.bigFound,
  };
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveSnapshot()));
  } catch {
    // privates Fenster ohne Speicher
  }
  fileSaveTimer ??= setTimeout(writeFileSave, FILE_SAVE_DELAY);
}

function fileSaveBody() {
  const { savedAt, ...rest } = saveSnapshot();
  const content = JSON.stringify(rest);
  const previous = lastFileSave && JSON.stringify({ ...JSON.parse(lastFileSave), savedAt: undefined });
  if (previous === content) return null;
  return JSON.stringify({ ...rest, savedAt }, null, 2);
}

async function writeFileSave() {
  fileSaveTimer = null;
  const body = fileSaveBody();
  if (!body) return;
  try {
    const response = await fetch(SAVE_URL, { method: "POST", body, headers: { "Content-Type": "application/json" } });
    if (response.ok) lastFileSave = body;
  } catch {
    // ohne Server bleibt der Browser-Speicher
  }
}

function flushFileSave() {
  const body = fileSaveBody();
  if (!body) return;
  if (navigator.sendBeacon(SAVE_URL, new Blob([body], { type: "application/json" }))) lastFileSave = body;
}

addEventListener("pagehide", flushFileSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushFileSave();
});

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
  hud.diamondMine.addEventListener("click", () => {
    const path = routes[DIAMOND_ROUTES[diamondShortcut()]][0];
    jumpTo(path, path.spots[DIAMOND]);
    const { point, distance } = diamondWorld.focus("site");
    showcaseCamera(point, distance, 8000);
  });

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
