// Clock times on a 12-hour dial in Brazilian Portuguese. Tested in tests/.
import { toWords } from './numbers.js';

// Hours are feminine ("as horas"): uma, duas. Twelve is said as noon.
const hour = (h) => (h === 12 ? 'meio-dia' : h === 1 ? 'uma' : h === 2 ? 'duas' : toWords(h));
const verb = (h) => (h === 1 || h === 12 ? 'é' : 'são');
// "quinze para as quatro", "para a uma", "para o meio-dia".
const towards = (h) => (h === 12 ? 'o meio-dia' : h === 1 ? 'a uma' : `as ${hour(h)}`);

export const formatTime = (h, m) => `${h}:${String(m).padStart(2, '0')}`;

// The usual way to say it, and every other way that counts as right.
export function timeWords(h, m) {
  if (!(h >= 1 && h <= 12 && m >= 0 && m <= 59)) throw new RangeError(`No time ${h}:${m}`);
  const next = h === 12 ? 1 : h + 1;
  const past = (minutes) => `${verb(h)} ${hour(h)} e ${minutes}`;
  const forms = [];
  if (m === 0) {
    if (h === 12) forms.push('é meio-dia');
    else if (h === 1) forms.push('é uma hora', 'é uma');
    else forms.push(`são ${hour(h)} horas`, `são ${hour(h)}`);
  } else if (m === 30) {
    forms.push(past('meia'), past('trinta'));
  } else if (m === 45) {
    forms.push(`são quinze para ${towards(next)}`, past('quarenta e cinco'));
  } else {
    forms.push(past(toWords(m)));
    if (m > 30) forms.push(`são ${toWords(60 - m)} para ${towards(next)}`);
  }
  // Said without "é" or "são" it is just as right.
  const accept = [...forms, ...forms.map((form) => form.replace(/^(é|são) /, ''))];
  return { pt: forms[0], accept };
}
