const socket = io();

const setupCard = document.getElementById('setupCard');
const roomCard = document.getElementById('roomCard');
const playerNameInput = document.getElementById('playerName');
const categoryGridEl = document.getElementById('categoryGrid');
const roomCodeInput = document.getElementById('roomCode');
const errorMsgEl = document.getElementById('errorMsg');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const categoryDisplayEl = document.getElementById('categoryDisplay');
const playerListEl = document.getElementById('playerList');
const startBtn = document.getElementById('startBtn');
const waitHint = document.getElementById('waitHint');

let myId = null;
let currentRoomCode = null;
let isHost = false;
let autoStartSolo = false;
let selectedCategory = 'karisik';
let categoryLabels = {};

loadCategories();

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const categories = await res.json();
    categoryLabels = Object.fromEntries(categories.map(c => [c.key, c.label]));
    renderCategoryGrid(categories);
  } catch (err) {
    categoryGridEl.innerHTML = '<p class="hint">Kategoriler yüklenemedi.</p>';
  }
}

function renderCategoryGrid(categories) {
  categoryGridEl.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-chip' + (cat.key === selectedCategory ? ' selected' : '');
    btn.textContent = cat.label;
    btn.addEventListener('click', () => {
      selectedCategory = cat.key;
      categoryGridEl.querySelectorAll('.category-chip').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    categoryGridEl.appendChild(btn);
  });
}

socket.on('connect', () => { myId = socket.id; });

document.getElementById('createBtn').addEventListener('click', () => {
  clearError();
  autoStartSolo = false;
  socket.emit('createRoom', { playerName: playerNameInput.value, category: selectedCategory });
});

document.getElementById('soloBtn').addEventListener('click', () => {
  clearError();
  autoStartSolo = true;
  socket.emit('createRoom', { playerName: playerNameInput.value || 'Oyuncu', category: selectedCategory });
});

document.getElementById('joinBtn').addEventListener('click', () => {
  clearError();
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) { showError('Oda kodu gir.'); return; }
  currentRoomCode = code;
  socket.emit('joinRoom', { code, playerName: playerNameInput.value });
});

startBtn.addEventListener('click', () => {
  socket.emit('startGame', { code: currentRoomCode });
});

socket.on('roomUpdate', (room) => {
  currentRoomCode = room.code;
  isHost = room.hostId === myId;

  if (autoStartSolo) {
    autoStartSolo = false;
    socket.emit('startGame', { code: currentRoomCode });
    return;
  }

  setupCard.classList.add('hidden');
  roomCard.classList.remove('hidden');
  roomCodeDisplay.textContent = room.code;
  categoryDisplayEl.textContent = 'Kategori: ' + (categoryLabels[room.category] || room.category);
  playerListEl.innerHTML = '';
  room.players.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p.name + (p.id === room.hostId ? ' (host)' : '');
    playerListEl.appendChild(li);
  });
  startBtn.classList.toggle('hidden', !isHost);
  waitHint.classList.toggle('hidden', isHost);
});

socket.on('gameStarted', () => {
  sessionStorage.setItem('roomCode', currentRoomCode);
  sessionStorage.setItem('playerName', playerNameInput.value);
  window.location.href = 'game.html';
});

socket.on('errorMsg', ({ message }) => showError(message));

function showError(msg) { errorMsgEl.textContent = msg; }
function clearError() { errorMsgEl.textContent = ''; }
