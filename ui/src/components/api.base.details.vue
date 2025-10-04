<template>
  <v-card v-if="props.read">
    <!-- 
      snackbar for notifications
    -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const props = defineProps({
  itemID: { type: [String, Number], default: null },

  read: { type: [Boolean, Number], default: null },

  apiFn: { type: Object, default: {} }, // get details for one
});

/**
 * emit
 */
const emit = defineEmits(['item', 'loading', 'nodatatext']);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * monitor itemID
 */
watch(
  () => props.itemID,
  (id) => {
    if (id) {
      fetchDetails(id);
    }
  },
  { immediate: true }
);

/**
 * get details
 */
async function fetchDetails(id) {
  let timeoutID = setTimeout(() => {
    emit('loading', true);
  }, 300); // Show loader if it takes more than 300ms

  try {
    const resp = await props.apiFn.get(id);
    const data = resp.data || {};

    emit('item', data);
    emit('nodatatext', '');
  } catch (e) {
    console.error('Error fetching  details:', e);

    snackbarText.value = t('fetch.details.error') || 'Error fetching details';
    snackbarColor.value = 'error';
    snackbar.value = true;

    emit('nodatatext', e.toString());
  } finally {
    clearTimeout(timeoutID);
    emit('loading', false);
  }
}

/**
 * mounted
 */
function mounted() {}

/**
 * refresh
 */
async function refresh() {
  await fetchDetails(props.itemID);
}

/**
 * expose
 */
defineExpose({ refresh });
</script>

<style scoped></style>
