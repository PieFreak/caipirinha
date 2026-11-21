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
import Cards from './views/Cards.vue';

// Addresses after "#", so the app works from any folder of any file host.
// "tab" says which tab is lit; "full" hides the tab bar; "title" names the page.
export default createRouter({
  history: createWebHashHistory(),
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
  routes: [
    { path: '/', name: 'home', component: Home, meta: { tab: 'home', title: 'Today' } },
    { path: '/practice', name: 'practice', component: Practice, meta: { tab: 'practice', title: 'Practise' } },
    { path: '/set/:id', name: 'set', component: Setup, props: true, meta: { tab: 'practice', title: 'Practise' } },
    { path: '/play', name: 'play', component: Session, meta: { full: true, title: 'Session' } },
    { path: '/cards', name: 'cards', component: Cards, meta: { full: true, title: 'Flashcards' } },
    { path: '/result', name: 'result', component: Result, meta: { full: true, title: 'How it went' } },
    { path: '/library', name: 'library', component: Library, meta: { tab: 'library', title: 'Library' } },
    { path: '/word/:id', name: 'word', component: Word, props: true, meta: { tab: 'library', title: 'Word' } },
    { path: '/add', name: 'add', component: AddWord, meta: { tab: 'library', title: 'Add a word' } },
    { path: '/progress', name: 'progress', component: Progress, meta: { tab: 'progress', title: 'Progress' } },
    { path: '/settings', name: 'settings', component: Settings, meta: { tab: 'home', title: 'Settings' } },
    { path: '/sounds', name: 'sounds', component: Sounds, meta: { tab: 'practice', title: 'How it sounds' } },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
});
