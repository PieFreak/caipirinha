// Reading content lines and judging typed answers. No DOM, no state: tested in tests/.

export const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Lowercase, no punctuation, single spaces. A hyphen counts as a space.
export function clean(s) {
  return String(s).toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?¿¡;:"“”…()]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "obrigado / obrigada" holds two forms that are both right.
export const alternatives = (text) => String(text).split(' / ').map((s) => s.trim()).filter(Boolean);

// The meaning as shown: "one / 1" reads "one" (the digit is only there to be accepted),
// and of two wordings that count as the same ("I'm lost / I am lost") only the first is shown.
export function shownEn(en) {
  const forms = alternatives(en);
  const worded = forms.filter((form) => !/^\d+$/.test(form));
  const seen = new Set();
  return (worded.length ? worded : forms)
    .filter((form) => !seen.has(cleanEn(form)) && seen.add(cleanEn(form)))
    .join(' / ');
}

export const withoutBrackets =(s) => String(s).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

// A word is known by its Portuguese text: the same word in two groups is one word.
// Text with nothing in it (only spaces) has no id.
export const idOf = (pt) => {
  const first = alternatives(pt)[0];
  return first ? clean(first) : '';
};

// The words of a phrase as tiles, for the word-order exercise.
export const tilesOf = (pt) => (alternatives(pt)[0] || '').replace(/[.,!?¿¡;:"“”…]/g, '').split(/\s+/).filter(Boolean);

// One content line: pt [(m)|(f)|(m/f)] = en [~ how it sounds] [# note]
export function parseLines(text) {
  const out = [];
  for (const raw of String(text).split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('//')) continue;
    let note = '';
    let say = '';
    let at = line.indexOf(' # ');
    if (at >= 0) { note = line.slice(at + 3).trim(); line = line.slice(0, at); }
    at = line.indexOf(' ~ ');
    if (at >= 0) { say = line.slice(at + 3).trim(); line = line.slice(0, at); }
    at = line.indexOf(' = ');
    if (at < 0) throw new Error(`Content line without " = ": ${raw}`);
    let pt = line.slice(0, at).trim();
    const en = line.slice(at + 3).trim();
    let g = '';
    const tag = pt.match(/\s\((m|f|m\/f)\)$/);
    if (tag) { g = tag[1]; pt = pt.slice(0, tag.index).trim(); }
    if (!pt || !en) throw new Error(`Content line with an empty side: ${raw}`);
    out.push({ id: idOf(pt), pt, en, say, note, g });
  }
  return out;
}

const CONTRACTIONS = [
  [/\bcan't\b/g, 'cannot'], [/\bcan not\b/g, 'cannot'], [/\bwon't\b/g, 'will not'],
  [/\bi'm\b/g, 'i am'], [/\blet's\b/g, 'let us'],
  [/\b(it|what|where|that|there|how|he|she|who|here)'s\b/g, '$1 is'],
  [/n't\b/g, ' not'], [/'re\b/g, ' are'], [/'ll\b/g, ' will'], [/'ve\b/g, ' have'], [/'d\b/g, ' would'],
];

// English as compared: "(for work)" does not count, "I'm" is "I am",
// and a leading "to", "the", "a" or "an" may be left out.
export function cleanEn(s) {
  let text = clean(withoutBrackets(s));
  for (const [from, to] of CONTRACTIONS) text = text.replace(from, to);
  return text.replace(/^(to|the|a|an) /, '').replace(/\s+/g, ' ').trim();
}

// The same meaning, compared with its clarifier: "to be (permanent)" and "to be (temporary)"
// are two meanings here, where cleanEn makes them one. For telling synonyms apart.
export function meaningKey(s) {
  let text = clean(s);
  for (const [from, to] of CONTRACTIONS) text = text.replace(from, to);
  return text.replace(/^(to|the|a|an) /, '').replace(/\s+/g, ' ').trim();
}

// The short forms Brazilians say, read as what they stand for, so "tô com fome" is
// "estou com fome". PLAIN holds the same without accents, for answers typed without them.
const SPOKEN = { 'tô': 'estou', 'tá': 'está', 'tava': 'estava', 'tavam': 'estavam', 'pra': 'para', 'pras': 'para as',
  'pro': 'para o', 'pros': 'para os', 'cê': 'você', 'cês': 'vocês' };
const PLAIN = { to: 'estou', ta: 'esta', tava: 'estava', tavam: 'estavam', pra: 'para', pras: 'para as',
  pro: 'para o', pros: 'para os', ce: 'voce', ces: 'voces' };
const spoken = (text, table) => text.split(' ').map((word) => table[word] || word).join(' ');

// Portuguese drops "eu" freely: "não entendo" is "eu não entendo".
const cleanPt = (s) => spoken(clean(s), SPOKEN).replace(/^eu /, '');
const plainPt = (s) => spoken(stripAccents(clean(s)), PLAIN).replace(/^eu /, '');

// How far apart two texts are, in slips of the finger: a letter added, dropped or
// replaced, or two neighbours swapped.
export function distance(a, b) {
  let before = null;
  let last = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      let best = Math.min(last[j] + 1, row[j - 1] + 1, last[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, before[j - 2] + 1);
      row.push(best);
    }
    before = last;
    last = row;
  }
  return last[b.length];
}

// A typo is forgiven: one slip in an answer of 2 to 8 letters, two in a longer one,
// none in a single letter. But not when what was typed is itself a word ("ela" for "ele",
// "ou" for "oi", "setenta" for "sessenta"): that is another word, not a slip. isWord says
// what a word is. Nor when a whole word is missing or added ("meu nome ana" for "meu nome
// é ana"): only a space may go missing or turn up ("bomdia").
function isSlip(typed, form, isWord) {
  const letters = form.replace(/ /g, '').length;
  const allowed = letters <= 1 ? 0 : letters <= 8 ? 1 : 2;
  if (!allowed || Math.abs(typed.length - form.length) > allowed || distance(typed, form) > allowed) return false;
  if (typed.split(' ').length !== form.split(' ').length && typed.replace(/ /g, '') !== form.replace(/ /g, '')) return false;
  const expected = new Set(form.split(' '));
  return !typed.split(' ').some((word) => !expected.has(word) && isWord(stripAccents(word)));
}

// A typed Portuguese answer. Missing accents are a slip, not an error, unless strict:
// the result then names the accented form, so the screen can show it. With isWord
// (word → is it a Portuguese word the app knows?) a typo counts as right too, and is named.
// With isExact (the same, with accents as written) an accent that makes another word is
// not a slip: "avô" (grandfather) for "avó", "esta" (this) for "está" (is). The result is
// then close, not right: the screen may give one more try.
export function checkPt(input, accepted, { strict = false, isWord = null, isExact = null } = {}) {
  const typed = cleanPt(input);
  if (!typed) return { ok: false };
  for (const form of accepted) if (cleanPt(form) === typed) return { ok: true };
  const bare = plainPt(input);
  for (const form of accepted) {
    if (plainPt(form) !== bare) continue;
    const want = cleanPt(form).split(' ');
    const other = isExact ? typed.split(' ').filter((word, i) => word !== want[i] && isExact(word)) : [];
    if (other.length) return { ok: false, close: form, other };
    return { ok: !strict, accents: form };
  }
  if (isWord) {
    // When accents count, a missing one is one of the slips; otherwise accents are left out of it.
    const plain = strict ? (s) => s : stripAccents;
    for (const form of accepted) if (isSlip(plain(typed), plain(cleanPt(form)), isWord)) return { ok: true, typo: form };
  }
  return { ok: false };
}

export function checkEn(input, accepted, isWord = null) {
  const typed = cleanEn(input);
  if (!typed) return { ok: false };
  if (accepted.some((form) => cleanEn(form) === typed)) return { ok: true };
  if (isWord) {
    for (const form of accepted) if (isSlip(typed, cleanEn(form), isWord)) return { ok: true, typo: form };
  }
  return { ok: false };
}

// A number or a clock time typed in digits: only the digits count ("3:30" is "330").
// expected may list several ways: three o'clock is "3:00" and also just "3".
export function checkDigits(input, expected) {
  const digits = (s) => String(s).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const typed = digits(input);
  return { ok: typed !== '' && [].concat(expected).some((form) => digits(form) === typed) };
}
