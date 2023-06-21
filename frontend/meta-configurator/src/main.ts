import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
// @ts-ignore
import App from '@/App.vue';
import PrimeVue from 'primevue/config';
import 'primevue/resources/primevue.min.css';
import 'primevue/resources/themes/lara-light-indigo/theme.css';
import 'primeicons/primeicons.css';
const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue);
app.mount('#app');
