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

export const obstacleTypes = [
  { id: "trash-can", label: "Lixeira", short: "L", defaultScale: 1 },
  { id: "truck", label: "Caminhão", short: "C", defaultScale: 1.1 },
  { id: "rock", label: "Pedra", short: "P", defaultScale: 1.2 },
  { id: "furniture", label: "Móveis", short: "M", defaultScale: 1 },
];

export const arenaPrefabs = [
  {
    id: "simulation-bay",
    label: "Simulation Bay",
    help: "Arena limpa no estilo laboratório para treinos puros.",
    floorColor: "#121c2d",
    wallColor: "#0d1526",
    accentColor: "#2d6cff",
  },
  {
    id: "dock-lanes",
    label: "Dock Lanes",
    help: "Corredores com cobertura nas laterais para duelos rápidos.",
    floorColor: "#1a2230",
    wallColor: "#121927",
    accentColor: "#ff7a1a",
  },
  {
    id: "vertical-core",
    label: "Vertical Core",
    help: "Pilares altos e leitura de altura como num editor de arena vertical.",
    floorColor: "#111a28",
    wallColor: "#0b1120",
    accentColor: "#7ac7ff",
  },
  {
    id: "crossfire-yard",
    label: "Crossfire Yard",
    help: "Pátio aberto com linhas cruzadas e cobertura central.",
    floorColor: "#162030",
    wallColor: "#10182a",
    accentColor: "#5fe0a1",
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
    help: "Mistura lixeira e caminhão para cortes de visão.",
    obstacleSet: ["trash-can", "truck"],
  },
  {
    id: "natural-break",
    label: "Natural Break",
    help: "Pedras e móveis criam linhas quebradas.",
    obstacleSet: ["rock", "furniture"],
  },
  {
    id: "clutter-stack",
    label: "Clutter Stack",
    help: "Mapa carregado com várias coberturas prontas.",
    obstacleSet: ["trash-can", "rock", "furniture", "truck"],
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
};

const arenaOffsets = {
  "simulation-bay": { x: 0, z: 0 },
  "dock-lanes": { x: 1.5, z: -1.5 },
  "vertical-core": { x: 0, z: 2 },
  "crossfire-yard": { x: -1.5, z: 0 },
};

function slugId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
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

export function createObstacleFromGrid(type, cellX, cellY) {
  const obstacleType = getObstacleType(type);

  return {
    id: slugId(type),
    type,
    position: gridToWorld(cellX, cellY),
    rotation: [0, 0, 0],
    scale: obstacleType.defaultScale,
  };
}

export function createSpawnNodeFromGrid(cellX, cellY) {
  return {
    id: slugId("spawn"),
    position: gridToWorld(cellX, cellY),
    height: 1.7,
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
