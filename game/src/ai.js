// ai.js — the opponent of Ember Duel. One job: pick the foe's card with a policy a
// player can read and counter, never at random. The pick is locked in before the
// player chooses, so the telegraph on the table is always the card really played.
import { ELEMENTS, elementBonus } from './deck.js';

function attackCards(hand) {
  return hand.filter((card) => card.kind === 'attack');
}

function firstOf(hand, kind) {
  return hand.find((card) => card.kind === kind) || null;
}

/** The element whose attacks beat the given element, for counter advice. */
export function elementThatBeats(elementKey) {
  if (!elementKey) return null;
  return Object.values(ELEMENTS).find((element) => element.beats === elementKey) || null;
}

function strongestAttack(hand, beatsElement, chainElement) {
  const attacks = attackCards(hand);
  if (attacks.length === 0) return null;
  let best = attacks[0];
  let bestScore = -1;
  for (const card of attacks) {
    let score = card.value + elementBonus(card.element, beatsElement) * 2;
    // Continuing the foe's own chain is worth a lot: the multiplier doubles,
    // then triples, the damage — so a chain card beats a slightly bigger one.
    if (chainElement && card.element === chainElement) score += 4;
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
 *    element the player just played, and preferring to continue its own chain.
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

  const attack = strongestAttack(hand, elementKey, foe.chain ? foe.chain.element : null);
  if (attack) return attack;

  if (shield) return shield;
  if (heal) return heal;
  if (ganda) return ganda;
  return hand[0];
}

/**
 * What the foe is about to do, read off the locked-in telegraph — never a guess.
 * Tells the player how to counter it: the beating element, or a special instead.
 */
export function foeTell(state) {
  const tele = state.telegraph;
  if (!tele) return 'Lawan mengocok kartunya…';
  if (tele.kind === 'attack') {
    const beater = elementThatBeats(tele.element);
    const beaterName = beater ? beater.name : '';
    const doubled = state.foe.doubleNext ? ' (Ganda aktif — serangannya ×2!)' : '';
    return `Telegraph: lawan menyerang ${tele.name}${doubled} — counter dengan ${beaterName} atau Perisai.`;
  }
  if (tele.kind === 'shield') return 'Telegraph: lawan bertahan dengan Perisai — simpan serangan besarmu, mainkan Pulih atau Ganda.';
  if (tele.kind === 'heal') return 'Telegraph: lawan memulihkan 5 life — tekan sekarang dengan serangan besarmu.';
  return 'Telegraph: lawan menyiapkan Ganda — habisi sebelum serangannya berlipat ronde depan.';
}
