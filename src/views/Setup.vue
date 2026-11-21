<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getSet, setStats, shade, state, save } from '../store.js';
import { buildSession, modesFor, DIRS, LENGTHS, MODES } from '../lib/session.js';
import { play } from '../lib/play.js';
import Chips from '../components/Chips.vue';
import Icon from '../components/Icon.vue';
import WordRow from '../components/WordRow.vue';

const props = defineProps({ id: { type: String, required: true } });
const router = useRouter();

const set = computed(() => getSet(props.id));
const stats = computed(() => (set.value ? setStats(set.value) : null));
const empty = computed(() => !set.value || (set.value.kind === 'list' && !set.value.ids.length));
const allowed = computed(() => (empty.value ? {} : modesFor(set.value)));

// The last choices are remembered; a way of practising this set cannot offer falls back to Mixed.
const mode = ref(state.settings.mode);
const dir = ref(state.settings.dir);
const length = ref(state.settings.length);
if (!empty.value && !allowed.value[mode.value]) mode.value = 'mixed';

const modes = computed(() => MODES.map((m) => ({ ...m, disabled: !allowed.value[m.id] })));
const about = computed(() => MODES.find((m) => m.id === mode.value).about);
const dirs = computed(() => DIRS.map((d) => ({ ...d, disabled: mode.value === 'order' && d.id !== 'en-pt' })));
const shownDir = computed({
  get: () => (mode.value === 'order' ? 'en-pt' : dir.value),
  set: (value) => { dir.value = value; },
});
const shownWords = computed(() => (set.value.kind === 'list' ? set.value.ids.slice(0, 120) : []));
const problem = ref('');

function start() {
  Object.assign(state.settings, { mode: mode.value, dir: dir.value, length: length.value });
  save();
  const session = buildSession(props.id, { mode: mode.value, dir: shownDir.value, length: length.value });
  if (!session) {
    problem.value = 'Nothing here fits that way of practising. Try Mixed.';
    return;
  }
  play.session = { ...session, length: length.value };
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
      <h2>How</h2>
      <Chips v-model="mode" :options="modes" label="How to practise" />
      <p class="hint">{{ about }}</p>
    </section>

    <section class="tight">
      <h2>Which way</h2>
      <Chips v-model="shownDir" :options="dirs" label="Which way" />
    </section>

    <section class="tight">
      <h2>How many</h2>
      <Chips v-model="length" :options="LENGTHS" label="How many questions" />
    </section>

    <p v-if="problem" class="hint bad">{{ problem }}</p>
    <button type="button" class="btn primary wide" @click="start">Start</button>

    <section v-if="shownWords.length">
      <h2>Words</h2>
      <ul class="list">
        <WordRow v-for="wordId in shownWords" :id="wordId" :key="wordId" />
      </ul>
      <p v-if="set.ids.length > shownWords.length" class="hint">And {{ set.ids.length - shownWords.length }} more.</p>
    </section>
  </template>
</template>
