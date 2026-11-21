<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { dropSession, keepSession, play } from '../lib/play.js';
import { again, judge } from '../lib/session.js';
import { PERSONS } from '../lib/verbs.js';
import { logSession, record, recordGen, state } from '../store.js';
import { speak, speech, stopSpeaking } from '../lib/speech.js';
import Icon from '../components/Icon.vue';
import SpeakButton from '../components/SpeakButton.vue';

const router = useRouter();
const session = play.session;
const kept = play.resume;
play.resume = null;

// How far it has got. A session continued later starts where it was left.
const queue = reactive(kept ? kept.queue : session ? session.queue.slice() : []);
const index = ref(kept ? kept.index : 0);
const firstTries = kept ? kept.firstTries : [];   // what the result screen lists: every question's first answer
const question = computed(() => queue[index.value]);

const typed = ref('');
const placed = ref([]);      // word order: which tiles of the bank are placed, in order
const verdict = ref(null);   // { ok, accents, typo, also, given } once answered
const almost = ref(null);    // one chance to correct a typo or an accent that makes another word
const ending = ref(false);   // the "end this session?" choices are open
const input = ref(null);
let leaving = false;         // leaving on purpose: no need to keep the session

const ACCENTS = ['á', 'à', 'â', 'ã', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç'];
const desk = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

const label = computed(() => {
  const q = question.value;
  if (q.verb) return q.mode === 'type' ? 'Write the verb' : 'Pick the verb';
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
const showsPt = computed(() => question.value.dir === 'pt-en' && question.value.mode !== 'listen' && !question.value.verb);
// What language the answer field takes.
const answersPt = computed(() => question.value.dir === 'en-pt' || question.value.verb);
// A verb's table for the tense asked, each form with its pronouns.
const table = computed(() => {
  const verb = question.value.verb;
  return verb ? PERSONS.map((person) => ({ who: person.pronouns.join(', '), form: verb.table[person.slot] })) : [];
});

function ask() {
  typed.value = '';
  placed.value = [];
  verdict.value = null;
  almost.value = null;
  const q = question.value;
  if (q.mode === 'listen') speak(q.pt);
  if (q.mode === 'type') nextTick(() => input.value?.focus());
}

function answer(given) {
  if (verdict.value || (typeof given === 'string' && !given.trim())) return;
  const q = question.value;
  const result = judge(q, given);
  // A typo, or an accent that makes another word, is not judged at once: the answer
  // stays open for one correction. A typo sent again counts as right, with the spelling
  // shown; the other word sent again counts as wrong.
  if ((result.typo || result.close) && !almost.value) {
    almost.value = result.close
      ? `Almost. Check the accents: "${result.other.join(' ')}" is another word.`
      : 'Almost. Check your spelling and try once more.';
    nextTick(() => input.value?.focus());
    return;
  }
  verdict.value = { ...result, given: Array.isArray(given) ? given.join(' ') : given.text ?? given };
  if (state.settings.autoSpeak && q.mode !== 'listen') speak(q.pt);
}

// No idea: the answer is shown and counts as a mistake.
function giveUp() {
  if (verdict.value) return;
  verdict.value = { ok: false, given: '', gaveUp: true };
  if (state.settings.autoSpeak) speak(question.value.pt);
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

// After every answer the session is kept, so nothing is lost if the app is closed.
function keep() {
  if (firstTries.length && index.value < queue.length) {
    keepSession(session, { queue: queue.slice(), index: index.value, firstTries });
  }
}

function next() {
  commit();
  if (index.value + 1 < queue.length) {
    index.value++;
    keep();
    ask();
  } else {
    finish();
  }
}

function finish() {
  stopSpeaking();
  dropSession();
  const n = firstTries.length;
  const ok = firstTries.filter((t) => t.ok).length;
  if (n) logSession({ set: session.setId, title: session.title, modes: session.modes, dir: session.dir, n, ok });
  play.result = {
    setId: session.setId, title: session.title, modes: session.modes, dir: session.dir, length: session.length,
    n, ok, tries: firstTries,
  };
  play.session = null;
  leaving = true;
  router.replace('/result');
}

// The close button: with nothing answered it just leaves; otherwise it asks how.
function quit() {
  commit();
  if (!firstTries.length) {
    dropSession();
    play.session = null;
    leaving = true;
    router.back();
    return;
  }
  ending.value = true;
}

function later() {
  if (verdict.value) {
    // The answer just given is in; the session goes on from the next question.
    commit();
    index.value++;
  }
  keep();
  play.session = null;
  leaving = true;
  router.replace('/');
}

// Leaving any other way (the back gesture, a link): the session is kept to continue later.
onBeforeRouteLeave(() => {
  if (!leaving && session) {
    commit();
    keep();
    play.session = null;
  }
});

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

// The keyboard for this answer: digits for a number, digits with a separator for a clock time.
const inputMode = computed(() => {
  const q = question.value;
  if (!q.digits || q.dir !== 'pt-en') return 'text';
  return q.clock ? 'decimal' : 'numeric';
});

// ---- a keyboard on a desk
// 1 to 4 pick a choice (or place a tile), Enter checks or moves on, Backspace takes back
// a tile, R replays the sound, ? gives up, Esc ends the session.
function onKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (ending.value) ending.value = false; else quit();
    return;
  }
  if (event.target.tagName === 'INPUT' || ending.value) return;
  const q = question.value;
  if (!q) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    if (verdict.value) next();
    else if (q.mode === 'order' && placed.value.length === bank.value.length) checkOrder();
    return;
  }
  if (event.key === 'r' || event.key === 'R') { event.preventDefault(); speak(q.pt); return; }
  if (event.key === '?') { event.preventDefault(); giveUp(); return; }
  if (verdict.value) return;
  const number = Number(event.key);
  if (q.options && number >= 1 && number <= q.options.length) {
    event.preventDefault();
    answer(q.options[number - 1]);
  } else if (q.mode === 'order') {
    const free = bank.value.map((_, i) => i).filter((i) => !placed.value.includes(i));
    if (number >= 1 && number <= free.length) { event.preventDefault(); place(free[number - 1]); }
    if (event.key === 'Backspace' && placed.value.length) { event.preventDefault(); placed.value = placed.value.slice(0, -1); }
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
      <div class="track" role="progressbar" :aria-valuenow="index" aria-valuemin="0" :aria-valuemax="queue.length"
        :aria-label="`Question ${index + 1} of ${queue.length}`">
        <span :style="{ width: (index + (verdict ? 1 : 0)) / queue.length * 100 + '%' }"></span>
      </div>
      <span class="count">{{ index + 1 }}/{{ queue.length }}</span>
    </header>

    <div class="ask">
      <p class="ask-label">{{ label }}<span v-if="question.retry" class="retry"> · once more</span></p>

      <!-- A verb: who does it, and which verb in which tense -->
      <div v-if="question.verb" class="verb-ask">
        <p class="pt big" lang="pt-BR">{{ question.verb.pronoun }} <span class="blank" aria-label="blank">___</span></p>
        <p class="verb-of"><b lang="pt-BR">{{ question.verb.inf }}</b> · {{ question.verb.en }} · {{ question.verb.tense }}</p>
      </div>
      <div v-else-if="question.mode === 'listen'" class="ask-listen">
        <SpeakButton :text="question.pt" big />
        <p class="hint">{{ speech.supported ? 'Tap to hear it again. Tap twice for slow.' : 'This device cannot read aloud.' }}</p>
      </div>
      <div v-else-if="showsPt" class="ask-text">
        <p class="pt big" lang="pt-BR">{{ question.pt }}<small v-if="question.g" class="gender">{{ question.g }}</small></p>
        <SpeakButton :text="question.pt" />
      </div>
      <p v-else class="en big">{{ question.en }}</p>
    </div>

    <!-- Pick from four, by reading or by ear -->
    <div v-if="question.options" class="options">
      <button v-for="(option, i) in question.options" :key="i" type="button" class="option"
        :class="{ right: verdict && option.correct, wrong: verdict && !option.correct && verdict.given === option.text }"
        :lang="question.dir === 'en-pt' || question.verb ? 'pt-BR' : 'en'"
        :disabled="!!verdict" @click="answer(option)"><kbd aria-hidden="true">{{ i + 1 }}</kbd>{{ option.text }}</button>
    </div>

    <!-- Typing -->
    <form v-else-if="question.mode === 'type'" class="typing" @submit.prevent="verdict ? next() : answer(typed)">
      <input ref="input" v-model="typed" class="field" type="text" :readonly="!!verdict"
        :inputmode="inputMode" :lang="answersPt ? 'pt-BR' : 'en'"
        :placeholder="question.verb ? 'The verb' : answersPt ? 'Em português' : question.digits ? 'In digits' : 'In English'"
        autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"
        aria-label="Your answer">
      <div v-if="answersPt && !verdict" class="accents" aria-label="Accented letters">
        <button v-for="char in ACCENTS" :key="char" type="button" class="accent" :aria-label="`Type ${char}`" @click="addAccent(char)">{{ char }}</button>
      </div>
      <p v-if="almost && !verdict" class="almost" role="status">{{ almost }}</p>
      <button v-if="!verdict" type="submit" class="btn primary wide" :disabled="!typed.trim()">Check</button>
    </form>

    <!-- Word order -->
    <div v-else-if="question.mode === 'order'" class="ordering">
      <div class="answer-line" :class="{ filled: placed.length }" lang="pt-BR">
        <button v-for="i in placed" :key="i" type="button" class="tile" :disabled="!!verdict" @click="unplace(i)">{{ bank[i] }}</button>
      </div>
      <div class="bank" lang="pt-BR">
        <button v-for="(word, i) in bank" :key="i" type="button" class="tile" :class="{ used: placed.includes(i) }"
          :disabled="!!verdict || placed.includes(i)" @click="place(i)">{{ word }}</button>
      </div>
      <button v-if="!verdict" type="button" class="btn primary wide" :disabled="placed.length !== bank.length" @click="checkOrder">Check</button>
    </div>

    <button v-if="!verdict" type="button" class="link skip" @click="giveUp">I don't know</button>

    <!-- What it was -->
    <div v-if="verdict" class="feedback" :class="verdict.ok ? 'good' : 'bad'" role="status">
      <p class="fb-head">
        <Icon :name="verdict.ok ? 'check' : 'close'" :size="20" />
        <span v-if="verdict.ok && verdict.also">Right, that works too</span>
        <span v-else-if="verdict.ok && verdict.accents">Right, but mind the accents</span>
        <span v-else-if="verdict.ok && verdict.typo">Right, apart from a typo</span>
        <span v-else-if="verdict.ok">Right</span>
        <span v-else-if="verdict.gaveUp">Here it is</span>
        <span v-else>Not quite</span>
      </p>
      <p v-if="verdict.also" class="fb-given">You wrote <span class="plain" lang="pt-BR">{{ verdict.also }}</span>; this card was for:</p>
      <div class="fb-answer">
        <div>
          <p class="pt" lang="pt-BR">{{ question.pt }}<small v-if="question.g" class="gender">{{ question.g }}</small></p>
          <p v-if="question.verb" class="en">{{ question.verb.inf }} · {{ question.verb.en }}</p>
          <p v-else class="en">{{ question.en }}</p>
          <p v-if="question.say" class="say">Sounds like <b>{{ question.say }}</b></p>
        </div>
        <SpeakButton :text="question.pt" />
      </div>
      <p v-if="!verdict.ok && !verdict.gaveUp && (question.mode === 'type' || question.mode === 'order') && verdict.given" class="fb-given">
        You wrote: <span lang="pt-BR">{{ verdict.given }}</span>
      </p>
      <p v-else-if="verdict.typo && !verdict.overruled" class="fb-given slip">
        You wrote: <span>{{ verdict.given }}</span>
      </p>
      <table v-if="question.verb && !verdict.ok" class="verb-table" lang="pt-BR">
        <caption>{{ question.verb.inf }}, {{ question.verb.tense }}</caption>
        <tr v-for="row in table" :key="row.who" :class="{ on: row.form === question.form }"><th>{{ row.who }}</th><td>{{ row.form }}</td></tr>
      </table>
      <p v-if="question.note" class="note">{{ question.note }}</p>
      <p v-if="question.example" class="example">
        <span lang="pt-BR">{{ question.example.pt }}</span>
        <span class="example-en">{{ question.example.en }}</span>
      </p>
      <button v-if="!verdict.ok && !verdict.gaveUp && question.mode === 'type'" type="button" class="link" @click="overrule">I was right</button>
    </div>

    <div v-if="verdict" class="session-foot">
      <button type="button" class="btn primary wide" @click="next">{{ index + 1 < queue.length || (!verdict.ok && !question.retry) ? 'Next' : 'Finish' }}</button>
    </div>

    <p v-if="desk" class="keys" aria-hidden="true">
      <span v-if="question.options"><kbd>1</kbd>–<kbd>4</kbd> choose</span>
      <span v-if="question.mode === 'order'"><kbd>1</kbd>–<kbd>9</kbd> place · <kbd>⌫</kbd> take back</span>
      <span><kbd>Enter</kbd> {{ verdict ? 'next' : 'check' }}</span>
      <span><kbd>R</kbd> hear it</span>
      <span><kbd>?</kbd> don't know</span>
      <span><kbd>Esc</kbd> end</span>
    </p>

    <!-- Ending: finish now, keep it for later, or go on -->
    <div v-if="ending" class="sheet-back" @click.self="ending = false">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="end-title">
        <h2 id="end-title">End this session?</h2>
        <p class="hint">{{ firstTries.length }} of {{ queue.length }} answered. Your answers so far are saved either way.</p>
        <button type="button" class="btn primary wide" @click="finish">Finish now and see how it went</button>
        <button type="button" class="btn wide" @click="later">Continue later</button>
        <button type="button" class="btn wide" @click="ending = false">Keep going</button>
      </div>
    </div>
  </div>
</template>
