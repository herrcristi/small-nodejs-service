<template>
  <ApiPage
    title="schools"
    :fields="['name', 'status', 'description']"
    :projectionFields="['name', 'status', 'description']"
    :sortFields="['name', 'status']"
    :filterFields="['name', '_lang_en.status', 'description']"
    :apiFn="{
      getAll: Api.getSchools,
      create: Api.createSchool,
      update: Api.updateSchool,
      delete: Api.deleteSchool,
    }"
    :read="read"
    :write="write"
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
 * props
 */

const app = useAppStore();
const read = app?.rolesPermissions?.groups?.read;
const write = app?.rolesPermissions?.groups?.write;

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
