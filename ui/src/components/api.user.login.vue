<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card>
          <v-card-title>{{ t('login') || 'Login' }}</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="username"
                :label="t('login.username') || 'Username'"
                :rules="[(v) => !!v || t('login.username.required') || 'Username is required']"
                outlined
                dense
              />
              <v-text-field
                v-model="password"
                :label="t('login.password') || 'Password'"
                type="password"
                :rules="[(v) => !!v || t('login.password.required') || 'Password is required']"
                outlined
                dense
              />
              <!-- cookie-based auth is used by default; no client-side "remember me" persistence -->
            </v-form>
            <v-alert type="error" v-if="error" dense text>
              {{ error }}
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" size="small" @click="openForgot">{{ t('password.forgot') }}</v-btn>
            <v-spacer />
            <v-btn color="primary" :loading="loading" @click="submit">
              {{ t('login.submit') || 'Login' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- 
          forgot password: an email with a link to set a new password is sent (the answer is the same for an address
          without an account, so it does not tell if an account exists)
    -->
    <v-dialog v-model="forgotDialog" max-width="500px">
      <v-card>
        <v-card-title>{{ t('password.forgot.title') }}</v-card-title>
        <v-card-text>
          <div class="mb-4">{{ forgotSent ? t('password.forgot.sent') : t('password.forgot.info') }}</div>
          <v-form v-if="!forgotSent" ref="forgotFormRef" v-model="forgotFormValid">
            <v-text-field v-model="forgotEmail" :label="t('email')" :rules="[emailReqRule, emailValidRule]" required />
          </v-form>
          <v-alert v-if="forgotError" type="error" density="compact">{{ forgotError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="forgotDialog = false">{{ forgotSent ? t('close') : t('cancel') }}</v-btn>
          <v-btn
            v-if="!forgotSent"
            color="primary"
            :disabled="!forgotFormValid || forgotSending"
            :loading="forgotSending"
            @click="sendForgot"
          >
            {{ t('password.forgot.send') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import Api from '../api/api.js';
import { processLoginResponse } from '../auth.js';
import ComponentsUtils from './components.utils.js';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/*
 * props
 */
const props = defineProps({
  tenantID: { type: String, default: null },
  next: { type: String, default: '/' },
});

const username = ref('');
const password = ref('');
// Always use cookies for authentication (HttpOnly) by default
const withCreds = ref(true);
const loading = ref(false);
const error = ref(null);
const valid = ref(true);
const router = useRouter();

/**
 * only allow relative URLs starting with /
 */
function isValidRedirectUrl(url) {
  try {
    const decoded = decodeURIComponent(url);
    return decoded.startsWith('/') && !decoded.includes('://');
  } catch {
    return false;
  }
}

/**
 * submit login form
 */
async function submit() {
  error.value = null;
  if (!username.value || !password.value) {
    error.value = 'Please enter username and password';
    return;
  }

  loading.value = true;
  try {
    // call the backend login
    const resp = await Api.login({ username: username.value, password: password.value }, withCreds.value);

    // process the response; if user asked to send cookies, treat auth as cookie-based
    const r = await processLoginResponse(resp, { useCookies: withCreds.value });
    if (r.error) {
      throw r.error.error;
    }
    if (r.status !== 200) {
      throw new Error('Authentication failed');
    }

    // only allow relative URLs starting with /
    const nextUrl = isValidRedirectUrl(props.next) ? props.next : '/';

    // if tenant already selected, redirect to next
    if (r.tenantID) {
      // if tenant changed, reset next to /
      let target = nextUrl;
      if (props.tenantID && props.tenantID !== r.tenantID) {
        target = '/';
      }
      // redirect to next
      const nextPath = decodeURIComponent(target);
      router.push(nextPath);
    } else {
      // redirect to tenant selection page and pass next
      const tenantIDParam = props.tenantID ? encodeURIComponent(props.tenantID) : '';
      const nextParam = encodeURIComponent(nextUrl);
      router.push(`/tenants?tenantID=${tenantIDParam}&next=${nextParam}`);
    }
  } catch (e) {
    error.value = e.message || 'Login failed';
  } finally {
    loading.value = false;
  }
}

/**
 * forgot password
 */
const forgotDialog = ref(false);
const forgotEmail = ref('');
const forgotFormRef = ref(null);
const forgotFormValid = ref(false);
const forgotSending = ref(false);
const forgotSent = ref(false);
const forgotError = ref('');

const emailReqRule = (v) => ComponentsUtils.Edit.Rules.emailReq(v, t);
const emailValidRule = (v) => ComponentsUtils.Edit.Rules.emailValid(v, t);

function openForgot() {
  forgotEmail.value = username.value || '';
  forgotSent.value = false;
  forgotError.value = '';
  forgotDialog.value = true;
}

async function sendForgot() {
  if (forgotFormRef.value && typeof forgotFormRef.value.validate === 'function') {
    const ok = await forgotFormRef.value.validate();
    if (!ok) {
      return;
    }
  }

  forgotError.value = '';
  forgotSending.value = true;
  try {
    const email = forgotEmail.value.trim();
    await Api.resetUserPassword({ username: email });
    forgotSent.value = true;
  } catch (e) {
    console.error('Error asking for a password reset', e);
    const errText = e.response?.data?.error?.toString() || e.toString();
    forgotError.value = errText;
  } finally {
    forgotSending.value = false;
  }
}
</script>

<style scoped>
.v-card {
  max-width: 800px;
}
</style>
