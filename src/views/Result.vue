<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { play } from '../lib/play.js';
import { buildSession } from '../lib/session.js';
import { shade } from '../store.js';
import Icon from '../components/Icon.vue';

const router = useRouter();
const result = play.result;
onMounted(() => { if (!result) router.replace('/practice'); });

const share = computed(() => (result && result.n ? result.ok / result.n : 0));
const missed = computed(() => (result ? result.tries.filter((t) => !t.ok && t.id).map((t) => t.id) : []));

function start(ids) {
  const session = buildSession(result.setId, { mode: result.mode, dir: result.dir, length: ids ? 0 : result.length }, ids);
  if (!session) return;
  play.session = { ...session, length: result.length };
  router.replace('/play');
}
</script>

<template>
  <div v-if="result" class="result">
    <p class="result-set">{{ result.title }}</p>
    <p class="result-score" :style="{ '--shade': shade(share) }">
      <b>{{ Math.round(share * 100) }}%</b>
      <span>{{ result.ok }} of {{ result.n }} right the first time</span>
    </p>

    <ul class="list">
      <li v-for="(t, i) in result.tries" :key="i" class="try" :class="t.ok ? 'good' : 'bad'">
        <Icon :name="t.ok ? 'check' : 'close'" :size="18" />
        <span class="word-main"><span class="w-pt">{{ t.pt }}</span><span class="w-en">{{ t.en }}</span></span>
      </li>
    </ul>

    <div class="stack">
      <button v-if="missed.length" type="button" class="btn primary wide" @click="start(missed)">
        Practise the {{ missed.length }} I missed
      </button>
      <button type="button" class="btn wide" :class="{ primary: !missed.length }" @click="start()">Again</button>
      <button type="button" class="btn wide" @click="router.replace('/practice')">Done</button>
    </div>
  </div>
</template>
