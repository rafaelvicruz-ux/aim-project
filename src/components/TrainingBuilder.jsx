import { useMemo, useState } from "react";
import {
  EDITOR_GRID_SIZE,
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
  worldToGrid,
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

const editorTools = [
  { id: "select", label: "Selecionar", short: "S" },
  { id: "spawn", label: "Spawn", short: "SP" },
  ...obstacleTypes.map((item) => ({ id: item.id, label: item.label, short: item.short })),
];

const editorCells = Array.from({ length: EDITOR_GRID_SIZE * EDITOR_GRID_SIZE }, (_, index) => ({
  x: index % EDITOR_GRID_SIZE,
  y: Math.floor(index / EDITOR_GRID_SIZE),
}));

function cloneDraft(nextDraft) {
  return {
    ...nextDraft,
    obstacleSet: [...new Set((nextDraft.obstacles ?? []).map((item) => item.type))],
  };
}

export function TrainingBuilder({ draft, onDraftChange, onSave, canSave, saveMessage }) {
  const [activeTool, setActiveTool] = useState("select");
  const [selectedEntity, setSelectedEntity] = useState(null);

  const handleChange = (key, value) => {
    onDraftChange({
      ...draft,
      [key]: value,
    });
  };

  const handleReset = () => {
    setSelectedEntity(null);
    setActiveTool("select");
    onDraftChange(customTemplate);
  };

  const obstacleByCell = useMemo(() => {
    const map = new Map();

    (draft.obstacles ?? []).forEach((item) => {
      const cell = worldToGrid(item.position);
      map.set(`${cell.x}-${cell.y}`, item);
    });

    return map;
  }, [draft.obstacles]);

  const spawnByCell = useMemo(() => {
    const map = new Map();

    (draft.spawnNodes ?? []).forEach((item) => {
      const cell = worldToGrid(item.position);
      map.set(`${cell.x}-${cell.y}`, item);
    });

    return map;
  }, [draft.spawnNodes]);

  const findSelection = () => {
    if (!selectedEntity) {
      return null;
    }

    if (selectedEntity.kind === "spawn") {
      return (draft.spawnNodes ?? []).find((item) => item.id === selectedEntity.id) ?? null;
    }

    return (draft.obstacles ?? []).find((item) => item.id === selectedEntity.id) ?? null;
  };

  const currentSelection = findSelection();

  const applyDraft = (nextDraft) => {
    onDraftChange(cloneDraft(nextDraft));
  };

  const handleBlueprintApply = (blueprint) => {
    const obstacleSet = getObstacleKit(blueprint.obstacleKit).obstacleSet;
    setSelectedEntity(null);
    applyDraft({
      ...draft,
      ...blueprint,
      obstacleSet,
      obstacles: buildObstacleLayout(obstacleSet, blueprint.arenaPrefab),
      spawnNodes: getSpawnPreset(blueprint.spawnPreset).anchors.map((anchor, index) => ({
        id: `${blueprint.spawnPreset}-spawn-${index}`,
        position: [anchor[0], 0, anchor[2]],
        height: Number((((getSpawnPreset(blueprint.spawnPreset).heightRange[0] + getSpawnPreset(blueprint.spawnPreset).heightRange[1]) / 2).toFixed(1))),
      })),
    });
  };

  const handleArenaSelect = (arenaPrefab) => {
    applyDraft({
      ...draft,
      arenaPrefab,
    });
  };

  const handleSpawnSelect = (spawnPreset) => {
    const preset = getSpawnPreset(spawnPreset);
    setSelectedEntity(null);
    applyDraft({
      ...draft,
      spawnPreset,
      spawnNodes: preset.anchors.map((anchor, index) => ({
        id: `${spawnPreset}-spawn-${index}`,
        position: [anchor[0], 0, anchor[2]],
        height: Number((((preset.heightRange[0] + preset.heightRange[1]) / 2).toFixed(1))),
      })),
    });
  };

  const handleKitSelect = (obstacleKit) => {
    const obstacleSet = getObstacleKit(obstacleKit).obstacleSet;
    setSelectedEntity(null);
    applyDraft({
      ...draft,
      obstacleKit,
      obstacleSet,
      obstacles: buildObstacleLayout(obstacleSet, draft.arenaPrefab),
    });
  };

  const handleCellClick = (cellX, cellY) => {
    const obstacle = obstacleByCell.get(`${cellX}-${cellY}`);
    const spawn = spawnByCell.get(`${cellX}-${cellY}`);

    if (activeTool === "select") {
      if (spawn) {
        setSelectedEntity({ kind: "spawn", id: spawn.id });
        return;
      }

      if (obstacle) {
        setSelectedEntity({ kind: "obstacle", id: obstacle.id });
        return;
      }

      setSelectedEntity(null);
      return;
    }

    if (activeTool === "spawn") {
      const nextSpawnNodes = (draft.spawnNodes ?? []).filter((item) => item.id !== spawn?.id);
      const nextNode = createSpawnNodeFromGrid(cellX, cellY);
      const nextDraft = {
        ...draft,
        spawnPreset: "custom-spawn",
        spawnNodes: [...nextSpawnNodes.filter((item) => worldToGrid(item.position).x !== cellX || worldToGrid(item.position).y !== cellY), nextNode],
      };
      setSelectedEntity({ kind: "spawn", id: nextNode.id });
      applyDraft(nextDraft);
      return;
    }

    const nextObstacle = createObstacleFromGrid(activeTool, cellX, cellY);
    const nextObstacles = (draft.obstacles ?? []).filter((item) => item.id !== obstacle?.id);
    const nextDraft = {
      ...draft,
      obstacleKit: "custom-kit",
      obstacles: [...nextObstacles.filter((item) => {
        const cell = worldToGrid(item.position);
        return cell.x !== cellX || cell.y !== cellY;
      }), nextObstacle],
    };

    setSelectedEntity({ kind: "obstacle", id: nextObstacle.id });
    applyDraft(nextDraft);
  };

  const handleSelectionChange = (field, value) => {
    if (!currentSelection || !selectedEntity) {
      return;
    }

    if (selectedEntity.kind === "spawn") {
      const nextSpawnNodes = (draft.spawnNodes ?? []).map((item) =>
        item.id === currentSelection.id ? { ...item, [field]: value } : item,
      );
      applyDraft({
        ...draft,
        spawnPreset: "custom-spawn",
        spawnNodes: nextSpawnNodes,
      });
      return;
    }

    const nextObstacles = (draft.obstacles ?? []).map((item) => {
      if (item.id !== currentSelection.id) {
        return item;
      }

      if (field === "rotationY") {
        return { ...item, rotation: [0, value, 0] };
      }

      return { ...item, [field]: value };
    });

    applyDraft({
      ...draft,
      obstacleKit: "custom-kit",
      obstacles: nextObstacles,
    });
  };

  const handleDeleteSelection = () => {
    if (!selectedEntity || !currentSelection) {
      return;
    }

    if (selectedEntity.kind === "spawn") {
      applyDraft({
        ...draft,
        spawnPreset: "custom-spawn",
        spawnNodes: (draft.spawnNodes ?? []).filter((item) => item.id !== currentSelection.id),
      });
    } else {
      applyDraft({
        ...draft,
        obstacleKit: "custom-kit",
        obstacles: (draft.obstacles ?? []).filter((item) => item.id !== currentSelection.id),
      });
    }

    setSelectedEntity(null);
  };

  const selectedArena = arenaPrefabs.find((item) => item.id === draft.arenaPrefab) ?? arenaPrefabs[0];
  const selectedSpawn = spawnPresets.find((item) => item.id === draft.spawnPreset);
  const selectedKit = obstacleKits.find((item) => item.id === draft.obstacleKit);
  const selectedObstacleType = currentSelection && selectedEntity?.kind === "obstacle"
    ? getObstacleType(currentSelection.type)
    : null;

  return (
    <section className="panel builder">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Map Builder</span>
          <h2>Editor visual estilo level editor</h2>
        </div>
        <button className="ghost-button" onClick={handleReset}>
          Resetar
        </button>
      </div>

      <div className="builder__grid">
        <label className="field">
          <span>Nome do mapa</span>
          <input
            value={draft.name}
            onChange={(event) => handleChange("name", event.target.value)}
            placeholder="Nome do mapa"
          />
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

        <section className="builder__section">
          <div className="builder__section-head">
            <span className="eyebrow">Blueprints</span>
            <p>Escolha um mapa base pronto e depois refine como se fosse uma cena com peças configuráveis.</p>
          </div>
          <div className="builder__cards builder__cards--wide">
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
        </section>

        <section className="builder__section">
          <div className="builder__section-head">
            <span className="eyebrow">Viewport Editor</span>
            <p>Selecione uma ferramenta, clique na grade e monte spawns e props como um mini editor de cena.</p>
          </div>

          <div className="builder__editor-layout">
            <div className="builder__toolbox settings-card">
              <span className="eyebrow">Ferramentas</span>
              <div className="builder__tool-list">
                {editorTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={activeTool === tool.id ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                    onClick={() => setActiveTool(tool.id)}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
              <p>
                Ferramenta ativa: <strong>{editorTools.find((tool) => tool.id === activeTool)?.label}</strong>
              </p>
            </div>

            <div className="builder__viewport settings-card">
              <div className="builder__viewport-head">
                <span className="eyebrow">Scene Grid</span>
                <strong>{draft.obstacles?.length ?? 0} props / {draft.spawnNodes?.length ?? 0} spawns</strong>
              </div>
              <div className="builder__viewport-grid">
                {editorCells.map((cell) => {
                  const obstacle = obstacleByCell.get(`${cell.x}-${cell.y}`);
                  const spawn = spawnByCell.get(`${cell.x}-${cell.y}`);
                  const isSelected =
                    (selectedEntity?.kind === "spawn" && spawn?.id === selectedEntity.id) ||
                    (selectedEntity?.kind === "obstacle" && obstacle?.id === selectedEntity.id);

                  return (
                    <button
                      type="button"
                      key={`${cell.x}-${cell.y}`}
                      className={isSelected ? "builder__cell builder__cell--selected" : "builder__cell"}
                      onClick={() => handleCellClick(cell.x, cell.y)}
                    >
                      {spawn ? <span className="builder__cell-token builder__cell-token--spawn">SP</span> : null}
                      {!spawn && obstacle ? (
                        <span className="builder__cell-token">{getObstacleType(obstacle.type).short}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="builder__inspector settings-card">
              <span className="eyebrow">Inspector</span>
              {currentSelection ? (
                <>
                  <strong>
                    {selectedEntity?.kind === "spawn" ? "Spawn Point" : selectedObstacleType?.label}
                  </strong>
                  {selectedEntity?.kind === "spawn" ? (
                    <label className="field">
                      <span>Altura do spawn</span>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="0.1"
                        value={currentSelection.height}
                        onChange={(event) => handleSelectionChange("height", Number(event.target.value))}
                      />
                    </label>
                  ) : (
                    <>
                      <label className="field">
                        <span>Rotação Y</span>
                        <input
                          type="range"
                          min="-3.14"
                          max="3.14"
                          step="0.1"
                          value={currentSelection.rotation?.[1] ?? 0}
                          onChange={(event) => handleSelectionChange("rotationY", Number(event.target.value))}
                        />
                      </label>
                      <label className="field">
                        <span>Escala</span>
                        <input
                          type="range"
                          min="0.6"
                          max="2"
                          step="0.05"
                          value={currentSelection.scale ?? 1}
                          onChange={(event) => handleSelectionChange("scale", Number(event.target.value))}
                        />
                      </label>
                    </>
                  )}
                  <button className="delete-button" type="button" onClick={handleDeleteSelection}>
                    Remover seleção
                  </button>
                </>
              ) : (
                <p>Selecione um spawn ou prop na grade para editar rotação, escala ou altura.</p>
              )}
            </div>
          </div>
        </section>

        <section className="builder__section">
          <div className="builder__section-head">
            <span className="eyebrow">Arena Base</span>
            <p>Troca o layout macro do mapa, a leitura visual e a atmosfera do treino.</p>
          </div>
          <div className="builder__cards">
            {arenaPrefabs.map((arena) => (
              <button
                type="button"
                key={arena.id}
                className={draft.arenaPrefab === arena.id ? "prefab-card prefab-card--active" : "prefab-card"}
                onClick={() => handleArenaSelect(arena.id)}
              >
                <strong>{arena.label}</strong>
                <span>{arena.help}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="builder__section">
          <div className="builder__section-head">
            <span className="eyebrow">Spawn System</span>
            <p>Use presets para começar rápido ou edite os pontos manualmente no viewport.</p>
          </div>
          <div className="builder__cards">
            {spawnPresets.map((spawn) => (
              <button
                type="button"
                key={spawn.id}
                className={draft.spawnPreset === spawn.id ? "prefab-card prefab-card--active" : "prefab-card"}
                onClick={() => handleSpawnSelect(spawn.id)}
              >
                <strong>{spawn.label}</strong>
                <span>{spawn.help}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="builder__section">
          <div className="builder__section-head">
            <span className="eyebrow">Obstacle Kit</span>
            <p>Comece com kits prontos e depois refine tudo manualmente no viewport.</p>
          </div>
          <div className="builder__cards">
            {obstacleKits.map((kit) => (
              <button
                type="button"
                key={kit.id}
                className={draft.obstacleKit === kit.id ? "prefab-card prefab-card--active" : "prefab-card"}
                onClick={() => handleKitSelect(kit.id)}
              >
                <strong>{kit.label}</strong>
                <span>{kit.help}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="builder__section builder__section--summary">
          <div className="builder__summary">
            <article className="settings-card">
              <span className="eyebrow">Arena ativa</span>
              <strong>{selectedArena.label}</strong>
              <p>{selectedArena.help}</p>
            </article>
            <article className="settings-card">
              <span className="eyebrow">Spawn ativo</span>
              <strong>{selectedSpawn ? selectedSpawn.label : "Custom Spawn"}</strong>
              <p>{selectedSpawn ? selectedSpawn.help : "Pontos de spawn editados manualmente no viewport."}</p>
            </article>
            <article className="settings-card">
              <span className="eyebrow">Cobertura</span>
              <strong>{selectedKit ? selectedKit.label : "Custom Kit"}</strong>
              <p>
                {selectedKit
                  ? selectedKit.help
                  : `Kit customizado com ${draft.obstacles?.length ?? 0} props posicionados manualmente.`}
              </p>
            </article>
          </div>
        </section>

        <div className="builder__ranges">
          {rangeFields.map((field) => (
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

      <div className="builder__footer">
        <p>
          Agora o fluxo é de level editor: blueprint, viewport, spawn nodes, props, inspector e depois os ajustes finos do treino.
        </p>
        <button className="primary-button" onClick={onSave} disabled={!canSave}>
          {canSave ? "Salvar mapa" : "Entre para salvar"}
        </button>
      </div>
      {saveMessage ? <p className="builder__status">{saveMessage}</p> : null}
    </section>
  );
}
