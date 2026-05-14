import React from 'react';
import './PowerCardTile.css';

const TYPE_COLOR = {
  SPELL:       '#9966ff',
  ENCHANTMENT: '#44aaff',
  BOUNTY:      '#ffaa22',
};

export default function PowerCardTile({ card, playable, mustSell, onClick }) {
  const color = TYPE_COLOR[card.type] || '#888';
  const dimmed = !playable && !mustSell;

  return (
    <div
      className={`power-tile ${playable ? 'playable' : ''} ${mustSell ? 'must-sell' : ''} ${dimmed ? 'dimmed' : ''}`}
      style={{ '--type-color': color }}
      onClick={onClick}
      title={card.name}
    >
      <div className="power-tile-icon">{card.icon}</div>
      <div className="power-tile-name">{card.name}</div>
      {mustSell && <div className="power-tile-sell-badge">SELL!</div>}
    </div>
  );
}
