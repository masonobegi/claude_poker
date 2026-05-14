'use strict';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createRoom, getRoom } = require('./roomManager');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Health check
app.get('/health', (_, res) => res.json({ ok: true }));

// ── Socket.io ──────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  // ── Lobby ────────────────────────────────────────────────────────────────

  socket.on('lobby:create', ({ playerName }) => {
    const room = createRoom(io);
    socket.join(room.roomCode);
    const result = room.addHumanPlayer(socket.id, playerName || 'Wizard');
    if (result.error) {
      socket.emit('lobby:error', { message: result.error });
      return;
    }
    socket.data.roomCode = room.roomCode;
    socket.emit('lobby:created', { roomCode: room.roomCode, playerId: socket.id });
    socket.emit('lobby:state', room._lobbyState());
  });

  socket.on('lobby:join', ({ roomCode, playerName }) => {
    const room = getRoom(roomCode);
    if (!room) { socket.emit('lobby:error', { message: 'Room not found' }); return; }
    socket.join(room.roomCode);
    const result = room.addHumanPlayer(socket.id, playerName || 'Wizard');
    if (result.error) { socket.emit('lobby:error', { message: result.error }); return; }
    socket.data.roomCode = room.roomCode;
    socket.emit('lobby:joined', { roomCode: room.roomCode, playerId: socket.id });
    socket.emit('lobby:state', room._lobbyState());
  });

  socket.on('lobby:addBot', () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const result = room.addBot();
    if (result.error) socket.emit('lobby:error', { message: result.error });
  });

  socket.on('lobby:removeBot', ({ botId }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== botId);
    room.broadcast('lobby:state', room._lobbyState());
  });

  socket.on('lobby:startGame', () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const result = room.startGame(socket.id);
    if (result.error) socket.emit('lobby:error', { message: result.error });
  });

  // ── Game Actions ──────────────────────────────────────────────────────────

  socket.on('game:action', ({ action, amount }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const result = room.playerAction(socket.id, action, amount);
    if (result?.error) socket.emit('game:error', { message: result.error });
  });

  socket.on('game:playPowerCard', ({ instanceId, targetPlayerId, targetCardId, chosenRank, drawnRanks, direction, suit, coinCall }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const opts = { targetPlayerId, targetCardId, chosenRank, drawnRanks, direction, suit, coinCall };
    const result = room.playPowerCard(socket.id, instanceId, opts);
    if (result?.error) socket.emit('game:error', { message: result.error });
  });

  socket.on('game:sellPowerCard', ({ instanceId }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const result = room.sellPowerCard(socket.id, instanceId);
    if (result?.error) socket.emit('game:error', { message: result.error });
  });

  socket.on('game:winChoice', ({ choice, stealTargetCardInstanceId }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const result = room.resolveWinChoice(socket.id, choice, stealTargetCardInstanceId);
    if (result?.error) socket.emit('game:error', { message: result.error });
  });

  // ── Reactive window (Veto / Copy Machine) ─────────────────────────────────
  socket.on('game:reactivePlay', ({ instanceId }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    if (!room.reactiveWindow || room.reactiveWindow.resolved) {
      socket.emit('game:error', { message: 'Reactive window closed' });
      return;
    }
    const result = room.playPowerCard(socket.id, instanceId, {});
    if (result?.error) socket.emit('game:error', { message: result.error });
    else room._closeReactiveWindow();
  });

  socket.on('game:skipReactive', () => {
    // No-op on server — window will auto-close
  });

  // ── Rank bag response ─────────────────────────────────────────────────────
  socket.on('game:rankChooserResponse', ({ instanceId, chosenRank, drawnRanks }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    room.playPowerCard(socket.id, instanceId, { chosenRank, drawnRanks });
  });

  // ── Coin call response ────────────────────────────────────────────────────
  socket.on('game:coinCallResponse', ({ instanceId, coinCall }) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const pending = room.pendingPowerCard;
    if (pending && pending.instanceId === instanceId) {
      room.playPowerCard(socket.id, instanceId, { ...pending.opts, coinCall });
    }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    const room = getRoom(socket.data.roomCode);
    if (room && room.phase === 'lobby') {
      room.removePlayer(socket.id);
    }
    // In-game disconnects: player keeps seat but cannot act
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Poker for Wizards server running on port ${PORT}`));
