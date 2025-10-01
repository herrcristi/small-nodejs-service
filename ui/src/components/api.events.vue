<template>
  <ApiPage
    title="events"
    :fields="['severity', 'user.username', 'target.name', 'message', 'createdTimestamp']"
    :projectionFields="['severity', 'user', 'target', 'createdTimestamp']"
    :sortFields="['severity', 'user.username', 'target.name', '_lang_en.message', 'createdTimestamp']"
    :filterFields="['_lang_en.severity', 'user.username', 'target.name', '_lang_en.message', 'createdTimestamp']"
    :apiFn="{
      getAll: Api.getEvents,
    }"
    :read="read"
    :write="0"
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

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
