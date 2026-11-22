// rules.js — the duel itself: fresh games, round resolution, life totals, win and loss.
// One job: the rules, nothing about the screen or the sound.
import { drawCard, drawUpTo, elementBonus, shuffledDeck } from './deck.js';
import { mulberry32 } from './rng.js';

export const START_LIFE = 30;
export const HAND_SIZE = 5;
export const HAND_LIMIT = 7;

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
    player: { life: START_LIFE, hand: [], doubleNext: false },
    foe: { life: START_LIFE, hand: [], doubleNext: false },
  };
  drawUpTo(state, state.player.hand, HAND_SIZE);
  drawUpTo(state, state.foe.hand, HAND_SIZE);
  return state;
}

function attackPower(card, doubleNext, foeCard) {
  if (!card || card.kind !== 'attack') return 0;
  let power = card.value + elementBonus(card.element, foeCard && foeCard.kind === 'attack' ? foeCard.element : null);
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
 * resolve. Returns a summary the screen and the log read. The played cards move to
 * the discard pile and both sides draw one card for the next round.
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

  let playerPower = attackPower(playerCard, player.doubleNext, foeCard);
  let foePower = attackPower(foeCard, foe.doubleNext, playerCard);

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
  return summary;
}

function roundLine(summary) {
  const parts = [`R${summary.round}: ${summary.playerCard} vs ${summary.foeCard}`];
  if (summary.foeDamage > 0) parts.push(`lawan -${summary.foeDamage}`);
  if (summary.playerDamage > 0) parts.push(`kamu -${summary.playerDamage}`);
  if (summary.playerHealed > 0) parts.push(`kamu +${summary.playerHealed}`);
  if (summary.foeHealed > 0) parts.push(`lawan +${summary.foeHealed}`);
  if (summary.foeDamage === 0 && summary.playerDamage === 0 && summary.playerHealed === 0 && summary.foeHealed === 0) parts.push('imbang');
  if (summary.playerShielded) parts.push('Perisaimu menahan!');
  if (summary.foeShielded) parts.push('Perisai lawan menahan!');
  return parts.join(' · ');
}

/** The one-line hint a player can read about the foe: its last element and its habit. */
export function foeHint(state) {
  const last = state.lastRound;
  if (!last) return 'Lawan mengocok kartunya…';
  const foeCard = last.foeCard;
  if (foeCard.startsWith('Api') || foeCard.startsWith('Angin') || foeCard.startsWith('Bumi') || foeCard.startsWith('Air')) {
    return `Lawan terakhir main ${foeCard} — elemen lawannya mengalahkannya.`;
  }
  return `Lawan terakhir main ${foeCard} — ia menyimpan serangan.`;
}
