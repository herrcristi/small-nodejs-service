<template>
  <!-- 
        dashboard: depends on the selected school
        - the Portal School (portal admins) shows the schools
        - any other school shows the schedules
  -->
  <ApiSchools v-if="isPortal" />
  <ApiSchedules v-else />
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../stores/stores.js';
import ApiSchools from './api.schools.vue';
import ApiSchedules from './api.schedules.vue';

// the permissions are derived from the roles of the selected school (the portal school id is only known by the backend)
const app = useAppStore();
const isPortal = computed(() => !!app?.rolesPermissions?.schools?.read);
</script>
