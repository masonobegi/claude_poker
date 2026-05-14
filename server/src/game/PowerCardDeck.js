'use strict';

const { v4: uuidv4 } = require('uuid');

// Timing constants
const TIMING = {
  ANYTIME: 'ANYTIME',
  ANYTIME_AFTER_FLOP: 'ANYTIME_AFTER_FLOP',
  BEFORE_DEAL: 'BEFORE_DEAL',
  BEFORE_PREFLOP: 'BEFORE_PREFLOP',
  AFTER_FLOP_BEFORE_ACTION: 'AFTER_FLOP_BEFORE_ACTION',
  AFTER_TURN: 'AFTER_TURN',
  AFTER_RIVER_BEFORE_ACTION: 'AFTER_RIVER_BEFORE_ACTION',
  AFTER_RIVER: 'AFTER_RIVER',
  BEFORE_COMMUNITY: 'BEFORE_COMMUNITY', // Prophecy: before flop/turn/river
  AFTER_SPELL: 'AFTER_SPELL',          // Veto, Copy Machine
  AFTER_HAND: 'AFTER_HAND',
};

// Power card type
const CARD_TYPE = {
  SPELL: 'SPELL',
  ENCHANTMENT: 'ENCHANTMENT',
  BOUNTY: 'BOUNTY',
};

// Icon keys map to emoji/SVG in the client
const DEFINITIONS = [
  // ─── SPELLS ───────────────────────────────────────────────────────────────
  {
    definitionId: 'promotion',
    count: 1,
    name: 'Promotion',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'Select a card in play to promote (+1 rank) or demote (−1 rank).',
    sellValue: 1,
    icon: '⬆️',
    requiresInput: 'card_and_direction', // { targetCardId, direction: 'up'|'down' }
  },
  {
    definitionId: 'copy_machine',
    count: 1,
    name: 'Copy Machine',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_SPELL],
    description: 'Copy the effect of the last played spell card.',
    sellValue: 2,
    icon: '📠',
    requiresInput: null,
  },
  {
    definitionId: 'mirrored',
    count: 1,
    name: 'Mirrored',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_FLOP_BEFORE_ACTION],
    description: 'Spin twice: the first result picks which flop card is copied, the second picks which is replaced.',
    sellValue: 1,
    icon: '🪞',
    requiresInput: null, // server auto-spins
  },
  {
    definitionId: 'burned',
    count: 1,
    name: 'Burned',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME_AFTER_FLOP],
    description: 'Spin the spinner; discard the corresponding community card (1=first, 2=second, etc.). No effect if no card at that position.',
    sellValue: 1,
    icon: '🔥',
    requiresInput: null, // server auto-spins
  },
  {
    definitionId: 'yes_you',
    count: 1,
    name: 'Yes, You',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'Steal a random spell card from a player of your choice.',
    sellValue: 2,
    icon: '👆',
    requiresInput: 'player_select',
  },
  {
    definitionId: 'third_eye_blind',
    count: 2,
    name: 'Third Eye Blind',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'Draw the top card of the deck into your hand as a third hole card.',
    sellValue: 2,
    icon: '👁️',
    requiresInput: null,
  },
  {
    definitionId: 'reflop',
    count: 2,
    name: 'Reflop',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_FLOP_BEFORE_ACTION],
    description: 'Replace the entire flop with the top 3 cards of the deck.',
    sellValue: 1,
    icon: '🔄',
    requiresInput: null,
  },
  {
    definitionId: 'prophecy',
    count: 2,
    name: 'Prophecy',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_COMMUNITY],
    description: 'Peek at the next community card(s) before they are revealed.',
    sellValue: 1,
    icon: '🔮',
    requiresInput: null,
  },
  {
    definitionId: 'hot_potato',
    count: 2,
    name: 'Hot Potato',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_PREFLOP],
    description: 'Spin the spinner to pick a player and swap hole cards with them. If it lands on you, respin.',
    sellValue: 1,
    icon: '🥔',
    requiresInput: null, // server auto-spins
  },
  {
    definitionId: 'return_reriver',
    count: 2,
    name: 'Return / Reriver',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_TURN, TIMING.AFTER_RIVER],
    description: 'Replace the turn or river card with the top of the deck.',
    sellValue: 1,
    icon: '↩️',
    requiresInput: null,
  },
  {
    definitionId: 'call_in',
    count: 2,
    name: 'Call In',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_PREFLOP],
    description: 'Force all players to call before pre-flop action. Immediately advance to the flop.',
    sellValue: 1,
    icon: '📞',
    requiresInput: null,
  },
  {
    definitionId: '404_error',
    count: 2,
    name: '404 Error',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'Draw 2 ranks from the rank bag. Choose 1 — that rank is disabled for this hand.',
    sellValue: 1,
    icon: '🚫',
    requiresInput: 'rank_choice_two', // { drawnRanks: [r1,r2], chosenRank }
  },
  {
    definitionId: 'chain_reaction',
    count: 2,
    name: 'Chain Reaction',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'Every player passes their left-most hole card to the player on their left.',
    sellValue: 1,
    icon: '⛓️',
    requiresInput: null,
  },
  {
    definitionId: 'change_clothes',
    count: 2,
    name: 'Change Clothes',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'Select a card in play — it now counts as any suit you choose.',
    sellValue: 2,
    icon: '👗',
    requiresInput: 'card_and_suit', // { targetCardId, suit }
  },
  {
    definitionId: 'drained',
    count: 2,
    name: 'Drained',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_DEAL],
    description: 'Spin to target a player. They call heads or tails, then a coin flips. Wrong side: they pay you 1 BB.',
    sellValue: 0.5,
    icon: '🪙',
    requiresInput: null, // server auto-spins + coin flip
  },
  {
    definitionId: 'sixth_sense',
    count: 2,
    name: 'Sixth Sense',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_RIVER_BEFORE_ACTION],
    description: 'Draw a sixth community card.',
    sellValue: 1,
    icon: '🌀',
    requiresInput: null,
  },
  {
    definitionId: 'reborn',
    count: 2,
    name: 'Reborn',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_FLOP_BEFORE_ACTION],
    description: 'Discard both hole cards and draw 2 new ones from the top of the deck.',
    sellValue: 1,
    icon: '🌟',
    requiresInput: null,
  },
  {
    definitionId: 'show_me',
    count: 2,
    name: 'Show Me',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'Draw 2 ranks from the rank bag. Choose 1 — all players must reveal any hole card of that rank.',
    sellValue: 2,
    icon: '👀',
    requiresInput: 'rank_choice_two',
  },
  {
    definitionId: 'wild_style',
    count: 2,
    name: 'Wild Style',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'Draw 2 ranks from the rank bag. Choose 1 — all cards of that rank are wild for this hand.',
    sellValue: 2,
    icon: '🃏',
    requiresInput: 'rank_choice_two',
  },
  {
    definitionId: 'eye_patch',
    count: 3,
    name: 'Eye Patch',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_DEAL],
    description: 'Spin to target a player. They are dealt 2 cards but may only see one of them (unless another spell reveals it).',
    sellValue: 0.5,
    icon: '🏴‍☠️',
    requiresInput: null, // server auto-spins
  },
  {
    definitionId: 'risk_taker',
    count: 3,
    name: 'Risk Taker',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_DEAL],
    description: 'Flip a coin. Correct call: everyone gives you 1 BB. Wrong call: you give everyone 1 BB.',
    sellValue: 0.5,
    icon: '🎲',
    requiresInput: 'coin_call', // { call: 'heads'|'tails' }
  },

  // ─── VETO ─────────────────────────────────────────────────────────────────
  {
    definitionId: 'veto',
    count: 9,
    name: 'Veto',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_SPELL],
    description: 'Cancel the effect of the last played spell card.',
    sellValue: 2,
    icon: '❌',
    requiresInput: null,
  },

  // ─── ENCHANTMENTS ─────────────────────────────────────────────────────────
  {
    definitionId: 'blurred',
    count: 1,
    name: 'Blurred',
    type: CARD_TYPE.ENCHANTMENT,
    timing: [TIMING.BEFORE_PREFLOP],
    description: 'Hearts and Diamonds count as the same suit. Spades and Clubs count as the same suit.',
    sellValue: 1,
    icon: '🌊',
    requiresInput: null,
  },
  {
    definitionId: 'push_through',
    count: 1,
    name: 'Push Through',
    type: CARD_TYPE.ENCHANTMENT,
    timing: [TIMING.BEFORE_PREFLOP],
    description: 'Aces may be high and low in a straight (e.g. Q-K-A-2-3 is valid).',
    sellValue: 1,
    icon: '♾️',
    requiresInput: null,
  },
  {
    definitionId: 'king_me',
    count: 1,
    name: 'King Me',
    type: CARD_TYPE.ENCHANTMENT,
    timing: [TIMING.BEFORE_PREFLOP],
    description: 'All face cards (J, Q) MAY be considered Kings this hand.',
    sellValue: 1,
    icon: '👑',
    requiresInput: null,
  },
  {
    definitionId: 'reverse_reverse',
    count: 1,
    name: 'Reverse Reverse',
    type: CARD_TYPE.ENCHANTMENT,
    timing: [TIMING.BEFORE_PREFLOP],
    description: 'The lowest hand wins this round.',
    sellValue: 1,
    icon: '🔃',
    requiresInput: null,
  },
  {
    definitionId: 'thats_odd',
    count: 1,
    name: "That's Odd",
    type: CARD_TYPE.ENCHANTMENT,
    timing: [TIMING.BEFORE_PREFLOP],
    description: 'Even-numbered cards (2, 4, 6, 8, 10) are disabled this hand.',
    sellValue: 1,
    icon: '🔢',
    requiresInput: null,
  },

  // ─── BOUNTIES ─────────────────────────────────────────────────────────────
  {
    definitionId: 'royalty',
    count: 1,
    name: 'Royalty',
    type: CARD_TYPE.BOUNTY,
    timing: [TIMING.AFTER_HAND],
    description: 'If you win with a Royal Flush, take 5 BB from the bank.',
    sellValue: 1,
    icon: '👸',
    requiresInput: null,
    condition: 'win_royal_flush',
    reward: { source: 'bank', amount: 5 },
  },
  {
    definitionId: 'in_the_shadows',
    count: 1,
    name: 'In the Shadows',
    type: CARD_TYPE.BOUNTY,
    timing: [TIMING.AFTER_HAND],
    description: 'If you win using only Spades and Clubs, take 1 BB from 2nd place.',
    sellValue: 0.5,
    icon: '🌑',
    requiresInput: null,
    condition: 'win_dark_suits',
    reward: { source: 'second_place', amount: 1 },
  },
  {
    definitionId: 'lucky_7',
    count: 2,
    name: 'Lucky 7',
    type: CARD_TYPE.BOUNTY,
    timing: [TIMING.AFTER_HAND],
    description: 'If you win with a 7 in your scoring hand, take ½ BB from everyone.',
    sellValue: 0.5,
    icon: '🎰',
    requiresInput: null,
    condition: 'win_with_seven',
    reward: { source: 'everyone', amount: 0.5 },
  },
  {
    definitionId: 'straight_up',
    count: 2,
    name: 'Straight Up',
    type: CARD_TYPE.BOUNTY,
    timing: [TIMING.AFTER_HAND],
    description: 'If you win with a straight, take 1 BB from the bank.',
    sellValue: 0.5,
    icon: '📈',
    requiresInput: null,
    condition: 'win_straight',
    reward: { source: 'bank', amount: 1 },
  },
  {
    definitionId: 'underdog',
    count: 2,
    name: 'Underdog',
    type: CARD_TYPE.BOUNTY,
    timing: [TIMING.AFTER_HAND],
    description: 'If you win with only High Card, take 2 BB from the bank.',
    sellValue: 0.5,
    icon: '🐶',
    requiresInput: null,
    condition: 'win_high_card',
    reward: { source: 'bank', amount: 2 },
  },
];

class PowerCardDeck {
  constructor() {
    this.drawPile = [];
    this.discardPile = [];
    this._defMap = {};
    for (const def of DEFINITIONS) {
      this._defMap[def.definitionId] = def;
    }
    this.reset();
  }

  reset() {
    this.drawPile = [];
    this.discardPile = [];
    for (const def of DEFINITIONS) {
      for (let i = 0; i < def.count; i++) {
        this.drawPile.push({ ...def, instanceId: uuidv4() });
      }
    }
    this.shuffle();
  }

  shuffle() {
    const arr = this.drawPile;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  draw() {
    if (this.drawPile.length === 0) {
      // Reshuffle discards (excluding veto cards set aside)
      this.drawPile = [...this.discardPile];
      this.discardPile = [];
      this.shuffle();
    }
    if (this.drawPile.length === 0) return null;
    return this.drawPile.shift();
  }

  discard(card) {
    this.discardPile.push(card);
  }

  removeVetos(count) {
    // Remove `count` veto cards from draw pile and return them
    const removed = [];
    for (let i = this.drawPile.length - 1; i >= 0 && removed.length < count; i--) {
      if (this.drawPile[i].definitionId === 'veto') {
        removed.push(this.drawPile.splice(i, 1)[0]);
      }
    }
    return removed;
  }

  getDefinition(definitionId) {
    return this._defMap[definitionId] || null;
  }

  get remaining() {
    return this.drawPile.length;
  }
}

module.exports = { PowerCardDeck, DEFINITIONS, TIMING, CARD_TYPE };
