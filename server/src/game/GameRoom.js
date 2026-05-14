'use strict';

const { v4: uuidv4 } = require('uuid');
const { DeckManager } = require('./DeckManager');
const { PowerCardDeck, CARD_TYPE } = require('./PowerCardDeck');
const { RankBag } = require('./RankBag');
const { resolveEffect, canPlayCard, spin } = require('./PowerCardEngine');
const { resolveShowdown } = require('./WinResolution');
const { Bot } = require('./Bot');

const PHASES = {
  LOBBY:                    'lobby',
  BEFORE_DEAL:              'before_deal',
  DEALING:                  'dealing',
  BEFORE_PREFLOP:           'before_preflop',
  PREFLOP_BETTING:          'preflop_betting',
  BEFORE_FLOP:              'before_flop',
  FLOP_DEAL:                'flop_deal',
  AFTER_FLOP_BEFORE_ACTION: 'after_flop_before_action',
  FLOP_BETTING:             'flop_betting',
  BEFORE_TURN:              'before_turn',
  TURN_DEAL:                'turn_deal',
  TURN_BETTING:             'turn_betting',
  AFTER_TURN:               'after_turn',
  BEFORE_RIVER:             'before_river',
  RIVER_DEAL:               'river_deal',
  AFTER_RIVER_BEFORE_ACTION:'after_river_before_action',
  RIVER_BETTING:            'river_betting',
  AFTER_RIVER:              'after_river',
  SHOWDOWN:                 'showdown',
  WIN_CHOICE:               'win_choice',
  HAND_COMPLETE:            'hand_complete',
  GAME_OVER:                'game_over',
};

// Phase window durations (ms) — windows where players can play power cards
const PHASE_DURATION = {
  before_deal:              10000,
  before_preflop:           10000,
  after_flop_before_action: 12000,
  after_turn:               10000, // window between turn reveal and turn betting
  after_river_before_action:12000,
  after_river:              10000,
  before_flop:              2000,
  before_turn:              2000,
  before_river:             2000,
  flop_deal:                1200,
  turn_deal:                1200,
  river_deal:               1200,
  dealing:                  1200,
  showdown:                 4000,
  win_choice:               20000,
  hand_complete:            3000,
};

// Phases that are power-card windows (human gets a countdown banner)
const POWER_CARD_WINDOW_PHASES = new Set([
  'before_deal', 'before_preflop',
  'after_flop_before_action', 'after_turn',
  'after_river_before_action', 'after_river',
]);

const STARTING_CHIPS = 50000;
const STARTING_BIG_BLIND = 1000;
const MAX_POWER_CARDS = 4;
const REACTIVE_WINDOW_MS = 5000;
const BOT_ACTION_DELAY_MS = 1200;

class GameRoom {
  constructor(roomCode, io) {
    this.roomCode = roomCode;
    this.io = io;
    this.phase = PHASES.LOBBY;
    this.players = [];       // { id, name, isBot, bot?, chips, holeCards, powerCards, ... }
    this.communityCards = [];
    this.pot = 0;
    this.rolloverPot = 0;
    this.currentBet = 0;
    this.dealerIndex = 0;
    this.activePlayerIndex = 0;
    this.bigBlind = STARTING_BIG_BLIND;
    this.deck = new DeckManager();
    this.powerDeck = new PowerCardDeck();
    this.rankBag = new RankBag();
    this.mods = {};           // { blurred, pushThrough, kingMe, reverseReverse, thatIsOdd, wildRanks, disabledRanks }
    this.wildRanks = [];
    this.disabledRanks = [];
    this.orbitCount = 0;
    this.lastOrbitDealerIndex = null;
    this.lastPlayedSpell = null;
    this.reactiveWindow = null;
    this.callInActive = false;
    this.vetoActive = false;
    this.log = [];
    this.phaseTimer = null;
    this.phaseDeadline = null; // timestamp when current phase auto-advances
    this.winnerInfo = null;  // { winnerId, pot, runnerUpId }
    this.pendingPowerCard = null; // for input-requiring cards
    this.hostId = null;
    this.handCount = 0;
    this.lastHandRunnerUp = null;
  }

  // ── Player Management ──────────────────────────────────────────────────────

  addHumanPlayer(socketId, name) {
    if (this.players.length >= 8) return { error: 'Room full' };
    if (this.phase !== PHASES.LOBBY) return { error: 'Game in progress' };
    const player = this._makePlayer(socketId, name, false);
    this.players.push(player);
    if (!this.hostId) this.hostId = socketId;
    this.broadcast('lobby:state', this._lobbyState());
    return { ok: true, playerId: socketId };
  }

  addBot() {
    if (this.players.length >= 8) return { error: 'Room full' };
    if (this.phase !== PHASES.LOBBY) return { error: 'Game in progress' };
    const botId = 'bot_' + uuidv4().slice(0, 6);
    const botNames = ['Merlin','Gandalf','Dumbledore','Morgana','Saruman','Circe','Hex','Vex'];
    const usedNames = this.players.map(p => p.name);
    const name = botNames.find(n => !usedNames.includes(n)) || `Bot-${botId.slice(4, 7)}`;
    const player = this._makePlayer(botId, name, true);
    player.bot = new Bot(player);
    this.players.push(player);
    this.broadcast('lobby:state', this._lobbyState());
    return { ok: true, botId };
  }

  removePlayer(socketId) {
    this.players = this.players.filter(p => p.id !== socketId);
    if (this.hostId === socketId && this.players.length > 0) {
      this.hostId = this.players.find(p => !p.isBot)?.id || this.players[0].id;
    }
    this.broadcast('lobby:state', this._lobbyState());
  }

  _makePlayer(id, name, isBot) {
    return {
      id, name, isBot,
      bot: null,
      chips: STARTING_CHIPS,
      holeCards: [],
      powerCards: [],
      currentBet: 0,
      totalBetThisHand: 0,
      hasFolded: false,
      isAllIn: false,
      isActive: true,
      eliminated: false,
      eyePatchIndex: null,
      revealedHoleCardIndices: [],
      prophesiedCards: null,
      scoringCards: null,
      bestHand: null,
      hasActedThisStreet: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
    };
  }

  // ── Game Start ─────────────────────────────────────────────────────────────

  startGame(requesterId) {
    if (requesterId !== this.hostId) return { error: 'Only host can start' };
    if (this.players.length < 2) return { error: 'Need at least 2 players' };
    if (this.phase !== PHASES.LOBBY) return { error: 'Already started' };

    // Distribute starting veto cards
    for (const p of this.players) {
      const veto = this.powerDeck.drawPile.find(c => c.definitionId === 'veto');
      if (veto) {
        this.powerDeck.drawPile.splice(this.powerDeck.drawPile.indexOf(veto), 1);
        p.powerCards.push(veto);
      }
    }
    // Remove extra vetos from deck, keep only 1
    const extraVetos = this.powerDeck.removeVetos(Math.max(0, this._countCardsInDeck('veto') - 1));
    this.powerDeck._setAside = extraVetos;

    // Give each player 1 random starting power card
    for (const p of this.players) {
      const card = this.powerDeck.draw();
      if (card) p.powerCards.push(card);
    }

    this.dealerIndex = 0;
    this.lastOrbitDealerIndex = 0;
    this._startHand();
    return { ok: true };
  }

  _countCardsInDeck(definitionId) {
    return this.powerDeck.drawPile.filter(c => c.definitionId === definitionId).length;
  }

  // ── Hand Flow ──────────────────────────────────────────────────────────────

  _startHand() {
    this.handCount++;
    this.deck.reset();
    this.communityCards = [];
    this.pot = this.rolloverPot;
    this.rolloverPot = 0;
    this.currentBet = 0;
    this.mods = {};
    this.wildRanks = [];
    this.disabledRanks = [];
    this.callInActive = false;
    this.vetoActive = false;
    this.lastPlayedSpell = null;
    this.winnerInfo = null;
    this.pendingPowerCard = null;

    // Reset player state for new hand
    const active = this.players.filter(p => !p.eliminated && p.chips > 0);
    for (const p of this.players) {
      p.holeCards = [];
      p.currentBet = 0;
      p.totalBetThisHand = 0;
      p.hasFolded = false;
      p.isAllIn = false;
      p.hasActedThisStreet = false;
      p.isDealer = false;
      p.isSmallBlind = false;
      p.isBigBlind = false;
      p.eyePatchIndex = null;
      p.revealedHoleCardIndices = [];
      p.prophesiedCards = null;
      p.scoringCards = null;
      p.bestHand = null;
      p.isActive = !p.eliminated && p.chips > 0;
    }

    if (active.length < 2) {
      this._setPhase(PHASES.GAME_OVER);
      return;
    }

    // Advance dealer
    this._advanceDealer();

    this.addLog(`--- Hand #${this.handCount} begins ---`);
    this._setPhase(PHASES.BEFORE_DEAL);
  }

  _advanceDealer() {
    const active = this.players.filter(p => !p.eliminated && p.chips > 0);
    if (active.length === 0) return;

    // Move dealer to next active player
    let idx = this.dealerIndex;
    do {
      idx = (idx + 1) % this.players.length;
    } while (this.players[idx].eliminated || this.players[idx].chips === 0);
    this.dealerIndex = idx;
    this.players[this.dealerIndex].isDealer = true;

    // Assign blinds
    const activePlayers = this.players.filter(p => !p.eliminated && p.chips > 0);
    const dealerPos = activePlayers.findIndex(p => p.id === this.players[this.dealerIndex].id);
    const sbPlayer = activePlayers[(dealerPos + 1) % activePlayers.length];
    const bbPlayer = activePlayers[(dealerPos + 2) % activePlayers.length];

    if (activePlayers.length === 2) {
      // Heads-up: dealer is SB
      sbPlayer.isSmallBlind = false;
      bbPlayer.isBigBlind = false;
      this.players[this.dealerIndex].isSmallBlind = true;
      activePlayers[(dealerPos + 1) % activePlayers.length].isBigBlind = true;
    } else {
      sbPlayer.isSmallBlind = true;
      bbPlayer.isBigBlind = true;
    }

    // Check for orbit completion
    if (this.lastOrbitDealerIndex !== null && this.dealerIndex === this.lastOrbitDealerIndex) {
      this.orbitCount++;
      this._doOrbitDraw();
    }
    if (this.lastOrbitDealerIndex === null) {
      this.lastOrbitDealerIndex = this.dealerIndex;
    }
  }

  _doOrbitDraw() {
    this.addLog(`Orbit ${this.orbitCount} complete! Everyone draws a power card.`);
    for (const p of this.players.filter(p => !p.eliminated && p.chips > 0)) {
      this._drawPowerCardForPlayer(p);
    }
    this.broadcast('game:orbitComplete', { orbitCount: this.orbitCount });
  }

  // ── Phase Transitions ──────────────────────────────────────────────────────

  _setPhase(phase) {
    clearTimeout(this.phaseTimer);
    this.phase = phase;
    const duration = PHASE_DURATION[phase];
    this.phaseDeadline = duration ? Date.now() + duration : null;
    this.broadcast('game:phaseChange', { phase });
    this.broadcastState();

    if (phase === PHASES.BEFORE_DEAL) {
      // Short window for BEFORE_DEAL power cards; bots auto-play
      this._botPlayPhaseCards();
      this.phaseTimer = setTimeout(() => this._deal(), duration || 8000);
    }
    else if (phase === PHASES.DEALING) {
      this.phaseTimer = setTimeout(() => this._afterDeal(), duration || 1500);
    }
    else if (phase === PHASES.BEFORE_PREFLOP) {
      this._botPlayPhaseCards();
      this.phaseTimer = setTimeout(() => this._startPreflop(), duration || 8000);
    }
    else if (phase === PHASES.PREFLOP_BETTING) {
      this._startBettingRound(true);
    }
    else if (phase === PHASES.BEFORE_FLOP) {
      this._botPlayPhaseCards();
      this.phaseTimer = setTimeout(() => this._dealFlop(), duration || 2000);
    }
    else if (phase === PHASES.FLOP_DEAL) {
      this.phaseTimer = setTimeout(() => this._setPhase(PHASES.AFTER_FLOP_BEFORE_ACTION), duration || 1500);
    }
    else if (phase === PHASES.AFTER_FLOP_BEFORE_ACTION) {
      this._botPlayPhaseCards();
      this.phaseTimer = setTimeout(() => this._setPhase(PHASES.FLOP_BETTING), duration || 8000);
    }
    else if (phase === PHASES.FLOP_BETTING) {
      this._startBettingRound(false);
    }
    else if (phase === PHASES.BEFORE_TURN) {
      this._botPlayPhaseCards();
      this.phaseTimer = setTimeout(() => this._dealTurn(), duration || 2000);
    }
    else if (phase === PHASES.AFTER_TURN) {
      // Window between turn reveal and turn betting — Return/Reriver can be played here
      this._botPlayPhaseCards();
      this.phaseTimer = setTimeout(() => this._setPhase(PHASES.TURN_BETTING), duration || 10000);
    }
    else if (phase === PHASES.TURN_DEAL) {
      this.phaseTimer = setTimeout(() => this._setPhase(PHASES.AFTER_TURN), duration || 1200);
    }
    else if (phase === PHASES.TURN_BETTING) {
      this._startBettingRound(false);
    }
    else if (phase === PHASES.BEFORE_RIVER) {
      this._botPlayPhaseCards();
      this.phaseTimer = setTimeout(() => this._dealRiver(), duration || 2000);
    }
    else if (phase === PHASES.RIVER_DEAL) {
      this.phaseTimer = setTimeout(() => this._setPhase(PHASES.AFTER_RIVER_BEFORE_ACTION), duration || 1200);
    }
    else if (phase === PHASES.AFTER_RIVER_BEFORE_ACTION) {
      // Window between river reveal and river betting — Sixth Sense + Return/Reriver here
      this._botPlayPhaseCards();
      this.phaseTimer = setTimeout(() => this._setPhase(PHASES.RIVER_BETTING), duration || 12000);
    }
    else if (phase === PHASES.RIVER_BETTING) {
      this._startBettingRound(false);
    }
    else if (phase === PHASES.AFTER_RIVER) {
      // Post-river window before showdown
      this._botPlayPhaseCards();
      this.phaseTimer = setTimeout(() => this._doShowdown(), duration || 10000);
    }
    else if (phase === PHASES.SHOWDOWN) {
      this.phaseTimer = setTimeout(() => this._doWinChoice(), duration || 4000);
    }
    else if (phase === PHASES.WIN_CHOICE) {
      // Bots resolve immediately
      this._botWinChoice();
      this.phaseTimer = setTimeout(() => this._defaultWinChoice(), duration || 20000);
    }
    else if (phase === PHASES.HAND_COMPLETE) {
      this._resolveBounties();
      this._botPlayPhaseCards();
      this.phaseTimer = setTimeout(() => this._endHand(), duration || 3000);
    }
    else if (phase === PHASES.GAME_OVER) {
      this.broadcast('game:over', { standings: this._standings() });
    }
  }

  // ── Deal ──────────────────────────────────────────────────────────────────

  _deal() {
    this._setPhase(PHASES.DEALING);
    const active = this.players.filter(p => p.isActive);

    // Post blinds
    for (const p of active) {
      let blind = 0;
      if (p.isSmallBlind) blind = Math.floor(this.bigBlind / 2);
      if (p.isBigBlind) blind = this.bigBlind;
      if (blind > 0) {
        const paid = Math.min(blind, p.chips);
        p.chips -= paid;
        p.currentBet = paid;
        p.totalBetThisHand += paid;
        this.pot += paid;
        if (p.chips === 0) p.isAllIn = true;
      }
    }
    this.currentBet = this.bigBlind;

    // Deal 2 hole cards each
    for (const p of active) {
      p.holeCards = this.deck.deal(2);
    }

    // Notify each player of their private cards
    for (const p of active) {
      if (!p.isBot) {
        this.io.to(p.id).emit('game:cardsDealt', {
          yourCards: p.holeCards,
          eyePatchIndex: p.eyePatchIndex,
        });
      }
    }

    this.addLog('Cards dealt.');
    // Short pause, then pre-flop window
    setTimeout(() => this._setPhase(PHASES.BEFORE_PREFLOP), 1500);
  }

  _afterDeal() {
    this._setPhase(PHASES.BEFORE_PREFLOP);
  }

  // ── Community Cards ────────────────────────────────────────────────────────

  _dealFlop() {
    this.deck.burn(1);
    const flop = this.deck.deal(3);
    this.communityCards.push(...flop);
    this.addLog(`Flop: ${flop.map(c => `${c.rank}${c.suit}`).join(' ')}`);
    this.broadcast('game:communityCards', { cards: this.communityCards });
    this._setPhase(PHASES.FLOP_DEAL);
  }

  _dealTurn() {
    this.deck.burn(1);
    const turn = this.deck.dealOne();
    this.communityCards.push(turn);
    this.addLog(`Turn: ${turn.rank}${turn.suit}`);
    this.broadcast('game:communityCards', { cards: this.communityCards });
    this._setPhase(PHASES.TURN_DEAL); // TURN_DEAL → AFTER_TURN (10s window) → TURN_BETTING
  }

  _dealRiver() {
    this.deck.burn(1);
    const river = this.deck.dealOne();
    this.communityCards.push(river);
    this.addLog(`River: ${river.rank}${river.suit}`);
    this.broadcast('game:communityCards', { cards: this.communityCards });
    this._setPhase(PHASES.RIVER_DEAL);
  }

  // ── Betting ────────────────────────────────────────────────────────────────

  _startPreflop() {
    if (this.callInActive) {
      // Call In was played: skip pre-flop betting
      this.callInActive = false;
      this._setPhase(PHASES.BEFORE_FLOP);
      return;
    }
    this._setPhase(PHASES.PREFLOP_BETTING);
  }

  _startBettingRound(isPreflop) {
    const active = this.players.filter(p => p.isActive && !p.hasFolded && !p.isAllIn);

    // Reset per-street action tracking
    for (const p of this.players) {
      p.hasActedThisStreet = p.hasFolded || p.isAllIn || p.eliminated || !p.isActive;
    }
    // Reset bets for post-flop
    if (!isPreflop) {
      for (const p of this.players) p.currentBet = 0;
      this.currentBet = 0;
    }

    // Find first actor
    if (isPreflop) {
      // Start after BB
      const active2 = this.players.filter(p => p.isActive && !p.hasFolded && !p.isAllIn);
      const bbIdx = this.players.findIndex(p => p.isBigBlind);
      let firstIdx = (bbIdx + 1) % this.players.length;
      let attempts = 0;
      while ((this.players[firstIdx].hasFolded || this.players[firstIdx].isAllIn || !this.players[firstIdx].isActive) && attempts < this.players.length) {
        firstIdx = (firstIdx + 1) % this.players.length;
        attempts++;
      }
      this.activePlayerIndex = firstIdx;
    } else {
      // Start after dealer (first active)
      let firstIdx = (this.dealerIndex + 1) % this.players.length;
      let attempts = 0;
      while ((this.players[firstIdx].hasFolded || this.players[firstIdx].isAllIn || !this.players[firstIdx].isActive) && attempts < this.players.length) {
        firstIdx = (firstIdx + 1) % this.players.length;
        attempts++;
      }
      this.activePlayerIndex = firstIdx;
    }

    this._promptCurrentPlayer();
  }

  _promptCurrentPlayer() {
    const p = this.players[this.activePlayerIndex];
    if (!p) { this._endBettingRound(); return; }

    const callAmount = Math.max(0, this.currentBet - p.currentBet);
    const minRaise = this.currentBet + this.bigBlind;

    this.broadcastState();
    this.broadcast('game:actionRequired', {
      playerId: p.id,
      callAmount,
      minRaise,
      maxRaise: p.chips + p.currentBet,
    });

    if (p.isBot) {
      setTimeout(() => {
        // Bot may play a power card first
        const botPlay = p.bot?.decidePowerCardPlay(this._gameState(), this.phase, false);
        if (botPlay) {
          this.playPowerCard(p.id, botPlay.card.instanceId, botPlay.opts);
        }
        // Then take betting action
        const action = p.bot?.decideBettingAction(this._gameState());
        if (action) this.playerAction(p.id, action.action, action.amount);
      }, BOT_ACTION_DELAY_MS);
    }
  }

  playerAction(playerId, action, amount) {
    const p = this.players[this.activePlayerIndex];
    if (!p || p.id !== playerId) return { error: 'Not your turn' };

    const callAmount = Math.max(0, this.currentBet - p.currentBet);

    switch (action) {
      case 'fold':
        p.hasFolded = true;
        this.addLog(`${p.name} folds`);
        break;
      case 'check':
        if (callAmount > 0) return { error: 'Cannot check, must call' };
        this.addLog(`${p.name} checks`);
        break;
      case 'call': {
        const paid = Math.min(callAmount, p.chips);
        p.chips -= paid;
        p.currentBet += paid;
        p.totalBetThisHand += paid;
        this.pot += paid;
        if (p.chips === 0) { p.isAllIn = true; this.addLog(`${p.name} calls all-in`); }
        else this.addLog(`${p.name} calls ${paid}`);
        break;
      }
      case 'raise': {
        const raiseTotal = Math.min(amount || this.currentBet + this.bigBlind, p.chips + p.currentBet);
        const additional = raiseTotal - p.currentBet;
        const paid = Math.min(additional, p.chips);
        p.chips -= paid;
        p.currentBet = p.currentBet + paid;
        p.totalBetThisHand += paid;
        this.pot += paid;
        this.currentBet = Math.max(this.currentBet, p.currentBet);
        if (p.chips === 0) p.isAllIn = true;
        this.addLog(`${p.name} raises to ${p.currentBet}`);
        // Others need to act again
        for (const other of this.players) {
          if (other.id !== p.id && !other.hasFolded && !other.isAllIn && other.isActive) {
            other.hasActedThisStreet = false;
          }
        }
        break;
      }
    }

    p.hasActedThisStreet = true;
    this.broadcast('game:playerActed', { playerId, action, amount });

    this._nextPlayerOrEndRound();
  }

  _nextPlayerOrEndRound() {
    // Check if only one player remains
    const remaining = this.players.filter(p => p.isActive && !p.hasFolded);
    if (remaining.length === 1) {
      this._awardToSoleWinner(remaining[0]);
      return;
    }

    // Check if all active non-folded players have acted and are even
    const needToAct = this.players.filter(p =>
      p.isActive && !p.hasFolded && !p.isAllIn &&
      (!p.hasActedThisStreet || p.currentBet < this.currentBet)
    );

    if (needToAct.length === 0) {
      this._endBettingRound();
      return;
    }

    // Find next player to act
    let next = (this.activePlayerIndex + 1) % this.players.length;
    let attempts = 0;
    while (
      (this.players[next].hasFolded || this.players[next].isAllIn || !this.players[next].isActive || this.players[next].hasActedThisStreet && this.players[next].currentBet >= this.currentBet)
      && attempts < this.players.length
    ) {
      next = (next + 1) % this.players.length;
      attempts++;
    }

    // If we couldn't find a player to act, end round
    if (attempts >= this.players.length) {
      this._endBettingRound();
      return;
    }

    this.activePlayerIndex = next;
    this._promptCurrentPlayer();
  }

  _endBettingRound() {
    const remaining = this.players.filter(p => p.isActive && !p.hasFolded);
    if (remaining.length === 1) {
      this._awardToSoleWinner(remaining[0]);
      return;
    }

    // Move to next phase based on current phase
    const phaseMap = {
      preflop_betting:  PHASES.BEFORE_FLOP,
      flop_betting:     PHASES.BEFORE_TURN,
      turn_betting:     PHASES.BEFORE_RIVER, // AFTER_TURN now runs before turn betting
      river_betting:    PHASES.AFTER_RIVER,  // AFTER_RIVER runs before showdown
    };
    const next = phaseMap[this.phase];
    if (next) this._setPhase(next);
    else this._doShowdown();
  }

  _awardToSoleWinner(winner) {
    this.addLog(`${winner.name} wins the pot of ${this.pot} (everyone else folded)`);
    this.winnerInfo = {
      winnerId: winner.id,
      pot: this.pot,
      runnerUpId: null,
      handResults: [],
    };
    this._setPhase(PHASES.WIN_CHOICE);
  }

  // ── Showdown ───────────────────────────────────────────────────────────────

  _doShowdown() {
    this._setPhase(PHASES.SHOWDOWN);
    const mods = this._getMods();
    const { payouts, handResults, mainWinnerId, runnerUpId } = resolveShowdown(
      this.players, this.communityCards, mods
    );

    // Store hand results on players
    for (const r of handResults) {
      r.player.bestHand = r.bestHand;
    }

    // Apply payouts (minus win-choice mechanic for main pot winner)
    for (const [pid, amount] of Object.entries(payouts)) {
      if (pid === mainWinnerId) continue; // handled via win choice
      const p = this.players.find(pl => pl.id === pid);
      if (p) p.chips += amount;
    }

    const mainWinnerPayout = payouts[mainWinnerId] || 0;
    this.winnerInfo = {
      winnerId: mainWinnerId,
      pot: mainWinnerPayout,
      runnerUpId,
      handResults,
    };
    this.lastHandRunnerUp = this.players.find(p => p.id === runnerUpId) || null;

    // Broadcast showdown info
    this.broadcast('game:showdown', {
      handResults: handResults.map(r => ({
        playerId: r.playerId,
        name: r.player.name,
        cards: r.player.holeCards,
        bestHand: r.bestHand,
      })),
    });

    this.addLog(`Showdown! Winner: ${this.players.find(p => p.id === mainWinnerId)?.name}`);
  }

  // ── Win Choice ─────────────────────────────────────────────────────────────

  _doWinChoice() {
    if (!this.winnerInfo) { this._setPhase(PHASES.HAND_COMPLETE); return; }

    const winner = this.players.find(p => p.id === this.winnerInfo.winnerId);
    if (!winner) { this._setPhase(PHASES.HAND_COMPLETE); return; }

    const stealable = this.players
      .filter(p => p.id !== winner.id && !p.eliminated && p.powerCards.length > 0)
      .flatMap(p => p.powerCards.map(c => ({ ...c, ownerId: p.id })));

    this.broadcast('game:winChoice', {
      winnerId: winner.id,
      pot: this.winnerInfo.pot,
      halfPot: Math.floor(this.winnerInfo.pot / 2),
      rolloverAmount: this.winnerInfo.pot - Math.floor(this.winnerInfo.pot / 2),
      stealableCards: stealable,
    });

    this._setPhase(PHASES.WIN_CHOICE);
  }

  resolveWinChoice(playerId, choice, stealTargetCardInstanceId) {
    if (this.phase !== PHASES.WIN_CHOICE) return { error: 'Not win choice phase' };
    const winner = this.players.find(p => p.id === playerId);
    if (!winner || winner.id !== this.winnerInfo?.winnerId) return { error: 'Not the winner' };

    clearTimeout(this.phaseTimer);

    if (choice === 'full') {
      winner.chips += this.winnerInfo.pot;
      this._drawPowerCardForPlayer(winner);
      this.addLog(`${winner.name} takes the full pot (${this.winnerInfo.pot}) and draws a power card`);
    } else {
      // Half pot + steal
      const half = Math.floor(this.winnerInfo.pot / 2);
      winner.chips += half;
      this.rolloverPot += this.winnerInfo.pot - half;

      if (stealTargetCardInstanceId) {
        for (const p of this.players) {
          if (p.id === winner.id) continue;
          const cardIdx = p.powerCards.findIndex(c => c.instanceId === stealTargetCardInstanceId);
          if (cardIdx !== -1) {
            const [stolen] = p.powerCards.splice(cardIdx, 1);
            winner.powerCards.push(stolen);
            this.addLog(`${winner.name} takes half pot and steals ${stolen.name} from ${p.name}`);
            break;
          }
        }
      }
    }

    this._enforceMaxPowerCards(winner);
    this._setPhase(PHASES.HAND_COMPLETE);
    return { ok: true };
  }

  _botWinChoice() {
    const winner = this.players.find(p => p.id === this.winnerInfo?.winnerId && p.isBot);
    if (!winner) return;
    setTimeout(() => {
      if (this.phase === PHASES.WIN_CHOICE) {
        this.resolveWinChoice(winner.id, 'full', null);
      }
    }, BOT_ACTION_DELAY_MS);
  }

  _defaultWinChoice() {
    // Timeout: auto-resolve as full pot
    if (this.phase === PHASES.WIN_CHOICE && this.winnerInfo) {
      this.resolveWinChoice(this.winnerInfo.winnerId, 'full', null);
    }
  }

  // ── Power Card Overflow ────────────────────────────────────────────────────

  _enforceMaxPowerCards(player) {
    while (player.powerCards.length > MAX_POWER_CARDS) {
      if (player.isBot) {
        const sellIdx = player.bot?.decideSell() ?? 0;
        this._sellCard(player, player.powerCards[sellIdx].instanceId);
      } else {
        this.io.to(player.id).emit('game:promptSell', {
          reason: 'overflow',
          cards: player.powerCards,
        });
        break; // human must manually sell
      }
    }
  }

  _drawPowerCardForPlayer(player) {
    const card = this.powerDeck.draw();
    if (!card) return;
    player.powerCards.push(card);
    if (!player.isBot) {
      this.io.to(player.id).emit('game:powerCardDrawn', { card });
    }
    this._enforceMaxPowerCards(player);
  }

  // ── Bounties ───────────────────────────────────────────────────────────────

  _resolveBounties() {
    for (const p of this.players) {
      if (p.id !== this.winnerInfo?.winnerId) continue;
      const bounties = p.powerCards.filter(c => c.type === CARD_TYPE.BOUNTY);
      for (const bounty of bounties) {
        const result = resolveEffect(this._gameState(), p.id, bounty, {});
        if (result.success) {
          this.addLog(`${p.name} bounty: ${result.message}`);
          p.powerCards = p.powerCards.filter(c => c.instanceId !== bounty.instanceId);
          this.powerDeck.discard(bounty);
        }
      }
    }
  }

  // ── Power Cards (human-initiated) ──────────────────────────────────────────

  playPowerCard(playerId, instanceId, opts = {}) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Player not found' };

    const cardIdx = player.powerCards.findIndex(c => c.instanceId === instanceId);
    if (cardIdx === -1) return { error: 'Card not in hand' };
    const card = player.powerCards[cardIdx];

    const isReactive = this.reactiveWindow && !this.reactiveWindow.resolved;
    if (!canPlayCard(card, this.phase, isReactive)) {
      return { error: 'Cannot play this card right now' };
    }

    // Handle rank-choice cards: if drawnRanks not provided yet, draw them first
    if (card.requiresInput === 'rank_choice_two' && !opts.chosenRank) {
      const drawnRanks = this.rankBag.drawTwo();
      const pending = { playerId, instanceId, opts: { drawnRanks } };
      this.pendingPowerCard = pending;
      if (!player.isBot) {
        this.io.to(playerId).emit('game:rankBagPrompt', { drawnRanks });
      } else {
        // Bot resolves immediately
        const chosenRank = drawnRanks[Math.floor(Math.random() * drawnRanks.length)];
        this.playPowerCard(playerId, instanceId, { drawnRanks, chosenRank });
      }
      return { ok: true, pending: true };
    }

    // If this is a coin-call card and no call provided, prompt human
    if (card.requiresInput === 'coin_call' && !opts.coinCall && !player.isBot) {
      this.io.to(playerId).emit('game:coinCallPrompt', { cardName: card.name });
      this.pendingPowerCard = { playerId, instanceId, opts };
      return { ok: true, pending: true };
    }

    // Store merged opts from pending
    if (this.pendingPowerCard && this.pendingPowerCard.instanceId === instanceId) {
      opts = { ...this.pendingPowerCard.opts, ...opts };
      this.pendingPowerCard = null;
    }

    // Apply effect
    const result = resolveEffect(this._gameState(), playerId, card, opts);
    if (!result.success) return { error: result.message };

    // Remove card from hand
    player.powerCards.splice(cardIdx, 1);
    this.powerDeck.discard(card);

    const isSpell = card.type === CARD_TYPE.SPELL && card.definitionId !== 'veto' && card.definitionId !== 'copy_machine';

    // Track last spell for reactive window
    if (isSpell) {
      this.lastPlayedSpell = { card, playerId, opts };
      this._openReactiveWindow(card, playerId);
    }

    this.addLog(`${player.name} plays ${card.name}. ${result.message}`);
    this.broadcast('game:powerCardPlayed', {
      playerId,
      card: { ...card, instanceId: undefined },
      result: result.message,
      spinResult: result.spinResult,
      coinResult: result.coinResult,
    });

    // If private data (prophecy), send only to player
    if (result.privateData) {
      this.io.to(playerId).emit('game:privateData', result.privateData);
    }

    this.broadcastState();
    return { ok: true, result };
  }

  _openReactiveWindow(card, playerId) {
    const deadline = Date.now() + REACTIVE_WINDOW_MS;
    this.reactiveWindow = { card, playerId, resolved: false, deadline };
    this.broadcast('game:reactiveWindow', {
      triggeringCard: { name: card.name, icon: card.icon },
      deadline,
    });

    this.phaseTimer = setTimeout(() => {
      if (this.reactiveWindow && !this.reactiveWindow.resolved) {
        this._closeReactiveWindow();
      }
    }, REACTIVE_WINDOW_MS);
  }

  _closeReactiveWindow() {
    if (this.reactiveWindow) this.reactiveWindow.resolved = true;
    this.broadcast('game:reactiveWindowClosed', {});
    this.broadcastState();
  }

  sellPowerCard(playerId, instanceId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Player not found' };
    return this._sellCard(player, instanceId);
  }

  _sellCard(player, instanceId) {
    const idx = player.powerCards.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return { error: 'Card not found' };
    const [card] = player.powerCards.splice(idx, 1);
    const sellValue = Math.floor((card.sellValue || 1) * this.bigBlind);
    player.chips += sellValue;
    this.powerDeck.discard(card);
    this.addLog(`${player.name} sold ${card.name} for ${sellValue} chips`);
    this.broadcastState();
    return { ok: true, earned: sellValue };
  }

  // ── End of Hand ───────────────────────────────────────────────────────────

  _endHand() {
    // Eliminate players with 0 chips
    for (const p of this.players) {
      if (p.chips <= 0 && !p.eliminated) {
        p.eliminated = true;
        p.isActive = false;
        this.broadcast('game:playerEliminated', { playerId: p.id, name: p.name });
        this.addLog(`${p.name} has been eliminated!`);
      }
    }

    const alive = this.players.filter(p => !p.eliminated);
    if (alive.length <= 1) {
      this._setPhase(PHASES.GAME_OVER);
    } else {
      this._startHand();
    }
  }

  // ── Bot Phase Cards ────────────────────────────────────────────────────────

  _botPlayPhaseCards(overridePhase) {
    const phase = overridePhase || this.phase;
    setTimeout(() => {
      for (const p of this.players.filter(p => p.isBot && !p.eliminated && p.chips > 0)) {
        const decision = p.bot?.decidePowerCardPlay(this._gameState(), phase, false);
        if (decision) {
          this.playPowerCard(p.id, decision.card.instanceId, decision.opts);
        }
      }
    }, BOT_ACTION_DELAY_MS / 2);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _getMods() {
    return {
      ...this.mods,
      wildRanks: this.wildRanks,
      disabledRanks: this.disabledRanks,
    };
  }

  _gameState() {
    return {
      players: this.players,
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      bigBlind: this.bigBlind,
      deck: this.deck,
      rankBag: this.rankBag,
      mods: this._getMods(),
      wildRanks: this.wildRanks,
      disabledRanks: this.disabledRanks,
      callInActive: this.callInActive,
      vetoActive: this.vetoActive,
      lastPlayedSpell: this.lastPlayedSpell,
      lastHandRunnerUp: this.lastHandRunnerUp,
      phase: this.phase,
    };
  }

  _standings() {
    return [...this.players]
      .sort((a, b) => b.chips - a.chips)
      .map((p, i) => ({ rank: i + 1, playerId: p.id, name: p.name, chips: p.chips }));
  }

  _lobbyState() {
    return {
      roomCode: this.roomCode,
      players: this.players.map(p => ({ id: p.id, name: p.name, isBot: p.isBot })),
      hostId: this.hostId,
    };
  }

  // ── State Broadcasting ────────────────────────────────────────────────────

  broadcastState() {
    // Each player gets a sanitized view
    for (const p of this.players) {
      if (p.isBot) continue;
      const state = this._sanitizeForPlayer(p.id);
      this.io.to(p.id).emit('game:stateUpdate', state);
    }
  }

  broadcast(event, data) {
    this.io.to(this.roomCode).emit(event, data);
  }

  addLog(msg) {
    const entry = { id: uuidv4(), ts: Date.now(), message: msg };
    this.log.push(entry);
    if (this.log.length > 50) this.log.shift();
    this.broadcast('game:log', [entry]);
  }

  _sanitizeForPlayer(viewerId) {
    const isShowdown = this.phase === PHASES.SHOWDOWN || this.phase === PHASES.HAND_COMPLETE;
    const viewer = this.players.find(p => p.id === viewerId);

    // Compute viewer's current best hand for live display
    let myCurrentHand = null;
    if (viewer && viewer.holeCards.length > 0 && this.communityCards.length > 0) {
      try {
        const { findBestHand } = require('./HandEvaluator');
        const allCards = [...viewer.holeCards, ...this.communityCards];
        myCurrentHand = findBestHand(allCards, this._getMods());
      } catch (_) {}
    }

    return {
      phase: this.phase,
      phaseDeadline: this.phaseDeadline,
      roomCode: this.roomCode,
      pot: this.pot,
      rolloverPot: this.rolloverPot,
      currentBet: this.currentBet,
      communityCards: this.communityCards,
      dealerIndex: this.dealerIndex,
      activePlayerIndex: this.activePlayerIndex,
      bigBlind: this.bigBlind,
      mods: this._getMods(),
      wildRanks: this.wildRanks,
      disabledRanks: this.disabledRanks,
      orbitCount: this.orbitCount,
      myCurrentHand,
      winnerInfo: this.winnerInfo ? {
        winnerId: this.winnerInfo.winnerId,
        pot: this.winnerInfo.pot,
      } : null,
      reactiveWindow: this.reactiveWindow ? {
        card: this.reactiveWindow.card
          ? { name: this.reactiveWindow.card.name, icon: this.reactiveWindow.card.icon }
          : null,
        deadline: this.reactiveWindow.deadline,
      } : null,
      players: this.players.map(p => {
        const isMe = p.id === viewerId;
        const reveal = isShowdown && !p.hasFolded;
        const showCards = isMe || reveal;

        return {
          id: p.id,
          name: p.name,
          isBot: p.isBot,
          chips: p.chips,
          currentBet: p.currentBet,
          hasFolded: p.hasFolded,
          isAllIn: p.isAllIn,
          isActive: p.isActive,
          eliminated: p.eliminated,
          isDealer: p.isDealer,
          isSmallBlind: p.isSmallBlind,
          isBigBlind: p.isBigBlind,
          hasActedThisStreet: p.hasActedThisStreet,
          powerCardCount: p.powerCards.length,
          powerCards: isMe ? p.powerCards : [],
          holeCards: showCards
            ? p.holeCards
            : p.holeCards.map((c, i) => {
                // Show revealed cards (from Show Me etc.)
                const isRevealed = (p.revealedHoleCardIndices || []).includes(i);
                return isRevealed ? c : null;
              }),
          eyePatchIndex: isMe ? p.eyePatchIndex : null,
          revealedHoleCardIndices: p.revealedHoleCardIndices,
          bestHand: isShowdown ? p.bestHand : null,
        };
      }),
    };
  }
}

module.exports = { GameRoom, PHASES };
