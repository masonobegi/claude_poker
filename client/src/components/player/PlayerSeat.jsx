import React, { useState, useEffect, useRef } from 'react';
import PlayingCard from '../cards/PlayingCard';
import CardBack from '../cards/CardBack';
import AvatarImage from './AvatarImage';
import './PlayerSeat.css';

function AnimatedChips({ chips }) {
  const [display, setDisplay] = useState(chips);
  const [dir, setDir] = useState('');
  const prev = useRef(chips);
  useEffect(() => {
    if (chips === prev.current) return;
    setDir(chips > prev.current ? 'gaining' : 'losing');
    const start = prev.current, end = chips, t0 = Date.now(), dur = 700;
    const tick = () => {
      const p = Math.min((Date.now() - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * e));
      if (p < 1) requestAnimationFrame(tick);
      else { setDisplay(end); setTimeout(() => setDir(''), 600); }
    };
    requestAnimationFrame(tick);
    prev.current = chips;
  }, [chips]);
  const f = n => n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'')+'K' : String(n);
  return <div className={`player-chips ${dir}`}>{f(display)}</div>;
}

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

// CSS wizard hat component rendered above each avatar
function WizardHat({ isMe, isActive }) {
  return (
    <div className={`wizard-hat ${isMe ? 'wizard-hat-me' : ''} ${isActive ? 'wizard-hat-active' : ''}`}>
      <div className="wizard-hat-cone" />
      <div className="wizard-hat-brim" />
      <div className="wizard-hat-star" />
    </div>
  );
}

export default function PlayerSeat({ player, isMe, isActive, isDealer, isShowdown, bigBlind, chatMessage }) {
  if (!player) return null;

  const { name, chips, hasFolded, isAllIn, eliminated, powerCardCount, holeCards, revealedHoleCardIndices, eyePatchIndex, bestHand, isSmallBlind, isBigBlind, isBot } = player;
  const statusClass = hasFolded ? 'folded' : isAllIn ? 'allin' : eliminated ? 'eliminated' : '';

  return (
    <div className={`player-seat ${isMe ? 'me' : ''} ${isActive ? 'active' : ''} ${statusClass}`}>

      {/* Dealer/blind badges float above everything */}
      <div className="player-badges">
        {isDealer && <span className="badge badge-dealer">D</span>}
        {isSmallBlind && <span className="badge badge-sb">SB</span>}
        {isBigBlind && <span className="badge badge-bb">BB</span>}
      </div>

      {/* Hole cards — above the character, facing table center */}
      <div className="player-cards">
        {holeCards && holeCards.length > 0
          ? holeCards.map((card, i) => {
              const isHidden = !isMe && !isShowdown && !(revealedHoleCardIndices || []).includes(i);
              const isMasked = isMe && eyePatchIndex === i;
              if (isHidden || isMasked) return <CardBack key={i} size="small" />;
              if (!card) return <div key={i} className="card-slot-empty" />;
              return (
                <PlayingCard key={i} card={card} size="small" glowing={isShowdown && bestHand} />
              );
            })
          : <>
              <CardBack size="small" />
              <CardBack size="small" />
            </>
        }
      </div>

      {/* Chat bubble from bot */}
      {chatMessage?.message && (
        <div className="player-chat-bubble" key={chatMessage.key}>
          {chatMessage.message}
        </div>
      )}

      {/* Character sprite — wizard hat + circular avatar */}
      <div className="player-sprite-wrap">
        <WizardHat isMe={isMe} isActive={isActive} />
        <div className={`player-avatar-circle ${isMe ? 'me' : ''} ${isActive ? 'active' : ''}`}>
          <AvatarImage name={name} isBot={isBot} size={72} />
        </div>

        {/* Status overlays inside the sprite area */}
        {hasFolded  && <div className="player-status-overlay">FOLD</div>}
        {isAllIn    && <div className="player-status-overlay allin">ALL IN</div>}
        {eliminated && <div className="player-status-overlay bust">OUT</div>}

        {/* Best hand badge */}
        {isShowdown && bestHand && !hasFolded && (
          <div className="player-best-hand">{bestHand.name}</div>
        )}
      </div>

      {/* Nameplate — compact label below avatar */}
      <div className={`player-nameplate ${isActive ? 'active' : ''} ${isMe ? 'me' : ''}`}>
        <div className="player-name">
          {name}
          {powerCardCount > 0 && (
            <span className="player-card-count" title={`${powerCardCount} spell cards`}>
              {powerCardCount}
            </span>
          )}
        </div>
        <AnimatedChips chips={chips} />
      </div>

      {/* Active glow ring around whole seat */}
      {isActive && !hasFolded && !isAllIn && (
        <div className="player-active-ring" />
      )}
    </div>
  );
}
