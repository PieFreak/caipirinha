// How well a word is known, from 0 to 1 (shown as 0% to 100%). The owner's rule:
// a right answer adds 10%, a wrong one takes off 15%, never below 0% or above 100%.
// A word starts at 0%: ten right answers in a row reach 100%, and a mistake after
// that leaves 85%. Unpractised, it fades by 1% a day.
export const START = 0;
export const RIGHT = 0.1;
export const WRONG = 0.15;
export const FADE = 0.01;

const DAY = 86400000;
const round = (value) => Math.round(value * 100) / 100;

// score: where the word stands, or null before its first answer.
export function nextScore(score, ok) {
  const from = score == null ? START : score;
  return round(Math.min(1, Math.max(0, from + (ok ? RIGHT : -WRONG))));
}

// The score as it stands now: what was earned, less 1% for each whole day since the
// word was last practised (or marked as known).
export function faded(score, since, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - since) / DAY));
  return round(Math.max(0, score - FADE * days));
}
