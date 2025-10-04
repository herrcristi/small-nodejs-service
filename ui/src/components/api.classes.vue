<template>
  <ApiPage
    title="classes"
    :fields="['name', 'status', 'description', 'credits', 'required']"
    :projectionFields="['name', 'status', 'description', 'credits', 'required']"
    :sortFields="['name', 'status']"
    :filterFields="['name', '_lang_en.status', 'description', '_lang_en.credits', '_lang_en.required']"
    :apiFn="{
      getAll: Api.getClasses,
      create: Api.createClass,
      update: Api.updateClass,
      delete: Api.deleteClass,
    }"
    :read="read"
    :write="write"
  ></ApiPage>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import ApiPage from './api.base.page.vue';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const app = useAppStore();
const read = app?.rolesPermissions?.classes?.read || 0;
const write = app?.rolesPermissions?.classes?.write || 0;

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
