// ai.js — the opponent of Ember Duel. One job: pick the foe's card with a policy a
// player can read and counter, never at random.
import { elementBonus } from './deck.js';

function attackCards(hand) {
  return hand.filter((card) => card.kind === 'attack');
}

function firstOf(hand, kind) {
  return hand.find((card) => card.kind === kind) || null;
}

function strongestAttack(hand, beatsElement) {
  const attacks = attackCards(hand);
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

/**
 * The foe's policy, in priority order — each rule is visible in the log, so the
 * player can learn it and play around it:
 * 1. Heal when life is low and a Pulih is held.
 * 2. Shield when life is low and the player's last attack was heavy.
 * 3. Set up Ganda when a big attack is held for next round.
 * 4. Otherwise play the strongest attack, preferring the element that beats the
 *    element the player just played.
 * 5. With only specials left, shield first, then heal, then set up.
 */
export function chooseFoeCard(state) {
  const hand = state.foe.hand;
  const foe = state.foe;
  const lastPlayerCard = state.lastRound ? state.lastRound.playerCard : '';
  const playerElement = ['Api', 'Angin', 'Bumi', 'Air'].find((name) => lastPlayerCard.startsWith(name));
  const elementKey = playerElement === 'Api' ? 'fire' : playerElement === 'Angin' ? 'wind' : playerElement === 'Bumi' ? 'earth' : playerElement === 'Air' ? 'water' : null;
  const lastPlayerPower = state.lastRound ? state.lastRound.playerPower : 0;

  const heal = firstOf(hand, 'heal');
  if (foe.life <= 12 && heal) return heal;

  const shield = firstOf(hand, 'shield');
  if (foe.life <= 10 && shield && lastPlayerPower >= 6) return shield;

  const ganda = firstOf(hand, 'double');
  const bigAttack = attackCards(hand).find((card) => card.value >= 7);
  if (ganda && bigAttack && !foe.doubleNext) return ganda;

  const attack = strongestAttack(hand, elementKey);
  if (attack) return attack;

  if (shield) return shield;
  if (heal) return heal;
  if (ganda) return ganda;
  return hand[0];
}

/** What the foe is likely to do next, told to the player before the round. */
export function foeTell(state) {
  if (state.foe.life <= 12) return 'Lawan terluka — ia mungkin memulihkan diri.';
  if (state.foe.doubleNext) return 'Lawan menyiapkan serangan ganda!';
  if (state.lastRound && state.lastRound.foeCard === 'Ganda') return 'Lawan baru saja menyiapkan Ganda.';
  return 'Lawan menimbang kartunya…';
}
