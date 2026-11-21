// What the phone remembers: the library with each word's history, the day's new
// words, the log of sessions and the settings. One document in the phone's own
// storage, written on every change. Nothing leaves the phone.
import { reactive, computed } from 'vue';
import { items, groups, groupsById, courseOrder, COMMON } from './content/index.js';
import RENAMES from './content/renames.js';
import { alternatives, clean, idOf } from './lib/text.js';
import { faded, nextScore } from './lib/score.js';
import { COUNTS, SHARES } from './lib/lengths.js';

const KEY = 'caipirinha.v1';
const UNDO_KEY = 'caipirinha.v1.before-restore';
const MODES = ['choose', 'type', 'listen', 'order'];

const fresh = () => ({
  v: 1,
  words: {},     // id → { added, src, n, ok, bad, s, last, hist, known?, t: [pt, en] }
  own: {},       // id → { id, pt, en, note } for words the user added
  daily: { date: '', ids: [] },
  days: {},      // 'YYYY-MM-DD' → { n, ok, added }
  sessions: [],  // newest last: { t, set, title, modes, dir, n, ok }
  gen: {},       // generated sets (counting, clock, verbs) → { n, ok, recent }
  settings: {
    perDay: 5, source: 'course', strictAccents: false, autoSpeak: true, voice: '', rate: 0.9,
    modes: MODES.slice(), dir: 'both', share: 25, length: 10,
  },
});

// ---- reading what was stored: from the phone, or from a backup file

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const number = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const count = (value) => Math.max(0, Math.floor(number(value)));
const text = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

// Settings, on top of today's defaults: anything missing or out of range takes the default.
// An earlier version kept one way of practising ("mode") and a number of questions with
// 0 for all and -2 for all twice; they are read as what they meant.
function settingsOf(stored) {
  const base = fresh().settings;
  const s = isObject(stored) ? stored : {};
  const modes = Array.isArray(s.modes) ? MODES.filter((mode) => s.modes.includes(mode))
    : MODES.includes(s.mode) ? [s.mode] : [];
  let share = s.share;
  if (share === undefined && s.length === 0) share = 100;
  if (share === undefined && s.length === -2) share = 200;
  return {
    perDay: oneOf(s.perDay, [3, 5, 10], base.perDay),
    source: text(s.source, base.source),
    strictAccents: typeof s.strictAccents === 'boolean' ? s.strictAccents : base.strictAccents,
    autoSpeak: typeof s.autoSpeak === 'boolean' ? s.autoSpeak : base.autoSpeak,
    voice: text(s.voice),
    rate: Number.isFinite(s.rate) && s.rate >= 0.5 && s.rate <= 1.5 ? s.rate : base.rate,
    modes: modes.length ? modes : base.modes,
    dir: oneOf(s.dir, ['both', 'pt-en', 'en-pt'], base.dir),
    share: oneOf(share, SHARES, base.share),
    length: oneOf(s.length, COUNTS, base.length),
  };
}

function wordOf(stored) {
  const word = {
    added: number(stored.added, Date.now()), src: text(stored.src, 'practice'),
    n: count(stored.n), ok: count(stored.ok), bad: count(stored.bad),
    s: Math.min(1, Math.max(0, number(stored.s))), last: number(stored.last), hist: text(stored.hist).replace(/[^01]/g, '').slice(-12),
  };
  if (Number.isFinite(stored.known)) word.known = stored.known;
  if (Array.isArray(stored.t) && typeof stored.t[0] === 'string' && typeof stored.t[1] === 'string') word.t = stored.t.slice(0, 2);
  return word;
}

// Whatever was stored, as a state the app can run on: every field checked, anything
// damaged left out, never a failure to open.
function repair(stored) {
  const base = fresh();
  if (!isObject(stored)) return base;
  const words = {};
  if (isObject(stored.words)) {
    for (const [id, word] of Object.entries(stored.words)) if (id && isObject(word)) words[id] = wordOf(word);
  }
  const own = {};
  if (isObject(stored.own)) {
    for (const word of Object.values(stored.own)) {
      if (!isObject(word)) continue;
      const pt = text(word.pt).trim();
      const en = text(word.en).trim();
      const id = idOf(pt);
      if (id && en) own[id] = { id, pt, en, note: text(word.note).trim(), say: '', g: '', groups: ['own'] };
    }
  }
  const daily = isObject(stored.daily) && typeof stored.daily.date === 'string' && Array.isArray(stored.daily.ids)
    ? { date: stored.daily.date, ids: stored.daily.ids.filter((id) => typeof id === 'string') } : base.daily;
  const days = {};
  if (isObject(stored.days)) {
    for (const [key, d] of Object.entries(stored.days)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && isObject(d)) days[key] = { n: count(d.n), ok: count(d.ok), added: count(d.added) };
    }
  }
  const sessions = Array.isArray(stored.sessions) ? stored.sessions
    .filter((s) => isObject(s) && Number.isFinite(s.t) && count(s.n) > 0)
    .map((s) => ({ t: s.t, set: text(s.set), title: text(s.title), modes: Array.isArray(s.modes) ? s.modes : undefined,
      mode: typeof s.mode === 'string' ? s.mode : undefined, dir: text(s.dir), n: count(s.n), ok: Math.min(count(s.ok), count(s.n)) }))
    .slice(-400) : [];
  const gen = {};
  if (isObject(stored.gen)) {
    for (const [key, g] of Object.entries(stored.gen)) {
      if (isObject(g)) gen[key] = { n: count(g.n), ok: count(g.ok), recent: text(g.recent).replace(/[^01]/g, '').slice(-50) };
    }
  }
  const state = { ...base, words, own, daily, days, sessions, gen, settings: settingsOf(stored.settings) };
  renamed(state);
  remember(state);
  return state;
}

// When a word's Portuguese is corrected in an update, its id changes: content/renames.js
// says which old id became which, and the history follows the word.
function renamed(state) {
  for (const [from, to] of Object.entries(RENAMES)) {
    const old = state.words[from];
    if (!old) continue;
    const now = state.words[to];
    if (!now || old.n > now.n) state.words[to] = old;
    delete state.words[from];
    state.daily.ids = state.daily.ids.map((id) => (id === from ? to : id));
  }
}

// Each word keeps a copy of its Portuguese and meaning, so a word the content no longer
// has stays in the library as it was.
function remember(state) {
  for (const [id, word] of Object.entries(state.words)) {
    const item = items.get(id) || state.own[id];
    if (item) word.t = [item.pt, item.en];
  }
}

function load() {
  try {
    return repair(JSON.parse(localStorage.getItem(KEY) || 'null'));
  } catch {
    return fresh();
  }
}

export const state = reactive(load());
export const ui = reactive({ saveFailed: false, updateReady: false });
// Bumped whenever the learner's own words change: what depends on them is built again.
export const ownRevision = { n: 0 };

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    ui.saveFailed = false;
  } catch {
    ui.saveFailed = true;
  }
}

export function dayKey(date = new Date()) {
  const two = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function day() {
  const key = dayKey();
  if (!state.days[key]) state.days[key] = { n: 0, ok: 0, added: 0 };
  return state.days[key];
}

// ---- words

const kept = (id) => {
  const word = state.words[id];
  return word && word.t ? { id, pt: word.t[0], en: word.t[1], say: '', note: '', g: '', groups: [] } : null;
};

export const getItem = (id) => items.get(id) || state.own[id] || kept(id);

export const librarySize = computed(() => Object.keys(state.words).filter((id) => getItem(id)).length);

// Puts a word in the library the first time it is met.
function touch(id, src) {
  if (!state.words[id]) {
    const item = getItem(id);
    state.words[id] = { added: Date.now(), src, n: 0, ok: 0, bad: 0, s: 0, last: 0, hist: '', t: item ? [item.pt, item.en] : undefined };
    day().added++;
  }
  return state.words[id];
}

// How well a word is known now, 0 to 1, or null before it has been practised or marked as
// known. It fades by 1% for each day since it was last practised (lib/score.js).
export function scoreOf(id) {
  const word = state.words[id];
  if (!word || !(word.n || word.known)) return null;
  return faded(word.s, word.last || word.known || word.added);
}

// An answer moves how well the word is known: +10% right, −15% wrong, from where it
// stands today (after fading).
export function record(id, ok) {
  const word = touch(id, 'practice');
  word.s = nextScore(scoreOf(id), ok);
  word.n++;
  if (ok) word.ok++; else word.bad++;
  word.last = Date.now();
  word.hist = (word.hist + (ok ? '1' : '0')).slice(-12);
  const today = day();
  today.n++;
  if (ok) today.ok++;
  save();
}

// Counting, clock times and verbs have no words of their own: the set keeps its latest 50 answers.
export function recordGen(setId, ok) {
  const entry = state.gen[setId] || (state.gen[setId] = { n: 0, ok: 0, recent: '' });
  entry.n++;
  if (ok) entry.ok++;
  entry.recent = (entry.recent + (ok ? '1' : '0')).slice(-50);
  const today = day();
  today.n++;
  if (ok) today.ok++;
  save();
}

// "I know this": the word joins the library at 100%, without ten right answers.
export function markKnown(id) {
  const word = touch(id, 'known');
  word.s = 1;
  word.known = Date.now();
  word.last = Date.now();
  save();
}

// Red through yellow to green; gray for a word not yet practised.
export function shade(score, alpha = 1) {
  if (score == null) return alpha === 1 ? 'var(--unknown)' : 'var(--unknown-soft)';
  const hue = Math.round(4 + score * 126);
  return alpha === 1 ? `hsl(${hue} 64% 42%)` : `hsl(${hue} 64% 46% / ${alpha})`;
}

// ---- the day's new words

function sourceOrder() {
  const source = state.settings.source;
  if (source === 'common') {
    const common = groups.filter((group) => group.section === COMMON).map((group) => group.id);
    return [...common, ...courseOrder];
  }
  return groupsById[source]?.items ? [source, ...courseOrder] : courseOrder;
}

function pickNew(count, skip = []) {
  const picked = [];
  if (!(count > 0)) return picked;
  for (const groupId of sourceOrder()) {
    for (const id of groupsById[groupId]?.items || []) {
      if (state.words[id] || picked.includes(id) || skip.includes(id)) continue;
      picked.push(id);
      if (picked.length >= count) return picked;
    }
  }
  return picked;
}

// Once per calendar day: the next words not yet in the library join it.
export function ensureDaily() {
  const key = dayKey();
  if (state.daily.date === key) return;
  const ids = pickNew(state.settings.perDay);
  state.daily = { date: key, ids };
  ids.forEach((id) => touch(id, 'daily'));
  save();
}

export function moreToday() {
  const ids = pickNew(state.settings.perDay);
  ids.forEach((id) => touch(id, 'daily'));
  state.daily.ids.push(...ids);
  save();
  return ids.length;
}

// "I know this" on one of today's new words: it is marked as known and another new word
// takes its place. What it returns undoes it.
export function knowToday(id) {
  const before = state.words[id] ? { ...state.words[id] } : null;
  const ids = state.daily.ids.slice();
  markKnown(id);
  const [next] = pickNew(1);
  state.daily.ids = state.daily.ids.flatMap((other) => (other !== id ? [other] : next ? [next] : []));
  if (next) touch(next, 'daily');
  save();
  return () => {
    if (before) state.words[id] = before; else delete state.words[id];
    if (next && state.words[next] && !state.words[next].n && !state.words[next].known) {
      delete state.words[next];
      day().added = Math.max(0, day().added - 1);
    }
    state.daily.ids = ids;
    save();
  };
}

export const sourceChoices = computed(() => [
  { id: 'course', title: 'The suggested order' },
  { id: 'common', title: 'Most common words' },
  ...groups.filter((group) => group.items && group.section !== COMMON).map((group) => ({ id: group.id, title: group.title })),
]);

// ---- the user's own words

// Every form of every word, to its id: "obrigada" finds "obrigado / obrigada".
let formIndex = null;
function formsIndex() {
  if (formIndex && formIndex.revision === ownRevision.n) return formIndex.map;
  const map = new Map();
  for (const item of [...items.values(), ...Object.values(state.own)]) {
    for (const form of alternatives(item.pt)) if (!map.has(clean(form))) map.set(clean(form), item.id);
  }
  formIndex = { revision: ownRevision.n, map };
  return map;
}

// The id of a word the app already has with this Portuguese, in any of its forms.
export function findId(pt) {
  const map = formsIndex();
  for (const form of alternatives(pt)) {
    const id = map.get(clean(form));
    if (id) return id;
  }
  return null;
}

export function addOwn({ pt, en, note }) {
  const portuguese = String(pt || '').trim();
  const meaning = String(en || '').trim();
  const id = idOf(portuguese);
  if (!id) return { error: 'Write the Portuguese.' };
  const existing = findId(portuguese);
  if (existing) {
    if (state.words[existing]) return { error: `"${getItem(existing).pt}" is already in your library.` };
    touch(existing, 'own');
    save();
    return { id: existing, existing: true };
  }
  if (!meaning) return { error: 'Write what it means.' };
  state.own[id] = { id, pt: portuguese, en: meaning, note: String(note || '').trim(), say: '', g: '', groups: ['own'] };
  ownRevision.n++;
  touch(id, 'own');
  save();
  return { id };
}

// Changes a word the learner added. A new spelling is a new id: the history moves with it.
export function editOwn(id, { pt, en, note }) {
  const old = state.own[id];
  if (!old) return { error: 'Only the words you added can be changed.' };
  const portuguese = String(pt || '').trim();
  const meaning = String(en || '').trim();
  const nextId = idOf(portuguese);
  if (!nextId || !meaning) return { error: 'Write both the Portuguese and its meaning.' };
  const clash = findId(portuguese);
  if (clash && clash !== id) return { error: `"${getItem(clash).pt}" is already in the app.` };
  delete state.own[id];
  state.own[nextId] = { ...old, id: nextId, pt: portuguese, en: meaning, note: String(note || '').trim() };
  if (nextId !== id && state.words[id]) {
    state.words[nextId] = state.words[id];
    delete state.words[id];
    state.daily.ids = state.daily.ids.map((other) => (other === id ? nextId : other));
  }
  if (state.words[nextId]) state.words[nextId].t = [portuguese, meaning];
  ownRevision.n++;
  save();
  return { id: nextId };
}

// Takes a word out of the library with its history; an own word is deleted.
export function removeWord(id) {
  delete state.words[id];
  if (state.own[id]) {
    delete state.own[id];
    ownRevision.n++;
  }
  state.daily.ids = state.daily.ids.filter((other) => other !== id);
  save();
}

// ---- sets: what a session can be about

const libraryIds = () => Object.keys(state.words).filter(getItem);
const practised = () => libraryIds().filter((id) => scoreOf(id) != null);
const lastSeen = (id) => state.words[id].last || state.words[id].added;

const weakest = () => libraryIds()
  .filter((id) => state.words[id].bad > 0)
  .sort((a, b) => scoreOf(a) - scoreOf(b) || state.words[b].bad - state.words[a].bad);

const longestAgo = () => libraryIds().sort((a, b) => lastSeen(a) - lastSeen(b));

// The daily review: the weakest words and those not seen for longest, in turn, up to 20.
export const REVIEW_SIZE = 20;
function review() {
  const words = practised();
  const weak = words.filter((id) => scoreOf(id) < 0.9).sort((a, b) => scoreOf(a) - scoreOf(b));
  const old = words.slice().sort((a, b) => lastSeen(a) - lastSeen(b));
  const picked = [];
  for (let i = 0; picked.length < REVIEW_SIZE && (i < weak.length || i < old.length); i++) {
    for (const id of [weak[i], old[i]]) if (id && !picked.includes(id) && picked.length < REVIEW_SIZE) picked.push(id);
  }
  return picked;
}

export const LIBRARY_SETS = [
  { id: 'lib:review', title: 'Daily review', about: 'Your weakest words and those you have not seen for longest, up to 20.' },
  { id: 'lib:weak', title: 'Most mistakes', about: 'The words you get wrong most, weakest first.' },
  { id: 'lib:old', title: 'Longest since practised', about: 'The words you have not seen for the longest time.' },
  { id: 'lib:all', title: 'Whole library, random', about: 'Any word you have met, in random order.' },
  { id: 'lib:own', title: 'Words I added', about: 'The words you put in yourself.' },
];

export function getSet(id) {
  if (id === 'today') {
    return { id, title: "Today's new words", kind: 'list', ids: state.daily.ids.filter(getItem), about: '' };
  }
  const own = LIBRARY_SETS.find((set) => set.id === id);
  if (own) {
    const ids = id === 'lib:review' ? review()
      : id === 'lib:weak' ? weakest()
      : id === 'lib:old' ? longestAgo()
      : id === 'lib:own' ? libraryIds().filter((wordId) => state.own[wordId])
      : libraryIds();
    return { ...own, kind: 'list', ids, ordered: id !== 'lib:all' && id !== 'lib:own' };
  }
  const group = groupsById[id];
  if (!group) return null;
  return group.gen
    ? { ...group, kind: 'gen' }
    : { id, title: group.title, about: group.about, kind: 'list', ids: group.items };
}

// How a set stands: for a word list the average of how well its words are known now
// (a word never practised counts as zero); for counting and verbs, the latest 50 answers.
export function setStats(set) {
  if (set.kind === 'gen') {
    const entry = state.gen[set.id];
    if (!entry || !entry.recent) return { pct: null, score: null, practised: 0, total: 0 };
    const right = [...entry.recent].filter((c) => c === '1').length;
    const score = right / entry.recent.length;
    return { pct: Math.round(score * 100), score, practised: entry.n, total: 0 };
  }
  const total = set.ids.length;
  let done = 0;
  let sum = 0;
  for (const id of set.ids) {
    const score = scoreOf(id);
    if (score != null) { done++; sum += score; }
  }
  const score = done ? sum / total : null;
  return { pct: done ? Math.round(score * 100) : null, score, practised: done, total };
}

// ---- the log

export function logSession(entry) {
  state.sessions.push({ t: Date.now(), ...entry });
  if (state.sessions.length > 400) state.sessions.splice(0, state.sessions.length - 400);
  save();
}

// ---- backup

export function exportData() {
  return JSON.stringify({ app: 'caipirinha', exported: new Date().toISOString(), state }, null, 1);
}

// Reads a backup file without changing anything: what it holds, or why it cannot be used.
export function readBackup(contents) {
  let data;
  try {
    data = JSON.parse(contents);
  } catch {
    return { error: 'That file is not a backup of this app.' };
  }
  if (!isObject(data) || data.app !== 'caipirinha' || !isObject(data.state) || !isObject(data.state.words)) {
    return { error: 'That file is not a backup of this app.' };
  }
  const restored = repair(data.state);
  const exported = Date.parse(data.exported);
  return {
    state: restored,
    words: Object.keys(restored.words).length,
    sessions: restored.sessions.length,
    exported: Number.isFinite(exported) ? exported : null,
  };
}

// Puts a backup in place. What was on the device is kept aside until the next restore,
// so the restore can be undone.
export function applyBackup(restored) {
  try {
    localStorage.setItem(UNDO_KEY, JSON.stringify(state));
  } catch {
    // No room for the copy: the restore still goes ahead.
  }
  Object.assign(state, restored);
  ownRevision.n++;
  save();
}

export const canUndoRestore = () => {
  try {
    return !!localStorage.getItem(UNDO_KEY);
  } catch {
    return false;
  }
};

export function undoRestore() {
  try {
    const before = localStorage.getItem(UNDO_KEY);
    if (!before) return false;
    Object.assign(state, repair(JSON.parse(before)));
    localStorage.removeItem(UNDO_KEY);
    ownRevision.n++;
    save();
    return true;
  } catch {
    return false;
  }
}

export function resetAll() {
  Object.assign(state, fresh());
  ownRevision.n++;
  save();
}

// For tests: the same repair a stored state goes through on loading.
export const repairForTest = repair;
