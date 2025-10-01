<template>
  <ApiPage
    title="schedules"
    :fields="['name', 'status', 'class.name']"
    :projectionFields="['name', 'status', 'class']"
    :sortFields="['name', 'status']"
    :filterFields="['name', '_lang_en.status', 'class.name']"
    :apiFn="{
      getAll: Api.getSchedules,
      create: Api.createSchedule,
      update: Api.updateSchedule,
      delete: Api.deleteSchedule,
    }"
    :read="read"
    :write="write"
  ></ApiPage>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import ApiPage from './api.page.vue';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const app = useAppStore();
const read = app?.rolesPermissions?.schedules?.read || 0;
const write = app?.rolesPermissions?.schedules?.write || 0;

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
