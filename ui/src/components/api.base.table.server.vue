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
    :select-strategy="props.selectStrategy"
    :return-object="props.selectReturnObject"
    class="elevation-1"
    striped="even"
    items-per-page="50"
  >
    <!-- 
          top of the table, title + add + filter 
      -->
    <template v-slot:top>
      <slot name="top">
        <v-toolbar flat>
          <v-card-title class="d-flex justify-space-between">
            <slot name="top.title">
              {{ t(props.title) }}
            </slot>
          </v-card-title>

          <slot name="top.add">
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
          </slot>

          <v-toolbar-title> </v-toolbar-title>

          <slot name="top.filter">
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
          </slot>
        </v-toolbar>
      </slot>
    </template>

    <!-- loading -->
    <template v-slot:loading>
      <slot name="loading">
        <v-skeleton-loader type="table-row@1"></v-skeleton-loader>
      </slot>
    </template>

    <!-- details column (icon) -->
    <template v-slot:item.details="{ item }">
      <slot name="item.details" :item="item">
        <v-btn v-if="props.details" icon small @click.stop="openDetails(item.id)" :title="t('details')">
          <v-icon color="primary" class="mr-2" size="small">mdi-information-outline</v-icon>
          <!-- <v-icon color="primary">mdi-chevron-right</v-icon> -->
        </v-btn>
      </slot>
    </template>

    <!-- name -->
    <template v-slot:item.name="{ item }">
      <slot name="item.name" :item="item"> {{ item.name }} </slot>
    </template>

    <!-- user.name -->
    <template v-slot:item.user.name="{ item }">
      <slot name="item.user.name" :item="item"> {{ item.user.name }} </slot>
    </template>

    <!-- status -->
    <template v-slot:item.status="{ item }">
      <slot name="item.status" :item="item">
        <div class="">
          <v-chip
            :color="ComponentUtils.getStatusColor(item.status)"
            :text="item._lang_en?.status || item.status"
            size="small"
            label
          ></v-chip>
        </div>
      </slot>
    </template>

    <!-- user.status -->
    <template v-slot:item.user.status="{ item }">
      <slot name="item.user.status" :item="item">
        <div class="">
          <v-chip
            :color="ComponentUtils.getStatusColor(item.user?.status)"
            :text="item._lang_en?.user?.status || item.user?.status"
            size="small"
            label
          ></v-chip>
        </div>
      </slot>
    </template>

    <!-- email -->
    <template v-slot:item.email="{ item }">
      <slot name="item.email" :item="item">
        {{ item.email }}
      </slot>
    </template>

    <!-- user.email -->
    <template v-slot:item.user.email="{ item }">
      <slot name="item.user.email" :item="item">
        {{ item.user?.email }}
      </slot>
    </template>

    <!-- severity -->
    <template v-slot:item.severity="{ item }">
      <slot name="item.severity" :item="item">
        <div class="">
          <v-chip
            :color="ComponentUtils.getSeverityColor(item.severity)"
            :text="item._lang_en?.severity || item.severity"
            class="text-uppercase"
            size="small"
            label
          ></v-chip>
        </div>
      </slot>
    </template>

    <!-- credits -->
    <template v-slot:item.credits="{ item }">
      <slot name="item.credits" :item="item">
        <div class="">{{ item.credits }}</div>
      </slot>
    </template>

    <!-- required -->
    <template v-slot:item.required="{ item }">
      <slot name="item.required" :item="item">
        <div class="">
          <v-chip
            :color="ComponentUtils.getRequiredColor(item.required)"
            :text="item._lang_en?.required || item.required"
            size="small"
            label
          ></v-chip>
        </div>
      </slot>
    </template>

    <!-- message -->
    <template v-slot:item.message="{ item }">
      <slot name="item.message" :item="item">
        <div class="">
          {{ item._lang_en?.message || item.message }}
        </div>
      </slot>
    </template>

    <!-- address -->
    <template v-slot:item.address="{ item }">
      <slot name="item.address" :item="item">
        <div class="">
          {{ item.address }}
        </div>
      </slot>
    </template>

    <!-- createdTimestamp -->
    <template v-slot:item.createdTimestamp="{ item }">
      <slot name="item.createdTimestamp" :item="item">
        <div class="">{{ item.createdTimestamp }}</div>
      </slot>
    </template>

    <!-- timestamp-->
    <template v-slot:item.timestamp="{ item }">
      <slot name="item.timestamp" :item="item">
        <div class="">{{ item.timestamp }}</div>
      </slot>
    </template>

    <!-- description -->
    <template v-slot:item.description="{ item }">
      <slot name="item.description" :item="item">
        <div class="">{{ item.description }}</div>
      </slot>
    </template>

    <!-- class.name -->
    <template v-slot:item.class.name="{ item }">
      <slot name="item.class.name" :item="item">
        <div class="">{{ item.class?.name }}</div>
      </slot>
    </template>

    <!-- frequency -->
    <template v-slot:item.frequency="{ item }">
      <slot name="item.frequency" :item="item">
        <div class="">{{ item._lang_en?.frequency || item.frequency }}</div>
      </slot>
    </template>

    <!-- location.name -->
    <template v-slot:item.location.name="{ item }">
      <slot name="item.location.name" :item="item">
        <div class="">{{ item.location?.name }}</div>
      </slot>
    </template>

    <!-- location.address -->
    <template v-slot:item.location.address="{ item }">
      <slot name="item.location.address" :item="item">
        <div class="">{{ item.location?.address }}</div>
      </slot>
    </template>

    <!-- expand -->
    <template v-slot:item.data-table-expand="{ internalItem, isExpanded, toggleExpand }">
      <slot
        name="item.data-table-expand"
        :internalItem="internalItem"
        :isExpanded="isExpanded"
        :toggleExpand="toggleExpand"
      >
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
      </slot>
    </template>

    <template v-slot:expanded-row="{ columns, item }">
      <slot name="expanded-row" :item="item" :columns="columns">
        <tr>
          <td :colspan="columns.length" class="py-2">
            <v-sheet rounded="lg" border>
              <!-- Default content if no slot is provided -->
            </v-sheet>
          </td>
        </tr>
      </slot>
    </template>

    <!-- actions -->
    <template #item.actions="{ item }">
      <slot name="item.actions" :item="item">
        <v-icon
          v-if="props.write && props.apiFn?.update"
          small
          class="mr-2"
          @click="openEdit(item)"
          :title="t('edit')"
          size="small"
          >mdi-pencil</v-icon
        >
        <v-icon
          v-if="props.write && props.apiFn?.delete"
          small
          color="mr-2"
          @click="confirmDelete(item.id)"
          :title="t('delete')"
          size="small"
          >mdi-delete</v-icon
        >
      </slot>
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
import ComponentUtils from './components.utils.js';
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
  selectStrategy: { type: [String], default: 'page' }, // single, page, all
  selectReturnObject: { type: [Boolean], default: false }, // default is to return ids since not all objects can be retreived on edit

  apiFn: { type: Object, default: {} }, // getAll, getAllParams, delete
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
 * headers
 */
const headers = computed(() => {
  const options = {
    actions: props.write && (props.apiFn.update || props.apiFn.delete),
    details: props.details,
  };
  return ComponentUtils.getHeaders(props.fields, props.sortFields, options, t);
});

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
    // additional params
    if (props.apiFn.getAllParams) {
      Object.assign(params, props.apiFn.getAllParams);
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

    snackbarText.value = (t('fetch.error') || 'Error fetching') + ' - ' + errText;
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

    snackbarText.value = (t('delete.error') || 'Error deleting') + ' - ' + errText;
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
