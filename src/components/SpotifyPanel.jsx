import { useState } from "react";

function formatTime(ms) {
  if (!ms || Number.isNaN(ms)) {
    return "0:00";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function CoverArt({ image, alt }) {
  if (!image) {
    return <div className="spotify-cover spotify-cover--empty" aria-hidden="true" />;
  }

  return <img className="spotify-cover" src={image} alt={alt} loading="lazy" />;
}

export function SpotifyPanel({ spotify }) {
  const [query, setQuery] = useState("");
  const [resultTab, setResultTab] = useState("tracks");

  const {
    isConfigured,
    redirectUri,
    connected,
    status,
    busy,
    profile,
    isPremium,
    devices,
    playlists,
    searchResults,
    nowPlaying,
    position,
    volume,
    usingAppPlayer,
    shuffle,
    repeat,
  } = spotify;

  const duration = nowPlaying?.duration ?? 0;
  const results = searchResults?.[resultTab] ?? [];

  return (
    <section className="panel panel--spotify">
      <div className="panel__header">
        <div>
          <span className="eyebrow">Spotify</span>
          <h2>Sua música dentro do treino</h2>
        </div>
        <div className="builder__header-actions">
          {connected ? (
            <>
              <span className={`spotify-badge ${isPremium ? "spotify-badge--premium" : ""}`}>
                {profile?.display_name ?? "Conectado"} · {isPremium ? "Premium" : "Free"}
              </span>
              <button type="button" className="ghost-button" onClick={spotify.disconnect} disabled={busy}>
                Desconectar
              </button>
            </>
          ) : (
            <button type="button" className="primary-button" onClick={spotify.connect} disabled={!isConfigured || busy}>
              {busy ? "Abrindo login..." : "Entrar com Spotify"}
            </button>
          )}
        </div>
      </div>

      {!isConfigured ? (
        <article className="settings-card">
          <span className="eyebrow">Configuração</span>
          <p>
            Crie um app em <strong>developer.spotify.com/dashboard</strong>, copie o Client ID para
            <code> VITE_SPOTIFY_CLIENT_ID</code> no <code>.env</code> e registre esta Redirect URI:
          </p>
          <code className="spotify-uri">{redirectUri}</code>
        </article>
      ) : null}

      {isConfigured && !connected ? (
        <div className="creator-grid">
          <article className="settings-card">
            <span className="eyebrow">Login sem sair do app</span>
            <p>
              O login abre numa janelinha do Spotify e volta sozinho para cá — você não perde o mapa que está montando
              nem a sessão de treino.
            </p>
            <p>
              Com conta <strong>Premium</strong> o áudio toca dentro da própria aba (o app vira um aparelho do Spotify).
              Com conta Free dá para controlar o Spotify aberto no celular ou no desktop.
            </p>
          </article>
          <article className="settings-card">
            <span className="eyebrow">Redirect URI</span>
            <p>Registre exatamente este endereço no dashboard do Spotify, senão o login é recusado:</p>
            <code className="spotify-uri">{redirectUri}</code>
          </article>
        </div>
      ) : null}

      {connected ? (
        <>
          <div className="spotify-player">
            <div className="spotify-player__now">
              <CoverArt image={nowPlaying?.image} alt={nowPlaying?.title ?? "Capa do álbum"} />
              <div className="spotify-player__meta">
                <span className="eyebrow">{usingAppPlayer ? "Tocando no AimForge" : nowPlaying?.source ?? "Sem player ativo"}</span>
                <strong>{nowPlaying?.title ?? "Nada tocando"}</strong>
                <span>{nowPlaying?.artist ?? "Escolha uma playlist ou busque uma música abaixo."}</span>

                <div className="spotify-seek">
                  <span>{formatTime(position)}</span>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(1, duration)}
                    step="1000"
                    value={Math.min(position, duration || 0)}
                    onChange={(event) => spotify.seek(Number(event.target.value))}
                    disabled={!nowPlaying}
                  />
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="spotify-controls">
                  <button
                    type="button"
                    className={shuffle ? "icon-button icon-button--active" : "icon-button"}
                    onClick={spotify.toggleShuffle}
                    disabled={busy || !nowPlaying}
                    title="Aleatório"
                  >
                    ⤮
                  </button>
                  <button type="button" className="icon-button" onClick={spotify.previous} disabled={busy || !nowPlaying} title="Anterior">
                    ⏮
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--primary"
                    onClick={spotify.togglePlay}
                    disabled={busy || !nowPlaying}
                    title={nowPlaying?.paused ? "Tocar" : "Pausar"}
                  >
                    {nowPlaying?.paused === false ? "⏸" : "▶"}
                  </button>
                  <button type="button" className="icon-button" onClick={spotify.next} disabled={busy || !nowPlaying} title="Próxima">
                    ⏭
                  </button>
                  <button
                    type="button"
                    className={repeat !== "off" ? "icon-button icon-button--active" : "icon-button"}
                    onClick={spotify.cycleRepeat}
                    disabled={busy || !nowPlaying}
                    title={`Repetir: ${repeat}`}
                  >
                    {repeat === "track" ? "🔂" : "🔁"}
                  </button>
                </div>

                <label className="field field--inline">
                  <span>Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={volume}
                    onChange={(event) => spotify.setVolume(Number(event.target.value))}
                  />
                  <strong>{Math.round(volume * 100)}%</strong>
                </label>
              </div>
            </div>

            <aside className="spotify-devices settings-card">
              <span className="eyebrow">Aparelhos</span>
              {isPremium ? (
                <button
                  type="button"
                  className={usingAppPlayer ? "primary-button" : "ghost-button"}
                  onClick={spotify.transferToApp}
                  disabled={busy}
                >
                  {usingAppPlayer ? "Tocando aqui ✓" : "Tocar aqui no app"}
                </button>
              ) : (
                <p className="spotify-note">
                  Player embutido exige Premium. Sem Premium, abra o Spotify no celular ou desktop e controle por aqui.
                </p>
              )}

              <div className="spotify-device-list">
                {devices.length ? (
                  devices.map((device) => (
                    <button
                      key={device.id}
                      type="button"
                      className={device.is_active ? "spotify-device spotify-device--active" : "spotify-device"}
                      onClick={() => spotify.transferTo(device.id)}
                      disabled={busy}
                    >
                      <strong>{device.name}</strong>
                      <span>{device.type}{device.is_active ? " · ativo" : ""}</span>
                    </button>
                  ))
                ) : (
                  <p className="spotify-note">Nenhum aparelho encontrado. Abra o Spotify em algum lugar e atualize.</p>
                )}
              </div>

              <button type="button" className="ghost-button" onClick={spotify.refreshDevices} disabled={busy}>
                Atualizar aparelhos
              </button>
            </aside>
          </div>

          <form
            className="spotify-search"
            onSubmit={(event) => {
              event.preventDefault();
              spotify.search(query);
            }}
          >
            <label className="field">
              <span>Buscar no Spotify</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Música, artista, álbum ou playlist"
              />
            </label>
            <button type="submit" className="primary-button" disabled={busy}>
              Buscar
            </button>
          </form>

          {searchResults ? (
            <div className="spotify-results">
              <div className="chip-row">
                {[
                  { id: "tracks", label: `Músicas (${searchResults.tracks.length})` },
                  { id: "playlists", label: `Playlists (${searchResults.playlists.length})` },
                  { id: "albums", label: `Álbuns (${searchResults.albums.length})` },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={resultTab === item.id ? "pattern-chip pattern-chip--active" : "pattern-chip"}
                    onClick={() => setResultTab(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="spotify-grid">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="spotify-item"
                    onClick={() =>
                      resultTab === "tracks" ? spotify.playTracks(item.uri) : spotify.playContext(item.uri)
                    }
                    disabled={busy}
                  >
                    <CoverArt image={item.images?.[0]?.url ?? item.album?.images?.[0]?.url} alt={item.name} />
                    <span>
                      <strong>{item.name}</strong>
                      <em>
                        {item.artists?.map((artist) => artist.name).join(", ") ??
                          item.owner?.display_name ??
                          "Playlist"}
                      </em>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="spotify-results">
            <span className="eyebrow">Suas playlists</span>
            <div className="spotify-grid">
              {playlists.length ? (
                playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    className="spotify-item"
                    onClick={() => spotify.playContext(playlist.uri)}
                    disabled={busy}
                  >
                    <CoverArt image={playlist.images?.[0]?.url} alt={playlist.name} />
                    <span>
                      <strong>{playlist.name}</strong>
                      <em>{playlist.tracks?.total ?? 0} faixas</em>
                    </span>
                  </button>
                ))
              ) : (
                <p className="spotify-note">Nenhuma playlist carregada ainda.</p>
              )}
            </div>
          </div>
        </>
      ) : null}

      {status ? <p className="builder__status">{status}</p> : null}
    </section>
  );
}