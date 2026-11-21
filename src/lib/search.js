// Finding what the app already has while a new word is being typed. Tested in tests/.
import { alternatives, clean, cleanEn, stripAccents } from './text.js';

const plain = (text) => stripAccents(clean(text));

// The words and phrases that match the Portuguese typed so far, best first:
//   the very same text (same: adding it again would be a duplicate),
//   the same but for its accents ("voce" for "você"; it may also be another word, as "avó" and "avô"),
//   those that start with it ("bom di" finds "bom dia"),
//   those with a word that starts with it ("dia" finds "bom dia"),
//   those that contain it.
// Two letters are needed before anything is shown: one letter matches half the app.
export function findExisting(typed, entries, limit = 6) {
  const exact = clean(typed);
  const query = plain(typed);
  if (query.length < 2) return [];
  const found = [];
  for (const entry of entries) {
    let rank = 0;
    for (const form of alternatives(entry.pt)) {
      const text = plain(form);
      const here = clean(form) === exact ? 5
        : text === query ? 4
        : text.startsWith(query) ? 3
        : ` ${text}`.includes(` ${query}`) ? 2
        : text.includes(query) ? 1 : 0;
      rank = Math.max(rank, here);
    }
    if (rank) found.push({ entry, rank, same: rank === 5 });
  }
  return found
    .sort((a, b) => b.rank - a.rank || a.entry.pt.length - b.entry.pt.length || a.entry.pt.localeCompare(b.entry.pt, 'pt'))
    .slice(0, limit);
}

// The words that already carry the meaning typed so far: the same meaning first, then
// those whose meaning starts with it. Three letters are needed.
export function findMeaning(typed, entries, limit = 4) {
  const query = cleanEn(typed);
  if (query.length < 3) return [];
  const found = [];
  for (const entry of entries) {
    let rank = 0;
    for (const form of alternatives(entry.en)) {
      const text = cleanEn(form);
      rank = Math.max(rank, text === query ? 2 : text.startsWith(query) ? 1 : 0);
    }
    if (rank) found.push({ entry, rank, same: rank === 2 });
  }
  return found
    .sort((a, b) => b.rank - a.rank || a.entry.pt.length - b.entry.pt.length || a.entry.pt.localeCompare(b.entry.pt, 'pt'))
    .slice(0, limit);
}
