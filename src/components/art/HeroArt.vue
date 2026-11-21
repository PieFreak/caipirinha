<script setup>
import { blade, wedges } from './shapes.js';

// The picture in the bottom-right corner of Today's header, beside the button: palm leaves
// rising from the corner and a slice of lime, in full colour on the pale lime ground. It
// stays in its corner, so the words above can use the whole width.
const LIME = wedges(8, 4, 17, 20);
const FRONDS = [
  { turn: -96, length: 86, width: 11, color: '#2b9460' },
  { turn: -118, length: 100, width: 13, color: '#3bb277' },
  { turn: -140, length: 104, width: 13, color: '#32a66a' },
  { turn: -162, length: 86, width: 11, color: '#2b9460' },
];
</script>

<template>
  <svg viewBox="0 0 160 110" aria-hidden="true" focusable="false">
    <g transform="translate(168 120)">
      <path v-for="frond in FRONDS" :key="frond.turn" :d="blade(frond.length, frond.width)"
        :transform="`rotate(${frond.turn})`" :fill="frond.color" />
    </g>
    <g transform="translate(70 72)">
      <circle r="28" fill="#32a66a" />
      <circle r="24" fill="#f3fad9" />
      <path v-for="segment in LIME" :key="segment" :d="segment" fill="#bfe373" stroke="#bfe373" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M-25 -7.5 A26 26 0 0 1 -7.5 -25" fill="none" stroke="#7fd29f" stroke-width="2.6" stroke-linecap="round" />
    </g>
  </svg>
</template>
