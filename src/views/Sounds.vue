<script setup>
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import SpeakButton from '../components/SpeakButton.vue';

const router = useRouter();

// Spelling, how it sounds to an English ear, and words to hear it in.
const SOUNDS = [
  { spell: 'ão', like: '"owng", said through the nose', words: [['não', 'no'], ['pão', 'bread']] },
  { spell: 'ãe, õe', like: '"ayng" and "oyng", through the nose', words: [['mãe', 'mother'], ['limões', 'lemons']] },
  { spell: 'm at the end', like: 'not an "m": it sends the vowel through the nose', words: [['bem', 'well'], ['sim', 'yes'], ['bom', 'good']] },
  { spell: 'nh', like: '"ny" as in canyon', words: [['amanhã', 'tomorrow'], ['banho', 'bath']] },
  { spell: 'lh', like: '"ly" as in million', words: [['filho', 'son'], ['trabalho', 'work']] },
  { spell: 'ch', like: '"sh"', words: [['chave', 'key'], ['chuva', 'rain']] },
  { spell: 'x', like: 'mostly "sh"', words: [['peixe', 'fish'], ['baixo', 'low']] },
  { spell: 'j, and g before e or i', like: '"zh", the s in measure', words: [['hoje', 'today'], ['gente', 'people']] },
  { spell: 'r at the start, rr', like: 'a breathy "h"', words: [['Rio', 'Rio'], ['carro', 'car']] },
  { spell: 'r between vowels', like: 'one quick tap of the tongue', words: [['caro', 'expensive'], ['para', 'for']] },
  { spell: 'de, di', like: '"djee"', words: [['dia', 'day'], ['cidade', 'city']] },
  { spell: 'te, ti', like: '"chee"', words: [['noite', 'night'], ['leite', 'milk']] },
  { spell: 'l at the end', like: '"w"', words: [['Brasil', 'Brazil'], ['hotel', 'hotel']] },
  { spell: 'o and e at the end', like: 'a short "oo" and "ee"', words: [['obrigado', 'thank you'], ['nome', 'name']] },
  { spell: 's between vowels', like: '"z"', words: [['casa', 'house'], ['mesa', 'table']] },
  { spell: 'ç', like: '"s"', words: [['almoço', 'lunch'], ['açúcar', 'sugar']] },
  { spell: 'é and ê', like: 'open "eh" and closed "ay"', words: [['café', 'coffee'], ['você', 'you']] },
  { spell: 'ó and ô', like: 'open "aw" and closed "oh"', words: [['avó', 'grandmother'], ['avô', 'grandfather']] },
];
</script>

<template>
  <header class="bar">
    <button type="button" class="icon-btn" aria-label="Back" @click="router.back()"><Icon name="back" /></button>
    <h1>How it sounds</h1>
  </header>

  <p class="about">Brazilian Portuguese is spelled regularly, but not as English is. These are the spellings that
    surprise most. Tap a speaker to hear the word; tap twice for slow.</p>

  <ul class="list">
    <li v-for="sound in SOUNDS" :key="sound.spell" class="sound">
      <p><b class="spell">{{ sound.spell }}</b> <span>{{ sound.like }}</span></p>
      <p class="sound-words">
        <span v-for="[pt, en] in sound.words" :key="pt" class="sound-word">
          <SpeakButton :text="pt" /> <span><b>{{ pt }}</b> {{ en }}</span>
        </span>
      </p>
    </li>
  </ul>

  <section class="tight">
    <h2>Stress</h2>
    <p class="about">An accent mark shows the stressed syllable: caf<b>é</b>, s<b>á</b>bado. Without one, stress falls on the
      second-to-last syllable (ca-sa, o-bri-ga-do), or on the last when the word ends in r, l, z, i or u (fa-lar, Bra-sil).</p>
  </section>

  <section class="tight">
    <h2>Reading the "sounds like" hints</h2>
    <p class="about">CAPITALS mark the stressed syllable. "ng" means the vowel goes through the nose: no g is heard.
      "zh" is the s in measure. The hints are rough; the voice is the better guide.</p>
  </section>
</template>
