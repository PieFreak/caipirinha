import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toWords, numberAnswers, formatNumber } from '../src/lib/numbers.js';
import { timeWords, formatTime } from '../src/lib/clock.js';
import { checkPt, checkEn, checkDigits, parseLines, idOf, tilesOf, cleanEn } from '../src/lib/text.js';

test('numbers are written as Brazilians write them', () => {
  const cases = {
    0: 'zero', 1: 'um', 14: 'quatorze', 16: 'dezesseis', 19: 'dezenove', 20: 'vinte', 21: 'vinte e um',
    50: 'cinquenta', 99: 'noventa e nove', 100: 'cem', 101: 'cento e um', 110: 'cento e dez',
    123: 'cento e vinte e três', 200: 'duzentos', 500: 'quinhentos', 999: 'novecentos e noventa e nove',
    1000: 'mil', 1001: 'mil e um', 1099: 'mil e noventa e nove', 1100: 'mil e cem', 1200: 'mil e duzentos',
    1234: 'mil duzentos e trinta e quatro', 2000: 'dois mil', 2500: 'dois mil e quinhentos',
    2026: 'dois mil e vinte e seis', 10000: 'dez mil', 21000: 'vinte e um mil', 100000: 'cem mil',
    101000: 'cento e um mil', 342913: 'trezentos e quarenta e dois mil novecentos e treze',
    999999: 'novecentos e noventa e nove mil novecentos e noventa e nove', 1000000: 'um milhão',
  };
  for (const [n, expected] of Object.entries(cases)) assert.equal(toWords(Number(n)), expected, `for ${n}`);
});

test('every number up to a million has words, and no two share them', () => {
  const seen = new Set();
  for (let n = 0; n <= 1000000; n += n < 2000 ? 1 : 997) {
    const text = toWords(n);
    assert.match(text, /^[a-zãáâéêíóôõúç ]+$/, `for ${n}`);
    assert.ok(!seen.has(text), `${text} twice`);
    seen.add(text);
  }
  assert.throws(() => toWords(1000001));
  assert.throws(() => toWords(-1));
  assert.throws(() => toWords(1.5));
});

test('a number takes the spellings that are heard', () => {
  assert.ok(numberAnswers(14).includes('catorze'));
  assert.ok(numberAnswers(1200).includes('mil duzentos'));
  assert.ok(numberAnswers(1234).includes('mil e duzentos e trinta e quatro'));
  assert.equal(numberAnswers(1234)[0], 'mil duzentos e trinta e quatro');
  assert.deepEqual(numberAnswers(7), ['sete']);
  assert.equal(formatNumber(342913), '342 913');
  assert.equal(formatNumber(1000000), '1 000 000');
  assert.equal(formatNumber(999), '999');
});

test('clock times', () => {
  const cases = {
    '1:00': 'é uma hora', '2:00': 'são duas horas', '12:00': 'é meio-dia', '3:15': 'são três e quinze',
    '3:30': 'são três e meia', '1:30': 'é uma e meia', '12:30': 'é meio-dia e meia',
    '3:45': 'são quinze para as quatro', '12:45': 'são quinze para a uma', '11:45': 'são quinze para o meio-dia',
    '1:45': 'são quinze para as duas', '2:05': 'são duas e cinco', '8:40': 'são oito e quarenta',
    '1:10': 'é uma e dez',
  };
  for (const [time, expected] of Object.entries(cases)) {
    const [h, m] = time.split(':').map(Number);
    assert.equal(timeWords(h, m).pt, expected, `for ${time}`);
    assert.equal(formatTime(h, m), time);
  }
  assert.ok(timeWords(3, 45).accept.includes('são três e quarenta e cinco'));
  assert.ok(timeWords(8, 40).accept.includes('são vinte para as nove'));
  assert.ok(timeWords(3, 30).accept.includes('três e meia'));
  assert.ok(timeWords(4, 0).accept.includes('são quatro'));
  assert.throws(() => timeWords(13, 0));
});

test('a typed Portuguese answer', () => {
  assert.deepEqual(checkPt('Você', ['você']), { ok: true });
  assert.deepEqual(checkPt('voce', ['você']), { ok: true, accents: 'você' });
  assert.deepEqual(checkPt('voce', ['você'], true), { ok: false, accents: 'você' });
  assert.equal(checkPt('obrigada', ['obrigado', 'obrigada']).ok, true);
  assert.equal(checkPt('Tudo bem?', ['tudo bem?']).ok, true);
  assert.equal(checkPt('segunda feira', ['segunda-feira']).ok, true);
  assert.equal(checkPt('não entendo', ['eu não entendo']).ok, true);
  assert.equal(checkPt('eu sei', ['sei']).ok, true);
  assert.equal(checkPt('', ['você']).ok, false);
  assert.equal(checkPt('voces', ['você']).ok, false);
});

test('a typed English answer', () => {
  assert.equal(checkEn('Hello', ['hello', 'hi']).ok, true);
  assert.equal(checkEn('speak', ['to speak']).ok, true);
  assert.equal(checkEn('to be', ['to be (permanent)']).ok, true);
  assert.equal(checkEn("I'm lost", ['I am lost']).ok, true);
  assert.equal(checkEn('I do not understand', ["I don't understand"]).ok, true);
  assert.equal(checkEn('the check please', ['the check, please']).ok, true);
  assert.equal(checkEn('house', ['the house']).ok, true);
  assert.equal(checkEn('home', ['house']).ok, false);
  assert.equal(checkEn('', ['house']).ok, false);
  assert.equal(cleanEn("What's your name?"), 'what is your name');
});

test('a number or a time typed in digits', () => {
  assert.equal(checkDigits('342913', '342 913').ok, true);
  assert.equal(checkDigits('342 913', '342 913').ok, true);
  assert.equal(checkDigits('3.30', '3:30').ok, true);
  assert.equal(checkDigits('330', '3:30').ok, true);
  assert.equal(checkDigits('0', '0').ok, true);
  assert.equal(checkDigits('', '0').ok, false);
  assert.equal(checkDigits('34', '3:30').ok, false);
});

test('content lines', () => {
  const items = parseLines(`
    // a comment
    casa (f) = house / home
    olá = hello ~ oh-LAH # Friends say "oi".
    obrigado / obrigada = thank you
    estudante (m/f) = student
    tudo bem? = how are you?
  `);
  assert.deepEqual(items[0], { id: 'casa', pt: 'casa', en: 'house / home', say: '', note: '', g: 'f' });
  assert.deepEqual(items[1], { id: 'olá', pt: 'olá', en: 'hello', say: 'oh-LAH', note: 'Friends say "oi".', g: '' });
  assert.equal(items[2].id, 'obrigado');
  assert.equal(items[3].g, 'm/f');
  assert.equal(items[4].id, 'tudo bem');
  assert.throws(() => parseLines('no equals sign here'));
  assert.equal(idOf('Bom dia!'), 'bom dia');
  assert.deepEqual(tilesOf('onde fica o banheiro?'), ['onde', 'fica', 'o', 'banheiro']);
});
