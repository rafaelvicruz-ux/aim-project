const CODE_PREFIX = "AIMv1:";

export function encodeMapCode(mapData) {
  const json = JSON.stringify(mapData);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return `${CODE_PREFIX}${base64}`;
}

export function decodeMapCode(code) {
  const trimmed = code.trim().replace(/\s+/g, "");

  if (!trimmed.startsWith(CODE_PREFIX)) {
    throw new Error("Código de mapa inválido. Confira se copiou o código inteiro.");
  }

  try {
    const json = decodeURIComponent(escape(atob(trimmed.slice(CODE_PREFIX.length))));
    return JSON.parse(json);
  } catch {
    throw new Error("Não consegui ler esse código. Confira se copiou o código inteiro.");
  }
}
