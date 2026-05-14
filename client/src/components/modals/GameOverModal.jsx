import React from 'react';
import './GameOverModal.css';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function GameOverModal({ players, playerId }) {
  const sorted = [...players].sort((a, b) => b.chips - a.chips);
  const winner = sorted[0];
  const isWinner = winner?.id === playerId;

  return (
    <div className="gameover-overlay">
      <div className="gameover-modal">
        <div className="gameover-icon">{isWinner ? '🏆' : '🧙'}</div>
        <h2 className="gameover-title">
          {isWinner ? 'You Win!' : `${winner?.name} Wins!`}
        </h2>
        <div className="gameover-subtitle">Final Standings</div>

        <div className="gameover-standings">
          {sorted.map((p, i) => (
            <div key={p.id} className={`gameover-row ${p.id === playerId ? 'me' : ''}`}>
              <span className="gameover-rank">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
              </span>
              <span className="gameover-name">
                {p.isBot ? '🤖' : '🧙'} {p.name}
                {p.id === playerId && ' (you)'}
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
