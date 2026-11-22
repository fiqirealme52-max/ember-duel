// deck.js — the cards of Ember Duel: four elements in a beating cycle, attack values,
// and three special cards. One job: define cards and deal them.
import { shuffleInPlace } from './rng.js';

export const ELEMENTS = {
  fire: { key: 'fire', name: 'Api', color: '#ff5a3c', shape: 'triangle', beats: 'wind', verb: 'membakar' },
  wind: { key: 'wind', name: 'Angin', color: '#38b6ff', shape: 'diamond', beats: 'earth', verb: 'menerbangkan' },
  earth: { key: 'earth', name: 'Bumi', color: '#c98f2e', shape: 'square', beats: 'water', verb: 'menenggelamkan' },
  water: { key: 'water', name: 'Air', color: '#2f7bff', shape: 'circle', beats: 'fire', verb: 'memadamkan' },
};

export const ELEMENT_KEYS = ['fire', 'wind', 'earth', 'water'];

/** +2 attack when the attacker's element beats the defender's element. */
export function elementBonus(attackerElement, defenderElement) {
  if (!attackerElement || !defenderElement) return 0;
  return ELEMENTS[attackerElement].beats === defenderElement ? 2 : 0;
}

let cardCounter = 0;

export function attackCard(element, value) {
  cardCounter += 1;
  return { id: `c${cardCounter}`, kind: 'attack', element, value, name: `${ELEMENTS[element].name} ${value}` };
}

export function specialCard(kind) {
  cardCounter += 1;
  if (kind === 'shield') return { id: `c${cardCounter}`, kind: 'shield', name: 'Perisai', text: 'Blokir semua damage ronde ini' };
  if (kind === 'heal') return { id: `c${cardCounter}`, kind: 'heal', name: 'Pulih', value: 5, text: 'Pulihkan 5 life' };
  return { id: `c${cardCounter}`, kind: 'double', name: 'Ganda', text: 'Serangan ronde depan x2' };
}

/** A fresh 42-card deck: attacks 1-9 in every element, plus 2 of each special. */
export function buildDeck() {
  const cards = [];
  for (const element of ELEMENT_KEYS) {
    for (let value = 1; value <= 9; value += 1) cards.push(attackCard(element, value));
  }
  cards.push(specialCard('shield'), specialCard('shield'));
  cards.push(specialCard('heal'), specialCard('heal'));
  cards.push(specialCard('double'), specialCard('double'));
  return cards;
}

export function shuffledDeck(rng) {
  return shuffleInPlace(buildDeck(), rng);
}

/** Draw one card; when the deck runs dry, the discard pile is shuffled back in. */
export function drawCard(state) {
  if (state.deck.length === 0) {
    state.deck = shuffleInPlace(state.discard.splice(0), state.rng);
    if (state.deck.length === 0) return null;
  }
  return state.deck.pop();
}

export function drawUpTo(state, hand, count) {
  while (hand.length < count) {
    const card = drawCard(state);
    if (card === null) break;
    hand.push(card);
  }
}
