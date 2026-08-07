const { createRoom, getRoom, joinRoom, rejoinRoom, removePlayer, roomPublicState } = require('./rooms');
const { startRound, submitGuess, submitPass, SNIPPET_DURATIONS } = require('./gameEngine');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('createRoom', ({ playerName, category }) => {
      const name = (playerName || 'Oyuncu').trim().slice(0, 20) || 'Oyuncu';
      const room = createRoom(socket.id, name, category || 'karisik');
      socket.join(room.code);
      socket.emit('roomUpdate', roomPublicState(room));
    });

    socket.on('joinRoom', ({ code, playerName }) => {
      const name = (playerName || 'Oyuncu').trim().slice(0, 20) || 'Oyuncu';
      const room = joinRoom(code, socket.id, name);
      if (!room) {
        socket.emit('errorMsg', { message: 'Oda bulunamadi.' });
        return;
      }
      if (room.state !== 'lobby') {
        room.players.delete(socket.id);
        socket.emit('errorMsg', { message: 'Oyun zaten basladi.' });
        return;
      }
      socket.join(room.code);
      io.to(room.code).emit('roomUpdate', roomPublicState(room));
    });

    socket.on('rejoinRoom', ({ code, playerName }) => {
      const name = (playerName || 'Oyuncu').trim().slice(0, 20) || 'Oyuncu';
      const room = rejoinRoom(code, socket.id, name);
      if (!room) {
        socket.emit('errorMsg', { message: 'Oda bulunamadi.' });
        return;
      }
      socket.join(room.code);
      io.to(room.code).emit('roomUpdate', roomPublicState(room));

      if (room.currentRound) {
        const round = room.currentRound;
        socket.emit('roundStarted', { roundNumber: room.roundNumber, totalRounds: room.totalRounds });
        socket.emit('attemptStarted', {
          attempt: round.attempt,
          totalAttempts: 6,
          snippetDuration: SNIPPET_DURATIONS[round.attempt - 1],
          previewUrl: round.track.preview,
          serverStartTime: Date.now()
        });
      }
    });

    socket.on('startGame', ({ code }) => {
      const room = getRoom(code);
      if (!room || room.hostId !== socket.id) return;
      if (room.players.size < 1) return;
      io.to(room.code).emit('gameStarted');
      startRound(io, room);
    });

    socket.on('submitGuess', ({ code, guessTitle }) => {
      const room = getRoom(code);
      if (!room) return;
      submitGuess(io, room, socket.id, guessTitle);
    });

    socket.on('pass', ({ code }) => {
      const room = getRoom(code);
      if (!room) return;
      submitPass(io, room, socket.id);
    });

    socket.on('disconnect', () => {
      const room = removePlayer(socket.id);
      if (room) {
        io.to(room.code).emit('roomUpdate', roomPublicState(room));
      }
    });
  });
}

module.exports = { registerSocketHandlers };
