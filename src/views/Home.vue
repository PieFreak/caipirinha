<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  state, ensureDaily, moreToday, getItem, getSet, librarySize, save, sourceChoices, LIBRARY_SETS,
} from '../store.js';
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
const quick = computed(() => LIBRARY_SETS.filter((set) => set.id !== 'lib:own' && getSet(set.id).ids.length));

// The greeting for the hour, as a Brazilian would give it.
const hour = new Date().getHours();
const hello = hour >= 5 && hour < 12 ? { pt: 'Bom dia!', en: 'Good morning' }
  : hour >= 12 && hour < 18 ? { pt: 'Boa tarde!', en: 'Good afternoon' }
  : { pt: 'Boa noite!', en: 'Good evening', night: true };

function more() {
  if (!moreToday()) nothingLeft.value = true;
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

    <p v-if="!today.length" class="empty">You have met every word the app has. Add your own in the library.</p>
    <article v-for="item in today" :key="item.id" class="word-card">
      <div class="wc-text">
        <p class="pt">{{ item.pt }}<small v-if="item.g" class="gender">{{ item.g }}</small></p>
        <p class="en">{{ shownEn(item.en) }}</p>
        <p v-if="item.say" class="say">Sounds like <b>{{ item.say }}</b></p>
        <p v-if="item.note" class="note">{{ item.note }}</p>
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
