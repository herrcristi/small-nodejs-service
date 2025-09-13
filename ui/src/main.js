import { createApp } from 'vue';
import App from './app.vue';
import './style.css';
import Router from './router/index.js';

const app = createApp(App);

app.config.errorHandler = (err) => {
  /* handle error */
  console.error(err);
};

app.use(Router).mount('#app');
