'use strict';
/* Wolkenreich – Spieldaten (Klassen, Skills, Items, Monster, Zonen, Quests, NPCs) */
const WR = (() => {
  const CLASSES = {
    wanderer:    { name: 'Wanderer',       stat: 'str', range: 2.8, hpM: 1.0,  color: 0x8a9bb8, desc: 'Ein Reisender ohne Berufung.' },
    klinge:      { name: 'Klingenkämpfer', stat: 'str', range: 3.0, hpM: 1.35, color: 0xc0453c, desc: 'Nahkämpfer mit viel Leben und Flächenschaden. Hauptwert: STR.' },
    arkanist:    { name: 'Arkanist',       stat: 'int', range: 20,  hpM: 0.85, color: 0x5a55d6, proj: 0x7ab8ff, desc: 'Fernkampf-Magier mit gewaltigem Schaden, aber wenig Leben. Hauptwert: INT.' },
    waldlaeufer: { name: 'Waldläufer',     stat: 'dex', range: 22,  hpM: 1.0,  color: 0x3f9a55, proj: 0xffe08a, desc: 'Schneller Bogenschütze mit kritischen Treffern. Hauptwert: DEX.' },
    kleriker:    { name: 'Kleriker',       stat: 'int', range: 14,  hpM: 1.15, color: 0xe2c35a, proj: 0xfff2a0, desc: 'Heilt sich selbst, stärkt sich mit Segen und straft mit Licht. Hauptwert: INT.' },
  };

  const SKILLS = {
    kraft:  { name: 'Kraftschlag',  icon: '💥', cls: '*', lvl: 3, mp: 6, cd: 4, type: 'dmg', mult: 1.8, desc: 'Ein wuchtiger Treffer (180 % Schaden).' },
    wirbel: { name: 'Wirbelhieb',   icon: '🌀', cls: 'klinge', lvl: 10, mp: 14, cd: 7, type: 'aoe', center: 'self', radius: 6.5, mult: 1.6, desc: 'Trifft alle Gegner um dich herum (160 %).' },
    wall:   { name: 'Schildwall',   icon: '🛡️', cls: 'klinge', lvl: 14, mp: 18, cd: 40, type: 'buff', buff: { def: 1.7 }, dur: 20, desc: '+70 % Verteidigung für 20 s.' },
    donner: { name: 'Donnerschlag', icon: '⚡', cls: 'klinge', lvl: 20, mp: 26, cd: 14, type: 'dmg', mult: 3.2, stun: 3, desc: '320 % Schaden und betäubt 3 s.' },
    feuer:  { name: 'Feuerkugel',   icon: '🔥', cls: 'arkanist', lvl: 10, mp: 12, cd: 3, type: 'dmg', mult: 2.2, proj: 0xff7a2a, desc: 'Schleudert eine Feuerkugel (220 %).' },
    frost:  { name: 'Frostnova',    icon: '❄️', cls: 'arkanist', lvl: 14, mp: 22, cd: 12, type: 'aoe', center: 'self', radius: 10, mult: 1.7, slow: 5, desc: 'Eisexplosion um dich herum (170 %), verlangsamt 5 s.' },
    blitz:  { name: 'Blitzspeer',   icon: '🌩️', cls: 'arkanist', lvl: 20, mp: 34, cd: 12, type: 'dmg', mult: 4.2, proj: 0xd0b0ff, desc: 'Ein Speer aus purem Blitz (420 %).' },
    doppel: { name: 'Doppelschuss', icon: '🏹', cls: 'waldlaeufer', lvl: 10, mp: 10, cd: 4, type: 'dmg', mult: 2.1, desc: 'Zwei Pfeile in schneller Folge (210 %).' },
    wind:   { name: 'Windschritt',  icon: '💨', cls: 'waldlaeufer', lvl: 14, mp: 14, cd: 35, type: 'buff', buff: { spd: 1.5, aspd: 1.25 }, dur: 15, desc: '+50 % Lauftempo und +25 % Angriffstempo für 15 s.' },
    regen:  { name: 'Pfeilregen',   icon: '☔', cls: 'waldlaeufer', lvl: 20, mp: 28, cd: 12, type: 'aoe', center: 'target', radius: 8, mult: 2.3, desc: 'Pfeile regnen auf das Ziel und alle Gegner daneben (230 %).' },
    heil:   { name: 'Heilung',      icon: '💚', cls: 'kleriker', lvl: 10, mp: 16, cd: 6, type: 'heal', heal: 0.35, desc: 'Heilt 35 % deines Lebens plus INT-Bonus.' },
    segen:  { name: 'Segen',        icon: '✨', cls: 'kleriker', lvl: 14, mp: 24, cd: 60, type: 'buff', buff: { atk: 1.25, def: 1.25 }, dur: 60, desc: '+25 % Angriff und Verteidigung für 60 s.' },
    licht:  { name: 'Lichtstrahl',  icon: '☀️', cls: 'kleriker', lvl: 20, mp: 24, cd: 8, type: 'dmg', mult: 3.4, proj: 0xffffff, desc: 'Gleißendes Licht verbrennt das Ziel (340 %).' },
  };

  const ITEMS = {};
  const I = (id, o) => { ITEMS[id] = Object.assign({ id }, o); };
  I('w_holz',  { name: 'Holzschwert', type: 'weapon', wt: 'sword', atk: 6,  lvl: 1, price: 40,  icon: '🗡️' });
  I('w_eisen', { name: 'Eisenklinge', type: 'weapon', wt: 'sword', atk: 15, lvl: 5, price: 320, icon: '🗡️' });
  const cw = {
    klinge:      ['sword', '⚔️', ['Stahlschwert', 'Runenklinge', 'Sturmbrecher']],
    arkanist:    ['staff', '🪄', ['Lehrlingsstab', 'Kristallstab', 'Sternenstab']],
    waldlaeufer: ['bow',   '🏹', ['Jagdbogen', 'Windbogen', 'Himmelsbogen']],
    kleriker:    ['staff', '🔱', ['Segenszepter', 'Lichtzepter', 'Sonnenzepter']],
  };
  const tl = [10, 18, 26], ta = [28, 50, 80], tp = [1200, 5200, 16000];
  for (const c in cw) cw[c][2].forEach((n, i) => I('w_' + c + i, { name: n, type: 'weapon', wt: cw[c][0], cls: c, atk: ta[i], lvl: tl[i], price: tp[i], icon: cw[c][1] }));
  [['Reisegewand', 3, 1, 30], ['Lederwams', 8, 5, 260], ['Gardistentracht', 16, 10, 1000], ['Runengewand', 28, 18, 4600], ['Himmelstracht', 44, 26, 14000]]
    .forEach((a, i) => I('a_' + i, { name: a[0], type: 'armor', def: a[1], lvl: a[2], price: a[3], icon: i < 2 ? '👕' : '🥋' }));
  I('apfel',   { name: 'Apfel',             type: 'use', hp: 60,  price: 15,  icon: '🍎' });
  I('hp1',     { name: 'Heiltrank',         type: 'use', hp: 220, price: 90,  icon: '🧪' });
  I('hp2',     { name: 'Großer Heiltrank',  type: 'use', hp: 650, price: 340, icon: '❤️‍🩹', lvl: 15 });
  I('mp1',     { name: 'Manatrank',         type: 'use', mp: 120, price: 80,  icon: '💧' });
  I('mp2',     { name: 'Großer Manatrank',  type: 'use', mp: 400, price: 300, icon: '🫧', lvl: 15 });
  I('brett1',  { name: 'Windbrett',    type: 'board', speed: 22, lvl: 8,  price: 1500,  icon: '🛹', desc: 'Ein schwebendes Brett. Damit kannst du fliegen!' });
  I('brett2',  { name: 'Sturmgleiter', type: 'board', speed: 34, lvl: 20, price: 12000, icon: '🪽', desc: 'Schneller als der Wind.' });
  I('splitter',{ name: 'Sternsplitter', type: 'misc', price: 150, icon: '💎', desc: 'Der Schmied braucht ihn, um Ausrüstung zu verbessern.' });
  I('gelee',   { name: 'Puffelgelee',   type: 'misc', price: 6,   icon: '🟢' });
  I('kappe',   { name: 'Pilzkappe',     type: 'misc', price: 14,  icon: '🍄' });
  I('schere',  { name: 'Krabbenschere', type: 'misc', price: 30,  icon: '🦀' });
  I('kern',    { name: 'Golemkern',     type: 'misc', price: 48,  icon: '🪨' });
  I('pelz',    { name: 'Schattenpelz',  type: 'misc', price: 70,  icon: '🐺' });
  I('funke',   { name: 'Irrlichtfunke', type: 'misc', price: 95,  icon: '🔮' });
  I('glut',    { name: 'Glutpanzer',    type: 'misc', price: 130, icon: '🪲' });
  I('asche',   { name: 'Geisterasche',  type: 'misc', price: 170, icon: '⚱️' });
  I('feder',   { name: 'Wolkenfeder',   type: 'misc', price: 230, icon: '🪶' });
  I('herz',    { name: 'Herz des Kolosses', type: 'misc', price: 9000, icon: '💠', desc: 'Pulsiert noch immer vor Sturmenergie.' });

  // Monster: hp/atk/def/exp werden aus dem Level berechnet
  const MOBS = {
    puffel:   { name: 'Puffel',          lvl: 1,  model: 'blob',     color: 0x8fe3a0, scale: 1.0, drop: 'gelee' },
    honig:    { name: 'Honigpuffel',     lvl: 3,  model: 'blob',     color: 0xf2c14e, scale: 1.25, drop: 'gelee' },
    pilz:     { name: 'Pilzling',        lvl: 5,  model: 'mushroom', color: 0xd9534f, scale: 1.0, drop: 'kappe' },
    giftpilz: { name: 'Giftpilzling',    lvl: 8,  model: 'mushroom', color: 0x8e5bd0, scale: 1.3, drop: 'kappe', aggro: true },
    krabbe:   { name: 'Steinkrabbe',     lvl: 10, model: 'crab',     color: 0x9aa7b5, scale: 1.1, drop: 'schere' },
    golem:    { name: 'Geröllgolem',     lvl: 13, model: 'golem',    color: 0x8b7d6b, scale: 1.3, drop: 'kern' },
    wolf:     { name: 'Schattenwolf',    lvl: 16, model: 'wolf',     color: 0x3b3a55, scale: 1.2, drop: 'pelz', aggro: true, speed: 7 },
    irrlicht: { name: 'Irrlicht',        lvl: 19, model: 'wisp',     color: 0x7df9ff, scale: 1.0, drop: 'funke', aggro: true },
    kaefer:   { name: 'Glutkäfer',       lvl: 22, model: 'beetle',   color: 0xff6a2a, scale: 1.3, drop: 'glut' },
    asche:    { name: 'Aschengeist',     lvl: 25, model: 'ghost',    color: 0xb0a8a0, scale: 1.4, drop: 'asche', aggro: true },
    waechter: { name: 'Wolkenwächter',   lvl: 28, model: 'guardian', color: 0xf4f8ff, scale: 1.5, drop: 'feder', aggro: true },
    koloss:   { name: 'Sturmkoloss',     lvl: 32, model: 'boss',     color: 0x6f8fd8, scale: 3.4, drop: 'herz', aggro: true, boss: true },
  };
  for (const k in MOBS) {
    const m = MOBS[k], L = m.lvl; m.id = k;
    m.hp = Math.round(30 + L * 14 + L * L * 2.2); m.atk = Math.round(4 + L * 2.6); m.def = Math.round(L * 1.2);
    m.exp = Math.round(10 + L * L * 1.6); m.gold = [L * 2, L * 5]; m.speed = m.speed || 5;
    if (m.boss) { m.hp *= 14; m.atk = Math.round(m.atk * 1.7); m.exp *= 18; m.gold = [4000, 6000]; }
  }

  const ZONES = [
    { id: 'wiese', name: 'Sonnenwiese',   x: 0,    z: 95,   r: 60, col: [0.45, 0.78, 0.36], mobs: [['puffel', 9], ['honig', 6]] },
    { id: 'hain',  name: 'Pilzhain',      x: 140,  z: 20,   r: 58, col: [0.42, 0.55, 0.50], mobs: [['pilz', 9], ['giftpilz', 7]] },
    { id: 'fels',  name: 'Felsgrund',     x: -150, z: 10,   r: 62, col: [0.60, 0.58, 0.52], mobs: [['krabbe', 9], ['golem', 7]] },
    { id: 'wald',  name: 'Dämmerwald',    x: -70,  z: -200, r: 75, col: [0.16, 0.36, 0.24], mobs: [['wolf', 10], ['irrlicht', 8]] },
    { id: 'glut',  name: 'Glutfeld',      x: 200,  z: -190, r: 70, col: [0.42, 0.24, 0.18], mobs: [['kaefer', 10], ['asche', 8]] },
  ];
  const ISLANDS = [
    { x: 250, z: 120, y: 60, r: 42, mobs: [['waechter', 5]] },
    { x: 335, z: 40,  y: 74, r: 34, mobs: [['waechter', 4]] },
    { x: 300, z: 235, y: 88, r: 52, mobs: [['waechter', 4], ['koloss', 1]] },
  ];

  const NPCS = [
    { id: 'mira',  name: 'Älteste Mira',   role: 'Quests',        x: 6,   z: 10,  color: 0xb46ad6, hair: 0xeeeeee },
    { id: 'tessa', name: 'Händlerin Tessa', role: 'Laden',        x: -12, z: 6,   color: 0xe08a3a, hair: 0x8a4b20 },
    { id: 'borin', name: 'Schmied Borin',  role: 'Verbesserung',  x: -10, z: -12, color: 0x6b6b78, hair: 0x2a2a2a },
    { id: 'kaela', name: 'Meisterin Kaela', role: 'Klassen',      x: 12,  z: -10, color: 0x3a8ad6, hair: 0x1c2a66 },
    { id: 'ivo',   name: 'Flugmeister Ivo', role: 'Flugbretter',  x: 18,  z: 4,   color: 0x4fc0a8, hair: 0xffd23c },
  ];

  const Q = (name, text, o) => Object.assign({ name, text }, o);
  const QUESTS = [
    Q('Puffelplage', 'Die Puffel auf der Sonnenwiese südlich des Dorfes fressen unsere Beete leer. Vertreibe ein paar von ihnen!', { kill: 'puffel', n: 6, lvl: 1, exp: 60, gold: 80, items: [['apfel', 5]] }),
    Q('Honigdiebe', 'Die gelben Honigpuffel sind noch dreister. Zeig ihnen, wem der Honig gehört.', { kill: 'honig', n: 8, lvl: 2, exp: 220, gold: 150, items: [['w_eisen', 1]] }),
    Q('Pilzsuppe', 'Im Pilzhain im Osten wachsen wandelnde Pilzlinge. Bring mir 6 Pilzkappen für meine Suppe.', { collect: 'kappe', n: 6, lvl: 4, exp: 520, gold: 250, items: [['hp1', 5], ['a_1', 1]] }),
    Q('Giftige Nachbarn', 'Die violetten Giftpilzlinge greifen Reisende an. Besiege 10 von ihnen – Ivo hat dafür ein Flugbrett für dich!', { kill: 'giftpilz', n: 10, lvl: 6, exp: 1400, gold: 400, items: [['brett1', 1]] }),
    Q('Scherenschleifer', 'Im Felsgrund im Westen hausen Steinkrabben. Erlege 12 davon. (Tipp: Ab Stufe 10 kannst du bei Kaela eine Klasse wählen.)', { kill: 'krabbe', n: 12, lvl: 9, exp: 3200, gold: 700, items: [['splitter', 2]] }),
    Q('Wandelnde Felsen', 'Geröllgolems blockieren die Wege im Felsgrund. Zerschlage 10 von ihnen.', { kill: 'golem', n: 10, lvl: 12, exp: 5600, gold: 1100, items: [['splitter', 2], ['hp1', 10]] }),
    Q('Wolfsjagd', 'Im Dämmerwald im Norden jagen Schattenwölfe in Rudeln. Sei vorsichtig – sie greifen sofort an. Besiege 14.', { kill: 'wolf', n: 14, lvl: 15, exp: 10500, gold: 1800, items: [['hp2', 5]] }),
    Q('Lichter im Wald', 'Die Irrlichter locken Wanderer ins Verderben. Lösche 12 von ihnen aus.', { kill: 'irrlicht', n: 12, lvl: 18, exp: 16000, gold: 2600, items: [['splitter', 3]] }),
    Q('Heiße Sohlen', 'Auf dem Glutfeld im Nordosten krabbeln Glutkäfer. Sammle 10 Glutpanzer für Borins Esse.', { collect: 'glut', n: 10, lvl: 21, exp: 24000, gold: 3600, items: [['splitter', 3]] }),
    Q('Asche zu Asche', 'Aschengeister steigen aus den Spalten des Glutfelds. Banne 12 von ihnen.', { kill: 'asche', n: 12, lvl: 24, exp: 34000, gold: 5000, items: [['hp2', 10], ['mp2', 10]] }),
    Q('Über den Wolken', 'Im Südosten, jenseits des Pilzhains, schweben die Himmelsinseln. Fliege hinauf und besiege 10 Wolkenwächter.', { kill: 'waechter', n: 10, lvl: 27, exp: 48000, gold: 7000, items: [['splitter', 5]] }),
    Q('Der Sturmkoloss', 'Auf der höchsten Insel wacht der Sturmkoloss. Niemand hat ihn je bezwungen. Wirst du die Legende sein?', { kill: 'koloss', n: 1, lvl: 30, exp: 120000, gold: 25000, items: [['splitter', 10]] }),
  ];

  const HAIRS = [0x5a3a22, 0xf2d16b, 0xd6453c, 0x3c6ad6, 0xe98ad0, 0xeeeeee];
  const MAXLVL = 40;
  const expNeed = l => Math.floor(40 * Math.pow(l, 1.9));

  return { CLASSES, SKILLS, ITEMS, MOBS, ZONES, ISLANDS, NPCS, QUESTS, HAIRS, MAXLVL, expNeed };
})();
