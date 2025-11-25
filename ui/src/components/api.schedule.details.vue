<template>
  <!-- 
        dialog title
    -->
  <v-card-title class="d-flex justify-space-between">
    <div>{{ itemName || t('details') }}</div>
    <v-btn icon small @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
  </v-card-title>

  <ApiScheduleMoreInfo ref="moreInfoComponent" :itemID="itemID" type="v-table" />

  <!-- add extra space -->
  <v-card>
    <v-card-text> &nbsp; </v-card-text>
  </v-card>
  <v-card>
    <v-card-text> &nbsp; </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ApiScheduleMoreInfo from './api.schedule.moreinfo.vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const props = defineProps({
  itemID: { type: String, default: null },
  itemName: { type: String, default: null },
});

const moreInfoComponent = ref();

/**
 * emit
 */
const emit = defineEmits(['close']);

/**
 * close details dialog
 */
function closeDialog() {
  moreInfoComponent.value.clear();
  emit('close');
}
</script>

<style scoped></style>
