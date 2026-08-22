import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export const WORLD_LIMIT = 34;

const COLOR_ARMED_BODY = new THREE.Color("#e8451f");
const COLOR_IDLE_BODY = new THREE.Color("#31465f");
const COLOR_ARMED_CORE = new THREE.Color("#ffd07a");
const COLOR_IDLE_CORE = new THREE.Color("#2f5f8f");
const COLOR_HEAD_BONUS = new THREE.Color("#ffe08a");
const COLOR_HEAD_PLAIN = new THREE.Color("#dfe7f2");

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function createEnemy(mode, spawnConfig, now) {
  const anchor = spawnConfig.anchors[Math.floor(Math.random() * spawnConfig.anchors.length)] ?? {
    position: [0, 0, -22],
    height: 1.7,
  };
  const spread = spawnConfig.spread ?? 3;
  const baseX = THREE.MathUtils.clamp(anchor.position[0] + randomBetween(-spread, spread), -WORLD_LIMIT, WORLD_LIMIT);
  const baseZ = THREE.MathUtils.clamp(anchor.position[2] + randomBetween(-spread, spread), -WORLD_LIMIT, WORLD_LIMIT);
  const baseHeight = anchor.height ?? 1.7;

  return {
    id: `e${now.toFixed(0)}-${Math.random().toString(16).slice(2, 8)}`,
    bornAt: now,
    armedAt: now + (mode.activationDelay ?? 0),
    expiresAt: now + mode.targetLifetime,
    lifetime: mode.targetLifetime,
    x: baseX,
    y: baseHeight,
    z: baseZ,
    baseX,
    baseY: baseHeight,
    baseZ,
    angle: Math.atan2(baseZ, baseX),
    radius: Math.max(8, Math.sqrt(baseX * baseX + baseZ * baseZ)),
    direction: Math.random() > 0.5 ? 1 : -1,
    driftPhase: Math.random() * Math.PI * 2,
  };
}

/**
 * Atualiza a posicao do inimigo mutando o objeto (sem estado React por frame).
 */
export function updateEnemyMotion(enemy, mode, elapsedSeconds, deltaSeconds) {
  const lateral = (mode.strafeIntensity ?? 0) * 0.03;
  const forward = (mode.moveSpeed ?? 0) * 0.03;
  const vertical = (mode.verticalDrift ?? 0) * 0.02;
  let { x, y, z, angle, radius, direction } = enemy;

  switch (mode.pattern) {
    case "orbit": {
      angle += deltaSeconds * direction * (0.9 + (mode.moveSpeed ?? 0) * 0.003);
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
      z += Math.sin(elapsedSeconds * 6 + enemy.driftPhase) * lateral * 0.6 * deltaSeconds * 8;
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
      x += Math.cos(angle) * forward * pulse * deltaSeconds * 8;
      z += Math.sin(angle) * forward * pulse * deltaSeconds * 8;
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

  enemy.x = THREE.MathUtils.clamp(x, -WORLD_LIMIT, WORLD_LIMIT);
  enemy.y = THREE.MathUtils.clamp(y, 0.9, 4.6);
  enemy.z = THREE.MathUtils.clamp(z, -WORLD_LIMIT, WORLD_LIMIT);
  enemy.angle = angle;
  enemy.radius = radius;
  enemy.direction = direction;
}

export function Enemy({ enemy, mode, scale, requireHeadshot, registerEnemy, paused }) {
  const groupRef = useRef(null);
  const modelRef = useRef(null);
  const bodyMaterialRef = useRef(null);
  const coreMaterialRef = useRef(null);
  const headMaterialRef = useRef(null);
  const outlineRef = useRef(null);
  const ringRef = useRef(null);
  const lifeBarRef = useRef(null);
  const { camera } = useThree();

  const startClock = useRef(null);
  const workColor = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    if (!groupRef.current) {
      return undefined;
    }

    groupRef.current.position.set(enemy.x, enemy.y, enemy.z);
    groupRef.current.traverse((child) => {
      if (!child.userData.hitZone) {
        child.userData.enemyId = enemy.id;
      }
    });

    registerEnemy(enemy.id, groupRef.current);
    return () => registerEnemy(enemy.id, null);
  }, [enemy, registerEnemy]);

  useEffect(() => {
    startClock.current = null;
  }, [enemy.id]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const now = performance.now();
    const elapsed = state.clock.elapsedTime;

    if (!paused) {
      updateEnemyMotion(enemy, mode, elapsed, Math.min(0.05, delta));
    }

    group.position.set(enemy.x, enemy.y, enemy.z);
    group.lookAt(camera.position.x, enemy.y, camera.position.z);

    if (startClock.current === null) {
      startClock.current = now;
    }

    const spawnProgress = THREE.MathUtils.clamp((now - startClock.current) / 200, 0, 1);
    const pop = 1 + Math.sin(spawnProgress * Math.PI) * 0.18;

    if (modelRef.current) {
      modelRef.current.scale.setScalar(scale * spawnProgress * pop);
      modelRef.current.position.y = (1 - spawnProgress) * -0.6;
    }

    const armed = now >= enemy.armedAt;
    const pulse = armed ? 0.55 + Math.sin(elapsed * 7 + enemy.driftPhase) * 0.45 : 0.08;

    if (bodyMaterialRef.current) {
      workColor.copy(armed ? COLOR_ARMED_BODY : COLOR_IDLE_BODY);
      bodyMaterialRef.current.color.lerp(workColor, 0.25);
      bodyMaterialRef.current.emissiveIntensity = armed ? 0.28 + pulse * 0.25 : 0.05;
    }

    if (coreMaterialRef.current) {
      workColor.copy(armed ? COLOR_ARMED_CORE : COLOR_IDLE_CORE);
      coreMaterialRef.current.color.lerp(workColor, 0.3);
      coreMaterialRef.current.emissiveIntensity = armed ? 1.4 + pulse * 1.8 : 0.3;
    }

    if (headMaterialRef.current) {
      workColor.copy(requireHeadshot && armed ? COLOR_HEAD_BONUS : COLOR_HEAD_PLAIN);
      headMaterialRef.current.color.lerp(workColor, 0.25);
      headMaterialRef.current.emissiveIntensity = requireHeadshot && armed ? 0.7 + pulse * 0.6 : 0.05;
    }

    if (outlineRef.current) {
      outlineRef.current.material.opacity = armed ? 0.5 + pulse * 0.2 : 0.16;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = elapsed * (armed ? 1.6 : 0.4);
      ringRef.current.material.opacity = armed ? 0.55 : 0.2;
    }

    if (lifeBarRef.current) {
      const remaining = THREE.MathUtils.clamp((enemy.expiresAt - now) / enemy.lifetime, 0, 1);
      lifeBarRef.current.scale.x = Math.max(0.001, remaining);
      lifeBarRef.current.material.color.setRGB(1 - remaining * 0.6, 0.25 + remaining * 0.65, 0.28);
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={modelRef}>
        {/* contorno para leitura rapida do alvo */}
        <mesh ref={outlineRef} position={[0, 1.3, 0]} scale={1.07}>
          <capsuleGeometry args={[0.46, 1.35, 6, 14]} />
          <meshBasicMaterial color="#ffb488" transparent opacity={0.4} side={THREE.BackSide} depthWrite={false} />
        </mesh>

        <mesh castShadow position={[0, 1.3, 0]} userData={{ enemyId: enemy.id, hitZone: "body" }}>
          <capsuleGeometry args={[0.44, 1.3, 8, 20]} />
          <meshStandardMaterial ref={bodyMaterialRef} color="#31465f" emissive="#611c00" emissiveIntensity={0.2} roughness={0.42} metalness={0.35} />
        </mesh>

        <mesh position={[0, 1.62, 0.42]} userData={{ enemyId: enemy.id, hitZone: "body" }}>
          <sphereGeometry args={[0.19, 16, 16]} />
          <meshStandardMaterial ref={coreMaterialRef} color="#2f5f8f" emissive="#ffb45c" emissiveIntensity={1.2} roughness={0.2} />
        </mesh>

        <mesh castShadow position={[0, 2.42, 0]} userData={{ enemyId: enemy.id, hitZone: "head" }}>
          <sphereGeometry args={[0.33, 22, 22]} />
          <meshStandardMaterial ref={headMaterialRef} color="#dfe7f2" emissive="#7a5600" emissiveIntensity={0.1} roughness={0.5} metalness={0.2} />
        </mesh>

        <mesh position={[0, 2.44, 0.27]} userData={{ enemyId: enemy.id, hitZone: "head" }}>
          <boxGeometry args={[0.38, 0.12, 0.08]} />
          <meshStandardMaterial color="#0b1220" emissive="#4fd8ff" emissiveIntensity={1.5} roughness={0.15} />
        </mesh>

        {[-0.56, 0.56].map((x) => (
          <mesh key={x} castShadow position={[x, 1.72, 0]} userData={{ enemyId: enemy.id, hitZone: "body" }}>
            <sphereGeometry args={[0.2, 14, 14]} />
            <meshStandardMaterial color="#1d2634" roughness={0.4} metalness={0.55} />
          </mesh>
        ))}

        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
          <ringGeometry args={[0.62, 0.82, 28]} />
          <meshBasicMaterial color="#ff9a5c" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>

        <group position={[0, 3.02, 0]}>
          <mesh>
            <planeGeometry args={[0.92, 0.075]} />
            <meshBasicMaterial color="#0a0f18" transparent opacity={0.65} depthWrite={false} />
          </mesh>
          <mesh ref={lifeBarRef} position={[0, 0, 0.01]}>
            <planeGeometry args={[0.9, 0.055]} />
            <meshBasicMaterial color="#6ce5a0" transparent depthWrite={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}