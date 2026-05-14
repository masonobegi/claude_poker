import React, { useState } from 'react';
import './PowerCardModal.css';

const TYPE_COLOR = {
  SPELL:       '#9966ff',
  ENCHANTMENT: '#44aaff',
  BOUNTY:      '#ffaa22',
};

export default function PowerCardModal({ card, phase, gameState, playerId, canPlay, onPlay, onSell, onClose }) {
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [targetCardId, setTargetCardId] = useState('');
  const [direction, setDirection] = useState('up');
  const [suit, setSuit] = useState('H');
  const [coinCall, setCoinCall] = useState('heads');

  const color = TYPE_COLOR[card.type] || '#888';
  const players = gameState?.players || [];
  const communityCards = gameState?.communityCards || [];
  const myPlayer = players.find(p => p.id === playerId);
  const myHoleCards = myPlayer?.holeCards || [];

  // Build opts based on card requirements
  function buildOpts() {
    switch (card.requiresInput) {
      case 'card_and_direction':
        return { targetCardId, direction };
      case 'card_and_suit':
        return { targetCardId, suit };
      case 'player_select':
        return { targetPlayerId };
      case 'coin_call':
        return { coinCall };
      default:
        return {};
    }
  }

  function isReadyToPlay() {
    switch (card.requiresInput) {
      case 'card_and_direction': return !!targetCardId;
      case 'card_and_suit': return !!targetCardId;
      case 'player_select': return !!targetPlayerId;
      default: return true;
    }
  }

  const cardSelectOptions = [
    ...communityCards.map((c, i) => ({
      id: `community_${i}`,
      label: `Board: ${c.promotedRank || c.rank}${c.suit}`,
    })),
    ...myHoleCards.map((c, i) => ({
      id: `hole_${playerId}_${i}`,
      label: `My card: ${c.promotedRank || c.rank}${c.suit}`,
    })),
  ];

  const otherPlayers = players.filter(p => p.id !== playerId && !p.eliminated);

  return (
    <div className="pcmodal-overlay" onClick={onClose}>
      <div
        className="pcmodal"
        style={{ '--type-color': color }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pcmodal-header">
          <span className="pcmodal-icon">{card.icon}</span>
          <div>
            <div className="pcmodal-name">{card.name}</div>
            <div className="pcmodal-type">{card.type}</div>
          </div>
          <div className="pcmodal-sell-value">Sell: {card.sellValue} BB</div>
        </div>

        <div className="pcmodal-desc">{card.description}</div>

        {/* Input requirements */}
        {canPlay && card.requiresInput === 'card_and_direction' && (
          <div className="pcmodal-inputs">
            <label className="pcmodal-label">Select card to affect:</label>
            <select className="pcmodal-select" value={targetCardId} onChange={e => setTargetCardId(e.target.value)}>
              <option value="">-- Choose --</option>
              {cardSelectOptions.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <label className="pcmodal-label">Direction:</label>
            <div className="pcmodal-radio-group">
              <label className="pcmodal-radio">
                <input type="radio" value="up" checked={direction === 'up'} onChange={() => setDirection('up')} />
                ⬆️ Promote (+1 rank)
              </label>
              <label className="pcmodal-radio">
                <input type="radio" value="down" checked={direction === 'down'} onChange={() => setDirection('down')} />
                ⬇️ Demote (−1 rank)
              </label>
            </div>
          </div>
        )}

        {canPlay && card.requiresInput === 'card_and_suit' && (
          <div className="pcmodal-inputs">
            <label className="pcmodal-label">Select card to change:</label>
            <select className="pcmodal-select" value={targetCardId} onChange={e => setTargetCardId(e.target.value)}>
              <option value="">-- Choose --</option>
              {cardSelectOptions.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <label className="pcmodal-label">New suit:</label>
            <div className="pcmodal-radio-group">
              {[['H','🔥 Flame'],['D','💎 Crystal'],['C','⚡ Lightning'],['S','🌙 Moon']].map(([s,l]) => (
                <label key={s} className="pcmodal-radio">
                  <input type="radio" value={s} checked={suit === s} onChange={() => setSuit(s)} />
                  {l}
                </label>
              ))}
            </div>
          </div>
        )}

        {canPlay && card.requiresInput === 'player_select' && (
          <div className="pcmodal-inputs">
            <label className="pcmodal-label">Select target player:</label>
            <select className="pcmodal-select" value={targetPlayerId} onChange={e => setTargetPlayerId(e.target.value)}>
              <option value="">-- Choose --</option>
              {otherPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.isBot ? '🤖' : '🧙'} {p.name}</option>
              ))}
            </select>
          </div>
        )}

        {canPlay && card.requiresInput === 'coin_call' && (
          <div className="pcmodal-inputs">
            <label className="pcmodal-label">Call the coin:</label>
            <div className="pcmodal-radio-group">
              <label className="pcmodal-radio">
                <input type="radio" value="heads" checked={coinCall === 'heads'} onChange={() => setCoinCall('heads')} />
                🟡 Heads
              </label>
              <label className="pcmodal-radio">
                <input type="radio" value="tails" checked={coinCall === 'tails'} onChange={() => setCoinCall('tails')} />
                ⚪ Tails
              </label>
            </div>
          </div>
        )}

        {/* Auto-spin cards note */}
        {canPlay && !card.requiresInput && card.type === 'SPELL' && (
          <div className="pcmodal-note">
            {card.definitionId.includes('spin') || ['burned','mirrored','eye_patch','hot_potato','drained'].includes(card.definitionId)
              ? '🎲 The spinner will be rolled automatically.'
              : '✨ This card activates immediately.'}
          </div>
        )}

        {/* Actions */}
        <div className="pcmodal-actions">
          {canPlay && (
            <button
              className="pcmodal-btn pcmodal-play"
              onClick={() => onPlay(card, buildOpts())}
              disabled={!isReadyToPlay()}
            >
              ✨ Play Card
            </button>
          )}
          <button className="pcmodal-btn pcmodal-sell" onClick={onSell}>
            💰 Sell ({card.sellValue} BB)
          </button>
          <button className="pcmodal-btn pcmodal-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
