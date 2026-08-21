const minSensitivity = 0.2;
const maxSensitivity = 2.5;

export function SettingsPanel({ settings, onSettingsChange, musicTracks, spotify }) {
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

      <div className="settings-grid settings-grid--spotify">
        <article className="settings-card spotify-card">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Spotify</span>
              <h2>Streaming conectado</h2>
            </div>
            {spotify?.isConnected ? (
              <button type="button" className="ghost-button" onClick={spotify.onDisconnect} disabled={spotify.isBusy}>
                Desconectar
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={spotify?.onConnect} disabled={!spotify?.isConfigured || spotify?.isBusy}>
                Conectar Spotify
              </button>
            )}
          </div>

          <div className="spotify-status">
            <strong>
              {spotify?.playback?.item?.name
                ? spotify.playback.item.name
                : spotify?.isConnected
                  ? "Spotify conectado"
                  : "Spotify nao conectado"}
            </strong>
            <span>
              {spotify?.playback?.item?.artists?.length
                ? spotify.playback.item.artists.map((artist) => artist.name).join(", ")
                : spotify?.status || "Conecte sua conta para mostrar a musica atual e controlar a reproducao."}
            </span>
          </div>

          <div className="spotify-controls">
            <button type="button" className="ghost-button" onClick={spotify?.onPrevious} disabled={!spotify?.isConnected || spotify?.isBusy}>
              Voltar
            </button>
            <button type="button" className="primary-button" onClick={spotify?.onPlayPause} disabled={!spotify?.isConnected || spotify?.isBusy}>
              {spotify?.playback?.is_playing ? "Pausar" : "Tocar"}
            </button>
            <button type="button" className="ghost-button" onClick={spotify?.onNext} disabled={!spotify?.isConnected || spotify?.isBusy}>
              Proxima
            </button>
            <button type="button" className="ghost-button" onClick={spotify?.onRefresh} disabled={!spotify?.isConnected || spotify?.isBusy}>
              Atualizar
            </button>
          </div>
        </article>

        <article className="settings-card">
          <span className="eyebrow">Notas</span>
          <p>
            O Spotify web usa login do usuario e, para controle de playback completo, normalmente precisa de conta Premium.
          </p>
          <p>
            Para ativar aqui no projeto, preencha `VITE_SPOTIFY_CLIENT_ID` e `VITE_SPOTIFY_REDIRECT_URI` no `.env`.
          </p>
        </article>
      </div>
    </section>
  );
}
