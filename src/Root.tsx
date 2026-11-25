import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "../.claude/skills/cartoon-3d-short/templates/bridge/Bridge";
import { TenSecondTest, TEST_FPS, TEST_FRAMES } from "./videos/test-short/TestShort";
import { PlaneTest, PLANE_TEST_FPS, PLANE_TEST_FRAMES } from "./videos/plane-test/PlaneTest";

export const Root: React.FC = () => (
  <>
    {/* Upstream example, included only as a technical reference. */}
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="TenSecondTest" component={TenSecondTest} durationInFrames={TEST_FRAMES} fps={TEST_FPS} width={1080} height={1920} />
    <Composition id="PlaneTest" component={PlaneTest} durationInFrames={PLANE_TEST_FRAMES} fps={PLANE_TEST_FPS} width={1080} height={1920} />
  </>
);
