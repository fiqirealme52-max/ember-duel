// main.js — the loop of Ember Duel: boot, input, and the turn flow between the player
// and the AI. One job: run the game the rules describe and the screen shows.
import { newGame, resolveRound, foeHint } from './rules.js';
import { chooseFoeCard, foeTell } from './ai.js';
import { renderScreen } from './render.js';
import { stageShot } from './shots.js';
import { playClick, playFlip, playHit, playHeal, playShield, playWin, playLose, setMuted, isMuted } from './audio.js';

const root = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') || '1', 10);
const shotSeed = Number.isInteger(seedParam) && shotSeedIsPositive(seedParam) ? seedParam : 1;

function shotSeedIsPositive(value) {
  return value > 0;
}

let state;
if (shotName) {
  state = stageShot(shotName, shotSeed);
} else {
  // An explicit ?seed= makes an interactive game replayable (testing and replays);
  // without one the seed is random, as a played game should be.
  const interactiveSeed = params.has('seed') ? shotSeed : Math.floor(Math.random() * 100000) + 1;
  state = newGame(interactiveSeed);
  state.phase = 'title';
}

window.__ember = { state, shot: shotName || null, seed: state.seed };

function draw() {
  renderScreen(root, state, state.phase === 'play' ? foeTell(state) : '');
  const muteButton = root.querySelector('[data-action="mute"]');
  if (muteButton) muteButton.textContent = isMuted() ? 'SUARA: MATI' : 'SUARA: NYALA';
  window.__ember = { state, shot: shotName || null, seed: state.seed };
}

function startDuel() {
  playClick();
  state.phase = 'play';
  draw();
}

function playCard(cardId) {
  if (state.phase !== 'play') return;
  const card = state.player.hand.find((held) => held.id === cardId);
  if (!card) return;
  playFlip();
  // The foe's card was locked in before this round (the telegraph on the table);
  // the player chooses against a card that cannot change any more.
  const foeCard = state.telegraph || chooseFoeCard(state);
  const summary = resolveRound(state, card, foeCard);
  if (summary.playerHealed > 0 || summary.foeHealed > 0) playHeal();
  else if (summary.playerShielded || summary.foeShielded) playShield();
  else if (summary.playerDamage > 0 || summary.foeDamage > 0) playHit();
  draw();
  if (state.phase === 'over') {
    if (state.winner === 'player') playWin();
    else playLose();
  }
}

function restartDuel() {
  playClick();
  state = newGame(Math.floor(Math.random() * 100000) + 1);
  state.phase = 'play';
  draw();
}

root.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button) {
    const action = button.getAttribute('data-action');
    if (action === 'start') startDuel();
    else if (action === 'restart') restartDuel();
    else if (action === 'mute') {
      setMuted(!isMuted());
      draw();
    }
    return;
  }
  const card = event.target.closest('[data-card-id]');
  if (card) playCard(card.getAttribute('data-card-id'));
});

document.addEventListener('keydown', (event) => {
  if (state.phase !== 'play') return;
  const index = Number.parseInt(event.key, 10) - 1;
  if (Number.isInteger(index) && index >= 0 && index < state.player.hand.length) {
    playCard(state.player.hand[index].id);
  }
});

if (shotName) {
  draw();
  document.title = `Ember Duel — ${shotName}`;
} else {
  draw();
}
