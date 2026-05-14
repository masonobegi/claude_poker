import React from 'react';
import './LobbyScreen.css';

export default function LobbyScreen({ lobbyState, playerId, roomCode, actions }) {
  if (!lobbyState) return <div className="lobby-loading">Connecting...</div>;

  const isHost = lobbyState.hostId === playerId;
  const canStart = lobbyState.players.length >= 2;
  const canAddBot = lobbyState.players.length < 8;

  return (
    <div className="lobby-screen">
      <div className="home-bg" />
      <div className="lobby-content">
        <div className="lobby-header">
          <div className="home-wizard-icon" style={{ fontSize: '2.5rem' }}>🧙‍♂️</div>
          <h2 className="lobby-title">Poker for Wizards</h2>
          <div className="lobby-code-block">
            <span className="lobby-code-label">Room Code</span>
            <span className="lobby-code">{roomCode}</span>
            <button
              className="lobby-copy-btn"
              onClick={() => navigator.clipboard.writeText(roomCode)}
              title="Copy code"
            >
              📋
            </button>
          </div>
        </div>

        <div className="lobby-players">
          <h3 className="lobby-section-title">
            Players ({lobbyState.players.length}/8)
          </h3>
          <div className="lobby-player-list">
            {lobbyState.players.map(p => (
              <div key={p.id} className={`lobby-player ${p.id === playerId ? 'me' : ''}`}>
                <span className="lobby-player-icon">{p.isBot ? '🤖' : '🧙'}</span>
                <span className="lobby-player-name">
                  {p.name}
                  {p.id === playerId && <span className="lobby-player-you"> (you)</span>}
                  {p.id === lobbyState.hostId && <span className="lobby-player-host"> 👑</span>}
                </span>
                {isHost && p.isBot && (
                  <button
                    className="lobby-remove-bot"
                    onClick={() => actions.removeBot(p.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lobby-actions">
          {isHost && canAddBot && (
            <button className="lobby-btn lobby-btn-secondary" onClick={actions.addBot}>
              🤖 Add Bot
            </button>
          )}
          {isHost ? (
            <button
              className="lobby-btn lobby-btn-primary"
              onClick={actions.startGame}
              disabled={!canStart}
            >
              {canStart ? '✨ Start Game' : 'Need 2+ players'}
            </button>
          ) : (
            <div className="lobby-waiting">
              <div className="lobby-waiting-dot" />
              Waiting for host to start...
            </div>
          )}
        </div>

        <div className="lobby-info">
          <div className="lobby-info-item">
            <span>💰</span> 50,000 starting chips
          </div>
          <div className="lobby-info-item">
            <span>🃏</span> Power cards included
          </div>
          <div className="lobby-info-item">
            <span>🎰</span> 1,000 big blind
          </div>
        </div>
      </div>
    </div>
  );
}
