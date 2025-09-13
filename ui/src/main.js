import { createApp } from 'vue';
import App from './app.vue';
import './styles.css';
import Router from './router/router.js';

const app = createApp(App);

app.config.errorHandler = (err) => {
  /* handle error */
  console.error(err);
};

app.use(Router).mount('#app');
