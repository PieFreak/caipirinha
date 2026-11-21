// Numbers from 0 to 1 000 000 in Brazilian Portuguese words. Tested in tests/.

const UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos',
  'setecentos', 'oitocentos', 'novecentos'];

export const MAX = 1000000;

function below1000(n) {
  if (n === 100) return 'cem';
  const parts = [];
  const rest = n % 100;
  if (n >= 100) parts.push(HUNDREDS[Math.floor(n / 100)]);
  if (rest) parts.push(rest < 20 ? UNITS[rest] : TENS[Math.floor(rest / 10)] + (rest % 10 ? ` e ${UNITS[rest % 10]}` : ''));
  return parts.join(' e ');
}

// "e" stands between the thousands and the rest only when the rest is at most 100
// or a round hundred: "mil e um", "mil e duzentos", but "mil duzentos e trinta".
function words(n, joiner) {
  if (n === 0) return 'zero';
  if (n === MAX) return 'um milhão';
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const head = thousands ? (thousands === 1 ? 'mil' : `${below1000(thousands)} mil`) : '';
  if (!rest) return head;
  if (!head) return below1000(rest);
  const and = joiner ?? (rest <= 100 || rest % 100 === 0);
  return `${head}${and ? ' e ' : ' '}${below1000(rest)}`;
}

export function toWords(n) {
  if (!Number.isInteger(n) || n < 0 || n > MAX) throw new RangeError(`No words for ${n}`);
  return words(n);
}

// Every way of writing it that counts as right: the standard one first, then the
// "e" after the thousands the other way (both are heard), and "catorze" for 14.
export function numberAnswers(n) {
  const forms = new Set([toWords(n), words(n, true), words(n, false)]);
  for (const form of [...forms]) if (form.includes('quatorze')) forms.add(form.replaceAll('quatorze', 'catorze'));
  return [...forms];
}

// 342 913 with narrow spaces between the groups: no country's comma or point.
export const formatNumber = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
