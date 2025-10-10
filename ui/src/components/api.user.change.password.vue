<template>
  <!-- 
          Change password dialog 
      -->
  <v-dialog v-model="passwordDialog" max-width="500px">
    <v-card>
      <v-card-title>{{ t('password.change') }}</v-card-title>

      <v-card-text>
        <v-form ref="passwordFormRef" v-model="passwordFormValid">
          <v-text-field
            v-model="passwordOld"
            :label="t('password.current')"
            type="password"
            :rules="[(v) => !!v || t('password.current.required')]"
            required
          />
          <v-text-field
            v-model="passwordNew"
            :label="t('password.new')"
            type="password"
            :rules="[(v) => !!v || t('password.new.required')]"
            required
          />
          <v-text-field
            v-model="passwordConfirm"
            :label="t('password.confirm')"
            type="password"
            :rules="[(v) => v === passwordNew || t('password.must.match')]"
            required
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="closeDialog">{{ t('cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!passwordFormValid" @click="submitPassword">{{ t('save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 
          snackbar for notifications
      -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
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
const passwordDialog = ref(false);
const passwordOld = ref('');
const passwordNew = ref('');
const passwordConfirm = ref('');
const passwordFormValid = ref(false);
const passwordFormRef = ref(null);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * emit
 */
const emit = defineEmits(['password-changed', 'close']);

/**
 * open password
 */
function openDialog() {
  passwordOld.value = '';
  passwordNew.value = '';
  passwordConfirm.value = '';
  passwordDialog.value = true;
}

function closeDialog() {
  passwordOld.value = '';
  passwordNew.value = '';
  passwordConfirm.value = '';
  passwordDialog.value = false;

  emit('close', true);
}

/**
 * submit password
 */
async function submitPassword() {
  if (passwordFormRef.value && typeof passwordFormRef.value.validate === 'function') {
    const ok = await passwordFormRef.value.validate();
    if (!ok) {
      return;
    }
  }

  try {
    // current user
    await Api.updateUserPassword({
      oldPassword: passwordOld.value,
      newPassword: passwordNew.value,
    });

    // close dialog
    passwordDialog.value = false;
    passwordOld.value = '';
    passwordNew.value = '';
    passwordConfirm.value = '';

    snackbarText.value = t('password.change.success');
    snackbarColor.value = 'success';
    snackbar.value = true;

    emit('password-changed', true);
  } catch (e) {
    console.error('Error changing password', e);
    const errText = e.response?.data?.error?.toString() || e.toString();

    snackbarText.value = t('password.change.error') + ' - ' + errText;
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
