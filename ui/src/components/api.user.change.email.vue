<template>
  <!-- 
          Change email dialog 
      -->
  <v-dialog v-model="emailDialog" max-width="500px">
    <v-card>
      <v-card-title>{{ t('email.change') }}</v-card-title>
      <v-card-text>
        <v-form ref="emailFormRef" v-model="emailFormValid">
          <v-text-field
            v-model="emailNew"
            :label="t('email.new')"
            type="email"
            :rules="[(v) => !!v || t('email.required'), (v) => /.+@.+\..+/.test(v) || t('email.invalid')]"
            required
          />
          <v-text-field
            v-model="emailPassword"
            :label="t('password.current')"
            type="password"
            :rules="[(v) => !!v || t('password.current.required')]"
            required
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="closeDialog">{{ t('cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!emailFormValid" @click="submitEmail">{{ t('save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 
          snackbar for notifications
      -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ t(snackbarText) }}</v-snackbar>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import Api from '../api/api.js';
import { useAuthStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */

// email change
const emailDialog = ref(false);
const emailNew = ref('');
const emailPassword = ref('');
const emailFormValid = ref(false);
const emailFormRef = ref(null);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * emit
 */
const emit = defineEmits(['email-changed', 'close']);

/**
 * email change
 */
function openDialog() {
  emailNew.value = useAuthStore()?.raw?.email;
  emailPassword.value = '';
  emailDialog.value = true;
}

function closeDialog() {
  emailNew.value = '';
  emailPassword.value = '';
  emailDialog.value = false;

  emit('close', true);
}

/**
 * submit
 */
async function submitEmail() {
  if (emailFormRef.value && typeof emailFormRef.value.validate === 'function') {
    const ok = await emailFormRef.value.validate();
    if (!ok) {
      return;
    }
  }

  try {
    await Api.updateUserEmail({
      id: emailNew.value,
      password: emailPassword.value,
    });

    // update store and local profile
    auth.raw = { ...auth.raw, email: emailNew.value };
    useAuthStore()?.save(auth);

    const emailChanged = emailNew.value;

    // close dialog
    emailDialog.value = false;
    emailNew.value = '';
    emailPassword.value = '';

    snackbarText.value = t('email.change.success');
    snackbarColor.value = 'success';
    snackbar.value = true;

    emit('email-changed', emailChanged);
  } catch (e) {
    console.error('Error changing email', e);
    const errText = e.response?.data?.error?.toString() || e.toString();

    snackbarText.value = t('email.change.error') + ' - ' + errText;
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

/**
 * mounted
 */
function mounted() {}

/**
 * expose
 */
defineExpose({ openDialog });
</script>

<style scoped></style>
