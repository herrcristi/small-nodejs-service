<template>
  <!-- 
        dialog title
    -->
  <v-card-title class="d-flex justify-space-between">
    <div>{{ itemName || t('details') }}</div>
    <v-btn icon small @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
  </v-card-title>

  <ApiGroupMoreInfo ref="moreInfoComponent" :itemID="itemID" type="v-table" />
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ApiGroupMoreInfo from './api.group.moreinfo.vue';
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
