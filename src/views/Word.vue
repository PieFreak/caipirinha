<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { groupsById } from '../content/index.js';
import { state, editOwn, getItem, markKnown, removeWord, scoreOf, shade } from '../store.js';
import { shownEn } from '../lib/text.js';
import Icon from '../components/Icon.vue';
import SpeakButton from '../components/SpeakButton.vue';

const props = defineProps({ id: { type: String, required: true } });
const router = useRouter();

// The word shown: after an edit that changes its spelling, the new one.
const current = ref(props.id);
const item = computed(() => getItem(current.value));
const word = computed(() => state.words[current.value] || null);
const score = computed(() => scoreOf(current.value));
const isOwn = computed(() => !!state.own[current.value]);
const where = computed(() => (item.value?.groups || [])
  .map((id) => (id === 'own' ? 'Words I added' : groupsById[id]?.title))
  .filter(Boolean).join(', '));
const faded = computed(() => word.value && score.value != null && score.value < word.value.s);

const date = (time) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(time));
const confirming = ref(false);

function remove() {
  removeWord(current.value);
  router.back();
}

// Changing a word the learner added.
const editing = ref(false);
const form = reactive({ pt: '', en: '', note: '' });
const problem = ref('');
function edit() {
  Object.assign(form, { pt: item.value.pt, en: item.value.en, note: item.value.note || '' });
  problem.value = '';
  editing.value = true;
}
function saveEdit() {
  const result = editOwn(current.value, form);
  if (result.error) { problem.value = result.error; return; }
  current.value = result.id;
  editing.value = false;
  router.replace({ name: 'word', params: { id: result.id } });
}
</script>

<template>
  <header class="bar">
    <button type="button" class="icon-btn" aria-label="Back" @click="router.back()"><Icon name="back" /></button>
    <h1>Word</h1>
  </header>

  <p v-if="!item" class="empty">This word is no longer here.</p>

  <template v-else>
    <article v-if="!editing" class="word-card tall">
      <div class="wc-text">
        <p class="pt big" lang="pt-BR">{{ item.pt }}<small v-if="item.g" class="gender">{{ item.g }}</small></p>
        <p class="en">{{ shownEn(item.en) }}</p>
        <p v-if="item.say" class="say">Sounds like <b>{{ item.say }}</b></p>
        <p v-if="item.example" class="example">
          <span lang="pt-BR">{{ item.example.pt }}</span>
          <span class="example-en">{{ item.example.en }}</span>
          <SpeakButton :text="item.example.pt" />
        </p>
        <p v-if="item.note" class="note">{{ item.note }}</p>
        <button v-if="isOwn" type="button" class="link" @click="edit">Change this word</button>
      </div>
      <SpeakButton :text="item.pt" big />
    </article>

    <form v-else class="form" @submit.prevent="saveEdit">
      <label><span>Portuguese</span>
        <input v-model="form.pt" class="field" type="text" lang="pt-BR" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" required>
      </label>
      <label><span>Meaning</span>
        <input v-model="form.en" class="field" type="text" autocapitalize="off" autocomplete="off" required>
        <small>Several meanings that all count: separate them with " / ".</small>
      </label>
      <label><span>Note <i>(optional)</i></span>
        <input v-model="form.note" class="field" type="text">
      </label>
      <p v-if="problem" class="hint bad" role="alert">{{ problem }}</p>
      <p class="hint">Its history stays with it, even if you change the spelling.</p>
      <div class="row">
        <button type="submit" class="btn primary">Save</button>
        <button type="button" class="btn" @click="editing = false">Cancel</button>
      </div>
    </form>

    <section v-if="word">
      <h2>How well you know it</h2>
      <div class="standing" :style="{ '--shade': shade(score) }">
        <span class="standing-pct">{{ score == null ? '–' : Math.round(score * 100) + '%' }}</span>
        <span class="standing-text">{{ word.n ? `${word.ok} right, ${word.bad} wrong` : word.known ? 'marked as known' : 'not practised yet' }}</span>
        <span class="meter" aria-hidden="true"><span :style="{ width: (score || 0) * 100 + '%' }"></span></span>
      </div>
      <p class="hint">
        A right answer adds 10%, a wrong one takes off 15%, and it fades by 1% a day you don't practise it.
        <template v-if="faded">It was at {{ Math.round(word.s * 100) }}% when you last practised it.</template>
      </p>
      <button v-if="score == null || score < 1" type="button" class="btn wide" @click="markKnown(current)">I know this</button>
      <p v-if="word.hist" class="dots" :aria-label="`Latest ${word.hist.length} answers, oldest first: ${[...word.hist].map((c) => (c === '1' ? 'right' : 'wrong')).join(', ')}`">
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
    <template v-else>
      <p class="hint">Not in your library yet: it joins when you practise it.</p>
      <button type="button" class="btn wide" @click="markKnown(current)">I know this</button>
    </template>
  </template>
</template>
