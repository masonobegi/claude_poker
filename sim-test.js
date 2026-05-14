'use strict';

// ── Speed up all timers 40× so 10s phases become 250ms ─────────────────────
const _origST = global.setTimeout;
const _origCT = global.clearTimeout;
global.setTimeout = (fn, delay, ...args) => _origST(fn, Math.max(50, Math.floor((delay || 0) / 40)), ...args);
global.clearTimeout = _origCT;

// ── Patch Bot to play cards 90% of the time ──────────────────────────────────
const { Bot } = require('./server/src/game/Bot');
const origDecide = Bot.prototype.decidePowerCardPlay;
Bot.prototype.decidePowerCardPlay = function(game, phase, isReactiveWindow) {
  const playable = this.player.powerCards.filter(c => {
    const { canPlayCard } = require('./server/src/game/PowerCardEngine');
    return canPlayCard(c, phase, isReactiveWindow);
  });
  if (playable.length === 0) return null;
  if (Math.random() > 0.10) { // 90% chance to play
    const card = playable[Math.floor(Math.random() * playable.length)];
    const opts = this._buildOpts(card, game);
    return { card, opts };
  }
  return null;
};

const { GameRoom } = require('./server/src/game/GameRoom');

// ── Capture everything ───────────────────────────────────────────────────────
const logs        = [];   // game log messages
const events      = [];   // all socket broadcasts
const errors      = [];   // errors encountered
let   handCount   = 0;
let   gameCount   = 0;
const TARGET_GAMES = 3;

function ts() { return new Date().toISOString().slice(11,23); }
function log(msg) { const e = `[${ts()}] ${msg}`; logs.push(e); }

// ── Mock socket.io ───────────────────────────────────────────────────────────
const playerSockets = {}; // id → { emitted: [] }

const mockIo = {
  to(roomOrId) {
    return {
      emit(event, data) {
        events.push({ target: roomOrId, event, data, ts: Date.now() });
        if (playerSockets[roomOrId]) {
          playerSockets[roomOrId].emitted.push({ event, data });
        }
        // Surface errors
        if (event === 'game:error') {
          errors.push(`[${ts()}] SOCKET ERROR → ${JSON.stringify(data)}`);
        }
      }
    };
  }
};

// ── Create room ──────────────────────────────────────────────────────────────
const room = new GameRoom('TEST', mockIo);

// Intercept addLog to capture messages
const origAddLog = room.addLog.bind(room);
room.addLog = function(msg) {
  log(msg);
  origAddLog(msg);
};

// ── Add 5 bots ───────────────────────────────────────────────────────────────
for (let i = 0; i < 5; i++) {
  const r = room.addBot();
  if (r.error) { console.error('addBot error:', r.error); process.exit(1); }
}

// Set a fake hostId so startGame works
room.hostId = room.players[0]?.id;

// ── Intercept _startHand to count games + top up bot cards ───────────────────
const origStartHand = room._startHand.bind(room);
room._startHand = function() {
  handCount++;
  log(`=== Hand #${handCount} starts (Game ${gameCount+1}) ===`);
  // Give every bot 3 random power cards so there's always action
  for (const p of room.players.filter(p => p.isBot && !p.eliminated)) {
    while (p.powerCards.length < 3) {
      const card = room.powerDeck.draw();
      if (!card) break;
      p.powerCards.push(card);
    }
  }
  origStartHand();
};

// ── Watch for game over ───────────────────────────────────────────────────────
const origSetPhase = room._setPhase.bind(room);
room._setPhase = function(phase) {
  if (phase === 'game_over') {
    gameCount++;
    const standings = room._standings();
    log(`\n🏁 GAME ${gameCount} OVER — Standings:`);
    standings.forEach(s => log(`  #${s.rank} ${s.name}: ${s.chips} chips`));
    log('');

    if (gameCount >= TARGET_GAMES) {
      _origST(finish, 500);
      return; // don't call origSetPhase — game is done
    }
    // Restart for next game
    _origST(() => restartGame(), 300);
    return;
  }
  origSetPhase(phase);
};

// ── Track power card plays for analysis ──────────────────────────────────────
const cardPlayStats = {};
const origPlayPowerCard = room.playPowerCard.bind(room);
room.playPowerCard = function(playerId, instanceId, opts) {
  const player = room.players.find(p => p.id === playerId);
  const card = player?.powerCards.find(c => c.instanceId === instanceId);
  if (card) {
    cardPlayStats[card.definitionId] = (cardPlayStats[card.definitionId] || 0) + 1;
  }
  const result = origPlayPowerCard(playerId, instanceId, opts);
  if (result?.error) {
    errors.push(`[${ts()}] POWER CARD ERROR: ${player?.name} → ${card?.name}: ${result.error}`);
  }
  return result;
};

function restartGame() {
  log(`\n══════════ STARTING GAME ${gameCount + 1} ══════════`);
  // Reset player state for new game
  for (const p of room.players) {
    p.chips = 50000;
    p.eliminated = false;
    p.isActive = true;
    p.powerCards = [];
    p.holeCards = [];
  }
  room.pot = 0;
  room.rolloverPot = 0;
  room.dealerIndex = 0;
  room.orbitCount = 0;
  room.lastOrbitDealerIndex = null;
  room.handCount = 0;
  room.powerDeck.reset();
  room.rankBag.refill();
  room.phase = 'lobby';
  // Re-distribute starting cards
  for (const p of room.players) {
    const veto = room.powerDeck.drawPile.find(c => c.definitionId === 'veto');
    if (veto) {
      room.powerDeck.drawPile.splice(room.powerDeck.drawPile.indexOf(veto), 1);
      p.powerCards.push(veto);
    }
  }
  room.powerDeck.removeVetos(
    Math.max(0, room.powerDeck.drawPile.filter(c => c.definitionId === 'veto').length - 1)
  );
  for (const p of room.players) {
    const card = room.powerDeck.draw();
    if (card) p.powerCards.push(card);
  }
  room._startHand();
}

// ── Start ────────────────────────────────────────────────────────────────────
console.log('Starting simulation: 5 bots, 3 games...\n');
log(`══════════ STARTING GAME 1 ══════════`);

// Distribute starting cards for game 1
for (const p of room.players) {
  const veto = room.powerDeck.drawPile.find(c => c.definitionId === 'veto');
  if (veto) {
    room.powerDeck.drawPile.splice(room.powerDeck.drawPile.indexOf(veto), 1);
    p.powerCards.push(veto);
  }
}
room.powerDeck.removeVetos(
  Math.max(0, room.powerDeck.drawPile.filter(c => c.definitionId === 'veto').length - 1)
);
for (const p of room.players) {
  const card = room.powerDeck.draw();
  if (card) p.powerCards.push(card);
}

room._startHand();

// ── Timeout safety net ───────────────────────────────────────────────────────
_origST(() => {
  if (gameCount < TARGET_GAMES) {
    errors.push(`[${ts()}] TIMEOUT: Simulation didn't finish ${TARGET_GAMES} games (completed ${gameCount})`);
    finish();
  }
}, 120000);

// ── Final report ─────────────────────────────────────────────────────────────
function finish() {
  console.log('\n' + '═'.repeat(70));
  console.log('SIMULATION COMPLETE');
  console.log('═'.repeat(70));

  console.log(`\nGames completed: ${gameCount}/${TARGET_GAMES}`);
  console.log(`Total hands played: ${handCount}`);

  // Game log (last 150 entries)
  console.log('\n── GAME LOG (last 150 lines) ──────────────────────────────────────');
  logs.slice(-150).forEach(l => console.log(l));

  // Power card play stats
  console.log('\n── POWER CARDS PLAYED ──────────────────────────────────────────────');
  const sorted = Object.entries(cardPlayStats).sort((a,b) => b[1]-a[1]);
  if (sorted.length === 0) {
    console.log('  ⚠️  NO power cards were played in any game!');
  } else {
    sorted.forEach(([id, count]) => console.log(`  ${id.padEnd(25)} × ${count}`));
  }

  // Cards NEVER played (potential dead card bugs)
  const allCardIds = [
    'promotion','copy_machine','mirrored','burned','yes_you','third_eye_blind',
    'reflop','prophecy','hot_potato','return_reriver','call_in','404_error',
    'chain_reaction','change_clothes','drained','sixth_sense','reborn','show_me',
    'wild_style','eye_patch','risk_taker','veto','blurred','push_through',
    'king_me','reverse_reverse','thats_odd','royalty','in_the_shadows',
    'lucky_7','straight_up','underdog',
  ];
  const neverPlayed = allCardIds.filter(id => !cardPlayStats[id]);
  if (neverPlayed.length > 0) {
    console.log('\n  Cards never played (may need more hands, or may be broken):');
    neverPlayed.forEach(id => console.log(`    - ${id}`));
  }

  // Errors
  console.log('\n── ERRORS & ANOMALIES ──────────────────────────────────────────────');
  if (errors.length === 0) {
    console.log('  ✅ No errors detected');
  } else {
    errors.forEach(e => console.log('  ❌ ' + e));
  }

  // Event analysis — look for stuck phases, missed transitions
  const phaseChanges = events.filter(e => e.event === 'game:phaseChange');
  const phaseCounts  = {};
  for (const e of phaseChanges) {
    const p = e.data?.phase;
    phaseCounts[p] = (phaseCounts[p] || 0) + 1;
  }
  console.log('\n── PHASE TRANSITIONS ───────────────────────────────────────────────');
  Object.entries(phaseCounts).sort((a,b)=>b[1]-a[1]).forEach(([p,c]) =>
    console.log(`  ${p.padEnd(30)} ${c}×`)
  );

  // Check for hands stuck in dealing / preflop
  const dealing = phaseCounts['dealing'] || 0;
  const preflop = phaseCounts['preflop_betting'] || 0;
  if (dealing > 0 && preflop < dealing * 0.5) {
    console.log(`\n  ⚠️  WARNING: dealing (${dealing}) >> preflop_betting (${preflop}) — possible stuck hand after deal`);
  }

  // Check pot integrity
  const handResults = events.filter(e => e.event === 'game:stateUpdate');
  let negChipsFound = false;
  for (const e of handResults) {
    const players = e.data?.players || [];
    for (const p of players) {
      if (typeof p.chips === 'number' && p.chips < 0) {
        errors.push(`Negative chips: ${p.name} has ${p.chips}`);
        negChipsFound = true;
      }
    }
  }
  if (negChipsFound) {
    console.log('\n  ❌ NEGATIVE CHIPS DETECTED — chip accounting bug');
  } else {
    console.log('\n  ✅ No negative chip values found');
  }

  console.log('\n' + '═'.repeat(70));
  process.exit(0);
}
