import { useEffect, useMemo, useRef, useState } from "react";
import { GameArena } from "./components/GameArena";
import { ModeCard } from "./components/ModeCard";
import { SessionStats } from "./components/SessionStats";
import { SettingsPanel } from "./components/SettingsPanel";
import { TrainingBuilder } from "./components/TrainingBuilder";
import { musicTracks } from "./data/gameConfig";
import { customTemplate, defaultPresets, normalizeCustomDraft } from "./data/presets";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const SETTINGS_STORAGE_KEY = "aimforge-settings";
const RANK_STORAGE_KEY = "aimforge-rank-state";
const DRAFT_STORAGE_KEY = "aimforge-builder-draft";

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
  const [customDraft, setCustomDraft] = useState(() => {
    const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);

    if (!savedDraft) {
      return customTemplate;
    }

    try {
      return normalizeCustomDraft({ ...customTemplate, ...JSON.parse(savedDraft) });
    } catch {
      return customTemplate;
    }
  });
  const [publishedModes, setPublishedModes] = useState([]);
  const [activeMode, setActiveMode] = useState(null);
  const [lastSession, setLastSession] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
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
  const filteredPublishedModes = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      return publishedModes;
    }

    return publishedModes.filter((mode) =>
      [mode.name, mode.description, mode.author, mode.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedTerm)),
    );
  }, [publishedModes, searchTerm]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(customDraft));
  }, [customDraft]);

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
      return;
    }

    const loadMaps = async () => {
      const { data, error } = await supabase
        .from("published_maps")
        .select("id, name, author, description, config, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setSaveMessage(error.message);
        return;
      }

      const normalizedMaps = (data ?? []).map((row) => ({
        id: row.id,
        ...row.config,
        name: row.name,
        author: row.author,
        description: row.description,
        category: row.config?.category ?? "Comunidade",
      }));

      setPublishedModes(normalizedMaps);
    };

    loadMaps();
  }, []);

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

      return {
        rankIndex: nextRankIndex,
        performanceScore: nextPerformance,
      };
    });
  };

  const handleStartMode = (mode) => {
    setActiveMode(applyRankDifficulty(mode));
  };

  const handlePreviewDraft = () => {
    setActiveMode(
      applyRankDifficulty({
        ...customDraft,
        id: "builder-preview",
        name: customDraft.name?.trim() ? `Teste: ${customDraft.name.trim()}` : "Teste do mapa",
        category: "Preview",
      }),
    );
    setSaveMessage("Preview iniciado sem publicar.");
  };

  const handlePublishCustomMode = async ({ title, author, description }) => {
    if (!supabase) {
      setSaveMessage("Configure o Supabase para publicar mapas da comunidade.");
      return;
    }

    const nextMode = {
      ...customDraft,
      name: title.trim() || customDraft.name.trim() || "Meu mapa 3D",
      author: author.trim() || "Anonimo",
      description: description.trim() || customDraft.description.trim() || "Mapa publicado pela comunidade.",
      category: customDraft.category?.trim?.() || "Comunidade",
    };

    const { data, error } = await supabase
      .from("published_maps")
      .insert({
        name: nextMode.name,
        author: nextMode.author,
        description: nextMode.description,
        config: nextMode,
      })
      .select("id")
      .single();

    if (error) {
      setSaveMessage(error.message);
      return;
    }

    setPublishedModes((currentModes) => [{ ...nextMode, id: data.id }, ...currentModes]);
    setSaveMessage("Mapa publicado com sucesso. Ele ja aparece na busca da comunidade.");
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
            alem de editor 3D, musica, ranks adaptativos, preview instantaneo e publicacao aberta para a comunidade.
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
              Quanto maior esse valor, mais facil fica subir de rank. O sistema agora esta mais amigavel e pune menos.
            </p>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Map Pool</span>
            <h2>Treinos prontos</h2>
          </div>
        </div>

        <div className="mode-grid">
          {defaultPresets.map((mode) => (
            <ModeCard key={mode.id} mode={applyRankDifficulty(mode)} onStart={handleStartMode} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Community Maps</span>
            <h2>Pesquisar mapas publicados</h2>
          </div>
        </div>

        <div className="creator-grid">
          <article className="settings-card">
            <label className="field">
              <span>Buscar por titulo, autor ou descricao</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Ex.: flick, tracking, Rafael"
              />
            </label>
            <p>
              {isSupabaseConfigured
                ? `${filteredPublishedModes.length} mapa(s) encontrados na comunidade.`
                : "Configure o Supabase para liberar a biblioteca publica de mapas."}
            </p>
          </article>

          <article className="settings-card">
            <span className="eyebrow">Como funciona</span>
            <p>Voce monta o mapa no editor, testa sem publicar e so depois envia para a comunidade com titulo, autor e descricao.</p>
          </article>
        </div>

        <div className="mode-grid">
          {filteredPublishedModes.map((mode) => (
            <ModeCard key={mode.id} mode={applyRankDifficulty(mode)} onStart={handleStartMode} />
          ))}
        </div>
      </section>

      <SettingsPanel settings={settings} onSettingsChange={setSettings} musicTracks={musicTracks} />

      <TrainingBuilder
        draft={customDraft}
        onDraftChange={setCustomDraft}
        onPreview={handlePreviewDraft}
        onPublish={handlePublishCustomMode}
        publishMessage={saveMessage}
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

