<template>
  <!--
        the agreements to accept, one checkbox each (all are required): the end user license agreement with the terms and
        conditions, and the privacy policy; each document opens from its link; the value (v-model) is the versions of
        the agreements when all are checked ({ terms, privacy }), null otherwise
  -->
  <div>
    <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ t('agreements.load.error') }}</v-alert>

    <v-checkbox
      v-for="agreement in agreements"
      :key="agreement.name"
      v-model="checked[agreement.name]"
      :rules="[requiredRule]"
      color="primary"
      density="compact"
      hide-details="auto"
    >
      <template #label>
        <span>
          {{ t(`agreements.${agreement.name}.label`) }}
          <template v-for="(document, i) in agreement.documents" :key="document.name">
            <span v-if="i > 0">{{ ` ${t('agreements.and')} ` }}</span>
            <!-- the link opens the document (and does not check the box) -->
            <a href="#" class="legal-link" @click.stop.prevent="openedName = document.name">{{ document.title }}</a>
          </template>
        </span>
      </template>
    </v-checkbox>

    <LegalDocument :document="opened" @close="openedName = null" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAgreements } from './agreements.utils.js';
import LegalDocument from './base.legal.document.vue';
const { t } = useI18n();

/**
 * v-model: the versions of the agreements when all are checked, null otherwise
 */
defineProps({
  modelValue: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue']);

const { agreements, error, load } = useAgreements();
const checked = reactive({});

// the document that is open (by its name: it is shown in the language of the UI, also after a change of language)
const openedName = ref(null);
const opened = computed(() => {
  const documents = agreements.value.flatMap((agreement) => agreement.documents);
  return documents.find((document) => document.name === openedName.value) || null;
});

const requiredRule = (v) => !!v || t('agreements.required');

// an agreement with a new version (its documents changed) is not checked anymore: it must be read again
const versionsRead = {};
watch(agreements, (list) => {
  for (const agreement of list) {
    if (versionsRead[agreement.name] !== agreement.version) {
      checked[agreement.name] = false;
      versionsRead[agreement.name] = agreement.version;
    }
  }
});

// the value: the versions, only when every agreement is checked
const versions = computed(() => {
  const list = agreements.value;
  if (!list.length || !list.every((agreement) => checked[agreement.name])) {
    return null;
  }
  return Object.fromEntries(list.map((agreement) => [agreement.name, agreement.version]));
});
watch(versions, (value) => emit('update:modelValue', value), { immediate: true });

/**
 * expose: read the documents again (a document changed after it was read)
 */
defineExpose({ load });
</script>

<style scoped>
.legal-link {
  color: rgb(var(--v-theme-primary));
}
</style>
