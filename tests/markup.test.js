const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('loads the testable core before the browser application', () => {
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(scripts.slice(-2), ['app-core.js', 'app.js']);
});

test('defines every HTML id referenced by the application', () => {
  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const referencedIds = new Set(
    [...app.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match => match[1]),
  );
  const missingIds = [...referencedIds].filter(id => !htmlIds.has(id));

  assert.deepEqual(missingIds, []);
});

test('renders Marz & Nick I as a separate playlist group', () => {
  assert.match(app, /key: 'marz-nick1'.*Marz & Nick I/);
  assert.match(html, /id="section-marz-nick1"/);
  assert.match(html, /id="grid-marz-nick1"/);
});
