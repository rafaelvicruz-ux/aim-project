import { OrbitControls, TransformControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { getArenaPrefab } from "../data/gameConfig";

function ObstacleModel({ obstacle, selected, onSelect }) {
  const content = (() => {
    if (obstacle.type === "trash-can") {
      return (
        <group>
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
        <group>
          <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
            <boxGeometry args={[4.8, 1.8, 2.2]} />
            <meshStandardMaterial color="#b53c28" metalness={0.32} roughness={0.45} />
          </mesh>
          <mesh castShadow receiveShadow position={[1.75, 1.3, 0]}>
            <boxGeometry args={[1.6, 2.1, 2]} />
            <meshStandardMaterial color="#d96c2f" metalness={0.22} roughness={0.4} />
          </mesh>
        </group>
      );
    }

    if (obstacle.type === "rock") {
      return (
        <mesh castShadow receiveShadow>
          <dodecahedronGeometry args={[1.3, 0]} />
          <meshStandardMaterial color="#73706b" roughness={0.96} metalness={0.06} />
        </mesh>
      );
    }

    return (
      <group>
        <mesh castShadow receiveShadow position={[0, 0.85, 0]}>
          <boxGeometry args={[1.8, 0.15, 1.2]} />
          <meshStandardMaterial color="#7e5739" roughness={0.82} />
        </mesh>
        <mesh castShadow receiveShadow position={[-1.1, 0.55, 0]}>
          <boxGeometry args={[0.5, 1.1, 0.5]} />
          <meshStandardMaterial color="#8d684b" roughness={0.84} />
        </mesh>
      </group>
    );
  })();

  return (
    <group
      position={obstacle.position}
      rotation={obstacle.rotation ?? [0, 0, 0]}
      scale={obstacle.scale ?? 1}
      onClick={(event) => {
        event.stopPropagation();
        onSelect({ kind: "obstacle", id: obstacle.id });
      }}
    >
      {content}
      {selected ? (
        <mesh position={[0, 2.6, 0]}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshBasicMaterial color="#ff7a1a" />
        </mesh>
      ) : null}
    </group>
  );
}

function SpawnNode({ node, selected, onSelect }) {
  return (
    <group
      position={node.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect({ kind: "spawn", id: node.id });
      }}
    >
      <mesh position={[0, node.height ?? 1.7, 0]} castShadow>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={selected ? "#ff7a1a" : "#67bbff"} emissive="#173a55" emissiveIntensity={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.8, 1.25, 24]} />
        <meshBasicMaterial color={selected ? "#ffb36b" : "#7bd1ff"} />
      </mesh>
    </group>
  );
}

function ArenaProps({ arenaPrefab }) {
  if (arenaPrefab === "dock-lanes") {
    return (
      <>
        {[-18, 18].map((x) => (
          <mesh key={x} position={[x, 2.4, -6]} castShadow receiveShadow>
            <boxGeometry args={[2.8, 4.8, 16]} />
            <meshStandardMaterial color="#2d374d" roughness={0.76} />
          </mesh>
        ))}
      </>
    );
  }

  if (arenaPrefab === "vertical-core") {
    return (
      <>
        {[-14, 0, 14].map((x) => (
          <mesh key={x} position={[x, 5.4, -10]} castShadow receiveShadow>
            <cylinderGeometry args={[1.8, 1.8, 10.8, 20]} />
            <meshStandardMaterial color="#1d2b45" roughness={0.68} />
          </mesh>
        ))}
      </>
    );
  }

  if (arenaPrefab === "crossfire-yard") {
    return (
      <mesh position={[0, 1.5, -8]} castShadow receiveShadow>
        <boxGeometry args={[6.5, 3, 6.5]} />
        <meshStandardMaterial color="#26364f" roughness={0.78} />
      </mesh>
    );
  }

  return (
    <>
      {[-20, 0, 20].map((x) => (
        <mesh key={x} position={[x, 3.2, -22]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 6.4, 2.2]} />
          <meshStandardMaterial color="#1a2333" roughness={0.82} />
        </mesh>
      ))}
    </>
  );
}

function TransformWrapper({ selection, transformMode, onChange, children }) {
  return (
    <TransformControls
      mode={transformMode}
      size={0.75}
      onObjectChange={(event) => {
        const object = event?.target?.object;
        if (!object) {
          return;
        }

        onChange(selection, {
          position: [object.position.x, object.position.y, object.position.z],
          rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
          scale: object.scale.x,
        });
      }}
    >
      {children}
    </TransformControls>
  );
}

function EditorScene({ draft, selection, transformMode, onSelectEntity, onTransformEntity }) {
  const arena = getArenaPrefab(draft.arenaPrefab);

  return (
    <>
      <color attach="background" args={["#0a1019"]} />
      <fog attach="fog" args={["#0a1019", 50, 110]} />
      <ambientLight intensity={1} />
      <directionalLight position={[16, 24, 12]} intensity={1.7} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[0, 12, 0]} intensity={8} color={arena.accentColor} distance={50} />
      <gridHelper args={[96, 24, arena.accentColor, "#243247"]} position={[0, 0.01, 0]} />
      <OrbitControls makeDefault minDistance={16} maxDistance={96} target={[0, 0, 0]} />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[96, 96]} />
        <meshStandardMaterial color={arena.floorColor} roughness={0.95} />
      </mesh>

      <mesh position={[0, 16, -38]} receiveShadow>
        <boxGeometry args={[90, 32, 2]} />
        <meshStandardMaterial color={arena.wallColor} />
      </mesh>
      <mesh position={[38, 12, 0]} receiveShadow>
        <boxGeometry args={[2, 24, 90]} />
        <meshStandardMaterial color={arena.wallColor} />
      </mesh>
      <mesh position={[-38, 12, 0]} receiveShadow>
        <boxGeometry args={[2, 24, 90]} />
        <meshStandardMaterial color={arena.wallColor} />
      </mesh>

      <ArenaProps arenaPrefab={draft.arenaPrefab} />

      {(draft.spawnNodes ?? []).map((node) => {
        const selected = selection?.kind === "spawn" && selection.id === node.id;
        const content = <SpawnNode node={node} selected={selected} onSelect={onSelectEntity} />;

        if (!selected) {
          return <group key={node.id}>{content}</group>;
        }

        return (
          <TransformWrapper key={node.id} selection={selection} transformMode={transformMode} onChange={onTransformEntity}>
            {content}
          </TransformWrapper>
        );
      })}

      {(draft.obstacles ?? []).map((obstacle) => {
        const selected = selection?.kind === "obstacle" && selection.id === obstacle.id;
        const content = <ObstacleModel obstacle={obstacle} selected={selected} onSelect={onSelectEntity} />;

        if (!selected) {
          return <group key={obstacle.id}>{content}</group>;
        }

        return (
          <TransformWrapper key={obstacle.id} selection={selection} transformMode={transformMode} onChange={onTransformEntity}>
            {content}
          </TransformWrapper>
        );
      })}
    </>
  );
}

export function MapEditorViewport({ draft, selection, transformMode, onSelectEntity, onTransformEntity }) {
  return (
    <div className="editor-viewport">
      <Canvas shadows camera={{ position: [28, 28, 28], fov: 48 }}>
        <EditorScene
          draft={draft}
          selection={selection}
          transformMode={transformMode}
          onSelectEntity={onSelectEntity}
          onTransformEntity={onTransformEntity}
        />
      </Canvas>
    </div>
  );
}
