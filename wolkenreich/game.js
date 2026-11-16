'use strict';
/* Wolkenreich – Engine */
(() => {
const { CLASSES, SPECS, SKILLS, RAR, SETS, SETF, UPCHANCE, DUNGEONS, ITEMS, MOBS, ZONES, ISLANDS, NPCS, QUESTS, HAIRS, MAXLVL, expNeed } = WR;
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
// Dungeons liegen weit außerhalb der Karte; Boden = Räume (Kreise) + Gänge dazwischen
const DUN = DUNGEONS.map((d, i) => { const ox = 3000 + i * 900, f = i % 2 ? -1 : 1; return Object.assign({ y: 30, w: 10, rooms: [[0, 0, 14], [0, 62, 22], [52 * f, 120, 22], [52 * f, 190, 24], [0, 256, 34]].map(r => ({ x: ox + r[0], z: r[1], r: r[2] })) }, d); });
function dunFloor(d, x, z, pad = 0, locks) {
  for (const r of d.rooms) if (Math.hypot(x - r.x, z - r.z) < r.r - 1.6 - pad) return true;
  for (let i = 0; i < d.rooms.length - 1; i++) { const a = d.rooms[i], b = d.rooms[i + 1], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (len * len), 0, locks && locks[i] ? (a.r + 2.2) / len : 1); if (Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < d.w / 2 - 0.9 - pad) return true; }
  return false;
}
// Wo in der Raumkette steht jemand? Raum j -> j, Gang zwischen j und j+1 -> j + 0.5
function dunIdx(d, x, z) { let best = 0, bd = 1e9; d.rooms.forEach((r, j) => { const q = Math.hypot(x - r.x, z - r.z); if (q < r.r) { best = j; bd = -1; } else if (bd >= 0 && q - r.r < bd) { bd = q - r.r; best = j; } }); if (bd < 0) return best; for (let i = 0; i < d.rooms.length - 1; i++) { const a = d.rooms[i], b = d.rooms[i + 1], dx = b.x - a.x, dz = b.z - a.z, t = ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz); if (t > 0 && t < 1 && Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < d.w) return i + 0.5; } return best; }
function groundAt(x, z, y) {
  if (x > 2500) { for (const d of DUN) if (dunFloor(d, x, z, -2.5)) return d.y; return -40; }
  const g = terrainH(x, z), i = islandAt(x, z);
  return i && y >= i.y - 1.5 ? i.y : g;
}

/* ---------- Grafik ---------- */
const canvas = $('#c');
GFX.init(canvas, { terrainH, ZONES, ISLANDS, WATER });
const scene = GFX.scene, camera = GFX.camera, groundMeshes = GFX.groundMeshes, fx = GFX.fx, ring = fx.ring;
const FLOATERS = { wisp: 1, ghost: 1, guardian: 1 };
const pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), pickGeo = new THREE.SphereGeometry(0.5, 8, 6);
function addPick(parent, y, sx, sy, ent, kind) { const m = new THREE.Mesh(pickGeo, pickMat); m.position.y = y; m.scale.set(sx, sy, sx); m.userData.ent = ent; m.userData.kind = kind; parent.add(m); return m; }
const timers = [];
const later = (t, fn) => timers.push({ t, fn });
function runTimers(dt) { for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } } }

/* ---------- Spielzustand ---------- */
const p = {
  name: 'Wanderer', hair: HAIRS[0], cls: 'wanderer', spec: null, dun: null, lvl: 1, exp: 0, gold: 50, sp: 0,
  stats: { str: 10, sta: 10, dex: 10, int: 10 }, inv: [], equip: { weapon: null, armor: null, board: null },
  q: { i: 0, on: false, prog: 0 }, hp: 1, mp: 1,
  x: 0, y: 2, z: 16, vy: 0, rot: Math.PI, onGround: true, flying: false, dead: false,
  target: null, attacking: false, queued: null, moveTo: null, interact: null,
  atkT: 0, swing: 0, combatT: 0, potT: 0, cds: {}, buffs: [], walkT: 0, model: null,
};
const mobs = [], npcs = [], loots = [], projs = [], fxs = [];
const keys = {}; const cam = { yaw: 0, pitch: 0.42, dist: 14 };
let started = false, shopOpen = false, curNpc = null, zoneName = '', zoneKey = 'town';

const mod = k => p.buffs.reduce((a, b) => a * (b.m[k] || 1), 1);
const cls = () => CLASSES[p.cls];
const clsName = () => p.spec ? SPECS[p.spec].name : cls().name;
const ARMOR = ['helm', 'armor', 'gloves', 'boots'], GEAR = ['weapon'].concat(ARMOR), SLOTN = { weapon: 'Waffe', helm: 'Helm', armor: 'Rüstung', gloves: 'Handschuhe', boots: 'Stiefel', board: 'Flugbrett' };
const ACC = ['ear1', 'ear2', 'neck', 'arm', 'ring1', 'ring2'], WTYPES = GEAR.concat(['ring', 'ear', 'neck', 'arm']), WEAR = GEAR.concat(ACC);
Object.assign(SLOTN, { ear1: 'Ohrring', ear2: 'Ohrring', neck: 'Kette', arm: 'Armreif', ring1: 'Ring', ring2: 'Ring' });
const BN = { hp: 'Leben', def: 'Verteidigung', atk: 'Angriff', crit: 'kritische Treffer', spd: 'Lauftempo', aspd: 'Angriffstempo', mp: 'Mana' };
const setText = (b, r) => Object.keys(b).map(k => `+${Math.round(b[k] * SETF[r] * 1000) / 10} % ${BN[k]}`.replace('.', ',')).join(', ');
// Set (4 Rüstungsteile) bzw. Kollektion (5 Accessoires) der eigenen Klasse: alle Teile im selben Seltenheitsgrad
function setInfo(kind) { const slots = kind === 'acc' ? ACC : ARMOR, def = SETS[p.cls][kind], c = [0, 0, 0, 0, 0]; let n = 0; for (const k of slots) if (p.equip[k]) { c[Math.min(4, p.equip[k].r || 0)]++; n++; } let best = 0; for (let i = 1; i < 5; i++) if (c[i] >= c[best] && c[i]) best = i; return { def, r: best, n: c[best], need: slots.length, full: c[best] === slots.length, any: n > 0 }; }
const setFrac = k => { let f = 0; for (const kind of ['armor', 'acc']) { const si = setInfo(kind); if (si.full && si.def.b[k]) f += si.def.b[k] * SETF[si.r]; } return f; };
const setB = (k, d) => d === 0 ? setFrac(k) : 1 + setFrac(k);
const accSum = k => ACC.reduce((a, s) => a + eqVal(s, k), 0);
function setLines() { let h = ''; for (const kind of ['armor', 'acc']) { const si = setInfo(kind); if (!si.any) continue; h += `<div style="margin:3px 0;font-size:12px;color:${RAR[si.r].col}" data-tip="${esc('<b>' + si.def.name + ' (' + RAR[si.r].name + ')</b><br>' + setText(si.def.b, si.r) + '<br><span class=muted>' + (kind === 'acc' ? 'Kollektion: beide Ringe, beide Ohrringe, Kette und Armreif' : 'Set: Helm, Rüstung, Handschuhe und Stiefel') + ' im selben Seltenheitsgrad.</span>')}">◆ ${si.def.name} ${si.n}/${si.need}${si.full ? '<br>aktiv: ' + setText(si.def.b, si.r) : ''}</div>`; } return h; }
const wBonus = (k, d) => { const e = p.equip.weapon, b = e && ITEMS[e.id].bonus; return b && b[k] !== undefined ? b[k] : d; };
const maxHP = () => Math.round((90 + p.lvl * 20 + p.stats.sta * 10 + accSum('hpAdd')) * cls().hpM * (p.spec ? SPECS[p.spec].hpM : 1) * wBonus('hp', 1) * setB('hp', 1));
const maxMP = () => Math.round((30 + p.lvl * 6 + p.stats.int * 7) * setB('mp', 1));
const eqVal = (slot, k) => { const e = p.equip[slot]; return e ? (ITEMS[e.id][k] || 0) * RAR[e.r || 0].m * (1 + 0.08 * (e.plus || 0)) : 0; };
const atkPower = () => (eqVal('weapon', 'atk') + accSum('atk') + p.stats[cls().stat] * 1.0 + p.lvl * 1.5) * mod('atk') * wBonus('atk', 1) * setB('atk', 1);
const defense = () => (ARMOR.reduce((a, k) => a + eqVal(k, 'def'), 0) + accSum('def') + p.stats.sta * 0.5) * mod('def') * setB('def', 1);
const critChance = () => Math.min(0.75, 0.05 + p.stats.dex * 0.003 + wBonus('crit', 0) + setB('crit', 0));
const atkInterval = () => clamp(1.25 - p.stats.dex * 0.006, 0.5, 1.25) / mod('aspd') / wBonus('aspd', 1) / setB('aspd', 1);
const mySkills = () => Object.keys(SKILLS).filter(k => SKILLS[k].cls === '*' || SKILLS[k].cls === p.cls || SKILLS[k].cls === p.spec);

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
const isGear = id => WTYPES.includes(ITEMS[id].type);
const gearName = (id, r, plus) => `<span style="color:${isGear(id) ? RAR[r || 0].col : '#ffd978'}">${ITEMS[id].name}${plus ? ' +' + plus : ''}</span>`;
function itemTip(id, plus, r) {
  const it = ITEMS[id], m = RAR[r || 0].m * (1 + 0.08 * (plus || 0)); let h = `<b>${it.icon} ${gearName(id, r, plus)}</b>`;
  if (isGear(id)) h += `<br><span style="color:${RAR[r || 0].col}">◆ ${RAR[r || 0].name}</span>${r ? ` (+${Math.round((RAR[r].m - 1) * 100)} %)` : ''}`;
  if (it.atk) h += `<br>Angriff: ${Math.round(it.atk * m)}`;
  if (it.def) h += `<br>Verteidigung: ${Math.round(it.def * m)}`;
  if (it.bonus) { const b = it.bonus, L = []; if (b.atk) L.push(`+${Math.round((b.atk - 1) * 100)} % Angriff`); if (b.crit) L.push(`+${Math.round(b.crit * 100)} % kritische Treffer`); if (b.aspd) L.push(`+${Math.round((b.aspd - 1) * 100)} % Angriffstempo`); if (b.hp) L.push(`+${Math.round((b.hp - 1) * 100)} % Leben`); if (b.leech) L.push(`Heilt dich um ${Math.round(b.leech * 100)} % des verursachten Schadens`); h += `<br><span style="color:${RAR[it.fr].col}">${L.join('<br>')}</span>`; }
  if (it.hpAdd) h += `<br>Leben: +${Math.round(it.hpAdd * m)}`;
  if (ARMOR.includes(it.type)) h += `<br><span class="muted">${SETS[it.cls || p.cls].armor.name}: 4 Teile im selben Grad geben einen Bonus</span>`;
  if (it.acc) h += `<br><span class="muted">Kollektion ${SETS[it.cls].acc.name}: alle 6 Accessoires im selben Grad geben einen Bonus</span>`;
  if (it.hp) h += `<br>Stellt ${it.hp} Leben her`; if (it.mp) h += `<br>Stellt ${it.mp} Mana her`;
  if (it.speed) h += `<br>Fluggeschwindigkeit: ${it.speed}`;
  if (it.cls) h += `<br>Klasse: ${CLASSES[it.cls].name}`; if (it.lvl > 1) h += `<br>Ab Stufe ${it.lvl}`;
  if (it.desc) h += `<br><i>${it.desc}</i>`;
  return h + `<br><span class="muted">Verkaufswert: ${sellPrice(id, r).toLocaleString('de-DE')} Taler</span>`;
}
const sellPrice = (id, r) => ITEMS[id].type === 'misc' ? ITEMS[id].price : Math.round(ITEMS[id].price * 0.4 * (isGear(id) ? RAR[r || 0].sell : 1));
// Beste zur Klasse passende Waffe/Rüstung bis zu einer Stufe
function gearFor(type, lvl) { let best = null; for (const id in ITEMS) { const it = ITEMS[id]; if (it.type === type && !it.fr && !it.old && (!it.cls || it.cls === p.cls) && it.lvl <= lvl && (!best || it.lvl > ITEMS[best].lvl || (it.lvl === ITEMS[best].lvl && it.cls))) best = id; } return best; }
function rollRarity(boss) { if (boss) return Math.random() < 0.25 ? 4 : Math.random() < 0.5 ? 3 : 2; let t = Math.random() * 100; for (let i = 0; i < RAR.length; i++) { t -= RAR[i].w; if (t <= 0) return i; } return 0; }
const tipEl = $('#tip');
document.addEventListener('pointermove', e => {
  const t = e.target.closest ? e.target.closest('[data-tip]') : null;
  if (!t || e.pointerType === 'touch') { tipEl.classList.add('hidden'); return; }
  tipEl.innerHTML = t.dataset.tip; tipEl.classList.remove('hidden');
  tipEl.style.left = Math.min(e.clientX + 14, window.innerWidth - 250) + 'px'; tipEl.style.top = Math.max(8, e.clientY - tipEl.offsetHeight - 10) + 'px';
});

/* ---------- Inventar ---------- */
const stackable = id => !isGear(id) && ITEMS[id].type !== 'board';
const countItem = id => p.inv.reduce((a, s) => a + (s.id === id ? s.n : 0), 0);
function addItem(id, n = 1, plus = 0, r = 0) {
  if (stackable(id)) { const s = p.inv.find(s => s.id === id); if (s) { s.n += n; renderInv(); return true; } }
  if (p.inv.length >= 36) { log('Dein Inventar ist voll!', 'r'); return false; }
  if (stackable(id)) p.inv.push({ id, n }); else for (let i = 0; i < n; i++) p.inv.push({ id, n: 1, plus, r });
  renderInv(); return true;
}
function removeItem(id, n = 1) { for (let i = p.inv.length - 1; i >= 0 && n > 0; i--) { const s = p.inv[i]; if (s.id !== id) continue; const k = Math.min(n, s.n); s.n -= k; n -= k; if (s.n <= 0) p.inv.splice(i, 1); } renderInv(); }
function useSlot(i) {
  const s = p.inv[i]; if (!s || p.dead) return; const it = ITEMS[s.id];
  if (shopOpen) { const n = it.type === 'misc' ? s.n : 1, g = sellPrice(s.id, s.r) * n; p.gold += g; s.n -= n; if (s.n <= 0) p.inv.splice(i, 1); log(`Verkauft: ${it.name}${n > 1 ? ' x' + n : ''} (+${g} Taler)`, 'g'); beep(880, 0.06); renderInv(); if (curNpc) openNpc(curNpc); return; }
  if (it.type === 'use') return usePotion(s.id);
  if (it.type === 'misc') return log(`${it.name}: Kann beim Händler verkauft werden.`);
  if ((it.lvl || 1) > p.lvl) return log(`Du brauchst Stufe ${it.lvl} für ${it.name}.`, 'r');
  if (it.cls && it.cls !== p.cls) return log(`Nur für ${CLASSES[it.cls].name}.`, 'r');
  let slot = it.type; if (slot === 'ring' || slot === 'ear') slot = !p.equip[slot + '1'] ? slot + '1' : !p.equip[slot + '2'] ? slot + '2' : slot + '1';
  const old = p.equip[slot]; p.equip[slot] = { id: s.id, plus: s.plus || 0, r: s.r || 0 }; p.inv.splice(i, 1);
  if (old) p.inv.push({ id: old.id, n: 1, plus: old.plus || 0, r: old.r || 0 });
  log(`Ausgerüstet: ${it.name}`, 'p'); beep(520, 0.07, 'triangle'); refreshModel(); renderInv(); renderChar(); buildHotbar();
}
function usePotion(id) {
  if (p.dead || p.potT > 0 || !countItem(id)) return; const it = ITEMS[id];
  if (it.lvl && it.lvl > p.lvl) return log(`Du brauchst Stufe ${it.lvl} für ${it.name}.`, 'r');
  if (it.hp) { if (p.hp >= maxHP()) return; p.hp = Math.min(maxHP(), p.hp + it.hp); floatText('+' + it.hp, p.x, p.y + 3.4, p.z, 'heal'); }
  if (it.mp) { if (p.mp >= maxMP()) return; p.mp = Math.min(maxMP(), p.mp + it.mp); floatText('+' + it.mp + ' MP', p.x, p.y + 3.4, p.z, 'exp'); }
  p.potT = 1.2; removeItem(id, 1); beep(660, 0.1, 'sine', 0.05, 200);
}
const bestPot = k => ['hp4', 'hp3', 'hp2', 'hp1', 'apfel', 'mp4', 'mp3', 'mp2', 'mp1'].find(id => ITEMS[id][k] && countItem(id) && (ITEMS[id].lvl || 1) <= p.lvl);

const rarStyle = s => isGear(s.id) ? `border-color:${RAR[s.r || 0].col};box-shadow:inset 0 0 9px ${RAR[s.r || 0].col}` : '';
function renderInv() {
  const b = $('#invBody'); if (!b || $('#winInv').classList.contains('hidden')) return;
  const eq = (slot, cap) => { const e = p.equip[slot]; return `<div><div class="cell" data-eq="${slot}" ${e ? `data-tip="${esc(itemTip(e.id, e.plus, e.r))}" style="${rarStyle(e)}"` : ''}>${e ? ITEMS[e.id].icon : ''}${e && e.plus ? `<span class="pl">+${e.plus}</span>` : ''}</div><div class="cap">${cap}</div></div>`; };
  const col = slots => slots.map(k => eq(k, SLOTN[k])).join('');
  let h = `<div class="eqwrap"><div class="eqcol">${col(['weapon', 'board'])}</div><div class="eqmid"><div class="eqacc">${col(ACC)}</div>${setLines()}</div><div class="eqcol">${col(ARMOR)}</div></div>`;
  h += `<div class="muted" style="margin-bottom:6px">${shopOpen ? '🛒 Laden offen: Klick = <b>verkaufen</b>' : 'Klick = benutzen / ausrüsten'}</div><div class="grid">`;
  for (let i = 0; i < 36; i++) { const s = p.inv[i]; h += s ? `<div class="cell" data-i="${i}" data-tip="${esc(itemTip(s.id, s.plus, s.r))}" style="${rarStyle(s)}">${ITEMS[s.id].icon}${s.n > 1 ? `<span class="n">${s.n}</span>` : ''}${s.plus ? `<span class="pl">+${s.plus}</span>` : ''}</div>` : '<div class="cell"></div>'; }
  b.innerHTML = h + `</div><div class="row" style="margin-top:8px"><span>💰 ${p.gold.toLocaleString('de-DE')} Taler</span><span class="muted">${p.inv.length}/36</span></div>`;
}
$('#invBody').addEventListener('click', e => {
  const c = e.target.closest('.cell'); if (!c) return;
  if (c.dataset.i !== undefined) useSlot(+c.dataset.i);
  else if (c.dataset.eq && p.equip[c.dataset.eq] && !shopOpen) { const s = c.dataset.eq, e2 = p.equip[s]; if (p.inv.length >= 36) return log('Dein Inventar ist voll!', 'r'); if (s === 'board' && p.flying) return log('Lande zuerst.', 'r'); p.inv.push({ id: e2.id, n: 1, plus: e2.plus || 0, r: e2.r || 0 }); p.equip[s] = null; refreshModel(); renderInv(); renderChar(); buildHotbar(); }
});

/* ---------- Charakterfenster ---------- */
function renderChar() {
  const b = $('#charBody'); if ($('#winChar').classList.contains('hidden')) return;
  const SN = { str: 'STR (Stärke)', sta: 'STA (Ausdauer)', dex: 'DEX (Geschick)', int: 'INT (Intelligenz)' };
  const ST = { str: 'Erhöht den Angriff von Wanderern und Klingenkämpfern.', sta: 'Mehr Leben und Verteidigung.', dex: 'Angriffstempo und kritische Treffer. Hauptwert der Waldläufer.', int: 'Mehr Mana. Hauptwert von Arkanisten und Klerikern.' };
  let h = `<div class="row"><b>${esc(p.name)}</b><span>${clsName()} · Stufe ${p.lvl}</span></div><h4>Attribute ${p.sp ? `<span style="color:#7dffb0">(${p.sp} Punkte frei)</span>` : ''}</h4>`;
  for (const k in SN) h += `<div class="row" data-tip="${ST[k]}"><span>${SN[k]}${cls().stat === k ? ' ★' : ''}</span><span>${p.stats[k]} ${p.sp ? `<button data-st="${k}">+</button>` : ''}</span></div>`;
  h += `${setLines()}<h4>Kampfwerte</h4><div class="row"><span>Angriff</span><span>${Math.round(atkPower())}</span></div><div class="row"><span>Verteidigung</span><span>${Math.round(defense())}</span></div><div class="row"><span>Kritische Treffer</span><span>${Math.round(critChance() * 100)} %</span></div><div class="row"><span>Angriffe pro Sekunde</span><span>${(1 / atkInterval()).toFixed(2)}</span></div><h4>Fertigkeiten</h4>`;
  for (const k of mySkills()) { const s = SKILLS[k], ok = p.lvl >= s.lvl; h += `<div class="row" style="${ok ? '' : 'opacity:.5'}"><span>${s.icon} <b>${s.name}</b><br><span class="muted">${s.desc} · ${s.mp} MP</span></span><span>${ok ? '✔' : 'St. ' + s.lvl}</span></div>`; }
  if (p.cls === 'wanderer') h += `<div class="muted" style="margin-top:6px">Ab Stufe 10 kannst du bei Meisterin Kaela eine Klasse wählen.</div>`;
  else if (!p.spec) h += `<div class="muted" style="margin-top:6px">Ab Stufe 60 bietet dir Meisterin Kaela eine zweite Klassenstufe mit drei neuen Fertigkeiten.</div>`;
  b.innerHTML = h;
}
$('#charBody').addEventListener('click', e => { const k = e.target.dataset.st; if (!k || p.sp <= 0) return; const n = e.shiftKey ? Math.min(5, p.sp) : 1; p.stats[k] += n; p.sp -= n; renderChar(); });

/* ---------- Quests ---------- */
const curQuest = () => QUESTS[p.q.i];
const questProg = () => { const q = curQuest(); return !q || !p.q.on ? 0 : q.collect ? Math.min(q.n, countItem(q.collect)) : p.q.prog; };
const questDone = () => { const q = curQuest(); return q && p.q.on && questProg() >= q.n; };
function questGoal(q) { return q.kill ? `Besiege ${q.n}× ${MOBS[q.kill].name}` : `Sammle ${q.n}× ${ITEMS[q.collect].name}`; }
const rewardItem = i => i[0] === 'W' || i[0] === 'A' ? gearFor(i[0] === 'W' ? 'weapon' : 'armor', Math.max(p.lvl, 1)) : i[0];
function rewardText(q) { return `${q.exp.toLocaleString('de-DE')} EP, ${q.gold.toLocaleString('de-DE')} Taler` + q.items.map(i => { const id = rewardItem(i); return `, ${i[1] > 1 ? i[1] + '× ' : ''}${isGear(id) ? gearName(id, i[2]) + ` <span style="color:${RAR[i[2] || 0].col}">(${RAR[i[2] || 0].name})</span>` : ITEMS[id].name}`; }).join(''); }
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
function upgradeInfo(slot) { const e = p.equip[slot]; if (!e) return null; const pl = e.plus || 0; return { e, pl, cost: Math.round(ITEMS[e.id].price * 0.12 * (pl + 1)) + 50, chance: UPCHANCE[pl] || 0, stones: 1 + Math.floor(pl / 3), scrolls: pl >= 7 ? 2 : pl >= 3 ? 1 : 0 }; }
const portals = [];
function buildDungeons() {
  const mk = (x, y, z, col, name, sub, o) => { const g = GFX.portal(col); g.position.set(x, y, z); g.rotation.y = o.ry || 0; const q = Object.assign({ portal: true, x, y, z, name, role: sub }, o); q.pick = addPick(g, 2.6, 4.6, 5.4, q, 'npc'); const l = document.createElement('div'); l.className = 'lbl'; l.innerHTML = `${name}<small>${sub}</small>`; $('#labels').appendChild(l); q.lbl = l; portals.push(q); return q; };
  DUN.forEach((d, i) => {
    d.gates = GFX.dungeon(d); d.locks = []; const a = 0.98 + i * Math.PI / 2, x = Math.cos(a) * 58, z = Math.sin(a) * 58; d.px = x; d.pz = z;
    mk(x, terrainH(x, z), z, d.glow, d.name, `Dungeon · Stufe ${d.lvl}–${d.max}`, { enter: d, ry: Math.atan2(-x, -z) });
    const r0 = d.rooms[0], rb = d.rooms[4]; mk(r0.x, d.y, r0.z - 9, 0x9ff0ff, 'Ausgang', 'zurück nach Luminhafen', { exit: d }); mk(rb.x, d.y, rb.z + 27, 0x9ff0ff, 'Ausgang', 'zurück nach Luminhafen', { exit: d });
    d.mobs.forEach((id, k) => { const r = d.rooms[k + 1]; for (let n = 0; n < 6; n++) spawnMob(id, { x: r.x, z: r.z, r: r.r - 3, y: d.y, isl: true, dun: d, ri: k + 1 }); });
    spawnMob(d.boss, { x: rb.x, z: rb.z, r: rb.r - 3, y: d.y, isl: true, dun: d, ri: 4 });
  });
}
function usePortal(q) {
  if (q.enter) { const d = q.enter; if (p.lvl < d.lvl) return log(`${d.name}: Du brauchst mindestens Stufe ${d.lvl}.`, 'r'); p.dun = d; p.flying = false; p.x = d.rooms[0].x; p.z = d.rooms[0].z + 3; p.y = d.y; p.rot = 0; cam.yaw = Math.PI; GFX.setMood(d.mood); log(`Du betrittst: ${d.name}. Am Ende wartet ${MOBS[d.boss].name}.`, 'g'); }
  else { const d = q.exit; p.dun = null; p.x = d.px * 0.86; p.z = d.pz * 0.86; p.y = terrainH(p.x, p.z); GFX.setMood(null); for (const m of mobs) if (m.state === 'chase') m.state = 'return'; }
  p.vy = 0; p.moveTo = null; p.attacking = false; setTarget(null); ring(p.x, p.y, p.z, 0x9ff0ff, 6); beep(520, 0.4, 'sine', 0.06, 400); zoneName = ''; hudT = 0; save();
}
function openNpc(n) {
  if (n.portal) return usePortal(n);
  curNpc = n; shopOpen = n.id === 'tessa' || n.id === 'ivo'; $('#npcTitle').textContent = `${n.name} – ${n.role}`; let h = '';
  if (n.id === 'mira') {
    const q = curQuest();
    if (!q) h = 'Du hast alles vollbracht, was ich mir je erträumt habe. Wolkenreich ist sicher – dank dir!';
    else if (!p.q.on) h = p.lvl < q.lvl ? `Ich habe bald wieder eine Aufgabe für dich. Komm zurück, wenn du <b>Stufe ${q.lvl}</b> erreicht hast.` : `<h4>${q.name}</h4>${q.text}<h4>Ziel</h4>${questGoal(q)}<h4>Belohnung</h4>${rewardText(q)}<div class="npcbtns"><button data-act="accept">Quest annehmen</button></div>`;
    else if (questDone()) h = `<h4>${q.name}</h4>Wunderbar! Du hast es geschafft. Hier ist deine Belohnung:<br><b>${rewardText(q)}</b><div class="npcbtns"><button data-act="finish">Quest abschließen</button></div>`;
    else h = `<h4>${q.name}</h4>${q.text}<h4>Fortschritt</h4>${questGoal(q)}: <b>${questProg()} / ${q.n}</b>`;
  } else if (n.id === 'tessa') {
    const ids = Object.keys(ITEMS).filter(id => { const it = ITEMS[id]; return it.type === 'use' || (isGear(id) && !it.fr && !it.acc && !it.old && (!it.cls || it.cls === p.cls) && it.lvl <= p.lvl + 9 && it.lvl >= p.lvl - 16); });
    h = `Willkommen! Sieh dich um. <span class="muted">(Zum Verkaufen im Inventar auf einen Gegenstand klicken.)</span><div style="margin-top:8px">${shopHtml(ids)}</div>`;
  } else if (n.id === 'ivo') {
    h = `Der Himmel ruft! Rüste ein Flugbrett aus und drücke <b>F</b>, um abzuheben. <b>Leertaste</b> steigt, <b>X</b> sinkt. Die Himmelsinseln liegen im Südosten.<div style="margin-top:8px">${shopHtml(['brett1', 'brett2'])}</div>`;
  } else if (n.id === 'borin') {
    h = `Ich verbessere Waffen, Rüstung und Accessoires bis <b>+10</b> – jede Stufe bringt <b>+8 %</b> auf die Werte. Ich brauche Sternsplitter 💎 (du hast <b>${countItem('splitter')}</b>) und Taler, ab <b>+4</b> zusätzlich Verbesserungsrollen 📜 (du hast <b>${countItem('rolle')}</b>). Beides findest du bei Monstern. Je höher die Stufe, desto öfter misslingt es – dann sind nur die Materialien weg.<div class="muted" style="margin:6px 0">Chancen: ${UPCHANCE.map((c, i) => `+${i + 1}: ${Math.round(c * 100)} %`).join(' · ')}</div>`;
    let any = false;
    for (const slot of WEAR) { const u = upgradeInfo(slot); if (!u) continue; any = true; const ok = p.gold >= u.cost && countItem('splitter') >= u.stones && countItem('rolle') >= u.scrolls; h += `<div class="shoprow"><span class="ic">${ITEMS[u.e.id].icon}</span><span class="nm">${gearName(u.e.id, u.e.r, u.pl)}${u.pl < 10 ? `<small>→ +${u.pl + 1} · Chance <b>${Math.round(u.chance * 100)} %</b> · ${u.stones} 💎${u.scrolls ? ' + ' + u.scrolls + ' 📜' : ''} + ${u.cost.toLocaleString('de-DE')} Taler</small>` : '<small>Maximal verbessert</small>'}</span>${u.pl < 10 ? `<button data-up="${slot}" ${ok ? '' : 'disabled'}>Verbessern</button>` : ''}</div>`; }
    if (!any) h += '<div class="muted">Du trägst nichts, das ich verbessern könnte.</div>';
  } else if (n.id === 'kaela') {
    const reset = `<br><br>Für ${(p.lvl * 60).toLocaleString('de-DE')} Taler setze ich deine Attributpunkte zurück.<div class="npcbtns"><button data-act="reset" ${p.gold < p.lvl * 60 ? 'disabled' : ''}>Attribute zurücksetzen</button></div>`;
    if (p.cls === 'wanderer') {
      if (p.lvl < 10) h = `Du hast Talent, Wanderer. Komm zu mir, wenn du <b>Stufe 10</b> erreicht hast – dann wähle deine Berufung.`;
      else { h = 'Es ist so weit. Wähle deinen Weg – die Entscheidung ist endgültig:'; for (const k in CLASSES) if (k !== 'wanderer') h += `<div class="shoprow"><span class="nm"><b>${CLASSES[k].name}</b><small>${CLASSES[k].desc}</small></span><button data-cls="${k}">Wählen</button></div>`; }
    } else if (!p.spec && p.lvl >= 60) {
      h = `Du bist über dich hinausgewachsen, ${cls().name}. Es ist Zeit für deine <b>zweite Berufung</b>. Du behältst alle bisherigen Fertigkeiten und lernst mit Stufe 60, 70 und 85 drei neue. Wähle weise – die Entscheidung ist endgültig:`;
      for (const k in SPECS) if (SPECS[k].base === p.cls) h += `<div class="shoprow"><span class="nm"><b>${SPECS[k].name}</b><small>${SPECS[k].desc}<br>${Object.values(SKILLS).filter(q => q.cls === k).map(q => q.icon + ' ' + q.name).join(' · ')}</small></span><button data-spec="${k}">Wählen</button></div>`;
    } else if (!p.spec) h = `Du gehst den Weg des <b>${cls().name}</b>. Mit Stufe 14 und 20 lernst du neue Fertigkeiten – und mit <b>Stufe 60</b> erwartet dich bei mir eine zweite Berufung.` + reset;
    else h = `<b>${clsName()}</b> – ein Name, den man in ganz Wolkenreich kennt. Deine letzten Fertigkeiten lernst du mit Stufe 70 und 85.` + reset;
  }
  $('#npcBody').innerHTML = h; showWin('winNpc', true); if (shopOpen) showWin('winInv', true); renderInv();
}
$('#npcBody').addEventListener('click', e => {
  const d = e.target.dataset; if (e.target.tagName !== 'BUTTON') return;
  if (d.act === 'accept') { p.q.on = true; p.q.prog = 0; log(`Quest angenommen: ${curQuest().name}`, 'g'); beep(660, 0.12, 'triangle'); }
  else if (d.act === 'finish' && questDone()) {
    const q = curQuest(); if (p.inv.length + q.items.length > 36) return log('Dein Inventar ist zu voll für die Belohnung!', 'r');
    if (q.collect) removeItem(q.collect, q.n); p.gold += q.gold; q.items.forEach(i => addItem(rewardItem(i), i[1], 0, i[2] || 0));
    p.q = { i: p.q.i + 1, on: false, prog: 0 }; log(`Quest abgeschlossen: ${q.name}`, 'g'); center('Quest abgeschlossen!', q.name); beep(784, 0.25, 'triangle', 0.06, 400); gainExp(q.exp);
  } else if (d.buy) { const it = ITEMS[d.buy]; if (p.gold >= it.price && addItem(d.buy, 1)) { p.gold -= it.price; log(`Gekauft: ${it.name}`, 'g'); beep(880, 0.06); } }
  else if (d.up) {
    const u = upgradeInfo(d.up); if (!u || u.pl >= 10 || p.gold < u.cost || countItem('splitter') < u.stones || countItem('rolle') < u.scrolls) return;
    p.gold -= u.cost; removeItem('splitter', u.stones); if (u.scrolls) removeItem('rolle', u.scrolls);
    if (Math.random() < u.chance) { u.e.plus = u.pl + 1; log(`Erfolg! ${ITEMS[u.e.id].name} ist jetzt +${u.e.plus}.`, 'p'); beep(700, 0.3, 'triangle', 0.06, 600); ring(p.x, p.y + 0.2, p.z, 0xffe07a, 4); }
    else { log(`Die Verbesserung auf +${u.pl + 1} ist misslungen (Chance ${Math.round(u.chance * 100)} %).`, 'r'); beep(160, 0.3, 'sawtooth', 0.05, -80); }
    refreshModel(); renderChar();
  } else if (d.cls) {
    p.cls = d.cls; const w = 'w_' + d.cls + '0'; if (p.equip.weapon) p.inv.push({ id: p.equip.weapon.id, n: 1, plus: p.equip.weapon.plus || 0, r: p.equip.weapon.r || 0 }); p.equip.weapon = { id: w, plus: 0, r: 1 };
    p.hp = maxHP(); p.mp = maxMP(); center(cls().name + '!', 'Du hast deine Berufung gefunden.'); log(`Du bist jetzt ${cls().name} und erhältst: ${ITEMS[w].name}`, 'p');
    levelFx(); refreshModel(); buildHotbar(); renderChar();
  } else if (d.spec && !p.spec && p.lvl >= 60 && SPECS[d.spec].base === p.cls) {
    p.spec = d.spec; p.hp = maxHP(); p.mp = maxMP(); center(clsName() + '!', 'Deine zweite Berufung.'); log(`Du bist jetzt ${clsName()}!`, 'p');
    for (const k of mySkills()) if (SKILLS[k].cls === p.spec && SKILLS[k].lvl <= p.lvl) log(`Neue Fertigkeit gelernt: ${SKILLS[k].name}!`, 'p');
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
Monster mit <b style="color:#ff6a5a">rotem Namen</b> greifen von selbst an. <b>Klick auf Monster</b> wählt es aus, <b>zweiter Klick</b> oder <kbd>1</kbd> greift an · <kbd>Tab</kbd> nächstes Ziel<br>
<kbd>2</kbd>–<kbd>8</kbd> Fertigkeiten · <kbd>9</kbd> Heiltrank · <kbd>0</kbd> Manatrank<br>
<kbd>F</kbd> fliegen (Flugbrett nötig) – <kbd>Leertaste</kbd> steigen, <kbd>X</kbd> sinken<br>
<kbd>C</kbd> Charakter · <kbd>I</kbd> Inventar · <kbd>L</kbd> Quests · <kbd>H</kbd> Hilfe · <kbd>Esc</kbd> schließen<br>
<b>Klick auf Dorfbewohner</b> zum Reden. Die vier <b>Dungeon-Portale</b> stehen rund ums Dorf (hellblaue Punkte auf der Karte). Der Spielstand wird automatisch gespeichert.<br>
<span class="gfxrow">Grafik: <button data-q="hoch">Hoch</button> <button data-q="mittel">Mittel</button> <button data-q="niedrig">Niedrig</button></span>`;
document.querySelectorAll('.helpBody').forEach(e => e.innerHTML = HELP);
const markQ = () => document.querySelectorAll('[data-q]').forEach(b => { b.style.outline = b.dataset.q === GFX.quality ? '2px solid #fff' : 'none'; });
document.addEventListener('click', e => { const q = e.target.dataset && e.target.dataset.q; if (q) { GFX.auto = false; GFX.setQuality(q); markQ(); } });
GFX.onQuality = q => { markQ(); log(`Grafikqualität automatisch auf „${q}“ gesenkt (änderbar unter Hilfe).`, 'e'); };
markQ();

/* ---------- Hotbar ---------- */
let slots = [];
function buildHotbar() {
  const sk = mySkills(); slots = [{ key: '1', icon: p.equip.weapon ? ITEMS[p.equip.weapon.id].icon : '👊', tip: '<b>Angriff</b><br>Greift das gewählte Ziel an.', act: startAttack }];
  sk.slice(0, 7).forEach((k, i) => slots.push({ key: String(i + 2), skill: k, icon: SKILLS[k].icon, tip: `<b>${SKILLS[k].name}</b><br>${SKILLS[k].desc}<br>${SKILLS[k].mp} MP · Abklingzeit ${SKILLS[k].cd} s${p.lvl < SKILLS[k].lvl ? `<br><span style="color:#ff9a9a">Ab Stufe ${SKILLS[k].lvl}</span>` : ''}`, act: () => castSkill(k) }));
  slots.push({ key: '9', pot: 'hp', icon: '🧪', tip: '<b>Heiltrank</b><br>Benutzt deinen besten Heilgegenstand.', act: () => { const id = bestPot('hp'); id ? usePotion(id) : log('Keine Heiltränke mehr!', 'r'); } });
  slots.push({ key: '0', pot: 'mp', icon: '💧', tip: '<b>Manatrank</b><br>Benutzt deinen besten Manatrank.', act: () => { const id = bestPot('mp'); id ? usePotion(id) : log('Keine Manatränke mehr!', 'r'); } });
  slots.push({ key: 'F', fly: true, icon: '🛹', tip: '<b>Fliegen</b> (F)<br>Hebt mit dem Flugbrett ab oder landet.', act: toggleFly });
  const hb = $('#hotbar'); hb.innerHTML = '';
  slots.forEach((s, i) => { const d = document.createElement('div'); d.className = 'slot'; d.dataset.tip = s.tip; d.innerHTML = `<span class="k">${s.key}</span><span class="ic">${s.icon}</span><span class="n"></span><span class="cd"></span>`; d.addEventListener('click', () => { if (started) s.act(); }); hb.appendChild(d); s.el = d; s.cdEl = d.querySelector('.cd'); s.nEl = d.querySelector('.n'); s.icEl = d.querySelector('.ic'); });
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
function levelFx() { fx.levelUp(p); beep(523, 0.12, 'triangle', 0.06); setTimeout(() => beep(659, 0.12, 'triangle', 0.06), 110); setTimeout(() => beep(784, 0.3, 'triangle', 0.06), 220); }
const tmpV = new THREE.Vector3();
function shoot(target, color, onHit, kind) { const m = GFX.projectile(kind, color); p.model.handPos(tmpV); m.position.copy(tmpV); m.lookAt(target.x, mobCenterY(target), target.z); projs.push({ m, target, onHit, color }); }

/* ---------- Kampf: Spieler ---------- */
const mobCenterY = m => m.y + (FLOATERS[m.def.model] ? 1.2 : 0) + 1.1 * m.def.scale;
function calcDmg(mult, m) { let d = atkPower() * mult * rnd(0.9, 1.1); const crit = Math.random() < critChance(); if (crit) d *= 1.6; return { d: Math.max(1, Math.round(d - m.def.def * 0.5)), crit }; }
function hitMob(m, mult, o = {}) {
  if (m.dead) return; const r = calcDmg(mult, m); m.hp -= r.d; m.hitT = 0.15; p.combatT = 6;
  floatText(r.d + (r.crit ? '!' : ''), m.x, mobCenterY(m) + 1.2 * m.def.scale, m.z, r.crit ? 'crit' : ''); fx.hit(m.x, mobCenterY(m), m.z, o.color || 0xffffff, Math.min(2.2, m.def.scale));
  beep(r.crit ? 320 : 220, 0.06, 'square', 0.035, -90);
  const lc = wBonus('leech', 0); if (lc && !p.dead) p.hp = Math.min(maxHP(), p.hp + r.d * lc);
  if (o.stun) m.stun = o.stun; if (o.slow) m.slow = o.slow;
  if (m.state !== 'chase') m.state = 'chase';
  if (m.hp <= 0) killMob(m);
}
function deliver(m, mult, o = {}) {
  if (cls().range > 5) later(0.2, () => { if (!m.dead && !p.dead) shoot(m, o.proj || cls().proj, () => hitMob(m, mult, o), p.cls === 'waldlaeufer' ? 'arrow' : 'orb'); });
  else later(0.15, () => { if (p.dead) return; fx.slash(p, p.rot, o.color || 0xffffff, o.big ? 1.5 : 1); hitMob(m, mult, o); });
}
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
  p.mp -= s.mp; p.cds[k] = s.cd; p.atkT = Math.max(p.atkT, 0.6); beep(440, 0.14, 'sawtooth', 0.04, 300); p.model.play(s.fx === 'spin' ? 'spin' : 'skill');
  const t = p.target, col = s.col || s.proj || (s.slow ? 0x9fe8ff : 0xffb04a);
  const strike = (m, o) => { if (s.leech) { const h = Math.round(maxHP() * s.leech); p.hp = Math.min(maxHP(), p.hp + h); floatText('+' + h, p.x, p.y + 3.4, p.z, 'heal'); } hitMob(m, s.mult, o); };
  if (s.type === 'dmg') {
    p.attacking = true;
    if (s.fx === 'bolt') later(0.2, () => { if (t.dead) return; fx.bolt(t.x, t.y, t.z, col); beep(90, 0.3, 'sawtooth', 0.06, -40); strike(t, { stun: s.stun, color: 0xffffff }); });
    else if (s.fx === 'beam') later(0.2, () => { if (t.dead) return; fx.beam(t.x, t.y, t.z, col); strike(t, { stun: s.stun, color: col }); });
    else if (s.fx === 'double') { deliver(t, s.mult / 2, { color: 0xffe08a }); later(0.14, () => deliver(t, s.mult / 2, { color: 0xffe08a })); }
    else if (s.leech) later(0.2, () => { if (!t.dead && !p.dead) shoot(t, col, () => strike(t, { color: col }), 'orb'); });
    else deliver(t, s.mult, { stun: s.stun, proj: s.proj, color: col, big: true });
  } else if (s.type === 'aoe') {
    const c = s.center === 'self' ? p : t, cx = c.x, cy = c.y, cz = c.z;
    later(0.18, () => {
      ring(cx, cy, cz, col, s.radius * 1.3, 0.6);
      if (s.fx === 'shards') fx.shards(cx, cy, cz, s.radius); else if (s.fx === 'rain') fx.rain(cx, cy, cz, s.radius, col); else if (s.fx === 'beam') { fx.beam(cx, cy, cz, col); fx.rune(cx, cy, cz, col, s.radius * 1.6, 1); } else if (s.fx === 'spin') { fx.slash(p, p.rot, col, 1.8); fx.slash(p, p.rot + Math.PI, col, 1.8); } else fx.rune(cx, cy, cz, col, s.radius * 1.6, 1);
      for (const m of mobs) if (!m.dead && Math.hypot(m.x - cx, m.z - cz) <= s.radius + m.def.scale * 0.5 && Math.abs(m.y - cy) < 8) { if (s.fx === 'bolt') fx.bolt(m.x, m.y, m.z, col); hitMob(m, s.mult, { slow: s.slow, stun: s.stun, color: col }); }
    });
  } else if (s.type === 'buff') { p.buffs = p.buffs.filter(b => b.id !== k); p.buffs.push({ id: k, icon: s.icon, name: s.name, t: s.dur, m: s.buff }); ring(p.x, p.y, p.z, s.col || 0x7dffb0, 5); fx.rune(p.x, p.y, p.z, s.col || 0x9fffb0, 6.5, 1.2); fx.heal(p, s.col || 0x9fe8ff); log(`${s.name} aktiv.`, 'p'); renderChar(); }
  else if (s.type === 'heal') { const h = Math.round(maxHP() * s.heal + p.stats.int * 3); p.hp = Math.min(maxHP(), p.hp + h); floatText('+' + h, p.x, p.y + 3.4, p.z, 'heal'); fx.heal(p); }
}
function gainExp(n) {
  if (p.lvl >= MAXLVL) return; p.exp += n; floatText(`+${n.toLocaleString('de-DE')} EP`, p.x, p.y + 4.2, p.z, 'exp');
  let up = false;
  while (p.lvl < MAXLVL && p.exp >= expNeed(p.lvl)) { p.exp -= expNeed(p.lvl); p.lvl++; p.sp += 3; up = true; for (const k of mySkills()) if (SKILLS[k].lvl === p.lvl) log(`Neue Fertigkeit gelernt: ${SKILLS[k].name}!`, 'p'); }
  if (p.lvl >= MAXLVL) p.exp = 0;
  if (up) { p.hp = maxHP(); p.mp = maxMP(); levelFx(); center(`Stufe ${p.lvl}!`, '+3 Attributpunkte (C)'); log(`Stufenaufstieg! Du bist jetzt Stufe ${p.lvl}.`, 'g'); if (p.lvl === 10 && p.cls === 'wanderer') log('Meisterin Kaela im Dorf kann dir jetzt eine Klasse geben!', 'g'); if (p.lvl >= 60 && !p.spec && p.cls !== 'wanderer') log('Stufe 60! Meisterin Kaela bietet dir eine zweite Klassenstufe an.', 'g'); buildHotbar(); renderChar(); renderQuests(); save(); }
}
function killMob(m) {
  m.dead = true; m.g.visible = false; m.respawn = m.def.boss ? 150 : m.def.elite ? rnd(160, 200) : rnd(9, 14); if (p.target === m) setTarget(null);
  fx.kill(m.x, mobCenterY(m), m.z, m.def.color, Math.min(2.6, m.def.scale)); beep(140, 0.18, 'sawtooth', 0.05, -80);
  const diff = p.lvl - m.def.lvl; gainExp(Math.max(1, Math.round(m.def.exp * clamp(1 - (diff - 3) * 0.15, 0.1, 1))));
  dropLoot(m, { gold: rint(m.def.gold[0], m.def.gold[1]) });
  if (Math.random() < (m.def.boss ? 1 : 0.45)) dropLoot(m, { item: m.def.drop });
  if (Math.random() < (m.def.boss ? 1 : (0.04 + m.def.lvl * 0.002) * (m.def.elite ? 2.5 : 1))) dropLoot(m, { item: 'splitter', n: m.def.boss ? 4 : 1 });
  if (Math.random() < (m.def.boss ? 1 : (0.012 + m.def.lvl * 0.0008) * (m.def.elite ? 3 : 1))) dropLoot(m, { item: 'rolle', n: m.def.boss ? 2 : 1 });
  if (Math.random() < 0.08) dropLoot(m, { item: m.def.lvl >= 70 ? 'hp4' : m.def.lvl >= 40 ? 'hp3' : m.def.lvl >= 15 ? 'hp2' : 'hp1' });
  for (let i = 0, n = m.def.boss ? 3 : Math.random() < (m.def.elite ? 0.16 : 0.07) ? 1 : 0; i < n; i++) { const id = gearFor(GEAR[Math.floor(Math.random() * GEAR.length)], m.def.lvl + 2); if (id) dropLoot(m, { item: id, r: m.def.boss ? rollRarity(true) : Math.max(m.def.elite && Math.random() < 0.4 ? 1 : 0, rollRarity(false)) }); }
  // Accessoires: nur von Dungeon-Monstern und Bossen
  if (p.cls !== 'wanderer' && (m.def.boss || (m.def.elite && Math.random() < 0.08 * (WRGAME.luck || 1)))) for (let i = 0, n = m.def.boss ? 2 : 1; i < n; i++) { const tier = [80, 60, 40, 20].findIndex(L => L <= m.def.lvl), id = tier < 0 ? null : 'x_' + 'rena'[Math.floor(Math.random() * 4)] + '_' + p.cls + (3 - tier); if (id && ITEMS[id]) dropLoot(m, { item: id, r: rollRarity(m.def.boss) }); }
  // Legendäre (Boss ab Stufe 60) und blutige Waffen (Boss ab Stufe 80): extrem selten
  if (m.def.boss && p.cls !== 'wanderer') { const special = pre => { let best = null; for (const id in ITEMS) { const it = ITEMS[id]; if (id.startsWith(pre + p.cls) && it.lvl <= m.def.lvl && (!best || it.lvl > ITEMS[best].lvl)) best = id; } return best; };
    const q = Math.random() / (WRGAME.luck || 1), id = m.def.lvl >= 80 && q < 0.025 ? special('b_') : m.def.lvl >= 60 && q < 0.075 ? special('l_') : null; if (id) dropLoot(m, { item: id, r: ITEMS[id].fr }); }
  const q = curQuest(); if (q && p.q.on && q.kill === m.def.id && p.q.prog < q.n) { p.q.prog++; log(`${q.name}: ${p.q.prog} / ${q.n}`, 'e'); if (p.q.prog >= q.n) { log('Quest erfüllt! Kehre zu Mira zurück.', 'g'); beep(784, 0.2, 'triangle', 0.05); } renderQuests(); }
  if (m.def.boss) center(m.def.name + ' bezwungen!', m.def.id === 'koloss' ? 'Die Himmelsinseln sind frei.' : p.dun ? 'Das Portal hinter dem Thron führt zurück.' : 'Du bist die Legende von Wolkenreich.');
}
function dropLoot(m, o) {
  const g = GFX.loot(!!o.gold, o.r !== undefined ? RAR[o.r].hex : undefined);
  const a = rnd(0, 6.28), r = rnd(0.5, 2) * m.def.scale; loots.push(Object.assign({ g, x: m.x + Math.cos(a) * r, z: m.z + Math.sin(a) * r, y: m.y + 0.6, t: 0, n: 1 }, o));
}
function hurtPlayer(m) {
  if (p.dead) return; const a = m.def.atk * rnd(0.85, 1.15), d = Math.max(1, Math.round(a * a * 1.1 / (a * 1.1 + defense()))); p.hp -= d; p.combatT = 6;
  floatText('-' + d, p.x, p.y + 3.2, p.z, 'hurt'); beep(110, 0.08, 'sawtooth', 0.04);
  if (!p.target && !p.flying) { setTarget(m); }
  if (p.hp <= 0) die();
}
function die() {
  p.hp = 0; p.dead = true; p.flying = false; p.attacking = false; p.moveTo = null; setTarget(null);
  const loss = Math.floor(p.exp * 0.05); p.exp -= loss; center('Du wurdest besiegt', 'Du erwachst gleich im Dorf …'); log(`Du wurdest besiegt und verlierst ${loss} EP.`, 'r');
  setTimeout(() => { p.dead = false; if (p.dun) { p.dun = null; GFX.setMood(null); } p.x = 0; p.z = 16; p.y = terrainH(0, 16); p.vy = 0; p.hp = Math.round(maxHP() * 0.5); p.mp = Math.round(maxMP() * 0.5); p.buffs = []; for (const m of mobs) if (m.state === 'chase') m.state = 'return'; save(); }, 3500);
}
function toggleFly() {
  if (p.dead) return; if (p.flying) { p.flying = false; p.vy = 0; return; }
  if (p.dun) return log('In Dungeons kannst du nicht fliegen.', 'r');
  const b = p.equip.board; if (!b) return log('Du brauchst ein Flugbrett. Frag Flugmeister Ivo im Dorf!', 'r');
  p.flying = true; p.attacking = false; p.queued = null; p.y += 1.2; p.vy = 0; ring(p.x, p.y - 1, p.z, 0x9fe8ff, 5); beep(300, 0.3, 'sine', 0.05, 500);
}

/* ---------- Monster ---------- */
function spawnMob(id, home) {
  const def = MOBS[id], g = new THREE.Group(), vis = GFX.mob(def); g.add(vis.g);
  const pick = addPick(g, 1.5, 3.2, 3.8, null, 'mob'); g.scale.setScalar(def.scale); scene.add(g);
  const m = { def, g, vis, pick, home, x: 0, y: 0, z: 0, rot: rnd(0, 6.28), hp: def.hp, state: 'idle', atkT: 0, wanderT: rnd(0, 4), tx: 0, tz: 0, dead: false, respawn: 0, stun: 0, slow: 0, hitT: 0, lunge: 0, animT: rnd(0, 10), moving: false };
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
  if (m.home.dun) { if (!dunFloor(m.home.dun, nx, nz, 0.4)) return true; } else if (m.home.isl) { if (Math.hypot(nx - m.home.x, nz - m.home.z) > m.home.r - 2) return true; } else if (terrainH(nx, nz) < -2.4) return true;
  m.x = nx; m.z = nz; m.moving = true; m.rot = Math.atan2(dx, dz); if (!m.home.isl) m.y = terrainH(nx, nz); return d - st < 0.1;
}
function updateMob(m, dt) {
  if (m.dead) { m.respawn -= dt; if (m.respawn <= 0) { m.dead = false; m.g.visible = true; placeMob(m); } return; }
  const dx = p.x - m.x, dz = p.z - m.z, d = Math.hypot(dx, dz); m.g.visible = d < 240; m.moving = false; if (d > 190 && m.state === 'idle') return;
  m.animT += dt;
  const reachable = !p.dead && Math.abs(p.y - m.y) < 6, dn = m.home.dun, spd = m.def.speed * (dn ? 1.35 : 1) * (m.slow > 0 ? 0.45 : 1); if (m.slow > 0) m.slow -= dt;
  if (m.stun > 0) m.stun -= dt;
  else if (m.state === 'idle') {
    if (m.def.aggro && reachable && d < (m.def.boss ? (dn ? 18 : 30) : dn ? 11 : 13) && (!dn || p.dun === dn)) m.state = 'chase';
    else if (!m.def.boss) { m.wanderT -= dt; if (m.wanderT <= 0) { m.wanderT = rnd(3, 8); m.tx = m.sx + rnd(-7, 7); m.tz = m.sz + rnd(-7, 7); } moveMob(m, m.tx, m.tz, spd * 0.35, dt); }
  } else if (m.state === 'chase') {
    if (!reachable || (dn ? p.dun !== dn : Math.hypot(m.x - m.sx, m.z - m.sz) > 55 || d > 65)) m.state = 'return';
    else { const rng = 1.5 + m.def.scale * 0.9; if (d > rng) { const ox = m.x, oz = m.z; moveMob(m, p.x, p.z, spd, dt); if (dn && m.x === ox && m.z === oz) { const mi = dunIdx(dn, m.x, m.z), pi = dunIdx(dn, p.x, p.z), w = dn.rooms[clamp(pi > mi ? Math.floor(mi + 1) : Math.ceil(mi - 1), 0, 4)]; moveMob(m, w.x, w.z, spd, dt); } } m.rot = Math.atan2(dx, dz); m.atkT -= dt; if (d <= rng + 0.6 && m.atkT <= 0) { m.atkT = m.def.boss ? 2.2 : 1.7; m.lunge = 0.3; hurtPlayer(m); if (m.def.boss) ring(m.x, m.y, m.z, 0x9fe8ff, 12, 0.5); } }
  } else if (m.state === 'return') { m.hp = Math.min(m.def.hp, m.hp + m.def.hp * 0.3 * dt); if (moveMob(m, m.sx, m.sz, spd * 1.4, dt)) m.state = 'idle'; }
  // Animation
  if (m.hitT > 0) m.hitT -= dt; if (m.lunge > 0) m.lunge -= dt;
  m.vis.anim(m.animT, { moving: m.moving, chase: m.state === 'chase', lunge: m.lunge > 0 ? Math.sin(m.lunge / 0.3 * Math.PI) : 0 });
  const sc = m.def.scale * (m.hitT > 0 ? 1.12 : 1); m.g.scale.setScalar(sc);
  m.g.position.set(m.x, m.y, m.z); let dr = m.rot - m.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); m.g.rotation.y += dr * Math.min(1, dt * 10);
}

/* ---------- NPCs ---------- */
const NPC_LOOK = {
  mira: { look: 'kleriker', pal: { main: 0x8a5ac0, dark: 0x6a3fa0, acc: 0xffe07a }, flags: { plain: true }, hairStyle: 'bun', weapon: { wt: 'staff', tier: 1 }, eye: 0x8a5ae0 },
  tessa: { look: 'wanderer', pal: { main: 0xe08a3a, dark: 0xb86a20, acc: 0x3f8f52 }, flags: { apron: true, hat: 0xe8d8a0 }, hairStyle: 'pony', eye: 0x6a9a3a },
  borin: { look: 'wanderer', pal: { main: 0x5a5a66, acc: 0x8a5a2a, pants: 0x3a3028 }, flags: { beard: 0x2a2a2a }, hairStyle: 'short', weapon: { wt: 'hammer' }, scale: 1.16, eye: 0x6a4a2a },
  kaela: { look: 'arkanist', pal: { main: 0x2f5fc0, dark: 0x1c3a8a, acc: 0xffe07a }, flags: { plain: true }, hairStyle: 'long', weapon: { wt: 'staff', tier: 3 }, eye: 0x3a7ad6 },
  ivo: { look: 'waldlaeufer', pal: { main: 0x3fb0a0, dark: 0x2a8070 }, flags: { plain: true, cape: false }, hairStyle: 'spiky', eye: 0x3ab0a0 },
};
function buildNpcs() {
  for (const n of NPCS) {
    const h = GFX.human(Object.assign({ hair: n.hair, scale: 1.05 }, NPC_LOOK[n.id])); n.y = terrainH(n.x, n.z); n.rot = Math.atan2(-n.x, -n.z); h.g.position.set(n.x, n.y, n.z); h.g.rotation.y = n.rot; scene.add(h.g);
    n.pick = addPick(h.g, 1.6, 2.6, 3.8, n, 'npc'); n.h = h;
    const l = document.createElement('div'); l.className = 'lbl'; $('#labels').appendChild(l); n.lbl = l; npcs.push(n);
  }
}
function updateNpcs(dt) {
  for (const n of npcs) { const dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz); if (d > 140) continue; let a = started && d < 16 ? Math.atan2(dx, dz) - n.rot : 0; a = clamp(Math.atan2(Math.sin(a), Math.cos(a)), -1, 1); n.h.look += (a - n.h.look) * Math.min(1, dt * 4); n.h.update(dt, {}); }
}
function npcMark(n) { if (n.id === 'mira') { const q = curQuest(); if (q && questDone()) return '?'; if (q && !p.q.on && p.lvl >= q.lvl) return '!'; } if (n.id === 'kaela' && ((p.cls === 'wanderer' && p.lvl >= 10) || (p.cls !== 'wanderer' && !p.spec && p.lvl >= 60))) return '!'; return ''; }

/* ---------- Spieler ---------- */
function refreshModel() {
  if (p.model) scene.remove(p.model.g);
  const w = p.equip.weapon && ITEMS[p.equip.weapon.id], r = p.equip.weapon ? p.equip.weapon.r || 0 : 0;
  p.model = GFX.human({ look: p.cls, hair: p.hair, pal: p.spec ? SPECS[p.spec].pal : null, aura: p.spec ? SPECS[p.spec].pal.acc : 0, weapon: w ? { wt: w.wt, cls: w.cls, id: w.id, tier: w.cls ? Math.min(3, +w.id.slice(-1) + 1) : 0, rar: r >= 2 ? RAR[r].hex : 0 } : null });
  p.model.setBoard(p.equip.board ? (p.equip.board.id === 'brett2' ? 2 : 1) : 0); scene.add(p.model.g);
}
const selRing = GFX.selection();
function updatePlayer(dt) {
  for (const k in p.cds) if (p.cds[k] > 0) p.cds[k] -= dt;
  if (p.potT > 0) p.potT -= dt; if (p.combatT > 0) p.combatT -= dt; if (p.swing > 0) p.swing -= dt; p.atkT -= dt;
  for (let i = p.buffs.length - 1; i >= 0; i--) { p.buffs[i].t -= dt; if (p.buffs[i].t <= 0) { log(`${p.buffs[i].name} ist abgelaufen.`); p.buffs.splice(i, 1); renderChar(); } }
  if (p.dead) { p.model.g.position.set(p.x, p.y, p.z); p.model.update(dt, { dead: true }); return; }
  p.hp = Math.min(maxHP(), p.hp + maxHP() * (p.combatT > 0 ? 0.003 : 0.03) * dt); p.mp = Math.min(maxMP(), p.mp + maxMP() * (p.combatT > 0 ? 0.012 : 0.04) * dt);
  if (p.target && p.target.dead) setTarget(null);

  let mx = 0, mz = 0; const f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0), s = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  if (f || s) { p.moveTo = null; p.attacking = false; p.queued = null; p.interact = null; const sn = Math.sin(cam.yaw), cs = Math.cos(cam.yaw); mx = -sn * f + cs * s; mz = -cs * f - sn * s; }
  else if (p.attacking && p.target) {
    const t = p.target, dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz), rng = cls().range + t.def.scale * 0.8;
    if (Math.abs(t.y - p.y) > 10) { p.attacking = false; }
    else if (d > rng * 0.92) { mx = dx; mz = dz; }
    else { p.rot = Math.atan2(dx, dz); if (p.queued) { const k = p.queued; p.queued = null; castSkill(k, true); } else if (p.atkT <= 0) { p.atkT = atkInterval(); p.model.play('attack'); deliver(t, 1); } }
  } else if (p.interact) {
    const n = p.interact, dx = n.x - p.x, dz = n.z - p.z; if (Math.hypot(dx, dz) < 4.5) { p.interact = null; p.rot = Math.atan2(dx, dz); openNpc(n); } else { mx = dx; mz = dz; }
  } else if (p.moveTo) { const dx = p.moveTo.x - p.x, dz = p.moveTo.z - p.z; if (Math.hypot(dx, dz) < 0.4) p.moveTo = null; else { mx = dx; mz = dz; } }

  const ml = Math.hypot(mx, mz); let moving = false;
  if (ml > 0.01) {
    const board = p.equip.board && ITEMS[p.equip.board.id], spd = p.flying ? board.speed : 9 * mod('spd') * setB('spd', 1), st = spd * dt;
    let nx = p.x + mx / ml * st, nz = p.z + mz / ml * st; const dd = Math.hypot(nx, nz); if (dd > 470 && !p.dun) { nx *= 470 / dd; nz *= 470 / dd; }
    if (p.dun && !dunFloor(p.dun, nx, nz, 0, p.dun.locks) && dunFloor(p.dun, nx, nz) && time - lockMsg > 3) { lockMsg = time; log('Eine Barriere versperrt den Weg – besiege zuerst alle Monster in diesem Raum!', 'r'); beep(150, 0.2, 'sawtooth', 0.04); }
    const blocked = p.dun ? !dunFloor(p.dun, nx, nz, 0, p.dun.locks) : !p.flying && !islandAt(nx, nz) && terrainH(nx, nz) < WATER - 0.5 && p.y < 20;
    if (!p.flying || p.y < 14) for (const c of GFX.colliders) { const cd = Math.hypot(nx - c.x, nz - c.z); if (cd < c.r) { nx = c.x + (nx - c.x) / cd * c.r; nz = c.z + (nz - c.z) / cd * c.r; } }
    if (!blocked) { p.x = nx; p.z = nz; moving = true; } else p.moveTo = null;
    let dr = Math.atan2(mx, mz) - p.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); p.rot += dr * Math.min(1, dt * 14);
  }
  const g = groundAt(p.x, p.z, p.y);
  if (p.flying) {
    p.y += ((keys[' '] ? 1 : 0) - (keys.x ? 1 : 0)) * 16 * dt; const isl = islandAt(p.x, p.z);
    if (isl && p.y < isl.y - 1.5 && p.y > isl.y - 16) p.y = isl.y - 16;
    p.y = clamp(p.y, g + 0.9, 280);
  } else {
    p.vy -= 30 * dt; p.y += p.vy * dt;
    if (p.y <= g) { p.y = g; p.vy = 0; p.onGround = true; } else p.onGround = p.y - g < 0.3 && p.vy <= 0;
    if (keys[' '] && p.onGround && p.vy <= 0) { p.vy = 10.5; p.onGround = false; }
  }
  // Modell-Animation
  const h = p.model; h.g.position.set(p.x, p.y, p.z); h.g.rotation.y = p.rot;
  h.update(dt, { moving, flying: p.flying, air: !p.onGround && !p.flying, speed: mod('spd') });
  if (moving && !p.flying && p.onGround && Math.random() < dt * 10) fx.dust(p.x, p.y, p.z);
  const wf = p.equip.weapon && ITEMS[p.equip.weapon.id].fr; if (wf && Math.random() < dt * 16) { h.handPos(tmpV); GFX.particles().add.emit({ x: tmpV.x, y: tmpV.y + 0.6, z: tmpV.z, spread: 0.35, vy: wf === 6 ? -1.4 : 1.4, life: 0.7, size: 0.42, c: RAR[wf].hex, c2: wf === 6 ? 0x400008 : 0xffffff }); }
  if (p.flying && Math.random() < dt * 40) fx.board(p.x - Math.sin(p.rot) * 1.3, p.y - 0.1, p.z - Math.cos(p.rot) * 1.3, h.boardC);
  if (curNpc && Math.hypot(curNpc.x - p.x, curNpc.z - p.z) > 12) showWin('winNpc', false);
}

function updateLoot(dt) {
  for (let i = loots.length - 1; i >= 0; i--) {
    const l = loots[i]; l.t += dt; l.g.rotation.y += dt * 3; const dx = p.x - l.x, dz = p.z - l.z, dy = p.y + 1 - l.y, d = Math.hypot(dx, dz, dy); let gone = l.t > 90;
    if (l.t > 0.5 && d < 6 && !p.dead && !(l.wait > l.t)) {
      const st = Math.min(d, 22 * dt); l.x += dx / d * st; l.z += dz / d * st; l.y += dy / d * st;
      if (d < 1.2) {
        if (l.gold) { p.gold += l.gold; log(`+${l.gold} Taler`, 'g'); beep(1200, 0.05, 'square', 0.025); gone = true; }
        else if (addItem(l.item, l.n, 0, l.r || 0)) { log(`Erhalten: ${ITEMS[l.item].name}${l.n > 1 ? ' x' + l.n : ''}${l.r !== undefined ? ' (' + RAR[l.r].name + ')' : ''}`, l.r >= 2 ? 'g' : 'p'); if (l.r >= 3) { center(l.r >= 5 ? RAR[l.r].name + 'e Waffe!' : RAR[l.r].name + '-Fund!', ITEMS[l.item].name); if (l.r >= 5) levelFx(); beep(988, 0.3, 'triangle', 0.06, 500); } beep(900, 0.07, 'triangle', 0.04); gone = true; renderQuests(); const q = curQuest(); if (q && p.q.on && q.collect === l.item && countItem(l.item) === q.n) log('Quest erfüllt! Kehre zu Mira zurück.', 'g'); }
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
    if (d <= st + 0.5) { scene.remove(m); projs.splice(i, 1); pr.onHit(); } else { m.position.set(m.position.x + dx / d * st, m.position.y + dy / d * st, m.position.z + dz / d * st); m.lookAt(tx, ty, tz); fx.trail(m.position, pr.color); }
  }
}
/* ---------- HUD ---------- */
let hudT = 0, mapT = 0; const mobLbl = []; for (let i = 0; i < 14; i++) { const el = document.createElement('div'); el.className = 'lbl mlbl'; el.style.display = 'none'; $('#labels').appendChild(el); mobLbl.push({ el, on: false, tx: '' }); }
function updateHud(dt) {
  const mh = maxHP(), mm = maxMP();
  $('#hpfill').style.width = clamp(p.hp / mh * 100, 0, 100) + '%'; $('#hptxt').textContent = `${Math.ceil(p.hp)} / ${mh}`;
  $('#mpfill').style.width = clamp(p.mp / mm * 100, 0, 100) + '%'; $('#mptxt').textContent = `${Math.floor(p.mp)} / ${mm}`;
  const t = p.target; $('#tframe').classList.toggle('hidden', !t);
  if (t) { $('#tname').textContent = t.def.name + (t.def.boss ? ' 👑' : ''); $('#tname').style.color = t.def.aggro ? '#ff6a5a' : ''; const dl = t.def.lvl - p.lvl; $('#tlvl').textContent = 'St. ' + t.def.lvl; $('#tlvl').style.color = dl >= 4 ? '#ff6464' : dl >= 1 ? '#ffb04a' : dl > -4 ? '#ffd978' : '#9fb0d0'; $('#thpfill').style.width = clamp(t.hp / t.def.hp * 100, 0, 100) + '%'; $('#thptxt').textContent = `${Math.max(0, Math.ceil(t.hp))} / ${t.def.hp}`; selRing.visible = true; selRing.position.set(t.x, t.y + 0.3, t.z); selRing.scale.setScalar(3.4 * t.def.scale); selRing.material.color.setHex(t.def.aggro ? 0xff5040 : 0xffc040); } else selRing.visible = false;
  updateHotbar();
  hudT -= dt; if (hudT <= 0) {
    hudT = 0.25; $('#pname').textContent = p.name; $('#plvl').textContent = `${clsName()} · St. ${p.lvl}`;
    const need = expNeed(p.lvl), pc = p.lvl >= MAXLVL ? 100 : p.exp / need * 100; $('#expfill').style.width = pc + '%'; $('#exptxt').textContent = p.lvl >= MAXLVL ? 'Maximalstufe' : `EP ${pc.toFixed(2)} %`;
    $('#gold').textContent = `💰 ${p.gold.toLocaleString('de-DE')} Taler`;
    $('#buffs').innerHTML = p.buffs.map(b => `<span>${b.icon} ${Math.ceil(b.t)}s</span>`).join('') + (p.sp ? '<span style="color:#7dffb0">▲ Punkte frei (C)</span>' : '');
    let zn = 'Wildnis'; const d0 = Math.hypot(p.x, p.z), isl = islandAt(p.x, p.z);
    if (p.dun) zn = p.dun.name; else if (isl && p.y > isl.y - 2) zn = isl.name || 'Himmelsinseln'; else if (d0 < 45) zn = 'Luminhafen'; else for (const z of ZONES) if (Math.hypot(p.x - z.x, p.z - z.z) < z.r * 1.1) zn = z.name;
    if (zn !== zoneName) { zoneName = zn; const zz = ZONES.find(q => q.name === zn); zoneKey = p.dun ? p.dun.amb : zz ? zz.id : zn === 'Luminhafen' ? 'town' : isl ? 'isl' : ''; $('#zone').textContent = zn; if (zn !== 'Wildnis') { const z = ZONES.find(q => q.name === zn); center(zn, z ? `Monster ab Stufe ${MOBS[z.mobs[0][0]].lvl}` : p.dun ? `Dungeon · Stufe ${p.dun.lvl}–${p.dun.max}` : isl ? `Monster ab Stufe ${MOBS[isl.mobs[0][0]].lvl}` : 'Sicheres Dorf'); } }
    for (const n of npcs) { const mk = npcMark(n), html = `${mk ? `<span class="qm">${mk}</span>` : ''}${n.name}<small>${n.role}</small>`; if (n._h !== html) { n._h = html; n.lbl.innerHTML = html; } }
  }
  if (p.dun) { const d = p.dun, alive = [0, 0, 0, 0, 0], pi = dunIdx(d, p.x, p.z); for (const m of mobs) if (m.home.dun === d && !m.dead) alive[m.home.ri]++; for (let i = 1; i < 4; i++) { d.locks[i] = alive[i] > 0 && pi <= i; d.gates[i].visible = alive[i] > 0; } }
  // Namen über Monstern in der Nähe: rot = greift von selbst an
  const near = []; for (const m of mobs) { if (m.dead) continue; const dd = Math.hypot(m.x - p.x, m.z - p.z); if (dd < 42 && Math.abs(m.y - p.y) < 16) near.push([dd, m]); } near.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < mobLbl.length; i++) { const l = mobLbl[i], q = near[i], s = q ? toScreen(q[1].x, mobCenterY(q[1]) + 1.7 * q[1].def.scale, q[1].z) : null; if (!s) { if (l.on) { l.el.style.display = 'none'; l.on = false; } continue; } const m = q[1], tx = `${m.def.boss ? '👑 ' : ''}${m.def.name} · St. ${m.def.lvl}`; if (l.tx !== tx) { l.tx = tx; l.el.textContent = tx; l.el.style.color = m.def.aggro ? '#ff5a48' : '#fff3c4'; } if (!l.on) { l.el.style.display = ''; l.on = true; } l.el.style.left = s.x + 'px'; l.el.style.top = s.y + 'px'; }
  for (const n of portals) { const s = Math.hypot(n.x - p.x, n.z - p.z) < 110 ? toScreen(n.x, n.y + 7.6, n.z) : null; if (s) { n.lbl.style.display = ''; n.lbl.style.left = s.x + 'px'; n.lbl.style.top = s.y + 'px'; } else n.lbl.style.display = 'none'; }
  for (const n of npcs) { const s = Math.hypot(n.x - p.x, n.z - p.z) < 90 ? toScreen(n.x, n.y + 4.0, n.z) : null; if (s) { n.lbl.style.display = ''; n.lbl.style.left = s.x + 'px'; n.lbl.style.top = s.y + 'px'; } else n.lbl.style.display = 'none'; }
  mapT -= dt; if (mapT <= 0) { mapT = 0.12; drawMap(); }
}
const mctx = $('#minimap').getContext('2d');
function drawMap() {
  const c = mctx, S = 160, R = 130, k = S / 2 / R; c.clearRect(0, 0, S, S); c.save(); c.beginPath(); c.arc(80, 80, 80, 0, 7); c.clip();
  c.fillStyle = p.dun ? '#10121c' : '#3f8f4a'; c.fillRect(0, 0, S, S);
  const P = (x, z) => [80 + (x - p.x) * k, 80 + (z - p.z) * k];
  const circ = (x, z, r, col) => { const q = P(x, z); c.fillStyle = col; c.beginPath(); c.arc(q[0], q[1], r * k, 0, 7); c.fill(); };
  if (p.dun) { const d = p.dun; c.strokeStyle = '#5a6078'; c.lineWidth = d.w * k; c.beginPath(); d.rooms.forEach((r, i) => { const q = P(r.x, r.z); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); for (const r of d.rooms) circ(r.x, r.z, r.r, '#5a6078'); }
  else for (const z of ZONES) circ(z.x, z.z, z.r, `rgba(${z.col.map(v => Math.round(v * 255)).join(',')},.75)`);
  if (!p.dun) { circ(0, 0, 34, 'rgba(230,205,150,.9)'); for (const i of ISLANDS) circ(i.x, i.z, i.r, 'rgba(200,235,255,.75)'); }
  for (const n of portals) { const q = P(n.x, n.z); c.fillStyle = '#7ff0ff'; c.beginPath(); c.arc(q[0], q[1], 3.5, 0, 7); c.fill(); }
  for (const m of mobs) { if (m.dead) continue; const q = P(m.x, m.z); if (Math.abs(q[0] - 80) > 82 || Math.abs(q[1] - 80) > 82) continue; c.fillStyle = m === p.target ? '#fff' : m.def.boss ? '#ff3ad6' : m.def.aggro ? '#ff4a4a' : '#ffb04a'; c.fillRect(q[0] - 1.5, q[1] - 1.5, m.def.boss ? 6 : 3, m.def.boss ? 6 : 3); }
  for (const n of npcs) { const q = P(n.x, n.z); c.fillStyle = '#ffe04a'; c.beginPath(); c.arc(q[0], q[1], 3, 0, 7); c.fill(); }
  // Richtung zum Dorf, wenn außerhalb
  const d0 = Math.hypot(p.x, p.z); if (d0 > R && !p.dun) { const a = Math.atan2(-p.z, -p.x); c.fillStyle = '#ffe04a'; c.beginPath(); c.arc(80 + Math.cos(a) * 72, 80 + Math.sin(a) * 72, 4, 0, 7); c.fill(); }
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
  const picks = []; for (const m of mobs) if (!m.dead && Math.hypot(m.x - p.x, m.z - p.z) < 120) picks.push(m.pick); for (const n of npcs) picks.push(n.pick); for (const n of portals) if (Math.hypot(n.x - p.x, n.z - p.z) < 150) picks.push(n.pick);
  const hit = ray.intersectObjects(picks, false)[0];
  if (hit) { const u = hit.object.userData; if (u.kind === 'mob') { if (p.target === u.ent) startAttack(); else { setTarget(u.ent); beep(500, 0.03, 'sine', 0.03); } } else { p.interact = u.ent; p.attacking = false; p.moveTo = null; } return; }
  const gh = ray.intersectObjects(groundMeshes, false)[0];
  if (gh && gh.point.y > WATER - 0.3) { p.moveTo = { x: gh.point.x, z: gh.point.z }; p.attacking = false; p.queued = null; p.interact = null; ring(gh.point.x, gh.point.y, gh.point.z, 0xffffff, 1.6, 0.35); }
}
window.addEventListener('keydown', e => {
  if (!started || e.target.tagName === 'INPUT') return; const k = e.key.toLowerCase(); keys[k] = true;
  if (e.repeat) { if (k === ' ' || k === 'tab') e.preventDefault(); return; }
  if (k >= '0' && k <= '9') { const s = slots.find(q => q.key === k); if (s) s.act(); }
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
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ name: p.name, hair: p.hair, cls: p.cls, spec: p.spec, lvl: p.lvl, exp: p.exp, gold: p.gold, sp: p.sp, stats: p.stats, inv: p.inv, equip: p.equip, q: p.q, hp: p.hp, mp: p.mp, x: p.x, y: p.y, z: p.z })); } catch (e) { /* Speicher nicht verfügbar */ }
}
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.name && CLASSES[s.cls] ? s : null; } catch (e) { return null; } }
setInterval(save, 15000); window.addEventListener('beforeunload', save);

/* ---------- Start ---------- */
function startGame(s) {
  if (s) { Object.assign(p, s); p.dun = null; if (p.x > 2000) { p.x = 0; p.z = 16; } p.inv = (s.inv || []).filter(i => ITEMS[i.id]); for (const k in p.equip) if (p.equip[k] && !ITEMS[p.equip[k].id]) p.equip[k] = null; if (p.flying || islandAt(p.x, p.z)) p.y = Math.max(p.y, groundAt(p.x, p.z, p.y)); else p.y = terrainH(p.x, p.z); }
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
buildNpcs(); buildDungeons();
for (const z of ZONES) for (const [id, n] of z.mobs) for (let i = 0; i < n; i++) spawnMob(id, { x: z.x, z: z.z, r: z.r });
for (const i of ISLANDS) for (const [id, n] of i.mobs) for (let k = 0; k < n; k++) spawnMob(id, { x: i.x, z: i.z, r: i.r, y: i.y, isl: true });

let lockMsg = -9; const clock = new THREE.Clock(); let time = 0, camCur = 14; const camRay = new THREE.Raycaster(), camDir = new THREE.Vector3(), camFrom = new THREE.Vector3();
function frame() {
  requestAnimationFrame(frame); const dt = Math.min(0.05, clock.getDelta()); time += dt; runTimers(dt);
  let tx = 0, ty = 6, tz = 0;
  if (started) {
    updatePlayer(dt); for (const m of mobs) updateMob(m, dt); updateLoot(dt); updateProj(dt);
    tx = p.x; ty = p.y + 2.5; tz = p.z;
  } else { cam.yaw = time * 0.07 + 0.6; cam.pitch = 0.22; cam.dist = 62; }
  updateNpcs(dt);
  const cp = Math.cos(cam.pitch); camDir.set(Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp); camFrom.set(tx, ty, tz); camRay.set(camFrom, camDir); camRay.far = cam.dist;
  const blk = camRay.intersectObjects(GFX.blockers, false)[0], want = blk ? Math.max(2.2, blk.distance - 0.7) : cam.dist; camCur = want < camCur ? want : camCur + (want - camCur) * Math.min(1, dt * 5);
  let cx = tx + camDir.x * camCur, cy = ty + camDir.y * camCur, cz = tz + camDir.z * camCur;
  cy = Math.max(cy, Math.max(terrainH(cx, cz), WATER) + 1.2);
  camera.position.set(cx, cy, cz); camera.lookAt(tx, ty, tz);
  GFX.frame(dt, time, { x: tx, y: ty - 2.5, z: tz }, started ? zoneKey : 'town');
  if (started) updateHud(dt);
}
frame();

// Für Tests / Neugierige
window.WRGAME = { refresh: refreshModel, portals, p, mobs, npcs, cam, startGame, hitMob, gainExp, addItem, castSkill, toggleFly, startAttack, setTarget, nearestMob, openNpc, terrainH, save, keys, loots };
})();
