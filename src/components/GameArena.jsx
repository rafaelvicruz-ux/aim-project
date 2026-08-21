import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Sparkles, Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getArenaPrefab, getSpawnPreset } from "../data/gameConfig";

const WORLD_LIMIT = 34;
const PLAYER_HEIGHT = 1.7;
const PLAYER_SPEED = 10;

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

function spawnEnemy(mode, now) {
  const spawnConfig = resolveSpawnConfig(mode);
  const anchor = spawnConfig.anchors[Math.floor(Math.random() * spawnConfig.anchors.length)] ?? {
    position: [0, 0, -22],
    height: 1.7,
  };
  const spread = spawnConfig.spread ?? 3;
  const baseX = anchor.position[0] + randomBetween(-spread, spread);
  const baseZ = anchor.position[2] + randomBetween(-spread, spread);
  const baseHeight = anchor.height ?? 1.7;
  const direction = Math.random() > 0.5 ? 1 : -1;
  const angle = Math.atan2(baseZ, baseX);
  const radius = Math.max(8, Math.sqrt(baseX * baseX + baseZ * baseZ));

  return {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    bornAt: now,
    armedAt: now + (mode.activationDelay ?? 0),
    expiresAt: now + mode.targetLifetime,
    x: baseX,
    y: baseHeight,
    z: baseZ,
    baseX,
    baseY: baseHeight,
    baseZ,
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
    y: THREE.MathUtils.clamp(y, 0.9, 4.2),
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

function WeaponViewModel({ shotPulse }) {
  const weaponRef = useRef(null);
  const flashRef = useRef(null);
  const { camera } = useThree();
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((_, delta) => {
    if (!weaponRef.current) {
      return;
    }

    camera.getWorldDirection(forward).normalize();
    right.crossVectors(forward, up).normalize();

    weaponRef.current.position.copy(camera.position);
    weaponRef.current.position.addScaledVector(forward, 0.7);
    weaponRef.current.position.addScaledVector(right, 0.24);
    weaponRef.current.position.y -= 0.26 - Math.sin(performance.now() * 0.01) * 0.015;
    weaponRef.current.quaternion.copy(camera.quaternion);
    weaponRef.current.rotation.x -= shotPulse * 0.06;
    weaponRef.current.rotation.y += Math.sin(performance.now() * 0.004) * 0.005;

    if (flashRef.current) {
      flashRef.current.material.opacity = Math.max(0, flashRef.current.material.opacity - delta * 8);
    }
  });

  useEffect(() => {
    if (flashRef.current && shotPulse > 0) {
      flashRef.current.material.opacity = 0.95;
    }
  }, [shotPulse]);

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
      <mesh ref={flashRef} position={[0.12, -0.01, -0.72]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshBasicMaterial color="#ffd27f" transparent opacity={0} />
      </mesh>
      <mesh position={[0.12, 0.05, -0.32]} castShadow>
        <boxGeometry args={[0.08, 0.05, 0.14]} />
        <meshStandardMaterial color="#0f131b" metalness={0.72} roughness={0.22} />
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

function Enemy({ enemy, registerEnemy, scale, requireHeadshot }) {
  const groupRef = useRef(null);
  const isArmed = performance.now() >= enemy.armedAt;
  const bodyColor = isArmed ? "#ff6d3a" : "#4f6588";
  const bodyEmissive = isArmed ? "#3a0f00" : "#0c1b35";
  const headColor = requireHeadshot ? (isArmed ? "#ffe082" : "#6d7f95") : "#ffd4b8";

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
    <group ref={groupRef} position={[enemy.x, enemy.y, enemy.z]} scale={scale}>
      <mesh castShadow position={[0, 1.2, 0]} userData={{ enemyId: enemy.id, hitZone: "body" }}>
        <capsuleGeometry args={[0.45, 1.3, 6, 12]} />
        <meshStandardMaterial color={bodyColor} emissive={bodyEmissive} emissiveIntensity={0.35} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh castShadow position={[0, 2.35, 0]} userData={{ enemyId: enemy.id, hitZone: "head" }}>
        <sphereGeometry args={[0.34, 18, 18]} />
        <meshStandardMaterial color={headColor} roughness={0.9} emissive={requireHeadshot && isArmed ? "#7a5600" : "#000000"} emissiveIntensity={requireHeadshot ? 0.22 : 0} />
      </mesh>
      <mesh castShadow position={[0.35, 1.25, 0.18]} rotation={[0.2, 0.4, 0]} userData={{ enemyId: enemy.id, hitZone: "body" }}>
        <boxGeometry args={[0.18, 0.18, 0.8]} />
        <meshStandardMaterial color="#26324a" metalness={0.35} roughness={0.32} />
      </mesh>
    </group>
  );
}

function Obstacle({ obstacle }) {
  if (obstacle.type === "trash-can") {
    return (
      <group position={obstacle.position} rotation={obstacle.rotation ?? [0, 0, 0]} scale={obstacle.scale ?? 1}>
        <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.5, 0.58, 1.7, 18]} />
          <meshStandardMaterial color="#586271" metalness={0.45} roughness={0.48} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 1.84, 0]}>
          <cylinderGeometry args={[0.56, 0.56, 0.12, 18]} />
          <meshStandardMaterial color="#2a3340" metalness={0.38} roughness={0.4} />
        </mesh>
      </group>
    );
  }

  if (obstacle.type === "truck") {
    return (
      <group position={obstacle.position} rotation={obstacle.rotation ?? [0, 0, 0]} scale={obstacle.scale ?? 1}>
        <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
          <boxGeometry args={[4.8, 1.8, 2.2]} />
          <meshStandardMaterial color="#b53c28" metalness={0.32} roughness={0.45} />
        </mesh>
        <mesh castShadow receiveShadow position={[1.75, 1.3, 0]}>
          <boxGeometry args={[1.6, 2.1, 2]} />
          <meshStandardMaterial color="#d96c2f" metalness={0.22} roughness={0.4} />
        </mesh>
        {[
          [-1.5, 0.45, 1.05],
          [-1.5, 0.45, -1.05],
          [1.4, 0.45, 1.05],
          [1.4, 0.45, -1.05],
        ].map((wheel, index) => (
          <mesh key={index} castShadow receiveShadow position={wheel} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.35, 18]} />
            <meshStandardMaterial color="#171b22" metalness={0.25} roughness={0.7} />
          </mesh>
        ))}
      </group>
    );
  }

  if (obstacle.type === "rock") {
    return (
      <mesh castShadow receiveShadow position={obstacle.position} rotation={obstacle.rotation ?? [0, 0, 0]} scale={obstacle.scale ?? 1}>
        <dodecahedronGeometry args={[1.3, 0]} />
        <meshStandardMaterial color="#73706b" roughness={0.96} metalness={0.06} />
      </mesh>
    );
  }

  return (
    <group position={obstacle.position} rotation={obstacle.rotation ?? [0, 0, 0]} scale={obstacle.scale ?? 1}>
      <mesh castShadow receiveShadow position={[0, 0.85, 0]}>
        <boxGeometry args={[1.8, 0.15, 1.2]} />
        <meshStandardMaterial color="#7e5739" roughness={0.82} />
      </mesh>
      {[
        [-0.75, 0.38, -0.45],
        [0.75, 0.38, -0.45],
        [-0.75, 0.38, 0.45],
        [0.75, 0.38, 0.45],
      ].map((leg, index) => (
        <mesh key={index} castShadow receiveShadow position={leg}>
          <boxGeometry args={[0.12, 0.8, 0.12]} />
          <meshStandardMaterial color="#4c3522" roughness={0.88} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[-1.1, 0.55, 0]}>
        <boxGeometry args={[0.5, 1.1, 0.5]} />
        <meshStandardMaterial color="#8d684b" roughness={0.84} />
      </mesh>
      <mesh castShadow receiveShadow position={[-1.1, 1.15, -0.15]} rotation={[0.22, 0, 0]}>
        <boxGeometry args={[0.5, 0.8, 0.1]} />
        <meshStandardMaterial color="#8d684b" roughness={0.84} />
      </mesh>
    </group>
  );
}

function HitBurst({ burst }) {
  return (
    <group position={[burst.x, burst.y + 1.2, burst.z]}>
      <mesh scale={0.4 + burst.life * 1.4}>
        <sphereGeometry args={[0.28, 10, 10]} />
        <meshBasicMaterial color="#ffd27f" transparent opacity={burst.life} />
      </mesh>
    </group>
  );
}

function EnergyRing({ accentColor }) {
  const ringRef = useRef(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) {
      return;
    }

    ringRef.current.rotation.z = clock.elapsedTime * 0.16;
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <ringGeometry args={[19, 19.45, 64]} />
      <meshBasicMaterial color={accentColor} transparent opacity={0.16} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ArenaProps({ arenaPrefab }) {
  if (arenaPrefab === "dock-lanes") {
    return (
      <>
        {[-18, 18].map((x) => (
          <mesh key={`dock-wall-${x}`} position={[x, 2.4, -6]} castShadow receiveShadow>
            <boxGeometry args={[2.8, 4.8, 16]} />
            <meshStandardMaterial color="#2d374d" metalness={0.18} roughness={0.76} />
          </mesh>
        ))}
        <mesh position={[0, 1.2, 12]} castShadow receiveShadow>
          <boxGeometry args={[14, 2.4, 3]} />
          <meshStandardMaterial color="#253247" roughness={0.72} />
        </mesh>
      </>
    );
  }

  if (arenaPrefab === "vertical-core") {
    return (
      <>
        {[-14, 0, 14].map((x) => (
          <mesh key={`tower-${x}`} position={[x, 5.4, -10]} castShadow receiveShadow>
            <cylinderGeometry args={[1.8, 1.8, 10.8, 20]} />
            <meshStandardMaterial color="#1d2b45" metalness={0.28} roughness={0.68} />
          </mesh>
        ))}
        <mesh position={[0, 2.8, 16]} castShadow receiveShadow>
          <boxGeometry args={[10, 5.6, 2.5]} />
          <meshStandardMaterial color="#22314b" roughness={0.74} />
        </mesh>
      </>
    );
  }

  if (arenaPrefab === "crossfire-yard") {
    return (
      <>
        <mesh position={[0, 1.5, -8]} castShadow receiveShadow>
          <boxGeometry args={[6.5, 3, 6.5]} />
          <meshStandardMaterial color="#26364f" roughness={0.78} />
        </mesh>
        {[-18, 18].map((x) => (
          <mesh key={`cross-box-${x}`} position={[x, 1.2, 12]} castShadow receiveShadow>
            <boxGeometry args={[4, 2.4, 4]} />
            <meshStandardMaterial color="#33445c" roughness={0.72} />
          </mesh>
        ))}
      </>
    );
  }

  return (
    <>
      {[-20, 0, 20].map((x) => (
        <mesh key={`pillar-${x}`} position={[x, 3.2, -22]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 6.4, 2.2]} />
          <meshStandardMaterial color="#1a2333" metalness={0.2} roughness={0.82} />
        </mesh>
      ))}
      {[-14, 14].map((z) => (
        <mesh key={`crate-${z}`} position={[16, 1.2, z]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 2.4, 2.4]} />
          <meshStandardMaterial color="#2d374d" metalness={0.22} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[-18, 1.5, 12]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.3, 3.2, 18]} />
        <meshStandardMaterial color="#202e47" metalness={0.3} roughness={0.66} />
      </mesh>
    </>
  );
}

function FpsScene({ enemies, bursts, obstacles, bindShooter, mode, sensitivity, shotPulse }) {
  const enemyObjectsRef = useRef(new Map());
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);
  const arenaStyle = getArenaPrefab(mode.arenaPrefab);
  const enemyScale = Math.max(0.55, (mode.targetSize ?? 40) / 40);

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

      if (!hit) {
        return null;
      }

      return {
        enemyId: hit.object.userData.enemyId,
        hitZone: hit.object.userData.hitZone ?? "body",
      };
    };

    bindShooter(shoot);
    return () => bindShooter(null);
  }, [bindShooter, camera, center, raycaster]);

  return (
    <>
      <color attach="background" args={["#05070d"]} />
      <fog attach="fog" args={["#070b14", 22, 76]} />
      <Stars radius={120} depth={42} count={2000} factor={4} saturation={0} fade speed={0.5} />
      <Sparkles count={36} scale={[80, 20, 80]} size={4} speed={0.35} color={arenaStyle.accentColor} />
      <EnergyRing accentColor={arenaStyle.accentColor} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[8, 16, 6]} intensity={1.55} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <spotLight position={[-10, 18, -6]} intensity={42} angle={0.35} penumbra={0.5} color={arenaStyle.accentColor} />
      <pointLight position={[0, 6, -14]} intensity={14} color="#ff7d2d" distance={20} />
      <pointLight position={[0, 8, 18]} intensity={10} color="#65b4ff" distance={24} />
      <PlayerRig speed={PLAYER_SPEED + mode.moveSpeed * 0.01} sensitivity={sensitivity} />
      <WeaponViewModel shotPulse={shotPulse} />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[90, 90, 30, 30]} />
        <meshStandardMaterial color={arenaStyle.floorColor} roughness={0.95} metalness={0.05} />
      </mesh>

      <gridHelper args={[90, 45, arenaStyle.accentColor, "#233148"]} position={[0, 0.01, 0]} />

      <mesh position={[0, 16, -38]} receiveShadow>
        <boxGeometry args={[90, 32, 2]} />
        <meshStandardMaterial color={arenaStyle.wallColor} emissive="#12253e" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[38, 12, 0]} receiveShadow>
        <boxGeometry args={[2, 24, 90]} />
        <meshStandardMaterial color={arenaStyle.wallColor} />
      </mesh>
      <mesh position={[-38, 12, 0]} receiveShadow>
        <boxGeometry args={[2, 24, 90]} />
        <meshStandardMaterial color={arenaStyle.wallColor} />
      </mesh>

      <ArenaProps arenaPrefab={mode.arenaPrefab} />
      {obstacles.map((obstacle) => (
        <Obstacle key={obstacle.id} obstacle={obstacle} />
      ))}
      {enemies.map((enemy) => (
        <Enemy key={enemy.id} enemy={enemy} registerEnemy={registerEnemy} scale={enemyScale} requireHeadshot={mode.requireHeadshot} />
      ))}
      {bursts.map((burst) => (
        <HitBurst key={burst.id} burst={burst} />
      ))}
    </>
  );
}

export function GameArena({ mode, settings, onFinish, onExit }) {
  const [timeLeft, setTimeLeft] = useState(mode.duration);
  const [enemies, setEnemies] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [shotPulse, setShotPulse] = useState(0);
  const [hitMarker, setHitMarker] = useState(null);
  const [stats, setStats] = useState({ score: 0, shots: 0, hits: 0, misses: 0, combo: 0, bestCombo: 0, reactionTimes: [] });

  const lastSpawnAtRef = useRef(0);
  const rafRef = useRef(0);
  const startAtRef = useRef(performance.now());
  const endAtRef = useRef(startAtRef.current + mode.duration * 1000);
  const previousTickRef = useRef(startAtRef.current);
  const finishedRef = useRef(false);
  const statsRef = useRef(stats);
  const shooterRef = useRef(null);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    if (!shotPulse) {
      return undefined;
    }

    const timer = window.setTimeout(() => setShotPulse(0), 90);
    return () => window.clearTimeout(timer);
  }, [shotPulse]);

  useEffect(() => {
    if (!hitMarker) {
      return undefined;
    }

    const timer = window.setTimeout(() => setHitMarker(null), 380);
    return () => window.clearTimeout(timer);
  }, [hitMarker]);

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
      const deltaSeconds = Math.min(0.05, (now - previousTickRef.current) / 1000);
      previousTickRef.current = now;
      setTimeLeft(Number((remainingMs / 1000).toFixed(1)));

      setEnemies((currentEnemies) => {
        let nextEnemies = currentEnemies
          .filter((enemy) => enemy.expiresAt > now)
          .map((enemy) => updateEnemy(enemy, mode, elapsedSeconds, deltaSeconds));

        while (
          now - lastSpawnAtRef.current >= mode.spawnRate &&
          nextEnemies.length < mode.simultaneousTargets &&
          remainingMs > 0 &&
          statsRef.current.hits < mode.goalHits
        ) {
          lastSpawnAtRef.current += mode.spawnRate;
          nextEnemies = [...nextEnemies, spawnEnemy(mode, now)];
        }

        return nextEnemies;
      });

      setBursts((currentBursts) => currentBursts.map((burst) => ({ ...burst, life: burst.life - 1 / 20 })).filter((burst) => burst.life > 0));

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

      setShotPulse(1);
      const shot = shooterRef.current();

      if (!shot?.enemyId) {
        setHitMarker({ label: "MISS", tone: "miss" });
        setStats((currentStats) => ({ ...currentStats, shots: currentStats.shots + 1, misses: currentStats.misses + 1, combo: 0 }));
        return;
      }

      setEnemies((currentEnemies) => {
        const target = currentEnemies.find((enemy) => enemy.id === shot.enemyId);
        if (!target) {
          return currentEnemies;
        }

        const isArmed = performance.now() >= target.armedAt;
        const wrongZone = mode.requireHeadshot && shot.hitZone !== "head";

        if (!isArmed || wrongZone) {
          setHitMarker({ label: wrongZone ? "BODY" : "EARLY", tone: "miss" });
          setStats((currentStats) => ({
            ...currentStats,
            shots: currentStats.shots + 1,
            misses: currentStats.misses + 1,
            combo: 0,
          }));
          return currentEnemies;
        }

        const reaction = performance.now() - target.armedAt;
        setHitMarker({ label: shot.hitZone === "head" ? "HEADSHOT" : "HIT", tone: shot.hitZone === "head" ? "head" : "hit" });
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

        setBursts((currentBursts) => [...currentBursts, { id: `${shot.enemyId}-burst`, x: target.x, y: target.y, z: target.z, life: 1 }]);
        return currentEnemies.filter((enemy) => enemy.id !== shot.enemyId);
      });
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [mode]);

  const accuracy = useMemo(() => (stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 100), [stats.hits, stats.shots]);
  const avgReaction = useMemo(
    () =>
      stats.reactionTimes.length
        ? Math.round(stats.reactionTimes.reduce((sum, value) => sum + value, 0) / stats.reactionTimes.length)
        : 0,
    [stats.reactionTimes],
  );
  const pressureLevel = useMemo(() => {
    if (accuracy >= 85) {
      return "Laser";
    }
    if (accuracy >= 65) {
      return "Locked";
    }
    if (accuracy >= 45) {
      return "Stable";
    }
    return "Warmup";
  }, [accuracy]);

  return (
    <section className="arena-shell">
      <header className="arena-shell__header">
        <div>
          <span className="eyebrow">Real 3D FPS Session</span>
          <h2>{mode.name}</h2>
          {mode.ruleLabel ? <p className="arena__helper">Regra: {mode.ruleLabel}</p> : null}
        </div>
        <button className="ghost-button" onClick={onExit}>
          Encerrar
        </button>
      </header>

      <div className="arena-shell__hud">
        <article><span>Tempo</span><strong>{timeLeft}s</strong></article>
        <article><span>Acertos</span><strong>{stats.hits}/{mode.goalHits}</strong></article>
        <article><span>Precisão</span><strong>{accuracy}%</strong></article>
        <article><span>Score</span><strong>{stats.score}</strong></article>
        <article><span>Combo</span><strong>x{stats.combo}</strong></article>
        <article><span>Sens</span><strong>{settings.sensitivity.toFixed(2)}x</strong></article>
        <article><span>Reação</span><strong>{avgReaction ? `${avgReaction}ms` : "--"}</strong></article>
        <article><span>Estado</span><strong>{pressureLevel}</strong></article>
      </div>

      <div className="arena arena--3d-fps">
        <Canvas shadows dpr={[1, 1.8]} gl={{ antialias: true }} camera={{ fov: 75, near: 0.1, far: 150 }} className="arena__canvas">
          <FpsScene
            enemies={enemies}
            bursts={bursts}
            obstacles={mode.obstacles ?? []}
            mode={mode}
            sensitivity={settings.sensitivity}
            shotPulse={shotPulse}
            bindShooter={(fn) => {
              shooterRef.current = fn;
            }}
          />
        </Canvas>
        <div className={shotPulse ? "crosshair crosshair--fps crosshair--active" : "crosshair crosshair--fps"} />
        {hitMarker ? <div className={`hit-marker hit-marker--${hitMarker.tone}`}>{hitMarker.label}</div> : null}
        <div className="arena__chrome" />
        <div className="arena__metrics">
          <span>{mode.category ?? "Custom"}</span>
          <span>{mode.pattern}</span>
          <span>{mode.scoring}</span>
        </div>
        <div className="arena__overlay">
          <button id="fps-lock-button" className="primary-button" type="button">Entrar no mapa</button>
          <p className="arena__helper">WASD para mover, mouse para mirar, clique para atirar.</p>
        </div>
      </div>
    </section>
  );
}

