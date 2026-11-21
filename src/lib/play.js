// The session being played and the result of the last one. Kept in memory only:
// closing the app in the middle of a session drops what was left of it (each
// answer already given is in the statistics).
import { reactive } from 'vue';

export const play = reactive({ session: null, result: null });
