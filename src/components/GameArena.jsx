import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const WORLD_LIMIT = 34;
const PLAYER_HEIGHT = 1.7;
const PLAYER_SPEED = 10;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function spawnEnemy(mode, now) {
  const angle = Math.random() * Math.PI * 2;
  const radius = randomBetween(10, 28);
  const baseHeight = randomBetween(1.1, 2.2);
  const direction = Math.random() > 0.5 ? 1 : -1;

  return {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    bornAt: now,
    expiresAt: now + mode.targetLifetime,
    x: Math.cos(angle) * radius,
    y: baseHeight,
    z: Math.sin(angle) * radius,
    baseX: Math.cos(angle) * radius,
    baseY: baseHeight,
    baseZ: Math.sin(angle) * radius,
    angle,
    radius,
    direction,
    driftPhase: Math.random() * Math.PI * 2,
  };
}

function updateEnemy(enemy, mode, elapsedSeconds, deltaSeconds) {
  const lateral = mode.strafeIntensity * 0.03;
  const forward = mode.moveSpeed * 0.03;
  const vertical = mode.verticalDrift * 0.02;
  let { x, y, z, angle, radius, direction } = enemy;

  switch (mode.pattern) {
    case "orbit": {
      angle += deltaSeconds * direction * (0.9 + mode.moveSpeed * 0.003);
      radius += Math.sin(elapsedSeconds * 2 + enemy.driftPhase) * 0.02;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      y = enemy.baseY + Math.sin(elapsedSeconds * 3 + enemy.driftPhase) * 0.6;
      break;
    }
    case "lane-sweep": {
      x += direction * forward * deltaSeconds * 18;
      z = enemy.baseZ + Math.sin(elapsedSeconds * 1.8 + enemy.driftPhase) * lateral;
      y = enemy.baseY + Math.cos(elapsedSeconds * 2.4 + enemy.driftPhase) * 0.25;
      if (x > WORLD_LIMIT || x < -WORLD_LIMIT) {
        direction *= -1;
      }
      break;
    }
    case "zigzag": {
      x += direction * forward * deltaSeconds * 13;
      z += Math.sin(elapsedSeconds * 6 + enemy.driftPhase) * lateral * 0.6;
      y = enemy.baseY + Math.sin(elapsedSeconds * 4.5 + enemy.driftPhase) * 0.35;
      if (x > WORLD_LIMIT || x < -WORLD_LIMIT) {
        direction *= -1;
      }
      break;
    }
    case "tower": {
      x = enemy.baseX + Math.cos(elapsedSeconds * 2 + enemy.driftPhase) * lateral * 0.4;
      z = enemy.baseZ + Math.sin(elapsedSeconds * 1.3 + enemy.driftPhase) * lateral * 0.45;
      y = enemy.baseY + Math.sin(elapsedSeconds * 4.2 + enemy.driftPhase) * (0.8 + vertical * 0.02);
      break;
    }
    case "burst": {
      const pulse = 1 + Math.sin(elapsedSeconds * 5 + enemy.driftPhase) * 0.55;
      x += Math.cos(enemy.angle) * forward * pulse * deltaSeconds * 8;
      z += Math.sin(enemy.angle) * forward * pulse * deltaSeconds * 8;
      y = enemy.baseY + Math.sin(elapsedSeconds * 4 + enemy.driftPhase) * 0.28;
      if (Math.abs(x) > WORLD_LIMIT || Math.abs(z) > WORLD_LIMIT) {
        angle += Math.PI;
      }
      break;
    }
    case "depth-pop":
    default: {
      const depthWave = Math.sin(elapsedSeconds * 3 + enemy.driftPhase);
      x = enemy.baseX + Math.cos(elapsedSeconds * 2.2 + enemy.driftPhase) * lateral * 0.6;
      z = enemy.baseZ + depthWave * (3 + forward * 0.12);
      y = enemy.baseY + Math.sin(elapsedSeconds * 2.5 + enemy.driftPhase) * 0.4;
      break;
    }
  }

  return {
    ...enemy,
    x: THREE.MathUtils.clamp(x, -WORLD_LIMIT, WORLD_LIMIT),
    y: THREE.MathUtils.clamp(y, 0.9, 4),
    z: THREE.MathUtils.clamp(z, -WORLD_LIMIT, WORLD_LIMIT),
    angle,
    radius,
    direction,
  };
}

function computeScore(mode, reaction, combo) {
  const reactionBonus = Math.max(25, 260 - Math.floor(reaction / 8));

  if (mode.scoring === "combo") {
    return 100 + reactionBonus + combo * 18;
  }

  if (mode.scoring === "tracking") {
    return 115 + Math.floor(reactionBonus * 0.8) + combo * 8;
  }

  return 110 + reactionBonus;
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

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return keysRef;
}

function WeaponViewModel() {
  const weaponRef = useRef(null);
  const { camera } = useThree();
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame(() => {
    if (!weaponRef.current) {
      return;
    }

    camera.getWorldDirection(forward).normalize();
    right.crossVectors(forward, up).normalize();

    weaponRef.current.position.copy(camera.position);
    weaponRef.current.position.addScaledVector(forward, 0.7);
    weaponRef.current.position.addScaledVector(right, 0.24);
    weaponRef.current.position.y -= 0.26;
    weaponRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={weaponRef}>
      <mesh position={[0.12, -0.08, -0.25]} castShadow>
        <boxGeometry args={[0.18, 0.18, 0.42]} />
        <meshStandardMaterial color="#2a3348" metalness={0.55} roughness={0.3} />
      </mesh>
      <mesh position={[0.12, -0.01, -0.48]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 16]} />
        <meshStandardMaterial color="#ff8f32" emissive="#8a3f00" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function PlayerRig({ speed, sensitivity }) {
  const controlsRef = useRef(null);
  const keysRef = usePressedKeys();
  const { camera } = useThree();
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const move = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 16);
  }, [camera]);

  useFrame((_, delta) => {
    const keys = keysRef.current;
    const front = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const side = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);

    move.set(0, 0, 0);

    if (front || side) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, camera.up).normalize();
      move.addScaledVector(forward, front);
      move.addScaledVector(right, side);
      move.normalize().multiplyScalar(speed * delta);
      camera.position.add(move);
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -WORLD_LIMIT + 2, WORLD_LIMIT - 2);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -WORLD_LIMIT + 2, WORLD_LIMIT - 2);
    }

    camera.position.y = PLAYER_HEIGHT;
  });

  return <PointerLockControls ref={controlsRef} selector="#fps-lock-button" pointerSpeed={sensitivity} />;
}

function Enemy({ enemy, registerEnemy }) {
  const groupRef = useRef(null);

  useEffect(() => {
    if (!groupRef.current) {
      return undefined;
    }

    groupRef.current.traverse((child) => {
      child.userData.enemyId = enemy.id;
    });

    registerEnemy(enemy.id, groupRef.current);

    return () => registerEnemy(enemy.id, null);
  }, [enemy.id, registerEnemy]);

  return (
    <group ref={groupRef} position={[enemy.x, enemy.y, enemy.z]}>
      <mesh castShadow position={[0, 1.2, 0]}>
        <capsuleGeometry args={[0.45, 1.3, 6, 12]} />
        <meshStandardMaterial color="#ff6d3a" roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh castShadow position={[0, 2.35, 0]}>
        <sphereGeometry args={[0.34, 18, 18]} />
        <meshStandardMaterial color="#ffd4b8" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.35, 1.25, 0.18]} rotation={[0.2, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.8]} />
        <meshStandardMaterial color="#26324a" metalness={0.35} roughness={0.32} />
      </mesh>
    </group>
  );
}

function FpsScene({ enemies, bindShooter, moveSpeed, sensitivity }) {
  const enemyObjectsRef = useRef(new Map());
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);

  const registerEnemy = (id, object) => {
    if (object) {
      enemyObjectsRef.current.set(id, object);
    } else {
      enemyObjectsRef.current.delete(id);
    }
  };

  useEffect(() => {
    const shoot = () => {
      if (!document.pointerLockElement) {
        return null;
      }

      const roots = Array.from(enemyObjectsRef.current.values());
      if (!roots.length) {
        return null;
      }

      raycaster.setFromCamera(center, camera);
      const intersections = raycaster.intersectObjects(roots, true);
      const hit = intersections.find((entry) => entry.object.userData.enemyId);
      return hit ? hit.object.userData.enemyId : null;
    };

    bindShooter(shoot);
    return () => bindShooter(null);
  }, [bindShooter, camera, center, raycaster]);

  return (
    <>
      <color attach="background" args={["#070b14"]} />
      <fog attach="fog" args={["#070b14", 20, 70]} />
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[8, 16, 6]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight position={[-10, 18, -6]} intensity={38} angle={0.35} penumbra={0.5} color="#76b6ff" />
      <PlayerRig speed={PLAYER_SPEED + moveSpeed * 0.01} sensitivity={sensitivity} />
      <WeaponViewModel />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[90, 90, 30, 30]} />
        <meshStandardMaterial color="#121c2d" roughness={0.95} metalness={0.05} />
      </mesh>

      <gridHelper args={[90, 45, "#2d6cff", "#233148"]} position={[0, 0.01, 0]} />

      <mesh position={[0, 16, -38]} receiveShadow>
        <boxGeometry args={[90, 32, 2]} />
        <meshStandardMaterial color="#0d1526" emissive="#12253e" emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[38, 12, 0]} receiveShadow>
        <boxGeometry args={[2, 24, 90]} />
        <meshStandardMaterial color="#0d1526" />
      </mesh>
      <mesh position={[-38, 12, 0]} receiveShadow>
        <boxGeometry args={[2, 24, 90]} />
        <meshStandardMaterial color="#0d1526" />
      </mesh>

      {enemies.map((enemy) => (
        <Enemy key={enemy.id} enemy={enemy} registerEnemy={registerEnemy} />
      ))}
    </>
  );
}

export function GameArena({ mode, settings, onFinish, onExit }) {
  const [timeLeft, setTimeLeft] = useState(mode.duration);
  const [enemies, setEnemies] = useState([]);
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
  const startAtRef = useRef(performance.now());
  const endAtRef = useRef(startAtRef.current + mode.duration * 1000);
  const finishedRef = useRef(false);
  const statsRef = useRef(stats);
  const shooterRef = useRef(null);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    const finalize = (completed, remainingMs) => {
      if (finishedRef.current) {
        return;
      }

      finishedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      const finalStats = statsRef.current;
      const elapsed = mode.duration - remainingMs / 1000;

      onFinish({
        ...finalStats,
        completed,
        goalHits: mode.goalHits,
        timeSpent: Math.max(0, Number(elapsed.toFixed(1))),
      });
    };

    const tick = (now) => {
      const remainingMs = Math.max(0, endAtRef.current - now);
      const elapsedSeconds = (now - startAtRef.current) / 1000;
      setTimeLeft(Number((remainingMs / 1000).toFixed(1)));

      setEnemies((currentEnemies) => {
        let nextEnemies = currentEnemies
          .filter((enemy) => enemy.expiresAt > now)
          .map((enemy) => updateEnemy(enemy, mode, elapsedSeconds, 1 / 60));

        const shouldSpawn =
          now - lastSpawnAtRef.current >= mode.spawnRate &&
          nextEnemies.length < mode.simultaneousTargets &&
          remainingMs > 0 &&
          statsRef.current.hits < mode.goalHits;

        if (shouldSpawn) {
          lastSpawnAtRef.current = now;
          nextEnemies = [...nextEnemies, spawnEnemy(mode, now)];
        }

        return nextEnemies;
      });

      if (statsRef.current.hits >= mode.goalHits) {
        finalize(true, remainingMs);
        return;
      }

      if (remainingMs <= 0) {
        finalize(false, remainingMs);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, onFinish]);

  useEffect(() => {
    const handleMouseDown = () => {
      if (!shooterRef.current || finishedRef.current) {
        return;
      }

      const enemyId = shooterRef.current();

      if (!enemyId) {
        setStats((currentStats) => ({
          ...currentStats,
          shots: currentStats.shots + 1,
          misses: currentStats.misses + 1,
          combo: 0,
        }));
        return;
      }

      setEnemies((currentEnemies) => {
        const target = currentEnemies.find((enemy) => enemy.id === enemyId);
        if (!target) {
          return currentEnemies;
        }

        const reaction = performance.now() - target.bornAt;
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

        return currentEnemies.filter((enemy) => enemy.id !== enemyId);
      });
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [mode]);

  const accuracy = useMemo(() => {
    if (!stats.shots) {
      return 100;
    }

    return Math.round((stats.hits / stats.shots) * 100);
  }, [stats.hits, stats.shots]);

  return (
    <section className="arena-shell">
      <header className="arena-shell__header">
        <div>
          <span className="eyebrow">Real 3D FPS Session</span>
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
          <span>Acertos</span>
          <strong>{stats.hits}/{mode.goalHits}</strong>
        </article>
        <article>
          <span>Precisão</span>
          <strong>{accuracy}%</strong>
        </article>
        <article>
          <span>Score</span>
          <strong>{stats.score}</strong>
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

      <div className="arena arena--3d-fps">
        <Canvas shadows camera={{ fov: 75, near: 0.1, far: 150 }} className="arena__canvas">
          <FpsScene
            enemies={enemies}
            moveSpeed={mode.moveSpeed}
            sensitivity={settings.sensitivity}
            bindShooter={(fn) => {
              shooterRef.current = fn;
            }}
          />
        </Canvas>
        <div className="crosshair crosshair--fps" />
        <div className="arena__overlay">
          <button id="fps-lock-button" className="primary-button" type="button">
            Entrar no mapa
          </button>
          <p className="arena__helper">WASD para mover, mouse para mirar, clique para atirar.</p>
        </div>
      </div>
    </section>
  );
}
