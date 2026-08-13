import { customTemplate } from "../data/presets";

const scoringOptions = [
  { value: "precision", label: "Precision", help: "Pontua mais por precisão consistente." },
  { value: "combo", label: "Combo", help: "Premia sequências rápidas sem errar." },
  { value: "tracking", label: "Tracking", help: "Focado em alvos em movimento." },
];

const rangeFields = [
  { key: "duration", label: "Duração", min: 15, max: 120, step: 5, unit: "s" },
  { key: "targetSize", label: "Tamanho do alvo", min: 18, max: 80, step: 2, unit: "px" },
  { key: "spawnRate", label: "Tempo de spawn", min: 200, max: 1800, step: 50, unit: "ms" },
  { key: "targetLifetime", label: "Vida do alvo", min: 350, max: 5000, step: 50, unit: "ms" },
  { key: "moveSpeed", label: "Velocidade", min: 0, max: 220, step: 10, unit: "px/s" },
  { key: "simultaneousTargets", label: "Alvos simultâneos", min: 1, max: 5, step: 1, unit: "" },
];

export function TrainingBuilder({ draft, onDraftChange, onSave }) {
  const handleChange = (key, value) => {
    onDraftChange({
      ...draft,
      [key]: value,
    });
  };

  const handleReset = () => onDraftChange(customTemplate);

  return (
    <section className="panel builder">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Training Builder</span>
          <h2>Crie seus próprios treinos</h2>
        </div>
        <button className="ghost-button" onClick={handleReset}>
          Resetar
        </button>
      </div>

      <div className="builder__grid">
        <label className="field">
          <span>Nome</span>
          <input
            value={draft.name}
            onChange={(event) => handleChange("name", event.target.value)}
            placeholder="Nome do treino"
          />
        </label>

        <label className="field">
          <span>Descrição</span>
          <textarea
            rows="3"
            value={draft.description}
            onChange={(event) => handleChange("description", event.target.value)}
            placeholder="O que este treino pratica?"
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

      <div className="builder__footer">
        <p>
          Dica: combine alvo pequeno com vida curta para treino de flick, ou aumente velocidade para
          focar tracking.
        </p>
        <button className="primary-button" onClick={onSave}>
          Salvar treino
        </button>
      </div>
    </section>
  );
}
