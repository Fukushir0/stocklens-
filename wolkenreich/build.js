// Baut eine einzelne, eigenständige HTML-Datei (alles inline): node build.js
const fs = require('fs'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
let html = rd('index.html');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${rd('style.css')}</style>`);
for (const f of ['three.min.js', 'data.js', 'game.js']) html = html.replace(`<script src="${f}"></script>`, () => `<script>\n${rd(f).replace(/<\/script/g, '<\\/script')}\n</script>`);
fs.writeFileSync(path.join(__dirname, 'wolkenreich-standalone.html'), html);
console.log('wolkenreich-standalone.html', (html.length / 1024).toFixed(0) + ' KB');

// Variante für die Veröffentlichung als Seite ohne eigenes Dokumentgerüst (three.js vom CDN)
if (process.argv[2]) {
  const body = rd('index.html').split('<body>')[1].split('<script')[0];
  const page = `<title>Wolkenreich</title>\n<style>\n${rd('style.css')}</style>\n${body}<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js"></script>\n<script>\n${rd('data.js')}\n</script>\n<script>\n${rd('game.js')}\n</script>\n`;
  fs.writeFileSync(process.argv[2], page); console.log(process.argv[2], (page.length / 1024).toFixed(0) + ' KB');
}
