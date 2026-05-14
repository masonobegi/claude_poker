'use strict';

const { canPlayCard } = require('./PowerCardEngine');
const { CARD_TYPE } = require('./PowerCardDeck');

// Simple bot decision-making — not smart, but uses all game functions
class Bot {
  constructor(player) {
    this.player = player;
  }

  // Returns { action: 'fold'|'check'|'call'|'raise', amount? }
  decideBettingAction(game) {
    const p = this.player;
    const callAmount = game.currentBet - p.currentBet;
    const canCheck = callAmount === 0;
    const roll = Math.random();

    if (canCheck) {
      if (roll < 0.75) return { action: 'check' };
      const raiseAmt = Math.min(p.chips, game.bigBlind * (1 + Math.floor(Math.random() * 3)));
      return raiseAmt > 0 ? { action: 'raise', amount: raiseAmt } : { action: 'check' };
    }

    if (callAmount >= p.chips) {
      // All-in or fold
      return roll < 0.4 ? { action: 'call' } : { action: 'fold' };
    }

    if (roll < 0.15) return { action: 'fold' };
    if (roll < 0.80) return { action: 'call' };
    const raiseAmt = Math.min(p.chips - callAmount, game.bigBlind * (1 + Math.floor(Math.random() * 4)));
    return raiseAmt > 0 ? { action: 'raise', amount: callAmount + raiseAmt } : { action: 'call' };
  }

  // Returns null if no card to play, or { card, opts }
  decidePowerCardPlay(game, phase, isReactiveWindow) {
    const playable = this.player.powerCards.filter(c => {
      // Bounty cards: only try if this bot is the hand winner AND had a showdown
      if (c.type === 'BOUNTY') {
        return game.winnerInfo?.winnerId === this.player.id && !!this.player.bestHand;
      }
      return canPlayCard(c, phase, isReactiveWindow);
    });
    if (playable.length === 0) return null;

    // Only play with 40% chance per decision point (to not spam)
    if (Math.random() > 0.40) return null;

    const card = playable[Math.floor(Math.random() * playable.length)];
    const opts = this._buildOpts(card, game);
    return { card, opts };
  }

  // Returns index of card to sell (lowest sell value)
  decideSell() {
    const cards = this.player.powerCards;
    if (cards.length === 0) return null;
    let minIdx = 0;
    for (let i = 1; i < cards.length; i++) {
      if (cards[i].sellValue < cards[minIdx].sellValue) minIdx = i;
    }
    return minIdx;
  }

  // Win choice: always take full pot (simplest)
  decideWinChoice() {
    return { choice: 'full' };
  }

  // Bounty cards: auto-play if condition met (checked externally)
  decideBountyPlay(game) {
    return this.player.powerCards
      .filter(c => c.type === CARD_TYPE.BOUNTY)
      .map(c => ({ card: c, opts: {} }));
  }

  // Coin call for Drained/Risk Taker
  decideCoinCall() {
    return Math.random() < 0.5 ? 'heads' : 'tails';
  }

  // Build opts for a given card's requirements
  _buildOpts(card, game) {
    const def = card;
    switch (def.requiresInput) {
      case 'card_and_direction': {
        const allCards = [
          ...game.communityCards.map((c, i) => `community_${i}`),
          ...this.player.holeCards.map((c, i) => `hole_${this.player.id}_${i}`),
        ].filter(Boolean);
        if (allCards.length === 0) return {};
        return {
          targetCardId: allCards[Math.floor(Math.random() * allCards.length)],
          direction: Math.random() < 0.5 ? 'up' : 'down',
        };
      }
      case 'card_and_suit': {
        const suits = ['H', 'D', 'C', 'S'];
        const allCards = [
          ...game.communityCards.map((c, i) => `community_${i}`),
          ...this.player.holeCards.map((c, i) => `hole_${this.player.id}_${i}`),
        ].filter(Boolean);
        if (allCards.length === 0) return {};
        return {
          targetCardId: allCards[Math.floor(Math.random() * allCards.length)],
          suit: suits[Math.floor(Math.random() * suits.length)],
        };
      }
      case 'player_select': {
        let others = game.players.filter(p => p.id !== this.player.id && p.isActive && !p.eliminated);
        // Yes You steals spell cards — only target players who actually have them
        if (card.definitionId === 'yes_you') {
          const withSpells = others.filter(p => p.powerCards.some(c => c.type === 'SPELL'));
          if (withSpells.length > 0) others = withSpells;
          else return {}; // no valid targets, skip playing this card
        }
        if (others.length === 0) return {};
        return { targetPlayerId: others[Math.floor(Math.random() * others.length)].id };
      }
      case 'rank_choice_two': {
        const ranks = game.rankBag.drawTwo();
        return {
          drawnRanks: ranks,
          chosenRank: ranks[Math.floor(Math.random() * ranks.length)],
        };
      }
      case 'coin_call': {
        return { coinCall: this.decideCoinCall() };
      }
      default:
        return {};
    }
  }
}

module.exports = { Bot };
