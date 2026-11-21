<script setup>
import { useRoute } from 'vue-router';
import Icon from './Icon.vue';

const route = useRoute();
const TABS = [
  { id: 'home', to: '/', title: 'Today' },
  { id: 'practice', to: '/practice', title: 'Practise' },
  { id: 'library', to: '/library', title: 'Library' },
  { id: 'progress', to: '/progress', title: 'Progress' },
];
</script>

<template>
  <nav class="tabbar" aria-label="Main">
    <router-link v-for="tab in TABS" :key="tab.id" :to="tab.to" class="tab" :class="{ on: route.meta.tab === tab.id }"
      :aria-current="route.meta.tab === tab.id ? 'page' : undefined">
      <Icon :name="tab.id" />
      <span>{{ tab.title }}</span>
    </router-link>
  </nav>
</template>
