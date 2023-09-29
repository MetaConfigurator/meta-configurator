import {createApp} from 'vue';
import {createPinia} from 'pinia';
import PrimeVue from 'primevue/config';

import 'primevue/resources/themes/lara-light-indigo/theme.css';
import 'primevue/resources/primevue.min.css';
import Tooltip from 'primevue/tooltip';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import router from './router';
import FileEditorView from '@/views/FileEditorView.vue';
import ErrorService from '@/helpers/errorService';
import {registerIcons} from '@/fontawesome';
import VueCookies from 'vue-cookies';

import cookiesHandler from '@/cookies/cookiesHandler';

// @ts-ignore
const app = createApp(FileEditorView);

app.use(createPinia());
app.use(router);
app.use(PrimeVue);
app.use(ToastService);
app.use(VueCookies);

app.use(ConfirmationService);

app.directive('tooltip', Tooltip);
cookiesHandler.initializeFromCookies();
export const errorService = new ErrorService(app.config.globalProperties.$toast);
app.config.errorHandler = (error: unknown) => errorService.onError(error);

registerIcons();

// warn the user if he closes the app
window.addEventListener('beforeunload', event => {
  event.returnValue = `Are you sure you want to leave?`;
});

app.mount('#app');
