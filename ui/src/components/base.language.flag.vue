<template>
  <!--
    the flag of a language (drawn here: a flag emoji is not shown by every system)
  -->
  <svg
    class="language-flag"
    :width="props.width"
    :height="(props.width * 2) / 3"
    viewBox="0 0 60 40"
    preserveAspectRatio="none"
    role="img"
    :aria-label="props.language"
  >
    <!-- en: the flag of the United Kingdom -->
    <template v-if="props.language === 'en'">
      <clipPath :id="clipID">
        <path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z" />
      </clipPath>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" stroke-width="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" :clip-path="`url(#${clipID})`" stroke="#C8102E" stroke-width="5" />
      <path d="M30,0 v40 M0,20 h60" stroke="#fff" stroke-width="12" />
      <path d="M30,0 v40 M0,20 h60" stroke="#C8102E" stroke-width="7" />
    </template>

    <!-- ro: the flag of Romania -->
    <template v-else-if="props.language === 'ro'">
      <rect width="20" height="40" fill="#002B7F" />
      <rect x="20" width="20" height="40" fill="#FCD116" />
      <rect x="40" width="20" height="40" fill="#CE1126" />
    </template>

    <!-- another language: its code -->
    <template v-else>
      <rect width="60" height="40" fill="#9e9e9e" />
      <text x="30" y="27" font-size="18" text-anchor="middle" fill="#fff">{{ props.language }}</text>
    </template>
  </svg>
</template>

<script setup>
import { defineProps } from 'vue';

/**
 * props
 */
const props = defineProps({
  language: { type: String, default: '' }, // the code of the language (en, ro)
  width: { type: Number, default: 24 },
});

// the clip of the flag, one per flag shown (an id is unique in the page)
const clipID = `language-flag-${++FlagCount}`;
</script>

<script>
// the flags shown in the page (the ids of their clips)
let FlagCount = 0;
</script>

<style scoped>
.language-flag {
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
  vertical-align: middle;
}
</style>
