'use strict';

const ALL_RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

class RankBag {
  constructor() {
    this.bag = [...ALL_RANKS];
  }

  refill() {
    this.bag = [...ALL_RANKS];
  }

  draw() {
    if (this.bag.length === 0) this.refill();
    const idx = Math.floor(Math.random() * this.bag.length);
    const [rank] = this.bag.splice(idx, 1);
    return rank;
  }

  drawTwo() {
    const first = this.draw();
    const second = this.draw();
    return [first, second];
  }

  returnRank(rank) {
    if (!this.bag.includes(rank)) {
      this.bag.push(rank);
    }
  }

  returnRanks(ranks) {
    for (const r of ranks) this.returnRank(r);
  }

  get available() {
    return [...this.bag];
  }

  toJSON() {
    return { bag: [...this.bag] };
  }
}

module.exports = { RankBag, ALL_RANKS };
