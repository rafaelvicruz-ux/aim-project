const SESSION_KEY = "aimforge-spotify-session";
const VERIFIER_KEY = "aimforge-spotify-verifier";
const STATE_KEY = "aimforge-spotify-state";

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

/**
 * O redirect precisa bater exatamente com o cadastrado no dashboard do Spotify.
 * Em dev a origem muda, entao so usamos o valor do .env quando ele e da mesma origem.
 */
function resolveRedirectUri() {
  const configured = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  const currentOrigin = `${window.location.origin}/`;

  if (!configured) {
    return currentOrigin;
  }

  try {
    const configuredUrl = new URL(configured);
    if (configuredUrl.origin === window.location.origin) {
      return configured;
    }
  } catch {
    return currentOrigin;
  }

  return currentOrigin;
}

export const spotifyRedirectUri = resolveRedirectUri();
export const isSpotifyConfigured = Boolean(clientId);

export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "user-top-read",
];

function randomString(length) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => possible[value % possible.length]).join("");
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function getSpotifySession() {
  const raw = window.localStorage.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSpotifySession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSpotifySession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(VERIFIER_KEY);
  window.localStorage.removeItem(STATE_KEY);
}

export async function createSpotifyAuthUrl() {
  const verifier = randomString(96);
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = randomString(24);

  window.localStorage.setItem(VERIFIER_KEY, verifier);
  window.localStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: spotifyRedirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: SPOTIFY_SCOPES.join(" "),
    show_dialog: "false",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeSpotifyCode(code, state) {
  const verifier = window.localStorage.getItem(VERIFIER_KEY);
  const expectedState = window.localStorage.getItem(STATE_KEY);

  if (!verifier) {
    throw new Error("Não encontrei o verificador PKCE do Spotify. Tente conectar de novo.");
  }

  if (expectedState && state && expectedState !== state) {
    throw new Error("O state do Spotify não confere. Login cancelado por segurança.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: spotifyRedirectUri,
    code_verifier: verifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description ?? data.error ?? "Falha ao conectar no Spotify.");
  }

  window.localStorage.removeItem(VERIFIER_KEY);
  window.localStorage.removeItem(STATE_KEY);

  return saveSpotifySession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
}

let refreshPromise = null;

async function refreshSpotifySession(session) {
  if (!session?.refreshToken) {
    throw new Error("Sessão do Spotify expirada. Conecte novamente.");
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      clearSpotifySession();
      throw new Error(data.error_description ?? data.error ?? "Falha ao renovar a sessão do Spotify.");
    }

    return saveSpotifySession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? session.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    });
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function getSpotifyAccessToken({ force = false } = {}) {
  const session = getSpotifySession();

  if (!session) {
    throw new Error("Spotify não conectado.");
  }

  if (!force && session.expiresAt > Date.now() + 60_000) {
    return session.accessToken;
  }

  const refreshed = await refreshSpotifySession(session);
  return refreshed.accessToken;
}

export async function spotifyApi(path, { method = "GET", body, query, retry = true } = {}) {
  const token = await getSpotifyAccessToken();
  const url = new URL(`https://api.spotify.com/v1${path}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && retry) {
    await getSpotifyAccessToken({ force: true });
    return spotifyApi(path, { method, body, query, retry: false });
  }

  if (response.status === 204 || response.status === 202) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const reason = data?.error?.message ?? data?.error_description ?? data?.message ?? "Falha na API do Spotify.";

    if (response.status === 404 && reason.toLowerCase().includes("device")) {
      throw new Error("Nenhum player ativo. Ative o player do AimForge ou abra o Spotify em algum aparelho.");
    }

    if (response.status === 403) {
      throw new Error(`${reason} (o controle de playback exige conta Premium)`);
    }

    throw new Error(reason);
  }

  return data;
}

/* ------------------------------------------------------------------ *
 * Login em popup: o app continua vivo por tras enquanto autoriza.
 * ------------------------------------------------------------------ */

const POPUP_MESSAGE = "aimforge-spotify-auth";

/**
 * Roda antes do React montar. Se esta janela e o popup do OAuth, devolve o
 * codigo para a janela principal e fecha.
 */
export function handleSpotifyPopupCallback() {
  if (!window.opener || window.opener === window) {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");

  if (!code && !error) {
    return false;
  }

  try {
    window.opener.postMessage(
      { type: POPUP_MESSAGE, code, error, state: params.get("state") },
      window.location.origin,
    );
  } catch {
    return false;
  }

  window.close();
  return true;
}

export function loginWithSpotifyPopup() {
  return new Promise((resolve, reject) => {
    if (!isSpotifyConfigured) {
      reject(new Error("Configure VITE_SPOTIFY_CLIENT_ID no .env para usar o Spotify."));
      return;
    }

    createSpotifyAuthUrl()
      .then((url) => {
        const width = 480;
        const height = 720;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          url,
          "aimforge-spotify-login",
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
        );

        if (!popup) {
          // popup bloqueado: cai para o fluxo de redirect na propria aba
          window.location.href = url;
          return;
        }

        let settled = false;

        const cleanup = () => {
          window.removeEventListener("message", onMessage);
          window.clearInterval(closedTimer);
        };

        const onMessage = async (event) => {
          if (event.origin !== window.location.origin || event.data?.type !== POPUP_MESSAGE) {
            return;
          }

          settled = true;
          cleanup();

          if (event.data.error) {
            reject(new Error(`Spotify: ${event.data.error}`));
            return;
          }

          try {
            const session = await exchangeSpotifyCode(event.data.code, event.data.state);
            resolve(session);
          } catch (exchangeError) {
            reject(exchangeError);
          }
        };

        const closedTimer = window.setInterval(() => {
          if (popup.closed && !settled) {
            cleanup();
            reject(new Error("Janela do Spotify fechada antes de concluir o login."));
          }
        }, 600);

        window.addEventListener("message", onMessage);
      })
      .catch(reject);
  });
}

/**
 * Fluxo de redirect na mesma aba (quando o popup e bloqueado).
 */
export async function consumeRedirectCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.toString());
    throw new Error(`Spotify: ${error}`);
  }

  if (!code) {
    return null;
  }

  const state = url.searchParams.get("state");
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());

  return exchangeSpotifyCode(code, state);
}

/* ------------------------------------------------------------------ *
 * Atalhos da Web API usados pelo painel.
 * ------------------------------------------------------------------ */

export const spotify = {
  me: () => spotifyApi("/me"),
  playback: () => spotifyApi("/me/player"),
  devices: () => spotifyApi("/me/player/devices"),
  playlists: (limit = 40) => spotifyApi("/me/playlists", { query: { limit } }),
  playlistTracks: (playlistId, limit = 50) =>
    spotifyApi(`/playlists/${playlistId}/tracks`, { query: { limit, fields: "items(track(id,uri,name,duration_ms,artists(name),album(images,name)))" } }),
  savedTracks: (limit = 50) => spotifyApi("/me/tracks", { query: { limit } }),
  search: (query, types = "track,playlist,album") =>
    spotifyApi("/search", { query: { q: query, type: types, limit: 12 } }),
  transfer: (deviceId, play = false) => spotifyApi("/me/player", { method: "PUT", body: { device_ids: [deviceId], play } }),
  play: (deviceId, payload) =>
    spotifyApi("/me/player/play", { method: "PUT", query: deviceId ? { device_id: deviceId } : undefined, body: payload }),
  pause: (deviceId) => spotifyApi("/me/player/pause", { method: "PUT", query: deviceId ? { device_id: deviceId } : undefined }),
  next: (deviceId) => spotifyApi("/me/player/next", { method: "POST", query: deviceId ? { device_id: deviceId } : undefined }),
  previous: (deviceId) => spotifyApi("/me/player/previous", { method: "POST", query: deviceId ? { device_id: deviceId } : undefined }),
  seek: (positionMs, deviceId) =>
    spotifyApi("/me/player/seek", { method: "PUT", query: { position_ms: Math.round(positionMs), device_id: deviceId } }),
  volume: (percent, deviceId) =>
    spotifyApi("/me/player/volume", { method: "PUT", query: { volume_percent: Math.round(percent), device_id: deviceId } }),
  shuffle: (state, deviceId) => spotifyApi("/me/player/shuffle", { method: "PUT", query: { state, device_id: deviceId } }),
  repeat: (state, deviceId) => spotifyApi("/me/player/repeat", { method: "PUT", query: { state, device_id: deviceId } }),
};