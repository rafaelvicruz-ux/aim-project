import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createGlowTexture } from "../../lib/textures";

const REST_POSITION = new THREE.Vector3(0.3, -0.26, -0.62);
const BARREL_TIP = [0, 0.045, -0.78];

/**
 * Viewmodel preso a camera: recuo com mola, sway pelo mouse, bob ao andar
 * e flash de cano com luz dinamica.
 */
export function WeaponViewModel({ shotCounterRef, moveStateRef, muzzleRef }) {
  const { camera } = useThree();
  const rootRef = useRef(null);
  const modelRef = useRef(null);
  const flashRef = useRef(null);
  const flashSpriteRef = useRef(null);
  const lightRef = useRef(null);
  const glowTexture = useMemo(() => createGlowTexture(), []);

  const state = useRef({
    recoil: 0,
    recoilVelocity: 0,
    flash: 0,
    swayX: 0,
    swayY: 0,
    bob: 0,
    lastShot: 0,
  });

  const pointerDelta = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (event) => {
      if (!document.pointerLockElement) {
        return;
      }

      pointerDelta.current.x += event.movementX ?? 0;
      pointerDelta.current.y += event.movementY ?? 0;
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    camera.add(root);
    return () => {
      camera.remove(root);
    };
  }, [camera]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(0.05, rawDelta);
    const local = state.current;
    const model = modelRef.current;

    if (shotCounterRef.current !== local.lastShot) {
      local.lastShot = shotCounterRef.current;
      local.recoilVelocity += 9.5;
      local.flash = 1;
    }

    // mola critica: puxa o recuo de volta ao repouso
    local.recoilVelocity += -local.recoil * 190 * delta;
    local.recoilVelocity *= Math.max(0, 1 - 15 * delta);
    local.recoil += local.recoilVelocity * delta;
    local.flash = Math.max(0, local.flash - delta * 14);

    const targetSwayX = THREE.MathUtils.clamp(-pointerDelta.current.x * 0.0009, -0.08, 0.08);
    const targetSwayY = THREE.MathUtils.clamp(-pointerDelta.current.y * 0.0009, -0.07, 0.07);
    pointerDelta.current.x *= 0.82;
    pointerDelta.current.y *= 0.82;
    local.swayX += (targetSwayX - local.swayX) * Math.min(1, delta * 12);
    local.swayY += (targetSwayY - local.swayY) * Math.min(1, delta * 12);

    const moving = moveStateRef?.current?.moving ? 1 : 0;
    local.bob += delta * (moving ? 11 : 2.2);
    const bobX = Math.sin(local.bob) * (moving ? 0.012 : 0.003);
    const bobY = Math.abs(Math.cos(local.bob)) * (moving ? 0.011 : 0.0025);

    if (model) {
      model.position.set(
        REST_POSITION.x + local.swayX + bobX,
        REST_POSITION.y + local.swayY - bobY,
        REST_POSITION.z + local.recoil * 0.12,
      );
      model.rotation.set(local.recoil * 0.42 - local.swayY * 0.5, -local.swayX * 0.8, local.swayX * 0.4);
    }

    if (flashRef.current) {
      flashRef.current.visible = local.flash > 0.02;
      flashRef.current.scale.setScalar(0.6 + local.flash * 1.1);
      flashRef.current.material.opacity = local.flash;
      flashRef.current.rotation.z += delta * 22;
    }

    if (flashSpriteRef.current) {
      flashSpriteRef.current.visible = local.flash > 0.02;
      flashSpriteRef.current.material.opacity = local.flash * 0.9;
      flashSpriteRef.current.scale.setScalar(0.28 + local.flash * 0.5);
    }

    if (lightRef.current) {
      lightRef.current.intensity = local.flash * 26;
    }

    if (muzzleRef && modelRef.current) {
      modelRef.current.localToWorld(muzzleRef.current.set(BARREL_TIP[0], BARREL_TIP[1], BARREL_TIP[2]));
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={modelRef} position={REST_POSITION.toArray()}>
        {/* corpo */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[0.09, 0.13, 0.46]} />
          <meshStandardMaterial color="#232b3a" metalness={0.72} roughness={0.34} />
        </mesh>
        {/* trilho superior */}
        <mesh position={[0, 0.075, -0.12]}>
          <boxGeometry args={[0.06, 0.03, 0.5]} />
          <meshStandardMaterial color="#151b26" metalness={0.8} roughness={0.28} />
        </mesh>
        {/* guarda-mao */}
        <mesh position={[0, 0.015, -0.42]}>
          <boxGeometry args={[0.075, 0.085, 0.34]} />
          <meshStandardMaterial color="#1a2130" metalness={0.65} roughness={0.4} />
        </mesh>
        {/* cano */}
        <mesh position={[0, 0.045, -0.66]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.3, 14]} />
          <meshStandardMaterial color="#0f1420" metalness={0.9} roughness={0.22} />
        </mesh>
        {/* quebra-chamas */}
        <mesh position={[0, 0.045, -0.79]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.036, 0.03, 0.09, 12]} />
          <meshStandardMaterial color="#2b3346" metalness={0.85} roughness={0.3} />
        </mesh>
        {/* carregador */}
        <mesh position={[0, -0.13, -0.02]} rotation={[0.16, 0, 0]}>
          <boxGeometry args={[0.06, 0.22, 0.11]} />
          <meshStandardMaterial color="#1c2331" metalness={0.55} roughness={0.45} />
        </mesh>
        {/* punho */}
        <mesh position={[0, -0.14, 0.14]} rotation={[-0.42, 0, 0]}>
          <boxGeometry args={[0.06, 0.2, 0.08]} />
          <meshStandardMaterial color="#161c28" metalness={0.35} roughness={0.7} />
        </mesh>
        {/* coronha */}
        <mesh position={[0, -0.015, 0.28]}>
          <boxGeometry args={[0.055, 0.1, 0.22]} />
          <meshStandardMaterial color="#1b2230" metalness={0.4} roughness={0.62} />
        </mesh>
        {/* mira com ponto luminoso */}
        <mesh position={[0, 0.11, -0.1]}>
          <torusGeometry args={[0.036, 0.008, 8, 18]} />
          <meshStandardMaterial color="#2c3446" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.11, -0.1]}>
          <sphereGeometry args={[0.009, 8, 8]} />
          <meshBasicMaterial color="#ff5c3a" />
        </mesh>
        {/* detalhe energetico */}
        <mesh position={[0.048, 0.01, -0.2]}>
          <boxGeometry args={[0.006, 0.02, 0.2]} />
          <meshStandardMaterial color="#54c8ff" emissive="#3aa6ff" emissiveIntensity={2.4} />
        </mesh>
        <mesh position={[-0.048, 0.01, -0.2]}>
          <boxGeometry args={[0.006, 0.02, 0.2]} />
          <meshStandardMaterial color="#54c8ff" emissive="#3aa6ff" emissiveIntensity={2.4} />
        </mesh>

        {/* flash de cano */}
        <mesh ref={flashRef} position={BARREL_TIP} visible={false}>
          <coneGeometry args={[0.075, 0.22, 6, 1, true]} />
          <meshBasicMaterial color="#ffd489" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <sprite ref={flashSpriteRef} position={BARREL_TIP} visible={false}>
          <spriteMaterial map={glowTexture} color="#ffcf7a" transparent opacity={0} depthWrite={false} />
        </sprite>
        <pointLight ref={lightRef} position={[0, 0.05, -0.85]} color="#ffc477" intensity={0} distance={14} decay={2} />
      </group>
    </group>
  );
}