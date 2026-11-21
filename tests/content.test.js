// The content as a whole: it loads, and every single word has an example sentence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { items, groupsById } from '../src/content/index.js';
import examples1 from '../src/content/examples/part1.js';
import examples2 from '../src/content/examples/part2.js';
import examples3 from '../src/content/examples/part3.js';
import { idOf } from '../src/lib/text.js';

test('the common words come in ten sets of a hundred', () => {
  for (let band = 1; band <= 10; band++) assert.equal(groupsById[`top${band}`].items.length, 100, `top${band}`);
});

test('every word of the common words and the word groups has an example', () => {
  const missing = [];
  for (const id of ['days', 'months', 'when', 'home', ...Array.from({ length: 10 }, (_, i) => `top${i + 1}`)]) {
    for (const word of groupsById[id].items) if (!items.get(word).example) missing.push(word);
  }
  assert.deepEqual(missing, []);
});

test('every example belongs to a word, once, and is well formed', () => {
  const seen = new Set();
  for (const text of [examples1, examples2, examples3]) {
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('//')) continue;
      const parts = line.split(' | ');
      assert.equal(parts.length, 3, line);
      const id = idOf(parts[0]);
      assert.ok(items.has(id), `no word "${parts[0]}"`);
      assert.ok(!seen.has(id), `"${parts[0]}" twice`);
      seen.add(id);
      assert.match(parts[1], /[.?!]$/, line);
      assert.match(parts[2], /[.?!]$/, line);
    }
  }
});
