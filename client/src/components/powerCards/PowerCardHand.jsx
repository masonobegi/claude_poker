import React, { useState } from 'react';
import PowerCardTile from './PowerCardTile';
import PowerCardModal from './PowerCardModal';
import './PowerCardHand.css';

const PHASE_TIMING_ALLOWLIST = {
  before_deal:              ['BEFORE_DEAL'],
  before_preflop:           ['BEFORE_PREFLOP', 'ANYTIME'],
  preflop_betting:          ['ANYTIME'],
  before_flop:              ['BEFORE_COMMUNITY', 'ANYTIME'],
  flop_deal:                [],
  after_flop_before_action: ['AFTER_FLOP_BEFORE_ACTION', 'ANYTIME'],
  flop_betting:             ['ANYTIME', 'ANYTIME_AFTER_FLOP'],
  before_turn:              ['BEFORE_COMMUNITY', 'ANYTIME', 'ANYTIME_AFTER_FLOP'],
  turn_deal:                [],
  after_turn:               ['AFTER_TURN', 'ANYTIME', 'ANYTIME_AFTER_FLOP'], // window before turn betting
  turn_betting:             ['ANYTIME', 'ANYTIME_AFTER_FLOP'],
  before_river:             ['BEFORE_COMMUNITY', 'ANYTIME', 'ANYTIME_AFTER_FLOP'],
  river_deal:               [],
  after_river_before_action:['AFTER_RIVER_BEFORE_ACTION', 'AFTER_RIVER', 'ANYTIME', 'ANYTIME_AFTER_FLOP'],
  river_betting:            ['ANYTIME', 'ANYTIME_AFTER_FLOP'],
  after_river:              ['AFTER_RIVER', 'ANYTIME', 'ANYTIME_AFTER_FLOP'],
  hand_complete:            ['AFTER_HAND'],
};

function canPlayInPhase(card, phase) {
  const allowed = PHASE_TIMING_ALLOWLIST[phase] || [];
  return (card.timing || []).some(t => allowed.includes(t));
}

export default function PowerCardHand({ cards, phase, gameState, onPlay, onSell, needSell, playerId }) {
  const [modal, setModal] = useState(null); // card being viewed/played

  if (!cards || cards.length === 0) {
    return (
      <div className="power-hand-empty">
        No power cards
      </div>
    );
  }

  const handleCardClick = (card) => {
    setModal(card);
  };

  const handlePlay = (card, opts) => {
    onPlay(card, opts);
    setModal(null);
  };

  return (
    <div className="power-hand">
      {cards.map(card => {
        const playable = canPlayInPhase(card, phase);
        const mustSell = needSell;

        return (
          <PowerCardTile
            key={card.instanceId}
            card={card}
            playable={playable}
            mustSell={mustSell}
            onClick={() => handleCardClick(card)}
          />
        );
      })}

      {modal && (
        <PowerCardModal
          card={modal}
          phase={phase}
          gameState={gameState}
          playerId={playerId}
          canPlay={canPlayInPhase(modal, phase)}
          onPlay={handlePlay}
          onSell={() => { onSell(modal.instanceId); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
