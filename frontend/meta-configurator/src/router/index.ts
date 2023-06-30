import {createRouter, createWebHistory} from 'vue-router';
import {SessionMode} from '@/store/sessionStore';
import {useSessionStore} from '@/store/sessionStore';

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
      path: '/setting',
      name: 'setting',
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

  let newMode: SessionMode = to.meta.sessionMode!!;
  useSessionStore().currentMode = newMode;
  useSessionStore().currentPath = [];
  next();
});

export default router;
