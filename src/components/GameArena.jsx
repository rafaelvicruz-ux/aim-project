import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, SMAA, Vignette } from "@react-three/postprocessing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getArenaPrefab, getSpawnPreset } from "../data/gameConfig";
import {
  ArenaFloor,
  ArenaLights,
  ArenaProps,
  ArenaWalls,
  GradientSky,
} from "./scene/ArenaEnvironment";
import { Obstacle } from "./scene/SceneProp";
import { CombatEffects } from "./game/CombatEffects";
import { Enemy, WORLD_LIMIT, createEnemy } from "./game/Enemy";
import { GameHud, defaultCrosshair } from "./game/GameHud";
import { WeaponViewModel } from "./game/Weapon";

const PLAYER_HEIGHT = 1.7;
const PLAYER_SPEED = 10;
const MAX_FEED = 5;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function resolveSpawnConfig(mode) {
  const preset = getSpawnPreset(mode.spawnPreset);

  if (mode.spawnNodes?.length) {
    return {
      spread: preset.spread ?? 2,
      anchors: mode.spawnNodes.map((node) => ({
        position: node.position,
        height: node.height ?? 1.7,
      })),
    };
  }

  return {
    spread: preset.spread ?? 2,
    anchors: preset.anchors.map((anchor) => ({
      position: [anchor[0], 0, anchor[2]],
      height: randomBetween(preset.heightRange[0], preset.heightRange[1]),
    })),
  };
}

function computeScore(mode, reaction, combo, headshot) {
  const reactionBonus = Math.max(25, 260 - Math.floor(reaction / 8));
  const headshotBonus = headshot ? 60 : 0;

  if (mode.scoring === "combo") {
    return 100 + reactionBonus + combo * 18 + headshotBonus;
  }

  if (mode.scoring === "tracking") {
    return 115 + Math.floor(reactionBonus * 0.8) + combo * 8 + headshotBonus;
  }

  return 110 + reactionBonus + headshotBonus;
}

function usePressedKeys() {
  const keysRef = useRef({});

  useEffect(() => {
    const onKeyDown = (event) => {
      keysRef.current[event.code] = true;
    };
    const onKeyUp = (event) => {
      keysRef.current[event.code] = false;
    };
    const onBlur = () => {
      keysRef.current = {};
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return keysRef;
}

function PlayerRig({ speed, sensitivity, moveStateRef, onControlsReady, pausedRef }) {
  const controlsRef = useRef(null);
  const keysRef = usePressedKeys();
  const { camera } = useThree();
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const move = useMemo(() => new THREE.Vector3(), []);
  const velocity = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 16);
    camera.lookAt(0, PLAYER_HEIGHT, -6);
  }, [camera]);

  useEffect(() => {
    onControlsReady(controlsRef.current);
  }, [onControlsReady]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(0.05, rawDelta);
    const keys = keysRef.current;

    if (pausedRef.current) {
      if (moveStateRef.current) {
        moveStateRef.current.moving = false;
      }
      return;
    }

    const front = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const side = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const walking = keys.ShiftLeft || keys.ShiftRight;
    const currentSpeed = speed * (walking ? 0.45 : 1);

    move.set(0, 0, 0);

    if (front || side) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, camera.up).normalize();
      move.addScaledVector(forward, front);
      move.addScaledVector(right, side);
      move.normalize().multiplyScalar(currentSpeed);
    }

    velocity.lerp(move, Math.min(1, delta * 14));
    camera.position.addScaledVector(velocity, delta);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -WORLD_LIMIT + 2, WORLD_LIMIT - 2);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -WORLD_LIMIT + 2, WORLD_LIMIT - 2);
    camera.position.y = PLAYER_HEIGHT;

    if (moveStateRef.current) {
      moveStateRef.current.moving = velocity.lengthSq() > 0.6;
    }
  });

  return <PointerLockControls ref={controlsRef} selector="#fps-lock-button" pointerSpeed={sensitivity} />;
}

function Shooter({ bindShooter, enemyObjectsRef, worldRef }) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);
  const fallbackPoint = useMemo(() => new THREE.Vector3(), []);
  const fallbackNormal = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const shoot = () => {
      raycaster.setFromCamera(center, camera);

      const enemyRoots = Array.from(enemyObjectsRef.current.values());
      const enemyHits = enemyRoots.length ? raycaster.intersectObjects(enemyRoots, true) : [];
      const enemyHit = enemyHits.find((entry) => entry.object.userData.enemyId);

      const worldHits = worldRef.current ? raycaster.intersectObject(worldRef.current, true) : [];
      const worldHit = worldHits[0];

      if (enemyHit && (!worldHit || enemyHit.distance <= worldHit.distance)) {
        return {
          enemyId: enemyHit.object.userData.enemyId,
          hitZone: enemyHit.object.userData.hitZone ?? "body",
          point: enemyHit.point.clone(),
          normal: enemyHit.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0),
        };
      }

      if (worldHit) {
        return {
          enemyId: null,
          point: worldHit.point.clone(),
          normal: worldHit.face?.normal?.clone().transformDirection(worldHit.object.matrixWorld) ?? new THREE.Vector3(0, 1, 0),
        };
      }

      camera.getWorldDirection(fallbackNormal);
      fallbackPoint.copy(camera.position).addScaledVector(fallbackNormal, 70);

      return {
        enemyId: null,
        point: fallbackPoint.clone(),
        normal: fallbackNormal.clone().negate(),
      };
    };

    bindShooter(shoot);
    return () => bindShooter(null);
  }, [bindShooter, camera, center, enemyObjectsRef, fallbackNormal, fallbackPoint, raycaster, scene, worldRef]);

  return null;
}

function GameLoop({ mode, spawnConfigRef, enemiesRef, setEnemies, statsRef, timeRef, pausedRef, startedRef, finishedRef, onTimeout }) {
  const lastTickRef = useRef(performance.now());
  const spawnAccumulatorRef = useRef(0);
  const wasPausedRef = useRef(false);

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;

    if (finishedRef.current) {
      return;
    }

    if (!startedRef.current || pausedRef.current) {
      if (!wasPausedRef.current) {
        wasPausedRef.current = true;
      }
      // congela o relogio dos alvos enquanto pausado
      enemiesRef.current.forEach((enemy) => {
        enemy.armedAt += delta;
        enemy.expiresAt += delta;
      });
      return;
    }

    wasPausedRef.current = false;
    timeRef.current.remaining = Math.max(0, timeRef.current.remaining - delta);

    const alive = enemiesRef.current.filter((enemy) => enemy.expiresAt > now);
    let changed = alive.length !== enemiesRef.current.length;

    if (changed) {
      statsRef.current.expired += enemiesRef.current.length - alive.length;
      enemiesRef.current = alive;
    }

    spawnAccumulatorRef.current += delta;

    while (
      spawnAccumulatorRef.current >= mode.spawnRate &&
      enemiesRef.current.length < mode.simultaneousTargets &&
      timeRef.current.remaining > 0 &&
      statsRef.current.hits < mode.goalHits
    ) {
      spawnAccumulatorRef.current -= mode.spawnRate;
      enemiesRef.current = [...enemiesRef.current, createEnemy(mode, spawnConfigRef.current, now)];
      changed = true;
    }

    if (spawnAccumulatorRef.current > mode.spawnRate * 2) {
      spawnAccumulatorRef.current = mode.spawnRate;
    }

    if (changed) {
      setEnemies(enemiesRef.current);
    }

    if (timeRef.current.remaining <= 0) {
      onTimeout();
    }
  });

  return null;
}

function FpsScene({
  mode,
  arena,
  enemies,
  paused,
  quality,
  sensitivity,
  moveStateRef,
  shotCounterRef,
  muzzleRef,
  effectsApiRef,
  enemyObjectsRef,
  bindShooter,
  onControlsReady,
  pausedRef,
  children,
}) {
  const worldRef = useRef(null);
  const enemyScale = Math.max(0.55, (mode.targetSize ?? 40) / 40);

  const registerEnemy = useCallback(
    (id, object) => {
      if (object) {
        enemyObjectsRef.current.set(id, object);
      } else {
        enemyObjectsRef.current.delete(id);
      }
    },
    [enemyObjectsRef],
  );

  return (
    <>
      <fogExp2 attach="fog" args={[arena.skyBottom ?? "#070b14", arena.fogDensity ?? 0.008]} />
      <GradientSky arena={arena} />
      {quality !== "low" ? <Stars radius={160} depth={60} count={1400} factor={4} saturation={0} fade speed={0.4} /> : null}
      {quality === "high" ? (
        <Sparkles count={40} scale={[80, 22, 80]} size={5} speed={0.3} opacity={0.5} color={arena.accentColor} />
      ) : null}

      <ArenaLights arena={arena} quality={quality} />
      <PlayerRig
        speed={PLAYER_SPEED + (mode.moveSpeed ?? 0) * 0.01}
        sensitivity={sensitivity}
        moveStateRef={moveStateRef}
        onControlsReady={onControlsReady}
        pausedRef={pausedRef}
      />
      <WeaponViewModel shotCounterRef={shotCounterRef} moveStateRef={moveStateRef} muzzleRef={muzzleRef} />

      <group ref={worldRef}>
        <ArenaFloor arena={arena} />
        <ArenaWalls arena={arena} />
        <ArenaProps arena={arena} />
        {(mode.obstacles ?? []).map((obstacle) => (
          <Obstacle key={obstacle.id} obstacle={obstacle} lit={quality === "high"} />
        ))}
      </group>

      {enemies.map((enemy) => (
        <Enemy
          key={enemy.id}
          enemy={enemy}
          mode={mode}
          scale={enemyScale}
          requireHeadshot={mode.requireHeadshot}
          registerEnemy={registerEnemy}
          paused={paused}
        />
      ))}

      <CombatEffects apiRef={effectsApiRef} accentColor={arena.accentColor} />
      <Shooter bindShooter={bindShooter} enemyObjectsRef={enemyObjectsRef} worldRef={worldRef} />
      {children}

      {quality !== "low" ? (
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom intensity={0.55} luminanceThreshold={0.62} luminanceSmoothing={0.25} mipmapBlur radius={0.72} />
          <Vignette offset={0.28} darkness={0.62} eskil={false} />
          <SMAA />
        </EffectComposer>
      ) : null}
    </>
  );
}

export function GameArena({ mode, settings, onFinish, onExit, onSensitivityChange, nowPlaying }) {
  const crosshair = { ...defaultCrosshair, ...(settings.crosshair ?? {}) };
  const quality = settings.quality ?? "high";

  const [runKey, setRunKey] = useState(0);
  const [enemies, setEnemies] = useState([]);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [feed, setFeed] = useState([]);
  const [damageNumbers, setDamageNumbers] = useState([]);
  const [hitMarker, setHitMarker] = useState(null);
  const [spread, setSpread] = useState(0);
  const [hud, setHud] = useState({
    timeLeft: mode.duration,
    score: 0,
    hits: 0,
    misses: 0,
    combo: 0,
    bestCombo: 0,
    accuracy: 100,
    avgReaction: 0,
  });

  const arena = useMemo(() => getArenaPrefab(mode.arenaPrefab), [mode.arenaPrefab]);
  const spawnConfigRef = useRef(resolveSpawnConfig(mode));

  const enemiesRef = useRef([]);
  const enemyObjectsRef = useRef(new Map());
  const statsRef = useRef({ score: 0, shots: 0, hits: 0, misses: 0, expired: 0, combo: 0, bestCombo: 0, reactionTimes: [] });
  const timeRef = useRef({ remaining: mode.duration * 1000 });
  const pausedRef = useRef(false);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const controlsRef = useRef(null);
  const shooterRef = useRef(null);
  const shotCounterRef = useRef(0);
  const moveStateRef = useRef({ moving: false });
  const muzzleRef = useRef(new THREE.Vector3());
  const effectsApiRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const feedIdRef = useRef(0);

  const finishSession = useCallback(
    (completed) => {
      if (finishedRef.current) {
        return;
      }

      finishedRef.current = true;
      startedRef.current = false;
      document.exitPointerLock?.();

      const stats = statsRef.current;
      const elapsed = mode.duration - timeRef.current.remaining / 1000;

      onFinish({
        ...stats,
        completed,
        goalHits: mode.goalHits,
        timeSpent: Math.max(0, Number(elapsed.toFixed(1))),
      });
    },
    [mode.duration, mode.goalHits, onFinish],
  );

  const resetRun = useCallback(() => {
    enemiesRef.current = [];
    enemyObjectsRef.current.clear();
    statsRef.current = { score: 0, shots: 0, hits: 0, misses: 0, expired: 0, combo: 0, bestCombo: 0, reactionTimes: [] };
    timeRef.current = { remaining: mode.duration * 1000 };
    spawnConfigRef.current = resolveSpawnConfig(mode);
    finishedRef.current = false;
    startedRef.current = false;
    pausedRef.current = false;
    setEnemies([]);
    setFeed([]);
    setDamageNumbers([]);
    setHitMarker(null);
    setPaused(false);
    setStarted(false);
    setHud({ timeLeft: mode.duration, score: 0, hits: 0, misses: 0, combo: 0, bestCombo: 0, accuracy: 100, avgReaction: 0 });
    setRunKey((current) => current + 1);
  }, [mode]);

  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    resetRun();
  }, [resetRun]);

  // HUD atualiza em ritmo proprio, o loop 3D nunca depende do React
  useEffect(() => {
    const interval = window.setInterval(() => {
      const stats = statsRef.current;
      const accuracy = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 100;
      const avgReaction = stats.reactionTimes.length
        ? Math.round(stats.reactionTimes.reduce((sum, value) => sum + value, 0) / stats.reactionTimes.length)
        : 0;

      setHud({
        timeLeft: timeRef.current.remaining / 1000,
        score: stats.score,
        hits: stats.hits,
        misses: stats.misses,
        combo: stats.combo,
        bestCombo: stats.bestCombo,
        accuracy,
        avgReaction,
      });
    }, 70);

    return () => window.clearInterval(interval);
  }, []);

  const pushFeed = useCallback((label, value, tone) => {
    feedIdRef.current += 1;
    const id = feedIdRef.current;
    setFeed((current) => [{ id, label, value, tone }, ...current].slice(0, MAX_FEED));
    window.setTimeout(() => {
      setFeed((current) => current.filter((entry) => entry.id !== id));
    }, 2600);
  }, []);

  const pushDamageNumber = useCallback((label, tone) => {
    feedIdRef.current += 1;
    const id = feedIdRef.current;
    const entry = {
      id,
      label,
      tone,
      dx: Math.round(randomBetween(-46, 46)),
      dy: Math.round(randomBetween(-28, -10)),
    };

    setDamageNumbers((current) => [...current, entry].slice(-6));
    window.setTimeout(() => {
      setDamageNumbers((current) => current.filter((item) => item.id !== id));
    }, 850);
  }, []);

  const kickCamera = useCallback(() => {
    const node = canvasWrapRef.current;
    if (!node) {
      return;
    }

    node.classList.remove("arena__viewport--kick");
    // força o reflow para reiniciar a animação de recuo
    void node.offsetWidth;
    node.classList.add("arena__viewport--kick");
  }, []);

  const handleShot = useCallback(() => {
    if (!shooterRef.current || finishedRef.current || pausedRef.current || !startedRef.current) {
      return;
    }

    shotCounterRef.current += 1;
    kickCamera();
    setSpread(1);
    window.setTimeout(() => setSpread(0), 130);

    const shot = shooterRef.current();
    const stats = statsRef.current;
    const effects = effectsApiRef.current;

    if (effects && shot?.point) {
      effects.spawnTracer(muzzleRef.current.clone(), shot.point);
    }

    const registerMiss = (label) => {
      stats.shots += 1;
      stats.misses += 1;
      stats.combo = 0;
      setHitMarker({ tone: "miss", key: shotCounterRef.current });
      pushFeed(label, "", "miss");
    };

    if (!shot?.enemyId) {
      if (effects && shot?.point) {
        effects.spawnImpact(shot.point, shot.normal ?? new THREE.Vector3(0, 1, 0));
      }
      registerMiss("MISS");
      return;
    }

    const target = enemiesRef.current.find((enemy) => enemy.id === shot.enemyId);

    if (!target) {
      registerMiss("MISS");
      return;
    }

    const now = performance.now();
    const armed = now >= target.armedAt;
    const headshot = shot.hitZone === "head";
    const wrongZone = mode.requireHeadshot && !headshot;

    if (!armed || wrongZone) {
      if (effects) {
        effects.spawnImpact(shot.point, shot.normal ?? new THREE.Vector3(0, 1, 0));
      }
      registerMiss(wrongZone ? "CORPO" : "CEDO DEMAIS");
      return;
    }

    const reaction = now - target.armedAt;
    const nextCombo = stats.combo + 1;
    const points = computeScore(mode, reaction, nextCombo, headshot);

    stats.shots += 1;
    stats.hits += 1;
    stats.combo = nextCombo;
    stats.bestCombo = Math.max(stats.bestCombo, nextCombo);
    stats.score += points;
    stats.reactionTimes.push(Math.round(reaction));

    if (effects) {
      effects.spawnKill(new THREE.Vector3(target.x, target.y + 1.4, target.z), headshot);
    }

    setHitMarker({ tone: headshot ? "head" : "hit", key: shotCounterRef.current });
    pushDamageNumber(`+${points}`, headshot ? "head" : "hit");
    pushFeed(headshot ? "HEADSHOT" : "HIT", `+${points} · ${Math.round(reaction)}ms`, headshot ? "head" : "hit");

    enemiesRef.current = enemiesRef.current.filter((enemy) => enemy.id !== shot.enemyId);
    setEnemies(enemiesRef.current);

    if (stats.hits >= mode.goalHits) {
      finishSession(true);
    }
  }, [finishSession, kickCamera, mode, pushDamageNumber, pushFeed]);

  useEffect(() => {
    if (!hitMarker) {
      return undefined;
    }

    const timer = window.setTimeout(() => setHitMarker(null), 320);
    return () => window.clearTimeout(timer);
  }, [hitMarker]);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (event.button !== 0) {
        return;
      }

      if (document.pointerLockElement) {
        handleShot();
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [handleShot]);

  useEffect(() => {
    const onPointerLockChange = () => {
      const locked = Boolean(document.pointerLockElement);

      if (locked) {
        startedRef.current = true;
        pausedRef.current = false;
        setStarted(true);
        setPaused(false);
        return;
      }

      if (startedRef.current && !finishedRef.current) {
        pausedRef.current = true;
        setPaused(true);
      }
    };

    document.addEventListener("pointerlockchange", onPointerLockChange);
    return () => document.removeEventListener("pointerlockchange", onPointerLockChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === "KeyR" && !document.pointerLockElement) {
        event.preventDefault();
        resetRun();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resetRun]);

  const bindShooter = useCallback((fn) => {
    shooterRef.current = fn;
  }, []);

  const handleControlsReady = useCallback((controls) => {
    controlsRef.current = controls;
  }, []);

  const handleResume = useCallback(() => {
    controlsRef.current?.lock?.();
  }, []);

  return (
    <section className="arena-shell">
      <header className="arena-shell__header">
        <div>
          <span className="eyebrow">Sessão FPS 3D</span>
          <h2>{mode.name}</h2>
          {mode.ruleLabel ? <p className="arena__helper">Regra: {mode.ruleLabel}</p> : null}
        </div>
        <div className="arena-shell__actions">
          <button className="ghost-button" type="button" onClick={resetRun}>
            Reiniciar
          </button>
          <button className="ghost-button" type="button" onClick={onExit}>
            Encerrar
          </button>
        </div>
      </header>

      <div className="arena arena--3d-fps">
        <div ref={canvasWrapRef} className="arena__viewport">
          <Canvas
            key={runKey}
            shadows
            dpr={quality === "low" ? [1, 1.25] : [1, 2]}
            gl={{ antialias: quality === "low", powerPreference: "high-performance", stencil: false }}
            camera={{ fov: 95, near: 0.05, far: 400 }}
            className="arena__canvas"
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.08;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
            }}
          >
            <FpsScene
              mode={mode}
              arena={arena}
              enemies={enemies}
              paused={paused}
              quality={quality}
              sensitivity={settings.sensitivity}
              moveStateRef={moveStateRef}
              shotCounterRef={shotCounterRef}
              muzzleRef={muzzleRef}
              effectsApiRef={effectsApiRef}
              enemyObjectsRef={enemyObjectsRef}
              bindShooter={bindShooter}
              onControlsReady={handleControlsReady}
              pausedRef={pausedRef}
            >
              <GameLoop
                mode={mode}
                spawnConfigRef={spawnConfigRef}
                enemiesRef={enemiesRef}
                setEnemies={setEnemies}
                statsRef={statsRef}
                timeRef={timeRef}
                pausedRef={pausedRef}
                startedRef={startedRef}
                finishedRef={finishedRef}
                onTimeout={() => finishSession(false)}
              />
            </FpsScene>
          </Canvas>
        </div>

        <GameHud
          mode={mode}
          hud={hud}
          crosshair={crosshair}
          feed={settings.showFeed === false ? [] : feed}
          damageNumbers={damageNumbers}
          hitMarker={hitMarker}
          spread={spread}
          started={started}
          paused={paused}
          finished={finishedRef.current}
          nowPlaying={settings.showTrackInGame === false ? null : nowPlaying}
          sensitivity={settings.sensitivity}
          onSensitivityChange={onSensitivityChange}
          onResume={handleResume}
          onRestart={resetRun}
          onExit={onExit}
        />
      </div>
    </section>
  );
}