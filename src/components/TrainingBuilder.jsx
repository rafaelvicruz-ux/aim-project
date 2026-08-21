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
  const [publishForm, setPublishForm] = useState({
    title: draft.name ?? "Meu mapa 3D",
    author: "",
    description: draft.description ?? "",
  });

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
    setPublishOpen(false);
    onDraftChange(customTemplate);
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

      {publishMessage ? <p className="builder__status">{publishMessage}</p> : null}
    </section>
  );
}
