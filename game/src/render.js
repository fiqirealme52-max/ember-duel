// render.js — the table of Ember Duel: title screen, duel table, win and loss screens.
// One job: turn a game state into the screen, nothing about the rules.
import { ELEMENTS } from './deck.js';
import { chainNextMultiplier } from './rules.js';
import { elementThatBeats } from './ai.js';

function elementShape(elementKey) {
  const element = ELEMENTS[elementKey];
  return `<span class="shape shape-${element.shape}" style="--element-color:${element.color}" title="${element.name}"></span>`;
}

export function cardHtml(card, options) {
  const opts = options || {};
  if (opts.faceDown) {
    return `<div class="card card-back ${opts.small ? 'card-small' : ''}"><span class="card-back-mark">E</span></div>`;
  }
  if (card.kind === 'attack') {
    const element = ELEMENTS[card.element];
    return `<div class="card card-attack ${opts.playable ? 'card-playable' : ''} ${opts.played ? 'card-played' : ''}" data-card-id="${card.id}" style="--element-color:${element.color}">
      <div class="card-top"><span class="card-element-name">${element.name}</span>${elementShape(card.element)}</div>
      <div class="card-value">${card.value}</div>
      <div class="card-emblem">${elementShape(card.element)}</div>
      <div class="card-name">${card.name}</div>
    </div>`;
  }
  const icons = { shield: '⛨', heal: '✚', double: '×2' };
  const labels = { shield: 'Perisai', heal: 'Pulih +5', double: 'Ganda ×2' };
  return `<div class="card card-special card-${card.kind} ${opts.playable ? 'card-playable' : ''} ${opts.played ? 'card-played' : ''}" data-card-id="${card.id}">
    <div class="card-top"><span class="card-element-name">${labels[card.kind]}</span><span class="special-icon">${icons[card.kind]}</span></div>
    <div class="card-value special-value">${icons[card.kind]}</div>
    <div class="card-emblem card-text">${card.text}</div>
    <div class="card-name">${card.name}</div>
  </div>`;
}

function lifeBarHtml(life, side) {
  const pct = Math.max(0, Math.min(100, (life / 30) * 100));
  return `<div class="life-wrap ${side}">
    <div class="life-number">${life}</div>
    <div class="life-bar"><div class="life-fill" style="width:${pct}%"></div></div>
    <div class="life-label">LIFE / 30</div>
  </div>`;
}

function logHtml(state) {
  const lines = state.log.length > 0 ? state.log : ['Belum ada ronde — mainkan kartumu!'];
  return `<div class="log-panel"><div class="log-title">CATATAN DUEL</div>${lines.map((line) => `<div class="log-line">${line}</div>`).join('')}</div>`;
}

/**
 * The chain meter: the running element and the multiplier the next card of that
 * element would hit with. Empty when no chain is running.
 */
function chainMeterHtml(chain, who) {
  if (!chain || !chain.element || chain.count <= 0) {
    return `<div class="chain-meter chain-empty"><span class="chain-label">RANTAI ${who}</span><span class="chain-value">—</span><span class="chain-hint">mainkan 2 kartu elemen sama beruntun</span></div>`;
  }
  const element = ELEMENTS[chain.element];
  const next = chainNextMultiplier(chain);
  return `<div class="chain-meter chain-hot" style="--element-color:${element.color}"><span class="chain-label">RANTAI ${who}</span><span class="chain-shapes">${elementShape(chain.element)}${elementShape(chain.element)}${elementShape(chain.element)}</span><span class="chain-value">${element.name} ×${next}</span><span class="chain-hint">kartu ${element.name} berikut menghantam ×${next}</span></div>`;
}

/**
 * The telegraph banner: the foe's next card, locked in and shown before the player
 * chooses — element, value and intent, plus what counters it.
 */
function telegraphHtml(state) {
  const tele = state.telegraph;
  if (!tele) return '<div class="telegraph-banner telegraph-none">Lawan belum mengunci kartunya…</div>';
  if (tele.kind === 'attack') {
    const element = ELEMENTS[tele.element];
    const beater = elementThatBeats(tele.element);
    const doubled = state.foe.doubleNext ? ' · Ganda aktif: ×2!' : '';
    return `<div class="telegraph-banner" style="--element-color:${element.color}">
      <span class="telegraph-eye">TELEGRAPH LAWAN</span>
      ${elementShape(tele.element)}
      <span class="telegraph-card">${tele.name}</span>
      <span class="telegraph-intent">SERANGAN${doubled}</span>
      <span class="telegraph-counter">Counter: ${beater ? beater.name : ''} atau Perisai</span>
    </div>`;
  }
  const labels = { shield: 'Perisai — BERTAHAN', heal: 'Pulih — MEMULIHKAN 5', double: 'Ganda — MENYIAPKAN ×2' };
  const counters = {
    shield: 'Counter: simpan serangan besarmu',
    heal: 'Counter: serang keras sekarang',
    double: 'Counter: habisi sebelum ronde depan',
  };
  return `<div class="telegraph-banner telegraph-special">
    <span class="telegraph-eye">TELEGRAPH LAWAN</span>
    <span class="telegraph-card">${tele.name}</span>
    <span class="telegraph-intent">${labels[tele.kind] || tele.name}</span>
    <span class="telegraph-counter">${counters[tele.kind] || ''}</span>
  </div>`;
}

export function titleHtml() {
  return `<div class="screen screen-title">
    <div class="title-kicker">MAKE.FUN · BEST CARD GAME</div>
    <h1 class="title-name">EMBER<br>DUEL</h1>
    <p class="title-sub">Duel kartu elemen 1 lawan 1 melawan AI.<br>Kalahkan life lawan sampai 0.</p>
    <div class="cycle">
      <span class="cycle-item"><span class="shape shape-triangle" style="--element-color:#ff5a3c"></span>Api</span><span class="cycle-arrow">›</span>
      <span class="cycle-item"><span class="shape shape-diamond" style="--element-color:#38b6ff"></span>Angin</span><span class="cycle-arrow">›</span>
      <span class="cycle-item"><span class="shape shape-square" style="--element-color:#c98f2e"></span>Bumi</span><span class="cycle-arrow">›</span>
      <span class="cycle-item"><span class="shape shape-circle" style="--element-color:#2f7bff"></span>Air</span><span class="cycle-arrow">›</span>
      <span class="cycle-item"><span class="shape shape-triangle" style="--element-color:#ff5a3c"></span>Api</span>
    </div>
    <div class="title-features">
      <div class="title-feature"><span class="feature-tag">RANTAI ×2 ×3</span> Kartu elemen sama beruntun melipatgandakan damage — kedua, lalu ketiga kalinya.</div>
      <div class="title-feature"><span class="feature-tag">TELEGRAPH</span> Serangan lawan berikutnya terlihat duluan — counter dengan elemen yang mengalahkannya, atau Perisai.</div>
    </div>
    <p class="title-rules">Elemen yang mengalahkan lawan: <b>+2 serang</b> · Perisai menahan damage · Pulih +5 life · Ganda melipatgandakan serangan ronde depan</p>
    <button class="btn btn-big" data-action="start">MULAI DUEL</button>
    <p class="title-foot">30 life · tangan 5 kartu · mainkan 1 kartu tiap ronde</p>
  </div>`;
}

export function playHtml(state, foeTell) {
  const last = state.lastRound;
  const foeCards = state.foe.hand.map(() => cardHtml(null, { faceDown: true, small: true })).join('');
  const playerCards = state.player.hand.map((card, index) => cardHtml(card, { playable: true })).join('');
  const arenaPlayer = last ? cardHtml(last.playerCardObj, { played: true }) : '<div class="card-slot-empty">Kartumu</div>';
  const arenaFoe = last ? cardHtml(last.foeCardObj, { played: true }) : '<div class="card-slot-empty">Kartu lawan</div>';
  const damageLine = last
    ? `<div class="round-result">Ronde ${last.round} — ${last.playerCard}${last.playerChainMult > 1 ? ` ×${last.playerChainMult}` : ''} vs ${last.foeCard}${last.foeChainMult > 1 ? ` ×${last.foeChainMult}` : ''}${last.foeDamage ? ` · lawan -${last.foeDamage}` : ''}${last.playerDamage ? ` · kamu -${last.playerDamage}` : ''}${last.playerHealed ? ` · kamu +${last.playerHealed}` : ''}${last.foeHealed ? ` · lawan +${last.foeHealed}` : ''}</div>`
    : '<div class="round-result">Pilih satu kartu dari tanganmu untuk memulai ronde 1.</div>';
  return `<div class="screen screen-play">
    <div class="table-col">
    <div class="table-top">
      <div class="foe-box"><div class="foe-name">LAWAN · Sang Penjaga Bara</div><div class="foe-tell">${foeTell}</div></div>
      ${chainMeterHtml(state.foe.chain, 'LAWAN')}
      ${lifeBarHtml(state.foe.life, 'foe')}
      <div class="round-box"><div class="round-number">RONDE ${state.round}</div><div class="deck-count">Deck: ${state.deck.length} kartu</div></div>
    </div>
    <div class="foe-hand">${foeCards}</div>
    ${telegraphHtml(state)}
    <div class="arena">
      <div class="arena-side">${arenaPlayer}</div>
      <div class="arena-vs">VS</div>
      <div class="arena-side">${arenaFoe}</div>
    </div>
    ${damageLine}
    <div class="table-bottom">
      ${lifeBarHtml(state.player.life, 'player')}
      <div class="player-box"><div class="player-name">KAMU</div><div class="player-hint">Klik kartu untuk memainkannya · tombol 1–7</div></div>
      ${chainMeterHtml(state.player.chain, 'KAMU')}
      <button class="btn btn-small" data-action="mute">SUARA: NYALA</button>
    </div>
    <div class="player-hand">${playerCards}</div>
    </div>
    ${logHtml(state)}
  </div>`;
}

export function overHtml(state) {
  const won = state.winner === 'player';
  const embers = won ? Array.from({ length: 24 }, (_, i) => `<span class="ember" style="--ember-x:${(i * 37) % 100}%;--ember-delay:${(i % 8) * 0.25}s"></span>`).join('') : '';
  const maxChain = state.maxChain && state.maxChain.count >= 2
    ? `<p class="over-chain">Rantai terpanjang duel ini: ${ELEMENTS[state.maxChain.element].name} ×${state.maxChain.count}</p>`
    : '';
  return `<div class="screen screen-over ${won ? 'screen-win' : 'screen-lose'}">
    ${embers}
    <div class="over-kicker">${won ? 'DUEL SELESAI' : 'DUEL SELESAI'}</div>
    <h1 class="over-title">${won ? 'MENANG!' : 'KALAH'}</h1>
    <p class="over-sub">${won ? 'Bara padam di tangan lawan. Meja ini milikmu.' : 'Bara lawan membakarmu. Latih lagi tanganmu.'}</p>
    <div class="over-score">
      <div class="over-life"><span class="over-life-number">${state.player.life}</span><span class="over-life-label">LIFE KAMU</span></div>
      <div class="over-dash">—</div>
      <div class="over-life"><span class="over-life-number">${state.foe.life}</span><span class="over-life-label">LIFE LAWAN</span></div>
    </div>
    ${maxChain}
    <p class="over-rounds">Duel berakhir di ronde ${state.round - 1} · ${state.log[0] || ''}</p>
    <button class="btn btn-big" data-action="restart">${won ? 'MAIN LAGI' : 'COBA LAGI'}</button>
  </div>`;
}

export function renderScreen(root, state, foeTell) {
  if (state.phase === 'title') root.innerHTML = titleHtml();
  else if (state.phase === 'over') root.innerHTML = overHtml(state);
  else root.innerHTML = playHtml(state, foeTell || '');
}
