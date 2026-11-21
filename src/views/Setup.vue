<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getSet, setStats, shade, state, save } from '../store.js';
import { buildSession, modesFor, DIRS, LENGTHS, MODES } from '../lib/session.js';
import { play } from '../lib/play.js';
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
const length = ref(state.settings.length);

const WHY = { order: 'nothing here is a sentence', listen: 'this device cannot read aloud' };
const kinds = computed(() => MODES.map((m) => ({ ...m, disabled: !allowed.value[m.id], why: allowed.value[m.id] ? '' : WHY[m.id] })));
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
// A set of 12 words offers 5, 10 and All: a larger number would be All under another name.
// Counting and clock times are made up without end, so there is no All for them.
const lengths = computed(() => (set.value.kind === 'gen'
  ? LENGTHS.filter((option) => option.id)
  : LENGTHS.filter((option) => !option.id || option.id < set.value.ids.length)));
const shownLength = computed({
  get: () => (lengths.value.some((option) => option.id === length.value) ? length.value : set.value.kind === 'gen' ? 20 : 0),
  set: (value) => { length.value = value; },
});
const shownWords = computed(() => (set.value.kind === 'list' ? set.value.ids.slice(0, 120) : []));
const problem = ref('');

function start() {
  Object.assign(state.settings, { modes: ticked.value.slice(), dir: dir.value, length: length.value });
  save();
  const session = buildSession(props.id, { modes: chosen.value, dir: shownDir.value, length: shownLength.value });
  if (!session) {
    problem.value = 'Nothing here fits the kinds of exercise you ticked. Tick another.';
    return;
  }
  play.session = { ...session, length: shownLength.value };
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

    <section class="tight">
      <h2>Which way</h2>
      <Chips v-model="shownDir" :options="dirs" label="Which way" />
    </section>

    <section class="tight">
      <h2>How many</h2>
      <Chips v-model="shownLength" :options="lengths" label="How many questions" />
    </section>

    <p v-if="problem" class="hint bad">{{ problem }}</p>
    <button type="button" class="btn primary wide" :disabled="!chosen.length" @click="start">Start</button>

    <section v-if="shownWords.length">
      <h2>Words</h2>
      <ul class="list">
        <WordRow v-for="wordId in shownWords" :id="wordId" :key="wordId" />
      </ul>
      <p v-if="set.ids.length > shownWords.length" class="hint">And {{ set.ids.length - shownWords.length }} more.</p>
    </section>
  </template>
</template>
