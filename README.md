# Ember Duel

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/fiqirealme52-max/ember-duel/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/fiqirealme52-max/ember-duel/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Entry for the make.fun bounty [Make the best card game](https://make.fun/bounty/best-card-game-20261122-1826) ($50).

Ember Duel is an original elemental card duel, 1 vs 1 against an AI opponent. Both
sides start at 30 life with a hand of 5 cards from a 42-card deck. Each round both
sides reveal one card at once: attack cards carry an element (Api, Angin, Bumi, Air)
in a beating cycle worth +2 when it counters the foe's element, and the loser of the
round takes the difference as damage. Perisai blocks all damage for a round, Pulih
restores 5 life, and Ganda doubles your next round's attack. The AI plays a readable
policy — it heals when hurt, shields against heavy attacks, and sets up Ganda before
a big hit — so every hand is a decision you can play around.

## Run

Serve `game/` with any static server and open `game/index.html` in a desktop browser:

```sh
cd game && python3 -m http.server 8080
```

then open http://localhost:8080. No network request,
no build step: the game is plain HTML, CSS and ES modules, with WebAudio-synthesised
sound effects and no external assets.

`main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to `/output` and
writes `/output/dossier.json` with the vendored make.fun library.
