import React, { useState, useEffect, useCallback, useRef } from 'react';
import socket from './socket';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import { AudioEngine } from './audio/AudioEngine';

const audioEngine = new AudioEngine();

export default function App() {
  const [screen, setScreen] = useState('home'); // 'home' | 'lobby' | 'game'
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [lobbyState, setLobbyState] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [gameLog, setGameLog] = useState([]);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [winChoiceData, setWinChoiceData] = useState(null);
  const [rankPrompt, setRankPrompt] = useState(null);     // { drawnRanks, instanceId }
  const [coinPrompt, setCoinPrompt] = useState(null);     // { cardName, instanceId }
  const [reactiveWindow, setReactiveWindow] = useState(null);
  const [reactiveQueue, setReactiveQueue] = useState([]); // queued spells waiting for veto
  const [skipVotes, setSkipVotes] = useState(null); // { count, total, votes }
  const [spinnerData, setSpinnerData] = useState(null);
  const [needSell, setNeedSell] = useState(false);
  const [spellBurst, setSpellBurst] = useState(false);
  const [cardEvents, setCardEvents] = useState([]); // for PowerCardToast

  const notify = useCallback((msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  useEffect(() => {
    socket.connect();

    socket.on('lobby:state', (state) => { setLobbyState(state); });
    socket.on('lobby:created', ({ roomCode: rc, playerId: pid }) => {
      setRoomCode(rc);
      setPlayerId(pid);
      setScreen('lobby');
    });
    socket.on('lobby:joined', ({ roomCode: rc, playerId: pid }) => {
      setRoomCode(rc);
      setPlayerId(pid);
      setScreen('lobby');
    });
    socket.on('lobby:error', ({ message }) => setError(message));

    socket.on('game:stateUpdate', (state) => {
      setGameState(state);
      if (state.phase !== 'lobby' && screen !== 'game') setScreen('game');
    });
    socket.on('game:phaseChange', ({ phase }) => {
      audioEngine.onPhaseChange(phase);
    });
    socket.on('game:cardsDealt', ({ yourCards }) => {
      audioEngine.play('deal');
    });
    socket.on('game:communityCards', () => {
      audioEngine.play('deal');
    });
    socket.on('game:playerActed', ({ action }) => {
      if (action === 'fold') audioEngine.play('fold');
      else audioEngine.play('chip');
    });
    socket.on('game:powerCardPlayed', ({ playerId: pid, playerName, card, result: resultMsg, spinResult }) => {
      audioEngine.play('spell');
      setSpellBurst(true);
      if (spinResult) {
        setSpinnerData({ result: Array.isArray(spinResult) ? spinResult[0] : spinResult });
      }
      // Queue for the big center announcement + small toast
      const ev = {
        id: Date.now() + Math.random(),
        playerName: playerName || 'Unknown',
        card: {
          ...card,
          // ensure definitionId is present for art lookup
          definitionId: card?.definitionId || card?.name?.toLowerCase().replace(/[^a-z]/g, '_'),
        },
        result: resultMsg,
      };
      setCardEvents(prev => [...prev.slice(-8), ev]);
    });
    socket.on('game:log', (entries) => {
      setGameLog(prev => [...prev.slice(-80), ...entries]);
    });
    socket.on('game:winChoice', (data) => {
      setWinChoiceData(data);
    });
    socket.on('game:reactiveWindow', (data) => {
      setReactiveWindow(data);
    });
    socket.on('game:reactiveWindowClosed', () => {
      setReactiveWindow(null);
      setReactiveQueue([]);
    });
    socket.on('game:reactiveQueued', (data) => {
      setReactiveQueue(prev => [...prev, data]);
    });
    socket.on('game:skipVotes', (data) => {
      setSkipVotes(data);
    });
    socket.on('game:phaseChange', () => {
      setSkipVotes(null); // clear on phase change
    });
    socket.on('game:rankBagPrompt', ({ drawnRanks, instanceId: iid }) => {
      setRankPrompt({ drawnRanks, instanceId: iid });
    });
    socket.on('game:coinCallPrompt', ({ cardName, instanceId: iid }) => {
      setCoinPrompt({ cardName, instanceId: iid });
    });
    socket.on('game:promptSell', () => {
      setNeedSell(true);
      notify('You have too many power cards! Sell one.', 'warning');
    });
    socket.on('game:powerCardDrawn', ({ card }) => {
      notify(`You drew: ${card.icon} ${card.name}`, 'info');
    });
    socket.on('game:orbitComplete', ({ orbitCount }) => {
      notify(`🌀 Orbit ${orbitCount} complete! Everyone draws a power card!`, 'orbit');
    });
    socket.on('game:over', ({ standings }) => {
      audioEngine.stop();
      setScreen('game'); // GameScreen shows the game-over modal
    });
    socket.on('game:error', ({ message }) => {
      notify(message, 'error');
    });
    socket.on('game:privateData', ({ peek }) => {
      if (peek) {
        notify(`🔮 Prophecy: ${peek.map(c => `${c.rank}${c.suit}`).join(' ')}`, 'prophecy');
      }
    });

    return () => socket.removeAllListeners();
  }, []);

  const actions = {
    createRoom: (name) => socket.emit('lobby:create', { playerName: name }),
    joinRoom: (code, name) => socket.emit('lobby:join', { roomCode: code, playerName: name }),
    addBot: () => socket.emit('lobby:addBot'),
    removeBot: (botId) => socket.emit('lobby:removeBot', { botId }),
    startGame: () => socket.emit('lobby:startGame'),

    gameAction: (action, amount) => socket.emit('game:action', { action, amount }),
    playPowerCard: (opts) => socket.emit('game:playPowerCard', opts),
    sellPowerCard: (instanceId) => {
      socket.emit('game:sellPowerCard', { instanceId });
      setNeedSell(false);
    },
    winChoice: (choice, stealId) => {
      socket.emit('game:winChoice', { choice, stealTargetCardInstanceId: stealId });
      setWinChoiceData(null);
    },
    reactivePlay: (instanceId) => {
      socket.emit('game:reactivePlay', { instanceId });
      setReactiveWindow(null);
    },
    rankChooserResponse: (instanceId, chosenRank, drawnRanks) => {
      socket.emit('game:rankChooserResponse', { instanceId, chosenRank, drawnRanks });
      setRankPrompt(null);
    },
    coinCallResponse: (instanceId, coinCall) => {
      socket.emit('game:coinCallResponse', { instanceId, coinCall });
      setCoinPrompt(null);
    },
  };

  if (screen === 'home') {
    return <HomeScreen error={error} onClearError={() => setError('')} actions={actions} audioEngine={audioEngine} />;
  }
  if (screen === 'lobby') {
    return (
      <LobbyScreen
        lobbyState={lobbyState}
        playerId={playerId}
        roomCode={roomCode}
        actions={actions}
      />
    );
  }
  return (
    <GameScreen
      gameState={gameState}
      playerId={playerId}
      gameLog={gameLog}
      notification={notification}
      winChoiceData={winChoiceData}
      rankPrompt={rankPrompt}
      coinPrompt={coinPrompt}
      reactiveWindow={reactiveWindow}
      reactiveQueue={reactiveQueue}
      skipVotes={skipVotes}
      onSkipPhase={() => socket.emit('game:skipPhase')}
      spinnerData={spinnerData}
      spellBurst={spellBurst}
      onSpellBurstDone={() => setSpellBurst(false)}
      cardEvents={cardEvents}
      needSell={needSell}
      onSpinnerClose={() => setSpinnerData(null)}
      actions={actions}
      audioEngine={audioEngine}
    />
  );
}
