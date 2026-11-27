// "The Kite Thief" world: the same painted town vocabulary (skill facades, cobbles, CC0 props),
// rebuilt as a plaza that a kite escapes across. Original layout, camera plan, kite and characters.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, house, lam, prop, type Kit } from "../plane-test/build";
import { cloudHD, cobbleHD, grassHD, rep, stoneHD } from "../plane-test/paint";
import { cardShade, blobMaterial, CARD_K } from "../plane-test/cardshade";
import { Pen, bodyFront, fxContact, type Expr } from "../plane-test/toon";
import { CHAR, TONE, twoTone, untone } from "../plane-test/shade";
import { LIGHTS, LOOK } from "../plane-test/lights";
import { NOINK } from "../plane-test/ink";
import { camAt, duskAt, glide, kiteAt, kiteRoll, KID_END, KID_HOME, STRING_FRAMES, type V3 } from "./story";
import { drawBurst, drawGran, drawKid, drawKite } from "./art";

const KIT_NAMES = ["lantern", "stall-green", "stall-red", "cart", "stall-bench", "flower_redA", "flower_yellowA", "stall-bench"];
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

/** sky dome. Two stops sets are cross-faded by a uniform so the dusk turn is continuous, not a cut. */
function skyMaterial() {
  const D = LOOK.day, G = LOOK.golden;
  const uniforms: Record<string, THREE.IUniform> = { uDusk: { value: 0 } };
  D.sky.c.forEach((hex, i) => { uniforms[`d${i}`] = { value: untone(hex) }; });
  G.sky.c.forEach((hex, i) => { uniforms[`g${i}`] = { value: untone(hex) }; });
  const e = D.sky.e.map(THREE.MathUtils.degToRad);
  uniforms.e = { value: new THREE.Vector4(e[1], e[2], e[3], e[4]) };
  const stops = (k: string, n: string) => `vec3 ${n}0=${k}0,${n}1=${k}1,${n}2=${k}2,${n}3=${k}3,${n}4=${k}4;`;
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uDusk; uniform vec4 e; varying vec3 vP;
      uniform vec3 d0,d1,d2,d3,d4,g0,g1,g2,g3,g4;
      void main(){ float el=asin(clamp(normalize(vP).y,-1.0,1.0));
      ${stops("d", "a")} ${stops("g", "b")}
      vec3 k=mix(a0,a1,smoothstep(0.0,e.x,el)); k=mix(k,a2,smoothstep(e.x,e.y,el)); k=mix(k,a3,smoothstep(e.y,e.z,el)); k=mix(k,a4,smoothstep(e.z,e.w,el));
      vec3 m=mix(b0,b1,smoothstep(0.0,e.x,el)); m=mix(m,b2,smoothstep(e.x,e.y,el)); m=mix(m,b3,smoothstep(e.y,e.z,el)); m=mix(m,b4,smoothstep(e.z,e.w,el));
      gl_FragColor=vec4(mix(k,m,uDusk),1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
}

/** window card: a warm rectangle that steadies and grows as the town lights up. */
function windowTexture(seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 96;
  const g = canvas.getContext("2d")!;
  g.clearRect(0, 0, 64, 96);
  g.fillStyle = "#ffd79a";
  g.beginPath(); g.roundRect ? g.roundRect(4, 4, 56, 88, 6) : g.rect(4, 4, 56, 88); g.fill();
  g.fillStyle = "rgba(255,246,214,0.55)";
  g.fillRect(8, 12 + (seed % 3) * 8, 22, 34);
  g.fillStyle = "#8a5c33";
  g.fillRect(30, 4, 4, 88); g.fillRect(4, 46, 56, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** the kite card: alpha-tested cut-out so it keeps its hand-drawn silhouette. */
class KiteCard {
  canvas = document.createElement("canvas");
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh;
  constructor() {
    this.canvas.width = this.canvas.height = 600;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    const mat = cardShade(new THREE.MeshLambertMaterial({ map: this.texture, alphaTest: 0.42, side: THREE.DoubleSide }));
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56), mat);
    this.mesh.layers.set(NOINK);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
  }
}

class Actor {
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh;
  constructor(w: number, h: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = w; this.canvas.height = h;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    const su = 0.00162;
    const geo = new THREE.PlaneGeometry(600 * su, 1000 * su).translate(0, (975 - 500) * su, 0);
    const mat = cardShade(new THREE.MeshLambertMaterial({ map: this.texture, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.layers.set(NOINK);
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 1;
  }
}

export class KiteWorld {
  root = new THREE.Group();
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private clouds: THREE.Mesh[] = [];
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private fog = new THREE.Fog(untone(LIGHTS.day.fog), 25, 300);
  private kid = new Actor(900, 1500);
  private gran = new Actor(900, 1500);
  private kite = new KiteCard();
  private contact: THREE.Mesh;
  private burst: Actor;
  private windows: THREE.Mesh[] = [];
  private windowGlow: THREE.MeshBasicMaterial[] = [];
  private stringMesh: THREE.Mesh;
  private stringMat = new THREE.MeshBasicMaterial({ color: "#3f3830", transparent: true, opacity: 0.95, fog: false });

  constructor(kit: Kit) {
    const root = this.root;
    this.skyMat = skyMaterial();
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(800, 40, 20), this.skyMat);
    this.sky.layers.set(NOINK); this.sky.frustumCulled = false; this.sky.renderOrder = -1; root.add(this.sky);

    this.hemi = new THREE.HemisphereLight(LIGHTS.day.sky, LIGHTS.day.ground, LIGHTS.day.hemiI);
    this.sun = new THREE.DirectionalLight(LIGHTS.day.sunCol, LIGHTS.day.sunI);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    this.sun.shadow.bias = LIGHTS.day.bias; this.sun.shadow.normalBias = LIGHTS.day.normalBias;
    this.sun.shadow.autoUpdate = false; this.sun.shadow.needsUpdate = true;
    this.sun.target.position.set(0, 0, -4);
    this.sun.position.copy(new THREE.Vector3(0.62, 0.62, -0.32).normalize().multiplyScalar(220));
    const sc = this.sun.shadow.camera, sr = 26;
    sc.left = -sr; sc.right = sr; sc.top = sr; sc.bottom = -sr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    root.add(this.hemi, this.sun, this.sun.target);

    for (const [i, x, y, z, w] of [[0, -16, 9.4, -34, 16], [1, 13, 11.2, -46, 19], [2, -36, 12.5, -66, 24]] as const) {
      const material = new THREE.MeshBasicMaterial({ map: cloudHD(i, LOOK.day.cloud), transparent: true, depthWrite: false, fog: false });
      const cloud = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      cloud.position.set(x, y, z); cloud.scale.set(w, w / 2, 1); cloud.layers.set(NOINK); root.add(cloud); this.clouds.push(cloud);
    }

    const grassMat = lam("kite-grass", () => ({ map: rep(grassHD(), 24, 24) }));
    const roadMat = lam("kite-road", () => ({ map: rep(cobbleHD(), 1.8, 22) }));
    const pavementMat = lam("kite-pavement", () => ({ map: rep(stoneHD("kite-paving"), 0.65, 18) }));
    const grass = new THREE.Mesh(flat(160, 160), grassMat); grass.position.set(0, -0.07, -20); grass.receiveShadow = true; root.add(grass);
    const road = new THREE.Mesh(flat(7.0, 80), roadMat); road.position.set(0, 0, -16); road.receiveShadow = true; root.add(road);
    for (const s of [-1, 1]) {
      const walk = new THREE.Mesh(flat(1.7, 80), pavementMat);
      walk.position.set(s * 4.35, 0.025, -16); walk.receiveShadow = true; root.add(walk);
    }

    const town = new Batch();
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const z = -8.2 - i * 8.8;
        house(town, side * 8.3, z, side < 0 ? Math.PI / 2 : -Math.PI / 2, 8.4, 7.2, [7.6, 9.2, 8.2][(i + (side > 0 ? 1 : 0)) % 3], (i * 2 + (side > 0 ? 2 : 0)) % 8, 0);
      }
      for (const z of [-6, -17, -30]) prop(town, kit, "lantern", side * 3.85, 0.04, z, 3.0);
    }
    // The far cross-street closes the vista, exactly where the eye needs it.
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
    prop(town, kit, "stall-bench", 3.6, 0, 2.2, 1.05, -Math.PI / 2);
    town.build(root);
    this.pennants(root, -7.0);
    this.pennants(root, -19.0);

    // Window cards: hands the plaza its night one window at a time.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        for (const y of [2.1, 4.4]) {
          const mat = new THREE.MeshBasicMaterial({ map: windowTexture(i * 7 + y * 3), transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: true });
          const w = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.9), mat);
          w.position.set(side * 4.675, y, -8.2 - i * 8.8 - 1.6 + ((i + y) % 3) * 1.7);
          w.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
          w.layers.set(NOINK);
          root.add(w); this.windows.push(w); this.windowGlow.push(mat);
        }
      }
    }

    root.add(this.kid.mesh, this.gran.mesh, this.kite.mesh);
    this.gran.mesh.position.set(-1.02, 0.02, 0.95);
    const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 128;
    fxContact(new Pen(shadowCanvas.getContext("2d")!), "#89859c");
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas); shadowTexture.colorSpace = THREE.SRGBColorSpace;
    this.contact = new THREE.Mesh(flat(0.9, 0.7), blobMaterial(shadowTexture));
    this.contact.position.set(KID_HOME[0], 0.015, KID_HOME[2]); this.contact.layers.set(NOINK); this.contact.renderOrder = 0.5; root.add(this.contact);

    this.burst = new Actor(600, 600);
    this.burst.canvas.width = 600; this.burst.canvas.height = 600;
    this.burst.mesh.geometry = new THREE.PlaneGeometry(1.05, 1.05);
    this.burst.mesh.scale.setScalar(1);
    this.burst.mesh.position.set(KID_END[0] + 0.20, 1.60, KID_END[2] + 0.20);
    this.burst.mesh.visible = false;
    root.add(this.burst.mesh);

    this.stringMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.stringMat);
    this.stringMesh.layers.set(NOINK); this.stringMesh.frustumCulled = false; this.stringMesh.renderOrder = 2;
    root.add(this.stringMesh);
  }

  /** real geometry pennants, hung across the square */
  private pennants(root: THREE.Group, z: number) {
    const thread = twoTone(new THREE.MeshLambertMaterial({ color: "#584d45" }));
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-6.5, 6.2, z), new THREE.Vector3(0, 5.0, z), new THREE.Vector3(6.5, 6.2, z));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.018, 5, false), thread));
    const colors = ["#d66d56", "#e7c677", "#5e8fa7", "#f3e5c5"];
    for (let i = 0; i < 16; i++) {
      const u = 0.04 + i * 0.06, a = curve.getPoint(u), b = curve.getPoint(u + 0.042);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute([
        a.x, a.y, a.z, b.x, b.y, b.z, (a.x + b.x) / 2, (a.y + b.y) / 2 - 0.42, z + (i % 2 ? 0.03 : -0.03),
      ], 3));
      g.computeVertexNormals();
      root.add(new THREE.Mesh(g, twoTone(new THREE.MeshLambertMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide }))));
    }
  }

  private setPerson(mesh: THREE.Mesh, x: number, z: number, camX: number, camZ: number) {
    mesh.position.set(x, 0.02, z);
    mesh.rotation.set(0, Math.atan2(camX - x, camZ - z), 0);
  }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const c = camAt(f), dusk = duskAt(f);
    // Blend the skill's calibrated day and golden looks; the light rig is static, so the cache holds.
    const L = LIGHTS.day, G = LIGHTS.golden;
    const l3 = (a: [number, number, number], b: [number, number, number]) => a.map((v, i) => v + (b[i] - v) * dusk) as [number, number, number];
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1200; cam.layers.enable(NOINK); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    scene.background = null; this.sky.position.copy(cam.position);
    (this.skyMat.uniforms.uDusk.value as number) = dusk;
    this.fog.near = L.fogNear + (G.fogNear - L.fogNear) * dusk;
    this.fog.far = L.fogFar + (G.fogFar - L.fogFar) * dusk;
    this.fog.color.copy(untone(new THREE.Color(L.fog).lerp(new THREE.Color(G.fog), dusk)));
    scene.fog = this.fog;
    for (const cloud of this.clouds) cloud.lookAt(cam.position.x, cloud.position.y, cam.position.z);

    TONE.uLitCol.value.set(...l3(L.lit, G.lit)); TONE.uShadeCol.value.set(...l3(L.shade, G.shade)); TONE.uShadeLift.value.set(...l3(L.lift, G.lift));
    TONE.uLambert.value = L.lambert + (G.lambert - L.lambert) * dusk;
    TONE.uSideK.value = L.sideK + (G.sideK - L.sideK) * dusk;
    TONE.uTerm.value = L.term + (G.term - L.term) * dusk;
    TONE.uBounce.value.set(...l3([0, 0, 0], LOOK.golden.bounce));
    TONE.uSat.value = LOOK.day.sat + (LOOK.golden.sat - LOOK.day.sat) * dusk;
    CHAR.uCharTint.value.set(...l3(L.charTint, G.charTint));
    CHAR.uCharShade.value = L.charShade + (G.charShade - L.charShade) * dusk;
    CHAR.uGrad.value = L.charGrad + (G.charGrad - L.charGrad) * dusk;
    CHAR.uBodyGrad.value = L.bodyGrad + (G.bodyGrad - L.bodyGrad) * dusk;
    CHAR.uSideTint.value.set(...l3(L.sideTint, G.sideTint));
    this.sun.intensity = L.sunI + (G.sunI - L.sunI) * dusk;
    this.sun.color.set(L.sunCol).lerp(new THREE.Color(G.sunCol), dusk);
    this.hemi.intensity = L.hemiI + (G.hemiI - L.hemiI) * dusk;
    this.hemi.color.set(L.sky).lerp(new THREE.Color(G.sky), dusk);
    this.hemi.groundColor.set(L.ground).lerp(new THREE.Color(G.ground), dusk);
    // lanterns and windows switch on in a small cascade once dusk starts
    const lit = (i: number) => Math.max(0, Math.min(1, (dusk - 0.10 - i * 0.03) / 0.4));
    this.windows.forEach((w, i) => {
      const k = lit((i * 5) % 13);
      this.windowGlow[i].opacity = k * 0.95;
      (w.material as THREE.MeshBasicMaterial).color.setRGB(1 + (1 - k) * 0.2, 1 + (1 - k) * 0.15, 1 + (1 - k) * 0.1);
    });

    // kid: strolls in the opening, sprints across the square, then catches and celebrates
    const running = f >= STRING_FRAMES[1] - 8 && f < 126;
    const kx = KID_END[0] - 0.30 * (1 - glide((f - STRING_FRAMES[1] + 8) / 40));
    const kz = KID_END[2] + 0.14 * (1 - glide((f - STRING_FRAMES[1] + 8) / 40));
    const expr: Expr = f < 40 ? "smile" : f < STRING_FRAMES[1] + 8 ? "shock" : f < 340 ? "stern" : f < 360 ? "grin" : "laugh";
    const blink = [22, 96, 214, 330].some((b) => f >= b && f < b + 4);
    drawKid(this.kid.canvas, { frame: f, expr, run: running ? 1 : 0, look: f < 150 ? -0.6 : 0.3, reach: 0, hold: f >= 344 ? glide((f - 344) / 8) : 0 });
    this.kid.texture.needsUpdate = true;
    this.setPerson(this.kid.mesh, kx, kz, cam.position.x, cam.position.z);
    this.contact.position.x = kx; this.contact.position.z = kz;

    // the neighbour watches, then claps
    const granExpr: Expr = f < STRING_FRAMES[1] ? "smile" : f < 340 ? "shock" : "laugh";
    const clap = f < 340 ? 0 : glide((f - 340) / 10) * (0.75 + 0.25 * Math.sin(f * 0.9));
    drawGran(this.gran.canvas, { frame: f, expr: granExpr, look: -0.5, clap });
    this.gran.texture.needsUpdate = true;
    this.setPerson(this.gran.mesh, -1.02, 0.95, cam.position.x, cam.position.z);

    // the kite card faces the lens and banks with the wind
    drawKite(this.kite.canvas, f, f < 96 ? 1 : 1.6);
    this.kite.texture.needsUpdate = true;
    const k = kiteAt(f);
    this.kite.mesh.position.set(...k);
    this.kite.mesh.rotation.set(0.18 * Math.sin(f / 22), 0.22 * Math.sin(f / 30), kiteRoll(f));
    this.kite.mesh.scale.setScalar(f < 210 ? 0.95 : f < 320 ? 0.8 : 0.72);

    // the string: tied to the kite, then to the kid's hand until it snaps
    const handWorld = new THREE.Vector3(kx + 0.22, 1.02, kz + 0.06);
    const cut = f >= STRING_FRAMES[1] - 4;
    this.stringMesh.visible = !cut;
    if (!cut) {
      const pts: THREE.Vector3[] = [];
      const wob = f > STRING_FRAMES[1] - 16 ? (f - (STRING_FRAMES[1] - 16)) / 16 : 0;
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        const sag = Math.sin(u * Math.PI) * (0.22 + wob * 0.5) * (1 - u * 0.4);
        const lag = new THREE.Vector3(0, -sag, 0);
        lag.x += Math.sin(u * 7 + f * 0.6) * 0.02 * wob;
        pts.push(new THREE.Vector3().lerpVectors(handWorld, new THREE.Vector3(...k), u).add(lag));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      this.stringMesh.geometry.dispose();
      this.stringMesh.geometry = new THREE.TubeGeometry(curve, 24, 0.0075, 4, false);
    }

    // celebration burst once the kite is caught
    const bt = (f - 344) / 26;
    this.burst.mesh.visible = bt >= 0 && bt <= 1;
    this.burst.mesh.scale.setScalar(0.75);
    if (this.burst.mesh.visible) {
      drawBurst(this.burst.canvas, Math.max(0, bt));
      this.burst.texture.needsUpdate = true;
      this.burst.mesh.rotation.z = 0.2 * bt;
      this.burst.mesh.position.set(kx + 0.02, 2.25, kz);
    }
    return V(c.focus);
  }
}
