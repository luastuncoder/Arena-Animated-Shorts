import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { type Kit } from "../plane-test/build";
import { InkPass, noInkFallback } from "../plane-test/ink";
import { LensBlur } from "../plane-test/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../plane-test/grade";
import { dawnAt, duskAt, FPS, goldenAt, SHOTS, TOTAL, shotAt } from "./story";
import { ClockWorld, loadKit } from "./world";

export const CM_FPS = FPS;
export const CM_FRAMES = TOTAL;

/** Narration + score, mixed into one track by scripts/mix-clockmaker.py. */
const NARRATION = "clockmaker/mix.wav";

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("loading the clockmaker's town"));
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
  const { camera, scene, gl } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const world = useMemo(() => new ClockWorld(kit), [kit]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, cam),
    lens: new LensBlur({ maxCoC: 26, nearScale: 1.2 }),
    bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.62, luminanceThreshold: 0.97, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 4, radius: 0.55 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [cam, scene]);
  useEffect(() => () => { fx.ink.dispose(); }, [fx]);
  const target = world.update(f, cam, scene);
  // exposure carries the time of day: the room falls dark at dusk, dawn blooms warm
  gl.toneMappingExposure = 1.0 - 0.30 * duskAt(f) + 0.12 * dawnAt(f);
  noInkFallback(world.root);
  const forward = new THREE.Vector3(); cam.getWorldDirection(forward);
  fx.lens.focus = Math.max(0.25, target.sub(cam.position).dot(forward));
  fx.lens.cInf = shotAt(f).cInf;
  // the grade warms into golden hour for the closing shot
  const glow = Math.min(1, dawnAt(f) + goldenAt(f) * 0.4);
  // the grade swaps exactly on the cut into the closing shot, so no pop lands mid-shot
  gradeFor(fx.grade, f >= SHOTS[7].a ? "golden" : "day");
  fx.grade.amount = (f >= SHOTS[7].a ? GRADE_STRENGTH.golden : GRADE_STRENGTH.day) * (0.9 + 0.1 * glow);
  return (
    <>
      <primitive object={world.root} dispose={null} />
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

export const ClockmakerBird: React.FC = () => {
  const kit = useKit();
  const dpr = (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
  if (!kit) return <AbsoluteFill style={{ background: "#b8d0ec" }} />;
  return (
    <AbsoluteFill style={{ background: "#b8d0ec" }}>
      <Audio src={staticFile(NARRATION)} />

      <ThreeCanvas width={1080} height={1920} {...(dpr ? { dpr } : {})} shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 44, near: 0.04, far: 1200 }}>
        <Inner kit={kit} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
