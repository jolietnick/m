const API_KEY = 'AIzaSyAQ1FRRMfdQibqZGlzlz4-80W9SvgU3m2U';
const CHANNEL_ID = 'UCb2xW4Ns3OlQYUzemQHRWCg';
const SIMPMUSIC_PACKAGE = 'com.maxrave.simpmusic';

// ── STATE ──
let allPlaylists = [];   // solo Marz, con group
let trackIndex = [];     // { title, artist, thumb, playlist }

// ── GROUPS ──
const GROUPS = [
  { key: 'marz3', label: 'Marz III', match: t => /marz\s*iii/i.test(t) },
  { key: 'marz2', label: 'Marz II',  match: t => /marz\s*ii/i.test(t) },
  { key: 'marz1', label: 'Marz',     match: t => /marz/i.test(t) && !/marz\s*ii/i.test(t) && !/marz\s*iii/i.test(t) },
];

function groupOf(title) {
  for (const g of GROUPS) if (g.match(title)) return g.key;
  return null;
}

function buildYouTubeMusicPlaylistUrl(playlistId) {
  const url = new URL('https://music.youtube.com/playlist');
  url.searchParams.set('list', playlistId);
  return url.toString();
}

function buildSimpMusicIntentUrl(playlistId) {
  const webUrl = buildYouTubeMusicPlaylistUrl(playlistId);
  return `intent://music.youtube.com/playlist?list=${encodeURIComponent(playlistId)}#Intent;scheme=https;package=${SIMPMUSIC_PACKAGE};S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
}

// ── VIEWS ──
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ── YOUTUBE API ──
async function ytFetch(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.searchParams.set('key', API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchAllPages(endpoint, params) {
  let items = [], pageToken = null;
  do {
    const p = { ...params, maxResults: 50 };
    if (pageToken) p.pageToken = pageToken;
    const data = await ytFetch(endpoint, p);
    items = items.concat(data.items || []);
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return items;
}

// ── LOAD PLAYLISTS ──
async function loadPlaylists() {
  const items = await fetchAllPages('playlists', {
    part: 'snippet,contentDetails',
    channelId: CHANNEL_ID,
  });

  allPlaylists = items
    .map(it => ({
      id: it.id,
      title: it.snippet.title,
      thumb: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url || '',
      tracks: it.contentDetails?.itemCount ?? null,
      group: groupOf(it.snippet.title),
    }))
    .filter(pl => pl.group !== null)
    .sort((a, b) => a.title.localeCompare(b.title, 'it', { numeric: true }));

  renderGroups(allPlaylists);
  indexAllTracks();
}

// ── INDEX ALL TRACKS (background) ──
async function indexAllTracks() {
  const progress = document.getElementById('index-progress');
  const bar = document.getElementById('index-bar');
  const status = document.getElementById('index-status');

  progress.classList.add('visible');
  const total = allPlaylists.length;

  for (let i = 0; i < total; i++) {
    const pl = allPlaylists[i];
    status.textContent = `Indicizzazione ${i + 1}/${total}: ${pl.title}`;
    bar.style.width = `${Math.round((i / total) * 100)}%`;

    try {
      const items = await fetchAllPages('playlistItems', {
        part: 'snippet',
        playlistId: pl.id,
      });
      items.forEach((it, idx) => {
        trackIndex.push({
          num: idx + 1,
          title: it.snippet.title,
          artist: it.snippet.videoOwnerChannelTitle || '',
          thumb: it.snippet.thumbnails?.default?.url || '',
          playlist: pl,
        });
      });
    } catch (_) {
      // playlist non accessibile, skip
    }
  }

  bar.style.width = '100%';
  status.textContent = `${trackIndex.length} brani indicizzati`;
  setTimeout(() => {
    progress.classList.remove('visible');
    status.textContent = '';
  }, 2000);
}

// ── LOAD TRACKS (detail view) ──
async function loadTracks(playlistId) {
  const el = document.getElementById('track-list');
  el.innerHTML = '<div class="loader"><div class="spinner"></div> Carico tracce…</div>';

  // se già indicizzate, prendi dall'indice
  const cached = trackIndex.filter(t => t.playlist.id === playlistId);
  if (cached.length) {
    renderTracks(cached);
    return;
  }

  const items = await fetchAllPages('playlistItems', {
    part: 'snippet',
    playlistId,
  });
  const tracks = items.map((it, i) => ({
    num: i + 1,
    title: it.snippet.title,
    artist: it.snippet.videoOwnerChannelTitle || '',
    thumb: it.snippet.thumbnails?.default?.url || '',
  }));
  renderTracks(tracks);
}

// ── MAKE CARD ──
function makeCard(pl) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="card-thumb">
      <img src="${pl.thumb}" alt="${pl.title}" loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
      <div class="thumb-fallback">🎵</div>
      <div class="overlay">
        <div class="play-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
    </div>
    <div class="card-body">
      <div class="card-title">${pl.title}</div>
      <div class="card-meta">
        ${pl.tracks != null ? `<span>${pl.tracks} tracce</span><span class="dot"></span>` : ''}
        <span class="card-meta-accent">DETTAGLIO →</span>
      </div>
    </div>
  `;
  card.addEventListener('click', () => openDetail(pl));
  return card;
}

// ── RENDER GROUPS ──
function renderGroups(list) {
  GROUPS.forEach(g => {
    const grid = document.getElementById(`grid-${g.key}`);
    const section = document.getElementById(`section-${g.key}`);
    const subset = list.filter(pl => pl.group === g.key);

    if (!subset.length) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    grid.innerHTML = '';
    subset.forEach(pl => grid.appendChild(makeCard(pl)));
  });

  document.getElementById('count').textContent =
    list.length ? `${list.length} playlist` : '';
}

// ── RENDER TRACKS (detail) ──
function renderTracks(list) {
  const el = document.getElementById('track-list');
  if (!list.length) {
    el.innerHTML = '<div class="empty">Nessuna traccia trovata</div>';
    return;
  }
  el.innerHTML = list.map(t => `
    <div class="track-item">
      <span class="track-num">${t.num}</span>
      <img class="track-thumb" src="${t.thumb}" alt="" loading="lazy"
        onerror="this.style.display='none'"/>
      <div class="track-info">
        <div class="track-title">${t.title}</div>
        ${t.artist ? `<div class="track-artist">${t.artist}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// ── RENDER SEARCH RESULTS ──
function renderSearchResults(results) {
  const section = document.getElementById('search-results-section');
  const groups = document.getElementById('groups-section');
  const countEl = document.getElementById('search-results-count');
  const list = document.getElementById('search-results-list');

  if (!results) {
    section.classList.add('hidden');
    groups.classList.remove('hidden');
    return;
  }

  section.classList.remove('hidden');
  groups.classList.add('hidden');

  if (!results.length) {
    countEl.textContent = 'Nessun risultato';
    list.innerHTML = '<div class="empty">Nessun brano o artista trovato</div>';
    return;
  }

  countEl.textContent = `${results.length} risultat${results.length === 1 ? 'o' : 'i'}`;
  list.innerHTML = results.map(r => `
    <div class="search-result-item" data-playlist-id="${r.playlist.id}">
      <img class="search-result-thumb" src="${r.thumb}" alt="" loading="lazy"
        onerror="this.style.display='none'"/>
      <div class="search-result-info">
        <div class="search-result-track">${r.title}</div>
        ${r.artist ? `<div class="search-result-artist">${r.artist}</div>` : ''}
      </div>
      <div class="search-result-playlist">${r.playlist.title}</div>
    </div>
  `).join('');

  list.querySelectorAll('.search-result-item').forEach((el, i) => {
    el.addEventListener('click', () => openDetail(results[i].playlist));
  });
}

// ── OPEN DETAIL ──
function openDetail(pl) {
  const detailBtn = document.getElementById('detail-simp-btn');
  const webUrl = buildYouTubeMusicPlaylistUrl(pl.id);

  document.getElementById('detail-thumb').src = pl.thumb;
  document.getElementById('detail-thumb').alt = pl.title;
  document.getElementById('detail-title').textContent = pl.title;
  document.getElementById('detail-meta').textContent =
    pl.tracks != null ? `${pl.tracks} tracce` : '';
  detailBtn.href = webUrl;
  detailBtn.dataset.intentUrl = buildSimpMusicIntentUrl(pl.id);
  document.getElementById('track-search').value = '';
  showView('view-detail');
  loadTracks(pl.id);
}

// ── SEARCH HOME ──
document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();

  if (!q) {
    renderSearchResults(null);
    renderGroups(allPlaylists);
    return;
  }

  // cerca prima nel titolo playlist
  const playlistMatches = allPlaylists.filter(p => p.title.toLowerCase().includes(q));

  // poi nei brani/artisti (solo se indice disponibile)
  if (trackIndex.length) {
    const trackMatches = trackIndex.filter(t =>
      t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
    if (trackMatches.length || !playlistMatches.length) {
      renderSearchResults(trackMatches);
      return;
    }
  }

  // fallback: filtra solo per titolo playlist
  renderSearchResults(null);
  renderGroups(playlistMatches);
});

// ── SEARCH TRACKS (detail) ──
let detailTracks = [];
document.getElementById('track-search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) { renderTracks(detailTracks); return; }
  renderTracks(detailTracks.filter(t =>
    t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
  ));
});

// ── BACK ──
document.getElementById('back-btn').addEventListener('click', () => {
  showView('view-home');
});

document.getElementById('detail-simp-btn').addEventListener('click', e => {
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  const intentUrl = e.currentTarget.dataset.intentUrl;

  if (!isAndroid || !intentUrl) return;

  e.preventDefault();
  window.location.href = intentUrl;
});

// ── INIT ──
loadPlaylists().catch(err => {
  document.getElementById('grid-marz1').innerHTML =
    `<div class="empty">Errore caricamento: ${err.message}</div>`;
});
