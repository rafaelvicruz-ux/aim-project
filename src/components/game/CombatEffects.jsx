import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createGlowTexture } from "../../lib/textures";

const TRACER_COUNT = 14;
const IMPACT_COUNT = 18;
const BURST_COUNT = 8;
const SPARKS_PER_BURST = 10;

const TRACER_LIFE = 0.09;
const IMPACT_LIFE = 0.42;
const BURST_LIFE = 0.6;

function createSlots(count, extra = () => ({})) {
  return Array.from({ length: count }, () => ({ life: 0, ...extra() }));
}

/**
 * Pool imperativa de VFX: tracer do disparo, faisca de impacto e explosao do alvo.
 * Tudo e reciclado, sem alocacao por tiro e sem re-render do React.
 */
export function CombatEffects({ apiRef, accentColor = "#ff8a3d" }) {
  const glowTexture = useMemo(() => createGlowTexture(), []);

  const tracerRefs = useRef([]);
  const impactRefs = useRef([]);
  const burstRefs = useRef([]);

  const tracers = useMemo(() => createSlots(TRACER_COUNT), []);
  const impacts = useMemo(
    () =>
      createSlots(IMPACT_COUNT, () => ({
        sparkDirections: Array.from({ length: 5 }, () =>
          new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize(),
        ),
      })),
    [],
  );
  const bursts = useMemo(
    () =>
      createSlots(BURST_COUNT, () => ({
        headshot: false,
        sparkDirections: Array.from({ length: SPARKS_PER_BURST }, () =>
          new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.35, Math.random() - 0.5).normalize(),
        ),
      })),
    [],
  );

  const cursorTracer = useRef(0);
  const cursorImpact = useRef(0);
  const cursorBurst = useRef(0);

  useEffect(() => {
    apiRef.current = {
      spawnTracer(from, to) {
        const index = cursorTracer.current;
        cursorTracer.current = (index + 1) % TRACER_COUNT;
        const group = tracerRefs.current[index];
        if (!group) {
          return;
        }

        const distance = from.distanceTo(to);
        group.position.copy(from).lerp(to, 0.5);
        group.lookAt(to);
        group.scale.set(1, 1, Math.max(0.1, distance));
        tracers[index].life = TRACER_LIFE;
      },
      spawnImpact(point, normal) {
        const index = cursorImpact.current;
        cursorImpact.current = (index + 1) % IMPACT_COUNT;
        const group = impactRefs.current[index];
        if (!group) {
          return;
        }

        group.position.copy(point).addScaledVector(normal, 0.02);
        group.lookAt(point.clone().add(normal));
        impacts[index].life = IMPACT_LIFE;
      },
      spawnKill(position, headshot = false) {
        const index = cursorBurst.current;
        cursorBurst.current = (index + 1) % BURST_COUNT;
        const group = burstRefs.current[index];
        if (!group) {
          return;
        }

        group.position.copy(position);
        bursts[index].life = BURST_LIFE;
        bursts[index].headshot = headshot;
      },
    };

    return () => {
      apiRef.current = null;
    };
  }, [apiRef, bursts, impacts, tracers]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(0.05, rawDelta);

    tracers.forEach((slot, index) => {
      const group = tracerRefs.current[index];
      if (!group) {
        return;
      }

      if (slot.life <= 0) {
        group.visible = false;
        return;
      }

      slot.life = Math.max(0, slot.life - delta);
      const ratio = slot.life / TRACER_LIFE;
      group.visible = true;
      group.children.forEach((child) => {
        if (child.material) {
          child.material.opacity = ratio;
        }
      });
    });

    impacts.forEach((slot, index) => {
      const group = impactRefs.current[index];
      if (!group) {
        return;
      }

      if (slot.life <= 0) {
        group.visible = false;
        return;
      }

      slot.life = Math.max(0, slot.life - delta);
      const ratio = slot.life / IMPACT_LIFE;
      const progress = 1 - ratio;
      group.visible = true;

      const [ring, flash, ...sparks] = group.children;
      if (ring) {
        ring.scale.setScalar(0.25 + progress * 1.5);
        ring.material.opacity = ratio * 0.7;
      }
      if (flash) {
        flash.material.opacity = ratio * ratio;
        flash.scale.setScalar(0.35 + progress * 0.35);
      }
      sparks.forEach((spark, sparkIndex) => {
        const direction = slot.sparkDirections[sparkIndex] ?? slot.sparkDirections[0];
        spark.position.copy(direction).multiplyScalar(progress * 1.1);
        spark.position.y -= progress * progress * 0.9;
        spark.material.opacity = ratio;
        spark.scale.setScalar(0.09 * ratio + 0.02);
      });
    });

    bursts.forEach((slot, index) => {
      const group = burstRefs.current[index];
      if (!group) {
        return;
      }

      if (slot.life <= 0) {
        group.visible = false;
        return;
      }

      slot.life = Math.max(0, slot.life - delta);
      const ratio = slot.life / BURST_LIFE;
      const progress = 1 - ratio;
      group.visible = true;

      const [core, shock, light, ...sparks] = group.children;
      const tint = slot.headshot ? 1 : 0;

      if (core) {
        core.scale.setScalar(0.35 + progress * 1.7);
        core.material.opacity = ratio * ratio;
        core.material.color.setRGB(1, 0.72 + tint * 0.2, 0.35 + tint * 0.35);
      }
      if (shock) {
        shock.scale.setScalar(0.4 + progress * 4.4);
        shock.material.opacity = ratio * 0.55;
      }
      if (light) {
        light.intensity = ratio * 34;
      }
      sparks.forEach((spark, sparkIndex) => {
        const direction = slot.sparkDirections[sparkIndex] ?? slot.sparkDirections[0];
        spark.position.copy(direction).multiplyScalar(progress * 3.4);
        spark.position.y -= progress * progress * 2.4;
        spark.material.opacity = ratio * 0.95;
        spark.scale.setScalar(0.16 * ratio + 0.03);
      });
    });
  });

  return (
    <group>
      {tracers.map((_, index) => (
        <group
          key={`tracer-${index}`}
          visible={false}
          ref={(node) => {
            tracerRefs.current[index] = node;
          }}
        >
          <mesh>
            <boxGeometry args={[0.035, 0.035, 1]} />
            <meshBasicMaterial color="#fff0c2" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.1, 0.1, 1]} />
            <meshBasicMaterial color={accentColor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}

      {impacts.map((slot, index) => (
        <group
          key={`impact-${index}`}
          visible={false}
          ref={(node) => {
            impactRefs.current[index] = node;
          }}
        >
          <mesh>
            <ringGeometry args={[0.5, 0.72, 20]} />
            <meshBasicMaterial color="#ffd9a1" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <sprite>
            <spriteMaterial map={glowTexture} color="#ffe4b0" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
          {slot.sparkDirections.map((__, sparkIndex) => (
            <sprite key={sparkIndex}>
              <spriteMaterial map={glowTexture} color="#ffbb66" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          ))}
        </group>
      ))}

      {bursts.map((slot, index) => (
        <group
          key={`burst-${index}`}
          visible={false}
          ref={(node) => {
            burstRefs.current[index] = node;
          }}
        >
          <mesh>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#ffce7a" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.62, 0.78, 32]} />
            <meshBasicMaterial color="#ffb066" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <pointLight color="#ffb066" intensity={0} distance={16} decay={2} />
          {slot.sparkDirections.map((__, sparkIndex) => (
            <sprite key={sparkIndex}>
              <spriteMaterial map={glowTexture} color="#ffd08a" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          ))}
        </group>
      ))}
    </group>
  );
}