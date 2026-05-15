import React from 'react';
import './Pot.css';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function Pot({ pot, rolloverPot }) {
  if (pot <= 0 && rolloverPot <= 0) return null;
  return (
    <div className="pot-display">
      <div className="pot-chip-stack">
        <div className="pot-chip pc1" />
        <div className="pot-chip pc2" />
        <div className="pot-chip pc3" />
      </div>
      <div className="pot-text">
        <div className="pot-label">POT</div>
        <div className="pot-amount">{fmt(pot)}</div>
        {rolloverPot > 0 && (
          <div className="pot-rollover">+{fmt(rolloverPot)} rollover</div>
        )}
      </div>
    </div>
  );
}
