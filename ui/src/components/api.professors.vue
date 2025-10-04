<template>
  <ApiPage
    title="professors"
    :fields="['user.name', 'user.status', 'user.email']"
    :projectionFields="['user.name', 'user.status', 'user.email']"
    :sortFields="['user.name', 'user.status', 'user.email']"
    :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
    :apiFn="{
      getAll: Api.getProfessors,
      create: Api.createProfessor,
      update: Api.updateProfessor,
      delete: Api.deleteProfessor,
    }"
    :read="app?.rolesPermissions?.professors?.read"
    :write="app?.rolesPermissions?.professors?.write"
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
