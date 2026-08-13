import { useEffect, useMemo, useRef, useState } from "react";

const ARENA_WIDTH = 960;
const ARENA_HEIGHT = 540;

function spawnTarget(mode, now) {
  const radius = mode.targetSize / 2;
  const x = radius + Math.random() * (ARENA_WIDTH - radius * 2);
  const y = radius + Math.random() * (ARENA_HEIGHT - radius * 2);
  const angle = Math.random() * Math.PI * 2;
  const speed = mode.moveSpeed;

  return {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    x,
    y,
    radius,
    bornAt: now,
    expiresAt: now + mode.targetLifetime,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function clampTarget(target) {
  let { x, y, vx, vy, radius } = target;

  if (x <= radius || x >= ARENA_WIDTH - radius) {
    vx *= -1;
    x = Math.max(radius, Math.min(ARENA_WIDTH - radius, x));
  }

  if (y <= radius || y >= ARENA_HEIGHT - radius) {
    vy *= -1;
    y = Math.max(radius, Math.min(ARENA_HEIGHT - radius, y));
  }

  return { ...target, x, y, vx, vy };
}

function computeScore(mode, reaction, combo) {
  const reactionBonus = Math.max(20, 220 - Math.floor(reaction / 10));

  if (mode.scoring === "combo") {
    return 80 + reactionBonus + combo * 12;
  }

  if (mode.scoring === "tracking") {
    return 100 + Math.floor(reactionBonus * 0.8);
  }

  return 90 + reactionBonus;
}

export function GameArena({ mode, settings, onFinish, onExit }) {
  const [timeLeft, setTimeLeft] = useState(mode.duration);
  const [targets, setTargets] = useState([]);
  const [crosshair, setCrosshair] = useState({
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT / 2,
  });
  const [stats, setStats] = useState({
    score: 0,
    shots: 0,
    hits: 0,
    misses: 0,
    combo: 0,
    bestCombo: 0,
    reactionTimes: [],
  });

  const lastSpawnAtRef = useRef(0);
  const rafRef = useRef(0);
  const endAtRef = useRef(performance.now() + mode.duration * 1000);
  const finishedRef = useRef(false);
  const crosshairRef = useRef({
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT / 2,
  });

  useEffect(() => {
    const tick = (now) => {
      const remainingMs = Math.max(0, endAtRef.current - now);
      setTimeLeft(Number((remainingMs / 1000).toFixed(1)));

      setTargets((currentTargets) => {
        let nextTargets = currentTargets
          .filter((target) => target.expiresAt > now)
          .map((target) => {
            if (!mode.moveSpeed) {
              return target;
            }

            const nextTarget = {
              ...target,
              x: target.x + target.vx / 60,
              y: target.y + target.vy / 60,
            };

            return clampTarget(nextTarget);
          });

        const shouldSpawn =
          now - lastSpawnAtRef.current >= mode.spawnRate &&
          nextTargets.length < mode.simultaneousTargets &&
          remainingMs > 0;

        if (shouldSpawn) {
          lastSpawnAtRef.current = now;
          nextTargets = [...nextTargets, spawnTarget(mode, now)];
        }

        return nextTargets;
      });

      if (remainingMs <= 0) {
        if (!finishedRef.current) {
          finishedRef.current = true;
          cancelAnimationFrame(rafRef.current);
          onFinish(stats);
        }
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, onFinish, stats]);

  const accuracy = useMemo(() => {
    if (!stats.shots) {
      return 100;
    }

    return Math.round((stats.hits / stats.shots) * 100);
  }, [stats.hits, stats.shots]);

  const handleArenaClick = (event) => {
    const clickX = crosshairRef.current.x;
    const clickY = crosshairRef.current.y;

    let didHit = false;

    setTargets((currentTargets) => {
      const hitTarget = currentTargets.find((target) => {
        const dx = clickX - target.x;
        const dy = clickY - target.y;
        return Math.sqrt(dx * dx + dy * dy) <= target.radius;
      });

      if (!hitTarget) {
        return currentTargets;
      }

      didHit = true;
      const reaction = performance.now() - hitTarget.bornAt;

      setStats((currentStats) => {
        const nextCombo = currentStats.combo + 1;
        return {
          ...currentStats,
          shots: currentStats.shots + 1,
          hits: currentStats.hits + 1,
          combo: nextCombo,
          bestCombo: Math.max(currentStats.bestCombo, nextCombo),
          score: currentStats.score + computeScore(mode, reaction, nextCombo),
          reactionTimes: [...currentStats.reactionTimes, Math.round(reaction)],
        };
      });

      return currentTargets.filter((target) => target.id !== hitTarget.id);
    });

    if (!didHit) {
      setStats((currentStats) => ({
        ...currentStats,
        shots: currentStats.shots + 1,
        misses: currentStats.misses + 1,
        combo: 0,
      }));
    }
  };

  const syncCrosshair = (nextX, nextY) => {
    const normalizedPosition = {
      x: Math.max(0, Math.min(ARENA_WIDTH, nextX)),
      y: Math.max(0, Math.min(ARENA_HEIGHT, nextY)),
    };

    crosshairRef.current = normalizedPosition;
    setCrosshair(normalizedPosition);
  };

  const handleMouseEnter = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    syncCrosshair((event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY);
  };

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    const nextX = crosshairRef.current.x + event.movementX * scaleX * settings.sensitivity;
    const nextY = crosshairRef.current.y + event.movementY * scaleY * settings.sensitivity;
    syncCrosshair(nextX, nextY);
  };

  return (
    <section className="arena-shell">
      <header className="arena-shell__header">
        <div>
          <span className="eyebrow">Live Session</span>
          <h2>{mode.name}</h2>
        </div>
        <button className="ghost-button" onClick={onExit}>
          Encerrar
        </button>
      </header>

      <div className="arena-shell__hud">
        <article>
          <span>Tempo</span>
          <strong>{timeLeft}s</strong>
        </article>
        <article>
          <span>Score</span>
          <strong>{stats.score}</strong>
        </article>
        <article>
          <span>Precisão</span>
          <strong>{accuracy}%</strong>
        </article>
        <article>
          <span>Combo</span>
          <strong>x{stats.combo}</strong>
        </article>
        <article>
          <span>Sens</span>
          <strong>{settings.sensitivity.toFixed(2)}x</strong>
        </article>
      </div>

      <div
        className="arena"
        onClick={handleArenaClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        role="button"
        tabIndex={0}
      >
        <div className="arena__grid" />
        {targets.map((target) => (
          <button
            key={target.id}
            className="target"
            style={{
              width: mode.targetSize,
              height: mode.targetSize,
              left: target.x - target.radius,
              top: target.y - target.radius,
            }}
            aria-label="target"
          />
        ))}
        <div
          className="crosshair"
          style={{
            left: crosshair.x,
            top: crosshair.y,
          }}
        />
      </div>
    </section>
  );
}
