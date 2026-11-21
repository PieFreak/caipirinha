<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { items } from '../content/index.js';
import { state, addOwn, getItem } from '../store.js';
import { findExisting, findMeaning } from '../lib/search.js';
import { shownEn } from '../lib/text.js';
import Icon from '../components/Icon.vue';

const router = useRouter();
const form = reactive({ pt: '', en: '', note: '' });
const problem = ref('');
const added = ref([]);
const first = ref(null);

// Everything the app has: its own words and phrases, and the ones the learner added.
const everything = computed(() => [...items.values(), ...Object.values(state.own)]);
// What matches the Portuguese typed so far, and what already carries the meaning typed.
const matches = computed(() => findExisting(form.pt, everything.value));
const meanings = computed(() => findMeaning(form.en, everything.value)
  .filter((match) => !matches.value.some((other) => other.entry.id === match.entry.id)));
// The very word being typed, when the app has it.
const same = computed(() => matches.value.find((match) => match.same)?.entry || null);
const inLibrary = (entry) => !!state.words[entry.id];
const looked = computed(() => form.pt.trim().length >= 2);

function done(id) {
  added.value.unshift(getItem(id));
  Object.assign(form, { pt: '', en: '', note: '' });
  problem.value = '';
  first.value?.focus();
}

function submit() {
  problem.value = '';
  const result = addOwn(form);
  if (result.error) problem.value = result.error;
  else done(result.id);
}

// A word the app has but the library does not yet: it joins as it is.
function take(entry) {
  const result = addOwn({ pt: entry.pt, en: entry.en, note: '' });
  if (result.error) problem.value = result.error;
  else done(result.id);
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

    <!-- What the app already has that looks like it, as it is typed. -->
    <div v-if="matches.length" class="found" aria-live="polite">
      <p class="found-head" :class="{ same }">{{ same ? 'This one is here already' : 'Already here' }}</p>
      <ul class="list">
        <li v-for="match in matches" :key="match.entry.id" class="found-row" :class="{ same: match.same }">
          <span class="word-main">
            <span class="w-pt">{{ match.entry.pt }}</span>
            <span class="w-en">{{ shownEn(match.entry.en) }}</span>
          </span>
          <router-link v-if="inLibrary(match.entry)" :to="{ name: 'word', params: { id: match.entry.id } }" class="tag in">
            In your library
          </router-link>
          <button v-else type="button" class="btn small" @click="take(match.entry)">Add this</button>
        </li>
      </ul>
    </div>
    <p v-else-if="looked" class="hint" aria-live="polite">Nothing like it yet: this would be a new one.</p>

    <template v-if="!same">
      <label>
        <span>Meaning</span>
        <input v-model="form.en" class="field" type="text" placeholder="longing / missing someone"
          autocapitalize="off" autocomplete="off" required>
        <small>Several meanings that all count: separate them with " / ".</small>
      </label>

      <div v-if="meanings.length" class="found" aria-live="polite">
        <p class="found-head">Already here with that meaning</p>
        <ul class="list">
          <li v-for="match in meanings" :key="match.entry.id" class="found-row">
            <span class="word-main">
              <span class="w-pt">{{ match.entry.pt }}</span>
              <span class="w-en">{{ shownEn(match.entry.en) }}</span>
            </span>
            <router-link v-if="inLibrary(match.entry)" :to="{ name: 'word', params: { id: match.entry.id } }" class="tag in">
              In your library
            </router-link>
            <button v-else type="button" class="btn small" @click="take(match.entry)">Add this</button>
          </li>
        </ul>
      </div>

      <label>
        <span>Note <i>(optional)</i></span>
        <input v-model="form.note" class="field" type="text" placeholder="Where you heard it, or how it is used">
      </label>
    </template>

    <p v-if="problem" class="hint bad" role="alert">{{ problem }}</p>
    <p v-if="same && inLibrary(same)" class="hint">"{{ same.pt }}" is in your library already. Keep typing to add something longer.</p>
    <button v-else type="submit" class="btn primary wide">{{ same ? `Add "${same.pt}" to my library` : 'Add to my library' }}</button>
  </form>

  <section v-if="added.length">
    <h2>Added now</h2>
    <ul class="list">
      <li v-for="item in added" :key="item.id" class="try good">
        <Icon name="check" :size="18" />
        <span class="word-main"><span class="w-pt">{{ item.pt }}</span><span class="w-en">{{ shownEn(item.en) }}</span></span>
      </li>
    </ul>
  </section>
</template>
