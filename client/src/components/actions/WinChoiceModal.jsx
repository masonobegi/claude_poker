import React, { useState } from 'react';
import './WinChoiceModal.css';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function WinChoiceModal({ data, onChoose }) {
  const [choice, setChoice] = useState(null);
  const [stealTarget, setStealTarget] = useState('');

  const { pot, halfPot, rolloverAmount, stealableCards } = data;

  const canConfirm = choice === 'full' || (choice === 'half' && !!stealTarget);

  return (
    <div className="winchoice-overlay">
      <div className="winchoice-modal">
        <div className="winchoice-header">
          🏆 You Win!
        </div>

        <p className="winchoice-subtitle">Pot: <strong>{fmt(pot)}</strong> chips — choose your reward:</p>

        <div className="winchoice-options">
          <div
            className={`winchoice-option ${choice === 'full' ? 'selected' : ''}`}
            onClick={() => setChoice('full')}
          >
            <div className="winchoice-option-icon">💰</div>
            <div className="winchoice-option-body">
              <div className="winchoice-option-title">Full Pot</div>
              <div className="winchoice-option-desc">Take {fmt(pot)} chips + draw a power card</div>
            </div>
          </div>

          <div
            className={`winchoice-option ${choice === 'half' ? 'selected' : ''}`}
            onClick={() => setChoice('half')}
          >
            <div className="winchoice-option-icon">🃏</div>
            <div className="winchoice-option-body">
              <div className="winchoice-option-title">Half Pot + Steal</div>
              <div className="winchoice-option-desc">
                Take {fmt(halfPot)} chips, steal a power card, roll {fmt(rolloverAmount)} over
              </div>
            </div>
          </div>
        </div>

        {choice === 'half' && stealableCards.length > 0 && (
          <div className="winchoice-steal">
            <label className="pcmodal-label">Steal which card?</label>
            <select
              className="pcmodal-select"
              value={stealTarget}
              onChange={e => setStealTarget(e.target.value)}
            >
              <option value="">-- Choose --</option>
              {stealableCards.map(c => (
                <option key={c.instanceId} value={c.instanceId}>
                  {c.icon} {c.name} (from {c.ownerId?.slice(0,8)}...)
                </option>
              ))}
            </select>
          </div>
        )}

        {choice === 'half' && stealableCards.length === 0 && (
          <p className="winchoice-note">No stealable cards available.</p>
        )}

        <button
          className="winchoice-confirm"
          onClick={() => onChoose(choice === 'full' ? 'full' : 'half_steal', stealTarget || null)}
          disabled={!canConfirm}
        >
          Confirm Choice
        </button>
      </div>
    </div>
  );
}
