<script setup>
import { computed, ref } from 'vue';

// One line over days. The readout above the plot names the point under the finger
// (the latest one when nothing is touched); every value is also in the table the
// screen puts below the chart, so the plot is never the only way to read a number.
const props = defineProps({
  title: { type: String, required: true },
  points: { type: Array, required: true },   // [{ t: day on the x-axis, y, label, detail }]
  span: { type: Number, required: true },    // days the x-axis covers
  max: { type: Number, required: true },     // top of the y-axis
  ticks: { type: Array, required: true },    // y-values with a gridline
  unit: { type: String, default: '' },
  from: { type: String, default: '' },
  to: { type: String, default: '' },
});

const W = 340;
const H = 168;
const PAD = { left: 38, right: 16, top: 14, bottom: 24 };
const x = (t) => PAD.left + (props.span ? t / props.span : 0.5) * (W - PAD.left - PAD.right);
const y = (value) => PAD.top + (1 - value / props.max) * (H - PAD.top - PAD.bottom);

const line = computed(() => props.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.y).toFixed(1)}`).join(' '));
const area = computed(() => {
  const points = props.points;
  if (points.length < 2) return '';
  return `${line.value} L${x(points.at(-1).t).toFixed(1)} ${y(0)} L${x(points[0].t).toFixed(1)} ${y(0)} Z`;
});

const svg = ref(null);
const picked = ref(null);
const shown = computed(() => props.points[picked.value ?? props.points.length - 1] || null);

function pick(event) {
  if (!props.points.length) return;
  const box = svg.value.getBoundingClientRect();
  const at = (event.clientX - box.left) / box.width * W;
  let best = 0;
  props.points.forEach((p, i) => { if (Math.abs(x(p.t) - at) < Math.abs(x(props.points[best].t) - at)) best = i; });
  picked.value = best;
}
</script>

<template>
  <figure class="chart">
    <figcaption>
      <span class="chart-title">{{ title }}</span>
      <span v-if="shown" class="chart-readout"><b>{{ shown.y }}{{ unit }}</b> {{ shown.label }}<template v-if="shown.detail"> · {{ shown.detail }}</template></span>
    </figcaption>
    <p v-if="!points.length" class="empty">Nothing to draw yet.</p>
    <svg v-else ref="svg" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`${title}. Latest: ${shown.y}${unit}, ${shown.label}.`"
      @pointerdown="pick" @pointermove="pick" @pointerleave="picked = null">
      <g v-for="tick in ticks" :key="tick">
        <line class="grid" :x1="PAD.left" :x2="W - PAD.right" :y1="y(tick)" :y2="y(tick)" />
        <text class="axis" :x="PAD.left - 6" :y="y(tick) + 4" text-anchor="end">{{ tick }}{{ unit }}</text>
      </g>
      <text class="axis" :x="PAD.left" :y="H - 6">{{ from }}</text>
      <text class="axis" :x="W - PAD.right" :y="H - 6" text-anchor="end">{{ to }}</text>

      <path v-if="area" class="wash" :d="area" />
      <path v-if="points.length > 1" class="line" :d="line" />
      <line v-if="picked != null" class="cross" :x1="x(shown.t)" :x2="x(shown.t)" :y1="PAD.top" :y2="H - PAD.bottom" />
      <circle class="dot" :cx="x(shown.t)" :cy="y(shown.y)" r="5" />
    </svg>
  </figure>
</template>
