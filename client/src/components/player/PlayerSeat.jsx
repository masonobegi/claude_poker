import React from 'react';
import PlayingCard from '../cards/PlayingCard';
import CardBack from '../cards/CardBack';
import AvatarImage from './AvatarImage';
import './PlayerSeat.css';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function PlayerSeat({ player, isMe, isActive, isDealer, isShowdown, bigBlind }) {
  if (!player) return null;

  const { name, chips, currentBet, hasFolded, isAllIn, eliminated, powerCardCount, holeCards, revealedHoleCardIndices, eyePatchIndex, bestHand, isSmallBlind, isBigBlind, isBot } = player;

  const statusClass = hasFolded ? 'folded' : isAllIn ? 'allin' : eliminated ? 'eliminated' : '';

  return (
    <div className={`player-seat ${isMe ? 'me' : ''} ${isActive ? 'active' : ''} ${statusClass}`}>
      {/* Dealer/blind badges */}
      <div className="player-badges">
        {isDealer && <span className="badge badge-dealer">D</span>}
        {isSmallBlind && <span className="badge badge-sb">SB</span>}
        {isBigBlind && <span className="badge badge-bb">BB</span>}
      </div>

      {/* Cards */}
      <div className="player-cards">
        {holeCards && holeCards.length > 0
          ? holeCards.map((card, i) => {
              const isHidden = !isMe && !isShowdown && !(revealedHoleCardIndices || []).includes(i);
              const isMasked = isMe && eyePatchIndex === i;

              if (isHidden) return <CardBack key={i} size="small" />;
              if (isMasked) return <CardBack key={i} size="small" />;
              if (!card) return <div key={i} className="card-slot-empty" />;
              return (
                <PlayingCard
                  key={i}
                  card={card}
                  size="small"
                  glowing={isShowdown && bestHand}
                />
              );
            })
          : <>
              <CardBack size="small" />
              <CardBack size="small" />
            </>
        }
      </div>

      {/* Player info */}
      <div className="player-info">
        <div className="player-info-row">
          <AvatarImage name={name} isBot={isBot} size={28} className="player-avatar-tiny" />
          <div className="player-name-chip">
            <div className="player-name">
              {name}
              {powerCardCount > 0 && (
                <span className="player-card-count" title={`${powerCardCount} power cards`}>
                  {powerCardCount}
                </span>
              )}
            </div>
            <div className="player-chips">{fmt(chips)}</div>
          </div>
        </div>
      </div>

      {/* Status overlay */}
      {hasFolded && <div className="player-status-overlay">FOLD</div>}
      {isAllIn && <div className="player-status-overlay allin">ALL IN</div>}
      {eliminated && <div className="player-status-overlay bust">OUT</div>}

      {/* Best hand display at showdown */}
      {isShowdown && bestHand && !hasFolded && (
        <div className="player-best-hand">{bestHand.name}</div>
      )}

      {/* Active indicator ring */}
      {isActive && !hasFolded && !isAllIn && (
        <div className="player-active-ring" />
      )}
    </div>
  );
}
