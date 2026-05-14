import React from 'react';
import './PhaseIndicator.css';

const PHASE_LABELS = {
  lobby: 'Lobby',
  before_deal: 'Before Deal',
  dealing: 'Dealing',
  before_preflop: 'Pre-Flop',
  preflop_betting: 'Pre-Flop Bet',
  before_flop: 'Revealing Flop',
  flop_deal: 'Flop',
  after_flop_before_action: 'After Flop',
  flop_betting: 'Flop Bet',
  before_turn: 'Revealing Turn',
  turn_deal: 'Turn',
  turn_betting: 'Turn Bet',
  after_turn: 'After Turn',
  before_river: 'Revealing River',
  river_deal: 'River',
  after_river_before_action: 'After River',
  river_betting: 'River Bet',
  after_river: 'River',
  showdown: 'Showdown',
  win_choice: 'Win Choice',
  hand_complete: 'Hand Over',
  game_over: 'Game Over',
};

const PHASE_COLOR = {
  preflop_betting: '#44aaff',
  flop_betting: '#44dd88',
  turn_betting: '#ffaa22',
  river_betting: '#ff6644',
  showdown: '#ff88ff',
  win_choice: '#ffdd44',
  hand_complete: '#aaaaff',
  game_over: '#ff4444',
};

export default function PhaseIndicator({ phase }) {
  const label = PHASE_LABELS[phase] || phase;
  const color = PHASE_COLOR[phase] || '#888';
  return (
    <div className="phase-indicator" style={{ '--phase-color': color }}>
      <div className="phase-dot" />
      {label}
    </div>
  );
}
