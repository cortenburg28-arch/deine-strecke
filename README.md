# Deine Strecke

Ein kleines 3D-Eisenbahnspiel im Browser, gebaut mit [Three.js](https://threejs.org/) und [Vite](https://vite.dev/).

Züge fahren zwischen Minen und einem großen Bahnhof hin und her, bringen Kohle, Eisenerz und Golderz ins Lager, und mit dem Erz baust du dein Netz aus.

## Starten

```bash
npm install
npm run dev
```

Danach im Browser <http://localhost:5173/> öffnen.

Für eine fertige Version: `npm run build` (Ausgabe in `dist/`).

## Spielidee

- **Erz statt Münzen:** Alles kostet Kohle, Eisenerz oder Golderz aus dem Lager am Bahnhof.
- **Strecken:** Die kurze Kohlestrecke gibt es von Anfang an. Dazu kommen das Gleis zur Eisenmine (4 Kohle) und die Goldstrecke (4 Kohle + 4 Eisenerz). Die kurze Kohlestrecke bleibt immer erhalten.
- **Züge:** Jedes Modell kann mehrmals gekauft werden. Jeder Zug bekommt sein eigenes Ziel (Kohle, Eisen oder Gold), und die Kamera kann jedem Zug folgen.
- **Kein Durchfahren:** Züge halten Abstand, warten voreinander und setzen an Weichen zurück, wenn sie sich gegenseitig blockieren. In jeden Weichenbereich darf immer nur ein Zug einfahren.
- **Bahnhofsgleise:** Der Bahnhof kann bis zu drei Gleise mit eigener Entladestelle bekommen. Die Züge nehmen automatisch das freieste Gleis.
- **Schmelzhütte:** Gießt Stahl (2 Kohle + 1 Eisenerz) und Goldbarren (2 Kohle + 1 Golderz).
- **Bahnhof ausbauen:** Mit Stahl und Goldbarren entstehen Güterschuppen und Schnellrampe, die Züge entladen dann schneller.
- **Speichern:** Der Spielstand wird automatisch im Browser gespeichert (`localStorage`).

## Züge

| Zug | Seltenheit | Ladung | Preis |
| --- | --- | --- | --- |
| Dampflok | Gewöhnlich | 1 | erste gratis, jede weitere 3 Kohle |
| Diesellok | Ungewöhnlich | 2 | 4 Kohle |
| Erz-Zug | Selten | 3 | 3 Kohle + 3 Eisenerz |
| Schwere Güterlok | Episch | 4 | 4 Kohle + 6 Eisenerz |
| Goldzug | Legendär | 5 | 4 Golderz + 2 Eisenerz |

## Steuerung

- **Maus ziehen:** Kamera drehen
- **Scrollen:** zoomen
- **A/D oder ←/→:** an der Strecke entlang fahren
- **F:** Zug folgen
- **B:** das nächste bezahlbare Bauprojekt bauen

## Aufbau

- `index.html`: Oberfläche (Lager, Bau-Menü, Zugliste, Kamera-Leiste)
- `src/main.js`: die ganze Spiellogik, Strecken, Züge und 3D-Welt
- `src/style.css`: Aussehen der Oberfläche
- `PLAN.md`: der ursprüngliche Bauplan des Spiels
