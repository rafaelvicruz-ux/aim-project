import { GizmoHelper, GizmoViewport, Grid, OrbitControls, TransformControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getArenaPrefab, snapValue } from "../data/gameConfig";
import {
  ARENA_HALF,
  ArenaFloor,
  ArenaLights,
  ArenaProps,
  ArenaWalls,
  GradientSky,
} from "./scene/ArenaEnvironment";
import { SceneProp } from "./scene/SceneProp";

const CAMERA_VIEWS = {
  perspective: { position: [34, 30, 34], target: [0, 0, 0] },
  top: { position: [0, 72, 0.001], target: [0, 0, 0] },
  front: { position: [0, 12, 62], target: [0, 4, 0] },
  side: { position: [62, 12, 0], target: [0, 4, 0] },
};

function SelectionHalo({ selected }) {
  const ref = useRef(null);

  useFrame(({ clock }) => {
    if (!ref.current || !selected) {
      return;
    }

    const pulse = 0.6 + Math.sin(clock.elapsedTime * 4) * 0.25;
    ref.current.material.opacity = pulse;
    ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.05);
  });

  if (!selected) {
    return null;
  }

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
      <ringGeometry args={[1.4, 1.85, 40]} />
      <meshBasicMaterial color="#ff9a3d" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function EditorEntity({ entity, kind, selected, transformMode, snap, onSelect, onTransform, orbitRef }) {
  const objectRef = useRef(null);

  useEffect(() => {
    const object = objectRef.current;
    if (!object) {
      return;
    }

    object.position.set(entity.position[0], kind === "spawn" ? 0 : 0, entity.position[2]);
    if (kind === "obstacle") {
      object.rotation.set(0, entity.rotation?.[1] ?? 0, 0);
      object.scale.setScalar(entity.scale ?? 1);
    }
  }, [entity.position, entity.rotation, entity.scale, kind]);

  const handleObjectChange = () => {
    const object = objectRef.current;
    if (!object) {
      return;
    }

    onTransform(
      { kind, id: entity.id },
      {
        position: [snapValue(object.position.x, snap), 0, snapValue(object.position.z, snap)],
        rotation: [0, Number(object.rotation.y.toFixed(3)), 0],
        scale: Number(object.scale.x.toFixed(2)),
      },
    );
  };

  return (
    <>
      <group
        ref={objectRef}
        onClick={(event) => {
          event.stopPropagation();
          onSelect({ kind, id: entity.id });
        }}
      >
        {kind === "spawn" ? (
          <group>
            <mesh position={[0, entity.height ?? 1.7, 0]} castShadow>
              <icosahedronGeometry args={[0.46, 1]} />
              <meshStandardMaterial
                color={selected ? "#ff9a3d" : "#5fb8ff"}
                emissive={selected ? "#c74f00" : "#12496f"}
                emissiveIntensity={1.4}
                roughness={0.3}
                flatShading
              />
            </mesh>
            <mesh position={[0, (entity.height ?? 1.7) / 2, 0]}>
              <cylinderGeometry args={[0.05, 0.05, entity.height ?? 1.7, 8]} />
              <meshBasicMaterial color={selected ? "#ffb36b" : "#7bd1ff"} transparent opacity={0.55} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
              <ringGeometry args={[0.85, 1.25, 28]} />
              <meshBasicMaterial
                color={selected ? "#ffb36b" : "#7bd1ff"}
                transparent
                opacity={0.75}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        ) : (
          <SceneProp type={entity.type} />
        )}
        <SelectionHalo selected={selected} />
      </group>

      {selected ? (
        <TransformControls
          object={objectRef}
          mode={transformMode}
          size={0.8}
          translationSnap={snap || null}
          rotationSnap={Math.PI / 24}
          scaleSnap={0.1}
          showX={transformMode !== "rotate"}
          showY={transformMode !== "translate"}
          showZ={transformMode !== "rotate"}
          onMouseUp={handleObjectChange}
          onObjectChange={handleObjectChange}
          onDraggingChanged={(event) => {
            if (orbitRef.current) {
              orbitRef.current.enabled = !event.value;
            }
          }}
        />
      ) : null}
    </>
  );
}

function PlacementLayer({ placing, snap, onPlace, onGhostMove, orbitRef }) {
  const planeRef = useRef(null);

  if (!placing) {
    return null;
  }

  return (
    <mesh
      ref={planeRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.005, 0]}
      onPointerMove={(event) => {
        event.stopPropagation();
        onGhostMove([snapValue(event.point.x, snap), 0, snapValue(event.point.z, snap)]);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (orbitRef.current) {
          orbitRef.current.enabled = false;
        }
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        if (orbitRef.current) {
          orbitRef.current.enabled = true;
        }
        onPlace([snapValue(event.point.x, snap), 0, snapValue(event.point.z, snap)]);
      }}
    >
      <planeGeometry args={[ARENA_HALF * 2, ARENA_HALF * 2]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function Ghost({ placing, position }) {
  const ref = useRef(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.elapsedTime * 3) * 0.08;
    }
  });

  if (!placing) {
    return null;
  }

  return (
    <group position={position}>
      <group ref={ref}>
        {placing === "spawn" ? (
          <mesh position={[0, 1.7, 0]}>
            <icosahedronGeometry args={[0.46, 1]} />
            <meshBasicMaterial color="#7bd1ff" transparent opacity={0.55} />
          </mesh>
        ) : (
          <SceneProp type={placing} />
        )}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1.1, 1.5, 32]} />
        <meshBasicMaterial color="#7cf8c8" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CameraRig({ view, focusTarget, orbitRef }) {
  const { camera } = useThree();
  const desired = useRef(null);

  useEffect(() => {
    const preset = CAMERA_VIEWS[view] ?? CAMERA_VIEWS.perspective;
    desired.current = {
      position: new THREE.Vector3(...preset.position),
      target: new THREE.Vector3(...preset.target),
    };
  }, [view]);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    const target = new THREE.Vector3(...focusTarget);
    desired.current = {
      position: target.clone().add(new THREE.Vector3(12, 12, 12)),
      target,
    };
  }, [focusTarget]);

  useFrame(() => {
    if (!desired.current || !orbitRef.current) {
      return;
    }

    camera.position.lerp(desired.current.position, 0.12);
    orbitRef.current.target.lerp(desired.current.target, 0.12);
    orbitRef.current.update();

    if (camera.position.distanceTo(desired.current.position) < 0.15) {
      desired.current = null;
    }
  });

  return null;
}

function EditorScene({
  draft,
  selection,
  transformMode,
  snap,
  placing,
  view,
  focusTarget,
  showGrid,
  onSelectEntity,
  onTransformEntity,
  onPlace,
}) {
  const arena = useMemo(() => getArenaPrefab(draft.arenaPrefab), [draft.arenaPrefab]);
  const orbitRef = useRef(null);
  const [ghostPosition, setGhostPosition] = useState([0, 0, 0]);

  return (
    <>
      <fogExp2 attach="fog" args={[arena.skyBottom ?? "#0a1019", 0.004]} />
      <GradientSky arena={arena} />
      <ArenaLights arena={arena} quality="medium" />

      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={10}
        maxDistance={140}
        maxPolarAngle={Math.PI / 2.05}
      />
      <CameraRig view={view} focusTarget={focusTarget} orbitRef={orbitRef} />

      <group>
        <ArenaFloor arena={arena} />
        <ArenaWalls arena={arena} />
        <ArenaProps arena={arena} />
      </group>

      {showGrid ? (
        <Grid
          args={[ARENA_HALF * 2, ARENA_HALF * 2]}
          cellSize={2}
          cellThickness={0.6}
          cellColor={arena.accentColor}
          sectionSize={8}
          sectionThickness={1.1}
          sectionColor={arena.accentColor}
          fadeDistance={130}
          fadeStrength={1.2}
          followCamera={false}
          infiniteGrid={false}
          position={[0, 0.02, 0]}
        />
      ) : null}

      <PlacementLayer
        placing={placing}
        snap={snap}
        onPlace={onPlace}
        onGhostMove={setGhostPosition}
        orbitRef={orbitRef}
      />
      <Ghost placing={placing} position={ghostPosition} />

      {(draft.spawnNodes ?? []).map((node) => (
        <EditorEntity
          key={node.id}
          entity={node}
          kind="spawn"
          selected={selection?.kind === "spawn" && selection.id === node.id}
          transformMode={transformMode}
          snap={snap}
          onSelect={onSelectEntity}
          onTransform={onTransformEntity}
          orbitRef={orbitRef}
        />
      ))}

      {(draft.obstacles ?? []).map((obstacle) => (
        <EditorEntity
          key={obstacle.id}
          entity={obstacle}
          kind="obstacle"
          selected={selection?.kind === "obstacle" && selection.id === obstacle.id}
          transformMode={transformMode}
          snap={snap}
          onSelect={onSelectEntity}
          onTransform={onTransformEntity}
          orbitRef={orbitRef}
        />
      ))}

      <GizmoHelper alignment="bottom-right" margin={[68, 68]}>
        <GizmoViewport axisColors={["#ff6b6b", "#6ce5a0", "#5fb8ff"]} labelColor="#0b1019" />
      </GizmoHelper>
    </>
  );
}

export function MapEditorViewport(props) {
  return (
    <div className={`editor-viewport ${props.placing ? "editor-viewport--placing" : ""}`}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: CAMERA_VIEWS.perspective.position, fov: 46, near: 0.5, far: 600 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={() => props.onSelectEntity(null)}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <EditorScene {...props} />
      </Canvas>

      {props.placing ? (
        <div className="editor-viewport__hint">
          Clique no piso para posicionar · <kbd>Esc</kbd> cancela
        </div>
      ) : null}
    </div>
  );
}