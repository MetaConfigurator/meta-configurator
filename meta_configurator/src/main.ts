import {createApp} from 'vue';
import {createPinia} from 'pinia';
import PrimeVue from 'primevue/config';
import Lara from '@primevue/themes/lara';

import Tooltip from 'primevue/tooltip';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import {useAppRouter} from './router/router';
import ErrorService from '@/utility/errorService';
import {registerIcons} from '@/fontawesome';

import {registerDefaultDataFormats} from '@/dataformats/defaultFormats';
import App from '@/views/App.vue';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {registerDefaultPanelTypes} from '@/components/panels/defaultPanelTypes';
import {definePreset} from '@primevue/themes';
import {initErrorService, useErrorService} from '@/utility/errorServiceInstance';

// @ts-ignore
const app = createApp(App);

const indigoPreset = definePreset(Lara, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}',
    },

    colorScheme: {
      light: {
        primary: {
          color: '{indigo.500}',
          hoverColor: '{indigo.900}',
          activeColor: 'black',
        },
        highlight: {
          color: '{indigo.500}',
          focusColor: '#ffffff',
        },
      },
      dark: {
        primary: {
          color: '{indigo.50}',
          hoverColor: '{indigo.100}',
          activeColor: 'white',
        },
        highlight: {
          background: '{indigo.950}',
          focusBackground: '{indigo.700}',
          color: '{indigo.300}',
          focusColor: 'rgba(255,255,255,.87)',
        },
      },
    },
  },
});

app.use(createPinia());
app.use(useAppRouter());
app.use(PrimeVue, {
  // Default theme configuration
  theme: {
    preset: indigoPreset,
    options: {
      prefix: 'p',
      darkModeSelector: 'system',
      cssLayer: false,
    },
  },
});
app.use(ToastService);

app.use(ConfirmationService);

app.directive('tooltip', Tooltip);
initErrorService(app.config.globalProperties.$toast);
app.config.errorHandler = (error: unknown) => useErrorService().onError(error);

registerIcons();
registerDefaultDataFormats();
registerDefaultPanelTypes();

// warn the user if he closes the app
window.addEventListener('beforeunload', event => {
  // check if user made any changes and only then warn user
  if (
    Object.keys(getDataForMode(SessionMode.DataEditor).data.value).length > 0 ||
    Object.keys(getDataForMode(SessionMode.SchemaEditor).data.value).length > 0
  ) {
    event.returnValue = null;
  }
});

app.mount('#app');
