import { buildObstacleLayout, obstacleTypes } from "../data/gameConfig";
import { customTemplate, patternOptions } from "../data/presets";

const scoringOptions = [
  { value: "precision", label: "Precision", help: "Score focado em acerto limpo e estável." },
  { value: "combo", label: "Combo", help: "Valoriza sequências longas sem perder ritmo." },
  { value: "tracking", label: "Tracking", help: "Premia leitura de alvo com movimento constante." },
];

const rangeFields = [
  { key: "duration", label: "Tempo limite", min: 15, max: 180, step: 5, unit: "s" },
  { key: "goalHits", label: "Acertos para concluir", min: 5, max: 120, step: 1, unit: " hits" },
  { key: "targetSize", label: "Tamanho do alvo", min: 18, max: 90, step: 2, unit: "px" },
  { key: "spawnRate", label: "Tempo de spawn", min: 180, max: 1800, step: 20, unit: "ms" },
  { key: "targetLifetime", label: "Vida do alvo", min: 400, max: 5000, step: 50, unit: "ms" },
  { key: "moveSpeed", label: "Velocidade frontal", min: 0, max: 260, step: 10, unit: "px/s" },
  { key: "strafeIntensity", label: "Strafe lateral", min: 0, max: 180, step: 5, unit: "px/s" },
  { key: "verticalDrift", label: "Deriva vertical", min: 0, max: 140, step: 5, unit: "px/s" },
  { key: "simultaneousTargets", label: "Inimigos simultâneos", min: 1, max: 6, step: 1, unit: "" },
  { key: "depthLayers", label: "Camadas 3D", min: 1, max: 5, step: 1, unit: " layers" },
];

export function TrainingBuilder({ draft, onDraftChange, onSave, canSave, saveMessage }) {
  const handleChange = (key, value) => {
    onDraftChange({
      ...draft,
      [key]: value,
    });
  };

  const handleReset = () => onDraftChange(customTemplate);

  const handleObstacleToggle = (obstacleId) => {
    const nextObstacleSet = draft.obstacleSet.includes(obstacleId)
      ? draft.obstacleSet.filter((item) => item !== obstacleId)
      : [...draft.obstacleSet, obstacleId];

    onDraftChange({
      ...draft,
      obstacleSet: nextObstacleSet,
      obstacles: buildObstacleLayout(nextObstacleSet),
    });
  };

  return (
    <section className="panel builder">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Map Builder</span>
          <h2>Crie mapas 3D personalizados</h2>
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

        <div className="builder__patterns">
          {obstacleTypes.map((obstacle) => (
            <button
              type="button"
              key={obstacle.id}
              className={
                draft.obstacleSet.includes(obstacle.id)
                  ? "pattern-chip pattern-chip--active"
                  : "pattern-chip"
              }
              onClick={() => handleObstacleToggle(obstacle.id)}
            >
              {obstacle.label}
            </button>
          ))}
        </div>
      </div>

      <div className="builder__footer">
        <p>
          Ajuste padrão, profundidade e objetivo de acertos para criar mapas curtos de flick ou arenas
          longas de tracking em 3D. Você também pode adicionar lixeira, caminhão, pedra e móveis.
        </p>
        <button className="primary-button" onClick={onSave} disabled={!canSave}>
          {canSave ? "Salvar mapa" : "Entre para salvar"}
        </button>
      </div>
      {saveMessage ? <p className="builder__status">{saveMessage}</p> : null}
    </section>
  );
}
