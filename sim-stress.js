'use strict';

// ── Speed up timers 60× ─────────────────────────────────────────────────────
const _origST = global.setTimeout;
const _origCT = global.clearTimeout;
global.setTimeout = (fn, delay, ...a) => _origST(fn, Math.max(30, Math.floor((delay || 0) / 60)), ...a);
global.clearTimeout = _origCT;

// ── Patch Bot to play 95% of available cards ────────────────────────────────
const { Bot } = require('./server/src/game/Bot');
const { canPlayCard } = require('./server/src/game/PowerCardEngine');
Bot.prototype.decidePowerCardPlay = function(game, phase, isReactive) {
  const playable = this.player.powerCards.filter(c => {
    if (c.type === 'BOUNTY') return game.winnerInfo?.winnerId === this.player.id && !!this.player.bestHand;
    return canPlayCard(c, phase, isReactive);
  });
  if (!playable.length || Math.random() > 0.95) return null;
  const card = playable[Math.floor(Math.random() * playable.length)];
  return { card, opts: this._buildOpts(card, game) };
};

const { GameRoom } = require('./server/src/game/GameRoom');

// ── Config ───────────────────────────────────────────────────────────────────
const NUM_BOTS        = 5;
const STARTING_CHIPS  = 8000;   // low so games finish fast
const TARGET_GAMES    = 10;
const SIM_TIMEOUT_MS  = 480_000; // 8 minutes real time

// ── Accumulators ─────────────────────────────────────────────────────────────
const errors          = [];
const warnings        = [];
let   totalHands      = 0;
let   totalGames      = 0;
let   totalBankPayouts = 0; // chips legitimately created by bounty bank payouts
let   firstDriftLogged = false;
const cardPlays       = {};     // definitionId → count
const handTypes       = {};     // hand type → wins
const phaseSeq        = [];     // sequence of phases for integrity check
let   chipSnapshots   = [];     // [{ ts, totalChips }] for conservation check
let   lastTotalChips  = STARTING_CHIPS * NUM_BOTS;
const VALID_TOTAL     = STARTING_CHIPS * NUM_BOTS;

function err(msg)  { errors.push(`[E] ${msg}`);   console.error('[E]', msg); }
function warn(msg) { warnings.push(`[W] ${msg}`);  }
function log(msg)  { process.stdout.write('.'); }  // quiet mode

// ── Mock IO ──────────────────────────────────────────────────────────────────
const mockIo = { to: () => ({ emit: () => {} }) };

// ── Create room ──────────────────────────────────────────────────────────────
function makeRoom() {
  const room = new GameRoom('SIM', mockIo);

  // Override starting chips
  room.addBot = (function(orig) {
    return function() {
      const r = orig.call(this);
      const p = this.players[this.players.length - 1];
      if (p) p.chips = STARTING_CHIPS;
      return r;
    };
  })(room.addBot.bind(room));

  for (let i = 0; i < NUM_BOTS; i++) room.addBot();
  room.hostId = room.players[0]?.id;

  // Correct chips after bot add
  for (const p of room.players) p.chips = STARTING_CHIPS;

  // ── Intercept addLog ────────────────────────────────────────────────────
  room.addLog = () => {};

  // ── Track hand starts ───────────────────────────────────────────────────
  const origStartHand = room._startHand.bind(room);
  room._startHand = function() {
    totalHands++;
    // Top up each bot to 3 power cards
    for (const p of this.players.filter(p => p.isBot && !p.eliminated)) {
      while (p.powerCards.length < 3) {
        const c = this.powerDeck.draw();
        if (!c) break;
        p.powerCards.push(c);
      }
    }
    origStartHand();
  };

  // ── Track phase changes (detect invalid sequences) ───────────────────────
  const origSetPhase = room._setPhase.bind(room);
  room._setPhase = function(phase) {
    const prev = this.phase;
    phaseSeq.push({ from: prev, to: phase, hand: totalHands });

    // Detect duplicate phase transitions
    if (prev === phase && !['preflop_betting','flop_betting','turn_betting','river_betting'].includes(phase)) {
      warn(`Duplicate phase: ${phase} → ${phase} (hand ${totalHands})`);
    }

    origSetPhase(phase);

    // Chip conservation check — bounty bank payouts legitimately add chips
    const alive = this.players.filter(p => !p.eliminated);
    const totalChips = alive.reduce((s, p) => s + p.chips, 0)
                     + this.pot
                     + this.rolloverPot;
    const expected = VALID_TOTAL + totalBankPayouts;
    if (Math.abs(totalChips - expected) > 5) {
      if (!firstDriftLogged) {
        firstDriftLogged = true;
        const breakdown = this.players.map(p =>
          `  ${p.name}(elim=${p.eliminated}): chips=${p.chips} currentBet=${p.currentBet}`
        ).join('\n');
        console.error(`\n[FIRST DRIFT] phase=${phase} hand=${totalHands} game=${totalGames+1}`);
        console.error(`  pot=${this.pot} rolloverPot=${this.rolloverPot} bankPayouts=${totalBankPayouts}`);
        console.error(`  playerChips=${alive.reduce((s,p)=>s+p.chips,0)}`);
        console.error(`  found=${totalChips} expected=${expected} drift=${totalChips-expected}\n${breakdown}\n`);
      }
      err(`Chip conservation violated at ${phase}: found ${totalChips}, expected ${expected} (drift ${totalChips - expected})`);
    }

    if (phase === 'game_over') {
      totalGames++;
      console.log(`\n  ✓ Game ${totalGames} done (${totalHands} total hands)`);
      if (totalGames < TARGET_GAMES) {
        totalBankPayouts = 0; // reset per game
        firstDriftLogged = false;
        _origST(() => restartGame(room), 200);
      } else {
        _origST(finish, 300);
      }
    }
  };

  // ── Track power card plays ───────────────────────────────────────────────
  const origPlayPowerCard = room.playPowerCard.bind(room);
  room.playPowerCard = function(playerId, instanceId, opts) {
    const player = this.players.find(p => p.id === playerId);
    const card   = player?.powerCards.find(c => c.instanceId === instanceId);
    if (card) cardPlays[card.definitionId] = (cardPlays[card.definitionId] || 0) + 1;

    const result = origPlayPowerCard(playerId, instanceId, opts);

    if (result?.error) {
      const expected = [
        'Only the hand winner can play bounty cards',
        'Bounties only apply when you won a showdown',
        'No valid card to target',
        'You can only play ANYTIME cards on your own turn',
        'Cannot play this card right now',
        'Card not found in hand',
        'No spell to copy',
        'Turn/river not yet revealed',
        'No flop yet',
        'Deck empty',
        'Cannot promote/demote further',
        'Target has no spell cards',
        'Target has no cards',
        'Invalid target',
      ];
      if (!expected.some(e => result.error.includes(e))) {
        err(`Unexpected power card error: ${player?.name} → ${card?.name}: ${result.error}`);
      }
    }
    return result;
  };

  // ── Per power card chip audit ─────────────────────────────────────────────
  const origPlayPowerCardAudit = room.playPowerCard.bind(room);
  room.playPowerCard = function(playerId, instanceId, opts) {
    const pl = this.players.find(p => p.id === playerId);
    const card = pl?.powerCards.find(c => c.instanceId === instanceId);
    const cardName = card?.name || '?';
    const totalBefore = this.players.reduce((s,p) => s+p.chips, 0) + this.pot + this.rolloverPot;

    const result = origPlayPowerCardAudit(playerId, instanceId, opts);

    const totalAfter  = this.players.reduce((s,p) => s+p.chips, 0) + this.pot + this.rolloverPot;
    const drift = totalAfter - totalBefore;
    if (drift < 0) {
      err(`Chip LEAK during ${cardName} (${card?.definitionId || '?'}): ${drift} chips lost (${totalBefore} → ${totalAfter})`);
    }
    return result;
  };

  // ── Track bank payouts from card sells (auto and manual) ─────────────────
  const origSellCard = room._sellCard.bind(room);
  room._sellCard = function(player, instanceId) {
    const card = player.powerCards.find(c => c.instanceId === instanceId);
    const result = origSellCard(player, instanceId);
    if (result?.ok && card) {
      const sellValue = Math.floor((card.sellValue || 1) * this.bigBlind);
      totalBankPayouts += sellValue;
    }
    return result;
  };

  // ── Per-phase granular chip tracking to isolate drifts ───────────────────
  const origResolveWinChoice = room.resolveWinChoice.bind(room);
  room.resolveWinChoice = function(playerId, choice, stealId) {
    const before = this.players.reduce((s,p)=>s+p.chips,0) + this.pot + this.rolloverPot;
    const result = origResolveWinChoice(playerId, choice, stealId);
    const after  = this.players.reduce((s,p)=>s+p.chips,0) + this.pot + this.rolloverPot;
    const drift  = after - before;
    if (Math.abs(drift) > 5) {
      err(`Chip drift INSIDE resolveWinChoice (${choice}): ${drift}  (before=${before} after=${after})`);
    }
    return result;
  };

  // ── Track showdowns for hand type stats ─────────────────────────────────
  const origShowdown = room._doShowdown.bind(room);
  room._doShowdown = function() {
    origShowdown();
    if (this.winnerInfo?.winnerId) {
      const winner = this.players.find(p => p.id === this.winnerInfo.winnerId);
      const ht = winner?.bestHand?.type || 'FOLD_WIN';
      handTypes[ht] = (handTypes[ht] || 0) + 1;
    }
  };

  // ── Validate betting actions ─────────────────────────────────────────────
  const origPlayerAction = room.playerAction.bind(room);
  room.playerAction = function(playerId, action, amount) {
    const activePlayer = this.players[this.activePlayerIndex];
    if (activePlayer && activePlayer.id !== playerId && !activePlayer.isBot) {
      err(`Out-of-turn action: ${playerId} acted but active is ${activePlayer?.id}`);
    }
    const result = origPlayerAction(playerId, action, amount);
    if (result?.error && !result.error.includes('Not your turn')) {
      err(`Unexpected action error: ${action} by ${playerId}: ${result.error}`);
    }
    return result;
  };

  return room;
}

// ── Restart game (reset chips, reshuffle) ────────────────────────────────────
function restartGame(room) {
  clearTimeout(room.phaseTimer);
  clearTimeout(room.reactiveTimer);

  for (const p of room.players) {
    p.chips     = STARTING_CHIPS;
    p.eliminated = false;
    p.isActive  = true;
    p.powerCards = [];
    p.holeCards  = [];
    p.hasFolded  = false;
    p.isAllIn    = false;
    p.bestHand   = null;
  }
  room.pot          = 0;
  room.rolloverPot  = 0;
  room.dealerIndex  = 0;
  room.orbitCount   = 0;
  room.lastOrbitDealerIndex = null;
  room.handCount    = 0;
  room.phase        = 'lobby';
  room.reactiveQueue = [];
  room.reactiveWindow = null;
  room._spellSnapshot = null;
  room.powerDeck.reset();
  room.rankBag.refill();

  // Distribute starting Veto + 1 random card
  for (const p of room.players) {
    const veto = room.powerDeck.drawPile.find(c => c.definitionId === 'veto');
    if (veto) {
      room.powerDeck.drawPile.splice(room.powerDeck.drawPile.indexOf(veto), 1);
      p.powerCards.push(veto);
    }
    const rand = room.powerDeck.draw();
    if (rand) p.powerCards.push(rand);
  }
  room.powerDeck.removeVetos(
    Math.max(0, room.powerDeck.drawPile.filter(c => c.definitionId === 'veto').length - 1)
  );

  room._startHand();
}

// ── Start sim ────────────────────────────────────────────────────────────────
console.log(`Running stress sim: ${NUM_BOTS} bots, ${TARGET_GAMES} games, ${STARTING_CHIPS} chips each\n`);
const room = makeRoom();

// Distribute starting cards for game 1
for (const p of room.players) {
  const veto = room.powerDeck.drawPile.find(c => c.definitionId === 'veto');
  if (veto) {
    room.powerDeck.drawPile.splice(room.powerDeck.drawPile.indexOf(veto), 1);
    p.powerCards.push(veto);
  }
  const rand = room.powerDeck.draw();
  if (rand) p.powerCards.push(rand);
}
room.powerDeck.removeVetos(
  Math.max(0, room.powerDeck.drawPile.filter(c => c.definitionId === 'veto').length - 1)
);

room._startHand();

// Safety timeout
_origST(() => {
  if (totalGames < TARGET_GAMES) {
    err(`TIMEOUT: Only completed ${totalGames}/${TARGET_GAMES} games, ${totalHands} hands`);
    finish();
  }
}, SIM_TIMEOUT_MS);

// ── Final report ─────────────────────────────────────────────────────────────
function finish() {
  const SEP = '═'.repeat(70);
  console.log('\n\n' + SEP);
  console.log('STRESS SIM COMPLETE');
  console.log(SEP);
  console.log(`\nGames completed : ${totalGames}/${TARGET_GAMES}`);
  console.log(`Total hands     : ${totalHands}`);
  console.log(`Avg hands/game  : ${totalGames > 0 ? (totalHands / totalGames).toFixed(1) : 'N/A'}`);

  // ── Hand type distribution ───────────────────────────────────────────────
  console.log('\n── Hand Type Distribution (showdown wins) ──────────────────────────');
  const handOrder = ['HIGH_CARD','PAIR','TWO_PAIR','THREE_OF_A_KIND','STRAIGHT','FLUSH',
    'FULL_HOUSE','FOUR_OF_A_KIND','STRAIGHT_FLUSH','ROYAL_FLUSH','FIVE_OF_A_KIND',
    'FLUSH_HOUSE','FLUSH_FIVE','FOLD_WIN'];
  const totalWins = Object.values(handTypes).reduce((a,b)=>a+b,0);
  for (const ht of handOrder) {
    if (handTypes[ht]) {
      const pct = ((handTypes[ht]/totalWins)*100).toFixed(1);
      console.log(`  ${ht.padEnd(22)} ${String(handTypes[ht]).padStart(4)}  (${pct}%)`);
    }
  }

  // ── Power cards played ───────────────────────────────────────────────────
  console.log('\n── Power Cards Played ──────────────────────────────────────────────');
  const allIds = [
    'promotion','copy_machine','mirrored','burned','yes_you','third_eye_blind',
    'reflop','prophecy','hot_potato','return_reriver','call_in','404_error',
    'chain_reaction','change_clothes','drained','sixth_sense','reborn','show_me',
    'wild_style','eye_patch','risk_taker','veto','blurred','push_through',
    'king_me','reverse_reverse','thats_odd',
    // bounties removed from game
  ];
  const neverPlayed = [];
  for (const id of allIds) {
    if (cardPlays[id]) {
      console.log(`  ${id.padEnd(25)} × ${cardPlays[id]}`);
    } else {
      neverPlayed.push(id);
    }
  }
  if (neverPlayed.length) {
    console.log(`\n  Never played: ${neverPlayed.join(', ')}`);
  }

  // ── Phase sequence analysis ───────────────────────────────────────────────
  console.log('\n── Phase Sequence Issues ───────────────────────────────────────────');
  // Check for missing expected phases
  const byHand = {};
  for (const e of phaseSeq) {
    if (!byHand[e.hand]) byHand[e.hand] = [];
    byHand[e.hand].push(e.to);
  }
  let handsWithShowdown = 0, handsWithWinChoice = 0, handsCompleted = 0;
  for (const [hand, phases] of Object.entries(byHand)) {
    if (phases.includes('showdown'))    handsWithShowdown++;
    if (phases.includes('win_choice'))  handsWithWinChoice++;
    if (phases.includes('hand_complete')) handsCompleted++;
    // Check for hand_complete without win_choice
    if (phases.includes('hand_complete') && !phases.includes('win_choice')) {
      warn(`Hand ${hand}: hand_complete reached without win_choice`);
    }
  }
  console.log(`  Hands reaching showdown   : ${handsWithShowdown}/${totalHands}`);
  console.log(`  Hands reaching win_choice : ${handsWithWinChoice}/${totalHands}`);
  console.log(`  Hands completing fully    : ${handsCompleted}/${totalHands}`);
  const stuck = totalHands - handsCompleted;
  if (stuck > 2) err(`${stuck} hands never reached hand_complete — possible stuck phases`);

  // ── Warnings ─────────────────────────────────────────────────────────────
  console.log('\n── Warnings ────────────────────────────────────────────────────────');
  if (warnings.length === 0) {
    console.log('  ✅ No warnings');
  } else {
    const warnCounts = {};
    for (const w of warnings) {
      const key = w.slice(0, 60);
      warnCounts[key] = (warnCounts[key] || 0) + 1;
    }
    for (const [msg, count] of Object.entries(warnCounts)) {
      console.log(`  ⚠️  (×${count}) ${msg}`);
    }
  }

  // ── Errors ───────────────────────────────────────────────────────────────
  console.log('\n── Errors ──────────────────────────────────────────────────────────');
  if (errors.length === 0) {
    console.log('  ✅ No errors detected');
  } else {
    // Deduplicate
    const errCounts = {};
    for (const e of errors) {
      const key = e.slice(0, 80);
      errCounts[key] = (errCounts[key] || 0) + 1;
    }
    for (const [msg, count] of Object.entries(errCounts)) {
      console.log(`  ❌ (×${count}) ${msg}`);
    }
  }

  console.log('\n' + SEP + '\n');
  process.exit(errors.length > 0 ? 1 : 0);
}
