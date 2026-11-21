import { createRouter, createWebHashHistory } from 'vue-router';
import Home from './views/Home.vue';
import Practice from './views/Practice.vue';
import Setup from './views/Setup.vue';
import Session from './views/Session.vue';
import Result from './views/Result.vue';
import Library from './views/Library.vue';
import Word from './views/Word.vue';
import AddWord from './views/AddWord.vue';
import Progress from './views/Progress.vue';
import Settings from './views/Settings.vue';
import Sounds from './views/Sounds.vue';

// Addresses after "#", so the app works from any folder of any file host.
// "tab" says which tab is lit; "full" hides the tab bar.
export default createRouter({
  history: createWebHashHistory(),
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
  routes: [
    { path: '/', name: 'home', component: Home, meta: { tab: 'home' } },
    { path: '/practice', name: 'practice', component: Practice, meta: { tab: 'practice' } },
    { path: '/set/:id', name: 'set', component: Setup, props: true, meta: { tab: 'practice' } },
    { path: '/play', name: 'play', component: Session, meta: { full: true } },
    { path: '/result', name: 'result', component: Result, meta: { full: true } },
    { path: '/library', name: 'library', component: Library, meta: { tab: 'library' } },
    { path: '/word/:id', name: 'word', component: Word, props: true, meta: { tab: 'library' } },
    { path: '/add', name: 'add', component: AddWord, meta: { tab: 'library' } },
    { path: '/progress', name: 'progress', component: Progress, meta: { tab: 'progress' } },
    { path: '/settings', name: 'settings', component: Settings, meta: { tab: 'home' } },
    { path: '/sounds', name: 'sounds', component: Sounds, meta: { tab: 'home' } },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
});
