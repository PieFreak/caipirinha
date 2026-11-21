// Everything the app can teach: the groups in the order they are shown, and every
// word by its id. A word is known by its Portuguese text, so one that stands in two
// groups ("hoje" in Words for when and in the common words) is one word.
import { parseLines } from '../lib/text.js';
import basics from './basics.js';
import phrases from './phrases.js';
import numbers from './numbers.js';
import top1000 from './top1000.js';

export const items = new Map();
export const groups = [];

function add(group, parsed) {
  const ids = [];
  for (const item of parsed) {
    const known = items.get(item.id);
    if (known) {
      known.groups.push(group.id);
      if (!known.g) known.g = item.g;
      if (!known.note) known.note = item.note;
    } else {
      items.set(item.id, { ...item, groups: [group.id] });
    }
    if (!ids.includes(item.id)) ids.push(item.id);
  }
  groups.push({ id: group.id, title: group.title, section: group.section, about: group.about || '', items: ids });
}

for (const group of [...basics, ...phrases, ...numbers]) add(group, parseLines(group.text));

// Counting and clock times are made up on the spot, so they have no word list.
groups.push(
  { id: 'clock', title: 'Telling the time', section: 'Basics', gen: 'clock',
    about: 'Clock times to read out, such as 3:30 and 8:45.' },
  { id: 'count100', title: 'Counting to 100', section: 'Numbers', gen: 'number', min: 0, max: 100,
    about: 'Any number from 0 to 100.' },
  { id: 'count1000', title: 'Counting to 1 000', section: 'Numbers', gen: 'number', min: 100, max: 1000,
    about: 'Any number from 100 to 1 000.' },
  { id: 'count1m', title: 'Counting to 1 million', section: 'Numbers', gen: 'number', min: 1000, max: 1000000,
    about: 'Any number from 1 000 to 1 000 000.' },
);

// The common words come as one list by frequency, shown a hundred at a time.
export const COMMON = 'Most common words';
const common = parseLines(top1000);
for (let from = 0; from < common.length; from += 100) {
  const upTo = Math.min(from + 100, common.length);
  add({ id: `top${from / 100 + 1}`, title: `Words ${from + 1}–${upTo}`, section: COMMON,
    about: 'By how often they are used.' }, common.slice(from, upTo));
}

export const groupsById = Object.fromEntries(groups.map((group) => [group.id, group]));
export const sections = [...new Set(groups.map((group) => group.section))];

// The order new words come in when nothing else is chosen: what a traveller needs
// first, then the common words by frequency.
export const courseOrder = [
  'greetings', 'num0', 'conversation', 'days', 'food', 'num11', 'travel', 'months', 'when',
  'shopping', 'time', 'tens', 'hotel', 'help',
  ...groups.filter((group) => group.section === COMMON).map((group) => group.id),
];
