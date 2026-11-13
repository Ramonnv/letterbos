// Laadt de Blender-modellen (.glb). Lukt dat niet, dan bouwt hij hetzelfde model uit het recept.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

export let RECIPES = null;
const templates = {};
const loader = new GLTFLoader();
const D2R = Math.PI / 180;

export async function loadRecipes() {
  RECIPES = await (await fetch('assets/models.json')).json();
  return RECIPES;
}

const matCache = {};
export function material(color, kind = 'fur') {
  const key = color + '|' + kind;
  if (matCache[key]) return matCache[key];
  const c = new THREE.Color(color);
  const p = { color: c, roughness: 0.8, metalness: 0 };
  switch (kind) {
    case 'skin': p.roughness = 0.55; break;
    case 'eye': p.roughness = 0.12; break;
    case 'shiny': p.roughness = 0.3; break;
    case 'cloth': p.roughness = 0.95; break;
    case 'metal': p.roughness = 0.3; p.metalness = 0.65; break;
    case 'glass': p.roughness = 0.08; p.transparent = true; p.opacity = 0.55; break;
    case 'emit': p.emissive = c; p.emissiveIntensity = 1.1; p.roughness = 0.4; break;
    case 'glow': p.emissive = c; p.emissiveIntensity = 0.45; p.roughness = 0.35; break;
    case 'leaf': p.roughness = 0.75; break;
    case 'stone': p.roughness = 0.95; p.flatShading = true; break;
    default: break;
  }
  const m = new THREE.MeshStandardMaterial(p);
  m.name = (kind || 'mat') + '_' + String(color).replace('#', '');
  return (matCache[key] = m);
}

const geoCache = {};
function starGeometry() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.45 : 1, a = i / 10 * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
  g.translate(0, 0, -0.15);
  return g;
}
function geometry(p, low) {
  const seg = p.seg || 0;
  const key = p.type + '|' + seg + '|' + (p.args || []).join(',') + '|' + (p.top || 1) + (low ? '|low' : '');
  if (geoCache[key]) return geoCache[key];
  let g;
  switch (p.type) {
    case 'sphere': g = low ? new THREE.SphereGeometry(1, 14, 9) : new THREE.SphereGeometry(1, 28, 18); break;
    case 'box': g = new THREE.BoxGeometry(1, 1, 1); break;
    case 'cyl': g = new THREE.CylinderGeometry(p.top || 1, 1, 1, seg || (low ? 10 : 20)); break;
    case 'cone': g = new THREE.ConeGeometry(1, 1, seg || (low ? 10 : 20)); break;
    case 'torus': g = new THREE.TorusGeometry(p.args[0], p.args[1], low ? 6 : 12, low ? 16 : 32); g.rotateX(-Math.PI / 2); break;
    case 'ico': g = new THREE.IcosahedronGeometry(1, 1); break;
    case 'star': g = starGeometry(); break;
    default: g = new THREE.SphereGeometry(1, 12, 8);
  }
  return (geoCache[key] = g);
}

// Bouw een model uit het recept: één Group per onderdeel, met het draaipunt op de juiste plek.
export function buildFromRecipe(name) {
  const r = RECIPES.models[name];
  const root = new THREE.Group(); root.name = name;
  const groups = {};
  for (const [pname, def] of Object.entries(r.parts)) {
    const g = new THREE.Group(); g.name = pname; groups[pname] = g;
  }
  for (const [pname, def] of Object.entries(r.parts)) {
    const g = groups[pname];
    const parent = def.parent ? groups[def.parent] : root;
    const ppiv = def.parent ? r.parts[def.parent].pivot : [0, 0, 0];
    g.position.set(def.pivot[0] - ppiv[0], def.pivot[1] - ppiv[1], def.pivot[2] - ppiv[2]);
    parent.add(g);
  }
  for (const p of r.prims) {
    const piv = r.parts[p.part].pivot;
    const m = new THREE.Mesh(geometry(p, r.kind === 'prop'), material(p.color, p.mat));
    m.position.set(p.pos[0] - piv[0], p.pos[1] - piv[1], p.pos[2] - piv[2]);
    m.scale.set(...p.scale);
    if (p.rot) m.rotation.set(p.rot[0] * D2R, p.rot[1] * D2R, p.rot[2] * D2R);
    m.castShadow = p.mat !== 'emit';
    m.receiveShadow = true;
    groups[p.part].add(m);
  }
  return root;
}

async function loadGLB(name) {
  return new Promise((res, rej) => loader.load('assets/models/' + name + '.glb', g => res(g.scene), undefined, rej));
}

// Laad alle modellen (glb waar mogelijk), zodat get() daarna direct werkt.
export async function preload(names, onProgress) {
  let done = 0, fromBlender = 0;
  await Promise.all(names.map(async n => {
    let t = null;
    try { t = await loadGLB(n); fromBlender++; } catch (e) { t = buildFromRecipe(n); }
    t.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        const m = o.material;
        if (m && m.emissive && m.emissive.getHex() !== 0) o.castShadow = false;
      }
    });
    templates[n] = t;
    onProgress && onProgress(++done / names.length);
  }));
  return fromBlender;
}

// Een eigen kopie (voor personages die bewegen)
export function get(name) {
  const t = templates[name] || buildFromRecipe(name);
  const c = t.clone(true);
  c.userData.parts = {};
  c.traverse(o => { if (o.name) c.userData.parts[o.name] = c.userData.parts[o.name] || o; });
  return c;
}

// Alle stukjes van een prop met hetzelfde materiaal samenvoegen: veel minder tekenwerk.
const mergedCache = {};
function mergedParts(name) {
  if (mergedCache[name]) return mergedCache[name];
  const t = templates[name] || buildFromRecipe(name);
  t.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(t.matrixWorld).invert();
  const byMat = new Map();
  t.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const m = o.material; if (!byMat.has(m)) byMat.set(m, []); byMat.get(m).push(g);
  });
  const out = [];
  for (const [m, gs] of byMat) { const g = gs.length > 1 ? mergeGeometries(gs) : gs[0]; g.computeBoundingSphere(); out.push({ g, m }); }
  return (mergedCache[name] = out);
}
// Een prop als één los object (zonder bewegende delen)
export function getStatic(name) {
  const grp = new THREE.Group(); grp.name = name;
  for (const { g, m } of mergedParts(name)) {
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = !(m.emissive && m.emissive.getHex() !== 0); mesh.receiveShadow = true; grp.add(mesh);
  }
  return grp;
}
// Veel dezelfde props (bomen, bloemen) in één keer tekenen: snel op een tablet.
export function instanced(name, transforms) {
  const out = new THREE.Group();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3();
  for (const { g, m } of mergedParts(name)) {
    const im = new THREE.InstancedMesh(g, m, transforms.length);
    transforms.forEach((tr, i) => { m4.compose(tr.pos, q.setFromAxisAngle(up, tr.rot || 0), sc.setScalar(tr.scale || 1)); im.setMatrixAt(i, m4); });
    im.castShadow = !(m.emissive && m.emissive.getHex() !== 0); im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    out.add(im);
  }
  return out;
}

export function renderURL(name) { return 'assets/renders/' + name + '.png'; }
export function iconURL(item) { return 'assets/icons/' + item + '.png'; }

// Andere kleur schubben: materialen met een van de basiskleuren krijgen een nieuwe kleur.
export function recolor(obj, map) {
  obj.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const base = o.userData.baseMat || o.material;
    o.userData.baseMat = base;
    const hit = Object.keys(map).find(h => (base.name || '').toLowerCase().includes(h));
    if (!hit) { o.material = base; return; }
    if (map[hit] === hit) { o.material = base; return; }
    const m = base.clone(); m.color = new THREE.Color('#' + map[hit]);
    o.material = m;
  });
}
