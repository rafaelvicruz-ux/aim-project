export function ModeCard({ mode, onStart, onDelete }) {
  const handleDelete = (event) => {
    event.stopPropagation();
    onDelete?.(mode.id);
  };

  return (
    <button className="mode-card" onClick={() => onStart(mode)}>
      <div className="mode-card__topline">
        <span className="mode-card__label">{mode.id.startsWith("custom-") ? "Custom" : "Map"}</span>
        {onDelete ? (
          <button type="button" className="delete-button" onClick={handleDelete}>
            Deletar
          </button>
        ) : null}
      </div>
      <h3>{mode.name}</h3>
      <p>{mode.description}</p>
      <dl className="mode-card__stats">
        <div>
          <dt>Tempo</dt>
          <dd>{mode.duration}s</dd>
        </div>
        <div>
          <dt>Objetivo</dt>
          <dd>{mode.goalHits} hits</dd>
        </div>
        <div>
          <dt>Padrão</dt>
          <dd>{mode.pattern}</dd>
        </div>
        <div>
          <dt>Rank</dt>
          <dd>{mode.difficultyLabel ?? "Base"}</dd>
        </div>
      </dl>
    </button>
  );
}
