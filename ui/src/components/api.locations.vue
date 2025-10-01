<template>
  <ApiPage
    title="locations"
    :fields="['name', 'status', 'address']"
    :projectionFields="['name', 'status', 'address']"
    :sortFields="['name', 'status']"
    :filterFields="['name', '_lang_en.status', 'address']"
    :apiFn="{
      getAll: Api.getLocations,
      create: Api.createLocation,
      update: Api.updateLocation,
      delete: Api.deleteLocation,
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
const read = app?.rolesPermissions?.locations?.read || 0;
const write = app?.rolesPermissions?.locations?.write || 0;

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
