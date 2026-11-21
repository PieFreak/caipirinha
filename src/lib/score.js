// How well a word is known, from 0 to 1 (shown as 0% to 100%). The owner's rule:
// a right answer adds 10%, a wrong one takes off 15%, never below 0% or above 100%.
// A word's first answer counts from 20%: eight right answers in a row reach 100%,
// and a mistake after that leaves 85%.
export const START = 0.2;
export const RIGHT = 0.1;
export const WRONG = 0.15;

// score: where the word stands, or null before its first answer.
export function nextScore(score, ok) {
  const from = score == null ? START : score;
  const moved = Math.min(1, Math.max(0, from + (ok ? RIGHT : -WRONG)));
  return Math.round(moved * 100) / 100;
}
