<template>
  <!--
        a legal document in a dialog: its blocks (headings, paragraphs, lists) are shown as text, never as html
  -->
  <v-dialog :model-value="!!document" max-width="860px" scrollable @update:model-value="onOpen">
    <v-card v-if="document">
      <v-card-title class="text-wrap">{{ document.title }}</v-card-title>
      <v-divider />
      <v-card-text>
        <template v-for="(block, i) in body" :key="i">
          <h3 v-if="block.type === 'h2'" class="text-subtitle-1 font-weight-bold mt-4 mb-2">{{ block.text }}</h3>
          <p v-else-if="block.type === 'p'" class="mb-3">{{ block.text }}</p>
          <ul v-else-if="block.type === 'ul'" class="mb-3 ps-6">
            <li v-for="(item, j) in block.items" :key="j" class="mb-1">{{ item }}</li>
          </ul>
        </template>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">{{ t('close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props: the document to show ({ name, title, blocks }), none: the dialog is closed
 */
const props = defineProps({
  document: { type: Object, default: null },
});
const emit = defineEmits(['close']);

// the blocks after the title (the title is the heading of the dialog)
const body = computed(() => (props.document?.blocks || []).filter((block) => block.type !== 'h1'));

function onOpen(open) {
  if (!open) {
    emit('close');
  }
}
</script>
