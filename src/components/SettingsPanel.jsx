const minSensitivity = 0.2;
const maxSensitivity = 2.5;

export function SettingsPanel({ settings, onSettingsChange }) {
  const handleSensitivityChange = (event) => {
    onSettingsChange({
      ...settings,
      sensitivity: Number(event.target.value),
    });
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Settings</span>
          <h2>Sensibilidade da mira</h2>
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
          <span className="eyebrow">Como funciona</span>
          <p>
            Durante a partida, a mira virtual se move com base no seu mouse e usa essa sensibilidade
            para multiplicar o deslocamento.
          </p>
        </article>
      </div>
    </section>
  );
}
