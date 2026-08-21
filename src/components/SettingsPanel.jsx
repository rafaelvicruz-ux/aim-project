const minSensitivity = 0.2;
const maxSensitivity = 2.5;

export function SettingsPanel({ settings, onSettingsChange, musicTracks }) {
  const activeQueue = settings.musicQueue ?? [];

  const handleSensitivityChange = (event) => {
    onSettingsChange({
      ...settings,
      sensitivity: Number(event.target.value),
    });
  };

  const handleMusicToggle = (trackId) => {
    const nextQueue = activeQueue.includes(trackId)
      ? activeQueue.filter((id) => id !== trackId)
      : [...activeQueue, trackId];

    onSettingsChange({
      ...settings,
      musicQueue: nextQueue,
    });
  };

  const handleMusicVolumeChange = (event) => {
    onSettingsChange({
      ...settings,
      musicVolume: Number(event.target.value),
    });
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Settings</span>
          <h2>Sensibilidade e musica</h2>
        </div>
      </div>

      <div className="settings-grid">
        <article className="settings-card">
          <div className="field__row">
            <span>Sensibilidade ativa</span>
            <strong>{settings.sensitivity.toFixed(2)}x</strong>
          </div>
          <input
            type="range"
            min={minSensitivity}
            max={maxSensitivity}
            step="0.05"
            value={settings.sensitivity}
            onChange={handleSensitivityChange}
          />
          <p>
            Valores menores deixam a mira mais controlada. Valores maiores deixam a mira mais rapida.
          </p>
        </article>

        <article className="settings-card">
          <span className="eyebrow">Musica</span>
          <div className="music-queue">
            {musicTracks.map((track) => {
              const queuePosition = activeQueue.indexOf(track.id);

              return (
                <label key={track.id} className={queuePosition >= 0 ? "music-track music-track--active" : "music-track"}>
                  <input
                    type="checkbox"
                    checked={queuePosition >= 0}
                    onChange={() => handleMusicToggle(track.id)}
                  />
                  <div>
                    <strong>{track.name}</strong>
                    <span>{queuePosition >= 0 ? `Toca na ordem ${queuePosition + 1}` : "Clique para adicionar na fila"}</span>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="field__row">
            <span>Volume</span>
            <strong>{Math.round(settings.musicVolume * 100)}%</strong>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.musicVolume}
            onChange={handleMusicVolumeChange}
          />
          <p>Marque varias musicas para montar uma fila. Elas vao tocar na ordem em que voce clicou.</p>
        </article>
      </div>
    </section>
  );
}
