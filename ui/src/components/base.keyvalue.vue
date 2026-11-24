<template>
  <v-card>
    <!-- can add striped="odd/even" -->
    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      item-key="key"
      class="elevation-1"
      density="compact"
      hide-default-header
      hide-default-footer
    >
      <template v-slot:loading>
        <v-skeleton-loader type="table-row@4"></v-skeleton-loader>
      </template>

      <template #item.key="{ item }">{{ item.translate ? t(item.key) : item.key }}</template>
      <template #item.value="{ item }">
        <!-- a language: with its flag -->
        <LanguageFlag v-if="item.language" :language="item.language" class="mr-2" />{{ item.value }}
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup>
import { defineProps, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import LanguageFlag from './base.language.flag.vue';
const { t } = useI18n();

/**
 * props
 */
const props = defineProps({
  items: { type: Array, default: () => [] }, // { key, value, translate?, language? (the code of a language: its flag) }
  title: { type: String, default: 'Properties' },
  loading: { type: Boolean, default: false },
});

/**
 * headers
 */
const headers = computed(() => {
  return [
    { title: t('key'), value: 'key' },
    { title: t('value'), value: 'value' },
  ];
});

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* small helper styles can be added here if needed */
</style>
