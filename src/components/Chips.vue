<script setup>
// One choice out of a few, as a row of buttons.
const model = defineModel();
defineProps({ options: { type: Array, required: true }, label: { type: String, default: '' } });
</script>

<template>
  <div class="chips" role="radiogroup" :aria-label="label">
    <button v-for="option in options" :key="String(option.id)" type="button" class="chip" role="radio"
      :class="{ on: model === option.id }" :aria-checked="model === option.id" :disabled="option.disabled"
      @click="model = option.id">{{ option.title }}</button>
  </div>
</template>
