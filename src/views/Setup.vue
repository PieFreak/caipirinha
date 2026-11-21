<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getSet, setStats, shade, state, save } from '../store.js';
import { buildCards, buildSession, modesFor, poolSize, DIRS, MODES } from '../lib/session.js';
import { PERSONS, VERB_GROUPS, verbsOf } from '../lib/verbs.js';
import { COUNTS, questionsFor, sharesFor } from '../lib/lengths.js';
import { play, startSession } from '../lib/play.js';
import Checks from '../components/Checks.vue';
import Chips from '../components/Chips.vue';
import Icon from '../components/Icon.vue';
import WordRow from '../components/WordRow.vue';

const props = defineProps({ id: { type: String, required: true } });
const router = useRouter();

const set = computed(() => getSet(props.id));
const stats = computed(() => (set.value ? setStats(set.value) : null));
const empty = computed(() => !set.value || (set.value.kind === 'list' && !set.value.ids.length));
const allowed = computed(() => (empty.value ? {} : modesFor(set.value)));

// The kinds of exercise ticked last time are remembered (all of them at first).
// One this set cannot offer is shown unticked here, and stays ticked for other sets.
const ticked = ref(state.settings.modes.slice());
const dir = ref(state.settings.dir);
const share = ref(state.settings.share);
const length = ref(state.settings.length);

const isVerb = computed(() => set.value?.gen === 'verb');
const WHY = computed(() => (isVerb.value
  ? { order: 'verbs are picked or typed', listen: 'verbs are picked or typed' }
  : { order: 'nothing here is a sentence', listen: 'this device cannot read aloud' }));
const kinds = computed(() => MODES.map((m) => ({ ...m, disabled: !allowed.value[m.id], why: allowed.value[m.id] ? '' : WHY.value[m.id] })));
const chosen = computed(() => MODES.map((m) => m.id).filter((id) => ticked.value.includes(id) && allowed.value[id]));
const onlyOrder = computed(() => chosen.value.length === 1 && chosen.value[0] === 'order');
const hint = computed(() => {
  const missing = kinds.value.filter((kind) => kind.disabled).map((kind) => `${kind.title}: ${kind.why}.`);
  const lead = chosen.value.length ? 'Each question is one of the kinds you ticked.' : 'Tick at least one kind of exercise.';
  return [lead, ...missing].join(' ');
});

// Word order always goes from English to Portuguese.
const dirs = computed(() => DIRS.map((d) => ({ ...d, disabled: onlyOrder.value && d.id !== 'en-pt' })));
const shownDir = computed({
  get: () => (onlyOrder.value ? 'en-pt' : dir.value),
  set: (value) => { dir.value = value; },
});
// How many words of this set the ticked kinds can ask.
const words = computed(() => poolSize(set.value, chosen.value));
// A set of words is asked by share: 5% to 100% of it, or 200% for every word twice
// (a small set offers only half, all and twice). Counting and clock times are made up
// without end, so they are asked by number. The last choice of each is remembered; one
// a set does not offer falls back to all of it, without being forgotten.
const isList = computed(() => set.value.kind === 'list');
const lengths = computed(() => (isList.value
  ? sharesFor(words.value).map((percent) => ({ id: percent, title: `${percent}%` }))
  : COUNTS.map((n) => ({ id: n, title: String(n) }))));
const shownLength = computed({
  get: () => {
    const wanted = isList.value ? share.value : length.value;
    return lengths.value.some((option) => option.id === wanted) ? wanted : isList.value ? 100 : 10;
  },
  set: (value) => { if (isList.value) share.value = value; else length.value = value; },
});
// How many questions that is.
const questions = computed(() => (isList.value ? questionsFor(shownLength.value, words.value) : shownLength.value));
// What the choice means here, in words.
const spread = computed(() => {
  const total = words.value;
  if (!isList.value || !total) return '';
  const all = total === 1 ? 'The one word' : `All ${total} words`;
  if (shownLength.value === 200) return `${all} twice: ${questions.value} questions in two rounds, each in its own random order.`;
  if (shownLength.value === 100) return `${all}, once each.`;
  const count = questions.value;
  return `${count} ${count === 1 ? 'question' : 'questions'}: ${count} of the ${total} words${set.value.ordered ? ', the first in line' : ', chosen at random'}.`;
});
const shownWords = computed(() => (set.value.kind === 'list' ? set.value.ids.slice(0, 120) : []));
// A group of verbs lists its verbs in the tense practised, each form with its pronouns.
const verbTables = computed(() => {
  if (!isVerb.value) return [];
  const group = VERB_GROUPS.find((g) => g.id === set.value.id);
  return verbsOf(group).map((verb) => ({ ...verb, forms: verb[group.tense] }));
});
const persons = PERSONS.map((person) => person.pronouns.slice(0, 3).join(', '));
const problem = ref('');

// Flashcards: flip through the words, nothing judged or counted.
function cards() {
  Object.assign(state.settings, { dir: dir.value, share: share.value });
  save();
  const list = buildCards(props.id, questions.value);
  if (!list) return;
  play.cards = { title: set.value.title, cards: list, dir: dir.value };
  router.push('/cards');
}

function start() {
  Object.assign(state.settings, { modes: ticked.value.slice(), dir: dir.value, share: share.value, length: length.value });
  save();
  const session = buildSession(props.id, { modes: chosen.value, dir: shownDir.value, length: questions.value });
  if (!session) {
    problem.value = 'Nothing here fits the kinds of exercise you ticked. Tick another.';
    return;
  }
  startSession({ ...session, length: questions.value });
  router.push('/play');
}
</script>

<template>
  <header class="bar">
    <button type="button" class="icon-btn" aria-label="Back" @click="router.back()"><Icon name="back" /></button>
    <h1>{{ set ? set.title : 'Not found' }}</h1>
  </header>

  <p v-if="empty" class="empty">There is nothing here yet.</p>

  <template v-else>
    <p v-if="set.about" class="about">{{ set.about }}</p>

    <div class="standing" :style="{ '--shade': shade(stats.score) }">
      <span class="standing-pct">{{ stats.pct == null ? '–' : stats.pct + '%' }}</span>
      <span class="standing-text">
        <template v-if="set.kind === 'gen'">{{ stats.practised ? 'right in your latest answers' : 'not practised yet' }}</template>
        <template v-else>{{ stats.practised }} of {{ stats.total }} practised</template>
      </span>
      <span class="meter" aria-hidden="true"><span :style="{ width: (stats.pct || 0) + '%' }"></span></span>
    </div>

    <section class="tight">
      <h2>Exercises</h2>
      <Checks v-model="ticked" :options="kinds" label="Kinds of exercise" />
      <p class="hint" :class="{ bad: !chosen.length }">{{ hint }}</p>
    </section>

    <section v-if="!isVerb" class="tight">
      <h2>Which way</h2>
      <Chips v-model="shownDir" :options="dirs" label="Which way" />
    </section>

    <section class="tight">
      <h2>How many</h2>
      <Chips v-model="shownLength" class="compact" :options="lengths" label="How much of it" />
      <p v-if="spread" class="hint">{{ spread }}</p>
    </section>

    <p v-if="problem" class="hint bad">{{ problem }}</p>
    <button type="button" class="btn primary wide" :disabled="!chosen.length" @click="start">Start</button>
    <button v-if="isList" type="button" class="btn wide" @click="cards">Flashcards <span class="btn-sub">no score, just practice</span></button>

    <section v-if="verbTables.length">
      <h2>The verbs</h2>
      <ul class="list verb-list">
        <li v-for="verb in verbTables" :key="verb.inf" class="verb-row">
          <p><b lang="pt-BR">{{ verb.inf }}</b> <span class="w-en">{{ verb.en }}</span></p>
          <dl lang="pt-BR">
            <div v-for="(form, i) in verb.forms" :key="i"><dt>{{ persons[i] }}</dt><dd>{{ form }}</dd></div>
          </dl>
        </li>
      </ul>
    </section>

    <section v-if="shownWords.length">
      <h2>Words</h2>
      <ul class="list">
        <WordRow v-for="wordId in shownWords" :id="wordId" :key="wordId" />
      </ul>
      <p v-if="set.ids.length > shownWords.length" class="hint">And {{ set.ids.length - shownWords.length }} more.</p>
    </section>
  </template>
</template>
