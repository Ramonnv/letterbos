// Het Letterbos in 3D: het eiland met de springstenen, Pip het draakje, cadeautjes en bekers.
import * as THREE from 'three';
import * as M from './models.js';
import { S } from './state.js';
import { SND } from './audio.js';
import { LEVELS, WORLDS, PIP_COLORS, SLOT } from './content.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ============ de route ============ */
const STEP = 3.3;
export const pathX = z => Math.sin(-z * 0.17) * 4.2 + Math.sin(-z * 0.05) * 3;
const worldStart = WORLDS.map((_, w) => LEVELS.findIndex(L => L.world === w));
const worldOfZ = z => { const i = -z / STEP; let w = 0; worldStart.forEach((s, k) => { if (i >= s - 1.5) w = k; }); return w; };
export function height(x, z) {
  const px = pathX(z), dx = x - px, i = -z / STEP;
  let h = 0.55 + 0.25 * Math.sin(x * 0.3) * Math.cos(z * 0.23) + 0.15 * Math.sin(x * 0.7 + z * 0.4);
  // langzaam omhoog naar de Sterrenberg
  h += smooth(worldStart[3] - 3, LEVELS.length, i) * 3.5 + smooth(worldStart[2] - 3, worldStart[3], i) * 1.0;
  // heuvels aan de zijkanten
  h += smooth(8, 20, Math.abs(dx)) * (1.5 + 1.2 * Math.sin(z * 0.11 + (dx > 0 ? 1 : 3)));
  // het strand: zee aan de rechterkant
  const zee = smooth(worldStart[1] - 2.5, worldStart[1] + 0.5, i) * smooth(worldStart[2] + 0.5, worldStart[2] - 2.5, i);
  h = lerp(h, lerp(h, -1.6, smooth(5.5, 14, dx)), zee);
  // rand van het eiland
  h = lerp(h, -2.5, smooth(26, 34, Math.abs(dx)));
  h = lerp(h, -2.5, smooth(12, 20, z));
  h = lerp(h, -2.5, smooth(-LEVELS.length * STEP - 8, -LEVELS.length * STEP - 16, z));
  // vlak rond elke steen
  return h;
}

/* ============ renderer ============ */
let renderer, scene, camera, sun, hemi, clock, sky, water;
let pip, pipParts, stones = [], hitTargets = [], gifts = [], cupShow = null;
const cam = { pos: V(0, 5, 10), look: V(0, 0, 0), mode: 'map', shake: 0 };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let hooks = {};
const anim = { state: 'idle', t: 0, talk: false, blink: 0, hop: null, faceY: 0, pip: { stone: 0 }, jaw: 0, spin: 0, look: 0 };

export async function init(canvas, h, onProgress) {
  hooks = h;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const lite = /lite/.test(location.search);
  renderer.setPixelRatio(lite ? 0.5 : Math.min(devicePixelRatio || 1, 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !lite; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#d9f1ff', 30, 85);
  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400);
  clock = new THREE.Clock();
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

  hemi = new THREE.HemisphereLight('#eaf6ff', '#c9a87a', 1.15); scene.add(hemi);
  sun = new THREE.DirectionalLight('#fff3e0', 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
  const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 70;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  onProgress(0.05);
  const names = ['pip', 'tree', 'pine', 'bush', 'rock', 'flower', 'mushroom', 'steen', 'palm', 'schelp', 'toren', 'crystal', 'star', 'wolk', 'cadeau', ...WORLDS.map(w => w.cup)];
  await M.loadRecipes();
  const fromBlender = await M.preload(names, p => onProgress(0.05 + p * 0.6));
  buildSky(); buildTerrain(); buildWater(); onProgress(0.75);
  buildProps(); buildStones(); onProgress(0.88);
  buildPip(); buildFx(); onProgress(0.95);
  canvas.addEventListener('pointerdown', onTap);
  placePipAt(Math.max(0, Math.min(S.lastLevel >= 0 ? S.lastLevel : 0, LEVELS.length - 1)));
  snapCamera();
  loop();
  onProgress(1);
  return fromBlender;
}

/* ============ lucht ============ */
function buildSky() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#5fb4ff') }, mid: { value: new THREE.Color('#c9ecff') }, bot: { value: new THREE.Color('#fff4dc') }, night: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, bot; uniform float night; varying vec3 vP;
      float h2(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bot, pow(-h, 0.5));
        vec3 n = h > 0.0 ? mix(vec3(0.45,0.38,0.75), vec3(0.16,0.12,0.38), pow(h, 0.5)) : vec3(0.55,0.45,0.75);
        c = mix(c, n, night);
        vec3 q = floor(vP * 220.0); float s = step(0.996, h2(q)) * night * smoothstep(0.05, 0.3, h);
        gl_FragColor = vec4(c + s, 1.0); }`
  });
  sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), m); sky.renderOrder = -1;
  scene.add(sky);
  const r = rng(7); scene.userData.clouds = [];
  for (let i = 0; i < 16; i++) {
    const c = M.getStatic('wolk');
    c.traverse(o => { if (o.isMesh) { o.castShadow = false; o.material = o.material.clone(); o.material.emissive = new THREE.Color('#ffffff'); o.material.emissiveIntensity = 0.45; } });
    c.scale.setScalar(1.5 + r() * 2);
    c.position.set((r() - .5) * 90, 14 + r() * 10, 10 - r() * (LEVELS.length * STEP + 30));
    c.userData.speed = 0.3 + r() * 0.4;
    scene.add(c); scene.userData.clouds.push(c);
  }
}

/* ============ grond ============ */
const ZONE_COL = [
  [new THREE.Color('#7fd36b'), new THREE.Color('#5ebf5c')],
  [new THREE.Color('#a6dd77'), new THREE.Color('#8fd06a')],
  [new THREE.Color('#9fd98a'), new THREE.Color('#79c07a')],
  [new THREE.Color('#9b8fe0'), new THREE.Color('#7f74cf')]
];
function buildTerrain() {
  const L = LEVELS.length * STEP + 40;
  const g = new THREE.PlaneGeometry(90, L, 120, Math.round(L * 1.4)); g.rotateX(-Math.PI / 2); g.translate(0, 0, -L / 2 + 18);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), c2 = new THREE.Color();
  const sand = new THREE.Color('#f5dea6'), wet = new THREE.Color('#d9c28c'), pad = new THREE.Color('#f1e3c2');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = height(x, z);
    pos.setY(i, Math.max(h, -3));
    const w = worldOfZ(z), wf = clamp(-z / STEP - worldStart[w], 0, 2) / 2;
    const n = 0.5 + 0.5 * Math.sin(x * 0.37 + Math.sin(z * 0.23) * 2) * Math.cos(z * 0.31);
    c.copy(ZONE_COL[w][0]).lerp(ZONE_COL[w][1], n * 0.8);
    if (w > 0 && wf < 1) { c2.copy(ZONE_COL[w - 1][0]).lerp(ZONE_COL[w - 1][1], n * 0.8); c.lerp(c2, 1 - smooth(0, 1, wf)); }
    const pd = Math.abs(x - pathX(z));
    if (pd < 1.6) c.lerp(pad, smooth(1.6, 0.9, pd) * 0.8);
    if (h < 0.35) c.lerp(sand, smooth(0.35, 0.05, h));
    if (h < -0.1) c.copy(wet);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.receiveShadow = true; scene.add(mesh);
}
function buildWater() {
  const L = LEVELS.length * STEP + 200;
  const m = new THREE.MeshStandardMaterial({ color: '#5fd0ff', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
  water = new THREE.Mesh(new THREE.PlaneGeometry(400, L, 1, 1), m);
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.05, -L / 2 + 60);
  water.receiveShadow = true; scene.add(water);
}

/* ============ bomen, bloemen, torens… ============ */
// Niets neerzetten tussen de camera en Pip
function blocksView(x, z) {
  const i0 = Math.max(0, Math.floor(-z / STEP) - 1);
  for (let i = i0; i < i0 + 4; i++) {
    const zs = -i * STEP; const t = (z - zs) / 7.4; if (t < -0.15 || t > 1.2) continue;
    const lx = pathX(zs) + 1.2 * t; if (Math.abs(x - lx) < 2.4 + t * 1.8) return true;
  }
  return false;
}
function buildProps() {
  const r = rng(11);
  const bucket = {};
  const add = (name, x, z, s = 1, color) => { (bucket[name] = bucket[name] || []).push({ pos: V(x, height(x, z) - 0.05, z), rot: r() * 6.28, scale: s, color }); };
  const zEnd = -LEVELS.length * STEP;
  for (let k = 0; k < 900; k++) {
    const z = 8 - r() * (-zEnd + 14), side = r() < 0.5 ? -1 : 1, d = 3.2 + r() * 20, x = pathX(z) + side * d;
    const h = height(x, z); if (h < 0.3) continue;
    if (blocksView(x, z)) continue;
    const w = worldOfZ(z), q = r();
    if (w === 0) { if (q < .25 && d > 5) add('tree', x, z, 0.8 + r() * .5); else if (q < .4) add('bush', x, z, .8 + r() * .5); else if (q < .7) add('flower', x, z, 1 + r()); else if (q < .8) add('mushroom', x, z, 1 + r()); else if (d > 6) add('pine', x, z, .8 + r() * .4); }
    if (w === 1) { if (q < .25 && d > 4) add('palm', x, z, .8 + r() * .4); else if (q < .45) add('schelp', x, z, 1.2 + r()); else if (q < .6) add('bush', x, z, .7); else if (q < .8) add('flower', x, z, 1.2); else add('rock', x, z, .6 + r() * .5); }
    if (w === 2) { if (q < .3 && d > 5) add('pine', x, z, .9 + r() * .5); else if (q < .5) add('rock', x, z, .6 + r() * .7); else if (q < .7) add('flower', x, z, 1.2); else add('bush', x, z, .8); }
    if (w === 3) { if (q < .3) add('crystal', x, z, .8 + r() * 1.2); else if (q < .5 && d > 5) add('pine', x, z, .9); else if (q < .7) add('mushroom', x, z, 1.5); else add('rock', x, z, .7); }
  }
  // per stuk van de route apart, zodat alleen wat dichtbij is getekend wordt
  scene.userData.chunks = [];
  for (const [name, tr] of Object.entries(bucket)) {
    const byChunk = {};
    tr.forEach(t => { const c = Math.floor(-t.pos.z / 16); (byChunk[c] = byChunk[c] || []).push(t); });
    for (const [c, list] of Object.entries(byChunk)) {
      const g = M.instanced(name, list); g.userData.z = -(+c + 0.5) * 16; scene.add(g); scene.userData.chunks.push(g);
    }
  }
  // kasteeltorens en een vuurtoren-achtige toren aan zee
  const t2 = worldStart[2], t3 = worldStart[3];
  [[t2 + 1, -9, 1.2], [t2 + 3, 10, 1.0], [t2 + 5, -12, 1.4], [worldStart[1] + 2, -10, 0.9], [t3 + 4, 11, 1.1]].forEach(([i, dx, s]) => {
    const z = -i * STEP, x = pathX(z) + dx; const t = M.getStatic('toren'); t.scale.setScalar(s); t.position.set(x, height(x, z) - 0.1, z); t.rotation.y = -Math.sign(dx) * 0.6; scene.add(t);
  });
  // zwevende sterren boven de Sterrenberg
  scene.userData.floaters = [];
  for (let k = 0; k < 14; k++) {
    const z = -(t3 + r() * (LEVELS.length - t3)) * STEP, x = pathX(z) + (r() - .5) * 16;
    const st = M.getStatic('star'); st.scale.setScalar(0.5 + r() * 0.5); st.position.set(x, height(x, z) + 3 + r() * 3, z);
    st.userData.base = st.position.y; st.userData.ph = r() * 6; scene.add(st); scene.userData.floaters.push(st);
  }
}

/* ============ springstenen met letters ============ */
function letterTex(text, opts = {}) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const emoji = /\p{Extended_Pictographic}/u.test(text);
  const size = emoji ? 150 : text.length > 2 ? 110 : text.length > 1 ? 150 : 190;
  g.font = (emoji ? '' : '700 ') + size + 'px ' + (emoji ? 'sans-serif' : 'Andika, "Baloo 2", sans-serif');
  if (!emoji) {
    g.lineJoin = 'round'; g.lineWidth = 26; g.strokeStyle = opts.stroke || '#7b6bff'; g.strokeText(text, 128, 140);
    g.fillStyle = opts.fill || '#ffffff'; g.fillText(text, 128, 140);
  } else g.fillText(text, 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function stonePos(i) { const z = -i * STEP, x = pathX(z); return V(x, Math.max(height(x, z), 0.1), z); }
export function stoneTop(i) { return stonePos(i).add(V(0, 0.42, 0)); }
const STROKE = ['#4fae55', '#2d9fd9', '#e0457b', '#7b6bff'];
function buildStones() {
  const ringGeo = new THREE.TorusGeometry(0.9, 0.07, 8, 40); ringGeo.rotateX(Math.PI / 2);
  LEVELS.forEach((L, i) => {
    const p = stonePos(i);
    const st = M.getStatic('steen'); st.position.copy(p); st.rotation.y = i * 1.3; scene.add(st);
    if (L.type === 'feest') st.scale.set(1.35, 1.1, 1.35);
    const label = L.type === 'klank' ? L.sound : L.type === 'woord' ? 'abc' : '🎉';
    const tex = letterTex(label, { stroke: STROKE[L.world] });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.setScalar(L.type === 'klank' ? 1.25 : 1.1); sp.position.copy(p).add(V(0, 2.4, 0));
    scene.add(sp);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#fff27a', transparent: true, opacity: 0.0, depthWrite: false }));
    ring.position.copy(p).add(V(0, 0.45, 0)); scene.add(ring);
    const starsG = new THREE.Group(); starsG.position.copy(p).add(V(0, 0.5, 0)); scene.add(starsG);
    let cup = null;
    if (L.type === 'feest') {
      cup = M.getStatic(WORLDS[L.world].cup); cup.scale.setScalar(0.9);
      cup.position.copy(p).add(V(-1.6, 0.0, -0.4)); scene.add(cup);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.5, 16), M.material('#f6f0ff', 'stone'));
      ped.position.copy(cup.position).add(V(0, -0.15, 0)); ped.castShadow = ped.receiveShadow = true; scene.add(ped);
      cup.position.y += 0.1;
    }
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(p).add(V(0, 1, 0)); hit.userData.stone = i; scene.add(hit); hitTargets.push(hit);
    stones.push({ L, st, sp, ring, starsG, cup, p, shown: -1 });
  });
  refreshStones();
}
const starTex = letterTex('⭐');
export function refreshStones() {
  const next = LEVELS.findIndex((_, i) => !S.done[i]);
  stones.forEach((s, i) => {
    const done = S.done[i], open = done || i === next || S.unlockAll;
    s.sp.material.opacity = open ? 1 : 0.35;
    s.sp.material.color.set(open ? '#ffffff' : '#9a96b0');
    s.isNext = i === next;
    const n = done ? done.stars : 0;
    if (s.shown !== n) {
      s.shown = n; s.starsG.clear();
      for (let k = 0; k < n; k++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, depthWrite: false })); m.scale.setScalar(0.42); m.position.set((k - (n - 1) / 2) * 0.42, 0.12 + (k === 1 ? 0.08 : 0), 0.62); s.starsG.add(m); }
    }
    if (s.cup) {
      const won = S.cups.includes(WORLDS[s.L.world].cup);
      s.cup.traverse(o => { if (o.isMesh) { o.userData.mat0 = o.userData.mat0 || o.material; o.material = won ? o.userData.mat0 : GREY; } });
    }
  });
}
const GREY = new THREE.MeshStandardMaterial({ color: '#b9b4c7', roughness: 0.9, transparent: true, opacity: 0.6 });

/* ============ Pip ============ */
function buildPip() {
  pip = M.get('pip'); pipParts = pip.userData.parts;
  pip.traverse(o => { if (o.isMesh) o.castShadow = true; });
  for (const k of ['body', 'head', 'jaw', 'eyeL', 'eyeR', 'armL', 'armR', 'legL', 'legR', 'wingL', 'wingR', 'tail']) {
    const p = pipParts[k]; if (p) p.userData.rest = { pos: p.position.clone(), rot: p.rotation.clone(), scale: p.scale.clone() };
  }
  scene.add(pip);
  // schaduwvlekje
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; scene.add(sh); pip.userData.shadow = sh;
  applyLook();
}
export function applyLook() {
  if (!pip) return;
  // alleen de accessoire-onderdelen zelf (in Blender-modellen hebben ze ook kind-stukjes zoals acc_kroon_1)
  for (const id of Object.keys(SLOT)) { const o = pipParts['acc_' + id]; if (o) { o.visible = S.wearing.includes(id); o.traverse(c => { if (c !== o) c.visible = true; }); } }
  M.recolor(pip, PIP_COLORS[S.color] || PIP_COLORS.groen);
}
export function popAccessory(id) {
  const o = pipParts['acc_' + id]; if (!o) return;
  o.visible = true; o.scale.setScalar(0.01); o.userData.pop = 0;
  burst(o.getWorldPosition(V(0, 0, 0)), '#ffe36b', 30, 3, 2);
}
function placePipAt(i) {
  anim.pip.stone = i; const p = stoneTop(i);
  pip.position.copy(p); pip.rotation.y = 0;
}
export const pipStone = () => anim.pip.stone;

// Spring naar steen i (via alle stenen ertussen)
export function hopTo(i) {
  return new Promise(res => {
    const from = anim.pip.stone; if (i === from) return res();
    const dir = Math.sign(i - from), steps = [];
    for (let k = from + dir; dir > 0 ? k <= i : k >= i; k += dir) steps.push(k);
    const fast = steps.length > 4;
    const next = () => {
      if (!steps.length) { anim.hop = null; anim.faceY = 0; return res(); }
      const k = steps.shift();
      anim.hop = { a: pip.position.clone(), b: stoneTop(k), t: 0, d: fast ? 0.28 : 0.5, k, done: next };
      SND.boing();
    };
    next();
  });
}

export function setTalk(on) { anim.talk = on; }
export function play(state) { anim.state = state; anim.t = 0; if (state === 'happy') SND.jump(); }

// Waar is de mond van Pip op het scherm? (daar vliegen de letters heen)
export function mouthScreen() {
  const v = pipParts.jaw.getWorldPosition(V(0, 0, 0)).add(V(0, 0.05, 0.25));
  v.project(camera);
  return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
}

/* ============ camera ============ */
// map: Pip op zijn steen, de route ervoor. game: dichtbij, Pip boven in beeld.
export function setMode(m) { cam.mode = m; }
function camTarget() {
  const p = pip.position;
  if (cam.mode === 'game') {
    const portrait = innerHeight > innerWidth;
    return { pos: V(p.x, p.y + 1.5, p.z + (portrait ? 5.4 : 4.3)), look: V(p.x, p.y + (portrait ? -0.55 : -0.5), p.z) };
  }
  if (cam.mode === 'gift') return { pos: V(p.x, p.y + 1.8, p.z + 5.2), look: V(p.x, p.y + 0.3, p.z + 1.2) };
  return { pos: V(p.x + 1.2, p.y + 4.2, p.z + 7.4), look: V(p.x - 0.3, p.y + 0.4, p.z - 3.5) };
}
function snapCamera() { const t = camTarget(); cam.pos.copy(t.pos); cam.look.copy(t.look); }

/* ============ tikken ============ */
function onTap(e) {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (gifts.length) {
    const hit = ray.intersectObjects(gifts.map(g => g.obj), true)[0];
    if (hit) { let o = hit.object; while (o && o.userData.gift === undefined) o = o.parent; if (o) hooks.onGift && hooks.onGift(o.userData.gift); }
    return;
  }
  if (cam.mode !== 'map') return;
  const ph = ray.intersectObject(pip, true)[0];
  if (ph) { hooks.onPip && hooks.onPip(); return; }
  const h = ray.intersectObjects(hitTargets, false)[0];
  if (h) hooks.onStone && hooks.onStone(h.object.userData.stone);
}

/* ============ cadeautjes ============ */
export function showGifts(n = 2) {
  clearGifts(); setMode('gift');
  const p = pip.position;
  for (let k = 0; k < n; k++) {
    const g = M.get('cadeau'); g.userData.gift = k;
    const colors = [['#ff6fb5', '#ff4fa0'], ['#5fb4ff', '#3d8fe0'], ['#7cdc7c', '#4fbf5f']][k % 3];
    g.traverse(o => { if (o.isMesh && /ff6fb5|ff4fa0/.test(o.material.name)) { o.material = o.material.clone(); o.material.color.set(/ff4fa0/.test(o.material.name) ? colors[1] : colors[0]); } });
    g.position.set(p.x + (k - (n - 1) / 2) * 1.5, p.y + 0.0, p.z + 1.6);
    g.scale.setScalar(0.01);
    scene.add(g); gifts.push({ obj: g, t: -k * 0.15, open: -1, base: g.position.y });
  }
}
export function openGift(k) {
  const g = gifts[k]; if (!g) return;
  g.open = 0; SND.pop();
  burst(g.obj.position.clone().add(V(0, 0.8, 0)), '#ffe36b', 50, 4, 3);
  burst(g.obj.position.clone().add(V(0, 0.8, 0)), '#ff8fcf', 30, 3, 3);
  gifts.forEach((o, j) => { if (j !== k) o.fade = 0; });
}
export function clearGifts() { gifts.forEach(g => scene.remove(g.obj)); gifts = []; }

/* ============ beker winnen ============ */
export function showCup(cupName) {
  hideCup();
  const c = M.get(cupName); c.scale.setScalar(0.01);
  const p = pip.position; c.position.set(p.x + 0.9, p.y + 0.2, p.z + 0.8);
  scene.add(c); cupShow = { obj: c, t: 0 };
  fireworks(10);
}
export function hideCup() { if (cupShow) scene.remove(cupShow.obj); cupShow = null; }

/* ============ deeltjes ============ */
let fx;
function dot() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
function buildFx() {
  const n = 1200, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3).fill(-999), 3));
  g.setAttribute('pcolor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(n), 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { map: { value: dot() }, uScale: { value: innerHeight } },
    vertexShader: `attribute vec3 pcolor; attribute float alpha; attribute float size; uniform float uScale; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * uScale / max(0.1, -mv.z); vC = pcolor; vA = alpha; }`,
    fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA;
      void main(){ float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }`
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
  fx = { pts, n, i: 0, life: new Float32Array(n), max: new Float32Array(n), vel: new Float32Array(n * 3), size0: new Float32Array(n), grav: new Float32Array(n) };
  addEventListener('resize', () => { m.uniforms.uScale.value = innerHeight; });
}
function emit(p, color, count, speed, up, size, life, grav = 4) {
  const pos = fx.pts.geometry.attributes.position, col = fx.pts.geometry.attributes.pcolor, c = new THREE.Color(color);
  for (let k = 0; k < count; k++) {
    const i = fx.i = (fx.i + 1) % fx.n;
    pos.setXYZ(i, p.x, p.y, p.z); col.setXYZ(i, c.r, c.g, c.b);
    const a = Math.random() * 6.3, s = speed * (0.3 + Math.random() * 0.7);
    fx.vel[i * 3] = Math.cos(a) * s; fx.vel[i * 3 + 1] = up * (0.5 + Math.random()); fx.vel[i * 3 + 2] = Math.sin(a) * s;
    fx.life[i] = fx.max[i] = life * (0.7 + Math.random() * 0.6); fx.size0[i] = size * (0.7 + Math.random() * 0.6); fx.grav[i] = grav;
  }
}
export function burst(p, color = '#ffd23f', count = 24, speed = 3, up = 2) { emit(p, color, count, speed, up, 0.18, 0.9); }
export function sparkleAtPip(color = '#ffe36b') { burst(pip.position.clone().add(V(0, 1.0, 0.3)), color, 26, 2.5, 2.5); }
export function fireworks(n = 8) {
  const cols = ['#ff5d8f', '#ffd23f', '#5de2ff', '#9b7bff', '#7cf0a8', '#ff9f5a'];
  for (let k = 0; k < n; k++) setTimeout(() => {
    const p = pip.position.clone().add(V((Math.random() - .5) * 6, 3 + Math.random() * 2.5, -1 - Math.random() * 3));
    emit(p, cols[k % cols.length], 70, 4, 1.2, 0.22, 1.5, 1.8); SND.pop();
  }, k * 300);
}
function stepFx(dt) {
  const pos = fx.pts.geometry.attributes.position, al = fx.pts.geometry.attributes.alpha, sz = fx.pts.geometry.attributes.size;
  for (let i = 0; i < fx.n; i++) {
    if (fx.life[i] <= 0) { if (al.getX(i) !== 0) { al.setX(i, 0); pos.setXYZ(i, -999, -999, -999); } continue; }
    fx.life[i] -= dt; fx.vel[i * 3 + 1] -= fx.grav[i] * dt;
    pos.setXYZ(i, pos.getX(i) + fx.vel[i * 3] * dt, pos.getY(i) + fx.vel[i * 3 + 1] * dt, pos.getZ(i) + fx.vel[i * 3 + 2] * dt);
    const f = Math.max(0, fx.life[i] / fx.max[i]);
    al.setX(i, Math.min(1, f * 2)); sz.setX(i, fx.size0[i] * (0.5 + 0.5 * Math.min(1, f * 3)));
  }
  pos.needsUpdate = al.needsUpdate = sz.needsUpdate = true;
}

/* ============ Pip laten bewegen ============ */
function rest(name) { const p = pipParts[name]; if (!p) return null; const r = p.userData.rest; p.position.copy(r.pos); p.rotation.copy(r.rot); p.scale.copy(r.scale); return p; }
function animatePip(dt, t) {
  for (const k of ['body', 'head', 'jaw', 'eyeL', 'eyeR', 'armL', 'armR', 'legL', 'legR', 'wingL', 'wingR', 'tail']) rest(k);
  const P = pipParts; anim.t += dt;
  const at = anim.t;
  // ademen, wiebelen, vleugeltjes
  P.body.scale.y *= 1 + Math.sin(t * 2.4) * 0.025;
  P.head.rotation.z = Math.sin(t * 1.3) * 0.05;
  P.head.rotation.x = Math.sin(t * 0.9) * 0.03;
  P.tail.rotation.y = Math.sin(t * 2.2) * 0.35;
  P.wingL.rotation.y = -Math.sin(t * 3) * 0.15; P.wingR.rotation.y = Math.sin(t * 3) * 0.15;
  P.armL.rotation.z = Math.sin(t * 1.7) * 0.08; P.armR.rotation.z = -Math.sin(t * 1.7 + 1) * 0.08;
  // knipperen
  anim.blink -= dt; if (anim.blink < -0.12) anim.blink = 2 + Math.random() * 3;
  if (anim.blink < 0) { P.eyeL.scale.y *= 0.12; P.eyeR.scale.y *= 0.12; }
  // praten: mond open en dicht
  let jaw = anim.talk ? (0.18 + 0.18 * Math.abs(Math.sin(t * 13))) : 0;
  let y = 0, spin = 0;
  switch (anim.state) {
    case 'eat': { // mond wijd open, dan 3x kauwen
      if (at < 0.35) jaw = 0.65 * smooth(0, 0.2, at);
      else if (at < 1.3) { jaw = 0.3 * Math.abs(Math.sin((at - 0.35) * 10)); P.body.scale.x *= 1 + 0.06 * Math.abs(Math.sin((at - .35) * 10)); }
      else anim.state = 'happy', anim.t = 0;
      break;
    }
    case 'happy': {
      const k = clamp(at / 0.7, 0, 1);
      y = Math.sin(k * Math.PI) * 0.55; spin = k * Math.PI * 2;
      P.armL.rotation.z = -1.2 * Math.sin(k * Math.PI); P.armR.rotation.z = 1.2 * Math.sin(k * Math.PI);
      P.wingL.rotation.y = -0.6 * Math.sin(at * 25); P.wingR.rotation.y = 0.6 * Math.sin(at * 25);
      jaw = 0.25;
      if (at > 0.8) anim.state = 'idle';
      break;
    }
    case 'no': {
      P.head.rotation.y = Math.sin(at * 18) * 0.4 * (1 - clamp(at / 0.9, 0, 1));
      P.body.rotation.z = Math.sin(at * 18) * 0.05;
      if (at > 0.9) anim.state = 'idle';
      break;
    }
    case 'dance': {
      y = Math.abs(Math.sin(at * 6)) * 0.25;
      P.body.rotation.z = Math.sin(at * 6) * 0.15;
      P.armL.rotation.z = -1.0 - Math.sin(at * 12) * 0.4; P.armR.rotation.z = 1.0 + Math.sin(at * 12) * 0.4;
      P.wingL.rotation.y = -0.5 * Math.sin(at * 20); P.wingR.rotation.y = 0.5 * Math.sin(at * 20);
      P.tail.rotation.y = Math.sin(at * 12) * 0.6; jaw = Math.max(jaw, 0.22);
      if (at > 3) anim.state = 'idle';
      break;
    }
    case 'giggle': {
      P.body.scale.y *= 1 + Math.sin(at * 30) * 0.05; P.body.rotation.z = Math.sin(at * 22) * 0.12; jaw = 0.3;
      P.eyeL.scale.y *= 0.25; P.eyeR.scale.y *= 0.25;
      if (at > 1.0) anim.state = 'idle';
      break;
    }
    case 'listen': {
      P.head.rotation.z = 0.22; P.head.rotation.x = -0.05;
      break;
    }
  }
  anim.jaw = lerp(anim.jaw, jaw, Math.min(1, dt * 18));
  P.jaw.rotation.x = anim.jaw;
  // springen tussen stenen
  if (anim.hop) {
    const h = anim.hop; h.t += dt / h.d; const k = Math.min(1, h.t);
    pip.position.lerpVectors(h.a, h.b, k); pip.position.y += Math.sin(k * Math.PI) * 1.1;
    const dx = h.b.x - h.a.x, dz = h.b.z - h.a.z; anim.faceY = Math.atan2(dx, dz);
    P.body.scale.y *= 1 + Math.sin(k * Math.PI) * 0.12;
    P.legL.rotation.x = -0.6 * Math.sin(k * Math.PI); P.legR.rotation.x = -0.6 * Math.sin(k * Math.PI);
    P.wingL.rotation.y = -0.7 * Math.sin(t * 30); P.wingR.rotation.y = 0.7 * Math.sin(t * 30);
    if (k >= 1) { anim.pip.stone = h.k; burst(h.b.clone().add(V(0, 0.1, 0)), '#ffffff', 10, 1.5, 0.8); SND.land && SND.land(); const d = h.done; anim.hop = null; d(); }
  } else {
    const base = stoneTop(anim.pip.stone);
    pip.position.x = base.x; pip.position.z = base.z; pip.position.y = base.y + y;
  }
  // draaien: naar de camera kijken (0), of springrichting
  const want = anim.hop ? anim.faceY : (cam.mode === 'map' ? 0.25 : 0);
  let d = want - anim.look; d = Math.atan2(Math.sin(d), Math.cos(d));
  anim.look += d * Math.min(1, dt * 8);
  pip.rotation.y = anim.look + spin;
  // accessoire laten 'ploppen'
  for (const o of Object.values(pipParts)) if (o.userData.pop !== undefined) {
    o.userData.pop += dt; const k = Math.min(1, o.userData.pop / 0.6);
    const back = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); // easeOutBack
    o.scale.setScalar(Math.max(0.01, back));
    if (k >= 1) { o.scale.setScalar(1); delete o.userData.pop; }
  }
  const sh = pip.userData.shadow; sh.position.set(pip.position.x, stoneTop(anim.pip.stone).y + 0.01, pip.position.z);
  sh.scale.setScalar(1 - clamp((pip.position.y - stoneTop(anim.pip.stone).y) * 0.4, 0, 0.6));
}

/* ============ hoofdlus ============ */
let last = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  animatePip(dt, t);
  // stenen: volgende steen glinstert en de letter stuitert
  const pz = pip.position.z;
  scene.userData.chunks.forEach(g => { g.visible = g.userData.z < pz + 26 && g.userData.z > pz - 70; });
  stones.forEach((s, i) => {
    const near = i - anim.pip.stone < 18 && i - anim.pip.stone > -4;
    s.sp.visible = near && (i > anim.pip.stone || s.isNext); s.starsG.visible = near; s.st.visible = near; s.ring.visible = near; if (s.cup) s.cup.visible = near;
    s.sp.position.y = s.p.y + (s.isNext ? 2.6 + Math.abs(Math.sin(t * 3)) * 0.3 : 2.2 + Math.sin(t * 1.5 + i) * 0.05);
    s.sp.scale.setScalar(s.isNext ? 1.9 + 0.1 * Math.sin(t * 3) : (s.L.type === 'klank' ? 1.2 : 1.05));
    s.sp.material.depthTest = !s.isNext; s.sp.renderOrder = s.isNext ? 10 : 0;
    s.ring.material.opacity = s.isNext ? 0.45 + 0.35 * Math.sin(t * 4) : 0;
    s.ring.scale.setScalar(s.isNext ? 1 + 0.08 * Math.sin(t * 4) : 1);
    if (s.cup) s.cup.rotation.y = t * 0.8;
  });
  (scene.userData.floaters || []).forEach(f => { f.position.y = f.userData.base + Math.sin(t + f.userData.ph) * 0.4; f.rotation.y = t * 0.7 + f.userData.ph; });
  scene.userData.clouds.forEach(c => { c.position.x += c.userData.speed * dt; if (c.position.x > 60) c.position.x = -60; });
  // cadeautjes
  gifts.forEach(g => {
    g.t += dt;
    const sIn = smooth(0, 0.5, g.t);
    if (g.fade !== undefined) { g.fade += dt; g.obj.scale.setScalar(Math.max(0.01, 1 - g.fade * 3)); return; }
    g.obj.scale.setScalar(Math.max(0.01, sIn));
    if (g.open < 0) { g.obj.position.y = g.base + Math.abs(Math.sin(g.t * 3 + g.obj.userData.gift)) * 0.25; g.obj.rotation.y = Math.sin(g.t * 1.5 + g.obj.userData.gift) * 0.4; }
    else {
      g.open += dt; const lid = g.obj.userData.parts.lid;
      lid.rotation.x = -Math.min(2.2, g.open * 6); lid.position.y = 0.6 + g.open * 2; lid.position.z = -0.35 - g.open;
      if (g.open > 0.6) g.obj.scale.setScalar(Math.max(0.01, 1 - (g.open - 0.6) * 3));
    }
  });
  if (cupShow) {
    cupShow.t += dt; const k = smooth(0, 0.8, cupShow.t);
    cupShow.obj.scale.setScalar(0.01 + k * 1.1); cupShow.obj.rotation.y = cupShow.t * 1.5;
    cupShow.obj.position.y = pip.position.y + 0.2 + k * 0.9 + Math.sin(cupShow.t * 2) * 0.08;
    if (Math.random() < dt * 8) burst(cupShow.obj.position.clone().add(V((Math.random() - .5), 1 + Math.random(), 0)), '#ffe36b', 3, 1, 1);
  }
  // camera
  const tg = camTarget(); const k = 1 - Math.exp(-dt * (anim.hop ? 4 : 3));
  cam.pos.lerp(tg.pos, k); cam.look.lerp(tg.look, k);
  camera.position.copy(cam.pos); camera.lookAt(cam.look);
  // lucht wordt avond op de Sterrenberg
  const night = smooth(worldStart[3] - 2, worldStart[3] + 3, -pip.position.z / STEP);
  sky.material.uniforms.night.value = night;
  scene.fog.color.set('#d9f1ff').lerp(new THREE.Color('#6e5fb0'), night * 0.8);
  hemi.intensity = 1.15 - night * 0.35;
  sun.position.copy(pip.position).add(V(8, 16, 9)); sun.target.position.copy(pip.position);
  stepFx(dt);
  renderer.render(scene, camera);
}

// Voor het startscherm: render een losse afbeelding van Pip
export function snapshot() { return renderer.domElement.toDataURL('image/png'); }
export function setGiftHandler(f) { hooks.onGift = f; }
export const dbg = () => ({ tris: renderer.info.render.triangles, calls: renderer.info.render.calls, t: anim.t, el: clock.elapsedTime, rot: pip.rotation.y, look: anim.look, state: anim.state, mode: cam.mode, pos: pip.position.toArray(), campos: camera.position.toArray() });
