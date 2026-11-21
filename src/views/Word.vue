<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { groupsById } from '../content/index.js';
import { state, getItem, removeWord, scoreOf, shade } from '../store.js';
import { shownEn } from '../lib/text.js';
import Icon from '../components/Icon.vue';
import SpeakButton from '../components/SpeakButton.vue';

const props = defineProps({ id: { type: String, required: true } });
const router = useRouter();

const item = computed(() => getItem(props.id));
const word = computed(() => state.words[props.id] || null);
const score = computed(() => scoreOf(props.id));
const isOwn = computed(() => !!state.own[props.id]);
const where = computed(() => (item.value?.groups || [])
  .map((id) => (id === 'own' ? 'Words I added' : groupsById[id]?.title))
  .filter(Boolean).join(', '));

const date = (time) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(time));
const confirming = ref(false);

function remove() {
  removeWord(props.id);
  router.back();
}
</script>

<template>
  <header class="bar">
    <button type="button" class="icon-btn" aria-label="Back" @click="router.back()"><Icon name="back" /></button>
    <h1>Word</h1>
  </header>

  <p v-if="!item" class="empty">This word is no longer here.</p>

  <template v-else>
    <article class="word-card tall">
      <div class="wc-text">
        <p class="pt big">{{ item.pt }}<small v-if="item.g" class="gender">{{ item.g }}</small></p>
        <p class="en">{{ shownEn(item.en) }}</p>
        <p v-if="item.say" class="say">Sounds like <b>{{ item.say }}</b></p>
        <p v-if="item.note" class="note">{{ item.note }}</p>
      </div>
      <SpeakButton :text="item.pt" big />
    </article>

    <section v-if="word">
      <h2>How well you know it</h2>
      <div class="standing" :style="{ '--shade': shade(score) }">
        <span class="standing-pct">{{ score == null ? '–' : Math.round(score * 100) + '%' }}</span>
        <span class="standing-text">{{ word.n ? `${word.ok} right, ${word.bad} wrong` : 'not practised yet' }}</span>
        <span class="meter" aria-hidden="true"><span :style="{ width: (score || 0) * 100 + '%' }"></span></span>
      </div>
      <p v-if="word.hist" class="dots" :aria-label="`Latest ${word.hist.length} answers, oldest first`">
        <span v-for="(c, i) in word.hist" :key="i" :class="c === '1' ? 'good' : 'bad'">
          <Icon :name="c === '1' ? 'check' : 'close'" :size="13" />
        </span>
      </p>
      <dl class="facts">
        <div v-if="word.last"><dt>Last practised</dt><dd>{{ date(word.last) }}</dd></div>
        <div><dt>In your library since</dt><dd>{{ date(word.added) }}</dd></div>
        <div v-if="where"><dt>Part of</dt><dd>{{ where }}</dd></div>
      </dl>

      <button v-if="!confirming" type="button" class="btn wide" @click="confirming = true">Take out of my library</button>
      <div v-else class="confirm">
        <p>{{ isOwn ? 'This deletes the word you added and its history.' : 'This forgets the word\'s history. It can come back as a new word.' }}</p>
        <div class="row">
          <button type="button" class="btn danger" @click="remove">Take it out</button>
          <button type="button" class="btn" @click="confirming = false">Keep it</button>
        </div>
      </div>
    </section>
    <p v-else class="hint">Not in your library yet: it joins when you practise it.</p>
  </template>
</template>
