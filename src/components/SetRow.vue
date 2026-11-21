<script setup>
import { computed } from 'vue';
import { getSet, setStats, shade } from '../store.js';
import Icon from './Icon.vue';

// One thing to practise, with how it stands: a share like a quiz score.
const props = defineProps({ id: { type: String, required: true } });
const set = computed(() => getSet(props.id));
const stats = computed(() => setStats(set.value));
const sub = computed(() => {
  const s = stats.value;
  if (set.value.kind === 'gen') return s.practised ? `${s.practised} answered · latest ${Math.min(s.practised, 50)} count` : 'Not practised yet';
  const words = `${s.total} ${s.total === 1 ? 'word' : 'words'}`;
  return s.practised ? `${words} · ${s.practised} practised` : words;
});
</script>

<template>
  <li v-if="set">
    <router-link :to="{ name: 'set', params: { id } }" class="set-row">
      <span class="set-main">
        <span class="set-title">{{ set.title }}</span>
        <span class="set-sub">{{ sub }}</span>
      </span>
      <span class="score" :class="{ none: stats.pct == null }" :style="{ '--shade': shade(stats.score) }">
        {{ stats.pct == null ? '–' : stats.pct + '%' }}
      </span>
      <Icon name="next" :size="18" />
    </router-link>
  </li>
</template>
