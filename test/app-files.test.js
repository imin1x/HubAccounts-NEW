'use strict';
// Structural checks for the browser app. Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('HubAccounts.html');
const loaded = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
const onDisk = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`);

test('every feature script is loaded exactly once and exists', () => {
  assert.equal(new Set(loaded).size, loaded.length, 'duplicate <script> tag');
  assert.deepEqual([...loaded].sort(), [...onDisk].sort());
  assert.equal(loaded.at(-1), 'js/app.js', 'boot script must load last');
});

test('every feature script parses', () => {
  for (const file of loaded) assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }), file);
});

test('no top-level name is declared in two scripts', () => {
  const seen = new Map();
  for (const file of loaded) {
    for (const m of read(file).matchAll(/^(?:async\s+)?(?:function\s+|const\s+|let\s+)([A-Za-z_$][\w$]*)/gm)) {
      assert.ok(!seen.has(m[1]), `${m[1]} declared in ${seen.get(m[1])} and ${file}`);
      seen.set(m[1], file);
    }
  }
});

test('every i18n key the app looks up is defined', () => {
  const defined = new Set([...read('js/i18n.js').matchAll(/^\s+([a-z0-9_]+):\s+\{ vi:/gm)].map(m => m[1]));
  const used = new Set();
  for (const file of loaded) for (const m of read(file).matchAll(/\bt\('([a-z0-9_]+)'\)/g)) used.add(m[1]);
  // statusMeta() builds its key dynamically: t('status_' + status)
  const statusBlock = read('js/core.js').match(/const STATUS_META = \{([\s\S]*?)\n\};/)[1];
  for (const m of statusBlock.matchAll(/^\s+([a-z]+):/gm)) used.add(`status_${m[1]}`);
  const missing = [...used].filter(key => !defined.has(key));
  assert.deepEqual(missing, []);
});

test('service worker caches every file the page needs', () => {
  const sw = read('sw.js');
  for (const file of ['HubAccounts.html', 'index.html', 'hubaccounts.css', 'manifest.json', 'icon-192.png', 'icon-512.png', ...loaded]) {
    assert.ok(sw.includes(`'./${file}'`), `${file} missing from APP_SHELL`);
  }
});

test('biometric unlock never stores the raw vault key', () => {
  const auth = read('js/auth.js');
  assert.ok(!/keyB64\s*[,:]/.test(auth.replace(/\/\/.*$/gm, '')), 'raw key field written to storage');
  assert.match(auth, /extensions:\s*\{\s*prf/);
});

test('AI key check never falls back to sending a plain password', () => {
  assert.ok(!/pw\.length\s*>/.test(read('js/status-check.js')));
});

test('showConfirm is always called with positional arguments', () => {
  for (const file of loaded) assert.ok(!/showConfirm\(\s*\{/.test(read(file)), file);
});

test('locking the vault also closes the Ctrl+K palette', () => {
  const endSession = read('js/shell.js').match(/function endSession\(\)\{[\s\S]*?\n\}/)[0];
  assert.match(endSession, /closeCommandPalette\(\)/);
  assert.match(endSession, /commandPaletteFilteredEntries = \[\]/);
});

test('every file listed in the service worker cache exists', () => {
  // One missing file makes cache.addAll() fail, silently disabling offline use.
  const shell = read('sw.js').match(/const APP_SHELL = \[([\s\S]*?)\];/)[1];
  for (const m of shell.matchAll(/'\.\/([^']+)'/g)) assert.ok(fs.existsSync(path.join(root, m[1])), m[1]);
});

test('saving merges lists another tab saved instead of overwriting them', () => {
  const core = read('js/core.js');
  const source = core.match(/function mergeListsById\([\s\S]*?\n\}/)[0];
  const merge = vm.runInNewContext(`(${source})`);
  const a = { id: 'a', v: 1 }, b = { id: 'b', v: 1 }, c = { id: 'c', v: 1 };
  const base = [a, b, c];
  // this tab: added X, edited b, deleted c. other tab: added Y, edited a.
  const ours = [a, { id: 'b', v: 2 }, { id: 'x' }];
  const theirs = [{ id: 'a', v: 9 }, b, c, { id: 'y' }];
  assert.deepEqual(JSON.parse(JSON.stringify(merge(base, ours, theirs))), [
    { id: 'a', v: 9 }, { id: 'b', v: 2 }, { id: 'y' }, { id: 'x' },
  ]);
  assert.match(core, /async function saveEntries\(\)\{\n  return persistVaultList\('entries'/);
});

test('Facebook auto-correct leaves ordinary typed values where they are', () => {
  const ctx = vm.createContext({});
  vm.runInContext(read('js/import-parse.js'), ctx);
  const fix = fields => JSON.parse(JSON.stringify(ctx.smartCorrectFacebookFields(fields)));
  const phoneLogin = { fbName: '100001111111', email: '0912345678', emailPassword: 'MailPass1', other: '' };
  assert.deepEqual(fix(phoneLogin), phoneLogin);
  const letterPass = { fbName: '100002222222', email: 'me@gmail.com', emailPassword: 'ABCDEFGHIJKLMNOPQ', twoFA: '' };
  assert.deepEqual(fix(letterPass), letterPass);
  // A clearly misplaced cookie/2FA still moves, and nothing is dropped.
  const shifted = fix({ fbName: '1000033333', email: 'c_user=1;xs=abc;datr=zz', secondaryEmail: 'JBSWY3DPEHPK3PXP', cookie: '', twoFA: '', other: '' });
  assert.equal(shifted.cookie, 'c_user=1;xs=abc;datr=zz');
  assert.equal(shifted.twoFA, 'JBSWY3DPEHPK3PXP');
  assert.equal(shifted.email, '');
});

test('overwriting a duplicate keeps fields the new data leaves blank', () => {
  const source = read('js/account-modal.js').match(/function nonEmptyFields\([\s\S]*?\n\}/)[0];
  const nonEmptyFields = vm.runInNewContext(`(${source})`);
  const saved = { fbName: 'a@gmail.com', password: 'old', twoFA: 'SECRET', cookie: 'c=1;d=2' };
  assert.deepEqual({ ...saved, ...nonEmptyFields({ fbName: 'a@gmail.com', password: 'new', twoFA: '', cookie: '' }) },
    { fbName: 'a@gmail.com', password: 'new', twoFA: 'SECRET', cookie: 'c=1;d=2' });
});

test('strict dates, proxy passwords with ":" and duplicate keys', () => {
  const core = read('js/core.js');
  const pick = (src, name) => src.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0];
  const ctx = vm.createContext({});
  vm.runInContext([pick(core, 'calendarDate'), pick(core, 'parseStrictDate'), pick(core, 'splitProxyLine')].join('\n'), ctx);
  assert.equal(ctx.parseStrictDate('31/02/2026'), null);
  assert.equal(ctx.parseStrictDate('abc'), null);
  assert.equal(ctx.parseStrictDate('04/11/2026').getDate(), 4);
  assert.deepEqual([...ctx.splitProxyLine('1.2.3.4:8080:user:pa:ss:04/11/2026')], ['1.2.3.4', '8080', 'user', 'pa:ss', '04/11/2026']);
  assert.deepEqual([...ctx.splitProxyLine('1.2.3.4:8080:user:pa:ss')], ['1.2.3.4', '8080', 'user', 'pa:ss', '']);
  assert.deepEqual([...ctx.splitProxyLine('1.2.3.4:8080:user:pass')], ['1.2.3.4', '8080', 'user', 'pass']);
  const duplicateKey = vm.runInNewContext(`(${pick(read('js/account-modal.js'), 'duplicateKey')})`);
  assert.equal(duplicateKey('gmail', ' Case@Gmail.com '), duplicateKey('gmail', 'case@gmail.com'));
});
