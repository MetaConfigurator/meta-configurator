import {createApp} from 'vue';
import {createPinia} from 'pinia';
import PrimeVue from 'primevue/config';

import 'primevue/resources/themes/lara-light-indigo/theme.css';
import 'primevue/resources/primevue.min.css';
import Tooltip from 'primevue/tooltip';
import ToastService from 'primevue/toastservice';

import router from './router';
import FileEditorView from '@/views/FileEditorView.vue';
import ErrorService from '@/helpers/errorHandler';

// @ts-ignore
const app = createApp(FileEditorView);

app.use(createPinia());
app.use(router);
app.use(PrimeVue);
app.use(ToastService);
app.directive('tooltip', Tooltip);

export const errorService = new ErrorService(app.config.globalProperties.$toast);
app.config.errorHandler = (error: unknown) => errorService.onError(error);

app.mount('#app');
