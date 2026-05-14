import React, { useState } from 'react';
import './CoinCallModal.css';

export default function CoinCallModal({ cardName, instanceId, onChoose }) {
  const [call, setCall] = useState(null);

  return (
    <div className="coin-overlay">
      <div className="coin-modal">
        <div className="coin-title">🪙 {cardName}</div>
        <p className="coin-desc">Call the coin flip!</p>
        <div className="coin-options">
          <button
            className={`coin-btn ${call === 'heads' ? 'selected' : ''}`}
            onClick={() => setCall('heads')}
          >
            🟡 Heads
          </button>
          <button
            className={`coin-btn ${call === 'tails' ? 'selected' : ''}`}
            onClick={() => setCall('tails')}
          >
            ⚪ Tails
          </button>
        </div>
        <button
          className="coin-confirm"
          disabled={!call}
          onClick={() => onChoose(instanceId, call)}
        >
          Call It!
        </button>
      </div>
    </div>
  );
}
