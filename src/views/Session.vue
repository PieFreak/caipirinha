<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { play } from '../lib/play.js';
import { again, judge } from '../lib/session.js';
import { logSession, record, recordGen, state } from '../store.js';
import { speak, speech, stopSpeaking } from '../lib/speech.js';
import Icon from '../components/Icon.vue';
import SpeakButton from '../components/SpeakButton.vue';

const router = useRouter();
const session = play.session;

const queue = reactive(session ? session.queue.slice() : []);
const index = ref(0);
const question = computed(() => queue[index.value]);

const typed = ref('');
const placed = ref([]);      // word order: which tiles of the bank are placed, in order
const verdict = ref(null);   // { ok, accents, typo, given } once answered
const almost = ref(false);   // a typo was typed: one chance to correct it is running
const firstTries = [];       // what the result screen lists: every question's first answer
const input = ref(null);

const ACCENTS = ['á', 'à', 'â', 'ã', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç'];

const label = computed(() => {
  const q = question.value;
  if (q.mode === 'order') return 'Put the words in order';
  if (q.mode === 'listen') return q.dir === 'pt-en' ? 'What does it mean?' : 'Which one did you hear?';
  if (q.digits) {
    if (q.dir === 'pt-en') return q.mode === 'type' ? 'Write it in digits' : 'Which one is it?';
    return q.mode === 'type' ? 'Write it in words' : 'How is it said?';
  }
  if (q.dir === 'pt-en') return q.mode === 'type' ? 'Write what it means' : 'What does it mean?';
  return q.mode === 'type' ? 'Write it in Portuguese' : 'How do you say it?';
});

// The Portuguese is shown as the question only when the answer is its meaning.
const showsPt = computed(() => question.value.dir === 'pt-en' && question.value.mode !== 'listen');

function ask() {
  typed.value = '';
  placed.value = [];
  verdict.value = null;
  almost.value = false;
  const q = question.value;
  if (q.mode === 'listen') speak(q.pt);
  if (q.mode === 'type') nextTick(() => input.value?.focus());
}

function answer(given) {
  if (verdict.value || (typeof given === 'string' && !given.trim())) return;
  const q = question.value;
  const result = judge(q, given);
  // A typo is not judged at once: the answer stays open for one correction. Sent again
  // still a letter off, it counts as right and the spelling is shown.
  if (result.typo && !almost.value) {
    almost.value = true;
    nextTick(() => input.value?.focus());
    return;
  }
  verdict.value = { ...result, given: Array.isArray(given) ? given.join(' ') : given.text ?? given };
  if (state.settings.autoSpeak && q.mode !== 'listen') speak(q.pt);
}

// A typed answer that was right in another wording: the user says so.
function overrule() {
  verdict.value.ok = true;
  verdict.value.overruled = true;
}

// Writes the answer into the statistics, once the user has had the chance to overrule it.
function commit() {
  const q = question.value;
  const v = verdict.value;
  if (!v || v.done) return;
  v.done = true;
  if (q.gen) recordGen(q.gen, v.ok); else record(q.id, v.ok);
  if (!q.retry) {
    firstTries.push({ id: q.id || null, pt: q.pt, en: q.en, ok: v.ok });
    if (!v.ok) queue.push(again(q, session.set));
  }
}

function next() {
  commit();
  if (index.value + 1 < queue.length) {
    index.value++;
    ask();
  } else {
    finish();
  }
}

function finish() {
  stopSpeaking();
  const n = firstTries.length;
  const ok = firstTries.filter((t) => t.ok).length;
  if (n) logSession({ set: session.setId, title: session.title, modes: session.modes, dir: session.dir, n, ok });
  play.result = {
    setId: session.setId, title: session.title, modes: session.modes, dir: session.dir, length: session.length,
    n, ok, tries: firstTries,
  };
  play.session = null;
  router.replace('/result');
}

function quit() {
  commit();
  if (firstTries.length) {
    finish();
  } else {
    play.session = null;
    router.back();
  }
}

// ---- word order

const bank = computed(() => question.value.bank || []);
const place = (i) => { if (!verdict.value && !placed.value.includes(i)) placed.value.push(i); };
const unplace = (i) => { if (!verdict.value) placed.value = placed.value.filter((other) => other !== i); };
const checkOrder = () => answer(placed.value.map((i) => bank.value[i]));

// ---- typing

function addAccent(char) {
  typed.value += char;
  input.value?.focus();
}

// For a keyboard on a desk: 1 to 4 pick a choice, Enter moves on.
// In the answer field keys are text, and the form handles Enter itself.
function onKey(event) {
  if (event.target.tagName === 'INPUT' || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'Enter' && verdict.value) {
    event.preventDefault();
    next();
    return;
  }
  const options = question.value?.options;
  const number = Number(event.key);
  if (options && !verdict.value && number >= 1 && number <= options.length) {
    event.preventDefault();
    answer(options[number - 1]);
  }
}

onMounted(() => {
  if (!session) {
    router.replace('/practice');
    return;
  }
  window.addEventListener('keydown', onKey);
  ask();
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  stopSpeaking();
});
</script>

<template>
  <div v-if="session && question" class="session">
    <header class="session-top">
      <button type="button" class="icon-btn" aria-label="End the session" @click="quit"><Icon name="close" /></button>
      <div class="track" role="progressbar" :aria-valuenow="index" aria-valuemin="0" :aria-valuemax="queue.length">
        <span :style="{ width: (index + (verdict ? 1 : 0)) / queue.length * 100 + '%' }"></span>
      </div>
      <span class="count">{{ index + 1 }}/{{ queue.length }}</span>
    </header>

    <div class="ask">
      <p class="ask-label">{{ label }}<span v-if="question.retry" class="retry"> · once more</span></p>

      <div v-if="question.mode === 'listen'" class="ask-listen">
        <SpeakButton :text="question.pt" big />
        <p class="hint">Tap to hear it again. Tap twice for slow.</p>
      </div>
      <div v-else-if="showsPt" class="ask-text">
        <p class="pt big">{{ question.pt }}<small v-if="question.g" class="gender">{{ question.g }}</small></p>
        <SpeakButton :text="question.pt" />
      </div>
      <p v-else class="en big">{{ question.en }}</p>
    </div>

    <!-- Pick from four, by reading or by ear -->
    <div v-if="question.options" class="options">
      <button v-for="(option, i) in question.options" :key="i" type="button" class="option"
        :class="{ right: verdict && option.correct, wrong: verdict && !option.correct && verdict.given === option.text }"
        :disabled="!!verdict" @click="answer(option)"><kbd aria-hidden="true">{{ i + 1 }}</kbd>{{ option.text }}</button>
    </div>

    <!-- Typing -->
    <form v-else-if="question.mode === 'type'" class="typing" @submit.prevent="verdict ? next() : answer(typed)">
      <input ref="input" v-model="typed" class="field" type="text" :readonly="!!verdict"
        :inputmode="question.digits && question.dir === 'pt-en' ? 'numeric' : 'text'"
        :lang="question.dir === 'en-pt' ? 'pt-BR' : 'en'"
        :placeholder="question.dir === 'en-pt' ? 'Em português' : question.digits ? 'In digits' : 'In English'"
        autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"
        aria-label="Your answer">
      <div v-if="question.dir === 'en-pt' && !verdict" class="accents" aria-label="Accented letters">
        <button v-for="char in ACCENTS" :key="char" type="button" class="accent" @click="addAccent(char)">{{ char }}</button>
      </div>
      <p v-if="almost && !verdict" class="almost" role="status">Almost. Check your spelling and try once more.</p>
      <button v-if="!verdict" type="submit" class="btn primary wide" :disabled="!typed.trim()">Check</button>
    </form>

    <!-- Word order -->
    <div v-else-if="question.mode === 'order'" class="ordering">
      <div class="answer-line" :class="{ filled: placed.length }">
        <button v-for="i in placed" :key="i" type="button" class="tile" :disabled="!!verdict" @click="unplace(i)">{{ bank[i] }}</button>
      </div>
      <div class="bank">
        <button v-for="(word, i) in bank" :key="i" type="button" class="tile" :class="{ used: placed.includes(i) }"
          :disabled="!!verdict || placed.includes(i)" @click="place(i)">{{ word }}</button>
      </div>
      <button v-if="!verdict" type="button" class="btn primary wide" :disabled="placed.length !== bank.length" @click="checkOrder">Check</button>
    </div>

    <!-- What it was -->
    <div v-if="verdict" class="feedback" :class="verdict.ok ? 'good' : 'bad'" role="status">
      <p class="fb-head">
        <Icon :name="verdict.ok ? 'check' : 'close'" :size="20" />
        <span v-if="verdict.ok && verdict.accents">Right, but mind the accents</span>
        <span v-else-if="verdict.ok && verdict.typo">Right, apart from a typo</span>
        <span v-else-if="verdict.ok">Right</span>
        <span v-else>Not quite</span>
      </p>
      <div class="fb-answer">
        <div>
          <p class="pt">{{ question.pt }}<small v-if="question.g" class="gender">{{ question.g }}</small></p>
          <p class="en">{{ question.en }}</p>
          <p v-if="question.say" class="say">Sounds like <b>{{ question.say }}</b></p>
        </div>
        <SpeakButton :text="question.pt" />
      </div>
      <p v-if="!verdict.ok && (question.mode === 'type' || question.mode === 'order') && verdict.given" class="fb-given">
        You wrote: <span>{{ verdict.given }}</span>
      </p>
      <p v-else-if="verdict.typo && !verdict.overruled" class="fb-given slip">
        You wrote: <span>{{ verdict.given }}</span>
      </p>
      <p v-if="question.note" class="note">{{ question.note }}</p>
      <button v-if="!verdict.ok && question.mode === 'type'" type="button" class="link" @click="overrule">I was right</button>
    </div>

    <div v-if="verdict" class="session-foot">
      <button type="button" class="btn primary wide" @click="next">{{ index + 1 < queue.length || (!verdict.ok && !question.retry) ? 'Next' : 'Finish' }}</button>
    </div>
  </div>
</template>
