<script setup>
import { watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import TabBar from './components/TabBar.vue';
import { ui } from './store.js';

const route = useRoute();
const reload = () => window.location.reload();
// A session and its result fill the screen: no tab bar, and no shape in the background.
watchEffect(() => document.documentElement.classList.toggle('plain', !!route.meta.full));
</script>

<template>
  <main class="screen" :class="{ full: route.meta.full }">
    <p v-if="ui.saveFailed" class="banner bad" role="alert">
      The phone refused to save. Your latest answers may be lost: free some space, then save a backup in Settings.
    </p>
    <p v-if="ui.updateReady && !route.meta.full" class="banner">
      A newer version is ready.
      <button type="button" class="link" @click="reload">Show it</button>
    </p>
    <router-view />
  </main>
  <TabBar v-if="!route.meta.full" />
</template>
