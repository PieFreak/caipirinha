<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { play } from '../lib/play.js';
import { shuffle } from '../lib/session.js';
import { speak, stopSpeaking } from '../lib/speech.js';
import { state } from '../store.js';
import Icon from '../components/Icon.vue';
import SpeakButton from '../components/SpeakButton.vue';

// Flashcards: one side, a tap, the other side. Nothing is judged and nothing is counted:
// it is for going through words at one's own pace.
const router = useRouter();
const deck = play.cards;
const cards = ref(deck ? deck.cards.slice() : []);
const index = ref(0);
const flipped = ref(false);
const card = computed(() => cards.value[index.value]);
const done = computed(() => index.value >= cards.value.length);

// Which side is up: Portuguese, English, or either at random (fixed per card).
const sides = ref(cards.value.map(() => (deck?.dir === 'en-pt' ? 'en' : deck?.dir === 'pt-en' ? 'pt' : Math.random() < 0.5 ? 'pt' : 'en')));
const front = computed(() => sides.value[index.value]);

function flip() {
  if (done.value) return;
  flipped.value = !flipped.value;
}

function go(step) {
  const next = index.value + step;
  if (next < 0 || next > cards.value.length) return;
  index.value = next;
  flipped.value = false;
}

function again() {
  cards.value = shuffle(cards.value);
  sides.value = shuffle(sides.value);
  index.value = 0;
  flipped.value = false;
}

// The Portuguese is read aloud whenever it comes into view.
watch([index, flipped], () => {
  if (done.value || !state.settings.autoSpeak) return;
  if (front.value === 'pt' ? !flipped.value : flipped.value) speak(card.value.pt);
});

function onKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (done.value) again(); else flip(); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
  else if (event.key === 'r' || event.key === 'R') { if (card.value) speak(card.value.pt); }
  else if (event.key === 'Escape') { event.preventDefault(); router.back(); }
}

onMounted(() => {
  if (!deck) { router.replace('/practice'); return; }
  window.addEventListener('keydown', onKey);
  if (state.settings.autoSpeak && front.value === 'pt' && card.value) speak(card.value.pt);
});
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); stopSpeaking(); });
</script>

<template>
  <div v-if="deck" class="session cards">
    <header class="session-top">
      <button type="button" class="icon-btn" aria-label="Close the flashcards" @click="router.back()"><Icon name="close" /></button>
      <div class="track" role="progressbar" :aria-valuenow="index" aria-valuemin="0" :aria-valuemax="cards.length"
        :aria-label="`Card ${Math.min(index + 1, cards.length)} of ${cards.length}`">
        <span :style="{ width: Math.min(index, cards.length) / cards.length * 100 + '%' }"></span>
      </div>
      <span class="count">{{ Math.min(index + 1, cards.length) }}/{{ cards.length }}</span>
    </header>

    <p class="ask-label">{{ deck.title }} · flashcards</p>

    <template v-if="!done">
      <button type="button" class="flashcard" :class="{ flipped }" :aria-label="flipped ? 'Show the front' : 'Show the back'" @click="flip">
        <span v-if="!flipped" class="fc-face">
          <span v-if="front === 'pt'" class="pt big" lang="pt-BR">{{ card.pt }}<small v-if="card.g" class="gender">{{ card.g }}</small></span>
          <span v-else class="en big">{{ card.en }}</span>
          <span class="fc-tap">Tap to turn over</span>
        </span>
        <span v-else class="fc-face back">
          <span class="pt big" lang="pt-BR">{{ card.pt }}<small v-if="card.g" class="gender">{{ card.g }}</small></span>
          <span class="en">{{ card.en }}</span>
          <span v-if="card.say" class="say">Sounds like <b>{{ card.say }}</b></span>
          <span v-if="card.example" class="example">
            <span lang="pt-BR">{{ card.example.pt }}</span>
            <span class="example-en">{{ card.example.en }}</span>
          </span>
          <span v-if="card.note" class="note">{{ card.note }}</span>
        </span>
      </button>
      <div class="fc-bar">
        <button type="button" class="btn" :disabled="index === 0" aria-label="Previous card" @click="go(-1)"><Icon name="back" :size="20" /></button>
        <SpeakButton :text="card.pt" />
        <button type="button" class="btn primary fc-next" @click="flipped ? go(1) : flip()">{{ flipped ? 'Next' : 'Turn over' }}</button>
      </div>
    </template>

    <div v-else class="fc-done">
      <p class="result-score"><b>{{ cards.length }}</b><span>{{ cards.length === 1 ? 'card' : 'cards' }} gone through</span></p>
      <p class="hint center">Flashcards are not scored. Practise the same words to see how well you know them.</p>
      <button type="button" class="btn primary wide" @click="again">Again, shuffled</button>
      <button type="button" class="btn wide" @click="router.back()">Done</button>
    </div>
  </div>
</template>
