const { pickRandomTrack, CATEGORIES } = require('./deezer');
const { pointsForAttempt } = require('./scoring');

const SNIPPET_DURATIONS = [0.5, 1, 1.5, 2.5, 4, 7];

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ığüşöç\s]/gi, '')
    .trim();
}

function isCorrectGuess(guessTitle, track) {
  const g = normalize(guessTitle);
  const t = normalize(track.title);
  if (!g) return false;
  return g === t || t.includes(g) || g.includes(t);
}

async function startRound(io, room) {
  room.roundNumber += 1;
  room.state = 'playing';

  let track;
  try {
    track = await pickRandomTrack(room.usedTrackIds, room.category);
  } catch (err) {
    io.to(room.code).emit('errorMsg', { message: 'Sarki bulunamadi, tekrar deneniyor.' });
    return;
  }
  room.usedTrackIds.add(track.id);

  room.currentRound = {
    track,
    attempt: 0,
    guesses: new Map(),
    status: 'waiting',
    timer: null
  };

  for (const p of room.players.values()) {
    p.hasGuessedCorrectly = false;
    p.hasPassed = false;
  }

  io.to(room.code).emit('roundStarted', {
    roundNumber: room.roundNumber,
    totalRounds: room.totalRounds,
    categoryLabel: (CATEGORIES[room.category] || CATEGORIES.karisik).label
  });

  startNextAttempt(io, room);
}

function startNextAttempt(io, room) {
  const round = room.currentRound;
  if (!round) return;

  round.attempt += 1;
  round.status = 'waiting';
  for (const p of room.players.values()) p.hasPassed = false;

  const snippetDuration = SNIPPET_DURATIONS[round.attempt - 1];

  io.to(room.code).emit('attemptStarted', {
    attempt: round.attempt,
    totalAttempts: SNIPPET_DURATIONS.length,
    snippetDuration,
    previewUrl: round.track.preview,
    serverStartTime: Date.now()
  });
}

function allPlayersDone(room) {
  const round = room.currentRound;
  for (const p of room.players.values()) {
    if (!p.hasGuessedCorrectly && !p.hasPassed && !round.guesses.has(p.id)) {
      return false;
    }
  }
  return true;
}

function submitGuess(io, room, socketId, guessTitle) {
  const round = room.currentRound;
  const player = room.players.get(socketId);
  if (!round || !player || round.status !== 'waiting') return;
  if (player.hasGuessedCorrectly || player.hasPassed) return;

  const correct = isCorrectGuess(guessTitle, round.track);
  round.guesses.set(socketId, { attempt: round.attempt, correct });

  if (correct) {
    player.hasGuessedCorrectly = true;
    const pts = pointsForAttempt(round.attempt);
    player.score += pts;
  }

  io.to(room.code).emit('playerAnswered', { playerId: socketId, name: player.name, correct });

  const everyoneCorrectOrDone = Array.from(room.players.values())
    .every(p => p.hasGuessedCorrectly || p.hasPassed || round.guesses.has(p.id));

  if (correct && Array.from(room.players.values()).every(p => p.hasGuessedCorrectly)) {
    clearTimeout(round.timer);
    endRound(io, room, null);
    return;
  }

  if (everyoneCorrectOrDone) {
    clearTimeout(round.timer);
    if (round.attempt >= SNIPPET_DURATIONS.length) {
      endRound(io, room, null);
    } else {
      startNextAttempt(io, room);
    }
  }
}

function submitPass(io, room, socketId) {
  const round = room.currentRound;
  const player = room.players.get(socketId);
  if (!round || !player || round.status !== 'waiting') return;
  if (player.hasGuessedCorrectly || player.hasPassed) return;

  player.hasPassed = true;
  io.to(room.code).emit('playerAnswered', { playerId: socketId, name: player.name, passed: true });

  if (allPlayersDone(room)) {
    clearTimeout(round.timer);
    if (round.attempt >= SNIPPET_DURATIONS.length) {
      endRound(io, room, null);
    } else {
      startNextAttempt(io, room);
    }
  }
}

function endRound(io, room, _unused) {
  const round = room.currentRound;
  if (!round) return;
  round.status = 'revealed';
  clearTimeout(round.timer);

  const results = Array.from(room.players.entries()).map(([id, p]) => {
    const g = round.guesses.get(id);
    return {
      playerId: id,
      name: p.name,
      correct: !!g?.correct,
      attempt: g?.attempt || null,
      totalScore: p.score
    };
  });

  io.to(room.code).emit('roundEnded', {
    track: { title: round.track.title, artist: round.track.artist, cover: round.track.cover },
    results
  });

  room.currentRound = null;
  room.state = 'roundResult';

  if (room.roundNumber >= room.totalRounds) {
    setTimeout(() => {
      room.state = 'gameOver';
      const finalScores = Array.from(room.players.values())
        .map(p => ({ id: p.id, name: p.name, score: p.score }))
        .sort((a, b) => b.score - a.score);
      io.to(room.code).emit('gameOver', { finalScores });
    }, 4000);
  } else {
    setTimeout(() => startRound(io, room), 4000);
  }
}

module.exports = { startRound, submitGuess, submitPass, SNIPPET_DURATIONS };
