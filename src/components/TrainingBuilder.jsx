import { useMemo, useState } from "react";
import { MapEditorViewport } from "./MapEditorViewport";
import {
  arenaPrefabs,
  buildObstacleLayout,
  builderBlueprints,
  createObstacleFromGrid,
  createSpawnNodeFromGrid,
  getObstacleKit,
  getObstacleType,
  getSpawnPreset,
  obstacleKits,
  obstacleTypes,
  spawnPresets,
} from "../data/gameConfig";
import { customTemplate, patternOptions } from "../data/presets";

const scoringOptions = [
  { value: "precision", label: "Precision", help: "Score focado em acerto limpo e estavel." },
  { value: "combo", label: "Combo", help: "Valoriza sequencias longas sem perder ritmo." },
  { value: "tracking", label: "Tracking", help: "Premia leitura de alvo com movimento constante." },
];

const rangeFields = [
  { key: "duration", label: "Tempo limite", min: 15, max: 180, step: 5, unit: "s" },
  { key: "goalHits", label: "Acertos para concluir", min: 5, max: 120, step: 1, unit: " hits" },
  { key: "targetSize", label: "Escala do inimigo", min: 18, max: 90, step: 2, unit: "%" },
  { key: "spawnRate", label: "Ritmo de spawn", min: 180, max: 1800, step: 20, unit: "ms" },
  { key: "targetLifetime", label: "Janela de vida", min: 400, max: 5000, step: 50, unit: "ms" },
  { key: "moveSpeed", label: "Velocidade frontal", min: 0, max: 260, step: 10, unit: "px/s" },
  { key: "strafeIntensity", label: "Strafe lateral", min: 0, max: 180, step: 5, unit: "px/s" },
  { key: "verticalDrift", label: "Deriva vertical", min: 0, max: 140, step: 5, unit: "px/s" },
  { key: "simultaneousTargets", label: "Inimigos simultaneos", min: 1, max: 6, step: 1, unit: "" },
  { key: "depthLayers", label: "Camadas 3D", min: 1, max: 5, step: 1, unit: " layers" },
];

const transformModes = ["translate", "rotate", "scale"];
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
    description: "Cria um ciclo de fase especial com alvo elite, pausas e mudancas visuais.",
    component: `export function BossWaveBanner({ phase, pressure }) {
  return (
    <div className="boss-wave-banner">
      <strong>Fase {phase}</strong>
      <span>Pressao {pressure}%</span>
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
  codeNotes: "Use esta area para scripts React, HUD customizada e regras do mapa.",
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
    id: `script-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
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
  const [selection, setSelection] = useState(null);
  const [transformMode, setTransformMode] = useState("translate");
  const [publishOpen, setPublishOpen] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState(draft.scriptAreas?.[0]?.id ?? defaultCodeWorkspace.scriptAreas[0].id);
  const [publishForm, setPublishForm] = useState({
    title: draft.name ?? "Meu mapa 3D",
    author: "",
    description: draft.description ?? "",
  });

  const applyDraft = (nextDraft) => {
    onDraftChange(
      normalizeDraft({
        ...defaultCodeWorkspace,
        ...nextDraft,
      }),
    );
  };

  const handleChange = (key, value) => {
    applyDraft({
      ...draft,
      [key]: value,
    });
  };

  const handleReset = () => {
    setSelection(null);
    setTransformMode("translate");
    setPublishOpen(false);
    onDraftChange({
      ...customTemplate,
      ...defaultCodeWorkspace,
    });
  };

  const handleOpenPublish = () => {
    setPublishForm({
      title: draft.name?.trim() || "Meu mapa 3D",
      author: publishForm.author,
      description: draft.description?.trim() || "Mapa criado pela comunidade.",
    });
    setPublishOpen((current) => !current);
  };

  const handlePublishChange = (field, value) => {
    setPublishForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePublishSubmit = () => {
    onPublish(publishForm);
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
    applyDraft({
      ...draft,
      [field]: value,
    });
  };

  const handleAddScriptArea = () => {
    const nextScript = createScriptArea();
    setSelectedScriptId(nextScript.id);
    applyDraft({
      ...draft,
      scriptAreas: [...(draft.scriptAreas ?? defaultCodeWorkspace.scriptAreas), nextScript],
    });
  };

  const handleScriptAreaChange = (scriptId, field, value) => {
    applyDraft({
      ...draft,
      scriptAreas: (draft.scriptAreas ?? defaultCodeWorkspace.scriptAreas).map((script) =>
        script.id === scriptId ? { ...script, [field]: value } : script,
      ),
    });
  };

  const handleRemoveScriptArea = (scriptId) => {
    const nextScripts = (draft.scriptAreas ?? defaultCodeWorkspace.scriptAreas).filter((script) => script.id !== scriptId);
    const fallbackScripts = nextScripts.length ? nextScripts : [createScriptArea()];
    setSelectedScriptId(fallbackScripts[0].id);
    applyDraft({
      ...draft,
      scriptAreas: fallbackScripts,
    });
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
    applyDraft({
      ...draft,
      arenaPrefab,
      obstacles: (draft.obstacles ?? []).map((item) => ({ ...item })),
    });
  };

  const handleSpawnSelect = (spawnPreset) => {
    setSelection(null);
    applyDraft({
      ...draft,
      spawnPreset,
      spawnNodes: createPresetSpawnNodes(spawnPreset),
    });
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

  const addObstacle = (type) => {
    const nextObstacle = createObstacleFromGrid(type, 4, 4);
    setSelection({ kind: "obstacle", id: nextObstacle.id });
    applyDraft({
      ...draft,
      obstacleKit: "custom-kit",
      obstacles: [...(draft.obstacles ?? []), nextObstacle],
    });
  };

  const addSpawnNode = () => {
    const nextSpawn = createSpawnNodeFromGrid(4, 4);
    setSelection({ kind: "spawn", id: nextSpawn.id });
    applyDraft({
      ...draft,
      spawnPreset: "custom-spawn",
      spawnNodes: [...(draft.spawnNodes ?? []), nextSpawn],
    });
  };

  const sceneItems = useMemo(
    () => [
      ...(draft.spawnNodes ?? []).map((item) => ({ id: item.id, label: `Spawn ${item.id.slice(-4)}`, kind: "spawn" })),
      ...(draft.obstacles ?? []).map((item) => ({ id: item.id, label: getObstacleType(item.type).label, kind: "obstacle" })),
    ],
    [draft.obstacles, draft.spawnNodes],
  );

  const selectedItem = selection
    ? selection.kind === "spawn"
      ? (draft.spawnNodes ?? []).find((item) => item.id === selection.id)
      : (draft.obstacles ?? []).find((item) => item.id === selection.id)
    : null;

  const handleTransformEntity = (entitySelection, transform) => {
    if (entitySelection.kind === "spawn") {
      applyDraft({
        ...draft,
        spawnPreset: "custom-spawn",
        spawnNodes: (draft.spawnNodes ?? []).map((item) =>
          item.id === entitySelection.id
            ? {
                ...item,
                position: [Number(transform.position[0].toFixed(2)), 0, Number(transform.position[2].toFixed(2))],
                height: Number(transform.position[1].toFixed(2)),
              }
            : item,
        ),
      });
      return;
    }

    applyDraft({
      ...draft,
      obstacleKit: "custom-kit",
      obstacles: (draft.obstacles ?? []).map((item) =>
        item.id === entitySelection.id
          ? {
              ...item,
              position: [Number(transform.position[0].toFixed(2)), 0, Number(transform.position[2].toFixed(2))],
              rotation: [0, Number(transform.rotation[1].toFixed(2)), 0],
              scale: Number(transform.scale.toFixed(2)),
            }
          : item,
      ),
    });
  };

  const handleDeleteSelection = () => {
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
  };

  const handleInspectorChange = (field, value) => {
    if (!selection || !selectedItem) {
      return;
    }

    if (selection.kind === "spawn") {
      applyDraft({
        ...draft,
        spawnPreset: "custom-spawn",
        spawnNodes: (draft.spawnNodes ?? []).map((item) => {
          if (item.id !== selection.id) {
            return item;
          }

          if (field === "posX") {
            return { ...item, position: [value, 0, item.position[2]] };
          }

          if (field === "posZ") {
            return { ...item, position: [item.position[0], 0, value] };
          }

          return { ...item, height: value };
        }),
      });
      return;
    }

    applyDraft({
      ...draft,
      obstacleKit: "custom-kit",
      obstacles: (draft.obstacles ?? []).map((item) => {
        if (item.id !== selection.id) {
          return item;
        }

        if (field === "rotation") {
          return { ...item, rotation: [0, value, 0] };
        }

        if (field === "posX") {
          return { ...item, position: [value, 0, item.position[2]] };
        }

        if (field === "posZ") {
          return { ...item, position: [item.position[0], 0, value] };
        }

        return { ...item, [field]: value };
      }),
    });
  };

  const selectedArena = arenaPrefabs.find((item) => item.id === draft.arenaPrefab) ?? arenaPrefabs[0];
  const selectedSpawnPreset = spawnPresets.find((item) => item.id === draft.spawnPreset);
  const selectedKit = obstacleKits.find((item) => item.id === draft.obstacleKit);
  const scriptAreas = draft.scriptAreas ?? defaultCodeWorkspace.scriptAreas;
  const selectedScript =
    scriptAreas.find((script) => script.id === selectedScriptId) ??
    scriptAreas[0] ??
    defaultCodeWorkspace.scriptAreas[0];
  const generatedSceneComponent = useMemo(() => `import { Canvas } from "@react-three/fiber";

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
      {/* Use mapConfig, prefabs e scripts acima para ligar a logica do treino */}
    </Canvas>
  );
}`, [draft, scriptAreas]);

  return (
    <section className="panel builder builder--workspace">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Map Editor</span>
          <h2>Workspace 3D de criacao</h2>
        </div>
        <div className="builder__header-actions">
          <button className="ghost-button" onClick={handleReset}>
            Resetar
          </button>
          <button className="ghost-button" onClick={onPreview}>
            Testar sem publicar
          </button>
          <button className="primary-button" onClick={handleOpenPublish}>
            {publishOpen ? "Fechar publicacao" : "Publicar mapa"}
          </button>
        </div>
      </div>

      <div className="builder__meta-grid">
        <label className="field">
          <span>Nome do mapa</span>
          <input value={draft.name} onChange={(event) => handleChange("name", event.target.value)} placeholder="Nome do mapa" />
        </label>
        <label className="field">
          <span>Descricao</span>
          <textarea rows="3" value={draft.description} onChange={(event) => handleChange("description", event.target.value)} placeholder="Qual habilidade esse mapa treina?" />
        </label>
      </div>

      {publishOpen ? (
        <div className="builder__meta-grid">
          <label className="field">
            <span>Titulo publicado</span>
            <input
              value={publishForm.title}
              onChange={(event) => handlePublishChange("title", event.target.value)}
              placeholder="Nome que aparecera para todo mundo"
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
            <span>Descricao publica</span>
            <textarea
              rows="3"
              value={publishForm.description}
              onChange={(event) => handlePublishChange("description", event.target.value)}
              placeholder="Explique o treino e o estilo do mapa"
            />
          </label>
          <div className="settings-card builder__publish-card">
            <span className="eyebrow">Fluxo</span>
            <strong>Teste antes, publique depois</strong>
            <p>Esse envio vai deixar o mapa visivel para qualquer pessoa na aba de pesquisa.</p>
            <button type="button" className="primary-button" onClick={handlePublishSubmit}>
              Confirmar publicacao
            </button>
          </div>
        </div>
      ) : null}

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
            <div className="builder__cards builder__cards--single">
              <button type="button" className="pattern-chip" onClick={addSpawnNode}>Adicionar Spawn</button>
              {obstacleTypes.map((obstacle) => (
                <button key={obstacle.id} type="button" className="pattern-chip" onClick={() => addObstacle(obstacle.id)}>
                  {obstacle.label}
                </button>
              ))}
            </div>
          </div>

          <div className="editor-panel">
            <span className="eyebrow">Presets</span>
            <div className="builder__cards builder__cards--single">
              {arenaPrefabs.map((arena) => (
                <button key={arena.id} type="button" className={draft.arenaPrefab === arena.id ? "pattern-chip pattern-chip--active" : "pattern-chip"} onClick={() => handleArenaSelect(arena.id)}>
                  {arena.label}
                </button>
              ))}
              {spawnPresets.map((spawn) => (
                <button key={spawn.id} type="button" className={draft.spawnPreset === spawn.id ? "pattern-chip pattern-chip--active" : "pattern-chip"} onClick={() => handleSpawnSelect(spawn.id)}>
                  {spawn.label}
                </button>
              ))}
              {obstacleKits.map((kit) => (
                <button key={kit.id} type="button" className={draft.obstacleKit === kit.id ? "pattern-chip pattern-chip--active" : "pattern-chip"} onClick={() => handleKitSelect(kit.id)}>
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
                {transformModes.map((mode) => (
                  <button key={mode} type="button" className={transformMode === mode ? "pattern-chip pattern-chip--active" : "pattern-chip"} onClick={() => setTransformMode(mode)}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="editor-toolbar__group">
              <span className="eyebrow">Scene</span>
              <strong>{selectedArena.label}</strong>
            </div>
          </div>

          <MapEditorViewport
            draft={draft}
            selection={selection}
            transformMode={transformMode}
            onSelectEntity={setSelection}
            onTransformEntity={handleTransformEntity}
          />

          <div className="editor-statusbar">
            <span>Spawn preset: {selectedSpawnPreset ? selectedSpawnPreset.label : "Custom Spawn"}</span>
            <span>Obstacle kit: {selectedKit ? selectedKit.label : "Custom Kit"}</span>
            <span>{draft.obstacles?.length ?? 0} props</span>
            <span>{draft.spawnNodes?.length ?? 0} spawns</span>
          </div>
        </section>

        <aside className="editor-sidebar settings-card">
          <div className="editor-panel">
            <span className="eyebrow">Scene Hierarchy</span>
            <div className="builder__cards builder__cards--single">
              {sceneItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={selection?.id === item.id ? "prefab-card prefab-card--active" : "prefab-card"}
                  onClick={() => setSelection({ kind: item.kind, id: item.id })}
                >
                  <strong>{item.label}</strong>
                  <span>{item.kind === "spawn" ? "Spawn Node" : "Scene Prop"}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="editor-panel">
            <span className="eyebrow">Inspector</span>
            {selection && selectedItem ? (
              <div className="editor-inspector">
                <strong>{selection.kind === "spawn" ? "Spawn Node" : getObstacleType(selectedItem.type).label}</strong>
                <label className="field">
                  <span>Posicao X</span>
                  <input type="range" min="-30" max="30" step="1" value={selectedItem.position?.[0] ?? 0} onChange={(event) => handleInspectorChange("posX", Number(event.target.value))} />
                </label>
                <label className="field">
                  <span>Posicao Z</span>
                  <input type="range" min="-30" max="30" step="1" value={selectedItem.position?.[2] ?? 0} onChange={(event) => handleInspectorChange("posZ", Number(event.target.value))} />
                </label>
                {selection.kind === "spawn" ? (
                  <label className="field">
                    <span>Altura</span>
                    <input type="range" min="1" max="4" step="0.1" value={selectedItem.height} onChange={(event) => handleInspectorChange("height", Number(event.target.value))} />
                  </label>
                ) : (
                  <>
                    <label className="field">
                      <span>Rotacao</span>
                      <input type="range" min="-3.14" max="3.14" step="0.05" value={selectedItem.rotation?.[1] ?? 0} onChange={(event) => handleInspectorChange("rotation", Number(event.target.value))} />
                    </label>
                    <label className="field">
                      <span>Escala</span>
                      <input type="range" min="0.5" max="2.5" step="0.05" value={selectedItem.scale ?? 1} onChange={(event) => handleInspectorChange("scale", Number(event.target.value))} />
                    </label>
                  </>
                )}
                <button type="button" className="delete-button" onClick={handleDeleteSelection}>
                  Remover selecao
                </button>
              </div>
            ) : (
              <p>Selecione um objeto ou spawn no viewport para editar.</p>
            )}
          </div>
        </aside>
      </div>

      <div className="builder__ranges">
        {rangeFields.map((field) => (
          <label className="field field--range" key={field.key}>
            <div className="field__row">
              <span>{field.label}</span>
              <strong>{draft[field.key]}{field.unit}</strong>
            </div>
            <input type="range" min={field.min} max={field.max} step={field.step} value={draft[field.key]} onChange={(event) => handleChange(field.key, Number(event.target.value))} />
          </label>
        ))}
      </div>

      <div className="builder__scoring">
        {scoringOptions.map((option) => (
          <button type="button" key={option.value} className={draft.scoring === option.value ? "score-chip score-chip--active" : "score-chip"} onClick={() => handleChange("scoring", option.value)}>
            <strong>{option.label}</strong>
            <span>{option.help}</span>
          </button>
        ))}
      </div>

      <div className="builder__patterns">
        {patternOptions.map((option) => (
          <button type="button" key={option.value} className={draft.pattern === option.value ? "pattern-chip pattern-chip--active" : "pattern-chip"} onClick={() => handleChange("pattern", option.value)}>
            {option.label}
          </button>
        ))}
      </div>

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
          <p>Esses blocos funcionam como um ponto de partida para ligar HUD, regras de spawn e comportamento do treino.</p>
        </article>

        <article className="settings-card code-studio__panel">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Code Studio</span>
              <h2>Scripts React do mapa</h2>
            </div>
            <button type="button" className="ghost-button" onClick={handleAddScriptArea}>
              Criar area de script
            </button>
          </div>
          <label className="field">
            <span>Componente de interface</span>
            <textarea
              rows="10"
              value={draft.codeComponent ?? defaultCodeWorkspace.codeComponent}
              onChange={(event) => handleCodeFieldChange("codeComponent", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Sistemas e hooks</span>
            <textarea
              rows="12"
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
                    <span>Nome da area</span>
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
                  <span>Codigo do script</span>
                  <textarea
                    rows="12"
                    value={selectedScript.code}
                    onChange={(event) => handleScriptAreaChange(selectedScript.id, "code", event.target.value)}
                  />
                </label>
                <button type="button" className="delete-button" onClick={() => handleRemoveScriptArea(selectedScript.id)}>
                  Remover area de script
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
          </div>
          <label className="field">
            <span>Snippet inicial</span>
            <textarea rows="22" value={generatedSceneComponent} readOnly />
          </label>
          <p>Isso nao executa o codigo sozinho ainda, mas te entrega uma base real em React para evoluir o mapa como uma mini scene tool.</p>
        </article>
      </div>

      {publishMessage ? <p className="builder__status">{publishMessage}</p> : null}
    </section>
  );
}
