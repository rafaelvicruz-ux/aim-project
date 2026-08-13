import { useEffect, useMemo, useState } from "react";
import { GameArena } from "./components/GameArena";
import { ModeCard } from "./components/ModeCard";
import { SessionStats } from "./components/SessionStats";
import { SettingsPanel } from "./components/SettingsPanel";
import { TrainingBuilder } from "./components/TrainingBuilder";
import { customTemplate, defaultPresets } from "./data/presets";

const SETTINGS_STORAGE_KEY = "aimforge-settings";
const CUSTOM_MAPS_STORAGE_KEY = "aimforge-custom-maps";

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
  const [customModes, setCustomModes] = useState(() => {
    const savedModes = window.localStorage.getItem(CUSTOM_MAPS_STORAGE_KEY);

    if (!savedModes) {
      return [];
    }

    try {
      return JSON.parse(savedModes);
    } catch {
      return [];
    }
  });
  const [activeMode, setActiveMode] = useState(null);
  const [lastSession, setLastSession] = useState(null);
  const [settings, setSettings] = useState(() => {
    const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!savedSettings) {
      return { sensitivity: 1 };
    }

    try {
      return JSON.parse(savedSettings);
    } catch {
      return { sensitivity: 1 };
    }
  });

  const allModes = useMemo(() => [...defaultPresets, ...customModes], [customModes]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_MAPS_STORAGE_KEY, JSON.stringify(customModes));
  }, [customModes]);

  const handleSaveCustomMode = () => {
    const nextMode = {
      ...customDraft,
      id: `custom-${Date.now()}`,
      name: customDraft.name.trim() || "Meu mapa 3D",
      description: customDraft.description.trim() || "Mapa personalizado.",
    };

    setCustomModes((currentModes) => [nextMode, ...currentModes]);
  };

  const handleFinish = (rawStats) => {
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
          <h1>Treino de mira com mapas 3D, meta de acertos e criador de arenas.</h1>
          <p>
            Agora o jogo tem 47 mapas, FPS em primeira pessoa, inimigos 3D, objetivo por hits,
            tempo para concluir e editor para criar novas rotas e padrões de combate.
          </p>
        </div>

        <div className="hero__badge">
          <span>Status</span>
          <strong>47 mapas + inimigos 3D + builder</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Map Pool</span>
            <h2>Escolha um mapa</h2>
          </div>
        </div>

        <div className="mode-grid">
          {allModes.map((mode) => (
            <ModeCard key={mode.id} mode={mode} onStart={setActiveMode} />
          ))}
        </div>
      </section>

      <SettingsPanel settings={settings} onSettingsChange={setSettings} />

      <TrainingBuilder draft={customDraft} onDraftChange={setCustomDraft} onSave={handleSaveCustomMode} />

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
