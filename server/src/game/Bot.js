'use strict';

const { canPlayCard } = require('./PowerCardEngine');
const { CARD_TYPE } = require('./PowerCardDeck');

// ── Bot personality reaction lines ─────────────────────────────────────────
const BOT_LINES = {
  Merlin: {
    spell:       ['I have foreseen this.', 'The stars align.', 'Ancient magic stirs...', 'Fate cannot be outrun.', 'The arcane flows through me.'],
    enchantment: ['Reality bends to my will.', 'So it shall be written.', 'The board is mine now.'],
    vetoed:      ['Hmph. Clever.', 'Interrupted... for now.', 'You will regret that.', 'Impressive. Foolish, but impressive.'],
    win:         ['As it was written.', 'The outcome was never in doubt.', 'Knowledge is always power.'],
    eliminated:  ['Every wizard falls eventually...', 'This is not my end.'],
  },
  Gandalf: {
    spell:       ['A wizard is never late.', 'You shall not pass!', 'I have faced far greater darkness.', 'Fly, you fools!'],
    enchantment: ['The table bends to a higher order.', 'Pay close attention.', 'So be it.'],
    vetoed:      ['Bah!', 'Unexpected. Well played.', 'Bold move.'],
    win:         ['As I intended.', 'The world is not in your cards.', 'Fly, you fools!'],
    eliminated:  ['I will return.', 'Not all who wander are out of chips.'],
  },
  Dumbledore: {
    spell:       ['Happiness can be found in the darkest of hands.', 'It does not do to dwell on dreams.', 'Help always comes to those who deserve it.'],
    enchantment: ['Words are the most inexhaustible magic.', 'The truth. A beautiful and terrible thing.'],
    vetoed:      ['Ah. Most resourceful.', 'Quite right. Quite right.', 'Well played.'],
    win:         ['Nitwit! Blubber! Oddment! Tweak!', 'One can never have enough chips.'],
    eliminated:  ['Do not pity the fallen. Pity the unwise.'],
  },
  Morgana: {
    spell:       ['You should have folded.', 'Suffer.', 'Your fate is sealed.', 'Tremble.', 'How delightfully stupid of you.'],
    enchantment: ['The board bends to darkness.', 'Nothing can save you now.'],
    vetoed:      ['You DARE?!', 'This changes nothing.', 'Enjoy that brief victory.', 'I will remember this.'],
    win:         ['Pathetic.', 'Did you honestly think you had a chance?', 'Power is the only truth.'],
    eliminated:  ['This. Is. NOT. OVER.', 'You will pay for this.'],
  },
  Saruman: {
    spell:       ["I see you've brought your full strategy. How quaint.", 'The machinery of this table is mine.', 'Order will prevail.'],
    enchantment: ['The table obeys a higher order.', 'All as I have planned.', 'Precisely.'],
    vetoed:      ['I underestimated you. Briefly.', 'Inconceivable.', 'A minor setback.'],
    win:         ['Superior in every measurable way.', 'The strong survive. Obviously.'],
    eliminated:  ['I am not defeated. I am merely between positions.'],
  },
  Circe: {
    spell:       ["Honey, you didn't even see it coming.", 'Surprise!', "Oops. Was that your plan? It was adorable.", 'I could watch you scramble all day.'],
    enchantment: ["I've redecorated. Do you like it?", 'A little enchantment never hurt anyone. Well...'],
    vetoed:      ['Oh no you did NOT.', 'RUDE!', "Fine. Round two, sweetie."],
    win:         ["Did I win again?", "Mmm. Delicious.", 'Too easy.'],
    eliminated:  ['This was a vibe check. You all failed.'],
  },
  Hex: {
    spell:       ['lmao get rekt', "bro didn't even see it lol", 'no cap that card is broken', 'YOOO', 'lets gooo'],
    enchantment: ['whole board changed fam', 'big brain move ngl'],
    vetoed:      ['bro WHAT', 'actually disrespectful fr', 'ight bet, next time.'],
    win:         ['EZ clap', 'W W W', 'not even close lmaooo'],
    eliminated:  ['i let u win', 'rigged smh'],
  },
  Vex: {
    spell:       ['...', '...interesting.', 'Done.', 'Watch.'],
    enchantment: ['Adjusted.', '...', 'The board shifts.'],
    vetoed:      ['...', 'Noted.', '...next time.'],
    win:         ['As expected.', '...', 'Done.'],
    eliminated:  ['...', '...until we meet again.'],
  },
};

function pick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

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

  // Get a personality reaction line for an event
  getReactionLine(event) {
    return pick(BOT_LINES[this.player.name]?.[event]);
  }

  // Returns null if no card to play, or { card, opts }
  decidePowerCardPlay(game, phase, isReactiveWindow) {
    const playable = this.player.powerCards.filter(c => {
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
