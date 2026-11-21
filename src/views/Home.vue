<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  state, ensureDaily, moreToday, knowToday, getItem, getSet, librarySize, save, sourceChoices, LIBRARY_SETS,
} from '../store.js';
import { buildSession, modesFor } from '../lib/session.js';
import { dropSession, keptSession, startSession } from '../lib/play.js';
import { shownEn } from '../lib/text.js';
import Icon from '../components/Icon.vue';
import SpeakButton from '../components/SpeakButton.vue';
import SetRow from '../components/SetRow.vue';
import HeroArt from '../components/art/HeroArt.vue';

const router = useRouter();
const nothingLeft = ref(false);

// A new day may start while the app stays open in the background.
const wake = () => { if (!document.hidden) ensureDaily(); };
onMounted(() => { ensureDaily(); document.addEventListener('visibilitychange', wake); });
onBeforeUnmount(() => document.removeEventListener('visibilitychange', wake));

const today = computed(() => state.daily.ids.map(getItem).filter(Boolean));
const source = computed({
  get: () => state.settings.source,
  set: (value) => { state.settings.source = value; save(); nothingLeft.value = false; },
});
const quick = computed(() => LIBRARY_SETS.filter((set) => !['lib:own', 'lib:review'].includes(set.id) && getSet(set.id).ids.length));

// The greeting for the hour, as a Brazilian would give it.
const hour = new Date().getHours();
const hello = hour >= 5 && hour < 12 ? { pt: 'Bom dia!', en: 'Good morning' }
  : hour >= 12 && hour < 18 ? { pt: 'Boa tarde!', en: 'Good afternoon' }
  : { pt: 'Boa noite!', en: 'Good evening', night: true };

function more() {
  if (!moreToday()) nothingLeft.value = true;
}

// "I know this": the word joins the library at 100% and another new word takes its place.
const undoLast = ref(null);
function know(item) {
  const undo = knowToday(item.id);
  undoLast.value = { pt: item.pt, undo };
}
function undoKnow() {
  undoLast.value?.undo();
  undoLast.value = null;
}

// A session left unfinished: continue it, or let it go.
const kept = ref(keptSession());
function continueKept() {
  startSession(kept.value.session, kept.value);
  router.push('/play');
}
function dropKept() {
  dropSession();
  kept.value = null;
}

// The daily review, in one tap: the weakest words and the longest unseen, with the kinds
// of exercise and direction last chosen.
const reviewSet = computed(() => getSet('lib:review'));
function startReview() {
  const allowed = modesFor(reviewSet.value);
  const modes = state.settings.modes.filter((mode) => allowed[mode]);
  const session = buildSession('lib:review', { modes: modes.length ? modes : ['choose', 'type'], dir: state.settings.dir, length: 0 });
  if (!session) return;
  startSession({ ...session, length: 0 });
  router.push('/play');
}
</script>

<template>
  <header class="hero">
    <HeroArt class="hero-art" :night="hello.night" />
    <div class="hero-top">
      <span class="wordmark">Caipirinha</span>
      <router-link to="/settings" class="icon-btn" aria-label="Settings"><Icon name="settings" /></router-link>
    </div>
    <h1 class="hero-hello" lang="pt-BR" :title="hello.en">{{ hello.pt }}</h1>
    <p class="hero-sub" lang="pt-BR">Aprenda português.<br>Viva o Brasil!</p>
    <p class="hero-count"><b>{{ librarySize }}</b> {{ librarySize === 1 ? 'word' : 'words' }} in your library</p>
  </header>

  <section v-if="kept" class="card-row">
    <div class="card-text">
      <p class="card-title">Continue where you left off</p>
      <p class="hint">{{ kept.session.title }} · {{ kept.index }} of {{ kept.queue.length }} done</p>
    </div>
    <button type="button" class="btn primary small" @click="continueKept">Continue</button>
    <button type="button" class="icon-btn" aria-label="Let the unfinished session go" @click="dropKept"><Icon name="close" :size="20" /></button>
  </section>

  <section v-if="reviewSet.ids.length" class="card-row review">
    <div class="card-text">
      <p class="card-title">Daily review</p>
      <p class="hint">{{ reviewSet.ids.length }} {{ reviewSet.ids.length === 1 ? 'word' : 'words' }}: your weakest, and those you haven't seen for longest</p>
    </div>
    <button type="button" class="btn primary small" @click="startReview">Start</button>
  </section>

  <section>
    <div class="section-head">
      <h2>Today's new words</h2>
      <label class="pick">
        <span>From</span>
        <select v-model="source" aria-label="Where new words come from">
          <option v-for="choice in sourceChoices" :key="choice.id" :value="choice.id">{{ choice.title }}</option>
        </select>
      </label>
    </div>

    <p v-if="undoLast" class="banner" role="status">
      Marked <b lang="pt-BR">{{ undoLast.pt }}</b> as known; here is another word.
      <button type="button" class="link" @click="undoKnow">Undo</button>
    </p>
    <p v-if="!today.length" class="empty">You have met every word the app has. Add your own in the library.</p>
    <article v-for="item in today" :key="item.id" class="word-card">
      <div class="wc-text">
        <p class="pt" lang="pt-BR">{{ item.pt }}<small v-if="item.g" class="gender">{{ item.g }}</small></p>
        <p class="en">{{ shownEn(item.en) }}</p>
        <p v-if="item.say" class="say">Sounds like <b>{{ item.say }}</b></p>
        <p v-if="item.example" class="example">
          <span lang="pt-BR">{{ item.example.pt }}</span>
          <span class="example-en">{{ item.example.en }}</span>
        </p>
        <p v-if="item.note" class="note">{{ item.note }}</p>
        <button type="button" class="link know" @click="know(item)">I know this</button>
      </div>
      <SpeakButton :text="item.pt" big />
    </article>

    <div v-if="today.length" class="row">
      <button type="button" class="btn primary" @click="router.push({ name: 'set', params: { id: 'today' } })">Practise these</button>
      <button type="button" class="btn" @click="more">{{ state.settings.perDay }} more</button>
    </div>
    <p v-if="nothingLeft" class="hint">There are no more new words to give.</p>
  </section>

  <section v-if="quick.length">
    <h2>From your library</h2>
    <ul class="list">
      <SetRow v-for="set in quick" :id="set.id" :key="set.id" />
    </ul>
  </section>

  <p class="hint center"><router-link to="/sounds">How Brazilian Portuguese sounds</router-link></p>
</template>
