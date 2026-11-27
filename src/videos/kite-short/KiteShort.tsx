import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, cancelRender, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { type Kit } from "../plane-test/build";
import { InkPass, noInkFallback } from "../plane-test/ink";
import { LensBlur } from "../plane-test/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../plane-test/grade";
import { FPS, TOTAL, shotAt } from "./story";
import { KiteWorld, loadKit } from "./world";

export const KITE_FPS = FPS;
export const KITE_FRAMES = TOTAL;

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("loading the kite town"));
  useEffect(() => {
    let active = true;
    loadKit().then((k) => {
      if (active) { setKit(k); continueRender(handle); }
    }).catch((err) => cancelRender(err));
    return () => { active = false; };
  }, [handle]);
  return kit;
};

const Inner: React.FC<{ kit: Kit }> = ({ kit }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const world = useMemo(() => new KiteWorld(kit), [kit]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, cam),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.55, luminanceThreshold: 0.98, luminanceSmoothing: 0.22, mipmapBlur: true, levels: 6, radius: 0.62 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [cam, scene]);
  useEffect(() => () => { fx.ink.dispose(); }, [fx]);
  const target = world.update(f, cam, scene);
  noInkFallback(world.root);
  const forward = new THREE.Vector3(); cam.getWorldDirection(forward);
  fx.lens.focus = Math.max(0.3, target.sub(cam.position).dot(forward));
  fx.lens.cInf = shotAt(f).cInf;
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {/* Same look order as the skill template: ink → depth of field → bloom → neutral tone → grade. */}
      <EffectComposer multisampling={4}>
        <primitive key="ink" object={fx.ink} dispose={null} />
        <primitive key="lens-pre" object={fx.lens.pre} dispose={null} />
        <primitive key="lens" object={fx.lens.main} dispose={null} />
        <primitive key="bloom" object={fx.bloom} dispose={null} />
        <primitive key="tone" object={fx.tone} dispose={null} />
        <primitive key="grade" object={fx.grade} dispose={null} />
      </EffectComposer>
    </>
  );
};

export const KiteShort: React.FC = () => {
  const kit = useKit();
  const dpr = (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
  if (!kit) return <AbsoluteFill style={{ background: "#b8d0ec" }} />;
  return (
    <AbsoluteFill style={{ background: "#b8d0ec" }}>
      <ThreeCanvas width={1080} height={1920} {...(dpr ? { dpr } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 42, near: 0.2, far: 1200 }}>
        <Inner kit={kit} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
