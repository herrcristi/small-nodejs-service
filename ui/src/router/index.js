// import Vue from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import Schools from '../components/schools.vue';
import Students from '../components/students.vue';
import Professors from '../components/professors.vue';
import Groups from '../components/groups.vue';
import Locations from '../components/locations.vue';
import Events from '../components/events.vue';
import Classes from '../components/classes.vue';
import Schedules from '../components/schedules.vue';

const Router = createRouter({
  mode: 'history',
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      name: 'Dashboard',
      component: Schools,
    },
    {
      path: '/schools',
      name: 'Schools',
      component: Schools,
    },
    {
      path: '/students',
      name: 'Students',
      component: Students,
    },
    {
      path: '/professors',
      name: 'Professors',
      component: Professors,
    },
    {
      path: '/groups',
      name: 'Groups',
      component: Groups,
    },
    {
      path: '/locations',
      name: 'Locations',
      component: Locations,
    },
    {
      path: '/events',
      name: 'Events',
      component: Events,
    },
    {
      path: '/classes',
      name: 'Classes',
      component: Classes,
    },
    {
      path: '/schedules',
      name: 'Schedules',
      component: Schedules,
    },
  ],
});

export default Router;
