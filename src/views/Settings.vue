<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  state, save, exportData, readBackup, applyBackup, undoRestore, canUndoRestore, resetAll, ensureDaily, librarySize,
} from '../store.js';
import { speech, speak, chosenVoice } from '../lib/speech.js';
import { isBrazilian, isRobotic } from '../lib/voices.js';
import Chips from '../components/Chips.vue';
import Icon from '../components/Icon.vue';

const router = useRouter();
const settings = state.settings;

const PER_DAY = [{ id: 3, title: '3' }, { id: 5, title: '5' }, { id: 10, title: '10' }];
const RATES = [{ id: 0.7, title: 'Slow' }, { id: 0.9, title: 'Normal' }, { id: 1.05, title: 'Fast' }];

// Every control writes straight to the phone.
const bound = (key) => computed({ get: () => settings[key], set: (value) => { settings[key] = value; save(); } });
const perDay = bound('perDay');
const rate = bound('rate');
const strictAccents = bound('strictAccents');
const font = bound('font');
const autoSpeak = bound('autoSpeak');
const voice = computed({
  get: () => chosenVoice()?.name || '',
  set: (value) => { settings.voice = value; save(); },
});
const brazilian = computed(() => speech.voices.some(isBrazilian));
const robotic = computed(() => { const v = chosenVoice(); return !!v && isRobotic(v); });
const auto = computed(() => !speech.voices.some((v) => v.name === settings.voice));
const voiceLabel = (v) => `${v.name}${isBrazilian(v) ? '' : ' (European Portuguese)'}${isRobotic(v) ? ' (synthesiser)' : ''}`;

// ---- backup

const message = ref('');
const picker = ref(null);

async function backup() {
  const name = `caipirinha-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([exportData()], name, { type: 'application/json' });
  // On a phone the share sheet is the way to save a file; elsewhere it downloads.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Caipirinha backup' });
      message.value = 'Backup handed over. Keep the file somewhere safe.';
    } catch {
      message.value = '';
    }
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  message.value = `Saved as ${name}.`;
}

// Restoring: the file is read first and nothing changes until the learner confirms.
// What was on the device is kept aside, so the restore can be undone.
const pending = ref(null);
const undoable = ref(canUndoRestore());
const longDate = (time) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(time));

async function restore(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const read = readBackup(await file.text());
  if (read.error) { message.value = read.error; pending.value = null; return; }
  message.value = '';
  pending.value = read;
}

function confirmRestore() {
  applyBackup(pending.value.state);
  message.value = `Restored: ${pending.value.words} words in your library.`;
  pending.value = null;
  undoable.value = true;
  ensureDaily();
}

function undo() {
  if (undoRestore()) message.value = 'The restore is undone: everything is as it was before it.';
  undoable.value = false;
}

const erasing = ref(false);
function erase() {
  resetAll();
  ensureDaily();
  erasing.value = false;
  message.value = 'Everything is erased.';
}
</script>

<template>
  <header class="bar">
    <button type="button" class="icon-btn" aria-label="Back" @click="router.back()"><Icon name="back" /></button>
    <h1>Settings</h1>
  </header>

  <section class="tight">
    <h2>Font</h2>
    <div class="chips" role="radiogroup" aria-label="Font">
      <button type="button" class="chip font-sample-readable" role="radio" :class="{ on: font === 'lexend' }"
        :aria-checked="font === 'lexend'" @click="font = 'lexend'">Lexend</button>
      <button type="button" class="chip font-sample-standard" role="radio" :class="{ on: font === 'standard' }"
        :aria-checked="font === 'standard'" @click="font = 'standard'">Standard</button>
    </div>
    <p class="hint">Lexend was made to make reading easier: roomy spacing, clear letters, and no slanted text.
      Standard is the phone's own font with a serif for headings. Each button is shown in its own font.</p>
  </section>

  <section class="tight">
    <h2>New words each day</h2>
    <Chips v-model="perDay" :options="PER_DAY" label="New words each day" />
    <p class="hint">Applies from tomorrow. Today's page has a button for more.</p>
  </section>

  <section class="tight">
    <h2>Answers</h2>
    <label class="switch">
      <input v-model="strictAccents" type="checkbox">
      <span>Count a missing accent as wrong<small>Off: "voce" is accepted for "você", and you are shown the accent.</small></span>
    </label>
    <label class="switch">
      <input v-model="autoSpeak" type="checkbox">
      <span>Read the Portuguese aloud after each answer</span>
    </label>
    <p class="hint">A typo does not fail you. One letter off (two in a long answer) and you get a chance to correct it;
      if it is still a typo after that, it counts as right and you are shown the spelling. This does not apply when
      what you typed is another word, such as "ela" for "ele".</p>
  </section>

  <section class="tight">
    <h2>Voice</h2>
    <p v-if="!speech.supported" class="hint bad">This browser cannot read text aloud, so listening is switched off.</p>
    <template v-else>
      <p v-if="!speech.voices.length" class="hint">
        No Portuguese voice was found on this device, so Portuguese is read by a voice made for another language and
        sounds wrong. An iPhone has Brazilian voices built in.
      </p>
      <p v-else-if="!brazilian" class="hint">Only a European Portuguese voice was found on this device: it sounds different from Brazilian.</p>
      <label v-if="speech.voices.length" class="pick block">
        <span>Voice</span>
        <select v-model="voice">
          <option v-for="v in speech.voices" :key="v.name" :value="v.name">{{ voiceLabel(v) }}</option>
        </select>
      </label>
      <p v-if="speech.voices.length" class="hint" :class="{ bad: robotic }">
        <template v-if="robotic">This one is a synthesiser and sounds mechanical. Pick another above if there is one.</template>
        <template v-else-if="auto">The app picked the most natural voice it found; the list has the best first.</template>
        <template v-else>Your own choice. The list has the most natural voices first.</template>
      </p>
      <Chips v-model="rate" :options="RATES" label="Speed" />
      <button type="button" class="btn" @click="speak('Bom dia! Tudo bem com você?')">Hear the voice</button>
      <p class="hint">Tap a speaker twice to hear something slowly. On an iPhone, better voices can be downloaded for free
        under Settings › Accessibility › Spoken Content › Voices › Portuguese (Brazil).</p>
    </template>
  </section>

  <section class="tight">
    <h2>Backup</h2>
    <p class="hint">Your {{ librarySize }} words and their history live only on this device. Removing the app from the
      home screen deletes them, so save a backup now and then.</p>
    <div class="row">
      <button type="button" class="btn primary" @click="backup">Save a backup</button>
      <button type="button" class="btn" @click="picker.click()">Restore</button>
      <input ref="picker" type="file" accept="application/json,.json" hidden @change="restore">
    </div>
    <div v-if="pending" class="confirm" role="alertdialog" aria-labelledby="restore-title">
      <p id="restore-title"><b>Replace what is on this device?</b></p>
      <p>
        This backup has {{ pending.words }} {{ pending.words === 1 ? 'word' : 'words' }} and {{ pending.sessions }}
        {{ pending.sessions === 1 ? 'session' : 'sessions' }}<template v-if="pending.exported">, saved {{ longDate(pending.exported) }}</template>.
        This device has {{ librarySize }} {{ librarySize === 1 ? 'word' : 'words' }} now. You can undo it afterwards.
      </p>
      <div class="row">
        <button type="button" class="btn danger" @click="confirmRestore">Replace</button>
        <button type="button" class="btn" @click="pending = null">Cancel</button>
      </div>
    </div>
    <p v-if="message" class="hint" role="status">{{ message }}</p>
    <button v-if="undoable && !pending" type="button" class="link" @click="undo">Undo the last restore</button>
  </section>

  <section class="tight">
    <h2>Start over</h2>
    <button v-if="!erasing" type="button" class="btn" @click="erasing = true">Erase everything</button>
    <div v-else class="confirm">
      <p>This deletes your library, your own words and all history from this device. It cannot be undone.</p>
      <div class="row">
        <button type="button" class="btn danger" @click="erase">Erase</button>
        <button type="button" class="btn" @click="erasing = false">Keep it</button>
      </div>
    </div>
  </section>
</template>
