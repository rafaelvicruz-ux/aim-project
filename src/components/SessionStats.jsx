export function SessionStats({ stats, modeName, onBack }) {
  return (
    <section className="panel session-stats">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Sessão Finalizada</span>
          <h2>{modeName}</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          Voltar ao menu
        </button>
      </div>

      <div className="session-stats__grid">
        <article>
          <span>Score</span>
          <strong>{stats.score}</strong>
        </article>
        <article>
          <span>Precisão</span>
          <strong>{stats.accuracy}%</strong>
        </article>
        <article>
          <span>Acertos</span>
          <strong>{stats.hits}</strong>
        </article>
        <article>
          <span>Erros</span>
          <strong>{stats.misses}</strong>
        </article>
        <article>
          <span>Reação média</span>
          <strong>{stats.avgReaction}ms</strong>
        </article>
        <article>
          <span>Maior combo</span>
          <strong>{stats.bestCombo}</strong>
        </article>
      </div>
    </section>
  );
}
