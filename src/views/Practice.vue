<script setup>
import { computed } from 'vue';
import { groups, sections } from '../content/index.js';
import { getSet, librarySize, LIBRARY_SETS } from '../store.js';
import SetRow from '../components/SetRow.vue';
import Icon from '../components/Icon.vue';

const mine = computed(() => LIBRARY_SETS.filter((set) => getSet(set.id).ids.length));
const bySection = sections.map((title) => ({ title, groups: groups.filter((group) => group.section === title) }));
</script>

<template>
  <header class="top">
    <h1>Practise</h1>
    <router-link to="/settings" class="icon-btn" aria-label="Settings"><Icon name="settings" /></router-link>
  </header>

  <router-link to="/sounds" class="guide">
    <span class="guide-mark" aria-hidden="true">ão</span>
    <span class="set-main"><span class="set-title">How Brazilian Portuguese sounds</span><span class="set-sub">The spellings that surprise most, to hear and read</span></span>
    <Icon name="next" :size="18" />
  </router-link>

  <section>
    <h2>My library</h2>
    <ul v-if="mine.length" class="list">
      <SetRow v-for="set in mine" :id="set.id" :key="set.id" />
    </ul>
    <p v-else class="empty">
      {{ librarySize ? 'Practise a few words first: then this shows what you get wrong and what you have not seen for a while.'
        : 'Your library is empty. Every word you practise below joins it.' }}
    </p>
  </section>

  <section v-for="section in bySection" :key="section.title">
    <h2>{{ section.title }}</h2>
    <ul class="list">
      <SetRow v-for="group in section.groups" :id="group.id" :key="group.id" />
    </ul>
  </section>
</template>
