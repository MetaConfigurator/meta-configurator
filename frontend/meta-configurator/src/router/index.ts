import { createWebHistory, createRouter, createMemoryHistory } from "vue-router";
import HomePage from '@/HomePage.vue';
import SchemaDisplayPage from '@/views/SchemaDisplayPage.vue';
import SettingPage from '@/views/SettingPage.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/schema',
    component: HomePage,
  },
  {
    path: '/setting',
    component: HomePage,
  },
];

const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

export default router;
