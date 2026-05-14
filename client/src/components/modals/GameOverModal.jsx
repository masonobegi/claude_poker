import React from 'react';
import AvatarImage from '../player/AvatarImage';
import './GameOverModal.css';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function GameOverModal({ players, playerId }) {
  const sorted = [...players].sort((a, b) => b.chips - a.chips);
  const winner = sorted[0];
  const isWinner = winner?.id === playerId;

  const rankLabel = i => i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i+1}th`;

  return (
    <div className="gameover-overlay">
      <div className="gameover-modal">
        <div className="gameover-winner-avatar">
          <AvatarImage name={winner?.name} isBot={winner?.isBot} size={80} />
        </div>
        <h2 className="gameover-title">
          {isWinner ? 'Victory!' : `${winner?.name} Wins`}
        </h2>
        <div className="gameover-subtitle">Final Standings</div>

        <div className="gameover-standings">
          {sorted.map((p, i) => (
            <div key={p.id} className={`gameover-row ${p.id === playerId ? 'me' : ''}`}>
              <AvatarImage name={p.name} isBot={p.isBot} size={32} />
              <span className="gameover-rank-badge" data-rank={i}>{rankLabel(i)}</span>
              <span className="gameover-name">
                {p.name}
                {p.id === playerId && <span className="gameover-you"> — You</span>}
              </span>
              <span className="gameover-chips">{fmt(p.chips)}</span>
            </div>
          ))}
        </div>

        <button
          className="gameover-reload"
          onClick={() => window.location.reload()}
        >
          🔄 Play Again
        </button>
      </div>
    </div>
  );
}
