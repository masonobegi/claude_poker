import React, { useState } from 'react';
import './BettingControls.css';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function BettingControls({ callAmount, minRaise, maxRaise, chips, pot, onAction }) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const canCheck = callAmount === 0;
  const canCall = callAmount > 0 && chips >= callAmount;
  const canRaise = chips > callAmount;

  const handleRaise = () => {
    const amount = Math.max(minRaise, Math.min(maxRaise, raiseAmount));
    onAction('raise', amount);
  };

  const presets = pot > 0
    ? [
        { label: '½ Pot', value: Math.floor(pot / 2) },
        { label: 'Pot',   value: pot },
        { label: 'All-in', value: maxRaise },
      ]
    : [
        { label: '¼',      value: Math.floor(maxRaise * 0.25) },
        { label: '½',      value: Math.floor(maxRaise * 0.5) },
        { label: 'All-in', value: maxRaise },
      ];

  return (
    <div className="betting-controls">
      <button className="bet-btn bet-fold" onClick={() => onAction('fold')}>Fold</button>

      {canCheck
        ? <button className="bet-btn bet-check" onClick={() => onAction('check')}>Check</button>
        : <button className="bet-btn bet-call" onClick={() => onAction('call')} disabled={!canCall}>
            Call {fmt(callAmount)}
          </button>
      }

      {canRaise && (
        <div className="bet-raise-group">
          <button className="bet-btn bet-raise" onClick={handleRaise}>
            Raise to {fmt(raiseAmount)}
          </button>
          <input
            type="range"
            className="bet-slider"
            min={minRaise}
            max={maxRaise}
            step={Math.max(1, Math.floor(minRaise / 4))}
            value={raiseAmount}
            onChange={e => setRaiseAmount(parseInt(e.target.value))}
          />
          <div className="bet-presets">
            {presets.map(p => (
              <button
                key={p.label}
                className="bet-preset"
                onClick={() => setRaiseAmount(Math.min(maxRaise, Math.max(minRaise, p.value)))}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
