import React from 'react';
import './ModsIndicator.css';

export default function ModsIndicator({ mods = {}, wildRanks = [], disabledRanks = [] }) {
  const active = [];
  if (mods.blurred) active.push({ label: '🌊 Blurred', title: 'H=D, S=C same suit' });
  if (mods.pushThrough) active.push({ label: '♾️ Push Through', title: 'Aces wrap in straights' });
  if (mods.kingMe) active.push({ label: '👑 King Me', title: 'J/Q may be Kings' });
  if (mods.reverseReverse) active.push({ label: '🔃 Reverse!', title: 'Lowest hand wins' });
  if (mods.thatIsOdd) active.push({ label: '🔢 Odds Only', title: '2,4,6,8,10 disabled' });
  if (wildRanks.length > 0) active.push({ label: `🃏 Wild: ${wildRanks.join(',')}`, title: 'These ranks are wild' });
  if (disabledRanks.length > 0) active.push({ label: `🚫 No: ${disabledRanks.join(',')}`, title: 'These ranks are disabled' });

  if (active.length === 0) return null;

  return (
    <div className="mods-indicator">
      {active.map((m, i) => (
        <div key={i} className="mod-badge" title={m.title}>{m.label}</div>
      ))}
    </div>
  );
}
