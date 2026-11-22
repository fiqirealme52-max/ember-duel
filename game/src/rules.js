// rules.js — the duel itself: fresh games, round resolution, life totals, win and loss.
// One job: the rules, nothing about the screen or the sound.
import { drawCard, drawUpTo, elementBonus, shuffledDeck } from './deck.js';
import { chooseFoeCard } from './ai.js';
import { mulberry32 } from './rng.js';

export const START_LIFE = 30;
export const HAND_SIZE = 5;
export const HAND_LIMIT = 7;
export const CHAIN_MAX = 3;

export function newGame(seed) {
  const rng = mulberry32(seed);
  const state = {
    seed,
    rng,
    deck: shuffledDeck(rng),
    discard: [],
    round: 1,
    phase: 'title',
    winner: null,
    log: [],
    lastRound: null,
    // The foe's next card, locked in before the player chooses — the telegraph.
    // It is always the card the foe really plays that round.
    telegraph: null,
    player: { life: START_LIFE, hand: [], doubleNext: false, chain: { element: null, count: 0 } },
    foe: { life: START_LIFE, hand: [], doubleNext: false, chain: { element: null, count: 0 } },
    maxChain: { element: null, count: 0 },
  };
  drawUpTo(state, state.player.hand, HAND_SIZE);
  drawUpTo(state, state.foe.hand, HAND_SIZE);
  state.telegraph = chooseFoeCard(state);
  return state;
}

/**
 * The chain multiplier for an attack of the given element: the first card of an
 * element hits x1; the second in a row x2; the third and beyond x3 (capped).
 * A different element, or any non-attack card, breaks the chain.
 */
export function chainMultiplier(chain, element) {
  if (!chain || !element || chain.element !== element || chain.count <= 0) return 1;
  return Math.min(chain.count + 1, CHAIN_MAX);
}

/** The multiplier the NEXT card of the running chain element would get. */
export function chainNextMultiplier(chain) {
  if (!chain || !chain.element || chain.count <= 0) return 1;
  return Math.min(chain.count + 1, CHAIN_MAX);
}

function advanceChain(chain, card) {
  if (card.kind !== 'attack') return { element: null, count: 0 };
  if (chain.element === card.element) {
    return { element: card.element, count: Math.min(chain.count + 1, CHAIN_MAX) };
  }
  return { element: card.element, count: 1 };
}

function attackPower(card, doubleNext, foeCard, chain) {
  if (!card || card.kind !== 'attack') return 0;
  let power = card.value + elementBonus(card.element, foeCard && foeCard.kind === 'attack' ? foeCard.element : null);
  power *= chainMultiplier(chain, card.element);
  if (doubleNext) power *= 2;
  return power;
}

function describeCard(card) {
  if (!card) return '—';
  if (card.kind === 'attack') return `${card.name}`;
  return card.name;
}

/**
 * Play one round: both sides reveal a card at once, then damage, healing and shields
 * resolve. The foe's card is the one locked in the telegraph before the player
 * chose, so the telegraph is always honest. Returns a summary the screen and the
 * log read. The played cards move to the discard pile and both sides draw one card
 * for the next round; the foe then locks its next card, ready to be telegraphed.
 */
export function resolveRound(state, playerCard, foeCard) {
  const player = state.player;
  const foe = state.foe;

  player.hand = player.hand.filter((card) => card.id !== playerCard.id);
  foe.hand = foe.hand.filter((card) => card.id !== foeCard.id);

  const playerShielded = playerCard.kind === 'shield';
  const foeShielded = foeCard.kind === 'shield';
  const playerDoubled = player.doubleNext;
  const foeDoubled = foe.doubleNext;

  const playerChainMult = chainMultiplier(player.chain, playerCard.kind === 'attack' ? playerCard.element : null);
  const foeChainMult = chainMultiplier(foe.chain, foeCard.kind === 'attack' ? foeCard.element : null);
  let playerPower = attackPower(playerCard, player.doubleNext, foeCard, player.chain);
  let foePower = attackPower(foeCard, foe.doubleNext, playerCard, foe.chain);

  player.chain = advanceChain(player.chain, playerCard);
  foe.chain = advanceChain(foe.chain, foeCard);
  for (const chain of [player.chain, foe.chain]) {
    if (chain.count > state.maxChain.count) state.maxChain = { element: chain.element, count: chain.count };
  }

  if (playerCard.kind === 'double') player.doubleNext = true;
  else player.doubleNext = false;
  if (foeCard.kind === 'double') foe.doubleNext = true;
  else foe.doubleNext = false;

  let playerHealed = 0;
  let foeHealed = 0;
  if (playerCard.kind === 'heal') {
    playerHealed = Math.min(5, START_LIFE - player.life);
    player.life += playerHealed;
  }
  if (foeCard.kind === 'heal') {
    foeHealed = Math.min(5, START_LIFE - foe.life);
    foe.life += foeHealed;
  }

  const foeDamage = foeShielded ? 0 : Math.max(0, playerPower - foePower);
  const playerDamage = playerShielded ? 0 : Math.max(0, foePower - playerPower);
  foe.life = Math.max(0, foe.life - foeDamage);
  player.life = Math.max(0, player.life - playerDamage);

  state.discard.push(playerCard, foeCard);

  const summary = {
    round: state.round,
    playerCard: describeCard(playerCard),
    foeCard: describeCard(foeCard),
    playerCardObj: playerCard,
    foeCardObj: foeCard,
    playerPower,
    foePower,
    playerDamage,
    foeDamage,
    playerHealed,
    foeHealed,
    playerDoubled,
    foeDoubled,
    playerShielded,
    foeShielded,
    playerChainMult,
    foeChainMult,
    playerChain: { ...player.chain },
    foeChain: { ...foe.chain },
    playerLife: player.life,
    foeLife: foe.life,
  };
  state.lastRound = summary;
  state.log.unshift(roundLine(summary));
  state.log = state.log.slice(0, 4);

  drawUpTo(state, player.hand, Math.min(HAND_LIMIT, HAND_SIZE + 1));
  drawUpTo(state, foe.hand, Math.min(HAND_LIMIT, HAND_SIZE + 1));

  state.round += 1;

  if (foe.life <= 0 && player.life <= 0) {
    state.phase = 'over';
    state.winner = foeDamage >= playerDamage ? 'player' : 'foe';
  } else if (foe.life <= 0) {
    state.phase = 'over';
    state.winner = 'player';
  } else if (player.life <= 0) {
    state.phase = 'over';
    state.winner = 'foe';
  }
  // The next round's telegraph is locked now, from the refilled hand, before the
  // player sees it and chooses — the foe can no longer change its mind.
  state.telegraph = state.phase === 'play' ? chooseFoeCard(state) : null;
  return summary;
}

function roundLine(summary) {
  const parts = [`R${summary.round}: ${summary.playerCard}${summary.playerChainMult > 1 ? ` ×${summary.playerChainMult}` : ''} vs ${summary.foeCard}${summary.foeChainMult > 1 ? ` ×${summary.foeChainMult}` : ''}`];
  if (summary.foeDamage > 0) parts.push(`lawan -${summary.foeDamage}`);
  if (summary.playerDamage > 0) parts.push(`kamu -${summary.playerDamage}`);
  if (summary.playerHealed > 0) parts.push(`kamu +${summary.playerHealed}`);
  if (summary.foeHealed > 0) parts.push(`lawan +${summary.foeHealed}`);
  if (summary.foeDamage === 0 && summary.playerDamage === 0 && summary.playerHealed === 0 && summary.foeHealed === 0) parts.push('imbang');
  if (summary.playerChainMult > 1) parts.push(`rantaimu ×${summary.playerChainMult}!`);
  if (summary.foeChainMult > 1) parts.push(`rantai lawan ×${summary.foeChainMult}!`);
  if (summary.playerShielded) parts.push('Perisaimu menahan!');
  if (summary.foeShielded) parts.push('Perisai lawan menahan!');
  return parts.join(' · ');
}

/** The one-line hint a player can read about the foe: its running chain and its habit. */
export function foeHint(state) {
  if (state.foe.chain && state.foe.chain.count >= 1) {
    const next = chainNextMultiplier(state.foe.chain);
    return `Lawan merangkai rantai — kartu berikutnya dari elemen itu menghantam ×${next}. Putuskan dengan elemen lain!`;
  }
  const last = state.lastRound;
  if (!last) return 'Lawan mengocok kartunya…';
  const foeCard = last.foeCard;
  if (foeCard.startsWith('Api') || foeCard.startsWith('Angin') || foeCard.startsWith('Bumi') || foeCard.startsWith('Air')) {
    return `Lawan terakhir main ${foeCard} — elemen lawannya mengalahkannya.`;
  }
  return `Lawan terakhir main ${foeCard} — ia menyimpan serangan.`;
}
