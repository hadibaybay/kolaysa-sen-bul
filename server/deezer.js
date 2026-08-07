const DEEZER_API = 'https://api.deezer.com';

const CATEGORIES = {
  karisik: {
    label: 'Karışık',
    queries: [
      'tarkan', 'sezen aksu', 'duman', 'ezhel', 'ed sheeran', 'taylor swift',
      'queen', 'drake', 'coldplay', 'the weeknd'
    ]
  },
  tr_pop: {
    label: 'Türkçe Pop',
    queries: [
      'tarkan', 'sezen aksu', 'mabel matiz', 'aleyna tilki', 'hadise',
      'gulsen', 'sila', 'kenan dogulu', 'murat boz', 'simge'
    ]
  },
  tr_rap: {
    label: 'Türkçe Rap',
    queries: [
      'ezhel', 'ceza', 'khontkar', 'norm ender', 'ados', 'sagopa kajmer',
      'ben fero', 'uzi', 'motive'
    ]
  },
  tr_rock: {
    label: 'Türkçe Rock',
    queries: [
      'duman', 'mor ve otesi', 'model', 'athena', 'kargo', 'mfo',
      'teoman', 'bulutsuzluk ozlemi'
    ]
  },
  arabesk: {
    label: 'Arabesk',
    queries: [
      'orhan gencebay', 'muslum gurses', 'ibrahim tatlises', 'ferdi tayfur',
      'hakki bulut', 'yildiz tilbe'
    ]
  },
  yabanci_pop: {
    label: 'Yabancı Pop',
    queries: [
      'ed sheeran', 'taylor swift', 'dua lipa', 'the weeknd', 'ariana grande',
      'justin bieber', 'billie eilish', 'bruno mars'
    ]
  },
  yabanci_rap: {
    label: 'Yabancı Rap',
    queries: [
      'drake', 'eminem', 'kendrick lamar', 'travis scott', 'kanye west',
      '50 cent', 'j cole'
    ]
  },
  yabanci_rock: {
    label: 'Yabancı Rock',
    queries: [
      'queen', 'nirvana', 'coldplay', 'imagine dragons', 'linkin park',
      'guns n roses', 'metallica', 'red hot chili peppers'
    ]
  }
};

function simplifyTrack(t) {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist?.name || 'Bilinmiyor',
    cover: t.album?.cover_medium || t.album?.cover || '',
    preview: t.preview || ''
  };
}

async function searchTracks(query, limit = 15) {
  const url = `${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deezer arama hatasi: ${res.status}`);
  const data = await res.json();
  return (data.data || [])
    .filter(t => t.preview)
    .map(simplifyTrack);
}

async function searchForGuess(query, limit = 15) {
  const results = await searchTracks(query, 25).catch(() => []);
  const normalizedQuery = normalizeForMatch(query);
  const relevant = results.filter(t =>
    normalizeForMatch(t.title).includes(normalizedQuery) ||
    normalizeForMatch(t.artist).includes(normalizedQuery)
  );
  return (relevant.length > 0 ? relevant : results).slice(0, limit);
}

function getCategoryQueries(categoryKey) {
  return (CATEGORIES[categoryKey] || CATEGORIES.karisik).queries;
}

function normalizeForMatch(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

async function pickRandomTrack(excludeIds = new Set(), categoryKey = 'karisik') {
  const queries = getCategoryQueries(categoryKey);
  const query = queries[Math.floor(Math.random() * queries.length)];
  const tracks = await searchTracks(query, 25);

  const normalizedQuery = normalizeForMatch(query);
  const matching = tracks.filter(t => normalizeForMatch(t.artist).includes(normalizedQuery));
  const pool = matching.length > 0 ? matching : tracks;

  const usable = pool.filter(t => t.preview && !excludeIds.has(t.id));
  if (usable.length === 0) {
    return pickRandomTrack(excludeIds, categoryKey);
  }
  return usable[Math.floor(Math.random() * usable.length)];
}

module.exports = { searchTracks, searchForGuess, pickRandomTrack, CATEGORIES };
