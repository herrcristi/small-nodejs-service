<template>
  <ApiPage
    title="students"
    :fields="['user.name', 'user.status', 'user.email']"
    :projectionFields="['user.name', 'user.status', 'user.email']"
    :sortFields="['user.name', 'user.status', 'user.email']"
    :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
    :apiFn="{
      getAll: Api.getStudents,
      create: Api.createStudent,
      update: Api.updateStudent,
      delete: Api.deleteStudent,
    }"
    :read="app?.rolesPermissions?.students?.read"
    :write="app?.rolesPermissions?.students?.write"
  ></ApiPage>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import ApiPage from './api.base.page.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * state
 */
const app = useAppStore();

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
