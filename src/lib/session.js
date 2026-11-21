// Building the questions of a session, and judging an answer. A session is a list
// of questions; each has what is asked, how (mode: one of the kinds the learner
// ticked) and which way (dir).
import { items } from '../content/index.js';
import { getItem, getSet, state } from '../store.js';
import { alternatives, checkDigits, checkEn, checkPt, clean, cleanEn, shownEn, stripAccents, tilesOf } from './text.js';
import { formatNumber, numberAnswers, toWords, NUMBER_WORDS } from './numbers.js';
import { formatTime, timeWords } from './clock.js';
import { speech } from './speech.js';

// The kinds of exercise. The learner ticks the ones wanted; all of them is the default.
export const MODES = [
  { id: 'choose', title: 'Pick from 4', short: 'Pick' },
  { id: 'type', title: 'Typing', short: 'Typing' },
  { id: 'listen', title: 'Listen and pick', short: 'Listen' },
  { id: 'order', title: 'Word order', short: 'Word order' },
];
export const ALL_MODES = MODES.map((mode) => mode.id);

// What a session was made of, in a few words: for the log.
export function modesTitle(modes) {
  const wanted = MODES.filter((mode) => (modes || ALL_MODES).includes(mode.id));
  if (wanted.length === 1) return wanted[0].title;
  return wanted.length === MODES.length || !wanted.length ? 'Mixed' : wanted.map((mode) => mode.short).join(' + ');
}

export const DIRS = [
  { id: 'both', title: 'Both ways' },
  { id: 'pt-en', title: 'Portuguese → English' },
  { id: 'en-pt', title: 'English → Portuguese' },
];

// How many questions: 5 to 50 in fives, or (0) every word of the set.
export const LENGTHS = [
  ...[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((n) => ({ id: n, title: String(n) })),
  { id: 0, title: 'All' },
];

const rand = (n) => Math.floor(Math.random() * n);

export function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---- what is asked: a word of the content, a number or a clock time

// Weekdays are said without "-feira" in everyday speech: "sexta" is as right as "sexta-feira".
const spokenForms = (pt) => alternatives(pt).flatMap((form) => (form.endsWith('-feira') ? [form, form.slice(0, -6)] : [form]));

function ofItem(item) {
  return {
    id: item.id, pt: item.pt, en: shownEn(item.en), say: item.say, note: item.note, g: item.g,
    ptAccept: spokenForms(item.pt), enAccept: alternatives(item.en), tiles: tilesOf(item.pt),
  };
}

function ofNumber(n, setId) {
  const pt = toWords(n);
  return { gen: setId, value: n, pt, en: formatNumber(n), digits: true, ptAccept: numberAnswers(n), tiles: pt.split(' ') };
}

function ofTime(h, m, setId) {
  const time = timeWords(h, m);
  return { gen: setId, value: h * 60 + m, pt: time.pt, en: formatTime(h, m), digits: true, ptAccept: time.accept, tiles: time.pt.split(' ') };
}

const canOrder = (entry) => entry.tiles.length >= 3;

// ---- numbers and times made up for a session

const isPowerOfTen = (n) => /^10+$/.test(String(n));

function randomNumber(min, max) {
  // The top of the range (1 000, 1 000 000) is one number among many, not a size of its own.
  if (isPowerOfTen(max) && Math.random() < 0.04) return max;
  const top = isPowerOfTen(max) ? max - 1 : max;
  // Each length equally often, or six-digit numbers would be nearly all of them.
  const shortest = String(min).length;
  const length = shortest + rand(String(top).length - shortest + 1);
  const low = Math.max(min, length === 1 ? 0 : 10 ** (length - 1));
  const high = Math.min(top, 10 ** length - 1);
  let n = low + rand(high - low + 1);
  // A quarter are round: "dois mil", "trezentos e cinquenta mil".
  if (length > 2 && Math.random() < 0.25) {
    const unit = 10 ** (length - 1 - rand(2));
    n = Math.max(low, n - (n % unit));
  }
  return n;
}

// wanted: an entry is kept only when one of the ticked kinds can ask it.
function generate(set, count, wanted = () => true) {
  const seen = new Set();
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    let entry;
    if (set.gen === 'clock') entry = ofTime(1 + rand(12), rand(12) * 5, set.id);
    else entry = ofNumber(randomNumber(set.min, set.max), set.id);
    if (!wanted(entry)) continue;
    if (seen.has(entry.value)) continue;
    seen.add(entry.value);
    out.push(entry);
  }
  return out;
}

// Wrong answers that look like the right one: a digit off, digits swapped, ten times as much.
function nearNumbers(n, min, max) {
  const near = new Set();
  const add = (value) => { if (Number.isInteger(value) && value >= min && value <= max && value !== n) near.add(value); };
  for (const step of [1, -1, 10, -10, 100, -100, 1000, -1000, 10000, -10000]) add(n + step);
  const text = String(n);
  if (text.length > 1) {
    add(Number(text.split('').reverse().join('')));
    add(Number(text[0] + text.slice(1).split('').reverse().join('')));
  }
  add(n * 10);
  add(n / 10);
  const out = shuffle([...near]).slice(0, 3);
  for (let tries = 0; out.length < 3 && tries < 200; tries++) {
    const value = min + rand(max - min + 1);
    if (value !== n && !out.includes(value)) out.push(value);
  }
  return out;
}

function nearTimes(value) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  const near = new Set();
  const add = (hour, minute) => {
    const other = (((hour - 1) % 12) + 12) % 12 + 1;
    const total = other * 60 + ((minute % 60) + 60) % 60;
    if (total !== value) near.add(total);
  };
  add(h + 1, m); add(h - 1, m); add(h, m + 15); add(h, m - 15); add(h, m + 30); add(h + 1, m + 30); add(h, m + 5);
  return shuffle([...near]).slice(0, 3);
}

// ---- the four choices

function distractors(entry, set) {
  if (entry.gen) {
    return set.gen === 'clock'
      ? nearTimes(entry.value).map((value) => ofTime(Math.floor(value / 60), value % 60, set.id))
      : nearNumbers(entry.value, set.min, set.max).map((value) => ofNumber(value, set.id));
  }
  // Never a choice that is also right: "como vai?" and "tudo bem?" both mean "how are you?".
  const meanings = (e) => [clean(e.pt), ...e.enAccept.map(cleanEn)];
  const out = [];
  const taken = new Set(meanings(entry));
  const take = (ids) => {
    for (const id of ids) {
      if (out.length === 3) return;
      const item = getItem(id);
      if (!item) continue;
      const other = ofItem(item);
      if (meanings(other).some((meaning) => taken.has(meaning))) continue;
      meanings(other).forEach((meaning) => taken.add(meaning));
      out.push(other);
    }
  };
  // From the same set first. Only a set too short to fill the choices borrows words
  // or phrases of the same kind from the rest of the content.
  take(shuffle(set.ids.filter((id) => id !== entry.id)));
  if (out.length < 3) {
    const phrase = canOrder(entry);
    take(shuffle([...items.keys()].filter((id) => !set.ids.includes(id) && (tilesOf(items.get(id).pt).length >= 3) === phrase)));
  }
  return out;
}

function choices(entry, dir, set) {
  const side = dir === 'pt-en' ? 'en' : 'pt';
  return shuffle([
    { text: entry[side], correct: true },
    ...distractors(entry, set).map((other) => ({ text: other[side], correct: false })),
  ]);
}

// The tiles in an order that is not already the answer.
function scrambled(tiles) {
  for (let tries = 0; tries < 8; tries++) {
    const mixed = shuffle(tiles);
    if (mixed.join(' ') !== tiles.join(' ')) return mixed;
  }
  return tiles.slice().reverse();
}

// ---- a session

// Which kinds a set can offer at all: word order needs sentences, listening needs a voice.
export function modesFor(set) {
  const sample = set.kind === 'gen' ? generate(set, 6) : set.ids.map((id) => getItem(id)).filter(Boolean).map(ofItem);
  return {
    choose: true, type: true,
    listen: speech.supported,
    order: sample.some(canOrder),
  };
}

// The ticked kinds that can ask this entry.
const kindsFor = (entry, modes) => modes.filter((kind) => (
  kind === 'order' ? canOrder(entry) : kind === 'listen' ? speech.supported : true
));

function prepare(entry, modes, dir, set) {
  const kinds = kindsFor(entry, modes);
  const kind = kinds[rand(kinds.length)];
  let way = dir === 'both' ? (rand(2) ? 'pt-en' : 'en-pt') : dir;
  if (kind === 'order') way = 'en-pt';
  const question = { ...entry, mode: kind, dir: way };
  if (kind === 'choose' || kind === 'listen') question.options = choices(entry, way, set);
  if (kind === 'order') question.bank = scrambled(entry.tiles);
  return question;
}

// "only" narrows a word list to those words: the ones missed in the session before.
// More questions than words: the words come round after round, each round in a new
// order, so every word is asked as often as the others, give or take one. The same
// word never comes twice running where two rounds meet.
function inRounds(pool, count) {
  const out = [];
  while (pool.length && out.length < count) {
    const round = shuffle(pool);
    if (out.length && round.length > 1 && round[0].id === out.at(-1).id) [round[0], round[1]] = [round[1], round[0]];
    out.push(...round.slice(0, count - out.length));
  }
  return out;
}

// How many words of a set the ticked kinds can ask: what "all" means for it.
export function poolSize(set, modes) {
  if (!set || set.kind !== 'list') return 0;
  return set.ids.map((id) => getItem(id)).filter(Boolean).map(ofItem).filter((entry) => kindsFor(entry, modes).length > 0).length;
}

// modes: the kinds of exercise ticked. Each question is one of them, chosen at random
// among those that can ask it; a word none of them can ask is left out.
export function buildSession(setId, { modes, dir, length }, only) {
  const found = getSet(setId);
  if (!found || !modes?.length) return null;
  const set = only && found.kind === 'list' ? { ...found, ids: only, ordered: false } : found;
  const askable = (entry) => kindsFor(entry, modes).length > 0;
  let entries;
  if (set.kind === 'gen') {
    entries = generate(set, length || 20, askable);
  } else {
    const pool = set.ids.map((id) => getItem(id)).filter(Boolean).map(ofItem).filter(askable);
    if (length > pool.length) {
      entries = inRounds(pool, length);
    } else {
      // The weakest or oldest words are chosen in order, then asked in any order.
      const picked = set.ordered ? pool : shuffle(pool);
      entries = shuffle(length ? picked.slice(0, length) : picked);
    }
  }
  if (!entries.length) return null;
  return {
    setId, title: set.title, modes, dir, set,
    queue: entries.map((entry) => prepare(entry, modes, dir, set)),
  };
}

// A wrong answer comes back once at the end: the same kind of question, asked afresh.
export function again(question, set) {
  const { mode, dir, options, bank, retry, ...entry } = question;
  return { ...prepare(entry, [mode], dir, set), retry: true };
}

// ---- judging

// Every word the app knows, in each language and without accents: what tells a typo
// ("diaa") from another word ("ela" for "ele"). Built once, and again when the user adds a word.
let known = null;
function vocabulary() {
  const ownCount = Object.keys(state.own).length;
  if (known && known.ownCount === ownCount) return known;
  const pt = new Set([...NUMBER_WORDS, 'meia', 'meio', 'hora', 'horas', 'uma', 'duas', 'são', 'é', 'para', 'as'].map(stripAccents));
  const en = new Set();
  for (const item of [...items.values(), ...Object.values(state.own)]) {
    for (const form of alternatives(item.pt)) stripAccents(clean(form)).split(' ').forEach((word) => pt.add(word));
    for (const form of alternatives(item.en)) cleanEn(form).split(' ').forEach((word) => en.add(word));
  }
  known = { ownCount, pt, en };
  return known;
}

export function judge(question, answer) {
  if (question.mode === 'choose' || question.mode === 'listen') return { ok: !!answer.correct };
  if (question.mode === 'order') return checkPt(answer.join(' '), question.ptAccept, { strict: true });
  const words = vocabulary();
  if (question.dir === 'en-pt') {
    return checkPt(answer, question.ptAccept, { strict: state.settings.strictAccents, isWord: (word) => words.pt.has(word) });
  }
  return question.digits ? checkDigits(answer, question.en) : checkEn(answer, question.enAccept, (word) => words.en.has(word));
}
