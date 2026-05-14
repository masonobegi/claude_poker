import React from 'react';
import './CurrentHandDisplay.css';

const HAND_RANK_COLORS = {
  'High Card':        '#888',
  'Pair':             '#88bbff',
  'Two Pair':         '#55aaff',
  'Three of a Kind':  '#44ccff',
  'Straight':         '#44ee88',
  'Flush':            '#aaee44',
  'Full House':       '#ffcc22',
  'Four of a Kind':   '#ff8822',
  'Straight Flush':   '#ff44aa',
  'Royal Flush':      '#ff22ff',
  'Five of a Kind':   '#ff00ff',
  'Flush House':      '#ff88ff',
  'Flush Five':       '#ffffff',
};

export default function CurrentHandDisplay({ hand }) {
  if (!hand || !hand.name) return null;
  const color = HAND_RANK_COLORS[hand.name] || '#aaa';

  return (
    <div className="current-hand-display" style={{ '--hand-color': color }}>
      <span className="chd-label">Current Hand</span>
      <span className="chd-name">{hand.name}</span>
    </div>
  );
}
