# Wolkenreich

Ein eigenständiges 3D-Browser-Rollenspiel im Stil klassischer Anime-Fantasy-MMORPGs:
Monster jagen, Stufen aufsteigen, eine Klasse wählen, Ausrüstung verbessern – und mit dem
Flugbrett zu den Himmelsinseln fliegen. Einzelspieler, läuft komplett im Browser.

## Starten

- `wolkenreich-standalone.html` doppelklicken (eine Datei, alles enthalten), **oder**
- `index.html` öffnen (lädt `style.css`, `three.min.js`, `data.js`, `gfx.js`, `models.js`, `music.js`, `game.js`).

Nach Änderungen am Code: `node build.js` erzeugt die Standalone-Datei neu.

## Inhalt

- Offene Welt mit Dorf Luminhafen, 9 Gebieten und 6 Himmelsinseln, 26 Monsterarten inkl. zwei Bossen
- Stufen bis 100, Attribute (STR/STA/DEX/INT), 26 aufeinander aufbauende Quests
- 4 Klassen ab Stufe 10 (Klingenkämpfer, Arkanist, Waldläufer, Kleriker) mit je 3 Fertigkeiten
- Zweite Klassenstufe ab Stufe 60: zwei Wege je Klasse (z. B. Sturmritter oder Berserker) mit je 3 weiteren Fertigkeiten
- Inventar, Taler als Währung, Händler und Beute
- Verbesserung von Waffen, Rüstung und Accessoires bis +10 beim Schmied: Sternsplitter, ab +4 zusätzlich Verbesserungsrollen, sinkende Erfolgschance (100 % bei +1 bis 10 % bei +10)
- Seltenheitsgrade für Waffen und Rüstungen: Bronze, Silber, Gold, Platin, Diamant (bis +80 % Werte)
- Vier Rüstungsplätze (Helm, Rüstung, Handschuhe, Stiefel) mit eigenem Rüstungs-Set je Klasse: Bonus, wenn alle vier denselben Seltenheitsgrad haben
- Sechs Accessoire-Plätze (2 Ringe, 2 Ohrringe, Halskette, Armreif) mit eigener Kollektion je Klasse; Accessoires gibt es nur in Dungeons und von Bossen
- Legendäre Waffen (ab Stufe 60) und blutige Waffen (ab Stufe 80) mit eigenen Boni – nur als sehr seltene Boss-Beute
- Vier Dungeons mit Elite-Monstern und Endboss: Wurzelkrypta (20–40), Frostgruft (40–60), Glutkern (60–80), Leerenspalt (80–100); die Portale stehen rund ums Dorf. Dungeon-Monster greifen von selbst an und verfolgen dich; eine Barriere öffnet sich erst, wenn der Raum geräumt ist
- Große Weltkarte (`M`) mit Gebieten, Stufenbereichen, Orten, Dungeon-Portalen und Questziel
- Drei Dörfer (Luminhafen, Birkenau, Aschenfurt) und sechs Stationen mit Händlern; Wegsteine erlauben Schnellreisen zu besuchten Orten
- Musik, die live im Browser erzeugt wird und je nach Ort wechselt (Dorf, Wildnis, Himmel, dunkle Gebiete und Dungeons, Bosskampf); Knopf 🎵 schaltet laut, leise, aus
- Zusammen spielen über die veröffentlichte Seite: Wer sie gleichzeitig offen hat, sieht die anderen als Figuren in der Welt und kann chatten (`Enter`). Monster, Beute und Fortschritt bleiben pro Spieler getrennt; die Einzeldatei ist immer Einzelspieler
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
| `2`–`8` | Fertigkeiten |
| `9` / `0` | Heil- / Manatrank |
| `F` | fliegen (Leertaste steigen, `X` sinken) |
| `C` `I` `L` `M` `H` | Charakter, Inventar, Quests, Karte, Hilfe |

Grafik: [three.js](https://threejs.org) r160 (MIT, siehe `three.LICENSE`). Alle Modelle werden
im Code aus einfachen Formen erzeugt – keine externen Assets.
