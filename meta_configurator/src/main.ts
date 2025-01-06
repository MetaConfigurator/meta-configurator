import {createApp} from 'vue';
import {createPinia} from 'pinia';
import PrimeVue from 'primevue/config';

import 'primevue/resources/themes/lara-light-indigo/theme.css';
import 'primevue/resources/primevue.min.css';
import Tooltip from 'primevue/tooltip';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import {useAppRouter} from './router/router';
import ErrorService from '@/utility/errorService';
import {registerIcons} from '@/fontawesome';

import {registerDefaultDataFormats} from '@/dataformats/defaultFormats';
import App from '@/views/App.vue';
import {getDataForMode, getSessionForMode} from "@/data/useDataLink";
import {SessionMode} from "@/store/sessionMode";

// @ts-ignore
const app = createApp(App);

app.use(createPinia());
app.use(useAppRouter());
app.use(PrimeVue);
app.use(ToastService);

app.use(ConfirmationService);

app.directive('tooltip', Tooltip);
export const errorService = new ErrorService(app.config.globalProperties.$toast);
app.config.errorHandler = (error: unknown) => errorService.onError(error);

registerIcons();
registerDefaultDataFormats();

// warn the user if he closes the app
window.addEventListener('beforeunload', event => {
  // check if user made any changes and only then warn user
  if (Object.keys(getDataForMode(SessionMode.DataEditor).data.value).length > 0 || Object.keys(getDataForMode(SessionMode.SchemaEditor).data.value).length > 0) {
    event.returnValue = null;
  }
});

app.mount('#app');
