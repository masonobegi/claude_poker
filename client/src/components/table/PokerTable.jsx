import React from 'react';
import PlayerSeat from '../player/PlayerSeat';
import CommunityCards from './CommunityCards';
import Pot from './Pot';
import './PokerTable.css';

const CX = 50, CY = 50; // ellipse center %
const RX = 42, RY = 35; // seat radii %
const BET_RX = 26, BET_RY = 22; // bet chip radii (closer to center)

function getSeatPositions(count) {
  const positions = [];
  const startAngle = Math.PI / 2; // bottom first
  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * ((2 * Math.PI) / count);
    positions.push({
      seat: { left: `${CX + RX * Math.cos(angle)}%`, top: `${CY + RY * Math.sin(angle)}%` },
      bet:  { left: `${CX + BET_RX * Math.cos(angle)}%`, top: `${CY + BET_RY * Math.sin(angle)}%` },
    });
  }
  return positions;
}

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function PokerTable({ gameState, playerId, onSellCard }) {
  const { players, communityCards, pot, rolloverPot, dealerIndex, activePlayerIndex, phase, bigBlind, mods } = gameState;

  const myRawIdx = players.findIndex(p => p.id === playerId);
  const displayOrder = players.map((_, i) => (i - myRawIdx + players.length) % players.length);
  const orderedPlayers = displayOrder.map(i => ({ ...players[i], _rawIdx: i }));
  const positions = getSeatPositions(orderedPlayers.length);
  const isShowdown = phase === 'showdown' || phase === 'hand_complete';

  return (
    <div className="poker-table-wrap">
      <div className="poker-felt">
        <div className="poker-felt-inner">
          <div className="poker-center">
            <CommunityCards cards={communityCards} phase={phase} />
            <Pot pot={pot} rolloverPot={rolloverPot} bigBlind={bigBlind} />
            {mods.reverseReverse && (
              <div className="poker-mod-badge reverse">LOWEST WINS</div>
            )}
          </div>
        </div>
      </div>

      {/* Bet chips on the table surface */}
      {orderedPlayers.map((player, displayIdx) => {
        const { bet: betPos } = positions[displayIdx];
        if (!player.currentBet || player.currentBet <= 0) return null;
        return (
          <div
            key={`bet-${player.id}`}
            className="poker-bet-chip-anchor"
            style={{ left: betPos.left, top: betPos.top }}
          >
            <div className="poker-bet-chip">
              <span className="poker-bet-chip-coin">🟡</span>
              <span className="poker-bet-chip-amount">{fmt(player.currentBet)}</span>
            </div>
          </div>
        );
      })}

      {/* Player seats */}
      {orderedPlayers.map((player, displayIdx) => {
        const { seat: pos } = positions[displayIdx];
        const isMe = player.id === playerId;
        const isActive = player._rawIdx === activePlayerIndex;
        const isDealer = player._rawIdx === dealerIndex;

        return (
          <div
            key={player.id}
            className="poker-seat-anchor"
            style={{ left: pos.left, top: pos.top }}
          >
            <PlayerSeat
              player={player}
              isMe={isMe}
              isActive={isActive}
              isDealer={isDealer}
              isShowdown={isShowdown}
              bigBlind={bigBlind}
              onSellCard={onSellCard}
            />
          </div>
        );
      })}
    </div>
  );
}
