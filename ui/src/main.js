import { createApp } from 'vue';
import App from './app.vue';
import './style.css';
import Router from './router/index.js';

createApp(App).use(Router).mount('#app');
