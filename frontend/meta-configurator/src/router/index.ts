import {createRouter, createWebHistory} from 'vue-router';

// Note: currently not in use/active

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../App.vue'),
    },
  ],
});

export default router;
