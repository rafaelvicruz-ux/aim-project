import { useEffect, useMemo, useState } from "react";
import { GameArena } from "./components/GameArena";
import { AuthPanel } from "./components/AuthPanel";
import { ModeCard } from "./components/ModeCard";
import { SessionStats } from "./components/SessionStats";
import { SettingsPanel } from "./components/SettingsPanel";
import { TrainingBuilder } from "./components/TrainingBuilder";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
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
        setAuthMessage(error.message);
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

  const handleSaveCustomMode = () => {
    if (!supabase || !session?.user) {
      setAuthMessage("Entre na sua conta para salvar mapas no Supabase.");
      return;
    }

    const nextMode = {
      ...customDraft,
      name: customDraft.name.trim() || "Meu mapa 3D",
      description: customDraft.description.trim() || "Mapa personalizado.",
    };

    supabase
      .from("custom_maps")
      .insert({
        user_id: session.user.id,
        name: nextMode.name,
        description: nextMode.description,
        config: nextMode,
      })
      .select("id")
      .single()
      .then(({ data, error }) => {
        if (error) {
          setAuthMessage(error.message);
          return;
        }

        setCustomModes((currentModes) => [{ ...nextMode, id: data.id, creatorId: session.user.id }, ...currentModes]);
        setAuthMessage("Mapa salvo com sucesso.");
      });
  };

  const handleDeleteCustomMode = (modeId) => {
    if (!supabase || !session?.user) {
      return;
    }

    supabase
      .from("custom_maps")
      .delete()
      .eq("id", modeId)
      .then(({ error }) => {
        if (error) {
          setAuthMessage(error.message);
          return;
        }

        setCustomModes((currentModes) => currentModes.filter((mode) => mode.id !== modeId));
      });
  };

  const handleFinish = (rawStats) => {
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

    setAuthMessage(error ? error.message : "Conta criada. Verifique seu email se o projeto exigir confirmação.");
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
    setAuthMessage(error ? error.message : "Sessão encerrada.");
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
              mode={mode}
              onStart={setActiveMode}
              onDelete={mode.creatorId === session?.user?.id ? handleDeleteCustomMode : undefined}
            />
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
