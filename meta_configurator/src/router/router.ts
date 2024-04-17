import {createMemoryHistory, createRouter, createWebHistory} from 'vue-router';
import {useSessionStore} from '@/store/sessionStore';
import {SessionMode} from '@/store/sessionMode';
import SchemaEditorView from '@/views/SchemaEditorView.vue';
import FileEditorView from '@/views/FileEditorView.vue';
import SettingsEditorView from '@/views/SettingsEditorView.vue';

/**
 * The router of the application.
 * It defines the routes and the corresponding components.
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'file',
      component: FileEditorView,
      meta: {
        title: 'FileEditor',
        sessionMode: SessionMode.FileEditor,
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
