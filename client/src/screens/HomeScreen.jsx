import React, { useState } from 'react';
import './HomeScreen.css';

export default function HomeScreen({ error, onClearError, actions, audioEngine }) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [tab, setTab] = useState('create'); // 'create' | 'join'

  const handleCreate = () => {
    if (!name.trim()) return;
    audioEngine.start();
    actions.createRoom(name.trim());
  };

  const handleJoin = () => {
    if (!name.trim() || joinCode.length !== 4) return;
    audioEngine.start();
    actions.joinRoom(joinCode.toUpperCase(), name.trim());
  };

  return (
    <div className="home-screen">
      <div className="home-bg" />
      <div className="home-content">
        <div className="home-title-block">
          <div className="home-wizard-icon">🧙‍♂️</div>
          <h1 className="home-title">Poker for Wizards</h1>
          <p className="home-subtitle">Texas Hold'em with a magical twist</p>
        </div>

        <div className="home-card">
          <div className="home-tabs">
            <button
              className={`home-tab ${tab === 'create' ? 'active' : ''}`}
              onClick={() => setTab('create')}
            >
              ✨ Create Room
            </button>
            <button
              className={`home-tab ${tab === 'join' ? 'active' : ''}`}
              onClick={() => setTab('join')}
            >
              🚪 Join Room
            </button>
          </div>

          <div className="home-form">
            <label className="home-label">Your Wizard Name</label>
            <input
              className="home-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name..."
              maxLength={20}
              onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
            />

            {tab === 'join' && (
              <>
                <label className="home-label">Room Code</label>
                <input
                  className="home-input home-input-code"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="WXYZ"
                  maxLength={4}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
              </>
            )}

            {error && (
              <div className="home-error" onClick={onClearError}>
                ⚠️ {error}
              </div>
            )}

            <button
              className="home-btn"
              onClick={tab === 'create' ? handleCreate : handleJoin}
              disabled={!name.trim() || (tab === 'join' && joinCode.length !== 4)}
            >
              {tab === 'create' ? '✨ Create Game' : '🚪 Join Game'}
            </button>
          </div>
        </div>

        <div className="home-rules-hint">
          <p>3–8 players • Power cards • Wizard magic</p>
        </div>
      </div>
    </div>
  );
}
