import {createApp} from 'vue';
import {createPinia} from 'pinia';
import PrimeVue from 'primevue/config';

import 'primevue/resources/themes/lara-light-indigo/theme.css';
import 'primevue/resources/primevue.min.css';
import Tooltip from 'primevue/tooltip';

import router from './router';
import FileEditorView from '@/views/FileEditorView.vue';

// @ts-ignore
const app = createApp(FileEditorView);

app.use(createPinia());
app.use(router);
app.use(PrimeVue);
app.directive('tooltip', Tooltip);

app.mount('#app');
