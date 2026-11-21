<script setup>
import { blade, sparkle, wedges } from './shapes.js';

// The scene behind the top of Today: a sun (a pale moon in the evening), palm leaves,
// a slice of lime and a wave, all on the right so the words on the left stay clear.
defineProps({ night: Boolean });

const LIME = wedges(8, 5, 20, 20);
const FRONDS = [
  { turn: -98, length: 118, width: 15, color: '#2b9460' },
  { turn: -122, length: 142, width: 17, color: '#3bb277' },
  { turn: -146, length: 150, width: 17, color: '#32a66a' },
  { turn: -168, length: 128, width: 15, color: '#2b9460' },
];
</script>

<template>
  <svg viewBox="0 0 360 212" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false">
    <circle cx="300" cy="106" r="50" :fill="night ? '#fff1cf' : '#ffc247'" />
    <circle cx="288" cy="94" r="29" :fill="night ? '#ffffff' : '#ffd778'" opacity="0.55" />

    <path d="M0 178 C70 152 132 198 206 172 S318 152 360 174 V212 H0 Z" fill="#156262" />

    <g transform="translate(356 224)">
      <path v-for="frond in FRONDS" :key="frond.turn" :d="blade(frond.length, frond.width)"
        :transform="`rotate(${frond.turn})`" :fill="frond.color" />
    </g>

    <g transform="translate(250 172)">
      <circle r="29" fill="#32a66a" />
      <circle r="24.5" fill="#f3fad9" />
      <path v-for="segment in LIME" :key="segment" :d="segment" fill="#bfe373" stroke="#bfe373" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M-25.5 -8 A26.7 26.7 0 0 1 -8 -25.5" fill="none" stroke="#7fd29f" stroke-width="3" stroke-linecap="round" />
    </g>

    <path :d="sparkle(7)" transform="translate(226 62)" fill="#fff8ee" />
    <path :d="sparkle(4.5)" transform="translate(252 30)" fill="#ffc247" />
  </svg>
</template>
