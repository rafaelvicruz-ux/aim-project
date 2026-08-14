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

export const obstacleTypes = [
  { id: "trash-can", label: "Lixeira" },
  { id: "truck", label: "Caminhão" },
  { id: "rock", label: "Pedra" },
  { id: "furniture", label: "Móveis" },
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

export function buildObstacleLayout(selectedObstacleIds = []) {
  return selectedObstacleIds.flatMap((obstacleId) => obstacleLayouts[obstacleId] ?? []);
}
