import {createWebHistory, createRouter} from 'vue-router';
import Home from '@/Home.vue';
import SchemaDisplayPage from '@/views/SchemaDisplayPage.vue';
import Setting from '@/views/Setting.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/schema',
    component: SchemaDisplayPage,
  },
  {
    path: '/setting',
    component: Setting,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
