<template>
  <v-card v-if="props.read || props.write">
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

      <!-- details column (icon) -->
      <template v-slot:item.details="{ item }" v-if="props.details">
        <v-btn icon small @click.stop="selectDetails(item.id)" :title="$t('details')">
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

    <!-- 
          dialog
    -->
    <v-dialog v-model="dialog" max-width="800px" v-if="props.write && (props.apiFn?.create || props.apiFn?.update)">
      <v-card>
        <v-card-title>{{ editing ? $t('edit') : $t('add') }}</v-card-title>

        <v-card-text>
          <v-form ref="editForm" v-model="formValid">
            <v-text-field
              v-if="fieldsSet.has('name') || fieldsSet.has('user.name')"
              v-model="itemData.name"
              :label="$t('name')"
              :rules="[nameRule]"
              required
            />

            <v-select
              v-if="fieldsSet.has('status') || fieldsSet.has('user.status')"
              v-model="itemData.status"
              :items="statusItems"
              item-title="title"
              item-value="value"
              :label="$t('status')"
              :rules="[statusRule]"
              required
            />

            <v-text-field
              v-if="fieldsSet.has('email') || fieldsSet.has('user.email')"
              v-model="itemData.email"
              :label="$t('email')"
              :rules="[emailRule]"
              required
            />

            <v-text-field
              v-if="fieldsSet.has('description')"
              v-model="itemData.description"
              :label="$t('description')"
              required
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">{{ $t('cancel') }}</v-btn>
          <v-btn color="primary" :disabled="!formValid" @click="handleSubmit">{{ $t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { ref, reactive, computed } from 'vue';
import ConfirmDialog from './confirm.dialog.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * state
 */
const props = defineProps({
  title: { type: [String], default: null },
  fields: { type: Array, default: [] },
  read: { type: [Boolean, Number], default: null },
  write: { type: [Boolean, Number], default: null },
  details: { type: [Boolean, Number], default: null },
  apiFn: { type: Object, default: {} }, // getall, add, delete, update
});

const fieldsSet = ref(new Set(props.fields));
const items = ref([]);
const totalItems = ref(0);
const filter = ref('');
const loading = ref(true);
const nodatatext = ref('');

const itemData = reactive({});
const editing = ref(false);
const editingItemID = ref(null);
const dialog = ref(false);
const editForm = ref(null);
const formValid = ref(false);
const confirmDeleteDialog = ref(false);
const toDeleteID = ref(null);
const lastRequestParams = ref({});

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * emit
 */
const emit = defineEmits(['selectDetails']);

/**
 * fields titles
 */
const fieldsTitles = ref({
  name: 'name',
  'user.name': 'name',
  status: 'status',
  '_lang_en.status': 'status',
  'user.status': 'status',
  '_lang_en.user.status': 'status',
  email: 'email',
  'user.email': 'email',
  description: 'description',
});

/**
 * headers
 */
const headers = computed(() => {
  const h = [];
  // description -> value

  // details
  if (props.details) {
    h.push({ title: '', key: 'details', value: 'details', sortable: false });
  }

  for (const field of props.fields) {
    const title = fieldsTitles.value[field];
    if (title) {
      if (title == 'description') {
        h.push({ title: t(title), value: field });
      } else {
        h.push({ title: t(title), key: field });
      }
    }
  }

  if (props.write && (props.apiFn.update || props.apiFn.delete)) {
    h.push({ title: t('actions'), value: 'actions', sortable: false });
  }
  return h;
});

/**
 * status items for the select
 */
const statusItems = computed(() => {
  // base items
  // when adding add pending too
  let items = [];

  if (!editing.value) {
    items.push({ title: t('pending'), value: 'pending' });
  }

  items = [
    ...items,
    { title: t('active'), value: 'active' },
    { title: t('disabled'), value: 'disabled', disabled: false },
  ];

  return items;
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
 * rules
 */
const nameRule = (v) => (!!v && v.toString().trim().length > 0) || t('name.required');
const statusRule = (v) => !!v || t('required');
const emailRule = (v) => (!!v && v.toString().trim().length > 0) || t('email.required');

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
      projection: `id,` + props.fields + `,_lang_en`,
      sort: props.fields[0],
    };

    if (filter.value) {
      params = {
        ...params,
        ['' + props.fields]: `/${filter.value}/i`, // TODO some fields should be search in language fields, like status, ....
        // TODO filter out 'details'
      };
    }

    if (sortBy.length) {
      params.sort = '';
      sortBy.forEach((s) => {
        params.sort += `${s.order === 'desc' ? `-${s.key}` : s.key},`;
      });
      params.sort = params.sort.slice(0, -1);
    }

    const response = await props.apiFn.getAll(new URLSearchParams(params).toString());
    totalItems.value = response.data?.meta?.count || 0;
    items.value = response.data?.data || [];
    nodatatext.value = '';
  } catch (e) {
    console.error('Error fetching all', e);

    nodatatext.value = e.toString();
    totalItems.value = 0;
    items.value = [];

    snackbarText.value = t('fetch.error') || 'Error fetching';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    clearTimeout(timeoutID);
    loading.value = false;
  }
}

/**
 * handle submit
 */
async function handleSubmit() {
  if (editForm.value && typeof editForm.value.validate === 'function') {
    const ok = await editForm.value.validate();
    if (!ok) {
      return;
    }
  }

  // trim
  if (itemData.name) {
    itemData.name = itemData.name.toString().trim();
  }
  if (itemData.email) {
    itemData.email = itemData.email.toString().trim();
  }
  if (itemData.description) {
    itemData.description = itemData.description.toString().trim();
  }

  let ok = false;
  if (editing.value) {
    ok = await update();
  } else {
    ok = await add();
  }

  if (ok) {
    closeDialog();
    await fetchAll(lastRequestParams.value);
  }
}

/**
 * add
 */
async function add() {
  try {
    const payload = { ...itemData };
    await props.apiFn.create(payload);

    snackbarText.value = t('add.success') || 'Added';
    snackbarColor.value = 'success';
    snackbar.value = true;

    return true;
  } catch (e) {
    console.error('Error adding:', e);
    snackbarText.value = e?.response?.data?.message || t('add.error') || 'Error adding';
    snackbarColor.value = 'error';
    snackbar.value = true;
    return false;
  }
}

/**
 * update
 */
async function update() {
  try {
    await props.apiFn.update(editingItemID.value, itemData);

    snackbarText.value = t('update.success') || 'Updated';
    snackbarColor.value = 'success';
    snackbar.value = true;

    return true;
  } catch (e) {
    console.error('Error updating:', e);

    snackbarText.value = e?.response?.data?.message || t('update.error') || 'Error updating';
    snackbarColor.value = 'error';
    snackbar.value = true;

    return false;
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

    await fetchAll(lastRequestParams.value);
  } catch (e) {
    console.error('Error deleting:', e);

    snackbarText.value = e?.response?.data?.message || t('delete.error') || 'Error deleting';
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

  resetForm();
  if (fieldsSet.value.has('status')) {
    itemData.status = 'active'; // default status for new
  }
  if (fieldsSet.value.has('user.status')) {
    itemData.status = 'pending'; // default status for new
  }

  editing.value = false;
  dialog.value = true;
}

/**
 * open edit dialog
 */
function openEdit(item) {
  if (!props.write) {
    return;
  }

  Object.keys(itemData).forEach((k) => delete itemData[k]);
  if (item.name || item.user?.name) {
    itemData.name = item.name || item.user?.name;
  }
  if (item.email || item.user?.email) {
    itemData.email = item.email || item.user?.email;
  }
  if (item.status || item.user?.status) {
    itemData.status = item.status || item.user?.status || 'active';
  }
  if (item.description) {
    itemData.description = item.description;
  }

  editing.value = true;
  editingItemID.value = item.id;
  dialog.value = true;
}

/**
 * close dialog
 */
function closeDialog() {
  dialog.value = false;
  resetForm();
}

/**
 * reset form
 */
function resetForm() {
  Object.keys(itemData).forEach((k) => delete itemData[k]);

  editing.value = false;
  editingItemID.value = null;
}

/**
 * select details
 */
function selectDetails(groupID) {
  emit('selectDetails', groupID);
}

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
