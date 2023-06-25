import {createRouter, createWebHistory} from 'vue-router';
import HomePage from '@/HomePage.vue';
import SettingPage from "@/SettingPage.vue";

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta:{
      title:"Home",
    }
  },
  {
    path: '/setting',
    name: 'Setting',
    component: SettingPage,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});
router.beforeEach((to, from, next) => {
  // Update the page title based on the current route
  document.title = to.meta.title;
  next();
});

export default router;
