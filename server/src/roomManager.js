'use strict';

const { GameRoom } = require('./game/GameRoom');

const rooms = new Map(); // roomCode → GameRoom

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O to avoid confusion
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(io) {
  const code = generateCode();
  const room = new GameRoom(code, io);
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code.toUpperCase()) || null;
}

function deleteRoom(code) {
  rooms.delete(code.toUpperCase());
}

function pruneEmpty() {
  for (const [code, room] of rooms.entries()) {
    const humans = room.players.filter(p => !p.isBot);
    if (humans.length === 0) {
      rooms.delete(code);
    }
  }
}

// Prune empty rooms every 2 minutes
setInterval(pruneEmpty, 120_000);

module.exports = { createRoom, getRoom, deleteRoom };
