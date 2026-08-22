import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearSpotifySession,
  consumeRedirectCallback,
  getSpotifySession,
  isSpotifyConfigured,
  loginWithSpotifyPopup,
  spotify,
  spotifyRedirectUri,
} from "../lib/spotify";
import { createSpotifyPlayer, normalizePlayerState } from "../lib/spotifyPlayer";

const REPEAT_CYCLE = ["off", "context", "track"];

export function useSpotify({ enabled = true } = {}) {
  const [connected, setConnected] = useState(() => Boolean(getSpotifySession()));
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [remoteState, setRemoteState] = useState(null);
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [volume, setVolumeState] = useState(0.5);
  const [position, setPosition] = useState(0);

  const playerRef = useRef(null);
  const deviceIdRef = useRef(null);
  const positionBaseRef = useRef({ position: 0, at: 0, paused: true });

  const usingAppPlayer = Boolean(playerState?.track);
  const isPremium = profile?.product === "premium";

  const runTask = useCallback(async (task, successMessage) => {
    try {
      setBusy(true);
      const result = await task();
      if (successMessage) {
        setStatus(successMessage);
      }
      return result;
    } catch (error) {
      setStatus(error.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  /* -------- login -------- */

  useEffect(() => {
    if (!enabled || !isSpotifyConfigured) {
      return;
    }

    consumeRedirectCallback()
      .then((session) => {
        if (session) {
          setConnected(true);
          setStatus("Spotify conectado.");
        }
      })
      .catch((error) => setStatus(error.message));
  }, [enabled]);

  const connect = useCallback(async () => {
    if (!isSpotifyConfigured) {
      setStatus("Configure VITE_SPOTIFY_CLIENT_ID no .env para ligar o Spotify.");
      return;
    }

    await runTask(async () => {
      await loginWithSpotifyPopup();
      setConnected(true);
    }, "Spotify conectado sem sair do app.");
  }, [runTask]);

  const disconnect = useCallback(() => {
    playerRef.current?.disconnect?.();
    playerRef.current = null;
    deviceIdRef.current = null;
    clearSpotifySession();
    setConnected(false);
    setProfile(null);
    setDeviceId(null);
    setPlayerState(null);
    setRemoteState(null);
    setDevices([]);
    setPlaylists([]);
    setSearchResults(null);
    setStatus("Spotify desconectado.");
  }, []);

  /* -------- perfil, playlists e devices -------- */

  const refreshDevices = useCallback(async () => {
    try {
      const data = await spotify.devices();
      setDevices(data?.devices ?? []);
    } catch (error) {
      setDevices([]);
      setStatus(error.message);
    }
  }, []);

  const loadPlaylists = useCallback(async () => {
    try {
      const data = await spotify.playlists();
      setPlaylists(data?.items?.filter(Boolean) ?? []);
    } catch (error) {
      setPlaylists([]);
      setStatus(error.message);
    }
  }, []);

  useEffect(() => {
    if (!connected || !enabled) {
      return;
    }

    let cancelled = false;

    spotify
      .me()
      .then((me) => {
        if (!cancelled) {
          setProfile(me);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error.message);
          if (error.message.includes("não conectado") || error.message.includes("expirada")) {
            setConnected(false);
          }
        }
      });

    loadPlaylists();
    refreshDevices();

    return () => {
      cancelled = true;
    };
  }, [connected, enabled, loadPlaylists, refreshDevices]);

  /* -------- player embutido (Web Playback SDK) -------- */

  useEffect(() => {
    if (!connected || !enabled || !isPremium || playerRef.current) {
      return undefined;
    }

    let disposed = false;

    createSpotifyPlayer({
      volume,
      onReady: (id) => {
        if (disposed) {
          return;
        }
        deviceIdRef.current = id;
        setDeviceId(id);
        setStatus("Player do AimForge pronto. Use \"Tocar aqui\" para trazer o som para o app.");
        refreshDevices();
      },
      onNotReady: () => {
        if (!disposed) {
          setDeviceId(null);
        }
      },
      onState: (raw) => {
        if (disposed) {
          return;
        }

        const normalized = normalizePlayerState(raw);
        setPlayerState(normalized);

        if (normalized) {
          positionBaseRef.current = {
            position: normalized.position,
            at: performance.now(),
            paused: normalized.paused,
          };
          setPosition(normalized.position);
        }
      },
      onError: (kind, message) => {
        if (!disposed) {
          setStatus(message);
        }
      },
    })
      .then((player) => {
        if (disposed) {
          player.disconnect();
          return;
        }
        playerRef.current = player;
      })
      .catch((error) => {
        if (!disposed) {
          setStatus(error.message);
        }
      });

    return () => {
      disposed = true;
    };
    // volume inicial nao deve recriar o player
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, enabled, isPremium, refreshDevices]);

  useEffect(
    () => () => {
      playerRef.current?.disconnect?.();
      playerRef.current = null;
    },
    [],
  );

  /* -------- estado remoto (quando o som esta em outro aparelho) -------- */

  useEffect(() => {
    if (!connected || !enabled || usingAppPlayer) {
      return undefined;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await spotify.playback();
        if (!cancelled) {
          setRemoteState(data);
          if (data?.progress_ms != null) {
            positionBaseRef.current = {
              position: data.progress_ms,
              at: performance.now(),
              paused: !data.is_playing,
            };
            setPosition(data.progress_ms);
          }
        }
      } catch {
        /* silencioso: sem device ativo a API responde vazio */
      }
    };

    poll();
    const interval = window.setInterval(poll, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [connected, enabled, usingAppPlayer]);

  /* -------- barra de progresso local -------- */

  useEffect(() => {
    const interval = window.setInterval(() => {
      const base = positionBaseRef.current;
      if (base.paused) {
        return;
      }

      setPosition(base.position + (performance.now() - base.at));
    }, 400);

    return () => window.clearInterval(interval);
  }, []);

  /* -------- controles -------- */

  const activeRemoteDeviceId = remoteState?.device?.id ?? null;
  const targetDeviceId = usingAppPlayer ? deviceIdRef.current : activeRemoteDeviceId;

  const nowPlaying = useMemo(() => {
    if (playerState?.track) {
      return {
        title: playerState.track.name,
        artist: playerState.track.artist,
        image: playerState.track.image,
        duration: playerState.duration,
        paused: playerState.paused,
        source: "app",
      };
    }

    if (remoteState?.item) {
      return {
        title: remoteState.item.name,
        artist: remoteState.item.artists?.map((artist) => artist.name).join(", ") ?? "",
        image: remoteState.item.album?.images?.[0]?.url ?? null,
        duration: remoteState.item.duration_ms,
        paused: !remoteState.is_playing,
        source: remoteState.device?.name ?? "Spotify",
      };
    }

    return null;
  }, [playerState, remoteState]);

  const togglePlay = useCallback(
    () =>
      runTask(async () => {
        if (usingAppPlayer && playerRef.current) {
          await playerRef.current.togglePlay();
          return;
        }

        if (nowPlaying?.paused === false) {
          await spotify.pause(targetDeviceId);
        } else {
          await spotify.play(targetDeviceId);
        }
      }),
    [nowPlaying, runTask, targetDeviceId, usingAppPlayer],
  );

  const next = useCallback(
    () =>
      runTask(async () => {
        if (usingAppPlayer && playerRef.current) {
          await playerRef.current.nextTrack();
          return;
        }
        await spotify.next(targetDeviceId);
      }),
    [runTask, targetDeviceId, usingAppPlayer],
  );

  const previous = useCallback(
    () =>
      runTask(async () => {
        if (usingAppPlayer && playerRef.current) {
          await playerRef.current.previousTrack();
          return;
        }
        await spotify.previous(targetDeviceId);
      }),
    [runTask, targetDeviceId, usingAppPlayer],
  );

  const seek = useCallback(
    (positionMs) =>
      runTask(async () => {
        positionBaseRef.current = { position: positionMs, at: performance.now(), paused: positionBaseRef.current.paused };
        setPosition(positionMs);

        if (usingAppPlayer && playerRef.current) {
          await playerRef.current.seek(positionMs);
          return;
        }
        await spotify.seek(positionMs, targetDeviceId);
      }),
    [runTask, targetDeviceId, usingAppPlayer],
  );

  const setVolume = useCallback(
    (value) => {
      setVolumeState(value);
      playerRef.current?.setVolume?.(value);

      if (!usingAppPlayer && targetDeviceId) {
        spotify.volume(value * 100, targetDeviceId).catch(() => {});
      }
    },
    [targetDeviceId, usingAppPlayer],
  );

  const toggleShuffle = useCallback(
    () =>
      runTask(async () => {
        const nextState = !(playerState?.shuffle ?? remoteState?.shuffle_state ?? false);
        await spotify.shuffle(nextState, targetDeviceId);
      }),
    [playerState, remoteState, runTask, targetDeviceId],
  );

  const cycleRepeat = useCallback(
    () =>
      runTask(async () => {
        const current = playerState ? REPEAT_CYCLE[playerState.repeatMode] : remoteState?.repeat_state ?? "off";
        const nextState = REPEAT_CYCLE[(REPEAT_CYCLE.indexOf(current) + 1) % REPEAT_CYCLE.length];
        await spotify.repeat(nextState, targetDeviceId);
      }),
    [playerState, remoteState, runTask, targetDeviceId],
  );

  const transferToApp = useCallback(
    () =>
      runTask(async () => {
        if (!deviceIdRef.current) {
          throw new Error("O player do app ainda não está pronto. Confirme se a conta é Premium.");
        }

        await spotify.transfer(deviceIdRef.current, true);
        await refreshDevices();
      }, "Som transferido para o AimForge."),
    [refreshDevices, runTask],
  );

  const transferTo = useCallback(
    (id) => runTask(async () => {
      await spotify.transfer(id, true);
      await refreshDevices();
    }, "Playback transferido."),
    [refreshDevices, runTask],
  );

  const playContext = useCallback(
    (contextUri) =>
      runTask(async () => {
        const device = deviceIdRef.current ?? targetDeviceId;
        if (deviceIdRef.current) {
          await spotify.transfer(deviceIdRef.current, false).catch(() => {});
        }
        await spotify.play(device, { context_uri: contextUri });
      }, "Tocando no AimForge."),
    [runTask, targetDeviceId],
  );

  const playTracks = useCallback(
    (uris) =>
      runTask(async () => {
        const device = deviceIdRef.current ?? targetDeviceId;
        if (deviceIdRef.current) {
          await spotify.transfer(deviceIdRef.current, false).catch(() => {});
        }
        await spotify.play(device, { uris: Array.isArray(uris) ? uris : [uris] });
      }, "Tocando no AimForge."),
    [runTask, targetDeviceId],
  );

  const search = useCallback(
    (query) =>
      runTask(async () => {
        if (!query.trim()) {
          setSearchResults(null);
          return;
        }

        const data = await spotify.search(query.trim());
        setSearchResults({
          tracks: data?.tracks?.items?.filter(Boolean) ?? [],
          playlists: data?.playlists?.items?.filter(Boolean) ?? [],
          albums: data?.albums?.items?.filter(Boolean) ?? [],
        });
      }),
    [runTask],
  );

  return {
    isConfigured: isSpotifyConfigured,
    redirectUri: spotifyRedirectUri,
    connected,
    status,
    busy,
    profile,
    isPremium,
    deviceId,
    devices,
    playlists,
    searchResults,
    nowPlaying,
    position,
    volume,
    usingAppPlayer,
    shuffle: playerState?.shuffle ?? remoteState?.shuffle_state ?? false,
    repeat: playerState ? REPEAT_CYCLE[playerState.repeatMode] : remoteState?.repeat_state ?? "off",
    connect,
    disconnect,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    transferToApp,
    transferTo,
    playContext,
    playTracks,
    search,
    refreshDevices,
    loadPlaylists,
  };
}