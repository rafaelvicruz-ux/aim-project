export const musicTracks = [
  {
    id: "escape-your-love",
    name: "Escape Your Love",
    src: new URL("../../music/fassounds-escape-your-love-upbeat-fashion-pop-dance-412230.mp3", import.meta.url).href,
  },
  {
    id: "sigma-no-copyright",
    name: "Sigma No Copyright",
    src: new URL("../../music/sigmamusicart-no-copyright-music-537751.mp3", import.meta.url).href,
  },
];

export const EDITOR_GRID_SIZE = 8;
export const EDITOR_CELL_WORLD = 8;
export const EDITOR_SNAP_STEPS = [0, 0.5, 1, 2, 4];

export const obstacleTypes = [
  { id: "crate", label: "Caixote", group: "Cobertura", defaultScale: 1, footprint: 2.4 },
  { id: "container", label: "Container", group: "Cobertura", defaultScale: 1, footprint: 6 },
  { id: "barrier", label: "Barreira", group: "Cobertura", defaultScale: 1, footprint: 3.2 },
  { id: "sandbags", label: "Sacos de areia", group: "Cobertura", defaultScale: 1, footprint: 3 },
  { id: "truck", label: "Caminhão", group: "Veículos", defaultScale: 1.1, footprint: 5 },
  { id: "barrel", label: "Barril", group: "Props", defaultScale: 1, footprint: 1.2 },
  { id: "trash-can", label: "Lixeira", group: "Props", defaultScale: 1, footprint: 1.2 },
  { id: "cone", label: "Cone", group: "Props", defaultScale: 1, footprint: 0.8 },
  { id: "furniture", label: "Móveis", group: "Props", defaultScale: 1, footprint: 2.6 },
  { id: "rock", label: "Pedra", group: "Natureza", defaultScale: 1.2, footprint: 2.6 },
  { id: "tree", label: "Árvore", group: "Natureza", defaultScale: 1, footprint: 2 },
  { id: "pillar", label: "Pilar", group: "Estrutura", defaultScale: 1, footprint: 2.2 },
  { id: "wall", label: "Muro", group: "Estrutura", defaultScale: 1, footprint: 6 },
  { id: "ramp", label: "Rampa", group: "Estrutura", defaultScale: 1, footprint: 4 },
  { id: "lamp", label: "Poste de luz", group: "Estrutura", defaultScale: 1, footprint: 1 },
];

export const obstacleGroups = [...new Set(obstacleTypes.map((item) => item.group))];

export const arenaPrefabs = [
  {
    id: "simulation-bay",
    label: "Simulation Bay",
    help: "Arena limpa no estilo laboratório para treinos puros.",
    floorColor: "#121c2d",
    wallColor: "#0d1526",
    accentColor: "#2d6cff",
    skyTop: "#050914",
    skyBottom: "#0f2036",
    fogDensity: 0.0075,
  },
  {
    id: "dock-lanes",
    label: "Dock Lanes",
    help: "Corredores com cobertura nas laterais para duelos rápidos.",
    floorColor: "#1a2230",
    wallColor: "#121927",
    accentColor: "#ff7a1a",
    skyTop: "#0a0603",
    skyBottom: "#2a1408",
    fogDensity: 0.009,
  },
  {
    id: "vertical-core",
    label: "Vertical Core",
    help: "Pilares altos e leitura de altura como num editor de arena vertical.",
    floorColor: "#111a28",
    wallColor: "#0b1120",
    accentColor: "#7ac7ff",
    skyTop: "#040711",
    skyBottom: "#0b2438",
    fogDensity: 0.0065,
  },
  {
    id: "crossfire-yard",
    label: "Crossfire Yard",
    help: "Pátio aberto com linhas cruzadas e cobertura central.",
    floorColor: "#162030",
    wallColor: "#10182a",
    accentColor: "#5fe0a1",
    skyTop: "#030b09",
    skyBottom: "#0a2a22",
    fogDensity: 0.008,
  },
  {
    id: "neon-grid",
    label: "Neon Grid",
    help: "Arena escura com contraste alto para leitura máxima do alvo.",
    floorColor: "#0b0f1c",
    wallColor: "#080b16",
    accentColor: "#c96bff",
    skyTop: "#06030d",
    skyBottom: "#1b0b30",
    fogDensity: 0.0055,
  },
];

export const spawnPresets = [
  {
    id: "front-arc",
    label: "Arco frontal",
    help: "Spawns abrem em leque na frente do jogador.",
    spread: 3.2,
    heightRange: [1.1, 2.2],
    anchors: [
      [-18, 0, -18],
      [-8, 0, -22],
      [0, 0, -24],
      [8, 0, -22],
      [18, 0, -18],
    ],
  },
  {
    id: "crossfire",
    label: "Crossfire",
    help: "Pressão lateral e frontal para forçar reposicionamento.",
    spread: 2.4,
    heightRange: [1.1, 2.6],
    anchors: [
      [-22, 0, -10],
      [22, 0, -10],
      [-18, 0, 8],
      [18, 0, 8],
      [0, 0, -22],
    ],
  },
  {
    id: "tower-stack",
    label: "Tower stack",
    help: "Spawn em colunas de altura variada para verticalidade.",
    spread: 1.6,
    heightRange: [1.4, 3.8],
    anchors: [
      [-16, 0, -18],
      [0, 0, -20],
      [16, 0, -18],
      [-10, 0, 10],
      [10, 0, 10],
    ],
  },
  {
    id: "rush-lanes",
    label: "Rush lanes",
    help: "Corredores agressivos vindo das laterais e do fundo.",
    spread: 2.1,
    heightRange: [1, 2],
    anchors: [
      [-24, 0, -4],
      [24, 0, -4],
      [-18, 0, -20],
      [18, 0, -20],
      [0, 0, -26],
    ],
  },
];

export const obstacleKits = [
  {
    id: "clean-range",
    label: "Clean Range",
    help: "Quase sem cobertura, foco total no aim.",
    obstacleSet: [],
  },
  {
    id: "urban-cover",
    label: "Urban Cover",
    help: "Mistura container, barreira e caminhão para cortes de visão.",
    obstacleSet: ["container", "barrier", "truck"],
  },
  {
    id: "natural-break",
    label: "Natural Break",
    help: "Pedras e árvores criam linhas quebradas.",
    obstacleSet: ["rock", "tree"],
  },
  {
    id: "clutter-stack",
    label: "Clutter Stack",
    help: "Mapa carregado com várias coberturas prontas.",
    obstacleSet: ["crate", "barrel", "sandbags", "container", "cone"],
  },
];

export const builderBlueprints = [
  {
    id: "flick-lab",
    label: "Flick Lab",
    description: "Parecido com um treino rápido de KovaaKs: arena limpa e spawn frontal.",
    arenaPrefab: "simulation-bay",
    spawnPreset: "front-arc",
    obstacleKit: "clean-range",
    scoring: "precision",
    pattern: "depth-pop",
    duration: 35,
    goalHits: 24,
    targetSize: 42,
    spawnRate: 520,
    targetLifetime: 1500,
    moveSpeed: 75,
    simultaneousTargets: 2,
    depthLayers: 3,
    strafeIntensity: 32,
    verticalDrift: 18,
  },
  {
    id: "tracker-grid",
    label: "Tracker Grid",
    description: "Mapa longo de tracking com leitura lateral e vertical.",
    arenaPrefab: "vertical-core",
    spawnPreset: "tower-stack",
    obstacleKit: "natural-break",
    scoring: "tracking",
    pattern: "tower",
    duration: 55,
    goalHits: 32,
    targetSize: 36,
    spawnRate: 480,
    targetLifetime: 2200,
    moveSpeed: 120,
    simultaneousTargets: 3,
    depthLayers: 4,
    strafeIntensity: 58,
    verticalDrift: 44,
  },
  {
    id: "pressure-yard",
    label: "Pressure Yard",
    description: "Pressão de vários ângulos com cobertura pronta e ritmo alto.",
    arenaPrefab: "crossfire-yard",
    spawnPreset: "crossfire",
    obstacleKit: "urban-cover",
    scoring: "combo",
    pattern: "lane-sweep",
    duration: 45,
    goalHits: 28,
    targetSize: 38,
    spawnRate: 420,
    targetLifetime: 1700,
    moveSpeed: 140,
    simultaneousTargets: 3,
    depthLayers: 3,
    strafeIntensity: 66,
    verticalDrift: 20,
  },
  {
    id: "rush-chaos",
    label: "Rush Chaos",
    description: "Mapa agressivo com corredores e cobertura pesada.",
    arenaPrefab: "dock-lanes",
    spawnPreset: "rush-lanes",
    obstacleKit: "clutter-stack",
    scoring: "combo",
    pattern: "zigzag",
    duration: 40,
    goalHits: 30,
    targetSize: 34,
    spawnRate: 360,
    targetLifetime: 1300,
    moveSpeed: 155,
    simultaneousTargets: 4,
    depthLayers: 2,
    strafeIntensity: 72,
    verticalDrift: 16,
  },
  {
    id: "neon-duel",
    label: "Neon Duel",
    description: "Arena neon de contraste alto para leitura rápida e microajuste.",
    arenaPrefab: "neon-grid",
    spawnPreset: "front-arc",
    obstacleKit: "clean-range",
    scoring: "precision",
    pattern: "orbit",
    duration: 45,
    goalHits: 26,
    targetSize: 34,
    spawnRate: 440,
    targetLifetime: 1900,
    moveSpeed: 95,
    simultaneousTargets: 2,
    depthLayers: 4,
    strafeIntensity: 48,
    verticalDrift: 26,
  },
];

const obstacleLayouts = {
  "trash-can": [
    { type: "trash-can", x: -12, z: 8, rotation: 0.3, scale: 1 },
    { type: "trash-can", x: 10, z: -6, rotation: -0.6, scale: 1 },
  ],
  truck: [{ type: "truck", x: 0, z: -16, rotation: 0, scale: 1.1 }],
  rock: [
    { type: "rock", x: -18, z: -2, rotation: 0.2, scale: 1.4 },
    { type: "rock", x: 17, z: 14, rotation: -0.5, scale: 1.1 },
  ],
  furniture: [
    { type: "furniture", x: 14, z: 9, rotation: 0.8, scale: 1 },
    { type: "furniture", x: -7, z: -12, rotation: -0.4, scale: 1.15 },
  ],
  crate: [
    { type: "crate", x: -9, z: -4, rotation: 0.25, scale: 1 },
    { type: "crate", x: 12, z: 2, rotation: -0.35, scale: 1.2 },
    { type: "crate", x: 6, z: -14, rotation: 0.6, scale: 0.9 },
  ],
  barrel: [
    { type: "barrel", x: -14, z: 6, rotation: 0, scale: 1 },
    { type: "barrel", x: -12.5, z: 7.4, rotation: 0.4, scale: 1 },
  ],
  container: [
    { type: "container", x: -20, z: -10, rotation: 0.15, scale: 1 },
    { type: "container", x: 20, z: -12, rotation: -0.2, scale: 1 },
  ],
  barrier: [
    { type: "barrier", x: -6, z: 4, rotation: 0, scale: 1 },
    { type: "barrier", x: 8, z: 4, rotation: 0, scale: 1 },
  ],
  sandbags: [
    { type: "sandbags", x: 0, z: -6, rotation: 0, scale: 1 },
    { type: "sandbags", x: -16, z: -14, rotation: 0.5, scale: 1 },
  ],
  cone: [
    { type: "cone", x: 4, z: 8, rotation: 0, scale: 1 },
    { type: "cone", x: 6.5, z: 8.5, rotation: 0, scale: 1 },
    { type: "cone", x: 9, z: 9, rotation: 0, scale: 1 },
  ],
  tree: [
    { type: "tree", x: -22, z: 12, rotation: 0.3, scale: 1.2 },
    { type: "tree", x: 22, z: 16, rotation: -0.4, scale: 1 },
  ],
  pillar: [
    { type: "pillar", x: -10, z: -10, rotation: 0, scale: 1 },
    { type: "pillar", x: 10, z: -10, rotation: 0, scale: 1 },
  ],
  wall: [{ type: "wall", x: 0, z: 6, rotation: 0, scale: 1 }],
  ramp: [{ type: "ramp", x: -14, z: -18, rotation: 0.4, scale: 1 }],
  lamp: [
    { type: "lamp", x: -24, z: 0, rotation: 0, scale: 1 },
    { type: "lamp", x: 24, z: 0, rotation: 0, scale: 1 },
  ],
};

const arenaOffsets = {
  "simulation-bay": { x: 0, z: 0 },
  "dock-lanes": { x: 1.5, z: -1.5 },
  "vertical-core": { x: 0, z: 2 },
  "crossfire-yard": { x: -1.5, z: 0 },
  "neon-grid": { x: 0, z: 0 },
};

let idCounter = 0;

function slugId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function getArenaPrefab(id) {
  return arenaPrefabs.find((item) => item.id === id) ?? arenaPrefabs[0];
}

export function getSpawnPreset(id) {
  return spawnPresets.find((item) => item.id === id) ?? spawnPresets[0];
}

export function getObstacleKit(id) {
  return obstacleKits.find((item) => item.id === id) ?? obstacleKits[0];
}

export function getBlueprint(id) {
  return builderBlueprints.find((item) => item.id === id) ?? builderBlueprints[0];
}

export function getObstacleType(id) {
  return obstacleTypes.find((item) => item.id === id) ?? obstacleTypes[0];
}

export function gridToWorld(cellX, cellY) {
  return [
    (cellX - (EDITOR_GRID_SIZE - 1) / 2) * EDITOR_CELL_WORLD,
    0,
    (cellY - (EDITOR_GRID_SIZE - 1) / 2) * EDITOR_CELL_WORLD,
  ];
}

export function worldToGrid(position) {
  return {
    x: Math.round(position[0] / EDITOR_CELL_WORLD + (EDITOR_GRID_SIZE - 1) / 2),
    y: Math.round(position[2] / EDITOR_CELL_WORLD + (EDITOR_GRID_SIZE - 1) / 2),
  };
}

export function snapValue(value, step) {
  if (!step) {
    return Number(value.toFixed(2));
  }

  return Number((Math.round(value / step) * step).toFixed(2));
}

export function normalizeObstacleSet(obstacles = []) {
  return [...new Set(obstacles.map((item) => item.type))];
}

export function createSpawnNodesFromPreset(spawnPresetId) {
  const preset = getSpawnPreset(spawnPresetId);
  const midHeight = Number(((preset.heightRange[0] + preset.heightRange[1]) / 2).toFixed(1));

  return preset.anchors.map((anchor, index) => ({
    id: `${spawnPresetId}-spawn-${index}`,
    position: [anchor[0], 0, anchor[2]],
    height: midHeight,
  }));
}

export function buildObstacleLayout(selectedObstacleIds = [], arenaPrefabId = "simulation-bay") {
  const offset = arenaOffsets[arenaPrefabId] ?? arenaOffsets["simulation-bay"];

  return selectedObstacleIds.flatMap((obstacleId) =>
    (obstacleLayouts[obstacleId] ?? []).map((item, index) => ({
      id: `${arenaPrefabId}-${obstacleId}-${index}`,
      type: item.type,
      position: [item.x + offset.x, 0, item.z + offset.z],
      rotation: [0, item.rotation ?? 0, 0],
      scale: item.scale ?? 1,
    })),
  );
}

export function createObstacleAt(type, position = [0, 0, 0]) {
  const obstacleType = getObstacleType(type);

  return {
    id: slugId(type),
    type,
    position: [Number(position[0].toFixed(2)), 0, Number(position[2].toFixed(2))],
    rotation: [0, 0, 0],
    scale: obstacleType.defaultScale,
  };
}

export function createObstacleFromGrid(type, cellX, cellY) {
  return createObstacleAt(type, gridToWorld(cellX, cellY));
}

export function createSpawnNodeAt(position = [0, 0, 0], height = 1.7) {
  return {
    id: slugId("spawn"),
    position: [Number(position[0].toFixed(2)), 0, Number(position[2].toFixed(2))],
    height,
  };
}

export function createSpawnNodeFromGrid(cellX, cellY) {
  return createSpawnNodeAt(gridToWorld(cellX, cellY));
}

export function duplicateEntity(entity) {
  return {
    ...entity,
    id: slugId(entity.type ?? "spawn"),
    position: [
      Number(((entity.position?.[0] ?? 0) + 2.5).toFixed(2)),
      0,
      Number(((entity.position?.[2] ?? 0) + 2.5).toFixed(2)),
    ],
  };
}

export function createDraftFromBlueprint(blueprintId) {
  const blueprint = getBlueprint(blueprintId);
  const kit = getObstacleKit(blueprint.obstacleKit);

  return {
    blueprint: blueprint.id,
    arenaPrefab: blueprint.arenaPrefab,
    spawnPreset: blueprint.spawnPreset,
    obstacleKit: blueprint.obstacleKit,
    obstacleSet: [...kit.obstacleSet],
    obstacles: buildObstacleLayout(kit.obstacleSet, blueprint.arenaPrefab),
    spawnNodes: createSpawnNodesFromPreset(blueprint.spawnPreset),
    ...blueprint,
  };
}
