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
export const idOf = (pt) => clean(alternatives(pt)[0]);

// The words of a phrase as tiles, for the word-order exercise.
export const tilesOf = (pt) => alternatives(pt)[0].replace(/[.,!?¿¡;:"“”…]/g, '').split(/\s+/).filter(Boolean);

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

// Portuguese drops "eu" freely: "não entendo" is "eu não entendo".
const cleanPt = (s) => clean(s).replace(/^eu /, '');

// A typed Portuguese answer. Missing accents are a slip, not an error, unless strict:
// the result then names the accented form, so the screen can show it.
export function checkPt(input, accepted, strict = false) {
  const typed = cleanPt(input);
  if (!typed) return { ok: false };
  for (const form of accepted) if (cleanPt(form) === typed) return { ok: true };
  const bare = stripAccents(typed);
  for (const form of accepted) {
    if (stripAccents(cleanPt(form)) === bare) return { ok: !strict, accents: form };
  }
  return { ok: false };
}

export function checkEn(input, accepted) {
  const typed = cleanEn(input);
  return { ok: !!typed && accepted.some((form) => cleanEn(form) === typed) };
}

// A number or a clock time typed in digits: only the digits count ("3:30" is "330").
export function checkDigits(input, expected) {
  const digits = (s) => String(s).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return { ok: digits(input) !== '' && digits(input) === digits(expected) };
}
