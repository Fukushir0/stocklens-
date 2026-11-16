'use strict';
/* Wolkenreich – Figuren: Helden mit Klassen-Outfits, Waffen, Animationen und Monster */
(() => {
const { pc, build, mirror, xf, lathe, tube, glow, tex, M, T, lerp, clamp, rnd } = GFX; const PI = Math.PI;
const SKIN = 0xffd6b4, GOLD = 0xe2b84e, STEEL = 0xaab6c8, LEATHER = 0x6a4a2c, DARK = 0x2c2c38;
const shade = (c, k) => { const q = new T.Color(c); return k > 0 ? q.lerp(new T.Color(0xffffff), k).getHex() : q.multiplyScalar(1 + k).getHex(); };
const bone = (parent, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const ease = k => k * k * (3 - 2 * k), seg = (k, a, b) => ease(clamp((k - a) / (b - a), 0, 1));

/* ---------- Gesicht & Haare ---------- */
const faces = {};
function faceMat(skin, eye) {
  const key = skin + '|' + eye; if (faces[key]) return faces[key];
  const hx = c => '#' + c.toString(16).padStart(6, '0');
  const t = tex(512, 256, c => {
    c.fillStyle = hx(skin); c.fillRect(0, 0, 512, 256); const cx = 128, ey = 138;
    for (const s of [-1, 1]) {
      const ex = cx + s * 37; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, 17, 22, 0, 0, PI * 2); c.fill();
      const g = c.createLinearGradient(0, ey - 20, 0, ey + 20); g.addColorStop(0, hx(shade(eye, -0.55))); g.addColorStop(0.55, hx(eye)); g.addColorStop(1, hx(shade(eye, 0.5))); c.fillStyle = g; c.beginPath(); c.ellipse(ex, ey + 2, 13.5, 19, 0, 0, PI * 2); c.fill();
      c.fillStyle = '#160c1c'; c.beginPath(); c.ellipse(ex, ey + 2, 6.5, 10, 0, 0, PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex - 5, ey - 8, 5.2, 0, PI * 2); c.fill(); c.beginPath(); c.arc(ex + 5, ey + 9, 2.6, 0, PI * 2); c.fill();
      c.strokeStyle = '#2a1820'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - 19, ey - 9); c.quadraticCurveTo(ex, ey - 30, ex + 19, ey - 9); c.stroke();
      c.lineWidth = 3; c.beginPath(); c.moveTo(ex - s * 16, ey - 38); c.quadraticCurveTo(ex, ey - 44, ex + s * 15, ey - 39); c.stroke();
      c.fillStyle = 'rgba(255,110,120,0.32)'; c.beginPath(); c.ellipse(cx + s * 54, ey + 27, 14, 7, 0, 0, PI * 2); c.fill();
    }
    c.strokeStyle = '#a84a50'; c.lineWidth = 3; c.beginPath(); c.arc(cx, ey + 34, 9, 0.2 * PI, 0.8 * PI); c.stroke();
    c.strokeStyle = 'rgba(160,90,70,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 2, ey + 19); c.lineTo(cx + 2, ey + 21); c.stroke();
  });
  return (faces[key] = new T.MeshStandardMaterial({ map: t, roughness: 0.75 }));
}
function hairPieces(style, c) {
  const hi = shade(c, 0.14), o = { top: hi, g: 0.22 }, ps = [pc('hemi', c, [0, 0.02, -0.03], 1.13, [-0.36, 0, 0], 'matte', o)];
  for (let i = -2; i <= 2; i++) ps.push(pc('cone', c, [i * 0.17, 0.2 - Math.abs(i) * 0.035, 0.45 - Math.abs(i) * 0.05], [0.22, 0.36 + (i % 2 ? 0.06 : 0), 0.1], [PI - 0.22, 0, i * 0.13], 'matte', o));
  for (const s of [-1, 1]) ps.push(pc('cone', c, [s * 0.48, -0.1, 0.16], [0.15, 0.62, 0.17], [PI, 0, s * 0.06], 'matte', o));
  const back = (n, y, len, tilt) => { for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * (2.4 / n); ps.push(pc('cone', c, [Math.sin(a) * 0.46, y, -Math.cos(a) * 0.44], [0.26, len, 0.2], [PI + tilt, -a, 0], 'matte', o)); } };
  if (style === 'short') back(6, -0.16, 0.42, 0.3);
  else if (style === 'spiky') { back(6, -0.14, 0.4, 0.35); for (let i = 0; i < 7; i++) { const a = i * 0.9; ps.push(pc('cone', c, [Math.sin(a) * 0.25, 0.5, Math.cos(a) * 0.2 - 0.1], [0.2, 0.42, 0.2], [Math.cos(a) * 0.5 - 0.2, 0, -Math.sin(a) * 0.5], 'matte', o)); } ps.push(pc('cone', hi, [0.04, 0.66, 0.04], [0.06, 0.34, 0.06], [0.3, 0, -0.4], 'matte')); }
  else if (style === 'long') { ps.push(pc('cap', c, [0, -0.5, -0.36], [0.84, 0.52, 0.3], null, 'matte', o)); back(5, -0.95, 0.5, 0.1); }
  else if (style === 'pony') { back(5, -0.14, 0.34, 0.3); ps.push(pc('sph', c, [0, 0.14, -0.56], 0.3, null, 'matte'), pc('tor', 0xd6453c, [0, 0.14, -0.52], [0.34, 0.34, 0.7], null, 'matte'), pc('cone', c, [0, -0.36, -0.78], [0.32, 1.1, 0.26], [PI - 0.3, 0, 0], 'matte', o)); }
  else if (style === 'bun') { back(6, -0.14, 0.36, 0.25); ps.push(pc('sph', c, [0, 0.5, -0.22], 0.44, null, 'matte', o), pc('cyl', GOLD, [0, 0.5, -0.22], [0.05, 0.9, 0.05], [0, 0, 1.2], 'metal')); }
  return ps;
}

/* ---------- Waffen ---------- */
function weaponPieces(w) {
  const ps = [], t = w.tier || 0;
  if (w.wt === 'sword') {
    const wood = w.id === 'w_holz', L = [1.25, 1.45, 1.65, 1.95][t], W = [0.2, 0.2, 0.24, 0.32][t], bc = wood ? 0xb08a58 : [0xb4bcc8, 0xdfe6f2, 0xcfe0f2, 0xf2ecd8][t], gc = [0, 0, 0x6fd8ff, 0xffe07a][t], gd = wood ? 0x7a5a3c : [0x8a8f9a, GOLD, 0x4a6ad6, GOLD][t], mt = wood ? 'matte' : 'metal';
    ps.push(pc('cyl4', bc, [0, 0.26 + L / 2, 0], [W, L, 0.07], null, mt), pc('cone4', bc, [0, 0.26 + L + W * 0.7, 0], [W, W * 1.4, 0.07], null, mt));
    if (gc) ps.push(pc('box', gc, [0, 0.26 + L * 0.48, 0], [W * 0.22, L * 0.86, 0.085], null, 'glow'));
    ps.push(pc('box', gd, [0, 0.22, 0], [0.5 + t * 0.1, 0.1, 0.15], null, mt), pc('sph', gd, [-0.27 - t * 0.05, 0.22, 0], 0.14, null, mt), pc('sph', gd, [0.27 + t * 0.05, 0.22, 0], 0.14, null, mt), pc('cyl', 0x3a2618, [0, 0.02, 0], [0.09, 0.36, 0.09], null, 'matte'), pc('sph', t >= 2 ? gc : gd, [0, -0.2, 0], 0.15, null, t >= 2 ? 'glow' : mt));
    if (t === 3) for (const s of [-1, 1]) ps.push(pc('cone', GOLD, [s * 0.5, 0.36, 0], [0.12, 0.5, 0.1], [0, 0, -s * 0.9], 'metal'), pc('oct', 0xffe07a, [0, 0.42, 0], [0.16, 0.22, 0.14], null, 'glow'));
    return { ps, rx: 1.2, glow: gc ? { y: 0.3 + L * 0.6, c: gc, s: 1.6 + t * 0.4 } : null };
  }
  if (w.wt === 'staff' && w.cls === 'kleriker') {
    ps.push(pc('cyl', 0xf4f1e8, [0, 0.3, 0], [0.08, 2.4, 0.08], null, 'gloss'), pc('sph', GOLD, [0, -0.92, 0], 0.14, null, 'metal'));
    for (const y of [-0.3, 0.5, 1.3]) ps.push(pc('tor', GOLD, [0, y, 0], [0.22, 0.22, 0.6], [PI / 2, 0, 0], 'metal'));
    const y = 1.85, r = 0.3 + t * 0.06; ps.push(pc('tor', GOLD, [0, y, 0], [r * 2, r * 2, 0.8], null, 'metal'), pc('sph', 0xfff2a0, [0, y, 0], r * 0.95, null, 'glow'));
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; ps.push(pc('cone', i % 2 ? 0xfff2a0 : GOLD, [Math.cos(a) * (r + 0.2), y + Math.sin(a) * (r + 0.2), 0], [0.1, 0.24 + (t > 1 && i % 2 === 0 ? 0.16 : 0), 0.08], [0, 0, a - PI / 2], i % 2 ? 'glow' : 'metal')); }
    if (t >= 3) for (const s of [-1, 1]) ps.push(pc('sph', 0xffffff, [s * 0.5, y - 0.35, 0], [0.5, 0.16, 0.06], [0, 0, s * 0.6], 'gloss'));
    return { ps, rx: 0.12, glow: { y, c: 0xfff2a0, s: 2 + t * 0.5 } };
  }
  if (w.wt === 'staff') {
    const cc = [0x7fd8ff, 0x7fd8ff, 0xb48cff, 0xffe9a0][t], wd = [0x7a5236, 0x7a5236, 0x4a3a6a, 0x3a3a52][t];
    ps.push(pc(tube([[0, -0.95, 0], [0.03, -0.2, 0.02], [-0.03, 0.6, -0.02], [0, 1.5, 0]], 0.065), wd, null, null, null, 'matte', { g: 0.3 }), pc('tor', GOLD, [0, 0.9, 0], [0.2, 0.2, 0.6], [PI / 2, 0, 0], 'metal'), pc('tor', GOLD, [0, -0.5, 0], [0.2, 0.2, 0.6], [PI / 2, 0, 0], 'metal'));
    const y = 1.85; for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; ps.push(pc(tube([[0, 1.45, 0], [Math.cos(a) * 0.3, 1.6, Math.sin(a) * 0.3], [Math.cos(a) * 0.32, 1.9, Math.sin(a) * 0.32], [Math.cos(a) * 0.14, 2.14, Math.sin(a) * 0.14]], 0.04, 5), t > 1 ? GOLD : wd, null, null, null, t > 1 ? 'metal' : 'matte')); }
    ps.push(pc('oct', cc, [0, y, 0], [0.3 + t * 0.04, 0.5 + t * 0.06, 0.3 + t * 0.04], null, 'glow', { top: 0xffffff }));
    if (t >= 2) ps.push(pc('torT', cc, [0, y, 0], [1.0, 1.0, 1], [1.1, 0.3, 0], 'glow')); if (t >= 3) ps.push(pc('torT', 0xffffff, [0, y, 0], [1.25, 1.25, 1], [-0.9, 0.6, 0], 'glow'), pc('oct', 0xffffff, [0, y, 0], [0.6, 0.16, 0.16], null, 'glow'));
    return { ps, rx: 0.12, glow: { y, c: cc, s: 2.2 + t * 0.5 } };
  }
  if (w.wt === 'bow') {
    const wc = [0x8a5a2a, 0x8a5a2a, 0x3f8f52, 0xf2ecd8][t], gc = [0, 0, 0x9fffb0, 0xffe07a][t], S = 1.15 + t * 0.07;
    ps.push(pc(tube([[0, 0.05, -S], [0, -0.2, -S * 0.72], [0, -0.36, -S * 0.3], [0, -0.3, 0], [0, -0.36, S * 0.3], [0, -0.2, S * 0.72], [0, 0.05, S]], 0.055 + t * 0.008), wc, null, null, null, t === 3 ? 'gloss' : 'matte'));
    ps.push(pc('cyl', 0xf4f4f4, [0, 0.05, 0], [0.018, S * 2, 0.018], [PI / 2, 0, 0], 'matte'), pc('cyl', LEATHER, [0, -0.3, 0], [0.16, 0.36, 0.16], [PI / 2, 0, 0], 'matte'));
    for (const s of [-1, 1]) { ps.push(pc('cone', t ? GOLD : wc, [0, 0.1, s * (S + 0.08)], [0.12, 0.26, 0.12], [s * PI / 2, 0, 0], t ? 'metal' : 'matte')); if (gc) ps.push(pc('oct', gc, [0, -0.34, s * S * 0.45], [0.1, 0.14, 0.2], null, 'glow')); if (t >= 2) ps.push(pc('sph', t === 3 ? GOLD : 0x5fb868, [0, -0.5, s * S * 0.62], [0.05, 0.3, 0.36], [s * 0.5, 0, 0], t === 3 ? 'metal' : 'matte')); }
    return { ps, rx: 0, left: true, glow: gc ? { y: -0.3, c: gc, s: 1.6 } : null };
  }
  if (w.wt === 'hammer') { ps.push(pc('cyl', 0x7a5236, [0, 0.4, 0], [0.09, 1.3, 0.09], null, 'matte'), pc('box', 0x5a5a66, [0, 1.05, 0], [0.4, 0.36, 0.75], null, 'metal')); return { ps, rx: 1.0 }; }
  return { ps, rx: 0 };
}
function boardPieces(tier) {
  const c = tier > 1 ? 0xf2c23c : 0x3fc0a8, gl = tier > 1 ? 0xfff0a0 : 0x9ff8ff, ps = [pc('sph', c, [0, 0, 0], [0.95, 0.13, 3.1], null, 'gloss', { top: shade(c, 0.4) }), pc('sph', gl, [0, -0.05, 0], [0.6, 0.08, 2.5], null, 'glow'), pc('sph', 0xffffff, [0, 0.06, 0.2], [0.5, 0.04, 1.4], null, 'matte'), pc('box', DARK, [0, 0.07, 0.5], [0.6, 0.04, 0.3], null, 'matte'), pc('box', DARK, [0, 0.07, -0.5], [0.6, 0.04, 0.3], null, 'matte')];
  for (const s of [-1, 1]) ps.push(pc('cone', c, [s * 0.36, 0.12, -1.25], [0.08, 0.5, 0.4], [-0.5, 0, 0], 'gloss'), pc('cyl', DARK, [s * 0.22, -0.02, -1.5], [0.18, 0.3, 0.18], [PI / 2, 0, 0], 'metal'), pc('cyl', gl, [s * 0.22, -0.02, -1.66], [0.14, 0.05, 0.14], [PI / 2, 0, 0], 'glow'));
  if (tier > 1) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ps.push(pc('sph', i ? 0xffffff : GOLD, [s * (0.7 + i * 0.28), 0.06 + i * 0.05, -0.3 - i * 0.3], [0.8 - i * 0.12, 0.05, 0.3], [0, s * (0.5 + i * 0.2), s * 0.2], i ? 'gloss' : 'metal'));
  return ps;
}

/* ---------- Outfits ---------- */
const LOOKS = {
  wanderer: { main: 0x3f8fb0, dark: 0x2c6a88, trim: 0xf2e8d0, acc: 0xd6453c, pants: 0x6a5038, boots: 0x4a3426, hair: 'short', eye: 0x3a7ad6 },
  klinge: { main: STEEL, dark: 0x4a4f5e, trim: GOLD, acc: 0xc0352c, pants: 0x3a3a48, boots: 0x9aa4b4, hair: 'spiky', eye: 0xc0452c, cape: 0xb8302a, capeLen: 1.5 },
  arkanist: { main: 0x3a2f9a, dark: 0x241c66, trim: GOLD, acc: 0x7fd8ff, pants: 0x241c44, boots: 0x3a2f6a, hair: 'long', eye: 0x8a5ae0, robe: true },
  waldlaeufer: { main: 0x3f8a46, dark: 0x2a5a30, trim: 0xd8c090, acc: 0xffe08a, pants: 0x5a4630, boots: 0x5a3a22, hair: 'pony', eye: 0x3f9a55, cape: 0x2f6a36, capeLen: 1.0 },
  kleriker: { main: 0xf6f2e6, dark: 0xd8d0bc, trim: GOLD, acc: 0x6fb0ff, pants: 0xe8e0cc, boots: 0xd8c8a0, hair: 'long', eye: 0xe0a030, robe: true },
};
function outfit(look, L, f) {
  const O = { hips: [], torso: [], head: [], uarm: [], farm: [], thigh: [], shin: [], extraL: [] }, g2 = { g: 0.22 };
  const ring = (c, y, sx, sz, m = 'metal', th = 0.6) => pc(sx > 0.9 ? 'torT' : 'tor', c, [0, y, 0], [sx, sz, sx > 0.9 ? th * 2.2 : th], [PI / 2, 0, 0], m);
  // Grundkörper
  O.torso.push(pc('sph', L.main, [0, 0.42, 0], [0.76, 0.88, 0.52], null, 'matte', g2), pc('sph', L.main, [0, 0.12, 0], [0.62, 0.5, 0.44], null, 'matte'), pc('cyl', SKIN, [0, 0.86, 0], [0.18, 0.22, 0.18], null, 'matte'));
  O.torso.push(pc('cyl', LEATHER, [0, 0.0, 0], [0.68, 0.13, 0.5], null, 'matte'), pc('box', GOLD, [0, 0.0, 0.25], [0.16, 0.15, 0.05], null, 'metal'));
  O.hips.push(pc('sph', L.pants, [0, -0.08, 0], [0.66, 0.44, 0.5], null, 'matte'));
  O.uarm.push(pc('sph', L.main, [0, 0, 0], 0.31, null, 'matte'), pc('cap', L.main, [0, -0.22, 0], [0.22, 0.19, 0.22], null, 'matte'));
  O.farm.push(pc('cap', SKIN, [0, -0.2, 0], [0.18, 0.2, 0.18], null, 'matte'), pc('sph', SKIN, [0, -0.45, 0], [0.18, 0.21, 0.18], null, 'matte'));
  O.thigh.push(pc('cap', L.pants, [0, -0.27, 0], [0.28, 0.27, 0.28], null, 'matte'));
  O.shin.push(pc('cap', L.boots, [0, -0.26, 0], [0.24, 0.26, 0.24], null, look === 'klinge' ? 'metal' : 'matte'), pc('sph', L.boots, [0, -0.56, 0.1], [0.27, 0.2, 0.48], null, look === 'klinge' ? 'metal' : 'matte'), pc('cyl', L.trim, [0, -0.04, 0], [0.29, 0.1, 0.29], null, 'matte'));
  if (look === 'wanderer') {
    O.hips.push(pc('taper', L.main, [0, -0.16, 0], [1.08, 0.42, 0.84], null, 'matte', { g: 0.3 }), ring(L.trim, -0.36, 1.08, 0.84, 'matte', 0.35));
    O.torso.push(ring(L.acc, 0.82, 0.56, 0.5, 'matte', 1.2), pc('box', L.acc, [0.2, 0.5, -0.3], [0.17, 0.66, 0.06], [0.3, 0, 0.12], 'cloth'), pc('box', LEATHER, [0, 0.42, 0.25], [0.1, 1.0, 0.05], [0, 0, 0.75], 'matte'), pc('box', LEATHER, [0.37, -0.06, 0.12], [0.22, 0.26, 0.17], null, 'matte'), pc('box', L.trim, [0, 0.5, 0.262], [0.12, 0.4, 0.02], null, 'matte'));
    O.farm.push(pc('cyl', LEATHER, [0, -0.28, 0], [0.21, 0.24, 0.21], null, 'matte')); O.uarm.push(pc('cyl', L.trim, [0, -0.38, 0], [0.24, 0.07, 0.24], null, 'matte'));
    if (f.apron) O.hips.push(pc('box', 0xf6f2e6, [0, -0.3, 0.44], [0.5, 0.7, 0.04], [-0.14, 0, 0], 'cloth')), O.torso.push(pc('box', 0xf6f2e6, [0, 0.36, 0.27], [0.42, 0.56, 0.03], null, 'cloth'));
  } else if (look === 'klinge') {
    O.torso.push(pc('sph', STEEL, [0, 0.45, 0.02], [0.86, 0.86, 0.6], null, 'metal', g2), pc('cyl', STEEL, [0, 0.16, 0], [0.68, 0.3, 0.5], null, 'metal'), ring(GOLD, 0.8, 0.52, 0.46), ring(GOLD, 0.3, 0.7, 0.52, 'metal', 0.4), pc('oct', 0xff6a3a, [0, 0.52, 0.31], [0.22, 0.28, 0.08], null, 'glow'), pc('box', GOLD, [0, 0.52, 0.3], [0.34, 0.06, 0.04], null, 'metal'));
    O.hips.push(pc('box', L.acc, [0, -0.42, 0.25], [0.34, 0.72, 0.05], [-0.06, 0, 0], 'cloth', { g: 0.3 }), pc('box', GOLD, [0, -0.76, 0.27], [0.36, 0.06, 0.06], null, 'metal'), pc('box', L.acc, [0, -0.36, -0.25], [0.4, 0.6, 0.05], [0.06, 0, 0], 'cloth'));
    for (const s of [-1, 1]) O.hips.push(pc('sph', STEEL, [s * 0.36, -0.2, 0], [0.3, 0.48, 0.44], null, 'metal'), pc('sph', GOLD, [s * 0.4, -0.38, 0], [0.24, 0.12, 0.4], null, 'metal'));
    O.uarm.push(pc('sph', STEEL, [0.08, 0.07, 0], [0.58, 0.44, 0.6], null, 'metal', g2), pc('tor', GOLD, [0.08, -0.05, 0], [0.56, 0.58, 0.5], [PI / 2, 0, 0], 'metal'), pc('cone', GOLD, [0.22, 0.3, 0], [0.15, 0.34, 0.15], [0, 0, -0.6], 'metal'), pc('cap', DARK, [0, -0.24, 0], [0.23, 0.17, 0.23], null, 'matte'));
    O.farm.push(pc('taper', STEEL, [0, -0.22, 0], [0.5, 0.36, 0.5], [PI, 0, 0], 'metal'), pc('cyl', GOLD, [0, -0.06, 0], [0.27, 0.07, 0.27], null, 'metal'), pc('sph', 0x8a94a4, [0, -0.45, 0], [0.2, 0.22, 0.2], null, 'metal'));
    O.thigh.push(pc('sph', STEEL, [0, -0.25, 0.07], [0.32, 0.46, 0.28], null, 'metal'), pc('sph', GOLD, [0, -0.55, 0.12], [0.24, 0.24, 0.2], null, 'metal'));
    O.shin.push(pc('sph', STEEL, [0, -0.24, 0.08], [0.26, 0.44, 0.2], null, 'metal'));
    O.head.push(pc('tor', L.acc, [0, 0.16, -0.02], [1.08, 1.1, 0.45], [PI / 2 - 0.36, 0, 0], 'matte'));
    O.extraL.push(pc('cyl', STEEL, [-0.17, -0.22, 0.02], [1.05, 0.07, 1.05], [0, 0, PI / 2], 'metal'), pc('tor', GOLD, [-0.19, -0.22, 0.02], [1.05, 1.05, 0.5], [0, PI / 2, 0], 'metal'), pc('sph', GOLD, [-0.24, -0.22, 0.02], [0.14, 0.3, 0.3], null, 'metal'), pc('box', L.acc, [-0.215, -0.22, 0.02], [0.02, 0.7, 0.16], null, 'matte'), pc('box', L.acc, [-0.215, -0.22, 0.02], [0.02, 0.16, 0.7], null, 'matte'));
  } else if (look === 'arkanist' || look === 'kleriker') {
    const kl = look === 'kleriker';
    O.hips.push(pc('taper', L.main, [0, -0.52, 0], [1.34, 1.1, 1.14], null, 'matte', { g: 0.4 }), ring(L.trim, -1.05, 1.36, 1.16, 'metal', 0.5), ring(L.acc, -0.9, 1.3, 1.1, kl ? 'matte' : 'glow', 0.3));
    O.torso.push(pc('taper', L.dark, [0, 0.62, 0], [1.3, 0.36, 1.02], null, 'matte', g2), ring(L.trim, 0.45, 1.3, 1.02, 'metal', 0.4), ring(L.trim, 0.8, 0.5, 0.44));
    if (kl) { for (const s of [-1, 1]) { O.torso.push(pc('box', 0xe8c860, [s * 0.17, 0.26, 0.275], [0.14, 0.86, 0.04], null, 'cloth'), pc('box', L.acc, [s * 0.17, -0.1, 0.285], [0.14, 0.08, 0.04], null, 'matte')); O.hips.push(pc('box', 0xe8c860, [s * 0.17, -0.5, 0.52], [0.14, 0.9, 0.035], [-0.13, 0, 0], 'cloth'), pc('box', GOLD, [s * 0.17, -0.94, 0.585], [0.16, 0.06, 0.05], null, 'metal')); } O.torso.push(pc('tor', 0xfff2a0, [0, 0.5, 0.27], [0.24, 0.24, 0.5], null, 'glow'), pc('sph', 0xfff2a0, [0, 0.5, 0.28], 0.09, null, 'glow')); }
    else { O.hips.push(pc('box', 0x5a4fd0, [0, -0.5, 0.535], [0.24, 1.0, 0.035], [-0.13, 0, 0], 'cloth', { top: 0x8a7ff0 })); for (let i = 0; i < 3; i++) O.hips.push(pc('oct', 0xffe07a, [0, -0.2 - i * 0.3, 0.52 + i * 0.04], [0.11, 0.11, 0.03], null, 'glow')); O.torso.push(pc('oct', L.acc, [0, 0.6, 0.31], [0.16, 0.2, 0.1], null, 'glow'), pc('tor', GOLD, [0, 0.6, 0.3], [0.26, 0.3, 0.5], null, 'metal')); }
    O.farm.push(pc('taper', L.main, [0, -0.18, 0], [0.42, 0.46, 0.42], [PI, 0, 0], 'matte', { g: 0.25 }), pc('torT', L.trim, [0, -0.4, 0], [0.42, 0.42, 1.6], [PI / 2, 0, 0], 'metal'));
    if (kl && !f.plain) O.head.push(pc('tor', GOLD, [0, 0.17, -0.02], [1.07, 1.09, 0.45], [PI / 2 - 0.36, 0, 0], 'metal'), pc('oct', L.acc, [0, 0.36, 0.5], [0.12, 0.16, 0.08], null, 'glow'), pc('torT', 0xfff0a0, [0, 0.82, -0.18], [1.05, 1.05, 1.3], [PI / 2 - 0.25, 0, 0], 'glow'));
    if (!kl && !f.plain) O.head.push(pc('cyl', L.main, [0, 0.34, -0.03], [1.55, 0.05, 1.55], [-0.14, 0, 0], 'matte'), pc('cone', L.main, [0, 0.8, -0.1], [0.82, 0.95, 0.82], [-0.22, 0, 0], 'matte', { g: 0.3 }), pc('cone', L.main, [0, 1.3, -0.36], [0.36, 0.62, 0.36], [-1.05, 0, 0], 'matte'), pc('tor', GOLD, [0, 0.42, -0.04], [0.84, 0.84, 0.9], [PI / 2 - 0.14, 0, 0], 'metal'), pc('oct', 0xffe07a, [0, 0.52, 0.36], [0.17, 0.22, 0.07], null, 'glow'), pc('sph', L.acc, [0, 1.42, -0.68], 0.15, null, 'glow'));
  } else if (look === 'waldlaeufer') {
    O.torso.push(pc('sph', LEATHER, [0, 0.4, 0.03], [0.74, 0.7, 0.52], null, 'matte', g2), pc('taper', L.main, [0, 0.64, 0], [1.24, 0.3, 0.98], null, 'matte'), pc('box', 0x4a3220, [0, 0.42, 0.26], [0.1, 1.0, 0.05], [0, 0, -0.75], 'matte'), pc('box', GOLD, [0.12, 0.5, 0.28], [0.12, 0.12, 0.04], null, 'metal'), pc('box', 0x4a3220, [-0.36, -0.06, 0.12], [0.2, 0.24, 0.16], null, 'matte'));
    O.torso.push(pc('cyl', 0x4a3220, [0.2, 0.45, -0.36], [0.24, 0.95, 0.24], [0.2, 0, -0.4], 'matte'), pc('tor', GOLD, [0.03, 0.86, -0.44], [0.26, 0.26, 0.5], [PI / 2 + 0.2, 0, -0.4], 'metal'));
    for (let i = 0; i < 3; i++) O.torso.push(pc('cyl', 0xd8c090, [-0.0 + i * 0.06, 1.0, -0.47 + (i % 2) * 0.05], [0.03, 0.4, 0.03], [0.2, 0, -0.4], 'matte'), pc('box', i % 2 ? 0xffffff : 0xd6453c, [-0.05 + i * 0.06, 1.14, -0.5 + (i % 2) * 0.05], [0.1, 0.18, 0.02], [0.2, 0, -0.4], 'matte'));
    O.hips.push(pc('taper', L.main, [0, -0.16, 0], [1.08, 0.44, 0.84], null, 'matte', { g: 0.3 })); for (const s of [-1, 1]) O.hips.push(pc('box', LEATHER, [s * 0.3, -0.3, 0.2], [0.24, 0.42, 0.05], [-0.1, 0, s * 0.1], 'matte'));
    O.farm.push(pc('cyl', LEATHER, [0, -0.26, 0], [0.22, 0.3, 0.22], null, 'matte'), pc('cyl', GOLD, [0, -0.1, 0], [0.23, 0.04, 0.23], null, 'metal'), pc('sph', 0x4a3220, [0, -0.45, 0], [0.19, 0.22, 0.19], null, 'matte'));
    O.shin.push(pc('cyl', shade(L.boots, 0.2), [0, 0, 0], [0.31, 0.16, 0.31], null, 'matte'));
    if (!f.plain) O.head.push(pc('hemi', L.main, [0, 0.03, -0.06], 1.3, [-0.52, 0, 0], 'matte', { g: 0.3 }), pc('cone', L.main, [0, 0.06, -0.66], [0.5, 0.62, 0.46], [-1.9, 0, 0], 'matte'));
    else O.head.push(pc('tor', DARK, [0, 0.26, -0.02], [1.1, 1.12, 0.5], [PI / 2 - 0.36, 0, 0], 'matte'), pc('cyl', 0x9ff8ff, [-0.17, 0.4, 0.4], [0.2, 0.06, 0.2], [PI / 2 - 0.5, 0, 0], 'glow'), pc('cyl', 0x9ff8ff, [0.17, 0.4, 0.4], [0.2, 0.06, 0.2], [PI / 2 - 0.5, 0, 0], 'glow'), pc('tor', GOLD, [-0.17, 0.4, 0.4], [0.24, 0.24, 0.6], [-0.5, 0, 0], 'metal'), pc('tor', GOLD, [0.17, 0.4, 0.4], [0.24, 0.24, 0.6], [-0.5, 0, 0], 'metal'));
  }
  if (f.beard) O.head.push(pc('sph', f.beard, [0, -0.3, 0.3], [0.62, 0.5, 0.42], null, 'matte', { g: 0.2 }), pc('sph', f.beard, [0, -0.12, 0.44], [0.4, 0.12, 0.14], null, 'matte'));
  if (f.hat) O.head.push(pc('cyl', f.hat, [0, 0.36, 0], [1.5, 0.05, 1.5], [-0.1, 0, 0], 'matte'), pc('sph', f.hat, [0, 0.42, -0.02], [0.9, 0.6, 0.9], null, 'matte'), pc('tor', 0xd6453c, [0, 0.42, -0.02], [0.9, 0.9, 0.5], [PI / 2 - 0.1, 0, 0], 'matte'));
  return O;
}

/* ---------- Held / NPC ---------- */
GFX.human = function (o) {
  const base = LOOKS[o.look] || LOOKS.wanderer, L = Object.assign({}, base, o.pal || {}), f = o.flags || {}, O = outfit(o.look, L, f);
  const g = new T.Group(), rig = bone(g), hips = bone(rig, 0, 1.3, 0), torso = bone(hips), head = bone(torso, 0, 0.92, 0);
  const armR = bone(torso, 0.44, 0.66, 0), elbR = bone(armR, 0, -0.42, 0), armL = bone(torso, -0.44, 0.66, 0), elbL = bone(armL, 0, -0.42, 0);
  const legR = bone(hips, 0.19, -0.1, 0), kneeR = bone(legR, 0, -0.55, 0), legL = bone(hips, -0.19, -0.1, 0), kneeL = bone(legL, 0, -0.55, 0);
  build(hips, O.hips); build(torso, O.torso);
  build(armR, O.uarm); build(armL, mirror(O.uarm)); build(elbR, O.farm); build(elbL, [mirror(O.farm), O.extraL]);
  build(legR, O.thigh); build(legL, mirror(O.thigh)); build(kneeR, O.shin); build(kneeL, mirror(O.shin));
  const hm = new T.Mesh(GFX.B.head, faceMat(o.skin || SKIN, o.eye || L.eye)); hm.position.y = 0.42; hm.castShadow = true; head.add(hm);
  const hb = bone(head, 0, 0.42, 0); build(hb, [hairPieces(o.hairStyle || L.hair, o.hair), O.head, [-1, 1].map(s => pc('sph', o.skin || SKIN, [s * 0.5, -0.04, 0], [0.1, 0.2, 0.16], null, 'matte'))]);
  const handR = bone(elbR, 0, -0.45, 0.02), handL = bone(elbL, 0, -0.45, 0.02), boardB = bone(rig, 0, -0.14, 0); boardB.visible = false;
  // Umhang
  let cape = null; const cl = f.cape === false ? 0 : L.capeLen;
  if (L.cape && cl) { const cg = new T.PlaneGeometry(0.95, cl, 4, 7); cg.translate(0, -cl / 2, 0); cape = new T.Mesh(cg, new T.MeshStandardMaterial({ color: L.cape, side: T.DoubleSide, roughness: 0.9 })); cape.position.set(0, 0.74, -0.27); cape.castShadow = true; cape.userData.base = cg.attributes.position.array.slice(); cape.userData.len = cl; torso.add(cape); }
  let wpn = null, wtype = null, extra = [];
  const H = {
    g, armed: false, robe: !!L.robe,
    setWeapon(w) { for (const e of extra) e.parent.remove(e); extra = []; wpn = null; wtype = w ? w.wt : null; H.armed = !!w; if (!w) return; const d = weaponPieces(w), hand = d.left ? handL : handR, b = bone(hand); b.rotation.x = d.rx; build(b, d.ps); if (d.glow) { const s = glow(d.glow.c, d.glow.s, 0.75); s.position.y = d.glow.y; b.add(s); } if (w.rar) { const s = glow(w.rar, 2.6, 0.55); s.position.y = d.left ? -0.3 : 1.0; b.add(s); } wpn = b; extra.push(b); },
    setBoard(tier) { while (boardB.children.length) boardB.remove(boardB.children[0]); if (tier) { build(boardB, boardPieces(tier)); boardB.add(glow(tier > 1 ? 0xffe07a : 0x7fe8ff, 5, 0.5)); } H.boardC = tier > 1 ? 0xffd870 : 0x8ff0ff; },
    play(kind) { if (kind === 'attack' || kind === 'skill') kind = wtype === 'sword' || wtype === 'hammer' ? 'slash' : wtype === 'staff' ? 'cast' : wtype === 'bow' ? 'shoot' : 'punch'; H.a = { kind, t: 0, d: kind === 'spin' ? 0.55 : kind === 'cast' ? 0.5 : 0.42 }; },
    a: null, t: rnd(0, 9), ph: 0, run: 0, fly: 0, air: 0, dead: 0, look: 0,
    update(dt, s) {
      H.t += dt; const t = H.t, kb = Math.min(1, dt * 10);
      H.run += ((s.moving && !s.flying && !s.air ? 1 : 0) - H.run) * kb; H.fly += ((s.flying ? 1 : 0) - H.fly) * Math.min(1, dt * 6); H.air += ((s.air && !s.flying ? 1 : 0) - H.air) * kb; H.dead += ((s.dead ? 1 : 0) - H.dead) * Math.min(1, dt * 5);
      if (s.moving && !s.flying) H.ph += dt * 11.5 * (s.speed || 1);
      const sn = Math.sin(H.ph), cs = Math.cos(H.ph), br = Math.sin(t * 2.1), R = H.run, ls = H.robe ? 0.55 : 1, wa = H.armed && wtype !== 'bow' ? 0.45 : 1;
      const P = { hy: 1.3 + br * 0.012, tx: 0.02 + br * 0.012, ty: 0, tz: 0, hx: -br * 0.02, lsx: br * 0.03, lsz: -0.13, lex: -0.18, rsx: -br * 0.03, rsz: 0.13, rex: -0.28, llx: 0, lkx: 0.04, rlx: 0, rkx: 0.04 };
      const mix = (k, v, w) => { P[k] += (v - P[k]) * w; };
      // Laufen
      mix('hy', 1.27 + Math.abs(cs) * 0.09, R); mix('tx', 0.2, R); mix('ty', sn * 0.16, R); mix('hx', -0.12, R);
      mix('lsx', sn * 0.95, R); mix('lex', -1.05 - sn * 0.25, R); mix('rsx', -sn * 0.95 * wa - (1 - wa) * 0.35, R); mix('rex', -1.05 + sn * 0.25, R);
      mix('llx', -sn * 0.95 * ls, R); mix('lkx', 0.2 + Math.max(0, cs) * 1.25 * ls, R); mix('rlx', sn * 0.95 * ls, R); mix('rkx', 0.2 + Math.max(0, -cs) * 1.25 * ls, R);
      // Sprung
      const A = H.air; mix('llx', -0.75, A); mix('lkx', 1.2, A); mix('rlx', 0.1, A); mix('rkx', 0.7, A); mix('lsx', -0.6, A); mix('lsz', -0.7, A); mix('rsx', -0.4, A); mix('rsz', 0.6, A);
      // Flug (auf dem Brett)
      const F = H.fly, fm = s.moving ? 1 : 0; mix('hy', 1.14 + Math.sin(t * 3) * 0.02, F); mix('tx', 0.16 + fm * 0.16, F); mix('ty', -0.45, F); mix('hx', -0.1 - fm * 0.1, F);
      mix('llx', -0.62, F); mix('lkx', 0.95, F); mix('rlx', -0.3, F); mix('rkx', 0.75, F); mix('lsx', -0.3, F); mix('lsz', -0.95 + Math.sin(t * 2) * 0.08, F); mix('lex', -0.35, F); mix('rsx', 0.25, F); mix('rsz', 0.85 - Math.sin(t * 2) * 0.08, F); mix('rex', -0.4, F);
      // Angriff
      let spin = 0, hyaw = H.look;
      if (H.a) {
        const a = H.a; a.t += dt; const k = a.t / a.d, w = seg(k, 0, 0.3), st = seg(k, 0.3, 0.56), r = seg(k, 0.62, 1), on = 1 - r, tri = (key, A1, B1) => { const rest = P[key]; P[key] = rest + ((A1 - rest) * w + (B1 - A1) * st) * on; };
        if (a.kind === 'slash') { tri('rsx', -2.9, -0.5); tri('rsz', 0.55, -0.5); tri('rex', -1.0, -0.08); tri('ty', -0.6, 0.65); tri('tx', -0.12, 0.34); tri('lsx', 0.5, -0.4); tri('hy', 1.3, 1.2); }
        else if (a.kind === 'cast') { tri('rsx', -2.7, -1.55); tri('rex', -0.7, -0.05); tri('lsx', -0.9, -1.5); tri('lex', -1.3, -0.15); tri('lsz', -0.4, -0.15); tri('tx', -0.2, 0.22); tri('hy', 1.34, 1.26); }
        else if (a.kind === 'shoot') { tri('lsx', -1.5, -1.56); tri('lsz', -0.08, -0.05); tri('lex', -0.05, 0); tri('rsx', -1.45, -1.4); tri('rsz', 0.25, 0.1); tri('rex', -2.3, -0.5); tri('ty', 0.42, 0.3); tri('tx', -0.05, 0.05); }
        else if (a.kind === 'punch') { tri('rsx', -0.8, -1.6); tri('rex', -2.1, -0.08); tri('ty', -0.4, 0.5); tri('tx', 0, 0.2); }
        else if (a.kind === 'spin') { spin = ease(clamp(k, 0, 1)) * PI * 2; const e = Math.sin(clamp(k, 0, 1) * PI); mix('rsx', -1.5, e); mix('rsz', 0.2, e); mix('rex', -0.05, e); mix('lsz', -1.3, e); mix('tx', 0.25, e); mix('hy', 1.2, e); }
        if (k >= 1) H.a = null;
      }
      hips.position.y = P.hy; torso.rotation.set(P.tx, P.ty, P.tz); head.rotation.set(P.hx, hyaw - P.ty * 0.6, 0);
      armL.rotation.set(P.lsx, 0, P.lsz); elbL.rotation.x = P.lex; armR.rotation.set(P.rsx, 0, P.rsz); elbR.rotation.x = P.rex;
      legL.rotation.x = P.llx; kneeL.rotation.x = P.lkx; legR.rotation.x = P.rlx; kneeR.rotation.x = P.rkx;
      rig.rotation.set(-H.dead * PI / 2 + F * fm * 0.14, spin + F * 0.5, 0); rig.position.y = H.dead * 0.35 + F * Math.sin(t * 2.4) * 0.1;
      boardB.visible = F > 0.5; boardB.rotation.y = -0.5; boardB.rotation.x = -fm * 0.06;
      if (cape) { const b = cape.userData.base, p = cape.geometry.attributes.position, len = cape.userData.len, sw = R * 0.9 + F * 1.3 + A * 0.6; for (let i = 0; i < p.count; i++) { const y = b[i * 3 + 1], k = -y / len, x = b[i * 3]; const ang = 0.14 + sw * 0.75 + Math.sin(t * (3 + sw * 5) + k * 4 + x * 2) * (0.04 + sw * 0.12) * k; p.setXYZ(i, x * (1 + k * 0.25), -Math.cos(ang) * k * len, -Math.sin(ang) * k * len - k * 0.06); } p.needsUpdate = true; cape.geometry.computeVertexNormals(); cape.rotation.x = -P.tx; }
    },
    handPos(v) { return (wpn || handR).getWorldPosition(v); },
  };
  if (o.aura) { const a = glow(o.aura, 5, 0.3); a.position.y = 1.4; rig.add(a); }
  H.setWeapon(o.weapon || null); if (o.scale) g.scale.setScalar(o.scale);
  return H;
};

/* ---------- Monster ---------- */
const cuteEyes = (y, z, sp, s, iris = 0x1a1a2a) => [-1, 1].map(d => [pc('sph', 0xffffff, [d * sp, y, z], [s, s * 1.25, s * 0.5], null, 'gloss'), pc('sph', iris, [d * sp, y - s * 0.05, z + s * 0.14], [s * 0.62, s * 0.85, s * 0.4], null, 'gloss'), pc('sph', 0xffffff, [d * sp - s * 0.14, y + s * 0.22, z + s * 0.3], s * 0.24, null, 'glow')]);
const glowEyes = (y, z, sp, s, c) => [-1, 1].map(d => pc('sph', c, [d * sp, y, z], [s, s * 0.62, s * 0.5], null, 'glow'));
const P = () => GFX.particles();
const MOBS = {
  blob(g, d) {
    const c = d.color, b = bone(g), honey = d.crown, ps = [pc('sph', shade(c, -0.25), [0, 0.72, 0], [1.8, 1.4, 1.8], null, 'jelly', { top: shade(c, 0.15), g: 0.2 }), pc('sph', 0xffffff, [-0.42, 1.1, 0.5], [0.42, 0.22, 0.2], [0, 0, 0.5], 'glow'), pc('sph', 0xffffff, [-0.62, 0.88, 0.5], 0.1, null, 'glow'), cuteEyes(0.82, 0.8, 0.31, 0.3), pc('sph', 0x7a2a3a, [0, 0.56, 0.87], [0.2, 0.13, 0.1], null, 'matte')];
    for (const s of [-1, 1]) ps.push(pc('sph', 0xff8fa8, [s * 0.56, 0.62, 0.72], [0.22, 0.12, 0.1], null, 'matte'), pc('sph', shade(c, -0.25), [s * 0.5, 0.12, 0.25], [0.5, 0.26, 0.6], null, 'jelly'));
    if (honey) { ps.push(pc('cyl', GOLD, [0, 1.46, 0], [0.56, 0.16, 0.56], null, 'metal')); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; ps.push(pc('cone', GOLD, [Math.cos(a) * 0.22, 1.66, Math.sin(a) * 0.22], [0.16, 0.32, 0.16], null, 'metal')); } ps.push(pc('sph', 0xff5a7a, [0, 1.6, 0.26], 0.1, null, 'glow')); for (let i = 0; i < 3; i++) ps.push(pc('sph', 0xffe9a0, [-0.5 + i * 0.5, 1.2 - (i % 2) * 0.2, -0.55], [0.26, 0.4, 0.2], null, 'jelly')); }
    else ps.push(pc('cyl', 0x3f8f3a, [0, 1.5, 0], [0.07, 0.36, 0.07], null, 'matte'), pc('sph', 0x5fc04a, [0.26, 1.7, 0], [0.5, 0.08, 0.28], [0, 0, 0.5], 'matte'), pc('sph', 0x5fc04a, [-0.26, 1.7, 0], [0.5, 0.08, 0.28], [0, 0, -0.5], 'matte'));
    build(b, ps);
    return (t, s) => { const h = Math.abs(Math.sin(t * (s.chase ? 5.2 : 3))); b.position.y = h * (s.moving ? 0.7 : 0.25); b.scale.set(1 + (1 - h) * 0.16, 0.8 + h * 0.32, 1 + (1 - h) * 0.16); b.position.z = s.lunge * 0.9; };
  },
  mushroom(g, d) {
    const c = d.color, gift = d.toxic, b = bone(g), capB = bone(b, 0, 1.02, 0), ps = [pc(lathe([[0.01, 0], [0.5, 0], [0.58, 0.3], [0.48, 0.9], [0.42, 1.12], [0.01, 1.16]]), 0xf4ead6, null, null, null, 'matte', { g: 0.3 }), cuteEyes(0.7, 0.5, 0.2, 0.2, gift ? 0x3a1050 : 0x1a1a2a), pc('sph', 0x8a3a3a, [0, 0.5, 0.56], [0.12, 0.08, 0.06], null, 'matte')];
    for (const s of [-1, 1]) ps.push(pc('sph', 0xff9aa8, [s * 0.34, 0.54, 0.44], [0.14, 0.08, 0.08], null, 'matte'), pc('sph', 0xe8dcc4, [s * 0.62, 0.58, 0.1], [0.34, 0.18, 0.2], [0, 0, s * 0.5], 'matte'), pc('sph', 0xc8a878, [s * 0.26, 0.1, 0.16], [0.36, 0.22, 0.48], null, 'matte'));
    build(b, ps);
    const cp = [pc(lathe([[0.4, 0.02], [1.2, -0.1], [1.4, 0.02], [1.34, 0.3], [1.02, 0.68], [0.5, 0.92], [0.01, 0.98]], 16), c, null, null, null, 'gloss', { top: shade(c, 0.4), g: 0.25 }), pc('cyl', 0xf0d8c0, [0, 0.0, 0], [2.3, 0.05, 2.3], null, 'matte')];
    for (let i = 0; i < 8; i++) { const a = i * 2.4, r = 0.32 + (i % 3) * 0.33, y = 0.95 - r * r * 0.42; cp.push(pc('sph', gift ? 0x9fffb0 : 0xfff6e6, [Math.cos(a) * r, y, Math.sin(a) * r], [0.34 - r * 0.08, 0.1, 0.34 - r * 0.08], null, gift ? 'glow' : 'gloss')); }
    build(capB, cp);
    return (t, s) => { const w = s.moving ? 1.8 : 0.6; b.rotation.z = Math.sin(t * 6.5) * 0.07 * w; b.position.y = Math.abs(Math.sin(t * 6.5)) * 0.1 * w; capB.scale.y = 1 + Math.sin(t * 4) * 0.06; capB.rotation.x = Math.sin(t * 3) * 0.06 - s.lunge * 0.7; b.position.z = s.lunge * 0.6; if (gift && Math.random() < 0.04) P().add.emit({ x: g.parent.position.x, y: g.parent.position.y + 2 * d.scale, z: g.parent.position.z, spread: 0.6, vy: 0.8, life: 1.5, size: 0.4, c: 0x9fffb0, wob: 1 }); };
  },
  crab(g, d) {
    const c = d.color, c2 = shade(c, -0.3), b = bone(g), ps = [pc('sph', c, [0, 0.8, 0], [2.4, 1.05, 1.8], null, 'gloss', { top: shade(c, 0.35), g: 0.35 }), pc('sph', 0xe8dcc8, [0, 0.6, 0.12], [2.05, 0.72, 1.55], null, 'matte'), cuteEyes(1.68, 0.62, 0.36, 0.27)];
    for (let i = 0; i < 7; i++) { const a = i * 0.9; ps.push(pc('rock', c2, [Math.cos(a) * 0.6, 1.24 - (i % 2) * 0.08, Math.sin(a) * 0.45 - 0.2], 0.34 - (i % 3) * 0.06, null, 'stone')); }
    for (const s of [-1, 1]) ps.push(pc('cyl', c, [s * 0.36, 1.4, 0.6], [0.11, 0.5, 0.11], null, 'matte'));
    build(b, ps);
    const claws = [-1, 1].map(s => { const cb = bone(b, s * 1.3, 0.72, 0.6), jb = bone(cb, 0, 0, 0.55); build(cb, [pc('cap', c, [0, 0, 0.25], [0.32, 0.3, 0.32], [PI / 2, 0, 0], 'matte'), pc('sph', shade(c, 0.15), [0, 0.14, 0.9], [0.75, 0.44, 1.0], null, 'gloss'), pc('cone', 0xf2ead8, [0, 0.1, 1.42], [0.2, 0.34, 0.14], [PI / 2, 0, 0], 'gloss')]); build(jb, [pc('sph', c2, [0, -0.14, 0.34], [0.56, 0.26, 0.84], null, 'gloss')]); return { cb, jb, s }; });
    const legs = []; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const lb = bone(b, s * 1.0, 0.6, -0.55 + i * 0.45); build(lb, [pc('cap', c, [s * 0.36, 0.12, 0], [0.17, 0.3, 0.17], [0, 0, s * 1.1], 'matte'), pc('cone', c2, [s * 0.74, -0.24, 0], [0.17, 0.72, 0.17], [PI, 0, s * -0.12], 'matte')]); legs.push({ lb, s, i }); }
    return (t, s) => { const w = s.moving ? 1 : 0.15; for (const l of legs) { l.lb.rotation.z = Math.sin(t * 12 + l.i * 2.1 + (l.s > 0 ? 1 : 0)) * 0.3 * w; l.lb.rotation.y = Math.cos(t * 12 + l.i * 2.1) * 0.25 * w; } b.position.y = Math.abs(Math.sin(t * 6)) * 0.06 * w; b.rotation.z = Math.sin(t * 6) * 0.03; for (const k of claws) { k.cb.rotation.y = k.s * (0.25 + Math.sin(t * 2 + k.s) * 0.12) - k.s * s.lunge * 0.5; k.cb.rotation.x = -0.25 - s.lunge * 0.5; k.jb.rotation.x = 0.3 + Math.sin(t * 3 + k.s) * 0.2 + s.lunge * 0.5; } };
  },
  golem(g, d) {
    const boss = d.model === 'boss', c = d.color, c2 = shade(c, -0.28), gc = d.glow || 0xffb040, moss = (x, y, z, ny, r, gg, b) => !d.glow && ny > 0.5 ? [lerp(r, 0.2, 0.7), lerp(gg, 0.36, 0.7), lerp(b, 0.12, 0.7)] : null;
    const b = bone(g), torso = bone(b, 0, 1.75, 0), head = bone(torso, 0, 1.3, 0.15), tp = [pc('rock', c, [0, 0, 0], [2.4, 2.3, 1.9], null, 'stone', { f: moss, g: 0.3 }), pc('rock2', c2, [0, -1.0, 0], [1.7, 1.0, 1.5], null, 'stone'), pc('sph', gc, [0, 0.15, 0.78], [0.62, 0.62, 0.4], null, 'glow', { top: 0xffffff })];
    for (const q of [[0.42, 0.5, 0.86, 0.5], [-0.46, 0.4, 0.84, -0.6], [0.3, -0.4, 0.8, -0.3], [-0.2, -0.5, 0.8, 0.5]]) tp.push(pc('box', gc, [q[0], q[1], q[2]], [0.07, 0.62, 0.07], [0, 0, q[3]], 'glow'));
    for (const s of [-1, 1]) tp.push(pc('cone4', gc, [s * 0.55, 0.95, -0.75], [0.42, 1.3, 0.42], [-0.6, 0, -s * 0.35], 'glow', { top: 0xffffff }), pc('cone4', gc, [s * 0.2, 0.55, -0.95], [0.3, 0.9, 0.3], [-0.9, 0, -s * 0.2], 'glow'));
    if (boss) for (const s of [-1, 1]) tp.push(pc('sph', GOLD, [s * 1.25, 0.85, 0], [1.3, 0.75, 1.3], null, 'metal', { g: 0.3 }), pc('cone', GOLD, [s * 1.5, 1.4, 0], [0.34, 0.9, 0.34], [0, 0, -s * 0.5], 'metal'), pc('box', GOLD, [0, -0.72, 0.72], [1.5, 0.3, 0.2], null, 'metal'));
    build(torso, tp); const cg = glow(gc, boss ? 5.5 : 3.2, 0.7); cg.position.set(0, 0.15, 1.0); torso.add(cg);
    const hp = [pc('rock2', c, [0, 0, 0], [1.2, 1.05, 1.15], null, 'stone', { f: moss }), glowEyes(0.02, 0.5, 0.23, 0.2, gc), pc('rock', c2, [0, -0.42, 0.2], [0.85, 0.4, 0.7], null, 'stone')];
    if (boss) hp.push(pc('cone', GOLD, [-0.42, 0.62, 0], [0.24, 0.9, 0.24], [0, 0, 0.35], 'metal'), pc('cone', GOLD, [0.42, 0.62, 0], [0.24, 0.9, 0.24], [0, 0, -0.35], 'metal'), pc('box', GOLD, [0, 0.3, 0.5], [0.9, 0.16, 0.14], null, 'metal'));
    build(head, hp);
    const arms = [-1, 1].map(s => { const ab = bone(torso, s * 1.5, 0.55, 0), fb = bone(ab, 0, -1.05, 0); build(ab, [pc('rock', c2, [s * 0.1, 0, 0], [1.15, 1.25, 1.15], null, 'stone', { f: moss })]); build(fb, [pc('rock2', c, [0, boss ? -0.5 : -0.15, 0], [0.95, 1.3, 0.95], null, 'stone'), pc('rock', c2, [0, boss ? -1.45 : -1.05, 0.1], [1.2, 1.1, 1.2], null, 'stone'), boss ? [pc('torT', gc, [0, 0.35, 0], [1.4, 1.4, 1.6], [PI / 2, 0, 0], 'glow'), pc('torT', gc, [0, -0.9, 0], [1.6, 1.6, 1.6], [PI / 2, 0, 0], 'glow')] : []]); return { ab, fb, s }; });
    const legs = [-1, 1].map(s => { const lb = bone(b, s * 0.62, 0.95, 0); build(lb, [pc('rock2', c2, [0, -0.35, 0], [1.0, 1.15, 1.05], null, 'stone'), pc('rock', c, [0, -0.78, 0.1], [1.1, 0.5, 1.3], null, 'stone')]); return lb; });
    let crown = null, cloud = null;
    if (boss) { crown = bone(head, 0, 1.0, 0); const cp = []; for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; cp.push(pc('cone4', gc, [Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0], [0.22, 0.7 + (i % 2) * 0.3, 0.22], null, 'glow', { top: 0xffffff })); } cp.push(pc('torT', 0xffffff, [0, -0.1, 0], [2.0, 2.0, 1], [PI / 2, 0, 0], 'glow')); build(crown, cp); cloud = bone(g, 0, 0.3, 0); const kp = []; for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2; kp.push(pc('blob', 0xf4f8ff, [Math.cos(a) * 1.9, (i % 2) * 0.2, Math.sin(a) * 1.9], [1.3, 0.8, 1.3], null, 'ghost')); } build(cloud, kp); const ru = new T.Mesh(GFX.B.plane, new T.MeshBasicMaterial({ map: GFX.TX.rune, color: gc, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); ru.rotation.x = -PI / 2; ru.scale.setScalar(6.5); ru.position.y = 0.12; g.add(ru); g.userData.rune = ru; }
    return (t, s) => { const w = s.moving ? 1 : 0, ph = t * (boss ? 3 : 4.2); b.position.y = Math.abs(Math.sin(ph)) * 0.12 * w + Math.sin(t * 1.6) * 0.03; torso.rotation.z = Math.sin(ph) * 0.06 * w; torso.rotation.y = Math.sin(ph) * 0.1 * w; torso.rotation.x = s.lunge * 0.35; legs[0].rotation.x = Math.sin(ph) * 0.5 * w; legs[1].rotation.x = -Math.sin(ph) * 0.5 * w; head.rotation.y = Math.sin(t * 0.7) * 0.2; cg.material.opacity = 0.55 + Math.sin(t * 3) * 0.2;
      for (const a of arms) { a.ab.rotation.x = (a.s > 0 ? 1 : -1) * Math.sin(ph) * 0.45 * w - (a.s > 0 ? s.lunge * 2.3 : s.lunge * 0.6); a.ab.rotation.z = a.s * (0.12 + Math.sin(t * 1.6) * 0.04); a.fb.rotation.x = -0.25 - s.lunge * 0.4; if (boss) a.fb.position.y = -1.05 + Math.sin(t * 2 + a.s) * 0.15; }
      if (boss) { crown.rotation.y = t * 0.9; crown.position.y = 1.0 + Math.sin(t * 2) * 0.1; cloud.rotation.y = -t * 0.3; g.userData.rune.rotation.z = t * 0.4; if (Math.random() < 0.3) { const a = rnd(0, 6.28), wp = g.parent.position, sc = d.scale; P().add.emit({ x: wp.x + Math.cos(a) * 2 * sc, y: wp.y + rnd(1, 4.5) * sc, z: wp.z + Math.sin(a) * 2 * sc, n: 2, vs: 3, life: 0.35, size: 0.7, c: 0xffffff, c2: gc }); } } };
  },
  wolf(g, d) {
    const c = d.color, c2 = shade(c, 0.25), pu = 0x8a5ae0, b = bone(g), ps = [pc('cap', c, [0, 1.08, -0.05], [0.9, 0.82, 0.86], [PI / 2, 0, 0], 'matte', { g: 0.35 }), pc('sph', c2, [0, 1.02, 0.72], [1.02, 1.08, 0.95], null, 'matte', { g: 0.3 }), pc('sph', c, [0, 1.3, 0.95], [0.7, 0.7, 0.8], null, 'matte')];
    for (let i = 0; i < 7; i++) ps.push(pc('cone', i % 2 ? pu : c, [0, 1.55 - i * 0.02, 0.8 - i * 0.3], [0.2, 0.5 - i * 0.03, 0.26], [-0.5, 0, 0], 'matte'));
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ps.push(pc('cone', c2, [s * 0.46, 1.0 - i * 0.14, 0.9 - i * 0.1], [0.18, 0.4, 0.16], [0.3, 0, -s * 1.9], 'matte'));
    build(b, ps);
    const head = bone(b, 0, 1.56, 1.28), jaw = bone(head, 0, -0.2, 0.2), hp = [pc('sph', c, [0, 0, 0], [0.84, 0.76, 0.86], null, 'matte', { g: 0.2 }), pc('cap', c2, [0, -0.06, 0.52], [0.38, 0.26, 0.3], [PI / 2, 0, 0], 'matte'), pc('sph', 0x14101c, [0, 0.02, 0.88], 0.15, null, 'gloss'), glowEyes(0.1, 0.36, 0.23, 0.15, 0xff4030), pc('box', c, [0, 0.22, 0.34], [0.6, 0.08, 0.2], [0.3, 0, 0], 'matte')];
    for (const s of [-1, 1]) hp.push(pc('cone', c, [s * 0.28, 0.46, -0.06], [0.26, 0.56, 0.18], [-0.2, 0, -s * 0.28], 'matte'), pc('cone', pu, [s * 0.28, 0.44, -0.02], [0.14, 0.36, 0.1], [-0.2, 0, -s * 0.28], 'matte'), pc('cone', 0xffffff, [s * 0.13, -0.2, 0.7], [0.07, 0.17, 0.07], [PI, 0, 0], 'gloss'), pc('cone', c2, [s * 0.44, -0.12, 0.1], [0.2, 0.44, 0.16], [0.4, 0, -s * 2.1], 'matte'));
    build(head, hp); build(jaw, [pc('cap', c, [0, -0.06, 0.26], [0.3, 0.22, 0.18], [PI / 2, 0, 0], 'matte'), pc('cone', 0xffffff, [-0.1, 0.04, 0.44], [0.06, 0.14, 0.06], null, 'gloss'), pc('cone', 0xffffff, [0.1, 0.04, 0.44], [0.06, 0.14, 0.06], null, 'gloss')]);
    const eg = glow(0xff4030, 1.3, 0.6); eg.position.set(0, 0.1, 0.42); head.add(eg);
    const legs = []; for (const fz of [0.72, -0.72]) for (const s of [-1, 1]) { const u = bone(b, s * 0.34, 0.98, fz), l = bone(u, 0, -0.52, 0); build(u, [pc('cap', c, [0, -0.26, 0], [0.3, 0.27, 0.34], null, 'matte')]); build(l, [pc('cap', c2, [0, -0.2, 0], [0.19, 0.2, 0.19], null, 'matte'), pc('sph', 0x1c1826, [0, -0.42, 0.07], [0.28, 0.17, 0.38], null, 'matte')]); legs.push({ u, l, front: fz > 0, s }); }
    const tail = bone(b, 0, 1.25, -1.2); build(tail, [pc('sph', c, [0, 0.12, -0.45], [0.4, 0.4, 1.0], [0.35, 0, 0], 'matte'), pc('cone', pu, [0, 0.42, -1.05], [0.32, 0.6, 0.32], [-1.2, 0, 0], 'matte')]);
    return (t, s) => { const w = s.moving ? 1 : 0, ph = t * (s.chase ? 13 : 7); b.position.y = Math.sin(ph) * 0.1 * w + Math.sin(t * 2) * 0.02; b.rotation.x = Math.cos(ph) * 0.07 * w; for (const l of legs) { const a = ph + (l.front ? 0 : 2.4) + (l.s > 0 ? 0.5 : 0), sw = Math.sin(a) * 0.85 * w; l.u.rotation.x = sw; l.l.rotation.x = (l.front ? -1 : 1) * (0.3 + Math.max(0, Math.cos(a)) * 0.9 * w); }
      head.rotation.x = Math.sin(t * 1.5) * 0.06 - s.lunge * 0.4; head.position.z = 1.28 + s.lunge * 0.5; jaw.rotation.x = 0.1 + s.lunge * 0.7 + (s.chase ? 0.15 : 0); tail.rotation.y = Math.sin(t * (s.chase ? 9 : 3)) * 0.4; tail.rotation.x = s.chase ? 0.3 : -0.2;
      if (Math.random() < 0.08) P().norm.emit({ x: g.parent.position.x + rnd(-0.6, 0.6), y: g.parent.position.y + 2 * d.scale, z: g.parent.position.z + rnd(-0.6, 0.6), vy: 1, life: 0.9, size: 0.9, c: 0x4a3080, c2: 0x1a1030 }); };
  },
  wisp(g, d) {
    const c = d.color, b = bone(g, 0, 1.7, 0), orb = bone(b); build(b, [pc('sph', 0xffffff, null, 0.8, null, 'glow'), pc('sph', c, null, 1.3, null, 'add'), pc('cone', c, [0, 0.75, 0], [0.7, 1.0, 0.7], null, 'add'), pc('cone', 0xffffff, [0.2, 0.7, -0.1], [0.3, 0.7, 0.3], [0, 0, -0.3], 'add'), pc('sph', 0x0c3a4a, [-0.17, 0.06, 0.36], [0.13, 0.22, 0.08], null, 'matte'), pc('sph', 0x0c3a4a, [0.17, 0.06, 0.36], [0.13, 0.22, 0.08], null, 'matte'), pc('sph', 0x0c3a4a, [0, -0.14, 0.38], [0.1, 0.06, 0.05], null, 'matte')]);
    build(orb, [0, 1, 2].map(i => pc('sph', 0xffffff, [Math.cos(i * 2.1) * 1.2, -0.3 + i * 0.3, Math.sin(i * 2.1) * 1.2], 0.17, null, 'glow'))); const gl = glow(c, 6, 0.7); b.add(gl);
    return (t, s) => { b.position.y = 1.7 + Math.sin(t * 2.2) * 0.3; b.position.z = s.lunge * 1.2; orb.rotation.y = t * 2.8; orb.rotation.x = Math.sin(t) * 0.4; const p = 1 + Math.sin(t * 5) * 0.08; b.scale.set(p, 2 - p, p); gl.material.opacity = 0.55 + Math.sin(t * 5) * 0.2; if (Math.random() < 0.3) P().add.emit({ x: g.parent.position.x, y: g.parent.position.y + (b.position.y + 0.4) * d.scale, z: g.parent.position.z, spread: 0.3, vy: 1.5, life: 0.8, size: 0.5, c, c2: 0xffffff }); };
  },
  beetle(g, d) {
    const c = d.color, dk = 0x1c1412, b = bone(g), ps = [pc('sph', dk, [0, 0.92, -0.2], [1.75, 1.25, 2.4], null, 'metal', { g: 0.2 }), pc('sph', 0x2a1c18, [0, 0.86, 0.98], [1.35, 1.0, 1.05], null, 'metal'), pc('box', c, [0, 1.535, -0.2], [0.08, 0.05, 2.0], null, 'glow'), pc('sph', c, [0, 0.5, -0.2], [1.3, 0.3, 1.9], null, 'glow')];
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) ps.push(pc('sph', c, [s * (0.42 - i * 0.02), 1.38 - i * 0.06 - (i === 3 ? 0.1 : 0), -0.95 + i * 0.5], [0.34, 0.1, 0.34], [0, 0, -s * 0.5], 'glow', { top: 0xffe08a }));
    build(b, ps); const gl = glow(c, 5, 0.45); gl.position.set(0, 0.8, -0.2); b.add(gl);
    const head = bone(b, 0, 0.78, 1.5), hp = [pc('sph', dk, [0, 0, 0], [0.85, 0.62, 0.72], null, 'metal'), pc(tube([[0, 0.12, 0.2], [0, 0.55, 0.72], [0, 1.15, 0.92], [0, 1.55, 0.7]], 0.12), 0x2a1c18, null, null, null, 'metal'), pc('cone', c, [0, 1.72, 0.58], [0.2, 0.4, 0.2], [-0.5, 0, 0], 'glow'), glowEyes(0.12, 0.3, 0.32, 0.15, 0xffd23c)];
    for (const s of [-1, 1]) hp.push(pc('cone', 0x3a2a24, [s * 0.26, -0.16, 0.48], [0.13, 0.5, 0.13], [PI / 2, 0, -s * 0.3], 'metal'), pc(tube([[s * 0.2, 0.25, 0.2], [s * 0.5, 0.7, 0.4], [s * 0.8, 0.8, 0.9]], 0.03, 4), dk, null, null, null, 'matte'));
    build(head, hp);
    const legs = []; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const lb = bone(b, s * 0.8, 0.6, -0.9 + i * 0.75); build(lb, [pc('cap', dk, [s * 0.44, 0.12, 0], [0.14, 0.32, 0.14], [0, 0, s * 1.2], 'metal'), pc('cone', dk, [s * 0.96, -0.28, 0], [0.14, 0.78, 0.14], [PI, 0, -s * 0.2], 'metal')]); legs.push({ lb, i, s }); }
    return (t, s) => { const w = s.moving ? 1 : 0.1; for (const l of legs) { l.lb.rotation.z = Math.sin(t * 13 + l.i * 2.1 + (l.s > 0 ? 1.5 : 0)) * 0.28 * w; l.lb.rotation.y = Math.cos(t * 13 + l.i * 2.1) * 0.3 * w; } b.position.y = Math.abs(Math.sin(t * 6.5)) * 0.05 * w; b.rotation.x = s.lunge * 0.3; b.position.z = s.lunge * 0.8; head.rotation.x = Math.sin(t * 2) * 0.08 - s.lunge * 0.5; gl.material.opacity = 0.35 + Math.sin(t * 4) * 0.15; if (Math.random() < 0.1) P().add.emit({ x: g.parent.position.x + rnd(-0.8, 0.8), y: g.parent.position.y + 1.6 * d.scale, z: g.parent.position.z + rnd(-0.8, 0.8), vy: 2.2, vs: 0.5, life: 0.9, size: 0.35, c: 0xffa040, c2: 0xff3010 }); };
  },
  ghost(g, d) {
    const c = d.color, b = bone(g, 0, 1.0, 0), robe = lathe([[0.5, 0.2], [1.12, 0], [0.98, 0.9], [0.64, 1.7], [0.44, 2.0], [0.52, 2.2], [0.66, 2.56], [0.46, 2.92], [0.01, 3.06]], 16); { const p = robe.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.05) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, Math.round(a * 16 / (PI * 2)) % 2 ? -0.35 : 0.12); } robe.computeVertexNormals(); }
    build(b, [pc(robe, c, null, null, null, 'ghost', { top: shade(c, -0.35), g: 0.5 }), pc('sph', 0x0a0606, [0, 2.5, 0.2], [0.8, 0.84, 0.66], null, 'matte'), glowEyes(2.56, 0.5, 0.18, 0.15, 0xff7a2a), pc('sph', 0xff8a3a, [0, 1.55, 0.5], 0.3, null, 'glow'), pc('tor', 0x6a6058, [0, 2.06, 0], [1.0, 0.94, 0.7], [PI / 2, 0, 0], 'matte')]);
    const eg = glow(0xff7a2a, 2.2, 0.7); eg.position.set(0, 2.56, 0.6); b.add(eg); const cg = glow(0xff8a3a, 3, 0.5); cg.position.set(0, 1.55, 0.6); b.add(cg);
    const arms = [-1, 1].map(s => { const ab = bone(b, s * 0.62, 1.95, 0.1); build(ab, [pc('cone', c, [0, -0.3, 0.46], [0.52, 1.1, 0.52], [-1.0, 0, 0], 'ghost'), pc('sph', 0xe0d8c8, [0, -0.62, 0.98], [0.2, 0.14, 0.26], null, 'matte'), [-1, 0, 1].map(i => pc('cone', 0xe0d8c8, [i * 0.08, -0.68, 1.14], [0.05, 0.24, 0.05], [1.9, 0, 0], 'matte'))]); return { ab, s }; });
    return (t, s) => { b.position.y = 1.0 + Math.sin(t * 1.8) * 0.3; b.rotation.z = Math.sin(t * 1.4) * 0.07; b.rotation.x = s.moving ? 0.2 : 0.02; b.position.z = s.lunge * 0.9; for (const a of arms) { a.ab.rotation.x = Math.sin(t * 2 + a.s) * 0.2 - 0.2 - s.lunge * 1.1 - (s.chase ? 0.5 : 0); a.ab.rotation.z = a.s * 0.15; } eg.material.opacity = 0.5 + Math.sin(t * 6) * 0.2; if (Math.random() < 0.12) P().norm.emit({ x: g.parent.position.x + rnd(-0.7, 0.7), y: g.parent.position.y + rnd(1, 2.5) * d.scale, z: g.parent.position.z + rnd(-0.7, 0.7), vy: 1.4, life: 1.2, size: 0.8, c: 0x8a8078, c2: 0x3a3430, wob: 1 }); };
  },
  guardian(g, d) {
    const W = d.color, b = bone(g, 0, 1.2, 0), ps = [pc('sph', W, [0, 1.9, 0], [1.35, 1.5, 1.0], null, 'gloss', { g: 0.25 }), pc('sph', GOLD, [0, 2.08, 0.2], [1.05, 0.9, 0.76], null, 'metal', { g: 0.3 }), pc('oct', 0x6fd8ff, [0, 2.1, 0.6], [0.3, 0.4, 0.14], null, 'glow'), pc('cone', W, [0, 0.72, 0], [1.05, 1.6, 0.9], [PI, 0, 0], 'matte', { g: 0.4 }), pc('tor', GOLD, [0, 1.36, 0], [1.1, 0.86, 0.9], [PI / 2, 0, 0], 'metal')];
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; ps.push(pc('blob', 0xffffff, [Math.cos(a) * 0.55, 0.05 + (i % 2) * 0.2, Math.sin(a) * 0.5], [0.9, 0.6, 0.9], null, 'ghost')); }
    build(b, ps);
    const head = bone(b, 0, 3.05, 0); build(head, [pc('sph', W, [0, 0, 0], [0.98, 1.02, 0.98], null, 'gloss'), pc('box', 0x6fd8ff, [0, 0.02, 0.43], [0.62, 0.13, 0.14], null, 'glow'), pc('box', GOLD, [0, 0.42, -0.04], [0.1, 0.56, 0.86], null, 'metal'), pc('sph', GOLD, [-0.46, -0.14, 0.1], [0.14, 0.5, 0.5], null, 'metal'), pc('sph', GOLD, [0.46, -0.14, 0.1], [0.14, 0.5, 0.5], null, 'metal'), pc('torT', 0xffe07a, [0, 0.86, 0], [1.35, 1.35, 1.6], [PI / 2, 0, 0], 'glow')]); const hg = glow(0xffe07a, 2.6, 0.5); hg.position.y = 0.86; head.add(hg);
    const feathers = []; for (let i = 0; i < 6; i++) { const a = 0.95 - i * 0.36, Ln = 2.3 - Math.abs(i - 1.5) * 0.28; feathers.push(pc('sph', i < 3 ? 0xffffff : 0xcfe6ff, [Math.cos(a) * Ln / 2, Math.sin(a) * Ln / 2, -i * 0.03], [Ln, 0.46, 0.1], [0, 0, a], 'gloss', { top: 0xffffff })); }
    feathers.push(pc('sph', GOLD, [0.3, 0.1, 0.02], [0.8, 0.5, 0.2], null, 'metal'));
    const wings = [1, -1].map(s => { const wb = bone(b, s * 0.5, 2.35, -0.5); build(wb, s > 0 ? feathers : mirror(feathers)); return { wb, s }; });
    const armR = bone(b, 0.86, 2.35, 0.1), armL = bone(b, -0.86, 2.35, 0.1);
    build(armR, [pc('cap', W, [0, -0.4, 0], [0.27, 0.36, 0.27], null, 'gloss'), pc('cyl', GOLD, [0, -0.72, 0], [0.34, 0.26, 0.34], null, 'metal'), pc('cyl', GOLD, [0, -0.9, 0.5], [0.08, 3.8, 0.08], [PI / 2 - 0.25, 0, 0], 'metal'), pc('cone4', 0xbff4ff, [0, -0.36, 2.6], [0.34, 1.0, 0.1], [PI / 2 - 0.25, 0, 0], 'glow', { top: 0xffffff }), pc('tor', GOLD, [0, -0.5, 2.05], [0.3, 0.3, 0.8], [-0.25, 0, 0], 'metal')]);
    build(armL, [pc('cap', W, [0, -0.4, 0], [0.27, 0.36, 0.27], null, 'gloss'), pc('cyl', W, [-0.16, -0.8, 0.2], [1.2, 0.08, 1.2], [0, 0, PI / 2], 'gloss'), pc('tor', GOLD, [-0.18, -0.8, 0.2], [1.2, 1.2, 0.5], [0, PI / 2, 0], 'metal'), pc('oct', 0x6fd8ff, [-0.24, -0.8, 0.2], [0.1, 0.4, 0.4], null, 'glow')]);
    return (t, s) => { b.position.y = 1.2 + Math.sin(t * 2) * 0.25; b.rotation.x = s.moving ? 0.15 : 0; b.position.z = s.lunge * 0.8; for (const w of wings) { w.wb.rotation.z = w.s * (0.1 + Math.sin(t * 5) * 0.4); w.wb.rotation.y = -w.s * (0.3 + Math.sin(t * 5 + 1) * 0.2); } armR.rotation.x = -0.35 + Math.sin(t * 2) * 0.05 - s.lunge * 0.9; armL.rotation.x = -0.3; armL.rotation.z = -0.2; head.rotation.y = Math.sin(t * 0.8) * 0.2; };
  },
};
MOBS.boss = MOBS.golem;
GFX.mob = function (def) { const g = new T.Group(), anim = MOBS[def.model](g, def); return { g, anim }; };
})();
