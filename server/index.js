const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const { searchForGuess, CATEGORIES } = require('./deezer');
const { registerSocketHandlers } = require('./socketHandlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

app.get('/api/categories', (req, res) => {
  const list = Object.entries(CATEGORIES).map(([key, val]) => ({ key, label: val.label }));
  res.json(list);
});

app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').toString();
  if (!q.trim()) {
    res.json([]);
    return;
  }
  try {
    const results = await searchForGuess(q, 15);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Arama basarisiz oldu.' });
  }
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu calisiyor: http://localhost:${PORT}`);
});
