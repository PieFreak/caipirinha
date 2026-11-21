import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';
import { initSpeech } from './lib/speech.js';
import { ui } from './store.js';
import './style.css';

createApp(App).use(router).mount('#app');

// Each page names itself in the title, and the focus moves to its heading, so a screen
// reader says where it now is.
let first = true;
router.afterEach((to) => {
  document.title = to.meta.title && to.name !== 'home' ? `${to.meta.title} · Caipirinha` : 'Caipirinha';
  if (first) { first = false; return; }
  setTimeout(() => {
    const heading = document.querySelector('main h1');
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }, 60);
});
initSpeech();

// Ask the phone to keep the app's data even when it runs short of space.
navigator.storage?.persist?.().catch(() => {});

// The service worker is what makes the app open without a connection. Built app only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadOne = !!navigator.serviceWorker.controller;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      let checked = Date.now();
      const check = () => {
        if (document.hidden || Date.now() - checked < 60000) return;
        checked = Date.now();
        registration.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', check);
      setInterval(check, 30 * 60000);
    }).catch(() => {});
  });
  // A newer version took over while this one was open: offer to show it.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadOne) ui.updateReady = true;
  });
}
