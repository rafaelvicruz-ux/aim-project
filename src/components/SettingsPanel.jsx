import { Crosshair, defaultCrosshair } from "./game/GameHud";

const minSensitivity = 0.2;
const maxSensitivity = 2.5;

const qualityOptions = [
  { id: "low", label: "Desempenho", help: "Sem bloom nem estrelas. Melhor FPS em máquina fraca." },
  { id: "medium", label: "Equilibrado", help: "Bloom e sombras suaves, sem partículas extras." },
  { id: "high", label: "Qualidade", help: "Bloom, partículas, luzes dos postes e sombras grandes." },
];

const crosshairStyles = [
  { id: "cross-dot", label: "Cruz + ponto" },
  { id: "cross", label: "Cruz" },
  { id: "dot", label: "Ponto" },
  { id: "circle", label: "Círculo" },
];

const crosshairColors = ["#7cf8c8", "#ffffff", "#ff5c5c", "#ffd166", "#7ac7ff", "#c96bff"];

const crosshairSliders = [
  { key: "size", label: "Tamanho", min: 3, max: 22, step: 1, unit: "px" },
  { key: "thickness", label: "Espessura", min: 1, max: 6, step: 1, unit: "px" },
  { key: "gap", label: "Abertura", min: 0, max: 18, step: 1, unit: "px" },
];

export function SettingsPanel({ settings, onSettingsChange, musicTracks }) {
  const activeQueue = settings.musicQueue ?? [];
  const crosshair = { ...defaultCrosshair, ...(settings.crosshair ?? {}) };

  const update = (patch) => onSettingsChange({ ...settings, ...patch });
  const updateCrosshair = (patch) => update({ crosshair: { ...crosshair, ...patch } });

  const handleMusicToggle = (trackId) => {
    const nextQueue = activeQueue.includes(trackId)
      ? activeQueue.filter((id) => id !== trackId)
      : [...activeQueue, trackId];

    update({ musicQueue: nextQueue });
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Settings</span>
          <h2>Mira, gráficos e música</h2>
        </div>
      </div>

      <div className="settings-grid">
        <article className="settings-card">
          <span className="eyebrow">Sensibilidade</span>
          <div className="field__row">
            <span>Multiplicador ativo</span>
            <strong>{settings.sensitivity.toFixed(2)}x</strong>
          </div>
          <input
            type="range"
            min={minSensitivity}
            max={maxSensitivity}
            step="0.05"
            value={settings.sensitivity}
            onChange={(event) => update({ sensitivity: Number(event.target.value) })}
          />
          <p>Valores menores deixam a mira mais controlada; maiores deixam mais rápida. Dá para ajustar no meio da sessão pelo menu de pausa.</p>

          <span className="eyebrow">Qualidade gráfica</span>
          <div className="chip-row">
            {qualityOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={(settings.quality ?? "high") === option.id ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                onClick={() => update({ quality: option.id })}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p>{qualityOptions.find((option) => option.id === (settings.quality ?? "high"))?.help}</p>
        </article>

        <article className="settings-card crosshair-card">
          <span className="eyebrow">Mira</span>
          <div className="crosshair-preview">
            <Crosshair crosshair={crosshair} />
          </div>

          <div className="chip-row">
            {crosshairStyles.map((style) => (
              <button
                key={style.id}
                type="button"
                className={crosshair.style === style.id ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                onClick={() => updateCrosshair({ style: style.id })}
              >
                {style.label}
              </button>
            ))}
          </div>

          <div className="color-row">
            {crosshairColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Cor ${color}`}
                className={crosshair.color === color ? "color-dot color-dot--active" : "color-dot"}
                style={{ background: color }}
                onClick={() => updateCrosshair({ color })}
              />
            ))}
          </div>

          {crosshairSliders.map((slider) => (
            <label className="field field--range" key={slider.key}>
              <div className="field__row">
                <span>{slider.label}</span>
                <strong>
                  {crosshair[slider.key]}
                  {slider.unit}
                </strong>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={crosshair[slider.key]}
                onChange={(event) => updateCrosshair({ [slider.key]: Number(event.target.value) })}
              />
            </label>
          ))}

          <div className="chip-row">
            <button
              type="button"
              className={crosshair.outline ? "pattern-chip pattern-chip--active" : "pattern-chip"}
              onClick={() => updateCrosshair({ outline: !crosshair.outline })}
            >
              Contorno
            </button>
            <button
              type="button"
              className={crosshair.dynamic ? "pattern-chip pattern-chip--active" : "pattern-chip"}
              onClick={() => updateCrosshair({ dynamic: !crosshair.dynamic })}
            >
              Abre ao atirar
            </button>
          </div>
        </article>
      </div>

      <div className="settings-grid">
        <article className="settings-card">
          <span className="eyebrow">Fila de música local</span>
          <div className="music-queue">
            {musicTracks.map((track) => {
              const queuePosition = activeQueue.indexOf(track.id);

              return (
                <label key={track.id} className={queuePosition >= 0 ? "music-track music-track--active" : "music-track"}>
                  <input type="checkbox" checked={queuePosition >= 0} onChange={() => handleMusicToggle(track.id)} />
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
            onChange={(event) => update({ musicVolume: Number(event.target.value) })}
          />
        </article>

        <article className="settings-card">
          <span className="eyebrow">HUD</span>
          <div className="chip-row">
            <button
              type="button"
              className={settings.showFeed !== false ? "pattern-chip pattern-chip--active" : "pattern-chip"}
              onClick={() => update({ showFeed: settings.showFeed === false })}
            >
              Feed de acertos
            </button>
            <button
              type="button"
              className={settings.showTrackInGame !== false ? "pattern-chip pattern-chip--active" : "pattern-chip"}
              onClick={() => update({ showTrackInGame: settings.showTrackInGame === false })}
            >
              Música na HUD
            </button>
          </div>
          <p>
            Se a fila local estiver ativa junto com o Spotify, silencie uma das duas: a fila local toca por cima do
            player do Spotify.
          </p>
        </article>
      </div>
    </section>
  );
}