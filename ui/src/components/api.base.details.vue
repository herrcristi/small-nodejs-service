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
import ComponentsUtils from './components.utils.js';
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
 * item: the details of the item; null when another item is opened (the details of the previous one are cleared at
 * once, so they are never shown, or edited, under the new one)
 */
const emit = defineEmits(['item', 'loading', 'nodatatext']);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

// the details calls: only the answer of the latest one is shown
const detailsCalls = ComponentsUtils.useLatestCall();

/**
 * monitor itemID
 */
watch(
  () => props.itemID,
  (id, previousID) => {
    // another item: the details of the previous one are cleared
    if (previousID) {
      emit('item', null);
    }
    if (id) {
      /* await */ fetchDetails(id);
    }
  },
  { immediate: true }
);

/**
 * the answer of a request is shown only when it is the latest request and for the item that is open (another item
 * may have been opened, or the panel closed, while it ran)
 */
function isCurrent(callNumber, id) {
  return detailsCalls.isLatest(callNumber) && id === props.itemID;
}

/**
 * get details
 */
async function fetchDetails(id) {
  const callNumber = detailsCalls.next();
  let timeoutID = setTimeout(() => {
    emit('loading', true);
  }, ComponentsUtils.LoadingDelay); // the loader only when the details take long

  try {
    const resp = await props.apiFn.get(id);

    // an older request: dropped
    if (!isCurrent(callNumber, id)) {
      return;
    }

    const data = resp.data || {};
    emit('item', data);
    emit('nodatatext', '');
  } catch (e) {
    console.error('Error fetching  details:', e);

    // an older request: dropped
    if (!isCurrent(callNumber, id)) {
      return;
    }

    const text = ComponentsUtils.getErrorText(e, t);
    snackbarText.value = `${t('fetch.details.error')} - ${text}`;
    snackbarColor.value = 'error';
    snackbar.value = true;

    emit('nodatatext', text);
  } finally {
    clearTimeout(timeoutID);

    // the loader stays while the latest request runs
    if (detailsCalls.isLatest(callNumber)) {
      emit('loading', false);
    }
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
  return /* await */ fetchDetails(props.itemID);
}

/**
 * expose
 */
defineExpose({ refresh });
</script>

<style scoped></style>
