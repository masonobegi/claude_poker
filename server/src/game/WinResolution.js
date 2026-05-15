'use strict';

const { findBestHand, comparePlayerHands } = require('./HandEvaluator');

// Calculate side pots from player contributions
function buildSidePots(players) {
  const active = players.filter(p => p.totalBetThisHand > 0);
  if (active.length === 0) return [{ amount: 0, eligible: [] }];

  const levels = [...new Set(active.map(p => p.totalBetThisHand))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;

  for (const level of levels) {
    const contribution = level - prev;
    const eligible = active.filter(p => p.totalBetThisHand >= level && !p.hasFolded);
    const allContributors = active.filter(p => p.totalBetThisHand >= level);
    const amount = contribution * allContributors.length;
    if (amount > 0) {
      pots.push({ amount, eligible: eligible.map(p => p.id) });
    }
    prev = level;
  }

  return pots.length > 0 ? pots : [{ amount: 0, eligible: [] }];
}

// Evaluate each active (non-folded) player's best hand
function evaluateAllHands(players, communityCards, mods) {
  const results = [];
  for (const p of players) {
    if (p.hasFolded || p.eliminated) continue;
    const allCards = [...p.holeCards, ...communityCards].filter(Boolean);
    const bestHand = findBestHand(allCards, mods);
    results.push({ playerId: p.id, player: p, bestHand });
  }
  return results;
}

// Determine winner(s) for a single pot among eligible players
function resolvePot(pot, handResults, reverseReverse) {
  const eligible = handResults.filter(r => pot.eligible.includes(r.playerId));
  if (eligible.length === 0) return [];
  if (eligible.length === 1) return [{ playerId: eligible[0].playerId, amount: pot.amount }];

  let best = null;
  for (const r of eligible) {
    if (!best || comparePlayerHands(r.bestHand, best.bestHand, reverseReverse) > 0) {
      best = r;
    }
  }

  const winners = eligible.filter(r =>
    comparePlayerHands(r.bestHand, best.bestHand, reverseReverse) === 0
  );

  const share = Math.floor(pot.amount / winners.length);
  const remainder = pot.amount - share * winners.length;

  return winners.map((w, i) => ({
    playerId: w.playerId,
    amount: share + (i === 0 ? remainder : 0), // give remainder to first winner
  }));
}

// Full showdown resolution
function resolveShowdown(players, communityCards, mods) {
  const handResults = evaluateAllHands(players, communityCards, mods);
  const sidePots = buildSidePots(players);

  const payouts = {}; // playerId → total winnings
  for (const p of players) payouts[p.id] = 0;

  for (const pot of sidePots) {
    const potWinners = resolvePot(pot, handResults, mods.reverseReverse);
    for (const { playerId, amount } of potWinners) {
      payouts[playerId] = (payouts[playerId] || 0) + amount;
    }
  }

  // Determine the overall main-pot winner (for power card mechanic)
  const mainPot = sidePots[0];
  const mainWinners = resolvePot(mainPot, handResults, mods.reverseReverse);
  const mainWinnerId = mainWinners.length > 0 ? mainWinners[0].playerId : null;

  // Find runner-up for In the Shadows bounty
  const sortedResults = [...handResults].sort((a, b) =>
    comparePlayerHands(b.bestHand, a.bestHand, mods.reverseReverse)
  );
  const runnerUpId = sortedResults.length > 1 ? sortedResults[1].playerId : null;

  return { payouts, handResults, mainWinnerId, runnerUpId };
}

module.exports = { resolveShowdown, buildSidePots, evaluateAllHands };
