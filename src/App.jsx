import { useEffect, useMemo, useRef, useState } from "react";
import { GameArena } from "./components/GameArena";
import { AuthPanel } from "./components/AuthPanel";
import { ModeCard } from "./components/ModeCard";
import { SessionStats } from "./components/SessionStats";
import { SettingsPanel } from "./components/SettingsPanel";
import { TrainingBuilder } from "./components/TrainingBuilder";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { musicTracks } from "./data/gameConfig";
import { customTemplate, defaultPresets } from "./data/presets";

const SETTINGS_STORAGE_KEY = "aimforge-settings";
const RANK_STORAGE_KEY = "aimforge-rank-state";

const ranks = [
  { id: "bronze", label: "Bronze", skill: 0, badge: "Entrada" },
  { id: "silver", label: "Silver", skill: 1, badge: "Base solida" },
  { id: "gold", label: "Gold", skill: 2, badge: "Boa precisao" },
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

export default function App() {
  const [customDraft, setCustomDraft] = useState(customTemplate);
  const [customModes, setCustomModes] = useState([]);
  const [activeMode, setActiveMode] = useState(null);
  const [lastSession, setLastSession] = useState(null);
  const [session, setSession] = useState(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
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
    const defaults = {
      sensitivity: 1,
      musicTrack: musicTracks[0]?.id ?? "escape-love",
      musicVolume: 0.45,
    };

    if (!savedSettings) {
      return defaults;
    }

    try {
      return { ...defaults, ...JSON.parse(savedSettings) };
    } catch {
      return defaults;
    }
  });

  const activeRank = ranks[Math.min(rankState.rankIndex, ranks.length - 1)];
  const allModes = useMemo(() => [...defaultPresets, ...customModes], [customModes]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(RANK_STORAGE_KEY, JSON.stringify(rankState));
  }, [rankState]);

  useEffect(() => {
    const selectedTrack = musicTracks.find((track) => track.id === settings.musicTrack) ?? musicTracks[0];

    if (!selectedTrack) {
      return undefined;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(selectedTrack.src);
    audio.loop = true;
    audio.volume = settings.musicVolume;
    audioRef.current = audio;
    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [settings.musicTrack, settings.musicVolume]);

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

  useEffect(() => {
    if (!supabase || !session?.user) {
      setCustomModes([]);
      return;
    }

    const loadMaps = async () => {
      const { data, error } = await supabase
        .from("custom_maps")
        .select("id, name, description, config, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setSaveMessage(error.message);
        return;
      }

      const normalizedMaps = (data ?? []).map((row) => ({
        id: row.id,
        ...row.config,
        name: row.name,
        description: row.description,
        creatorId: session.user.id,
      }));

      setCustomModes(normalizedMaps);
    };

    loadMaps();
  }, [session]);

  const applyRankDifficulty = (mode) => {
    const rankBoost = activeRank.skill;

    return {
      ...mode,
      difficultyLabel: activeRank.label,
      spawnRate: Math.max(420, mode.spawnRate - rankBoost * 6),
      moveSpeed: mode.moveSpeed + rankBoost * 2,
      strafeIntensity: mode.strafeIntensity + rankBoost * 1,
      verticalDrift: mode.verticalDrift + rankBoost * 1,
      targetLifetime: Math.max(1200, mode.targetLifetime - rankBoost * 10),
      goalHits: mode.goalHits,
      simultaneousTargets: mode.simultaneousTargets,
    };
  };

  const updateAdaptiveRank = (rawStats) => {
    const accuracy = rawStats.shots ? Math.round((rawStats.hits / rawStats.shots) * 100) : 100;
    const completionBonus = rawStats.completed ? 18 : -2;
    const accuracyDelta = accuracy >= 70 ? 12 : accuracy >= 55 ? 7 : accuracy >= 40 ? 3 : -2;
    const comboDelta = rawStats.bestCombo >= 4 ? 4 : rawStats.bestCombo >= 2 ? 2 : 0;
    const totalDelta = completionBonus + accuracyDelta + comboDelta;

    setRankState((current) => {
      let nextPerformance = current.performanceScore + totalDelta;
      let nextRankIndex = current.rankIndex;

      while (nextPerformance >= 8 && nextRankIndex < ranks.length - 1) {
        nextPerformance -= 12;
        nextRankIndex += 1;
      }

      while (nextPerformance <= -40 && nextRankIndex > 0) {
        nextPerformance += 8;
        nextRankIndex -= 1;
      }

      nextPerformance = Math.max(-39, Math.min(23, nextPerformance));

      return {
        rankIndex: nextRankIndex,
        performanceScore: nextPerformance,
      };
    });
  };

  const handleStartMode = (mode) => {
    setActiveMode(applyRankDifficulty(mode));
  };

  const handleSaveCustomMode = async () => {
    if (!supabase || !session?.user) {
      setSaveMessage("Entre na sua conta para salvar mapas no Supabase.");
      return;
    }

    const nextMode = {
      ...customDraft,
      name: customDraft.name.trim() || "Meu mapa 3D",
      description: customDraft.description.trim() || "Mapa personalizado.",
    };

    const { data, error } = await supabase
      .from("custom_maps")
      .insert({
        user_id: session.user.id,
        name: nextMode.name,
        description: nextMode.description,
        config: nextMode,
      })
      .select("id")
      .single();

    if (error) {
      setSaveMessage(error.message);
      return;
    }

    setCustomModes((currentModes) => [{ ...nextMode, id: data.id, creatorId: session.user.id }, ...currentModes]);
    setSaveMessage("Mapa salvo com sucesso.");
  };

  const handleDeleteCustomMode = async (modeId) => {
    if (!supabase || !session?.user) {
      return;
    }

    const { error } = await supabase.from("custom_maps").delete().eq("id", modeId);

    if (error) {
      setSaveMessage(error.message);
      return;
    }

    setCustomModes((currentModes) => currentModes.filter((mode) => mode.id !== modeId));
    setSaveMessage("Mapa deletado.");
  };

  const handleFinish = (rawStats) => {
    updateAdaptiveRank(rawStats);
    setLastSession({
      modeName: activeMode.name,
      stats: buildSummary(rawStats),
    });
    setActiveMode(null);
  };

  const handleSignUp = async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
    });

    setAuthMessage(error ? error.message : "Conta criada. Verifique seu email se o projeto exigir confirmacao.");
  };

  const handleSignIn = async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password,
    });

    setAuthMessage(error ? error.message : "Login realizado com sucesso.");
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    setAuthMessage(error ? error.message : "Sessao encerrada.");
  };

  if (activeMode) {
    return <GameArena mode={activeMode} settings={settings} onFinish={handleFinish} onExit={() => setActiveMode(null)} />;
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__content">
          <span className="eyebrow">AimForge 3D</span>
          <h1>Treino de mira com cenarios de flick, tracking, microajuste e reacao.</h1>
          <p>
            Agora o jogo vem com uma pool pronta de treinos de flick, tracking, micro-adjustment e reacao,
            alem de editor 3D, musica, ranks adaptativos e mapas personalizados salvos na sua conta.
          </p>
        </div>

        <div className="hero__badge">
          <span>Rank Atual</span>
          <strong>{activeRank.label}</strong>
          <span className="hero__rank-note">{activeRank.badge}</span>
        </div>
      </section>

      <section className="panel panel--rank">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Adaptive Rank</span>
            <h2>Dificuldade que reage ao seu desempenho</h2>
          </div>
        </div>

        <div className="creator-grid">
          <article className="settings-card">
            <span className="eyebrow">Rank ativo</span>
            <strong className="creator-id">{activeRank.label}</strong>
            <p>
              Precisao alta e mapas concluidos sobem o rank. Precisao ruim reduz um pouco, mas agora a subida esta mais amigavel.
            </p>
          </article>

          <article className="settings-card">
            <span className="eyebrow">Tendencia atual</span>
            <strong className="creator-id">{rankState.performanceScore}</strong>
            <p>
              Quanto maior esse valor, mais leve fica o aumento de dificuldade. O sistema agora sobe rank com mais facilidade.
            </p>
          </article>
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
            <h2>Escolha um mapa</h2>
          </div>
        </div>

        <div className="mode-grid">
          {allModes.map((mode) => (
            <ModeCard
              key={mode.id}
              mode={applyRankDifficulty(mode)}
              onStart={handleStartMode}
              onDelete={mode.creatorId === session?.user?.id ? handleDeleteCustomMode : undefined}
            />
          ))}
        </div>
      </section>

      <SettingsPanel settings={settings} onSettingsChange={setSettings} musicTracks={musicTracks} />

      <TrainingBuilder
        draft={customDraft}
        onDraftChange={setCustomDraft}
        onSave={handleSaveCustomMode}
        canSave={Boolean(session?.user)}
        saveMessage={saveMessage}
      />

      {lastSession && (
        <SessionStats
          stats={lastSession.stats}
          modeName={lastSession.modeName}
          onBack={() => setLastSession(null)}
        />
      )}
    </main>
  );
}

