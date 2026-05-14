'use strict';

const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VALUE = {};
RANKS.forEach((r, i) => { RANK_VALUE[r] = i + 2; }); // 2→2 ... A→14

const HAND_TYPE = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10,
  FIVE_OF_A_KIND: 11,
  FLUSH_HOUSE: 12,
  FLUSH_FIVE: 13,
};

const HAND_NAMES = {
  1: 'High Card', 2: 'Pair', 3: 'Two Pair', 4: 'Three of a Kind',
  5: 'Straight', 6: 'Flush', 7: 'Full House', 8: 'Four of a Kind',
  9: 'Straight Flush', 10: 'Royal Flush',
  11: 'Five of a Kind', 12: 'Flush House', 13: 'Flush Five',
};

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...tail] = arr;
  return [
    ...combinations(tail, k - 1).map(c => [head, ...c]),
    ...combinations(tail, k),
  ];
}

function effectiveSuit(card, mods) {
  let suit = card.suitOverride || card.suit;
  if (mods && mods.blurred) {
    if (suit === 'D') suit = 'H';
    if (suit === 'C') suit = 'S';
  }
  return suit;
}

function effectiveRank(card) {
  return card.promotedRank || card.rank;
}

function isCardValid(card, mods) {
  const rank = effectiveRank(card);
  if (mods && mods.disabledRanks && mods.disabledRanks.includes(rank)) return false;
  if (mods && mods.thatIsOdd) {
    const v = RANK_VALUE[rank];
    if (v && [2, 4, 6, 8, 10].includes(v)) return false;
  }
  return true;
}

function checkStraight(sortedUniqueVals, pushThrough) {
  // Standard straight check
  for (let i = sortedUniqueVals.length - 1; i >= 4; i--) {
    const window = sortedUniqueVals.slice(i - 4, i + 1);
    if (window[4] - window[0] === 4 && new Set(window).size === 5) {
      return window[4];
    }
  }
  // Ace-low straight (A-2-3-4-5)
  if (sortedUniqueVals.includes(14)) {
    const withLow = [1, ...sortedUniqueVals.filter(v => v !== 14)].sort((a, b) => a - b);
    for (let i = withLow.length - 1; i >= 4; i--) {
      const window = withLow.slice(i - 4, i + 1);
      if (window[4] - window[0] === 4 && new Set(window).size === 5) {
        return window[4]; // returns 5 for wheel
      }
    }
  }
  // Push Through: A wraps around (e.g. Q-K-A-2-3)
  if (pushThrough && sortedUniqueVals.includes(14)) {
    const extended = [...sortedUniqueVals, ...sortedUniqueVals.map(v => v === 14 ? 1 : null).filter(Boolean)].sort((a, b) => a - b);
    for (let i = extended.length - 1; i >= 4; i--) {
      const window = extended.slice(i - 4, i + 1);
      if (window[4] - window[0] === 4 && new Set(window).size === 5) {
        return window[4];
      }
    }
  }
  return 0;
}

function evaluate5Cards(cards, mods = {}) {
  // cards: exactly 5 non-wild card objects
  const processed = cards.map(c => ({
    ...c,
    _rank: effectiveRank(c),
    _suit: effectiveSuit(c, mods),
  }));

  const rankVals = processed.map(c => RANK_VALUE[c._rank]).sort((a, b) => b - a);
  const suits = processed.map(c => c._suit);

  // Rank counts
  const rc = {};
  for (const v of rankVals) rc[v] = (rc[v] || 0) + 1;
  const groups = Object.entries(rc)
    .map(([v, count]) => ({ val: parseInt(v), count }))
    .sort((a, b) => b.count - a.count || b.val - a.val);

  // Suit counts
  const sc = {};
  for (const s of suits) sc[s] = (sc[s] || 0) + 1;
  const isFlush = Object.values(sc).some(v => v >= 5);

  // Straight check
  const uniqueVals = [...new Set(rankVals)].sort((a, b) => a - b);
  const straightHigh = checkStraight(uniqueVals, mods.pushThrough);
  const isStraight = straightHigh > 0;

  const counts = groups.map(g => g.count);

  // Extended hand types (only possible with wilds/duplicates)
  if (counts[0] === 5) {
    return isFlush
      ? { type: 'FLUSH_FIVE', value: HAND_TYPE.FLUSH_FIVE, tiebreakers: [groups[0].val] }
      : { type: 'FIVE_OF_A_KIND', value: HAND_TYPE.FIVE_OF_A_KIND, tiebreakers: [groups[0].val] };
  }

  if (isFlush && counts[0] === 3 && counts[1] === 2) {
    return { type: 'FLUSH_HOUSE', value: HAND_TYPE.FLUSH_HOUSE, tiebreakers: [groups[0].val, groups[1].val] };
  }

  // Standard hands
  if (isStraight && isFlush) {
    const isRoyal = straightHigh === 14 && !rankVals.includes(1);
    return isRoyal
      ? { type: 'ROYAL_FLUSH', value: HAND_TYPE.ROYAL_FLUSH, tiebreakers: [14] }
      : { type: 'STRAIGHT_FLUSH', value: HAND_TYPE.STRAIGHT_FLUSH, tiebreakers: [straightHigh] };
  }

  if (counts[0] === 4) {
    return { type: 'FOUR_OF_A_KIND', value: HAND_TYPE.FOUR_OF_A_KIND, tiebreakers: [groups[0].val, groups[1]?.val || 0] };
  }
  if (counts[0] === 3 && counts[1] === 2) {
    return { type: 'FULL_HOUSE', value: HAND_TYPE.FULL_HOUSE, tiebreakers: [groups[0].val, groups[1].val] };
  }
  if (isFlush) {
    return { type: 'FLUSH', value: HAND_TYPE.FLUSH, tiebreakers: rankVals };
  }
  if (isStraight) {
    return { type: 'STRAIGHT', value: HAND_TYPE.STRAIGHT, tiebreakers: [straightHigh] };
  }
  if (counts[0] === 3) {
    return { type: 'THREE_OF_A_KIND', value: HAND_TYPE.THREE_OF_A_KIND, tiebreakers: [groups[0].val, ...groups.slice(1).map(g => g.val)] };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    return { type: 'TWO_PAIR', value: HAND_TYPE.TWO_PAIR, tiebreakers: [groups[0].val, groups[1].val, groups[2]?.val || 0] };
  }
  if (counts[0] === 2) {
    return { type: 'PAIR', value: HAND_TYPE.PAIR, tiebreakers: [groups[0].val, ...groups.slice(1).map(g => g.val)] };
  }
  return { type: 'HIGH_CARD', value: HAND_TYPE.HIGH_CARD, tiebreakers: rankVals };
}

function compareHands(a, b) {
  if (!a) return -1;
  if (!b) return 1;
  if (a.value !== b.value) return a.value - b.value;
  const len = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.tiebreakers[i] || 0) - (b.tiebreakers[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Try all possible assignments for `wildCount` wilds added to `naturals` (which are 5-wildCount cards)
function evaluateWithWilds(naturals, wildCount, mods) {
  if (wildCount === 0) return evaluate5Cards(naturals, mods);
  if (wildCount >= 5) return { type: 'FLUSH_FIVE', value: HAND_TYPE.FLUSH_FIVE, tiebreakers: [14] };

  const SUITS_LIST = ['H', 'D', 'C', 'S'];
  let best = null;

  function update(hand) {
    if (hand && compareHands(hand, best) > 0) best = hand;
  }

  // Strategy 1: all wilds take the same rank/suit
  for (const rank of RANKS) {
    if (mods.disabledRanks && mods.disabledRanks.includes(rank)) continue;
    if (mods.thatIsOdd && [2,4,6,8,10].includes(RANK_VALUE[rank])) continue;
    for (const suit of SUITS_LIST) {
      const wilds = Array.from({ length: wildCount }, () => ({ rank, suit, isWild: true, promotedRank: null, suitOverride: null }));
      update(evaluate5Cards([...naturals, ...wilds], mods));
    }
  }

  // Strategy 2: fill straight gaps (for 1-2 wilds)
  if (wildCount <= 2) {
    const naturalVals = naturals
      .filter(c => isCardValid(c, mods))
      .map(c => RANK_VALUE[effectiveRank(c)])
      .filter(Boolean);

    for (let high = 6; high <= 14; high++) {
      const straight = [high - 4, high - 3, high - 2, high - 1, high];
      const needed = straight.filter(v => !naturalVals.includes(v));
      if (needed.length <= wildCount && needed.length > 0) {
        for (const suit of SUITS_LIST) {
          const wildcards = needed.map(v => {
            const rank = RANKS[v - 2];
            return { rank, suit, isWild: true, promotedRank: null, suitOverride: null };
          });
          // Pad remaining wilds with high card
          while (wildcards.length < wildCount) {
            wildcards.push({ rank: 'A', suit, isWild: true, promotedRank: null, suitOverride: null });
          }
          update(evaluate5Cards([...naturals, ...wildcards], mods));
        }
      }
    }
  }

  return best;
}

// Apply King Me: face cards (J, Q) optionally count as K
// Returns array of card variants to try
function withKingMeVariants(cards, mods) {
  if (!mods || !mods.kingMe) return [cards];
  const faceIdxs = cards.map((c, i) => i).filter(i => ['J', 'Q'].includes(effectiveRank(cards[i])));
  if (faceIdxs.length === 0) return [cards];

  let variants = [cards];
  for (const idx of faceIdxs) {
    const next = [];
    for (const v of variants) {
      next.push(v);
      const asKing = [...v];
      asKing[idx] = { ...asKing[idx], promotedRank: 'K' };
      next.push(asKing);
    }
    variants = next;
  }
  return variants;
}

// Main entry: find best 5-card hand from all available cards
function findBestHand(allCards, mods = {}) {
  // Mark wild cards from Wild Style: any card whose rank is in mods.wildRanks
  const cards = allCards.map(c => {
    const rank = effectiveRank(c);
    const isWild = c.isWild || (mods.wildRanks && mods.wildRanks.includes(rank));
    return { ...c, isWild };
  });

  const wilds = cards.filter(c => c.isWild);
  const naturals = cards.filter(c => !c.isWild).filter(c => isCardValid(c, mods));
  const wildCount = wilds.length;

  const total = naturals.length + wildCount;
  if (total < 1) return { type: 'HIGH_CARD', value: 0, tiebreakers: [], name: 'High Card' };

  const slotsForNaturals = Math.max(0, 5 - wildCount);
  const natCombos = naturals.length === slotsForNaturals
    ? [naturals]
    : combinations(naturals, Math.min(slotsForNaturals, naturals.length));

  let best = null;
  for (const natCombo of natCombos) {
    // Try King Me variants
    const variants = withKingMeVariants(natCombo, mods);
    for (const variant of variants) {
      const h = evaluateWithWilds(variant, wildCount, mods);
      if (compareHands(h, best) > 0) best = h;
    }
  }

  if (!best) best = { type: 'HIGH_CARD', value: HAND_TYPE.HIGH_CARD, tiebreakers: [] };

  return {
    ...best,
    name: HAND_NAMES[best.value] || 'Unknown',
    // If Reverse Reverse is active, we'll invert comparison at showdown level
  };
}

// Compare two best-hand results; returns positive if a > b
function comparePlayerHands(a, b, reverseReverse = false) {
  const cmp = compareHands(a, b);
  return reverseReverse ? -cmp : cmp;
}

module.exports = { findBestHand, comparePlayerHands, compareHands, HAND_TYPE, HAND_NAMES, RANK_VALUE, RANKS };
