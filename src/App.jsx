import { useEffect, useMemo, useRef, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { GameArena } from "./components/GameArena";
import { ModeCard } from "./components/ModeCard";
import { SessionStats } from "./components/SessionStats";
import { SettingsPanel } from "./components/SettingsPanel";
import { SpotifyPanel } from "./components/SpotifyPanel";
import { TrainingBuilder } from "./components/TrainingBuilder";
import { defaultCrosshair } from "./components/game/GameHud";
import { musicTracks as baseMusicTracks } from "./data/gameConfig";
import { customTemplate, defaultPresets, normalizeCustomDraft, presetCategories } from "./data/presets";
import { useSpotify } from "./hooks/useSpotify";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const SETTINGS_STORAGE_KEY = "aimforge-settings";
const RANK_STORAGE_KEY = "aimforge-rank-state";
const DRAFT_STORAGE_KEY = "aimforge-builder-draft";

const BUILDER_SCRIPT_DEFAULTS = {
  logicPreset: "react-wave-manager",
  codeComponent: `export function MapLogicHUD({ combo, score, timeLeft }) {
  return (
    <div className="map-logic-hud">
      <strong>Combo {combo}</strong>
      <span>Score {score}</span>
      <span>{timeLeft}s restantes</span>
    </div>
  );
}`,
  codeSystems: `import { useEffect } from "react";

export function useMapLogic({ mode, setSpawnModifier, setRewardRule }) {
  useEffect(() => {
    setSpawnModifier(mode.pattern === "burst" ? 0.92 : 1);
    setRewardRule(mode.scoring === "combo" ? "combo-chain" : "precision-hold");
  }, [mode, setRewardRule, setSpawnModifier]);
}`,
  codeNotes: "Use esta área para scripts React, HUD customizada e regras do mapa.",
  scriptAreas: [
    {
      id: "hud-script",
      name: "HUD Script",
      type: "component",
      code: `export function TrainingHud({ combo, score }) {
  return (
    <div className="training-hud">
      <strong>Combo {combo}</strong>
      <span>Score {score}</span>
    </div>
  );
}`,
    },
    {
      id: "spawn-director",
      name: "Spawn Director",
      type: "system",
      code: `export function setupSpawnDirector({ setSpawnModifier }) {
  setSpawnModifier(1);
}`,
    },
  ],
};

function withBuilderDefaults(draft) {
  return { ...BUILDER_SCRIPT_DEFAULTS, ...draft };
}

function normalizeModeTuning(mode) {
  return {
    ...mode,
    spawnRate: Math.min(1800, Math.round((mode.spawnRate ?? 600) * 1.32)),
    targetLifetime: Math.min(5200, Math.round((mode.targetLifetime ?? 1600) * 1.45)),
    moveSpeed: Math.max(6, Math.round((mode.moveSpeed ?? 20) * 0.4)),
    strafeIntensity: Math.max(0, Math.round((mode.strafeIntensity ?? 0) * 0.42)),
    verticalDrift: Math.max(0, Math.round((mode.verticalDrift ?? 0) * 0.4)),
  };
}

const musicTracks = [
  ...baseMusicTracks,
  {
    id: "dance-playful-night",
    name: "Dance Playful Night",
    src: new URL("../music/alexzavesa-dance-playful-night-510786.mp3", import.meta.url).href,
  },
  {
    id: "gvidon-medicine",
    name: "Gvidon Medicine",
    src: new URL("../music/gvidon-gvidon-medicine-364031.mp3", import.meta.url).href,
  },
  {
    id: "aj-background-music",
    name: "AJ Background Music",
    src: new URL("../music/ikoliks_aj-background-music-320427.mp3", import.meta.url).href,
  },
  {
    id: "water-afro-pop",
    name: "Water Afro Pop",
    src: new URL("../music/kontraa-water-afro-pop-music-445661.mp3", import.meta.url).href,
  },
];

const ranks = [
  { id: "bronze", label: "Bronze", skill: 0, badge: "Entrada" },
  { id: "silver", label: "Silver", skill: 1, badge: "Base sólida" },
  { id: "gold", label: "Gold", skill: 2, badge: "Boa precisão" },
  { id: "platinum", label: "Platinum", skill: 3, badge: "Controle forte" },
  { id: "diamond", label: "Diamond", skill: 4, badge: "Elite" },
  { id: "master", label: "Master", skill: 5, badge: "Predador" },
];

function buildSummary(rawStats) {
  const accuracy = rawStats.shots ? Math.round((rawStats.hits / rawStats.shots) * 100) : 100;
  const avgReaction = rawStats.reactionTimes.length
    ? Math.round(rawStats.reactionTimes.reduce((sum, value) => sum + value, 0) / rawStats.reactionTimes.length)
    : 0;

  return {
    score: rawStats.score,
    accuracy,
    hits: rawStats.hits,
    misses: rawStats.misses,
    avgReaction,
    bestCombo: rawStats.bestCombo,
    goalHits: rawStats.goalHits,
    timeSpent: rawStats.timeSpent,
    completed: rawStats.completed,
  };
}

const defaultSettings = {
  sensitivity: 1,
  musicQueue: [musicTracks[0]?.id ?? "escape-your-love"],
  musicVolume: 0.45,
  quality: "high",
  crosshair: defaultCrosshair,
  showFeed: true,
  showTrackInGame: true,
};

export default function App() {
  const [customDraft, setCustomDraft] = useState(() => {
    const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);

    if (!savedDraft) {
      return withBuilderDefaults(customTemplate);
    }

    try {
      return normalizeCustomDraft(withBuilderDefaults({ ...customTemplate, ...JSON.parse(savedDraft) }));
    } catch {
      return withBuilderDefaults(customTemplate);
    }
  });
  const [activeMode, setActiveMode] = useState(null);
  const [lastSession, setLastSession] = useState(null);
  const [session, setSession] = useState(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [presetCategory, setPresetCategory] = useState("Todos");
  const audioRef = useRef(null);

  const [rankState, setRankState] = useState(() => {
    const savedRank = window.localStorage.getItem(RANK_STORAGE_KEY);

    if (!savedRank) {
      return { rankIndex: 0, performanceScore: 0 };
    }

    try {
      return JSON.parse(savedRank);
    } catch {
      return { rankIndex: 0, performanceScore: 0 };
    }
  });

  const [settings, setSettings] = useState(() => {
    const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!savedSettings) {
      return defaultSettings;
    }

    try {
      const parsedSettings = JSON.parse(savedSettings);
      return {
        ...defaultSettings,
        ...parsedSettings,
        crosshair: { ...defaultCrosshair, ...(parsedSettings.crosshair ?? {}) },
        musicQueue: parsedSettings.musicQueue?.length
          ? parsedSettings.musicQueue
          : parsedSettings.musicTrack
            ? [parsedSettings.musicTrack]
            : defaultSettings.musicQueue,
      };
    } catch {
      return defaultSettings;
    }
  });

  const spotify = useSpotify();
  const spotifyPlayingInApp = spotify.usingAppPlayer && spotify.nowPlaying?.paused === false;

  const activeRank = ranks[Math.min(rankState.rankIndex, ranks.length - 1)];

  const visiblePresets = useMemo(() => {
    if (presetCategory === "Todos") {
      return defaultPresets;
    }

    return defaultPresets.filter((preset) => preset.category === presetCategory);
  }, [presetCategory]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(customDraft));
  }, [customDraft]);

  useEffect(() => {
    window.localStorage.setItem(RANK_STORAGE_KEY, JSON.stringify(rankState));
  }, [rankState]);

  // fila local: o Spotify tocando dentro do app tem prioridade
  useEffect(() => {
    const queue = (settings.musicQueue ?? []).filter(Boolean);

    if (!queue.length || spotifyPlayingInApp) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return undefined;
    }

    let cancelled = false;
    let queueIndex = 0;

    const playTrackAt = (index) => {
      const nextTrack = musicTracks.find((track) => track.id === queue[index]) ?? musicTracks[0];

      if (!nextTrack || cancelled) {
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(nextTrack.src);
      audio.volume = settings.musicVolume;
      audioRef.current = audio;
      audio.onended = () => {
        queueIndex = (queueIndex + 1) % queue.length;
        playTrackAt(queueIndex);
      };
      audio.play().catch(() => {});
    };

    playTrackAt(queueIndex);

    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [settings.musicQueue, settings.musicVolume, spotifyPlayingInApp]);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const applyRankDifficulty = (mode) => {
    const baseMode = normalizeModeTuning(mode);
    const rankBoost = activeRank.skill;

    return {
      ...baseMode,
      difficultyLabel: activeRank.label,
      spawnRate: Math.max(560, baseMode.spawnRate - rankBoost * 8),
      moveSpeed: baseMode.moveSpeed + rankBoost,
      strafeIntensity: baseMode.strafeIntensity + rankBoost,
      verticalDrift: baseMode.verticalDrift + Math.min(rankBoost, 2),
      targetLifetime: Math.max(1700, baseMode.targetLifetime - rankBoost * 20),
    };
  };

  const updateAdaptiveRank = (rawStats) => {
    const accuracy = rawStats.shots ? Math.round((rawStats.hits / rawStats.shots) * 100) : 100;
    const completionBonus = rawStats.completed ? 10 : 0;
    const accuracyDelta = accuracy >= 65 ? 8 : accuracy >= 50 ? 5 : accuracy >= 35 ? 2 : -1;
    const comboDelta = rawStats.bestCombo >= 4 ? 4 : rawStats.bestCombo >= 2 ? 2 : 0;
    const totalDelta = completionBonus + accuracyDelta + comboDelta;

    setRankState((current) => {
      let nextPerformance = current.performanceScore + totalDelta;
      let nextRankIndex = current.rankIndex;

      while (nextPerformance >= 10 && nextRankIndex < ranks.length - 1) {
        nextPerformance -= 10;
        nextRankIndex += 1;
      }

      while (nextPerformance <= -12 && nextRankIndex > 0) {
        nextPerformance += 10;
        nextRankIndex -= 1;
      }

      nextPerformance = Math.max(-11, Math.min(19, nextPerformance));

      return { rankIndex: nextRankIndex, performanceScore: nextPerformance };
    });
  };

  const handleStartMode = (mode) => {
    setLastSession(null);
    setActiveMode(applyRankDifficulty(mode));
  };

  const handlePreviewDraft = () => {
    setLastSession(null);
    setActiveMode(
      applyRankDifficulty({
        ...customDraft,
        id: "builder-preview",
        name: customDraft.name?.trim() ? `Teste: ${customDraft.name.trim()}` : "Teste do mapa",
        category: "Preview",
      }),
    );
    setPreviewMessage("Preview iniciado sem publicar.");
  };

  const handleFinish = (rawStats) => {
    if (activeMode?.id !== "builder-preview") {
      updateAdaptiveRank(rawStats);
    }

    setLastSession({
      modeName: activeMode.name,
      stats: buildSummary(rawStats),
    });
    setActiveMode(null);
  };

  const handleSignUp = async () => {
    if (!supabase) {
      setAuthMessage("Configure o Supabase para criar conta.");
      return;
    }

    const { error } = await supabase.auth.signUp({ email: authForm.email, password: authForm.password });
    setAuthMessage(error ? error.message : "Conta criada. Verifique seu email se a confirmação estiver ativa.");
  };

  const handleSignIn = async () => {
    if (!supabase) {
      setAuthMessage("Configure o Supabase para entrar.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
    setAuthMessage(error ? error.message : "Login realizado com sucesso.");
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    setAuthMessage(error ? error.message : "Sessão encerrada.");
  };

  if (activeMode) {
    return (
      <GameArena
        mode={activeMode}
        settings={settings}
        nowPlaying={spotify.nowPlaying}
        onSensitivityChange={(value) => setSettings((current) => ({ ...current, sensitivity: value }))}
        onFinish={handleFinish}
        onExit={() => setActiveMode(null)}
      />
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__content">
          <span className="eyebrow">AimForge 3D</span>
          <h1>Treino de mira com cenários de flick, tracking, microajuste e reação.</h1>
          <p>
            Pool pronta de treinos, editor 3D com snap e undo, HUD competitiva, ranks adaptativos, preview instantâneo,
            publicação aberta para a comunidade e Spotify tocando dentro do próprio app.
          </p>
        </div>

        <div className="hero__badge">
          <span>Rank atual</span>
          <strong>{activeRank.label}</strong>
          <span className="hero__rank-note">{activeRank.badge}</span>
          <div className="hero__rank-bar">
            <div style={{ width: `${Math.max(0, Math.min(100, ((rankState.performanceScore + 12) / 22) * 100))}%` }} />
          </div>
        </div>
      </section>

      <AuthPanel
        session={session}
        authForm={authForm}
        onAuthFormChange={setAuthForm}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onSignOut={handleSignOut}
        authMessage={authMessage}
        isConfigured={isSupabaseConfigured}
      />

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Map Pool</span>
            <h2>Treinos prontos</h2>
          </div>
          <div className="chip-row">
            {["Todos", ...presetCategories].map((category) => (
              <button
                key={category}
                type="button"
                className={presetCategory === category ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                onClick={() => setPresetCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mode-grid">
          {visiblePresets.map((mode) => (
            <ModeCard key={mode.id} mode={applyRankDifficulty(mode)} onStart={handleStartMode} />
          ))}
        </div>
      </section>

      <SpotifyPanel spotify={spotify} />

      <SettingsPanel settings={settings} onSettingsChange={setSettings} musicTracks={musicTracks} />

      <TrainingBuilder
        draft={customDraft}
        onDraftChange={(nextDraft) => setCustomDraft(withBuilderDefaults(nextDraft))}
        onPreview={handlePreviewDraft}
        statusMessage={previewMessage}
      />

      {lastSession && (
        <SessionStats stats={lastSession.stats} modeName={lastSession.modeName} onBack={() => setLastSession(null)} />
      )}
    </main>
  );
}