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
            :rules="[passwordReqRule]"
            required
          />
          <v-text-field
            v-model="passwordNew"
            :label="t('password.new')"
            type="password"
            :rules="[passwordNewReqRule, passwordMinLengthRule, passwordComplexRule]"
            required
          />
          <v-text-field
            v-model="passwordConfirm"
            :label="t('password.confirm')"
            type="password"
            :rules="[confirmPasswordRule]"
            required
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="closeDialog">{{ t('cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!passwordFormValid || saveCall.inProgress" @click="handleSubmit">
          {{ t('save') }}
        </v-btn>
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
import ComponentsUtils from './components.utils.js';
const { t } = useI18n();

/**
 * props
 */
const props = defineProps({
  // the call of the parent (ComponentsUtils.useSingleCall), shown on the button that opened the dialog; without it the
  // dialog has its own
  call: { type: Object, default: null },
});

// client-side password strength rule: min 8, uppercase, lowercase, digit, special char
const passwordRegex = /(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}/;

const passwordNewRules = [
  (v) => !!v || t('password.new.required'),
  (v) => (v && v.length >= 8) || t('password.new.length'),
  (v) => (v ? passwordRegex.test(v) : true) || t('password.new.complexity'),
];

/**
 * props
 */
const passwordDialog = ref(false);
const passwordOld = ref('');
const passwordNew = ref('');
const passwordConfirm = ref('');
const passwordFormValid = ref(false);
const saveCall = props.call || ComponentsUtils.useSingleCall(); // one change at a time (handleSubmit)
const passwordFormRef = ref(null);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * rules
 */
const passwordReqRule = (v) => ComponentsUtils.Edit.Rules.passwordReq(v, t);
const passwordNewReqRule = (v) => ComponentsUtils.Edit.Rules.passwordNewReq(v, t);
const passwordMinLengthRule = (v) => ComponentsUtils.Edit.Rules.passwordMinLength(v, t);
const passwordComplexRule = (v) => ComponentsUtils.Edit.Rules.passwordComplex(v, t);
const confirmPasswordRule = (v) => ComponentsUtils.Edit.Rules.confirmPassword(v, t, passwordNew.value);
/**
 * emit
 */
const emit = defineEmits(['password-changed', 'close']);

/**
 * open password
 */
function openDialog() {
  // not while a change is in progress (one at a time)
  if (saveCall.inProgress) {
    return;
  }
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
 * handle submit: one call at a time (a second click sends nothing); the dialog closes when the call starts, and the
 * button that opened it shows the call until the answer; the snackbar tells the result
 */
async function handleSubmit() {
  await saveCall.run(submitPassword);
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

  // the dialog closes and is cleared (the passwords are not kept): the button that opened it shows the call
  const oldPassword = passwordOld.value;
  const newPassword = passwordNew.value;
  passwordDialog.value = false;
  passwordOld.value = '';
  passwordNew.value = '';
  passwordConfirm.value = '';

  try {
    // current user
    await Api.updateUserPassword({ oldPassword, newPassword });

    snackbarText.value = t('password.change.success');
    snackbarColor.value = 'success';
    snackbar.value = true;

    emit('password-changed', true);
  } catch (e) {
    console.error('Error changing password', e);
    const errText = ComponentsUtils.getErrorText(e, t);

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
