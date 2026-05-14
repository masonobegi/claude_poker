import React, { useState } from 'react';
import './PowerCardTile.css';

const TYPE_COLOR = {
  SPELL:       '#9966ff',
  ENCHANTMENT: '#44aaff',
  BOUNTY:      '#ffaa22',
};

const TIMING_LABEL = {
  ANYTIME:               'Anytime on your turn',
  ANYTIME_AFTER_FLOP:    'Anytime after flop (your turn)',
  BEFORE_DEAL:           'Before cards are dealt',
  BEFORE_PREFLOP:        'Before pre-flop betting',
  AFTER_FLOP_BEFORE_ACTION: 'After flop, before betting',
  AFTER_TURN:            'After turn card, before betting',
  AFTER_RIVER_BEFORE_ACTION: 'After river card, before betting',
  AFTER_RIVER:           'After river betting',
  BEFORE_COMMUNITY:      'Before next community card',
  AFTER_SPELL:           'Reaction: after any spell is played',
  AFTER_HAND:            'After the hand ends (if you won)',
};

export default function PowerCardTile({ card, playable, mustSell, onClick }) {
  const [hovered, setHovered] = useState(false);
  const color = TYPE_COLOR[card.type] || '#888';
  const dimmed = !playable && !mustSell;

  const timingLabels = (card.timing || []).map(t => TIMING_LABEL[t] || t);

  return (
    <div
      className={`power-tile ${playable ? 'playable' : ''} ${mustSell ? 'must-sell' : ''} ${dimmed ? 'dimmed' : ''}`}
      style={{ '--type-color': color }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="power-tile-icon">{card.icon}</div>
      <div className="power-tile-name">{card.name}</div>
      {mustSell && <div className="power-tile-sell-badge">SELL!</div>}
      {!playable && !mustSell && <div className="power-tile-locked">🔒</div>}

      {hovered && (
        <div className="power-tile-tooltip">
          <div className="ptt-header">
            <span className="ptt-icon">{card.icon}</span>
            <div>
              <div className="ptt-name">{card.name}</div>
              <div className="ptt-type" style={{ color }}>{card.type}</div>
            </div>
          </div>
          <div className="ptt-desc">{card.description}</div>
          <div className="ptt-timing">
            <span className="ptt-timing-label">When to play:</span>
            {timingLabels.map((t, i) => <span key={i} className="ptt-timing-tag">{t}</span>)}
          </div>
          {!playable && (
            <div className="ptt-locked-note">⏳ Not playable in this phase</div>
          )}
          <div className="ptt-sell">Sell value: {card.sellValue} BB</div>
        </div>
      )}
    </div>
  );
}
