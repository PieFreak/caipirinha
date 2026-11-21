// Reading Portuguese aloud with the phone's own voice. It works offline: the voices
// are on the phone. Nothing is recorded and nothing is sent anywhere.
import { reactive } from 'vue';
import { state } from '../store.js';

export const speech = reactive({
  supported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  voices: [],   // the Portuguese voices this phone has, Brazilian first
});

const isBrazilian = (voice) => /^pt[-_]br$/i.test(voice.lang);

function refresh() {
  speech.voices = window.speechSynthesis.getVoices()
    .filter((voice) => /^pt([-_]|$)/i.test(voice.lang))
    .sort((a, b) => isBrazilian(b) - isBrazilian(a) || a.name.localeCompare(b.name));
}

export function initSpeech() {
  if (!speech.supported) return;
  refresh();
  // Voices arrive late on most phones.
  window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
  // An iPhone speaks only after a touch has started speech once: an empty
  // utterance on the first touch opens the way for the ones the app starts itself.
  const unlock = () => {
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
    refresh();
  };
  window.addEventListener('pointerdown', unlock, { once: true });
}

export function chosenVoice() {
  return speech.voices.find((voice) => voice.name === state.settings.voice) || speech.voices[0] || null;
}

// "obrigado / obrigada" is read as both forms with a pause between.
const spoken = (text) => String(text).replace(/ \/ /g, ', ');

export function speak(text, { slow = false } = {}) {
  if (!speech.supported || !text) return;
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(spoken(text));
  const voice = chosenVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice ? voice.lang : 'pt-BR';
  utterance.rate = slow ? 0.6 : state.settings.rate;
  synth.cancel();
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (speech.supported) window.speechSynthesis.cancel();
}
