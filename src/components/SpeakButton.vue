<script setup>
import Icon from './Icon.vue';
import { speak, speech } from '../lib/speech.js';

const props = defineProps({ text: { type: String, required: true }, big: Boolean });

// A second tap within three seconds reads it slowly.
let last = 0;
function say() {
  const now = Date.now();
  speak(props.text, { slow: now - last < 3000 });
  last = now - last < 3000 ? 0 : now;
}
</script>

<template>
  <button v-if="speech.supported" type="button" class="speak" :class="{ big }" aria-label="Hear it" @click.stop.prevent="say">
    <Icon name="speaker" :size="big ? 30 : 22" />
  </button>
</template>
