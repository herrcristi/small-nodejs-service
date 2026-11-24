<template>
  <!--
        the page of an emailed link: set up the account (invitation: the first password and the profile) or set a new
        password (reset); the link carries its language (lang), the page is shown in it
        the token is in the fragment of the link (after #): it is read once, removed from the address bar, kept in memory
        and sent in a header, so it is never in a url that a server or the history keeps
  -->
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card>
          <v-card-title class="d-flex align-center">
            {{ title }}
            <v-spacer />
            <LanguageMenu />
          </v-card-title>

          <v-card-text>
            <div v-if="state === 'checking'">{{ t('password.reset.checking') }}</div>

            <v-alert v-if="state === 'invalid'" type="error" density="compact">{{
              t('password.reset.invalid')
            }}</v-alert>

            <v-alert v-if="state === 'done'" type="success" density="compact">{{
              isSetup ? t('profile.setup.success') : t('password.reset.success')
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

                <!-- the profile of a new user (the link of an invitation): the same fields as its profile page -->
                <template v-if="isSetup">
                  <div class="mt-2 mb-2 text-medium-emphasis">{{ t('profile.setup') }}</div>
                  <v-text-field v-model="profile.name" :label="t('name')" :rules="nameRules" required />
                  <v-text-field v-model="profile.birthday" :label="t('birthday')" type="date" />
                  <v-text-field v-model="profile.phoneNumber" :label="t('phoneNumber')" :rules="[phoneNumberRule]" />
                  <v-text-field v-model="profile.address" :label="t('address')" :rules="[addressRule]" />
                  <LanguageSelect v-model="profile.language" />
                </template>
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
              :disabled="!formValid || saveCall.inProgress"
              :loading="saveCall.loading"
              @click="handleSubmit"
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
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import Api from '../api/api.js';
import ComponentsUtils from './components.utils.js';
import LanguageMenu from './base.language.menu.vue';
import LanguageSelect from './base.language.select.vue';
import { setLanguage } from '../i18n.js';
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();

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
const saveCall = ComponentsUtils.useSingleCall(); // one call at a time (handleSubmit)
const error = ref('');

// the token is kept only in memory
let token = '';

// the link of an invitation: the account is set up (the first password and the profile)
const isSetup = computed(() => resetType.value === 'signup');
const title = computed(() => (isSetup.value ? t('password.signup.title') : t('password.reset.title')));

// the profile of a new user; its language is the one of the page (the link), the one chosen also shows the page in it
const profile = reactive({ name: '', birthday: '', phoneNumber: '', address: '', language: locale.value });
watch(
  () => profile.language,
  (code) => setLanguage(code)
);

/**
 * rules
 */
const passwordNewReqRule = (v) => ComponentsUtils.Edit.Rules.passwordNewReq(v, t);
const passwordMinLengthRule = (v) => ComponentsUtils.Edit.Rules.passwordMinLength(v, t);
const passwordComplexRule = (v) => ComponentsUtils.Edit.Rules.passwordComplex(v, t);
const confirmPasswordRule = (v) => ComponentsUtils.Edit.Rules.confirmPassword(v, t, password.value);
const nameRules = [(v) => ComponentsUtils.Edit.Rules.name(v, t), (v) => ComponentsUtils.Edit.Rules.nameLength(v, t)];
const phoneNumberRule = (v) => ComponentsUtils.Edit.Rules.phoneNumber(v, t);
const addressRule = (v) => ComponentsUtils.Edit.Rules.addressLength(v, t);

/**
 * the profile to send: the fields filled (an empty one is optional), the birthday as an iso date
 */
function getProfile() {
  const value = { name: profile.name.trim(), language: profile.language };
  if (profile.birthday) {
    value.birthday = new Date(`${profile.birthday}T00:00:00.000Z`).toISOString();
  }
  if (profile.phoneNumber) {
    value.phoneNumber = profile.phoneNumber;
  }
  if (profile.address) {
    value.address = profile.address;
  }
  return value;
}

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

  // the page in the language of the link (the one of the invitation, or of the request of a reset)
  setLanguage(params.get('lang'));
  profile.language = locale.value;

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
 * handle submit: one call at a time (a page: its button is disabled until the answer, with a spinner when it takes
 * long); the link is used once: a second call would be refused and show the link as not valid, after the password was
 * set
 */
async function handleSubmit() {
  await saveCall.run(submit);
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
  try {
    await Api.setPasswordWithResetToken(token, password.value, isSetup.value ? getProfile() : undefined);
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
    const errText = ComponentsUtils.getErrorText(e, t);
    error.value = `${t('password.reset.error')} - ${errText}`;
  }
}

function goToLogin() {
  router.push('/login');
}

onMounted(checkToken);
</script>
