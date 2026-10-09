// Geometrie und Physik
export const CURVE_RADIUS = 10;
export const RAIL_TOP_Y = 0.29;
export const GAUGE = 1.05;
export const WAGON_PITCH = 2.7;
export const WAGON_HALF = 1.2;
export const MAX_WAGONS = 5;

// Weltkoordinaten
export const WEST_X = -45;
export const FAR_Z = -55;
export const GOLD_Z = 120;
export const UNLOAD_X = 18;
export const COAL_CHUTE_X = 0;
export const IRON_CHUTE_X = 65;
export const GOLD_CHUTE_X = 10;
export const STATION_S = UNLOAD_X - (WEST_X + CURVE_RADIUS);
export const SWITCH_RADIUS = 6;

// Platform-Konfiguration
export const PLATFORMS = [
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

// Bewegung
export const HEAD_SHARED_S = 8;
export const TAIL_SHARED_S = 70;
export const SWITCH_ZONES = [
  { x0: -50, x1: -30, z0: -14, z1: 14 },
  { x0: -31, x1: -12.5, z0: -1.5, z1: 3.2 },
  { x0: 23, x1: 36, z0: -1.5, z1: 12.5 },
];

export const TOP_SPEED = 8;
export const ACCELERATION = 2.5;
export const TRAIN_CLEARANCE = 2.2;
export const STOP_WAIT = { station: 3.5, mine: 4 };

// Mineraldaten
export const COAL = "coal";
export const IRON = "iron";
export const GOLD = "gold";

export const MINERALS = {
  [COAL]: { name: "Kohle", color: 0x1b1b1e },
  [IRON]: { name: "Eisenerz", color: 0xa4553a },
  [GOLD]: { name: "Golderz", color: 0xf5c518 },
};

// Währungen und Ressourcen
export const LINES = {
  iron: { cost: { [COAL]: 4 }, name: "Gleis zur Eisenmine" },
  gold: { cost: { [COAL]: 4, [IRON]: 4 }, name: "Goldstrecke" },
};

export const SMELTER = { cost: { [COAL]: 6, [IRON]: 3 }, name: "Schmelzhütte" };
export const PLATFORM_COSTS = [null, { [COAL]: 8 }, { [COAL]: 6, [IRON]: 4 }, { steel: 3 }];

export const RECIPES = {
  steel: { id: "steel", name: "Stahl", cost: { [COAL]: 2, [IRON]: 1 }, time: 5 },
  goldbar: { id: "goldbar", name: "Goldbarren", cost: { [COAL]: 2, [GOLD]: 1 }, time: 7 },
};

export const STATION_UPGRADES = [
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
  {
    name: "Wagenheber",
    wait: 0.5,
    mineWait: 1,
    cost: { goldbar: 2 },
    desc: "Die Wagen heben sich selbst: am Bahnhof nur 0,5 Sekunden, in der Mine eine Sekunde.",
  },
];

export const CROWN = {
  name: "Bahnhofskrone",
  cost: { steel: 6, goldbar: 4 },
};

export const GOOD_NAMES = {
  [COAL]: "Kohle",
  [IRON]: "Eisenerz",
  [GOLD]: "Golderz",
  steel: "Stahl",
  goldbar: "Goldbarren",
};

export const SAVE_KEY = "deine-strecke-v1";

// Zug-Modelle
export const TRAIN_MODELS = [
  {
    id: "dampf",
    name: "Dampflok",
    rarity: "Gewöhnlich",
    look: "Grüne Dampflok mit einem Holzwagen.",
    capacity: 1,
    speed: 1,
    cost: {},
    build: null, // Wird zur Laufzeit zugewiesen
  },
  {
    id: "diesel",
    name: "Diesellok",
    rarity: "Ungewöhnlich",
    look: "Kantige rote Diesellok, graue Stahlwagen.",
    capacity: 2,
    speed: 1.25,
    cost: { [COAL]: 4 },
    build: null,
  },
  {
    id: "erz",
    name: "Erz-Zug",
    rarity: "Selten",
    look: "Blaue Lok mit Tender und Trichterwagen.",
    capacity: 3,
    speed: 1,
    cost: { [COAL]: 3, [IRON]: 3 },
    build: null,
  },
  {
    id: "schwer",
    name: "Schwere Güterlok",
    rarity: "Episch",
    look: "Riesiger schwarzer Kessel, rote Räder, Windleitbleche.",
    capacity: 4,
    speed: 0.85,
    cost: { [COAL]: 4, [IRON]: 6 },
    build: null,
  },
  {
    id: "goldzug",
    name: "Goldzug",
    rarity: "Legendär",
    look: "Stromlinie in Violett mit Messing und Goldrändern.",
    capacity: 5,
    speed: 1.4,
    cost: { [GOLD]: 4, [IRON]: 2 },
    build: null,
  },
  {
    id: "kaiser",
    name: "Kaiserzug",
    rarity: "Mythisch",
    look: "Goldene Kaiserlok mit Purpurwagen und Krönchen.",
    capacity: 5,
    speed: 1.6,
    cost: { steel: 4, goldbar: 2 },
    build: null,
  },
];

// Kamera
export const CAMERA_OFFSET = new THREE.Vector3(-15, 20, 18);
export const SUN_OFFSET = new THREE.Vector3(-20, 34, 14);
export const TRACK_PAN_SPEED = 24;