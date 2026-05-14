import React from 'react';
import './PlayingCard.css';

// Wizard suit symbols
const SUIT_SYMBOL = {
  H: { symbol: '🔥', label: 'Flame', color: '#ff4444' },
  D: { symbol: '💎', label: 'Crystal', color: '#44aaff' },
  C: { symbol: '⚡', label: 'Lightning', color: '#44ee88' },
  S: { symbol: '🌙', label: 'Moon', color: '#bb88ff' },
};

const FACE_ICONS = {
  J: '🧙',
  Q: '🔮',
  K: '👑',
  A: '⭐',
};

export default function PlayingCard({ card, size = 'normal', faceDown = false, hidden = false, glowing = false }) {
  if (!card || hidden) return <div className={`playing-card empty ${size}`} />;
  if (faceDown) {
    return (
      <div className={`playing-card back ${size}`}>
        <div className="card-back-pattern">✦</div>
      </div>
    );
  }

  const effectiveRank = card.promotedRank || card.rank;
  const suit = card.suitOverride || card.suit;
  const suitInfo = SUIT_SYMBOL[suit] || SUIT_SYMBOL.H;
  const isFace = ['J', 'Q', 'K'].includes(effectiveRank);
  const isRed = suit === 'H' || suit === 'D';
  const isWild = card.isWild;

  return (
    <div
      className={`playing-card ${size} ${isRed ? 'red' : 'black'} ${isWild ? 'wild' : ''} ${glowing ? 'glowing' : ''}`}
      style={{ '--suit-color': suitInfo.color }}
    >
      {/* Top rank/suit */}
      <div className="card-corner card-corner-top">
        <span className="card-rank">{effectiveRank}</span>
        <span className="card-suit-small">{suitInfo.symbol}</span>
      </div>

      {/* Center */}
      <div className="card-center">
        {isFace
          ? <span className="card-face-icon">{FACE_ICONS[effectiveRank] || suitInfo.symbol}</span>
          : effectiveRank === 'A'
            ? <span className="card-face-icon">{FACE_ICONS.A}</span>
            : <span className="card-suit-large">{suitInfo.symbol}</span>
        }
      </div>

      {/* Bottom rank/suit (rotated) */}
      <div className="card-corner card-corner-bottom">
        <span className="card-rank">{effectiveRank}</span>
        <span className="card-suit-small">{suitInfo.symbol}</span>
      </div>

      {isWild && <div className="card-wild-badge">WILD</div>}
      {card.promotedRank && <div className="card-promoted-badge">↑</div>}
      {card.suitOverride && <div className="card-suit-override-badge">✨</div>}
    </div>
  );
}
