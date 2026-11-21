<script setup>
import { blade } from './shapes.js';

// What lies behind every page, fixed in place while the page scrolls over it: a sky
// fading into the cream (the one gradient: the owner asked for it there only), a pale
// sun in one corner, palm leaves in two, and waves along the bottom. All in tints close
// to the ground color, and nothing in a strong color: a bright mark that stands still
// while the page scrolls can land beside a button and look like part of it. Each piece keeps
// its own size whatever the window is, so a wide window does not get giant shapes.
const TOP = [
  { turn: 12, length: 150, width: 18, tone: 2 },
  { turn: 36, length: 205, width: 22, tone: 1 },
  { turn: 60, length: 215, width: 22, tone: 2 },
  { turn: 84, length: 170, width: 19, tone: 1 },
];
const CORNER = [
  { turn: -96, length: 150, width: 18, tone: 1 },
  { turn: -124, length: 180, width: 20, tone: 2 },
  { turn: -152, length: 160, width: 19, tone: 1 },
];
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <div class="bd-sky"></div>
    <svg class="bd-sun" viewBox="0 0 280 280" focusable="false">
      <circle cx="140" cy="140" r="140" fill="var(--bd-sun)" />
      <circle cx="140" cy="140" r="92" fill="var(--bd-sun-core)" />
    </svg>

    <svg class="bd-top bd-extra" viewBox="0 0 240 260" focusable="false">
      <g transform="translate(-14 -18)">
        <path v-for="frond in TOP" :key="frond.turn" :d="blade(frond.length, frond.width)"
          :transform="`rotate(${frond.turn})`" :fill="`var(--bd-leaf-${frond.tone})`" />
      </g>
    </svg>

    <svg class="bd-corner bd-extra" viewBox="0 0 190 210" focusable="false">
      <g transform="translate(196 224)">
        <path v-for="frond in CORNER" :key="frond.turn" :d="blade(frond.length, frond.width)"
          :transform="`rotate(${frond.turn})`" :fill="`var(--bd-leaf-${frond.tone})`" />
      </g>
    </svg>

    <svg class="bd-waves" viewBox="0 0 375 190" preserveAspectRatio="none" focusable="false">
      <path d="M0 68 C60 38 122 96 192 62 S312 30 375 66 V190 H0 Z" fill="var(--bd-wave-1)" />
      <path d="M0 122 C72 94 142 144 216 114 S332 96 375 122 V190 H0 Z" fill="var(--bd-wave-2)" />
    </svg>
  </div>
</template>
