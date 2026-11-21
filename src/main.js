import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';
import { initSpeech } from './lib/speech.js';
import { ui } from './store.js';
import './style.css';

createApp(App).use(router).mount('#app');
initSpeech();

// Ask the phone to keep the app's data even when it runs short of space.
navigator.storage?.persist?.().catch(() => {});

// The service worker is what makes the app open without a connection. Built app only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadOne = !!navigator.serviceWorker.controller;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
  // A newer version took over while this one was open: offer to show it.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadOne) ui.updateReady = true;
  });
}
