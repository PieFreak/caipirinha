<script setup>
import { computed, ref } from 'vue';
import { state, getItem, librarySize } from '../store.js';
import { clean, stripAccents } from '../lib/text.js';
import Chips from '../components/Chips.vue';
import Icon from '../components/Icon.vue';
import WordRow from '../components/WordRow.vue';
import Toucan from '../components/art/Toucan.vue';

const SORTS = [
  { id: 'recent', title: 'Newest' },
  { id: 'weak', title: 'Weakest' },
  { id: 'old', title: 'Longest ago' },
  { id: 'az', title: 'A–Z' },
];
const sort = ref('recent');
const search = ref('');
const plain = (text) => stripAccents(clean(text));

const ids = computed(() => {
  const words = state.words;
  const wanted = plain(search.value);
  let list = Object.keys(words).filter(getItem);
  if (wanted) list = list.filter((id) => plain(getItem(id).pt).includes(wanted) || plain(getItem(id).en).includes(wanted));
  // A word never practised has no score: it comes last when sorting by weakness.
  const weakness = (id) => (words[id].n ? words[id].s : 2);
  const by = {
    recent: (a, b) => words[b].added - words[a].added,
    weak: (a, b) => weakness(a) - weakness(b) || words[b].bad - words[a].bad,
    old: (a, b) => (words[a].last || words[a].added) - (words[b].last || words[b].added),
    az: (a, b) => getItem(a).pt.localeCompare(getItem(b).pt, 'pt'),
  };
  return list.sort(by[sort.value]);
});

// A long library is shown a part at a time, so the list stays quick.
const shown = ref(150);
const visible = computed(() => ids.value.slice(0, shown.value));
</script>

<template>
  <header class="top">
    <div>
      <h1>Library</h1>
      <p class="sub">{{ librarySize }} {{ librarySize === 1 ? 'word' : 'words' }}</p>
    </div>
    <router-link to="/add" class="btn small"><Icon name="plus" :size="18" /> Add a word</router-link>
  </header>

  <div v-if="!librarySize" class="cheer">
    <Toucan />
    <p class="bubble"><b lang="pt-BR">Bora aprender!</b><span>Let's learn!</span></p>
  </div>
  <p v-if="!librarySize" class="empty">
    Nothing here yet. Words join your library when you practise them, when they arrive as the day's new words,
    and when you add your own.
  </p>

  <template v-else>
    <input v-model="search" class="field" type="search" placeholder="Search" aria-label="Search your library"
      autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false">
    <Chips v-model="sort" :options="SORTS" label="Order" />

    <p class="legend" aria-hidden="true">
      <span class="swatch" style="--shade: var(--unknown)"></span> not practised
      <span class="ramp"></span> from weak to well known
    </p>

    <ul class="list">
      <WordRow v-for="id in visible" :id="id" :key="id" />
    </ul>
    <p v-if="!ids.length" class="empty">No word matches.</p>
    <button v-if="ids.length > visible.length" type="button" class="btn wide" @click="shown += 150">
      Show more ({{ ids.length - visible.length }} left)
    </button>
  </template>
</template>
