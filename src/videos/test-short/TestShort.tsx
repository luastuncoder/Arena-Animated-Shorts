import React, { useEffect, useMemo } from "react";
import { AbsoluteFill, getInputProps, interpolate, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { drawExplorer, drawStar } from "./art";

export const TEST_FPS = 30;
export const TEST_FRAMES = 300;

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/** Solid low-poly props and a back-face ink shell: a lightweight toon world. */
const Tree: React.FC<{ position: [number, number, number]; size?: number; tint?: string }> = ({ position, size = 1, tint = "#58ad71" }) => (
  <group position={position} scale={size}>
    <mesh position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.13, 0.2, 1.2, 7]} />
      <meshLambertMaterial color="#8e5c40" />
    </mesh>
    <mesh position={[0, 1.68, 0]} scale={[0.84, 1.02, 0.78]}>
      <sphereGeometry args={[0.8, 12, 10]} />
      <meshLambertMaterial color={tint} flatShading />
    </mesh>
    <mesh position={[0, 1.68, 0]} scale={[0.88, 1.06, 0.82]}>
      <sphereGeometry args={[0.8, 12, 10]} />
      <meshBasicMaterial color="#293032" side={THREE.BackSide} />
    </mesh>
    <mesh position={[-0.34, 1.53, 0.27]} scale={[0.49, 0.55, 0.48]}>
      <sphereGeometry args={[0.8, 10, 8]} />
      <meshLambertMaterial color="#77bf7d" flatShading />
    </mesh>
  </group>
);

const House: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => (
  <group position={position}>
    <mesh position={[0, 0.75, 0]}>
      <boxGeometry args={[1.4, 1.5, 1.15]} />
      <meshLambertMaterial color={color} />
    </mesh>
    <mesh position={[0, 1.77, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[1.12, 0.75, 4]} />
      <meshLambertMaterial color="#c76b5d" flatShading />
    </mesh>
    <mesh position={[0, 0.43, 0.581]}>
      <planeGeometry args={[0.35, 0.84]} />
      <meshLambertMaterial color="#785443" />
    </mesh>
    {[-0.42, 0.42].map((x) => (
      <mesh key={x} position={[x, 0.95, 0.584]}>
        <planeGeometry args={[0.26, 0.3]} />
        <meshLambertMaterial color="#a7dce4" />
      </mesh>
    ))}
  </group>
);

const Flower: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => (
  <group position={position}>
    <mesh position={[0, 0.12, 0]}>
      <cylinderGeometry args={[0.018, 0.018, 0.24, 5]} />
      <meshLambertMaterial color="#548b52" />
    </mesh>
    <mesh position={[0, 0.27, 0]}>
      <sphereGeometry args={[0.075, 7, 6]} />
      <meshLambertMaterial color={color} />
    </mesh>
  </group>
);

const Explorer: React.FC<{ frame: number }> = ({ frame }) => {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 300;
    c.height = 500;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    return t;
  }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);
  drawExplorer(canvas, frame);
  texture.needsUpdate = true;
  const x = interpolate(frame, [0, 88], [-0.9, -0.48], clamp);
  return (
    <group position={[x, 0, 0.05]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0.01]} scale={[0.72, 0.28, 1]}>
        <circleGeometry args={[0.75, 28]} />
        <meshBasicMaterial color="#41623e" transparent opacity={0.24} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.27, 0]}>
        <planeGeometry args={[1.52, 2.54]} />
        <meshLambertMaterial map={texture} transparent alphaTest={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
};

const Star: React.FC<{ frame: number }> = ({ frame }) => {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    drawStar(c);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const enter = interpolate(frame, [25, 85], [1.9, 0.65], clamp);
  const depart = interpolate(frame, [245, 299], [0, 0.52], clamp);
  const height = interpolate(frame, [25, 85], [3.42, 2.55], clamp)
    + Math.sin(frame * 0.105) * 0.1 + interpolate(frame, [245, 299], [0, 0.34], clamp);
  const bob = Math.sin(frame * 0.08) * 0.12;
  return (
    <mesh position={[enter + depart, height, 0.28]} rotation={[0, 0, bob]}>
      <planeGeometry args={[0.67, 0.67]} />
      <meshLambertMaterial map={texture} transparent alphaTest={0.05} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
};

const Scene: React.FC<{ frame: number }> = ({ frame }) => {
  const { camera } = useThree();
  camera.position.set(Math.sin(frame / 200) * 0.055, 3.1, 8.2 - frame * 0.0015);
  camera.lookAt(0, 1.65, 0);
  camera.updateProjectionMatrix();
  return (
    <>
      <ambientLight intensity={1.65} />
      <directionalLight position={[-4, 8, 6]} intensity={1.25} color="#fff2df" />
      <fog attach="fog" args={["#c2e4ee", 13, 34]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -6]}>
        <planeGeometry args={[100, 100]} />
        <meshLambertMaterial color="#91ca79" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, -5]}>
        <planeGeometry args={[2.7, 32]} />
        <meshLambertMaterial color="#e9c28e" />
      </mesh>
      <mesh position={[-4.8, -1, -14]} scale={[5.5, 1.8, 2.5]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshLambertMaterial color="#8dcf9c" flatShading />
      </mesh>
      <mesh position={[4.6, -1, -15]} scale={[5.5, 2.1, 2.5]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshLambertMaterial color="#9bd5a4" flatShading />
      </mesh>
      <House position={[-2.4, 0, -6.8]} color="#f0d49d" />
      <House position={[2.9, 0, -8.6]} color="#efd2c0" />
      <Tree position={[-2.1, 0, -3.8]} size={1.25} tint="#59a971" />
      <Tree position={[2.1, 0, -4.7]} size={1.4} tint="#66b277" />
      <Tree position={[-3.8, 0, -8.7]} size={1.5} tint="#78bf85" />
      <Tree position={[4, 0, -9.5]} size={1.45} tint="#7abf83" />
      <Flower position={[-1.22, 0, 1.2]} color="#f2a5a0" />
      <Flower position={[-1.48, 0, 0.75]} color="#fbdf87" />
      <Flower position={[1.21, 0, 1.05]} color="#f4afbd" />
      <Flower position={[1.48, 0, 0.35]} color="#fff1b3" />
      <Explorer frame={frame} />
      <Star frame={frame} />
    </>
  );
};

/** 10 seconds, no captions or narration: original explorer meets a little star. */
export const TenSecondTest: React.FC = () => {
  const frame = useCurrentFrame();
  const dpr = (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #6cb6e4 0%, #b8e1ed 62%, #e3f0d1 100%)" }}>
      <div style={{ position: "absolute", top: 135, left: 130, width: 130, height: 130, borderRadius: "50%", background: "#fff0b4", opacity: 0.9 }} />
      <svg viewBox="0 0 240 90" style={{ position: "absolute", top: 300, left: 170 + frame * 0.035, width: 220, opacity: 0.88 }}>
        <path d="M18 72 C-2 72 0 45 22 44 C26 22 57 20 71 35 C81 5 126 4 140 31 C159 18 190 27 191 45 C216 41 229 54 225 72 Z" fill="#fffdf2" />
      </svg>
      <svg viewBox="0 0 240 90" style={{ position: "absolute", top: 190, right: 80 + frame * 0.02, width: 170, opacity: 0.76 }}>
        <path d="M18 72 C-2 72 0 45 22 44 C26 22 57 20 71 35 C81 5 126 4 140 31 C159 18 190 27 191 45 C216 41 229 54 225 72 Z" fill="#fffdf2" />
      </svg>
      <ThreeCanvas
        width={1080}
        height={1920}
        {...(dpr ? { dpr } : {})}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        camera={{ fov: 38, near: 0.1, far: 80 }}
      >
        <Scene frame={frame} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
