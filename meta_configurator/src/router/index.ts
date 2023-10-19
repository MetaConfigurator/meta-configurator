import {createRouter, createWebHistory} from 'vue-router';
import {ChangeResponsible, SessionMode, useSessionStore} from '@/store/sessionStore';
import {clearPreprocessedRefSchemaCache} from '@/schema/schemaPreprocessor';

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
      component: () => import('../views/FileEditorView.vue'),
      meta: {
        title: 'FileEditor',
        sessionMode: SessionMode.FileEditor,
      },
    },
    {
      path: '/schema',
      name: 'schema',
      component: () => import('../views/SchemaEditorView.vue'),
      meta: {
        title: 'SchemaEditor',
        sessionMode: SessionMode.SchemaEditor,
      },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsEditorView.vue'),
      meta: {
        title: 'SettingEditor',
        sessionMode: SessionMode.Settings,
      },
    },
  ],
});

const DEFAULT_TITLE = 'Config Assistant';

/**
 * We make sure that important session variables are reset when the
 * user switches between the different views.
 */
router.beforeEach((to, from, next) => {
  // Update the page title based on the current route
  document.title = (to.meta.title || DEFAULT_TITLE) as string;

  useSessionStore().lastChangeResponsible = ChangeResponsible.Routing;
  useSessionStore().currentMode = to.meta.sessionMode as SessionMode;
  useSessionStore().currentPath = [];
  useSessionStore().currentSelectedElement = [];
  useSessionStore().currentExpandedElements = {};
  useSessionStore().currentSearchResults = [];

  useSessionStore().reloadSchema();

  clearPreprocessedRefSchemaCache();

  next();
});

export default router;
