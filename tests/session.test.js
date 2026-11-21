// Building a session from the real content: how many questions, of which kinds,
// and how evenly the words come round when there are more questions than words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession, poolSize, ALL } from '../src/lib/session.js';
import { COUNTS, SHARES, questionsFor, sharesFor } from '../src/lib/lengths.js';
import { getSet } from '../src/store.js';

const count = (list) => list.reduce((seen, key) => seen.set(key, (seen.get(key) || 0) + 1), new Map());

test('more questions than words: every word comes round equally often', () => {
  for (const [setId, length] of [['days', 50], ['days', 15], ['months', 50], ['num0', 35]]) {
    for (let run = 0; run < 20; run++) {
      const session = buildSession(setId, { modes: ['choose', 'type'], dir: 'both', length });
      const ids = session.queue.map((question) => question.id);
      const words = getSet(setId).ids.length;
      assert.equal(ids.length, length, `${setId}: ${length} questions`);
      const times = [...count(ids).values()];
      assert.equal(times.length, words, `${setId}: every word is asked`);
      assert.ok(Math.max(...times) - Math.min(...times) <= 1, `${setId} × ${length}: asked ${Math.min(...times)} to ${Math.max(...times)} times`);
      assert.equal(Math.min(...times), Math.floor(length / words));
      ids.forEach((id, i) => assert.notEqual(id, ids[i - 1], `${setId}: the same word twice running`));
      // Each full round holds every word once.
      for (let from = 0; from + words <= length; from += words) assert.equal(new Set(ids.slice(from, from + words)).size, words);
    }
  }
});

test('the shares a set offers, and how many questions each is', () => {
  assert.deepEqual(SHARES, [5, 10, 25, 50, 75, 100, 200]);
  // Below ten words only half, all and twice.
  assert.deepEqual(sharesFor(7), [50, 100, 200]);
  assert.deepEqual(sharesFor(9), [50, 100, 200]);
  assert.deepEqual([50, 100, 200].map((share) => questionsFor(share, 7)), [4, 7, 14]);
  assert.deepEqual(sharesFor(5).map((share) => questionsFor(share, 5)), [3, 5, 10]);
  // From ten words on, every share, unless two come to the same number of questions.
  assert.deepEqual(sharesFor(10), [10, 25, 50, 75, 100, 200], '5% and 10% of 10 are both one question');
  assert.deepEqual(sharesFor(12), [10, 25, 50, 75, 100, 200]);
  assert.deepEqual(sharesFor(26), SHARES);
  assert.deepEqual(SHARES.map((share) => questionsFor(share, 26)), [1, 3, 7, 13, 20, 26, 52]);
  assert.deepEqual(SHARES.map((share) => questionsFor(share, 100)), [5, 10, 25, 50, 75, 100, 200]);
  assert.deepEqual(SHARES.map((share) => questionsFor(share, 600)), [30, 60, 150, 300, 450, 600, 1200]);
  // Whatever the size: never no question, never two choices of the same length, and all and twice are there.
  for (let total = 1; total <= 700; total++) {
    const counts = sharesFor(total).map((share) => questionsFor(share, total));
    assert.ok(counts.every((n) => n >= 1), `${total} words`);
    assert.equal(new Set(counts).size, counts.length, `${total} words: ${counts}`);
    assert.ok(sharesFor(total).includes(200) && questionsFor(200, total) === total * 2);
    assert.ok(total === 1 || sharesFor(total).includes(100));
    assert.equal(questionsFor(100, total), total);
  }
  assert.deepEqual(sharesFor(1), [100, 200], 'half of one word is the word');
  assert.deepEqual(COUNTS, [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
});

test('200%: every word exactly twice, in two rounds', () => {
  for (const setId of ['days', 'months', 'greetings']) {
    for (let run = 0; run < 20; run++) {
      const words = getSet(setId).ids.length;
      const ids = buildSession(setId, { modes: ['choose', 'type'], dir: 'both', length: questionsFor(200, words) }).queue.map((question) => question.id);
      assert.equal(ids.length, words * 2);
      assert.deepEqual([...new Set(count(ids).values())], [2], `${setId}: every word twice`);
      assert.equal(new Set(ids.slice(0, words)).size, words, 'the first round has every word');
      assert.equal(new Set(ids.slice(words)).size, words, 'and so has the second');
      ids.forEach((id, i) => assert.notEqual(id, ids[i - 1], `${setId}: the same word twice running`));
    }
  }
  assert.equal(buildSession('days', { modes: ['choose'], dir: 'both', length: ALL }).queue.length, 7);
});

test('the order differs from round to round and from session to session', () => {
  const orders = new Set();
  for (let run = 0; run < 12; run++) {
    const ids = buildSession('days', { modes: ['choose'], dir: 'pt-en', length: 14 }).queue.map((question) => question.id);
    orders.add(ids.slice(0, 7).join());
    orders.add(ids.slice(7).join());
  }
  assert.ok(orders.size > 12, `only ${orders.size} different orders in 24 rounds`);
});

test('as many questions as asked for, or every word once', () => {
  const session = (setId, modes, length) => buildSession(setId, { modes, dir: 'both', length });
  assert.equal(session('greetings', ['choose'], 5).queue.length, 5);
  assert.equal(new Set(session('greetings', ['choose'], 5).queue.map((q) => q.id)).size, 5);
  assert.equal(session('greetings', ['choose'], 0).queue.length, getSet('greetings').ids.length);
  assert.equal(session('count1m', ['type'], 50).queue.length, 50);
  assert.equal(session('days', [], 10), null, 'nothing ticked');
  assert.equal(session('days', ['order'], 10), null, 'no weekday is a sentence');
});

test('each question is one of the kinds ticked', () => {
  const kinds = count(buildSession('food', { modes: ['choose', 'order'], dir: 'both', length: 50 }).queue.map((q) => q.mode));
  assert.deepEqual([...kinds.keys()].sort(), ['choose', 'order']);
  const sentences = poolSize(getSet('food'), ['order']);
  assert.ok(sentences > 0 && sentences < getSet('food').ids.length, 'only the sentences can be put in order');
  const ordered = buildSession('food', { modes: ['order'], dir: 'both', length: 50 }).queue;
  assert.equal(ordered.length, 50);
  assert.ok(ordered.every((q) => q.mode === 'order' && q.dir === 'en-pt' && q.tiles.length >= 3));
  assert.equal(new Set(ordered.map((q) => q.id)).size, sentences);
});
