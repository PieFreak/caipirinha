<script setup>
import { blade, sparkle, wedges } from './shapes.js';

// The picture in the corner of Today's header: palm leaves rising from the corner and a
// slice of lime, in full colour on the pale lime ground, kept to the right so the words
// on the left stay clear.
const LIME = wedges(8, 4.5, 19, 20);
const FRONDS = [
  { turn: -98, length: 104, width: 13, color: '#2b9460' },
  { turn: -120, length: 124, width: 15, color: '#3bb277' },
  { turn: -142, length: 128, width: 15, color: '#32a66a' },
  { turn: -164, length: 104, width: 13, color: '#2b9460' },
];
</script>

<template>
  <svg viewBox="0 0 360 200" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false">
    <g transform="translate(374 212)">
      <path v-for="frond in FRONDS" :key="frond.turn" :d="blade(frond.length, frond.width)"
        :transform="`rotate(${frond.turn})`" :fill="frond.color" />
    </g>

    <g transform="translate(296 156)">
      <circle r="31" fill="#32a66a" />
      <circle r="26.5" fill="#f3fad9" />
      <path v-for="segment in LIME" :key="segment" :d="segment" fill="#bfe373" stroke="#bfe373" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M-27.5 -8.5 A28.8 28.8 0 0 1 -8.5 -27.5" fill="none" stroke="#7fd29f" stroke-width="3" stroke-linecap="round" />
    </g>

    <path :d="sparkle(6)" transform="translate(300 52)" fill="#ffc247" />
    <path :d="sparkle(4)" transform="translate(330 84)" fill="#32a66a" opacity="0.7" />
  </svg>
</template>
