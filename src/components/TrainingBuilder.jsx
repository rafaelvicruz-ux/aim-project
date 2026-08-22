import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapEditorViewport } from "./MapEditorViewport";
import {
  EDITOR_SNAP_STEPS,
  arenaPrefabs,
  buildObstacleLayout,
  builderBlueprints,
  createObstacleAt,
  createSpawnNodeAt,
  duplicateEntity,
  getObstacleKit,
  getObstacleType,
  getSpawnPreset,
  obstacleGroups,
  obstacleKits,
  obstacleTypes,
  spawnPresets,
} from "../data/gameConfig";
import { customTemplate, patternOptions } from "../data/presets";

const BUILDER_TABS = [
  { id: "layout", label: "Layout 3D", hint: "Monte a arena, spawns e cobertura" },
  { id: "gameplay", label: "Gameplay", hint: "Ritmo, dificuldade e pontuação" },
  { id: "scripts", label: "Scripts", hint: "HUD e regras em React" },
  { id: "publish", label: "Publicar", hint: "Revisão e envio para a comunidade" },
];

const scoringOptions = [
  { value: "precision", label: "Precision", help: "Score focado em acerto limpo e estável." },
  { value: "combo", label: "Combo", help: "Valoriza sequências longas sem perder ritmo." },
  { value: "tracking", label: "Tracking", help: "Premia leitura de alvo com movimento constante." },
];

const rangeGroups = [
  {
    id: "sessao",
    label: "Sessão",
    fields: [
      { key: "duration", label: "Tempo limite", min: 15, max: 180, step: 5, unit: "s" },
      { key: "goalHits", label: "Acertos para concluir", min: 5, max: 120, step: 1, unit: " hits" },
      { key: "simultaneousTargets", label: "Inimigos simultâneos", min: 1, max: 6, step: 1, unit: "" },
      { key: "depthLayers", label: "Camadas 3D", min: 1, max: 5, step: 1, unit: " layers" },
    ],
  },
  {
    id: "alvo",
    label: "Alvo",
    fields: [
      { key: "targetSize", label: "Escala do inimigo", min: 18, max: 90, step: 2, unit: "%" },
      { key: "spawnRate", label: "Ritmo de spawn", min: 180, max: 1800, step: 20, unit: "ms" },
      { key: "targetLifetime", label: "Janela de vida", min: 400, max: 5000, step: 50, unit: "ms" },
    ],
  },
  {
    id: "movimento",
    label: "Movimento",
    fields: [
      { key: "moveSpeed", label: "Velocidade frontal", min: 0, max: 260, step: 10, unit: "" },
      { key: "strafeIntensity", label: "Strafe lateral", min: 0, max: 180, step: 5, unit: "" },
      { key: "verticalDrift", label: "Deriva vertical", min: 0, max: 140, step: 5, unit: "" },
    ],
  },
];

const transformModes = [
  { id: "translate", label: "Mover", key: "G" },
  { id: "rotate", label: "Girar", key: "R" },
  { id: "scale", label: "Escalar", key: "S" },
];

const cameraViews = [
  { id: "perspective", label: "Perspectiva" },
  { id: "top", label: "Topo" },
  { id: "front", label: "Frente" },
  { id: "side", label: "Lado" },
];

const logicPresets = [
  {
    id: "react-wave-manager",
    label: "Wave Manager",
    description: "Controla ondas, dificuldade e recompensas no estilo de uma scene tool.",
    component: `export function MapLogicHUD({ combo, score, timeLeft }) {
  return (
    <div className="map-logic-hud">
      <strong>Combo {combo}</strong>
      <span>Score {score}</span>
      <span>{timeLeft}s restantes</span>
    </div>
  );
}`,
    systems: `import { useEffect } from "react";

export function useMapLogic({ mode, setSpawnModifier, setRewardRule }) {
  useEffect(() => {
    setSpawnModifier(mode.pattern === "burst" ? 0.92 : 1);
    setRewardRule(mode.scoring === "combo" ? "combo-chain" : "precision-hold");
  }, [mode, setRewardRule, setSpawnModifier]);
}`,
  },
  {
    id: "react-boss-phase",
    label: "Boss Phase",
    description: "Cria um ciclo de fase especial com alvo elite, pausas e mudanças visuais.",
    component: `export function BossWaveBanner({ phase, pressure }) {
  return (
    <div className="boss-wave-banner">
      <strong>Fase {phase}</strong>
      <span>Pressão {pressure}%</span>
    </div>
  );
}`,
    systems: `import { useEffect } from "react";

export function useBossPhase({ elapsedTime, setSpawnModifier, setTargetScale }) {
  useEffect(() => {
    const phase = elapsedTime > 20 ? 2 : 1;
    setSpawnModifier(phase === 2 ? 0.82 : 1);
    setTargetScale(phase === 2 ? 0.88 : 1);
  }, [elapsedTime, setSpawnModifier, setTargetScale]);
}`,
  },
  {
    id: "react-training-director",
    label: "Training Director",
    description: "Organiza checkpoints, mensagens e comportamento adaptativo do treino.",
    component: `export function DirectorFeed({ message, streak }) {
  return (
    <div className="director-feed">
      <strong>{message}</strong>
      <span>Streak {streak}</span>
    </div>
  );
}`,
    systems: `import { useEffect } from "react";

export function useTrainingDirector({ accuracy, setHint, setSpawnModifier }) {
  useEffect(() => {
    setHint(accuracy < 45 ? "Diminua a velocidade e centralize a mira." : "Bom ritmo, mantenha o tracking.");
    setSpawnModifier(accuracy < 45 ? 1.08 : 0.96);
  }, [accuracy, setHint, setSpawnModifier]);
}`,
  },
];

const defaultCodeWorkspace = {
  logicPreset: logicPresets[0].id,
  codeComponent: logicPresets[0].component,
  codeSystems: logicPresets[0].systems,
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

const scriptAreaTypes = [
  { id: "component", label: "React Component" },
  { id: "system", label: "Gameplay System" },
  { id: "trigger", label: "Trigger Logic" },
  { id: "service", label: "Data Service" },
];

function createScriptArea() {
  return {
    id: `script-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`,
    name: "Novo Script",
    type: "component",
    code: `export function NovoScript() {\n  return null;\n}`,
  };
}

function normalizeDraft(nextDraft) {
  return {
    ...nextDraft,
    obstacleSet: [...new Set((nextDraft.obstacles ?? []).map((item) => item.type))],
  };
}

function createPresetSpawnNodes(spawnPresetId) {
  const preset = getSpawnPreset(spawnPresetId);
  const height = Number(((preset.heightRange[0] + preset.heightRange[1]) / 2).toFixed(1));

  return preset.anchors.map((anchor, index) => ({
    id: `${spawnPresetId}-spawn-${index}`,
    position: [anchor[0], 0, anchor[2]],
    height,
  }));
}

export function TrainingBuilder({ draft, onDraftChange, onPreview, onPublish, publishMessage }) {
  const [tab, setTab] = useState("layout");
  const [selection, setSelection] = useState(null);
  const [transformMode, setTransformMode] = useState("translate");
  const [snap, setSnap] = useState(1);
  const [placing, setPlacing] = useState(null);
  const [view, setView] = useState("perspective");
  const [focusTarget, setFocusTarget] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [assetGroup, setAssetGroup] = useState(obstacleGroups[0]);
  const [selectedScriptId, setSelectedScriptId] = useState(
    draft.scriptAreas?.[0]?.id ?? defaultCodeWorkspace.scriptAreas[0].id,
  );
  const [publishForm, setPublishForm] = useState({
    title: draft.name ?? "Meu mapa 3D",
    author: "",
    description: draft.description ?? "",
  });

  const history = useRef({ past: [], future: [] });
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 });

  const syncHistorySize = useCallback(() => {
    setHistorySize({ past: history.current.past.length, future: history.current.future.length });
  }, []);

  const applyDraft = useCallback(
    (nextDraft, { trackHistory = true } = {}) => {
      if (trackHistory) {
        history.current.past = [...history.current.past.slice(-39), draft];
        history.current.future = [];
        syncHistorySize();
      }

      onDraftChange(normalizeDraft({ ...defaultCodeWorkspace, ...nextDraft }));
    },
    [draft, onDraftChange, syncHistorySize],
  );

  const handleUndo = useCallback(() => {
    const previous = history.current.past.pop();
    if (!previous) {
      return;
    }

    history.current.future = [draft, ...history.current.future.slice(0, 39)];
    syncHistorySize();
    onDraftChange(normalizeDraft({ ...defaultCodeWorkspace, ...previous }));
    setSelection(null);
  }, [draft, onDraftChange, syncHistorySize]);

  const handleRedo = useCallback(() => {
    const [next, ...rest] = history.current.future;
    if (!next) {
      return;
    }

    history.current.future = rest;
    history.current.past = [...history.current.past, draft];
    syncHistorySize();
    onDraftChange(normalizeDraft({ ...defaultCodeWorkspace, ...next }));
    setSelection(null);
  }, [draft, onDraftChange, syncHistorySize]);

  const handleChange = (key, value) => {
    applyDraft({ ...draft, [key]: value });
  };

  const handleReset = () => {
    setSelection(null);
    setPlacing(null);
    setTransformMode("translate");
    applyDraft({ ...customTemplate, ...defaultCodeWorkspace });
  };

  const handlePublishChange = (field, value) => {
    setPublishForm((current) => ({ ...current, [field]: value }));
  };

  const handleLogicPresetApply = (preset) => {
    applyDraft({
      ...draft,
      logicPreset: preset.id,
      codeComponent: preset.component,
      codeSystems: preset.systems,
    });
  };

  const handleCodeFieldChange = (field, value) => {
    applyDraft({ ...draft, [field]: value }, { trackHistory: false });
  };

  const scriptAreas = draft.scriptAreas ?? defaultCodeWorkspace.scriptAreas;

  const handleAddScriptArea = () => {
    const nextScript = createScriptArea();
    setSelectedScriptId(nextScript.id);
    applyDraft({ ...draft, scriptAreas: [...scriptAreas, nextScript] });
  };

  const handleScriptAreaChange = (scriptId, field, value) => {
    applyDraft(
      {
        ...draft,
        scriptAreas: scriptAreas.map((script) => (script.id === scriptId ? { ...script, [field]: value } : script)),
      },
      { trackHistory: false },
    );
  };

  const handleRemoveScriptArea = (scriptId) => {
    const nextScripts = scriptAreas.filter((script) => script.id !== scriptId);
    const fallbackScripts = nextScripts.length ? nextScripts : [createScriptArea()];
    setSelectedScriptId(fallbackScripts[0].id);
    applyDraft({ ...draft, scriptAreas: fallbackScripts });
  };

  const handleBlueprintApply = (blueprint) => {
    const obstacleSet = getObstacleKit(blueprint.obstacleKit).obstacleSet;
    setSelection(null);
    applyDraft({
      ...draft,
      ...blueprint,
      obstacleSet,
      obstacles: buildObstacleLayout(obstacleSet, blueprint.arenaPrefab),
      spawnNodes: createPresetSpawnNodes(blueprint.spawnPreset),
    });
  };

  const handleArenaSelect = (arenaPrefab) => {
    applyDraft({ ...draft, arenaPrefab });
  };

  const handleSpawnSelect = (spawnPreset) => {
    setSelection(null);
    applyDraft({ ...draft, spawnPreset, spawnNodes: createPresetSpawnNodes(spawnPreset) });
  };

  const handleKitSelect = (obstacleKit) => {
    const obstacleSet = getObstacleKit(obstacleKit).obstacleSet;
    setSelection(null);
    applyDraft({
      ...draft,
      obstacleKit,
      obstacleSet,
      obstacles: buildObstacleLayout(obstacleSet, draft.arenaPrefab),
    });
  };

  const handlePlaceAt = useCallback(
    (position) => {
      if (!placing) {
        return;
      }

      if (placing === "spawn") {
        const nextSpawn = createSpawnNodeAt(position);
        setSelection({ kind: "spawn", id: nextSpawn.id });
        applyDraft({
          ...draft,
          spawnPreset: "custom-spawn",
          spawnNodes: [...(draft.spawnNodes ?? []), nextSpawn],
        });
        return;
      }

      const nextObstacle = createObstacleAt(placing, position);
      setSelection({ kind: "obstacle", id: nextObstacle.id });
      applyDraft({
        ...draft,
        obstacleKit: "custom-kit",
        obstacles: [...(draft.obstacles ?? []), nextObstacle],
      });
    },
    [applyDraft, draft, placing],
  );

  const selectedItem = selection
    ? selection.kind === "spawn"
      ? (draft.spawnNodes ?? []).find((item) => item.id === selection.id)
      : (draft.obstacles ?? []).find((item) => item.id === selection.id)
    : null;

  const handleTransformEntity = useCallback(
    (entitySelection, transform) => {
      if (entitySelection.kind === "spawn") {
        onDraftChange(
          normalizeDraft({
            ...defaultCodeWorkspace,
            ...draft,
            spawnPreset: "custom-spawn",
            spawnNodes: (draft.spawnNodes ?? []).map((item) =>
              item.id === entitySelection.id ? { ...item, position: transform.position } : item,
            ),
          }),
        );
        return;
      }

      onDraftChange(
        normalizeDraft({
          ...defaultCodeWorkspace,
          ...draft,
          obstacleKit: "custom-kit",
          obstacles: (draft.obstacles ?? []).map((item) =>
            item.id === entitySelection.id
              ? {
                  ...item,
                  position: transform.position,
                  rotation: transform.rotation,
                  scale: transform.scale,
                }
              : item,
          ),
        }),
      );
    },
    [draft, onDraftChange],
  );

  const handleDeleteSelection = useCallback(() => {
    if (!selection) {
      return;
    }

    if (selection.kind === "spawn") {
      applyDraft({
        ...draft,
        spawnPreset: "custom-spawn",
        spawnNodes: (draft.spawnNodes ?? []).filter((item) => item.id !== selection.id),
      });
    } else {
      applyDraft({
        ...draft,
        obstacleKit: "custom-kit",
        obstacles: (draft.obstacles ?? []).filter((item) => item.id !== selection.id),
      });
    }

    setSelection(null);
  }, [applyDraft, draft, selection]);

  const handleDuplicateSelection = useCallback(() => {
    if (!selection || !selectedItem) {
      return;
    }

    const copy = duplicateEntity(selectedItem);

    if (selection.kind === "spawn") {
      setSelection({ kind: "spawn", id: copy.id });
      applyDraft({
        ...draft,
        spawnPreset: "custom-spawn",
        spawnNodes: [...(draft.spawnNodes ?? []), copy],
      });
      return;
    }

    setSelection({ kind: "obstacle", id: copy.id });
    applyDraft({
      ...draft,
      obstacleKit: "custom-kit",
      obstacles: [...(draft.obstacles ?? []), copy],
    });
  }, [applyDraft, draft, selectedItem, selection]);

  const handleFocusSelection = useCallback(() => {
    if (!selectedItem) {
      return;
    }

    setFocusTarget([selectedItem.position[0], 1.5, selectedItem.position[2]]);
    window.setTimeout(() => setFocusTarget(null), 400);
  }, [selectedItem]);

  const handleInspectorChange = (field, value) => {
    if (!selection || !selectedItem) {
      return;
    }

    const updateEntity = (item) => {
      if (field === "posX") {
        return { ...item, position: [value, 0, item.position[2]] };
      }
      if (field === "posZ") {
        return { ...item, position: [item.position[0], 0, value] };
      }
      if (field === "rotation") {
        return { ...item, rotation: [0, value, 0] };
      }
      return { ...item, [field]: value };
    };

    if (selection.kind === "spawn") {
      applyDraft(
        {
          ...draft,
          spawnPreset: "custom-spawn",
          spawnNodes: (draft.spawnNodes ?? []).map((item) => (item.id === selection.id ? updateEntity(item) : item)),
        },
        { trackHistory: false },
      );
      return;
    }

    applyDraft(
      {
        ...draft,
        obstacleKit: "custom-kit",
        obstacles: (draft.obstacles ?? []).map((item) => (item.id === selection.id ? updateEntity(item) : item)),
      },
      { trackHistory: false },
    );
  };

  useEffect(() => {
    if (tab !== "layout") {
      return undefined;
    }

    const onKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      const ctrl = event.ctrlKey || event.metaKey;

      if (ctrl && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (ctrl && event.key.toLowerCase() === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (ctrl && event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleDuplicateSelection();
        return;
      }

      if (event.key === "Escape") {
        setPlacing(null);
        setSelection(null);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleDeleteSelection();
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "g") {
        setTransformMode("translate");
      } else if (key === "r") {
        setTransformMode("rotate");
      } else if (key === "s") {
        setTransformMode("scale");
      } else if (key === "f") {
        handleFocusSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDeleteSelection, handleDuplicateSelection, handleFocusSelection, handleRedo, handleUndo, tab]);

  const sceneItems = useMemo(
    () => [
      ...(draft.spawnNodes ?? []).map((item) => ({
        id: item.id,
        label: `Spawn ${item.id.slice(-4)}`,
        detail: `x ${item.position[0]} · z ${item.position[2]}`,
        kind: "spawn",
      })),
      ...(draft.obstacles ?? []).map((item) => ({
        id: item.id,
        label: getObstacleType(item.type).label,
        detail: `x ${item.position[0]} · z ${item.position[2]}`,
        kind: "obstacle",
      })),
    ],
    [draft.obstacles, draft.spawnNodes],
  );

  const warnings = useMemo(() => {
    const list = [];

    if (!(draft.spawnNodes ?? []).length) {
      list.push("Sem spawn definido: o mapa vai usar o preset padrão de spawn na hora de jogar.");
    }
    if ((draft.obstacles ?? []).length > 26) {
      list.push("Muitos props na cena. Acima de ~26 objetos o desempenho começa a cair em máquinas fracas.");
    }
    if (draft.goalHits > (draft.duration * 1000) / draft.spawnRate) {
      list.push("O objetivo de acertos é maior do que o número de alvos que dá tempo de nascer. Diminua o objetivo ou o ritmo de spawn.");
    }
    if (draft.targetLifetime < draft.spawnRate) {
      list.push("A janela de vida é menor que o ritmo de spawn: os alvos vão sumir antes do próximo nascer.");
    }
    if (!draft.name?.trim()) {
      list.push("O mapa ainda não tem nome.");
    }

    return list;
  }, [draft]);

  const selectedArena = arenaPrefabs.find((item) => item.id === draft.arenaPrefab) ?? arenaPrefabs[0];
  const selectedSpawnPreset = spawnPresets.find((item) => item.id === draft.spawnPreset);
  const selectedKit = obstacleKits.find((item) => item.id === draft.obstacleKit);
  const selectedScript = scriptAreas.find((script) => script.id === selectedScriptId) ?? scriptAreas[0];
  const visibleAssets = obstacleTypes.filter((item) => item.group === assetGroup);

  const generatedSceneComponent = useMemo(
    () => `import { Canvas } from "@react-three/fiber";

const mapConfig = ${JSON.stringify(
      {
        name: draft.name,
        arenaPrefab: draft.arenaPrefab,
        spawnPreset: draft.spawnPreset,
        obstacleCount: draft.obstacles?.length ?? 0,
        spawnCount: draft.spawnNodes?.length ?? 0,
        scoring: draft.scoring,
        pattern: draft.pattern,
      },
      null,
      2,
    )};

${draft.codeComponent ?? defaultCodeWorkspace.codeComponent}

${draft.codeSystems ?? defaultCodeWorkspace.codeSystems}

${scriptAreas.map((script) => script.code).join("\n\n")}

export function CustomTrainingScene() {
  return (
    <Canvas>
      {/* Use mapConfig, prefabs e scripts acima para ligar a lógica do treino */}
    </Canvas>
  );
}`,
    [draft, scriptAreas],
  );

  return (
    <section className="panel builder builder--workspace">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Map Editor</span>
          <h2>Workspace 3D de criação</h2>
        </div>
        <div className="builder__header-actions">
          <button className="ghost-button" type="button" onClick={handleReset}>
            Resetar
          </button>
          <button className="ghost-button" type="button" onClick={onPreview}>
            Testar sem publicar
          </button>
          <button className="primary-button" type="button" onClick={() => setTab("publish")}>
            Publicar mapa
          </button>
        </div>
      </div>

      <nav className="builder__tabs">
        {BUILDER_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "builder__tab builder__tab--active" : "builder__tab"}
            onClick={() => setTab(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.hint}</span>
          </button>
        ))}
      </nav>

      {tab === "layout" ? (
        <div className="editor-workspace">
          <aside className="editor-sidebar settings-card">
            <div className="editor-panel">
              <span className="eyebrow">Blueprints</span>
              <div className="builder__cards builder__cards--single">
                {builderBlueprints.map((blueprint) => (
                  <button
                    type="button"
                    key={blueprint.id}
                    className={draft.blueprint === blueprint.id ? "prefab-card prefab-card--active" : "prefab-card"}
                    onClick={() => handleBlueprintApply(blueprint)}
                  >
                    <strong>{blueprint.label}</strong>
                    <span>{blueprint.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="editor-panel">
              <span className="eyebrow">Asset Library</span>
              <button
                type="button"
                className={placing === "spawn" ? "asset-button asset-button--active" : "asset-button"}
                onClick={() => setPlacing(placing === "spawn" ? null : "spawn")}
              >
                <span className="asset-button__icon asset-button__icon--spawn" />
                <span>
                  <strong>Spawn Node</strong>
                  <em>Ponto onde o alvo nasce</em>
                </span>
              </button>

              <div className="asset-tabs">
                {obstacleGroups.map((group) => (
                  <button
                    key={group}
                    type="button"
                    className={assetGroup === group ? "asset-tab asset-tab--active" : "asset-tab"}
                    onClick={() => setAssetGroup(group)}
                  >
                    {group}
                  </button>
                ))}
              </div>

              <div className="asset-grid">
                {visibleAssets.map((obstacle) => (
                  <button
                    key={obstacle.id}
                    type="button"
                    className={placing === obstacle.id ? "asset-button asset-button--active" : "asset-button"}
                    onClick={() => setPlacing(placing === obstacle.id ? null : obstacle.id)}
                  >
                    <span className="asset-button__icon" />
                    <span>
                      <strong>{obstacle.label}</strong>
                      <em>Clique no piso</em>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="editor-panel">
              <span className="eyebrow">Arena</span>
              <div className="chip-row">
                {arenaPrefabs.map((arena) => (
                  <button
                    key={arena.id}
                    type="button"
                    className={draft.arenaPrefab === arena.id ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                    onClick={() => handleArenaSelect(arena.id)}
                  >
                    {arena.label}
                  </button>
                ))}
              </div>
              <p>{selectedArena.help}</p>
            </div>

            <div className="editor-panel">
              <span className="eyebrow">Presets rápidos</span>
              <div className="chip-row">
                {spawnPresets.map((spawn) => (
                  <button
                    key={spawn.id}
                    type="button"
                    className={draft.spawnPreset === spawn.id ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                    onClick={() => handleSpawnSelect(spawn.id)}
                  >
                    {spawn.label}
                  </button>
                ))}
              </div>
              <div className="chip-row">
                {obstacleKits.map((kit) => (
                  <button
                    key={kit.id}
                    type="button"
                    className={draft.obstacleKit === kit.id ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                    onClick={() => handleKitSelect(kit.id)}
                  >
                    {kit.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="editor-main settings-card">
            <div className="editor-toolbar">
              <div className="editor-toolbar__group">
                <span className="eyebrow">Transform</span>
                <div className="editor-toolbar__buttons">
                  {transformModes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={transformMode === item.id ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                      onClick={() => setTransformMode(item.id)}
                      title={`Atalho: ${item.key}`}
                    >
                      {item.label} <kbd>{item.key}</kbd>
                    </button>
                  ))}
                </div>
              </div>

              <div className="editor-toolbar__group">
                <span className="eyebrow">Snap</span>
                <div className="chip-row">
                  {EDITOR_SNAP_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      className={snap === step ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                      onClick={() => setSnap(step)}
                    >
                      {step === 0 ? "livre" : `${step}m`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="editor-toolbar__group">
                <span className="eyebrow">Câmera</span>
                <div className="chip-row">
                  {cameraViews.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={view === item.id ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                      onClick={() => setView(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={showGrid ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                    onClick={() => setShowGrid((current) => !current)}
                  >
                    Grade
                  </button>
                </div>
              </div>

              <div className="editor-toolbar__group">
                <span className="eyebrow">Histórico</span>
                <div className="chip-row">
                  <button type="button" className="pattern-chip" onClick={handleUndo} disabled={!historySize.past}>
                    Desfazer <kbd>Ctrl+Z</kbd>
                  </button>
                  <button type="button" className="pattern-chip" onClick={handleRedo} disabled={!historySize.future}>
                    Refazer <kbd>Ctrl+Y</kbd>
                  </button>
                </div>
              </div>
            </div>

            <MapEditorViewport
              draft={draft}
              selection={selection}
              transformMode={transformMode}
              snap={snap}
              placing={placing}
              view={view}
              focusTarget={focusTarget}
              showGrid={showGrid}
              onSelectEntity={setSelection}
              onTransformEntity={handleTransformEntity}
              onPlace={handlePlaceAt}
            />

            <div className="editor-statusbar">
              <span>Arena: {selectedArena.label}</span>
              <span>Spawn: {selectedSpawnPreset ? selectedSpawnPreset.label : "Custom"}</span>
              <span>Kit: {selectedKit ? selectedKit.label : "Custom"}</span>
              <span>{draft.obstacles?.length ?? 0} props</span>
              <span>{draft.spawnNodes?.length ?? 0} spawns</span>
              <span>{placing ? `Colocando: ${placing}` : "Modo seleção"}</span>
            </div>

            {warnings.length ? (
              <ul className="editor-warnings">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <aside className="editor-sidebar settings-card">
            <div className="editor-panel">
              <span className="eyebrow">Hierarquia ({sceneItems.length})</span>
              <div className="hierarchy-list">
                {sceneItems.length ? (
                  sceneItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={selection?.id === item.id ? "hierarchy-item hierarchy-item--active" : "hierarchy-item"}
                      onClick={() => setSelection({ kind: item.kind, id: item.id })}
                    >
                      <span className={`hierarchy-item__dot hierarchy-item__dot--${item.kind}`} />
                      <span>
                        <strong>{item.label}</strong>
                        <em>{item.detail}</em>
                      </span>
                    </button>
                  ))
                ) : (
                  <p>Nenhum objeto na cena. Escolha um asset e clique no piso.</p>
                )}
              </div>
            </div>

            <div className="editor-panel">
              <span className="eyebrow">Inspector</span>
              {selection && selectedItem ? (
                <div className="editor-inspector">
                  <strong>{selection.kind === "spawn" ? "Spawn Node" : getObstacleType(selectedItem.type).label}</strong>

                  <label className="field field--range">
                    <div className="field__row">
                      <span>Posição X</span>
                      <strong>{selectedItem.position?.[0] ?? 0}</strong>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step={snap || 0.5}
                      value={selectedItem.position?.[0] ?? 0}
                      onChange={(event) => handleInspectorChange("posX", Number(event.target.value))}
                    />
                  </label>

                  <label className="field field--range">
                    <div className="field__row">
                      <span>Posição Z</span>
                      <strong>{selectedItem.position?.[2] ?? 0}</strong>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step={snap || 0.5}
                      value={selectedItem.position?.[2] ?? 0}
                      onChange={(event) => handleInspectorChange("posZ", Number(event.target.value))}
                    />
                  </label>

                  {selection.kind === "spawn" ? (
                    <label className="field field--range">
                      <div className="field__row">
                        <span>Altura</span>
                        <strong>{selectedItem.height}m</strong>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="4.5"
                        step="0.1"
                        value={selectedItem.height}
                        onChange={(event) => handleInspectorChange("height", Number(event.target.value))}
                      />
                    </label>
                  ) : (
                    <>
                      <label className="field field--range">
                        <div className="field__row">
                          <span>Rotação</span>
                          <strong>{Math.round(((selectedItem.rotation?.[1] ?? 0) * 180) / Math.PI)}°</strong>
                        </div>
                        <input
                          type="range"
                          min="-3.14"
                          max="3.14"
                          step="0.05"
                          value={selectedItem.rotation?.[1] ?? 0}
                          onChange={(event) => handleInspectorChange("rotation", Number(event.target.value))}
                        />
                      </label>
                      <label className="field field--range">
                        <div className="field__row">
                          <span>Escala</span>
                          <strong>{(selectedItem.scale ?? 1).toFixed(2)}x</strong>
                        </div>
                        <input
                          type="range"
                          min="0.4"
                          max="3"
                          step="0.05"
                          value={selectedItem.scale ?? 1}
                          onChange={(event) => handleInspectorChange("scale", Number(event.target.value))}
                        />
                      </label>
                    </>
                  )}

                  <div className="inspector-actions">
                    <button type="button" className="ghost-button" onClick={handleFocusSelection}>
                      Focar <kbd>F</kbd>
                    </button>
                    <button type="button" className="ghost-button" onClick={handleDuplicateSelection}>
                      Duplicar <kbd>Ctrl+D</kbd>
                    </button>
                    <button type="button" className="delete-button" onClick={handleDeleteSelection}>
                      Remover <kbd>Del</kbd>
                    </button>
                  </div>
                </div>
              ) : (
                <p>Selecione um objeto no viewport ou na hierarquia para editar.</p>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {tab === "gameplay" ? (
        <div className="builder__gameplay">
          <div className="builder__meta-grid">
            <label className="field">
              <span>Nome do mapa</span>
              <input value={draft.name} onChange={(event) => handleChange("name", event.target.value)} placeholder="Nome do mapa" />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea
                rows="3"
                value={draft.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="Qual habilidade esse mapa treina?"
              />
            </label>
          </div>

          {rangeGroups.map((group) => (
            <div key={group.id} className="builder__range-group">
              <span className="eyebrow">{group.label}</span>
              <div className="builder__ranges">
                {group.fields.map((field) => (
                  <label className="field field--range" key={field.key}>
                    <div className="field__row">
                      <span>{field.label}</span>
                      <strong>
                        {draft[field.key]}
                        {field.unit}
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={draft[field.key]}
                      onChange={(event) => handleChange(field.key, Number(event.target.value))}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="builder__range-group">
            <span className="eyebrow">Pontuação</span>
            <div className="builder__scoring">
              {scoringOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={draft.scoring === option.value ? "score-chip score-chip--active" : "score-chip"}
                  onClick={() => handleChange("scoring", option.value)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.help}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="builder__range-group">
            <span className="eyebrow">Padrão de movimento</span>
            <div className="builder__patterns">
              {patternOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={draft.pattern === option.value ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                  onClick={() => handleChange("pattern", option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="builder__range-group">
            <span className="eyebrow">Regras extras</span>
            <div className="builder__patterns">
              <button
                type="button"
                className={draft.requireHeadshot ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                onClick={() => handleChange("requireHeadshot", !draft.requireHeadshot)}
              >
                Somente headshot
              </button>
              {[0, 260, 480, 700].map((delay) => (
                <button
                  key={delay}
                  type="button"
                  className={(draft.activationDelay ?? 0) === delay ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                  onClick={() => handleChange("activationDelay", delay)}
                >
                  {delay ? `Ativa em ${delay}ms` : "Ativa imediato"}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "scripts" ? (
        <div className="code-studio">
          <article className="settings-card code-studio__panel">
            <div className="panel__header">
              <div>
                <span className="eyebrow">Logic Blocks</span>
                <h2>Blocos no estilo engine</h2>
              </div>
            </div>
            <div className="builder__cards builder__cards--single">
              {logicPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={draft.logicPreset === preset.id ? "prefab-card prefab-card--active" : "prefab-card"}
                  onClick={() => handleLogicPresetApply(preset)}
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>
            <p>Esses blocos são o ponto de partida para ligar HUD, regras de spawn e comportamento do treino.</p>
          </article>

          <article className="settings-card code-studio__panel">
            <div className="panel__header">
              <div>
                <span className="eyebrow">Code Studio</span>
                <h2>Scripts React do mapa</h2>
              </div>
              <button type="button" className="ghost-button" onClick={handleAddScriptArea}>
                Criar área de script
              </button>
            </div>
            <label className="field">
              <span>Componente de interface</span>
              <textarea
                rows="10"
                spellCheck="false"
                value={draft.codeComponent ?? defaultCodeWorkspace.codeComponent}
                onChange={(event) => handleCodeFieldChange("codeComponent", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Sistemas e hooks</span>
              <textarea
                rows="12"
                spellCheck="false"
                value={draft.codeSystems ?? defaultCodeWorkspace.codeSystems}
                onChange={(event) => handleCodeFieldChange("codeSystems", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Notas do mapa</span>
              <textarea
                rows="5"
                value={draft.codeNotes ?? defaultCodeWorkspace.codeNotes}
                onChange={(event) => handleCodeFieldChange("codeNotes", event.target.value)}
                placeholder="Checklist de gameplay, eventos, VFX, ideias de balanceamento..."
              />
            </label>

            <div className="script-area-builder">
              <div className="script-area-list">
                {scriptAreas.map((script) => (
                  <button
                    key={script.id}
                    type="button"
                    className={selectedScript?.id === script.id ? "prefab-card prefab-card--active" : "prefab-card"}
                    onClick={() => setSelectedScriptId(script.id)}
                  >
                    <strong>{script.name}</strong>
                    <span>{scriptAreaTypes.find((item) => item.id === script.type)?.label ?? script.type}</span>
                  </button>
                ))}
              </div>

              {selectedScript ? (
                <div className="script-area-editor">
                  <div className="script-area-editor__meta">
                    <label className="field">
                      <span>Nome da área</span>
                      <input
                        value={selectedScript.name}
                        onChange={(event) => handleScriptAreaChange(selectedScript.id, "name", event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Tipo</span>
                      <select
                        value={selectedScript.type}
                        onChange={(event) => handleScriptAreaChange(selectedScript.id, "type", event.target.value)}
                      >
                        {scriptAreaTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>Código do script</span>
                    <textarea
                      rows="12"
                      spellCheck="false"
                      value={selectedScript.code}
                      onChange={(event) => handleScriptAreaChange(selectedScript.id, "code", event.target.value)}
                    />
                  </label>
                  <button type="button" className="delete-button" onClick={() => handleRemoveScriptArea(selectedScript.id)}>
                    Remover área de script
                  </button>
                </div>
              ) : null}
            </div>
          </article>

          <article className="settings-card code-studio__panel">
            <div className="panel__header">
              <div>
                <span className="eyebrow">React Export</span>
                <h2>Base gerada do mapa</h2>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => navigator.clipboard?.writeText(generatedSceneComponent)}
              >
                Copiar
              </button>
            </div>
            <label className="field">
              <span>Snippet inicial</span>
              <textarea rows="22" value={generatedSceneComponent} readOnly spellCheck="false" />
            </label>
            <p>Isso não executa o código sozinho, mas entrega uma base real em React para evoluir o mapa como uma mini scene tool.</p>
          </article>
        </div>
      ) : null}

      {tab === "publish" ? (
        <div className="builder__publish">
          <div className="builder__meta-grid">
            <label className="field">
              <span>Título publicado</span>
              <input
                value={publishForm.title}
                onChange={(event) => handlePublishChange("title", event.target.value)}
                placeholder="Nome que aparecerá para todo mundo"
              />
            </label>
            <label className="field">
              <span>Autor</span>
              <input
                value={publishForm.author}
                onChange={(event) => handlePublishChange("author", event.target.value)}
                placeholder="Seu nome ou nick"
              />
            </label>
            <label className="field">
              <span>Descrição pública</span>
              <textarea
                rows="4"
                value={publishForm.description}
                onChange={(event) => handlePublishChange("description", event.target.value)}
                placeholder="Explique o treino e o estilo do mapa"
              />
            </label>
          </div>

          <div className="creator-grid">
            <article className="settings-card">
              <span className="eyebrow">Resumo do mapa</span>
              <dl className="publish-summary">
                <div>
                  <dt>Arena</dt>
                  <dd>{selectedArena.label}</dd>
                </div>
                <div>
                  <dt>Duração</dt>
                  <dd>{draft.duration}s</dd>
                </div>
                <div>
                  <dt>Objetivo</dt>
                  <dd>{draft.goalHits} hits</dd>
                </div>
                <div>
                  <dt>Padrão</dt>
                  <dd>{draft.pattern}</dd>
                </div>
                <div>
                  <dt>Score</dt>
                  <dd>{draft.scoring}</dd>
                </div>
                <div>
                  <dt>Props</dt>
                  <dd>{draft.obstacles?.length ?? 0}</dd>
                </div>
                <div>
                  <dt>Spawns</dt>
                  <dd>{draft.spawnNodes?.length ?? 0}</dd>
                </div>
                <div>
                  <dt>Headshot</dt>
                  <dd>{draft.requireHeadshot ? "obrigatório" : "livre"}</dd>
                </div>
              </dl>
            </article>

            <article className="settings-card builder__publish-card">
              <span className="eyebrow">Checklist</span>
              {warnings.length ? (
                <ul className="editor-warnings">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p>Tudo certo. O mapa está pronto para ir para a busca da comunidade.</p>
              )}
              <div className="builder__publish-actions">
                <button type="button" className="ghost-button" onClick={onPreview}>
                  Testar antes
                </button>
                <button type="button" className="primary-button" onClick={() => onPublish(publishForm)}>
                  Confirmar publicação
                </button>
              </div>
            </article>
          </div>
        </div>
      ) : null}

      {publishMessage ? <p className="builder__status">{publishMessage}</p> : null}
    </section>
  );
}