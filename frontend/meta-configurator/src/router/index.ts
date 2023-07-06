import {createRouter, createWebHistory} from 'vue-router';
import {ChangeResponsible, SessionMode, useSessionStore} from '@/store/sessionStore';

// Note: currently not in use/active

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

const DEFAULT_TITLE = 'META CONFIGURATOR';
router.beforeEach((to, from, next) => {
  // Update the page title based on the current route
  document.title = (to.meta.title || DEFAULT_TITLE) as string;

  useSessionStore().lastChangeResponsible = ChangeResponsible.Routing
  useSessionStore().currentMode = to.meta.sessionMode as SessionMode;
  console.log("new mode ", useSessionStore().currentMode)
  useSessionStore().currentPath = [];
  next();
});

export default router;
