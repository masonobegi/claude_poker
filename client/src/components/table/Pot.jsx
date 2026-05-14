import React from 'react';
import './Pot.css';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function Pot({ pot, rolloverPot, bigBlind }) {
  if (pot <= 0 && rolloverPot <= 0) return null;
  return (
    <div className="pot-display">
      <span className="pot-chip">🟡</span>
      <span className="pot-amount">{fmt(pot)}</span>
      {rolloverPot > 0 && (
        <span className="pot-rollover">+{fmt(rolloverPot)} rollover</span>
      )}
    </div>
  );
}
