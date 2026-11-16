'use strict';
/* Wolkenreich – Grafik: Renderer, prozedurale Texturen, Welt, Partikel, Effekte */
const GFX = (() => {
const T = THREE, PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const rnd = (a, b) => a + Math.random() * (b - a);
let seed = 20240; const sr = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (seed - 1) / 2147483646 * (b - a); };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); }
function fbm(x, y, o = 4) { let a = 0.5, f = 1, s = 0; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); a *= 0.5; f *= 2; } return s; }
const col = new T.Color(), col2 = new T.Color(), mtx = new T.Matrix4(), eul = new T.Euler(), v3 = new T.Vector3();

/* ---------- Texturen ---------- */
function tex(w, h, fn, rep, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } t.anisotropy = 4; return t;
}
const g255 = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;
function wrap(c, w, h, x, y, r, fn) { for (const dx of [0, -w, w]) for (const dy of [0, -h, h]) if (x + dx > -r && x + dx < w + r && y + dy > -r && y + dy < h + r) fn(x + dx, y + dy); }
const TX = {};
function makeTextures() {
  TX.grass = tex(256, 256, (c, w, h) => {
    c.fillStyle = g255(205); c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = sr(0, w), y = sr(0, h), r = sr(14, 46), v = sr(150, 255); wrap(c, w, h, x, y, r, (X, Y) => { const g = c.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, g255(v, 0.22)); g.addColorStop(1, g255(v, 0)); c.fillStyle = g; c.fillRect(X - r, Y - r, r * 2, r * 2); }); }
    for (let i = 0; i < 2600; i++) { const x = sr(0, w), y = sr(0, h), l = sr(3, 9), a = sr(-0.5, 0.5); c.strokeStyle = g255(sr(140, 255), 0.5); c.lineWidth = sr(0.6, 1.6); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); c.stroke(); }
  }, [150, 150]);
  TX.rock = tex(256, 256, (c, w, h) => {
    c.fillStyle = g255(200); c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = sr(0, w), y = sr(0, h), r = sr(10, 40), v = sr(120, 255); wrap(c, w, h, x, y, r, (X, Y) => { const g = c.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, g255(v, 0.25)); g.addColorStop(1, g255(v, 0)); c.fillStyle = g; c.fillRect(X - r, Y - r, r * 2, r * 2); }); }
    for (let i = 0; i < 1800; i++) { c.fillStyle = g255(sr(90, 255), 0.35); c.fillRect(sr(0, w), sr(0, h), sr(1, 3), sr(1, 3)); }
    for (let i = 0; i < 26; i++) { let x = sr(0, w), y = sr(0, h); c.strokeStyle = g255(60, 0.5); c.lineWidth = sr(0.6, 1.8); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += sr(-16, 16); y += sr(-16, 16); c.lineTo(x, y); } c.stroke(); }
  }, [1, 1]);
  TX.bark = tex(128, 256, (c, w, h) => {
    c.fillStyle = g255(190); c.fillRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) { let x = sr(0, w), y = sr(0, h); c.strokeStyle = g255(sr(60, 250), 0.45); c.lineWidth = sr(1, 3.5); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += sr(-3, 3); y += sr(10, 26); c.lineTo(x, y); } c.stroke(); }
  }, [2, 2]);
  TX.leaf = tex(256, 256, (c, w, h) => {
    c.fillStyle = g255(185); c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const x = sr(0, w), y = sr(0, h), r = sr(5, 11), a = sr(0, PI), v = sr(150, 255); wrap(c, w, h, x, y, r, (X, Y) => { c.fillStyle = g255(v, 0.85); c.beginPath(); c.ellipse(X, Y, r, r * 0.45, a, 0, PI * 2); c.fill(); c.strokeStyle = g255(v * 0.6, 0.5); c.lineWidth = 0.7; c.beginPath(); c.moveTo(X - Math.cos(a) * r, Y - Math.sin(a) * r); c.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); c.stroke(); }); }
  }, [3, 3]);
  TX.plaster = tex(256, 256, (c, w, h) => {
    c.fillStyle = '#efe3c6'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(${sr(150, 255) | 0},${sr(140, 240) | 0},${sr(110, 200) | 0},0.12)`; c.fillRect(sr(0, w), sr(0, h), sr(2, 9), sr(2, 9)); }
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(70,50,20,0.28)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#553a24'; c.lineCap = 'square'; const L = (a, b, d, e, lw = 15) => { c.lineWidth = lw; c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); c.strokeStyle = 'rgba(30,18,8,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); c.strokeStyle = '#553a24'; };
    L(0, 8, w, 8, 18); L(0, h - 8, w, h - 8, 18); L(8, 0, 8, h, 18); L(w - 8, 0, w - 8, h, 18); L(0, 112, w, 112, 13); L(96, 112, 96, h, 12); L(160, 112, 160, h, 12); L(12, 12, 92, 108, 10); L(w - 12, 12, w - 92, 108, 10);
  });
  TX.roof = tex(256, 256, (c, w, h) => {
    c.fillStyle = g255(120); c.fillRect(0, 0, w, h); const R = 16;
    for (let row = -1; row < h / 20 + 1; row++) for (let i = -1; i < w / (R * 2) + 1; i++) { const x = i * R * 2 + (row % 2 ? R : 0), y = h - row * 20, v = sr(170, 255); const g = c.createLinearGradient(0, y - 30, 0, y); g.addColorStop(0, g255(v * 0.55)); g.addColorStop(1, g255(v)); c.fillStyle = g; c.beginPath(); c.moveTo(x - R, y - 30); c.lineTo(x - R, y - R); c.arc(x, y - R, R, PI, 0, true); c.lineTo(x + R, y - 30); c.closePath(); c.fill(); c.strokeStyle = g255(40, 0.55); c.lineWidth = 1.5; c.stroke(); }
  }, [1, 1]);
  TX.cobble = tex(512, 512, (c, w, h) => {
    c.fillStyle = '#6b6558'; c.fillRect(0, 0, w, h); const n = 16, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = i * s + (j % 2 ? s / 2 : 0) + sr(-3, 3), y = j * s + sr(-3, 3), v = sr(150, 215); wrap(c, w, h, x + s / 2, y + s / 2, s, (X, Y) => { c.fillStyle = `rgb(${v | 0},${v * 0.97 | 0},${v * 0.88 | 0})`; c.beginPath(); c.roundRect(X - s / 2 + 2, Y - s / 2 + 2, s - 4 + sr(-2, 2), s - 4, 9); c.fill(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.roundRect(X - s / 2 + 4, Y - s / 2 + 4, s - 12, s * 0.35, 6); c.fill(); }); }
  }, [5, 5]);
  TX.wood = tex(128, 128, (c, w, h) => {
    c.fillStyle = g255(205); c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { c.fillStyle = g255(sr(170, 235)); c.fillRect(i * 32, 0, 31, h); c.fillStyle = g255(70); c.fillRect(i * 32 + 31, 0, 1.5, h); }
    for (let i = 0; i < 90; i++) { const x = sr(0, w), y = sr(0, h); c.strokeStyle = g255(sr(90, 160), 0.35); c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sr(-2, 2), y + sr(14, 44)); c.stroke(); }
  }, [1, 1]);
  const radial = (stops) => tex(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(s => g.addColorStop(s[0], `rgba(255,255,255,${s[1]})`)); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  TX.glow = radial([[0, 1], [0.25, 0.55], [0.6, 0.12], [1, 0]]);
  TX.soft = tex(128, 128, (c, w, h) => { for (let i = 0; i < 14; i++) { const x = sr(38, 90), y = sr(44, 84), r = sr(18, 36), g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); } });
  TX.blade = tex(256, 128, (c, w, h) => {
    for (let i = 0; i < 22; i++) { const x = 10 + i * 11 + sr(-4, 4), top = sr(4, 60), lean = sr(-18, 18), bw = sr(2.6, 4.6), g = c.createLinearGradient(0, h, 0, top); g.addColorStop(0, g255(170)); g.addColorStop(1, g255(sr(225, 255))); c.fillStyle = g; c.beginPath(); c.moveTo(x - bw, h); c.quadraticCurveTo(x - bw * 0.4 + lean * 0.4, (h + top) / 2, x + lean, top); c.quadraticCurveTo(x + bw * 0.6 + lean * 0.4, (h + top) / 2, x + bw, h); c.closePath(); c.fill(); }
  });
  TX.flower = tex(128, 128, (c, w, h) => {
    for (let i = 0; i < 6; i++) { const x = 14 + i * 20 + sr(-4, 4), top = sr(28, 70); c.strokeStyle = '#4f9a3c'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, h); c.quadraticCurveTo(x + sr(-6, 6), (h + top) / 2, x, top); c.stroke(); const pc = ['#ffffff', '#ffd84a', '#ff8fb8', '#9fb8ff', '#ff7a5a'][i % 5]; for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; c.fillStyle = pc; c.beginPath(); c.ellipse(x + Math.cos(a) * 6, top + Math.sin(a) * 6, 5.5, 3.6, a, 0, PI * 2); c.fill(); } c.fillStyle = '#ffb21e'; c.beginPath(); c.arc(x, top, 3.6, 0, PI * 2); c.fill(); }
  });
  TX.waterN = tex(256, 256, (c, w, h) => {
    const id = c.createImageData(w, h), W = []; for (let i = 0; i < 10; i++) W.push([Math.round(sr(-6, 6)), Math.round(sr(-6, 6)), sr(0, 6.28), sr(0.4, 1)]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let dx = 0, dy = 0; for (const k of W) { const ph = 2 * PI * (k[0] * x / w + k[1] * y / h) + k[2], cs = Math.cos(ph) * k[3]; dx += cs * k[0]; dy += cs * k[1]; } const nx = -dx * 0.06, ny = -dy * 0.06, l = Math.hypot(nx, ny, 1), i = (y * w + x) * 4; id.data[i] = (nx / l * 0.5 + 0.5) * 255; id.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; id.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; id.data[i + 3] = 255; }
    c.putImageData(id, 0, 0);
  }, [170, 170], false);
  TX.rune = tex(256, 256, (c, w, h) => {
    c.translate(128, 128); c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 118, 0, PI * 2); c.stroke(); c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 100, 0, PI * 2); c.stroke(); c.beginPath(); c.arc(0, 0, 70, 0, PI * 2); c.stroke();
    for (let i = 0; i < 24; i++) { c.save(); c.rotate(i / 24 * PI * 2); c.fillRect(-1.5, -98, 3, i % 2 ? 9 : 16); if (i % 3 === 0) { c.beginPath(); c.moveTo(0, -92); c.lineTo(7, -76); c.lineTo(-7, -76); c.closePath(); c.stroke(); } c.restore(); }
    c.lineWidth = 3; c.beginPath(); for (let i = 0; i < 7; i++) { const a = i * 4 * PI / 6 - PI / 2; c.lineTo(Math.cos(a) * 68, Math.sin(a) * 68); } c.stroke();
  });
  TX.ringSel = tex(256, 256, (c, w, h) => {
    c.translate(128, 128); c.strokeStyle = '#fff'; c.lineWidth = 10; c.beginPath(); c.arc(0, 0, 110, 0, PI * 2); c.stroke(); c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 92, 0, PI * 2); c.stroke();
    c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * PI / 2); c.beginPath(); c.moveTo(0, -82); c.lineTo(16, -108); c.lineTo(-16, -108); c.closePath(); c.fill(); c.restore(); }
  });
  TX.slash = tex(256, 256, (c, w, h) => { for (let i = 0; i < 26; i++) { c.strokeStyle = `rgba(255,255,255,${0.02 + i * 0.012})`; c.lineWidth = 46 - i * 1.7; c.beginPath(); c.arc(128, 128, 96, -PI * 0.92 + i * 0.012, -PI * 0.08 - i * 0.03); c.stroke(); } });
}

/* ---------- Geometrie-Baukasten ---------- */
const B = {};
function ensureIndex(g) { if (!g.index) { const n = g.attributes.position.count, a = new Uint16Array(n); for (let i = 0; i < n; i++) a[i] = i; g.setIndex(new T.BufferAttribute(a, 1)); } return g; }
function displaced(detail, amp, freq, smoothN) {
  const g = new T.IcosahedronGeometry(0.5, detail), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * freq + 7.3 + y * 1.7, z * freq + 3.1 - y * 2.3, 3) - 0.5) * amp; p.setXYZ(i, x * k, y * k, z * k); }
  if (smoothN) { const n = g.attributes.normal; for (let i = 0; i < p.count; i++) { v3.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); n.setXYZ(i, v3.x, v3.y, v3.z); } } else g.computeVertexNormals();
  return g;
}
function makeBase() {
  B.sph = new T.SphereGeometry(0.5, 12, 8); B.head = new T.SphereGeometry(0.5, 24, 16); B.box = new T.BoxGeometry(1, 1, 1); B.cyl = new T.CylinderGeometry(0.5, 0.5, 1, 10); B.cone = new T.ConeGeometry(0.5, 1, 9);
  B.cap = new T.CapsuleGeometry(0.5, 1, 3, 9); B.tor = new T.TorusGeometry(0.5, 0.1, 6, 16); B.torT = new T.TorusGeometry(0.5, 0.04, 5, 22); B.oct = new T.OctahedronGeometry(0.5);
  B.cyl4 = new T.CylinderGeometry(0.5, 0.5, 1, 4); B.cone4 = new T.ConeGeometry(0.5, 1, 4); B.hemi = new T.SphereGeometry(0.5, 16, 7, 0, PI * 2, 0, PI / 2); B.cyl6 = new T.CylinderGeometry(0.5, 0.5, 1, 6);
  B.taper = new T.CylinderGeometry(0.3, 0.5, 1, 14); B.plane = new T.PlaneGeometry(1, 1);
  B.rock = displaced(1, 0.9, 2.2, false); B.rock2 = displaced(1, 1.2, 3.4, false); B.blob = displaced(1, 0.7, 2.6, true); B.blob2 = displaced(2, 0.6, 2.4, true);
}
const lathe = (pts, seg = 14) => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg);
const tube = (pts, r, rs = 6) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], p[2]))), pts.length * 5, r, rs);
function paint(g, c, o) {
  const p = g.attributes.position, n = g.attributes.normal, a = new Float32Array(p.count * 3); col.setHex(c); let y0 = Infinity, y1 = -Infinity;
  if (o && (o.g || o.top !== undefined)) for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (o && o.top !== undefined) col2.setHex(o.top);
  for (let i = 0; i < p.count; i++) {
    let r = col.r, gg = col.g, b = col.b;
    if (o) { const k = y1 > y0 ? (p.getY(i) - y0) / (y1 - y0) : 1; if (o.top !== undefined) { r = lerp(r, col2.r, k); gg = lerp(gg, col2.g, k); b = lerp(b, col2.b, k); } if (o.g) { const f = lerp(1 - o.g, 1, k); r *= f; gg *= f; b *= f; } if (o.f) { const q = o.f(p.getX(i), p.getY(i), p.getZ(i), n.getY(i), r, gg, b); if (q) { r = q[0]; gg = q[1]; b = q[2]; } } }
    a[i * 3] = r; a[i * 3 + 1] = gg; a[i * 3 + 2] = b;
  }
  g.setAttribute('color', new T.BufferAttribute(a, 3)); return g;
}
/** Ein Bauteil: Geometrie (Name oder Objekt), Farbe, Position, Skalierung, Rotation, Material, Optionen */
function pc(g, c, p, s, r, m, o) {
  const geo = (typeof g === 'string' ? B[g] : g).clone(); ensureIndex(geo);
  if (s !== undefined && s !== null) typeof s === 'number' ? geo.scale(s, s, s) : geo.scale(s[0], s[1], s[2]);
  if (r) geo.applyMatrix4(mtx.makeRotationFromEuler(eul.set(r[0], r[1], r[2])));
  if (p) geo.translate(p[0], p[1], p[2]);
  paint(geo, c, o); geo.userData = { m: m || 'matte' }; return geo;
}
function mirror(pieces) {
  return pieces.flat(9).map(g => { const q = g.clone(); q.userData = { m: g.userData.m }; q.scale(-1, 1, 1); const ix = q.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } return q; });
}
function xf(pieces, p, r, s) { // Gruppe von Bauteilen gemeinsam transformieren
  for (const g of pieces.flat(9)) { if (s) typeof s === 'number' ? g.scale(s, s, s) : g.scale(s[0], s[1], s[2]); if (r) g.applyMatrix4(mtx.makeRotationFromEuler(eul.set(r[0], r[1], r[2]))); if (p) g.translate(p[0], p[1], p[2]); } return pieces;
}
function merge(list) {
  let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = new Float32Array(nv * 3), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let vo = 0, io = 0;
  for (const g of list) { const a = g.attributes; P.set(a.position.array, vo * 3); N.set(a.normal.array, vo * 3); if (a.uv) U.set(a.uv.array, vo * 2); C.set(a.color.array, vo * 3); const ix = g.index.array; for (let i = 0; i < ix.length; i++) I[io + i] = ix[i] + vo; vo += a.position.count; io += ix.length; }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(P, 3)); out.setAttribute('normal', new T.BufferAttribute(N, 3)); out.setAttribute('uv', new T.BufferAttribute(U, 2)); out.setAttribute('color', new T.BufferAttribute(C, 3)); out.setIndex(new T.BufferAttribute(I, 1)); return out;
}
const M = {};
function parts(pieces) { const by = {}; for (const g of pieces.flat(9)) (by[g.userData.m] = by[g.userData.m] || []).push(g); return Object.keys(by).map(k => ({ geo: merge(by[k]), mat: M[k], m: k })); }
const NOSHADOW = { glow: 1, add: 1, ghost: 1 };
function build(parent, pieces) { const out = []; for (const p of parts(pieces)) { const me = new T.Mesh(p.geo, p.mat); me.castShadow = !NOSHADOW[p.m]; me.receiveShadow = false; parent.add(me); out.push(me); } return out; }
function glow(color, size, opacity = 0.7) { const s = new T.Sprite(new T.SpriteMaterial({ map: TX.glow, color, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity })); s.scale.setScalar(size); return s; }

const uTime = { value: 0 };
function windify(mat, amp, yref, fade) {
  mat.onBeforeCompile = sh => {
    if (fade) sh.fragmentShader = sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (length(vViewPosition) < 5.0 + fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 5.0) discard;');
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 wp = instanceMatrix[3].xyz;
      #else
        vec3 wp = modelMatrix[3].xyz;
      #endif
      float wk = max(0.0, position.y - ${yref.toFixed(2)}) * ${amp.toFixed(3)};
      transformed.x += sin(uTime * 1.6 + wp.x * 0.31 + wp.z * 0.23 + position.y * 0.4) * wk;
      transformed.z += cos(uTime * 1.3 + wp.x * 0.19 + wp.z * 0.37 + position.x * 0.5) * wk * 0.7;`);
  };
  return mat;
}
function makeMaterials() {
  const S = o => new T.MeshStandardMaterial(Object.assign({ vertexColors: true }, o));
  M.matte = S({ roughness: 0.82 }); M.metal = S({ roughness: 0.34, metalness: 0.78 }); M.gloss = S({ roughness: 0.22, metalness: 0.05 });
  M.glow = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  M.add = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false });
  M.ghost = S({ roughness: 0.7, transparent: true, opacity: 0.78 }); M.jelly = S({ roughness: 0.12, transparent: true, opacity: 0.93 });
  M.cloth = S({ roughness: 0.9, side: T.DoubleSide });
  M.plaster = S({ roughness: 0.95, map: TX.plaster }); M.roof = S({ roughness: 0.8, map: TX.roof }); M.wood = S({ roughness: 0.85, map: TX.wood }); M.stone = S({ roughness: 0.95, map: TX.rock });
  M.bark = S({ roughness: 1, map: TX.bark }); M.leaf = windify(S({ roughness: 0.9, map: TX.leaf }), 0.045, 2.5, true); M.bush = windify(S({ roughness: 0.9, map: TX.leaf }), 0.05, 0.3);
}

/* ---------- Renderer & Szene ---------- */
let renderer, scene, camera, sun, hemi, dome, water, env, quality = 'hoch';
const vegChunks = [], groundMeshes = [], anims = [], grassCells = [], clouds = [], blockers = [], colliders = [];
const SUN = new T.Vector3(0.55, 0.72, 0.42).normalize();
function init(canvas, e) {
  env = e; makeTextures(); makeBase(); makeMaterials();
  renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  scene = new T.Scene(); scene.fog = new T.Fog(0xc4e2f4, 190, 620);
  camera = new T.PerspectiveCamera(52, 1, 0.4, 2600);
  // Himmel
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new T.Color(0x2f7fe0) }, mid: { value: new T.Color(0x8fc8f5) }, hor: { value: new T.Color(0xd8ecf8) }, sunDir: { value: SUN }, sunCol: { value: new T.Color(0xfff1c8) }, uK: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top, mid, hor, sunDir, sunCol; uniform float uK;
      void main(){ vec3 d = normalize(vP); float h = d.y; vec3 c = mix(hor, mid, smoothstep(0.0, 0.22, h)); c = mix(c, top, smoothstep(0.15, 0.85, h)); c = mix(c, hor * 0.92, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 40.0) * 0.35 + pow(s, 6.0) * 0.12) * uK; c *= mix(0.6, 1.0, uK);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  dome = new T.Mesh(new T.SphereGeometry(2200, 32, 18), skyMat); dome.frustumCulled = false; dome.renderOrder = -10;
  const envScene = new T.Scene(); envScene.add(dome); skyMat.uniforms.uK.value = 0; const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(envScene, 0, 1, 5000).texture; pm.dispose(); skyMat.uniforms.uK.value = 1; scene.add(dome);
  hemi = new T.HemisphereLight(0xdcefff, 0x7f9a66, 0.75); scene.add(hemi);
  sun = new T.DirectionalLight(0xfff0d6, 2.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 20; sc.far = 520; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  scene.add(sun); scene.add(sun.target);
  initParticles(); buildWorld();
  const touch = 'ontouchstart' in window; let q = touch ? 'mittel' : 'hoch'; try { q = localStorage.getItem('wolkenreich_gfx') || q; } catch (er) { /* egal */ }
  setQuality(q); window.addEventListener('resize', resize); resize();
}
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
function setQuality(q) {
  quality = q; const dpr = window.devicePixelRatio || 1; renderer.setPixelRatio(q === 'hoch' ? Math.min(dpr, 2) : q === 'mittel' ? Math.min(dpr, 1.25) : 1);
  sun.castShadow = q !== 'niedrig'; const ms = q === 'hoch' ? 2048 : 1024; if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  try { localStorage.setItem('wolkenreich_gfx', q); } catch (er) { /* egal */ } resize();
}

/* ---------- Welt ---------- */
const BASE = [0.30, 0.56, 0.22];
function landColor(x, z, h, out) {
  const { ZONES } = env, n = fbm(x * 0.035, z * 0.035, 3), n2 = noise(x * 0.3, z * 0.3);
  let c = [BASE[0] + (n - 0.5) * 0.16, BASE[1] + (n - 0.5) * 0.2, BASE[2] + (n - 0.5) * 0.08];
  for (const zn of ZONES) { const w = 1 - smooth(zn.r * 0.55, zn.r * 1.2, Math.hypot(x - zn.x, z - zn.z) + (n - 0.5) * 30); if (w > 0) c = c.map((v, k) => v + (zn.col[k] * 0.85 - v) * w); }
  const d = Math.hypot(x, z); let path = 1 - smooth(21, 27, d);
  for (const zn of ZONES) { const L = Math.hypot(zn.x, zn.z), t = clamp((x * zn.x + z * zn.z) / (L * L), 0, 1 - zn.r * 0.5 / L), pd = Math.hypot(x - zn.x * t, z - zn.z * t) + (n2 - 0.5) * 2.5; path = Math.max(path, 1 - smooth(2.2, 4.2, pd)); }
  c = c.map((v, k) => v + ([0.56, 0.44, 0.28][k] - v) * path * 0.92);
  const e = 1.5, sl = Math.hypot(env.terrainH(x + e, z) - env.terrainH(x - e, z), env.terrainH(x, z + e) - env.terrainH(x, z - e)) / (2 * e), rk = smooth(0.42, 0.75, sl);
  c = c.map((v, k) => v + ([0.5, 0.47, 0.42][k] - v) * rk);
  const sw = 1 - smooth(-2.7, -1.0, h + (n2 - 0.5) * 0.5); c = c.map((v, k) => v + ([0.86, 0.78, 0.56][k] - v) * sw);
  const dp = smooth(-3.5, -12, h); c = c.map((v, k) => v + ([0.25, 0.42, 0.45][k] - v) * dp);
  out[0] = c[0] + (n2 - 0.5) * 0.05; out[1] = c[1] + (n2 - 0.5) * 0.05; out[2] = c[2] + (n2 - 0.5) * 0.03; out[3] = path; out[4] = rk;
}
const zoneAt = (x, z, f = 1) => { for (const zn of env.ZONES) if (Math.hypot(x - zn.x, z - zn.z) < zn.r * f) return zn.id; return ''; };
function buildWorld() {
  const { terrainH, ISLANDS, WATER } = env, cc = [0, 0, 0, 0, 0];
  // Gelände
  const SEG = 240, geo = new T.PlaneGeometry(1040, 1040, SEG, SEG); geo.rotateX(-PI / 2); const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), h = terrainH(x, z); pos.setY(i, h); landColor(x, z, h, cc); col.setRGB(cc[0], cc[1], cc[2], T.SRGBColorSpace); cols[i * 3] = col.r * 1.25; cols[i * 3 + 1] = col.g * 1.25; cols[i * 3 + 2] = col.b * 1.25; }
  geo.setAttribute('color', new T.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const terrain = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, map: TX.grass, roughness: 0.96 })); terrain.receiveShadow = true; scene.add(terrain); groundMeshes.push(terrain);
  water = new T.Mesh(new T.PlaneGeometry(5200, 5200), new T.MeshPhongMaterial({ color: 0x2a86c4, specular: 0xfff6e0, shininess: 110, normalMap: TX.waterN, normalScale: new T.Vector2(0.4, 0.4), transparent: true, opacity: 0.8 }));
  water.rotation.x = -PI / 2; water.position.y = WATER; scene.add(water);

  // Himmelsinseln
  for (const i of ISLANDS) {
    const g = new T.Group(); g.position.set(i.x, i.y, i.z);
    const top = pc(new T.CylinderGeometry(i.r, i.r * 0.9, 3.4, 30, 1), 0x6fbf4a, [0, -1.7, 0], null, null, 'stone', { f: (x, y, z, ny, r, gg, b) => ny > 0.5 ? null : [0.36 * 0.6, 0.27 * 0.6, 0.18 * 0.6] });
    const under = new T.ConeGeometry(i.r * 0.9, i.r * 1.25, 20, 5); under.rotateX(PI); { const p = under.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), f = 1 + (fbm(x * 0.12 + i.x, z * 0.12 + y * 0.1, 3) - 0.5) * 0.7; p.setXYZ(k, x * f, y, z * f); } under.computeVertexNormals(); }
    const pcs = [top, pc(under, 0x6b5440, [0, -3.4 - i.r * 0.62, 0], null, null, 'stone', { g: 0.5 })];
    for (let k = 0; k < 7; k++) { const a = sr(0, 6.28), r = sr(i.r * 0.3, i.r * 0.8), s = sr(2, 5); pcs.push(pc('rock', 0x6b5a48, [Math.cos(a) * r, -5 - sr(0, i.r * 0.4), Math.sin(a) * r], [s, s * 2.2, s], null, 'stone')); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + sr(0, 0.6), r = i.r * sr(0.72, 0.9), s = sr(1, 1.8); pcs.push(pc('oct', 0x7fe4ff, [Math.cos(a) * r, 1.6 * s, Math.sin(a) * r], [1.1 * s, 3.4 * s, 1.1 * s], [sr(-0.2, 0.2), sr(0, 3), sr(-0.2, 0.2)], 'glow'), pc('rock', 0x8a8f9a, [Math.cos(a) * r, 0.2, Math.sin(a) * r], [2.2 * s, 1 * s, 2.2 * s], null, 'stone')); const gl = glow(0x6fd8ff, 9 * s, 0.45); gl.position.set(Math.cos(a) * r, 2 * s, Math.sin(a) * r); g.add(gl); }
    const ms = build(g, pcs); ms.forEach(m => { m.receiveShadow = true; blockers.push(m); }); groundMeshes.push(ms[0]); scene.add(g);
  }

  // Pflanzen & Felsen
  const TYPES = vegetationTypes(), list = [], add = (t, x, z, s, c, y) => list.push({ t, x, z, y: y === undefined ? terrainH(x, z) : y, s, ry: sr(0, 6.28), c });
  const tint = (a, b) => { const k = sr(a, b); return col.setRGB(k, k * sr(0.96, 1.04), k * sr(0.94, 1.02)).getHex(); };
  for (let n = 0; n < 4400; n++) {
    const x = sr(-440, 440), z = sr(-440, 440), d = Math.hypot(x, z), h = terrainH(x, z); if (d < 44 || d > 425 || h < -1.4) continue;
    landColor(x, z, h, cc); if (cc[3] > 0.25) continue; const zn = zoneAt(x, z, 1.1), q = sr();
    if (zn === 'frost') { if (q < 0.45) add('pine', x, z, sr(0.8, 1.5), 0xdfeaf2); else if (q < 0.7) add(q < 0.58 ? 'rock' : 'rock2', x, z, sr(1, 3.6), 0xe6eef6); else if (q < 0.8) add('icecrystal', x, z, sr(0.8, 1.8)); }
    else if (zn === 'moor') { if (q < 0.3) add('dark', x, z, sr(0.7, 1.2), tint(0.7, 0.9)); else if (q < 0.5) add('shroomP', x, z, sr(0.4, 1.3)); else if (q < 0.7) add('bush', x, z, sr(0.8, 1.6), tint(0.6, 0.8)); else if (q < 0.8) add('dead', x, z, sr(0.7, 1.1)); }
    else if (zn === 'ruinen') { if (q < 0.4) add('pillar', x, z, sr(0.8, 1.5)); else if (q < 0.65) add('rock2', x, z, sr(1, 3), tint(0.8, 1)); else if (q < 0.75) add('dead', x, z, sr(0.8, 1.2)); }
    else if (zn === 'vulkan') { if (q < 0.35) add('rock2', x, z, sr(1.5, 5), 0x3a2a28); else if (q < 0.65) add('crystal', x, z, sr(1, 2.4)); else if (q < 0.8) add('dead', x, z, sr(0.9, 1.5)); }
    else if (zn === 'fels') { if (q < 0.72) add(q < 0.3 ? 'rock' : 'rock2', x, z, sr(1.2, 4.5), tint(0.8, 1.05)); else if (q < 0.8) add('pine', x, z, sr(0.8, 1.2), tint(0.8, 1)); else if (q < 0.88) add('bush', x, z, sr(0.8, 1.4), tint(0.7, 0.9)); }
    else if (zn === 'glut') { if (q < 0.3) add('rock2', x, z, sr(1.2, 4), 0x4a3a36); else if (q < 0.55) add('crystal', x, z, sr(0.8, 1.9)); else if (q < 0.75) add('dead', x, z, sr(0.8, 1.4)); }
    else if (zn === 'hain') { if (q < 0.4) add('shroomR', x, z, sr(0.7, 2.2)); else if (q < 0.7) add('shroomP', x, z, sr(0.6, 2.4)); else if (q < 0.85) add('oak', x, z, sr(0.8, 1.2), tint(0.75, 0.95)); else add('bush', x, z, sr(0.8, 1.5), tint(0.8, 1)); }
    else if (zn === 'wald') { add('dark', x, z, sr(0.9, 1.6), tint(0.8, 1.05)); if (q < 0.7) add(q < 0.35 ? 'dark' : 'pine', x + sr(-10, 10), z + sr(-10, 10), sr(0.9, 1.5), tint(0.6, 0.8)); if (q > 0.8) add('shroomP', x + sr(-5, 5), z + sr(-5, 5), sr(0.3, 0.7)); }
    else if (zn === 'wiese') { if (q < 0.1) add('oak', x, z, sr(0.9, 1.3), tint(0.95, 1.1)); else if (q < 0.16) add('sakura', x, z, sr(0.8, 1.2), tint(0.95, 1.05)); else if (q < 0.3) add('bush', x, z, sr(0.7, 1.3), tint(0.9, 1.1)); else if (q < 0.34) add('rock', x, z, sr(0.6, 1.6), tint(0.9, 1.05)); }
    else { if (q < 0.17) add('oak', x, z, sr(0.8, 1.45), tint(0.85, 1.1)); else if (q < 0.27) add('pine', x, z, sr(0.8, 1.5), tint(0.85, 1.05)); else if (q < 0.34) add('birch', x, z, sr(0.8, 1.3), tint(0.9, 1.1)); else if (q < 0.46) add('bush', x, z, sr(0.7, 1.5), tint(0.85, 1.1)); else if (q < 0.74 && q > 0.66) add(q < 0.7 ? 'rock' : 'rock2', x, z, sr(0.7, 2.6), tint(0.85, 1.05)); else if (q < 0.77) add('sakura', x, z, sr(0.8, 1.2), tint(0.95, 1.05)); }
  }
  for (const i of ISLANDS) for (let k = 0; k < 9; k++) { const a = sr(0, 6.28), r = sr(i.r * 0.45, i.r * 0.85); add(['sakura', 'oak', 'birch', 'bush'][k % 4], i.x + Math.cos(a) * r, i.z + Math.sin(a) * r, sr(0.7, 1.1), tint(0.95, 1.1), i.y); }
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28 + 0.2, r = sr(39, 43); add(k % 2 ? 'sakura' : 'oak', Math.cos(a) * r, Math.sin(a) * r, sr(0.9, 1.2), tint(0.95, 1.1)); }
  const buckets = {}; for (const o of list) { const k = o.t + '|' + Math.floor((o.x + 520) / 260) + '|' + Math.floor((o.z + 520) / 260); (buckets[k] = buckets[k] || []).push(o); }
  const dm = new T.Object3D();
  for (const k in buckets) { const arr = buckets[k]; for (const part of TYPES[arr[0].t]) { const im = new T.InstancedMesh(part.geo, part.mat, arr.length); arr.forEach((o, i) => { dm.position.set(o.x, o.y - 0.15, o.z); dm.rotation.set(0, o.ry, 0); dm.scale.setScalar(o.s); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); im.setColorAt(i, col.setHex(o.c === undefined ? 0xffffff : o.c)); }); im.castShadow = !NOSHADOW[part.m]; im.receiveShadow = part.m !== 'leaf' && part.m !== 'glow'; const kk = k.split('|'); im.userData.c = [kk[1] * 260 - 390, kk[2] * 260 - 390]; vegChunks.push(im); scene.add(im); } }

  // Gras & Blumen (in Kacheln, nur in der Nähe sichtbar)
  const tuft = (() => { const a = new T.PlaneGeometry(1, 1), b = new T.PlaneGeometry(1, 1); a.translate(0, 0.5, 0); b.translate(0, 0.5, 0); b.rotateY(PI / 2); const all = [a, b, a.clone(), b.clone()]; all.forEach((g, k) => { ensureIndex(g); if (k > 1) { g.setIndex(new T.BufferAttribute(g.index.array.slice(), 1)); const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } } const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); paint(g, 0xffffff, { g: 0.25 }); }); return merge(all); })();
  const gMat = windify(new T.MeshStandardMaterial({ map: TX.blade, alphaTest: 0.35, vertexColors: true, roughness: 1, envMapIntensity: 0.6 }), 0.32, 0);
  const fMat = windify(new T.MeshStandardMaterial({ map: TX.flower, alphaTest: 0.4, roughness: 1 }), 0.25, 0);
  const CS = 80; for (let cx = -440; cx < 440; cx += CS) for (let cz = -440; cz < 440; cz += CS) {
    const G = [], F = [];
    for (let n = 0; n < 2100; n++) { const x = cx + sr(0, CS), z = cz + sr(0, CS), h = terrainH(x, z); if (h < -1.2 || Math.hypot(x, z) < 25) continue; landColor(x, z, h, cc); if (cc[3] > 0.35 || cc[4] > 0.4) continue; const zn = zoneAt(x, z, 1.0); if ((zn === 'fels' && sr() < 0.8) || ((zn === 'glut' || zn === 'vulkan') && sr() < 0.93) || (zn === 'ruinen' && sr() < 0.7)) continue; if (n < 90 && (zn === 'wiese' || zn === '' || zn === 'hain' || zn === 'moor')) F.push([x, h, z, sr(0.9, 1.5)]); else G.push([x, h, z, sr(1.5, 2.6), sr(0.4, 0.85), cc[0], cc[1], cc[2]]); }
    for (const i of ISLANDS) if (i.x > cx - i.r && i.x < cx + CS + i.r && i.z > cz - i.r && i.z < cz + CS + i.r) for (let n = 0; n < 900; n++) { const x = cx + sr(0, CS), z = cz + sr(0, CS); if (Math.hypot(x - i.x, z - i.z) < i.r - 1.5) (n % 12 ? G : F).push([x, i.y, z, sr(1.1, 1.9), sr(0.45, 1.0), 0.34, 0.6, 0.24]); }
    const mk = (arr, mat, isG) => { if (!arr.length) return; const im = new T.InstancedMesh(tuft, mat, arr.length); arr.forEach((o, i) => { dm.position.set(o[0], o[1] - 0.05, o[2]); dm.rotation.set(0, sr(0, 3.14), 0); isG ? dm.scale.set(o[3], o[4], o[3]) : dm.scale.setScalar(o[3]); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); if (isG) { col.setRGB(o[5], o[6], o[7], T.SRGBColorSpace); const b = sr(1.35, 1.75); im.setColorAt(i, col.multiplyScalar(b)); } }); im.receiveShadow = true; im.userData.c = [cx + CS / 2, cz + CS / 2]; scene.add(im); grassCells.push(im); };
    mk(G, gMat, true); mk(F, fMat, false);
  }
  buildTown();
  // Wolken
  for (let k = 0; k < 30; k++) { const g = new T.Group(), n = 5 + Math.floor(sr(0, 5)), sc = sr(0.7, 1.5); for (let q = 0; q < n; q++) { const low = q % 2, s = new T.Sprite(new T.SpriteMaterial({ map: TX.soft, color: low ? 0xc9d6ea : 0xffffff, transparent: true, opacity: low ? 0.75 : 0.95, depthWrite: false, fog: false })); s.scale.set(sr(70, 120) * sc, sr(42, 66) * sc, 1); s.position.set((q - n / 2) * 30 * sc + sr(-8, 8), low ? -9 * sc : sr(0, 12) * sc, sr(-16, 16)); g.add(s); } g.position.set(sr(-1100, 1100), k < 8 ? sr(30, 52) : sr(150, 320), sr(-1100, 1100)); scene.add(g); clouds.push(g); }
  // Ferne Inseln am Horizont
  for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28 + sr(0, 0.3), r = sr(900, 1300), s = sr(90, 220), gm = displaced(2, 1.4, 2.5, false); const m = new T.Mesh(gm, new T.MeshBasicMaterial({ color: col.setHex(0x7fa8c8).lerp(col2.setHex(0xc4e2f4), sr(0.25, 0.6)).getHex(), fog: false })); m.scale.set(s * 2.4, s * sr(0.9, 1.9), s * 2.4); m.position.set(Math.cos(a) * r, -s * 0.3, Math.sin(a) * r); scene.add(m); }
}

function vegetationTypes() {
  const trunk = (h, r, bend, c, twist = 0) => { const g = new T.CylinderGeometry(r * 0.5, r, h, 8, 6); g.translate(0, h / 2, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = y / h, fl = 1 + Math.max(0, 0.18 - k) * 4; const a = twist * k, cs = Math.cos(a), sn = Math.sin(a); const X = (x * cs - z * sn) * fl + bend * k * k + Math.sin(k * 5) * twist * 0.25, Z = (x * sn + z * cs) * fl; p.setXYZ(i, X, y, Z); } g.computeVertexNormals(); return pc(g, c, null, null, null, 'bark', { g: 0.35 }); };
  const branch = (c, x, y, z, len, r, rz, ry) => pc(new T.CylinderGeometry(r * 0.45, r, len, 6), c, [x, y, z], null, [0, ry, rz], 'bark');
  const crown = (blobs, c1, c2, m = 'leaf') => blobs.map(b => pc('blob', c1, [b[0], b[1], b[2]], [b[3] * 2, b[3] * 1.7, b[3] * 2], [0, b[0] * 3 + b[2], 0], m, { top: c2, g: 0.45 }));
  const TY = {};
  TY.oak = parts([trunk(5.2, 0.62, 0.5, 0x7a5a3c), branch(0x7a5a3c, 1.2, 4.6, 0.2, 2.6, 0.24, -0.9, 0), branch(0x7a5a3c, -1.0, 4.9, -0.4, 2.4, 0.22, 0.95, 0.5), crown([[0.4, 7.6, 0, 3.0], [2.5, 6.4, 0.6, 2.2], [-2.1, 6.6, -0.8, 2.3], [0.2, 6.3, 2.3, 2.0], [-0.3, 6.5, -2.3, 2.0], [0.6, 9.4, -0.2, 1.9], [-1.4, 8.6, 1.2, 1.6]], 0x2f7a2c, 0x8fcc4a)]);
  TY.birch = parts([trunk(6.6, 0.3, 0.3, 0xe8e6dc), crown([[0.2, 7.4, 0, 2.0], [1.3, 6.2, 0.4, 1.5], [-1.1, 6.6, -0.5, 1.5], [0, 8.9, 0.1, 1.4], [0.2, 5.6, -1.2, 1.2]], 0x5fa83a, 0xc8e86a)]);
  TY.sakura = parts([trunk(4.4, 0.5, 1.0, 0x4a3530, 0.6), branch(0x4a3530, 1.9, 4.2, 0, 2.6, 0.2, -1.1, 0), branch(0x4a3530, -0.6, 4.4, 0.6, 2.4, 0.2, 0.9, -0.6), crown([[1.0, 6.4, 0, 2.7], [3.1, 5.6, 0.4, 1.9], [-1.3, 5.9, 0.9, 2.0], [0.8, 5.6, -2.0, 1.9], [0.9, 7.9, 0.2, 1.8], [2.2, 6.9, 1.6, 1.4]], 0xf08cb4, 0xffe3ee)]);
  const tiers = []; for (let i = 0; i < 5; i++) { const r = 3.3 - i * 0.58, g = new T.ConeGeometry(r, 3.3, 11, 2), p = g.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); if (y < -1.5) { const a = Math.atan2(p.getZ(k), p.getX(k)), j = (Math.round(a / 6.283 * 11) % 2 ? 1.12 : 0.8); p.setXYZ(k, p.getX(k) * j, y - (j > 1 ? 0.55 : 0), p.getZ(k) * j); } } g.computeVertexNormals(); tiers.push(pc(g, 0x1f5a34, [0, 3.6 + i * 1.75, 0], null, [0, i * 0.5, 0], 'leaf', { top: 0x5fa25a, g: 0.4 })); }
  TY.pine = parts([trunk(4, 0.45, 0, 0x5c4030), tiers]);
  TY.dark = parts([trunk(7, 0.8, 1.2, 0x54444c, 1.4), branch(0x54444c, 2.2, 6, 0, 3.4, 0.3, -1.0, 0.3), branch(0x54444c, -1.2, 5.6, 0.8, 3.2, 0.28, 1.0, -0.4), crown([[1.2, 9.4, 0, 3.4], [3.8, 7.8, 0.4, 2.4], [-2.4, 8, 1.0, 2.6], [1.0, 8, -2.8, 2.4], [1.0, 11.4, 0.2, 2.2], [-0.6, 6.6, -1.6, 1.9], [3.0, 6.2, 1.8, 1.5]], 0x12302e, 0x2f6a58), [[2.9, 5.5, 1.7], [-2.3, 6.3, 1.2], [1.1, 6.4, -2.9], [-0.7, 5.3, -1.7], [3.9, 6.2, 0.2]].map(q => pc('sph', 0x7dfff0, q, 0.34, null, 'glow'))]);
  TY.dead = parts([trunk(5, 0.5, 0.8, 0x2a201c, 0.8), branch(0x2a201c, 1.5, 4.2, 0, 2.6, 0.2, -1.0, 0), branch(0x2a201c, -0.7, 3.6, 0.5, 2.2, 0.18, 1.1, -0.5), branch(0x2a201c, 0.6, 5.2, -0.6, 2.0, 0.14, 0.4, 1.2), [[2.6, 4.9, 0], [-1.7, 4.1, 0.9], [0.9, 6.1, -0.9]].map(q => pc('sph', 0xff8a3a, q, 0.3, null, 'glow'))]);
  TY.bush = parts([crown([[0, 0.8, 0, 0.95], [0.9, 0.6, 0.2, 0.7], [-0.8, 0.6, -0.3, 0.75], [0.1, 0.55, 0.9, 0.6]], 0x2f7a2c, 0x8fcc4a, 'bush')]);
  const mossy = (x, y, z, ny, r, g, b) => ny > 0.45 ? [lerp(r, 0.2, 0.75), lerp(g, 0.36, 0.75), lerp(b, 0.12, 0.75)] : null;
  TY.rock = parts([pc('rock', 0x9a9a98, [0, 0.35, 0], [2, 1.4, 1.8], null, 'stone', { f: mossy, g: 0.3 }), pc('rock2', 0x8c8c8e, [1.1, 0.2, 0.5], [1, 0.8, 1.1], [0, 1, 0], 'stone', { f: mossy })]);
  TY.rock2 = parts([pc('rock2', 0x9a9690, [0, 0.9, 0], [1.6, 2.6, 1.5], [0.1, 0, 0.15], 'stone', { g: 0.35 }), pc('rock', 0x8a8680, [-0.9, 0.3, 0.4], [1.3, 0.9, 1.2], null, 'stone'), pc('rock', 0x8a8680, [0.8, 0.25, -0.5], [1, 0.7, 1], [0, 2, 0], 'stone')]);
  const shroom = (capC, capTop, spotC, glowC) => { const stem = pc(lathe([[0.01, 0], [0.62, 0], [0.5, 0.5], [0.34, 1.6], [0.3, 2.8], [0.4, 3.1], [0.01, 3.15]], 12), 0xf0e6d2, null, null, null, 'matte', { g: 0.35 }), cap = pc(lathe([[0.3, 0.0], [1.2, -0.05], [1.9, -0.18], [2.1, 0], [1.85, 0.5], [1.3, 0.95], [0.6, 1.2], [0.01, 1.25]], 16), capC, [0, 2.95, 0], null, null, 'gloss', { top: capTop, g: 0.3 }), ps = [stem, cap, pc('cyl', 0xe6d6bc, [0, 2.93, 0], [3.3, 0.06, 3.3], null, 'matte'), pc('torT', glowC, [0, 2.9, 0], [3.7, 3.7, 1.5], [PI / 2, 0, 0], 'glow')]; for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.5 + (i % 3) * 0.55, y = 2.95 + 1.2 - r * r * 0.26; ps.push(pc('sph', spotC, [Math.cos(a) * r, y, Math.sin(a) * r], [0.5 - r * 0.08, 0.14, 0.5 - r * 0.08], null, 'gloss')); } return parts(ps); };
  TY.shroomR = shroom(0xb8302a, 0xf0705a, 0xfff4e0, 0xffc890); TY.shroomP = shroom(0x5a2f9a, 0xb57af0, 0xbfffe8, 0x7dffd0);
  const cr = [pc('rock2', 0x2e2422, [0, 0.2, 0], [2.2, 0.9, 2.2], null, 'stone')]; for (let i = 0; i < 5; i++) { const a = i * 1.3, r = i ? 0.7 : 0, s = i ? sr(0.5, 0.9) : 1.2; cr.push(pc('cone4', 0xffa040, [Math.cos(a) * r, 1.4 * s, Math.sin(a) * r], [0.7 * s, 3.2 * s, 0.7 * s], [Math.sin(a) * 0.35 * (i ? 1 : 0), a, -Math.cos(a) * 0.35 * (i ? 1 : 0)], 'glow', { top: 0xfff0a0 })); }
  TY.crystal = parts(cr);
  const ic = [pc('rock', 0xe6eef6, [0, 0.2, 0], [2, 0.8, 2], null, 'stone')]; for (let i = 0; i < 5; i++) { const a = i * 1.3, r = i ? 0.7 : 0, s = i ? 0.7 : 1.2; ic.push(pc('cone4', 0x9fe0ff, [Math.cos(a) * r, 1.4 * s, Math.sin(a) * r], [0.7 * s, 3.2 * s, 0.7 * s], [Math.sin(a) * 0.35 * (i ? 1 : 0), a, -Math.cos(a) * 0.35 * (i ? 1 : 0)], 'gloss', { top: 0xffffff })); }
  TY.icecrystal = parts(ic);
  TY.pillar = parts([pc('cyl', 0xb0aab8, [0, 0.3, 0], [2.2, 0.6, 2.2], null, 'stone'), pc('cyl', 0xc4bece, [0, 2.6, 0], [1.3, 4.2, 1.3], [0.06, 0, 0.04], 'stone', { g: 0.3 }), pc('rock', 0xb0aab8, [0.2, 4.9, 0], [1.6, 0.7, 1.6], null, 'stone'), pc('box', 0x9f7aff, [0, 2.6, 0.67], [0.14, 1.6, 0.06], null, 'glow'), pc('box', 0x9f7aff, [0, 3.0, 0.67], [0.6, 0.14, 0.06], null, 'glow'), pc('rock2', 0xa49eac, [1.6, 0.4, 0.8], [1.3, 0.8, 1.1], null, 'stone')]);
  return TY;
}

function roofGeo(w, d, h) {
  const a = w / 2, b = d / 2, P = [], U = [], q = (p1, p2, p3, p4, uw, vh) => { P.push(...p1, ...p3, ...p2, ...p1, ...p4, ...p3); U.push(0, 0, uw, vh, uw, 0, 0, 0, 0, vh, uw, vh); }, sl = Math.hypot(a, h);
  q([-a, 0, b], [-a, 0, -b], [0, h, -b], [0, h, b], d / 3, sl / 2.2); q([a, 0, -b], [a, 0, b], [0, h, b], [0, h, -b], d / 3, sl / 2.2);
  P.push(-a, 0, b, a, 0, b, 0, h, b, a, 0, -b, -a, 0, -b, 0, h, -b); U.push(0, 0, 0.3, 0, 0.15, 0.1, 0, 0, 0.3, 0, 0.15, 0.1);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.computeVertexNormals(); return g;
}
function buildTown() {
  const { terrainH } = env, town = new T.Group(); scene.add(town); const Y = 1.5;
  const plaza = new T.Mesh(new T.CircleGeometry(25, 48), new T.MeshStandardMaterial({ map: TX.cobble, roughness: 0.9 })); plaza.rotation.x = -PI / 2; plaza.position.y = Y + 0.06; plaza.receiveShadow = true; town.add(plaza); groundMeshes.push(plaza);
  const roofs = [0xb8433a, 0x3f66c4, 0x3f8f52, 0xc98f2e, 0x7a4fb8, 0xa8483a];
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * PI * 2 + 0.52, x = Math.cos(a) * 34, z = Math.sin(a) * 34, w = 9 + (k % 3), d = 8 + (k % 2) * 1.5, h = 5 + (k % 2) * 1.2, rh = w * 0.52, g = new T.Group(), ps = [];
    ps.push(pc('box', 0xa8a39a, [0, 0.5, 0], [w + 0.5, 1, d + 0.5], null, 'stone'), pc('box', 0xffffff, [0, 1 + h / 2, 0], [w, h, d], null, 'plaster'));
    ps.push(pc(roofGeo(w + 1.6, d + 1.4, rh), roofs[k], [0, 1 + h, 0], null, null, 'roof'), pc('box', 0x5a3d26, [0, 1 + h + rh, 0], [0.4, 0.4, d + 1.6], null, 'wood'));
    for (const sx of [-1, 1]) ps.push(pc('box', 0x5a3d26, [sx * (w / 2 + 0.72), 1 + h + 0.05, 0], [0.3, 0.3, d + 1.5], null, 'wood'));
    ps.push(pc('box', 0x8c8478, [w * 0.26, 1 + h + rh * 0.75, -d * 0.2], [1.3, rh * 0.9, 1.3], null, 'stone'), pc('box', 0x6c665c, [w * 0.26, 1 + h + rh * 1.22, -d * 0.2], [1.6, 0.3, 1.6], null, 'stone'));
    const fz = d / 2;
    ps.push(pc('box', 0x7a5232, [0, 2.45, fz + 0.06], [1.9, 2.9, 0.16], null, 'wood'), pc('box', 0x40291a, [0, 2.45, fz + 0.03], [2.3, 3.2, 0.14], null, 'wood'), pc('sph', 0xd9b765, [0.6, 2.4, fz + 0.2], 0.16, null, 'metal'), pc('box', 0x9a948a, [0, 0.85, fz + 0.9], [3, 0.3, 1.6], null, 'stone'));
    const win = (wx, wy, wz, ry) => { const q = [pc('box', 0xffe2a0, [0, 0, 0], [1.5, 1.6, 0.1], null, 'glow', { top: 0xfff6d8 }), pc('box', 0x40291a, [0, 0, 0.03], [0.12, 1.7, 0.12], null, 'wood'), pc('box', 0x40291a, [0, 0, 0.03], [1.6, 0.12, 0.12], null, 'wood'), pc('box', 0x40291a, [0, 0.87, 0.02], [1.8, 0.16, 0.2], null, 'wood'), pc('box', 0x40291a, [0, -0.87, 0.06], [1.9, 0.18, 0.4], null, 'wood'), pc('box', roofs[(k + 2) % 6], [-1.12, 0, 0.03], [0.6, 1.7, 0.1], null, 'matte'), pc('box', roofs[(k + 2) % 6], [1.12, 0, 0.03], [0.6, 1.7, 0.1], null, 'matte')]; for (let i = 0; i < 5; i++) q.push(pc('sph', [0xff6f91, 0xffd84a, 0xffffff][i % 3], [-0.7 + i * 0.35, -0.68, 0.22], 0.26, null, 'matte'), pc('sph', 0x3f8f3a, [-0.6 + i * 0.3, -0.78, 0.16], 0.3, null, 'matte')); return xf(q, [wx, wy, wz], [0, ry, 0]); };
    ps.push(win(-w * 0.3, 3.4, fz + 0.03, 0), win(w * 0.3, 3.4, fz + 0.03, 0), win(w / 2 + 0.03, 3.4, 0, PI / 2), win(-w / 2 - 0.03, 3.4, 0, -PI / 2));
    if (k % 2) ps.push(pc('box', 0xffe2a0, [0, 1 + h + rh * 0.38, fz + 0.72], [1.1, 1.1, 0.1], null, 'glow'), pc('box', 0x40291a, [0, 1 + h + rh * 0.38, fz + 0.75], [1.3, 0.12, 0.12], null, 'wood'));
    build(g, ps).forEach(m => { m.receiveShadow = true; blockers.push(m); }); g.position.set(x, terrainH(x, z) - 0.25, z); g.rotation.y = Math.atan2(-x, -z); town.add(g); colliders.push({ x, z, r: Math.max(w, d) / 2 + 0.9 });
  }
  // Monument mit schwebendem Kristall
  const mon = new T.Group(); mon.position.y = Y; town.add(mon); const mp = [pc('cyl', 0xb9b4a8, [0, 0.3, 0], [9, 0.6, 9], null, 'stone'), pc('cyl', 0xcac5b8, [0, 0.8, 0], [6.4, 0.5, 6.4], null, 'stone'), pc('cyl', 0xdad5c8, [0, 1.25, 0], [4, 0.5, 4], null, 'stone'), pc('cyl', 0x2a86c4, [0, 1.06, 0], [5.6, 0.06, 5.6], null, 'gloss')];
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4, x = Math.cos(a) * 3.6, z = Math.sin(a) * 3.6; mp.push(pc('cyl', 0xd8d2c2, [x, 2.4, z], [0.7, 3.6, 0.7], null, 'stone'), pc('box', 0xc8c2b2, [x, 4.3, z], [1.1, 0.3, 1.1], null, 'stone'), pc('oct', 0x7fe4ff, [x, 5.0, z], [0.6, 1, 0.6], null, 'glow'), pc('box', 0x7fe4ff, [x * 0.92, 2.6, z * 0.92], [0.12, 1.6, 0.12], null, 'glow')); }
  build(mon, mp).forEach(m => { m.receiveShadow = true; }); colliders.push({ x: 0, z: 0, r: 4.8 });
  const cry = new T.Group(); build(cry, [pc('oct', 0x8feaff, null, [2.2, 4.4, 2.2], null, 'glow', { top: 0xffffff }), pc('oct', 0xffffff, null, [1.2, 2.6, 1.2], null, 'add')]); cry.add(glow(0x6fd8ff, 16, 0.6)); mon.add(cry);
  const mkRing = (r, c) => { const m = new T.Mesh(new T.TorusGeometry(r, 0.07, 6, 48), new T.MeshBasicMaterial({ color: c, toneMapped: false })); mon.add(m); return m; }, r1 = mkRing(3.2, 0xfff0a0), r2 = mkRing(3.8, 0x8feaff);
  anims.push(t => { cry.position.y = 6.2 + Math.sin(t * 1.3) * 0.4; cry.rotation.y = t * 0.6; r1.position.y = r2.position.y = cry.position.y; r1.rotation.set(1.2, t * 0.8, 0); r2.rotation.set(t * 0.5, 0, 1.0); if (Math.random() < 0.3) pAdd.emit({ x: rnd(-2, 2), y: Y + rnd(2, 8), z: rnd(-2, 2), n: 1, vy: 1.2, vs: 0.4, life: 1.6, size: 0.5, c: 0x8feaff }); });
  // Laternen, Zäune, Stände
  const props = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2, x = Math.cos(a) * 23, z = Math.sin(a) * 23; props.push(xf([pc('cyl', 0x2c2c34, [0, 2, 0], [0.22, 4, 0.22], null, 'metal'), pc('cyl', 0x2c2c34, [0, 0.15, 0], [0.7, 0.3, 0.7], null, 'metal'), pc('box', 0x2c2c34, [0.45, 3.9, 0], [1, 0.12, 0.12], null, 'metal'), pc('box', 0xffe2a0, [0.9, 3.45, 0], [0.5, 0.65, 0.5], null, 'glow', { top: 0xffffff }), pc('cone4', 0x2c2c34, [0.9, 3.95, 0], [0.8, 0.4, 0.8], [0, PI / 4, 0], 'metal')], [x, Y, z], [0, -a + PI, 0])); const gl = glow(0xffc870, 6, 0.5); gl.position.set(x - Math.cos(a) * 0.9, Y + 3.45, z - Math.sin(a) * 0.9); town.add(gl); }
  for (let i = 0; i < 40; i++) { const a = i / 40 * PI * 2; if (i % 8 < 2) continue; const x = Math.cos(a) * 47, z = Math.sin(a) * 47, y = terrainH(x, z); props.push(xf([pc('cyl6', 0x7a5a3c, [0, 0.8, 0], [0.32, 1.7, 0.32], null, 'wood'), pc('box', 0x8a6a48, [0, 1.15, 3.6], [0.14, 0.24, 7.3], null, 'wood'), pc('box', 0x8a6a48, [0, 0.6, 3.6], [0.14, 0.24, 7.3], null, 'wood')], [x, y - 0.1, z], [0, -a, 0])); }
  const barrel = (x, z) => xf([pc(lathe([[0.01, 0], [0.5, 0], [0.62, 0.6], [0.5, 1.2], [0.01, 1.2]], 12), 0x9a7248, null, null, null, 'wood'), pc('tor', 0x3a3a42, [0, 0.3, 0], [1.15, 1.15, 0.5], [PI / 2, 0, 0], 'metal'), pc('tor', 0x3a3a42, [0, 0.9, 0], [1.15, 1.15, 0.5], [PI / 2, 0, 0], 'metal')], [x, Y, z]);
  const crate = (x, z, s, fr) => { const q = [pc('box', 0xb08a58, [0, s / 2, 0], [s, s, s], null, 'wood')]; if (fr !== undefined) for (let i = 0; i < 7; i++) q.push(pc('sph', fr, [((i % 3) - 1) * s * 0.28, s + 0.08, (Math.floor(i / 3) - 1) * s * 0.28], s * 0.34, null, 'gloss')); return xf(q, [x, Y, z], [0, sr(0, 1), 0]); };
  // Marktstand (Tessa)
  props.push(xf([pc('box', 0x9a7248, [0, 1.1, 0], [5, 0.2, 2.2], null, 'wood'), [-2.3, 2.3].map(x => [pc('cyl6', 0x6a4a2c, [x, 1.9, -1], [0.2, 3.8, 0.2], null, 'wood'), pc('cyl6', 0x6a4a2c, [x, 1.6, 1], [0.2, 3.2, 0.2], null, 'wood')]), [0, 1, 2, 3, 4].map(i => pc('box', i % 2 ? 0xf2efe6 : 0xd6453c, [-2 + i * 1, 3.55, 0], [1, 0.1, 2.9], [0.28, 0, 0], 'matte')), [0, 1, 2, 3].map(i => pc('sph', [0xff4a3a, 0xffa030, 0x8fd040, 0xb060e0][i], [-1.6 + i * 1.05, 1.42, 0.2], 0.42, null, 'gloss')), pc('box', 0xb08a58, [-1.6, 1.3, -0.4], [0.9, 0.3, 0.9], null, 'wood'), [0, 1, 2].map(i => pc('cyl', [0xff6f91, 0x6fd8ff, 0x7dff8e][i], [0.9 + i * 0.5, 1.5, -0.4], [0.24, 0.55, 0.24], null, 'gloss'))], [-16.5, Y, 8.5], [0, 1.2, 0]), crate(-14.5, 12, 1.2, 0xff4a3a), crate(-18.5, 5, 1.0, 0xffa030), barrel(-19.5, 7.5), barrel(-13, 13.5));
  // Schmiede (Borin)
  props.push(xf([pc('box', 0x77726a, [0, 1, 0], [3.4, 2, 2.6], null, 'stone'), pc('box', 0xff7a2a, [0, 2.02, 0.2], [2.2, 0.12, 1.6], null, 'glow', { top: 0xffe08a }), pc('box', 0x66615a, [0, 4, -0.9], [1.6, 4.4, 1], null, 'stone'), pc('box', 0x2c2c34, [3, 0.5, 1.2], [0.9, 1, 0.7], null, 'wood'), pc('box', 0x3a3a44, [3, 1.2, 1.2], [1.7, 0.36, 0.6], null, 'metal'), pc('cone', 0x3a3a44, [4.1, 1.2, 1.2], [0.36, 0.8, 0.5], [0, 0, -PI / 2], 'metal'), pc('box', 0x6a4a2c, [-3, 1.4, 0.5], [0.2, 2.8, 2.4], null, 'wood'), [0, 1, 2].map(i => [pc('cyl4', 0xcfd6e6, [-2.85, 1.7, -0.2 + i * 0.7], [0.16, 1.9, 0.05], null, 'metal'), pc('box', 0xd9b765, [-2.85, 0.75, -0.2 + i * 0.7], [0.1, 0.1, 0.5], null, 'metal')])], [-14.5, Y, -16.5], [0, 0.75, 0]), barrel(-9, -19));
  const fg = glow(0xff8a3a, 7, 0.55); fg.position.set(-14.5, Y + 2.4, -16.5); town.add(fg);
  anims.push(() => { if (Math.random() < 0.35) pAdd.emit({ x: -14.5 + rnd(-0.8, 0.8), y: Y + 2.2, z: -16.5 + rnd(-0.6, 0.6), n: 1, vy: 2.4, vs: 0.6, life: 1.4, size: 0.35, c: 0xffa040, c2: 0xff3010 }); });
  // Übungsplatz (Kaela)
  props.push(xf([pc('cyl6', 0x7a5a3c, [0, 1.4, 0], [0.3, 2.8, 0.3], null, 'wood'), pc('box', 0x7a5a3c, [0, 2.1, 0], [2.2, 0.26, 0.26], null, 'wood'), pc('sph', 0xd8c090, [0, 1.6, 0], [1, 1.5, 0.8], null, 'matte', { g: 0.3 }), pc('sph', 0xd8c090, [0, 2.9, 0], 0.75, null, 'matte'), pc('tor', 0xd6453c, [0, 1.7, 0.42], [0.6, 0.6, 0.3], null, 'matte')], [17.5, Y, -15], [0, -0.8, 0]));
  for (const [bx, bz] of [[14, -19], [20.5, -11]]) props.push(xf([pc('cyl', 0x4a3a2a, [0, 3, 0], [0.18, 6, 0.18], null, 'wood'), pc('sph', 0xd9b765, [0, 6.1, 0], 0.4, null, 'metal'), pc('box', 0x3a6ad6, [0.75, 4.4, 0], [1.4, 2.8, 0.06], null, 'cloth', { top: 0x6fa0ff }), pc('oct', 0xffe07a, [0.75, 4.6, 0.05], [0.6, 0.6, 0.05], null, 'glow')], [bx, Y, bz], [0, sr(0, 3), 0]));
  const circle = new T.Mesh(new T.PlaneGeometry(7, 7), new T.MeshBasicMaterial({ map: TX.rune, color: 0x6fb8ff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); circle.rotation.x = -PI / 2; circle.position.set(12, Y + 0.12, -10); town.add(circle); anims.push(t => { circle.rotation.z = t * 0.3; circle.material.opacity = 0.55 + Math.sin(t * 2) * 0.2; });
  // Flugplatz (Ivo)
  props.push(xf([pc('box', 0x7a5a3c, [0, 0.9, 0], [3.6, 0.2, 0.3], null, 'wood'), pc('cyl6', 0x7a5a3c, [-1.7, 0.5, 0], [0.2, 1, 0.2], null, 'wood'), pc('cyl6', 0x7a5a3c, [1.7, 0.5, 0], [0.2, 1, 0.2], null, 'wood'), [0, 1, 2].map(i => [pc('sph', [0x4fc0a8, 0xffd23c, 0xe0607a][i], [-1.1 + i * 1.1, 1.5, 0.25], [0.7, 2.6, 0.14], [0.22, 0, 0], 'gloss'), pc('sph', 0xbff8ff, [-1.1 + i * 1.1, 1.5, 0.18], [0.3, 2.0, 0.08], [0.22, 0, 0], 'glow')]), pc('cyl', 0xdfe6f2, [3, 3.5, 0], [0.14, 7, 0.14], null, 'metal'), pc('cone', 0xff7a3a, [3.9, 6.6, 0], [0.7, 2, 0.7], [0, 0, -PI / 2], 'cloth', { top: 0xffffff })], [23, Y, 7], [0, -1.2, 0]));
  // Bank & Aushang (Mira)
  props.push(xf([pc('box', 0x9a7248, [0, 0.6, 0], [3, 0.16, 0.9], null, 'wood'), pc('box', 0x9a7248, [0, 1.15, -0.4], [3, 0.7, 0.12], null, 'wood'), pc('box', 0x6a4a2c, [-1.3, 0.3, 0], [0.16, 0.6, 0.8], null, 'wood'), pc('box', 0x6a4a2c, [1.3, 0.3, 0], [0.16, 0.6, 0.8], null, 'wood')], [10, Y, 15], [0, 2.6, 0]), xf([pc('cyl6', 0x6a4a2c, [-1.2, 1.3, 0], [0.2, 2.6, 0.2], null, 'wood'), pc('cyl6', 0x6a4a2c, [1.2, 1.3, 0], [0.2, 2.6, 0.2], null, 'wood'), pc('box', 0x9a7248, [0, 1.9, 0], [2.6, 1.6, 0.14], null, 'wood'), pc(roofGeo(3.2, 0.8, 0.5), 0xb8433a, [0, 2.75, 0], null, null, 'roof'), [[-0.7, 2.1, 0xfff6dc], [0.1, 1.8, 0xffe9b0], [0.75, 2.15, 0xf2efe6]].map(q => pc('box', q[2], [q[0], q[1], 0.09], [0.6, 0.75, 0.02], [0, 0, sr(-0.15, 0.15)], 'matte'))], [2, Y, 16], [0, 2.9, 0]));
  build(town, props).forEach(m => { m.receiveShadow = true; });
}

/* ---------- Partikel ---------- */
let pAdd, pNorm;
function PSys(n, blending) {
  const pos = new Float32Array(n * 3), colr = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), P = []; for (let i = 0; i < n; i++) P.push({ life: 0 });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(colr, 3)); g.setAttribute('size', new T.BufferAttribute(size, 1)); g.setAttribute('alpha', new T.BufferAttribute(alpha, 1));
  const m = new T.ShaderMaterial({
    uniforms: { uS: { value: 600 } }, transparent: true, depthWrite: false, blending, vertexColors: true,
    vertexShader: 'attribute float size; attribute float alpha; varying vec3 vC; varying float vA; uniform float uS; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uS / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.08, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }',
  });
  const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts); let cur = 0;
  return {
    emit(o) { for (let k = 0; k < (o.n || 1); k++) { const q = P[cur]; cur = (cur + 1) % n; const s = o.spread || 0, vs = o.vs || 0; q.x = o.x + rnd(-s, s); q.y = o.y + rnd(-s, s) * (o.flat ? 0.1 : 1); q.z = o.z + rnd(-s, s); q.vx = (o.vx || 0) + rnd(-vs, vs); q.vy = (o.vy || 0) + rnd(-vs, vs); q.vz = (o.vz || 0) + rnd(-vs, vs); q.g = o.g || 0; q.drag = o.drag || 0; q.max = q.life = (o.life || 1) * rnd(0.7, 1.2); q.size = (o.size || 0.5) * rnd(0.7, 1.3); col.setHex(o.c === undefined ? 0xffffff : o.c); q.r = col.r; q.gg = col.g; q.b = col.b; if (o.c2 !== undefined) { col.setHex(o.c2); q.r2 = col.r; q.g2 = col.g; q.b2 = col.b; } else { q.r2 = q.r; q.g2 = q.gg; q.b2 = q.b; } q.wob = o.wob || 0; q.ph = rnd(0, 6); } },
    update(dt, t) { m.uniforms.uS.value = renderer.domElement.height / (2 * Math.tan(camera.fov * PI / 360)); for (let i = 0; i < n; i++) { const q = P[i]; if (q.life <= 0) { if (alpha[i] !== 0) { alpha[i] = 0; size[i] = 0; } continue; } q.life -= dt; const k = 1 - q.life / q.max; q.vy -= q.g * dt; if (q.drag) { const f = Math.max(0, 1 - q.drag * dt); q.vx *= f; q.vy *= f; q.vz *= f; } q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; if (q.wob) { q.x += Math.sin(t * 2 + q.ph) * q.wob * dt; q.z += Math.cos(t * 1.7 + q.ph) * q.wob * dt; } pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z; colr[i * 3] = lerp(q.r, q.r2, k); colr[i * 3 + 1] = lerp(q.gg, q.g2, k); colr[i * 3 + 2] = lerp(q.b, q.b2, k); size[i] = q.size * (1 - k * 0.5); alpha[i] = q.life <= 0 ? 0 : Math.min(1, k * 8) * (1 - k * k); } for (const a of ['position', 'color', 'size', 'alpha']) g.attributes[a].needsUpdate = true; },
  };
}
function initParticles() { pAdd = PSys(2600, T.AdditiveBlending); pNorm = PSys(900, T.NormalBlending); }

/* ---------- Effekte ---------- */
const fxs = [];
function addFx(obj, dur, upd) { scene.add(obj); fxs.push({ obj, t: 0, dur, upd }); return obj; }
const flat = (map, color, size, add = true) => { const m = new T.Mesh(B.plane, new T.MeshBasicMaterial({ map, color, transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide, blending: add ? T.AdditiveBlending : T.NormalBlending })); m.rotation.x = -PI / 2; m.scale.setScalar(size); return m; };
const fx = {
  ring(x, y, z, color, radius, dur = 0.55) { const m = new T.Mesh(new T.RingGeometry(0.9, 1, 40), new T.MeshBasicMaterial({ color, transparent: true, side: T.DoubleSide, depthWrite: false, toneMapped: false })); m.rotation.x = -PI / 2; m.position.set(x, y + 0.2, z); addFx(m, dur, k => { m.scale.setScalar(0.3 + (1 - (1 - k) * (1 - k)) * radius); m.material.opacity = 0.85 * (1 - k); }); pAdd.emit({ x, y: y + 0.3, z, n: Math.round(radius * 3), spread: 0.4, vs: radius * 1.3, vy: 1, life: 0.6, size: 0.45, c: color, drag: 2, flat: true }); },
  rune(x, y, z, color, size, dur = 1.1) { const m = flat(TX.rune, color, size); m.position.set(x, y + 0.15, z); addFx(m, dur, k => { m.rotation.z = k * 3; m.material.opacity = Math.sin(k * PI); m.scale.setScalar(size * (0.6 + k * 0.5)); }); },
  hit(x, y, z, color = 0xffffff, s = 1) { const g = glow(color, 3.2 * s, 1); g.position.set(x, y, z); addFx(g, 0.22, k => { g.scale.setScalar(3.2 * s * (0.5 + k)); g.material.opacity = 1 - k; }); pAdd.emit({ x, y, z, n: 12, spread: 0.2 * s, vs: 7 * s, g: 14, life: 0.45, size: 0.4 * s, c: 0xffffff, c2: color, drag: 1.5 }); },
  kill(x, y, z, color, s = 1) { pAdd.emit({ x, y, z, n: 34, spread: 0.6 * s, vs: 6 * s, vy: 3, g: 6, life: 0.9, size: 0.7 * s, c: color, c2: 0xffffff, drag: 1.2 }); pNorm.emit({ x, y, z, n: 14, spread: 0.8 * s, vs: 2.4 * s, vy: 2, life: 1.1, size: 2.4 * s, c: 0xf2f2f2, c2: 0x888888, drag: 1.5 }); const g = glow(color, 6 * s, 0.9); g.position.set(x, y, z); addFx(g, 0.35, k => { g.scale.setScalar(6 * s * (0.5 + k * 1.3)); g.material.opacity = 0.9 * (1 - k); }); },
  slash(o, rot, color = 0xffffff, s = 1) { const m = flat(TX.slash, color, 5.2 * s); m.rotation.set(-PI / 2 + 0.5, 0, 0); const g = new T.Group(); g.add(m); g.position.set(o.x + Math.sin(rot) * 1.6, o.y + 1.7, o.z + Math.cos(rot) * 1.6); g.rotation.y = rot + PI; addFx(g, 0.26, k => { m.rotation.z = -1.1 + k * 2.4; m.material.opacity = 1 - k * k; }); },
  bolt(x, y, z, color = 0xd0c0ff) { const pts = []; let px = x + rnd(-4, 4), pz = z + rnd(-4, 4); for (let i = 0; i <= 9; i++) { const k = i / 9; pts.push(new T.Vector3(lerp(px, x, k) + (i < 9 ? rnd(-1.4, 1.4) : 0), y + (1 - k) * 34, lerp(pz, z, k) + (i < 9 ? rnd(-1.4, 1.4) : 0))); } const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.22, 5), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false, blending: T.AdditiveBlending, depthWrite: false })); addFx(m, 0.32, k => { m.material.opacity = k < 0.5 ? 1 : (Math.random() < 0.5 ? 1 : 0.2) * (1 - k) * 2; }); const g = glow(color, 16, 1); g.position.set(x, y + 1, z); addFx(g, 0.35, k => { g.material.opacity = 1 - k; }); pAdd.emit({ x, y: y + 1, z, n: 30, vs: 10, g: 10, life: 0.5, size: 0.5, c: 0xffffff, c2: color }); },
  beam(x, y, z, color = 0xfff2a0) { const m = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 44, 18, 1, true), new T.MeshBasicMaterial({ color, transparent: true, side: T.DoubleSide, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending })); m.position.set(x, y + 22, z); addFx(m, 0.6, k => { const s = k < 0.2 ? k * 5 : 1 - (k - 0.2) / 0.8; m.scale.set(s, 1, s); m.material.opacity = 0.85 * s; }); fx.rune(x, y, z, color, 7, 0.7); pAdd.emit({ x, y: y + 1, z, n: 26, spread: 1, vy: 9, vs: 2.5, life: 0.8, size: 0.6, c: color }); },
  shards(x, y, z, radius) { for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + rnd(0, 0.3), r = radius * rnd(0.35, 1), s = rnd(0.7, 1.5), m = new T.Mesh(B.cone4, new T.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, toneMapped: false })); m.position.set(x + Math.cos(a) * r, y, z + Math.sin(a) * r); m.rotation.set(rnd(-0.3, 0.3), a, rnd(-0.3, 0.3)); addFx(m, 0.9, k => { const u = k < 0.15 ? k / 0.15 : 1; m.scale.set(0.7 * s, 3.4 * s * u, 0.7 * s); m.position.y = y + 1.5 * s * u - 0.4; m.material.opacity = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1; }); } pAdd.emit({ x, y: y + 1, z, n: 60, spread: radius * 0.7, vs: 3, vy: 3, g: 4, life: 1.1, size: 0.5, c: 0xffffff, c2: 0x7fd8ff, flat: true }); },
  rain(x, y, z, radius, color = 0xffe08a) { for (let i = 0; i < 46; i++) pAdd.emit({ x: x + rnd(-radius, radius) * 0.75, y: y + rnd(14, 26), z: z + rnd(-radius, radius) * 0.75, n: 1, vy: -46, vx: 2, life: 0.5, size: 0.55, c: color, c2: 0xffffff }); },
  heal(o, color = 0x7dff8e) { for (let i = 0; i < 26; i++) { const a = rnd(0, 6.28), r = rnd(0.4, 1.4); pAdd.emit({ x: o.x + Math.cos(a) * r, y: o.y + rnd(0, 1), z: o.z + Math.sin(a) * r, n: 1, vy: rnd(2.5, 5), life: 1, size: 0.55, c: color, c2: 0xffffff }); } fx.rune(o.x, o.y, o.z, color, 5.5, 0.9); },
  levelUp(o) { const m = new T.Mesh(new T.CylinderGeometry(1.9, 1.9, 22, 20, 1, true), new T.MeshBasicMaterial({ color: 0xffe07a, transparent: true, depthWrite: false, toneMapped: false })); addFx(m, 1.5, k => { m.position.set(o.x, o.y + 11, o.z); m.material.opacity = 0.28 * (1 - k); m.scale.set(1 + k * 0.8, 1, 1 + k * 0.8); for (let i = 0; i < 3; i++) { const a = k * 16 + i * 2.1, r = 1.8; pAdd.emit({ x: o.x + Math.cos(a) * r, y: o.y + k * 7, z: o.z + Math.sin(a) * r, n: 1, vy: 2, life: 0.8, size: 0.6, c: 0xfff0a0, c2: 0xffa020 }); } }); fx.ring(o.x, o.y, o.z, 0xffe07a, 10, 0.9); fx.rune(o.x, o.y, o.z, 0xffe07a, 9, 1.5); },
  trail(p, color, s = 1) { pAdd.emit({ x: p.x, y: p.y, z: p.z, n: 2, spread: 0.12, vs: 0.6, life: 0.4, size: 0.6 * s, c: color, c2: 0xffffff }); },
  dust(x, y, z) { pNorm.emit({ x, y: y + 0.15, z, n: 1, spread: 0.2, vs: 0.5, vy: 0.7, life: 0.6, size: 1.1, c: 0xd8c8a8, c2: 0xb8a888, drag: 2 }); },
  board(x, y, z, color) { pAdd.emit({ x, y, z, n: 2, spread: 0.25, vs: 0.5, vy: -1, life: 0.7, size: 0.6, c: color, c2: 0xffffff }); },
};
function projectile(kind, color) {
  const g = new T.Group();
  if (kind === 'arrow') { build(g, [pc('cyl', 0xd8c090, null, [0.07, 1.7, 0.07], [PI / 2, 0, 0], 'matte'), pc('cone', 0xdfe6f2, [0, 0, 0.95], [0.2, 0.4, 0.2], [PI / 2, 0, 0], 'metal'), pc('box', color, [0, 0, -0.75], [0.3, 0.02, 0.4], null, 'glow'), pc('box', color, [0, 0, -0.75], [0.02, 0.3, 0.4], null, 'glow')]); g.add(glow(color, 1.6, 0.5)); }
  else { build(g, [pc('sph', 0xffffff, null, 0.42, null, 'glow'), pc('sph', color, null, 0.8, null, 'add')]); g.add(glow(color, 4.2, 0.9)); }
  scene.add(g); return g;
}
function loot(gold, rc) {
  const g = new T.Group();
  if (gold) { build(g, [pc('cyl', 0xffd23c, null, [0.75, 0.13, 0.75], [PI / 2, 0, 0], 'metal'), pc('cyl', 0xfff0a0, null, [0.5, 0.15, 0.5], [PI / 2, 0, 0], 'metal')]); g.add(glow(0xffd23c, 1.8, 0.5)); }
  else { build(g, [pc('box', 0x7a4fb8, [0, 0, 0], [0.7, 0.5, 0.5], null, 'matte', { g: 0.3 }), pc('cyl', 0x8a5fc8, [0, 0.25, 0], [0.5, 0.7, 0.5], [0, 0, PI / 2], 'matte'), pc('box', 0xd9b765, [0, 0.1, 0], [0.16, 0.78, 0.54], null, 'metal'), pc('box', 0xffe07a, [0, 0.12, 0.27], [0.2, 0.2, 0.06], null, 'glow')]); const b = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 7, 8, 1, true), new T.MeshBasicMaterial({ color: rc || 0xc89cff, transparent: true, opacity: rc ? 0.7 : 0.4, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide })); b.position.y = 3.5; if (rc) b.scale.set(1.8, 1.6, 1.8); g.add(b); g.add(glow(rc || 0xc89cff, rc ? 3.6 : 2.4, 0.6)); }
  scene.add(g); return g;
}
let selRing;
function selection() { if (!selRing) { selRing = flat(TX.ringSel, 0xff5a4a, 3.6); selRing.visible = false; scene.add(selRing); } return selRing; }

/* ---------- Pro Bild ---------- */
let ambT = 0, fpsT = 0, fpsN = 0, vegAll = false;
function frame(dt, time, f, zone) {
  uTime.value = time; TX.waterN.offset.set(time * 0.006, time * 0.004); water.position.x = Math.round(f.x / 30) * 30; water.position.z = Math.round(f.z / 30) * 30;
  dome.position.copy(camera.position);
  sun.position.set(f.x + SUN.x * 220, f.y + SUN.y * 220, f.z + SUN.z * 220); sun.target.position.set(f.x, f.y, f.z);
  for (const c of clouds) { c.position.x += dt * 3; if (c.position.x > 1150) c.position.x = -1150; }
  const gr = quality === 'niedrig' ? 0 : quality === 'mittel' ? 110 : 170; for (const c of grassCells) c.visible = Math.hypot(c.userData.c[0] - f.x, c.userData.c[1] - f.z) < gr;
  if (quality !== 'hoch') { const vr = quality === 'mittel' ? 520 : 380; for (const c of vegChunks) c.visible = Math.hypot(c.userData.c[0] - f.x, c.userData.c[1] - f.z) < vr; } else if (vegAll !== true) { for (const c of vegChunks) c.visible = true; } vegAll = quality === 'hoch';
  for (const a of anims) a(time, dt);
  // Umgebungs-Partikel je nach Gebiet
  ambT += dt; while (ambT > 0.05) { ambT -= 0.05; const x = f.x + rnd(-32, 32), z = f.z + rnd(-32, 32), y = f.y + rnd(-1, 9);
    if (zone === 'wald') pAdd.emit({ x, y, z, life: 4, size: 0.42, c: 0xd8ff7a, c2: 0x7dffb0, wob: 1.6, vs: 0.2 });
    else if (zone === 'frost') { pNorm.emit({ x, y: y + 6, z, life: 5, size: 0.4, c: 0xffffff, vy: -2.2, vx: 0.8, wob: 1 }); pNorm.emit({ x: f.x + rnd(-32, 32), y: y + 6, z: f.z + rnd(-32, 32), life: 5, size: 0.3, c: 0xffffff, vy: -2.6, vx: 0.8, wob: 1 }); }
    else if (zone === 'ruinen') pAdd.emit({ x, y, z, life: 4, size: 0.35, c: 0x9f7aff, vy: 0.4, wob: 0.8 });
    else if (zone === 'hain' || zone === 'moor') pAdd.emit({ x, y, z, life: 4, size: 0.4, c: 0xc89cff, c2: 0x7dffd0, vy: 0.5, wob: 0.8 });
    else if (zone === 'glut' || zone === 'vulkan') pAdd.emit({ x, y: f.y + rnd(-2, 2), z, life: 3, size: 0.4, c: 0xffa040, c2: 0xff3010, vy: 2.6, wob: 1.2 });
    else if (zone === 'isl') pAdd.emit({ x, y, z, life: 3, size: 0.45, c: 0xbfeaff, vy: 0.6, wob: 0.6 });
    else if (zone === 'town' || zone === 'wiese') pNorm.emit({ x, y: y + 5, z, life: 5, size: 0.55, c: 0xffc8dc, c2: 0xffffff, vy: -1.1, vx: 0.9, wob: 1.4 });
    else if (Math.random() < 0.4) pNorm.emit({ x, y, z, life: 4, size: 0.3, c: 0xffffff, vy: 0.2, vx: 0.5, wob: 1 });
  }
  pAdd.update(dt, time); pNorm.update(dt, time);
  for (let i = fxs.length - 1; i >= 0; i--) { const e = fxs[i]; e.t += dt; const k = Math.min(1, e.t / e.dur); e.upd(k); if (k >= 1) { scene.remove(e.obj); e.obj.traverse(o => { if (o.isSprite) { o.material.dispose(); return; } if (o.material && o.material.dispose && !Object.values(M).includes(o.material)) o.material.dispose(); if (o.geometry && !Object.values(B).includes(o.geometry)) o.geometry.dispose(); }); fxs.splice(i, 1); } }
  if (selRing && selRing.visible) selRing.rotation.z += dt * 1.5;
  renderer.render(scene, camera);
  // Automatisch herunterschalten, wenn es ruckelt
  fpsT += dt; fpsN++; if (fpsT > 4) { const fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if (fps < 22 && time > 8 && quality !== 'niedrig' && api.auto) { setQuality(quality === 'hoch' ? 'mittel' : 'niedrig'); if (api.onQuality) api.onQuality(quality); } }
}

const api = { init, frame, setQuality, fx, projectile, loot, selection, glow, pc, build, parts, mirror, xf, lathe, tube, tex, auto: true, get quality() { return quality; }, get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; }, groundMeshes, blockers, colliders, B, M, TX, particles: () => ({ add: pAdd, norm: pNorm }), T, lerp, clamp, rnd };
return api;
})();
