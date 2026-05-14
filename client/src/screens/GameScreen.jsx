import React, { useState } from 'react';
import PokerTable from '../components/table/PokerTable';
import BettingControls from '../components/actions/BettingControls';
import PowerCardHand from '../components/powerCards/PowerCardHand';
import GameLog from '../components/ui/GameLog';
import WinChoiceModal from '../components/actions/WinChoiceModal';
import ReactiveWindow from '../components/actions/ReactiveWindow';
import SpinnerModal from '../components/modals/SpinnerModal';
import RankChooserModal from '../components/modals/RankChooserModal';
import CoinCallModal from '../components/modals/CoinCallModal';
import GameOverModal from '../components/modals/GameOverModal';
import PhaseIndicator from '../components/ui/PhaseIndicator';
import ModsIndicator from '../components/ui/ModsIndicator';
import PhaseWindowBanner from '../components/ui/PhaseWindowBanner';
import CurrentHandDisplay from '../components/ui/CurrentHandDisplay';
import Notification from '../components/ui/Notification';
import './GameScreen.css';

export default function GameScreen({
  gameState, playerId, gameLog, notification,
  winChoiceData, rankPrompt, coinPrompt, reactiveWindow,
  spinnerData, needSell, onSpinnerClose, actions, audioEngine,
}) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [logOpen, setLogOpen] = useState(false);

  if (!gameState) {
    return (
      <div className="game-loading">
        <div className="home-wizard-icon">🧙‍♂️</div>
        <p>Loading game...</p>
      </div>
    );
  }

  const me = gameState.players.find(p => p.id === playerId);
  const isMyTurn = me && !me.hasFolded && !me.eliminated &&
    gameState.players[gameState.activePlayerIndex]?.id === playerId;
  const isBettingPhase = ['preflop_betting','flop_betting','turn_betting','river_betting'].includes(gameState.phase);
  const isGameOver = gameState.phase === 'game_over';
  const myPowerCards = me?.powerCards || [];
  const callAmount = me ? Math.max(0, gameState.currentBet - me.currentBet) : 0;
  const myCurrentHand = gameState.myCurrentHand;
  const phaseDeadline = gameState.phaseDeadline;

  const handlePowerCardPlay = (card, extraOpts = {}) => {
    actions.playPowerCard({
      instanceId: card.instanceId,
      ...extraOpts,
    });
    setSelectedCard(null);
  };

  return (
    <div className="game-screen">
      {/* Table */}
      <div className="game-table-area">
        <PokerTable
          gameState={gameState}
          playerId={playerId}
          onSellCard={needSell ? actions.sellPowerCard : null}
        />
      </div>

      {/* Bottom HUD */}
      <div className="game-hud">
        <div className="game-hud-left">
          <PhaseIndicator phase={gameState.phase} />
          <ModsIndicator mods={gameState.mods} wildRanks={gameState.wildRanks} disabledRanks={gameState.disabledRanks} />
        </div>

        <div className="game-hud-center">
          {/* Phase window countdown banner */}
          <PhaseWindowBanner
            phase={gameState.phase}
            phaseDeadline={phaseDeadline}
            myPlayableCards={myPowerCards}
          />

          {/* My cards + current hand */}
          <div className="game-my-cards-row">
            {myCurrentHand && <CurrentHandDisplay hand={myCurrentHand} />}
          </div>

          {/* Power card hand */}
          <PowerCardHand
            cards={myPowerCards}
            phase={gameState.phase}
            gameState={gameState}
            selectedCard={selectedCard}
            onSelect={setSelectedCard}
            onPlay={handlePowerCardPlay}
            onSell={actions.sellPowerCard}
            needSell={needSell}
            playerId={playerId}
          />

          {/* Betting controls */}
          {isBettingPhase && isMyTurn && (
            <BettingControls
              callAmount={callAmount}
              minRaise={gameState.currentBet + gameState.bigBlind}
              maxRaise={(me?.chips || 0) + (me?.currentBet || 0)}
              chips={me?.chips || 0}
              onAction={actions.gameAction}
            />
          )}
        </div>

        <div className="game-hud-right">
          <button
            className="game-log-toggle"
            onClick={() => setLogOpen(o => !o)}
          >
            📜 Log
          </button>
        </div>
      </div>

      {/* Game Log drawer */}
      <GameLog entries={gameLog} open={logOpen} onClose={() => setLogOpen(false)} />

      {/* Overlays */}
      {notification && <Notification {...notification} />}

      {reactiveWindow && (
        <ReactiveWindow
          data={reactiveWindow}
          myPowerCards={myPowerCards}
          onPlay={actions.reactivePlay}
        />
      )}

      {winChoiceData && winChoiceData.winnerId === playerId && (
        <WinChoiceModal data={winChoiceData} onChoose={actions.winChoice} />
      )}

      {rankPrompt && (
        <RankChooserModal
          drawnRanks={rankPrompt.drawnRanks}
          instanceId={rankPrompt.instanceId}
          onChoose={actions.rankChooserResponse}
        />
      )}

      {coinPrompt && (
        <CoinCallModal
          cardName={coinPrompt.cardName}
          instanceId={coinPrompt.instanceId}
          onChoose={actions.coinCallResponse}
        />
      )}

      {spinnerData && (
        <SpinnerModal result={spinnerData.result} onClose={onSpinnerClose} />
      )}

      {isGameOver && (
        <GameOverModal players={gameState.players} playerId={playerId} />
      )}
    </div>
  );
}
