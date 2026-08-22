/* ============================================================
   Mi Hogar 3D — Construye tu hogar de ensueño
   Juego de construcción 3D estático, compatible con GitHub Pages.
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';

/* ---------------- Constantes ---------------- */
const S = 40;             // tamaño de la parcela (celdas)
const WALL_H = 3;         // altura de pared
const START_MONEY = 25000;
const SAVE_KEY = 'mihogar3d-save-v1';
const HELP_KEY = 'mihogar3d-help-v1';

const PALETTE = [0xf5f0e8, 0xe8d9b5, 0xc96f4a, 0xb8443f, 0x4a7fb5, 0x5d9b6c, 0x8a8f98, 0x8b5a2b];

/* ---------------- Utilidades de malla ---------------- */
const materials = new Map();
function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  }
  return materials.get(key);
}
function box(w, h, d, color, x = 0, y = 0, z = 0, paint = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint ? mat(color).clone() : mat(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (paint) m.userData.paint = true;
  return m;
}
function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 14, paint = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), paint ? mat(color).clone() : mat(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (paint) m.userData.paint = true;
  return m;
}
function sph(r, color, x = 0, y = 0, z = 0, paint = false) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), paint ? mat(color).clone() : mat(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (paint) m.userData.paint = true;
  return m;
}
function grp(...children) { const g = new THREE.Group(); children.forEach(c => g.add(c)); return g; }

/* ---------------- Catálogo ---------------- */
const WOOD = 0x8b5a2b, WOOD_D = 0x6b4423, WHITE = 0xf2f2f2, METAL = 0xb9bec7, DARK = 0x2b2f38;

const FURNITURE = {
  cama: { name: 'Cama', ico: '🛏️', cost: 450, w: 1, d: 2, build(c = 0x4a7fb5) {
    return grp(
      box(0.95, 0.25, 1.95, WOOD_D, 0, 0.2),
      box(0.9, 0.18, 1.85, WHITE, 0, 0.41),
      box(0.9, 0.14, 1.25, c, 0, 0.45, 0.3, true),
      box(0.7, 0.12, 0.4, 0xfafafa, 0, 0.52, -0.65),
      box(0.95, 0.7, 0.1, WOOD_D, 0, 0.45, -0.93)
    );
  } },
  sofa: { name: 'Sofá', ico: '🛋️', cost: 380, w: 2, d: 1, build(c = 0xb8443f) {
    return grp(
      box(1.9, 0.35, 0.85, c, 0, 0.28, 0, true),
      box(1.9, 0.55, 0.22, c, 0, 0.6, -0.31, true),
      box(0.2, 0.32, 0.85, c, -0.85, 0.6, 0, true),
      box(0.2, 0.32, 0.85, c, 0.85, 0.6, 0, true),
      box(0.78, 0.12, 0.6, 0xe8e2d5, -0.42, 0.5, 0.08),
      box(0.78, 0.12, 0.6, 0xe8e2d5, 0.42, 0.5, 0.08),
      box(1.9, 0.12, 0.85, WOOD_D, 0, 0.06, 0)
    );
  } },
  mesa: { name: 'Mesa', ico: '🍽️', cost: 220, w: 2, d: 1, build(c = WOOD) {
    const g = grp(box(1.85, 0.08, 0.9, c, 0, 0.76, 0, true));
    for (const [px, pz] of [[-0.82, -0.35], [0.82, -0.35], [-0.82, 0.35], [0.82, 0.35]])
      g.add(box(0.09, 0.74, 0.09, WOOD_D, px, 0.37, pz));
    return g;
  } },
  silla: { name: 'Silla', ico: '🪑', cost: 90, w: 1, d: 1, build(c = WOOD) {
    const g = grp(
      box(0.45, 0.06, 0.45, c, 0, 0.45, 0, true),
      box(0.45, 0.5, 0.06, c, 0, 0.73, -0.2, true)
    );
    for (const [px, pz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]])
      g.add(box(0.06, 0.44, 0.06, WOOD_D, px, 0.22, pz));
    return g;
  } },
  lampara: { name: 'Lámpara', ico: '💡', cost: 120, w: 1, d: 1, light: { y: 1.45, i: 12, color: 0xffd9a0 }, build(c = 0xe8d9b5) {
    return grp(
      cyl(0.16, 0.2, 0.05, DARK, 0, 0.03),
      cyl(0.025, 0.025, 1.15, METAL, 0, 0.63),
      cyl(0.22, 0.3, 0.35, c, 0, 1.35, 0, 14, true)
    );
  } },
  tv: { name: 'Televisor', ico: '📺', cost: 600, w: 1, d: 1, build(c = WOOD_D) {
    return grp(
      box(0.95, 0.4, 0.4, c, 0, 0.2, 0, true),
      box(0.9, 0.55, 0.06, 0x11141a, 0, 0.75, 0),
      box(0.82, 0.47, 0.02, 0x1d2f45, 0, 0.75, 0.025)
    );
  } },
  nevera: { name: 'Nevera', ico: '🧊', cost: 700, w: 1, d: 1, build(c = WHITE) {
    return grp(
      box(0.8, 1.8, 0.75, c, 0, 0.9, 0, true),
      box(0.05, 0.5, 0.06, METAL, 0.3, 1.25, 0.39),
      box(0.05, 0.3, 0.06, METAL, 0.3, 0.6, 0.39)
    );
  } },
  cocina: { name: 'Cocina', ico: '🍳', cost: 550, w: 1, d: 1, build(c = 0x8a8f98) {
    return grp(
      box(0.95, 0.85, 0.65, c, 0, 0.43, 0, true),
      box(0.98, 0.06, 0.68, 0x3a3f4a, 0, 0.89),
      cyl(0.11, 0.11, 0.02, 0x14161c, -0.2, 0.93, -0.12),
      cyl(0.11, 0.11, 0.02, 0x14161c, 0.22, 0.93, -0.12),
      cyl(0.11, 0.11, 0.02, 0x14161c, -0.2, 0.93, 0.18),
      cyl(0.11, 0.11, 0.02, 0x14161c, 0.22, 0.93, 0.18)
    );
  } },
  inodoro: { name: 'Inodoro', ico: '🚽', cost: 250, w: 1, d: 1, build() {
    return grp(
      cyl(0.24, 0.18, 0.35, WHITE, 0, 0.18, 0.08),
      cyl(0.27, 0.27, 0.06, WHITE, 0, 0.39, 0.08),
      box(0.4, 0.55, 0.18, WHITE, 0, 0.5, -0.25),
      box(0.34, 0.06, 0.12, METAL, 0, 0.8, -0.25)
    );
  } },
  banera: { name: 'Bañera', ico: '🛁', cost: 480, w: 2, d: 1, build() {
    return grp(
      box(1.75, 0.55, 0.8, WHITE, 0, 0.28),
      box(1.55, 0.08, 0.6, 0x9fd8e8, 0, 0.52),
      cyl(0.03, 0.03, 0.25, METAL, -0.75, 0.68),
      sph(0.05, METAL, -0.75, 0.8)
    );
  } },
  estanteria: { name: 'Estantería', ico: '📚', cost: 300, w: 1, d: 1, build(c = WOOD) {
    const g = grp(
      box(0.9, 1.8, 0.3, c, 0, 0.9, 0, true),
      box(0.8, 1.7, 0.24, 0x1f232d, 0, 0.9, 0.02)
    );
    const bookCols = [0xb8443f, 0x4a7fb5, 0x5d9b6c, 0xe8b84d, 0xa06fc9];
    for (let s = 0; s < 4; s++) {
      g.add(box(0.8, 0.04, 0.28, c, 0, 0.35 + s * 0.42, 0.01));
      for (let b = 0; b < 5; b++)
        g.add(box(0.09, 0.3, 0.2, bookCols[(s * 3 + b) % 5], -0.3 + b * 0.15, 0.53 + s * 0.42, 0.02));
    }
    return g;
  } },
  alfombra: { name: 'Alfombra', ico: '🟫', cost: 150, w: 2, d: 2, build(c = 0xc96f4a) {
    const m = box(1.85, 0.03, 1.85, c, 0, 0.095, 0, true);
    const b = box(1.6, 0.032, 1.6, 0xe8d9b5, 0, 0.096, 0);
    return grp(m, b);
  } },
  arbol: { name: 'Árbol', ico: '🌳', cost: 100, w: 1, d: 1, out: true, build() {
    return grp(
      cyl(0.09, 0.13, 1.1, 0x6b4423, 0, 0.55),
      sph(0.55, 0x3f7d4a, 0, 1.45),
      sph(0.4, 0x4c9159, -0.3, 1.2),
      sph(0.38, 0x4c9159, 0.28, 1.7)
    );
  } },
  flores: { name: 'Flores', ico: '🌷', cost: 40, w: 1, d: 1, out: true, build() {
    const g = grp(box(0.8, 0.08, 0.8, 0x4a3626, 0, 0.05));
    const cols = [0xe85d75, 0xf2c94c, 0xa06fc9, 0xff8a5c];
    for (let i = 0; i < 6; i++) {
      const px = -0.28 + (i % 3) * 0.28, pz = -0.15 + Math.floor(i / 3) * 0.3;
      g.add(cyl(0.015, 0.015, 0.25, 0x4c9159, px, 0.2, pz, 6));
      g.add(sph(0.07, cols[i % 4], px, 0.35, pz));
    }
    return g;
  } },
  seto: { name: 'Seto', ico: '🌿', cost: 60, w: 1, d: 1, out: true, build() {
    return grp(box(0.9, 0.7, 0.45, 0x3f7d4a, 0, 0.35, 0, true));
  } },
  farola: { name: 'Farola', ico: '🏮', cost: 180, w: 1, d: 1, out: true, light: { y: 2.35, i: 18, color: 0xffe2b0 }, build() {
    return grp(
      cyl(0.14, 0.18, 0.1, DARK, 0, 0.05),
      cyl(0.04, 0.05, 2.2, DARK, 0, 1.2),
      box(0.24, 0.3, 0.24, 0xffe9c4, 0, 2.4),
      box(0.3, 0.05, 0.3, DARK, 0, 2.58)
    );
  } },
};

const BUILD_ITEMS = {
  suelo:   { name: 'Suelo',   ico: '🟧', cost: 20 },
  pared:   { name: 'Pared',   ico: '🧱', cost: 60 },
  puerta:  { name: 'Puerta',  ico: '🚪', cost: 150 },
  ventana: { name: 'Ventana', ico: '🪟', cost: 120 },
  techo:   { name: 'Techo',   ico: '⬜', cost: 40 },
};

/* ---------------- Sonido (WebAudio) ---------------- */
let audioCtx = null;
function beep(freq, dur, type = 'sine', vol = 0.12, slide = 0) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(freq + slide, audioCtx.currentTime + dur);
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* sin audio */ }
}
const snd = {
  place: () => { beep(420, 0.09, 'triangle', 0.14, 160); },
  remove: () => { beep(300, 0.12, 'sawtooth', 0.07, -140); },
  error: () => { beep(140, 0.18, 'square', 0.06); },
  cash: () => { beep(660, 0.08, 'sine', 0.12); setTimeout(() => beep(880, 0.12, 'sine', 0.12), 80); },
  click: () => { beep(520, 0.04, 'triangle', 0.06); },
};

/* ---------------- Estado ---------------- */
let state = newState();
function newState() {
  return { money: START_MONEY, floors: {}, walls: {}, roofs: {}, objects: {}, nextId: 1, missionsDone: [] };
}

/* ---------------- Escena ---------------- */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfd9ea, 60, 160);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(26, 22, 26);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 4;
controls.maxDistance = 90;
controls.target.set(0, 0, 0);

/* Luces */
const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6b7d5e, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d9, 2.0);
sun.position.set(30, 45, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -32; sun.shadow.camera.right = 32;
sun.shadow.camera.top = 32; sun.shadow.camera.bottom = -32;
sun.shadow.camera.far = 140;
sun.shadow.bias = -0.0004;
scene.add(sun);
const moon = new THREE.DirectionalLight(0x8ea6d8, 0);
moon.position.set(-25, 35, -20);
scene.add(moon);

/* Suelo del mundo */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshLambertMaterial({ color: 0x6da35e })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const plot = new THREE.Mesh(
  new THREE.PlaneGeometry(S, S),
  new THREE.MeshLambertMaterial({ color: 0x79b169 })
);
plot.rotation.x = -Math.PI / 2;
plot.position.y = 0.01;
plot.receiveShadow = true;
scene.add(plot);

const gridHelper = new THREE.GridHelper(S, S, 0xffffff, 0xffffff);
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.12;
gridHelper.position.y = 0.02;
scene.add(gridHelper);

const border = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-S / 2, 0.03, -S / 2), new THREE.Vector3(S / 2, 0.03, -S / 2),
    new THREE.Vector3(S / 2, 0.03, S / 2), new THREE.Vector3(-S / 2, 0.03, S / 2),
  ]),
  new THREE.LineBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.7 })
);
scene.add(border);

/* Estrellas (noche) */
const starGeo = new THREE.BufferGeometry();
{
  const pts = [];
  for (let i = 0; i < 500; i++) {
    const t = Math.random() * Math.PI * 2, p = Math.random() * Math.PI * 0.48;
    const r = 180;
    pts.push(r * Math.cos(t) * Math.sin(p), r * Math.cos(p) + 5, r * Math.sin(t) * Math.sin(p));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
}
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0 }));
scene.add(stars);

/* Grupo de construcción */
const buildGroup = new THREE.Group();
scene.add(buildGroup);
const meshes = { floors: {}, walls: {}, roofs: {}, objects: {} };
const lampLights = new Map(); // objId -> PointLight

/* Plano invisible de picking */
const pickPlane = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshBasicMaterial({ visible: false }));
pickPlane.rotation.x = -Math.PI / 2;
scene.add(pickPlane);

/* ---------------- Día / Noche ---------------- */
let isNight = false, dayT = 1; // 1 = día, 0 = noche
const SKY_DAY = new THREE.Color(0x9ed2f0), SKY_NIGHT = new THREE.Color(0x0d1226);
const FOG_DAY = new THREE.Color(0xbfd9ea), FOG_NIGHT = new THREE.Color(0x0d1226);
scene.background = SKY_DAY.clone();

function updateDayNight(dt) {
  const target = isNight ? 0 : 1;
  if (Math.abs(dayT - target) < 0.001) { dayT = target; }
  else dayT += (target - dayT) * Math.min(1, dt * 2.2);
  scene.background.lerpColors(SKY_NIGHT, SKY_DAY, dayT);
  scene.fog.color.lerpColors(FOG_NIGHT, FOG_DAY, dayT);
  sun.intensity = 2.0 * dayT;
  hemi.intensity = 0.18 + 0.75 * dayT;
  moon.intensity = 0.5 * (1 - dayT);
  stars.material.opacity = (1 - dayT) * 0.9;
  for (const l of lampLights.values()) l.intensity = l.userData.max * (1 - dayT);
}

/* ---------------- Construcción de mallas ---------------- */
function buildWallMesh(type, color) {
  const c = color ?? 0xf5f0e8;
  let g;
  if (type === 'pared') {
    g = grp(box(1.02, WALL_H, 0.14, c, 0, WALL_H / 2, 0, true));
  } else if (type === 'puerta') {
    g = grp(
      box(1.02, 0.9, 0.14, c, 0, WALL_H - 0.45, 0, true),
      box(0.09, 2.1, 0.14, c, -0.465, 1.05, 0, true),
      box(0.09, 2.1, 0.14, c, 0.465, 1.05, 0, true),
      box(0.84, 2.06, 0.07, WOOD, 0, 1.03, 0),
      sph(0.045, 0xd8b344, 0.28, 1.02, 0.06)
    );
  } else { // ventana
    g = grp(
      box(1.02, 1.0, 0.14, c, 0, 0.5, 0, true),
      box(1.02, 0.8, 0.14, c, 0, WALL_H - 0.4, 0, true),
      box(0.09, 1.2, 0.14, c, -0.465, 1.6, 0, true),
      box(0.09, 1.2, 0.14, c, 0.465, 1.6, 0, true),
      new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.2, 0.04),
        new THREE.MeshLambertMaterial({ color: 0xaad4e8, transparent: true, opacity: 0.45 })),
      box(0.86, 0.05, 0.06, WHITE, 0, 1.6, 0),
      box(0.05, 1.2, 0.06, WHITE, 0, 1.6, 0)
    );
    g.children[4].position.set(0, 1.6, 0);
  }
  return g;
}
function buildFloorMesh(color) {
  const g = grp(box(0.99, 0.08, 0.99, color ?? 0xc9a06a, 0, 0.04, 0, true));
  return g;
}
function buildRoofMesh(color) {
  return grp(box(1.0, 0.14, 1.0, color ?? 0xa8524a, 0, WALL_H + 0.07, 0, true));
}

function wallTransform(key) {
  const [o, xs, zs] = key.split(':');
  const x = +xs, z = +zs;
  if (o === 'h') return { x: x + 0.5 - S / 2, z: z - S / 2, ry: 0 };
  return { x: x - S / 2, z: z + 0.5 - S / 2, ry: Math.PI / 2 };
}
function objTransform(obj) {
  const def = FURNITURE[obj.t];
  const w = obj.r % 2 ? def.d : def.w, d = obj.r % 2 ? def.w : def.d;
  return { x: obj.x + w / 2 - S / 2, z: obj.z + d / 2 - S / 2, ry: obj.r * Math.PI / 2, w, d };
}

function addFloorMesh(key, data) {
  const [x, z] = key.split(',').map(Number);
  const m = buildFloorMesh(data.c);
  m.position.set(x + 0.5 - S / 2, 0, z + 0.5 - S / 2);
  m.userData = { kind: 'floor', key };
  buildGroup.add(m); meshes.floors[key] = m;
}
function addRoofMesh(key, data) {
  const [x, z] = key.split(',').map(Number);
  const m = buildRoofMesh(data.c);
  m.position.set(x + 0.5 - S / 2, 0, z + 0.5 - S / 2);
  m.userData = { kind: 'roof', key };
  buildGroup.add(m); meshes.roofs[key] = m;
}
function addWallMesh(key, data) {
  const m = buildWallMesh(data.t, data.c);
  const t = wallTransform(key);
  m.position.set(t.x, 0, t.z); m.rotation.y = t.ry;
  m.userData = { kind: 'wall', key };
  buildGroup.add(m); meshes.walls[key] = m;
}
function addObjectMesh(obj) {
  const def = FURNITURE[obj.t];
  const m = def.build(obj.c);
  const t = objTransform(obj);
  m.position.set(t.x, 0, t.z); m.rotation.y = t.ry;
  m.userData = { kind: 'object', key: obj.id };
  buildGroup.add(m); meshes.objects[obj.id] = m;
  if (def.light) {
    const pl = new THREE.PointLight(def.light.color, 0, 9, 1.6);
    pl.position.set(t.x, def.light.y, t.z);
    pl.userData.max = def.light.i;
    pl.intensity = def.light.i * (1 - dayT);
    scene.add(pl);
    lampLights.set(obj.id, pl);
  }
}
function removeMesh(kind, key) {
  const store = meshes[kind + 's'];
  const m = store[key];
  if (m) { buildGroup.remove(m); delete store[key]; }
  if (kind === 'object' && lampLights.has(key)) {
    scene.remove(lampLights.get(key));
    lampLights.delete(key);
  }
}
function rebuildAll() {
  for (const k of Object.keys(meshes.floors)) removeMesh('floor', k);
  for (const k of Object.keys(meshes.walls)) removeMesh('wall', k);
  for (const k of Object.keys(meshes.roofs)) removeMesh('roof', k);
  for (const k of Object.keys(meshes.objects)) removeMesh('object', k);
  for (const [k, v] of Object.entries(state.floors)) addFloorMesh(k, v);
  for (const [k, v] of Object.entries(state.walls)) addWallMesh(k, v);
  for (const [k, v] of Object.entries(state.roofs)) addRoofMesh(k, v);
  for (const o of Object.values(state.objects)) addObjectMesh(o);
}

/* ---------------- Ocupación ---------------- */
function objCells(obj) {
  const t = objTransform(obj);
  const cells = [];
  for (let dx = 0; dx < t.w; dx++) for (let dz = 0; dz < t.d; dz++) cells.push((obj.x + dx) + ',' + (obj.z + dz));
  return cells;
}
function occupiedMap(exceptId = null) {
  const occ = new Set();
  for (const o of Object.values(state.objects)) {
    if (o.id === exceptId) continue;
    for (const c of objCells(o)) occ.add(c);
  }
  return occ;
}

/* ---------------- Herramienta actual ---------------- */
let tool = null;        // {mode:'build'|'furniture'|'paint'|'delete', id}
let toolRot = 0;
let selectedColor = PALETTE[0];
let ghost = null;
const ghostMatOk = new THREE.MeshLambertMaterial({ color: 0x6ee7a0, transparent: true, opacity: 0.55, depthWrite: false });
const ghostMatBad = new THREE.MeshLambertMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.55, depthWrite: false });

function setGhostValid(ok) {
  if (!ghost) return;
  ghost.traverse(n => { if (n.isMesh) n.material = ok ? ghostMatOk : ghostMatBad; });
}
function clearGhost() {
  if (ghost) { scene.remove(ghost); ghost = null; }
}
function makeGhost() {
  clearGhost();
  if (!tool || tool.mode === 'paint' || tool.mode === 'delete') return;
  let g = null;
  if (tool.mode === 'build') {
    if (tool.id === 'suelo') g = buildFloorMesh();
    else if (tool.id === 'techo') g = buildRoofMesh();
    else g = buildWallMesh(tool.id);
  } else {
    g = FURNITURE[tool.id].build();
  }
  g.traverse(n => { if (n.isMesh) { n.material = ghostMatOk; n.castShadow = false; n.receiveShadow = false; } });
  g.visible = false;
  scene.add(g);
  ghost = g;
}

function selectTool(t) {
  tool = t;
  toolRot = 0;
  makeGhost();
  document.querySelectorAll('.item-btn').forEach(b => {
    const on = t && b.dataset.mode === t.mode && b.dataset.id === t.id;
    b.classList.toggle('active', on);
  });
  const ctx = document.getElementById('context-controls');
  ctx.classList.toggle('hidden', !t);
  document.getElementById('btn-rotate').style.display = (t && t.mode === 'furniture') ? '' : 'none';
  if (t) snd.click();
}

/* ---------------- Picking ---------------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hover = null; // resultado de picking actual

function pickGround(ev) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(pickPlane, false)[0];
  if (!hit) return null;
  const gx = hit.point.x + S / 2, gz = hit.point.z + S / 2;
  return { gx, gz, cx: Math.floor(gx), cz: Math.floor(gz) };
}
function pickBuild(ev) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(buildGroup.children, true);
  for (const h of hits) {
    let n = h.object;
    while (n && !n.userData.kind) n = n.parent;
    if (n && n.userData.kind) return { node: n, mesh: h.object };
  }
  return null;
}
function nearestEdge(p) {
  const { gx, gz, cx, cz } = p;
  const fx = gx - cx, fz = gz - cz;
  const cands = [
    { key: `h:${cx}:${cz}`, d: fz },
    { key: `h:${cx}:${cz + 1}`, d: 1 - fz },
    { key: `v:${cx}:${cz}`, d: fx },
    { key: `v:${cx + 1}:${cz}`, d: 1 - fx },
  ].sort((a, b) => a.d - b.d);
  for (const c of cands) {
    const [o, xs, zs] = c.key.split(':');
    const x = +xs, z = +zs;
    if (o === 'h' && x >= 0 && x < S && z >= 0 && z <= S) return c.key;
    if (o === 'v' && x >= 0 && x <= S && z >= 0 && z < S) return c.key;
  }
  return null;
}

/* ---------------- Validación y colocación ---------------- */
function canPlace() {
  if (!hover) return false;
  if (tool.mode === 'build') {
    if (tool.id === 'suelo') return hover.cellOk && !state.floors[hover.cellKey];
    if (tool.id === 'techo') return hover.cellOk && !state.roofs[hover.cellKey];
    return hover.edgeKey && !state.walls[hover.edgeKey];
  }
  if (tool.mode === 'furniture') {
    const def = FURNITURE[tool.id];
    const w = toolRot % 2 ? def.d : def.w, d = toolRot % 2 ? def.w : def.d;
    const { cx, cz } = hover;
    if (cx < 0 || cz < 0 || cx + w > S || cz + d > S) return false;
    const occ = occupiedMap();
    for (let dx = 0; dx < w; dx++) for (let dz = 0; dz < d; dz++)
      if (occ.has((cx + dx) + ',' + (cz + dz))) return false;
    return true;
  }
  return false;
}

function toolCost() {
  if (!tool) return 0;
  if (tool.mode === 'build') return BUILD_ITEMS[tool.id].cost;
  if (tool.mode === 'furniture') return FURNITURE[tool.id].cost;
  return 0;
}

function spend(amount) {
  if (state.money < amount) { toast('¡No tienes suficiente dinero! 💸', 'error'); snd.error(); return false; }
  state.money -= amount;
  updateMoney(true);
  return true;
}

function place() {
  if (!tool || !canPlace()) { if (tool && hover) snd.error(); return; }
  const cost = toolCost();
  if (!spend(cost)) return;
  if (tool.mode === 'build') {
    if (tool.id === 'suelo') {
      state.floors[hover.cellKey] = { c: selectedColor === PALETTE[0] ? 0xc9a06a : selectedColor };
      addFloorMesh(hover.cellKey, state.floors[hover.cellKey]);
    } else if (tool.id === 'techo') {
      state.roofs[hover.cellKey] = { c: 0xa8524a };
      addRoofMesh(hover.cellKey, state.roofs[hover.cellKey]);
    } else {
      state.walls[hover.edgeKey] = { t: tool.id, c: selectedColor };
      addWallMesh(hover.edgeKey, state.walls[hover.edgeKey]);
    }
  } else {
    const id = 'o' + (state.nextId++);
    const obj = { id, t: tool.id, x: hover.cx, z: hover.cz, r: toolRot };
    state.objects[id] = obj;
    addObjectMesh(obj);
  }
  snd.place();
  scheduleSave();
  checkMissions();
}

function paintAt(ev) {
  const hit = pickBuild(ev);
  if (!hit) return;
  const { kind, key } = hit.node.userData;
  if (kind === 'floor') { state.floors[key].c = selectedColor; removeMesh('floor', key); addFloorMesh(key, state.floors[key]); }
  else if (kind === 'roof') { state.roofs[key].c = selectedColor; removeMesh('roof', key); addRoofMesh(key, state.roofs[key]); }
  else if (kind === 'wall') { state.walls[key].c = selectedColor; removeMesh('wall', key); addWallMesh(key, state.walls[key]); }
  else if (kind === 'object') {
    const obj = state.objects[key];
    obj.c = selectedColor;
    removeMesh('object', key); addObjectMesh(obj);
  }
  snd.click();
  scheduleSave();
}

function deleteAt(ev) {
  const hit = pickBuild(ev);
  if (!hit) return;
  const { kind, key } = hit.node.userData;
  let refund = 0;
  if (kind === 'floor') { refund = BUILD_ITEMS.suelo.cost; delete state.floors[key]; }
  else if (kind === 'roof') { refund = BUILD_ITEMS.techo.cost; delete state.roofs[key]; }
  else if (kind === 'wall') { refund = BUILD_ITEMS[state.walls[key].t].cost; delete state.walls[key]; }
  else if (kind === 'object') { refund = FURNITURE[state.objects[key].t].cost; delete state.objects[key]; }
  removeMesh(kind, key);
  state.money += Math.floor(refund / 2);
  updateMoney(true);
  toast(`Vendido por ${fmt(Math.floor(refund / 2))} ♻️`, 'success');
  snd.remove();
  scheduleSave();
}

/* ---------------- Misiones ---------------- */
function countFloors() { return Object.keys(state.floors).length; }
function countRoofs() { return Object.keys(state.roofs).length; }
function countWalls(type) { return Object.values(state.walls).filter(w => !type || w.t === type).length; }
function countObj(type) { return Object.values(state.objects).filter(o => o.t === type).length; }
function countFurn() { return Object.values(state.objects).filter(o => !FURNITURE[o.t].out).length; }
function countOut() { return Object.values(state.objects).filter(o => FURNITURE[o.t].out).length; }

const MISSIONS = [
  { id: 'm1', name: '🏗️ Primeros cimientos', desc: 'Coloca 10 suelos', reward: 300, goal: 10, prog: countFloors },
  { id: 'm2', name: '🧱 Cuatro paredes', desc: 'Construye 12 paredes', reward: 500, goal: 12, prog: () => countWalls('pared') },
  { id: 'm3', name: '🚪 Puerta principal', desc: 'Instala 1 puerta', reward: 250, goal: 1, prog: () => countWalls('puerta') },
  { id: 'm4', name: '🪟 Que entre la luz', desc: 'Pon 2 ventanas', reward: 300, goal: 2, prog: () => countWalls('ventana') },
  { id: 'm5', name: '⬜ Bajo techo', desc: 'Cubre 10 techos', reward: 500, goal: 10, prog: countRoofs },
  { id: 'm6', name: '🛏️ Dulces sueños', desc: 'Coloca una cama', reward: 350, goal: 1, prog: () => countObj('cama') },
  { id: 'm7', name: '🛋️ Salón acogedor', desc: 'Sofá + televisor', reward: 500, goal: 2, prog: () => Math.min(countObj('sofa'), 1) + Math.min(countObj('tv'), 1) },
  { id: 'm8', name: '🍳 Cocina completa', desc: 'Cocina + nevera', reward: 500, goal: 2, prog: () => Math.min(countObj('cocina'), 1) + Math.min(countObj('nevera'), 1) },
  { id: 'm9', name: '🛁 Baño listo', desc: 'Inodoro + bañera', reward: 450, goal: 2, prog: () => Math.min(countObj('inodoro'), 1) + Math.min(countObj('banera'), 1) },
  { id: 'm10', name: '🌳 Jardín verde', desc: '5 plantas de exterior', reward: 400, goal: 5, prog: countOut },
  { id: 'm11', name: '🏆 Gran decorador', desc: 'Coloca 15 muebles', reward: 800, goal: 15, prog: countFurn },
];

function checkMissions() {
  for (const m of MISSIONS) {
    if (state.missionsDone.includes(m.id)) continue;
    if (m.prog() >= m.goal) {
      state.missionsDone.push(m.id);
      state.money += m.reward;
      updateMoney(true);
      toast(`${m.name} completada · +${fmt(m.reward)} 🎉`, 'reward');
      snd.cash();
    }
  }
  renderMissions();
  scheduleSave();
}
function renderMissions() {
  const list = document.getElementById('missions-list');
  list.innerHTML = '';
  let pending = 0;
  for (const m of MISSIONS) {
    const done = state.missionsDone.includes(m.id);
    const p = done ? m.goal : Math.min(m.prog(), m.goal);
    if (!done) pending++;
    const el = document.createElement('div');
    el.className = 'mission' + (done ? ' done' : '');
    el.innerHTML = `
      <div class="m-title"><span>${done ? '✅ ' : ''}${m.name}</span><span class="m-reward">+${fmt(m.reward)}</span></div>
      <div class="m-bar"><div class="m-fill" style="width:${(p / m.goal) * 100}%"></div></div>
      <div class="m-progress">${m.desc} — ${p}/${m.goal}</div>`;
    list.appendChild(el);
  }
  const badge = document.getElementById('missions-badge');
  const ready = MISSIONS.filter(m => !state.missionsDone.includes(m.id)).length;
  badge.textContent = ready;
  badge.classList.toggle('hidden', ready === 0);
}

/* ---------------- Guardado ---------------- */
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveGame, 700);
}
function saveGame(manual = false) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (manual) toast('Partida guardada 💾', 'success');
  } catch (e) { if (manual) toast('No se pudo guardar', 'error'); }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number') return false;
    state = Object.assign(newState(), data);
    return true;
  } catch (e) { return false; }
}
function exportGame() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mi-hogar-3d.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Casa exportada ⬇️', 'success');
}
function importGame(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const data = JSON.parse(fr.result);
      if (typeof data.money !== 'number' || typeof data.floors !== 'object') throw new Error('formato');
      state = Object.assign(newState(), data);
      rebuildAll();
      updateMoney();
      renderMissions();
      saveGame();
      toast('Casa importada ⬆️', 'success');
    } catch (e) { toast('Archivo no válido', 'error'); snd.error(); }
  };
  fr.readAsText(file);
}

/* ---------------- UI ---------------- */
const fmt = n => n.toLocaleString('es-ES') + ' €';
function updateMoney(pop = false) {
  const el = document.getElementById('money-value');
  el.textContent = fmt(state.money);
  const box = document.getElementById('money');
  box.classList.toggle('broke', state.money < 100);
  if (pop) { box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); }
}
let toastTimer = null;
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

function itemButton(mode, id, def) {
  const b = document.createElement('button');
  b.className = 'item-btn' + (mode === 'delete' ? ' tool-danger' : '');
  b.dataset.mode = mode; b.dataset.id = id;
  const price = def.cost != null ? `<span class="price">${fmt(def.cost)}</span>` : `<span class="price free">gratis</span>`;
  b.innerHTML = `<span class="ico">${def.ico}</span><span class="name">${def.name}</span>${price}`;
  b.addEventListener('click', () => {
    if (tool && tool.mode === mode && tool.id === id) selectTool(null);
    else selectTool({ mode, id });
  });
  return b;
}

function buildUI() {
  const pC = document.querySelector('[data-panel="construccion"]');
  for (const [id, def] of Object.entries(BUILD_ITEMS)) pC.appendChild(itemButton('build', id, def));

  const pM = document.querySelector('[data-panel="muebles"]');
  const pE = document.querySelector('[data-panel="exterior"]');
  for (const [id, def] of Object.entries(FURNITURE))
    (def.out ? pE : pM).appendChild(itemButton('furniture', id, def));

  const pH = document.querySelector('[data-panel="herramientas"]');
  pH.appendChild(itemButton('paint', 'paint', { name: 'Pintar', ico: '🎨' }));
  pH.appendChild(itemButton('delete', 'delete', { name: 'Vender', ico: '🧹' }));

  // Pestañas
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('active');
      snd.click();
    });
  });

  // Paleta
  const pal = document.getElementById('palette');
  PALETTE.forEach((c, i) => {
    const s = document.createElement('div');
    s.className = 'swatch' + (i === 0 ? ' active' : '');
    s.style.background = '#' + c.toString(16).padStart(6, '0');
    s.addEventListener('click', () => {
      selectedColor = c;
      document.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
      snd.click();
    });
    pal.appendChild(s);
  });
}

/* ---------------- Modo paseo ---------------- */
let walkMode = false;
const keys = {};
let walkYaw = 0, walkPitch = 0;
const savedCam = { pos: new THREE.Vector3(), target: new THREE.Vector3() };

function enterWalk() {
  walkMode = true;
  savedCam.pos.copy(camera.position);
  savedCam.target.copy(controls.target);
  controls.enabled = false;
  camera.position.set(0, 1.6, 6);
  walkYaw = Math.PI; walkPitch = 0;
  document.getElementById('walk-hint').classList.remove('hidden');
  document.getElementById('btn-walk').classList.add('active');
  selectTool(null);
  canvas.requestPointerLock?.();
}
function exitWalk() {
  walkMode = false;
  controls.enabled = true;
  camera.position.copy(savedCam.pos);
  controls.target.copy(savedCam.target);
  document.getElementById('walk-hint').classList.add('hidden');
  document.getElementById('btn-walk').classList.remove('active');
  if (document.pointerLockElement) document.exitPointerLock();
}
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && walkMode) exitWalk();
});
document.addEventListener('mousemove', e => {
  if (!walkMode || !document.pointerLockElement) return;
  walkYaw -= e.movementX * 0.0024;
  walkPitch -= e.movementY * 0.0024;
  walkPitch = Math.max(-1.35, Math.min(1.35, walkPitch));
});
function updateWalk(dt) {
  const speed = 4.2 * dt;
  const fwd = new THREE.Vector3(Math.sin(walkYaw), 0, Math.cos(walkYaw));
  const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
  if (keys['KeyW'] || keys['ArrowUp']) camera.position.addScaledVector(fwd, -speed);
  if (keys['KeyS'] || keys['ArrowDown']) camera.position.addScaledVector(fwd, speed);
  if (keys['KeyA'] || keys['ArrowLeft']) camera.position.addScaledVector(right, -speed);
  if (keys['KeyD'] || keys['ArrowRight']) camera.position.addScaledVector(right, speed);
  const lim = S / 2 + 12;
  camera.position.x = Math.max(-lim, Math.min(lim, camera.position.x));
  camera.position.z = Math.max(-lim, Math.min(lim, camera.position.z));
  camera.position.y = 1.6;
  const dir = new THREE.Vector3(
    Math.sin(walkYaw) * Math.cos(walkPitch) * -1,
    Math.sin(walkPitch),
    Math.cos(walkYaw) * Math.cos(walkPitch) * -1
  );
  camera.lookAt(camera.position.clone().add(dir));
}

/* ---------------- Eventos ---------------- */
let downPos = null;
canvas.addEventListener('pointerdown', e => { downPos = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', e => {
  if (walkMode) return;
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved > 6 || e.button !== 0) return; // fue arrastre de cámara
  if (!tool) return;
  if (tool.mode === 'paint') paintAt(e);
  else if (tool.mode === 'delete') deleteAt(e);
  else place();
});
canvas.addEventListener('pointermove', e => {
  if (walkMode || !tool || tool.mode === 'paint' || tool.mode === 'delete') { if (ghost) ghost.visible = false; hover = null; return; }
  const p = pickGround(e);
  if (!p) { hover = null; if (ghost) ghost.visible = false; return; }
  const cellOk = p.cx >= 0 && p.cx < S && p.cz >= 0 && p.cz < S;
  hover = { ...p, cellOk, cellKey: p.cx + ',' + p.cz, edgeKey: nearestEdge(p) };
  if (!ghost) return;
  ghost.visible = true;
  if (tool.mode === 'build' && (tool.id === 'pared' || tool.id === 'puerta' || tool.id === 'ventana')) {
    if (!hover.edgeKey) { ghost.visible = false; return; }
    const t = wallTransform(hover.edgeKey);
    ghost.position.set(t.x, 0, t.z);
    ghost.rotation.y = t.ry;
  } else if (tool.mode === 'build') {
    ghost.position.set(p.cx + 0.5 - S / 2, 0, p.cz + 0.5 - S / 2);
    ghost.rotation.y = 0;
  } else {
    const def = FURNITURE[tool.id];
    const w = toolRot % 2 ? def.d : def.w, d = toolRot % 2 ? def.w : def.d;
    ghost.position.set(p.cx + w / 2 - S / 2, 0, p.cz + d / 2 - S / 2);
    ghost.rotation.y = toolRot * Math.PI / 2;
  }
  setGhostValid(canPlace());
});

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyR' && tool && tool.mode === 'furniture') {
    toolRot = (toolRot + 1) % 4;
    snd.click();
  }
  if (e.code === 'Escape' && !walkMode) selectTool(null);
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* Botones superiores */
document.getElementById('btn-daynight').addEventListener('click', e => {
  isNight = !isNight;
  e.currentTarget.textContent = isNight ? '☀️' : '🌙';
  snd.click();
});
document.getElementById('btn-walk').addEventListener('click', () => walkMode ? exitWalk() : enterWalk());
document.getElementById('btn-screenshot').addEventListener('click', () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = 'mi-hogar-3d.png';
  a.click();
  toast('Captura guardada 📷', 'success');
});
document.getElementById('btn-missions').addEventListener('click', () => {
  document.getElementById('missions-panel').classList.toggle('hidden');
  snd.click();
});
document.getElementById('btn-save').addEventListener('click', () => saveGame(true));
document.getElementById('btn-export').addEventListener('click', exportGame);
document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', e => {
  if (e.target.files[0]) importGame(e.target.files[0]);
  e.target.value = '';
});
document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('¿Seguro que quieres empezar de cero? Se borrará tu casa actual.')) return;
  state = newState();
  rebuildAll();
  updateMoney();
  renderMissions();
  saveGame();
  toast('Nueva parcela lista 🌱', 'success');
});
document.getElementById('btn-help').addEventListener('click', () => document.getElementById('help-modal').classList.remove('hidden'));
document.getElementById('btn-close-help').addEventListener('click', () => {
  document.getElementById('help-modal').classList.add('hidden');
  localStorage.setItem(HELP_KEY, '1');
  snd.click();
});
document.getElementById('btn-rotate').addEventListener('click', () => {
  if (tool && tool.mode === 'furniture') { toolRot = (toolRot + 1) % 4; snd.click(); }
});
document.getElementById('btn-cancel').addEventListener('click', () => selectTool(null));

/* ---------------- Inicio ---------------- */
buildUI();
if (loadGame()) rebuildAll();
updateMoney();
renderMissions();
if (!localStorage.getItem(HELP_KEY)) document.getElementById('help-modal').classList.remove('hidden');

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (walkMode) updateWalk(dt);
  else controls.update();
  updateDayNight(dt);
  renderer.render(scene, camera);
}
animate();

/* Ocultar loader */
setTimeout(() => {
  const l = document.getElementById('loader');
  l.classList.add('fade');
  setTimeout(() => l.remove(), 700);
}, 400);
