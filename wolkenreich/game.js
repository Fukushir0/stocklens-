'use strict';
/* Wolkenreich – Engine */
(() => {
const { CLASSES, SKILLS, ITEMS, MOBS, ZONES, ISLANDS, NPCS, QUESTS, HAIRS, MAXLVL, expNeed } = WR;
const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const SAVE_KEY = 'wolkenreich_save_v1';
const WATER = -3;

/* ---------- Welt-Geometrie ---------- */
function terrainH(x, z) {
  const d = Math.hypot(x, z);
  let h = 7 * Math.sin(x * 0.013) * Math.cos(z * 0.011) + 3.5 * Math.sin(x * 0.031 + 1.3) * Math.sin(z * 0.027 + 0.5) + 0.8 * Math.sin(x * 0.09) * Math.cos(z * 0.08);
  h = h * smooth(30, 90, d) + 1.5;
  h -= smooth(400, 480, d) * 40;
  return h;
}
function islandAt(x, z) { for (const i of ISLANDS) if (Math.hypot(x - i.x, z - i.z) < i.r - 0.5) return i; return null; }
function groundAt(x, z, y) {
  const g = terrainH(x, z), i = islandAt(x, z);
  return i && y >= i.y - 1.5 ? i.y : g;
}

/* ---------- Renderer ---------- */
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc9f5);
scene.fog = new THREE.Fog(0xa9d6f7, 160, 560);
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 1200);
scene.add(new THREE.HemisphereLight(0xdff1ff, 0x6a7a50, 0.95));
const sun = new THREE.DirectionalLight(0xfff2d6, 0.9); sun.position.set(120, 200, 80); scene.add(sun);
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize); resize();

const matCache = {};
function mat(c, o) { const k = c + (o ? JSON.stringify(o) : ''); return matCache[k] || (matCache[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true }, o))); }
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(0.5, 12, 9), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cone: new THREE.ConeGeometry(0.5, 1, 10), hemi: new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.45),
  cap: new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), tor: new THREE.TorusGeometry(0.5, 0.06, 6, 20),
  dod: new THREE.DodecahedronGeometry(0.5), oct: new THREE.OctahedronGeometry(0.5), pyr: new THREE.ConeGeometry(0.5, 1, 4),
};
function part(parent, geo, color, x, y, z, sx, sy, sz, o) {
  const m = new THREE.Mesh(GEO[geo], mat(color, o)); m.position.set(x, y, z);
  m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz); parent.add(m); return m;
}
const GLOW = c => ({ emissive: c, emissiveIntensity: 0.9 });
const PICK = { transparent: true, opacity: 0, depthWrite: false };

const groundMeshes = [];
function buildWorld() {
  // Terrain
  const SEG = 200, geo = new THREE.PlaneGeometry(1000, 1000, SEG, SEG); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = terrainH(x, z); pos.setY(i, h);
    let c = [0.36, 0.66, 0.32];
    for (const zn of ZONES) { const w = 1 - smooth(zn.r * 0.55, zn.r * 1.2, Math.hypot(x - zn.x, z - zn.z)); c = c.map((v, k) => v + (zn.col[k] - v) * w); }
    const d = Math.hypot(x, z), tw = 1 - smooth(22, 34, d); c = c.map((v, k) => v + ([0.8, 0.72, 0.52][k] - v) * tw);
    const sw = 1 - smooth(-2.6, -0.8, h); c = c.map((v, k) => v + ([0.86, 0.8, 0.6][k] - v) * sw);
    const j = rnd(-0.035, 0.035); cols[i * 3] = c[0] + j; cols[i * 3 + 1] = c[1] + j; cols[i * 3 + 2] = c[2] + j;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  scene.add(terrain); groundMeshes.push(terrain);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ color: 0x3a8fd6, transparent: true, opacity: 0.82 }));
  water.rotation.x = -Math.PI / 2; water.position.y = WATER; scene.add(water);

  // Himmelsinseln
  for (const i of ISLANDS) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(i.r, i.r * 0.86, 4, 22), mat(0x7ccf6a)); top.position.set(i.x, i.y - 2, i.z); scene.add(top); groundMeshes.push(top);
    const bot = new THREE.Mesh(new THREE.ConeGeometry(i.r * 0.86, i.r * 1.1, 14), mat(0x7a6048)); bot.rotation.x = Math.PI; bot.position.set(i.x, i.y - 4 - i.r * 0.55, i.z); scene.add(bot);
    for (let k = 0; k < 5; k++) { const a = rnd(0, 6.28), r = rnd(i.r * 0.7, i.r * 0.92); part(scene, 'oct', 0x9fe8ff, i.x + Math.cos(a) * r, i.y + 1.6, i.z + Math.sin(a) * r, 1.4, 3.2, 1.4, GLOW(0x4fc8ff)); }
  }

  // Instanzierte Deko
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  function inst(geom, material, list) {
    const m = new THREE.InstancedMesh(geom, material, list.length);
    list.forEach((o, i) => { dummy.position.set(o.x, o.y, o.z); dummy.scale.set(o.sx, o.sy, o.sx); dummy.rotation.set(0, o.ry || 0, 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); if (o.c !== undefined) m.setColorAt(i, col.setHex(o.c)); });
    scene.add(m); return m;
  }
  const inZone = (id, x, z, f = 1) => { const zn = ZONES.find(q => q.id === id); return Math.hypot(x - zn.x, z - zn.z) < zn.r * f; };
  const trunks = [], leaves = [], rocks = [], stems = [], caps = [], crystals = [];
  const tree = (x, z, y, dark) => { const s = rnd(0.8, 1.5); trunks.push({ x, y: y + 2 * s, z, sx: s, sy: s }); leaves.push({ x, y: y + 6.5 * s, z, sx: s, sy: s, ry: rnd(0, 6), c: dark ? [0x1f5a37, 0x245f45, 0x2b6b3a][rint(0, 2)] : [0x3fa34d, 0x55b85a, 0x2f8f4a][rint(0, 2)] }); };
  for (let n = 0; n < 900; n++) {
    const x = rnd(-430, 430), z = rnd(-430, 430), d = Math.hypot(x, z), h = terrainH(x, z);
    if (d < 42 || d > 420 || h < -1.2) continue;
    if (inZone('fels', x, z, 1.1)) { const s = rnd(1.5, 5); rocks.push({ x, y: h + s * 0.3, z, sx: s, sy: s * rnd(0.6, 1.3), ry: rnd(0, 6), c: 0x8e9aa6 }); }
    else if (inZone('glut', x, z, 1.1)) { if (n % 2) { const s = rnd(1.5, 4); rocks.push({ x, y: h + s * 0.3, z, sx: s, sy: s, ry: rnd(0, 6), c: 0x3a2a26 }); } else crystals.push({ x, y: h + 1.2, z, sx: rnd(0.8, 1.6), sy: rnd(2.5, 5) }); }
    else if (inZone('hain', x, z, 1.1)) { const s = rnd(1, 2.6); stems.push({ x, y: h + 1.5 * s, z, sx: s, sy: s }); caps.push({ x, y: h + 3 * s, z, sx: s, sy: s, c: [0xd9534f, 0xb56ad6, 0xe98a3a][rint(0, 2)] }); }
    else if (inZone('wald', x, z, 1.15)) { tree(x, z, h, true); tree(x + rnd(-9, 9), z + rnd(-9, 9), terrainH(x, z), true); }
    else if (inZone('wiese', x, z, 0.9)) { if (n % 4 === 0) tree(x, z, h, false); }
    else if (n % 2) tree(x, z, h, false);
    else if (n % 9 === 0) { const s = rnd(1, 3); rocks.push({ x, y: h + s * 0.3, z, sx: s, sy: s, ry: rnd(0, 6), c: 0x9aa7b5 }); }
  }
  for (const i of ISLANDS) for (let k = 0; k < 6; k++) { const a = rnd(0, 6.28), r = rnd(i.r * 0.5, i.r * 0.85); tree(i.x + Math.cos(a) * r, i.z + Math.sin(a) * r, i.y, false); }
  inst(new THREE.CylinderGeometry(0.4, 0.65, 4, 6), mat(0x7a5236), trunks);
  inst(new THREE.ConeGeometry(3, 7, 7), mat(0xffffff), leaves);
  inst(GEO.dod, mat(0xffffff), rocks);
  inst(new THREE.CylinderGeometry(0.45, 0.6, 3, 8), mat(0xf2ead8), stems);
  inst(new THREE.SphereGeometry(2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff), caps);
  inst(GEO.pyr, new THREE.MeshBasicMaterial({ color: 0xff8a3a }), crystals);

  // Dorf
  const roofs = [0xc0453c, 0x3a6ad6, 0x3f9a55, 0xd6a53a, 0x8e5bd0, 0xc0453c];
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + 0.5, x = Math.cos(a) * 30, z = Math.sin(a) * 30, g = new THREE.Group();
    part(g, 'box', 0xf3e6c8, 0, 2.5, 0, 8, 5, 7); const r = part(g, 'pyr', roofs[k], 0, 7, 0, 12.5, 4, 11); r.rotation.y = Math.PI / 4;
    part(g, 'box', 0x6b4a2e, 0, 1.3, 3.55, 1.6, 2.6, 0.2); part(g, 'box', 0x9fd8ff, 2.5, 3, 3.55, 1.3, 1.3, 0.2, GLOW(0x335577));
    g.position.set(x, 1.5, z); g.rotation.y = Math.atan2(-x, -z); scene.add(g);
  }
  part(scene, 'cyl', 0xcfd6e6, 0, 1.9, 0, 5, 0.8, 5);
  world.crystal = part(scene, 'oct', 0x9fe8ff, 0, 5.2, 0, 2.2, 4, 2.2, GLOW(0x4fc8ff));

  // Wolken
  for (let k = 0; k < 34; k++) {
    const g = new THREE.Group(), n = rint(3, 5);
    for (let q = 0; q < n; q++) part(g, 'sph', 0xffffff, q * 7 - n * 3.5, rnd(-1, 1), rnd(-3, 3), rnd(9, 15), rnd(5, 8), rnd(8, 12), { transparent: true, opacity: 0.88 });
    g.position.set(rnd(-600, 600), k < 10 ? rnd(35, 55) : rnd(120, 180), rnd(-600, 600)); scene.add(g); world.clouds.push(g);
  }
}
const world = { clouds: [], crystal: null };

/* ---------- Modelle ---------- */
function eyes(g, y, z, sp, s, c) { part(g, 'sph', c || 0x1a1a2a, -sp, y, z, s); part(g, 'sph', c || 0x1a1a2a, sp, y, z, s); }
function buildHuman(color, hair) {
  const g = new THREE.Group(), o = { g };
  o.body = part(g, 'box', color, 0, 1.4, 0, 0.95, 1.05, 0.6);
  part(g, 'sph', 0xffd9b8, 0, 2.4, 0, 1.05);
  o.hair = part(g, 'hemi', hair, 0, 2.42, -0.02, 1.2); o.hair2 = part(g, 'box', hair, 0, 2.3, -0.42, 0.95, 0.75, 0.3);
  eyes(g, 2.36, 0.47, 0.2, 0.13);
  const limb = (x, y, c, w, h) => { const p = new THREE.Group(); p.position.set(x, y, 0); part(p, 'box', c, 0, -h / 2, 0, w, h, w + 0.05); g.add(p); return p; };
  o.legL = limb(-0.25, 0.9, 0x33415c, 0.34, 0.9); o.legR = limb(0.25, 0.9, 0x33415c, 0.34, 0.9);
  o.armL = limb(-0.63, 1.85, color, 0.27, 0.85); o.armR = limb(0.63, 1.85, color, 0.27, 0.85);
  o.wpn = new THREE.Group(); o.wpn.position.set(0, -0.85, 0.1); o.wpn.rotation.x = Math.PI / 2; o.armR.add(o.wpn);
  o.board = part(g, 'box', 0x4fc0a8, 0, -0.12, 0, 0.9, 0.14, 2.6, GLOW(0x1a6a5a)); o.board.visible = false;
  return o;
}
function setWeapon(h, wt) {
  while (h.wpn.children.length) h.wpn.remove(h.wpn.children[0]);
  if (wt === 'sword') { part(h.wpn, 'box', 0xdfe6f2, 0, 0.8, 0, 0.14, 1.4, 0.05); part(h.wpn, 'box', 0xd9b765, 0, 0.12, 0, 0.5, 0.1, 0.12); }
  else if (wt === 'staff') { part(h.wpn, 'cyl', 0x7a5236, 0, 0.5, 0, 0.1, 2.2, 0.1); part(h.wpn, 'oct', 0x9fe8ff, 0, 1.75, 0, 0.4, 0.55, 0.4, GLOW(0x4fc8ff)); }
  else if (wt === 'bow') { const t = part(h.wpn, 'tor', 0x8a5a2a, 0, 0.3, 0, 1.6, 1.6, 2.5); t.rotation.y = Math.PI / 2; part(h.wpn, 'cyl', 0xffffff, 0, 0.3, -0.05, 0.03, 1.5, 0.03); }
}
const MODELS = {
  blob(g, c) { const b = part(g, 'sph', c, 0, 0.7, 0, 1.7, 1.35, 1.7); eyes(g, 0.85, 0.72, 0.28, 0.2); part(g, 'cone', 0x4fae5a, 0, 1.5, 0, 0.3, 0.5, 0.3); return b; },
  mushroom(g, c) { part(g, 'cyl', 0xf2ead8, 0, 0.6, 0, 0.9, 1.2, 0.9); const cap = part(g, 'cap', c, 0, 1.1, 0, 2.2, 1.6, 2.2); for (let i = 0; i < 5; i++) part(g, 'sph', 0xffffff, Math.cos(i * 1.26) * 0.7, 1.62, Math.sin(i * 1.26) * 0.7, 0.3, 0.12, 0.3); eyes(g, 0.75, 0.44, 0.2, 0.15); return cap; },
  crab(g, c) { const b = part(g, 'sph', c, 0, 0.6, 0, 2.2, 0.9, 1.5); part(g, 'sph', c, -1.3, 0.8, 0.7, 0.8, 0.6, 0.9); part(g, 'sph', c, 1.3, 0.8, 0.7, 0.8, 0.6, 0.9); for (let i = -1; i <= 1; i += 2) for (let k = 0; k < 3; k++) part(g, 'box', 0x6a7684, i * 1.2, 0.25, -0.5 + k * 0.45, 0.7, 0.14, 0.14); eyes(g, 1.2, 0.5, 0.25, 0.2); return b; },
  golem(g, c) { const b = part(g, 'dod', c, 0, 1.5, 0, 2, 2.1, 1.6); part(g, 'dod', c, 0, 2.85, 0.1, 1); part(g, 'dod', 0x6e6252, -1.25, 1.4, 0, 0.8, 1.7, 0.8); part(g, 'dod', 0x6e6252, 1.25, 1.4, 0, 0.8, 1.7, 0.8); part(g, 'box', 0x6e6252, -0.5, 0.3, 0, 0.7, 0.7, 0.8); part(g, 'box', 0x6e6252, 0.5, 0.3, 0, 0.7, 0.7, 0.8); eyes(g, 2.9, 0.52, 0.2, 0.14, 0xffd23c); return b; },
  wolf(g, c) { const b = part(g, 'box', c, 0, 1.0, 0, 0.9, 0.9, 2.1); part(g, 'box', c, 0, 1.45, 1.2, 0.8, 0.75, 0.9); part(g, 'box', c, 0, 1.3, 1.8, 0.4, 0.35, 0.5); part(g, 'pyr', c, -0.25, 2.0, 1.1, 0.25, 0.45, 0.25); part(g, 'pyr', c, 0.25, 2.0, 1.1, 0.25, 0.45, 0.25); for (let i = -1; i <= 1; i += 2) for (let k = -1; k <= 1; k += 2) part(g, 'box', c, i * 0.32, 0.35, k * 0.75, 0.24, 0.75, 0.24); const t = part(g, 'box', c, 0, 1.35, -1.3, 0.22, 0.22, 0.9); t.rotation.x = 0.6; eyes(g, 1.55, 1.66, 0.22, 0.12, 0xff3a3a); return b; },
  wisp(g, c) { const b = part(g, 'sph', c, 0, 1.6, 0, 1.0, 1.0, 1.0, GLOW(c)); part(g, 'sph', c, 0, 1.6, 0, 1.6, 1.6, 1.6, { transparent: true, opacity: 0.25 }); for (let i = 0; i < 3; i++) part(g, 'sph', 0xffffff, Math.cos(i * 2.1) * 0.9, 1.3 + i * 0.3, Math.sin(i * 2.1) * 0.9, 0.2, 0.2, 0.2, GLOW(0xffffff)); eyes(g, 1.65, 0.45, 0.16, 0.1); return b; },
  beetle(g, c) { const b = part(g, 'sph', 0x2a1c1a, 0, 0.75, 0, 1.6, 1.1, 2.2); part(g, 'sph', c, 0, 0.95, -0.15, 1.4, 0.9, 1.7, GLOW(c)); part(g, 'sph', 0x2a1c1a, 0, 0.7, 1.15, 0.8); const h = part(g, 'cone', 0x2a1c1a, 0, 1.2, 1.5, 0.22, 0.9, 0.22); h.rotation.x = 0.7; for (let i = -1; i <= 1; i += 2) for (let k = 0; k < 3; k++) part(g, 'box', 0x2a1c1a, i * 0.95, 0.25, -0.6 + k * 0.6, 0.7, 0.1, 0.1); eyes(g, 0.85, 1.5, 0.2, 0.1, 0xffd23c); return b; },
  ghost(g, c) { const o = { transparent: true, opacity: 0.8 }; const b = part(g, 'cone', c, 0, 1.3, 0, 1.6, 2.2, 1.6, o); part(g, 'sph', c, 0, 2.5, 0, 1.3, 1.3, 1.3, o); part(g, 'box', c, -0.9, 1.8, 0.2, 0.9, 0.2, 0.25, o); part(g, 'box', c, 0.9, 1.8, 0.2, 0.9, 0.2, 0.25, o); eyes(g, 2.55, 0.56, 0.24, 0.2, 0xff5a2a); return b; },
  guardian(g, c) { const b = part(g, 'sph', c, 0, 1.8, 0, 1.5, 1.7, 1.3); part(g, 'sph', 0xdfe9ff, 0, 3.0, 0, 0.95); const h = part(g, 'tor', 0xffe07a, 0, 3.75, 0, 1, 1, 1, GLOW(0xffc23a)); h.rotation.x = Math.PI / 2; const wl = part(g, 'box', 0xbfe0ff, -1.5, 2.2, -0.3, 1.9, 0.9, 0.12); wl.rotation.z = 0.5; const wr = part(g, 'box', 0xbfe0ff, 1.5, 2.2, -0.3, 1.9, 0.9, 0.12); wr.rotation.z = -0.5; g.userData.wings = [wl, wr]; part(g, 'cyl', 0xd9b765, 0.95, 1.8, 0.5, 0.1, 2.6, 0.1); eyes(g, 3.05, 0.42, 0.18, 0.1, 0x3a8ad6); return b; },
  boss(g, c) { const b = part(g, 'dod', c, 0, 1.7, 0, 2.3, 2.3, 1.8); part(g, 'dod', 0x4a5f9a, 0, 3.15, 0.1, 1.15); part(g, 'dod', 0x4a5f9a, -1.5, 1.7, 0, 0.95, 2.1, 0.95); part(g, 'dod', 0x4a5f9a, 1.5, 1.7, 0, 0.95, 2.1, 0.95); part(g, 'box', 0x4a5f9a, -0.6, 0.35, 0, 0.8, 0.8, 0.9); part(g, 'box', 0x4a5f9a, 0.6, 0.35, 0, 0.8, 0.8, 0.9); part(g, 'oct', 0x9fe8ff, 0, 1.8, 0.85, 0.7, 0.9, 0.4, GLOW(0x4fc8ff)); const h = part(g, 'tor', 0x9fe8ff, 0, 4.1, 0, 1.6, 1.6, 1.6, GLOW(0x4fc8ff)); h.rotation.x = Math.PI / 2; part(g, 'pyr', 0xd9b765, -0.4, 3.85, 0, 0.3, 0.8, 0.3); part(g, 'pyr', 0xd9b765, 0.4, 3.85, 0, 0.3, 0.8, 0.3); eyes(g, 3.2, 0.6, 0.24, 0.16, 0x7df9ff); return b; },
};
const FLOATERS = { wisp: 1, ghost: 1, guardian: 1 };

/* ---------- Spielzustand ---------- */
const p = {
  name: 'Wanderer', hair: HAIRS[0], cls: 'wanderer', lvl: 1, exp: 0, gold: 50, sp: 0,
  stats: { str: 10, sta: 10, dex: 10, int: 10 }, inv: [], equip: { weapon: null, armor: null, board: null },
  q: { i: 0, on: false, prog: 0 }, hp: 1, mp: 1,
  x: 0, y: 2, z: 16, vy: 0, rot: Math.PI, onGround: true, flying: false, dead: false,
  target: null, attacking: false, queued: null, moveTo: null, interact: null,
  atkT: 0, swing: 0, combatT: 0, potT: 0, cds: {}, buffs: [], walkT: 0, model: null,
};
const mobs = [], npcs = [], loots = [], projs = [], fxs = [];
const keys = {}; const cam = { yaw: 0, pitch: 0.42, dist: 14 };
let started = false, shopOpen = false, curNpc = null, zoneName = '';

const mod = k => p.buffs.reduce((a, b) => a * (b.m[k] || 1), 1);
const cls = () => CLASSES[p.cls];
const maxHP = () => Math.round((90 + p.lvl * 20 + p.stats.sta * 10) * cls().hpM);
const maxMP = () => Math.round(30 + p.lvl * 6 + p.stats.int * 7);
const eqVal = (slot, k) => { const e = p.equip[slot]; return e ? ITEMS[e.id][k] * (1 + 0.08 * (e.plus || 0)) : 0; };
const atkPower = () => (eqVal('weapon', 'atk') + p.stats[cls().stat] * 1.0 + p.lvl * 1.5) * mod('atk');
const defense = () => (eqVal('armor', 'def') + p.stats.sta * 0.5) * mod('def');
const critChance = () => Math.min(0.6, 0.05 + p.stats.dex * 0.003);
const atkInterval = () => clamp(1.25 - p.stats.dex * 0.006, 0.5, 1.25) / mod('aspd');
const mySkills = () => Object.keys(SKILLS).filter(k => SKILLS[k].cls === '*' || SKILLS[k].cls === p.cls);

/* ---------- Audio ---------- */
let actx = null;
function beep(f, d = 0.08, type = 'square', v = 0.04, slide = 0) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f;
    if (slide) o.frequency.linearRampToValueAtTime(f + slide, actx.currentTime + d);
    g.gain.value = v; g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
  } catch (e) { /* kein Audio */ }
}

/* ---------- UI-Helfer ---------- */
function log(msg, c) { const d = document.createElement('div'); if (c) d.className = c; d.textContent = msg; const l = $('#log'); l.appendChild(d); while (l.children.length > 8) l.removeChild(l.firstChild); setTimeout(() => d.remove(), 9000); }
let centerT = 0;
function center(msg, sub) { const c = $('#center'); c.innerHTML = ''; c.append(msg); if (sub) { const s = document.createElement('small'); s.textContent = sub; c.appendChild(s); } c.classList.add('on'); clearTimeout(centerT); centerT = setTimeout(() => c.classList.remove('on'), 2600); }
const v3 = new THREE.Vector3();
function toScreen(x, y, z) { v3.set(x, y, z).project(camera); if (v3.z > 1 || v3.z < -1) return null; return { x: (v3.x * 0.5 + 0.5) * window.innerWidth, y: (-v3.y * 0.5 + 0.5) * window.innerHeight }; }
function floatText(txt, x, y, z, c) { const s = toScreen(x, y, z); if (!s) return; const d = document.createElement('div'); d.className = 'dmg ' + (c || ''); d.textContent = txt; d.style.left = (s.x + rnd(-14, 14)) + 'px'; d.style.top = s.y + 'px'; $('#labels').appendChild(d); setTimeout(() => d.remove(), 900); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function itemTip(id, plus) {
  const it = ITEMS[id]; let h = `<b>${it.icon} ${it.name}${plus ? ' +' + plus : ''}</b>`;
  if (it.atk) h += `<br>Angriff: ${Math.round(it.atk * (1 + 0.08 * (plus || 0)))}`;
  if (it.def) h += `<br>Verteidigung: ${Math.round(it.def * (1 + 0.08 * (plus || 0)))}`;
  if (it.hp) h += `<br>Stellt ${it.hp} Leben her`; if (it.mp) h += `<br>Stellt ${it.mp} Mana her`;
  if (it.speed) h += `<br>Fluggeschwindigkeit: ${it.speed}`;
  if (it.cls) h += `<br>Klasse: ${CLASSES[it.cls].name}`; if (it.lvl > 1) h += `<br>Ab Stufe ${it.lvl}`;
  if (it.desc) h += `<br><i>${it.desc}</i>`;
  return h + `<br><span class="muted">Verkaufswert: ${sellPrice(id)} Taler</span>`;
}
const sellPrice = id => ITEMS[id].type === 'misc' ? ITEMS[id].price : Math.round(ITEMS[id].price * 0.4);
const tipEl = $('#tip');
document.addEventListener('pointermove', e => {
  const t = e.target.closest ? e.target.closest('[data-tip]') : null;
  if (!t || e.pointerType === 'touch') { tipEl.classList.add('hidden'); return; }
  tipEl.innerHTML = t.dataset.tip; tipEl.classList.remove('hidden');
  tipEl.style.left = Math.min(e.clientX + 14, window.innerWidth - 250) + 'px'; tipEl.style.top = Math.max(8, e.clientY - tipEl.offsetHeight - 10) + 'px';
});

/* ---------- Inventar ---------- */
const stackable = id => !['weapon', 'armor', 'board'].includes(ITEMS[id].type);
const countItem = id => p.inv.reduce((a, s) => a + (s.id === id ? s.n : 0), 0);
function addItem(id, n = 1, plus = 0) {
  if (stackable(id)) { const s = p.inv.find(s => s.id === id); if (s) { s.n += n; renderInv(); return true; } }
  if (p.inv.length >= 36) { log('Dein Inventar ist voll!', 'r'); return false; }
  if (stackable(id)) p.inv.push({ id, n }); else for (let i = 0; i < n; i++) p.inv.push({ id, n: 1, plus });
  renderInv(); return true;
}
function removeItem(id, n = 1) { for (let i = p.inv.length - 1; i >= 0 && n > 0; i--) { const s = p.inv[i]; if (s.id !== id) continue; const k = Math.min(n, s.n); s.n -= k; n -= k; if (s.n <= 0) p.inv.splice(i, 1); } renderInv(); }
function useSlot(i) {
  const s = p.inv[i]; if (!s || p.dead) return; const it = ITEMS[s.id];
  if (shopOpen) { const n = it.type === 'misc' ? s.n : 1, g = sellPrice(s.id) * n; p.gold += g; s.n -= n; if (s.n <= 0) p.inv.splice(i, 1); log(`Verkauft: ${it.name}${n > 1 ? ' x' + n : ''} (+${g} Taler)`, 'g'); beep(880, 0.06); renderInv(); if (curNpc) openNpc(curNpc); return; }
  if (it.type === 'use') return usePotion(s.id);
  if (it.type === 'misc') return log(`${it.name}: Kann beim Händler verkauft werden.`);
  if ((it.lvl || 1) > p.lvl) return log(`Du brauchst Stufe ${it.lvl} für ${it.name}.`, 'r');
  if (it.cls && it.cls !== p.cls) return log(`Nur für ${CLASSES[it.cls].name}.`, 'r');
  const slot = it.type, old = p.equip[slot]; p.equip[slot] = { id: s.id, plus: s.plus || 0 }; p.inv.splice(i, 1);
  if (old) p.inv.push({ id: old.id, n: 1, plus: old.plus || 0 });
  log(`Ausgerüstet: ${it.name}`, 'p'); beep(520, 0.07, 'triangle'); refreshModel(); renderInv(); renderChar(); buildHotbar();
}
function usePotion(id) {
  if (p.dead || p.potT > 0 || !countItem(id)) return; const it = ITEMS[id];
  if (it.lvl && it.lvl > p.lvl) return log(`Du brauchst Stufe ${it.lvl} für ${it.name}.`, 'r');
  if (it.hp) { if (p.hp >= maxHP()) return; p.hp = Math.min(maxHP(), p.hp + it.hp); floatText('+' + it.hp, p.x, p.y + 3.4, p.z, 'heal'); }
  if (it.mp) { if (p.mp >= maxMP()) return; p.mp = Math.min(maxMP(), p.mp + it.mp); floatText('+' + it.mp + ' MP', p.x, p.y + 3.4, p.z, 'exp'); }
  p.potT = 1.2; removeItem(id, 1); beep(660, 0.1, 'sine', 0.05, 200);
}
const bestPot = k => ['hp2', 'hp1', 'apfel', 'mp2', 'mp1'].find(id => ITEMS[id][k] && countItem(id) && (ITEMS[id].lvl || 1) <= p.lvl);

function renderInv() {
  const b = $('#invBody'); if (!b || $('#winInv').classList.contains('hidden')) return;
  const eq = (slot, cap) => { const e = p.equip[slot]; return `<div><div class="cell" data-eq="${slot}" ${e ? `data-tip="${esc(itemTip(e.id, e.plus))}"` : ''}>${e ? ITEMS[e.id].icon : ''}${e && e.plus ? `<span class="pl">+${e.plus}</span>` : ''}</div><div class="cap">${cap}</div></div>`; };
  let h = `<div class="equip">${eq('weapon', 'Waffe')}${eq('armor', 'Rüstung')}${eq('board', 'Flugbrett')}</div>`;
  h += `<div class="muted" style="margin-bottom:6px">${shopOpen ? '🛒 Laden offen: Klick = <b>verkaufen</b>' : 'Klick = benutzen / ausrüsten'}</div><div class="grid">`;
  for (let i = 0; i < 36; i++) { const s = p.inv[i]; h += s ? `<div class="cell" data-i="${i}" data-tip="${esc(itemTip(s.id, s.plus))}">${ITEMS[s.id].icon}${s.n > 1 ? `<span class="n">${s.n}</span>` : ''}${s.plus ? `<span class="pl">+${s.plus}</span>` : ''}</div>` : '<div class="cell"></div>'; }
  b.innerHTML = h + `</div><div class="row" style="margin-top:8px"><span>💰 ${p.gold.toLocaleString('de-DE')} Taler</span><span class="muted">${p.inv.length}/36</span></div>`;
}
$('#invBody').addEventListener('click', e => {
  const c = e.target.closest('.cell'); if (!c) return;
  if (c.dataset.i !== undefined) useSlot(+c.dataset.i);
  else if (c.dataset.eq && p.equip[c.dataset.eq] && !shopOpen) { const s = c.dataset.eq, e2 = p.equip[s]; if (p.inv.length >= 36) return log('Dein Inventar ist voll!', 'r'); if (s === 'board' && p.flying) return log('Lande zuerst.', 'r'); p.inv.push({ id: e2.id, n: 1, plus: e2.plus || 0 }); p.equip[s] = null; refreshModel(); renderInv(); renderChar(); buildHotbar(); }
});

/* ---------- Charakterfenster ---------- */
function renderChar() {
  const b = $('#charBody'); if ($('#winChar').classList.contains('hidden')) return;
  const SN = { str: 'STR (Stärke)', sta: 'STA (Ausdauer)', dex: 'DEX (Geschick)', int: 'INT (Intelligenz)' };
  const ST = { str: 'Erhöht den Angriff von Wanderern und Klingenkämpfern.', sta: 'Mehr Leben und Verteidigung.', dex: 'Angriffstempo und kritische Treffer. Hauptwert der Waldläufer.', int: 'Mehr Mana. Hauptwert von Arkanisten und Klerikern.' };
  let h = `<div class="row"><b>${esc(p.name)}</b><span>${cls().name} · Stufe ${p.lvl}</span></div><h4>Attribute ${p.sp ? `<span style="color:#7dffb0">(${p.sp} Punkte frei)</span>` : ''}</h4>`;
  for (const k in SN) h += `<div class="row" data-tip="${ST[k]}"><span>${SN[k]}${cls().stat === k ? ' ★' : ''}</span><span>${p.stats[k]} ${p.sp ? `<button data-st="${k}">+</button>` : ''}</span></div>`;
  h += `<h4>Kampfwerte</h4><div class="row"><span>Angriff</span><span>${Math.round(atkPower())}</span></div><div class="row"><span>Verteidigung</span><span>${Math.round(defense())}</span></div><div class="row"><span>Kritische Treffer</span><span>${Math.round(critChance() * 100)} %</span></div><div class="row"><span>Angriffe pro Sekunde</span><span>${(1 / atkInterval()).toFixed(2)}</span></div><h4>Fertigkeiten</h4>`;
  for (const k of mySkills()) { const s = SKILLS[k], ok = p.lvl >= s.lvl; h += `<div class="row" style="${ok ? '' : 'opacity:.5'}"><span>${s.icon} <b>${s.name}</b><br><span class="muted">${s.desc} · ${s.mp} MP</span></span><span>${ok ? '✔' : 'St. ' + s.lvl}</span></div>`; }
  if (p.cls === 'wanderer') h += `<div class="muted" style="margin-top:6px">Ab Stufe 10 kannst du bei Meisterin Kaela eine Klasse wählen.</div>`;
  b.innerHTML = h;
}
$('#charBody').addEventListener('click', e => { const k = e.target.dataset.st; if (!k || p.sp <= 0) return; const n = e.shiftKey ? Math.min(5, p.sp) : 1; p.stats[k] += n; p.sp -= n; renderChar(); });

/* ---------- Quests ---------- */
const curQuest = () => QUESTS[p.q.i];
const questProg = () => { const q = curQuest(); return !q || !p.q.on ? 0 : q.collect ? Math.min(q.n, countItem(q.collect)) : p.q.prog; };
const questDone = () => { const q = curQuest(); return q && p.q.on && questProg() >= q.n; };
function questGoal(q) { return q.kill ? `Besiege ${q.n}× ${MOBS[q.kill].name}` : `Sammle ${q.n}× ${ITEMS[q.collect].name}`; }
function rewardText(q) { return `${q.exp.toLocaleString('de-DE')} EP, ${q.gold.toLocaleString('de-DE')} Taler` + q.items.map(i => `, ${i[1] > 1 ? i[1] + '× ' : ''}${ITEMS[i[0]].name}`).join(''); }
function renderQuests() {
  const b = $('#questBody'); if ($('#winQuest').classList.contains('hidden')) return; const q = curQuest();
  if (!q) b.innerHTML = '<b>Alle Quests abgeschlossen!</b><br>Du bist die Legende von Wolkenreich. 🏆';
  else if (!p.q.on) b.innerHTML = `<span class="muted">Keine aktive Quest.</span><br>Sprich mit <b>Älteste Mira</b> im Dorf Luminhafen${p.lvl < q.lvl ? ` (nächste Quest ab Stufe ${q.lvl})` : ''}.`;
  else b.innerHTML = `<h4>${q.name}</h4>${q.text}<h4>Ziel</h4>${questGoal(q)}: <b>${questProg()} / ${q.n}</b>${questDone() ? '<br><span style="color:#7dffb0">Erledigt – kehre zu Mira zurück!</span>' : ''}<h4>Belohnung</h4>${rewardText(q)}<div class="muted" style="margin-top:8px">Quest ${p.q.i + 1} von ${QUESTS.length}</div>`;
}

/* ---------- NPC-Dialoge ---------- */
function shopHtml(ids) {
  return ids.map(id => { const it = ITEMS[id]; return `<div class="shoprow" data-tip="${esc(itemTip(id))}"><span class="ic">${it.icon}</span><span class="nm">${it.name}<small>${it.atk ? 'Angriff ' + it.atk : it.def ? 'Verteidigung ' + it.def : it.hp ? '+' + it.hp + ' Leben' : it.mp ? '+' + it.mp + ' Mana' : 'Tempo ' + it.speed}${it.lvl > 1 ? ' · St. ' + it.lvl : ''}</small></span><button data-buy="${id}" ${p.gold < it.price ? 'disabled' : ''}>${it.price.toLocaleString('de-DE')} 💰</button></div>`; }).join('');
}
function upgradeInfo(slot) { const e = p.equip[slot]; if (!e) return null; const pl = e.plus || 0; return { e, pl, cost: Math.round(ITEMS[e.id].price * 0.15 * (pl + 1)) + 50, chance: Math.max(0.25, 1 - pl * 0.09), stones: 1 + Math.floor(pl / 4) }; }
function openNpc(n) {
  curNpc = n; shopOpen = n.id === 'tessa' || n.id === 'ivo'; $('#npcTitle').textContent = `${n.name} – ${n.role}`; let h = '';
  if (n.id === 'mira') {
    const q = curQuest();
    if (!q) h = 'Du hast alles vollbracht, was ich mir je erträumt habe. Wolkenreich ist sicher – dank dir!';
    else if (!p.q.on) h = p.lvl < q.lvl ? `Ich habe bald wieder eine Aufgabe für dich. Komm zurück, wenn du <b>Stufe ${q.lvl}</b> erreicht hast.` : `<h4>${q.name}</h4>${q.text}<h4>Ziel</h4>${questGoal(q)}<h4>Belohnung</h4>${rewardText(q)}<div class="npcbtns"><button data-act="accept">Quest annehmen</button></div>`;
    else if (questDone()) h = `<h4>${q.name}</h4>Wunderbar! Du hast es geschafft. Hier ist deine Belohnung:<br><b>${rewardText(q)}</b><div class="npcbtns"><button data-act="finish">Quest abschließen</button></div>`;
    else h = `<h4>${q.name}</h4>${q.text}<h4>Fortschritt</h4>${questGoal(q)}: <b>${questProg()} / ${q.n}</b>`;
  } else if (n.id === 'tessa') {
    const ids = Object.keys(ITEMS).filter(id => { const it = ITEMS[id]; return it.type === 'use' || ((it.type === 'weapon' || it.type === 'armor') && (!it.cls || it.cls === p.cls) && it.lvl <= p.lvl + 9); });
    h = `Willkommen! Sieh dich um. <span class="muted">(Zum Verkaufen im Inventar auf einen Gegenstand klicken.)</span><div style="margin-top:8px">${shopHtml(ids)}</div>`;
  } else if (n.id === 'ivo') {
    h = `Der Himmel ruft! Rüste ein Flugbrett aus und drücke <b>F</b>, um abzuheben. <b>Leertaste</b> steigt, <b>X</b> sinkt. Die Himmelsinseln liegen im Südosten.<div style="margin-top:8px">${shopHtml(['brett1', 'brett2'])}</div>`;
  } else if (n.id === 'borin') {
    h = `Ich mache deine Ausrüstung stärker – jede Stufe bringt <b>+8 %</b>. Dafür brauche ich Sternsplitter 💎 (du hast ${countItem('splitter')}) und Taler. Wenn es misslingt, sind nur die Materialien weg.`;
    for (const [slot, nm] of [['weapon', 'Waffe'], ['armor', 'Rüstung']]) { const u = upgradeInfo(slot); h += `<div class="shoprow"><span class="ic">${u ? ITEMS[u.e.id].icon : '–'}</span><span class="nm">${u ? ITEMS[u.e.id].name + ' +' + u.pl : nm + ': nichts ausgerüstet'}${u && u.pl < 10 ? `<small>→ +${u.pl + 1} · Chance ${Math.round(u.chance * 100)} % · ${u.stones} 💎 + ${u.cost.toLocaleString('de-DE')} Taler</small>` : u ? '<small>Maximal verbessert</small>' : ''}</span>${u && u.pl < 10 ? `<button data-up="${slot}" ${p.gold < u.cost || countItem('splitter') < u.stones ? 'disabled' : ''}>Verbessern</button>` : ''}</div>`; }
  } else if (n.id === 'kaela') {
    if (p.cls !== 'wanderer') h = `Du gehst den Weg des <b>${cls().name}</b>. Übe weiter – mit Stufe 14 und 20 lernst du neue Fertigkeiten.<br><br>Für ${(p.lvl * 60).toLocaleString('de-DE')} Taler setze ich deine Attributpunkte zurück.<div class="npcbtns"><button data-act="reset" ${p.gold < p.lvl * 60 ? 'disabled' : ''}>Attribute zurücksetzen</button></div>`;
    else if (p.lvl < 10) h = `Du hast Talent, Wanderer. Komm zu mir, wenn du <b>Stufe 10</b> erreicht hast – dann wähle deine Berufung.`;
    else { h = 'Es ist so weit. Wähle deinen Weg – die Entscheidung ist endgültig:'; for (const k in CLASSES) if (k !== 'wanderer') h += `<div class="shoprow"><span class="nm"><b>${CLASSES[k].name}</b><small>${CLASSES[k].desc}</small></span><button data-cls="${k}">Wählen</button></div>`; }
  }
  $('#npcBody').innerHTML = h; showWin('winNpc', true); if (shopOpen) showWin('winInv', true); renderInv();
}
$('#npcBody').addEventListener('click', e => {
  const d = e.target.dataset; if (e.target.tagName !== 'BUTTON') return;
  if (d.act === 'accept') { p.q.on = true; p.q.prog = 0; log(`Quest angenommen: ${curQuest().name}`, 'g'); beep(660, 0.12, 'triangle'); }
  else if (d.act === 'finish' && questDone()) {
    const q = curQuest(); if (p.inv.length + q.items.length > 36) return log('Dein Inventar ist zu voll für die Belohnung!', 'r');
    if (q.collect) removeItem(q.collect, q.n); p.gold += q.gold; q.items.forEach(i => addItem(i[0], i[1]));
    p.q = { i: p.q.i + 1, on: false, prog: 0 }; log(`Quest abgeschlossen: ${q.name}`, 'g'); center('Quest abgeschlossen!', q.name); beep(784, 0.25, 'triangle', 0.06, 400); gainExp(q.exp);
  } else if (d.buy) { const it = ITEMS[d.buy]; if (p.gold >= it.price && addItem(d.buy, 1)) { p.gold -= it.price; log(`Gekauft: ${it.name}`, 'g'); beep(880, 0.06); } }
  else if (d.up) {
    const u = upgradeInfo(d.up); if (!u || p.gold < u.cost || countItem('splitter') < u.stones) return;
    p.gold -= u.cost; removeItem('splitter', u.stones);
    if (Math.random() < u.chance) { u.e.plus = u.pl + 1; log(`Erfolg! ${ITEMS[u.e.id].name} ist jetzt +${u.e.plus}.`, 'p'); beep(700, 0.3, 'triangle', 0.06, 600); ring(p.x, p.y + 0.2, p.z, 0xffe07a, 4); }
    else { log('Die Verbesserung ist misslungen …', 'r'); beep(160, 0.3, 'sawtooth', 0.05, -80); }
    renderChar();
  } else if (d.cls) {
    p.cls = d.cls; const w = 'w_' + d.cls + '0'; if (p.equip.weapon) p.inv.push({ id: p.equip.weapon.id, n: 1, plus: p.equip.weapon.plus || 0 }); p.equip.weapon = { id: w, plus: 0 };
    p.hp = maxHP(); p.mp = maxMP(); center(cls().name + '!', 'Du hast deine Berufung gefunden.'); log(`Du bist jetzt ${cls().name} und erhältst: ${ITEMS[w].name}`, 'p');
    levelFx(); refreshModel(); buildHotbar(); renderChar();
  } else if (d.act === 'reset' && p.gold >= p.lvl * 60) { p.gold -= p.lvl * 60; let t = 0; for (const k in p.stats) { t += p.stats[k] - 10; p.stats[k] = 10; } p.sp += t; log('Attribute zurückgesetzt.', 'p'); renderChar(); }
  save(); if (curNpc) openNpc(curNpc); renderQuests();
});

/* ---------- Fenster ---------- */
function showWin(id, on) { const w = $('#' + id); w.classList.toggle('hidden', !on); if (!on && id === 'winNpc') { curNpc = null; shopOpen = false; renderInv(); } if (on) { renderChar(); renderInv(); renderQuests(); } }
const toggleWin = id => showWin(id, $('#' + id).classList.contains('hidden'));
document.querySelectorAll('.win .x').forEach(x => x.addEventListener('click', () => showWin(x.closest('.win').id, false)));
document.querySelectorAll('#menu button').forEach(b => b.addEventListener('click', () => toggleWin(b.dataset.win)));
const HELP = `<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> laufen · <b>Klick auf den Boden</b> läuft dorthin · <kbd>Leertaste</kbd> springen<br>
<b>Maus ziehen</b> dreht die Kamera · <b>Mausrad</b> zoomt<br>
<b>Klick auf Monster</b> wählt es aus, <b>zweiter Klick</b> oder <kbd>1</kbd> greift an · <kbd>Tab</kbd> nächstes Ziel<br>
<kbd>2</kbd>–<kbd>5</kbd> Fertigkeiten · <kbd>6</kbd> Heiltrank · <kbd>7</kbd> Manatrank<br>
<kbd>F</kbd> / <kbd>8</kbd> fliegen (Flugbrett nötig) – <kbd>Leertaste</kbd> steigen, <kbd>X</kbd> sinken<br>
<kbd>C</kbd> Charakter · <kbd>I</kbd> Inventar · <kbd>L</kbd> Quests · <kbd>H</kbd> Hilfe · <kbd>Esc</kbd> schließen<br>
<b>Klick auf Dorfbewohner</b> zum Reden. Der Spielstand wird automatisch gespeichert.`;
document.querySelectorAll('.helpBody').forEach(e => e.innerHTML = HELP);

/* ---------- Hotbar ---------- */
let slots = [];
function buildHotbar() {
  const sk = mySkills(); slots = [{ icon: p.equip.weapon ? ITEMS[p.equip.weapon.id].icon : '👊', tip: '<b>Angriff</b><br>Greift das gewählte Ziel an.', act: startAttack }];
  for (let i = 0; i < 4; i++) { const k = sk[i]; slots.push(k ? { skill: k, icon: SKILLS[k].icon, tip: `<b>${SKILLS[k].name}</b><br>${SKILLS[k].desc}<br>${SKILLS[k].mp} MP · Abklingzeit ${SKILLS[k].cd} s${p.lvl < SKILLS[k].lvl ? `<br><span style="color:#ff9a9a">Ab Stufe ${SKILLS[k].lvl}</span>` : ''}`, act: () => castSkill(k) } : { icon: '', tip: '', act() {} }); }
  slots.push({ pot: 'hp', icon: '🧪', tip: '<b>Heiltrank</b><br>Benutzt deinen besten Heilgegenstand.', act: () => { const id = bestPot('hp'); id ? usePotion(id) : log('Keine Heiltränke mehr!', 'r'); } });
  slots.push({ pot: 'mp', icon: '💧', tip: '<b>Manatrank</b><br>Benutzt deinen besten Manatrank.', act: () => { const id = bestPot('mp'); id ? usePotion(id) : log('Keine Manatränke mehr!', 'r'); } });
  slots.push({ fly: true, icon: '🛹', tip: '<b>Fliegen</b> (F)<br>Hebt mit dem Flugbrett ab oder landet.', act: toggleFly });
  const hb = $('#hotbar'); hb.innerHTML = '';
  slots.forEach((s, i) => { const d = document.createElement('div'); d.className = 'slot'; d.dataset.tip = s.tip; d.innerHTML = `<span class="k">${i + 1}</span><span class="ic">${s.icon}</span><span class="n"></span><span class="cd"></span>`; d.addEventListener('click', () => { if (started) s.act(); }); hb.appendChild(d); s.el = d; s.cdEl = d.querySelector('.cd'); s.nEl = d.querySelector('.n'); s.icEl = d.querySelector('.ic'); });
}
function updateHotbar() {
  for (const s of slots) {
    let off = false, cd = 0, n = '';
    if (s.skill) { const k = SKILLS[s.skill]; off = p.lvl < k.lvl || p.mp < k.mp; cd = (p.cds[s.skill] || 0) / k.cd; }
    else if (s.pot) { const id = bestPot(s.pot); off = !id; n = id ? countItem(id) : ''; if (id && s.icEl.textContent !== ITEMS[id].icon) s.icEl.textContent = ITEMS[id].icon; cd = p.potT / 1.2; }
    else if (s.fly) { off = !p.equip.board; s.el.classList.toggle('active', p.flying); }
    s.el.classList.toggle('off', off); s.cdEl.style.height = Math.round(clamp(cd, 0, 1) * 100) + '%'; if (s.nEl.textContent !== String(n)) s.nEl.textContent = n;
  }
}

/* ---------- Effekte ---------- */
function addFx(mesh, dur, upd) { scene.add(mesh); fxs.push({ mesh, t: 0, dur, upd }); }
function ring(x, y, z, color, radius, dur = 0.5) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 28), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.15, z); addFx(m, dur, k => { m.scale.setScalar(0.3 + k * radius); m.material.opacity = 1 - k; });
}
function burst(x, y, z, color, size = 1.4, dur = 0.25) {
  const m = new THREE.Mesh(GEO.sph, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false })); m.position.set(x, y, z);
  addFx(m, dur, k => { m.scale.setScalar(0.3 + k * size); m.material.opacity = 1 - k; });
}
function levelFx() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  addFx(m, 1.2, k => { m.position.set(p.x, p.y + 7, p.z); m.material.opacity = 0.6 * (1 - k); m.scale.set(1 + k, 1, 1 + k); m.rotation.y = k * 4; });
  ring(p.x, p.y, p.z, 0xffe07a, 9, 0.9); beep(523, 0.12, 'triangle', 0.06); setTimeout(() => beep(659, 0.12, 'triangle', 0.06), 110); setTimeout(() => beep(784, 0.3, 'triangle', 0.06), 220);
}
function shoot(from, target, color, onHit) {
  const m = new THREE.Mesh(GEO.sph, new THREE.MeshBasicMaterial({ color })); m.scale.setScalar(0.45); m.position.set(from.x, from.y + 1.8, from.z); scene.add(m);
  projs.push({ m, target, onHit });
}

/* ---------- Kampf: Spieler ---------- */
const mobCenterY = m => m.y + (FLOATERS[m.def.model] ? 1.2 : 0) + 1.1 * m.def.scale;
function calcDmg(mult, m) { let d = atkPower() * mult * rnd(0.9, 1.1); const crit = Math.random() < critChance(); if (crit) d *= 1.6; return { d: Math.max(1, Math.round(d - m.def.def * 0.5)), crit }; }
function hitMob(m, mult, o = {}) {
  if (m.dead) return; const r = calcDmg(mult, m); m.hp -= r.d; m.hitT = 0.15; p.combatT = 6;
  floatText(r.d + (r.crit ? '!' : ''), m.x, mobCenterY(m) + 1.2 * m.def.scale, m.z, r.crit ? 'crit' : ''); burst(m.x, mobCenterY(m), m.z, o.color || 0xffffff, 1.6 * m.def.scale);
  beep(r.crit ? 320 : 220, 0.06, 'square', 0.035, -90);
  if (o.stun) m.stun = o.stun; if (o.slow) m.slow = o.slow;
  if (m.state !== 'chase') m.state = 'chase';
  if (m.hp <= 0) killMob(m);
}
function deliver(m, mult, o = {}) { if (cls().range > 5) shoot(p, m, o.proj || cls().proj, () => hitMob(m, mult, o)); else hitMob(m, mult, o); }
function nearestMob(maxD, exclude) { let best = null, bd = maxD; for (const m of mobs) { if (m.dead || m === exclude) continue; const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < bd && Math.abs(m.y - p.y) < 12) { bd = d; best = m; } } return best; }
function setTarget(m) { p.target = m; if (!m) { p.attacking = false; p.queued = null; } }
function startAttack() {
  if (p.dead) return; if (p.flying) return log('Im Flug kannst du nicht kämpfen – lande zuerst (F).', 'r');
  if (!p.target || p.target.dead) setTarget(nearestMob(40)); if (!p.target) return log('Kein Ziel in der Nähe.');
  p.attacking = true; p.moveTo = null; p.interact = null;
}
function castSkill(k, fromQueue) {
  const s = SKILLS[k]; if (p.dead) return;
  if (p.lvl < s.lvl) return log(`${s.name} lernst du mit Stufe ${s.lvl}.`, 'r');
  if (p.cds[k] > 0) return; if (p.mp < s.mp) return log('Nicht genug Mana!', 'r');
  if (p.flying) return log('Im Flug kannst du nicht kämpfen – lande zuerst (F).', 'r');
  const needTarget = s.type === 'dmg' || (s.type === 'aoe' && s.center === 'target');
  if (needTarget) {
    if (!p.target || p.target.dead) setTarget(nearestMob(40)); const t = p.target; if (!t) return log('Kein Ziel in der Nähe.');
    if (Math.hypot(t.x - p.x, t.z - p.z) > cls().range + t.def.scale * 0.8) { if (!fromQueue) { p.queued = k; p.attacking = true; p.moveTo = null; } return; }
    p.rot = Math.atan2(t.x - p.x, t.z - p.z);
  }
  p.mp -= s.mp; p.cds[k] = s.cd; p.swing = 0.35; p.atkT = Math.max(p.atkT, 0.55); beep(440, 0.14, 'sawtooth', 0.04, 300);
  if (s.type === 'dmg') { deliver(p.target, s.mult, { stun: s.stun, proj: s.proj, color: s.proj || 0xffe07a }); p.attacking = true; }
  else if (s.type === 'aoe') {
    const c = s.center === 'self' ? p : p.target, col = s.slow ? 0x9fe8ff : 0xffb04a; ring(c.x, c.y, c.z, col, s.radius * 1.3, 0.6);
    for (const m of mobs) if (!m.dead && Math.hypot(m.x - c.x, m.z - c.z) <= s.radius + m.def.scale * 0.5 && Math.abs(m.y - c.y) < 8) hitMob(m, s.mult, { slow: s.slow, color: col });
  } else if (s.type === 'buff') { p.buffs = p.buffs.filter(b => b.id !== k); p.buffs.push({ id: k, icon: s.icon, name: s.name, t: s.dur, m: s.buff }); ring(p.x, p.y, p.z, 0x7dffb0, 5); log(`${s.name} aktiv.`, 'p'); renderChar(); }
  else if (s.type === 'heal') { const h = Math.round(maxHP() * s.heal + p.stats.int * 3); p.hp = Math.min(maxHP(), p.hp + h); floatText('+' + h, p.x, p.y + 3.4, p.z, 'heal'); ring(p.x, p.y, p.z, 0x7dff8e, 4); }
}
function gainExp(n) {
  if (p.lvl >= MAXLVL) return; p.exp += n; floatText(`+${n.toLocaleString('de-DE')} EP`, p.x, p.y + 4.2, p.z, 'exp');
  let up = false;
  while (p.lvl < MAXLVL && p.exp >= expNeed(p.lvl)) { p.exp -= expNeed(p.lvl); p.lvl++; p.sp += 3; up = true; for (const k of mySkills()) if (SKILLS[k].lvl === p.lvl) log(`Neue Fertigkeit gelernt: ${SKILLS[k].name}!`, 'p'); }
  if (p.lvl >= MAXLVL) p.exp = 0;
  if (up) { p.hp = maxHP(); p.mp = maxMP(); levelFx(); center(`Stufe ${p.lvl}!`, '+3 Attributpunkte (C)'); log(`Stufenaufstieg! Du bist jetzt Stufe ${p.lvl}.`, 'g'); if (p.lvl === 10 && p.cls === 'wanderer') log('Meisterin Kaela im Dorf kann dir jetzt eine Klasse geben!', 'g'); buildHotbar(); renderChar(); renderQuests(); save(); }
}
function killMob(m) {
  m.dead = true; m.g.visible = false; m.respawn = m.def.boss ? 150 : rnd(9, 14); if (p.target === m) setTarget(null);
  burst(m.x, mobCenterY(m), m.z, m.def.color, 4 * m.def.scale, 0.4); beep(140, 0.18, 'sawtooth', 0.05, -80);
  const diff = p.lvl - m.def.lvl; gainExp(Math.max(1, Math.round(m.def.exp * clamp(1 - (diff - 3) * 0.15, 0.1, 1))));
  dropLoot(m, { gold: rint(m.def.gold[0], m.def.gold[1]) });
  if (Math.random() < (m.def.boss ? 1 : 0.45)) dropLoot(m, { item: m.def.drop });
  if (Math.random() < (m.def.boss ? 1 : 0.025 + m.def.lvl * 0.002)) dropLoot(m, { item: 'splitter', n: m.def.boss ? 3 : 1 });
  if (Math.random() < 0.08) dropLoot(m, { item: m.def.lvl >= 15 ? 'hp2' : 'hp1' });
  const q = curQuest(); if (q && p.q.on && q.kill === m.def.id && p.q.prog < q.n) { p.q.prog++; log(`${q.name}: ${p.q.prog} / ${q.n}`, 'e'); if (p.q.prog >= q.n) { log('Quest erfüllt! Kehre zu Mira zurück.', 'g'); beep(784, 0.2, 'triangle', 0.05); } renderQuests(); }
  if (m.def.boss) center('Sturmkoloss bezwungen!', 'Die Himmelsinseln sind frei.');
}
function dropLoot(m, o) {
  const g = o.gold ? part(scene, 'cyl', 0xffd23c, 0, 0, 0, 0.7, 0.14, 0.7, GLOW(0x9a6a00)) : part(scene, 'box', 0xb56ad6, 0, 0, 0, 0.6, 0.6, 0.6, GLOW(0x5a2a8a));
  const a = rnd(0, 6.28), r = rnd(0.5, 2) * m.def.scale; loots.push(Object.assign({ g, x: m.x + Math.cos(a) * r, z: m.z + Math.sin(a) * r, y: m.y + 0.6, t: 0, n: 1 }, o));
}
function hurtPlayer(m) {
  if (p.dead) return; const d = Math.max(1, Math.round(m.def.atk * rnd(0.85, 1.15) - defense() * 0.5)); p.hp -= d; p.combatT = 6;
  floatText('-' + d, p.x, p.y + 3.2, p.z, 'hurt'); beep(110, 0.08, 'sawtooth', 0.04);
  if (!p.target && !p.flying) { setTarget(m); }
  if (p.hp <= 0) die();
}
function die() {
  p.hp = 0; p.dead = true; p.flying = false; p.attacking = false; p.moveTo = null; setTarget(null); p.model.g.rotation.x = -Math.PI / 2;
  const loss = Math.floor(p.exp * 0.05); p.exp -= loss; center('Du wurdest besiegt', 'Du erwachst gleich im Dorf …'); log(`Du wurdest besiegt und verlierst ${loss} EP.`, 'r');
  setTimeout(() => { p.dead = false; p.x = 0; p.z = 16; p.y = terrainH(0, 16); p.vy = 0; p.hp = Math.round(maxHP() * 0.5); p.mp = Math.round(maxMP() * 0.5); p.model.g.rotation.x = 0; p.buffs = []; for (const m of mobs) if (m.state === 'chase') m.state = 'return'; save(); }, 3500);
}
function toggleFly() {
  if (p.dead) return; if (p.flying) { p.flying = false; p.vy = 0; return; }
  const b = p.equip.board; if (!b) return log('Du brauchst ein Flugbrett. Frag Flugmeister Ivo im Dorf!', 'r');
  p.flying = true; p.attacking = false; p.queued = null; p.y += 1.2; p.vy = 0; ring(p.x, p.y - 1, p.z, 0x9fe8ff, 5); beep(300, 0.3, 'sine', 0.05, 500);
}

/* ---------- Monster ---------- */
function spawnMob(id, home) {
  const def = MOBS[id], g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  MODELS[def.model](inner, def.color); if (FLOATERS[def.model]) inner.position.y = 1.2;
  const pick = part(g, 'sph', 0xffffff, 0, 1.4, 0, 3.2, 3.6, 3.2, PICK);
  g.scale.setScalar(def.scale); scene.add(g);
  const m = { def, g, inner, pick, home, x: 0, y: 0, z: 0, rot: rnd(0, 6.28), hp: def.hp, state: 'idle', atkT: 0, wanderT: rnd(0, 4), tx: 0, tz: 0, dead: false, respawn: 0, stun: 0, slow: 0, hitT: 0, lunge: 0, animT: rnd(0, 10) };
  pick.userData.ent = m; pick.userData.kind = 'mob'; placeMob(m); mobs.push(m); return m;
}
function randomSpot(home) {
  for (let i = 0; i < 30; i++) { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * (home.r - (home.isl ? 6 : 0)), x = home.x + Math.cos(a) * r, z = home.z + Math.sin(a) * r; if (home.isl || terrainH(x, z) > -1.5) return { x, z }; }
  return { x: home.x, z: home.z };
}
function placeMob(m) { const s = m.def.boss ? { x: m.home.x, z: m.home.z } : randomSpot(m.home); m.x = m.sx = s.x; m.z = m.sz = s.z; m.tx = s.x; m.tz = s.z; m.y = m.home.isl ? m.home.y : terrainH(s.x, s.z); m.hp = m.def.hp; m.state = 'idle'; m.stun = m.slow = 0; m.g.position.set(m.x, m.y, m.z); m.g.rotation.y = m.rot; }
function moveMob(m, tx, tz, spd, dt) {
  const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz); if (d < 0.05) return true;
  const st = Math.min(d, spd * dt), nx = m.x + dx / d * st, nz = m.z + dz / d * st;
  if (m.home.isl) { if (Math.hypot(nx - m.home.x, nz - m.home.z) > m.home.r - 2) return true; } else if (terrainH(nx, nz) < -2.4) return true;
  m.x = nx; m.z = nz; m.rot = Math.atan2(dx, dz); if (!m.home.isl) m.y = terrainH(nx, nz); return d - st < 0.1;
}
function updateMob(m, dt) {
  if (m.dead) { m.respawn -= dt; if (m.respawn <= 0) { m.dead = false; m.g.visible = true; placeMob(m); } return; }
  const dx = p.x - m.x, dz = p.z - m.z, d = Math.hypot(dx, dz); if (d > 190 && m.state === 'idle') return;
  m.animT += dt; const mv = m.def.model;
  const reachable = !p.dead && Math.abs(p.y - m.y) < 6, spd = m.def.speed * (m.slow > 0 ? 0.45 : 1); if (m.slow > 0) m.slow -= dt;
  if (m.stun > 0) m.stun -= dt;
  else if (m.state === 'idle') {
    if (m.def.aggro && reachable && d < (m.def.boss ? 28 : 13)) m.state = 'chase';
    else if (!m.def.boss) { m.wanderT -= dt; if (m.wanderT <= 0) { m.wanderT = rnd(3, 8); m.tx = m.sx + rnd(-7, 7); m.tz = m.sz + rnd(-7, 7); } moveMob(m, m.tx, m.tz, spd * 0.35, dt); }
  } else if (m.state === 'chase') {
    if (!reachable || Math.hypot(m.x - m.sx, m.z - m.sz) > 55 || d > 65) m.state = 'return';
    else { const rng = 1.5 + m.def.scale * 0.9; if (d > rng) moveMob(m, p.x, p.z, spd, dt); m.rot = Math.atan2(dx, dz); m.atkT -= dt; if (d <= rng + 0.6 && m.atkT <= 0) { m.atkT = m.def.boss ? 2.2 : 1.7; m.lunge = 0.3; hurtPlayer(m); if (m.def.boss) ring(m.x, m.y, m.z, 0x9fe8ff, 12, 0.5); } }
  } else if (m.state === 'return') { m.hp = Math.min(m.def.hp, m.hp + m.def.hp * 0.3 * dt); if (moveMob(m, m.sx, m.sz, spd * 1.4, dt)) m.state = 'idle'; }
  // Animation
  if (m.hitT > 0) m.hitT -= dt; if (m.lunge > 0) m.lunge -= dt;
  const t = m.animT, i = m.inner; let by = 0;
  if (mv === 'blob') { const h = Math.abs(Math.sin(t * 3)); by = h * 0.5; i.scale.set(1 + (1 - h) * 0.12, 0.85 + h * 0.25, 1 + (1 - h) * 0.12); }
  else if (FLOATERS[mv]) { by = 1.2 + Math.sin(t * 2) * 0.3; if (m.g.userData.wings || i.userData.wings) { const w = i.userData.wings; w[0].rotation.z = 0.5 + Math.sin(t * 6) * 0.35; w[1].rotation.z = -0.5 - Math.sin(t * 6) * 0.35; } }
  else { by = Math.abs(Math.sin(t * 5)) * 0.08; i.rotation.z = Math.sin(t * 5) * 0.04; }
  i.position.y = by; i.position.z = m.lunge > 0 ? Math.sin(m.lunge / 0.3 * Math.PI) * 0.8 : 0;
  const sc = m.def.scale * (m.hitT > 0 ? 1.12 : 1); m.g.scale.setScalar(sc);
  m.g.position.set(m.x, m.y, m.z); let dr = m.rot - m.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); m.g.rotation.y += dr * Math.min(1, dt * 10);
}

/* ---------- NPCs ---------- */
function buildNpcs() {
  for (const n of NPCS) {
    const h = buildHuman(n.color, n.hair); n.y = terrainH(n.x, n.z); h.g.position.set(n.x, n.y, n.z); h.g.rotation.y = Math.atan2(-n.x, -n.z); h.g.scale.setScalar(1.05); scene.add(h.g);
    const pick = part(h.g, 'sph', 0xffffff, 0, 1.5, 0, 2.6, 3.6, 2.6, PICK); pick.userData.ent = n; pick.userData.kind = 'npc'; n.pick = pick; n.h = h;
    const l = document.createElement('div'); l.className = 'lbl'; $('#labels').appendChild(l); n.lbl = l; npcs.push(n);
  }
}
function npcMark(n) { if (n.id === 'mira') { const q = curQuest(); if (q && questDone()) return '?'; if (q && !p.q.on && p.lvl >= q.lvl) return '!'; } if (n.id === 'kaela' && p.cls === 'wanderer' && p.lvl >= 10) return '!'; return ''; }

/* ---------- Spieler ---------- */
function refreshModel() {
  if (p.model) scene.remove(p.model.g);
  p.model = buildHuman(cls().color, p.hair); setWeapon(p.model, p.equip.weapon ? ITEMS[p.equip.weapon.id].wt : null); scene.add(p.model.g);
  if (p.equip.board && p.equip.board.id === 'brett2') p.model.board.material = mat(0xffd23c, GLOW(0x8a5a00));
}
const selRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.1, 6, 28), new THREE.MeshBasicMaterial({ color: 0xff4a4a })); selRing.rotation.x = Math.PI / 2; selRing.visible = false; scene.add(selRing);
function updatePlayer(dt) {
  for (const k in p.cds) if (p.cds[k] > 0) p.cds[k] -= dt;
  if (p.potT > 0) p.potT -= dt; if (p.combatT > 0) p.combatT -= dt; if (p.swing > 0) p.swing -= dt; p.atkT -= dt;
  for (let i = p.buffs.length - 1; i >= 0; i--) { p.buffs[i].t -= dt; if (p.buffs[i].t <= 0) { log(`${p.buffs[i].name} ist abgelaufen.`); p.buffs.splice(i, 1); renderChar(); } }
  if (p.dead) return;
  p.hp = Math.min(maxHP(), p.hp + maxHP() * (p.combatT > 0 ? 0.003 : 0.03) * dt); p.mp = Math.min(maxMP(), p.mp + maxMP() * (p.combatT > 0 ? 0.012 : 0.04) * dt);
  if (p.target && p.target.dead) setTarget(null);

  let mx = 0, mz = 0; const f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0), s = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  if (f || s) { p.moveTo = null; p.attacking = false; p.queued = null; p.interact = null; const sn = Math.sin(cam.yaw), cs = Math.cos(cam.yaw); mx = -sn * f + cs * s; mz = -cs * f - sn * s; }
  else if (p.attacking && p.target) {
    const t = p.target, dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz), rng = cls().range + t.def.scale * 0.8;
    if (Math.abs(t.y - p.y) > 10) { p.attacking = false; }
    else if (d > rng * 0.92) { mx = dx; mz = dz; }
    else { p.rot = Math.atan2(dx, dz); if (p.queued) { const k = p.queued; p.queued = null; castSkill(k, true); } else if (p.atkT <= 0) { p.atkT = atkInterval(); p.swing = 0.3; deliver(t, 1); } }
  } else if (p.interact) {
    const n = p.interact, dx = n.x - p.x, dz = n.z - p.z; if (Math.hypot(dx, dz) < 4.5) { p.interact = null; p.rot = Math.atan2(dx, dz); openNpc(n); } else { mx = dx; mz = dz; }
  } else if (p.moveTo) { const dx = p.moveTo.x - p.x, dz = p.moveTo.z - p.z; if (Math.hypot(dx, dz) < 0.4) p.moveTo = null; else { mx = dx; mz = dz; } }

  const ml = Math.hypot(mx, mz); let moving = false;
  if (ml > 0.01) {
    const board = p.equip.board && ITEMS[p.equip.board.id], spd = p.flying ? board.speed : 9 * mod('spd'), st = spd * dt;
    let nx = p.x + mx / ml * st, nz = p.z + mz / ml * st; const dd = Math.hypot(nx, nz); if (dd > 470) { nx *= 470 / dd; nz *= 470 / dd; }
    const blocked = !p.flying && !islandAt(nx, nz) && terrainH(nx, nz) < WATER - 0.5 && p.y < 20;
    if (!blocked) { p.x = nx; p.z = nz; moving = true; } else p.moveTo = null;
    let dr = Math.atan2(mx, mz) - p.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); p.rot += dr * Math.min(1, dt * 14);
  }
  const g = groundAt(p.x, p.z, p.y);
  if (p.flying) {
    p.y += ((keys[' '] ? 1 : 0) - (keys.x ? 1 : 0)) * 16 * dt; const isl = islandAt(p.x, p.z);
    if (isl && p.y < isl.y - 1.5 && p.y > isl.y - 16) p.y = isl.y - 16;
    p.y = clamp(p.y, g + 0.9, 190);
  } else {
    p.vy -= 30 * dt; p.y += p.vy * dt;
    if (p.y <= g) { p.y = g; p.vy = 0; p.onGround = true; } else p.onGround = p.y - g < 0.3 && p.vy <= 0;
    if (keys[' '] && p.onGround && p.vy <= 0) { p.vy = 10.5; p.onGround = false; }
  }
  // Modell-Animation
  const h = p.model; h.g.position.set(p.x, p.y, p.z); h.g.rotation.y = p.rot; h.board.visible = p.flying;
  if (moving && !p.flying) p.walkT += dt * 11; else p.walkT *= 0.8;
  const sw = p.flying ? 0 : Math.sin(p.walkT) * 0.8; h.legL.rotation.x = sw; h.legR.rotation.x = -sw; h.armL.rotation.x = -sw * 0.8;
  h.armR.rotation.x = p.swing > 0 ? -Math.sin((p.swing / 0.3) * Math.PI) * 2.0 : sw * 0.8;
  h.g.rotation.x = p.flying ? (moving ? 0.3 : 0.05) : 0; if (p.flying) h.g.position.y += Math.sin(performance.now() * 0.004) * 0.12;
  if (curNpc && Math.hypot(curNpc.x - p.x, curNpc.z - p.z) > 12) showWin('winNpc', false);
}

function updateLoot(dt) {
  for (let i = loots.length - 1; i >= 0; i--) {
    const l = loots[i]; l.t += dt; l.g.rotation.y += dt * 3; const dx = p.x - l.x, dz = p.z - l.z, dy = p.y + 1 - l.y, d = Math.hypot(dx, dz, dy); let gone = l.t > 90;
    if (l.t > 0.5 && d < 6 && !p.dead && !(l.wait > l.t)) {
      const st = Math.min(d, 22 * dt); l.x += dx / d * st; l.z += dz / d * st; l.y += dy / d * st;
      if (d < 1.2) {
        if (l.gold) { p.gold += l.gold; log(`+${l.gold} Taler`, 'g'); beep(1200, 0.05, 'square', 0.025); gone = true; }
        else if (addItem(l.item, l.n)) { log(`Erhalten: ${ITEMS[l.item].name}${l.n > 1 ? ' x' + l.n : ''}`, 'p'); beep(900, 0.07, 'triangle', 0.04); gone = true; renderQuests(); const q = curQuest(); if (q && p.q.on && q.collect === l.item && countItem(l.item) === q.n) log('Quest erfüllt! Kehre zu Mira zurück.', 'g'); }
        else l.wait = l.t + 5;
      }
    }
    l.g.position.set(l.x, l.y + Math.sin(l.t * 4) * 0.15, l.z);
    if (gone) { scene.remove(l.g); loots.splice(i, 1); }
  }
}
function updateProj(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const pr = projs[i], t = pr.target, m = pr.m; if (t.dead) { scene.remove(m); projs.splice(i, 1); continue; }
    const tx = t.x, ty = mobCenterY(t), tz = t.z, dx = tx - m.position.x, dy = ty - m.position.y, dz = tz - m.position.z, d = Math.hypot(dx, dy, dz), st = 55 * dt;
    if (d <= st + 0.5) { scene.remove(m); projs.splice(i, 1); pr.onHit(); } else m.position.set(m.position.x + dx / d * st, m.position.y + dy / d * st, m.position.z + dz / d * st);
  }
}
function updateFx(dt) { for (let i = fxs.length - 1; i >= 0; i--) { const f = fxs[i]; f.t += dt; const k = Math.min(1, f.t / f.dur); f.upd(k); if (k >= 1) { scene.remove(f.mesh); f.mesh.material.dispose(); if (!Object.values(GEO).includes(f.mesh.geometry)) f.mesh.geometry.dispose(); fxs.splice(i, 1); } } }

/* ---------- HUD ---------- */
let hudT = 0, mapT = 0;
function updateHud(dt) {
  const mh = maxHP(), mm = maxMP();
  $('#hpfill').style.width = clamp(p.hp / mh * 100, 0, 100) + '%'; $('#hptxt').textContent = `${Math.ceil(p.hp)} / ${mh}`;
  $('#mpfill').style.width = clamp(p.mp / mm * 100, 0, 100) + '%'; $('#mptxt').textContent = `${Math.floor(p.mp)} / ${mm}`;
  const t = p.target; $('#tframe').classList.toggle('hidden', !t);
  if (t) { $('#tname').textContent = t.def.name + (t.def.boss ? ' 👑' : ''); const dl = t.def.lvl - p.lvl; $('#tlvl').textContent = 'St. ' + t.def.lvl; $('#tlvl').style.color = dl >= 4 ? '#ff6464' : dl >= 1 ? '#ffb04a' : dl > -4 ? '#ffd978' : '#9fb0d0'; $('#thpfill').style.width = clamp(t.hp / t.def.hp * 100, 0, 100) + '%'; $('#thptxt').textContent = `${Math.max(0, Math.ceil(t.hp))} / ${t.def.hp}`; selRing.visible = true; selRing.position.set(t.x, t.y + 0.25, t.z); selRing.scale.setScalar(t.def.scale); selRing.rotation.z += dt * 2; } else selRing.visible = false;
  updateHotbar();
  hudT -= dt; if (hudT <= 0) {
    hudT = 0.25; $('#pname').textContent = p.name; $('#plvl').textContent = `${cls().name} · St. ${p.lvl}`;
    const need = expNeed(p.lvl), pc = p.lvl >= MAXLVL ? 100 : p.exp / need * 100; $('#expfill').style.width = pc + '%'; $('#exptxt').textContent = p.lvl >= MAXLVL ? 'Maximalstufe' : `EP ${pc.toFixed(2)} %`;
    $('#gold').textContent = `💰 ${p.gold.toLocaleString('de-DE')} Taler`;
    $('#buffs').innerHTML = p.buffs.map(b => `<span>${b.icon} ${Math.ceil(b.t)}s</span>`).join('') + (p.sp ? '<span style="color:#7dffb0">▲ Punkte frei (C)</span>' : '');
    let zn = 'Wildnis'; const d0 = Math.hypot(p.x, p.z), isl = islandAt(p.x, p.z);
    if (isl && p.y > isl.y - 2) zn = 'Himmelsinseln'; else if (d0 < 45) zn = 'Luminhafen'; else for (const z of ZONES) if (Math.hypot(p.x - z.x, p.z - z.z) < z.r * 1.1) zn = z.name;
    if (zn !== zoneName) { zoneName = zn; $('#zone').textContent = zn; if (zn !== 'Wildnis') { const z = ZONES.find(q => q.name === zn); center(zn, z ? `Monster ab Stufe ${MOBS[z.mobs[0][0]].lvl}` : zn === 'Himmelsinseln' ? 'Monster ab Stufe 28' : 'Sicheres Dorf'); } }
    for (const n of npcs) { const mk = npcMark(n), html = `${mk ? `<span class="qm">${mk}</span>` : ''}${n.name}<small>${n.role}</small>`; if (n._h !== html) { n._h = html; n.lbl.innerHTML = html; } }
  }
  for (const n of npcs) { const s = Math.hypot(n.x - p.x, n.z - p.z) < 90 ? toScreen(n.x, n.y + 3.6, n.z) : null; if (s) { n.lbl.style.display = ''; n.lbl.style.left = s.x + 'px'; n.lbl.style.top = s.y + 'px'; } else n.lbl.style.display = 'none'; }
  mapT -= dt; if (mapT <= 0) { mapT = 0.12; drawMap(); }
}
const mctx = $('#minimap').getContext('2d');
function drawMap() {
  const c = mctx, S = 160, R = 130, k = S / 2 / R; c.clearRect(0, 0, S, S); c.save(); c.beginPath(); c.arc(80, 80, 80, 0, 7); c.clip();
  c.fillStyle = '#3f8f4a'; c.fillRect(0, 0, S, S);
  const P = (x, z) => [80 + (x - p.x) * k, 80 + (z - p.z) * k];
  const circ = (x, z, r, col) => { const q = P(x, z); c.fillStyle = col; c.beginPath(); c.arc(q[0], q[1], r * k, 0, 7); c.fill(); };
  for (const z of ZONES) circ(z.x, z.z, z.r, `rgba(${z.col.map(v => Math.round(v * 255)).join(',')},.75)`);
  circ(0, 0, 34, 'rgba(230,205,150,.9)'); for (const i of ISLANDS) circ(i.x, i.z, i.r, 'rgba(200,235,255,.75)');
  for (const m of mobs) { if (m.dead) continue; const q = P(m.x, m.z); if (Math.abs(q[0] - 80) > 82 || Math.abs(q[1] - 80) > 82) continue; c.fillStyle = m === p.target ? '#fff' : m.def.boss ? '#ff3ad6' : m.def.aggro ? '#ff4a4a' : '#ffb04a'; c.fillRect(q[0] - 1.5, q[1] - 1.5, m.def.boss ? 6 : 3, m.def.boss ? 6 : 3); }
  for (const n of npcs) { const q = P(n.x, n.z); c.fillStyle = '#ffe04a'; c.beginPath(); c.arc(q[0], q[1], 3, 0, 7); c.fill(); }
  // Richtung zum Dorf, wenn außerhalb
  const d0 = Math.hypot(p.x, p.z); if (d0 > R) { const a = Math.atan2(-p.z, -p.x); c.fillStyle = '#ffe04a'; c.beginPath(); c.arc(80 + Math.cos(a) * 72, 80 + Math.sin(a) * 72, 4, 0, 7); c.fill(); }
  c.translate(80, 80); c.rotate(-p.rot + Math.PI); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(0, 3); c.lineTo(-5, 6); c.closePath(); c.fill(); c.stroke(); c.restore();
  c.fillStyle = '#fff'; c.font = 'bold 10px sans-serif'; c.fillText('N', 76, 11);
}

/* ---------- Eingabe ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ptrs = new Map(); let drag = null, pinch = 0;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY, moved: false, btn: e.button }; if (ptrs.size === 2) { const a = [...ptrs.values()]; pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); drag.moved = true; } });
canvas.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; const o = ptrs.get(e.pointerId), dx = e.clientX - o.x, dy = e.clientY - o.y; o.x = e.clientX; o.y = e.clientY;
  if (ptrs.size === 2) { const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); cam.dist = clamp(cam.dist * pinch / d, 6, 45); pinch = d; return; }
  if (!drag) return; if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return; drag.moved = true;
  cam.yaw -= dx * 0.006; cam.pitch = clamp(cam.pitch + dy * 0.005, -0.35, 1.45);
});
function endPtr(e) { ptrs.delete(e.pointerId); if (drag && !drag.moved && drag.btn === 0 && started) clickWorld(e.clientX, e.clientY); if (!ptrs.size) drag = null; }
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = null; });
canvas.addEventListener('wheel', e => { cam.dist = clamp(cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 6, 45); e.preventDefault(); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
function clickWorld(cx, cy) {
  if (p.dead) return; ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const picks = []; for (const m of mobs) if (!m.dead && Math.hypot(m.x - p.x, m.z - p.z) < 120) picks.push(m.pick); for (const n of npcs) picks.push(n.pick);
  const hit = ray.intersectObjects(picks, false)[0];
  if (hit) { const u = hit.object.userData; if (u.kind === 'mob') { if (p.target === u.ent) startAttack(); else { setTarget(u.ent); beep(500, 0.03, 'sine', 0.03); } } else { p.interact = u.ent; p.attacking = false; p.moveTo = null; } return; }
  const gh = ray.intersectObjects(groundMeshes, false)[0];
  if (gh && gh.point.y > WATER - 0.3) { p.moveTo = { x: gh.point.x, z: gh.point.z }; p.attacking = false; p.queued = null; p.interact = null; ring(gh.point.x, gh.point.y, gh.point.z, 0xffffff, 1.6, 0.35); }
}
window.addEventListener('keydown', e => {
  if (!started || e.target.tagName === 'INPUT') return; const k = e.key.toLowerCase(); keys[k] = true;
  if (e.repeat) { if (k === ' ' || k === 'tab') e.preventDefault(); return; }
  if (k >= '1' && k <= '8') { const s = slots[+k - 1]; if (s) s.act(); }
  else if (k === 'tab') { e.preventDefault(); setTarget(nearestMob(45, p.target) || p.target); }
  else if (k === 'f') toggleFly(); else if (k === 'c') toggleWin('winChar'); else if (k === 'i' || k === 'b') toggleWin('winInv'); else if (k === 'l' || k === 'q') toggleWin('winQuest'); else if (k === 'h') toggleWin('winHelp');
  else if (k === 'escape') { const open = [...document.querySelectorAll('.win')].filter(w => !w.classList.contains('hidden')); if (open.length) open.forEach(w => showWin(w.id, false)); else setTarget(null); }
  else if (k === ' ') e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

/* ---------- Speichern ---------- */
function save() {
  if (!started) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ name: p.name, hair: p.hair, cls: p.cls, lvl: p.lvl, exp: p.exp, gold: p.gold, sp: p.sp, stats: p.stats, inv: p.inv, equip: p.equip, q: p.q, hp: p.hp, mp: p.mp, x: p.x, y: p.y, z: p.z })); } catch (e) { /* Speicher nicht verfügbar */ }
}
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.name && CLASSES[s.cls] ? s : null; } catch (e) { return null; } }
setInterval(save, 15000); window.addEventListener('beforeunload', save);

/* ---------- Start ---------- */
function startGame(s) {
  if (s) { Object.assign(p, s); p.inv = (s.inv || []).filter(i => ITEMS[i.id]); for (const k in p.equip) if (p.equip[k] && !ITEMS[p.equip[k].id]) p.equip[k] = null; if (p.flying || islandAt(p.x, p.z)) p.y = Math.max(p.y, groundAt(p.x, p.z, p.y)); else p.y = terrainH(p.x, p.z); }
  else { p.name = ($('#nameInput').value.trim() || 'Wanderer').slice(0, 14); p.equip.weapon = { id: 'w_holz', plus: 0 }; p.equip.armor = { id: 'a_0', plus: 0 }; p.inv = [{ id: 'apfel', n: 5 }]; p.hp = maxHP(); p.mp = maxMP(); p.y = terrainH(p.x, p.z); }
  p.flying = false; refreshModel(); buildHotbar(); started = true; cam.yaw = 0;
  $('#start').classList.add('hidden'); $('#hud').classList.remove('hidden');
  if (!s) { log(`Willkommen in Wolkenreich, ${p.name}!`, 'g'); log('Sprich mit der Ältesten Mira (gelbes „!“) für deine erste Quest.', 'e'); showWin('winHelp', true); }
  else log(`Willkommen zurück, ${p.name}!`, 'g');
  save();
}
HAIRS.forEach((h, i) => { const e = document.createElement('i'); e.style.background = '#' + h.toString(16).padStart(6, '0'); if (!i) e.className = 'sel'; e.addEventListener('click', () => { p.hair = h; document.querySelectorAll('#hairs i').forEach(x => x.classList.remove('sel')); e.classList.add('sel'); }); $('#hairs').appendChild(e); });
const saved = loadSave();
if (saved) { const b = $('#btnContinue'); b.classList.remove('hidden'); b.textContent = `Fortsetzen (${saved.name}, St. ${saved.lvl})`; b.addEventListener('click', () => startGame(saved)); }
let newArmed = !saved;
$('#btnNew').addEventListener('click', e => { if (!newArmed) { newArmed = true; e.target.textContent = 'Spielstand überschreiben?'; return; } startGame(null); });

/* ---------- Aufbau & Schleife ---------- */
buildWorld(); buildNpcs();
for (const z of ZONES) for (const [id, n] of z.mobs) for (let i = 0; i < n; i++) spawnMob(id, { x: z.x, z: z.z, r: z.r });
for (const i of ISLANDS) for (const [id, n] of i.mobs) for (let k = 0; k < n; k++) spawnMob(id, { x: i.x, z: i.z, r: i.r, y: i.y, isl: true });

const clock = new THREE.Clock(); let time = 0;
function frame() {
  requestAnimationFrame(frame); const dt = Math.min(0.05, clock.getDelta()); time += dt;
  let tx = 0, ty = 6, tz = 0;
  if (started) {
    updatePlayer(dt); for (const m of mobs) updateMob(m, dt); updateLoot(dt); updateProj(dt);
    tx = p.x; ty = p.y + 2.4; tz = p.z;
  } else { cam.yaw = time * 0.08; cam.pitch = 0.3; cam.dist = 60; }
  updateFx(dt);
  world.crystal.rotation.y = time; world.crystal.position.y = 5.2 + Math.sin(time * 1.5) * 0.4;
  for (const c of world.clouds) { c.position.x += dt * 2.5; if (c.position.x > 620) c.position.x = -620; }
  const cp = Math.cos(cam.pitch); let cx = tx + Math.sin(cam.yaw) * cp * cam.dist, cy = ty + Math.sin(cam.pitch) * cam.dist, cz = tz + Math.cos(cam.yaw) * cp * cam.dist;
  cy = Math.max(cy, Math.max(terrainH(cx, cz), WATER) + 1.2);
  camera.position.set(cx, cy, cz); camera.lookAt(tx, ty, tz);
  renderer.render(scene, camera);
  if (started) updateHud(dt);
}
frame();

// Für Tests / Neugierige
window.WRGAME = { p, mobs, npcs, cam, startGame, hitMob, gainExp, addItem, castSkill, toggleFly, startAttack, setTarget, nearestMob, openNpc, terrainH, save, keys, loots };
})();
