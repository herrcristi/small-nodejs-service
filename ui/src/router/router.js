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

const Router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Schedules,
      meta: {
        breadcrumbs: [{ text: 'Dashboard', to: '/' }],
      },
    },
    {
      path: '/schools',
      name: 'Schools',
      component: Schools,
      meta: {
        breadcrumbs: [{ text: 'Schools', to: '/schools' }],
      },
    },
    {
      path: '/students',
      name: 'Students',
      component: Students,
      meta: {
        breadcrumbs: [{ text: 'Students', to: '/students' }],
      },
    },
    {
      path: '/professors',
      name: 'Professors',
      component: Professors,
      meta: {
        breadcrumbs: [{ text: 'Professors', to: '/professors' }],
      },
    },
    {
      path: '/groups',
      name: 'Groups',
      component: Groups,
      meta: {
        breadcrumbs: [{ text: 'Groups', to: '/groups' }],
      },
    },
    {
      path: '/locations',
      name: 'Locations',
      component: Locations,
      meta: {
        breadcrumbs: [{ text: 'Locations', to: '/locations' }],
      },
    },
    {
      path: '/events',
      name: 'Events',
      component: Events,
      meta: {
        breadcrumbs: [{ text: 'Events', to: '/events' }],
      },
    },
    {
      path: '/classes',
      name: 'Classes',
      component: Classes,
      meta: {
        breadcrumbs: [{ text: 'Classes', to: '/classes' }],
      },
    },
    {
      path: '/schedules',
      name: 'Schedules',
      component: Schedules,
      meta: {
        breadcrumbs: [{ text: 'Schedules', to: '/schedules' }],
      },
    },
  ],
});

export default Router;
