import { useEffect, useMemo, useRef, useState } from "react";

export const defaultCrosshair = {
  style: "cross-dot",
  color: "#7cf8c8",
  size: 10,
  thickness: 2,
  gap: 5,
  outline: true,
  dynamic: true,
};

export function Crosshair({ crosshair, spread = 0, tone = "idle" }) {
  const config = { ...defaultCrosshair, ...crosshair };
  const gap = config.gap + (config.dynamic ? spread * 9 : 0);

  const style = {
    "--xh-color": config.color,
    "--xh-thickness": `${config.thickness}px`,
    "--xh-length": `${config.size}px`,
    "--xh-gap": `${gap}px`,
    "--xh-outline": config.outline ? "0 0 0 1px rgba(0, 0, 0, 0.75)" : "none",
  };

  const showLines = config.style !== "dot";
  const showDot = config.style === "cross-dot" || config.style === "dot";
  const showCircle = config.style === "circle";

  return (
    <div className={`crosshair crosshair--${tone}`} style={style}>
      {showLines
        ? ["top", "bottom", "left", "right"].map((side) => (
            <i key={side} className={`crosshair__line crosshair__line--${side}`} />
          ))
        : null}
      {showCircle ? <i className="crosshair__circle" /> : null}
      {showDot ? <i className="crosshair__dot" /> : null}
    </div>
  );
}

function AccuracyRing({ accuracy }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, accuracy)) / 100);

  return (
    <svg className="hud-ring" viewBox="0 0 64 64" role="img" aria-label={`Precisão ${accuracy}%`}>
      <circle className="hud-ring__track" cx="32" cy="32" r={radius} />
      <circle
        className="hud-ring__value"
        cx="32"
        cy="32"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text className="hud-ring__label" x="32" y="36">
        {accuracy}%
      </text>
    </svg>
  );
}

function useAnimatedNumber(value) {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef(0);
  const currentRef = useRef(value);

  useEffect(() => {
    const animate = () => {
      const diff = value - currentRef.current;

      if (Math.abs(diff) < 1) {
        currentRef.current = value;
        setDisplay(value);
        return;
      }

      currentRef.current += diff * 0.24;
      setDisplay(Math.round(currentRef.current));
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return display;
}

export function GameHud({
  mode,
  hud,
  crosshair,
  feed,
  damageNumbers,
  hitMarker,
  spread,
  started,
  paused,
  finished,
  nowPlaying,
  sensitivity,
  onSensitivityChange,
  onResume,
  onRestart,
  onExit,
}) {
  const animatedScore = useAnimatedNumber(hud.score);
  const goalProgress = Math.min(100, (hud.hits / Math.max(1, mode.goalHits)) * 100);
  const lowTime = hud.timeLeft <= 10;

  const pressure = useMemo(() => {
    if (hud.accuracy >= 85) {
      return { label: "Laser", tone: "elite" };
    }
    if (hud.accuracy >= 65) {
      return { label: "Locked", tone: "good" };
    }
    if (hud.accuracy >= 45) {
      return { label: "Stable", tone: "ok" };
    }
    return { label: "Warmup", tone: "warn" };
  }, [hud.accuracy]);

  const comboFill = Math.min(100, (hud.combo / 10) * 100);

  return (
    <div className={`hud ${started ? "hud--live" : "hud--idle"}`}>
      <div className={`hud__vignette ${lowTime && started ? "hud__vignette--alert" : ""}`} />

      <div className="hud__top">
        <div className="hud__panel hud__panel--left">
          <span className="hud__eyebrow">{mode.category ?? "Custom"}</span>
          <strong className="hud__mode">{mode.name}</strong>
          {mode.ruleLabel ? <span className="hud__rule">{mode.ruleLabel}</span> : null}
        </div>

        <div className="hud__center">
          <div className={`hud__timer ${lowTime ? "hud__timer--alert" : ""}`}>
            {hud.timeLeft.toFixed(1)}
            <span>s</span>
          </div>
          <div className="hud__progress">
            <div className="hud__progress-bar" style={{ width: `${goalProgress}%` }} />
            <div className="hud__progress-ticks" />
          </div>
          <span className="hud__progress-label">
            {hud.hits} / {mode.goalHits} alvos
          </span>
        </div>

        <div className="hud__panel hud__panel--right">
          <span className="hud__eyebrow">Score</span>
          <strong className="hud__score">{animatedScore.toLocaleString("pt-BR")}</strong>
          <span className={`hud__pressure hud__pressure--${pressure.tone}`}>{pressure.label}</span>
        </div>
      </div>

      <div className="hud__combo">
        <div className="hud__combo-meter">
          <div className="hud__combo-fill" style={{ height: `${comboFill}%` }} />
        </div>
        <div className="hud__combo-value">
          <strong className={hud.combo >= 5 ? "hud__combo-hot" : ""}>x{hud.combo}</strong>
          <span>combo</span>
        </div>
      </div>

      <div className="hud__center-stack">
        <Crosshair crosshair={crosshair} spread={spread} tone={hitMarker?.tone ?? "idle"} />
        {hitMarker ? (
          <div className={`hitmarker hitmarker--${hitMarker.tone}`} key={hitMarker.key}>
            <i />
            <i />
            <i />
            <i />
          </div>
        ) : null}
        {damageNumbers.map((entry) => (
          <span
            key={entry.id}
            className={`damage-number damage-number--${entry.tone}`}
            style={{ "--dx": `${entry.dx}px`, "--dy": `${entry.dy}px` }}
          >
            {entry.label}
          </span>
        ))}
      </div>

      <div className="hud__bottom">
        <ul className="hud__feed">
          {feed.map((entry) => (
            <li key={entry.id} className={`hud__feed-item hud__feed-item--${entry.tone}`}>
              <strong>{entry.label}</strong>
              {entry.value ? <span>{entry.value}</span> : null}
            </li>
          ))}
        </ul>

        <div className="hud__stats">
          <AccuracyRing accuracy={hud.accuracy} />
          <div className="hud__stat-list">
            <div>
              <span>Reação</span>
              <strong>{hud.avgReaction ? `${hud.avgReaction}ms` : "--"}</strong>
            </div>
            <div>
              <span>Melhor combo</span>
              <strong>{hud.bestCombo}</strong>
            </div>
            <div>
              <span>Erros</span>
              <strong>{hud.misses}</strong>
            </div>
            <div>
              <span>Sens</span>
              <strong>{sensitivity.toFixed(2)}x</strong>
            </div>
          </div>
        </div>
      </div>

      {nowPlaying ? (
        <div className="hud__now-playing">
          <span className="hud__equalizer">
            <i />
            <i />
            <i />
          </span>
          <div>
            <strong>{nowPlaying.title}</strong>
            {nowPlaying.artist ? <span>{nowPlaying.artist}</span> : null}
          </div>
        </div>
      ) : null}

      {!started && !finished ? (
        <div className="hud__gate">
          <div className="hud__gate-card">
            <span className="eyebrow">Sessão 3D</span>
            <h3>{mode.name}</h3>
            <p>{mode.description}</p>
            <button id="fps-lock-button" className="primary-button hud__gate-button" type="button">
              Entrar no mapa
            </button>
            <dl className="hud__keys">
              <div>
                <dt>WASD</dt>
                <dd>Mover</dd>
              </div>
              <div>
                <dt>Mouse</dt>
                <dd>Mirar</dd>
              </div>
              <div>
                <dt>Clique</dt>
                <dd>Atirar</dd>
              </div>
              <div>
                <dt>Shift</dt>
                <dd>Andar devagar</dd>
              </div>
              <div>
                <dt>ESC</dt>
                <dd>Pausar</dd>
              </div>
              <div>
                <dt>R</dt>
                <dd>Reiniciar</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}

      {paused ? (
        <div className="hud__gate hud__gate--pause">
          <div className="hud__gate-card">
            <span className="eyebrow">Pausado</span>
            <h3>{mode.name}</h3>
            <label className="field">
              <div className="field__row">
                <span>Sensibilidade</span>
                <strong>{sensitivity.toFixed(2)}x</strong>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={sensitivity}
                onChange={(event) => onSensitivityChange(Number(event.target.value))}
              />
            </label>
            <div className="hud__gate-actions">
              <button className="primary-button" type="button" onClick={onResume}>
                Continuar
              </button>
              <button className="ghost-button" type="button" onClick={onRestart}>
                Reiniciar
              </button>
              <button className="ghost-button" type="button" onClick={onExit}>
                Sair
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}