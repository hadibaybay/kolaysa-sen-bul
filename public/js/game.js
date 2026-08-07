const socket = io();

const roomCode = sessionStorage.getItem('roomCode');
const playerName = sessionStorage.getItem('playerName');

if (!roomCode) {
  window.location.href = 'index.html';
}

const categoryLabelEl = document.getElementById('categoryLabel');
const roundCounterEl = document.getElementById('roundCounter');
const progressTrackEl = document.getElementById('progressTrack');
const durationLabelEl = document.getElementById('durationLabel');
const attemptLabelEl = document.getElementById('attemptLabel');
const playBtn = document.getElementById('playBtn');
const waveLeftEl = document.getElementById('waveLeft');
const waveRightEl = document.getElementById('waveRight');
const audioPlayer = document.getElementById('audioPlayer');
const guessInput = document.getElementById('guessInput');
const suggestionsEl = document.getElementById('suggestions');
const guessBtn = document.getElementById('guessBtn');
const passBtn = document.getElementById('passBtn');
const passBonusEl = document.getElementById('passBonus');
const attemptHistoryEl = document.getElementById('attemptHistory');
const gamePanel = document.getElementById('gamePanel');
const roundResultEl = document.getElementById('roundResult');
const resultCoverEl = document.getElementById('resultCover');
const resultTrackEl = document.getElementById('resultTrack');
const resultListEl = document.getElementById('resultList');
const gameOverCardEl = document.getElementById('gameOverCard');
const finalScoresEl = document.getElementById('finalScores');

const TOTAL_ATTEMPTS = 6;
const SNIPPET_DURATIONS = [0.5, 1, 1.5, 2.5, 4, 7];
let currentAttempt = 0;
let snippetDuration = 0;
let stopTimer = null;
let hasActed = false;
let historyEntries = [];

buildWave(waveLeftEl, 12);
buildWave(waveRightEl, 12);
buildProgressTrack(TOTAL_ATTEMPTS);
buildHistoryPlaceholders(TOTAL_ATTEMPTS);

const autocomplete = setupAutocomplete(guessInput, suggestionsEl, () => {});

socket.emit('rejoinRoom', { code: roomCode, playerName });

playBtn.addEventListener('click', () => {
  if (!audioPlayer.src) return;
  audioPlayer.currentTime = 0;
  audioPlayer.play();
  playBtn.classList.add('playing');
  clearTimeout(stopTimer);
  stopTimer = setTimeout(() => {
    audioPlayer.pause();
    playBtn.classList.remove('playing');
  }, snippetDuration * 1000);
});

guessBtn.addEventListener('click', () => {
  const title = guessInput.value.trim();
  if (!title || hasActed) return;
  hasActed = true;
  setActionDisabled(true);
  socket.emit('submitGuess', { code: roomCode, guessTitle: title });
});

passBtn.addEventListener('click', () => {
  if (hasActed) return;
  hasActed = true;
  setActionDisabled(true);
  socket.emit('pass', { code: roomCode });
});

function setActionDisabled(disabled) {
  guessBtn.disabled = disabled;
  passBtn.disabled = disabled;
  guessInput.disabled = disabled;
}

socket.on('roundStarted', ({ roundNumber, totalRounds, categoryLabel }) => {
  roundCounterEl.textContent = `${roundNumber}/${totalRounds}`;
  if (categoryLabel) categoryLabelEl.textContent = categoryLabel;
  gamePanel.classList.remove('hidden');
  roundResultEl.classList.add('hidden');
  gameOverCardEl.classList.add('hidden');
  historyEntries = [];
  buildHistoryPlaceholders(TOTAL_ATTEMPTS);
  autocomplete.reset();
});

socket.on('attemptStarted', ({ attempt, totalAttempts, snippetDuration: dur, previewUrl }) => {
  currentAttempt = attempt;
  snippetDuration = dur;
  hasActed = false;
  setActionDisabled(false);
  audioPlayer.src = previewUrl;
  audioPlayer.pause();
  playBtn.classList.remove('playing');
  clearTimeout(stopTimer);

  durationLabelEl.textContent = `${dur}s açık`;
  attemptLabelEl.textContent = `${attempt}. tahmin / ${totalAttempts}`;
  updateProgressTrack(attempt, totalAttempts);

  const nextDur = SNIPPET_DURATIONS[attempt] || SNIPPET_DURATIONS[SNIPPET_DURATIONS.length - 1];
  const bonus = Math.max(0, nextDur - dur);
  passBonusEl.textContent = attempt < totalAttempts ? `+${bonus}s` : '';

  markHistoryCurrent(attempt);
});

socket.on('playerAnswered', ({ playerId, name, correct, passed }) => {
  if (playerId !== socket.id) return;
  if (passed) {
    setHistoryResult(currentAttempt, 'passed', 'Pas geçildi');
  } else {
    setHistoryResult(currentAttempt, correct ? 'correct' : 'wrong', guessInput.value.trim() || '—');
  }
});

socket.on('roundEnded', ({ track, results }) => {
  gamePanel.classList.add('hidden');
  roundResultEl.classList.remove('hidden');
  resultCoverEl.src = track.cover;
  resultTrackEl.textContent = `${track.title} — ${track.artist}`;
  resultListEl.innerHTML = '';
  results
    .slice()
    .sort((a, b) => b.totalScore - a.totalScore)
    .forEach(r => {
      const li = document.createElement('li');
      const attemptText = r.correct ? `${r.attempt}. hakta bildi` : 'bilemedi';
      li.textContent = `${r.name}: ${attemptText} — Toplam: ${r.totalScore}`;
      resultListEl.appendChild(li);
    });
});

socket.on('gameOver', ({ finalScores }) => {
  roundResultEl.classList.add('hidden');
  gameOverCardEl.classList.remove('hidden');
  finalScoresEl.innerHTML = '';
  finalScores.forEach((p, idx) => {
    const li = document.createElement('li');
    li.textContent = `${idx + 1}. ${p.name} — ${p.score} puan`;
    finalScoresEl.appendChild(li);
  });
  sessionStorage.removeItem('roomCode');
});

socket.on('errorMsg', ({ message }) => {
  alert(message);
});

function buildWave(container, barCount) {
  container.innerHTML = '';
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('span');
    const h = 4 + Math.round(Math.random() * 16);
    bar.style.height = h + 'px';
    container.appendChild(bar);
  }
}

function buildProgressTrack(totalAttempts) {
  progressTrackEl.innerHTML = '';
  for (let i = 0; i < totalAttempts; i++) {
    const seg = document.createElement('div');
    seg.className = 'seg';
    const fill = document.createElement('div');
    fill.className = 'fill';
    seg.appendChild(fill);
    progressTrackEl.appendChild(seg);
  }
}

function updateProgressTrack(attempt, totalAttempts) {
  const segs = progressTrackEl.querySelectorAll('.seg .fill');
  segs.forEach((fill, idx) => {
    fill.style.width = (idx < attempt) ? '100%' : '0%';
  });
}

function buildHistoryPlaceholders(totalAttempts) {
  attemptHistoryEl.innerHTML = '';
  for (let i = 1; i <= totalAttempts; i++) {
    const li = document.createElement('li');
    li.dataset.attempt = i;
    li.innerHTML = `<span class="mark"></span><span class="label">${i}</span>`;
    attemptHistoryEl.appendChild(li);
  }
}

function markHistoryCurrent(attempt) {
  attemptHistoryEl.querySelectorAll('li').forEach(li => {
    li.classList.toggle('current', Number(li.dataset.attempt) === attempt);
  });
}

function setHistoryResult(attempt, kind, text) {
  const li = attemptHistoryEl.querySelector(`li[data-attempt="${attempt}"]`);
  if (!li) return;
  li.classList.remove('current');
  li.classList.add(kind);
  const markSymbol = kind === 'correct' ? '✓' : kind === 'wrong' ? '✕' : '»';
  li.innerHTML = `<span class="mark">${markSymbol}</span><span class="label">${text}</span>`;
}
