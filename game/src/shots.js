// shots.js — the screenshot scenes behind ?shot=title|play|win|loss. Each one plays the
// real rules forward from a fresh seeded game, steered by a simple autopilot, so every
// frame is what a short real game looks like and the same seed always gives the same frame.
import { elementBonus } from './deck.js';
import { newGame, resolveRound } from './rules.js';
import { chooseFoeCard } from './ai.js';

const MAX_SEARCH_SEEDS = 300;
const MAX_ROUNDS = 40;
const PLAY_ROUNDS = 6;

function bestAttack(hand, beatsElement) {
  const attacks = hand.filter((card) => card.kind === 'attack');
  if (attacks.length === 0) return null;
  let best = attacks[0];
  let bestScore = -1;
  for (const card of attacks) {
    const score = card.value + elementBonus(card.element, beatsElement) * 2;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

function firstOf(hand, kind) {
  return hand.find((card) => card.kind === kind) || null;
}

/** The good autopilot: heals and shields when hurt, sets up Ganda, then hits hardest. */
export function goodPilot(state) {
  const hand = state.player.hand;
  const lastFoePower = state.lastRound ? state.lastRound.foePower : 0;
  const lastFoeCard = state.lastRound ? state.lastRound.foeCard : '';
  const foeElement = ['Api', 'Angin', 'Bumi', 'Air'].find((name) => lastFoeCard.startsWith(name));
  const elementKey = foeElement === 'Api' ? 'fire' : foeElement === 'Angin' ? 'wind' : foeElement === 'Bumi' ? 'earth' : foeElement === 'Air' ? 'water' : null;

  const heal = firstOf(hand, 'heal');
  if (state.player.life <= 10 && heal) return heal;
  const shield = firstOf(hand, 'shield');
  if (state.player.life <= 12 && shield && lastFoePower >= 6) return shield;
  const ganda = firstOf(hand, 'double');
  const bigAttack = hand.find((card) => card.kind === 'attack' && card.value >= 7);
  if (ganda && bigAttack && !state.player.doubleNext) return ganda;

  const attack = bestAttack(hand, elementKey);
  if (attack) return attack;
  if (shield) return shield;
  if (heal) return heal;
  if (ganda) return ganda;
  return hand[0];
}

/** The bad autopilot: always the weakest attack, never a special — it loses on purpose. */
export function badPilot(state) {
  const attacks = state.player.hand.filter((card) => card.kind === 'attack');
  if (attacks.length > 0) {
    let worst = attacks[0];
    for (const card of attacks) if (card.value < worst.value) worst = card;
    return worst;
  }
  return firstOf(state.player.hand, 'shield') || firstOf(state.player.hand, 'heal') || firstOf(state.player.hand, 'double') || state.player.hand[0];
}

function simulate(state, pilot, maxRounds) {
  for (let round = 0; round < maxRounds && state.phase === 'play'; round += 1) {
    const playerCard = pilot(state);
    const foeCard = chooseFoeCard(state);
    resolveRound(state, playerCard, foeCard);
  }
  return state;
}

function findSeed(pilot, wantedWinner, startSeed) {
  for (let seed = startSeed; seed < startSeed + MAX_SEARCH_SEEDS; seed += 1) {
    const state = newGame(seed);
    state.phase = 'play';
    simulate(state, pilot, MAX_ROUNDS);
    if (state.phase === 'over' && state.winner === wantedWinner) return state;
  }
  return null;
}

/**
 * Set the game to the named scene (title, play, win or loss; any other name is title)
 * and return the state to draw. Win and loss search seeded games until the autopilot's
 * real play reaches that ending.
 */
export function stageShot(name, seed) {
  const startSeed = Number.isInteger(seed) && seed > 0 ? seed : 1;
  if (name === 'play') {
    for (let trySeed = startSeed; trySeed < startSeed + MAX_SEARCH_SEEDS; trySeed += 1) {
      const state = newGame(trySeed);
      state.phase = 'play';
      simulate(state, goodPilot, PLAY_ROUNDS);
      if (state.phase === 'play' && state.player.life < 30 && state.foe.life < 30) return state;
    }
    const fallback = newGame(startSeed);
    fallback.phase = 'play';
    simulate(fallback, goodPilot, PLAY_ROUNDS);
    return fallback;
  }
  if (name === 'win') {
    const won = findSeed(goodPilot, 'player', startSeed);
    if (won) return won;
    const fallback = newGame(startSeed);
    fallback.phase = 'over';
    fallback.winner = 'player';
    return fallback;
  }
  if (name === 'loss') {
    const lost = findSeed(badPilot, 'foe', startSeed);
    if (lost) return lost;
    const fallback = newGame(startSeed);
    fallback.phase = 'over';
    fallback.winner = 'foe';
    return fallback;
  }
  const title = newGame(startSeed);
  title.phase = 'title';
  return title;
}
