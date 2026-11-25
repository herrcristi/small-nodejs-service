<template>
  <!--
        the page of the emailed link of an invitation: set up the account (the first password, the profile and the
        agreements: the legal documents, all are required)
        the token is in the fragment of the link (after #): it is read once, removed from the address bar, kept in memory
        and sent in a header (x-setup-token), so it is never in a url that a server or the history keeps; the link
        carries its language (lang): the page is shown in it, and it is the language of the profile until another one is
        chosen (with the flag at the top or in the form: the two are the same choice)
  -->
  <v-container fluid class="py-6">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8" xl="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            {{ t('password.signup.title') }}
            <v-spacer />
            <LanguageMenu />
          </v-card-title>

          <v-card-text>
            <div v-if="state === 'checking'">{{ t('password.reset.checking') }}</div>

            <v-alert v-if="state === 'invalid'" type="error" density="compact">{{
              t('password.reset.invalid')
            }}</v-alert>

            <v-alert v-if="state === 'done'" type="success" density="compact">{{ t('profile.setup.success') }}</v-alert>

            <template v-if="state === 'valid'">
              <div class="mb-4 text-medium-emphasis">{{ t('password.reset.for', { email: username }) }}</div>
              <v-form ref="formRef" v-model="formValid">
                <v-row dense>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="profile.name" :label="t('name')" :rules="nameRules" required />
                  </v-col>
                  <v-col cols="12" md="6">
                    <LanguageSelect v-model="profile.language" />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="password"
                      :label="t('password.new')"
                      type="password"
                      autocomplete="new-password"
                      :rules="[passwordNewReqRule, passwordMinLengthRule, passwordComplexRule]"
                      required
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="passwordConfirm"
                      :label="t('password.confirm')"
                      type="password"
                      autocomplete="new-password"
                      :rules="[confirmPasswordRule]"
                      required
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field v-model="profile.birthday" :label="t('birthday')" type="date" />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="profile.phoneNumber" :label="t('phoneNumber')" :rules="[phoneNumberRule]" />
                  </v-col>

                  <v-col cols="12">
                    <v-text-field v-model="profile.address" :label="t('address')" :rules="[addressRule]" />
                  </v-col>

                  <!-- the agreements: all are required to use the account -->
                  <v-col cols="12">
                    <Agreements ref="agreementsRef" v-model="agreements" />
                  </v-col>
                </v-row>
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
              :disabled="!formValid || !agreements || saveCall.inProgress"
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
import { ref, reactive, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import Api from '../api/api.js';
import ComponentsUtils from './components.utils.js';
import LanguageMenu from './base.language.menu.vue';
import LanguageSelect from './base.language.select.vue';
import Agreements from './base.agreements.vue';
import { setLanguage } from '../i18n.js';
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();

const router = useRouter();

/**
 * state: checking (the link), valid (the form), invalid (used, expired, wrong, or not an invitation), done (set up)
 */
const state = ref('checking');
const username = ref('');
const password = ref('');
const passwordConfirm = ref('');
const formValid = ref(false);
const formRef = ref(null);
const saveCall = ComponentsUtils.useSingleCall(); // one call at a time (handleSubmit)
const error = ref('');
const agreementsRef = ref(null);
const agreements = ref(null); // the versions of the agreements, when all are checked

// the token is kept only in memory
let token = '';

// the profile of the user; its language is the language of the page: the flag at the top and the field of the form
// are the same choice (a change of one changes the other)
const profile = reactive({ name: '', birthday: '', phoneNumber: '', address: '', language: locale.value });
watch(
  () => profile.language,
  (code) => setLanguage(code)
);
watch(locale, (code) => {
  profile.language = code;
});

/**
 * rules (the same as the server: the password rules, Schema.UserProfile)
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
 * read the token and the language from the fragment of the link, then remove it from the address bar
 */
function readToken() {
  const fragment = globalThis.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(fragment);
  const value = params.get('token') || '';

  // the page in the language of the link (the one of the invitation)
  setLanguage(params.get('lang'));

  const path = globalThis.location.pathname;
  globalThis.history.replaceState(null, '', path);
  return value;
}

/**
 * check the link: the server tells if the token can still be used (only the link of an invitation)
 */
async function checkToken() {
  token = readToken();
  if (!token) {
    state.value = 'invalid';
    return;
  }

  try {
    const response = await Api.validateSetupToken(token);
    username.value = response.data?.username || '';
    state.value = 'valid';
  } catch (e) {
    console.error('The setup link is not valid', e);
    state.value = 'invalid';
  }
}

/**
 * handle submit: one call at a time (its button is disabled until the answer, with a spinner when it takes long); the
 * link is used once: a second call would be refused and show the link as not valid, after the account was set up
 */
async function handleSubmit() {
  await saveCall.run(submit);
}

/**
 * set up the account: the first password and the profile; the link can not be used again
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
    await Api.setupAccount(token, password.value, getProfile(), agreements.value);
    token = '';
    password.value = '';
    passwordConfirm.value = '';
    state.value = 'done';
  } catch (e) {
    console.error('Error setting up the account', e);
    if (e.response?.status === 401) {
      state.value = 'invalid';
      return;
    }
    // a document changed after it was read: read again (its box is not checked anymore); the link was not used
    if (e.response?.status === 409) {
      error.value = t('agreements.changed');
      await agreementsRef.value?.load();
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
