function setupAutocomplete(inputEl, listEl, onSelect) {
  let debounceTimer = null;
  let selectedTrack = null;

  inputEl.addEventListener('input', () => {
    selectedTrack = null;
    clearTimeout(debounceTimer);
    const q = inputEl.value.trim();
    if (!q) { hideList(); return; }
    debounceTimer = setTimeout(() => fetchSuggestions(q), 300);
  });

  document.addEventListener('click', (e) => {
    if (!listEl.contains(e.target) && e.target !== inputEl) hideList();
  });

  async function fetchSuggestions(q) {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const tracks = await res.json();
      renderList(tracks);
    } catch (err) {
      hideList();
    }
  }

  function renderList(tracks) {
    listEl.innerHTML = '';
    if (!tracks.length) { hideList(); return; }
    tracks.forEach(t => {
      const li = document.createElement('li');
      li.innerHTML = `<img src="${t.cover}" alt=""><span>${t.title} — ${t.artist}</span>`;
      li.addEventListener('click', () => {
        inputEl.value = t.title;
        selectedTrack = t;
        hideList();
        if (onSelect) onSelect(t);
      });
      listEl.appendChild(li);
    });
    listEl.classList.remove('hidden');
  }

  function hideList() {
    listEl.classList.add('hidden');
    listEl.innerHTML = '';
  }

  return {
    getSelected: () => selectedTrack,
    reset: () => { selectedTrack = null; inputEl.value = ''; hideList(); }
  };
}
