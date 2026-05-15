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
        <div className="winchoice-crown" />
        <div className="winchoice-header">Victory</div>
        <div className="winchoice-pot-line">
          <div className="winchoice-pot-chip" />
          <span className="winchoice-pot-num">{fmt(pot)}</span>
          <span className="winchoice-pot-label">chips in the pot</span>
        </div>

        <div className="winchoice-options">
          <div
            className={`winchoice-option ${choice === 'full' ? 'selected' : ''}`}
            onClick={() => setChoice('full')}
          >
            <div className="winchoice-option-icon woi-full">
              <div className="woi-chip-full" />
            </div>
            <div className="winchoice-option-body">
              <div className="winchoice-option-title">Take it all</div>
              <div className="winchoice-option-desc">
                <strong>{fmt(pot)}</strong> chips + draw a power card
              </div>
            </div>
            {choice === 'full' && <div className="winchoice-check">✓</div>}
          </div>

          <div
            className={`winchoice-option ${choice === 'half' ? 'selected' : ''}`}
            onClick={() => setChoice('half')}
          >
            <div className="winchoice-option-icon woi-half">
              <div className="woi-chip-half" />
              <div className="woi-steal-icon" />
            </div>
            <div className="winchoice-option-body">
              <div className="winchoice-option-title">Half + Steal</div>
              <div className="winchoice-option-desc">
                <strong>{fmt(halfPot)}</strong> chips, steal a spell, roll {fmt(rolloverAmount)} over
              </div>
            </div>
            {choice === 'half' && <div className="winchoice-check">✓</div>}
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
