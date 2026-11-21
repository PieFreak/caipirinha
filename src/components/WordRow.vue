<script setup>
import { computed } from 'vue';
import { getItem, scoreOf, shade } from '../store.js';
import { shownEn } from '../lib/text.js';
import SpeakButton from './SpeakButton.vue';

// One word in a list: how well it is known as a color from red to green (gray
// before its first answer) and, beside it, the same as a number.
const props = defineProps({ id: { type: String, required: true } });
const item = computed(() => getItem(props.id));
const score = computed(() => scoreOf(props.id));
</script>

<template>
  <li v-if="item" class="word-row" :style="{ '--shade': shade(score), '--tint': shade(score, 0.1) }">
    <router-link :to="{ name: 'word', params: { id } }" class="word-main">
      <span class="w-pt">{{ item.pt }}<small v-if="item.g" class="gender">{{ item.g }}</small></span>
      <span class="w-en">{{ shownEn(item.en) }}</span>
    </router-link>
    <span class="pct" :class="{ none: score == null }">{{ score == null ? 'new' : Math.round(score * 100) + '%' }}</span>
    <SpeakButton :text="item.pt" />
  </li>
</template>
