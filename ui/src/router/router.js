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

import Login from '../components/api.user.login.vue';
import TenantSelect from '../components/base.tenant.select.vue';
import Profile from '../components/api.user.profile.vue';

import { useAuthStore, useAppStore } from '../stores/stores.js';

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
      meta: { requiresAuth: false, noLayout: true },
      props: (route) => ({ tenantID: route.query.tenantID, next: route.query.next || '/' }),
    },
    {
      path: '/tenants',
      name: 'Tenants',
      component: TenantSelect,
      meta: { requiresAuth: true, noLayout: true },
      props: (route) => ({ tenantID: route.query.tenantID, next: route.query.next || '/' }),
    },
    {
      path: '/profile',
      name: 'Profile',
      component: Profile,
      meta: { requiresAuth: true, breadcrumbs: [{ text: 'Profile', to: '/profile' }] },
    },
  ],
});

// navigation guard - redirect to /login if route requires auth and user is not authenticated
Router.beforeEach((to, from, next) => {
  if (!to.meta || to.meta.requiresAuth === false) {
    return next();
  }

  const token = useAuthStore()?.token;
  const tenantID = useAppStore()?.tenantID;
  const nextPath = encodeURIComponent(to.fullPath || to.path || '/');

  // check auth
  if (token) {
    // check tenant
    if (tenantID) {
      return next();
    }

    // redirect to tenant select
    if (to.path === '/tenants') {
      next();
    }
    return next({ path: '/tenants', query: { next: nextPath } });
  }

  // reset tenantID if no auth
  useAppStore()?.saveTenant(null, null); // reset it

  // pass tenant and if in tenant selection tenant will be changed
  // then the next should be cleared
  return next({ path: '/login', query: { tenantID, next: nextPath } });
});

export default Router;
