import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { useAuthStore, useAppStore } from './stores/stores.js';
import Api, { bootstrapAuthFromCookie } from './api/api.js';

import App from './app.vue';
import './styles.css';
import Router, { setBootstrapComplete } from './router/router.js';

// Vuetify
import 'vuetify/styles';
// Material Design Icons (used by v-icon)
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
  components,
  directives,
});

import i18n from './i18n.js';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

// load auth store into pinia
const authStore = useAuthStore();
const appStore = useAppStore();

app.config.errorHandler = (err) => {
  console.error(err);
};

app.use(i18n);
app.use(Router);
app.use(vuetify);

// bootstrap: restore session from cookie (if user refreshed page), then mount app
bootstrapAuthFromCookie()
  .then(() => {
    // reload both stores after bootstrap completes (tenantID restored from localStorage)
    authStore.load();
    appStore.load();
  })
  .finally(() => {
    // signal that bootstrap is complete so router guard can check tenantID
    setBootstrapComplete();

    // wait for router to be ready, then mount app
    Router.isReady().then(() => {
      app.mount('#app');
    });
  });
