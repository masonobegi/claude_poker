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
    name: 'Parallel Reality',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_FLOP_BEFORE_ACTION],
    description: 'Spin twice: one flop card is duplicated into another position, rewriting the board.',
    sellValue: 1,
    icon: '🪞',
    requiresInput: null, // server auto-spins
  },
  {
    definitionId: 'burned',
    count: 1,
    name: 'Incinerate',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME_AFTER_FLOP],
    description: 'Spin the spinner — the chosen board card is destroyed and replaced with a fresh draw. Could completely reshape the board.',
    sellValue: 2,
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
    name: 'Chaos Swap',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_PREFLOP],
    description: 'Spin to pick a target — your entire hand teleports into theirs and vice versa. No redraws, no mercy.',
    sellValue: 1,
    icon: '🥔',
    requiresInput: null, // server auto-spins
  },
  {
    definitionId: 'return_reriver',
    count: 2,
    name: 'Temporal Shift',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_TURN, TIMING.AFTER_RIVER],
    description: 'Rewrite fate — the last community card is erased from the timeline and replaced with a new draw.',
    sellValue: 2,
    icon: '↩️',
    requiresInput: null,
  },
  {
    definitionId: 'call_in',
    count: 2,
    name: 'Arcane Mandate',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_PREFLOP],
    description: 'Your will becomes law — all players must call the big blind. Pre-flop betting is skipped entirely.',
    sellValue: 1,
    icon: '📞',
    requiresInput: null,
  },
  {
    definitionId: '404_error',
    count: 2,
    name: 'Void Erase',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'Reach into the fabric of the hand and tear out a rank — choose from 2 draws, and that rank is nullified for the rest of this hand.',
    sellValue: 2,
    icon: '🚫',
    requiresInput: 'rank_choice_two', // { drawnRanks: [r1,r2], chosenRank }
  },
  {
    definitionId: 'chain_reaction',
    count: 2,
    name: 'Arcane Chain',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'A cursed chain locks all players together — everyone passes their left hole card to the player on their left simultaneously.',
    sellValue: 1,
    icon: '⛓️',
    requiresInput: null,
  },
  {
    definitionId: 'change_clothes',
    count: 2,
    name: 'Transmutation',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.ANYTIME],
    description: 'Alchemize any card on the board or in your hand — it transforms into the suit of your choosing.',
    sellValue: 2,
    icon: '👗',
    requiresInput: 'card_and_suit', // { targetCardId, suit }
  },
  {
    definitionId: 'drained',
    count: 2,
    name: 'Soul Siphon',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_DEAL],
    description: 'Spin to target a player — they must call a coin flip. Call it wrong and they pay you 2 BB. Call it right and they escape.',
    sellValue: 1,
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
    name: 'Phoenix',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_FLOP_BEFORE_ACTION],
    description: 'Rise from the ashes — sacrifice your current hand and draw 2 entirely new hole cards from the deck.',
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
    name: 'Hex Blind',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_DEAL],
    description: 'Curse a player — spin to choose your victim. They are dealt 2 hole cards but may only see ONE. The other is hidden by dark magic.',
    sellValue: 1,
    icon: '🏴‍☠️',
    requiresInput: null, // server auto-spins
  },
  {
    definitionId: 'risk_taker',
    count: 3,
    name: "Fortune's Gambit",
    type: CARD_TYPE.SPELL,
    timing: [TIMING.BEFORE_DEAL],
    description: 'High-risk, high-reward — call the coin flip. Win: every other player pays you 2 BB. Lose: you pay everyone 2 BB.',
    sellValue: 1,
    icon: '🎲',
    requiresInput: 'coin_call', // { call: 'heads'|'tails' }
  },

  // ─── VETO ─────────────────────────────────────────────────────────────────
  {
    definitionId: 'veto',
    count: 9,
    name: 'Counter Spell',
    type: CARD_TYPE.SPELL,
    timing: [TIMING.AFTER_SPELL],
    description: 'The ultimate defensive move — instantly negate the last played spell, as if it never existed.',
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

  // ─── BOUNTIES REMOVED — conditions too hard to trigger in short games ──────
  // royalty, in_the_shadows, lucky_7, straight_up, underdog all removed
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
