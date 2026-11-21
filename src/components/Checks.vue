<script setup>
import Icon from './Icon.vue';

// Any number of choices out of a few: each one is ticked or not.
// An option that cannot be chosen here is shown unticked and says why.
const model = defineModel({ type: Array, required: true });
defineProps({ options: { type: Array, required: true }, label: { type: String, default: '' } });

function toggle(id) {
  model.value = model.value.includes(id) ? model.value.filter((other) => other !== id) : [...model.value, id];
}
</script>

<template>
  <div class="chips" role="group" :aria-label="label">
    <button v-for="option in options" :key="option.id" type="button" class="chip check" role="checkbox"
      :class="{ on: model.includes(option.id) && !option.disabled }"
      :aria-checked="model.includes(option.id) && !option.disabled" :disabled="option.disabled" :title="option.why || undefined"
      @click="toggle(option.id)">
      <span class="box" aria-hidden="true"><Icon v-if="model.includes(option.id) && !option.disabled" name="check" :size="14" /></span>
      {{ option.title }}
    </button>
  </div>
</template>
