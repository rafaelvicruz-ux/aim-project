import { useMemo } from "react";

/**
 * Geometria compartilhada entre a arena do jogo e o viewport do editor.
 * Todo prop e modelado com a base em y = 0 para encaixar direto no piso.
 */

function Crate() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[2.2, 2.2, 2.2]} />
        <meshStandardMaterial color="#8a6337" roughness={0.78} metalness={0.06} />
      </mesh>
      {[
        [0, 1.1, 1.11],
        [0, 1.1, -1.11],
      ].map((position, index) => (
        <mesh key={index} position={position}>
          <planeGeometry args={[2.2, 0.24]} />
          <meshStandardMaterial color="#3f2c17" roughness={0.9} side={2} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 2.24, 0]}>
        <boxGeometry args={[2.3, 0.12, 2.3]} />
        <meshStandardMaterial color="#5c421f" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Container() {
  const ribs = useMemo(() => Array.from({ length: 9 }, (_, index) => -2.6 + index * 0.65), []);

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 1.35, 0]}>
        <boxGeometry args={[6, 2.7, 2.5]} />
        <meshStandardMaterial color="#2f6c8f" roughness={0.62} metalness={0.35} />
      </mesh>
      {ribs.map((x) => (
        <mesh key={x} castShadow position={[x, 1.35, 1.28]}>
          <boxGeometry args={[0.16, 2.5, 0.08]} />
          <meshStandardMaterial color="#24576f" roughness={0.55} metalness={0.42} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 2.74, 0]}>
        <boxGeometry args={[6.1, 0.16, 2.6]} />
        <meshStandardMaterial color="#1d475c" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[3.02, 1.35, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshStandardMaterial color="#173c4f" roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  );
}

function Barrier() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
        <boxGeometry args={[3.2, 0.56, 0.85]} />
        <meshStandardMaterial color="#b9b3a4" roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.86, 0]}>
        <boxGeometry args={[3.2, 0.62, 0.46]} />
        <meshStandardMaterial color="#c7c1b1" roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh position={[0, 1.02, 0.24]}>
        <planeGeometry args={[2.8, 0.2]} />
        <meshStandardMaterial color="#ff8a3d" emissive="#ff6a00" emissiveIntensity={0.55} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Sandbags() {
  const rows = useMemo(
    () => [
      { y: 0.25, offset: 0, count: 4 },
      { y: 0.72, offset: 0.35, count: 3 },
      { y: 1.16, offset: 0.7, count: 2 },
    ],
    [],
  );

  return (
    <group>
      {rows.map((row) =>
        Array.from({ length: row.count }, (_, index) => (
          <mesh
            key={`${row.y}-${index}`}
            castShadow
            receiveShadow
            position={[-1.2 + row.offset + index * 0.82, row.y, 0]}
            rotation={[0, index % 2 ? 0.18 : -0.14, 0]}
          >
            <capsuleGeometry args={[0.26, 0.5, 4, 8]} />
            <meshStandardMaterial color={index % 2 ? "#7d7455" : "#6d6549"} roughness={0.98} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Truck() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[-0.6, 1.5, 0]}>
        <boxGeometry args={[4.4, 2.1, 2.3]} />
        <meshStandardMaterial color="#9c3323" roughness={0.5} metalness={0.32} />
      </mesh>
      <mesh castShadow receiveShadow position={[2.1, 1.35, 0]}>
        <boxGeometry args={[1.9, 1.7, 2.2]} />
        <meshStandardMaterial color="#d1652c" roughness={0.42} metalness={0.24} />
      </mesh>
      <mesh position={[2.35, 1.72, 0]}>
        <boxGeometry args={[1.35, 0.85, 2.24]} />
        <meshStandardMaterial color="#0d1a26" roughness={0.14} metalness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.6, 0.62, 0]}>
        <boxGeometry args={[6.4, 0.35, 2.1]} />
        <meshStandardMaterial color="#20252d" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[3.06, 1.05, 0.75]}>
        <sphereGeometry args={[0.17, 12, 12]} />
        <meshStandardMaterial color="#fff3cf" emissive="#ffcf6d" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[3.06, 1.05, -0.75]}>
        <sphereGeometry args={[0.17, 12, 12]} />
        <meshStandardMaterial color="#fff3cf" emissive="#ffcf6d" emissiveIntensity={1.6} />
      </mesh>
      {[
        [-1.9, 0.48, 1.1],
        [-1.9, 0.48, -1.1],
        [1.9, 0.48, 1.1],
        [1.9, 0.48, -1.1],
      ].map((wheel, index) => (
        <mesh key={index} castShadow receiveShadow position={wheel} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.48, 0.48, 0.4, 20]} />
          <meshStandardMaterial color="#14171d" roughness={0.85} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function Barrel() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 1.2, 20]} />
        <meshStandardMaterial color="#3f6f4e" roughness={0.5} metalness={0.4} />
      </mesh>
      {[0.32, 0.88].map((y) => (
        <mesh key={y} castShadow position={[0, y, 0]}>
          <torusGeometry args={[0.47, 0.05, 8, 20]} />
          <meshStandardMaterial color="#26452f" roughness={0.45} metalness={0.55} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 1.22, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 0.06, 20]} />
        <meshStandardMaterial color="#e0b23a" emissive="#7a5c00" emissiveIntensity={0.35} roughness={0.45} metalness={0.4} />
      </mesh>
    </group>
  );
}

function TrashCan() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.5, 0.58, 1.7, 20]} />
        <meshStandardMaterial color="#586271" roughness={0.48} metalness={0.45} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.78, 0]}>
        <cylinderGeometry args={[0.56, 0.56, 0.14, 20]} />
        <meshStandardMaterial color="#2a3340" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

function Cone() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[0.8, 0.12, 0.8]} />
        <meshStandardMaterial color="#161a20" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <coneGeometry args={[0.32, 0.98, 18]} />
        <meshStandardMaterial color="#ff6a26" emissive="#4a1a00" emissiveIntensity={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.24, 0.28, 0.14, 18]} />
        <meshStandardMaterial color="#f6f6f2" emissive="#606060" emissiveIntensity={0.3} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Furniture() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.85, 0]}>
        <boxGeometry args={[1.8, 0.14, 1.2]} />
        <meshStandardMaterial color="#7e5739" roughness={0.8} />
      </mesh>
      {[
        [-0.75, 0.42, -0.45],
        [0.75, 0.42, -0.45],
        [-0.75, 0.42, 0.45],
        [0.75, 0.42, 0.45],
      ].map((leg, index) => (
        <mesh key={index} castShadow position={leg}>
          <boxGeometry args={[0.12, 0.85, 0.12]} />
          <meshStandardMaterial color="#4c3522" roughness={0.88} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[-1.15, 0.46, 0]}>
        <boxGeometry args={[0.55, 0.12, 0.55]} />
        <meshStandardMaterial color="#8d684b" roughness={0.84} />
      </mesh>
      <mesh castShadow position={[-1.38, 0.86, 0]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.1, 0.9, 0.55]} />
        <meshStandardMaterial color="#8d684b" roughness={0.84} />
      </mesh>
    </group>
  );
}

function Rock() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.95, 0]} scale={[1.2, 0.85, 1]}>
        <dodecahedronGeometry args={[1.25, 0]} />
        <meshStandardMaterial color="#6f6c67" roughness={0.98} metalness={0.04} flatShading />
      </mesh>
      <mesh castShadow receiveShadow position={[0.85, 0.42, 0.5]} rotation={[0.4, 0.8, 0.2]} scale={0.5}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#5f5c57" roughness={0.98} flatShading />
      </mesh>
    </group>
  );
}

function Tree() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.22, 0.34, 2.6, 10]} />
        <meshStandardMaterial color="#4a3524" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 3.1, 0]}>
        <icosahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color="#2f5c3b" roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0.5, 4.05, 0.2]}>
        <icosahedronGeometry args={[0.95, 0]} />
        <meshStandardMaterial color="#376b45" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

function Pillar() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[1.7, 0.36, 1.7]} />
        <meshStandardMaterial color="#20293a" roughness={0.7} metalness={0.24} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.62, 0.7, 4.5, 16]} />
        <meshStandardMaterial color="#28344a" roughness={0.62} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.64, 0.64, 0.22, 16]} />
        <meshStandardMaterial color="#63b6ff" emissive="#1d6cc0" emissiveIntensity={1.4} roughness={0.3} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 5, 0]}>
        <boxGeometry args={[1.9, 0.35, 1.9]} />
        <meshStandardMaterial color="#20293a" roughness={0.7} metalness={0.24} />
      </mesh>
    </group>
  );
}

function Wall() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 1.35, 0]}>
        <boxGeometry args={[6, 2.7, 0.5]} />
        <meshStandardMaterial color="#38414f" roughness={0.82} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[0, 2.78, 0]}>
        <boxGeometry args={[6.2, 0.18, 0.7]} />
        <meshStandardMaterial color="#232b36" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 2.6, 0.26]}>
        <planeGeometry args={[5.6, 0.08]} />
        <meshStandardMaterial color="#7fd4ff" emissive="#2a86c9" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function Ramp() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.75, 0]} rotation={[-0.32, 0, 0]}>
        <boxGeometry args={[4, 0.25, 5]} />
        <meshStandardMaterial color="#333d4d" roughness={0.78} metalness={0.16} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.35, -2.2]}>
        <boxGeometry args={[4, 0.7, 0.6]} />
        <meshStandardMaterial color="#242c3a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.5, 2.2]}>
        <planeGeometry args={[3.6, 0.1]} />
        <meshStandardMaterial color="#ffb54d" emissive="#c46b00" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function Lamp({ lit }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.3, 12]} />
        <meshStandardMaterial color="#1d2431" roughness={0.75} metalness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 6.2, 12]} />
        <meshStandardMaterial color="#39424f" roughness={0.55} metalness={0.5} />
      </mesh>
      <mesh castShadow position={[0.6, 6.25, 0]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.1, 0.1, 1.4, 10]} />
        <meshStandardMaterial color="#39424f" roughness={0.55} metalness={0.5} />
      </mesh>
      <mesh position={[1.15, 6.05, 0]}>
        <boxGeometry args={[0.9, 0.22, 0.55]} />
        <meshStandardMaterial color="#fff0c4" emissive="#ffd98a" emissiveIntensity={2.6} />
      </mesh>
      {lit ? <pointLight position={[1.15, 5.8, 0]} intensity={16} distance={16} decay={2} color="#ffd8a0" /> : null}
    </group>
  );
}

const PROP_BY_TYPE = {
  crate: Crate,
  container: Container,
  barrier: Barrier,
  sandbags: Sandbags,
  truck: Truck,
  barrel: Barrel,
  "trash-can": TrashCan,
  cone: Cone,
  furniture: Furniture,
  rock: Rock,
  tree: Tree,
  pillar: Pillar,
  wall: Wall,
  ramp: Ramp,
  lamp: Lamp,
};

export function SceneProp({ type, lit = false }) {
  const Component = PROP_BY_TYPE[type] ?? Crate;
  return <Component lit={lit} />;
}

export function Obstacle({ obstacle, lit = false }) {
  return (
    <group
      position={obstacle.position}
      rotation={obstacle.rotation ?? [0, 0, 0]}
      scale={obstacle.scale ?? 1}
    >
      <SceneProp type={obstacle.type} lit={lit} />
    </group>
  );
}