import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { createFloorTexture, createWallTexture } from "../../lib/textures";

export const ARENA_HALF = 44;

const SKY_VERTEX = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform vec3 accentColor;
  varying vec3 vWorldPosition;
  void main() {
    vec3 direction = normalize(vWorldPosition);
    float height = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 color = mix(bottomColor, topColor, pow(height, 0.9));
    float horizon = 1.0 - abs(direction.y);
    color += accentColor * pow(horizon, 12.0) * 0.35;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function GradientSky({ arena }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(arena.skyTop ?? "#050914") },
          bottomColor: { value: new THREE.Color(arena.skyBottom ?? "#0f2036") },
          accentColor: { value: new THREE.Color(arena.accentColor) },
        },
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
      }),
    [arena.accentColor, arena.skyBottom, arena.skyTop],
  );

  return (
    <mesh material={material} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[220, 32, 16]} />
    </mesh>
  );
}

export function ArenaFloor({ arena }) {
  const texture = useMemo(() => createFloorTexture(arena.floorColor, arena.accentColor), [arena.accentColor, arena.floorColor]);

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ARENA_HALF * 2, ARENA_HALF * 2]} />
        <meshStandardMaterial map={texture} color="#ffffff" roughness={0.72} metalness={0.18} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[19, 19.4, 96]} />
        <meshBasicMaterial color={arena.accentColor} transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[31, 31.3, 96]} />
        <meshBasicMaterial color={arena.accentColor} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function ArenaWalls({ arena }) {
  const texture = useMemo(() => createWallTexture(arena.wallColor, arena.accentColor), [arena.accentColor, arena.wallColor]);
  const height = 26;

  const walls = [
    { position: [0, height / 2, -ARENA_HALF], rotation: [0, 0, 0] },
    { position: [0, height / 2, ARENA_HALF], rotation: [0, Math.PI, 0] },
    { position: [-ARENA_HALF, height / 2, 0], rotation: [0, Math.PI / 2, 0] },
    { position: [ARENA_HALF, height / 2, 0], rotation: [0, -Math.PI / 2, 0] },
  ];

  return (
    <group>
      {walls.map((wall, index) => (
        <group key={index} position={wall.position} rotation={wall.rotation}>
          <mesh receiveShadow>
            <planeGeometry args={[ARENA_HALF * 2, height]} />
            <meshStandardMaterial map={texture} color="#ffffff" roughness={0.86} metalness={0.12} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -height / 2 + 0.9, 0.06]}>
            <planeGeometry args={[ARENA_HALF * 2, 0.16]} />
            <meshBasicMaterial color={arena.accentColor} transparent opacity={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function ArenaLights({ arena, quality = "high" }) {
  const shadowSize = quality === "low" ? 1024 : 2048;

  return (
    <>
      <hemisphereLight args={[arena.accentColor, arena.floorColor, 0.55]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[26, 42, 18]}
        intensity={2.1}
        color="#f4f7ff"
        castShadow={quality !== "low"}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-52}
        shadow-camera-right={52}
        shadow-camera-top={52}
        shadow-camera-bottom={-52}
        shadow-camera-near={1}
        shadow-camera-far={140}
      />
      <spotLight position={[-18, 30, -10]} intensity={140} angle={0.55} penumbra={0.7} color={arena.accentColor} distance={90} decay={1.6} />
      <spotLight position={[18, 30, 14]} intensity={90} angle={0.6} penumbra={0.8} color="#ffb279" distance={90} decay={1.6} />
      <pointLight position={[0, 7, -24]} intensity={40} color={arena.accentColor} distance={40} decay={2} />
    </>
  );
}

function PulseBeam({ position, color, height = 24 }) {
  const ref = useRef(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.material.opacity = 0.07 + Math.sin(clock.elapsedTime * 1.4 + position[0]) * 0.035;
    }
  });

  return (
    <mesh ref={ref} position={[position[0], height / 2, position[2]]}>
      <cylinderGeometry args={[1.5, 3.2, height, 12, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

export function ArenaProps({ arena }) {
  const accent = arena.accentColor;

  if (arena.id === "dock-lanes") {
    return (
      <group>
        {[-20, 20].map((x) => (
          <mesh key={`dock-wall-${x}`} position={[x, 2.6, -6]} castShadow receiveShadow>
            <boxGeometry args={[3, 5.2, 18]} />
            <meshStandardMaterial color="#2d374d" metalness={0.24} roughness={0.72} />
          </mesh>
        ))}
        <mesh position={[0, 1.3, 14]} castShadow receiveShadow>
          <boxGeometry args={[16, 2.6, 3]} />
          <meshStandardMaterial color="#253247" roughness={0.7} metalness={0.2} />
        </mesh>
        <PulseBeam position={[-20, 0, -6]} color={accent} />
        <PulseBeam position={[20, 0, -6]} color={accent} />
      </group>
    );
  }

  if (arena.id === "vertical-core") {
    return (
      <group>
        {[-16, 0, 16].map((x) => (
          <group key={`tower-${x}`}>
            <mesh position={[x, 6, -12]} castShadow receiveShadow>
              <cylinderGeometry args={[1.9, 2.3, 12, 24]} />
              <meshStandardMaterial color="#1d2b45" metalness={0.34} roughness={0.6} />
            </mesh>
            <mesh position={[x, 12.2, -12]}>
              <cylinderGeometry args={[2.1, 2.1, 0.4, 24]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 3, 18]} castShadow receiveShadow>
          <boxGeometry args={[12, 6, 2.5]} />
          <meshStandardMaterial color="#22314b" roughness={0.72} metalness={0.2} />
        </mesh>
        <PulseBeam position={[0, 0, -12]} color={accent} height={30} />
      </group>
    );
  }

  if (arena.id === "crossfire-yard") {
    return (
      <group>
        <mesh position={[0, 1.7, -8]} castShadow receiveShadow>
          <boxGeometry args={[7, 3.4, 7]} />
          <meshStandardMaterial color="#26364f" roughness={0.76} metalness={0.18} />
        </mesh>
        <mesh position={[0, 3.5, -8]}>
          <boxGeometry args={[7.2, 0.2, 7.2]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.1} />
        </mesh>
        {[-20, 20].map((x) => (
          <mesh key={`cross-box-${x}`} position={[x, 1.3, 14]} castShadow receiveShadow>
            <boxGeometry args={[4.5, 2.6, 4.5]} />
            <meshStandardMaterial color="#33445c" roughness={0.7} metalness={0.2} />
          </mesh>
        ))}
      </group>
    );
  }

  if (arena.id === "neon-grid") {
    return (
      <group>
        {[-24, -8, 8, 24].map((x) => (
          <mesh key={`neon-post-${x}`} position={[x, 5, -26]} castShadow>
            <boxGeometry args={[0.6, 10, 0.6]} />
            <meshStandardMaterial color="#120a20" emissive={accent} emissiveIntensity={1.2} roughness={0.35} />
          </mesh>
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -18]}>
          <ringGeometry args={[7, 7.3, 64]} />
          <meshBasicMaterial color={accent} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
        <PulseBeam position={[-24, 0, -26]} color={accent} height={26} />
        <PulseBeam position={[24, 0, -26]} color={accent} height={26} />
      </group>
    );
  }

  return (
    <group>
      {[-22, 0, 22].map((x) => (
        <group key={`pillar-${x}`}>
          <mesh position={[x, 3.6, -26]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 7.2, 2.4]} />
            <meshStandardMaterial color="#1a2333" metalness={0.24} roughness={0.78} />
          </mesh>
          <mesh position={[x, 7.35, -26]}>
            <boxGeometry args={[2.6, 0.2, 2.6]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} />
          </mesh>
        </group>
      ))}
      {[-16, 16].map((z) => (
        <mesh key={`crate-${z}`} position={[18, 1.3, z]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 2.6, 2.6]} />
          <meshStandardMaterial color="#2d374d" metalness={0.26} roughness={0.66} />
        </mesh>
      ))}
      <mesh position={[-20, 1.6, 14]} castShadow receiveShadow>
        <cylinderGeometry args={[1.4, 1.4, 3.2, 20]} />
        <meshStandardMaterial color="#202e47" metalness={0.34} roughness={0.6} />
      </mesh>
      <PulseBeam position={[0, 0, -26]} color={accent} />
    </group>
  );
}