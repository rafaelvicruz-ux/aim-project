export function ModeCard({ mode, onStart }) {
  return (
    <button className="mode-card" onClick={() => onStart(mode)}>
      <span className="mode-card__label">{mode.id.startsWith("custom-") ? "Custom" : "Map"}</span>
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
      </dl>
    </button>
  );
}
