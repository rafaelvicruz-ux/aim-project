import { useEffect, useMemo, useState } from "react";
import { GameArena } from "./components/GameArena";
import { ModeCard } from "./components/ModeCard";
import { SessionStats } from "./components/SessionStats";
import { SettingsPanel } from "./components/SettingsPanel";
import { TrainingBuilder } from "./components/TrainingBuilder";
import { customTemplate, defaultPresets } from "./data/presets";

const SETTINGS_STORAGE_KEY = "aimforge-settings";

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
  };
}

export default function App() {
  const [customDraft, setCustomDraft] = useState(customTemplate);
  const [customModes, setCustomModes] = useState([]);
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

  const handleSaveCustomMode = () => {
    const nextMode = {
      ...customDraft,
      id: `custom-${Date.now()}`,
      name: customDraft.name.trim() || "Meu treino",
      description: customDraft.description.trim() || "Treino personalizado.",
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

  const handleExit = () => {
    setActiveMode(null);
  };

  if (activeMode) {
    return <GameArena mode={activeMode} settings={settings} onFinish={handleFinish} onExit={handleExit} />;
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__content">
          <span className="eyebrow">AimForge Prototype</span>
          <h1>Treino de mira em React com presets e criador de rotinas.</h1>
          <p>
            Uma base para evoluir em algo estilo Kovaaks, mas com identidade própria, feedback rápido
            e uma área para montar exercícios sob medida.
          </p>
        </div>

        <div className="hero__badge">
          <span>Focus</span>
          <strong>Flick + Tracking + Custom Builder</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Play Modes</span>
            <h2>Escolha um treino</h2>
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
