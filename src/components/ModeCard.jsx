export function ModeCard({ mode, onStart }) {
  return (
    <button className="mode-card" onClick={() => onStart(mode)}>
      <span className="mode-card__label">{mode.id.startsWith("custom-") ? "Custom" : "Preset"}</span>
      <h3>{mode.name}</h3>
      <p>{mode.description}</p>
      <dl className="mode-card__stats">
        <div>
          <dt>Duração</dt>
          <dd>{mode.duration}s</dd>
        </div>
        <div>
          <dt>Tamanho</dt>
          <dd>{mode.targetSize}px</dd>
        </div>
        <div>
          <dt>Spawn</dt>
          <dd>{mode.spawnRate}ms</dd>
        </div>
      </dl>
    </button>
  );
}
