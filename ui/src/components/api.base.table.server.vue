<template v-if="props.read || props.write">
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
    v-model="selectedItems"
    :show-select="props.select"
    @update:model="emit('update:modelValue', $event)"
    :show-expand="props.expand"
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
          {{ $t(props.title) }}
        </v-card-title>

        <v-btn
          class="me-2 left"
          color="primary"
          prepend-icon="mdi-plus"
          rounded="lg"
          text=""
          border
          @click="openAdd"
          v-if="props.write && props.apiFn?.create"
        ></v-btn>

        <v-toolbar-title> </v-toolbar-title>

        <v-text-field
          v-if="Array.isArray(props.filterFields)"
          v-model="filter"
          :label="t('filter')"
          class="me-2"
          rounded="lg"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          hide-details
          single-line
          clearable
        ></v-text-field>
      </v-toolbar>
    </template>

    <!-- 
          loading
      -->
    <template v-slot:loading>
      <v-skeleton-loader type="table-row@1"></v-skeleton-loader>
    </template>

    <!-- details column (icon) -->
    <template v-slot:item.details="{ item }" v-if="props.details">
      <v-btn icon small @click.stop="openDetails(item.id)" :title="$t('details')">
        <v-icon color="primary" class="mr-2" size="small">mdi-information-outline</v-icon>
        <!-- <v-icon color="primary">mdi-chevron-right</v-icon> -->
      </v-btn>
    </template>

    <!-- 
        status 
        -->
    <template v-slot:item.status="{ item }">
      <div class="">
        <v-chip
          :color="getStatusColor(item.status)"
          :text="item._lang_en?.status || item._lang_en?.user?.status || item.status || item.user?.status"
          size="small"
          label
        ></v-chip>
      </div>
    </template>

    <!-- 
        severity 
      -->
    <template v-slot:item.severity="{ item }">
      <div class="">
        <v-chip
          :color="getSeverityColor(item.severity)"
          :text="item._lang_en?.severity || item.severity"
          class="text-uppercase"
          size="small"
          label
        ></v-chip>
      </div>
    </template>

    <!-- 
        required
        -->
    <template v-slot:item.required="{ item }">
      <div class="">
        <v-chip
          :color="getRequiredColor(item.required)"
          :text="item._lang_en?.required || item.required"
          size="small"
          label
        ></v-chip>
      </div>
    </template>

    <!-- 
        message
        -->
    <template v-slot:item.message="{ item }">
      <div class="">
        {{ item._lang_en?.message || item.message }}
      </div>
    </template>

    <!-- 
        expand 
    -->
    <template v-slot:item.data-table-expand="{ internalItem, isExpanded, toggleExpand }">
      <v-btn
        :append-icon="isExpanded(internalItem) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        :text="isExpanded(internalItem) ? t('collapse') : t('more.info')"
        class="text-none"
        color="medium-emphasis"
        size="small"
        variant="text"
        width="105"
        border
        slim
        @click="toggleExpand(internalItem)"
      ></v-btn>
    </template>

    <template v-slot:expanded-row="{ columns, item }">
      <slot name="expanded-content" :item="item" :columns="columns">
        <tr>
          <td :colspan="columns.length" class="py-2">
            <v-sheet rounded="lg" border>
              <!-- Default content if no slot is provided -->
            </v-sheet>
          </td>
        </tr>
      </slot>
    </template>

    <!-- 
          actions
      -->
    <template #item.actions="{ item }" v-if="props.write">
      <v-icon v-if="props.apiFn?.update" small class="mr-2" @click="openEdit(item)" :title="$t('edit')" size="small"
        >mdi-pencil</v-icon
      >
      <v-icon
        v-if="props.apiFn?.delete"
        small
        color="mr-2"
        @click="confirmDelete(item.id)"
        :title="$t('delete')"
        size="small"
        >mdi-delete</v-icon
      >
    </template>
  </v-data-table-server>

  <!-- Confirm delete dialog -->
  <ConfirmDialog
    :model-value="confirmDeleteDialog"
    @update:modelValue="confirmDeleteDialog = $event"
    @confirm="doDelete"
    @cancel="cancelDelete"
    title-key="delete"
    message-key="delete_confirm"
    ok-key="delete"
    cancel-key="cancel"
    :args="{}"
  />

  <!-- 
      snackbar for notifications
    -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ConfirmDialog from './base.confirm.dialog.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * state
 */
const props = defineProps({
  title: { type: String, default: null },
  fields: { type: Array, default: [] },
  sortFields: { type: Array, default: [] },
  projectionFields: { type: Array, default: null },
  filterFields: { type: Array, default: null },

  read: { type: [Boolean, Number], default: null },
  write: { type: [Boolean, Number], default: null },
  details: { type: [Boolean, Number], default: null },
  select: { type: [Boolean], default: null },
  modelValue: { type: Array, default: [] },
  expand: { type: [Boolean], default: null },

  apiFn: { type: Object, default: {} }, // getAll, delete
});

/**
 * table server
 */
const items = ref([]);
const totalItems = ref(0);
const filter = ref('');
const loading = ref(true);
const nodatatext = ref('');

/**
 * delete
 */
const confirmDeleteDialog = ref(false);
const toDeleteID = ref(null);
const lastRequestParams = ref({});

/**
 * snackbar
 */
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * emit
 */
const emit = defineEmits(['addItem', 'editItem', 'deleteItem', 'detailsItem', 'update:modelValue']);

/**
 * model-value selectedItems
 */
const selectedItems = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

/**
 * fields titles
 */

const fieldsTitles = ref({
  name: 'name',
  'user.name': 'name',
  'user.username': 'name',
  status: 'status',
  '_lang_en.status': 'status',
  'user.status': 'status',
  '_lang_en.user.status': 'status',
  email: 'email',
  'user.email': 'email',
  description: 'description',
  credits: 'credits',
  required: 'required',
  address: 'address',
  severity: 'severity',
  'target.name': 'target',
  message: 'message',
  '_lang_end.message': 'message',
  timestamp: 'timestamp',
  createdTimestamp: 'timestamp',
  class: 'class',
  class: 'class.name',
  details: 'details',
});

/**
 * headers
 */
const headers = computed(() => {
  const h = [];

  // details
  if (props.details) {
    h.push({ title: '', key: 'details', value: 'details', sortable: false });
  }

  const sortFildsSet = new Set(props.sortFields);

  for (const field of props.fields) {
    const title = fieldsTitles.value[field];
    if (!title) {
      continue;
    }

    if (sortFildsSet.has(field)) {
      h.push({ title: t(title), key: field });
    } else {
      h.push({ title: t(title), value: field });
    }
  }

  // actions
  if (props.write && (props.apiFn.update || props.apiFn.delete)) {
    h.push({ title: t('actions'), value: 'actions', sortable: false });
  }

  // x-small width
  const xsmallWidthFields = new Set(['status', 'actions', 'details']);
  for (const hitem of h) {
    if (
      xsmallWidthFields.has(fieldsTitles.value[hitem.key]) ||
      xsmallWidthFields.has(fieldsTitles.value[hitem.value])
    ) {
      hitem.width = 50;
    }
  }
  // small width
  const smallWidthFields = new Set(['credits', 'required', 'severity']);
  for (const hitem of h) {
    if (smallWidthFields.has(fieldsTitles.value[hitem.key]) || smallWidthFields.has(fieldsTitles.value[hitem.value])) {
      hitem.width = 100;
    }
  }

  return h;
});

/**
 * color for status
 */
function getStatusColor(status) {
  switch (status) {
    case 'pending':
      return 'none';
    case 'active':
      return 'green';
    case 'disabled':
      return 'grey';
    default:
      return 'grey'; // for any other values
  }
}

/**
 * color for required
 */
function getRequiredColor(status) {
  switch (status) {
    case 'required':
      return 'indigo';
    case 'optional':
    default:
      return 'grey';
  }
}

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
 * get all
 */
async function fetchAll({ page = 1, itemsPerPage = 50, sortBy = [] } = {}) {
  lastRequestParams.value = { page, itemsPerPage, sortBy };

  let timeoutID = setTimeout(() => {
    loading.value = true;
  }, 300); // Show loader if it takes more than 300ms

  try {
    const start = (page - 1) * itemsPerPage;
    let params = {
      skip: start,
      limit: itemsPerPage,
    };

    // projection
    if (props.projectionFields) {
      params.projection = `id,_lang_en,` + props.projectionFields;
    }

    // filtering
    if (filter.value && Array.isArray(props.filterFields)) {
      params['' + props.filterFields] = `/${filter.value}/i`;
    }

    // sorting
    if (sortBy.length) {
      params.sort = '';
      sortBy.forEach((s) => {
        params.sort += `${s.order === 'desc' ? `-${s.key}` : s.key},`;
      });
      params.sort = params.sort.slice(0, -1);
    }

    // call
    const response = await props.apiFn.getAll(new URLSearchParams(params).toString());

    // response
    totalItems.value = response.data?.meta?.count || 0;
    items.value = response.data?.data || [];
    nodatatext.value = '';
  } catch (e) {
    console.error('Error fetching all', e);
    const errText = e.response?.data?.error?.toString() || e.toString();

    nodatatext.value = errText;
    totalItems.value = 0;
    items.value = [];

    snackbarText.value = (t('fetch.error') || 'Error fetching') + ' ' + errText;
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    clearTimeout(timeoutID);
    loading.value = false;
  }
}

/**
 * delete
 */
function confirmDelete(itemID) {
  toDeleteID.value = itemID;
  confirmDeleteDialog.value = true;
}
function cancelDelete() {
  toDeleteID.value = null;
  confirmDeleteDialog.value = false;
}
async function doDelete() {
  if (!toDeleteID.value) {
    return;
  }
  try {
    await del(toDeleteID.value);
  } finally {
    toDeleteID.value = null;
    confirmDeleteDialog.value = false;
  }
}

async function del(itemID) {
  try {
    await props.apiFn.delete(itemID);

    snackbarText.value = t('delete.success') || 'Deleted';
    snackbarColor.value = 'success';
    snackbar.value = true;

    emit('deleteItem', toDeleteID.value);

    await fetchAll(lastRequestParams.value);
  } catch (e) {
    console.error('Error deleting:', e);
    const errText = e.response?.data?.error?.toString() || e.toString();

    snackbarText.value = (t('delete.error') || 'Error deleting') + ' ' + errText;
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

/**
 * open add dialog
 */
function openAdd() {
  if (!props.write) {
    return;
  }

  emit('addItem');
}

/**
 * open edit dialog
 */
function openEdit(item) {
  if (!props.write) {
    return;
  }

  emit('editItem', item);
}

/**
 * select details
 */
function openDetails(itemID) {
  emit('detailsItem', itemID);
}

/**
 * mounted
 */
function mounted() {}

/**
 * refresh
 */
async function refresh() {
  await fetchAll(lastRequestParams.value);
}

/**
 * expose
 */
defineExpose({ refresh });
</script>

<style scoped>
/* component styles */
</style>
