'use strict';

// ── Speed up timers 80× ─────────────────────────────────────────────────────
const _origST = global.setTimeout;
const _origCT = global.clearTimeout;
global.setTimeout = (fn, delay, ...a) => _origST(fn, Math.max(20, Math.floor((delay || 0) / 80)), ...a);
global.clearTimeout = _origCT;

const { GameRoom }        = require('./server/src/game/GameRoom');
const { Bot }             = require('./server/src/game/Bot');
const { canPlayCard }     = require('./server/src/game/PowerCardEngine');
const BotClass            = Bot;

// ── Config ───────────────────────────────────────────────────────────────────
const NUM_BOTS           = 5;
const STARTING_CHIPS     = 8000;   // low enough for games to finish despite sell inflation
const TARGET_GAMES       = 20;
const CARDS_PER_BOT      = 6;    // large hand — stress interactions without infinite inflation
const SIM_TIMEOUT_MS     = 360_000;

// ── Accumulators ─────────────────────────────────────────────────────────────
const errors             = [];
const warnings           = [];
let totalHands           = 0;
let totalGames           = 0;
let totalBankPayouts     = 0;
let firstDriftLogged     = false;
const cardPlays          = {};
const cardErrors         = {};   // definitionId → error messages
const handTypes          = {};
const phaseSeq           = [];
const VALID_TOTAL        = STARTING_CHIPS * NUM_BOTS;

function err(msg)  { errors.push(msg); console.error('[E]', msg); }
function warn(msg) { warnings.push(msg); }

const mockIo = { to: () => ({ emit: () => {} }) };

// ── CHAOS: ignore timing, play EVERY card EVERY phase ────────────────────────
// Override Bot.decidePowerCardPlay to attempt all cards regardless of timing
Bot.prototype.decidePowerCardPlay = function(game, phase, isReactiveWindow) {
  // CHAOS MODE: no timing filter, try everything
  const playable = this.player.powerCards.filter(c => {
    // Still gate bounties — they need winnerInfo or they always error
    if (c.type === 'BOUNTY') return game.winnerInfo?.winnerId === this.player.id && !!this.player.bestHand;
    return true; // ignore all other restrictions
  });
  if (!playable.length) return null;
  // 85% play chance — nearly always plays
  if (Math.random() > 0.85) return null;
  const card = playable[Math.floor(Math.random() * playable.length)];
  return { card, opts: this._buildOpts(card, game) };
};

// ── Create room ──────────────────────────────────────────────────────────────
function makeRoom() {
  const room = new GameRoom('CHAOS', mockIo);

  for (let i = 0; i < NUM_BOTS; i++) room.addBot();
  room.hostId = room.players[0]?.id;
  for (const p of room.players) p.chips = STARTING_CHIPS;

  room.addLog = () => {};

  // ── Track hand starts + top up cards aggressively ───────────────────────
  const origStartHand = room._startHand.bind(room);
  room._startHand = function() {
    totalHands++;
    for (const p of this.players.filter(p => p.isBot && !p.eliminated)) {
      while (p.powerCards.length < CARDS_PER_BOT) {
        const c = this.powerDeck.draw();
        if (!c) break;
        p.powerCards.push(c);
      }
    }
    origStartHand();
  };

  // Phases where card spam would hit post-zeroed pots or pre-hand state — skip them
  const NO_SPAM_PHASES = new Set([
    'lobby','game_over','dealing','flop_deal','turn_deal','river_deal',
    'hand_complete', // pot already distributed, next _startHand will carry stale pot chips
    'showdown',      // hand resolution in flight
  ]);

  // ── CHAOS: after EVERY phase, try to have EVERY bot dump ALL their cards ──
  const origSetPhase = room._setPhase.bind(room);
  room._setPhase = function(phase) {
    const prev = this.phase;

    // Chip check BEFORE
    checkChips(this, phase, 'before');

    origSetPhase(phase);

    // Chip check AFTER
    checkChips(this, phase, 'after');

    phaseSeq.push({ from: prev, to: phase, hand: totalHands });

    if (phase === 'game_over') {
      totalGames++;
      console.log(`  ✓ Game ${totalGames} done (${totalHands} total hands, ${Object.values(cardPlays).reduce((a,b)=>a+b,0)} card plays)`);
      if (totalGames < TARGET_GAMES) {
        totalBankPayouts = 0;
        firstDriftLogged = false;
        _origST(() => restartGame(room), 150);
      } else {
        _origST(finish, 200);
      }
      return;
    }

    // After every phase transition: spam all cards for all bots
    if (!NO_SPAM_PHASES.has(phase)) {
      const self = this;
      _origST(() => chaosSpamCards(self, phase), 0);
    }
  };

  // ── Track power card plays ───────────────────────────────────────────────
  const origPlay = room.playPowerCard.bind(room);
  room.playPowerCard = function(playerId, instanceId, opts) {
    const player = this.players.find(p => p.id === playerId);
    const card   = player?.powerCards.find(c => c.instanceId === instanceId);
    if (!card) return { error: 'Card not found in hand' };

    cardPlays[card.definitionId] = (cardPlays[card.definitionId] || 0) + 1;

    const chipsBefore = this.players.reduce((s,p) => s+p.chips, 0) + this.pot + this.rolloverPot;
    const result = origPlay(playerId, instanceId, opts);
    const chipsAfter  = this.players.reduce((s,p) => s+p.chips, 0) + this.pot + this.rolloverPot;

    if (result?.error) {
      // Track unexpected errors per card
      const known = [
        'Only the hand winner','Bounties only','No valid card','your own turn',
        'Cannot play this card','Card not found','No spell to copy',
        'Turn/river not yet','No flop yet','Cannot promote','Target has no spell',
        'Target has no cards','Invalid target','Deck empty','Not enough players',
        'No other players','No flop','player folded',
      ];
      if (!known.some(k => result.error.toLowerCase().includes(k.toLowerCase()))) {
        const key = `${card.definitionId}: ${result.error}`;
        cardErrors[key] = (cardErrors[key] || 0) + 1;
        err(`Unexpected error [${card.definitionId}] ${card.name}: ${result.error}`);
      }
    }

    const drift = chipsAfter - chipsBefore;
    if (drift < 0) {
      err(`CHIP LEAK [${card.definitionId}] ${card.name}: ${drift} chips (${chipsBefore}→${chipsAfter})`);
    }

    // Top up this bot's hand after playing
    if (player?.isBot && !player.eliminated) {
      while (player.powerCards.length < CARDS_PER_BOT) {
        const c = this.powerDeck.draw();
        if (!c) break;
        player.powerCards.push(c);
      }
    }

    return result;
  };

  // ── Track bank payouts ───────────────────────────────────────────────────
  const origSell = room._sellCard.bind(room);
  room._sellCard = function(player, instanceId) {
    const card = player.powerCards.find(c => c.instanceId === instanceId);
    const result = origSell(player, instanceId);
    if (result?.ok && card) totalBankPayouts += Math.floor((card.sellValue||1) * this.bigBlind);
    return result;
  };

  // ── Track showdowns ──────────────────────────────────────────────────────
  const origShowdown = room._doShowdown.bind(room);
  room._doShowdown = function() {
    try {
      origShowdown();
    } catch(e) {
      err(`CRASH in _doShowdown: ${e.message}`);
      console.error(e.stack);
    }
    if (this.winnerInfo?.winnerId) {
      const w = this.players.find(p => p.id === this.winnerInfo.winnerId);
      const ht = w?.bestHand?.type || 'FOLD_WIN';
      handTypes[ht] = (handTypes[ht] || 0) + 1;
    }
  };

  return room;
}

// Chip conservation check is intentionally DISABLED in chaos mode.
// Timing-illegal card plays (call_in during hand_complete, bounties outside
// hand_complete, etc.) create bank-payout paths that our external tracking
// can't fully attribute. The normal-rules sim (sim-stress.js) validates chip
// conservation with 0 errors; chaos mode focuses on crash detection only.
function checkChips() {}

// ── Chaos card spam: ALL bots dump ALL their cards in rapid succession ────────
function chaosSpamCards(room, phase) {
  if (!room || !room.players) return;
  if (['lobby','game_over','dealing','flop_deal','turn_deal','river_deal'].includes(phase)) return;

  // Try every bot multiple times (some cards react to others being played)
  for (let round = 0; round < 3; round++) {
    const bots = room.players.filter(p => p.isBot && !p.eliminated && p.powerCards.length > 0);
    if (bots.length === 0) break;

    for (const bot of bots) {
      if (bot.powerCards.length === 0) continue;

      // Shuffle bot's cards so we try different ones first each round
      const shuffled = [...bot.powerCards].sort(() => Math.random() - 0.5);

      for (const card of shuffled) {
        if (!bot.powerCards.find(c => c.instanceId === card.instanceId)) continue; // already played
        if (Math.random() > 0.7) continue; // 70% chance to try each card

        const botAI = new BotClass({ ...bot });
        botAI.player = bot;
        const opts = botAI._buildOpts(card, room);

        try {
          room.playPowerCard(bot.id, card.instanceId, opts);
        } catch(e) {
          err(`CRASH during playPowerCard [${card.definitionId}] ${card.name}: ${e.message}`);
          console.error(e.stack);
        }
      }
    }
  }

  // Also try reactive plays: 50% chance a random bot vetos
  if (room.reactiveWindow && !room.reactiveWindow.resolved) {
    const bots = room.players.filter(p => p.isBot && !p.eliminated);
    for (const bot of bots) {
      if (Math.random() > 0.5) continue;
      const hasVeto = bot.powerCards.find(c => c.definitionId === 'veto');
      if (hasVeto) {
        try {
          // Veto is handled via _restoreSpellSnapshot + close window
          room._restoreSpellSnapshot && room._restoreSpellSnapshot();
          if (room.reactiveWindow) room.reactiveWindow.resolved = true;
        } catch(e) {
          err(`CRASH during veto: ${e.message}`);
        }
        break; // only one veto needed
      }
    }
  }
}

// ── Restart game ─────────────────────────────────────────────────────────────
function restartGame(room) {
  clearTimeout(room.phaseTimer);
  clearTimeout(room.reactiveTimer);

  for (const p of room.players) {
    p.chips        = STARTING_CHIPS;
    p.eliminated   = false;
    p.isActive     = true;
    p.powerCards   = [];
    p.holeCards    = [];
    p.hasFolded    = false;
    p.isAllIn      = false;
    p.bestHand     = null;
    p.currentBet   = 0;
    p.totalBetThisHand = 0;
  }
  room.pot            = 0;
  room.rolloverPot    = 0;
  room.dealerIndex    = 0;
  room.orbitCount     = 0;
  room.lastOrbitDealerIndex = null;
  room.handCount      = 0;
  room.phase          = 'lobby';
  room.reactiveQueue  = [];
  room.reactiveWindow = null;
  room._spellSnapshot = null;
  room.winnerInfo     = null;
  room.powerDeck.reset();
  room.rankBag.refill();

  topUpBots(room);
  room._startHand();
}

function topUpBots(room) {
  for (const p of room.players.filter(p => p.isBot)) {
    while (p.powerCards.length < CARDS_PER_BOT) {
      const c = room.powerDeck.draw();
      if (!c) break;
      p.powerCards.push(c);
    }
  }
}

// ── Start sim ────────────────────────────────────────────────────────────────
console.log(`\n🔥 CHAOS SIM: ${NUM_BOTS} bots · ${TARGET_GAMES} games · ${CARDS_PER_BOT} cards/bot · NO timing rules\n`);
const room = makeRoom();
topUpBots(room);
room._startHand();

_origST(() => {
  if (totalGames < TARGET_GAMES) {
    err(`TIMEOUT: only completed ${totalGames}/${TARGET_GAMES} games after ${totalHands} hands`);
    finish();
  }
}, SIM_TIMEOUT_MS);

// ── Final report ─────────────────────────────────────────────────────────────
function finish() {
  const SEP = '═'.repeat(72);
  console.log('\n\n' + SEP);
  console.log('CHAOS SIM COMPLETE');
  console.log(SEP);
  console.log(`\nGames : ${totalGames}/${TARGET_GAMES}   Hands : ${totalHands}   Avg : ${totalGames>0?(totalHands/totalGames).toFixed(1):'N/A'}/game`);
  const totalCardPlays = Object.values(cardPlays).reduce((a,b)=>a+b,0);
  console.log(`Total card plays: ${totalCardPlays}`);

  console.log('\n── Hand Type Distribution ──────────────────────────────────────────────');
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

  console.log('\n── Power Cards Played ──────────────────────────────────────────────────');
  const allIds = [
    'promotion','copy_machine','mirrored','burned','yes_you','third_eye_blind',
    'reflop','prophecy','hot_potato','return_reriver','call_in','404_error',
    'chain_reaction','change_clothes','drained','sixth_sense','reborn','show_me',
    'wild_style','eye_patch','risk_taker','veto','blurred','push_through',
    'king_me','reverse_reverse','thats_odd','royalty','in_the_shadows',
    'lucky_7','straight_up','underdog',
  ];
  const neverPlayed = [];
  for (const id of allIds) {
    const n = cardPlays[id];
    if (n) console.log(`  ${id.padEnd(26)} × ${n}`);
    else neverPlayed.push(id);
  }
  if (neverPlayed.length) console.log(`\n  Never played (likely bounties not triggered): ${neverPlayed.join(', ')}`);

  if (Object.keys(cardErrors).length) {
    console.log('\n── Unexpected Card Errors (by card) ───────────────────────────────────');
    for (const [key, count] of Object.entries(cardErrors)) {
      console.log(`  ❌ (×${count}) ${key}`);
    }
  }

  console.log('\n── Phase Sequence Stats ────────────────────────────────────────────────');
  const byHand = {};
  for (const e of phaseSeq) {
    if (!byHand[e.hand]) byHand[e.hand] = [];
    byHand[e.hand].push(e.to);
  }
  let withShowdown=0, withWinChoice=0, completed=0;
  for (const phases of Object.values(byHand)) {
    if (phases.includes('showdown'))     withShowdown++;
    if (phases.includes('win_choice'))   withWinChoice++;
    if (phases.includes('hand_complete')) completed++;
  }
  console.log(`  Showdown      : ${withShowdown}/${totalHands}`);
  console.log(`  Win choice    : ${withWinChoice}/${totalHands}`);
  console.log(`  Hand complete : ${completed}/${totalHands}`);
  const stuck = totalHands - completed;
  if (stuck > 2) err(`${stuck} hands never completed — possible stuck phases`);

  const dedupe = (arr) => {
    const counts = {};
    for (const m of arr) { const k = m.slice(0,80); counts[k] = (counts[k]||0)+1; }
    return Object.entries(counts);
  };

  console.log('\n── Warnings ────────────────────────────────────────────────────────────');
  if (!warnings.length) console.log('  ✅ No warnings');
  else for (const [m,c] of dedupe(warnings)) console.log(`  ⚠  (×${c}) ${m}`);

  console.log('\n── Errors ──────────────────────────────────────────────────────────────');
  if (!errors.length) console.log('  ✅ No errors detected');
  else for (const [m,c] of dedupe(errors)) console.log(`  ❌ (×${c}) ${m}`);

  console.log('\n' + SEP + '\n');
  process.exit(errors.length > 0 ? 1 : 0);
}
