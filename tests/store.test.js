// The store, run against a stand-in for the phone's storage.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

let store;
before(async () => { store = await import('../src/store.js'); });

test('damaged data is repaired, never a failure to open', () => {
  const repair = store.repairForTest;
  const damaged = repair({ words: null, own: [], sessions: 'x', settings: { perDay: '5', share: 33, modes: ['fly'], length: -2 } });
  assert.deepEqual(damaged.words, {});
  assert.deepEqual(damaged.own, {});
  assert.deepEqual(damaged.sessions, []);
  assert.equal(damaged.settings.perDay, 5);
  assert.equal(damaged.settings.share, 25, 'an unknown share takes the default');
  assert.deepEqual(damaged.settings.modes, ['choose', 'type', 'listen', 'order']);
  assert.equal(damaged.settings.length, 10);
  assert.equal(damaged.settings.font, 'dyslexic', 'the dyslexia-friendly font unless chosen otherwise');
  assert.equal(repair({ settings: { font: 'standard' } }).settings.font, 'standard');
  assert.equal(repair({ settings: { font: 'comic' } }).settings.font, 'dyslexic');
  assert.equal(repair({ settings: { length: -2 } }).settings.share, 200, '"All ×2" from before is 200%');
  assert.equal(repair({ settings: { mode: 'type' } }).settings.modes.join(), 'type', 'one mode from before');
  const words = repair({ words: { olá: { n: '3', s: 7, hist: '10x1' }, '': { n: 1 } } }).words;
  assert.deepEqual(Object.keys(words), ['olá']);
  assert.equal(words['olá'].n, 0);
  assert.equal(words['olá'].s, 1);
  assert.equal(words['olá'].hist, '101');
  assert.deepEqual(repair({ own: { a: { pt: '   ', en: 'x' }, b: { pt: 'saudade', en: '' }, c: { pt: 'cafuné', en: 'caress' } } }).own.cafuné.en, 'caress');
  assert.equal(Object.keys(repair({ own: { a: { pt: '   ', en: 'x' } } }).own).length, 0, 'a blank word is left out');
  assert.equal(repair(null).settings.perDay, 5);
  assert.equal(repair('nonsense').v, 1);
});

test('a word the content no longer has stays in the library', () => {
  const repaired = store.repairForTest({ words: { 'palavra antiga': { n: 2, s: 0.4, t: ['palavra antiga', 'old word'] } } });
  assert.deepEqual(repaired.words['palavra antiga'].t, ['palavra antiga', 'old word']);
});

test('adding a word: blanks refused, any form of an existing word found, no duplicates', () => {
  store.resetAll();
  assert.ok(store.addOwn({ pt: '   ', en: 'nothing' }).error);
  assert.equal(store.findId('obrigada'), 'obrigado');
  const taken = store.addOwn({ pt: 'obrigada', en: 'thanks' });
  assert.deepEqual(taken, { id: 'obrigado', existing: true }, 'the second form adds the word that has it');
  assert.ok(store.addOwn({ pt: 'Obrigado!', en: 'thanks' }).error, 'and not twice');
  assert.ok(store.addOwn({ pt: 'cafuné', en: '' }).error, 'a new word needs its meaning');
  assert.equal(store.addOwn({ pt: 'cafuné', en: 'a caress in the hair' }).id, 'cafuné');
  assert.equal(store.librarySize.value, 2);
});

test('a word the learner added can be changed, and keeps its history', () => {
  store.resetAll();
  store.addOwn({ pt: 'cafune', en: 'caress' });
  store.record('cafune', true);
  assert.equal(store.editOwn('cafune', { pt: 'cafuné', en: 'a caress in the hair', note: '' }).id, 'cafuné');
  assert.equal(store.state.words['cafuné'].n, 1);
  assert.equal(store.state.words.cafune, undefined);
  assert.equal(store.getItem('cafuné').en, 'a caress in the hair');
  assert.ok(store.editOwn('cafuné', { pt: 'olá', en: 'hello' }).error, 'not onto a word the app has');
  assert.ok(store.editOwn('olá', { pt: 'oi', en: 'hi' }).error, 'only own words');
});

test('"I know this" puts a word at 100%, and on Today it brings another new word', () => {
  store.resetAll();
  store.ensureDaily();
  const [first] = store.state.daily.ids;
  const undo = store.knowToday(first);
  assert.equal(store.scoreOf(first), 1);
  assert.equal(store.state.daily.ids.includes(first), false);
  assert.equal(store.state.daily.ids.length, 5, 'another word took its place');
  undo();
  assert.equal(store.state.daily.ids[0], first);
  assert.equal(store.scoreOf(first), null, 'undone');
});

test('the daily review takes the weakest and the longest unseen, at most 20, none seen today', () => {
  store.resetAll();
  for (const id of ['olá', 'oi', 'bom dia', 'boa tarde']) store.record(id, true);
  store.record('oi', false);
  assert.equal(store.getSet('lib:review').ids.length, 0, 'all practised today: nothing to review');
  for (const id of ['olá', 'oi', 'bom dia', 'boa tarde']) store.state.words[id].last -= 2 * 86400000;
  const set = store.getSet('lib:review');
  assert.equal(set.ids[0], 'oi', 'the weakest first');
  assert.equal(set.ids.length, 4);
  assert.equal(store.getSet('lib:review').ids.length <= store.REVIEW_SIZE, true);
});

test('restoring a backup can be undone', () => {
  store.resetAll();
  store.addOwn({ pt: 'cafuné', en: 'caress' });
  const backup = store.exportData();
  store.resetAll();
  store.addOwn({ pt: 'saudade', en: 'longing' });
  const read = store.readBackup(backup);
  assert.equal(read.words, 1);
  store.applyBackup(read.state);
  assert.ok(store.getItem('cafuné'));
  assert.equal(store.undoRestore(), true);
  assert.ok(store.state.words.saudade);
  assert.ok(store.readBackup('{"app":"caipirinha","state":{"words":null}}').error, 'words: null is refused');
  assert.ok(store.readBackup('not json').error);
});

test('a day of 0 or "5" new words cannot add the whole content', () => {
  store.resetAll();
  store.state.settings.perDay = 0;
  store.state.daily.date = '';
  store.ensureDaily();
  assert.equal(store.state.daily.ids.length, 0);
});
