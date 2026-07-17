(function initMarzCore(root, factory) {
  const core = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = core;
  } else {
    root.MarzCore = core;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createMarzCore() {
  const SIMPMUSIC_PACKAGE = 'com.maxrave.simpmusic';
  const HTML_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  function buildYouTubeMusicPlaylistUrl(playlistId) {
    const url = new URL('https://music.youtube.com/playlist');
    url.searchParams.set('list', String(playlistId));
    return url.toString();
  }

  function buildSimpMusicIntentUrl(playlistId) {
    const id = String(playlistId);
    const webUrl = buildYouTubeMusicPlaylistUrl(id);
    return `intent://music.youtube.com/playlist?list=${encodeURIComponent(id)}#Intent;scheme=https;package=${SIMPMUSIC_PACKAGE};S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => HTML_ENTITIES[character]);
  }

  function filterTracks(tracks, query) {
    const list = Array.isArray(tracks) ? tracks : [];
    const normalizedQuery = String(query ?? '').toLocaleLowerCase('it').trim();

    if (!normalizedQuery) return list.slice();

    return list.filter(track => {
      const title = String(track.title ?? '').toLocaleLowerCase('it');
      const artist = String(track.artist ?? '').toLocaleLowerCase('it');
      return title.includes(normalizedQuery) || artist.includes(normalizedQuery);
    });
  }

  function createDetailTrackState() {
    let activePlaylistId = null;
    let tracks = [];

    return Object.freeze({
      open(playlistId) {
        activePlaylistId = String(playlistId);
        tracks = [];
      },

      isActive(playlistId) {
        return activePlaylistId === String(playlistId);
      },

      accept(playlistId, nextTracks) {
        if (activePlaylistId !== String(playlistId)) return false;
        tracks = Array.isArray(nextTracks) ? nextTracks.slice() : [];
        return true;
      },

      filter(query) {
        return filterTracks(tracks, query);
      },
    });
  }

  return Object.freeze({
    buildYouTubeMusicPlaylistUrl,
    buildSimpMusicIntentUrl,
    escapeHtml,
    filterTracks,
    createDetailTrackState,
  });
}));
