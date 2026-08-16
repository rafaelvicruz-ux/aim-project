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
  { value: "precision", label: "Precision", help: "Score focado em acerto limpo e estável." },
  { value: "combo", label: "Combo", help: "Valoriza sequências longas sem perder ritmo." },
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
  { key: "simultaneousTargets", label: "Inimigos simultâneos", min: 1, max: 6, step: 1, unit: "" },
  { key: "depthLayers", label: "Camadas 3D", min: 1, max: 5, step: 1, unit: " layers" },
];

const transformModes = ["translate", "rotate", "scale"];

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

export function TrainingBuilder({ draft, onDraftChange, onSave, canSave, saveMessage }) {
  const [selection, setSelection] = useState(null);
  const [transformMode, setTransformMode] = useState("translate");

  const applyDraft = (nextDraft) => {
    onDraftChange(normalizeDraft(nextDraft));
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
    onDraftChange(customTemplate);
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
                position: [transform.position[0], 0, transform.position[2]],
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
              position: [transform.position[0], 0, transform.position[2]],
              rotation: [0, transform.rotation[1], 0],
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
        spawnNodes: (draft.spawnNodes ?? []).map((item) =>
          item.id === selection.id ? { ...item, height: value } : item,
        ),
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

        return { ...item, [field]: value };
      }),
    });
  };

  const selectedArena = arenaPrefabs.find((item) => item.id === draft.arenaPrefab) ?? arenaPrefabs[0];
  const selectedSpawnPreset = spawnPresets.find((item) => item.id === draft.spawnPreset);
  const selectedKit = obstacleKits.find((item) => item.id === draft.obstacleKit);

  return (
    <section className="panel builder builder--workspace">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Map Editor</span>
          <h2>Workspace 3D de criação</h2>
        </div>
        <div className="builder__header-actions">
          <button className="ghost-button" onClick={handleReset}>
            Resetar
          </button>
          <button className="primary-button" onClick={onSave} disabled={!canSave}>
            {canSave ? "Salvar mapa" : "Entre para salvar"}
          </button>
        </div>
      </div>

      <div className="builder__meta-grid">
        <label className="field">
          <span>Nome do mapa</span>
          <input value={draft.name} onChange={(event) => handleChange("name", event.target.value)} placeholder="Nome do mapa" />
        </label>
        <label className="field">
          <span>Descrição</span>
          <textarea rows="3" value={draft.description} onChange={(event) => handleChange("description", event.target.value)} placeholder="Qual habilidade esse mapa treina?" />
        </label>
      </div>

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
                {selection.kind === "spawn" ? (
                  <label className="field">
                    <span>Altura</span>
                    <input type="range" min="1" max="4" step="0.1" value={selectedItem.height} onChange={(event) => handleInspectorChange("height", Number(event.target.value))} />
                  </label>
                ) : (
                  <>
                    <label className="field">
                      <span>Rotação</span>
                      <input type="range" min="-3.14" max="3.14" step="0.05" value={selectedItem.rotation?.[1] ?? 0} onChange={(event) => handleInspectorChange("rotation", Number(event.target.value))} />
                    </label>
                    <label className="field">
                      <span>Escala</span>
                      <input type="range" min="0.5" max="2.5" step="0.05" value={selectedItem.scale ?? 1} onChange={(event) => handleInspectorChange("scale", Number(event.target.value))} />
                    </label>
                  </>
                )}
                <button type="button" className="delete-button" onClick={handleDeleteSelection}>
                  Remover seleção
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

      {saveMessage ? <p className="builder__status">{saveMessage}</p> : null}
    </section>
  );
}
