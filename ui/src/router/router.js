// import Vue from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import Schools from '../components/api.schools.vue';
import Students from '../components/api.students.vue';
import Professors from '../components/api.professors.vue';
import Groups from '../components/api.groups.vue';
import Locations from '../components/api.locations.vue';
import Events from '../components/api.events.vue';
import Classes from '../components/api.classes.vue';
import Schedules from '../components/api.schedules.vue';
import Login from '../components/login.vue';
import { useAuthStore } from '../stores/stores';

const Router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Schedules,
      meta: {
        requiresAuth: true,
        breadcrumbs: [{ text: 'Dashboard', to: '/' }],
      },
    },
    {
      path: '/schools',
      name: 'Schools',
      component: Schools,
      meta: {
        requiresAuth: true,
        breadcrumbs: [{ text: 'Schools', to: '/schools' }],
      },
    },
    {
      path: '/students',
      name: 'Students',
      component: Students,
      meta: {
        requiresAuth: true,
        breadcrumbs: [{ text: 'Students', to: '/students' }],
      },
    },
    {
      path: '/professors',
      name: 'Professors',
      component: Professors,
      meta: {
        requiresAuth: true,
        breadcrumbs: [{ text: 'Professors', to: '/professors' }],
      },
    },
    {
      path: '/groups',
      name: 'Groups',
      component: Groups,
      meta: {
        requiresAuth: true,
        breadcrumbs: [{ text: 'Groups', to: '/groups' }],
      },
    },
    {
      path: '/locations',
      name: 'Locations',
      component: Locations,
      meta: {
        requiresAuth: true,
        breadcrumbs: [{ text: 'Locations', to: '/locations' }],
      },
    },
    {
      path: '/events',
      name: 'Events',
      component: Events,
      meta: {
        requiresAuth: true,
        breadcrumbs: [{ text: 'Events', to: '/events' }],
      },
    },
    {
      path: '/classes',
      name: 'Classes',
      component: Classes,
      meta: {
        requiresAuth: true,
        breadcrumbs: [{ text: 'Classes', to: '/classes' }],
      },
    },
    {
      path: '/schedules',
      name: 'Schedules',
      component: Schedules,
      meta: {
        requiresAuth: true,
        breadcrumbs: [{ text: 'Schedules', to: '/schedules' }],
      },
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
      props: (route) => ({ next: route.query.next || '/' }),
      meta: { requiresAuth: false },
    },
  ],
});

// navigation guard - redirect to /login if route requires auth and user is not authenticated
Router.beforeEach((to, from, next) => {
  if (!to.meta || to.meta.requiresAuth === false) {
    return next();
  }

  try {
    const s = useAuthStore();
    if (s && s.token) {
      return next();
    }
  } catch (e) {
    // store not available or not initialized
  }

  // TODO get current tenantID from local store
  let currentTenantID;
  // try {
  //   currentTenantID = piniaOrgStore()?.tenantID;
  //   }
  // } catch (e) {
  //   // store not available or not initialized
  // }

  // if organization will be changed the next should be cleared
  const nextPath = encodeURIComponent(to.fullPath || to.path || '/');
  return next({ path: '/login', query: { tenantID: currentTenantID, next: nextPath } });
});

export default Router;
