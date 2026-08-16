import { buildObstacleLayout, createDraftFromBlueprint, getObstacleKit, normalizeObstacleSet } from "./gameConfig";

export const patternOptions = [
  { value: "lane-sweep", label: "Lane Sweep" },
  { value: "orbit", label: "Orbit" },
  { value: "depth-pop", label: "Depth Pop" },
  { value: "zigzag", label: "Zigzag" },
  { value: "tower", label: "Tower" },
  { value: "burst", label: "Burst" },
];

const patternDescriptions = {
  "lane-sweep": "Inimigos varrem corredores laterais com entradas rápidas.",
  orbit: "Inimigos giram pela arena e trocam distância do jogador.",
  "depth-pop": "Puxa leitura de profundidade com avanço e recuo constante.",
  zigzag: "Movimento quebrado para treinar correção de mira.",
  tower: "Alvos sobem e descem em alturas diferentes para tracking vertical.",
  burst: "Rajadas curtas de pressão para flick e controle de sequência.",
};

const mapNames = [
  "Neon Dock",
  "Steel Run",
  "Pulse Yard",
  "Solar Ring",
  "Glass Drift",
  "Red Sector",
  "Aero Hall",
  "Core Axis",
  "Volt Spine",
  "Night Relay",
  "Blue Reactor",
  "Fracture Lane",
  "Signal Forge",
  "Static Bloom",
  "Metal Veil",
  "Ion Circuit",
  "Crimson Deck",
  "Echo Tunnel",
  "Nova Chamber",
  "Focus Gate",
  "Shadow Lift",
  "Mirage Port",
  "Arena Theta",
  "Delta Rise",
  "Vector Loop",
  "Flare Grid",
  "Strike Nest",
  "Cloud Arena",
  "Hyper Vault",
  "Arc Bridge",
  "Grid Surge",
  "Prism Forge",
  "Titan Span",
  "Orange Rift",
  "Blue Hollow",
  "Rapid Bloom",
  "Zenith Core",
  "Blast Silo",
  "Mag Rail",
  "Phase Rift",
  "Atlas Ring",
  "Switch Line",
  "Motion Cradle",
  "Snap Yard",
  "Focus Well",
  "Halo Station",
  "Final Drift",
];

const arenaCycle = ["simulation-bay", "dock-lanes", "vertical-core", "crossfire-yard"];
const spawnCycle = ["front-arc", "crossfire", "tower-stack", "rush-lanes"];
const kitCycle = ["clean-range", "urban-cover", "natural-break", "clutter-stack"];

function createPreset(index, name) {
  const pattern = patternOptions[index % patternOptions.length].value;
  const tier = Math.floor(index / 12);
  const targetSize = Math.max(20, 56 - (index % 6) * 4 - tier * 2);
  const duration = 25 + (index % 5) * 5 + tier * 3;
  const goalHits = 12 + (index % 7) * 2 + tier * 3;
  const simultaneousTargets = 1 + ((index + tier) % 3);
  const moveSpeed = 35 + (index % 8) * 16 + tier * 12;
  const strafeIntensity = 18 + (index % 6) * 8;
  const verticalDrift = 8 + (index % 5) * 6;
  const depthLayers = 2 + (index % 3);
  const targetLifetime = 1200 + (index % 6) * 240;
  const spawnRate = Math.max(260, 780 - (index % 9) * 45 - tier * 30);
  const scoringCycle = ["precision", "combo", "tracking"];
  const arenaPrefab = arenaCycle[index % arenaCycle.length];
  const spawnPreset = spawnCycle[(index + tier) % spawnCycle.length];
  const obstacleKit = kitCycle[(index + 1) % kitCycle.length];
  const draft = createDraftFromBlueprint(index % 4 === 0 ? "flick-lab" : index % 4 === 1 ? "tracker-grid" : index % 4 === 2 ? "pressure-yard" : "rush-chaos");
  const obstacleSet = getObstacleKit(obstacleKit).obstacleSet;

  return {
    id: `map-${String(index + 1).padStart(2, "0")}`,
    name: `${String(index + 1).padStart(2, "0")} ${name}`,
    description: patternDescriptions[pattern],
    duration,
    goalHits,
    targetSize,
    spawnRate,
    targetLifetime,
    moveSpeed,
    simultaneousTargets,
    scoring: scoringCycle[index % scoringCycle.length],
    pattern,
    depthLayers,
    strafeIntensity,
    verticalDrift,
    arenaPrefab,
    spawnPreset,
    obstacleKit,
    obstacleSet,
    obstacles: buildObstacleLayout(obstacleSet, arenaPrefab),
    spawnNodes: draft.spawnNodes,
  };
}

export const defaultPresets = mapNames.map((name, index) => createPreset(index, name));

export const customTemplate = {
  ...createDraftFromBlueprint("flick-lab"),
  name: "Meu mapa 3D",
  description: "Mapa customizado para treinar precisão em profundidade.",
};

export function normalizeCustomDraft(draft) {
  return {
    ...draft,
    obstacleSet: normalizeObstacleSet(draft.obstacles ?? []),
  };
}
