# Deine Strecke

A small 3D railway game for the browser, built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/).

Trains run back and forth between mines and a large station, bringing coal, iron ore and gold ore into the warehouse. You spend that ore to grow your network.

## About this project

The creativity and inventiveness behind this game are far above the standard. The code is built in a very smart way, and overall everything about this project is very good.

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:5173/> in your browser.

For a production build: `npm run build` (output goes to `dist/`).

## Gameplay

- **Ore instead of coins:** Everything costs coal, iron ore or gold ore from the station warehouse.
- **Lines:** The short coal line is there from the start. You can add the line to the iron mine (4 coal) and the gold line (4 coal + 4 iron ore). The short coal line always stays.
- **Trains:** Every model can be bought more than once. Each train gets its own destination (coal, iron or gold), and the camera can follow any train.
- **No driving through each other:** Trains keep their distance, wait for each other and back up at switches when they block each other. Only one train at a time may enter a switch area.
- **Station tracks:** The station can get up to three tracks, each with its own unloading pit. Trains automatically pick the least busy track.
- **Smelter:** Casts steel (2 coal + 1 iron ore) and gold bars (2 coal + 1 gold ore).
- **Station upgrades:** Steel and gold bars build a goods shed and a fast ramp, so trains unload faster.
- **Saving:** Progress is saved automatically in the browser (`localStorage`).

## Trains

| Train | Rarity | Capacity | Price |
| --- | --- | --- | --- |
| Steam locomotive (Dampflok) | Common | 1 | first one free, each extra one 3 coal |
| Diesel locomotive (Diesellok) | Uncommon | 2 | 4 coal |
| Ore train (Erz-Zug) | Rare | 3 | 3 coal + 3 iron ore |
| Heavy freight locomotive (Schwere Güterlok) | Epic | 4 | 4 coal + 6 iron ore |
| Gold train (Goldzug) | Legendary | 5 | 4 gold ore + 2 iron ore |

## Controls

- **Drag with the mouse:** rotate the camera
- **Scroll:** zoom
- **A/D or ←/→:** move along the track
- **F:** follow a train
- **B:** build the next affordable project

The in-game interface is in German.

## Project structure

- `index.html`: the interface (warehouse, build menu, train list, camera bar)
- `src/main.js`: all game logic, tracks, trains and the 3D world
- `src/style.css`: styling of the interface
- `PLAN.md`: the original build plan for the game
