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
            :rules="[emailReqRule, emailValidRule]"
            required
          />
          <v-text-field
            v-model="emailPassword"
            :label="t('password.current')"
            type="password"
            :rules="[passwordReqRule]"
            required
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="closeDialog">{{ t('cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!emailFormValid || saveCall.inProgress" @click="handleSubmit">
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

/**
 * props
 */

// email change
const emailDialog = ref(false);
const emailNew = ref('');
const emailPassword = ref('');
const emailFormValid = ref(false);
const saveCall = props.call || ComponentsUtils.useSingleCall(); // one change at a time (handleSubmit)
const emailFormRef = ref(null);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * rules
 */
const emailReqRule = (v) => ComponentsUtils.Edit.Rules.emailReq(v, t);
const emailValidRule = (v) => ComponentsUtils.Edit.Rules.emailValid(v, t);
const passwordReqRule = (v) => ComponentsUtils.Edit.Rules.passwordReq(v, t);

/**
 * emit
 */
const emit = defineEmits(['email-changed', 'close']);

/**
 * email change
 */
function openDialog() {
  // not while a change is in progress (one at a time)
  if (saveCall.inProgress) {
    return;
  }
  emailNew.value = useAuthStore()?.raw?.username;
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
 * handle submit: one call at a time (a second click sends nothing); the dialog closes when the call starts, and the
 * button that opened it shows the call until the answer; the snackbar tells the result
 */
async function handleSubmit() {
  await saveCall.run(submitEmail);
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

  // the dialog closes and is cleared (the password is not kept): the button that opened it shows the call
  const username = emailNew.value;
  const password = emailPassword.value;
  emailDialog.value = false;
  emailNew.value = '';
  emailPassword.value = '';

  try {
    await Api.updateUsername({ username, password });

    // update store and local profile
    const auth = useAuthStore();
    auth.raw = { ...auth.raw, email: username };
    auth?.save(auth);

    snackbarText.value = t('email.change.success');
    snackbarColor.value = 'success';
    snackbar.value = true;

    emit('email-changed', username);
  } catch (e) {
    console.error('Error changing email', e);
    const errText = ComponentsUtils.getErrorText(e, t);

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
