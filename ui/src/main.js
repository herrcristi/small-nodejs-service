import { createApp } from 'vue';
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

const app = createApp(App);

app.config.errorHandler = (err) => {
  console.error(err);
};

app.use(Router).use(vuetify).mount('#app');
