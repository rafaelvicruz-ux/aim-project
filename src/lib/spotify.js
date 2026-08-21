const SPOTIFY_TOKEN_STORAGE_KEY = "aimforge-spotify-session";
const SPOTIFY_VERIFIER_STORAGE_KEY = "aimforge-spotify-verifier";

const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const spotifyRedirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? window.location.origin;

export const isSpotifyConfigured = Boolean(spotifyClientId && spotifyRedirectUri);

function randomString(length) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => possible[Math.floor(Math.random() * possible.length)]).join("");
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function createSpotifyAuthUrl() {
  const verifier = randomString(96);
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = randomString(16);
  const scope = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "streaming",
  ].join(" ");

  window.localStorage.setItem(SPOTIFY_VERIFIER_STORAGE_KEY, verifier);

  const params = new URLSearchParams({
    client_id: spotifyClientId,
    response_type: "code",
    redirect_uri: spotifyRedirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function getStoredSpotifySession() {
  const raw = window.localStorage.getItem(SPOTIFY_TOKEN_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSpotifySession(session) {
  window.localStorage.setItem(SPOTIFY_TOKEN_STORAGE_KEY, JSON.stringify(session));
}

export function clearSpotifySession() {
  window.localStorage.removeItem(SPOTIFY_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SPOTIFY_VERIFIER_STORAGE_KEY);
}

export async function exchangeSpotifyCode(code) {
  const verifier = window.localStorage.getItem(SPOTIFY_VERIFIER_STORAGE_KEY);

  if (!verifier) {
    throw new Error("Nao encontrei o verificador PKCE do Spotify.");
  }

  const body = new URLSearchParams({
    client_id: spotifyClientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: spotifyRedirectUri,
    code_verifier: verifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description ?? data.error ?? "Falha ao conectar no Spotify.");
  }

  const session = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  saveSpotifySession(session);
  window.localStorage.removeItem(SPOTIFY_VERIFIER_STORAGE_KEY);
  return session;
}

export async function refreshSpotifySession(session) {
  if (!session?.refreshToken) {
    throw new Error("Refresh token do Spotify nao encontrado.");
  }

  const body = new URLSearchParams({
    client_id: spotifyClientId,
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description ?? data.error ?? "Falha ao renovar sessao do Spotify.");
  }

  const nextSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  saveSpotifySession(nextSession);
  return nextSession;
}

export async function ensureSpotifyToken(session) {
  if (!session) {
    throw new Error("Spotify nao conectado.");
  }

  if (session.expiresAt > Date.now() + 60_000) {
    return session;
  }

  return refreshSpotifySession(session);
}

export async function spotifyRequest(session, path, options = {}) {
  const validSession = await ensureSpotifyToken(session);
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${validSession.accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error?.message ?? data?.message ?? "Falha na API do Spotify.");
  }

  return data;
}
