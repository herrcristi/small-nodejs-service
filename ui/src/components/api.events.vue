<template>
  <v-card v-if="read || write">
    <!-- 
          table
    -->
    <v-data-table-server
      :headers="headers"
      :items="items"
      :items-length="totalItems"
      :loading="loading"
      :search="filter"
      :no-data-text="nodatatext"
      @update:options="fetchAll"
      item-key="id"
      class="elevation-1"
      striped="even"
      items-per-page="50"
    >
      <!-- 
          top of the table, title + add + filter 
      -->
      <template v-slot:top>
        <v-toolbar flat>
          <v-card-title class="d-flex justify-space-between">
            {{ $t('events') }}
          </v-card-title>

          <v-toolbar-title> </v-toolbar-title>

          <v-text-field
            v-model="filter"
            label="Filter"
            class="me-2"
            rounded="lg"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            hide-details
            single-line
          ></v-text-field>
        </v-toolbar>
      </template>

      <!-- 
          loading
      -->
      <template v-slot:loading>
        <v-skeleton-loader type="table-row@1"></v-skeleton-loader>
      </template>

      <!-- 
        severity 
      -->
      <template v-slot:item.severity="{ item }">
        <div class="">
          <v-chip
            :color="getSeverityColor(item.severity)"
            :text="item._lang_en?.severity"
            class="text-uppercase"
            size="small"
            label
          ></v-chip>
        </div>
      </template>
    </v-data-table-server>

    <!-- 
      snackbar for notifications
    -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';

/**
 * state
 */
const items = ref([]);
const totalItems = ref(0);
const filter = ref('');
const loading = ref(true);
const nodatatext = ref('');

const itemData = reactive({ _lang_en: { message: '' } });
const lastRequestParams = ref({});

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

const app = useAppStore();
const read = app?.rolesPermissions?.events?.read || 0;
const write = app?.rolesPermissions?.events?.write || 0;
const { t } = useI18n();

/**
 * headers
 */
const headers = computed(() => {
  const h = [
    { title: t('severity'), key: 'severity' },
    { title: t('user'), key: 'user.username' },
    { title: t('target'), key: 'target.name' },
    { title: t('message'), key: '_lang_en.message' },
    { title: t('timestamp'), key: 'createdTimestamp' },
  ];
  return h;
});

/**
 * color for severity
 */
function getSeverityColor(severity) {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'warning':
      return 'orange';
    case 'info':
      return 'green';
    default:
      return 'grey';
  }
}

/**
 * fetchAll
 */
async function fetchAll({ page, itemsPerPage, sortBy } = {}) {
  lastRequestParams.value = { page, itemsPerPage, sortBy };

  let timeoutID = setTimeout(() => {
    loading.value = true;
  }, 300); // Show loader if it takes more than 300ms

  try {
    const start = (page - 1) * itemsPerPage;

    let params = {
      skip: start,
      limit: itemsPerPage,
      projection: 'id,createdTimestamp,severity,target,user,name,_lang_en',
      sort: '-createdTimestamp',
    };

    if (filter.value) {
      params = {
        ...params,
        'createdTimestamp,_lang_en.severity,user.username,target.name,_lang_en.message': `/${filter.value}/i`,
      };
    }

    if (sortBy.length) {
      params.sort = '';
      sortBy.forEach((s) => {
        params.sort += `${s.order === 'desc' ? `-${s.key}` : s.key},`;
      });
      params.sort = params.sort.slice(0, -1);
    }

    const response = await Api.getEvents(new URLSearchParams(params).toString());
    totalItems.value = response.data?.meta?.count || 0;
    items.value = response.data?.data || [];
    nodatatext.value = '';
  } catch (e) {
    console.error('Error fetching all events:', e);
    nodatatext.value = e.toString();
    totalItems.value = 0;
    items.value = [];

    snackbarText.value = t('events.fetch.error') || 'Error fetching events';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    clearTimeout(timeoutID);
    loading.value = false;
  }
}

/**
 * mounted
 */
function mounted() {}

// expose to template
</script>

<style scoped>
/* component styles */
</style>
