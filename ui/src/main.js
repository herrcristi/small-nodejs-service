import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import { createPinia } from 'pinia';
import { useAuthStore } from './stores/auth.stores.js';

import App from './app.vue';
import './styles.css';
import Router from './router/router.js';

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

import en from './translations/en.json';
import ro from './translations/ro.json';

const i18n = createI18n({
  legacy: false,
  locale: 'ro',
  fallbackLocale: 'en',
  formatFallbackMessages: true,
  silentFallbackWarn: true,
  messages: {
    en: en,
    ro: ro,
  },
});

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

// load auth store into pinia
const authStore = useAuthStore();
authStore.load();

app.config.errorHandler = (err) => {
  console.error(err);
};

app.use(i18n);
app.use(Router);
app.use(vuetify);
app.mount('#app');
