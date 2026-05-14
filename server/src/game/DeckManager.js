'use strict';

const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = ['H','D','C','S'];

class DeckManager {
  constructor() {
    this.cards = [];
    this.discarded = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    this.discarded = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({ rank, suit, isWild: false, promotedRank: null, suitOverride: null });
      }
    }
    this.shuffle();
  }

  shuffle() {
    const arr = this.cards;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  deal(n = 1) {
    if (this.cards.length < n) {
      // Reshuffle discards back in
      this.cards.push(...this.discarded);
      this.discarded = [];
      this.shuffle();
    }
    return this.cards.splice(0, n);
  }

  dealOne() {
    return this.deal(1)[0];
  }

  peek(n = 1) {
    return this.cards.slice(0, n).map(c => ({ ...c }));
  }

  burn(n = 1) {
    const burned = this.cards.splice(0, n);
    this.discarded.push(...burned);
    return burned;
  }

  removeFromTop(card) {
    const idx = this.cards.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    if (idx !== -1) {
      const [removed] = this.cards.splice(idx, 1);
      return removed;
    }
    return null;
  }

  addToDiscard(cards) {
    this.discarded.push(...(Array.isArray(cards) ? cards : [cards]));
  }

  get remaining() {
    return this.cards.length;
  }
}

module.exports = { DeckManager, RANKS, SUITS };
