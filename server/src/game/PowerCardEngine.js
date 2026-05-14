'use strict';

const { TIMING, CARD_TYPE } = require('./PowerCardDeck');
const { RANKS } = require('./DeckManager');

// Which game phases allow which timing tags
const PHASE_TIMING_MAP = {
  before_deal:              [TIMING.BEFORE_DEAL],
  before_preflop:           [TIMING.BEFORE_PREFLOP, TIMING.ANYTIME],
  preflop_betting:          [TIMING.ANYTIME],
  before_flop:              [TIMING.BEFORE_COMMUNITY, TIMING.ANYTIME],
  flop_deal:                [],
  after_flop_before_action: [TIMING.AFTER_FLOP_BEFORE_ACTION, TIMING.ANYTIME],
  flop_betting:             [TIMING.ANYTIME, TIMING.ANYTIME_AFTER_FLOP],
  before_turn:              [TIMING.BEFORE_COMMUNITY, TIMING.ANYTIME, TIMING.ANYTIME_AFTER_FLOP],
  turn_deal:                [],
  after_turn:               [TIMING.AFTER_TURN, TIMING.ANYTIME, TIMING.ANYTIME_AFTER_FLOP], // window BEFORE turn betting
  turn_betting:             [TIMING.ANYTIME, TIMING.ANYTIME_AFTER_FLOP],
  before_river:             [TIMING.BEFORE_COMMUNITY, TIMING.ANYTIME, TIMING.ANYTIME_AFTER_FLOP],
  river_deal:               [],
  after_river_before_action:[TIMING.AFTER_RIVER_BEFORE_ACTION, TIMING.AFTER_RIVER, TIMING.ANYTIME, TIMING.ANYTIME_AFTER_FLOP],
  river_betting:            [TIMING.ANYTIME, TIMING.ANYTIME_AFTER_FLOP],
  after_river:              [TIMING.AFTER_RIVER, TIMING.ANYTIME, TIMING.ANYTIME_AFTER_FLOP],
  showdown:                 [],
  win_choice:               [],
  hand_complete:            [TIMING.AFTER_HAND],
  // AFTER_SPELL always handled separately via reactive window
};

function canPlayCard(card, phase, isReactiveWindow) {
  if (isReactiveWindow) {
    return card.timing.includes(TIMING.AFTER_SPELL);
  }
  const allowed = PHASE_TIMING_MAP[phase] || [];
  return card.timing.some(t => allowed.includes(t));
}

function spin() {
  return Math.floor(Math.random() * 6) + 1; // 1–6
}

function coinFlip() {
  return Math.random() < 0.5 ? 'heads' : 'tails';
}

function spinToPlayerIndex(result, totalPlayers, selfIndex) {
  // 1-6 → player index (excluding self by rerolling conceptually)
  // Map 1-6 evenly across players
  const idx = (result - 1) % totalPlayers;
  return idx;
}

// Resolve the effect of a power card on game state.
// Returns { success, message, spinResult, coinResult, pendingRanks, pendingCardId, pendingSuit }
// Game state mutations happen in place.
function resolveEffect(game, playerId, card, opts = {}) {
  const def = card; // card IS the definition object (with instanceId)
  const id = def.definitionId;

  const player = game.players.find(p => p.id === playerId);
  if (!player) return { success: false, message: 'Player not found' };

  const activePlayers = game.players.filter(p => p.isActive && !p.eliminated);

  switch (id) {

    // ── Promotion ────────────────────────────────────────────────────────────
    case 'promotion': {
      const { targetCardId, direction } = opts;
      const target = findCardInPlay(game, targetCardId);
      if (!target) return { success: false, message: 'Card not found' };
      const rankIdx = RANKS.indexOf(target.card.rank);
      if (direction === 'up' && rankIdx < RANKS.length - 1) {
        target.card.promotedRank = RANKS[rankIdx + 1];
      } else if (direction === 'down' && rankIdx > 0) {
        target.card.promotedRank = RANKS[rankIdx - 1];
      } else {
        return { success: false, message: 'Cannot promote/demote further' };
      }
      return { success: true, message: `Card promoted/demoted to ${target.card.promotedRank}` };
    }

    // ── Copy Machine ─────────────────────────────────────────────────────────
    case 'copy_machine': {
      const last = game.lastPlayedSpell;
      if (!last) return { success: false, message: 'No spell to copy' };
      // Re-resolve the last spell with the same opts, but played by this player
      return resolveEffect(game, playerId, last.card, last.opts || {});
    }

    // ── Mirrored ─────────────────────────────────────────────────────────────
    case 'mirrored': {
      if (game.communityCards.length < 3) return { success: false, message: 'No flop yet' };
      const srcSpin = spin();
      const dstSpin = spin();
      const srcIdx = spinToFlopIndex(srcSpin);
      let dstIdx = spinToFlopIndex(dstSpin);
      if (dstIdx === srcIdx) dstIdx = (dstIdx + 1) % 3; // ensure different
      const srcCard = { ...game.communityCards[srcIdx] };
      game.communityCards[dstIdx] = srcCard;
      return {
        success: true,
        message: `Community card ${dstIdx + 1} now mirrors card ${srcIdx + 1}`,
        spinResult: [srcSpin, dstSpin],
      };
    }

    // ── Burned ────────────────────────────────────────────────────────────────
    case 'burned': {
      const result = spin();
      const idx = result - 1;
      if (idx >= 0 && idx < game.communityCards.length) {
        const removed = game.communityCards.splice(idx, 1)[0];
        game.deck.addToDiscard([removed]);
        return { success: true, message: `Community card ${idx + 1} burned`, spinResult: result };
      }
      return { success: true, message: `Spin result ${result}: no card at that position`, spinResult: result };
    }

    // ── Yes, You ──────────────────────────────────────────────────────────────
    case 'yes_you': {
      const { targetPlayerId } = opts;
      const target = game.players.find(p => p.id === targetPlayerId);
      if (!target || target.id === playerId) return { success: false, message: 'Invalid target' };
      // Steal a random spell card from target
      const spells = target.powerCards.filter(c => c.type === CARD_TYPE.SPELL);
      if (spells.length === 0) return { success: false, message: 'Target has no spell cards' };
      const stolen = spells[Math.floor(Math.random() * spells.length)];
      target.powerCards = target.powerCards.filter(c => c.instanceId !== stolen.instanceId);
      player.powerCards.push(stolen);
      return { success: true, message: `Stole ${stolen.name} from ${target.name}` };
    }

    // ── Third Eye Blind ───────────────────────────────────────────────────────
    case 'third_eye_blind': {
      const newCard = game.deck.dealOne();
      if (!newCard) return { success: false, message: 'Deck empty' };
      player.holeCards.push(newCard);
      return { success: true, message: 'Drew a third hole card' };
    }

    // ── Reflop ────────────────────────────────────────────────────────────────
    case 'reflop': {
      if (game.communityCards.length < 3) return { success: false, message: 'No flop' };
      const oldFlop = game.communityCards.splice(0, 3);
      game.deck.addToDiscard(oldFlop);
      const newFlop = game.deck.deal(3);
      game.communityCards.unshift(...newFlop);
      return { success: true, message: 'Flop replaced' };
    }

    // ── Prophecy ──────────────────────────────────────────────────────────────
    case 'prophecy': {
      // Show the player the next upcoming community cards without revealing to others
      const peek = game.deck.peek(game.communityCards.length === 0 ? 3 : 1);
      player.prophesiedCards = peek;
      return { success: true, message: 'You peek at the upcoming cards', privateData: { peek } };
    }

    // ── Hot Potato ────────────────────────────────────────────────────────────
    case 'hot_potato': {
      let result = spin();
      const others = activePlayers.filter(p => p.id !== playerId);
      if (others.length === 0) return { success: false, message: 'No other players' };
      let targetIdx = result % activePlayers.length;
      // Reroll if lands on self
      let attempts = 0;
      while (activePlayers[targetIdx].id === playerId && attempts < 10) {
        result = spin();
        targetIdx = result % activePlayers.length;
        attempts++;
      }
      const target = activePlayers[targetIdx];
      // Swap hole cards
      const myCards = player.holeCards;
      player.holeCards = target.holeCards;
      target.holeCards = myCards;
      // Clear eye patch restrictions if hands were swapped
      player.eyePatchIndex = null;
      target.eyePatchIndex = null;
      return { success: true, message: `Swapped hands with ${target.name}`, spinResult: result };
    }

    // ── Return / Reriver ──────────────────────────────────────────────────────
    case 'return_reriver': {
      // Replace the most recently placed community card (turn or river)
      if (game.communityCards.length < 4) return { success: false, message: 'Turn/river not yet revealed' };
      const replaced = game.communityCards.pop();
      game.deck.addToDiscard([replaced]);
      const newCard = game.deck.dealOne();
      game.communityCards.push(newCard);
      return { success: true, message: 'Turn/River card replaced' };
    }

    // ── Call In ───────────────────────────────────────────────────────────────
    case 'call_in': {
      // Force all active players to call the big blind; skip pre-flop betting
      const bbAmount = game.bigBlind;
      for (const p of activePlayers) {
        const owes = Math.max(0, bbAmount - p.currentBet);
        const paid = Math.min(owes, p.chips);
        p.chips -= paid;
        p.currentBet += paid;
        game.pot += paid;
      }
      game.callInActive = true; // signal to HandEngine to skip preflop betting
      return { success: true, message: 'All players called! Advancing to flop.' };
    }

    // ── 404 Error ─────────────────────────────────────────────────────────────
    case '404_error': {
      const { chosenRank, drawnRanks } = opts;
      if (drawnRanks) {
        // Return unchosen rank to bag
        const other = drawnRanks.find(r => r !== chosenRank);
        if (other) game.rankBag.returnRank(other);
      }
      if (!game.disabledRanks.includes(chosenRank)) {
        game.disabledRanks.push(chosenRank);
      }
      return { success: true, message: `Rank ${chosenRank} disabled for this hand` };
    }

    // ── Chain Reaction ────────────────────────────────────────────────────────
    case 'chain_reaction': {
      const active = activePlayers;
      if (active.length < 2) return { success: false, message: 'Not enough players' };
      // Each player passes their first hole card to the left
      const passing = active.map(p => p.holeCards[0]);
      for (let i = 0; i < active.length; i++) {
        const recipient = active[(i + 1) % active.length];
        recipient.holeCards[0] = passing[i];
      }
      // Clear eye patch restrictions
      for (const p of active) p.eyePatchIndex = null;
      return { success: true, message: 'Everyone passed a hole card to the left' };
    }

    // ── Change Clothes ────────────────────────────────────────────────────────
    case 'change_clothes': {
      const { targetCardId, suit } = opts;
      const target = findCardInPlay(game, targetCardId);
      if (!target) return { success: false, message: 'Card not found' };
      target.card.suitOverride = suit;
      return { success: true, message: `Card suit changed to ${suit}` };
    }

    // ── Drained ───────────────────────────────────────────────────────────────
    case 'drained': {
      const result = spin();
      const idx = result % activePlayers.length;
      const target = activePlayers[idx];
      // Coin flip
      const flip = coinFlip();
      const call = opts.coinCall || (Math.random() < 0.5 ? 'heads' : 'tails'); // bots random
      const won = flip === call;
      if (!won) {
        const amount = Math.min(game.bigBlind, target.chips);
        target.chips -= amount;
        player.chips += amount;
      }
      return {
        success: true,
        message: won
          ? `${target.name} called correctly — no effect`
          : `${target.name} called wrong — paid ${game.bigBlind} to ${player.name}`,
        spinResult: result,
        coinResult: { flip, call, won },
      };
    }

    // ── Sixth Sense ───────────────────────────────────────────────────────────
    case 'sixth_sense': {
      const newCard = game.deck.dealOne();
      if (!newCard) return { success: false, message: 'Deck empty' };
      game.communityCards.push(newCard);
      return { success: true, message: 'A sixth community card is revealed' };
    }

    // ── Reborn ────────────────────────────────────────────────────────────────
    case 'reborn': {
      game.deck.addToDiscard(player.holeCards);
      player.holeCards = game.deck.deal(2);
      player.eyePatchIndex = null;
      player.prophesiedCards = null;
      return { success: true, message: 'Discarded hole cards and drew 2 new ones' };
    }

    // ── Show Me ───────────────────────────────────────────────────────────────
    case 'show_me': {
      const { chosenRank, drawnRanks } = opts;
      if (drawnRanks) {
        const other = drawnRanks.find(r => r !== chosenRank);
        if (other) game.rankBag.returnRank(other);
      }
      // Mark all hole cards of that rank as revealed
      for (const p of activePlayers) {
        for (let i = 0; i < p.holeCards.length; i++) {
          const cardRank = p.holeCards[i].promotedRank || p.holeCards[i].rank;
          if (cardRank === chosenRank) {
            if (!p.revealedHoleCardIndices) p.revealedHoleCardIndices = [];
            if (!p.revealedHoleCardIndices.includes(i)) {
              p.revealedHoleCardIndices.push(i);
            }
          }
        }
      }
      return { success: true, message: `All ${chosenRank}s revealed` };
    }

    // ── Wild Style ────────────────────────────────────────────────────────────
    case 'wild_style': {
      const { chosenRank, drawnRanks } = opts;
      if (drawnRanks) {
        const other = drawnRanks.find(r => r !== chosenRank);
        if (other) game.rankBag.returnRank(other);
      }
      if (!game.wildRanks.includes(chosenRank)) {
        game.wildRanks.push(chosenRank);
      }
      return { success: true, message: `All ${chosenRank}s are now wild!` };
    }

    // ── Eye Patch ─────────────────────────────────────────────────────────────
    case 'eye_patch': {
      const result = spin();
      const idx = result % activePlayers.length;
      const target = activePlayers[idx];
      // Target can only see one card (index 0); index 1 is hidden
      target.eyePatchIndex = 1; // hidden hole card index
      return {
        success: true,
        message: `${target.name} can only see one hole card`,
        spinResult: result,
      };
    }

    // ── Risk Taker ────────────────────────────────────────────────────────────
    case 'risk_taker': {
      const call = opts.coinCall || (Math.random() < 0.5 ? 'heads' : 'tails');
      const flip = coinFlip();
      const won = flip === call;
      const bbAmt = game.bigBlind;
      if (won) {
        for (const p of activePlayers) {
          if (p.id === playerId) continue;
          const pay = Math.min(bbAmt, p.chips);
          p.chips -= pay;
          player.chips += pay;
        }
      } else {
        for (const p of activePlayers) {
          if (p.id === playerId) continue;
          const pay = Math.min(bbAmt, player.chips);
          player.chips -= pay;
          p.chips += pay;
        }
      }
      return {
        success: true,
        message: won
          ? `Risk paid off! Everyone paid ${player.name} 1 BB`
          : `Risk failed! ${player.name} paid everyone 1 BB`,
        coinResult: { flip, call, won },
      };
    }

    // ── Veto ──────────────────────────────────────────────────────────────────
    case 'veto': {
      // Signal to the caller that the last spell is vetoed
      game.vetoActive = true;
      return { success: true, message: 'Spell vetoed!' };
    }

    // ── Enchantments ──────────────────────────────────────────────────────────
    case 'blurred': {
      game.mods.blurred = true;
      return { success: true, message: 'Suits blurred: Hearts=Diamonds, Spades=Clubs' };
    }
    case 'push_through': {
      game.mods.pushThrough = true;
      return { success: true, message: 'Aces can wrap in straights' };
    }
    case 'king_me': {
      game.mods.kingMe = true;
      return { success: true, message: 'Face cards may be treated as Kings' };
    }
    case 'reverse_reverse': {
      game.mods.reverseReverse = true;
      return { success: true, message: 'Lowest hand wins this round!' };
    }
    case 'thats_odd': {
      game.mods.thatIsOdd = true;
      return { success: true, message: 'Even cards (2,4,6,8,10) are disabled' };
    }

    // ── Bounties ──────────────────────────────────────────────────────────────
    case 'royalty':
    case 'in_the_shadows':
    case 'lucky_7':
    case 'straight_up':
    case 'underdog': {
      return resolveBounty(game, player, def);
    }

    default:
      return { success: false, message: `Unknown card: ${id}` };
  }
}

function resolveBounty(game, player, def) {
  const hand = player.bestHand;
  if (!hand) return { success: false, message: 'No winning hand recorded' };

  const bb = game.bigBlind;
  let earned = 0;
  let message = '';

  switch (def.definitionId) {
    case 'royalty':
      if (hand.type !== 'ROYAL_FLUSH') return { success: false, message: 'Bounty condition not met' };
      earned = 5 * bb;
      player.chips += earned;
      message = `Royalty! +${earned} chips (Royal Flush bonus)`;
      break;
    case 'in_the_shadows': {
      if (!handIsAllDarkSuits(hand, player)) return { success: false, message: 'Bounty condition not met' };
      const second = game.lastHandRunnerUp;
      if (second) {
        const take = Math.min(bb, second.chips);
        second.chips -= take;
        player.chips += take;
        earned = take;
      }
      message = `In the Shadows! Took 1 BB from ${second?.name || 'nobody'}`;
      break;
    }
    case 'lucky_7':
      if (!handContainsSeven(hand, player)) return { success: false, message: 'Bounty condition not met' };
      for (const p of game.players.filter(p => p.id !== player.id && !p.eliminated)) {
        const take = Math.min(Math.floor(bb * 0.5), p.chips);
        p.chips -= take;
        player.chips += take;
        earned += take;
      }
      message = `Lucky 7! Took ½ BB from everyone (+${earned})`;
      break;
    case 'straight_up':
      if (!['STRAIGHT', 'STRAIGHT_FLUSH', 'ROYAL_FLUSH'].includes(hand.type)) {
        return { success: false, message: 'Bounty condition not met' };
      }
      earned = bb;
      player.chips += earned;
      message = `Straight Up! +${earned} chips`;
      break;
    case 'underdog':
      if (hand.type !== 'HIGH_CARD') return { success: false, message: 'Bounty condition not met' };
      earned = 2 * bb;
      player.chips += earned;
      message = `Underdog! +${earned} chips (High Card win)`;
      break;
  }

  return { success: true, message, earned };
}

function handIsAllDarkSuits(hand, player) {
  if (!player.holeCards) return false;
  // Check that all 5 scoring cards use only S/C suits
  const scoringCards = player.scoringCards || player.holeCards;
  return scoringCards.every(c => {
    const s = c.suitOverride || c.suit;
    return s === 'S' || s === 'C';
  });
}

function handContainsSeven(hand, player) {
  const scoringCards = player.scoringCards || [];
  return scoringCards.some(c => (c.promotedRank || c.rank) === '7');
}

// Find a card in community cards or player's own hole cards by a unique identifier
function findCardInPlay(game, cardId) {
  // cardId format: 'community_<index>' or 'hole_<playerId>_<index>'
  if (!cardId) return null;

  if (cardId.startsWith('community_')) {
    const idx = parseInt(cardId.split('_')[1]);
    if (idx >= 0 && idx < game.communityCards.length) {
      return { card: game.communityCards[idx], location: 'community', index: idx };
    }
  } else if (cardId.startsWith('hole_')) {
    const parts = cardId.split('_');
    const pid = parts[1];
    const idx = parseInt(parts[2]);
    const p = game.players.find(pl => pl.id === pid);
    if (p && idx >= 0 && idx < p.holeCards.length) {
      return { card: p.holeCards[idx], location: 'hole', player: p, index: idx };
    }
  }
  return null;
}

function spinToFlopIndex(spinResult) {
  // 1-2 → index 0, 3-4 → index 1, 5-6 → index 2
  if (spinResult <= 2) return 0;
  if (spinResult <= 4) return 1;
  return 2;
}

module.exports = { resolveEffect, canPlayCard, spin, coinFlip };
