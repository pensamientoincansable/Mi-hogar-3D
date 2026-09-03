/* ============================================================
   Mi Hogar 3D — Construye tu hogar de ensueño
   Juego de construcción 3D estático, compatible con GitHub Pages.
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { FBXLoader } from '../vendor/loaders/FBXLoader.js';
import { RoundedBoxGeometry } from '../vendor/geometries/RoundedBoxGeometry.js';

/* ---------------- Constantes ---------------- */
const S = 40;             // tamaño de la parcela (celdas)
const WALL_H = 3;         // altura de pared
const START_MONEY = 25000;
const SAVE_KEY = 'mihogar3d-save-v1';
const HELP_KEY = 'mihogar3d-help-v1';
const TEXTURE_ROOT = 'media/image/';
const SKY_ROOT = 'media/image/Sky/';

const PALETTE = [0xf5f0e8, 0xe8d9b5, 0xc96f4a, 0xb8443f, 0x4a7fb5, 0x5d9b6c, 0x8a8f98, 0x8b5a2b];

/* ---------------- Utilidades de malla ---------------- */
const materials = new Map();
function inferSurface(color) {
  const c = new THREE.Color(color);
  const { r, g, b } = c;
  const max = Math.max(r, g, b);
  if (g > r * 1.08 && g > b * 1.08) return 'leaves';
  if (b > r * 1.18 && b > g * 1.05) return 'stone';
  if (max < 0.42 && Math.abs(r - g) < 0.08 && Math.abs(g - b) < 0.1) return 'stone';
  if (r > 0.42 && g > 0.26 && g < 0.72 && g > r * 0.52 && g < r * 0.9 && b < r * 0.72) return 'wood';
  if (max > 0.62 && max < 0.83 && Math.abs(r - g) < 0.06 && Math.abs(g - b) < 0.1 && Math.abs(r - b) < 0.12) return 'metal';
  if (r > 0.82 && g > 0.7 && b > 0.6) return 'plaster';
  if (Math.abs(r - g) < 0.06 && Math.abs(g - b) < 0.08) return max > 0.7 ? 'plaster' : 'concrete';
  if (r > 0.32 && g < r * 0.42) return 'fabric';
  return 'rough';
}
function makeMat(color, surface = null, opts = {}) {
  const s = SURFACES[surface || inferSurface(color)] || SURFACES.rough;
  const key = color + '|' + (surface || '') + '|' + JSON.stringify(opts);
  if (materials.has(key)) return materials.get(key);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? s.roughness,
    metalness: opts.metalness ?? s.metalness,
    map: opts.map ?? s.map,
    bumpMap: opts.bumpMap ?? s.bump,
    bumpScale: opts.bumpScale ?? s.bumpScale,
    envMapIntensity: opts.envMapIntensity ?? s.envMapIntensity,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
    flatShading: opts.flatShading ?? false,
    wireframe: opts.wireframe ?? false,
  });
  materials.set(key, m);
  return m;
}
function mat(color, opts = {}) {
  const { surface = null, ...rest } = opts;
  return makeMat(color, surface, rest);
}
function tiledMaterial(color, surface, rx = 1, ry = 1, opts = {}) {
  const s = SURFACES[surface || inferSurface(color)] || SURFACES.rough;
  const map = s.map ? s.map.clone() : null;
  if (map) { map.repeat.set(rx, ry); map.needsUpdate = true; }
  const bump = s.bump ? s.bump.clone() : null;
  if (bump) { bump.repeat.set(rx, ry); bump.needsUpdate = true; }
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? s.roughness,
    metalness: opts.metalness ?? s.metalness,
    map,
    bumpMap: bump,
    bumpScale: opts.bumpScale ?? s.bumpScale,
    envMapIntensity: opts.envMapIntensity ?? s.envMapIntensity,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
  });
}
function box(w, h, d, color, x = 0, y = 0, z = 0, paint = false, surface = null) {
  const base = mat(color, surface ? { surface } : {});
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint ? base.clone() : base);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (paint) m.userData.paint = true;
  return m;
}
// Caja con cantos suavizados para piezas que se ven de cerca. Los muebles ya no
// parecen bloques de prototipo y las aristas capturan mejor la luz ambiental.
function rbox(w, h, d, color, x = 0, y = 0, z = 0, radius = 0.045, paint = false, surface = null) {
  const base = mat(color, surface ? { surface } : {});
  const safeRadius = Math.min(radius, w * 0.24, h * 0.24, d * 0.24);
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, safeRadius), paint ? base.clone() : base);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (paint) m.userData.paint = true;
  return m;
}
function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 18, paint = false, surface = null) {
  const base = mat(color, surface ? { surface } : {});
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), paint ? base.clone() : base);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (paint) m.userData.paint = true;
  return m;
}
function sph(r, color, x = 0, y = 0, z = 0, paint = false, surface = null) {
  const base = mat(color, surface ? { surface } : {});
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), paint ? base.clone() : base);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (paint) m.userData.paint = true;
  return m;
}
function glass(w, h, color = 0xaad4e8, opacity = 0.42, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.035),
    new THREE.MeshPhysicalMaterial({
      color, transparent: true, opacity, depthWrite: false,
      roughness: 0.08, metalness: 0.0, envMapIntensity: 1.4,
      side: THREE.DoubleSide
    })
  );
  m.position.set(x, y, z);
  m.castShadow = false;
  return m;
}
function shade(color, amount) {
  const c = new THREE.Color(color);
  if (amount >= 0) c.lerp(new THREE.Color(0xffffff), amount);
  else c.lerp(new THREE.Color(0x000000), -amount);
  return c.getHex();
}
function grp(...children) { const g = new THREE.Group(); children.forEach(c => g.add(c)); return g; }
function ellipsoid(rx, ry, rz, color, x = 0, y = 0, z = 0, paint = false, surface = null, seg = 20) {
  const base = mat(color, surface ? { surface } : {});
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(10, seg - 6)), paint ? base.clone() : base);
  m.scale.set(rx, ry, rz);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (paint) m.userData.paint = true;
  return m;
}
function lathe(profile, color, x = 0, y = 0, z = 0, paint = false, surface = null, seg = 32) {
  const points = profile.map(([px, py]) => new THREE.Vector2(px, py));
  const base = mat(color, surface ? { surface } : {});
  const m = new THREE.Mesh(new THREE.LatheGeometry(points, seg), paint ? base.clone() : base);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (paint) m.userData.paint = true;
  return m;
}
function tube(points, radius, color, tubularSegments = 18, radialSegments = 8, surface = null) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(path, tubularSegments, radius, radialSegments, false), mat(color, surface ? { surface } : {}));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function roughRock(rx, ry, rz, color, x = 0, y = 0, z = 0, rot = 0) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), mat(color, { surface: 'stone', roughness: .92 }));
  m.scale.set(rx, ry, rz);
  m.position.set(x, y, z);
  m.rotation.set(rot * .47, rot, rot * .23);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ---------------- Plantillas orgánicas ---------------- */
function leafMat(color) { return mat(color, { surface: 'leaves', roughness: 0.82, envMapIntensity: 0.55 }); }
function barkMat(color = 0x6b4423) { return mat(color, { surface: 'bark', roughness: 0.9, envMapIntensity: 0.4 }); }
function petalMat(color) { return mat(color, { surface: 'fabric', roughness: 0.7, envMapIntensity: 0.6 }); }
function leafBlob(r, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), leafMat(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function branch(rt, rb, h, x, y, z, color = 0x6b4423, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), barkMat(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function trunk(rb, h, color = 0x6b4423, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rb * 0.8, rb, h, seg), barkMat(color));
  m.position.y = h / 2;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function flowerBloom(r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), petalMat(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function flowerStem(x, y, z, h, color = 0x3f7d4a) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, h, 7), mat(color, { surface: 'leaves', roughness: 0.8, envMapIntensity: 0.5 }));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function grassTuft(x, z, color = 0x4c9159, scale = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.04 * scale, 0.24 * scale, 5), mat(color, { surface: 'leaves', roughness: 0.85, envMapIntensity: 0.5 }));
    b.position.set(Math.cos(a) * 0.07 * scale, 0.11 * scale, Math.sin(a) * 0.07 * scale);
    b.rotation.set(Math.sin(a * 3) * 0.18, 0, Math.cos(a * 4) * 0.18);
    b.castShadow = true;
    g.add(b);
  }
  g.position.set(x, 0, z);
  return g;
}
function trellisBranchAngles(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push((i / n) * Math.PI * 2 + 0.35);
  return arr;
}

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
  cocina: { name: 'Cocina', ico: '🍳', cost: 550, w: 1, d: 1, anim: 'cocina', build(c = 0x8a8f98) {
    const g = grp(
      box(0.95, 0.85, 0.65, c, 0, 0.43, 0, true),
      box(0.98, 0.06, 0.68, 0x3a3f4a, 0, 0.89),
      cyl(0.11, 0.11, 0.02, 0x14161c, -0.2, 0.93, -0.12),
      cyl(0.11, 0.11, 0.02, 0x14161c, 0.22, 0.93, -0.12),
      cyl(0.11, 0.11, 0.02, 0x14161c, -0.2, 0.93, 0.18),
      cyl(0.11, 0.11, 0.02, 0x14161c, 0.22, 0.93, 0.18),
      cyl(0.15, 0.17, 0.16, 0x30343a, -0.2, 1.0, -0.12),
      cyl(0.18, 0.18, 0.03, 0x3a3f4a, -0.2, 1.09, -0.12)
    );
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf5f7fa, transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.2, envMapIntensity: 1.0 }));
      s.position.set(-0.2, 1.12, -0.12);
      s.userData.anim = 'steam';
      s.castShadow = false;
      g.add(s);
    }
    return g;
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
  alfombra: { name: 'Alfombra', ico: '🟫', cost: 150, w: 2, d: 2, decor: true, build(c = 0xc96f4a) {
    const m = box(1.85, 0.03, 1.85, c, 0, 0.095, 0, true);
    const b = box(1.6, 0.032, 1.6, 0xe8d9b5, 0, 0.096, 0);
    return grp(m, b);
  } },
  planta_interior: { name: 'Planta interior', ico: '🪴', cost: 85, w: 1, d: 1, decor: true, build(c = 0xc96f4a) {
    const g = grp(
      cyl(0.2, 0.28, 0.42, c, 0, 0.21, 0, 16, true),
      cyl(0.035, 0.045, 0.75, 0x3f7d4a, 0, 0.75)
    );
    for (const [x, y, z, s] of [[-.2,.72,0,.23],[.2,.88,.02,.25],[0,1.08,0,.28],[-.12,.95,.16,.2],[.14,.7,-.12,.19]])
      g.add(sph(s, 0x4c9159, x, y, z));
    return g;
  } },
  cuadro: { name: 'Cuadro', ico: '🖼️', cost: 110, w: 1, d: 1, decor: true, build(c = 0x4a7fb5) {
    return grp(
      rbox(0.94, 1.07, 0.09, WOOD_D, 0, 1.15, -0.35, .035, false, 'wood'),
      rbox(0.78, 0.9, 0.035, c, 0, 1.15, -0.292, .015, true, 'fabric'),
      ellipsoid(.16,.25,.018,0xffd36b,-.16,1.23,-.265,false,'fabric',18),
      ellipsoid(.12,.12,.018,0xf5f0e8,.2,1.4,-.262,false,'fabric',18),
      tube([[-.32,.88,-.257],[-.05,1.15,-.257],[.31,.94,-.257]],.018,shade(c,-.28),16,6,'fabric'),
      rbox(0.62, 0.08, 0.18, WOOD_D, 0, 0.1, -0.28, .02, false, 'wood')
    );
  } },
  espejo: { name: 'Espejo', ico: '🪞', cost: 160, w: 1, d: 1, decor: true, build(c = 0xe8d9b5) {
    return grp(
      box(0.82, 1.55, 0.09, c, 0, 0.92, -0.32, true),
      glass(0.68, 1.4, 0xc9e8f2, 0.7, 0, 0.92, -0.265),
      box(0.7, 0.08, 0.34, WOOD_D, 0, 0.08, -0.24)
    );
  } },
  jarron: { name: 'Jarrón', ico: '🏺', cost: 70, w: 1, d: 1, decor: true, build(c = 0x4a7fb5) {
    const g = grp(lathe([[.13,0],[.22,.06],[.27,.22],[.25,.42],[.17,.58],[.13,.61],[.13,.69],[.17,.71]], c, 0, 0, 0, true, 'clay', 36));
    g.add(lathe([[0,0],[.16,.012],[.17,.025]], 0x2d2620, 0, .69, 0, false, 'rough', 28));
    const stems = [[-.06,.68,.01,-.12,1.15,.02],[.04,.68,0,.14,1.08,.02],[0,.68,-.02,.02,1.26,-.04]];
    for (const [x1,y1,z1,x2,y2,z2] of stems) g.add(tube([[x1,y1,z1],[(x1+x2)*.5,(y1+y2)*.5+.04,(z1+z2)*.5],[x2,y2,z2]], .012, 0x3f7d4a, 10, 6, 'leaves'));
    const blooms = [[-.12,1.16,.02,0xe85d75],[.14,1.1,.02,0xf2c94c],[.02,1.27,-.04,0xf0a5bd]];
    for (const [x,y,z,col] of blooms) {
      for (let i=0;i<6;i++) { const a=i/6*Math.PI*2; const p=ellipsoid(.055,.028,.09,col,x+Math.cos(a)*.055,y,z+Math.sin(a)*.055,false,'fabric',14); p.rotation.y=-a; g.add(p); }
      g.add(sph(.035,shade(col,-.25),x,y+.025,z,false,'fabric'));
    }
    return g;
  } },
  reloj_pie: { name: 'Reloj de pie', ico: '🕰️', cost: 290, w: 1, d: 1, decor: true, anim: 'reloj', build(c = WOOD) {
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.035, 24), mat(0xf4e8c8));
    face.rotation.x = Math.PI / 2; face.position.set(0, 1.46, 0.19);
    const h2 = new THREE.Group(); h2.position.set(0, 1.46, 0.225);
    h2.add(box(0.13, 0.025, 0.02, DARK, 0.06, 0, 0));
    h2.userData.anim = 'hand2';
    const h1 = new THREE.Group(); h1.position.set(0, 1.46, 0.225);
    h1.add(box(0.025, 0.2, 0.02, DARK, 0, 0.1, 0));
    h1.userData.anim = 'hand1';
    const body = grp(
      rbox(0.56, 1.72, 0.38, c, 0, .88, 0, .055, true, 'wood'),
      rbox(.43,.8,.055,0x4c2e1c,0,.58,.205,.025,false,'wood'),
      glass(.36,.7,0xd7e8e8,.34,0,.58,.242),
      face, h2, h1, sph(0.02, DARK, 0, 1.46, 0.24)
    );
    const pendulum = grp(cyl(.012,.012,.43,0xc6a347,0,.6,.255,10),sph(.075,0xc6a347,0,.36,.255));
    body.add(pendulum);
    body.add(rbox(.7,.11,.48,c,0,.08,0,.04,true,'wood'), rbox(.66,.09,.45,c,0,1.76,0,.035,true,'wood'));
    return body;
  } },
  candelabro: { name: 'Candelabro', ico: '🕯️', cost: 130, w: 1, d: 1, decor: true, light: { y: 1.25, i: 7, color: 0xffb45c }, build(c = METAL) {
    const g = grp(lathe([[.22,0],[.22,.025],[.15,.07],[.055,.1]],c,0,0,0,true,'metal',28),cyl(.03,.045,.86,c,0,.52,0,16,true,'metal'));
    for (const x of [-.28, 0, .28]) {
      if(x) g.add(tube([[0,.78,0],[x*.45,.82,0],[x,.91,0]],.022,c,18,8,'metal'));
      g.add(lathe([[.07,0],[.075,.025],[.045,.05]],c,x,.91,0,true,'metal',18));
      g.add(cyl(.028,.03,.28,0xf5f0e8,x,1.08,0,14,false,'fabric'));
      const flame=ellipsoid(.035,.065,.027,0xffb347,x,1.27,0,false,'fabric',14); flame.material=new THREE.MeshStandardMaterial({color:0xffbb55,emissive:0xff7b24,emissiveIntensity:.8,roughness:.4}); g.add(flame);
    }
    return g;
  } },
  acuario: { name: 'Acuario', ico: '🐠', cost: 420, w: 2, d: 1, decor: true, light: { y: 1.25, i: 5, color: 0x68cfee }, anim: 'acuario', build(c = 0x4a7fb5) {
    const waterMat = new THREE.MeshPhysicalMaterial({ color:0x55bad2,transparent:true,opacity:.2,transmission:.2,roughness:.04,depthWrite:false,side:THREE.DoubleSide });
    const water = new THREE.Mesh(new THREE.BoxGeometry(1.42,.58,.48),waterMat); water.position.set(0,1.01,0); water.castShadow=false;
    const g = grp(
      rbox(1.58,.64,.56,WOOD_D,0,.33,0,.055,true,'wood'),
      rbox(1.46,.48,.045,shade(WOOD_D,-.18),0,.35,.303,.018),
      rbox(1.6,.065,.58,DARK,0,.69,0,.02),
      rbox(1.6,.07,.58,c,0,1.34,0,.025,true,'metal'), water,
      glass(1.46,.6,0xb5ebf3,.3,0,1.02,.275)
    );
    for (const [x,z,s] of [[-.55,.16,.09],[-.3,.13,.065],[.05,.17,.08],[.38,.12,.07],[.62,.15,.06]]) g.add(roughRock(s,s*.55,s*.8,0x8b806f,x,.75,z,x*4));
    for (const x of [-.58,.48]) {
      g.add(tube([[x,.76,.05],[x+.08,.98,.03],[x-.04,1.22,0]],.012,0x3f7d4a,10,6,'leaves'));
      for (let i=0;i<4;i++) g.add(ellipsoid(.06,.025,.12,0x4f9258,x+(i%2?-.04:.06),.9+i*.08,.02,false,'leaves',12));
    }
    for (const [i,col] of [[0,0xff8a5c],[1,0x4ad9c5],[2,0xf2c94c]]) {
      const f = grp(ellipsoid(.1,.055,.045,col,0,0,0,false,'fabric',16));
      const tail = new THREE.Mesh(new THREE.ConeGeometry(.065,.13,3),petalMat(col)); tail.rotation.z=Math.PI/2; tail.position.x=-.12; f.add(tail,sph(.012,0x111820,.07,.018,.04));
      f.userData.anim='afish'; f.userData.fishIndex=i; g.add(f);
    }
    return g;
  } },
  puff: { name: 'Puf', ico: '🟠', cost: 120, w: 1, d: 1, decor: true, build(c = 0xc96f4a) {
    return grp(cyl(0.38, 0.43, 0.42, c, 0, 0.23, 0, 18, true), cyl(0.33, 0.38, 0.08, shade(c, .15), 0, 0.48));
  } },
  mesa_centro: { name: 'Mesa de centro', ico: '☕', cost: 190, w: 2, d: 1, decor: true, build(c = WOOD) {
    const g = grp(box(1.55, 0.09, 0.72, c, 0, 0.48, 0, true));
    for (const [x, z] of [[-.65,-.26],[.65,-.26],[-.65,.26],[.65,.26]]) g.add(box(.07,.45,.07,WOOD_D,x,.23,z));
    g.add(cyl(.12,.1,.09,0xf5f0e8,.25,.57,0,16));
    return g;
  } },
  biombo: { name: 'Biombo', ico: '🎐', cost: 240, w: 2, d: 1, decor: true, build(c = 0xe8d9b5) {
    const g = grp();
    for (let i = 0; i < 3; i++) {
      const x = -.62 + i * .62;
      g.add(rbox(.56,1.65,.07,c,x,.85,0,.035,true,'wood'));
      g.add(rbox(.47,1.46,.025,i % 2 ? 0xf5f0e8 : 0xe6cfa4,x,.87,.045,.012,false,'fabric'));
      g.add(cyl(.025,.025,1.65,DARK,x+.3,.85,.02,8));
    }
    return g;
  } },
  arbol: { name: 'Árbol', ico: '🌳', cost: 100, w: 1, d: 1, out: true, anim: 'sway', build() {
    const t = grp(trunk(0.14, 1.25, 0x6b4423));
    const b1 = branch(0.035, 0.055, 0.5, 0.0, 1.0, 0.0, 0x6b4423); b1.rotation.z = 0.7;
    const b2 = branch(0.03, 0.05, 0.42, 0.0, 1.0, 0.0, 0x6b4423); b2.rotation.z = -0.75; b2.rotation.y = 1.4;
    t.add(b1, b2);
    const f = grp(
      leafBlob(0.58, 0x3f7d4a, 0, 1.62, 0, 1.05, 0.82, 1),
      leafBlob(0.44, 0x4c9159, -0.36, 1.42, 0.1, 1, 0.9, 1),
      leafBlob(0.42, 0x356f40, 0.34, 1.5, -0.08, 1, 0.88, 1),
      leafBlob(0.4, 0x4c9159, -0.05, 1.98, -0.02, 1, 0.78, 1),
      leafBlob(0.34, 0x5aa266, 0.3, 1.82, 0.24, 1, 0.82, 1),
      leafBlob(0.32, 0x4c9159, -0.3, 1.78, -0.24, 1, 0.8, 1)
    );
    f.userData.anim = 'sway';
    return grp(t, f);
  } },
  flores: { name: 'Flores', ico: '🌷', cost: 40, w: 1, d: 1, out: true, anim: 'sway', build() {
    const g = grp(box(0.85, 0.08, 0.85, 0x4a3626, 0, 0.05, 0, true, 'clay'));
    const p = grp();
    const cols = [0xe85d75, 0xf2c94c, 0xa06fc9, 0xff8a5c, 0x78b4ff, 0xff6fa0];
    for (let i = 0; i < 9; i++) {
      const px = -0.3 + (i % 3) * 0.3, pz = -0.3 + Math.floor(i / 3) * 0.3;
      const clr = cols[i % cols.length];
      p.add(flowerStem(px, 0, pz, 0.26 + (i % 2) * 0.08));
      const bloom = grp();
      bloom.position.set(px, 0.34 + (i % 2) * 0.08, pz);
      bloom.add(sph(0.045, shade(clr, -0.14), 0, 0.02, 0, false, 'fabric'));
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + i;
        bloom.add(sph(0.06, clr, Math.cos(a) * 0.055, 0.005, Math.sin(a) * 0.055, false, 'fabric'));
      }
      p.add(bloom);
      if (i % 3 === 0) p.add(leafBlob(0.08, 0x4c9159, px + 0.05, 0.22, pz + 0.05, 1.2, 0.7, 0.9));
    }
    p.userData.anim = 'sway';
    g.add(p);
    g.add(grassTuft(-0.34, 0.32, 0x3f7d4a, 0.8));
    g.add(grassTuft(0.34, -0.32, 0x4c9159, 0.9));
    return g;
  } },
  seto: { name: 'Seto', ico: '🌿', cost: 60, w: 1, d: 1, out: true, build() {
    const g = grp(box(0.9, 0.62, 0.45, 0x2f6b3a, 0, 0.31, 0, true, 'leaves'));
    for (let i = 0; i < 6; i++) g.add(leafBlob(0.2, i % 2 ? 0x3f7d4a : 0x4c9159, -0.36 + (i % 3) * 0.36, 0.66, (Math.floor(i / 3) - 0.5) * 0.34, 1.1, 0.62, 1));
    return g;
  } },
  cerezo: { name: 'Cerezo', ico: '🌸', cost: 135, w: 1, d: 1, out: true, anim: 'sway', build() {
    const t = grp(trunk(0.12, 1.35, 0x6b4423));
    const b = branch(0.035, 0.06, 0.5, 0.03, 1.05, 0, 0x6b4423); b.rotation.z = 0.7;
    t.add(b);
    const f = grp(
      leafBlob(0.56, 0xf2a6c6, 0, 1.72, 0, 1.05, 0.8, 1),
      leafBlob(0.42, 0xff9fc0, -0.36, 1.5, 0.06, 1, 0.9, 1),
      leafBlob(0.4, 0xf28bb0, 0.36, 1.56, -0.08, 1, 0.86, 1),
      leafBlob(0.36, 0xffb2cf, -0.02, 2.05, 0, 1, 0.74, 1)
    );
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      f.add(flowerBloom(0.05, 0xff6fa0, Math.cos(a) * 0.48, 1.72 + Math.sin(i * 1.7) * 0.28, Math.sin(a) * 0.48));
    }
    f.userData.anim = 'sway';
    return grp(t, f);
  } },
  arce: { name: 'Arce', ico: '🍁', cost: 130, w: 1, d: 1, out: true, anim: 'sway', build() {
    const t = grp(trunk(0.13, 1.3, 0x66503a));
    const f = grp(
      leafBlob(0.55, 0xd8542f, 0, 1.62, 0, 1.1, 0.82, 1),
      leafBlob(0.42, 0xe8753a, -0.34, 1.46, 0.1, 1, 0.9, 1),
      leafBlob(0.38, 0xc74328, 0.36, 1.5, -0.1, 1, 0.88, 1),
      leafBlob(0.34, 0xf08a3f, -0.02, 2.0, 0, 1, 0.8, 1)
    );
    f.userData.anim = 'sway';
    return grp(t, f);
  } },
  abedul: { name: 'Abedul', ico: '🌳', cost: 115, w: 1, d: 1, out: true, anim: 'sway', build() {
    const t = grp(trunk(0.1, 1.6, 0xe8e2d5));
    for (const s of [-0.35, 0.3, -0.1, 0.42]) t.add(box(0.03, 0.12 + Math.abs(s) * 0.1, 0.015, 0x3a3a3a, s * 0.12, 1.2 + (s + 0.35) * 0.2, 0.08));
    const f = grp(
      leafBlob(0.48, 0x5aa266, 0, 1.82, 0),
      leafBlob(0.38, 0x4c9159, -0.3, 1.75, 0.08),
      leafBlob(0.36, 0x6bad5f, 0.3, 1.8, -0.05),
      leafBlob(0.3, 0x4c9159, 0, 2.15, 0)
    );
    f.userData.anim = 'sway';
    return grp(t, f);
  } },
  manzano: { name: 'Manzano', ico: '🍎', cost: 150, w: 1, d: 1, out: true, anim: 'sway', build() {
    const t = grp(trunk(0.14, 1.2, 0x6b4423));
    const f = grp(
      leafBlob(0.6, 0x3f7d4a, 0, 1.55, 0, 1.1, 0.82, 1),
      leafBlob(0.44, 0x4c9159, -0.4, 1.4, 0.05, 1, 0.9, 1),
      leafBlob(0.42, 0x4c9159, 0.38, 1.44, -0.06, 1, 0.88, 1),
      leafBlob(0.34, 0x5aa266, 0, 1.95, 0.02, 1, 0.8, 1)
    );
    const apples = [[-0.3, 1.62, 0.22], [0.22, 1.72, -0.05], [0.38, 1.48, 0.24], [-0.15, 1.4, -0.3], [0.05, 1.9, 0.14]];
    for (const [x, y, z] of apples) f.add(sph(0.09, 0xd23b2f, x, y, z, false, 'fabric'));
    f.userData.anim = 'sway';
    return grp(t, f);
  } },
  sauce: { name: 'Sauce', ico: '🌳', cost: 165, w: 1, d: 1, out: true, anim: 'sway', build() {
    const t = grp(trunk(0.13, 1.5, 0x6b4423));
    const f = grp(leafBlob(0.5, 0x4c9159, 0, 1.8, 0, 1.1, 0.7, 1.1));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const s = leafBlob(0.2, i % 2 ? 0x5aa266 : 0x3f7d4a, Math.cos(a) * 0.5, 1.5 - (i % 3) * 0.12, Math.sin(a) * 0.5, 1, 1.8, 1);
      f.add(s);
    }
    f.userData.anim = 'sway';
    return grp(t, f);
  } },
  rosal: { name: 'Rosal', ico: '🌹', cost: 75, w: 1, d: 1, out: true, anim: 'sway', build() {
    const g = grp(...(() => { const a = []; for (let i = 0; i < 6; i++) a.push(leafBlob(0.24, 0x3f7d4a, -0.28 + (i % 3) * 0.28, 0.34 + Math.floor(i / 3) * 0.2, (Math.floor(i / 3) - 0.5) * 0.24, 1.1, 0.8, 1)); return a; })());
    const roses = [0xe85d75, 0xff6fa0, 0xd23b7a, 0xf2c94c];
    for (let i = 0; i < 5; i++) {
      const x = -0.24 + (i % 3) * 0.24, z = -0.16 + Math.floor(i / 3) * 0.32;
      g.add(flowerStem(x, 0.05, z, 0.26, 0x2f6b3a));
      g.add(flowerBloom(0.09, roses[i % 4], x, 0.38, z));
    }
    return g;
  } },
  margaritas: { name: 'Margaritas', ico: '🌼', cost: 55, w: 1, d: 1, out: true, anim: 'sway', build() {
    const g = grp(box(0.8, 0.07, 0.8, 0x3f4a3a, 0, 0.045, 0, true, 'clay'));
    const p = grp();
    const cols = [0xf5f0e8, 0xfff6d9, 0xf2c94c, 0xfdf3d0];
    for (let i = 0; i < 5; i++) {
      const px = -0.26 + (i % 3) * 0.26, pz = -0.2 + Math.floor(i / 3) * 0.4;
      p.add(flowerStem(px, 0, pz, 0.3));
      const bloom = grp(); bloom.position.set(px, 0.38, pz);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        bloom.add(sph(0.045, cols[i % cols.length], Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07, false, 'fabric'));
      }
      bloom.add(sph(0.045, 0xf2b50a, 0, 0.02, 0, false, 'fabric'));
      p.add(bloom);
    }
    p.userData.anim = 'sway';
    g.add(p);
    return g;
  } },
  girasoles: { name: 'Girasoles', ico: '🌻', cost: 80, w: 1, d: 1, out: true, anim: 'sway', build() {
    const g = grp(box(0.82, 0.08, 0.82, 0x4a3626, 0, 0.05, 0, true, 'clay'));
    const p = grp();
    for (let i = 0; i < 4; i++) {
      const px = -0.24 + (i % 2) * 0.48, pz = -0.14 + Math.floor(i / 2) * 0.34;
      const h = 0.75 + (i % 2) * 0.15;
      p.add(flowerStem(px, 0, pz, h, 0x3f7d4a));
      const bloom = grp(); bloom.position.set(px, h + 0.08, pz);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        bloom.add(sph(0.055, 0xf2c94c, Math.cos(a) * 0.085, 0, Math.sin(a) * 0.085, false, 'fabric'));
      }
      bloom.add(sph(0.075, 0x6b4423, 0, 0.02, 0, false, 'wood'));
      p.add(bloom);
      p.add(leafBlob(0.12, 0x4c9159, px - 0.04, h * 0.55, pz, 0.5, 1.5, 0.8));
    }
    p.userData.anim = 'sway';
    g.add(p);
    return g;
  } },
  lavanda: { name: 'Lavanda', ico: '💜', cost: 65, w: 1, d: 1, out: true, anim: 'sway', build() {
    const g = grp(box(0.8, 0.06, 0.8, 0x8a8f98, 0, 0.04, 0, true, 'stone'));
    const p = grp();
    for (let i = 0; i < 12; i++) {
      const px = -0.34 + (i % 4) * 0.23, pz = -0.26 + Math.floor(i / 4) * 0.18;
      p.add(flowerStem(px, 0, pz, 0.42, 0x4c9159));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 7), petalMat(i % 2 ? 0x9b7fd4 : 0x8a63c9));
      tip.position.set(px, 0.5, pz);
      tip.castShadow = true;
      p.add(tip);
    }
    p.userData.anim = 'sway';
    g.add(p);
    return g;
  } },
  hortensia: { name: 'Hortensia', ico: '💠', cost: 85, w: 1, d: 1, out: true, anim: 'sway', build() {
    const g = grp(...(() => { const a = []; for (let i = 0; i < 5; i++) a.push(leafBlob(0.22, 0x3f7d4a, -0.26 + (i % 3) * 0.26, 0.3 + Math.floor(i / 3) * 0.16, (Math.floor(i / 3) - 0.5) * 0.22, 1.1, 0.9, 1)); return a; })());
    const dome = grp();
    const cols = [0x9bb8e8, 0xb6d2ef, 0xbf9bdc, 0x88a7dd];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, rr = 0.18 + (i % 4) * 0.05;
      dome.add(flowerBloom(0.06, cols[i % cols.length], Math.cos(a) * rr, 0.4 + (i % 3) * 0.05, Math.sin(a) * rr));
    }
    dome.add(flowerBloom(0.08, 0x9bb8e8, 0, 0.42, 0));
    dome.userData.anim = 'sway';
    g.add(dome);
    return g;
  } },
  helecho: { name: 'Helecho', ico: '🌿', cost: 60, w: 1, d: 1, out: true, anim: 'sway', build() {
    const g = grp(...(() => { const a = []; for (let i = 0; i < 5; i++) a.push(leafBlob(0.16, 0x3f7d4a, -0.28 + (i % 3) * 0.28, 0.16 + Math.floor(i / 3) * 0.12, (Math.floor(i / 3) - 0.5) * 0.28, 1, 0.7, 1)); return a; })());
    const blades = grp();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.62, 6), leafMat(i % 2 ? 0x4c9159 : 0x3f7d4a));
      b.position.set(Math.cos(a) * 0.16, 0.34, Math.sin(a) * 0.16);
      b.rotation.z = 0.7 * Math.cos(a); b.rotation.x = -0.7 * Math.sin(a);
      b.castShadow = true;
      blades.add(b);
    }
    blades.userData.anim = 'sway';
    g.add(blades);
    return g;
  } },
  farola: { name: 'Farola', ico: '🏮', cost: 180, w: 1, d: 1, out: true, light: { y: 2.35, i: 18, color: 0xffe2b0 }, build() {
    const glowMat = new THREE.MeshPhysicalMaterial({color:0xffe1a3,emissive:0xffb861,emissiveIntensity:.5,transparent:true,opacity:.78,roughness:.12,envMapIntensity:1.5});
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.34,8),glowMat); glow.position.y=2.35;
    const g=grp(
      lathe([[.2,0],[.2,.05],[.14,.1],[.09,.15]],DARK,0,0,0,false,'metal',28),
      cyl(.038,.052,2.13,DARK,0,1.18,0,16,false,'metal'),
      cyl(.11,.07,.08,DARK,0,2.22,0,16,false,'metal'),glow,
      cyl(.23,.19,.055,DARK,0,2.55,0,8,false,'metal'),
      new THREE.Mesh(new THREE.ConeGeometry(.25,.16,8),mat(DARK,{surface:'metal'}))
    );
    g.children[g.children.length-1].position.y=2.66;
    for(let i=0;i<4;i++){const a=i*Math.PI/2; g.add(cyl(.012,.012,.34,DARK,Math.cos(a)*.17,2.35,Math.sin(a)*.17,6,false,'metal'));}
    return g;
  } },
  banco_jardin: { name: 'Banco', ico: '🪑', cost: 210, w: 2, d: 1, out: true, build(c = WOOD) {
    const g = grp(
      box(1.75, .12, .55, c, 0, .48, .08, true),
      box(1.75, .65, .1, c, 0, .83, -.22, true)
    );
    for (const x of [-.72,.72]) {
      g.add(box(.1,.48,.1,DARK,x,.24,.15));
      g.add(box(.1,.82,.1,DARK,x,.42,-.22));
    }
    return g;
  } },
  fuente: { name: 'Fuente', ico: '⛲', cost: 520, w: 2, d: 2, out: true, anim: 'fuente', build(c = 0x8a8f98) {
    const g = grp(
      cyl(.78,.92,.28,c,0,.14,0,24,true,'stone'),
      cyl(.66,.66,.08,0x67b8d4,0,.3,0,24,false,'water'),
      cyl(.13,.2,1.0,c,0,.77,0,18,true,'stone'),
      cyl(.42,.22,.12,c,0,1.22,0,20,true,'stone'),
      sph(.12,0x67b8d4,0,1.34,0,false,'water')
    );
    g.children[1].userData.anim = 'fwater'; // agua de la cuenca (ondula)
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.05, 0.44, 8), new THREE.MeshStandardMaterial({ color: 0x8fd0e8, transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.08, envMapIntensity: 1.6 }));
    jet.position.set(0, 1.5, 0);
    jet.userData.anim = 'fjet';
    g.add(jet);
    for (let i = 0; i < 6; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0x8fd0e8, transparent: true, opacity: 0.75, depthWrite: false, roughness: 0.1, envMapIntensity: 1.6 }));
      d.position.set(0, 1.4, 0);
      d.userData.anim = 'fdrop';
      d.castShadow = false;
      g.add(d);
    }
    return g;
  } },
  barbacoa: { name: 'Barbacoa', ico: '🔥', cost: 360, w: 1, d: 1, out: true, build(c = DARK) {
    const bowl=new THREE.Mesh(new THREE.SphereGeometry(.39,28,14,0,Math.PI*2,Math.PI/2,Math.PI/2),mat(c,{surface:'metal',roughness:.28,metalness:.65})); bowl.position.y=.92; bowl.scale.z=.82; bowl.userData.paint=true;
    const lid=new THREE.Mesh(new THREE.SphereGeometry(.39,28,12,0,Math.PI*2,0,Math.PI/2),mat(c,{surface:'metal',roughness:.28,metalness:.65})); lid.position.set(0,1.11,-.22); lid.rotation.x=-.68; lid.scale.z=.82; lid.userData.paint=true;
    const g=grp(bowl,lid,cyl(.055,.055,.16,DARK,0,1.48,-.05,14,false,'metal'));
    const handle=tube([[-.15,1.48,-.05],[-.15,1.58,-.05],[.15,1.58,-.05],[.15,1.48,-.05]],.025,0x2b2f32,16,8,'metal'); g.add(handle);
    for(const z of [-.22,-.11,0,.11,.22]) g.add(box(.65,.012,.012,METAL,0,1.12,z));
    for(const x of [-.25,.25]) g.add(cyl(.025,.038,.76,METAL,x,.43,0,12,false,'metal'));
    const axle=cyl(.025,.025,.56,METAL,0,.12,0,10,false,'metal'); axle.rotation.z=Math.PI/2; g.add(axle);
    for(const x of [-.29,.29]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.1,.025,8,18),mat(0x25282c,{surface:'rough'})); wheel.position.set(x,.12,0); wheel.rotation.y=Math.PI/2; g.add(wheel);}
    g.add(rbox(.56,.04,.32,0x6b4423,0,.43,0,.015,false,'wood'));
    return g;
  } },
  estanque: { name: 'Estanque', ico: '💧', cost: 280, w: 2, d: 2, out: true, anim: 'estanque', build() {
    const g = grp(
      cyl(.82,.9,.16,0x6b6f74,0,.08,0,28,false,'stone'),
      cyl(.72,.74,.08,0x4dbddd,0,.18,0,28,false,'water')
    );
    g.children[1].userData.anim = 'ewater';
    for (const [i,x,z] of [[0,-.55,-.5],[1,.55,-.42],[2,-.62,.38],[3,.5,.5],[4,0,-.72],[5,.72,.05]]) g.add(roughRock(.2+(i%2)*.035,.1,.17, i%2?0x7f817d:0x696d6d,x,.16,z,i*.73));
    g.add(tube([[.2,.2,-.1],[.22,.36,-.1],[.2,.48,-.1]],.014,0x3f7d4a,10,6,'leaves'));
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;g.add(ellipsoid(.055,.018,.08,0xe85d75,.2+Math.cos(a)*.055,.49,-.1+Math.sin(a)*.055,false,'fabric',12));}
    g.add(sph(.035,0xf0c64a,.2,.51,-.1,false,'fabric'));
    return g;
  } },
  /* ---- Nuevas decoraciones de interior ---- */
  piano: { name: 'Piano', ico: '🎹', cost: 950, w: 2, d: 1, build(c = 0x20242b) {
    const g = grp(
      rbox(1.54,.86,.5,c,0,.46,-.08,.055,true,'wood'),
      rbox(1.64,.11,.6,shade(c,.08),0,.94,-.08,.035,true,'wood'),
      rbox(1.5,.1,.42,c,0,.78,.2,.025,true,'wood'),
      rbox(1.02,.06,.18,0x17191e,0,.37,.23,.018,false,'wood')
    );
    for (const x of [-.66,.66]) g.add(rbox(.085,.72,.09,c,x,.36,.12,.025,true,'wood'));
    for (let i=0;i<22;i++) g.add(rbox(.058,.035,.31,0xf5f2e9,-.61+i*.058,.855,.25,.008));
    for (let i=0;i<15;i++) {
      const x=-.58+i*.083+(i%7===2||i%7===6?.035:0);
      g.add(rbox(.035,.045,.19,0x15171b,x,.892,.2,.006));
    }
    g.add(rbox(.15,.025,.08,0xc19b45,-.09,.08,.2,.008),rbox(.15,.025,.08,0xc19b45,.09,.08,.2,.008));
    return g;
  } },
  peluche: { name: 'Peluche', ico: '🧸', cost: 95, w: 1, d: 1, decor: true, anim: 'bob', build(c = 0xb98850) {
    const f = grp(
      sph(0.22, c, 0, 0.22, 0),
      sph(0.16, c, 0, 0.5, 0),
      sph(0.055, c, -0.14, 0.58, 0),
      sph(0.055, c, 0.14, 0.58, 0),
      sph(0.03, 0x2b2f38, -0.06, 0.52, 0.13),
      sph(0.03, 0x2b2f38, 0.06, 0.52, 0.13),
      sph(0.04, 0xd8b344, 0, 0.45, 0.14)
    );
    f.userData.anim = 'bob';
    return grp(box(0.5, 0.05, 0.3, 0x4a3626, 0, 0.025), f);
  } },
  globo: { name: 'Globos', ico: '🎈', cost: 60, w: 1, d: 1, decor: true, anim: 'bob', build(c = 0xe85d75) {
    const b = grp();
    const cols = [c, 0xf2c94c, 0x4a7fb5];
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.22;
      b.add(sph(0.16, cols[i], x, 1.25 + (i % 2) * 0.12, 0));
      b.add(cyl(0.008, 0.008, 0.4, 0xe8e2d5, x, 0.95, 0, 6));
    }
    b.userData.anim = 'bob';
    return grp(cyl(0.015, 0.015, 1.1, METAL, 0, 0.55), b);
  } },
  pizarra: { name: 'Pizarra', ico: '📋', cost: 130, w: 1, d: 1, decor: true, build(c = WOOD) {
    const l1 = box(0.08, 0.95, 0.05, c, -0.34, 0.47, -0.2); l1.rotation.x = -0.28;
    const l2 = box(0.08, 0.95, 0.05, c, 0.34, 0.47, -0.2); l2.rotation.x = -0.28;
    return grp(
      l1, l2,
      box(0.8, 0.62, 0.05, c, 0, 1.02, -0.14, true),
      box(0.68, 0.5, 0.04, 0x33474f, 0, 1.02, -0.11),
      box(0.05, 0.09, 0.02, 0xf5f0e8, -0.15, 1.15, -0.085),
      box(0.05, 0.09, 0.02, 0xe85d75, 0.1, 0.95, -0.085),
      box(0.72, 0.05, 0.12, c, 0, 0.72, -0.1),
      box(0.12, 0.02, 0.03, WHITE, -0.1, 0.76, -0.1)
    );
  } },
  lampara_mesa: { name: 'Lámpara de mesa', ico: '🪔', cost: 75, w: 1, d: 1, decor: true, light: { y: 0.55, i: 6, color: 0xffd9a0 }, build(c = METAL) {
    return grp(
      cyl(0.14, 0.18, 0.04, c, 0, 0.02),
      cyl(0.02, 0.02, 0.4, c, 0, 0.22),
      cyl(0.12, 0.18, 0.22, 0xf5e6c8, 0, 0.5, 0, 12, true)
    );
  } },
  neon: { name: 'Neón luna', ico: '🌙', cost: 260, w: 1, d: 1, decor: true, anim: 'neon', light: { y: 1.3, i: 7, color: 0xff7ad9 }, build(c = 0x1e222c) {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.035, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0xff9ae0, emissive: 0xff3fae, emissiveIntensity: 0.9, roughness: 0.18, envMapIntensity: 1.0 })
    );
    torus.position.set(0, 1.25, 0.05);
    torus.userData.anim = 'neon';
    return grp(
      box(0.85, 1.0, 0.06, c, 0, 1.2, -0.05, true),
      torus,
      cyl(0.02, 0.02, 0.7, 0x30343a, 0, 0.35),
      cyl(0.22, 0.26, 0.05, 0x30343a, 0, 0.025)
    );
  } },
  /* ---- Nuevas decoraciones de exterior ---- */
  pino: { name: 'Pino', ico: '🌲', cost: 120, w: 1, d: 1, out: true, anim: 'sway', build() {
    const f = grp();
    const coneDefs = [[0.42, 0.55, 0.78, 0x2f6b3f], [0.34, 0.52, 1.08, 0x357a48], [0.25, 0.48, 1.38, 0x3d8a52], [0.16, 0.4, 1.66, 0x4c9159]];
    for (const [r, h, y, col] of coneDefs) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 18), leafMat(col));
      cone.position.y = y; cone.castShadow = true; cone.receiveShadow = true;
      f.add(cone);
    }
    f.userData.anim = 'sway';
    return grp(trunk(0.1, 0.55, 0x5a3a22), f);
  } },
  palmera: { name: 'Palmera', ico: '🌴', cost: 140, w: 1, d: 1, out: true, anim: 'sway', build() {
    const fr = grp();
    for (let i = 0; i < 8; i++) {
      const w = new THREE.Group();
      w.rotation.y = (i / 8) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.95, 8), leafMat(i % 2 ? 0x4c9159 : 0x5aa266));
      leaf.scale.set(1, 1, 0.5);
      leaf.position.set(0.48, 0.02, 0);
      leaf.rotation.z = -1.15;
      leaf.castShadow = true;
      w.add(leaf);
      fr.add(w);
    }
    fr.add(sph(0.11, 0x8b5a2b, 0.06, -0.02, 0.05, false, 'clay'));
    fr.add(sph(0.11, 0x9c7a4a, -0.06, -0.02, -0.05, false, 'clay'));
    fr.position.y = 1.5;
    fr.userData.anim = 'sway';
    const trunkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.13, 1.55, 12), barkMat(0x9c7a4a));
    trunkMesh.position.y = 0.78;
    trunkMesh.castShadow = true; trunkMesh.receiveShadow = true;
    return grp(trunkMesh, fr);
  } },
  cactus: { name: 'Cactus', ico: '🌵', cost: 45, w: 1, d: 1, out: true, build() {
    const cactusMat=mat(0x39894e,{surface:'leaves',roughness:.7});
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.135,.72,8,16),cactusMat); body.position.y=.57; body.castShadow=true;
    const g=grp(lathe([[.24,0],[.28,.08],[.24,.18]],0xb86745,0,0,0,false,'clay',28),body);
    for(const side of [-1,1]){
      const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.072,.28,6,12),cactusMat); arm.position.set(side*.29,.65,0); arm.rotation.z=side*Math.PI/2; arm.castShadow=true; g.add(arm);
      const tip=new THREE.Mesh(new THREE.CapsuleGeometry(.072,.23,6,12),cactusMat); tip.position.set(side*.42,.8,0); tip.castShadow=true; g.add(tip);
    }
    for(let ring=0;ring<5;ring++) for(let i=0;i<8;i++){const a=i/8*Math.PI*2; const thorn=ellipsoid(.008,.018,.008,0xf1e5bf,Math.cos(a)*.14,.28+ring*.15,Math.sin(a)*.14,false,'rough',8); g.add(thorn);}
    const flower=grp(); flower.position.set(0,1.1,0); for(let i=0;i<7;i++){const a=i/7*Math.PI*2;flower.add(ellipsoid(.055,.025,.08,0xe85d75,Math.cos(a)*.045,0,Math.sin(a)*.045,false,'fabric',12));} flower.add(sph(.025,0xf2c94c,0,.02,0));g.add(flower);
    return g;
  } },
  hoguera: { name: 'Hoguera', ico: '🔥', cost: 300, w: 1, d: 1, out: true, anim: 'hoguera', light: { y: 0.7, i: 9, color: 0xff7a2a }, build() {
    const g = grp();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      g.add(sph(0.07, 0x777b7d, Math.cos(a) * 0.42, 0.05, Math.sin(a) * 0.42));
    }
    for (let i = 0; i < 4; i++) {
      const l = cyl(0.05, 0.06, 0.7, 0x6b4423, 0, 0.16, 0, 8);
      l.rotation.z = Math.PI / 2;
      l.rotation.y = (i / 4) * Math.PI;
      g.add(l);
    }
    const flames = [
      [0, 0.4, 0, 0.17, 0xff5a1f],
      [0, 0.5, 0, 0.12, 0xffa02a],
      [0, 0.58, 0, 0.07, 0xffd36b]
    ];
    for (const [x, y, z, r, col] of flames) {
      const f = ellipsoid(r, r * 1.75, r * .75, col, x, y, z, false, 'fabric', 18);
      f.material = new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.72,roughness:.4});
      f.userData.anim = 'fire';
      g.add(f);
    }
    return g;
  } },
  valla: { name: 'Valla', ico: '🚧', cost: 45, w: 1, d: 1, out: true, build(c = 0xd8b579) {
    const g = grp();
    for (const x of [-0.42, 0, 0.42]) {
      g.add(rbox(0.08, 0.68, 0.08, c, x, 0.34, 0, .018, true, 'wood'));
      g.add(cyl(0, 0.055, 0.14, c, x, 0.72, 0, 4));
    }
    g.add(rbox(0.98, 0.07, 0.05, c, 0, 0.55, 0, .014, true, 'wood'));
    g.add(rbox(0.98, 0.07, 0.05, c, 0, 0.28, 0, .014, true, 'wood'));
    return g;
  } },
  camino: { name: 'Camino de piedras', ico: '🪨', cost: 55, w: 1, d: 2, out: true, build(c = 0xb9bec7) {
    const g = grp();
    const spots = [[-.13,-.72,.34,.24],[.16,-.28,.31,.25],[-.1,.17,.33,.23],[.12,.63,.29,.22]];
    for (let i=0;i<spots.length;i++) { const [x,z,rx,rz]=spots[i]; const stone=roughRock(rx,.055+(i%2)*.012,rz,i%2?shade(c,-.08):shade(c,.04),x,.055,z,i*.67); stone.userData.paint=true; g.add(stone); }
    for(const [x,z] of [[-.38,-.5],[.36,-.05],[-.34,.48]]) g.add(grassTuft(x,z,0x4f8e50,.55));
    return g;
  } },
  estatua: { name: 'Estatua', ico: '🗿', cost: 380, w: 1, d: 1, out: true, build(c = 0xcfd4da) {
    const stone=mat(c,{surface:'stone',roughness:.88});
    const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.2,.52,8,20),stone.clone()); torso.position.y=.93; torso.scale.set(.82,1,.6); torso.userData.paint=true;
    const head=ellipsoid(.16,.21,.15,c,0,1.5,0,true,'stone',24);
    const g=grp(
      lathe([[.48,0],[.48,.08],[.39,.15],[.36,.27]],0x8f9499,0,0,0,false,'stone',32),
      rbox(.56,.16,.5,c,0,.34,0,.035,true,'stone'),torso,head
    );
    const neck=cyl(.1,.12,.14,c,0,1.31,0,18,true,'stone'); g.add(neck);
    const left=tube([[-.17,1.15,0],[-.33,1.02,.02],[-.25,.77,.1]],.07,c,14,10,'stone'); left.userData.paint=true;
    const right=tube([[.17,1.15,0],[.32,1.3,.02],[.2,1.48,.04]],.07,c,14,10,'stone'); right.userData.paint=true;
    g.add(left,right,ellipsoid(.07,.09,.065,c,-.24,.72,.1,true,'stone',14),ellipsoid(.07,.09,.065,c,.19,1.54,.04,true,'stone',14));
    // Pliegues de la túnica: finas crestas esculpidas, no bloques.
    for(const x of [-.13,-.065,0,.065,.13]) g.add(tube([[x,.55,.11],[x*.85,.78,.14],[x*.65,1.05,.12]],.012,shade(c,-.11),10,6,'stone'));
    return g;
  } },
  carpa: { name: 'Carpa', ico: '⛺', cost: 450, w: 2, d: 2, out: true, build(c = 0xb8443f) {
    const positions=[
      -.95,0,-.85, 0,1.55,-.85, 0,1.55,.85,  -.95,0,-.85, 0,1.55,.85, -.95,0,.85,
       .95,0,-.85, 0,1.55,.85, 0,1.55,-.85,   .95,0,-.85, .95,0,.85, 0,1.55,.85,
      -.95,0,-.85,.95,0,-.85,0,1.55,-.85,
      -.95,0,.85,-.2,0,.85,0,1.55,.85,  .95,0,.85,0,1.55,.85,.2,0,.85
    ];
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geo.computeVertexNormals();
    const shell=new THREE.Mesh(geo,mat(c,{surface:'fabric',side:THREE.DoubleSide,roughness:.9})); shell.castShadow=true; shell.receiveShadow=true; shell.userData.paint=true;
    const g=grp(shell,box(1.78,.025,1.58,0x716553,0,.025,0,false,'fabric'));
    for(const z of [-.9,.9]) g.add(cyl(.024,.024,1.62,DARK,0,.78,z,10,false,'metal'));
    g.add(tube([[0,1.56,-1.05],[0,1.59,0],[0,1.56,1.05]],.014,DARK,18,6,'metal'));
    for(const [x,z] of [[-1.18,-1.05],[1.18,-1.05],[-1.18,1.05],[1.18,1.05]]){
      g.add(tube([[x*.78,.72,z*.82],[x,.03,z]],.008,0xd9c8a5,8,5,'fabric'));
      g.add(cyl(.018,.018,.16,0x6d6458,x,.07,z,7,false,'metal'));
    }
    return g;
  } },
  arco_florido: { name: 'Arco de flores', ico: '🌸', cost: 280, w: 2, d: 1, out: true, build(c = 0xe8d9b5) {
    const g = grp(
      cyl(0.05, 0.05, 1.6, c, -0.85, 0.8, 0, 10, true),
      cyl(0.05, 0.05, 1.6, c, 0.85, 0.8, 0, 10, true)
    );
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 20, Math.PI), mat(c));
    arch.position.set(0, 1.6, 0);
    arch.castShadow = true;
    arch.userData.paint = true;
    g.add(arch);
    const cols = [0xe85d75, 0xf2c94c, 0xa06fc9];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI;
      g.add(sph(0.07, cols[i % 3], Math.cos(a) * 0.85, 1.6 + Math.sin(a) * 0.85, 0));
      g.add(sph(0.05, cols[(i + 1) % 3], Math.cos(a) * 0.95, 1.6 + Math.sin(a) * 0.95, 0.04));
    }
    return g;
  } },
  hongo: { name: 'Hongo gigante', ico: '🍄', cost: 65, w: 1, d: 1, out: true, build(c = 0xe85d35) {
    const stem=lathe([[.14,0],[.18,.05],[.16,.23],[.12,.46],[.16,.55]],0xeee5d3,0,0,0,false,'rough',28);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.42,28,14,0,Math.PI*2,0,Math.PI/2),mat(c,{surface:'fabric',roughness:.75})); cap.scale.y=.55; cap.position.y=.54; cap.castShadow=true; cap.userData.paint=true;
    const g=grp(stem,cap);
    for(const [x,z,s] of [[.13,.18,.045],[-.17,.1,.05],[.04,-.22,.04],[-.24,-.08,.035],[.25,-.04,.032]]){
      const spot=ellipsoid(s,.012,s*.8,0xf6f0df,x,.72-Math.hypot(x,z)*.25,z,false,'rough',12); g.add(spot);
    }
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2; const rib=box(.3,.008,.012,0xd9cdb5,Math.cos(a)*.15,.535,Math.sin(a)*.15); rib.rotation.y=-a; g.add(rib);}
    return g;
  } },
};

const BUILD_ITEMS = {
  // Suelos: todos son celdas independientes y usan un albedo de media/image.
  suelo:             { name: 'Madera', ico: '🟫', cost: 20, kind: 'floor', section: 'Suelos', style: 'wood', color: 0xc9a06a },
  suelo_roble:       { name: 'Roble claro', ico: '🟨', cost: 28, kind: 'floor', section: 'Suelos', style: 'planks', color: 0xd8b579 },
  suelo_baldosa:     { name: 'Baldosa', ico: '🔳', cost: 32, kind: 'floor', section: 'Suelos', style: 'tiles', color: 0xd9d5cc },
  suelo_marmol:      { name: 'Mármol', ico: '⬜', cost: 55, kind: 'floor', section: 'Suelos', style: 'marble', color: 0xeeeae2 },
  suelo_terracota:   { name: 'Terracota', ico: '🟧', cost: 30, kind: 'floor', section: 'Suelos', style: 'terracotta', color: 0xb96543 },
  suelo_parquet:     { name: 'Parqué', ico: '🟫', cost: 42, kind: 'floor', section: 'Suelos', style: 'parquet', color: 0xa8753e },
  suelo_hormigon:    { name: 'Hormigón', ico: '◻️', cost: 24, kind: 'floor', section: 'Suelos', style: 'concrete', color: 0x969a9e },
  suelo_piedra:      { name: 'Piedra natural', ico: '🪨', cost: 38, kind: 'floor', section: 'Suelos', style: 'stone', color: 0x8f969b },
  suelo_grava:       { name: 'Grava', ico: '▫️', cost: 18, kind: 'floor', section: 'Suelos', style: 'gravel', color: 0xa49a8c },
  suelo_pizarra:     { name: 'Pizarra', ico: '⬛', cost: 44, kind: 'floor', section: 'Suelos', style: 'slate', color: 0x626d78 },
  suelo_mosaico:     { name: 'Mosaico hexagonal', ico: '🔶', cost: 48, kind: 'floor', section: 'Suelos', style: 'hex', color: 0xd3b6a0 },

  // Muros y vallas ocupan un borde de la cuadrícula (h: horizontal, v: vertical).
  pared:             { name: 'Pared enlucida', ico: '🧱', cost: 60, kind: 'wall', category: 'wall', section: 'Muros', style: 'plain', color: 0xf5f0e8 },
  muro_piedra:       { name: 'Muro de piedra', ico: '🪨', cost: 95, kind: 'wall', category: 'wall', section: 'Muros', style: 'stone', color: 0x8e969d },
  muro_ladrillo:     { name: 'Muro de ladrillo', ico: '🧱', cost: 85, kind: 'wall', category: 'wall', section: 'Muros', style: 'brick', color: 0xb85f4c },
  muro_hormigon:     { name: 'Muro de hormigón', ico: '◼️', cost: 72, kind: 'wall', category: 'wall', section: 'Muros', style: 'concrete', color: 0x92979c },
  muro_madera:       { name: 'Muro de madera', ico: '🪵', cost: 78, kind: 'wall', category: 'wall', section: 'Muros', style: 'wood', color: 0x9b693d },
  minimuro:          { name: 'Minimuro', ico: '▰', cost: 48, kind: 'wall', category: 'wall', section: 'Muros', style: 'low', color: 0x969da0, height: 1.15 },
  valla:             { name: 'Valla de madera', ico: '🚧', cost: 45, kind: 'wall', category: 'fence', section: 'Vallas', style: 'fence', color: 0xd8b579, height: 1.22 },
  valla_metal:       { name: 'Valla metálica', ico: '⛓️', cost: 70, kind: 'wall', category: 'fence', section: 'Vallas', style: 'metalFence', color: 0x707983, height: 1.35 },

  // Accesos: son piezas de suelo elevadas; R permite orientar la subida.
  escalera:          { name: 'Escalera', ico: '🪜', cost: 90, kind: 'floor', section: 'Accesos', style: 'stairs', color: 0x9b693d, rotatable: true },
  rampa:             { name: 'Rampa', ico: '📐', cost: 85, kind: 'floor', section: 'Accesos', style: 'ramp', color: 0x92979c, rotatable: true },

  puerta:            { name: 'Clásica', ico: '🚪', cost: 150, kind: 'wall', category: 'door', section: 'Puertas', style: 'classic', color: 0xf5f0e8 },
  puerta_moderna:    { name: 'Moderna', ico: '🚪', cost: 230, kind: 'wall', category: 'door', section: 'Puertas', style: 'modern', color: 0xe8e4dc },
  puerta_doble:      { name: 'Doble', ico: '🚪', cost: 290, kind: 'wall', category: 'door', section: 'Puertas', style: 'double', color: 0xf5f0e8 },
  puerta_rustica:    { name: 'Rústica', ico: '🪵', cost: 210, kind: 'wall', category: 'door', section: 'Puertas', style: 'rustic', color: 0xead9bc },
  ventana:           { name: 'Clásica', ico: '🪟', cost: 120, kind: 'wall', category: 'window', section: 'Ventanas', style: 'classic', color: 0xf5f0e8 },
  ventana_doble:     { name: 'Doble', ico: '🪟', cost: 175, kind: 'wall', category: 'window', section: 'Ventanas', style: 'double', color: 0xf5f0e8 },
  ventana_panorama:  { name: 'Panorámica', ico: '🌅', cost: 220, kind: 'wall', category: 'window', section: 'Ventanas', style: 'panorama', color: 0xe8e4dc },
  ventana_industrial:{ name: 'Industrial', ico: '🏭', cost: 195, kind: 'wall', category: 'window', section: 'Ventanas', style: 'industrial', color: 0xe6e0d4 },
  techo:             { name: 'Teja', ico: '🏠', cost: 40, kind: 'roof', section: 'Techos', style: 'tile', color: 0xa8524a },
  techo_moderno:     { name: 'Plano', ico: '⬜', cost: 48, kind: 'roof', section: 'Techos', style: 'flat', color: 0x777d86 },
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
  select: () => { beep(640, 0.05, 'sine', 0.09, 200); },
  hammer: () => { beep(90, 0.22, 'square', 0.2, -50); setTimeout(() => beep(150, 0.09, 'triangle', 0.08, 80), 40); },
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
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

/* ---------------- Texturas procedurales ---------------- */
// Las superficies PBR se construyen a partir de los albedos de /media/image.
// Se mantienen los generadores procedurales como *fallback* cuando una textura
// externa falla (p. ej. si alguien abre la página sin servidor HTTP).
const SURFACES = {};
function texRng(seed) { let s = (seed + 17) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function texCanvas(size, fn) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  fn(ctx, size);
  return c;
}
function mapTexture(canvas, repeat = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.needsUpdate = true;
  return t;
}
function bumpTexture(canvas, repeat = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.needsUpdate = true;
  return t;
}

/* ------- Texturas PBR desde /media/image (sustituyen a las procedurales) ------- */
const IMAGE_SURFACES = [
  // { nombre interno de superficie, fichero, y propiedades PBR }
  { name: 'grass',      file: 'PTP-Foliage_07-512x512.png',  roughness: 0.94, metalness: 0.00, envMapIntensity: 0.55, bumpScale: 0.045 },
  { name: 'wood',       file: 'PTP-Floor_06-512x512.png',    roughness: 0.72, metalness: 0.00, envMapIntensity: 0.70, bumpScale: 0.035 },
  { name: 'planks',     file: 'PTP-Floor_08-512x512.png',    roughness: 0.74, metalness: 0.00, envMapIntensity: 0.65, bumpScale: 0.035 },
  { name: 'tiles',      file: 'PTP-Tile_01-512x512.png',     roughness: 0.62, metalness: 0.00, envMapIntensity: 0.80, bumpScale: 0.030 },
  { name: 'marble',     file: 'PTP-Floor_01-512x512.png',    roughness: 0.35, metalness: 0.00, envMapIntensity: 0.90, bumpScale: 0.018 },
  { name: 'terracotta', file: 'PTP-Floor_04-512x512.png',    roughness: 0.78, metalness: 0.00, envMapIntensity: 0.60, bumpScale: 0.030 },
  { name: 'parquet',    file: 'PTP-Tile_05-512x512.png',     roughness: 0.70, metalness: 0.00, envMapIntensity: 0.68, bumpScale: 0.035 },
  { name: 'concrete',   file: 'PTP-Concrete_01-512x512.png', roughness: 0.90, metalness: 0.00, envMapIntensity: 0.60, bumpScale: 0.045 },
  { name: 'brick',      file: 'PTP-Stone_03-512x512.png',    roughness: 0.86, metalness: 0.00, envMapIntensity: 0.60, bumpScale: 0.035 },
  { name: 'plaster',    file: 'PTP-Concrete_05-512x512.png', roughness: 0.86, metalness: 0.00, envMapIntensity: 0.55, bumpScale: 0.020 },
  { name: 'roofTile',   file: 'PTP-Tile_06-512x512.png',     roughness: 0.76, metalness: 0.00, envMapIntensity: 0.60, bumpScale: 0.028 },
  { name: 'leaves',     file: 'PTP-Foliage_03-512x512.png',  roughness: 0.82, metalness: 0.00, envMapIntensity: 0.55, bumpScale: 0.032 },
  { name: 'fabric',     file: 'PTP-Pattern_01-512x512.png',  roughness: 0.82, metalness: 0.00, envMapIntensity: 0.60, bumpScale: 0.020 },
  { name: 'metal',      file: 'PTP-Metal_01-512x512.png',    roughness: 0.25, metalness: 0.82, envMapIntensity: 1.25, bumpScale: 0.025 },
  { name: 'stone',      file: 'PTP-Stone_01-512x512.png',    roughness: 0.88, metalness: 0.00, envMapIntensity: 0.62, bumpScale: 0.040 },
  { name: 'bark',       file: 'PTP-Ground_10-512x512.png',   roughness: 0.90, metalness: 0.00, envMapIntensity: 0.45, bumpScale: 0.040 },
  { name: 'clay',       file: 'PTP-Ground_04-512x512.png',   roughness: 0.82, metalness: 0.00, envMapIntensity: 0.58, bumpScale: 0.035 },
  { name: 'water',      file: 'PTP-Elements_01-512x512.png', roughness: 0.10, metalness: 0.00, envMapIntensity: 1.45, bumpScale: 0.020 },
  { name: 'rough',      file: 'PTP-Ground_01-512x512.png',   roughness: 0.84, metalness: 0.00, envMapIntensity: 0.55, bumpScale: 0.045 },
  // Variantes para las nuevas piezas de construcción. Cada una apunta a un
  // albedo distinto de media/image para que los acabados no sean clones.
  { name: 'woodDark',    file: 'PTP-Floor_02-512x512.png',       roughness: 0.78, metalness: 0.00, envMapIntensity: 0.62, bumpScale: 0.040 },
  { name: 'floorStone',  file: 'PTP-Stone_06-512x512.png',       roughness: 0.89, metalness: 0.00, envMapIntensity: 0.58, bumpScale: 0.048 },
  { name: 'floorGravel', file: 'PTP-Ground_06-512x512.png',      roughness: 0.96, metalness: 0.00, envMapIntensity: 0.45, bumpScale: 0.060 },
  { name: 'floorSlate',  file: 'PTP-Stone_09-512x512.png',       roughness: 0.82, metalness: 0.00, envMapIntensity: 0.65, bumpScale: 0.045 },
  { name: 'floorHex',    file: 'PTP-Tile_07-512x512.png',        roughness: 0.60, metalness: 0.00, envMapIntensity: 0.78, bumpScale: 0.030 },
  { name: 'wallStone',   file: 'PTP-Stone_07-512x512.png',       roughness: 0.91, metalness: 0.00, envMapIntensity: 0.55, bumpScale: 0.052 },
  { name: 'wallBrick',   file: 'PTP-Stone_05-512x512.png',       roughness: 0.87, metalness: 0.00, envMapIntensity: 0.58, bumpScale: 0.042 },
  { name: 'wallConcrete',file: 'PTP-Concrete_03-512x512.png',   roughness: 0.92, metalness: 0.00, envMapIntensity: 0.52, bumpScale: 0.050 },
  { name: 'wallWood',    file: 'PTP-Floor_03-512x512.png',       roughness: 0.75, metalness: 0.00, envMapIntensity: 0.64, bumpScale: 0.038 },
  { name: 'fenceWood',   file: 'PTP-Floor_05-512x512.png',       roughness: 0.79, metalness: 0.00, envMapIntensity: 0.60, bumpScale: 0.040 },
];

function loadTexture(url, colorSpace = THREE.SRGBColorSpace) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, t => {
      t.colorSpace = colorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      resolve(t);
    }, undefined, reject);
  });
}

function luminanceCanvas(image, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size);
  const d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    d[i] = d[i + 1] = d[i + 2] = l;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

async function loadImageSurface(spec) {
  try {
    const map = await loadTexture(TEXTURE_ROOT + spec.file);
    const bump = bumpTexture(luminanceCanvas(map.image), 1);
    const roughness = spec.roughness ?? 0.85;
    const metalness = spec.metalness ?? 0.0;
    const envMapIntensity = spec.envMapIntensity ?? 0.7;
    const bumpScale = spec.bumpScale ?? 0.05;
    defineSurface(spec.name, { map, bump, roughness, metalness, envMapIntensity, bumpScale });
  } catch (err) {
    console.warn(`No se pudo cargar la textura ${spec.file}; se mantiene la superficie procedural.`, err);
  }
}

async function loadImageSurfaces() {
  await Promise.all(IMAGE_SURFACES.map(loadImageSurface));
}

function defineSurface(name, cfg) { SURFACES[name] = cfg; }
function makeSurface(name, seed, draw, opts = {}) {
  const color = texCanvas(256, (c, s) => draw(c, s, texRng(seed), false));
  const bump = texCanvas(256, (c, s) => draw(c, s, texRng(seed + 7), true));
  const map = mapTexture(color);
  const bmp = bumpTexture(bump);
  defineSurface(name, {
    map, bump: bmp,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.0,
    envMapIntensity: opts.envMapIntensity ?? 0.7,
    bumpScale: opts.bumpScale ?? 0.05
  });
}
function drawNoise(ctx, s, rnd, amt, baseA = 0.16) {
  for (let i = 0; i < 900; i++) {
    const x = rnd() * s, y = rnd() * s, r = rnd() * 2 + 0.4;
    ctx.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${(rnd() * amt).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}
function drawSpeckle(ctx, s, rnd, colors, amt = 0.3) {
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.globalAlpha = amt * (0.3 + rnd() * 0.7);
    ctx.beginPath(); ctx.arc(rnd() * s, rnd() * s, rnd() * 1.7 + 0.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

makeSurface('grass', 1, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#8b8b8b' : '#5f9b4e';
  ctx.fillRect(0, 0, s, s);
  const cols = bump ? ['#777','#999'] : ['#4f8c43','#6aa95a','#57914b','#77b264'];
  for (let i = 0; i < 700; i++) {
    const x = rnd() * s, y = rnd() * s, l = 3 + rnd() * 7;
    ctx.strokeStyle = cols[Math.floor(rnd() * cols.length)];
    ctx.lineWidth = bump ? 0.8 : (0.7 + rnd() * 0.7);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rnd() - 0.5) * 2, y - l * 0.6, x + (rnd() - 0.5) * 3, y - l);
    ctx.stroke();
  }
});
makeSurface('wood', 2, (ctx, s, rnd, bump) => {
  const base = bump ? '#8a8a8a' : '#8b5a2b';
  ctx.fillStyle = base; ctx.fillRect(0, 0, s, s);
  const rows = 4, h = s / rows;
  for (let r = 0; r < rows; r++) {
    const tone = bump ? (0.5 + rnd() * 0.14) : (0.78 + rnd() * 0.2);
    ctx.fillStyle = bump ? `rgb(${tone * 255|0},${tone * 255|0},${tone * 255|0})` : hsl(`hsl(${28 + rnd() * 8},${45 + rnd() * 10}%,${30 + rnd() * 12}%)`);
    ctx.fillRect(0, r * h, s, h);
    for (let g = 0; g < 22; g++) {
      ctx.strokeStyle = bump ? 'rgba(50,50,50,0.4)' : 'rgba(40,22,8,0.28)';
      ctx.lineWidth = 0.6 + rnd() * 0.7; ctx.beginPath();
      const y = r * h + rnd() * h;
      ctx.moveTo(s, y); ctx.bezierCurveTo(s * 0.66, y + (rnd() - 0.5) * 5, s * 0.33, y + (rnd() - 0.5) * 5, 0, y + (rnd() - 0.5) * 4); ctx.stroke();
    }
    ctx.fillStyle = bump ? 'rgba(30,30,30,0.5)' : 'rgba(30,18,6,0.5)';
    ctx.fillRect(0, r * h + h - 2, s, 2);
    const seam = (rnd() * 0.7 + 0.15) * s;
    ctx.fillRect(seam, r * h, 2, h);
  }
});
makeSurface('planks', 3, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#8f8f8f' : '#d8b579'; ctx.fillRect(0, 0, s, s);
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const shade = 0.82 + rnd() * 0.28;
    ctx.fillStyle = bump ? `rgba(${shade * 225|0},${shade * 225|0},${shade * 225|0},1)` : `rgba(${218 * shade|0},${181 * shade|0},${121 * shade|0},1)`;
    ctx.fillRect(0, r * (s / rows), s, s / rows);
    ctx.fillStyle = bump ? 'rgba(64,64,64,0.62)' : 'rgba(120,82,38,0.55)';
    ctx.fillRect(0, r * (s / rows), s, 2);
    ctx.fillStyle = bump ? 'rgba(64,64,64,0.45)' : 'rgba(120,82,38,0.35)';
    ctx.fillRect(rnd() * s * 0.7, r * (s / rows), 2, s / rows);
  }
  drawNoise(ctx, s, rnd, 0.08);
});
makeSurface('tiles', 4, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#7e7e7e' : '#b8b3a9'; ctx.fillRect(0, 0, s, s);
  const n = 4, g = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const tone = bump ? 0.76 + rnd() * 0.18 : 0.86 + rnd() * 0.14;
    ctx.fillStyle = bump ? `rgb(${tone * 240|0},${tone * 240|0},${tone * 240|0})` : `rgb(${225*tone|0},${220*tone|0},${212*tone|0})`;
    ctx.fillRect(i * g + 1.5, j * g + 1.5, g - 3, g - 3);
    ctx.fillStyle = bump ? 'rgba(70,70,70,0.65)' : 'rgba(150,145,137,0.8)';
    ctx.fillRect(i * g, j * g, g, 1.6); ctx.fillRect(i * g, j * g, 1.6, g);
  }
  drawSpeckle(ctx, s, rnd, bump ? ['#666','#999'] : ['#cfcac1','#b0aba1'], 0.16);
});
makeSurface('marble', 5, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#d8d8d8' : '#eeeae2'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 12; i++) {
    const cx = rnd() * s, cy = rnd() * s;
    ctx.strokeStyle = bump ? `rgba(40,40,40,${0.22 + rnd() * 0.2})` : `rgba(160,160,168,${0.16 + rnd() * 0.22})`;
    ctx.lineWidth = 0.5 + rnd() * 1.6;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.bezierCurveTo(cx + (rnd() - 0.5) * 100, cy + (rnd() - 0.5) * 100, cx + (rnd() - 0.5) * 100, cy + (rnd() - 0.5) * 100, rnd() * s, rnd() * s);
    ctx.stroke();
  }
  drawSpeckle(ctx, s, rnd, bump ? ['#eee','#aaa'] : ['#ffffff','#dedad1'], 0.12);
});
makeSurface('terracotta', 6, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#7f7f7f' : '#b96543'; ctx.fillRect(0, 0, s, s);
  const n = 3, g = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const tone = 0.86 + rnd() * 0.24;
    ctx.fillStyle = bump ? `rgb(${tone*215|0},${tone*215|0},${tone*215|0})` : `rgb(${185*tone|0},${101*tone|0},${67*tone|0})`;
    ctx.fillRect(i * g + 1.5, j * g + 1.5, g - 3, g - 3);
    ctx.fillStyle = bump ? 'rgba(60,60,60,0.6)' : 'rgba(96,48,36,0.7)';
    ctx.fillRect(i * g, j * g, g, 2); ctx.fillRect(i * g, j * g, 2, g);
  }
  drawSpeckle(ctx, s, rnd, bump ? ['#777','#999'] : ['#cf7e5b','#a2523b'], 0.16);
});
makeSurface('parquet', 7, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#8d8d8d' : '#a8753e'; ctx.fillRect(0, 0, s, s);
  const rows = 6;
  for (let r = 0; r < rows; r++) for (let k = 0; k < 6; k++) {
    const tone = 0.9 + rnd() * 0.2;
    ctx.save(); ctx.translate(k * (s / 6) + (r % 2 ? s / 12 : 0), r * (s / rows));
    ctx.rotate(r % 2 ? Math.PI / 4 : -Math.PI / 4);
    ctx.fillStyle = bump ? `rgb(${tone*220|0},${tone*220|0},${tone*220|0})` : `rgb(${168*tone|0},${117*tone|0},${62*tone|0})`;
    ctx.fillRect(-s / 8, -s / rows * 0.7, s / 4, s / rows * 1.3);
    ctx.restore();
  }
  drawNoise(ctx, s, rnd, 0.05);
});
makeSurface('concrete', 8, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#888888' : '#969a9e'; ctx.fillRect(0, 0, s, s);
  drawSpeckle(ctx, s, rnd, bump ? ['#5e5e5e','#adadad'] : ['#7d828a', '#aeb2b6', '#878c91'], 0.28);
  ctx.strokeStyle = bump ? 'rgba(35,35,35,0.28)' : 'rgba(60,64,70,0.24)';
  for (let i = 0; i < 8; i++) {
    ctx.lineWidth = 0.5 + rnd(); ctx.beginPath();
    let x = rnd() * s, y = rnd() * s; ctx.moveTo(x, y);
    for (let j = 0; j < 3; j++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; ctx.lineTo(x, y); }
    ctx.stroke();
  }
});
makeSurface('brick', 9, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#6e6e6e' : '#c8c0b2'; ctx.fillRect(0, 0, s, s);
  const rows = 6, h = s / rows, bw = s / 3;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw * 0.5;
    for (let i = -1; i < 3; i++) {
      const x = i * bw + off, tone = 0.84 + rnd() * 0.26;
      ctx.fillStyle = bump ? `rgb(${tone*230|0},${tone*230|0},${tone*230|0})` : `rgb(${190*tone|0},${92*tone|0},${72*tone|0})`;
      ctx.fillRect(x + 2, r * h + 2, bw - 4, h - 4);
    }
  }
  ctx.strokeStyle = '#f3efe6'; ctx.lineWidth = 2;
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * h); ctx.lineTo(s, r * h); ctx.stroke(); }
  drawSpeckle(ctx, s, rnd, bump ? ['#555','#aaa'] : ['#c76f57','#a85247'], 0.2);
});
makeSurface('plaster', 10, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#ababab' : '#f3eee6'; ctx.fillRect(0, 0, s, s);
  drawSpeckle(ctx, s, rnd, bump ? ['#ddd','#888'] : ['#efe9de','#e1d8ca','#f7f3ec'], 0.22);
  drawNoise(ctx, s, rnd, 0.07);
});
makeSurface('roofTile', 11, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#7c7c7c' : '#a8524a'; ctx.fillRect(0, 0, s, s);
  const rows = 8, rw = 8;
  for (let r = 0; r < rows; r++) for (let i = 0; i < rw; i++) {
    const tone = 0.86 + rnd() * 0.24;
    const x = i * (s / rw), y = r * (s / rows);
    ctx.fillStyle = bump ? `rgb(${tone*210|0},${tone*210|0},${tone*210|0})` : `rgb(${168*tone|0},${82*tone|0},${74*tone|0})`;
    ctx.beginPath(); ctx.arc(x + s / rw / 2, y + s / rows / 2, s / rw / 2 - 1, 0, Math.PI); ctx.fill();
  }
});
makeSurface('leaves', 12, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#858585' : '#3f7d4a'; ctx.fillRect(0, 0, s, s);
  const cols = bump ? ['#6d6d6d','#a3a3a3'] : ['#2f6b3a','#4c9159','#356f40','#5aa266'];
  for (let i = 0; i < 500; i++) {
    const x = rnd() * s, y = rnd() * s, a = rnd() * Math.PI * 2;
    ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
    ctx.globalAlpha = 0.35 + rnd() * 0.45;
    ctx.beginPath(); ctx.ellipse(x, y, 1 + rnd() * 2.5, 0.6 + rnd() * 1.4, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 22; i++) {
    const x = rnd() * s, y = rnd() * s;
    ctx.strokeStyle = bump ? 'rgba(50,50,50,0.4)' : 'rgba(20,50,24,0.28)';
    ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.stroke();
  }
});
makeSurface('fabric', 13, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#919191' : '#b8443f'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = bump ? 'rgba(70,70,70,0.25)' : 'rgba(255,255,255,0.08)';
  for (let i = 0; i < s; i += 4) ctx.fillRect(i, 0, 1, s);
  ctx.fillStyle = bump ? 'rgba(140,140,140,0.2)' : 'rgba(0,0,0,0.06)';
  for (let i = 0; i < s; i += 4) ctx.fillRect(0, i, s, 1);
  drawNoise(ctx, s, rnd, 0.06);
});
makeSurface('metal', 14, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#909090' : '#b9bec7'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < s; i += 3) {
    ctx.fillStyle = bump ? (i % 6 ? 'rgba(80,80,80,0.35)' : 'rgba(200,200,200,0.35)') : (i % 6 ? 'rgba(70,76,88,0.12)' : 'rgba(255,255,255,0.2)');
    ctx.fillRect(0, i, s, 1);
  }
}, { roughness: 0.22, metalness: 0.82, envMapIntensity: 1.25, bumpScale: 0.03 });
makeSurface('stone', 15, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#858585' : '#8a8f98'; ctx.fillRect(0, 0, s, s);
  drawSpeckle(ctx, s, rnd, bump ? ['#5d5d5d','#ababab'] : ['#6f747c','#a4a9b2','#7d828b'], 0.3);
  drawNoise(ctx, s, rnd, 0.08);
});
makeSurface('bark', 16, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#7c7c7c' : '#6b4423'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * s;
    ctx.strokeStyle = bump ? (i % 2 ? 'rgba(60,60,60,0.5)' : 'rgba(150,150,150,0.4)') : (i % 2 ? 'rgba(30,16,5,0.4)' : 'rgba(120,80,38,0.35)');
    ctx.lineWidth = 0.8 + rnd() * 1.8;

    ctx.beginPath(); ctx.moveTo(x, s);
    ctx.bezierCurveTo(x + (rnd() - 0.5) * 8, s * 0.66, x + (rnd() - 0.5) * 8, s * 0.33, x + (rnd() - 0.5) * 6, 0);
    ctx.stroke();
  }
});
makeSurface('clay', 17, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#8e8e8e' : '#c96f4a'; ctx.fillRect(0, 0, s, s);
  drawSpeckle(ctx, s, rnd, bump ? ['#777','#aaa'] : ['#d98762','#b55f3f','#e0a080'], 0.2);
  drawNoise(ctx, s, rnd, 0.05);
});
makeSurface('water', 18, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#d0d0d0' : '#67b8d4'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * s, y = rnd() * s, r = 3 + rnd() * 12;
    ctx.strokeStyle = bump ? `rgba(40,40,40,${0.15 + rnd() * 0.2})` : `rgba(255,255,255,${0.12 + rnd() * 0.18})`;
    ctx.lineWidth = 1 + rnd() * 1.4;
    ctx.beginPath(); ctx.arc(x, y, r, rnd() * Math.PI, rnd() * Math.PI + Math.PI * (1 + rnd())); ctx.stroke();
  }
}, { roughness: 0.06, envMapIntensity: 1.55, bumpScale: 0.04 });
makeSurface('rough', 19, (ctx, s, rnd, bump) => {
  ctx.fillStyle = bump ? '#8a8a8a' : '#9a9a9a'; ctx.fillRect(0, 0, s, s);
  drawNoise(ctx, s, rnd, bump ? 0.18 : 0.09);
}, { roughness: 0.72 });
function hsl(v) { return v; }

// Si una textura nueva no está disponible (por ejemplo, en una copia parcial
// del proyecto), la pieza conserva un PBR válido en lugar de quedarse negra.
const SURFACE_FALLBACKS = {
  woodDark: 'wood', floorStone: 'stone', floorGravel: 'rough',
  floorSlate: 'stone', floorHex: 'tiles', wallStone: 'stone',
  wallBrick: 'brick', wallConcrete: 'concrete', wallWood: 'wood',
  fenceWood: 'wood',
};
for (const [name, fallback] of Object.entries(SURFACE_FALLBACKS)) {
  defineSurface(name, { ...SURFACES[fallback] });
}

/* ---------------- Biblioteca de modelos pulidos ----------------
   Los GLB de interior proceden del Furniture Kit de Kenney (CC0) y
   la vegetación FBX del Ultimate Stylized Nature Pack de Quaternius
   (CC0). Todo se sirve en local: el juego sigue funcionando en Pages
   y no depende de una CDN ni de conexiones durante la partida.
   -------------------------------------------------------------- */
const MODEL_ROOT = 'assets/models/';
const PREMIUM_ASSETS = {
  // Interior: modelos con siluetas y proporciones completas.
  cama:             { file: 'furniture/bedSingle.glb', format: 'gltf', fit: [.94, .78, 1.9], paint: /carpet(?!white)|cover/i },
  sofa:             { file: 'furniture/loungeDesignSofa.glb', format: 'gltf', fit: [1.86, .92, .86], paint: /carpet|fabric/i },
  mesa:             { file: 'furniture/table.glb', format: 'gltf', fit: [1.82, .79, .98], paint: /wood/i },
  silla:            { file: 'furniture/chairModernFrameCushion.glb', format: 'gltf', fit: [.62, 1.0, .62], paint: /carpet|fabric/i },
  lampara:          { file: 'furniture/lampRoundFloor.glb', format: 'gltf', fit: [.58, 1.62, .58], paint: /lamp/i },
  tv:               { file: 'furniture/cabinetTelevision.glb', format: 'gltf', fit: [.96, .92, .48], paint: /wood/i, addScreen: true },
  nevera:           { file: 'furniture/kitchenFridgeLarge.glb', format: 'gltf', fit: [1.0, 1.84, .82], paint: /metallight/i },
  cocina:           { file: 'furniture/kitchenStove.glb', format: 'gltf', fit: [.94, .96, .86], paint: /wood|carpetwhite/i, addSteam: true },
  inodoro:          { file: 'furniture/toilet.glb', format: 'gltf', fit: [.68, .82, .82], paint: /carpetwhite|metallight/i },
  banera:           { file: 'furniture/bathtub.glb', format: 'gltf', fit: [1.82, .7, .86], paint: /carpetwhite/i },
  estanteria:       { file: 'furniture/bookcaseOpen.glb', format: 'gltf', fit: [.9, 1.82, .52], paint: /wood/i, addBooks: true },
  alfombra:         { file: 'furniture/rugRounded.glb', format: 'gltf', fit: [1.86, .025, 1.86], paint: /carpet/i, nonUniform: true },
  planta_interior:  { file: 'furniture/pottedPlant.glb', format: 'gltf', fit: [.66, 1.18, .66], paint: /wood/i },
  espejo:           { file: 'furniture/bathroomMirror.glb', format: 'gltf', fit: [.84, 1.62, .12], paint: /wood/i, nonUniform: true },
  puff:             { file: 'furniture/loungeSofaOttoman.glb', format: 'gltf', fit: [.78, .5, .78], paint: /carpet/i },
  mesa_centro:      { file: 'furniture/tableCoffeeGlass.glb', format: 'gltf', fit: [1.56, .52, .9], paint: /metal/i },
  peluche:          { file: 'furniture/bear.glb', format: 'gltf', fit: [.5, .72, .44], paint: /fur/i },
  lampara_mesa:     { file: 'furniture/lampRoundTable.glb', format: 'gltf', fit: [.48, .64, .48], paint: /lamp/i },
  banco_jardin:     { file: 'furniture/bench.glb', format: 'gltf', fit: [1.82, .98, .72], paint: /wood/i, nonUniform: true },

  // Exterior: cada especie usa una malla botánica distinta.
  arbol:    { file: 'nature/NormalTree_1.fbx', format: 'fbx', fit: [2.4, 3.7, 2.4], nature: { leaf: 0x3d824c, bark: 0x604126 } },
  cerezo:   { file: 'nature/NormalTree_2.fbx', format: 'fbx', fit: [2.35, 3.55, 2.35], nature: { leaf: 0xf39abe, leaf2: 0xffbad2, bark: 0x5b3b32 } },
  arce:     { file: 'nature/MapleTree_2.fbx', format: 'fbx', fit: [3.5, 3.5, 3.5], nature: { leaf: 0xd85b32, leaf2: 0xf08a3f, bark: 0x5c4130 } },
  abedul:   { file: 'nature/BirchTree_4.fbx', format: 'fbx', fit: [2.4, 3.85, 2.4], nature: { leaf: 0x64a85c, leaf2: 0x8cbe67, bark: 0xe5dfd2 } },
  manzano:  { file: 'nature/NormalTree_3.fbx', format: 'fbx', fit: [3.2, 3.5, 2.5], nature: { leaf: 0x3c7c46, leaf2: 0x5e9b55, bark: 0x654329 }, addApples: true },
  sauce:    { file: 'nature/NormalTree_4.fbx', format: 'fbx', fit: [3.6, 3.45, 2.5], nature: { leaf: 0x5c9550, leaf2: 0x7aae61, bark: 0x63472f } },
  pino:     { file: 'nature/PineTree_2.fbx', format: 'fbx', fit: [2.15, 4.0, 2.15], nature: { leaf: 0x285e3e, leaf2: 0x397b4c, bark: 0x553923 } },
  palmera:  { file: 'nature/PalmTree_2.fbx', format: 'fbx', fit: [3.9, 3.7, 3.9], nature: { leaf: 0x3e8a4e, leaf2: 0x64a95b, bark: 0x92704a }, addCoconuts: true },
  seto:     { file: 'nature/Bush_Large.fbx', format: 'fbx', fit: [.94, .72, 1.0], nature: { leaf: 0x347742, leaf2: 0x519153, bark: 0x58412d } },
  rosal:    { file: 'nature/Bush_Flowers.fbx', format: 'fbx', fit: [.9, .76, .9], nature: { leaf: 0x347742, flower: 0xe75572, bark: 0x58412d } },
  hortensia:{ file: 'nature/Bush_Flowers.fbx', format: 'fbx', fit: [.9, .82, .9], nature: { leaf: 0x3d8049, flower: 0x91aee0, bark: 0x58412d } },
  helecho:  { file: 'nature/Plant_1.fbx', format: 'fbx', fit: [.88, .72, .88], nature: { leaf: 0x3d824c, leaf2: 0x65a65a, bark: 0x58412d } },
  flores:   { file: 'nature/Flower_1_Clump.fbx', format: 'fbx', fit: [.68, .78, .68], nature: { leaf: 0x43824b, flower: 0xe96783, bark: 0x58412d } },
  margaritas:{ file: 'nature/Flower_1_Clump.fbx', format: 'fbx', fit: [.66, .72, .66], nature: { leaf: 0x43824b, flower: 0xf5f0e8, bark: 0x58412d }, addFlowerCenters: true },
};

const premiumTemplates = new Map();
const missingTexturePixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL+WQAAAABJRU5ErkJggg==';

function setLoaderMessage(text) {
  const el = document.getElementById('loader-status');
  if (el) el.textContent = text;
}

async function preloadPremiumAssets() {
  const specs = [...new Map(Object.values(PREMIUM_ASSETS).map(s => [s.file, s])).values()];
  const manager = new THREE.LoadingManager();
  // Los FBX conservan referencias a texturas fuente enormes. Aquí las sustituimos
  // por un píxel y aplicamos nuestros materiales PBR ligeros después de cargar.
  manager.setURLModifier(url => /\.(png|jpe?g|tga|bmp)$/i.test(url) ? missingTexturePixel : url);
  const gltf = new GLTFLoader(manager);
  const fbx = new FBXLoader(manager);
  let done = 0;
  await Promise.all(specs.map(spec => new Promise(resolve => {
    const url = MODEL_ROOT + spec.file;
    const loaded = value => {
      premiumTemplates.set(spec.file, spec.format === 'gltf' ? value.scene : value);
      done++;
      setLoaderMessage(`Preparando modelos de alta calidad… ${done}/${specs.length}`);
      resolve();
    };
    const failed = err => {
      console.warn(`No se pudo cargar ${url}; se usará el modelo procedural.`, err);
      done++;
      resolve();
    };
    (spec.format === 'gltf' ? gltf : fbx).load(url, loaded, undefined, failed);
  })));
}

function materialRole(source, spec) {
  const name = (source?.name || '').toLowerCase();
  if (/glass|mirror/.test(name)) return 'glass';
  if (/lamp|light/.test(name)) return 'lamp';
  if (/metal/.test(name)) return 'metal';
  if (/carpet|fabric|fur|cloth|cover|pillow/.test(name)) return 'fabric';
  if (/wood/.test(name)) return 'wood';
  if (/flower|petal|blossom/.test(name)) return 'flower';
  if (/leaf|leaves|plant|foliage|needle/.test(name)) return 'leaf';
  if (/bark|trunk|branch|stem/.test(name)) return 'bark';
  if (spec.nature && source?.color) {
    const { r, g, b } = source.color;
    if (g > r * 1.08 && g > b * 1.05) return 'leaf';
    if (r > g * 1.2 && (b > g * .75 || r > .65)) return 'flower';
    return 'bark';
  }
  return 'default';
}

function premiumMaterial(source, spec, customColor, index = 0) {
  const role = materialRole(source, spec);
  const sourceColor = source?.color?.getHex?.() ?? 0xd8d4cb;
  let color = sourceColor;
  if (spec.nature) {
    if (role === 'leaf') color = index % 2 && spec.nature.leaf2 ? spec.nature.leaf2 : spec.nature.leaf;
    else if (role === 'flower') color = spec.nature.flower ?? spec.nature.leaf2 ?? spec.nature.leaf;
    else color = spec.nature.bark;
  }
  if (customColor != null && (spec.paint?.test(source?.name || '') || (spec.nature && role === 'leaf'))) color = customColor;

  if (role === 'glass') {
    return new THREE.MeshPhysicalMaterial({
      name: source?.name || 'glass', color: 0xb9dce6, transparent: true, opacity: .38,
      transmission: .12, thickness: .025, roughness: .06, metalness: 0,
      envMapIntensity: 1.7, depthWrite: false, side: THREE.DoubleSide
    });
  }

  const surface = role === 'wood' || role === 'bark' ? (role === 'bark' ? 'bark' : 'wood')
    : role === 'leaf' ? 'leaves' : role === 'fabric' || role === 'flower' ? 'fabric'
      : role === 'metal' ? 'metal' : 'rough';
  const s = SURFACES[surface] || SURFACES.rough;
  const isMetal = role === 'metal';
  const isLamp = role === 'lamp';
  return new THREE.MeshStandardMaterial({
    name: source?.name || role,
    color,
    roughness: isMetal ? .24 : isLamp ? .36 : role === 'fabric' ? .82 : role === 'leaf' ? .78 : .6,
    metalness: isMetal ? .78 : .02,
    map: s.map,
    bumpMap: s.bump,
    bumpScale: role === 'fabric' ? .018 : role === 'leaf' ? .025 : .035,
    envMapIntensity: isMetal ? 1.35 : isLamp ? 1.15 : .72,
    emissive: isLamp ? 0xffd58a : 0x000000,
    emissiveIntensity: isLamp ? .28 : 0,
    side: role === 'leaf' || role === 'flower' ? THREE.DoubleSide : THREE.FrontSide,
  });
}

function addPremiumDetails(id, root) {
  const spec = PREMIUM_ASSETS[id];
  if (spec.addScreen) {
    root.add(rbox(.78, .46, .045, 0x111820, 0, .78, .17, .018, false, 'rough'));
    const screen = rbox(.7, .38, .012, 0x223d54, 0, .78, .197, .008);
    screen.material = new THREE.MeshPhysicalMaterial({ color: 0x294d68, roughness: .08, metalness: .18, envMapIntensity: 1.6 });
    root.add(screen);
  }
  if (spec.addBooks) {
    const colors = [0x8f3f3c, 0x365f88, 0x4d7652, 0xc18a35, 0x6c4e87];
    for (let shelf = 0; shelf < 4; shelf++) for (let i = 0; i < 5; i++) {
      const h = .2 + ((i * 7 + shelf) % 3) * .035;
      root.add(rbox(.075, h, .19, colors[(i + shelf * 2) % colors.length], -.31 + i * .15, .3 + shelf * .39, .1, .012));
    }
  }
  if (spec.addSteam) {
    for (let i = 0; i < 3; i++) {
      const steam = new THREE.Mesh(new THREE.SphereGeometry(.052, 12, 9), new THREE.MeshStandardMaterial({ color: 0xf5f7fa, transparent: true, opacity: .38, depthWrite: false, roughness: .15 }));
      steam.position.set(-.2, 1.07, -.06);
      steam.userData.anim = 'steam';
      steam.castShadow = false;
      root.add(steam);
    }
  }
  if (spec.addApples) {
    for (const [x, y, z] of [[-.55,2.35,.35],[.48,2.55,-.22],[.7,2.1,.3],[-.3,2.8,-.35],[.12,2.15,-.55]]) {
      root.add(sph(.105, 0xc9342f, x, y, z, false, 'fabric'));
      root.add(cyl(.012,.016,.08,0x4a3522,x,y+.08,z,7));
    }
  }
  if (spec.addCoconuts) {
    for (const [x, z] of [[-.14,.08],[.12,.13],[.04,-.14]]) root.add(sph(.13, 0x715133, x, 3.45, z, false, 'clay'));
  }
  if (spec.addFlowerCenters) {
    for (const [x,z] of [[-.22,-.18],[.18,-.14],[-.12,.2],[.25,.18]]) root.add(sph(.035,0xe9b526,x,.52,z,false,'fabric'));
  }
}

function instantiatePremium(id, customColor) {
  const spec = PREMIUM_ASSETS[id];
  const source = spec && premiumTemplates.get(spec.file);
  if (!source) return null;
  const model = source.clone(true);
  // Los FBX de Quaternius están modelados en Z-up. Three usa Y-up.
  model.rotation.x = spec.format === 'fbx' ? -Math.PI / 2 : 0;
  model.rotation.y = spec.yaw || 0;
  let materialIndex = 0;
  model.traverse(node => {
    if (!node.isMesh) return;
    node.geometry = node.geometry.clone();
    if (!node.geometry.attributes.normal) node.geometry.computeVertexNormals();
    const list = Array.isArray(node.material) ? node.material : [node.material];
    const polished = list.map(m => premiumMaterial(m, spec, customColor, materialIndex++));
    node.material = Array.isArray(node.material) ? polished : polished[0];
    node.castShadow = true;
    node.receiveShadow = true;
    node.userData.paint = polished.some(m => customColor != null || spec.paint?.test(m.name || ''));
  });

  model.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const ratios = spec.fit.map((n, i) => n / Math.max([size.x, size.y, size.z][i], .0001));
  if (spec.nonUniform) model.scale.multiply(new THREE.Vector3(...ratios));
  else model.scale.multiplyScalar(Math.min(...ratios));
  model.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= bounds.min.y;

  const content = grp(model);
  const root = grp(content);
  addPremiumDetails(id, content);
  const def = FURNITURE[id];
  // La raíz recibe después los datos de picking. Un contenedor intermedio anima
  // el conjunto sin sobrescribir la corrección Z-up propia de los FBX.
  if (def?.anim === 'sway' || def?.anim === 'bob') content.userData.anim = def.anim;
  return root;
}

function buildCatalogObject(id, customColor) {
  return instantiatePremium(id, customColor) || FURNITURE[id].build(customColor);
}

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfd9ea, 60, 160);

/* Iluminación ambiental (reflejos suaves estilo videojuego) */
const pmrem = new THREE.PMREMGenerator(renderer);
{
  const envScene = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), new THREE.MeshBasicMaterial({ color: 0xb9dcf5, side: THREE.BackSide }));
  envScene.add(sky);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(4.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff2c9 }));
  sunBall.position.set(22, 32, 12); envScene.add(sunBall);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe6ad, transparent: true, opacity: 0.5 }));
  glow.position.set(22, 32, 12); envScene.add(glow);
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(46, 24), new THREE.MeshBasicMaterial({ color: 0x557a45 }));
  envGround.rotation.x = -Math.PI / 2; envGround.position.y = -5; envScene.add(envGround);
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
}

/* ---------------- Cielo: ciclo panorámico/cubemap ---------------- */
// Ciclo de cielos usando los ficheros de /media/image/Sky.
// Alterna panoramas equirectangulares (2:1) y atlas cubemap (3x4) y hace
// crossfade entre ellos para no interrumpir visualmente la escena.
const SKY_SOURCES = [];
for (let i = 1; i <= 25; i++) {
  const n = String(i).padStart(2, '0');
  SKY_SOURCES.push({ type: 'panorama', file: `Panorama_Sky_${n}-512x512.png` });
  SKY_SOURCES.push({ type: 'cubemap', file: `Cubemap_Sky_${n}-512x512.png` });
}
const SKY_DURATION = 20;      // segundos visibles por cielo
const SKY_FADE = 2.0;         // segundos de fundido
const skyGroup = new THREE.Group();
skyGroup.renderOrder = -1000;
scene.add(skyGroup);
// No añadimos una esfera azul de respaldo: era la cúpula que quedaba visible
// cuando el cielo real tardaba en cargar. El color de `scene.background` es un
// fallback plano y no puede crear una geometría residual en la parcela.
const skyState = {
  currentIndex: 0,
  currentMesh: null,
  nextMesh: null,
  timer: 0,
  fade: 0,
  loading: false,
};

function cubemapFaces(images, faceSize = 512) {
  const positions = [
    [2, 1], // +X (derecha)
    [0, 1], // -X (izquierda)
    [1, 0], // +Y (arriba)
    [1, 2], // -Y (abajo)
    [1, 1], // +Z (frente)
    [3, 1], // -Z (espalda)
  ];
  return positions.map(([col, row]) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = faceSize;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(images, col * faceSize, row * faceSize, faceSize, faceSize, 0, 0, faceSize, faceSize);
    return canvas;
  });
}

function cubeFromAtlas(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, texture => {
      const image = texture.image;
      const faceSize = Math.round((image.image ? image.image.width : image.width) / 4);
      const faces = cubemapFaces(image, faceSize);
      // El atlas solo sirve como fuente para los seis canvas; no lo dejamos
      // ocupando otra textura GPU además del cubemap final.
      texture.dispose();
      const cube = new THREE.CubeTexture(faces);
      cube.colorSpace = THREE.SRGBColorSpace;
      cube.needsUpdate = true;
      resolve(cube);
    }, undefined, reject);
  });
}

function loadSkyTexture(source) {
  // Los panoramas son equirectangulares 2:1 y se muestran directamente en la
  // esfera UV. Los atlas 4x3 necesitan convertirse en CubeTexture para que no
  // aparezcan las juntas del atlas como otra cúpula azul.
  return source.type === 'cubemap'
    ? cubeFromAtlas(SKY_ROOT + source.file)
    : loadTexture(SKY_ROOT + source.file);
}

function makeSkyMesh() {
  const material = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 16), material);
  mesh.renderOrder = -1000;
  mesh.visible = false;
  skyGroup.add(mesh);
  return mesh;
}

function setSkyIntensity(mesh, intensity) {
  if (!mesh) return;
  mesh.material.color.setRGB(intensity, intensity, intensity);
  mesh.material.needsUpdate = true;
}

async function swapSkyTo(index) {
  if (skyState.loading) return;
  const source = SKY_SOURCES[index % SKY_SOURCES.length];
  const incoming = makeSkyMesh();
  skyState.loading = true;
  try {
    const texture = await loadSkyTexture(source);
    if (source.type === 'cubemap') incoming.material.envMap = texture;
    else incoming.material.map = texture;
    incoming.userData.skyTexture = texture;
    incoming.material.needsUpdate = true;
    incoming.visible = true;
    if (!skyState.currentMesh) {
      skyState.currentMesh = incoming;
      skyState.currentIndex = index;
    } else {
      skyState.nextMesh = incoming;
      skyState.currentMesh.renderOrder = -1000;
      skyState.nextMesh.renderOrder = -999;
      skyState.fade = 0;
    }
  } catch (err) {
    incoming.geometry.dispose();
    incoming.material.dispose();
    skyGroup.remove(incoming);
    console.warn(`No se pudo cargar el cielo ${source.file}; se mantiene el fondo actual.`, err);
  }
  skyState.loading = false;
}

function updateSkyCycle(dt) {
  if (!skyState.currentMesh) {
    skyState.timer += dt;
    if (skyState.timer > 0.2 && !skyState.loading) {
      skyState.timer = 0;
      swapSkyTo(skyState.currentIndex + 1);
    }
    return;
  }

  // Ajuste de luminancia con el ciclo día/noche existente.
  const target = isNight ? 0.42 : 1.0;
  const current = skyState.currentMesh.material.color.r;
  const value = current + (target - current) * Math.min(1, dt * 2.2);
  setSkyIntensity(skyState.currentMesh, value);

  if (skyState.nextMesh && skyState.fade < 1) {
    skyState.fade += dt / SKY_FADE;
    const k = Math.min(1, skyState.fade);
    skyState.nextMesh.material.opacity = k;
    skyState.currentMesh.material.opacity = 1 - k;
    skyState.nextMesh.material.color.copy(skyState.currentMesh.material.color);
    if (k >= 1) {
      const oldTexture = skyState.currentMesh.userData.skyTexture;
      if (oldTexture) oldTexture.dispose();
      skyGroup.remove(skyState.currentMesh);
      skyState.currentMesh.material.dispose();
      skyState.currentMesh.geometry.dispose();
      skyState.currentMesh = skyState.nextMesh;
      skyState.nextMesh = null;
      skyState.currentIndex = (skyState.currentIndex + 1) % SKY_SOURCES.length;
    }
  }

  skyState.timer += dt;
  if (!skyState.nextMesh && !skyState.loading && skyState.timer > SKY_DURATION) {
    skyState.timer = 0;
    swapSkyTo((skyState.currentIndex + 1) % SKY_SOURCES.length);
  }
}

function initSkyCycle() {
  swapSkyTo(0);
}

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
let ground = null;
let plot = null;

function createWorldGround() {
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    tiledMaterial(0xffffff, 'grass', 68, 68, { roughness: 0.94, envMapIntensity: 0.55 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  plot = new THREE.Mesh(
    new THREE.PlaneGeometry(S, S),
    tiledMaterial(0xffffff, 'grass', 9, 9, { roughness: 0.95, envMapIntensity: 0.5 })
  );
  plot.rotation.x = -Math.PI / 2;
  plot.position.y = 0.01;
  plot.receiveShadow = true;
  scene.add(plot);
}

function refreshWorldGround() {
  if (!ground || !plot) return;
  ground.material.dispose();
  plot.material.dispose();
  ground.material = tiledMaterial(0xffffff, 'grass', 68, 68, { roughness: 0.94, envMapIntensity: 0.55 });
  plot.material = tiledMaterial(0xffffff, 'grass', 9, 9, { roughness: 0.95, envMapIntensity: 0.5 });
}

createWorldGround();

const gridHelper = new THREE.GridHelper(S, S, 0xffffff, 0xffffff);
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.06;
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
let stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0 }));
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

/* ---------------- Vida ambiental (nubes, pájaros, mariposas, luciérnagas) ---------------- */
const envGroup = new THREE.Group();
scene.add(envGroup);

const clouds = [];
const CLOUD_DAY = new THREE.Color(0xffffff), CLOUD_NIGHT = new THREE.Color(0x39415f);
{
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, roughness: 1, metalness: 0, envMapIntensity: 0.4 });
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    const n = 3 + (i % 3);
    for (let j = 0; j < n; j++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(1.5 + Math.random() * 1.1, 10, 8), m);
      p.position.set(j * 1.7 - (n - 1) * 0.85, Math.random() * 0.4, Math.random() * 1.1);
      p.scale.y = 0.5;
      g.add(p);
    }
    g.position.set((Math.random() - 0.5) * 150, 24 + Math.random() * 12, (Math.random() - 0.5) * 130);
    g.scale.setScalar(1.3 + Math.random() * 1.2);
    envGroup.add(g);
    clouds.push({ g, v: 0.5 + Math.random() * 0.7, m });
  }
}
const birds = [];
{
  const bm = new THREE.MeshStandardMaterial({ color: 0x39404d, roughness: 0.9, envMapIntensity: 0.3 });
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.42), bm));
    const wl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.16), bm); wl.position.x = -0.26;
    const wr = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.16), bm); wr.position.x = 0.26;
    g.add(wl, wr);
    envGroup.add(g);
    birds.push({ g, wl, wr, r: 24 + i * 5, h: 15 + i * 2.5, v: 0.22 + i * 0.05, ph: i * 1.9 });
  }
}
const butterflies = [];
{
  const cols = [0xe85d75, 0xf2c94c, 0xa06fc9, 0xff8a5c];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const wm = new THREE.MeshStandardMaterial({ color: cols[i], side: THREE.DoubleSide, roughness: 0.75, envMapIntensity: 0.6 });
    const wl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.07), wm); wl.position.x = -0.055;
    const wr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.07), wm); wr.position.x = 0.055;
    const bd = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.09), new THREE.MeshStandardMaterial({ color: 0x4a3f35, roughness: 0.9, envMapIntensity: 0.4 }));
    g.add(wl, wr, bd);
    envGroup.add(g);
    butterflies.push({ g, wl, wr, cx: (Math.random() - 0.5) * 20, cz: (Math.random() - 0.5) * 20, r: 2 + Math.random() * 4, h: 0.7 + Math.random() * 1.3, v: 0.5 + Math.random() * 0.6, ph: Math.random() * 6 });
  }
}
const fireflies = [];
{
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd9ff86, transparent: true, opacity: 0 }));
    envGroup.add(m);
    fireflies.push({ m, cx: (Math.random() - 0.5) * 30, cz: (Math.random() - 0.5) * 30, h: 0.4 + Math.random() * 1.8, v: 0.25 + Math.random() * 0.4, ph: Math.random() * 6 });
  }
}
function updateEnv(t, dt) {
  updateSkyCycle(dt);
  for (const c of clouds) {
    c.g.position.x += c.v * dt;
    if (c.g.position.x > 95) c.g.position.x = -95;
  }
  if (clouds.length) clouds[0].m.color.lerpColors(CLOUD_NIGHT, CLOUD_DAY, dayT);
  for (const b of birds) {
    b.g.visible = dayT > 0.25;
    if (!b.g.visible) continue;
    const a = t * b.v + b.ph;
    b.g.position.set(Math.cos(a) * b.r, b.h + Math.sin(t * 0.6 + b.ph) * 1.6, Math.sin(a) * b.r);
    b.g.rotation.y = -a;
    const f = Math.sin(t * 9 + b.ph) * 0.55;
    b.wl.rotation.z = f;
    b.wr.rotation.z = -f;
  }
  const showButterflies = dayT > 0.3;
  for (const b of butterflies) {
    b.g.visible = showButterflies;
    if (!showButterflies) continue;
    const a = t * b.v + b.ph;
    b.g.position.set(b.cx + Math.cos(a) * b.r, b.h + Math.sin(t * 2.1 + b.ph) * 0.35, b.cz + Math.sin(a * 0.9 + 1.3) * b.r * 0.75);
    b.g.rotation.y = -a;
    const f = Math.sin(t * 14 + b.ph) * 0.9;
    b.wl.rotation.z = f;
    b.wr.rotation.z = -f;
  }
  const night = 1 - dayT;
  for (const f of fireflies) {
    f.m.position.set(f.cx + Math.cos(t * f.v + f.ph) * 2, f.h + Math.sin(t * 0.7 + f.ph * 2) * 0.5, f.cz + Math.sin(t * f.v * 0.8 + f.ph) * 2);
    f.m.material.opacity = night * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + f.ph)));
  }
}

/* ---------------- Construcción de mallas ---------------- */
function buildWallMesh(type = 'pared', color) {
  const def = BUILD_ITEMS[type] || BUILD_ITEMS.pared;
  const c = color ?? def.color ?? 0xf5f0e8;
  const wallSurfaces = {
    plain: 'plaster', stone: 'wallStone', brick: 'wallBrick',
    concrete: 'wallConcrete', wood: 'wallWood', low: 'wallStone',
  };

  if (def.category === 'wall') {
    const h = def.height ?? WALL_H;
    const surface = wallSurfaces[def.style] || 'plaster';
    const body = box(1.02, h, 0.16, c, 0, h / 2, 0, true, surface);
    const details = [body];
    if (def.style === 'low') {
      // El remate ancho hace que el minimuro se lea como una pieza propia,
      // incluso cuando se coloca junto a una pared alta.
      details.push(
        rbox(1.08, 0.09, 0.21, shade(c, .12), 0, h + .045, 0, .025, true, surface),
        box(1.04, .08, .19, shade(c, -.12), 0, .04, 0, true, surface)
      );
    } else {
      details.push(
        box(1.04, .08, .19, shade(c, -.1), 0, .04, 0, true, surface),
        rbox(1.06, .055, .19, shade(c, .1), 0, h + .028, 0, .014, true, surface)
      );
    }
    return grp(...details);
  }

  if (def.category === 'fence') {
    const h = def.height ?? 1.2;
    const metalFence = def.style === 'metalFence';
    const surface = metalFence ? 'metal' : 'fenceWood';
    const postColor = metalFence ? shade(c, -.16) : shade(c, -.08);
    const g = grp();
    const postXs = [-.48, 0, .48];
    for (const x of postXs) {
      g.add(rbox(.095, h, .095, postColor, x, h / 2, 0, .018, true, surface));
      g.add(cyl(.045, .062, .1, postColor, x, h + .05, 0, 8, true, surface));
    }
    if (metalFence) {
      for (const y of [h * .25, h * .62, h * .9]) g.add(rbox(.98, .045, .045, c, 0, y, 0, .012, true, surface));
      for (let i = -4; i <= 4; i++) g.add(rbox(.035, h * .88, .035, c, i * .12, h * .44, 0, .01, true, surface));
    } else {
      for (const y of [h * .3, h * .72]) g.add(rbox(.98, .07, .065, shade(c, -.04), 0, y, 0, .014, true, surface));
      for (let i = -4; i <= 4; i++) {
        const x = i * .12;
        g.add(rbox(.075, h * .72, .075, c, x, h * .38, 0, .014, true, surface));
        g.add(cyl(0, .052, .1, shade(c, .1), x, h * .76 + .05, 0, 4, true, surface));
      }
    }
    return g;
  }

  if (def.category === 'door') {
    const g = grp(
      box(1.02, 0.9, 0.14, c, 0, WALL_H - 0.45, 0, true),
      box(0.09, 2.1, 0.14, c, -0.465, 1.05, 0, true),
      box(0.09, 2.1, 0.14, c, 0.465, 1.05, 0, true)
    );
    if (def.style === 'modern') {
      g.add(box(0.84, 2.06, 0.07, 0x424a52, 0, 1.03, 0, true));
      g.add(glass(0.2, 1.72, 0x9ed8e8, 0.62, 0.18, 1.15, 0.055));
      g.add(box(0.05, 0.42, 0.06, METAL, -0.26, 1.05, 0.07));
    } else if (def.style === 'double') {
      g.add(box(0.405, 2.06, 0.07, WOOD, -0.21, 1.03, 0, true));
      g.add(box(0.405, 2.06, 0.07, WOOD, 0.21, 1.03, 0, true));
      g.add(box(0.025, 2.0, 0.08, WOOD_D, 0, 1.03, 0.045));
      g.add(sph(0.035, 0xd8b344, -0.08, 1.0, 0.07));
      g.add(sph(0.035, 0xd8b344, 0.08, 1.0, 0.07));
    } else if (def.style === 'rustic') {
      g.add(box(0.84, 2.06, 0.07, WOOD_D, 0, 1.03, 0, true));
      for (const x of [-.28, 0, .28]) g.add(box(.035, 1.96, .035, shade(WOOD_D, .18), x, 1.03, .055));
      const braceA = box(.72, .075, .04, 0x2d3035, 0, 1.03, .07); braceA.rotation.z = .65;
      const braceB = box(.72, .075, .04, 0x2d3035, 0, 1.03, .07); braceB.rotation.z = -.65;
      g.add(braceA, braceB, sph(.045, 0x25282d, .29, 1.02, .075));
    } else {
      g.add(box(0.84, 2.06, 0.07, WOOD, 0, 1.03, 0));
      g.add(box(0.58, 0.62, 0.025, shade(WOOD, -.16), 0, 1.48, .05));
      g.add(sph(0.045, 0xd8b344, 0.28, 1.02, 0.06));
    }
    return g;
  }

  const panorama = def.style === 'panorama';
  const lowerH = panorama ? 0.72 : 1.0;
  const upperH = panorama ? 0.5 : 0.8;
  const openingY = panorama ? 1.61 : 1.6;
  const openingH = WALL_H - lowerH - upperH;
  const frameColor = def.style === 'industrial' ? 0x30343a : WHITE;
  const g = grp(
    box(1.02, lowerH, 0.14, c, 0, lowerH / 2, 0, true),
    box(1.02, upperH, 0.14, c, 0, WALL_H - upperH / 2, 0, true),
    box(0.09, openingH, 0.14, c, -0.465, openingY, 0, true),
    box(0.09, openingH, 0.14, c, 0.465, openingY, 0, true),
    glass(0.86, openingH, panorama ? 0x8ecfe4 : 0xaad4e8, panorama ? 0.52 : 0.43, 0, openingY, 0),
    box(0.88, 0.05, 0.06, frameColor, 0, openingY - openingH / 2, 0.04),
    box(0.88, 0.05, 0.06, frameColor, 0, openingY + openingH / 2, 0.04)
  );
  if (def.style === 'double') {
    g.add(box(0.055, openingH, 0.065, frameColor, 0, openingY, 0.045));
    g.add(box(0.38, 0.035, 0.07, frameColor, -.215, openingY, .045));
    g.add(box(0.38, 0.035, 0.07, frameColor, .215, openingY, .045));
  } else if (def.style === 'industrial') {
    g.add(box(0.045, openingH, 0.065, frameColor, 0, openingY, 0.045));
    g.add(box(0.88, 0.045, 0.065, frameColor, 0, openingY - openingH * .18, .045));
    g.add(box(0.88, 0.045, 0.065, frameColor, 0, openingY + openingH * .18, .045));
  } else if (!panorama) {
    g.add(box(0.86, 0.05, 0.06, frameColor, 0, openingY, 0.04));
    g.add(box(0.05, openingH, 0.06, frameColor, 0, openingY, 0.04));
  }
  return g;
}
function rampGeometry(width = .94, depth = .94, height = .82) {
  // Cuña con la parte alta hacia +Z. Se rota la pieza completa al colocarla.
  const w = width / 2, d = depth / 2;
  const vertices = [
    -w, 0, -d,   w, 0, -d,   -w, 0, d,   w, 0, d,
    -w, height, d,   w, height, d,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex([
    0, 1, 3, 0, 3, 2, // base
    0, 2, 4,           // lateral izquierdo
    1, 5, 3,           // lateral derecho
    2, 3, 5, 2, 5, 4,  // pendiente
    0, 4, 5, 0, 5, 1,  // frente y remate
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

function buildFloorMesh(type = 'suelo', color) {
  const def = BUILD_ITEMS[type] || BUILD_ITEMS.suelo;
  const c = color ?? def.color ?? 0xc9a06a;
  const surfaceMap = {
    wood: 'wood', planks: 'planks', woodDark: 'woodDark', tiles: 'tiles',
    marble: 'marble', terracotta: 'terracotta', parquet: 'parquet',
    concrete: 'concrete', stone: 'floorStone', gravel: 'floorGravel',
    slate: 'floorSlate', hex: 'floorHex', stairs: 'woodDark', ramp: 'wallConcrete',
  };
  const surface = surfaceMap[def.style] || 'wood';

  if (def.style === 'stairs') {
    const g = grp();
    const steps = 5, depth = .96 / steps, rise = .16;
    g.add(box(.96, .045, .98, shade(c, -.18), 0, .025, 0, true, surface));
    for (let i = 0; i < steps; i++) {
      const h = (i + 1) * rise;
      const z = -.48 + depth * (i + .5);
      g.add(rbox(.92, h, depth - .018, c, 0, h / 2 + .045, z, .018, true, surface));
    }
    // Largueros laterales: además de decorativos hacen legible la dirección.
    for (const x of [-.48, .48]) {
      const side = rbox(.055, rise * steps + .08, .92, shade(c, -.2), x, rise * steps / 2 + .06, 0, .012, true, surface);
      side.rotation.x = -.16;
      g.add(side);
    }
    return g;
  }

  if (def.style === 'ramp') {
    const g = grp();
    const ramp = new THREE.Mesh(rampGeometry(.96, .96, .82), mat(c, { surface }));
    ramp.castShadow = true; ramp.receiveShadow = true; ramp.userData.paint = true;
    g.add(ramp);
    for (const x of [-.49, .49]) {
      const edge = rbox(.045, .055, .98, shade(c, -.16), x, .045, 0, .012, true, surface);
      edge.rotation.x = -.7;
      g.add(edge);
    }
    return g;
  }

  const g = grp(box(.99, .08, .99, c, 0, .04, 0, true, surface));
  const seam = ['tiles', 'marble', 'hex', 'slate'].includes(def.style) ? 0xb4b1aa : shade(c, -.2);
  if (def.style === 'wood' || def.style === 'planks' || def.style === 'woodDark') {
    for (const z of [-.25, .25]) g.add(box(.97, .006, .018, seam, 0, .083, z, false, surface));
    for (const [x, z] of [[-.24, -.37], [.25, -.12], [-.12, .13], [.32, .38]]) g.add(box(.016, .006, .23, seam, x, .083, z, false, surface));
  } else if (def.style === 'tiles' || def.style === 'terracotta' || def.style === 'hex') {
    g.add(box(.97, .007, .018, seam, 0, .084, 0, false, surface), box(.018, .007, .97, seam, 0, .084, 0, false, surface));
    if (def.style === 'terracotta') {
      g.add(box(.018, .007, .97, shade(c, .12), -.48, .084, 0, false, surface), box(.018, .007, .97, shade(c, .12), .48, .084, 0, false, surface));
    }
  } else if (def.style === 'marble') {
    const v1 = box(1.05, .006, .018, 0xa7abb1, 0, .084, -.09, false, surface); v1.rotation.y = .58;
    const v2 = box(.72, .006, .012, 0xc3b9ae, .15, .084, .22, false, surface); v2.rotation.y = -.72;
    g.add(v1, v2);
  } else if (def.style === 'parquet') {
    for (let i = 0; i < 6; i++) {
      const slat = box(.42, .009, .12, i % 2 ? shade(c, .12) : shade(c, -.08), -.27 + (i % 2) * .54, .086, -.32 + Math.floor(i / 2) * .32, false, surface);
      slat.rotation.y = i % 2 ? Math.PI / 2 : 0;
      g.add(slat);
    }
  } else if (['concrete', 'stone', 'gravel', 'slate'].includes(def.style)) {
    for (const [x, z, r] of [[-.3, -.24, .018], [.24, -.32, .014], [-.1, .3, .016], [.34, .18, .012]])
      g.add(cyl(r, r, .006, shade(c, -.22), x, .085, z, 8, false, surface));
  }
  return g;
}
function buildRoofMesh(type = 'techo', color) {
  const def = BUILD_ITEMS[type] || BUILD_ITEMS.techo;
  const c = color ?? def.color ?? 0xa8524a;
  const surface = def.style === 'flat' ? 'concrete' : 'roofTile';
  const g = grp(box(1.0, 0.14, 1.0, c, 0, WALL_H + 0.07, 0, true, surface));
  if (def.style === 'tile') {
    for (const z of [-.32, 0, .32]) g.add(box(.98,.025,.035,shade(c,-.18),0,WALL_H+.15,z));
  }
  return g;
}

function wallTransform(key) {
  const [o, xs, zs] = key.split(':');
  const x = +xs, z = +zs;
  if (o === 'h') return { x: x + 0.5 - S / 2, z: z - S / 2, ry: 0 };
  return { x: x - S / 2, z: z + 0.5 - S / 2, ry: Math.PI / 2 };
}
function objTransform(obj) {
  const def = FURNITURE[obj.t] || FURNITURE.silla;
  const rotation = Number.isFinite(+obj.r) ? ((+obj.r % 4) + 4) % 4 : 0;
  const w = rotation % 2 ? def.d : def.w, d = rotation % 2 ? def.w : def.d;
  return { x: obj.x + w / 2 - S / 2, z: obj.z + d / 2 - S / 2, ry: rotation * Math.PI / 2, w, d, rotation };
}

function addFloorMesh(key, data) {
  const [x, z] = key.split(',').map(Number);
  const m = buildFloorMesh(data.t || 'suelo', data.c);
  m.position.set(x + 0.5 - S / 2, 0, z + 0.5 - S / 2);
  const def = BUILD_ITEMS[data.t] || BUILD_ITEMS.suelo;
  m.rotation.y = def.rotatable ? normalizeRotation(data.r) * Math.PI / 2 : 0;
  m.userData = { kind: 'floor', key };
  buildGroup.add(m); meshes.floors[key] = m;
}
function addRoofMesh(key, data) {
  const [x, z] = key.split(',').map(Number);
  const m = buildRoofMesh(data.t || 'techo', data.c);
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
  if (!def) return;
  const m = buildCatalogObject(obj.t, obj.c);
  if (!m) return;
  const t = objTransform(obj);
  m.position.set(t.x, 0, t.z); m.rotation.y = t.ry;
  m.scale.setScalar(obj.s || 1);
  m.userData = { kind: 'object', key: obj.id };
  buildGroup.add(m); meshes.objects[obj.id] = m;
  attachAnims(obj);
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
  if (kind === 'object') {
    objAnims.delete(key);
    if (lampLights.has(key)) {
      scene.remove(lampLights.get(key));
      lampLights.delete(key);
    }
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
  clearSelection();
}

/* ---------------- Animaciones por objeto (objetos "vivos") ---------------- */
const objAnims = new Map(); // objId -> (t) => void

const ANIM_BUILDERS = {
  fuente: (p, ctx) => (t) => {
    (p.fwater || []).forEach(w => w.scale.setScalar(1 + 0.04 * Math.sin(t * 2.7)));
    const jet = (p.fjet || [])[0];
    if (jet) {
      const s = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.3 + ctx.ph(1)));
      jet.scale.y = s;
      jet.position.y = 1.38 + 0.22 * s;
      jet.material.opacity = 0.3 + 0.25 * s;
    }
    (p.fdrop || []).forEach((d, i) => {
      const q = (t * 0.85 + i / 6) % 1;
      const a = i * 1.05 + ctx.ph(2);
      const r = 0.1 + q * 0.55;
      d.position.set(Math.cos(a) * r, 1.42 - q * 1.05, Math.sin(a) * r);
      d.scale.setScalar(1 - q * 0.35);
    });
  },
  cocina: (p, ctx) => (t) => {
    (p.steam || []).forEach((s, i) => {
      const q = (t * 0.42 + i / 3 + 0.1 * ctx.ph(3)) % 1;
      s.position.y = 1.12 + q * 0.6;
      s.position.x = -0.2 + Math.sin(t * 2 + i * 2) * 0.03;
      s.scale.setScalar(0.7 + q * 1.6);
      s.material.opacity = 0.42 * (1 - q);
    });
  },
  acuario: (p, ctx) => (t) => {
    (p.afish || []).forEach((f, i) => {
      const a = t * 0.9 + i * Math.PI + ctx.ph(4);
      f.position.set(Math.cos(a) * 0.5, 1.0 + Math.sin(t * 1.5 + i * 2) * 0.1, i % 2 ? 0.16 : -0.14);
      f.rotation.y = -a;
    });
  },
  estanque: (p) => (t) => {
    (p.ewater || []).forEach(w => w.scale.setScalar(1 + 0.05 * Math.sin(t * 1.8)));
  },
  reloj: (p) => (t) => {
    const h1 = (p.hand1 || [])[0], h2 = (p.hand2 || [])[0];
    if (h1) h1.rotation.z = -t * 0.5;
    if (h2) h2.rotation.z = -t * 0.042;
  },
  hoguera: (p, ctx) => (t) => {
    (p.fire || []).forEach((f, i) => {
      f.scale.set(
        1 + 0.18 * Math.sin(t * 12 + i * 2.3),
        0.8 + 0.35 * Math.sin(t * 10 + i * 1.7) + 0.12 * Math.sin(t * 21 + i),
        1 + 0.18 * Math.cos(t * 11 + i * 2.9)
      );
      f.position.y = f.userData.baseY + 0.02 * Math.sin(t * 9 + i);
    });
    const l = lampLights.get(ctx.id);
    if (l) l.intensity = l.userData.max * (1 - dayT) * (0.75 + 0.25 * Math.abs(Math.sin(t * 9 + ctx.ph(5))));
  },
  sway: (p, ctx) => (t) => {
    (p.sway || []).forEach((g, i) => {
      g.rotation.z = 0.028 * Math.sin(t * 0.8 + ctx.ph(i));
      g.rotation.x = 0.02 * Math.cos(t * 0.63 + ctx.ph(i + 3));
    });
  },
  bob: (p, ctx) => (t) => {
    (p.bob || []).forEach((g, i) => {
      g.position.y = g.userData.baseY + 0.05 * Math.sin(t * 1.9 + ctx.ph(i));
    });
  },
  neon: (p, ctx) => (t) => {
    const pulse = 0.75 + 0.3 * Math.sin(t * 2.4 + ctx.ph(6));
    (p.neon || []).forEach(n => { if (n.material && n.material.emissiveIntensity !== undefined) n.material.emissiveIntensity = pulse; });
    const l = lampLights.get(ctx.id);
    if (l) l.intensity = l.userData.max * (1 - dayT) * (0.4 + pulse * 0.8);
  },
};

function attachAnims(obj) {
  const def = FURNITURE[obj.t];
  const m = meshes.objects[obj.id];
  if (!def || !def.anim || !m) return;
  const parts = {};
  m.traverse(n => { if (n.userData.anim) (parts[n.userData.anim] = parts[n.userData.anim] || []).push(n); });
  for (const k of ['fire', 'bob']) (parts[k] || []).forEach(n => { n.userData.baseY = n.userData.baseY ?? n.position.y; });
  const seed = obj.id.charCodeAt(obj.id.length - 1) * 7.13 + 3;
  const f = ANIM_BUILDERS[def.anim];
  if (f) objAnims.set(obj.id, f(parts, { id: obj.id, ph: (i = 0) => Math.sin(seed + i * 12.9) * 4.7 }));
}
function runObjAnims(t) {
  for (const fn of objAnims.values()) fn(t);
}

/* ---------------- Partículas (polvo al romper / vender) ---------------- */
const particles = [];
function spawnDust(pos, n = 9, color = 0xd6cfc2) {
  for (let i = 0; i < n; i++) {
    const size = 0.05 + Math.random() * 0.09;
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(size, 7, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.3) * 0.3, (Math.random() - 0.5) * 0.4));
    scene.add(m);
    particles.push({ m, vx: (Math.random() - 0.5) * 1.6, vy: 0.8 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 1.6, t: 0, life: 0.5 + Math.random() * 0.35 });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    if (p.t >= p.life) {
      scene.remove(p.m);
      p.m.geometry.dispose();
      p.m.material.dispose();
      particles.splice(i, 1);
      continue;
    }
    p.vy -= 2.2 * dt;
    p.m.position.x += p.vx * dt;
    p.m.position.y += p.vy * dt;
    p.m.position.z += p.vz * dt;
    const k = p.t / p.life;
    p.m.scale.setScalar(1 + k * 1.6);
    p.m.material.opacity = 0.9 * (1 - k);
  }
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
let selectedColorCustom = false;
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
  if (!tool || ['paint', 'delete', 'select', 'hammer'].includes(tool.mode)) return;
  let g = null;
  if (tool.mode === 'build') {
    const def = BUILD_ITEMS[tool.id];
    if (def.kind === 'floor') g = buildFloorMesh(tool.id);
    else if (def.kind === 'roof') g = buildRoofMesh(tool.id);
    else g = buildWallMesh(tool.id);
  } else {
    g = buildCatalogObject(tool.id);
  }
  g.traverse(n => { if (n.isMesh) { n.material = ghostMatOk; n.castShadow = false; n.receiveShadow = false; } });
  g.visible = false;
  scene.add(g);
  ghost = g;
}

function selectedToolDef(t = tool) {
  if (!t) return null;
  if (t.mode === 'build') return BUILD_ITEMS[t.id];
  if (t.mode === 'furniture') return FURNITURE[t.id];
  if (t.mode === 'paint') return { name: 'Pintar', ico: '🎨' };
  if (t.mode === 'select') return { name: 'Seleccionar', ico: '🖐️' };
  if (t.mode === 'hammer') return { name: 'Mazo', ico: '🔨' };
  return { name: 'Vender', ico: '🧹' };
}
function updateRotationUI() {
  const btn = document.getElementById('btn-rotate');
  if (btn) btn.innerHTML = `🔄 Rotar ${toolRot * 90}° <kbd>R</kbd>`;
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
  const canRotateTool = t && (t.mode === 'furniture' || (t.mode === 'build' && BUILD_ITEMS[t.id]?.rotatable));
  document.getElementById('btn-rotate').style.display = canRotateTool ? '' : 'none';
  const def = selectedToolDef(t);
  document.getElementById('selection-label').textContent = def ? `${def.ico} ${def.name}` : '';
  updateRotationUI();
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
    const kind = BUILD_ITEMS[tool.id].kind;
    if (kind === 'floor') return hover.cellOk && !state.floors[hover.cellKey];
    if (kind === 'roof') return hover.cellOk && !state.roofs[hover.cellKey];
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
    const def = BUILD_ITEMS[tool.id];
    const data = { t: tool.id, c: selectedColorCustom ? selectedColor : def.color };
    if (def.rotatable) data.r = toolRot;
    if (def.kind === 'floor') {
      state.floors[hover.cellKey] = data;
      addFloorMesh(hover.cellKey, data);
    } else if (def.kind === 'roof') {
      state.roofs[hover.cellKey] = data;
      addRoofMesh(hover.cellKey, data);
    } else {
      state.walls[hover.edgeKey] = data;
      addWallMesh(hover.edgeKey, data);
    }
  } else {
    const id = 'o' + (state.nextId++);
    const obj = { id, t: tool.id, x: hover.cx, z: hover.cz, r: toolRot };
    if (selectedColorCustom) obj.c = selectedColor;
    state.objects[id] = obj;
    addObjectMesh(obj);
  }
  refreshGhost();
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

/* ---------------- Eliminación unificada (vender / mazo / panel) ---------------- */
function removeBuildItem(kind, key, refund) {
  const store = state[kind + 's'];
  const data = store[key];
  if (!data) return;
  let cost = 0;
  if (kind === 'floor') cost = (BUILD_ITEMS[data.t] || BUILD_ITEMS.suelo).cost;
  else if (kind === 'roof') cost = (BUILD_ITEMS[data.t] || BUILD_ITEMS.techo).cost;
  else if (kind === 'wall') cost = (BUILD_ITEMS[data.t] || BUILD_ITEMS.pared).cost;
  else cost = (FURNITURE[data.t] || { cost: 0 }).cost;
  delete store[key];
  removeMesh(kind, key);
  if (refund) {
    const r = Math.floor(cost / 2);
    state.money += r;
    updateMoney(true);
    toast(`Vendido por ${fmt(r)} ♻️`, 'success');
  }
  if (selection && selection.kind === kind && selection.key === key) clearSelection();
  scheduleSave();
}
function deleteAt(ev) {
  const hit = pickBuild(ev);
  if (!hit) return;
  const { kind, key } = hit.node.userData;
  const center = new THREE.Box3().setFromObject(hit.node).getCenter(new THREE.Vector3());
  removeBuildItem(kind, key, true);
  spawnDust(center, 6);
  snd.remove();
}
function hammerAt(ev) {
  const hit = pickBuild(ev);
  if (!hit) { snd.error(); return; }
  const { kind, key } = hit.node.userData;
  const center = new THREE.Box3().setFromObject(hit.node).getCenter(new THREE.Vector3());
  removeBuildItem(kind, key, false);
  spawnDust(center, 10);
  snd.hammer();
}

/* ---------------- Seleccionar con la mano 🖐️ ---------------- */
let selection = null; // {kind:'floor'|'wall'|'roof'|'object', key}
let selHelper = null;
const selPanelEl = document.getElementById('select-panel');

function clearSelection() {
  selection = null;
  if (selHelper) { scene.remove(selHelper); selHelper = null; }
  if (selPanelEl) selPanelEl.classList.add('hidden');
}
function refreshSelHelper() {
  if (!selection) return;
  const node = selection.kind === 'object' ? meshes.objects[selection.key] : meshes[selection.kind + 's'][selection.key];
  if (!node) { clearSelection(); return; }
  if (selHelper) scene.remove(selHelper);
  selHelper = new THREE.BoxHelper(node, 0xffd36b);
  selHelper.material.transparent = true;
  scene.add(selHelper);
}
function selectAt(ev) {
  const hit = pickBuild(ev);
  if (!hit) { clearSelection(); return; }
  const { kind, key } = hit.node.userData;
  selection = { kind, key };
  refreshSelHelper();
  renderSelectPanel();
  snd.select();
}
function selTarget() {
  if (!selection) return null;
  return state[selection.kind + 's'][selection.key] || null;
}
function renderSelectPanel() {
  const tgt = selTarget();
  if (!tgt || !selPanelEl) { clearSelection(); return; }
  const def = selection.kind === 'object' ? FURNITURE[tgt.t] : BUILD_ITEMS[tgt.t];
  const refund = Math.floor((def ? def.cost : 0) / 2);
  document.getElementById('sp-name').textContent = def ? `${def.ico} ${def.name}` : 'Pieza';
  document.getElementById('sp-sell').textContent = `♻️ Vender +${fmt(refund)}`;
  const isObj = selection.kind === 'object';
  const isRotatableBuild = selection.kind === 'floor' && BUILD_ITEMS[tgt.t]?.rotatable;
  document.getElementById('sp-size-row').classList.toggle('hidden', !isObj);
  document.getElementById('sp-rotate').classList.toggle('hidden', !isObj && !isRotatableBuild);
  const s = isObj ? (tgt.s || 1) : 1;
  document.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', Math.abs(+b.dataset.scale - s) < 0.01));
  selPanelEl.classList.remove('hidden');
}
function applySelColor(c) {
  if (!selection) return;
  if (selection.kind === 'object') {
    const obj = state.objects[selection.key];
    obj.c = c;
    removeMesh('object', selection.key);
    addObjectMesh(obj);
  } else {
    const store = state[selection.kind + 's'];
    store[selection.key].c = c;
    const adder = { floor: addFloorMesh, wall: addWallMesh, roof: addRoofMesh }[selection.kind];
    removeMesh(selection.kind, selection.key);
    adder(selection.key, store[selection.key]);
  }
  refreshSelHelper();
  snd.click();
  scheduleSave();
}
function applySelScale(s) {
  if (!selection || selection.kind !== 'object') return;
  const obj = state.objects[selection.key];
  obj.s = s;
  const m = meshes.objects[selection.key];
  if (m) m.scale.setScalar(s);
  refreshSelHelper();
  renderSelectPanel();
  snd.click();
  scheduleSave();
}
function rotateSelected() {
  if (!selection) return;
  if (selection.kind === 'floor') {
    const floor = state.floors[selection.key];
    const def = floor && BUILD_ITEMS[floor.t];
    if (!def?.rotatable) return;
    floor.r = normalizeRotation((floor.r || 0) + 1);
    removeMesh('floor', selection.key);
    addFloorMesh(selection.key, floor);
    refreshSelHelper();
    snd.click();
    scheduleSave();
    return;
  }
  if (selection.kind !== 'object') return;
  const obj = state.objects[selection.key];
  const def = FURNITURE[obj.t];
  const nr = normalizeRotation((obj.r || 0) + 1);
  const w = nr % 2 ? def.d : def.w, d = nr % 2 ? def.w : def.d;
  if (obj.x < 0 || obj.z < 0 || obj.x + w > S || obj.z + d > S) { toast('No cabe ahí 🚫', 'error'); snd.error(); return; }
  const occ = occupiedMap(obj.id);
  const tmp = { ...obj, r: nr };
  for (const c of objCells(tmp)) if (occ.has(c)) { toast('No cabe ahí 🚫', 'error'); snd.error(); return; }
  obj.r = nr;
  const m = meshes.objects[obj.id];
  if (m) {
    const t = objTransform(obj);
    m.position.set(t.x, 0, t.z);
    m.rotation.y = t.ry;
  }
  refreshSelHelper();
  snd.click();
  scheduleSave();
}
function initSelectPanel() {
  const pal = document.getElementById('sp-colors');
  if (!pal) return;
  PALETTE.forEach(c => {
    const s = document.createElement('div');
    s.className = 'swatch';
    s.title = 'Pintar de este color';
    s.style.background = '#' + c.toString(16).padStart(6, '0');
    s.addEventListener('click', () => applySelColor(c));
    pal.appendChild(s);
  });
  document.querySelectorAll('.size-btn').forEach(b => b.addEventListener('click', () => applySelScale(+b.dataset.scale)));
  document.getElementById('sp-rotate').addEventListener('click', rotateSelected);
  document.getElementById('sp-sell').addEventListener('click', () => { if (selection) removeBuildItem(selection.kind, selection.key, true); });
  document.getElementById('sp-delete').addEventListener('click', () => { if (selection) { const { kind, key } = selection; const node = state[kind + 's'][key] && (kind === 'object' ? meshes.objects[key] : meshes[kind + 's'][key]); if (node) spawnDust(new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()), 8); removeBuildItem(kind, key, false); } });
  document.getElementById('sp-close').addEventListener('click', clearSelection);
}

/* ---------------- Misiones ---------------- */
function countFloors() { return Object.keys(state.floors).length; }
function countRoofs() { return Object.keys(state.roofs).length; }
function countWalls(type) {
  const category = { pared: 'wall', puerta: 'door', ventana: 'window' }[type];
  return Object.values(state.walls).filter(w => {
    if (!type) return true;
    const def = BUILD_ITEMS[w.t];
    return def ? def.category === category : w.t === type;
  }).length;
}
function countObj(type) { return Object.values(state.objects).filter(o => o.t === type).length; }
function countFurn() { return Object.values(state.objects).filter(o => FURNITURE[o.t] && !FURNITURE[o.t].out).length; }
function countDecor() { return Object.values(state.objects).filter(o => FURNITURE[o.t]?.decor).length; }
function countOut() { return Object.values(state.objects).filter(o => FURNITURE[o.t]?.out).length; }

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
  { id: 'm12', name: '🪴 Toque personal', desc: 'Añade 5 adornos', reward: 450, goal: 5, prog: countDecor },
  { id: 'm13', name: '🎹 Alma de músico', desc: 'Coloca un piano', reward: 400, goal: 1, prog: () => countObj('piano') },
  { id: 'm14', name: '🌴 Jardín tropical', desc: 'Pino, palmera y cactus', reward: 500, goal: 3, prog: () => Math.min(countObj('pino'), 1) + Math.min(countObj('palmera'), 1) + Math.min(countObj('cactus'), 1) },
  { id: 'm15', name: '🔥 Ronda de fuego', desc: 'Hoguera + barbacoa', reward: 450, goal: 2, prog: () => Math.min(countObj('hoguera'), 1) + Math.min(countObj('barbacoa'), 1) },
  { id: 'm16', name: '🌙 Noche con encanto', desc: 'Farola + neón o candelabro', reward: 450, goal: 2, prog: () => Math.min(countObj('farola'), 1) + Math.min(Math.min(countObj('neon'), 1) + Math.min(countObj('candelabro'), 1), 1) },
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
function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}
function validCellKey(key) {
  const parts = String(key).split(',');
  if (parts.length !== 2) return false;
  const [x, z] = parts.map(Number);
  return Number.isInteger(x) && Number.isInteger(z) && x >= 0 && x < S && z >= 0 && z < S;
}
function validEdgeKey(key) {
  const parts = String(key).split(':');
  if (parts.length !== 3) return false;
  const [orientation, xs, zs] = parts;
  const x = Number(xs), z = Number(zs);
  if (!Number.isInteger(x) || !Number.isInteger(z)) return false;
  return orientation === 'h'
    ? x >= 0 && x < S && z >= 0 && z <= S
    : orientation === 'v' && x >= 0 && x <= S && z >= 0 && z < S;
}
function safeColor(value, fallback) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffffff ? value : fallback;
}
function normalizeRotation(value) {
  const n = Number.isFinite(+value) ? Math.round(+value) : 0;
  return ((n % 4) + 4) % 4;
}
function normalizeState(data) {
  const next = newState();
  if (!record(data)) return next;
  next.money = Number.isFinite(+data.money) ? Math.max(0, Math.floor(+data.money)) : START_MONEY;

  for (const [key, item] of Object.entries(record(data.floors) ? data.floors : {})) {
    const def = BUILD_ITEMS[item?.t];
    if (!validCellKey(key) || !def || def.kind !== 'floor') continue;
    next.floors[key] = { t: item.t, c: safeColor(item.c, def.color) };
    if (def.rotatable) next.floors[key].r = normalizeRotation(item.r);
  }
  for (const [key, item] of Object.entries(record(data.roofs) ? data.roofs : {})) {
    const def = BUILD_ITEMS[item?.t];
    if (!validCellKey(key) || !def || def.kind !== 'roof') continue;
    next.roofs[key] = { t: item.t, c: safeColor(item.c, def.color) };
  }
  for (const [key, item] of Object.entries(record(data.walls) ? data.walls : {})) {
    const def = BUILD_ITEMS[item?.t];
    if (!validEdgeKey(key) || !def || def.kind !== 'wall') continue;
    next.walls[key] = { t: item.t, c: safeColor(item.c, def.color) };
  }

  let generatedId = 1;
  const sourceObjects = record(data.objects) ? data.objects : {};
  for (const item of Object.values(sourceObjects)) {
    const def = FURNITURE[item?.t];
    if (!def || !Number.isInteger(+item?.x) || !Number.isInteger(+item?.z)) continue;
    const obj = {
      id: typeof item.id === 'string' && item.id ? item.id : `o${generatedId}`,
      t: item.t,
      x: +item.x,
      z: +item.z,
      r: normalizeRotation(item.r),
    };
    const transform = objTransform(obj);
    if (obj.x < 0 || obj.z < 0 || obj.x + transform.w > S || obj.z + transform.d > S) continue;
    if (next.objects[obj.id]) obj.id = `o${generatedId}`;
    obj.s = Number.isFinite(+item.s) ? Math.max(.5, Math.min(2, +item.s)) : 1;
    if (item.c !== undefined) obj.c = safeColor(item.c, def.color ?? PALETTE[0]);
    next.objects[obj.id] = obj;
    const numericId = Number(obj.id.slice(1));
    if (Number.isFinite(numericId)) generatedId = Math.max(generatedId, numericId + 1);
  }
  next.nextId = Math.max(1, Math.floor(Number(data.nextId) || generatedId), generatedId);
  const validMissionIds = new Set(MISSIONS.map(m => m.id));
  const completed = Array.isArray(data.missionsDone)
    ? data.missionsDone.filter(id => typeof id === 'string' && validMissionIds.has(id))
    : [];
  next.missionsDone = [...new Set(completed)];
  return next;
}
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
    if (!record(data) || typeof data.money !== 'number') return false;
    state = normalizeState(data);
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
      if (!record(data) || typeof data.money !== 'number' || !record(data.floors)) throw new Error('formato');
      state = normalizeState(data);
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

let inventoryOpen = true;
function setInventoryOpen(open) {
  inventoryOpen = open;
  document.getElementById('sidebar').classList.toggle('collapsed', !open);
  const btn = document.getElementById('btn-catalog');
  btn.classList.toggle('active', open);
  btn.setAttribute('aria-expanded', String(open));
  btn.title = open ? 'Cerrar catálogo' : 'Abrir catálogo de construcción';
}
function addSection(panel, title) {
  const el = document.createElement('h3');
  el.className = 'panel-section-title';
  el.textContent = title;
  panel.appendChild(el);
}

function itemButton(mode, id, def) {
  const b = document.createElement('button');
  b.className = 'item-btn' + (mode === 'delete' ? ' tool-danger' : '');
  b.dataset.mode = mode; b.dataset.id = id;
  b.title = `${def.name}${def.cost != null ? ` · ${fmt(def.cost)}` : ''}`;
  const price = def.cost != null ? `<span class="price">${fmt(def.cost)}</span>` : `<span class="price free">gratis</span>`;
  b.innerHTML = `<span class="ico">${def.ico}</span><span class="name">${def.name}</span>${price}`;
  b.addEventListener('click', () => {
    if (tool && tool.mode === mode && tool.id === id) selectTool(null);
    else selectTool({ mode, id });
    setInventoryOpen(false);
  });
  return b;
}

function buildUI() {
  const pC = document.querySelector('[data-panel="construccion"]');
  let lastSection = '';
  for (const [id, def] of Object.entries(BUILD_ITEMS)) {
    if (def.section !== lastSection) { addSection(pC, def.section); lastSection = def.section; }
    pC.appendChild(itemButton('build', id, def));
  }

  const pM = document.querySelector('[data-panel="muebles"]');
  const pD = document.querySelector('[data-panel="decoracion"]');
  const pE = document.querySelector('[data-panel="exterior"]');
  for (const [id, def] of Object.entries(FURNITURE)) {
    const panel = def.out ? pE : (def.decor ? pD : pM);
    panel.appendChild(itemButton('furniture', id, def));
  }

  const pH = document.querySelector('[data-panel="herramientas"]');
  pH.appendChild(itemButton('select', 'select', { name: 'Seleccionar', ico: '🖐️' }));
  pH.appendChild(itemButton('paint', 'paint', { name: 'Pintar', ico: '🎨' }));
  pH.appendChild(itemButton('delete', 'delete', { name: 'Vender', ico: '🧹' }));
  pH.appendChild(itemButton('hammer', 'hammer', { name: 'Mazo', ico: '🔨' }));
  initSelectPanel();

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
    s.className = 'swatch';
    s.title = i === 0 ? 'Blanco' : 'Usar este color';
    s.style.background = '#' + c.toString(16).padStart(6, '0');
    s.addEventListener('click', () => {
      selectedColor = c;
      selectedColorCustom = true;
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
  clearSelection();
  setInventoryOpen(false);
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
function refreshGhost() {
  if (!ghost || !tool || !hover || tool.mode === 'paint' || tool.mode === 'delete') {
    if (ghost) ghost.visible = false;
    return;
  }
  ghost.visible = true;
  if (tool.mode === 'build' && BUILD_ITEMS[tool.id].kind === 'wall') {
    if (!hover.edgeKey) { ghost.visible = false; return; }
    const t = wallTransform(hover.edgeKey);
    ghost.position.set(t.x, 0, t.z);
    ghost.rotation.y = t.ry;
  } else if (tool.mode === 'build') {
    const def = BUILD_ITEMS[tool.id];
    ghost.position.set(hover.cx + 0.5 - S / 2, 0, hover.cz + 0.5 - S / 2);
    ghost.rotation.y = def.rotatable ? toolRot * Math.PI / 2 : 0;
  } else {
    const def = FURNITURE[tool.id];
    const w = toolRot % 2 ? def.d : def.w, d = toolRot % 2 ? def.w : def.d;
    ghost.position.set(hover.cx + w / 2 - S / 2, 0, hover.cz + d / 2 - S / 2);
    ghost.rotation.y = toolRot * Math.PI / 2;
  }
  setGhostValid(canPlace());
}
function updatePlacementHover(e) {
  if (walkMode || !tool || ['paint', 'delete', 'select', 'hammer'].includes(tool.mode)) {
    if (ghost) ghost.visible = false;
    hover = null;
    return;
  }
  const p = pickGround(e);
  if (!p) { hover = null; if (ghost) ghost.visible = false; return; }
  const cellOk = p.cx >= 0 && p.cx < S && p.cz >= 0 && p.cz < S;
  hover = { ...p, cellOk, cellKey: p.cx + ',' + p.cz, edgeKey: nearestEdge(p) };
  refreshGhost();
}
function rotateTool() {
  const rotatableBuild = tool?.mode === 'build' && BUILD_ITEMS[tool.id]?.rotatable;
  if (!tool || (tool.mode !== 'furniture' && !rotatableBuild)) return;
  toolRot = (toolRot + 1) % 4;
  updateRotationUI();
  refreshGhost(); // la previsualización se actualiza aunque el ratón esté quieto
  snd.click();
}

let downPos = null;
let placementPointer = null;
canvas.addEventListener('pointerdown', e => {
  downPos = { x: e.clientX, y: e.clientY };
  if (!walkMode && tool && e.button === 0) {
    // OrbitControls escucha el mismo canvas. Desactivar solo el giro de este
    // puntero evita que un clic de colocación desplace accidentalmente la cámara.
    placementPointer = e.pointerId;
    controls.enableRotate = false;
  }
}, { capture: true });
canvas.addEventListener('pointerup', e => {
  if (placementPointer === e.pointerId) {
    placementPointer = null;
    controls.enableRotate = true;
  }
  if (walkMode) return;
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved > 6 || e.button !== 0) return;
  if (!tool) return;
  if (tool.mode === 'paint') paintAt(e);
  else if (tool.mode === 'delete') deleteAt(e);
  else if (tool.mode === 'hammer') hammerAt(e);
  else if (tool.mode === 'select') selectAt(e);
  else { updatePlacementHover(e); place(); }
});
canvas.addEventListener('pointercancel', e => {
  if (placementPointer === e.pointerId) {
    placementPointer = null;
    controls.enableRotate = true;
  }
  downPos = null;
});
canvas.addEventListener('pointermove', updatePlacementHover);

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyR') {
    if (selection && selection.kind === 'object') { e.preventDefault(); rotateSelected(); }
    else if (tool && tool.mode === 'furniture') { e.preventDefault(); rotateTool(); }
  }
  if (e.code === 'Escape' && !walkMode) {
    if (selection) clearSelection();
    else selectTool(null);
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* Botones superiores */
document.getElementById('btn-catalog').addEventListener('click', () => {
  setInventoryOpen(!inventoryOpen);
  snd.click();
});
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
document.getElementById('btn-rotate').addEventListener('click', rotateTool);
document.getElementById('btn-cancel').addEventListener('click', () => selectTool(null));

/* ---------------- Inicio ---------------- */
async function startGame() {
  await Promise.all([preloadPremiumAssets(), loadImageSurfaces()]);
  refreshWorldGround();
  initSkyCycle();
  buildUI();
  if (loadGame()) rebuildAll();
  updateMoney();
  renderMissions();
  if (!localStorage.getItem(HELP_KEY)) document.getElementById('help-modal').classList.remove('hidden');
  setLoaderMessage('Tu parcela está lista');

  const l = document.getElementById('loader');
  window.setTimeout(() => {
    if (!l) return;
    l.classList.add('fade');
    window.setTimeout(() => l.remove(), 700);
  }, 220);
}

const clock = new THREE.Clock();
let elapsed = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  elapsed += dt;
  if (walkMode) updateWalk(dt);
  else controls.update();
  updateDayNight(dt);
  runObjAnims(elapsed);
  updateEnv(elapsed, dt);
  updateParticles(dt);
  if (selHelper) {
    selHelper.material.opacity = 0.55 + 0.35 * Math.sin(elapsed * 5);
    selHelper.update();
  }
  renderer.render(scene, camera);
}
animate();
startGame().catch(err => {
  console.error('No se pudo iniciar Mi Hogar 3D', err);
  setLoaderMessage('No se pudo preparar la parcela. Recarga la página.');
});
