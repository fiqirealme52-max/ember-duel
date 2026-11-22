// shots.js — the screenshot scenes behind ?shot=title|play|win|loss. Each one plays the
// real rules forward from a fresh seeded game, steered by a simple autopilot, so every
// frame is what a short real game looks like and the same seed always gives the same frame.
import { elementBonus } from './deck.js';
import { newGame, resolveRound, chainNextMultiplier } from './rules.js';
import { chooseFoeCard, elementThatBeats } from './ai.js';

const MAX_SEARCH_SEEDS = 300;
const MAX_ROUNDS = 40;
const PLAY_ROUNDS = 6;

function bestAttack(hand, beatsElement, chain) {
  const attacks = hand.filter((card) => card.kind === 'attack');
  if (attacks.length === 0) return null;
  let best = attacks[0];
  let bestScore = -1;
  for (const card of attacks) {
    let score = card.value + elementBonus(card.element, beatsElement) * 2;
    // Continuing your own chain multiplies the whole hit, so a chain card beats
    // a slightly bigger off-chain one.
    if (chain && chain.element && card.element === chain.element) score += 4;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

function weakestAttack(hand) {
  const attacks = hand.filter((card) => card.kind === 'attack');
  if (attacks.length === 0) return null;
  let worst = attacks[0];
  for (const card of attacks) if (card.value < worst.value) worst = card;
  return worst;
}

function firstOf(hand, kind) {
  return hand.find((card) => card.kind === kind) || null;
}

/**
 * The good autopilot: reads the telegraph and counters it, builds chains, heals
 * and shields when hurt, sets up Ganda, then hits hardest.
 */
export function goodPilot(state) {
  const hand = state.player.hand;
  const tele = state.telegraph;
  const heal = firstOf(hand, 'heal');
  const shield = firstOf(hand, 'shield');
  const ganda = firstOf(hand, 'double');
  const bigAttack = hand.find((card) => card.kind === 'attack' && card.value >= 7);

  // A heavy telegraphed attack while hurt: block it with Perisai.
  if (tele && tele.kind === 'attack' && shield && state.player.life <= 14) {
    const telePower = (tele.value + 2) * chainNextMultiplier(state.foe.chain) * (state.foe.doubleNext ? 2 : 1);
    if (telePower >= 8) return shield;
  }
  // The foe is shielding: don't waste a big attack — heal, set up, or tap lightly.
  if (tele && tele.kind === 'shield') {
    if (heal && state.player.life <= 25) return heal;
    if (ganda && bigAttack && !state.player.doubleNext) return ganda;
    const tap = weakestAttack(hand);
    if (tap) return tap;
  }
  if (state.player.life <= 10 && heal) return heal;
  if (state.player.life <= 12 && shield && state.lastRound && state.lastRound.foePower >= 6) return shield;
  if (ganda && bigAttack && !state.player.doubleNext) return ganda;

  // Counter the telegraphed element: the element that beats it scores double.
  const beatsElement = tele && tele.kind === 'attack' ? tele.element : null;
  const attack = bestAttack(hand, beatsElement, state.player.chain);
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
    // The foe plays the card locked in the telegraph — never re-picked after
    // seeing the player's choice.
    const foeCard = state.telegraph || chooseFoeCard(state);
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

/** A play frame is good for the contact sheet when a chain is visibly running. */
function hasVisibleChain(state) {
  return (state.player.chain && state.player.chain.count >= 2) || (state.foe.chain && state.foe.chain.count >= 2);
}

/**
 * Set the game to the named scene (title, play, win or loss; any other name is title)
 * and return the state to draw. Win and loss search seeded games until the autopilot's
 * real play reaches that ending. The play scene searches for a frame where a chain
 * meter is visibly running (x2 or x3) alongside the telegraph banner.
 */
export function stageShot(name, seed) {
  const startSeed = Number.isInteger(seed) && seed > 0 ? seed : 1;
  if (name === 'play') {
    let chainedFallback = null;
    for (let trySeed = startSeed; trySeed < startSeed + MAX_SEARCH_SEEDS; trySeed += 1) {
      const state = newGame(trySeed);
      state.phase = 'play';
      simulate(state, goodPilot, PLAY_ROUNDS);
      if (state.phase === 'play' && state.player.life < 30 && state.foe.life < 30) {
        // Prefer a close duel (neither side nearly dead) with a chain running.
        if (hasVisibleChain(state) && state.player.life >= 10 && state.foe.life >= 10) return state;
        if (!chainedFallback && (state.player.chain.count >= 1 || state.foe.chain.count >= 1)) chainedFallback = state;
      }
    }
    if (chainedFallback) return chainedFallback;
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
