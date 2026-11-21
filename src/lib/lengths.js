// How long a session is. For a set of words the learner picks a share of it: 5% to
// 100%, or 200% for every word twice. Counting and clock times have no fixed set of
// words, so they are picked by number. Tested in tests/.

export const SHARES = [5, 10, 25, 50, 75, 100, 200];
export const COUNTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

// Below this many words a small share is a question or two: only half, all and twice are offered.
export const SMALL = 10;

// How many questions a share of a set is: rounded, and never none.
export const questionsFor = (share, total) => Math.max(1, Math.round((share * total) / 100));

// The shares worth offering for a set of that many words. Of two shares that come to
// the same number of questions, the larger one stays (10% of 12 words and 5% of them are both 1).
export function sharesFor(total) {
  const out = [];
  for (const share of total < SMALL ? [50, 100, 200] : SHARES) {
    const last = out.at(-1);
    if (last !== undefined && questionsFor(last, total) === questionsFor(share, total)) out[out.length - 1] = share;
    else out.push(share);
  }
  return out;
}
