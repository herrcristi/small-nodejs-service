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
            <!-- <v-toolbar-title> -->
            {{ $t('students') }}
            <!-- </v-toolbar-title> -->
          </v-card-title>

          <v-btn
            class="me-2 left"
            color="primary"
            prepend-icon="mdi-plus"
            rounded="lg"
            text=""
            border
            @click="openAdd"
            v-if="write"
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

      <!-- 
        status 
        -->
      <template v-slot:item.status="{ item }">
        <div class="">
          <v-chip
            :color="getStatusColor(item.status)"
            :text="item._lang_en?.status || item.status"
            size="small"
            label
          ></v-chip>
        </div>
      </template>

      <!-- 
          actions
      -->
      <template #item.actions="{ item }" v-if="write">
        <v-icon small class="mr-2" @click="openEdit(item)" :title="$t('students.edit')" size="small">mdi-pencil</v-icon>
        <v-icon small color="mr-2" @click="confirmDelete(item.id)" :title="$t('delete')" size="small"
          >mdi-delete</v-icon
        >
      </template>
    </v-data-table-server>

    <!-- 
          dialog
    -->
    <v-dialog v-model="dialog" max-width="800px" v-if="write">
      <v-card>
        <v-card-title>{{ editing ? $t('students.edit') : $t('students.add') }}</v-card-title>

        <v-card-text>
          <v-form ref="editForm" v-model="formValid">
            <v-text-field v-model="itemData.name" :label="$t('name')" :rules="[nameRule]" required />

            <v-select
              v-model="itemData.status"
              :items="statusItems"
              item-title="title"
              item-value="value"
              :label="$t('status')"
              :rules="[statusRule]"
              required
            />

            <v-text-field v-model="itemData.email" :label="$t('email')" :rules="[emailRule]" required />
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

const app = useAppStore();
const read = app?.rolesPermissions?.students?.read || 0;
const write = app?.rolesPermissions?.students?.write || 0;
const { t } = useI18n();

/**
 * headers
 */
const headers = computed(() => {
  const h = [
    { title: t('name'), key: 'user.name' },
    { title: t('status'), key: '_lang_en.user.status' },
    { title: t('email'), value: 'user.email' },
  ];
  if (write) {
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
      projection: 'id,user.name,user.email,user.status,_lang_en',
      sort: 'user.name',
    };

    if (filter.value) {
      params = {
        ...params,
        'user.name,user.email,_lang_en.user.status': `/${filter.value}/i`,
      };
    }

    if (sortBy.length) {
      params.sort = '';
      sortBy.forEach((s) => {
        params.sort += `${s.order === 'desc' ? `-${s.key}` : s.key},`;
      });
      params.sort = params.sort.slice(0, -1);
    }

    const response = await Api.getStudents(new URLSearchParams(params).toString());
    totalItems.value = response.data?.meta?.count || 0;
    items.value = response.data?.data || [];
    nodatatext.value = '';
  } catch (e) {
    console.error('Error fetching all students:', e);

    nodatatext.value = e.toString();
    totalItems.value = 0;
    items.value = [];

    snackbarText.value = t('students.fetch.error') || 'Error fetching students';
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
    // TODO invite user
    const payload = { ...itemData };
    throw 'TODO add invite';
    await Api.createStudent(payload);

    snackbarText.value = t('students.add.success') || 'Student added';
    snackbarColor.value = 'success';
    snackbar.value = true;

    return true;
  } catch (e) {
    console.error('Error adding student:', e);
    snackbarText.value = e?.response?.data?.message || t('students.add.error') || 'Error adding student';
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
    // TODO
    throw 'TODO update user';
    await Api.updateStudent(editingItemID.value, itemData);

    snackbarText.value = t('students.update.success') || 'Student updated';
    snackbarColor.value = 'success';
    snackbar.value = true;

    return true;
  } catch (e) {
    console.error('Error updating student:', e);

    snackbarText.value = e?.response?.data?.message || t('students.update.error') || 'Error updating student';
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
    await Api.deleteStudent(itemID);

    snackbarText.value = t('students.delete.success') || 'Student deleted';
    snackbarColor.value = 'success';
    snackbar.value = true;

    await fetchAll(lastRequestParams.value);
  } catch (e) {
    console.error('Error deleting student:', e);

    snackbarText.value = e?.response?.data?.message || t('students.delete.error') || 'Error deleting student';
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

/**
 * open add dialog
 */
function openAdd() {
  if (!write) {
    return;
  }

  resetForm();
  itemData.status = 'active'; // default status for new

  editing.value = false;
  dialog.value = true;
}

/**
 * open edit dialog
 */
function openEdit(item) {
  if (!write) {
    return;
  }

  Object.keys(itemData).forEach((k) => delete itemData[k]);
  itemData.name = item.user.name;
  itemData.email = item.user.email;
  itemData.status = item.status || 'active'; // keep existing status when editing

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
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
