'use strict';
/* Wolkenreich – Spieleserver (ohne Abhängigkeiten).
   Liefert das Spiel aus und verbindet alle Spieler über WebSocket: Jeder sendet seinen Zustand,
   der Server reicht ihn an alle anderen weiter. Start:  node server/server.js   (Port über PORT=8080) */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = +process.env.PORT || 8080, GAME = path.join(__dirname, '..', 'wolkenreich-standalone.html'), MAX = 8192, LIMIT = 200;
const clients = new Map(); let nextId = 1;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/?')) { fs.readFile(GAME, (e, d) => { if (e) { res.writeHead(500); return res.end('wolkenreich-standalone.html fehlt – bitte zuerst "node build.js" ausführen.'); } res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); res.end(d); }); }
  else if (req.url === '/status') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ spieler: clients.size })); }
  else { res.writeHead(404); res.end('Nicht gefunden'); }
});

function frame(text) { const p = Buffer.from(text), n = p.length; const h = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : Buffer.concat([Buffer.from([0x81, 127]), (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; })()]); return Buffer.concat([h, p]); }
const send = (c, obj) => { if (!c.sock.destroyed) c.sock.write(frame(JSON.stringify(obj))); };
const others = (c, obj) => { const f = frame(JSON.stringify(obj)); for (const o of clients.values()) if (o !== c && !o.sock.destroyed) o.sock.write(f); };

server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key']; if (req.url !== '/ws' || !key || clients.size >= LIMIT) return sock.destroy();
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64') + '\r\n\r\n');
  const c = { id: 's' + String(nextId++).padStart(6, '0'), sock, state: null, buf: Buffer.alloc(0), n: 0, t: Date.now() };
  const peers = {}; for (const o of clients.values()) if (o.state) peers[o.id] = o.state; clients.set(c.id, c); send(c, { t: 'hi', id: c.id, peers });
  const bye = () => { if (!clients.delete(c.id)) return; others(c, { t: 'l', id: c.id }); sock.destroy(); };
  sock.on('data', d => {
    c.buf = Buffer.concat([c.buf, d]); if (c.buf.length > MAX * 4) return bye();
    for (;;) {
      if (c.buf.length < 2) return; const op = c.buf[0] & 15, masked = c.buf[1] & 128; let len = c.buf[1] & 127, off = 2;
      if (len === 126) { if (c.buf.length < 4) return; len = c.buf.readUInt16BE(2); off = 4; } else if (len === 127) return bye();
      if (!masked || len > MAX) return bye(); if (c.buf.length < off + 4 + len) return;
      const mask = c.buf.subarray(off, off + 4), data = Buffer.from(c.buf.subarray(off + 4, off + 4 + len)); for (let i = 0; i < len; i++) data[i] ^= mask[i & 3]; c.buf = c.buf.subarray(off + 4 + len);
      if (op === 8) return bye(); if (op === 9) { sock.write(Buffer.concat([Buffer.from([0x8a, data.length]), data])); continue; } if (op !== 1) continue;
      const now = Date.now(); if (now - c.t > 1000) { c.t = now; c.n = 0; } if (++c.n > 40) continue;   // höchstens 40 Nachrichten pro Sekunde
      let m; try { m = JSON.parse(data.toString()); } catch (e) { continue; }
      if (m && m.t === 'p' && m.s && typeof m.s === 'object') { c.state = m.s; others(c, { t: 'p', id: c.id, s: m.s }); }
    }
  });
  sock.on('close', bye); sock.on('error', bye);
});
server.listen(PORT, () => console.log(`Wolkenreich-Server läuft: http://localhost:${PORT}  –  diesen Link (mit eurer Adresse statt localhost) an Mitspieler schicken.`));
