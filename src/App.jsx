import { useEffect, useMemo, useRef, useState } from "react";
import { GameArena } from "./components/GameArena";
import { ModeCard } from "./components/ModeCard";
import { SessionStats } from "./components/SessionStats";
import { SettingsPanel } from "./components/SettingsPanel";
import { TrainingBuilder } from "./components/TrainingBuilder";
import { musicTracks as baseMusicTracks } from "./data/gameConfig";
import { customTemplate, defaultPresets, normalizeCustomDraft } from "./data/presets";
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
  codeNotes: "Use esta area para scripts React, HUD customizada e regras do mapa.",
};

function withBuilderDefaults(draft) {
  return {
    ...BUILDER_SCRIPT_DEFAULTS,
    ...draft,
  };
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
      return withBuilderDefaults(customTemplate);
    }

    try {
      return normalizeCustomDraft(withBuilderDefaults({ ...customTemplate, ...JSON.parse(savedDraft) }));
    } catch {
      return withBuilderDefaults(customTemplate);
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
      musicQueue: [musicTracks[0]?.id ?? "escape-your-love"],
      musicVolume: 0.45,
    };

    if (!savedSettings) {
      return defaults;
    }

    try {
      const parsedSettings = JSON.parse(savedSettings);
      return {
        ...defaults,
        ...parsedSettings,
        musicQueue:
          parsedSettings.musicQueue?.length
            ? parsedSettings.musicQueue
            : parsedSettings.musicTrack
              ? [parsedSettings.musicTrack]
              : defaults.musicQueue,
      };
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
    const queue = (settings.musicQueue ?? []).filter(Boolean);

    if (!queue.length) {
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
  }, [settings.musicQueue, settings.musicVolume]);

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
    const baseMode = normalizeModeTuning(mode);
    const rankBoost = activeRank.skill;

    return {
      ...baseMode,
      difficultyLabel: activeRank.label,
      spawnRate: Math.max(560, baseMode.spawnRate - rankBoost * 8),
      moveSpeed: baseMode.moveSpeed + rankBoost * 1,
      strafeIntensity: baseMode.strafeIntensity + rankBoost * 1,
      verticalDrift: baseMode.verticalDrift + Math.min(rankBoost, 2),
      targetLifetime: Math.max(1700, baseMode.targetLifetime - rankBoost * 20),
      goalHits: baseMode.goalHits,
      simultaneousTargets: baseMode.simultaneousTargets,
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
      setSaveMessage(
        `${error.message}. Se estiver no Supabase, rode o arquivo supabase-schema.sql atualizado para liberar select e insert da tabela published_maps.`,
      );
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
        onDraftChange={(nextDraft) => setCustomDraft(withBuilderDefaults(nextDraft))}
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

