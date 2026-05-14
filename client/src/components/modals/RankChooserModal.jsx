import React, { useState } from 'react';
import './RankChooserModal.css';

export default function RankChooserModal({ drawnRanks, instanceId, onChoose }) {
  const [chosen, setChosen] = useState(null);

  return (
    <div className="rank-overlay">
      <div className="rank-modal">
        <div className="rank-title">🎴 Rank Bag Draw</div>
        <p className="rank-desc">Two ranks were drawn. Choose one to activate.</p>
        <div className="rank-options">
          {drawnRanks.map(rank => (
            <button
              key={rank}
              className={`rank-btn ${chosen === rank ? 'selected' : ''}`}
              onClick={() => setChosen(rank)}
            >
              {rank}
            </button>
          ))}
        </div>
        <button
          className="rank-confirm"
          disabled={!chosen}
          onClick={() => onChoose(instanceId, chosen, drawnRanks)}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
