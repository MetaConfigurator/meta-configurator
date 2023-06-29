import {createApp} from 'vue';
import {createPinia} from 'pinia';
import PrimeVue from 'primevue/config';

import 'primevue/resources/themes/lara-light-indigo/theme.css';
import 'primevue/resources/primevue.min.css';

import router from './router';
import SchemaEditorView from "@/views/SchemaEditorView.vue";

// @ts-ignore
const app = createApp(SchemaEditorView);

app.use(createPinia());
app.use(router);
app.use(PrimeVue);

app.mount('#app');
