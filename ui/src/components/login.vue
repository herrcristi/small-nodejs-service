<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card>
          <v-card-title>{{ $t('login') || 'Login' }}</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="username"
                :label="$t('login.username') || 'Username'"
                :rules="[(v) => !!v || $t('login.username_required') || 'Username is required']"
                outlined
                dense
              />
              <v-text-field
                v-model="password"
                :label="$t('login.password') || 'Password'"
                type="password"
                :rules="[(v) => !!v || $t('login.password_required') || 'Password is required']"
                outlined
                dense
              />
              <v-checkbox v-model="withCreds" :label="$t('login.remember_me') || 'Remember me (send cookies)'" />
            </v-form>
            <v-alert type="error" v-if="error" dense text>
              {{ error }}
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" :loading="loading" @click="submit">
              {{ $t('login.submit') || 'Login' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref } from 'vue';
import Api from '../api/api.js';
import { processLoginResponse } from '../auth.js';
import { useRouter } from 'vue-router';

export default {
  name: 'Login',
  props: {
    tenantID: { type: String, default: null },
    next: { type: String, default: '/' },
  },
  setup(props) {
    const username = ref('');
    const password = ref('');
    const withCreds = ref(false);
    const loading = ref(false);
    const error = ref(null);
    const valid = ref(true);
    const router = useRouter();

    async function submit() {
      error.value = null;
      if (!username.value || !password.value) {
        error.value = 'Please enter username and password';
        return;
      }

      loading.value = true;
      try {
        // call the backend login
        const resp = await Api.login({ id: username.value, password: password.value }, withCreds.value);

        // process the response
        const r = await processLoginResponse(resp);
        if (r.error) {
          throw r.error.error;
        }
        if (r.status !== 200) {
          throw new Error('Authentication failed');
        }

        // if tenant already selected, redirect to next
        if (r.tenantID) {
          // if tenant changed, reset next to /
          if (props.tenantID && props.tenantID !== r.tenantID) {
            props.next = '/';
          }
          // redirect to next
          const target = props.next || '/';
          router.push(decodeURIComponent(target));
        } else {
          // redirect to tenant selection page and pass next
          const tenantIDParam = props.tenantID ? encodeURIComponent(props.tenantID) : '';
          const nextParam = encodeURIComponent(props.next || '/');
          router.push(`/tenants?tenantID=${tenantIDParam}&next=${nextParam}`);
        }
      } catch (e) {
        error.value = e.message || 'Login failed';
      } finally {
        loading.value = false;
      }
    }

    return {
      username,
      password,
      withCreds,
      loading,
      error,
      submit,
      valid,
    };
  },
};
</script>

<style scoped>
.v-card {
  max-width: 800px;
}
</style>
