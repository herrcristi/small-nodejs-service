<template>
  <!--
        the agreements to accept before using the account (an account created before them, or a changed document): the
        layout shows this page instead of the page that was opened, until they are accepted; the user can also log out
  -->
  <v-row justify="center">
    <v-col cols="12" md="10" lg="8" xl="6">
      <v-card>
        <v-card-title class="text-wrap">{{ t('agreements.title') }}</v-card-title>
        <v-card-text>
          <div class="mb-4 text-medium-emphasis">{{ t('agreements.intro') }}</div>
          <Agreements ref="agreementsRef" v-model="versions" />
          <v-alert v-if="error" type="error" density="compact" class="mt-2">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="emit('logout')">{{ t('logout') }}</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            :disabled="!versions || acceptCall.inProgress"
            :loading="acceptCall.loading"
            @click="handleAccept"
          >
            {{ t('agreements.accept') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref } from 'vue';
import Api from '../api/api.js';
import ComponentsUtils from './components.utils.js';
import Agreements from './base.agreements.vue';
import { useAuthStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const emit = defineEmits(['logout']);

const authStore = useAuthStore();
const agreementsRef = ref(null);
const versions = ref(null); // the versions of the agreements, when all are checked
const error = ref('');
const acceptCall = ComponentsUtils.useSingleCall(); // one call at a time

async function handleAccept() {
  await acceptCall.run(accept);
}

/**
 * accept the versions that were read: the agreements left to accept are kept (none: the layout shows the page)
 */
async function accept() {
  error.value = '';
  try {
    const response = await Api.acceptAgreements(versions.value);
    authStore.save({ raw: { ...authStore.raw, agreementsPending: response.data?.agreementsPending || [] } });
  } catch (e) {
    console.error('Error accepting the agreements', e);

    // a document changed after it was read: read again (its box is not checked anymore)
    if (e.response?.status === 409) {
      error.value = t('agreements.changed');
      await agreementsRef.value?.load();
      return;
    }
    error.value = ComponentsUtils.getErrorText(e, t);
  }
}
</script>
