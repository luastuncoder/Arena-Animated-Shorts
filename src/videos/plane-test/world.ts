// An original little town built with the skill's painted materials, world ink,
// two-tone lights, character-card shader and 600x1000 cartoon drawing system.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, house, lam, prop, type Kit } from "./build";
import { cloudHD, cobbleHD, grassHD, rep, stoneHD } from "./paint";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { Pen, bodyFront, fxContact, type Expr, type Outfit } from "./toon";
import { CHAR, TONE, twoTone, untone } from "./shade";
import { LIGHTS, LOOK } from "./lights";
import { NOINK } from "./ink";
import { camAt, glide, IMPACT_FRAME, planeAt, planeRoll, type V3 } from "./story";

// Only the props used in this short; trees and hedges are made by build.ts itself.
const KIT_NAMES = ["lantern", "stall-green", "stall-red", "cart", "stall-bench", "flower_redA", "flower_yellowA"];
let kitPromise: Promise<Kit> | undefined;
export const loadKit = () => {
  if (!kitPromise) {
    const loader = new GLTFLoader();
    kitPromise = Promise.all(KIT_NAMES.map(async (name) => {
      const glb = await loader.loadAsync(staticFile(`bridge/kenney/${name}.glb`));
      return [name, glb.scene] as const;
    })).then((entries) => Object.fromEntries(entries) as Kit);
  }
  return kitPromise;
};

const V = (v: V3) => new THREE.Vector3(...v);
const flat = (w: number, h: number) => new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2);

/** A folded paper aeroplane: separate dimensional panels, plus an inked central fold. */
function planeModel() {
  const group = new THREE.Group();
  const pts = {
    tip: [0.76, 0.05, 0] as V3,
    tailTop: [-0.60, 0.40, -0.06] as V3,
    fold: [-0.18, 0.025, 0.12] as V3,
    tailBottom: [-0.47, -0.31, 0.04] as V3,
    lowerFold: [-0.23, -0.17, 0.04] as V3,
  };
  const panel = (a: V3, b: V3, c: V3, color: string) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([1, 0.5, 0, 1, 0, 0], 2));
    g.computeVertexNormals();
    const m = twoTone(new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
    const mesh = new THREE.Mesh(g, m);
    // The tiny moving plane does not contribute to the town's cached shadow map.
    mesh.castShadow = false; mesh.receiveShadow = true;
    group.add(mesh);
  };
  panel(pts.tip, pts.tailTop, pts.fold, "#fffaf0");
  panel(pts.tip, pts.fold, pts.tailBottom, "#dbe7e8");
  panel(pts.fold, pts.tailBottom, pts.lowerFold, "#f4f1df");
  const ink = twoTone(new THREE.MeshLambertMaterial({ color: "#342e3e" }));
  for (const [a, b] of [[pts.tip, pts.tailTop], [pts.tailTop, pts.fold], [pts.fold, pts.tailBottom], [pts.tailBottom, pts.tip], [pts.fold, pts.tip]] as [V3, V3][]) {
    const curve = new THREE.LineCurve3(V(a), V(b));
    const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 1, 0.009, 5, false), ink);
    group.add(line);
  }
  return group;
}

/** Real geometry pennants, hung above the street instead of flat SVG scenery. */
function pennants(root: THREE.Group, z: number) {
  const thread = twoTone(new THREE.MeshLambertMaterial({ color: "#584d45" }));
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-4.5, 5.0, z), new THREE.Vector3(0, 4.2, z), new THREE.Vector3(4.5, 5.0, z));
  root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.015, 5, false), thread));
  const colors = ["#d66d56", "#e7c677", "#5e8fa7", "#f3e5c5"];
  for (let i = 0; i < 12; i++) {
    const u = 0.06 + i * 0.08, a = curve.getPoint(u), b = curve.getPoint(u + 0.055);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([
      a.x, a.y, a.z, b.x, b.y, b.z, (a.x + b.x) / 2, (a.y + b.y) / 2 - 0.34, z + (i % 2 ? 0.025 : -0.025),
    ], 3));
    g.computeVertexNormals();
    const m = twoTone(new THREE.MeshLambertMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide }));
    const flag = new THREE.Mesh(g, m); flag.castShadow = true; root.add(flag);
  }
}

const OUTFIT: Outfit = {
  jacket: "#2a8290", pants: "#485374", boots: "#2b2634", skin: "#e6b28d",
  hat: "hair", hair: "#593b31", buttons: "#f0cc87", build: "adult",
};

function drawPerson(canvas: HTMLCanvasElement, frame: number) {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas2D is unavailable");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.scale(canvas.width / 600, canvas.height / 1000);
  const walk = frame < 61;
  let expr: Expr = frame < 125 ? "smile" : frame < 213 ? "neutral" : frame < 228 ? "nervous" : frame < 244 ? "shock" : frame < 265 ? "dazed" : frame < 285 ? "neutral" : "smile_closed";
  const b = [42, 127, 184, 257].some((f) => frame >= f && frame < f + 4);
  const wobble = frame >= IMPACT_FRAME ? 9 * Math.sin((frame - IMPACT_FRAME) * 0.55) * Math.exp(-(frame - IMPACT_FRAME) / 13) : 0;
  const wave = frame >= 280 ? Math.sin((frame - 280) * 0.19) : undefined;
  const look = frame < 130 ? -0.75 + 1.35 * glide(frame / 130) : frame < 220 ? 0.75 : 0;
  bodyFront(new Pen(g), OUTFIT, {
    mode: walk ? "stroll" : "stand", phase: (frame / 27) % 1, expr, blink: b, look,
    headTilt: wobble, wave, seed: 37, light: -Math.PI / 3,
  });
}

function skyMaterial() {
  const K = LOOK.day;
  const uniforms: Record<string, THREE.IUniform> = {};
  K.sky.c.forEach((hex, i) => { uniforms[`c${i}`] = { value: untone(hex) }; });
  const e = K.sky.e.map(THREE.MathUtils.degToRad);
  uniforms.e = { value: new THREE.Vector4(e[1], e[2], e[3], e[4]) };
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 c0,c1,c2,c3,c4; uniform vec4 e; varying vec3 vP;
      void main(){ float el=asin(clamp(normalize(vP).y,-1.0,1.0));
      vec3 c=mix(c0,c1,smoothstep(0.0,e.x,el)); c=mix(c,c2,smoothstep(e.x,e.y,el));
      c=mix(c,c3,smoothstep(e.y,e.z,el)); c=mix(c,c4,smoothstep(e.z,e.w,el)); gl_FragColor=vec4(c,1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
}

/** Persistent scene; update() poses everything deterministically for any render frame. */
export class PlaneWorld {
  root = new THREE.Group();
  private sky: THREE.Mesh;
  private clouds: THREE.Mesh[] = [];
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private person: THREE.Mesh;
  private card: THREE.CanvasTexture;
  private canvas: HTMLCanvasElement;
  private plane = planeModel();
  private contact: THREE.Mesh;
  private readonly fog = new THREE.Fog(untone(LIGHTS.day.fog), 25, 300);

  constructor(kit: Kit) {
    const root = this.root;
    // Calibrated sky and lighting are copied from the skill rather than a flat CSS backdrop.
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(800, 40, 20), skyMaterial());
    this.sky.layers.set(NOINK); this.sky.frustumCulled = false; this.sky.renderOrder = -1; root.add(this.sky);
    this.hemi = new THREE.HemisphereLight(LIGHTS.day.sky, LIGHTS.day.ground, LIGHTS.day.hemiI);
    this.sun = new THREE.DirectionalLight(LIGHTS.day.sunCol, LIGHTS.day.sunI);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    this.sun.shadow.bias = LIGHTS.day.bias; this.sun.shadow.normalBias = LIGHTS.day.normalBias;
    // The town and sunlight are static. Render their shadow map once per browser
    // page; the 2D character uses its own moving contact shadow below.
    this.sun.shadow.autoUpdate = false;
    this.sun.shadow.needsUpdate = true;
    this.sun.target.position.set(0, 0, 0);
    this.sun.position.copy(new THREE.Vector3(0.58, 0.74, -0.34).normalize().multiplyScalar(220));
    const sc = this.sun.shadow.camera, shadowRadius = 23;
    sc.left = -shadowRadius; sc.right = shadowRadius; sc.top = shadowRadius; sc.bottom = -shadowRadius; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    root.add(this.hemi, this.sun, this.sun.target);
    for (const [i, x, y, z, w] of [[0, -14, 8.7, -32, 15], [1, 12, 10.5, -45, 18], [2, -34, 12, -64, 23]] as const) {
      const material = new THREE.MeshBasicMaterial({ map: cloudHD(i, LOOK.day.cloud), transparent: true, depthWrite: false, fog: false });
      const cloud = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      cloud.position.set(x, y, z); cloud.scale.set(w, w / 2, 1); cloud.layers.set(NOINK); root.add(cloud); this.clouds.push(cloud);
    }

    const grassMat = lam("plane-grass", () => ({ map: rep(grassHD(), 24, 24) }));
    const roadMat = lam("plane-road", () => ({ map: rep(cobbleHD(), 1.8, 20) }));
    const pavementMat = lam("plane-pavement", () => ({ map: rep(stoneHD("plane-paving"), 0.65, 18) }));
    const grass = new THREE.Mesh(flat(160, 160), grassMat); grass.position.set(0, -0.07, -20); grass.receiveShadow = true; root.add(grass);
    const road = new THREE.Mesh(flat(7.0, 90), roadMat); road.position.set(0, 0, -20); road.receiveShadow = true; root.add(road);
    for (const s of [-1, 1]) {
      const sidewalk = new THREE.Mesh(flat(1.7, 90), pavementMat);
      sidewalk.position.set(s * 4.35, 0.025, -20); sidewalk.receiveShadow = true; root.add(sidewalk);
    }

    // A bespoke street, not the bridge example or its camera shots.
    const town = new Batch();
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const z = -8.0 - i * 8.8;
        house(town, side * 8.3, z, side < 0 ? Math.PI / 2 : -Math.PI / 2, 8.4, 7.2, [7.0, 8.4, 9.2][(i + (side > 0 ? 1 : 0)) % 3], (i * 2 + (side > 0 ? 2 : 0)) % 8, 0);
      }
      for (const z of [-6, -19, -32]) prop(town, kit, "lantern", side * 3.85, 0.04, z, 3.0);
    }
    // Distant cross-street closes the vista and shows a painted facade behind the actor.
    house(town, 0, -52, 0, 12, 7, 8.4, 4, 0);
    prop(town, kit, "tree_oak", -6.2, 0, -4.3, 7.2, 0.2);
    prop(town, kit, "tree_default", 6.4, 0, -13.5, 7.0, 1.3);
    prop(town, kit, "tree_fat", -7.1, 0, -26, 7.5, 0.7);
    prop(town, kit, "stall-green", -4.8, 0.04, -13.8, 2.65, Math.PI / 2);
    prop(town, kit, "stall-red", 4.8, 0.04, -21.5, 2.65, -Math.PI / 2);
    prop(town, kit, "cart", 5.0, 0.04, -29.2, 1.35, -0.5);
    prop(town, kit, "stall-bench", -4.4, 0.04, -23.0, 0.9, 0.2);
    prop(town, kit, "flower_redA", -5.0, 0, -3.1, 0.45);
    prop(town, kit, "flower_yellowA", 5.1, 0, -8.0, 0.45);
    town.build(root);
    pennants(root, -7.0);
    pennants(root, -19.0);

    // A NOINK card keeps its own hand-drawn plum contour. Its surface is shaded
    // by the very same card shader as the skill's original example.
    this.canvas = document.createElement("canvas"); this.canvas.width = 900; this.canvas.height = 1500;
    this.card = new THREE.CanvasTexture(this.canvas); this.card.colorSpace = THREE.SRGBColorSpace; this.card.anisotropy = 8;
    const su = 0.00216;
    const body = new THREE.PlaneGeometry(600 * su, 1000 * su).translate(0, (975 - 500) * su, 0);
    const mat = cardShade(new THREE.MeshLambertMaterial({ map: this.card, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.person = new THREE.Mesh(body, mat);
    this.person.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.person.layers.set(NOINK); this.person.receiveShadow = true; this.person.renderOrder = 1; root.add(this.person);
    const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 128;
    fxContact(new Pen(shadowCanvas.getContext("2d")!), "#89859c");
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas); shadowTexture.colorSpace = THREE.SRGBColorSpace;
    this.contact = new THREE.Mesh(flat(0.9, 0.7), blobMaterial(shadowTexture));
    this.contact.position.set(0, 0.015, 0); this.contact.layers.set(NOINK); this.contact.renderOrder = 0.5; root.add(this.contact);
    this.plane.scale.setScalar(0.55); // a real paper aeroplane, not a full-sized glider
    root.add(this.plane);
  }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const c = camAt(f), L = LIGHTS.day, K = LOOK.day;
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1200; cam.layers.enable(NOINK); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    scene.fog = this.fog; scene.background = null; this.sky.position.copy(cam.position);
    for (const cloud of this.clouds) cloud.lookAt(cam.position.x, cloud.position.y, cam.position.z);
    const focus = V(c.focus);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);

    drawPerson(this.canvas, f); this.card.needsUpdate = true;
    const px = -0.28 * (1 - glide(f / 60));
    this.person.position.set(px, 0.02, 0);
    this.person.rotation.set(0, Math.atan2(cam.position.x - px, cam.position.z), 0);
    this.contact.position.x = px;
    const p = planeAt(f); this.plane.position.set(...p); this.plane.rotation.set(0.1 * Math.sin(f / 30), -0.1 + 0.18 * Math.sin(f / 45), planeRoll(f));
    return focus;
  }
}
