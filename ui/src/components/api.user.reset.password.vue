<template>
  <!--
        the page of an emailed link: set the first password (invitation) or a new one (reset)
        the token is in the fragment of the link (after #): it is read once, removed from the address bar, kept in memory
        and sent in a header, so it is never in a url that a server or the history keeps
  -->
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card>
          <v-card-title>{{ title }}</v-card-title>

          <v-card-text>
            <div v-if="state === 'checking'">{{ t('password.reset.checking') }}</div>

            <v-alert v-if="state === 'invalid'" type="error" density="compact">{{
              t('password.reset.invalid')
            }}</v-alert>

            <v-alert v-if="state === 'done'" type="success" density="compact">{{
              t('password.reset.success')
            }}</v-alert>

            <template v-if="state === 'valid'">
              <div class="mb-4 text-medium-emphasis">{{ t('password.reset.for', { email: username }) }}</div>
              <v-form ref="formRef" v-model="formValid">
                <v-text-field
                  v-model="password"
                  :label="t('password.new')"
                  type="password"
                  autocomplete="new-password"
                  :rules="[passwordNewReqRule, passwordMinLengthRule, passwordComplexRule]"
                  required
                />
                <v-text-field
                  v-model="passwordConfirm"
                  :label="t('password.confirm')"
                  type="password"
                  autocomplete="new-password"
                  :rules="[confirmPasswordRule]"
                  required
                />
              </v-form>
              <v-alert v-if="error" type="error" density="compact">{{ error }}</v-alert>
            </template>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn v-if="state !== 'valid'" text @click="goToLogin">{{ t('login.go') }}</v-btn>
            <v-btn
              v-if="state === 'valid'"
              color="primary"
              :disabled="!formValid || saving"
              :loading="saving"
              @click="submit"
            >
              {{ t('save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Api from '../api/api.js';
import ComponentsUtils from './components.utils.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const router = useRouter();

/**
 * state: checking (the link), valid (the form), invalid (used, expired or wrong), done (the password is set)
 */
const state = ref('checking');
const resetType = ref('reset-password');
const username = ref('');
const password = ref('');
const passwordConfirm = ref('');
const formValid = ref(false);
const formRef = ref(null);
const saving = ref(false);
const error = ref('');

// the token is kept only in memory
let token = '';

const title = computed(() => (resetType.value === 'signup' ? t('password.signup.title') : t('password.reset.title')));

/**
 * rules
 */
const passwordNewReqRule = (v) => ComponentsUtils.Edit.Rules.passwordNewReq(v, t);
const passwordMinLengthRule = (v) => ComponentsUtils.Edit.Rules.passwordMinLength(v, t);
const passwordComplexRule = (v) => ComponentsUtils.Edit.Rules.passwordComplex(v, t);
const confirmPasswordRule = (v) => ComponentsUtils.Edit.Rules.confirmPassword(v, t, password.value);

/**
 * read the token from the fragment of the link, then remove it from the address bar
 */
function readToken() {
  const fragment = globalThis.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(fragment);
  const value = params.get('token') || '';
  const type = params.get('type');
  if (type) {
    resetType.value = type;
  }

  const path = globalThis.location.pathname;
  globalThis.history.replaceState(null, '', path);
  return value;
}

/**
 * check the link: the server tells if the token can still be used
 */
async function checkToken() {
  token = readToken();
  if (!token) {
    state.value = 'invalid';
    return;
  }

  try {
    const response = await Api.validateResetToken(token);
    username.value = response.data?.username || '';
    if (response.data?.resetType) {
      resetType.value = response.data.resetType;
    }
    state.value = 'valid';
  } catch (e) {
    console.error('The reset link is not valid', e);
    state.value = 'invalid';
  }
}

/**
 * set the password; the link can not be used again
 */
async function submit() {
  if (formRef.value && typeof formRef.value.validate === 'function') {
    const ok = await formRef.value.validate();
    if (!ok) {
      return;
    }
  }

  error.value = '';
  saving.value = true;
  try {
    await Api.setPasswordWithResetToken(token, password.value);
    token = '';
    password.value = '';
    passwordConfirm.value = '';
    state.value = 'done';
  } catch (e) {
    console.error('Error setting the password', e);
    if (e.response?.status === 401) {
      state.value = 'invalid';
      return;
    }
    const errText = e.response?.data?.error?.toString() || e.toString();
    error.value = `${t('password.reset.error')} - ${errText}`;
  } finally {
    saving.value = false;
  }
}

function goToLogin() {
  router.push('/login');
}

onMounted(checkToken);
</script>
