<script setup>
import { computed, ref } from 'vue';
import { state, dayKey, librarySize, shade } from '../store.js';
import { modesTitle } from '../lib/session.js';
import LineChart from '../components/LineChart.vue';

const DAY = 86400000;
const WINDOW = 30;
const noon = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const between = (from, to) => Math.round((to - from) / DAY);
const short = (date) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(date);
const long = (time) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(time));

const today = noon(dayKey());
const keys = computed(() => Object.keys(state.days).sort());

// Share of answers that were right, per day, over the last 30 days.
const windowStart = new Date(today.getTime() - (WINDOW - 1) * DAY);
const accuracy = computed(() => keys.value
  .filter((key) => state.days[key].n > 0 && noon(key) >= windowStart)
  .map((key) => {
    const day = state.days[key];
    return { t: between(windowStart, noon(key)), y: Math.round(day.ok / day.n * 100), label: short(noon(key)), detail: `${day.n} answers` };
  }));

// Words added to the library, counted up from the first day.
const growth = computed(() => {
  if (!keys.value.length) return { points: [], span: 0, max: 10, ticks: [0, 5, 10], from: '' };
  const first = noon(keys.value[0]);
  let total = 0;
  const points = [];
  for (const key of keys.value) {
    if (!state.days[key].added) continue;
    total += state.days[key].added;
    points.push({ t: between(first, noon(key)), y: total, label: short(noon(key)), detail: `${state.days[key].added} added` });
  }
  const span = between(first, today);
  if (points.length && points.at(-1).t < span) points.push({ t: span, y: total, label: short(today), detail: '' });
  // A round top for the axis: 10, 20, 50, 100, 200 …
  const steps = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  const max = steps.find((step) => step >= total) || total;
  return { points, span, max, ticks: [0, max / 2, max], from: short(first) };
});

const totals = computed(() => {
  let n = 0;
  let ok = 0;
  for (const key of keys.value) { n += state.days[key].n; ok += state.days[key].ok; }
  return { n, ok, days: keys.value.filter((key) => state.days[key].n > 0).length };
});

const byDay = computed(() => keys.value.slice().reverse().slice(0, 60).map((key) => ({ key, date: short(noon(key)), ...state.days[key] })));
const shownSessions = ref(30);
const sessions = computed(() => state.sessions.slice().reverse());
// A session from before the kinds could be ticked has one "mode"; "mixed" was all of them.
const kindsOf = (session) => session.modes || (session.mode && session.mode !== 'mixed' ? [session.mode] : null);
</script>

<template>
  <header class="top">
    <div>
      <h1>Progress</h1>
      <p class="sub">{{ librarySize }} {{ librarySize === 1 ? 'word' : 'words' }} in your library</p>
    </div>
  </header>

  <p v-if="!totals.n && !librarySize" class="empty">Practise something and this fills in: how you did, day by day, and every session.</p>

  <template v-else>
    <p v-if="totals.n" class="about">
      {{ totals.n }} answers on {{ totals.days }} {{ totals.days === 1 ? 'day' : 'days' }},
      {{ Math.round(totals.ok / totals.n * 100) }}% of them right.
    </p>

    <LineChart title="Right answers per day" :points="accuracy" :span="WINDOW - 1" :max="100" :ticks="[0, 50, 100]" unit="%"
      :from="short(windowStart)" to="today" />
    <LineChart title="Words in your library" :points="growth.points" :span="growth.span" :max="growth.max" :ticks="growth.ticks"
      :from="growth.from" to="today" />

    <details v-if="byDay.length" class="table">
      <summary>Day by day</summary>
      <table>
        <thead><tr><th>Day</th><th>Answers</th><th>Right</th><th>New words</th></tr></thead>
        <tbody>
          <tr v-for="day in byDay" :key="day.key">
            <td>{{ day.date }}</td>
            <td>{{ day.n }}</td>
            <td>{{ day.n ? Math.round(day.ok / day.n * 100) + '%' : '–' }}</td>
            <td>{{ day.added }}</td>
          </tr>
        </tbody>
      </table>
    </details>

    <section>
      <h2>Latest sessions</h2>
      <p v-if="!sessions.length" class="empty">No session finished yet.</p>
      <ul class="list">
        <li v-for="(session, i) in sessions.slice(0, shownSessions)" :key="i" class="log-row" :style="{ '--shade': shade(session.ok / session.n) }">
          <span class="word-main">
            <span class="w-pt">{{ session.title }}</span>
            <span class="w-en">{{ long(session.t) }} · {{ modesTitle(kindsOf(session)) }}</span>
          </span>
          <span class="log-score">{{ session.ok }}/{{ session.n }}</span>
          <span class="score">{{ Math.round(session.ok / session.n * 100) }}%</span>
        </li>
      </ul>
      <button v-if="sessions.length > shownSessions" type="button" class="btn wide" @click="shownSessions += 30">Show more</button>
    </section>
  </template>
</template>
