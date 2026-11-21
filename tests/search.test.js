// What shows up as already there while a new word is typed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findExisting, findMeaning } from '../src/lib/search.js';
import { items } from '../src/content/index.js';

const SOME = [
  { id: 'bom dia', pt: 'bom dia', en: 'good morning' },
  { id: 'dia', pt: 'dia', en: 'day' },
  { id: 'todo dia', pt: 'todo dia', en: 'every day' },
  { id: 'bom fim de semana', pt: 'bom fim de semana', en: 'have a good weekend' },
  { id: 'obrigado', pt: 'obrigado / obrigada', en: 'thank you / thanks' },
  { id: 'você', pt: 'você', en: 'you' },
  { id: 'avó', pt: 'avó', en: 'grandmother' },
  { id: 'avô', pt: 'avô', en: 'grandfather' },
  { id: 'meio-dia', pt: 'meio-dia', en: 'noon / midday' },
  { id: 'falar', pt: 'falar', en: 'to speak / to talk' },
];
const names = (found) => found.map((match) => match.entry.pt);

test('typing a phrase shows it before it is finished, and stops showing it once it is something else', () => {
  assert.deepEqual(names(findExisting('bom di', SOME)), ['bom dia']);
  assert.deepEqual(findExisting('bom di', SOME).map((match) => match.same), [false]);
  assert.deepEqual(findExisting('bom dia', SOME).map((match) => [match.entry.pt, match.same]), [['bom dia', true]]);
  assert.deepEqual(names(findExisting('bom diamond', SOME)), [], 'a longer, new phrase matches nothing');
  assert.deepEqual(names(findExisting('bom', SOME)), ['bom dia', 'bom fim de semana'], 'the shorter one first');
});

test('the best match comes first', () => {
  // The word itself, then phrases with a word that starts with it, then what merely contains it.
  // ("meio-dia" has the word "dia" in it: a hyphen separates words as a space does.)
  assert.deepEqual(names(findExisting('dia', SOME)), ['dia', 'bom dia', 'meio-dia', 'todo dia']);
  assert.equal(findExisting('dia', SOME)[0].same, true);
  assert.deepEqual(names(findExisting('ia', SOME)), ['dia', 'bom dia', 'meio-dia', 'todo dia'], 'inside a word still counts');
  assert.deepEqual(names(findExisting('fal', [...SOME, { id: 'desfalque', pt: 'desfalque', en: 'shortfall' }])), ['falar', 'desfalque'], 'a word that starts with it before one that contains it');
  assert.deepEqual(names(findExisting('dia', SOME, 2)), ['dia', 'bom dia'], 'no more than asked for');
});

test('capitals, accents and punctuation do not hide a match', () => {
  assert.deepEqual(names(findExisting('Bom Dia!', SOME)), ['bom dia']);
  assert.equal(findExisting('Bom Dia!', SOME)[0].same, true);
  assert.deepEqual(names(findExisting('voce', SOME)), ['você']);
  assert.equal(findExisting('voce', SOME)[0].same, false, 'without its accent it is close, not the same');
  assert.equal(findExisting('você', SOME)[0].same, true);
  // Two words that differ only by an accent are two words.
  assert.deepEqual(findExisting('avó', SOME).map((match) => [match.entry.pt, match.same]), [['avó', true], ['avô', false]]);
  assert.deepEqual(names(findExisting('meio dia', SOME)), ['meio-dia']);
});

test('either form of a word with two forms is found', () => {
  assert.deepEqual(names(findExisting('obrigada', SOME)), ['obrigado / obrigada']);
  assert.equal(findExisting('obrigada', SOME)[0].same, true);
  assert.deepEqual(names(findExisting('obrig', SOME)), ['obrigado / obrigada']);
});

test('one letter shows nothing, and nothing typed shows nothing', () => {
  assert.deepEqual(findExisting('', SOME), []);
  assert.deepEqual(findExisting('d', SOME), []);
  assert.deepEqual(findExisting('  ', SOME), []);
  assert.equal(findExisting('di', SOME).length, 4);
});

test('a meaning that is already there', () => {
  assert.deepEqual(names(findMeaning('good morning', SOME)), ['bom dia']);
  assert.equal(findMeaning('good morning', SOME)[0].same, true);
  assert.deepEqual(names(findMeaning('thanks', SOME)), ['obrigado / obrigada'], 'any of its meanings');
  assert.deepEqual(names(findMeaning('speak', SOME)), ['falar'], '"to" does not count');
  assert.deepEqual(names(findMeaning('grand', SOME)), ['avó', 'avô']);
  assert.deepEqual(findMeaning('go', SOME), [], 'three letters are needed');
});

test('on the real content', () => {
  const all = [...items.values()];
  assert.equal(findExisting('bom di', all)[0].entry.pt, 'bom dia');
  assert.equal(findExisting('obrigad', all)[0].entry.id, 'obrigado');
  assert.deepEqual(findExisting('bom diamond', all), []);
  assert.ok(findExisting('qu', all).length === 6, 'never more than six');
  const started = performance.now();
  for (let i = 0; i < 50; i++) findExisting('ca', all);
  assert.ok(performance.now() - started < 1000, 'quick enough to run at every letter typed');
});
