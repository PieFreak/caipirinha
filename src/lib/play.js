// The session being played, the result of the last one, and the cards being flipped.
// An unfinished session is also kept on the phone (KEY), so leaving the app, a reload by
// the phone, or "Continue later" never loses it: Today offers to continue.
import { reactive } from 'vue';

const KEY = 'caipirinha.session';

export const play = reactive({ session: null, resume: null, result: null, cards: null });

// What is kept: the session as built, and how far it got.
export function keepSession(session, progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), session, ...progress }));
  } catch {
    // No room: the session simply cannot be continued later.
  }
}

export function keptSession() {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
    return kept && kept.session && Array.isArray(kept.queue) && kept.index < kept.queue.length ? kept : null;
  } catch {
    return null;
  }
}

export function dropSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to drop.
  }
}

// Starts a session: a new one, or (with kept) one continued where it was left.
export function startSession(session, kept = null) {
  play.session = session;
  play.resume = kept;
  if (!kept) dropSession();
}
