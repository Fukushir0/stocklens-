# Wolkenreich

Ein eigenständiges 3D-Browser-Rollenspiel im Stil klassischer Anime-Fantasy-MMORPGs:
Monster jagen, Stufen aufsteigen, eine Klasse wählen, Ausrüstung verbessern – und mit dem
Flugbrett zu den Himmelsinseln fliegen. Einzelspieler, läuft komplett im Browser.

## Starten

- `wolkenreich-standalone.html` doppelklicken (eine Datei, alles enthalten), **oder**
- `index.html` öffnen (lädt `style.css`, `three.min.js`, `data.js`, `gfx.js`, `models.js`, `game.js`).

Nach Änderungen am Code: `node build.js` erzeugt die Standalone-Datei neu.

## Inhalt

- Offene Welt mit Dorf Luminhafen, 5 Zonen und 3 Himmelsinseln, 12 Monsterarten inkl. Boss
- 4 Klassen ab Stufe 10 (Klingenkämpfer, Arkanist, Waldläufer, Kleriker) mit je 3 Fertigkeiten
- Attribute (STR/STA/DEX/INT), Stufen bis 40, 12 aufeinander aufbauende Quests
- Inventar, Händler, Beute, Ausrüstungsverbesserung bis +10 beim Schmied
- Fliegen mit Flugbrett, Minimap, automatisches Speichern (localStorage)

## Grafik

Alles wird prozedural im Code erzeugt – Texturen (Gras, Rinde, Laub, Fachwerk, Dachziegel,
Pflaster, Wasser), Modelle und Effekte, ohne externe Dateien:

- Echtzeit-Schatten, Himmel mit Sonne, Umgebungslicht, animiertes Wasser, Nebel und ferne Inseln
- Wiegendes Gras und Blumen, sechs Baumarten, Riesenpilze, Felsen, Kristalle
- Fachwerkdorf mit Marktstand, Schmiede, Laternen und schwebendem Kristallmonument
- Figuren mit Gelenken, Gesichtern, Frisuren und Lauf-, Sprung-, Flug- und Angriffsanimationen
- Eigenes Outfit und eigene Waffen je Klasse (Rüstung und Umhang, Robe und Hut, Kapuze und Bogen, Heiligenschein und Zepter)
- Partikeleffekte für Treffer, Fertigkeiten, Stufenaufstieg und jedes Gebiet

Unter Hilfe (`H`) lässt sich die Qualität auf Hoch, Mittel oder Niedrig stellen; bei niedriger
Bildrate schaltet das Spiel selbst herunter.

| Datei | Inhalt |
|---|---|
| `data.js` | Klassen, Fertigkeiten, Gegenstände, Monster, Zonen, Quests |
| `gfx.js` | Renderer, Texturen, Welt, Partikel, Effekte |
| `models.js` | Helden, Outfits, Waffen, Monster und ihre Animationen |
| `game.js` | Spiellogik, Steuerung, Oberfläche, Speichern |

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Klick auf Boden | laufen |
| Maus ziehen / Mausrad | Kamera drehen / zoomen |
| Klick auf Monster, 2. Klick oder `1` | auswählen / angreifen |
| `Tab` | nächstes Ziel |
| `2`–`5` | Fertigkeiten |
| `6` / `7` | Heil- / Manatrank |
| `F` oder `8` | fliegen (Leertaste steigen, `X` sinken) |
| `C` `I` `L` `H` | Charakter, Inventar, Quests, Hilfe |

Grafik: [three.js](https://threejs.org) r160 (MIT, siehe `three.LICENSE`). Alle Modelle werden
im Code aus einfachen Formen erzeugt – keine externen Assets.
