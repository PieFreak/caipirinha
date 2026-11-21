// What the phone remembers: the library with each word's history, the day's new
// words, the log of sessions and the settings. One document in the phone's own
// storage, written on every change. Nothing leaves the phone.
import { reactive, computed } from 'vue';
import { items, groups, groupsById, courseOrder, COMMON } from './content/index.js';
import { idOf } from './lib/text.js';
import { nextScore } from './lib/score.js';

const KEY = 'caipirinha.v1';

const fresh = () => ({
  v: 1,
  words: {},     // id → { added, src, n, ok, bad, s, last, hist }
  own: {},       // id → { id, pt, en, note } for words the user added
  daily: { date: '', ids: [] },
  days: {},      // 'YYYY-MM-DD' → { n, ok, added }
  sessions: [],  // newest last: { t, set, title, modes, dir, n, ok }
  gen: {},       // generated sets (counting, clock) → { n, ok, recent }
  settings: {
    perDay: 5, source: 'course', strictAccents: false, autoSpeak: true, voice: '', rate: 0.9,
    modes: ['choose', 'type', 'listen', 'order'], dir: 'both', share: 25, length: 10,
  },
});

// Settings read from the phone or from a backup, on top of today's defaults. An earlier
// version kept one way of practising ("mode"): it becomes the kinds of exercise ticked.
// share: how much of a set of words a session asks, in percent (200: every word twice).
// length: how many questions a session of counting or clock times has.
function settingsOf(stored = {}) {
  const { mode, ...kept } = stored;
  const settings = { ...fresh().settings, ...kept };
  if (!Array.isArray(kept.modes)) settings.modes = !mode || mode === 'mixed' ? fresh().settings.modes : [mode];
  // The length of a session was a number, with 0 for all and -2 for all twice: now a share.
  if (kept.share === undefined && kept.length === 0) settings.share = 100;
  if (kept.share === undefined && kept.length === -2) settings.share = 200;
  if (!(settings.length > 0)) settings.length = fresh().settings.length;
  return settings;
}

function load() {
  const base = fresh();
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (stored && typeof stored === 'object') {
      return { ...base, ...stored, settings: settingsOf(stored.settings) };
    }
  } catch {
    // Unreadable storage: start empty instead of failing to open.
  }
  return base;
}

export const state = reactive(load());
export const ui = reactive({ saveFailed: false, updateReady: false });

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

export const getItem = (id) => items.get(id) || state.own[id] || null;

export const librarySize = computed(() => Object.keys(state.words).length);

// Puts a word in the library the first time it is met.
function touch(id, src) {
  if (!state.words[id]) {
    state.words[id] = { added: Date.now(), src, n: 0, ok: 0, bad: 0, s: 0, last: 0, hist: '' };
    day().added++;
  }
  return state.words[id];
}

// An answer moves how well the word is known (lib/score.js: +10% right, −15% wrong).
export function record(id, ok) {
  const word = touch(id, 'practice');
  word.s = nextScore(word.n === 0 ? null : word.s, ok);
  word.n++;
  if (ok) word.ok++; else word.bad++;
  word.last = Date.now();
  word.hist = (word.hist + (ok ? '1' : '0')).slice(-12);
  const today = day();
  today.n++;
  if (ok) today.ok++;
  save();
}

// Counting and clock times have no words of their own: the set keeps its latest 50 answers.
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

export const scoreOf = (id) => {
  const word = state.words[id];
  return word && word.n ? word.s : null;
};

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

function pickNew(count) {
  const picked = [];
  for (const groupId of sourceOrder()) {
    for (const id of groupsById[groupId].items) {
      if (state.words[id] || picked.includes(id)) continue;
      picked.push(id);
      if (picked.length === count) return picked;
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

export const sourceChoices = computed(() => [
  { id: 'course', title: 'The suggested order' },
  { id: 'common', title: 'Most common words' },
  ...groups.filter((group) => group.items && group.section !== COMMON).map((group) => ({ id: group.id, title: group.title })),
]);

// ---- the user's own words

export function addOwn({ pt, en, note }) {
  const id = idOf(pt);
  if (!id || !en.trim()) return { error: 'Write both the Portuguese and its meaning.' };
  if (getItem(id)) {
    if (state.words[id]) return { error: `"${getItem(id).pt}" is already in your library.` };
    touch(id, 'own');
    save();
    return { id, existing: true };
  }
  state.own[id] = { id, pt: pt.trim(), en: en.trim(), note: (note || '').trim(), say: '', g: '', groups: ['own'] };
  touch(id, 'own');
  save();
  return { id };
}

// Takes a word out of the library with its history; an own word is deleted.
export function removeWord(id) {
  delete state.words[id];
  delete state.own[id];
  state.daily.ids = state.daily.ids.filter((other) => other !== id);
  save();
}

// ---- sets: what a session can be about

const libraryIds = () => Object.keys(state.words).filter(getItem);

const weakest = () => libraryIds()
  .filter((id) => state.words[id].bad > 0)
  .sort((a, b) => state.words[a].s - state.words[b].s || state.words[b].bad - state.words[a].bad);

const longestAgo = () => libraryIds()
  .sort((a, b) => (state.words[a].last || state.words[a].added) - (state.words[b].last || state.words[b].added));

export const LIBRARY_SETS = [
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
    const ids = id === 'lib:weak' ? weakest()
      : id === 'lib:old' ? longestAgo()
      : id === 'lib:own' ? libraryIds().filter((wordId) => state.own[wordId])
      : libraryIds();
    return { ...own, kind: 'list', ids, ordered: id === 'lib:weak' || id === 'lib:old' };
  }
  const group = groupsById[id];
  if (!group) return null;
  return group.gen
    ? { ...group, kind: 'gen' }
    : { id, title: group.title, about: group.about, kind: 'list', ids: group.items };
}

// How a set stands: for a word list the average of how well its words are known
// (a word never practised counts as zero); for counting, the latest 50 answers.
export function setStats(set) {
  if (set.kind === 'gen') {
    const entry = state.gen[set.id];
    if (!entry || !entry.recent) return { pct: null, score: null, practised: 0, total: 0 };
    const right = [...entry.recent].filter((c) => c === '1').length;
    const score = right / entry.recent.length;
    return { pct: Math.round(score * 100), score, practised: entry.n, total: 0 };
  }
  const total = set.ids.length;
  let practised = 0;
  let sum = 0;
  for (const id of set.ids) {
    const word = state.words[id];
    if (word && word.n) { practised++; sum += word.s; }
  }
  const score = practised ? sum / total : null;
  return { pct: practised ? Math.round(score * 100) : null, score, practised, total };
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

export function importData(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'That file is not a backup of this app.' };
  }
  const stored = data && data.app === 'caipirinha' && data.state;
  if (!stored || typeof stored.words !== 'object' || !Array.isArray(stored.sessions)) {
    return { error: 'That file is not a backup of this app.' };
  }
  const base = fresh();
  Object.assign(state, base, stored, { settings: settingsOf(stored.settings) });
  save();
  return { words: Object.keys(state.words).length };
}

export function resetAll() {
  Object.assign(state, fresh());
  save();
}
