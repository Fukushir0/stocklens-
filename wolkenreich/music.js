'use strict';
/* Wolkenreich – Musik: wird live im Browser erzeugt (Web Audio), keine Audiodateien */
const MUSIC = (() => {
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
  const _ = null;
  // Melodien als Tonleiterstufen pro Achtelnote (8 Takte × 8 Achtel); null = Pause
  const MEL = {
    hell: [[4, _, 2, _, 4, _, 7, _], [8, _, 6, _, 4, _, 6, _], [9, _, 7, _, 5, _, 7, 8], [7, _, 5, _, 3, _, _, _], [4, _, 7, _, 9, _, 7, _], [8, _, 6, _, 8, _, 11, _], [10, _, 9, _, 7, _, 5, _], [6, _, 8, _, 6, _, 4, _]],
    weit: [[7, _, _, 9, _, _, 11, _], [11, _, 8, _, _, _, 6, _], [12, _, _, 9, _, 7, _, _], [10, _, _, _, 7, _, 5, _], [7, _, 9, _, 11, _, 14, _], [13, _, _, 11, _, _, 8, _], [10, _, 12, _, 10, _, 7, _], [8, _, _, _, 6, _, _, _]],
    dunkel: [[7, _, _, _, _, _, 9, _], [_, _, 10, _, _, _, _, _], [8, _, _, _, 7, _, _, _], [_, _, _, _, 6, _, _, _], [7, _, _, _, _, _, 11, _], [_, _, 10, _, _, _, 9, _], [8, _, _, _, _, _, 5, _], [6, _, _, _, _, _, _, _]],
    kampf: [[7, 7, 9, 7, 11, _, 9, _], [12, _, 10, 9, 10, _, 7, _], [13, 13, 11, 13, 14, _, 11, _], [11, _, 9, 8, 6, _, 8, _], [7, 9, 11, 9, 14, _, 11, _], [12, 10, 12, 14, 15, _, 12, _], [13, 11, 13, 15, 16, _, 13, _], [11, 13, 11, 8, 11, _, _, _]],
  };
  const MOODS = {
    town:  { bpm: 88,  root: 60, scale: 'major',  prog: [0, 4, 5, 3, 0, 4, 3, 4], mel: 'hell',   arp: [0, 2, 4, 7, 4, 2, 4, 2], pad: 0.5, lead: 'triangle', drums: 0, bass: 1 },
    field: { bpm: 104, root: 62, scale: 'major',  prog: [0, 4, 5, 3, 0, 4, 3, 4], mel: 'hell',   arp: [0, 4, 7, 4, 2, 4, 7, 9], pad: 0.4, lead: 'square',   drums: 1, bass: 2 },
    sky:   { bpm: 76,  root: 65, scale: 'major',  prog: [0, 3, 4, 5, 0, 3, 5, 4], mel: 'weit',   arp: [7, 9, 11, 14, 11, 9, 11, 9], pad: 0.7, lead: 'sine', drums: 0, bass: 1 },
    dark:  { bpm: 72,  root: 57, scale: 'minor',  prog: [0, 5, 3, 4, 0, 5, 6, 4], mel: 'dunkel', arp: [0, _, 4, _, 2, _, 4, _], pad: 0.8, lead: 'sine',     drums: 0, bass: 1 },
    boss:  { bpm: 140, root: 50, scale: 'minor',  prog: [0, 5, 6, 4, 0, 5, 3, 4], mel: 'kampf',  arp: [0, 4, 7, 4, 9, 7, 4, 7], pad: 0.35, lead: 'sawtooth', drums: 2, bass: 3 },
  };
  let ctx = null, master = null, send = null, mood = 'town', next = 'town', step = 0, tNext = 0, timer = null, vol = 0.5, noiseBuf = null;
  try { const v = localStorage.getItem('wolkenreich_music'); if (v !== null) vol = +v; } catch (e) { /* egal */ }
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);
  const note = (M, deg) => { const sc = SCALES[M.scale], o = Math.floor(deg / 7); return M.root + sc[((deg % 7) + 7) % 7] + o * 12; };
  function tone(type, f, t, dur, gain, opt = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (opt.detune) o.detune.value = opt.detune;
    const a = opt.attack || 0.01; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g; if (opt.lp) { const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = opt.lp; g.connect(flt); out = flt; }
    o.connect(g); out.connect(master); if (opt.echo) out.connect(send); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, gain, hp) { const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp; g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02); }
  function kick(t, gain) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.22); }
  function schedule(t) {
    const M = MOODS[mood], e = 60 / M.bpm / 2, bar = Math.floor(step / 8) % 8, i = step % 8, root = M.prog[bar];
    if (i === 0) { // Fläche: Akkord über den ganzen Takt
      for (const d of [0, 2, 4]) for (const dt of [-7, 7]) tone('sawtooth', freq(note(M, root + d)), t, e * 8.2, 0.035 * M.pad, { attack: e * 2, lp: 900, detune: dt });
      tone('triangle', freq(note(M, root) - 24), t, e * 7.5, M.bass === 1 ? 0.16 : 0.05, { attack: 0.04, lp: 400 });
    }
    if (M.bass >= 2 && (M.bass === 3 || i % 2 === 0)) tone('triangle', freq(note(M, root + (i === 6 ? 4 : 0)) - 24), t, e * 0.9, 0.2, { lp: 500 });
    const a = M.arp[i]; if (a !== null) tone('triangle', freq(note(M, root + a)), t, e * 1.4, 0.05, { echo: true, lp: 2600 });
    const m = MEL[M.mel][bar][i]; if (m !== null) tone(M.lead, freq(note(M, m) + 12), t, e * (M.mel === 'dunkel' ? 5 : 2.2), M.lead === 'sine' ? 0.1 : M.lead === 'triangle' ? 0.09 : 0.045, { echo: true, attack: 0.02, lp: M.lead === 'sawtooth' ? 2400 : 3600 });
    if (M.drums) { if (i === 0 || i === 4 || (M.drums === 2 && i === 3)) kick(t, M.drums === 2 ? 0.5 : 0.22); if (M.drums === 2 && (i === 2 || i === 6)) noise(t, 0.12, 0.16, 1800); noise(t, 0.04, M.drums === 2 ? 0.05 : i % 2 ? 0.02 : 0.035, 7000); }
  }
  function tick() {
    if (!ctx || vol <= 0) return; if (tNext < ctx.currentTime) tNext = ctx.currentTime + 0.05;
    while (tNext < ctx.currentTime + 0.35) { if (step % 8 === 0 && next !== mood) { mood = next; step = 0; } schedule(tNext); tNext += 60 / MOODS[mood].bpm / 2; step++; }
  }
  return {
    start() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = vol * 0.6; const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
        send = ctx.createGain(); send.gain.value = 0.35; const dl = ctx.createDelay(1), fb = ctx.createGain(); dl.delayTime.value = 0.34; fb.gain.value = 0.32; send.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        timer = setInterval(tick, 90);
      } catch (e) { ctx = null; }
    },
    setMood(m) { if (MOODS[m]) next = m; },
    get volume() { return vol; },
    setVolume(v) { vol = v; if (master) master.gain.setTargetAtTime(v * 0.6, ctx.currentTime, 0.1); try { localStorage.setItem('wolkenreich_music', v); } catch (e) { /* egal */ } },
    get mood() { return mood; },
  };
})();
