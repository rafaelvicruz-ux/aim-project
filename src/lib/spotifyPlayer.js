import { getSpotifyAccessToken } from "./spotify";

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";
const PLAYER_NAME = "AimForge 3D";

let sdkPromise = null;

/**
 * Carrega o Web Playback SDK uma unica vez. Ele transforma a propria aba
 * em um device do Spotify, entao a musica toca dentro do app.
 */
export function loadSpotifySdk() {
  if (window.Spotify) {
    return Promise.resolve(window.Spotify);
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise((resolve, reject) => {
    const previousCallback = window.onSpotifyWebPlaybackSDKReady;

    window.onSpotifyWebPlaybackSDKReady = () => {
      previousCallback?.();
      resolve(window.Spotify);
    };

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Não consegui carregar o Spotify Web Playback SDK (verifique bloqueadores de script)."));
    };

    document.head.appendChild(script);
  });

  return sdkPromise;
}

export async function createSpotifyPlayer({ volume = 0.5, onState, onReady, onNotReady, onError }) {
  const Spotify = await loadSpotifySdk();

  const player = new Spotify.Player({
    name: PLAYER_NAME,
    volume,
    getOAuthToken: (callback) => {
      getSpotifyAccessToken()
        .then(callback)
        .catch((error) => onError?.("auth", error.message));
    },
  });

  player.addListener("ready", ({ device_id: deviceId }) => onReady?.(deviceId));
  player.addListener("not_ready", ({ device_id: deviceId }) => onNotReady?.(deviceId));
  player.addListener("player_state_changed", (state) => onState?.(state));
  player.addListener("initialization_error", ({ message }) => onError?.("initialization", message));
  player.addListener("authentication_error", ({ message }) => onError?.("authentication", message));
  player.addListener("account_error", () =>
    onError?.("account", "O player embutido exige Spotify Premium. Sem Premium dá para controlar o Spotify aberto em outro aparelho."),
  );
  player.addListener("playback_error", ({ message }) => onError?.("playback", message));

  const connected = await player.connect();

  if (!connected) {
    throw new Error("Não consegui conectar o player do Spotify nesta aba.");
  }

  return player;
}

export function normalizePlayerState(state) {
  if (!state) {
    return null;
  }

  const track = state.track_window?.current_track;

  return {
    paused: state.paused,
    position: state.position,
    duration: state.duration,
    shuffle: state.shuffle,
    repeatMode: state.repeat_mode,
    track: track
      ? {
          id: track.id,
          uri: track.uri,
          name: track.name,
          artist: track.artists?.map((artist) => artist.name).join(", ") ?? "",
          album: track.album?.name ?? "",
          image: track.album?.images?.[0]?.url ?? null,
        }
      : null,
  };
}