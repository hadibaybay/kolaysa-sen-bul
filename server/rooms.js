const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(hostSocketId, hostName, category = 'karisik') {
  const code = generateRoomCode();
  const room = {
    code,
    players: new Map([[hostSocketId, makePlayer(hostSocketId, hostName)]]),
    hostId: hostSocketId,
    state: 'lobby',
    category,
    currentRound: null,
    roundNumber: 0,
    totalRounds: 10,
    usedTrackIds: new Set()
  };
  rooms.set(code, room);
  return room;
}

function makePlayer(id, name) {
  return { id, name, score: 0, hasGuessedCorrectly: false, hasPassed: false };
}

function getRoom(code) {
  return rooms.get((code || '').toUpperCase());
}

function joinRoom(code, socketId, name) {
  const room = getRoom(code);
  if (!room) return null;
  room.players.set(socketId, makePlayer(socketId, name));
  return room;
}

function rejoinRoom(code, socketId, name) {
  const room = getRoom(code);
  if (!room) return null;

  const existingEntry = Array.from(room.players.entries())
    .find(([, p]) => p.name === name);

  if (existingEntry) {
    const [oldSocketId, player] = existingEntry;
    room.players.delete(oldSocketId);
    player.id = socketId;
    room.players.set(socketId, player);
    if (room.hostId === oldSocketId) room.hostId = socketId;
  } else {
    room.players.set(socketId, makePlayer(socketId, name));
  }
  return room;
}

function removePlayer(socketId) {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) {
      room.players.delete(socketId);
      if (room.players.size === 0) {
        rooms.delete(room.code);
      } else if (room.hostId === socketId) {
        room.hostId = room.players.keys().next().value;
      }
      return room;
    }
  }
  return null;
}

function roomPublicState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    state: room.state,
    category: room.category,
    roundNumber: room.roundNumber,
    totalRounds: room.totalRounds,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id, name: p.name, score: p.score
    }))
  };
}

module.exports = { rooms, createRoom, getRoom, joinRoom, rejoinRoom, removePlayer, roomPublicState };
