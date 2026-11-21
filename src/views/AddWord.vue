<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { addOwn, getItem } from '../store.js';
import Icon from '../components/Icon.vue';

const router = useRouter();
const form = reactive({ pt: '', en: '', note: '' });
const problem = ref('');
const added = ref([]);
const first = ref(null);

function submit() {
  problem.value = '';
  const result = addOwn(form);
  if (result.error) {
    problem.value = result.error;
    return;
  }
  added.value.unshift(getItem(result.id));
  Object.assign(form, { pt: '', en: '', note: '' });
  first.value?.focus();
}
</script>

<template>
  <header class="bar">
    <button type="button" class="icon-btn" aria-label="Back" @click="router.back()"><Icon name="back" /></button>
    <h1>Add a word</h1>
  </header>

  <form class="form" @submit.prevent="submit">
    <label>
      <span>Portuguese</span>
      <input ref="first" v-model="form.pt" class="field" type="text" lang="pt-BR" placeholder="saudade"
        autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" required>
    </label>
    <label>
      <span>Meaning</span>
      <input v-model="form.en" class="field" type="text" placeholder="longing / missing someone"
        autocapitalize="off" autocomplete="off" required>
      <small>Several meanings that all count: separate them with " / ".</small>
    </label>
    <label>
      <span>Note <i>(optional)</i></span>
      <input v-model="form.note" class="field" type="text" placeholder="Where you heard it, or how it is used">
    </label>
    <p v-if="problem" class="hint bad" role="alert">{{ problem }}</p>
    <button type="submit" class="btn primary wide">Add to my library</button>
  </form>

  <section v-if="added.length">
    <h2>Added now</h2>
    <ul class="list">
      <li v-for="item in added" :key="item.id" class="try good">
        <Icon name="check" :size="18" />
        <span class="word-main"><span class="w-pt">{{ item.pt }}</span><span class="w-en">{{ item.en }}</span></span>
      </li>
    </ul>
  </section>
</template>
