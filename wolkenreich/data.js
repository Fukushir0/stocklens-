'use strict';
/* Wolkenreich – Spieldaten (Klassen, Skills, Items, Seltenheit, Monster, Zonen, Quests, NPCs) */
const WR = (() => {
  const CLASSES = {
    wanderer:    { name: 'Wanderer',       stat: 'str', range: 2.8, hpM: 1.0,  color: 0x8a9bb8, desc: 'Ein Reisender ohne Berufung.' },
    klinge:      { name: 'Klingenkämpfer', stat: 'str', range: 3.0, hpM: 1.35, color: 0xc0453c, desc: 'Nahkämpfer mit viel Leben und Flächenschaden. Hauptwert: STR.' },
    arkanist:    { name: 'Arkanist',       stat: 'int', range: 20,  hpM: 0.85, color: 0x5a55d6, proj: 0x7ab8ff, desc: 'Fernkampf-Magier mit gewaltigem Schaden, aber wenig Leben. Hauptwert: INT.' },
    waldlaeufer: { name: 'Waldläufer',     stat: 'dex', range: 22,  hpM: 1.0,  color: 0x3f9a55, proj: 0xffe08a, desc: 'Schneller Bogenschütze mit kritischen Treffern. Hauptwert: DEX.' },
    kleriker:    { name: 'Kleriker',       stat: 'int', range: 14,  hpM: 1.15, color: 0xe2c35a, proj: 0xfff2a0, desc: 'Heilt sich selbst, stärkt sich mit Segen und straft mit Licht. Hauptwert: INT.' },
  };

  // Zweite Klassenstufe ab Stufe 60 (zwei Wege je Klasse); pal = Farben des Outfits
  const SPECS = {
    ritter:        { name: 'Sturmritter',   base: 'klinge', hpM: 1.3, desc: 'Unerschütterlicher Beschützer: gewaltige Verteidigung, Betäubungen und Erdbeben.', pal: { main: 0xf2e6c0, acc: 0x3a6ad6, cape: 0x2f5fc0, boots: 0xe2d6b0 } },
    berserker:     { name: 'Berserker',     base: 'klinge', hpM: 1.05, desc: 'Entfesselte Wut: Blutrausch, Hinrichtungsschläge und ein Sturm aus Klingen.', pal: { main: 0x4a3030, acc: 0xff3a2a, cape: 0x1c1418, boots: 0x3a2828 } },
    elementarist:  { name: 'Elementarist',  base: 'arkanist', hpM: 1.0, desc: 'Herr über Feuer, Blitz und Eis – Meteore und Kettenblitze für ganze Gegnergruppen.', pal: { main: 0xb8382a, dark: 0x7a1c14, acc: 0xffb040 } },
    hexer:         { name: 'Hexer',         base: 'arkanist', hpM: 1.15, desc: 'Dunkle Künste: raubt Seelen, um sich zu heilen, verflucht und vernichtet mit Leerenmagie.', pal: { main: 0x2a1c3a, dark: 0x140c20, acc: 0x9fff6a } },
    scharfschuetze:{ name: 'Scharfschütze', base: 'waldlaeufer', hpM: 1.0, desc: 'Tödliche Präzision: einzelne Schüsse mit enormem Schaden und Sperrfeuer aus der Ferne.', pal: { main: 0x8a3a2a, dark: 0x5a2018, cape: 0x6a2a1c, acc: 0xffd23c } },
    windtaenzer:   { name: 'Windtänzer',    base: 'waldlaeufer', hpM: 1.15, desc: 'Schnell wie der Sturm: rasantes Tempo, Klingenwirbel und ein Orkan, der Gegner bremst.', pal: { main: 0x3fb8c8, dark: 0x2a8090, cape: 0xdff6ff, acc: 0xffffff } },
    hohepriester:  { name: 'Hohepriester',  base: 'kleriker', hpM: 1.25, desc: 'Lebendes Wunder: mächtige Heilung, langer Himmelssegen und eine Nova aus Licht.', pal: { main: 0xfdfaf0, dark: 0xbfd8ff, acc: 0x4f9aff } },
    inquisitor:    { name: 'Inquisitor',    base: 'kleriker', hpM: 1.05, desc: 'Strafendes Licht: Bannstrahl, heiliges Feuer und ein vernichtendes Urteil.', pal: { main: 0x8a1c24, dark: 0x4a0c14, acc: 0xffd23c } },
  };

  // fx: Art des sichtbaren Effekts (bolt, beam, shards, rain, spin, double)
  const SKILLS = {
    kraft:  { name: 'Kraftschlag',  icon: '💥', cls: '*', lvl: 3, mp: 6, cd: 4, type: 'dmg', mult: 1.8, desc: 'Ein wuchtiger Treffer (180 % Schaden).' },
    wirbel: { name: 'Wirbelhieb',   icon: '🌀', cls: 'klinge', lvl: 10, mp: 14, cd: 7, type: 'aoe', center: 'self', radius: 6.5, mult: 1.6, fx: 'spin', desc: 'Trifft alle Gegner um dich herum (160 %).' },
    wall:   { name: 'Schildwall',   icon: '🛡️', cls: 'klinge', lvl: 14, mp: 18, cd: 40, type: 'buff', buff: { def: 1.7 }, dur: 20, desc: '+70 % Verteidigung für 20 s.' },
    donner: { name: 'Donnerschlag', icon: '⚡', cls: 'klinge', lvl: 20, mp: 26, cd: 14, type: 'dmg', mult: 3.2, stun: 3, fx: 'bolt', col: 0xffe07a, desc: '320 % Schaden und betäubt 3 s.' },
    feuer:  { name: 'Feuerkugel',   icon: '🔥', cls: 'arkanist', lvl: 10, mp: 12, cd: 3, type: 'dmg', mult: 2.2, proj: 0xff7a2a, desc: 'Schleudert eine Feuerkugel (220 %).' },
    frost:  { name: 'Frostnova',    icon: '❄️', cls: 'arkanist', lvl: 14, mp: 22, cd: 12, type: 'aoe', center: 'self', radius: 10, mult: 1.7, slow: 5, fx: 'shards', desc: 'Eisexplosion um dich herum (170 %), verlangsamt 5 s.' },
    blitz:  { name: 'Blitzspeer',   icon: '🌩️', cls: 'arkanist', lvl: 20, mp: 34, cd: 12, type: 'dmg', mult: 4.2, fx: 'bolt', col: 0xd0b0ff, desc: 'Ein Speer aus purem Blitz (420 %).' },
    doppel: { name: 'Doppelschuss', icon: '🏹', cls: 'waldlaeufer', lvl: 10, mp: 10, cd: 4, type: 'dmg', mult: 2.1, fx: 'double', desc: 'Zwei Pfeile in schneller Folge (210 %).' },
    wind:   { name: 'Windschritt',  icon: '💨', cls: 'waldlaeufer', lvl: 14, mp: 14, cd: 35, type: 'buff', buff: { spd: 1.5, aspd: 1.25 }, dur: 15, desc: '+50 % Lauftempo und +25 % Angriffstempo für 15 s.' },
    regen:  { name: 'Pfeilregen',   icon: '☔', cls: 'waldlaeufer', lvl: 20, mp: 28, cd: 12, type: 'aoe', center: 'target', radius: 8, mult: 2.3, fx: 'rain', desc: 'Pfeile regnen auf das Ziel und alle Gegner daneben (230 %).' },
    heil:   { name: 'Heilung',      icon: '💚', cls: 'kleriker', lvl: 10, mp: 16, cd: 6, type: 'heal', heal: 0.35, desc: 'Heilt 35 % deines Lebens plus INT-Bonus.' },
    segen:  { name: 'Segen',        icon: '✨', cls: 'kleriker', lvl: 14, mp: 24, cd: 60, type: 'buff', buff: { atk: 1.25, def: 1.25 }, dur: 60, col: 0xfff2a0, desc: '+25 % Angriff und Verteidigung für 60 s.' },
    licht:  { name: 'Lichtstrahl',  icon: '☀️', cls: 'kleriker', lvl: 20, mp: 24, cd: 8, type: 'dmg', mult: 3.4, fx: 'beam', col: 0xfff2a0, desc: 'Gleißendes Licht verbrennt das Ziel (340 %).' },
    // --- Zweite Klassenstufe (Stufe 60 / 70 / 85) ---
    bollwerk:   { name: 'Bollwerk',       icon: '🏰', cls: 'ritter', lvl: 60, mp: 40, cd: 45, type: 'buff', buff: { def: 2.4, atk: 1.15 }, dur: 30, col: 0x6fa0ff, desc: '+140 % Verteidigung und +15 % Angriff für 30 s.' },
    richt:      { name: 'Richtspruch',    icon: '⚖️', cls: 'ritter', lvl: 70, mp: 55, cd: 12, type: 'dmg', mult: 5.5, stun: 4, fx: 'beam', col: 0x9fc8ff, desc: 'Ein Schlag aus Licht (550 %), betäubt 4 s.' },
    beben:      { name: 'Erdbeben',       icon: '🌋', cls: 'ritter', lvl: 85, mp: 80, cd: 20, type: 'aoe', center: 'self', radius: 12, mult: 4.5, stun: 2.5, fx: 'shards', col: 0xd8b070, desc: 'Der Boden bricht auf (450 %), betäubt alle Gegner 2,5 s.' },
    rausch:     { name: 'Blutrausch',     icon: '🩸', cls: 'berserker', lvl: 60, mp: 40, cd: 40, type: 'buff', buff: { atk: 1.55, aspd: 1.45 }, dur: 25, col: 0xff3a2a, desc: '+55 % Angriff und +45 % Angriffstempo für 25 s.' },
    henker:     { name: 'Henkerschlag',   icon: '🪓', cls: 'berserker', lvl: 70, mp: 50, cd: 9, type: 'dmg', mult: 7.5, col: 0xff5a3a, desc: 'Ein vernichtender Hieb (750 %).' },
    klingensturm:{ name: 'Klingensturm',  icon: '🌪️', cls: 'berserker', lvl: 85, mp: 85, cd: 16, type: 'aoe', center: 'self', radius: 9.5, mult: 6, fx: 'spin', col: 0xff5a3a, desc: 'Ein Wirbel aus Stahl zerfetzt alles ringsum (600 %).' },
    meteor:     { name: 'Meteor',         icon: '☄️', cls: 'elementarist', lvl: 60, mp: 60, cd: 10, type: 'aoe', center: 'target', radius: 10, mult: 6, fx: 'rain', col: 0xff7a2a, desc: 'Glühende Brocken stürzen auf das Ziel (600 % Flächenschaden).' },
    kette:      { name: 'Kettenblitz',    icon: '⛓️', cls: 'elementarist', lvl: 70, mp: 70, cd: 12, type: 'aoe', center: 'target', radius: 13, mult: 5, fx: 'bolt', col: 0xd0c0ff, desc: 'Ein Blitz springt auf alle Gegner in der Nähe über (500 %).' },
    eiszeit:    { name: 'Eiszeit',        icon: '🧊', cls: 'elementarist', lvl: 85, mp: 95, cd: 22, type: 'aoe', center: 'self', radius: 15, mult: 5, slow: 9, fx: 'shards', desc: 'Ein Eissturm in weitem Umkreis (500 %), verlangsamt 9 s.' },
    seelenraub: { name: 'Seelenraub',     icon: '👻', cls: 'hexer', lvl: 60, mp: 45, cd: 7, type: 'dmg', mult: 5.5, leech: 0.25, proj: 0x9fff6a, desc: '550 % Schaden und heilt dich um 25 % deines Lebens.' },
    fluch:      { name: 'Fluch',          icon: '🕸️', cls: 'hexer', lvl: 70, mp: 60, cd: 14, type: 'aoe', center: 'target', radius: 10, mult: 4, slow: 7, col: 0x9a5ae0, desc: 'Verflucht Ziel und Umgebung (400 %), verlangsamt 7 s.' },
    leere:      { name: 'Leerenstrahl',   icon: '🕳️', cls: 'hexer', lvl: 85, mp: 100, cd: 14, type: 'dmg', mult: 10, fx: 'beam', col: 0xb060ff, desc: 'Ein Strahl aus dem Nichts (1000 %).' },
    adler:      { name: 'Adlerauge',      icon: '🦅', cls: 'scharfschuetze', lvl: 60, mp: 35, cd: 45, type: 'buff', buff: { atk: 1.5 }, dur: 30, col: 0xffd23c, desc: '+50 % Angriff für 30 s.' },
    kopfschuss: { name: 'Kopfschuss',     icon: '🎯', cls: 'scharfschuetze', lvl: 70, mp: 50, cd: 8, type: 'dmg', mult: 8.5, proj: 0xff5a3a, desc: 'Ein perfekter Schuss (850 %).' },
    sperrfeuer: { name: 'Sperrfeuer',     icon: '🎆', cls: 'scharfschuetze', lvl: 85, mp: 90, cd: 16, type: 'aoe', center: 'target', radius: 11, mult: 6, fx: 'rain', col: 0xffb040, desc: 'Ein Hagel aus Pfeilen deckt das Gebiet ein (600 %).' },
    sturmlauf:  { name: 'Sturmlauf',      icon: '🌬️', cls: 'windtaenzer', lvl: 60, mp: 35, cd: 35, type: 'buff', buff: { spd: 1.8, aspd: 1.7 }, dur: 20, col: 0x9ff0ff, desc: '+80 % Lauftempo und +70 % Angriffstempo für 20 s.' },
    klingenwind:{ name: 'Klingenwind',    icon: '🍃', cls: 'windtaenzer', lvl: 70, mp: 55, cd: 9, type: 'aoe', center: 'self', radius: 9, mult: 5, fx: 'spin', col: 0x9ff0ff, desc: 'Schneidende Böen um dich herum (500 %).' },
    orkan:      { name: 'Orkan',          icon: '🌀', cls: 'windtaenzer', lvl: 85, mp: 90, cd: 18, type: 'aoe', center: 'target', radius: 13, mult: 5.5, slow: 6, fx: 'rain', col: 0xdff6ff, desc: 'Ein Wirbelsturm am Ziel (550 %), verlangsamt 6 s.' },
    wunder:     { name: 'Wunder',         icon: '🕊️', cls: 'hohepriester', lvl: 60, mp: 60, cd: 14, type: 'heal', heal: 0.85, desc: 'Heilt 85 % deines Lebens plus INT-Bonus.' },
    himmel:     { name: 'Himmelssegen',   icon: '🌟', cls: 'hohepriester', lvl: 70, mp: 70, cd: 90, type: 'buff', buff: { atk: 1.45, def: 1.7 }, dur: 90, col: 0xbfd8ff, desc: '+45 % Angriff und +70 % Verteidigung für 90 s.' },
    nova:       { name: 'Lichtnova',      icon: '💫', cls: 'hohepriester', lvl: 85, mp: 90, cd: 15, type: 'aoe', center: 'self', radius: 13, mult: 5.5, fx: 'beam', col: 0xfff2a0, desc: 'Licht bricht aus dir hervor (550 % Flächenschaden).' },
    bann:       { name: 'Bannstrahl',     icon: '🔆', cls: 'inquisitor', lvl: 60, mp: 45, cd: 6, type: 'dmg', mult: 6.5, fx: 'beam', col: 0xffd23c, desc: 'Bannt das Ziel mit gebündeltem Licht (650 %).' },
    hfeuer:     { name: 'Heiliges Feuer', icon: '🕯️', cls: 'inquisitor', lvl: 70, mp: 65, cd: 12, type: 'aoe', center: 'target', radius: 10, mult: 5.5, fx: 'rain', col: 0xffe9a0, desc: 'Flammen vom Himmel (550 % Flächenschaden).' },
    urteil:     { name: 'Urteil',         icon: '🔨', cls: 'inquisitor', lvl: 85, mp: 100, cd: 16, type: 'dmg', mult: 11, stun: 3, fx: 'bolt', col: 0xffd23c, desc: 'Das letzte Wort (1100 %), betäubt 3 s.' },
  };

  // Seltenheitsgrade für Waffen und Rüstungen: m = Multiplikator der Werte, w = Gewicht beim Fund
  const RAR = [
    { name: 'Bronze',  col: '#cd8b4a', hex: 0xcd8b4a, m: 1.0,  sell: 1,  w: 56 },
    { name: 'Silber',  col: '#d5deea', hex: 0xd5deea, m: 1.15, sell: 2,  w: 27 },
    { name: 'Gold',    col: '#ffd23c', hex: 0xffd23c, m: 1.32, sell: 4,  w: 11.5 },
    { name: 'Platin',  col: '#8ff0d8', hex: 0x8ff0d8, m: 1.52, sell: 8,  w: 4.5 },
    { name: 'Diamant', col: '#7fd0ff', hex: 0x7fd0ff, m: 1.8,  sell: 18, w: 1 },
    // Nur Waffen, nur von Bossen: fester Grad, wird nie zufällig gewürfelt
    { name: 'Legendär', col: '#ff9a2a', hex: 0xff9a2a, m: 2.3, sell: 40, w: 0 },
    { name: 'Blutig',   col: '#ff3048', hex: 0xff3048, m: 2.7, sell: 60, w: 0 },
  ];
  // Sets je Klasse. Rüstungs-Set: Helm, Rüstung, Handschuhe, Stiefel im selben Seltenheitsgrad (4/4).
  // Kollektion: 2 Ringe, 2 Ohrringe, Halskette im selben Grad (5/5). Werte = Grundwert × Faktor des Grades.
  const SETF = [1, 1.6, 2.3, 3.2, 4.5];
  const SETS = {
    wanderer:    { armor: { name: 'Reisenden-Set',     b: { hp: 0.03, def: 0.04 } },                          acc: { name: 'Glücksbringer', b: { hp: 0.03 } } },
    klinge:      { armor: { name: 'Bollwerk-Set',      b: { hp: 0.05, def: 0.07, atk: 0.02 } },               acc: { name: 'Löwenherz',     b: { atk: 0.04, hp: 0.04 } } },
    arkanist:    { armor: { name: 'Sternenweber-Set',  b: { atk: 0.05, mp: 0.06, crit: 0.01 } },              acc: { name: 'Astralauge',    b: { atk: 0.05, crit: 0.015 } } },
    waldlaeufer: { armor: { name: 'Sturmjäger-Set',    b: { atk: 0.03, crit: 0.02, spd: 0.025, aspd: 0.02 } }, acc: { name: 'Falkenblick',   b: { crit: 0.025, aspd: 0.025 } } },
    kleriker:    { armor: { name: 'Lichtbringer-Set',  b: { hp: 0.04, def: 0.04, atk: 0.035 } },              acc: { name: 'Seelenlicht',   b: { hp: 0.05, mp: 0.05, atk: 0.02 } } },
  };

  const ITEMS = {};
  const I = (id, o) => { ITEMS[id] = Object.assign({ id }, o); };
  I('w_holz',  { name: 'Holzschwert', type: 'weapon', wt: 'sword', atk: 6,  lvl: 1, price: 40,  icon: '🗡️' });
  I('w_eisen', { name: 'Eisenklinge', type: 'weapon', wt: 'sword', atk: 15, lvl: 5, price: 320, icon: '🗡️' });
  const TL = [10, 18, 26, 34, 42, 50, 60, 70, 80, 90], TA = [28, 50, 80, 112, 150, 195, 255, 325, 405, 500], TD = [16, 28, 44, 62, 84, 108, 140, 175, 215, 260];
  const TP = TL.map((l, i) => [1200, 5200, 16000][i] || Math.round(l * l * 26 / 100) * 100);
  const PRE = ['Mondstahl', 'Drachen', 'Frost', 'Äther', 'Phönix', 'Leeren', 'Äonen'];
  const cw = {
    klinge:      ['sword', '⚔️', ['Stahlschwert', 'Runenklinge', 'Sturmbrecher'], 'klinge'],
    arkanist:    ['staff', '🪄', ['Lehrlingsstab', 'Kristallstab', 'Sternenstab'], 'stab'],
    waldlaeufer: ['bow',   '🏹', ['Jagdbogen', 'Windbogen', 'Himmelsbogen'], 'bogen'],
    kleriker:    ['staff', '🔱', ['Segenszepter', 'Lichtzepter', 'Sonnenzepter'], 'zepter'],
  };
  for (const c in cw) TL.forEach((l, i) => I('w_' + c + i, { name: cw[c][2][i] || PRE[i - 3] + cw[c][3], type: 'weapon', wt: cw[c][0], cls: c, atk: TA[i], lvl: l, price: TP[i], icon: cw[c][1] }));
  [['Reisegewand', 3, 1, 30], ['Lederwams', 8, 5, 260], ['Gardistentracht', 16, 10, 1000], ['Runengewand', 28, 18, 4600], ['Himmelstracht', 44, 26, 14000]]
    .forEach((a, i) => I('a_' + i, { name: a[0], type: 'armor', def: a[1], lvl: a[2], price: a[3], icon: i < 2 ? '👕' : '🥋' }));
  PRE.forEach((n, i) => I('a_' + (i + 5), { name: n + 'rüstung', type: 'armor', def: TD[i + 3], lvl: TL[i + 3], price: Math.round(TP[i + 3] * 0.85 / 100) * 100, icon: '🛡️' }));
  // Helm, Handschuhe, Stiefel passend zu jeder Rüstungsstufe
  const ROOT = ['Reise', 'Leder', 'Gardisten', 'Runen', 'Himmels'].concat(PRE), AL = [1, 5].concat(TL), AD = [3, 8].concat(TD), AP = [30, 260].concat(TP.map(v => Math.round(v * 0.85 / 100) * 100));
  ROOT.forEach((n, i) => { for (const [k, type, suf, f, icon] of [['h', 'helm', 'helm', 0.5, '🪖'], ['g', 'gloves', 'handschuhe', 0.35, '🧤'], ['f', 'boots', 'stiefel', 0.4, '🥾']]) I(k + '_' + i, { name: n + suf, type, def: Math.max(1, Math.round(AD[i] * f)), lvl: AL[i], price: Math.max(20, Math.round(AP[i] * f / 10) * 10), icon }); });
  // Klassen-Rüstungen ab Stufe 10 (die neutralen Teile ab dieser Stufe bleiben nur für alte Spielstände gültig)
  const CW = { klinge: ['Plattenhelm', 'Plattenpanzer', 'Panzerhandschuhe', 'Plattenstiefel'], arkanist: ['Magierhut', 'Magierrobe', 'Magierhandschuhe', 'Magierschuhe'], waldlaeufer: ['Jägerkapuze', 'Jägerwams', 'Jägerhandschuhe', 'Jägerstiefel'], kleriker: ['Priesterkrone', 'Priesterrobe', 'Priesterhandschuhe', 'Priestersandalen'] };
  for (let i = 2; i < ROOT.length; i++) {
    for (const k of ['a', 'h', 'g', 'f']) ITEMS[k + '_' + i].old = true;
    for (const c in CW) [['h', 'helm', 0.5, '🪖'], ['a', 'armor', 1, '🥋'], ['g', 'gloves', 0.35, '🧤'], ['f', 'boots', 0.4, '🥾']].forEach((q, n) => I('c' + q[0] + '_' + c + i, { name: ROOT[i] + '-' + CW[c][n], type: q[1], cls: c, def: Math.max(1, Math.round(AD[i] * q[2])), lvl: AL[i], price: Math.max(20, Math.round(AP[i] * q[2] / 10) * 10), icon: q[3] }));
  }
  // Accessoires (nur aus Dungeons und von Bossen): je Klasse eine Kollektion in vier Stufen
  const AT = [20, 40, 60, 80], ROM = ['I', 'II', 'III', 'IV'];
  for (const c in CW) AT.forEach((L, i) => {
    const n = SETS[c].acc.name, pr = L * L * 20;
    I('x_r_' + c + i, { name: `${n}-Ring ${ROM[i]}`, type: 'ring', cls: c, atk: Math.round(L * 0.9), lvl: L, price: pr, icon: '💍', acc: true });
    I('x_e_' + c + i, { name: `${n}-Ohrring ${ROM[i]}`, type: 'ear', cls: c, hpAdd: L * 12, lvl: L, price: pr, icon: '✨', acc: true });
    I('x_n_' + c + i, { name: `${n}-Kette ${ROM[i]}`, type: 'neck', cls: c, def: Math.round(L * 0.6), hpAdd: L * 6, lvl: L, price: Math.round(pr * 1.4), icon: '📿', acc: true });
  });
  // Legendäre (ab 60) und blutige (ab 80) Waffen: fester Seltenheitsgrad fr, starke Boni
  const LEG = { klinge: 'Aurelion, Klinge der Morgenröte', arkanist: 'Astralis, Stab der Sterne', waldlaeufer: 'Zephyra, Bogen des Sturms', kleriker: 'Solaris, Zepter des Lichts' };
  const BLD = { klinge: 'Sanguis, die Blutklinge', arkanist: 'Cruor, der Blutstab', waldlaeufer: 'Vena, der Blutbogen', kleriker: 'Haema, das Blutzepter' };
  for (const c in cw) for (let i = 6; i < 10; i++) {
    I('l_' + c + i, { name: LEG[c], type: 'weapon', wt: cw[c][0], cls: c, atk: TA[i], lvl: TL[i], price: TP[i], icon: '🌟', fr: 5, bonus: { crit: 0.12, aspd: 1.15, hp: 1.15 }, desc: 'Legendär. Nur die mächtigsten Bosse tragen solche Waffen bei sich.' });
    if (i >= 8) I('b_' + c + i, { name: BLD[c], type: 'weapon', wt: cw[c][0], cls: c, atk: TA[i], lvl: TL[i], price: TP[i], icon: '🩸', fr: 6, bonus: { crit: 0.15, atk: 1.12, leech: 0.06 }, desc: 'Getränkt im Blut der Bosse. Jeder Treffer nährt ihren Träger.' });
  }
  I('apfel',   { name: 'Apfel',             type: 'use', hp: 60,  price: 15,  icon: '🍎' });
  I('hp1',     { name: 'Heiltrank',         type: 'use', hp: 220, price: 90,  icon: '🧪' });
  I('hp2',     { name: 'Großer Heiltrank',  type: 'use', hp: 650, price: 340, icon: '❤️‍🩹', lvl: 15 });
  I('hp3',     { name: 'Mächtiger Heiltrank', type: 'use', hp: 2000, price: 1300, icon: '💖', lvl: 40 });
  I('hp4',     { name: 'Elixier des Lebens', type: 'use', hp: 6000, price: 4500, icon: '💗', lvl: 70 });
  I('mp1',     { name: 'Manatrank',         type: 'use', mp: 120, price: 80,  icon: '💧' });
  I('mp2',     { name: 'Großer Manatrank',  type: 'use', mp: 400, price: 300, icon: '🫧', lvl: 15 });
  I('mp3',     { name: 'Mächtiger Manatrank', type: 'use', mp: 1000, price: 1100, icon: '🔷', lvl: 40 });
  I('mp4',     { name: 'Elixier des Geistes', type: 'use', mp: 2500, price: 3800, icon: '🌀', lvl: 70 });
  I('brett1',  { name: 'Windbrett',    type: 'board', speed: 22, lvl: 8,  price: 1500,  icon: '🛹', desc: 'Ein schwebendes Brett. Damit kannst du fliegen!' });
  I('brett2',  { name: 'Sturmgleiter', type: 'board', speed: 34, lvl: 20, price: 12000, icon: '🪽', desc: 'Schneller als der Wind.' });
  I('splitter',{ name: 'Sternsplitter', type: 'misc', price: 150, icon: '💎', desc: 'Der Schmied braucht ihn, um Ausrüstung zu verbessern.' });
  const drop = (id, name, price, icon, desc) => I(id, { name, type: 'misc', price, icon, desc });
  drop('gelee', 'Puffelgelee', 6, '🟢'); drop('kappe', 'Pilzkappe', 14, '🍄'); drop('schere', 'Krabbenschere', 30, '🦀'); drop('kern', 'Golemkern', 48, '🪨');
  drop('pelz', 'Schattenpelz', 70, '🐺'); drop('funke', 'Irrlichtfunke', 95, '🔮'); drop('glut', 'Glutpanzer', 130, '🪲'); drop('asche', 'Geisterasche', 170, '⚱️');
  drop('feder', 'Wolkenfeder', 230, '🪶'); drop('herz', 'Herz des Kolosses', 9000, '💠', 'Pulsiert noch immer vor Sturmenergie.');
  drop('eisgelee', 'Frostgelee', 300, '🔵'); drop('eispelz', 'Eispelz', 380, '🧣'); drop('moorkappe', 'Moorkappe', 460, '🍄'); drop('moorschere', 'Moorschere', 540, '🦞');
  drop('rune', 'Runenstein', 640, '🗿'); drop('fluchstoff', 'Fluchgewebe', 760, '🧵'); drop('magma', 'Magmapanzer', 900, '🌋'); drop('lavakern', 'Lavakern', 1050, '🔥');
  drop('sternstaub', 'Sternenstaub', 1250, '✨'); drop('ritterfeder', 'Goldfeder', 1450, '🪽'); drop('leerenpelz', 'Leerenpelz', 1700, '🌑'); drop('leerenasche', 'Leerenasche', 1950, '🕳️');
  drop('marke1', 'Wurzelsiegel', 260, '🌿'); drop('marke2', 'Frostsiegel', 700, '❄️'); drop('marke3', 'Glutsiegel', 1500, '🔥'); drop('marke4', 'Leerensiegel', 2800, '🌌');
  drop('aeonensplitter', 'Äonensplitter', 2300, '🔹'); drop('weltenherz', 'Herz der Welt', 90000, '🌍', 'Die Quelle aller Stürme.');

  // Monster: hp/atk/def/exp werden aus dem Level berechnet
  const MOBS = {
    puffel:   { name: 'Puffel',          lvl: 1,  model: 'blob',     color: 0x8fe3a0, scale: 1.0, drop: 'gelee' },
    honig:    { name: 'Honigpuffel',     lvl: 3,  model: 'blob',     color: 0xf2c14e, scale: 1.25, drop: 'gelee', crown: true },
    pilz:     { name: 'Pilzling',        lvl: 5,  model: 'mushroom', color: 0xd9534f, scale: 1.0, drop: 'kappe' },
    giftpilz: { name: 'Giftpilzling',    lvl: 8,  model: 'mushroom', color: 0x8e5bd0, scale: 1.3, drop: 'kappe', aggro: true, toxic: true },
    krabbe:   { name: 'Steinkrabbe',     lvl: 10, model: 'crab',     color: 0x9aa7b5, scale: 1.1, drop: 'schere' },
    golem:    { name: 'Geröllgolem',     lvl: 13, model: 'golem',    color: 0x8b7d6b, scale: 1.3, drop: 'kern' },
    wolf:     { name: 'Schattenwolf',    lvl: 16, model: 'wolf',     color: 0x3b3a55, scale: 1.2, drop: 'pelz', aggro: true, speed: 7 },
    irrlicht: { name: 'Irrlicht',        lvl: 19, model: 'wisp',     color: 0x7df9ff, scale: 1.0, drop: 'funke', aggro: true },
    kaefer:   { name: 'Glutkäfer',       lvl: 22, model: 'beetle',   color: 0xff6a2a, scale: 1.3, drop: 'glut' },
    asche:    { name: 'Aschengeist',     lvl: 25, model: 'ghost',    color: 0xb0a8a0, scale: 1.4, drop: 'asche', aggro: true },
    waechter: { name: 'Wolkenwächter',   lvl: 28, model: 'guardian', color: 0xf4f8ff, scale: 1.5, drop: 'feder', aggro: true },
    koloss:   { name: 'Sturmkoloss',     lvl: 32, model: 'boss',     color: 0x4a5c94, glow: 0x7fe8ff, scale: 3.4, drop: 'herz', aggro: true, boss: true },
    frostpuffel:{ name: 'Frostpuffel',   lvl: 35, model: 'blob',     color: 0x8fd0ff, scale: 1.5, drop: 'eisgelee', crown: true },
    eiswolf:  { name: 'Eiswolf',         lvl: 39, model: 'wolf',     color: 0xc8d8ea, scale: 1.4, drop: 'eispelz', aggro: true, speed: 7.5 },
    moorpilz: { name: 'Moorpilzling',    lvl: 43, model: 'mushroom', color: 0x2f9a8a, scale: 1.6, drop: 'moorkappe', aggro: true, toxic: true },
    moorkrabbe:{ name: 'Moorkrabbe',     lvl: 47, model: 'crab',     color: 0x5a7a4a, scale: 1.5, drop: 'moorschere' },
    runengolem:{ name: 'Runengolem',     lvl: 51, model: 'golem',    color: 0x6a6a8a, glow: 0x9f7aff, scale: 1.7, drop: 'rune' },
    fluchgeist:{ name: 'Fluchgeist',     lvl: 56, model: 'ghost',    color: 0x7a5ab0, scale: 1.6, drop: 'fluchstoff', aggro: true },
    magmakaefer:{ name: 'Magmakäfer',    lvl: 61, model: 'beetle',   color: 0xffc23a, scale: 1.8, drop: 'magma', aggro: true },
    lavagolem:{ name: 'Lavagolem',       lvl: 67, model: 'golem',    color: 0x3a2622, glow: 0xff5a1a, scale: 2.0, drop: 'lavakern', aggro: true },
    sternlicht:{ name: 'Sternenlicht',   lvl: 72, model: 'wisp',     color: 0xffe07a, scale: 1.5, drop: 'sternstaub', aggro: true },
    himmelsritter:{ name: 'Himmelsritter', lvl: 78, model: 'guardian', color: 0xffe9b0, scale: 1.9, drop: 'ritterfeder', aggro: true },
    leerenwolf:{ name: 'Leerenwolf',     lvl: 83, model: 'wolf',     color: 0x1c1030, scale: 1.8, drop: 'leerenpelz', aggro: true, speed: 8 },
    leerengeist:{ name: 'Leerengeist',   lvl: 89, model: 'ghost',    color: 0x30204a, scale: 2.0, drop: 'leerenasche', aggro: true },
    aeonenwaechter:{ name: 'Äonenwächter', lvl: 95, model: 'guardian', color: 0xc8b0ff, scale: 2.3, drop: 'aeonensplitter', aggro: true },
    weltenkoloss:{ name: 'Weltenkoloss', lvl: 100, model: 'boss',    color: 0x4a2a5a, glow: 0xff7ae0, scale: 4.4, drop: 'weltenherz', aggro: true, boss: true },
    // Dungeon-Monster (Elite) und Endbosse
    d1a: { name: 'Wurzelpuffel',  lvl: 24, model: 'blob',     color: 0x4f8a3a, scale: 1.5, drop: 'marke1', aggro: true, elite: true },
    d1b: { name: 'Grabpilz',      lvl: 30, model: 'mushroom', color: 0x6a7a2a, scale: 1.6, drop: 'marke1', aggro: true, elite: true, toxic: true },
    d1c: { name: 'Moderwolf',     lvl: 36, model: 'wolf',     color: 0x3a4a2a, scale: 1.5, drop: 'marke1', aggro: true, elite: true, speed: 7 },
    d1boss: { name: 'Wurzelkönig Morg', lvl: 40, model: 'mushroom', color: 0x3f7a2a, scale: 4.4, drop: 'marke1', aggro: true, boss: true, toxic: true },
    d2a: { name: 'Frostkrabbe',   lvl: 44, model: 'crab',     color: 0x9fd0f0, scale: 1.6, drop: 'marke2', aggro: true, elite: true },
    d2b: { name: 'Eisgolem',      lvl: 50, model: 'golem',    color: 0xb8d8f0, glow: 0x7fe8ff, scale: 1.8, drop: 'marke2', aggro: true, elite: true },
    d2c: { name: 'Frostgeist',    lvl: 56, model: 'ghost',    color: 0xc8e8ff, scale: 1.7, drop: 'marke2', aggro: true, elite: true },
    d2boss: { name: 'Eiskönigin Ysra', lvl: 60, model: 'ghost', color: 0x9fd8ff, scale: 3.8, drop: 'marke2', aggro: true, boss: true },
    d3a: { name: 'Glutwolf',      lvl: 64, model: 'wolf',     color: 0x5a2418, scale: 1.7, drop: 'marke3', aggro: true, elite: true, speed: 8 },
    d3b: { name: 'Schlackenkäfer', lvl: 70, model: 'beetle',  color: 0xff4a1a, scale: 1.9, drop: 'marke3', aggro: true, elite: true },
    d3c: { name: 'Flammenlicht',  lvl: 76, model: 'wisp',     color: 0xff7a2a, scale: 1.6, drop: 'marke3', aggro: true, elite: true },
    d3boss: { name: 'Flammenfürst Kharn', lvl: 80, model: 'boss', color: 0x3a1c18, glow: 0xff6a1a, scale: 4.0, drop: 'marke3', aggro: true, boss: true },
    d4a: { name: 'Leerenkrabbe',  lvl: 84, model: 'crab',     color: 0x3a2a5a, scale: 1.9, drop: 'marke4', aggro: true, elite: true },
    d4b: { name: 'Leerenritter',  lvl: 90, model: 'guardian', color: 0x4a3a7a, scale: 2.1, drop: 'marke4', aggro: true, elite: true },
    d4c: { name: 'Leerenlicht',   lvl: 96, model: 'wisp',     color: 0xb060ff, scale: 1.8, drop: 'marke4', aggro: true, elite: true },
    d4boss: { name: 'Nihil, der Leerenherrscher', lvl: 100, model: 'guardian', color: 0x2a1c4a, scale: 4.6, drop: 'marke4', aggro: true, boss: true },
  };
  for (const k in MOBS) {
    const m = MOBS[k], L = m.lvl; m.id = k;
    m.hp = Math.round(30 + L * 14 + L * L * 2.2); m.atk = Math.round(4 + L * 2.6 + L * L * 0.022); m.def = Math.round(L * 1.2);
    m.exp = Math.round(10 + L * L * 1.6); m.gold = [L * 3, Math.round(L * 7 + L * L * 0.15)]; m.speed = m.speed || 5;
    if (m.elite) { m.hp = Math.round(m.hp * 2.2); m.atk = Math.round(m.atk * 1.25); m.exp = Math.round(m.exp * 2.6); m.gold = m.gold.map(v => v * 2); }
    if (m.boss) { m.hp *= 14; m.atk = Math.round(m.atk * 1.7); m.exp *= 18; m.gold = [L * 130, L * 190]; }
  }

  const ZONES = [
    { id: 'wiese',  name: 'Sonnenwiese',   x: 0,    z: 95,   r: 60, col: [0.45, 0.78, 0.36], mobs: [['puffel', 9], ['honig', 6]] },
    { id: 'hain',   name: 'Pilzhain',      x: 140,  z: 20,   r: 58, col: [0.42, 0.55, 0.50], mobs: [['pilz', 9], ['giftpilz', 7]] },
    { id: 'fels',   name: 'Felsgrund',     x: -150, z: 10,   r: 62, col: [0.60, 0.58, 0.52], mobs: [['krabbe', 9], ['golem', 7]] },
    { id: 'wald',   name: 'Dämmerwald',    x: -70,  z: -200, r: 75, col: [0.16, 0.36, 0.24], mobs: [['wolf', 10], ['irrlicht', 8]] },
    { id: 'glut',   name: 'Glutfeld',      x: 200,  z: -190, r: 70, col: [0.42, 0.24, 0.18], mobs: [['kaefer', 10], ['asche', 8]] },
    { id: 'frost',  name: 'Frostgipfel',   x: -250, z: 180,  r: 68, col: [0.92, 0.96, 1.05], mobs: [['frostpuffel', 9], ['eiswolf', 8]] },
    { id: 'moor',   name: 'Nebelmoor',     x: 40,   z: 272,  r: 64, col: [0.24, 0.36, 0.30], mobs: [['moorpilz', 9], ['moorkrabbe', 8]] },
    { id: 'ruinen', name: 'Runenödnis',    x: -300, z: -90,  r: 60, col: [0.50, 0.46, 0.56], mobs: [['runengolem', 8], ['fluchgeist', 8]] },
    { id: 'vulkan', name: 'Drachenschlund', x: -210, z: -255, r: 60, col: [0.20, 0.12, 0.11], mobs: [['magmakaefer', 9], ['lavagolem', 7]] },
  ];
  const ISLANDS = [
    { x: 250, z: 120, y: 60, r: 42, mobs: [['waechter', 5]] },
    { x: 335, z: 40,  y: 74, r: 34, mobs: [['waechter', 4]] },
    { x: 300, z: 235, y: 88, r: 52, mobs: [['waechter', 4], ['koloss', 1]] },
    { x: -210, z: -330, y: 125, r: 48, name: 'Sternenarchipel', mobs: [['sternlicht', 6], ['himmelsritter', 5]] },
    { x: 360,  z: -250, y: 155, r: 50, name: 'Leerenriff', mobs: [['leerenwolf', 6], ['leerengeist', 5]] },
    { x: -370, z: 110,  y: 185, r: 58, name: 'Thron der Äonen', mobs: [['aeonenwaechter', 7], ['weltenkoloss', 1]] },
  ];

  // Dungeons: drei Räume mit Elite-Monstern, am Ende der Endboss. mood = Himmel/Licht im Inneren
  const DUNGEONS = [
    { id: 'krypta', name: 'Wurzelkrypta', lvl: 20, max: 40, col: 0x6a8a5a, wall: 0x5a6a4a, glow: 0x9fff6a, amb: 'wald', mobs: ['d1a', 'd1b', 'd1c'], boss: 'd1boss', mood: { top: 0x0a1810, mid: 0x1c3a2a, hor: 0x3a5a44, fog: 0x22382a, sun: 1.0, hemi: 0.5, water: 0x143a2a } },
    { id: 'gruft',  name: 'Frostgruft',   lvl: 40, max: 60, col: 0x9fb8d0, wall: 0x7a94b0, glow: 0x7fe8ff, amb: 'frost', mobs: ['d2a', 'd2b', 'd2c'], boss: 'd2boss', mood: { top: 0x0c1830, mid: 0x2a4a7a, hor: 0x6a8ab8, fog: 0x3a5a88, sun: 1.2, hemi: 0.6, water: 0x1c3a6a } },
    { id: 'kern',   name: 'Glutkern',     lvl: 60, max: 80, col: 0x7a4a3a, wall: 0x4a2a24, glow: 0xff7a2a, amb: 'glut', mobs: ['d3a', 'd3b', 'd3c'], boss: 'd3boss', mood: { top: 0x1a0606, mid: 0x5a1a0c, hor: 0xb8401a, fog: 0x5a2010, sun: 1.3, hemi: 0.5, water: 0x8a2a0c } },
    { id: 'spalt',  name: 'Leerenspalt',  lvl: 80, max: 100, col: 0x5a4a8a, wall: 0x3a2a5a, glow: 0xb060ff, amb: 'ruinen', mobs: ['d4a', 'd4b', 'd4c'], boss: 'd4boss', mood: { top: 0x040208, mid: 0x1c0c3a, hor: 0x4a2a7a, fog: 0x1c1030, sun: 0.9, hemi: 0.5, water: 0x1a0c3a } },
  ];

  const NPCS = [
    { id: 'mira',  name: 'Älteste Mira',   role: 'Quests',        x: 6,   z: 10,  color: 0xb46ad6, hair: 0xeeeeee },
    { id: 'tessa', name: 'Händlerin Tessa', role: 'Laden',        x: -12, z: 6,   color: 0xe08a3a, hair: 0x8a4b20 },
    { id: 'borin', name: 'Schmied Borin',  role: 'Verbesserung',  x: -10, z: -12, color: 0x6b6b78, hair: 0x2a2a2a },
    { id: 'kaela', name: 'Meisterin Kaela', role: 'Klassen',      x: 12,  z: -10, color: 0x3a8ad6, hair: 0x1c2a66 },
    { id: 'ivo',   name: 'Flugmeister Ivo', role: 'Flugbretter',  x: 18,  z: 4,   color: 0x4fc0a8, hair: 0xffd23c },
  ];

  // items: [id, Anzahl, Seltenheit]; 'W'/'A' = passende Waffe/Rüstung der Klasse für die Stufe
  const Q = (name, text, o) => Object.assign({ name, text }, o);
  const QUESTS = [
    Q('Puffelplage', 'Die Puffel auf der Sonnenwiese südlich des Dorfes fressen unsere Beete leer. Vertreibe ein paar von ihnen!', { kill: 'puffel', n: 6, lvl: 1, exp: 60, gold: 80, items: [['apfel', 5]] }),
    Q('Honigdiebe', 'Die gelben Honigpuffel sind noch dreister. Zeig ihnen, wem der Honig gehört.', { kill: 'honig', n: 8, lvl: 2, exp: 220, gold: 150, items: [['w_eisen', 1, 1]] }),
    Q('Pilzsuppe', 'Im Pilzhain im Osten wachsen wandelnde Pilzlinge. Bring mir 6 Pilzkappen für meine Suppe.', { collect: 'kappe', n: 6, lvl: 4, exp: 520, gold: 250, items: [['hp1', 5], ['a_1', 1, 1]] }),
    Q('Giftige Nachbarn', 'Die violetten Giftpilzlinge greifen Reisende an. Besiege 10 von ihnen – Ivo hat dafür ein Flugbrett für dich!', { kill: 'giftpilz', n: 10, lvl: 6, exp: 1400, gold: 400, items: [['brett1', 1]] }),
    Q('Scherenschleifer', 'Im Felsgrund im Westen hausen Steinkrabben. Erlege 12 davon. (Tipp: Ab Stufe 10 kannst du bei Kaela eine Klasse wählen.)', { kill: 'krabbe', n: 12, lvl: 9, exp: 3200, gold: 700, items: [['splitter', 2]] }),
    Q('Wandelnde Felsen', 'Geröllgolems blockieren die Wege im Felsgrund. Zerschlage 10 von ihnen.', { kill: 'golem', n: 10, lvl: 12, exp: 5600, gold: 1100, items: [['splitter', 2], ['hp1', 10]] }),
    Q('Wolfsjagd', 'Im Dämmerwald im Norden jagen Schattenwölfe in Rudeln. Sei vorsichtig – sie greifen sofort an. Besiege 14.', { kill: 'wolf', n: 14, lvl: 15, exp: 10500, gold: 1800, items: [['hp2', 5], ['A', 1, 1]] }),
    Q('Lichter im Wald', 'Die Irrlichter locken Wanderer ins Verderben. Lösche 12 von ihnen aus.', { kill: 'irrlicht', n: 12, lvl: 18, exp: 16000, gold: 2600, items: [['splitter', 3], ['W', 1, 1]] }),
    Q('Heiße Sohlen', 'Auf dem Glutfeld im Nordosten krabbeln Glutkäfer. Sammle 10 Glutpanzer für Borins Esse.', { collect: 'glut', n: 10, lvl: 21, exp: 24000, gold: 3600, items: [['splitter', 3]] }),
    Q('Asche zu Asche', 'Aschengeister steigen aus den Spalten des Glutfelds. Banne 12 von ihnen.', { kill: 'asche', n: 12, lvl: 24, exp: 34000, gold: 5000, items: [['hp2', 10], ['mp2', 10]] }),
    Q('Über den Wolken', 'Im Südosten, jenseits des Pilzhains, schweben die Himmelsinseln. Fliege hinauf und besiege 10 Wolkenwächter.', { kill: 'waechter', n: 10, lvl: 27, exp: 48000, gold: 7000, items: [['splitter', 5], ['W', 1, 2]] }),
    Q('Der Sturmkoloss', 'Auf der höchsten der drei Inseln wacht der Sturmkoloss. Niemand hat ihn je bezwungen. Wirst du die Legende sein?', { kill: 'koloss', n: 1, lvl: 30, exp: 120000, gold: 25000, items: [['splitter', 10], ['A', 1, 2]] }),
    Q('Kalte Füße', 'Du hast den Koloss bezwungen – doch die Welt ist größer. Auf dem Frostgipfel im Südwesten hüpfen Frostpuffel. Besiege 14.', { kill: 'frostpuffel', n: 14, lvl: 33, exp: 150000, gold: 14000, items: [['hp3', 5], ['splitter', 4]] }),
    Q('Weißes Rudel', 'Die Eiswölfe des Frostgipfels wagen sich bis an die Wege. Erlege 14 von ihnen.', { kill: 'eiswolf', n: 14, lvl: 37, exp: 210000, gold: 20000, items: [['W', 1, 2]] }),
    Q('Nebelernte', 'Im Nebelmoor ganz im Süden wachsen seltene Moorkappen. Bring mir 10 Stück.', { collect: 'moorkappe', n: 10, lvl: 41, exp: 290000, gold: 28000, items: [['A', 1, 2], ['mp3', 8]] }),
    Q('Scheren im Schlamm', 'Moorkrabben zerschneiden unsere Fischernetze. Besiege 14.', { kill: 'moorkrabbe', n: 14, lvl: 45, exp: 380000, gold: 36000, items: [['splitter', 6]] }),
    Q('Alte Zeichen', 'In der Runenödnis im Westen erwachen Golems aus alter Zeit. Zerschlage 14 Runengolems.', { kill: 'runengolem', n: 14, lvl: 49, exp: 500000, gold: 46000, items: [['W', 1, 3]] }),
    Q('Verfluchte Seelen', 'Die Fluchgeister der Ödnis lassen niemanden ruhen. Banne 14. (Ab Stufe 60 wartet Kaela mit deiner zweiten Berufung.)', { kill: 'fluchgeist', n: 14, lvl: 54, exp: 660000, gold: 58000, items: [['A', 1, 3], ['hp3', 10]] }),
    Q('Im Drachenschlund', 'Im Nordwesten, hinter dem Dämmerwald, brodelt der Drachenschlund. Sammle 12 Magmapanzer.', { collect: 'magma', n: 12, lvl: 59, exp: 850000, gold: 72000, items: [['splitter', 8]] }),
    Q('Herzen aus Lava', 'Lavagolems formen sich aus dem Gestein des Schlunds. Besiege 14.', { kill: 'lavagolem', n: 14, lvl: 65, exp: 1100000, gold: 90000, items: [['W', 1, 3], ['hp4', 8]] }),
    Q('Sternenfänger', 'Hoch über dem Drachenschlund schwebt das Sternenarchipel – steig mit dem Flugbrett weit hinauf. Besiege dort 14 Sternenlichter.', { kill: 'sternlicht', n: 14, lvl: 70, exp: 1400000, gold: 110000, items: [['A', 1, 3], ['mp4', 8]] }),
    Q('Ritter des Himmels', 'Die Himmelsritter dulden keine Sterblichen. Bezwinge 12 von ihnen.', { kill: 'himmelsritter', n: 12, lvl: 76, exp: 1800000, gold: 135000, items: [['splitter', 10]] }),
    Q('Am Rand der Leere', 'Im Nordosten zerfällt der Himmel am Leerenriff. Erlege 14 Leerenwölfe.', { kill: 'leerenwolf', n: 14, lvl: 81, exp: 2300000, gold: 160000, items: [['W', 1, 4]] }),
    Q('Stimmen aus dem Nichts', 'Die Leerengeister flüstern vom Ende der Welt. Bringe 14 zum Schweigen.', { kill: 'leerengeist', n: 14, lvl: 87, exp: 2900000, gold: 190000, items: [['A', 1, 4]] }),
    Q('Wächter der Ewigkeit', 'Ganz im Westen, höher als alles andere, liegt der Thron der Äonen. Besiege 12 Äonenwächter.', { kill: 'aeonenwaechter', n: 12, lvl: 93, exp: 3700000, gold: 230000, items: [['splitter', 15], ['hp4', 15]] }),
    Q('Der Weltenkoloss', 'Auf dem Thron sitzt der Weltenkoloss – der Ursprung aller Stürme. Dies ist dein letzter Kampf.', { kill: 'weltenkoloss', n: 1, lvl: 98, exp: 9000000, gold: 1000000, items: [['W', 1, 4], ['A', 1, 4]] }),
  ];

  const HAIRS = [0x5a3a22, 0xf2d16b, 0xd6453c, 0x3c6ad6, 0xe98ad0, 0xeeeeee];
  const MAXLVL = 100;
  const expNeed = l => Math.floor(40 * Math.pow(l, 1.9));

  return { CLASSES, SPECS, SKILLS, RAR, SETS, SETF, DUNGEONS, ITEMS, MOBS, ZONES, ISLANDS, NPCS, QUESTS, HAIRS, MAXLVL, expNeed };
})();
