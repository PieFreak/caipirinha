// The fixes from the review of 2026-11-21: right answers marked wrong, wrong ones marked
// right, and ways the app could get stuck or lose things.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDigits, checkPt, idOf, meaningKey, tilesOf } from '../src/lib/text.js';
import { faded, nextScore } from '../src/lib/score.js';
import { VERBS, VERBS_BY_INF, VERB_FORMS, regular } from '../src/lib/verbs.js';

const WORDS = ['bom', 'dia', 'e', 'é', 'esta', 'está', 'avó', 'avô', 'meu', 'nome', 'ana', 'estou', 'com', 'fome', 'eu', 'você'];
const isExact = (word) => WORDS.includes(word);
const isWord = (word) => WORDS.map((w) => w.normalize('NFD').replace(/[̀-ͯ]/g, '')).includes(word);

test('the spoken short forms are read as what they stand for', () => {
  assert.equal(checkPt('tô com fome', ['estou com fome']).ok, true);
  assert.equal(checkPt('to com fome', ['estou com fome']).ok, true, 'typed without its accent');
  assert.equal(checkPt('tá bom', ['está bom']).ok, true);
  assert.equal(checkPt('pra viagem', ['para viagem']).ok, true);
  assert.equal(checkPt('cê fala inglês?', ['você fala inglês?']).ok, true);
  assert.equal(checkPt('estou com fome', ['tô com fome']).ok, true, 'and the other way round');
  assert.equal(checkPt('tô', ['estou']).ok, true);
});

test('a missing word is a mistake, not a typo', () => {
  assert.equal(checkPt('meu nome ana', ['meu nome é Ana'], { isWord }).ok, false);
  assert.equal(checkPt('nome é ana', ['meu nome é Ana'], { isWord }).ok, false);
  assert.equal(checkPt('bomdia', ['bom dia'], { isWord }).ok, true, 'a missing space still is a typo');
  assert.equal(checkPt('bom diaa', ['bom dia'], { isWord }).typo, 'bom dia');
});

test('an accent that makes another word is close, not right', () => {
  assert.deepEqual(checkPt('avô', ['avó'], { isWord, isExact }), { ok: false, close: 'avó', other: ['avô'] });
  assert.deepEqual(checkPt('esta', ['está'], { isWord, isExact }), { ok: false, close: 'está', other: ['esta'] });
  assert.equal(checkPt('meu nome e ana', ['meu nome é Ana'], { isWord, isExact }).close, 'meu nome é Ana');
  assert.deepEqual(checkPt('voce', ['você'], { isWord, isExact }), { ok: true, accents: 'você' }, 'not another word: a slip as before');
  assert.equal(checkPt('avó', ['avó'], { isWord, isExact }).ok, true);
});

test('meanings are told apart by their clarifiers', () => {
  assert.notEqual(meaningKey('to be (permanent)'), meaningKey('to be (temporary)'));
  assert.equal(meaningKey('to speak'), meaningKey('speak'));
  assert.equal(meaningKey("I'm lost"), meaningKey('I am lost'));
  assert.equal(meaningKey('Hello!'), 'hello');
});

test('three o\'clock may be typed as "3"', () => {
  assert.equal(checkDigits('3', ['3:00', '3']).ok, true);
  assert.equal(checkDigits('3:00', ['3:00', '3']).ok, true);
  assert.equal(checkDigits('3,30', ['3:30']).ok, true);
  assert.equal(checkDigits('3', ['3:30']).ok, false);
  assert.equal(checkDigits('342913', '342 913').ok, true, 'one expected form still works');
});

test('text with nothing in it has no id and no tiles', () => {
  assert.equal(idOf('   '), '');
  assert.equal(idOf(''), '');
  assert.deepEqual(tilesOf('   '), []);
  assert.equal(idOf('  Bom dia!  '), 'bom dia');
});

test('a word fades by 1% a day after it was last practised', () => {
  const DAY = 86400000;
  const now = Date.UTC(2026, 10, 21, 12);
  assert.equal(faded(1, now, now), 1);
  assert.equal(faded(1, now - DAY * 0.9, now), 1, 'less than a day: no change');
  assert.equal(faded(1, now - DAY, now), 0.99);
  assert.equal(faded(1, now - DAY * 30, now), 0.7);
  assert.equal(faded(0.2, now - DAY * 30, now), 0, 'never below 0%');
  assert.equal(nextScore(faded(1, now - DAY * 30, now), true), 0.8, 'an answer counts from where it stands today');
});

test('verbs: every verb has four forms in each tense, and the rules spell right', () => {
  for (const verb of VERBS) {
    assert.equal(verb.present.length, 4, verb.inf);
    assert.equal(verb.past.length, 4, verb.inf);
    assert.ok([...verb.present, ...verb.past].every((form) => /^[a-zãáâéêíóôõúç]+$/.test(form)), verb.inf);
  }
  assert.deepEqual(regular('falar'), { present: ['falo', 'fala', 'falamos', 'falam'], past: ['falei', 'falou', 'falamos', 'falaram'] });
  assert.deepEqual(regular('comer'), { present: ['como', 'come', 'comemos', 'comem'], past: ['comi', 'comeu', 'comemos', 'comeram'] });
  assert.deepEqual(regular('abrir'), { present: ['abro', 'abre', 'abrimos', 'abrem'], past: ['abri', 'abriu', 'abrimos', 'abriram'] });
  assert.equal(VERBS_BY_INF.chegar.past[0], 'cheguei');
  assert.equal(VERBS_BY_INF.ficar.past[0], 'fiquei');
  assert.equal(VERBS_BY_INF.começar.past[0], 'comecei');
  assert.equal(VERBS_BY_INF.dançar.past[0], 'dancei');
  assert.equal(VERBS_BY_INF.conhecer.present[0], 'conheço');
  assert.equal(VERBS_BY_INF.esquecer.present[0], 'esqueço');
  assert.deepEqual(VERBS_BY_INF.ir.past, VERBS_BY_INF.ser.past, 'ir and ser share the past');
  assert.ok(VERB_FORMS.has('pôde') && VERB_FORMS.has('pode'));
  assert.equal(new Set(VERBS.map((verb) => verb.inf)).size, VERBS.length, 'no verb twice');
});
