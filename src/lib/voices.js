// Which of a device's voices to read Portuguese with. A device lists its voices in no
// useful order, and every iPhone lists eight synthesiser voices (Eddy, Flo, Grandma …)
// for Brazilian Portuguese beside the natural ones: taking the first by name gives Eddy.
// So voices are ranked. Tested in tests/.

// Apple's "Eloquence" and novelty voices, and the open-source synthesisers of Linux.
const ROBOTIC = /\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bahh|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|espeak|mbrola)\b/i;
// Names of natural Brazilian voices on Apple, Google and Microsoft devices.
const NATURAL = /\b(luciana|felipe|fernanda|francisca|ant[oô]nio|thalita|camila|vit[oó]ria|brenda|donato|elza|f[aá]bio|giovanna|humberto|j[uú]lio|leila|let[ií]cia|manuela|nicolau|val[eé]rio|yara)\b/i;

export const isBrazilian = (voice) => /^pt[-_]br$/i.test(voice.lang || '');

// Higher is better. Brazilian before European; within that, the larger downloaded
// versions (Premium, Enhanced) and the neural voices first, the synthesisers last.
export function voiceQuality(voice) {
  const name = voice.name || '';
  let score = isBrazilian(voice) ? 100 : 0;
  if (/premium/i.test(name)) score += 40;
  else if (/enhanced/i.test(name)) score += 30;
  if (/natural|neural|siri/i.test(name)) score += 35;
  if (/google/i.test(name)) score += 20;
  if (NATURAL.test(name)) score += 15;
  if (ROBOTIC.test(name)) score -= 60;
  return score;
}

export const isRobotic = (voice) => ROBOTIC.test(voice.name || '');

// The Portuguese voices of a list, best first.
export function portugueseVoices(voices) {
  return voices
    .filter((voice) => /^pt([-_]|$)/i.test(voice.lang || ''))
    .sort((a, b) => voiceQuality(b) - voiceQuality(a) || a.name.localeCompare(b.name));
}
