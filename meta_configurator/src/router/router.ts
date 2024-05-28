import {createRouter, createWebHashHistory} from 'vue-router';
import {useSessionStore} from '@/store/sessionStore';
import {SessionMode} from '@/store/sessionMode';
import SchemaEditorView from '@/views/SchemaEditorView.vue';
import DataEditorView from '@/views/DataEditorView.vue';
import SettingsEditorView from '@/views/SettingsEditorView.vue';
import FetchView from '@/views/FetchView.vue';

/**
 * The router of the application.
 * It defines the routes and the corresponding components.
 */
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/data',
      name: 'data',
      component: DataEditorView,
      meta: {
        title: 'DataEditor',
        sessionMode: SessionMode.DataEditor,
      },
    },
    {
      path: '/schema',
      name: 'schema',
      component: SchemaEditorView,
      meta: {
        title: 'SchemaEditor',
        sessionMode: SessionMode.SchemaEditor,
      },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsEditorView,
      meta: {
        title: 'SettingEditor',
        sessionMode: SessionMode.Settings,
      },
    },
    {
      path: '/',
      name: 'fetch',
      component: FetchView,
      props: true,
      meta: {
        title: 'DataEditor',
        sessionMode: SessionMode.DataEditor,
      },
    },
  ],
});

const DEFAULT_TITLE = 'MetaConfigurator';

router.beforeEach((to, from, next) => {
  // Update the page title based on the current route
  document.title = (to.meta.title || DEFAULT_TITLE) as string;

  useSessionStore().currentMode = to.meta.sessionMode as SessionMode;

  next();
});

export function useAppRouter() {
  return router;
}
