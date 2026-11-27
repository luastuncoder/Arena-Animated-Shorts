// "The Clockmaker's Bird" — the workshop and the square, built from the skill's painted
// town kit and its two-tone lighting, ink, card shader and grade. Original layout,
// original characters, original story.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, house, lam, prop, quad, type Kit } from "../plane-test/build";
import { cobbleHD, grassHD, rep, stoneHD, planksHD, beamHD, roofHD, ctex } from "../plane-test/paint";
import { cardShade, blobMaterial, CARD_K } from "../plane-test/cardshade";
import { Pen, bodyFront, fxContact, KID, townsfolk, type Expr, type Outfit } from "../plane-test/toon";
import { CHAR, TONE, twoTone, untone } from "../plane-test/shade";
import { LIGHTS, LOOK } from "../plane-test/lights";
import { NOINK } from "../plane-test/ink";
import { V as BV } from "../plane-test/build";
import { camAt, dawnAt, duskAt, glide, goldenAt, FINAL_TICK, indoorAt, LANDING, nightAt, SNAP, SPRING } from "./story";
import { CLOCKMAKER, drawBrassBird, drawClockFace, drawMote, drawSparrow } from "./art";

const KIT_NAMES = ["lantern", "stall-green", "stall-red", "cart", "stall-bench", "flower_redA", "flower_yellowA", "hedge", "plant_bush"];
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

/** the workshop's warm interior variants of the skill's lighting numbers */
const IX = {
  lit: [1.24, 1.1, 0.95] as [number, number, number],
  shade: [0.55, 0.48, 0.52] as [number, number, number],
  lift: [0.07, 0.06, 0.07] as [number, number, number],
  bounce: [0.03, 0.022, 0.004] as [number, number, number],
  charTint: [1.05, 1.0, 0.95] as [number, number, number],
};
const NO_BOUNCE: [number, number, number] = [0, 0, 0];
/** where the man stands, and where the birds sit on the sill, in world space */
const WIN: [number, number] = [0.95, 1.7];
const SILL_Y = 1.0;
const WIN_W = 1.5, WIN_H = 1.36;
/** the man behind the bench, and the two bird positions */
const CM_POS: [number, number, number] = [-1.72, 0.0, -5.0];
const CM_SCALE = 1.0;
/** the bird on the bench, and where it sits once set on the window sill */
const BRASS_BENCH: [number, number, number] = [-0.68, 0.995, -4.06];
const BRASS_SILL: [number, number, number] = [0.5, SILL_Y + 0.005, -5.2];
const SPARROW_SILL: [number, number, number] = [0.74, SILL_Y + 0.005, -5.16];
const mixHex = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
const flat = (w: number, h: number) => new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2);
type V3T = [number, number, number];

function skyMaterial() {
  const D = LOOK.day, G = LOOK.golden;
  const u: Record<string, THREE.IUniform> = { uGolden: { value: 0 }, uDawn: { value: 0 }, uNight: { value: 0 } };
  D.sky.c.forEach((hex, i) => { u[`d${i}`] = { value: untone(hex) }; });
  G.sky.c.forEach((hex, i) => { u[`g${i}`] = { value: untone(hex) }; });
  const e = D.sky.e.map(THREE.MathUtils.degToRad);
  u.e = { value: new THREE.Vector4(e[1], e[2], e[3], e[4]) };
  const st = (k: string, n: string) => `vec3 ${n}0=${k}0,${n}1=${k}1,${n}2=${k}2,${n}3=${k}3,${n}4=${k}4;`;
  return new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform float uGolden, uDawn, uNight; uniform vec4 e; varying vec3 vP;
      uniform vec3 d0,d1,d2,d3,d4,g0,g1,g2,g3,g4;
      void main(){
        float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
        ${st("d", "a")} ${st("g", "b")}
        vec3 day = mix(a0,a1,smoothstep(0.0,e.x,el)); day = mix(day,a2,smoothstep(e.x,e.y,el));
        day = mix(day,a3,smoothstep(e.y,e.z,el)); day = mix(day,a4,smoothstep(e.z,e.w,el));
        vec3 gold = mix(b0,b1,smoothstep(0.0,e.x,el)); gold = mix(gold,b2,smoothstep(e.x,e.y,el));
        gold = mix(gold,b3,smoothstep(e.y,e.z,el)); gold = mix(gold,b4,smoothstep(e.z,e.w,el));
        // a cool violet night sinks the sky, then dawn lifts it back through peach
        vec3 night = mix(vec3(0.055,0.075,0.14), vec3(0.10,0.11,0.22), smoothstep(-0.1,0.5,el));
        vec3 c = mix(day, gold, uGolden);
        c = mix(c, night, uNight);
        vec3 dawn = mix(vec3(0.30,0.24,0.34), vec3(1.0,0.78,0.55), smoothstep(-0.05,0.45,el));
        c = mix(c, dawn, uDawn);
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
}

/** a warm card texture for the little workshop props (clock faces, a notice board) */
const texCache = new Map<string, THREE.CanvasTexture>();
/** a painted clock face, drawn by art.ts into its own canvas */
function clockFaceTexture(cx: number, cy: number, roman = true) {
  const key = `clock-${cx}-${cy}-${roman}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 400;
  drawClockFace(canvas, 0, roman);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}
function cardTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = texCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext("2d")!);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** A shared card texture that is redrawn often: reuses one canvas instead of allocating per call. */
const faceTex = new Map<string, THREE.CanvasTexture>();

class Actor {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh;
  /** pxPerM: how many canvas pixels make a metre; feetPx: the canvas row where the feet touch the ground */
  constructor(w: number, h: number, art: { pxPerM: number; feetPx: number }) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = w; this.canvas.height = h;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    const su = art.pxPerM;
    const geo = new THREE.PlaneGeometry(w * su, h * su).translate(0, (art.feetPx - h / 2) * su, 0);
    const mat = cardShade(new THREE.MeshLambertMaterial({ map: this.texture, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.layers.set(NOINK);
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 1;
  }
}

/** Workshop lighting: a warm lamp inside, cool window light outside. */
const ROOM = {
  sunI: 1.5, sunCol: "#cfd8f2", hemiI: 0.42, sky: "#c8d6f0", ground: "#7a5a3c",
  wall: "#9a7d5c", wallLit: "#b3947a", beam: "#5e422e", bench: "#8a5f3c", floor: "#9a6f48",
};

export class ClockWorld {
  root = new THREE.Group();
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog(untone(LIGHTS.day.fog), 30, 300);
  private sun: THREE.DirectionalLight;
  private sunDir!: THREE.Vector3;
  private hemi: THREE.HemisphereLight;
  private lamp: THREE.PointLight;
  private clockmaker: Actor;
  private folks: { a: Actor; x: number; z: number; speed: number; outfit: Outfit; seed: number }[] = [];
  private brass: Actor;
  private sparrow: Actor;
  private clockHands: THREE.Mesh[] = [];
  private windowGlow!: THREE.Mesh;
  private windowView!: THREE.Mesh;
  private pendulum!: THREE.Mesh;
  private pendPivot!: THREE.Group;
  private motes: THREE.Mesh[] = [];
  private contact: THREE.Mesh;
  private sparrowStart = 0;
  private groupOutdoor = new THREE.Group();
  private groupRoom = new THREE.Group();

  constructor(kit: Kit) {
    const root = this.root;
    root.add(this.groupOutdoor, this.groupRoom);

    this.skyMat = skyMaterial();
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(800, 40, 20), this.skyMat);
    this.sky.layers.set(NOINK); this.sky.frustumCulled = false; this.sky.renderOrder = -1;
    this.groupOutdoor.add(this.sky);

    this.hemi = new THREE.HemisphereLight(ROOM.sky, ROOM.ground, ROOM.hemiI);
    this.sun = new THREE.DirectionalLight(ROOM.sunCol, ROOM.sunI);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = LIGHTS.day.bias; this.sun.shadow.normalBias = LIGHTS.day.normalBias;
    this.sun.shadow.autoUpdate = false; this.sun.shadow.needsUpdate = true;
    this.sun.target.position.set(0, 0, -2);
    this.sunDir = new THREE.Vector3(0.72, 0.6, -0.3).normalize();
    this.sun.position.copy(this.sunDir.clone().multiplyScalar(200));
    const sc = this.sun.shadow.camera, sr = 9;
    sc.left = -sr; sc.right = sr; sc.top = sr; sc.bottom = -sr; sc.near = 20; sc.far = 420; sc.updateProjectionMatrix();
    root.add(this.hemi, this.sun, this.sun.target);
    // the workshop's own lamp: a low, warm key that only exists indoors
    this.lamp = new THREE.PointLight("#ffce86", 0, 7, 2);
    this.lamp.position.set(-0.55, 1.85, 0.55);
    this.groupRoom.add(this.lamp);

    this.buildTown(kit);
    this.buildWorkshop();
    this.buildBench();

    this.clockmaker = new Actor(600, 1000, { pxPerM: 1.72 / 975, feetPx: 975 });
    this.brass = new Actor(400, 400, { pxPerM: 0.0011, feetPx: 278 });
    this.sparrow = new Actor(400, 400, { pxPerM: 0.00082, feetPx: 278 });
    this.groupRoom.add(this.clockmaker.mesh, this.brass.mesh, this.sparrow.mesh);
    this.brass.mesh.position.set(...BRASS_BENCH);
    this.sparrow.mesh.visible = false;

    // a few townsfolk keep the street alive in the opening and closing wide shots
    const folks: [number, number, number, Outfit][] = [
      [-2.2, -9.0, 0.55, townsfolk(1)], [2.6, -14.0, -0.42, townsfolk(3)],
      [-1.0, -24.0, 0.35, townsfolk(5)], [3.0, -30.0, -0.30, KID],
    ];
    for (const [fx, fz, speed, outfit] of folks) {
      const a = new Actor(600, 1000, { pxPerM: 1.72 / 975, feetPx: 975 });
      a.mesh.position.set(fx, 0.0, fz);
      this.groupOutdoor.add(a.mesh);
      this.folks.push({ a, x: fx, z: fz, speed, outfit, seed: fx * 7 + fz });
    }

    const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 128;
    fxContact(new Pen(shadowCanvas.getContext("2d")!), "#8a7a63");
    const st = new THREE.CanvasTexture(shadowCanvas); st.colorSpace = THREE.SRGBColorSpace;
    this.contact = new THREE.Mesh(flat(0.5, 0.36), blobMaterial(st));
    this.contact.layers.set(NOINK); this.contact.renderOrder = 0.5;
    this.groupRoom.add(this.contact);
  }

  private buildTown(kit: Kit) {
    const g = this.groupOutdoor;
    const grassMat = lam("cm-grass", () => ({ map: rep(grassHD(), 26, 26) }));
    const roadMat = lam("cm-road", () => ({ map: rep(cobbleHD(), 2.2, 24) }));
    const pavementMat = lam("cm-paving", () => ({ map: rep(stoneHD("cm-paving"), 0.7, 20) }));
    const grass = new THREE.Mesh(flat(180, 180), grassMat); grass.position.set(0, -0.08, -24); grass.receiveShadow = true; g.add(grass);
    const road = new THREE.Mesh(flat(8.2, 96), roadMat); road.position.set(0, 0, -20); road.receiveShadow = true; g.add(road);
    for (const s of [-1, 1]) {
      const walk = new THREE.Mesh(flat(1.8, 96), pavementMat);
      walk.position.set(s * 5.1, 0.025, -20); walk.receiveShadow = true; g.add(walk);
    }

    const town = new Batch();
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const z = -9.0 - i * 9.2;
        house(town, side * 9.7, z, side < 0 ? Math.PI / 2 : -Math.PI / 2, 9.0, 7.6, [8.4, 10.2, 9.2, 11.0][(i + (side > 0 ? 1 : 0)) % 4], (i * 3 + (side > 0 ? 2 : 0)) % 8, 0);
      }
      for (const z of [-8, -21, -34]) prop(town, kit, "lantern", side * 4.6, 0.04, z, 3.2);
      prop(town, kit, "plant_bush", side * 6.4, 0, 1.4, 0.9);
    }
    // the clock tower closes the street, a painted face on each side
    this.buildTower(town);
    prop(town, kit, "tree_oak", -7.4, 0, -6.0, 8.2, 0.3);
    prop(town, kit, "tree_fat", 8.2, 0, -17.0, 8.0, 1.1);
    prop(town, kit, "stall-green", -6.0, 0.04, -15.0, 2.8, Math.PI / 2);
    prop(town, kit, "stall-red", 6.1, 0.04, -23.0, 2.8, -Math.PI / 2);
    prop(town, kit, "cart", 6.4, 0.04, 3.0, 1.45, -0.4);
    prop(town, kit, "flower_redA", -6.2, 0, 1.2, 0.5);
    prop(town, kit, "flower_yellowA", 6.0, 0, -1.0, 0.5);
    prop(town, kit, "hedge", -6.6, 0, -12.0, 1.0);
    town.build(g);

    // pennants across the street, hung high so they frame the tower
    const thread = twoTone(new THREE.MeshLambertMaterial({ color: "#584d45" }));
    for (const z of [-4.5, -16.0]) {
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-5.4, 6.6, z), new THREE.Vector3(0, 5.6, z), new THREE.Vector3(5.4, 6.6, z));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.02, 5, false), thread));
      const colors = ["#d66d56", "#e7c677", "#5e8fa7", "#f3e5c5"];
      for (let i = 0; i < 15; i++) {
        const u = 0.04 + i * 0.065, a = curve.getPoint(u), b = curve.getPoint(u + 0.045);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute([
          a.x, a.y, a.z, b.x, b.y, b.z, (a.x + b.x) / 2, (a.y + b.y) / 2 - 0.44, z + (i % 2 ? 0.03 : -0.03),
        ], 3));
        geo.computeVertexNormals();
        g.add(new THREE.Mesh(geo, twoTone(new THREE.MeshLambertMaterial({ color: colors[i % 4], side: THREE.DoubleSide }))));
      }
    }
  }

  /** A stone clock tower: three visible painted faces, a slate cap and a weather vane. */
  private buildTower(batch: Batch) {
    const stone = lam("cm-tower", () => ({ map: rep(stoneHD("cm-towerstone", ["#e2d5bd", "#d6c7ab", "#eadfc8", "#cbb99b"], "#a89880"), 2.4, 7) }));
    const roofM = lam("cm-towerroof", () => ({ map: roofHD("#8f97a8", true), side: THREE.DoubleSide }));
    const trim = lam("cm-trim", () => ({ color: "#efe4c8" }));
    const x = 0, z = -52, w = 3.5, h = 13.0;
    for (const [a, b, c, d] of [
      [[-w, 0, w], [w, 0, w], [w, h, w], [-w, h, w]],
      [[-w, 0, -w], [w, 0, -w], [w, h, -w], [-w, h, -w]],
      [[-w, 0, -w], [-w, 0, w], [-w, h, w], [-w, h, -w]],
      [[w, 0, w], [w, 0, -w], [w, h, -w], [w, h, w]],
    ] as [V3T, V3T, V3T, V3T][]) {
      batch.add(quad(BV(...a), BV(...b), BV(...c), BV(...d), 2.4, 7), stone, new THREE.Matrix4().setPosition(x, 0, z));
    }
    // stone bands, cornice, slate cap and a brass vane
    for (const y of [4.2, 7.4, 10.6]) batch.add(new THREE.BoxGeometry(w * 2.14, 0.16, w * 2.14).translate(x, y, z), trim);
    batch.add(new THREE.BoxGeometry(w * 2.3, 0.55, w * 2.3).translate(x, h + 0.27, z), trim);
    batch.add(new THREE.ConeGeometry(w * 1.55, 3.6, 4, 1, false).rotateY(Math.PI / 4).translate(x, h + 0.55 + 1.8, z), roofM);
    const brass = lam("cm-vane", () => ({ color: "#c9954a" }));
    batch.add(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8).translate(x, h + 4.9, z), brass);
    batch.add(new THREE.BoxGeometry(0.9, 0.05, 0.05).translate(x, h + 5.4, z), brass);
    // three painted clock faces, standing just proud of the stone
    const g = this.groupOutdoor;
    const faces: [number, number, number, number][] = [
      [x, 8.9, z + w + 0.03, 0], [x - w - 0.03, 8.9, z, -Math.PI / 2], [x + w + 0.03, 8.9, z, Math.PI / 2],
    ];
    for (const [fx, fy, fz, ry] of faces) {
      const face = clockFaceTexture(1, 1, false);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), new THREE.MeshBasicMaterial({ map: face, toneMapped: true }));
      m.position.set(fx, fy, fz); m.rotation.y = ry; m.layers.set(NOINK); g.add(m);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.09, 6, 28), lam("cm-clockrim", () => ({ color: "#c9954a" })));
      rim.position.set(fx, fy, fz); rim.rotation.y = ry; g.add(rim);
      // real hands, turning with the town's time
      const pivot = new THREE.Group();
      pivot.position.set(fx, fy, fz); pivot.rotation.y = ry;
      const mk = (len: number, wdt: number, color: string) => new THREE.Mesh(new THREE.BoxGeometry(wdt, len, 0.02).translate(0, len / 2, 0), new THREE.MeshBasicMaterial({ color }));
      const hour = mk(0.78, 0.10, "#2c2520"), minute = mk(1.12, 0.06, "#2c2520");
      pivot.add(hour, minute);
      hour.position.z = 0.04; minute.position.z = 0.05;
      pivot.userData.hour = hour; pivot.userData.minute = minute;
      g.add(pivot); this.clockHands.push(hour, minute);
    }
  }

  private buildWorkshop() {
    const g = this.groupRoom;
    // Room plan (metres): floor 0, back wall z=-5, side walls x=±3.2.
    // Bench against the back wall (left), window to the right of it, man standing behind the bench.
    const BZ = -4.15;      // bench centre (depth 0.92)
    const WALL = -5.5;     // back wall: leaves a walkway behind the bench
    const floorMat = lam("cm-floor", () => ({ map: rep(planksHD(), 3, 3) }));
    const wallMat = lam("cm-wall", () => ({ color: ROOM.wall }));
    const wallLit = lam("cm-walllit", () => ({ color: ROOM.wallLit }));
    const beamMat = lam("cm-beam", () => ({ map: rep(beamHD(), 1, 1) }));
    const benchMat = lam("cm-bench", () => ({ map: rep(planksHD(), 1.2, 0.6) }));
    const floor = new THREE.Mesh(flat(11, 11), floorMat); floor.position.set(0, 0, -2.0); floor.receiveShadow = true; g.add(floor);
    // the back wall is built around the window opening, so the street is really visible through it
    const ox0 = WIN[0] - WIN_W / 2, ox1 = WIN[0] + WIN_W / 2;
    const oy0 = SILL_Y, oy1 = SILL_Y + WIN_H;
    const wallPanel = (x0: number, x1: number, y0: number, y1: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), wallMat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, WALL); m.receiveShadow = true; g.add(m);
    };
    wallPanel(-11, ox0, 0, 4.0);       // left of the window
    wallPanel(ox1, 11, 0, 4.0);        // right of the window
    wallPanel(ox0, ox1, 0, oy0);       // under the sill
    wallPanel(ox0, ox1, oy1, 4.0);     // above the window
    const leftW = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.0), wallLit); leftW.position.set(-3.2, 2.0, -2.0); leftW.rotation.y = Math.PI / 2; leftW.receiveShadow = true; g.add(leftW);
    const rightW = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.0), wallLit); rightW.position.set(3.2, 2.0, -2.0); rightW.rotation.y = -Math.PI / 2; rightW.receiveShadow = true; g.add(rightW);
    for (const [x, y, z, sx, sy, sz] of [
      [0, 3.9, WALL + 0.15, 11, 0.26, 0.3], [-3.2, 3.9, -2.0, 0.22, 0.26, 11],
      [3.2, 3.9, -2.0, 0.22, 0.26, 11], [0, 3.45, WALL + 0.1, 11, 0.2, 0.2],
    ] as const) {
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), beamMat);
      b2.position.set(x, y, z); b2.receiveShadow = true; g.add(b2);
    }

    // ---- the workbench
    const bx0 = -2.75, bx1 = -0.35, topY = 0.95;
    const top = new THREE.Mesh(new THREE.BoxGeometry(bx1 - bx0, 0.09, 0.92), benchMat);
    top.position.set((bx0 + bx1) / 2, topY, BZ); top.castShadow = true; top.receiveShadow = true; g.add(top);
    const apron = new THREE.Mesh(new THREE.BoxGeometry(bx1 - bx0 - 0.06, 0.24, 0.07), benchMat);
    apron.position.set((bx0 + bx1) / 2, topY - 0.14, BZ - 0.42); g.add(apron);
    for (const lx of [bx0 + 0.12, bx1 - 0.12]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, topY, 0.13), benchMat);
      leg.position.set(lx, topY / 2, BZ - 0.32); leg.castShadow = true; g.add(leg);
    }
    const drawers = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.6), benchMat);
    drawers.position.set(bx1 - 0.55, 0.42, BZ - 0.05); drawers.castShadow = true; drawers.receiveShadow = true; g.add(drawers);
    for (let i = 0; i < 3; i++) {
      const pull = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), lam("cm-pull", () => ({ color: "#c9954a" })));
      pull.position.set(bx1 - 0.55, 0.26 + i * 0.21, BZ + 0.26); g.add(pull);
    }

    // ---- the wall clock shelves, high on the left
    for (const [sy, xs] of [[2.72, [-2.55, -2.05, -1.5]], [2.2, [-2.3, -1.8]], [1.7, [-1.25]]] as const) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.5 * xs.length + 0.2, 0.05, 0.26), benchMat);
      shelf.position.set(xs.reduce((a2, b2) => a2 + b2, 0) / xs.length, sy, WALL + 0.16); shelf.receiveShadow = true; g.add(shelf);
      xs.forEach((px, i) => {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.14),
          lam(`cm-clk${i % 3}`, () => ({ color: ["#a8724a", "#c9954a", "#8a5f3c"][i % 3] })));
        body.position.set(px, sy + 0.165, WALL + 0.16); body.castShadow = true; g.add(body);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: clockFaceTexture(px, sy, true), toneMapped: true }));
        face.position.set(px, sy + 0.185, WALL + 0.24); g.add(face);
      });
    }

    // ---- the window, with a deep sill
    const winX = WIN[0], winY = SILL_Y + WIN_H / 2, winW = WIN_W, winH = WIN_H, winZ = WALL + 0.02;
    const winFrame = lam("cm-winframe", () => ({ color: "#5a4230" }));
    const glowTex = cardTex("cm-glow", 256, 256, (gc) => {
      const gr = gc.createRadialGradient(128, 140, 8, 128, 140, 170);
      gr.addColorStop(0, "rgba(255,246,222,1)");
      gr.addColorStop(0.55, "rgba(255,226,176,0.96)");
      gr.addColorStop(1, "rgba(255,210,152,0.85)");
      gc.fillStyle = gr; gc.fillRect(0, 0, 256, 256);
    });
    this.windowGlow = new THREE.Mesh(new THREE.PlaneGeometry(winW * 1.5, winH * 1.6), new THREE.MeshBasicMaterial({
      map: glowTex, toneMapped: true, transparent: true, opacity: 0.0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.windowGlow.position.set(winX, winY, winZ + 0.13);
    this.windowGlow.layers.set(NOINK);
    g.add(this.windowGlow);
    for (const [ox, oy, sx, sy] of [
      [0, winH / 2 + 0.05, winW + 0.3, 0.1], [0, -winH / 2 - 0.05, winW + 0.3, 0.1],
      [-winW / 2 - 0.05, 0, 0.1, winH + 0.3], [winW / 2 + 0.05, 0, 0.1, winH + 0.3],
    ] as const) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.12), winFrame);
      bar.position.set(winX + ox, winY + oy, winZ + 0.07); g.add(bar);
    }
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.06, winH, 0.08), winFrame);
    mull.position.set(winX, winY, winZ + 0.07); g.add(mull);
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.06, 0.08), winFrame);
    crossBar.position.set(winX, winY + 0.26, winZ + 0.07); g.add(crossBar);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.6, 0.09, 0.46), benchMat);
    sill.position.set(winX, SILL_Y - 0.045, winZ + 0.24); sill.castShadow = true; sill.receiveShadow = true; g.add(sill);

    // ---- what you see through the window: the street, roofs and the sky, painted on a card
    const viewTex = cardTex("cm-view", 768, 768, (gc) => {
      // a low autumn street seen from a first-floor window: sky, hills, roofs, a church spire
      const sky = gc.createLinearGradient(0, 0, 0, 768);
      sky.addColorStop(0, "#4d86c6"); sky.addColorStop(0.38, "#79a9d8"); sky.addColorStop(0.62, "#c3c4bb"); sky.addColorStop(0.78, "#d8bd94");
      gc.fillStyle = sky; gc.fillRect(0, 0, 768, 768);
      // soft clouds
      gc.fillStyle = "rgba(255,255,255,0.55)";
      for (const [cx0, cy0, rx] of [[140, 150, 90], [200, 140, 60], [520, 205, 110], [600, 195, 70], [370, 96, 70]] as [number, number, number][]) {
        gc.beginPath(); gc.ellipse(cx0, cy0, rx, rx * 0.42, 0, 0, Math.PI * 2); gc.fill();
      }
      // far ridge
      gc.fillStyle = "#71889c";
      gc.beginPath(); gc.moveTo(0, 470);
      for (let x = 0; x <= 768; x += 32) gc.lineTo(x, 452 - 40 * Math.sin(x * 0.0095) - 14 * Math.sin(x * 0.031));
      gc.lineTo(768, 768); gc.lineTo(0, 768); gc.closePath(); gc.fill();
      // the town: a tight row of roofs and walls filling the lower third
      const rows: [number, number, number, string, string][] = [
        [-20, 200, 556, "#a9885f", "#7f4238"], [150, 170, 540, "#b39469", "#6d3c33"],
        [300, 214, 566, "#9d7f5c", "#84453c"], [492, 190, 546, "#ab8f6a", "#6a3a2f"],
        [660, 180, 560, "#a4865f", "#7a4338"],
      ];
      for (const [rx, rw, ry, wall, roof] of rows) {
        gc.fillStyle = wall; gc.fillRect(rx, ry, rw, 768 - ry);
        gc.fillStyle = roof;
        gc.beginPath(); gc.moveTo(rx - 12, ry); gc.lineTo(rx + rw / 2, ry - 62); gc.lineTo(rx + rw + 12, ry); gc.closePath(); gc.fill();
        gc.fillStyle = "rgba(64,74,86,0.5)";
        for (let wy = ry + 34; wy < 740; wy += 58) for (let wx = rx + 22; wx < rx + rw - 26; wx += 44) gc.fillRect(wx, wy, 20, 30);
      }
      // a church spire poking above the roofs
      gc.fillStyle = "#97896f";
      gc.fillRect(232, 420, 54, 150);
      gc.fillStyle = "#5f6b78";
      gc.beginPath(); gc.moveTo(220, 420); gc.lineTo(259, 330); gc.lineTo(298, 420); gc.closePath(); gc.fill();
      gc.strokeStyle = "#5c6470"; gc.lineWidth = 4;
      gc.beginPath(); gc.moveTo(259, 330); gc.lineTo(259, 300); gc.stroke();
      // a warm strip of street at the very bottom
      gc.fillStyle = "#8d8474"; gc.fillRect(0, 726, 768, 42);
    });
    // a painted street hangs behind the opening, big enough to fill it from any camera angle
    const vH = winW * 2.3;
    const view = new THREE.Mesh(new THREE.PlaneGeometry(vH, vH), new THREE.MeshBasicMaterial({ map: viewTex, toneMapped: true }));
    view.position.set(winX, winY - vH * 0.30, WALL - 1.1);
    view.layers.set(NOINK);
    g.add(view);
    this.windowView = view;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.12, 12), lam("cm-pot", () => ({ color: "#b5623f" })));
    pot.position.set(winX - 0.66, SILL_Y + 0.06, winZ + 0.24); pot.castShadow = true; g.add(pot);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lam("cm-leaf", () => ({ color: "#5f7f4a" })));
    leaf.position.set(winX - 0.66, SILL_Y + 0.2, winZ + 0.24); leaf.scale.set(1, 0.85, 1); g.add(leaf);

    // ---- a hanging lamp over the bench and a lathe in the corner
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.2, 16, 1, true), lam("cm-shade", () => ({ color: "#5d7d6a", side: THREE.DoubleSide })));
    shade.position.set(-2.1, 2.55, -3.5); g.add(shade);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 1.3, 5), lam("cm-cord", () => ({ color: "#3b3128" })));
    cord.position.set(-2.1, 3.3, -3.5); g.add(cord);
    const lathe = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.36, 0.34), benchMat);
    lathe.position.set(2.2, 0.92, BZ); lathe.castShadow = true; g.add(lathe);
    for (const lx of [1.86, 2.54]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.76, 0.11), benchMat);
      leg.position.set(lx, 0.38, BZ); g.add(leg);
    }

    // ---- a grandfather clock, a pegboard of tools, a crate: the room needs furniture
    {
      const gc1 = lam("cm-grand", () => ({ map: rep(planksHD(), 0.6, 2.2) }));
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.15, 0.36), gc1);
      body.position.set(-2.85, 1.08, WALL + 0.3); body.castShadow = true; body.receiveShadow = true; g.add(body);
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.44), benchMat);
      crown.position.set(-2.85, 2.22, WALL + 0.3); crown.castShadow = true; g.add(crown);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.6), new THREE.MeshBasicMaterial({ map: clockFaceTexture(-2.85, 1.9, true), toneMapped: true }));
      glass.position.set(-2.85, 1.85, WALL + 0.49); g.add(glass);
      const pend = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.9), new THREE.MeshBasicMaterial({ color: "#3a3040", transparent: true, opacity: 0.55, toneMapped: true }));
      pend.position.set(-2.85, 1.2, WALL + 0.49); g.add(pend);
      this.pendulum = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), lam("cm-pendbob", () => ({ color: "#c9954a" })));
      this.pendulum.position.set(-2.85, 0.86, WALL + 0.5); this.pendulum.rotation.x = Math.PI / 2; g.add(this.pendulum);
      this.pendPivot = new THREE.Group(); this.pendPivot.position.set(-2.85, 1.62, WALL + 0.5); g.add(this.pendPivot);
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.74, 0.012), lam("cm-rod", () => ({ color: "#8a5f28" })));
      rod.position.set(0, -0.37, 0); this.pendPivot.add(rod);
      const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), lam("cm-bob", () => ({ color: "#c9954a" })));
      bob.rotation.x = Math.PI / 2; bob.position.set(0, -0.74, 0); this.pendPivot.add(bob);
    }
    // pegboard with tools, right of the window
    {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.62, 0.04), lam("cm-peg", () => ({ color: "#7a6146" })));
      board.position.set(2.35, 2.15, WALL + 0.06); g.add(board);
      const steel = lam("cm-steel", () => ({ color: "#9aa2a8" }));
      const woodH = lam("cm-woodh", () => ({ color: "#a8724a" }));
      const tool = (x: number, y: number, len: number, rot: number, mat: THREE.Material) => {
        const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, len, 0.02), mat);
        t2.position.set(x, y, WALL + 0.1); t2.rotation.z = rot; g.add(t2);
      };
      tool(2.12, 2.18, 0.34, 0.12, woodH);
      tool(2.36, 2.2, 0.3, -0.18, steel);
      tool(2.58, 2.16, 0.26, 0.3, woodH);
      const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), lam("cm-spool", () => ({ color: "#c9954a" })));
      spool.rotation.x = Math.PI / 2; spool.position.set(2.5, 1.95, WALL + 0.1); g.add(spool);
    }
    // a crate of spare parts on the floor, and a chair by the window
    {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), lam("cm-crate", () => ({ map: rep(planksHD(), 0.8, 0.6) })));
      crate.position.set(2.4, 0.25, -3.6); crate.castShadow = true; crate.receiveShadow = true; g.add(crate);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.5), benchMat);
      seat.position.set(2.05, 0.5, WALL + 1.05); seat.castShadow = true; g.add(seat);
      const backr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), benchMat);
      backr.position.set(2.05, 0.75, WALL + 0.82); backr.castShadow = true; g.add(backr);
      for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] as const) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), benchMat);
        leg.position.set(2.05 + lx, 0.25, WALL + 1.05 + lz); g.add(leg);
      }
    }

    // ---- dust motes drifting through the window light
    const moteTex = cardTex("cm-mote", 128, 128, (gc) => {
      const gr = gc.createRadialGradient(64, 64, 0, 64, 64, 62);
      gr.addColorStop(0, "rgba(255,246,220,0.95)"); gr.addColorStop(0.45, "rgba(255,236,196,0.3)"); gr.addColorStop(1, "rgba(255,230,190,0)");
      gc.fillStyle = gr; gc.fillRect(0, 0, 128, 128);
    });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.03), new THREE.MeshBasicMaterial({
        map: moteTex, transparent: true, depthWrite: false, opacity: 0.8, toneMapped: true,
      }));
      m.layers.set(NOINK);
      m.userData.seed = i * 0.613;
      this.motes.push(m); g.add(m);
    }
    void drawMote; void wallMat;
  }

  private buildBench() {
    // small brass parts scattered on the bench top, so the close-ups have something to hold
    const part = (x: number, z: number, r: number, color: string, h = 0.03) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), lam(`cm-part${color}`, () => ({ color })));
      m.position.set(x, 0.995, z); m.castShadow = true; m.receiveShadow = true; this.groupRoom.add(m);
    };
    part(-1.06, -4.02, 0.05, "#c9954a");
    part(-1.24, -3.88, 0.028, "#a8772f", 0.07);
    part(-2.42, -4.0, 0.04, "#b8863c");
    part(-2.2, -3.86, 0.022, "#8a5f28", 0.09);
    part(-1.86, -4.06, 0.055, "#8a5f28", 0.05);
    part(-2.6, -3.8, 0.03, "#c9954a", 0.12);
  }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const c = camAt(f);
    const indoor = indoorAt(f) === 1;
    const outdoor = !indoor;
    const dusk = duskAt(f), night = nightAt(f), dawn = dawnAt(f), golden = goldenAt(f);
    this.groupOutdoor.visible = outdoor;
    this.groupRoom.visible = indoor;
    // workshop lights are only meaningful indoors; the sun still does the shadows
    const L = LIGHTS.day;
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.04; cam.far = 1200; cam.layers.enable(NOINK); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    scene.background = null;
    this.sky.position.copy(cam.position);

    (this.skyMat.uniforms.uGolden.value as number) = Math.max(dusk * 0.55, golden);
    (this.skyMat.uniforms.uNight.value as number) = night;
    (this.skyMat.uniforms.uDawn.value as number) = dawn;

    // the room's own light: strongest at dusk, dimmer at dawn
    this.lamp.intensity = 3.0 + dusk * 3.6 + night * 1.6;
    this.lamp.visible = indoor;
    this.windowGlow.visible = indoor;
    if (indoor) {
      const warm = Math.max(dusk, dawn);
      const glowMat = this.windowGlow.material as THREE.MeshBasicMaterial;
      glowMat.color.setRGB(1, 1 - warm * 0.06, 1 - warm * 0.18);
      // only a faint bloom around the opening, never a wash over the view
      glowMat.opacity = 0.06 + 0.16 * (dusk * 0.6 + dawn) + 0.08 * night;
      // dawn: the window blooms as the sun comes up
      const dawnK = dawn;
      // the street outside follows the sky: bright at noon, deep blue at dusk, peach at dawn
      const vm = this.windowView.material as THREE.MeshBasicMaterial;
      // the painted view is an sRGB image, so its tint is mixed in sRGB too
      const srgb = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
      const dayC = srgb(0.92, 0.95, 1.0);
      const duskC = srgb(0.28, 0.34, 0.52);
      const dawnC = srgb(1.0, 0.66, 0.44);
      vm.color.copy(dayC).lerp(duskC, dusk).lerp(dawnC, dawn * 0.85);
      this.windowGlow.scale.setScalar(1 + dawnK * 0.12);
    }

    // two-tone lighting stays the skill's; the room is lit warm, the street cool
    const GL = LIGHTS.golden;
    const mix3 = (a: [number, number, number], b: [number, number, number]) =>
      [a[0] + (b[0] - a[0]) * golden, a[1] + (b[1] - a[1]) * golden, a[2] + (b[2] - a[2]) * golden] as [number, number, number];
    // indoors the key cools and dims as the sun leaves the window
    const roomLit: [number, number, number] = [
      IX.lit[0] * (1 - 0.62 * dusk) + 0.52 * dusk,
      IX.lit[1] * (1 - 0.66 * dusk) + 0.34 * dusk,
      IX.lit[2] * (1 - 0.74 * dusk) + 0.20 * dusk,
    ];
    TONE.uLitCol.value.set(...(indoor ? roomLit : mix3(L.lit, GL.lit)));
    const roomShade: [number, number, number] = [
      IX.shade[0] * (1 - 0.5 * dusk) + 0.06 * dusk,
      IX.shade[1] * (1 - 0.5 * dusk) + 0.07 * dusk,
      IX.shade[2] * (1 - 0.5 * dusk) + 0.16 * dusk,
    ];
    TONE.uShadeCol.value.set(...(indoor ? roomShade : mix3(L.shade, GL.shade)));
    TONE.uShadeLift.value.set(...(indoor ? IX.lift : mix3(L.lift, GL.lift)));
    TONE.uLambert.value = L.lambert + (GL.lambert - L.lambert) * golden; TONE.uSideK.value = L.sideK + (GL.sideK - L.sideK) * golden; TONE.uTerm.value = L.term + (GL.term - L.term) * golden;
    TONE.uBounce.value.set(...(indoor ? IX.bounce : NO_BOUNCE));
    TONE.uSat.value = indoor ? 1.02 : LOOK.day.sat + (LOOK.golden.sat - LOOK.day.sat) * golden;
    CHAR.uCharTint.value.set(...(indoor ? IX.charTint : L.charTint));
    CHAR.uCharShade.value = L.charShade + (GL.charShade - L.charShade) * golden; CHAR.uGrad.value = L.charGrad + (GL.charGrad - L.charGrad) * golden;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    if (!indoor) {
      // golden hour: the sun drops toward the end of the street, so long shadows sweep the square
      const el = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(48, 9, golden));
      const az = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(75, 8, golden));
      this.sunDir.set(Math.cos(el) * Math.cos(az), Math.sin(el), -Math.cos(el) * Math.sin(az));
      this.sun.position.copy(this.sunDir).multiplyScalar(200);
    }
    this.sun.intensity = indoor ? 1.12 * (1 - 0.62 * dusk) : L.sunI + (GL.sunI - L.sunI) * golden;
    this.sun.color.set(indoor ? mixHex("#ffe3bd", "#8fa6d8", dusk) : (golden > 0.5 ? LIGHTS.golden.sunCol : L.sunCol));
    this.hemi.intensity = indoor ? 0.5 : L.hemiI + (GL.hemiI - L.hemiI) * golden;
    this.hemi.color.set(indoor ? "#e6d6c0" : L.sky);
    this.hemi.groundColor.set(indoor ? "#8a6a4a" : L.ground);
    this.fog.color.copy(untone(new THREE.Color(golden > 0.5 ? GL.fog : L.fog)));
    this.fog.near = 40; this.fog.far = 320;
    scene.fog = outdoor ? this.fog : null;


    // clock hands: the town's minute hand creeps; the workshop clocks keep their own time
    const minutes = f * 0.1 + 11 * 60 + 52;
    const hourRot = -(((minutes / 60) % 12) / 12) * Math.PI * 2;
    const minRot = -((minutes % 60) / 60) * Math.PI * 2;
    this.clockHands.forEach((h, i) => {
      if (i % 2 === 0) h.rotation.z = hourRot; else h.rotation.z = minRot;
    });

    // the grandfather clock swings on the second
    if (this.pendPivot) this.pendPivot.rotation.z = Math.sin(f * 0.21) * 0.07;

    // townsfolk stroll, and look up at the tower when the light changes
    for (const p of this.folks) {
      const walk = f < 200 || f > 1060;
      const span = 6.0;
      p.x += p.speed * (walk ? 0.012 : 0.0);
      if (p.x > span) p.x = -span; if (p.x < -span) p.x = span;
      const expr: Expr = f > LANDING ? "smile" : "neutral";
      const look = f > 1090 ? -0.5 : 0.2;
      bodyFront(new Pen(p.a.canvas.getContext("2d")!), p.outfit, {
        mode: walk ? "stroll" : "stand", expr, blink: ((f + p.seed) % 97) < 4,
        phase: ((f + p.seed * 10) / 36) % 1, look, seed: Math.round(p.seed) + 5, light: -Math.PI / 3,
      });
      p.a.texture.needsUpdate = true;
      p.a.mesh.position.set(p.x, 0.02, p.z);
      p.a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
    }

    // dust motes drift up through the window light
    this.motes.forEach((m) => {
      const sd = m.userData.seed as number;
      const t = f / 30;
      m.position.set(
        WIN[0] + 0.42 * Math.sin(t * 0.35 + sd * 6) + 0.08 * Math.sin(t * 1.3 + sd),
        1.05 + ((t * 0.05 + sd) % 1) * 1.5,
        -4.0 + 0.5 * Math.cos(t * 0.28 + sd * 3.1),
      );
      m.lookAt(cam.position);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.55 * Math.sin(((t * 0.05 + sd) % 1) * Math.PI);
    });

    // the clockmaker: works at the bench, then leans in, then laughs
    const expr: Expr = f < 480 ? "neutral" : f < 640 ? "nervous" : f < 860 ? "relief" : f < 1000 ? "neutral" : f < 1060 ? "shock" : "laugh";
    const blink = [40, 150, 320, 520, 700, 880, 1010, 1140].some((b) => f >= b && f < b + 4);
    const work = f < 600 ? 1 : 0;
    const lean = f >= 640 && f < 1100 ? 1 : 0;
    bodyFront(new Pen(this.clockmaker.canvas.getContext("2d")!), CLOCKMAKER, {
      mode: "stand", expr, blink, look: lean ? 0.7 : 0.25,
      phase: (f / 40) % 1, seed: 19, light: -Math.PI / 3,
      tilt: lean * 0.05, headTilt: lean * 0.06 + (f >= SPRING ? 0.04 * Math.sin((f - SPRING) * 0.2) : 0),
      wave: f >= 1116 ? Math.sin((f - 1116) * 0.22) : undefined,
    });
    void work;
    this.clockmaker.texture.needsUpdate = true;
    // he faces the bench (turned slightly right of the lens), except at the window when he looks out
    const toCam = Math.atan2(cam.position.x - CM_POS[0], cam.position.z - CM_POS[2]);
    const facing = indoor ? Math.max(-0.55, Math.min(0.55, toCam * 0.55)) - 0.18 : 0.12;
    this.clockmaker.mesh.position.set(...CM_POS);
    this.clockmaker.mesh.scale.setScalar(CM_SCALE);
    this.clockmaker.mesh.rotation.set(0, facing, 0);
    this.contact.position.set(CM_POS[0], 0.014, CM_POS[2]);
    this.contact.scale.setScalar(1.0);

    // the brass bird: ticks, hops, and finally its spring catches
    const caught = f >= SPRING;
    const hop = f >= 560 && f < 640 ? Math.abs(Math.sin((f - 560) * 0.16)) * 0.6 : 0;
    const song = caught ? glide((f - SPRING) / 40) : 0;
    drawBrassBird(this.brass.canvas, f, { tick: (f % 60) / 60, song });
    this.brass.texture.needsUpdate = true;
    this.brass.mesh.visible = indoor;
    // shots 3-4 it sits on the bench; from shot 5 it has been set on the sill
    const move = f < 732 ? 0 : glide((f - 732) / 26);
    const bxp = BRASS_BENCH[0] + (BRASS_SILL[0] - BRASS_BENCH[0]) * move;
    const byp = BRASS_BENCH[1] + (BRASS_SILL[1] - BRASS_BENCH[1]) * move + hop * 0.05;
    const bzp = BRASS_BENCH[2] + (BRASS_SILL[2] - BRASS_BENCH[2]) * move;
    this.brass.mesh.position.set(bxp, byp - 0.02, bzp);
    this.brass.mesh.rotation.set(0, 0.06 + 0.04 * Math.sin(f * 0.05), 0.02 * Math.sin(f * 0.4));

    // the sparrow: only exists from the dawn shot on; lands, sings, opens its wing
    const landed = f >= LANDING;
    this.sparrow.mesh.visible = landed;
    if (landed) {
      const sing = Math.min(1, Math.max(0, Math.sin((f - LANDING) * 0.12) * 0.5 + 0.5));
      drawSparrow(this.sparrow.canvas, f, { singing: sing, hop: 0, wing: ((f - LANDING) / 30) % 1 });
      this.sparrow.texture.needsUpdate = true;
      const settle = glide((f - LANDING) / 10);
      this.sparrow.mesh.position.set(SPARROW_SILL[0] - 0.10 * (1 - settle), SPARROW_SILL[1] + 0.05 * (1 - settle), SPARROW_SILL[2]);
      this.sparrow.mesh.rotation.set(0, -0.22, 0);
    }

    // at the snap the town's clocks all settle onto the same minute: a twelve-frame ease, not a jump
    if (f >= SNAP) {
      const k = glide((f - SNAP) / 12);
      const settling = -((FINAL_TICK * 0.1 + 11 * 60 + 52) % 60) * (Math.PI * 2) / 60;
      this.clockHands.forEach((h) => { h.rotation.z = h.rotation.z + (settling - h.rotation.z) * k; });
    }
      return new THREE.Vector3(...c.focus);
  }
}
