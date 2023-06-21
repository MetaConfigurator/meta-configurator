import {createWebHistory, createRouter} from 'vue-router';
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
    component: SchemaDisplayPage,
  },
  {
    path: '/setting',
    component: SettingPage,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
