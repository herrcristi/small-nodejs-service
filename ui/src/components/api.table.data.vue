<template>
  <v-card v-if="props.read || props.write">
    <!-- 
          table
    -->
    <v-data-table
      :headers="headers"
      :items="items"
      :items-length="totalItems"
      :loading="loading"
      :search="filter"
      :custom-filter="customFilter"
      :no-data-text="nodatatext"
      item-key="id"
      class="elevation-1"
      striped="even"
      density="compact"
      hide-default-header
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
            small
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
            dense
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
    </v-data-table>

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
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ConfirmDialog from './confirm.dialog.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * state
 */
const props = defineProps({
  title: { type: [String], default: null },
  items: { type: Array, default: [] },
  fields: { type: Array, default: [] },
  sortFields: { type: Array, default: [] },
  filterFields: { type: Array, default: null },

  read: { type: [Boolean, Number], default: null },
  write: { type: [Boolean, Number], default: null },
  details: { type: [Boolean, Number], default: null },

  apiFn: { type: Object, default: {} }, // create:0/1, edit:0/1, delete: fn
});

/**
 * table data
 */
const totalItems = ref(0);
const filter = ref('');
const loading = ref(true);
const nodatatext = ref('');

/**
 * delete
 */
const confirmDeleteDialog = ref(false);
const toDeleteID = ref(null);

/**
 * snackbar
 */
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * emit
 */
const emit = defineEmits(['addItem', 'editItem', 'deleteItem', 'detailsItem']);

/**
 * monitor items
 */
watch(
  () => props.items,
  (value) => {
    if (value) {
      totalItems.value = value.length;
    }
  },
  { immediate: true }
);

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
 * custom filter
 */
function customFilter(value, query, item) {
  let q = query?.toLocaleUpperCase();
  if (q == null) {
    return false;
  }

  for (const field of filterFields.value) {
    let value = item?.raw?.[field]?.toString().toLocaleUpperCase();
    if (value.indexOf(q) !== -1) {
      return true;
    }
  }
  return false;
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

    // this should be already done in caller, but to it here again
    props.items = props.items.filter((item) => item.id !== itemID);
  } catch (e) {
    console.error('Error deleting:', e);

    snackbarText.value = (t('delete.error') || 'Error deleting') + ' ' + e.toString();
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
 * mounted
 */
function mounted() {}
</script>

<style scoped></style>
