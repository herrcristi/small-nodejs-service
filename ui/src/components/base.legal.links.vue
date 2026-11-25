<template>
  <!--
        the links to the legal documents (the end user license agreement, the terms and conditions, the privacy policy),
        each opens in a dialog; they can be read at any time, also before the login
  -->
  <span class="legal-links">
    <template v-for="(document, i) in documents" :key="document.name">
      <span v-if="i > 0" class="mx-2">·</span>
      <a href="#" class="legal-link" @click.prevent="openedName = document.name">{{ document.title }}</a>
    </template>
    <LegalDocument :document="opened" @close="openedName = null" />
  </span>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAgreements } from './agreements.utils.js';
import LegalDocument from './base.legal.document.vue';

const { agreements } = useAgreements();

// the documents of all the agreements, in their order
const documents = computed(() => agreements.value.flatMap((agreement) => agreement.documents));

// the document that is open (by its name: it is shown in the language of the UI, also after a change of language)
const openedName = ref(null);
const opened = computed(() => documents.value.find((document) => document.name === openedName.value) || null);
</script>

<style scoped>
.legal-link {
  color: inherit;
  text-decoration: underline;
}
</style>
