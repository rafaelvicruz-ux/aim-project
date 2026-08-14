const minSensitivity = 0.2;
const maxSensitivity = 2.5;

export function SettingsPanel({ settings, onSettingsChange, musicTracks }) {
  const handleSensitivityChange = (event) => {
    onSettingsChange({
      ...settings,
      sensitivity: Number(event.target.value),
    });
  };

  const handleMusicTrackChange = (event) => {
    onSettingsChange({
      ...settings,
      musicTrack: event.target.value,
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
          <h2>Sensibilidade e música</h2>
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
            Valores menores deixam a mira mais controlada. Valores maiores deixam a mira mais rápida.
          </p>
        </article>

        <article className="settings-card">
          <span className="eyebrow">Música</span>
          <label className="field">
            <span>Faixa ativa</span>
            <select value={settings.musicTrack} onChange={handleMusicTrackChange}>
              {musicTracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </label>
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
          <p>Escolha a faixa da pasta `music` e ajuste o volume ao lado da sensibilidade.</p>
        </article>
      </div>
    </section>
  );
}
