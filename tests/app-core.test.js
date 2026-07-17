const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildYouTubeMusicPlaylistUrl,
  buildSimpMusicIntentUrl,
  escapeHtml,
  filterTracks,
  createDetailTrackState,
} = require('../app-core.js');

test('builds a valid YouTube Music playlist URL', () => {
  const url = new URL(buildYouTubeMusicPlaylistUrl('PL 1&2'));

  assert.equal(url.origin, 'https://music.youtube.com');
  assert.equal(url.pathname, '/playlist');
  assert.equal(url.searchParams.get('list'), 'PL 1&2');
});

test('builds the SimpMusic intent with package and browser fallback', () => {
  const intent = buildSimpMusicIntentUrl('PL 1&2');

  assert.match(intent, /^intent:\/\/music\.youtube\.com\/playlist\?list=PL%201%262/);
  assert.match(intent, /package=com\.maxrave\.simpmusic/);
  assert.match(intent, /S\.browser_fallback_url=https%3A%2F%2Fmusic\.youtube\.com%2Fplaylist/);
  assert.match(intent, /;end$/);
});

test('escapes text inserted in HTML templates', () => {
  assert.equal(
    escapeHtml('<img src="x" onerror=\'alert(1)\'>&'),
    '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;',
  );
});

test('filters detail tracks by title or artist without case sensitivity', () => {
  const tracks = [
    { title: 'Senza Fine', artist: 'Gino Paoli' },
    { title: 'Azzurro', artist: 'Adriano Celentano' },
  ];

  assert.deepEqual(filterTracks(tracks, 'senza'), [tracks[0]]);
  assert.deepEqual(filterTracks(tracks, 'CELENTANO'), [tracks[1]]);
  assert.deepEqual(filterTracks(tracks, '  '), tracks);
  assert.deepEqual(filterTracks(null, 'test'), []);
});

test('keeps tracks for the open playlist and rejects stale responses', () => {
  const state = createDetailTrackState();
  const firstPlaylistTracks = [{ title: 'Vecchia', artist: 'Risposta' }];
  const currentPlaylistTracks = [{ title: 'Senza Fine', artist: 'Gino Paoli' }];

  state.open('playlist-1');
  state.open('playlist-2');

  assert.equal(state.accept('playlist-1', firstPlaylistTracks), false);
  assert.equal(state.accept('playlist-2', currentPlaylistTracks), true);
  assert.deepEqual(state.filter('gino'), currentPlaylistTracks);

  state.open('playlist-3');
  assert.deepEqual(state.filter(''), []);
});
