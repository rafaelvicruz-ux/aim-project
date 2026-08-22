import * as THREE from "three";

const cache = new Map();

function withCache(key, factory) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const value = factory();
  cache.set(key, value);
  return value;
}

function createCanvas(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function paintNoise(context, size, alpha) {
  const image = context.getImageData(0, 0, size, size);
  const { data } = image;

  for (let index = 0; index < data.length; index += 4) {
    const shift = (Math.random() - 0.5) * alpha;
    data[index] = Math.max(0, Math.min(255, data[index] + shift));
    data[index + 1] = Math.max(0, Math.min(255, data[index + 1] + shift));
    data[index + 2] = Math.max(0, Math.min(255, data[index + 2] + shift));
  }

  context.putImageData(image, 0, 0);
}

/**
 * Piso tecnico: placas escuras, linhas de grade no tom de destaque e marcas de canto.
 */
export function createFloorTexture(baseColor, accentColor) {
  return withCache(`floor:${baseColor}:${accentColor}`, () => {
    const size = 512;
    const canvas = createCanvas(size);
    const context = canvas.getContext("2d");

    context.fillStyle = baseColor;
    context.fillRect(0, 0, size, size);

    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.72);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.05)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.22)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    context.strokeStyle = "rgba(255, 255, 255, 0.05)";
    context.lineWidth = 2;
    for (let step = 0; step <= size; step += size / 4) {
      context.beginPath();
      context.moveTo(step, 0);
      context.lineTo(step, size);
      context.moveTo(0, step);
      context.lineTo(size, step);
      context.stroke();
    }

    context.strokeStyle = accentColor;
    context.globalAlpha = 0.22;
    context.lineWidth = 3;
    context.strokeRect(1.5, 1.5, size - 3, size - 3);
    context.globalAlpha = 1;

    context.fillStyle = accentColor;
    context.globalAlpha = 0.3;
    const mark = size * 0.045;
    [
      [0, 0],
      [size - mark, 0],
      [0, size - mark],
      [size - mark, size - mark],
    ].forEach(([x, y]) => context.fillRect(x, y, mark, mark));
    context.globalAlpha = 1;

    paintNoise(context, size, 16);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(14, 14);
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
}

/**
 * Parede modular com paineis, juntas e rebites.
 */
export function createWallTexture(baseColor, accentColor) {
  return withCache(`wall:${baseColor}:${accentColor}`, () => {
    const size = 512;
    const canvas = createCanvas(size);
    const context = canvas.getContext("2d");

    context.fillStyle = baseColor;
    context.fillRect(0, 0, size, size);

    const panel = size / 4;
    context.strokeStyle = "rgba(0, 0, 0, 0.45)";
    context.lineWidth = 4;
    for (let y = 0; y <= size; y += panel) {
      for (let x = 0; x <= size; x += panel) {
        context.strokeRect(x + 4, y + 4, panel - 8, panel - 8);
      }
    }

    context.fillStyle = "rgba(255, 255, 255, 0.045)";
    for (let y = 0; y < size; y += panel) {
      context.fillRect(0, y + 6, size, 3);
    }

    context.fillStyle = accentColor;
    context.globalAlpha = 0.28;
    for (let y = panel / 2; y < size; y += panel) {
      context.fillRect(0, y, size, 2);
    }
    context.globalAlpha = 1;

    context.fillStyle = "rgba(255, 255, 255, 0.1)";
    for (let y = panel / 2; y < size; y += panel) {
      for (let x = panel / 2; x < size; x += panel) {
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fill();
      }
    }

    paintNoise(context, size, 12);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 3);
    texture.anisotropy = 4;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
}

/**
 * Sprite radial usado em faisca, flash de cano e particulas de impacto.
 */
export function createGlowTexture() {
  return withCache("glow", () => {
    const size = 128;
    const canvas = createCanvas(size);
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.28, "rgba(255, 236, 190, 0.75)");
    gradient.addColorStop(1, "rgba(255, 170, 60, 0)");

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
}

export function disposeTextureCache() {
  cache.forEach((texture) => texture.dispose?.());
  cache.clear();
}
