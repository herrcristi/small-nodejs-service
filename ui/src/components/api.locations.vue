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
            {{ $t('locations') }}
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
        <v-icon small class="mr-2" @click="openEdit(item)" :title="$t('locations.edit')" size="small"
          >mdi-pencil</v-icon
        >
        <v-icon small color="mr-2" @click="del(item.id)" :title="$t('delete')" size="small">mdi-delete</v-icon>
      </template>
    </v-data-table-server>

    <!-- 
          dialog
    -->
    <v-dialog v-model="dialog" max-width="800px" v-if="write">
      <v-card>
        <v-card-title>{{ editing ? $t('locations.edit') : $t('locations.add') }}</v-card-title>

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

            <v-text-field v-model="itemData.address" :label="$t('address')" :rules="[addressRule]" required />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">{{ $t('cancel') }}</v-btn>
          <v-btn color="primary" :disabled="!formValid" @click="handleSubmit">{{ $t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

const itemData = reactive({});
const editing = ref(false);
const editingItemID = ref(null);
const dialog = ref(false);
const editForm = ref(null);
const formValid = ref(false);
const lastRequestParams = ref({});

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

const app = useAppStore();
const read = app?.rolesPermissions?.locations?.read || 0;
const write = app?.rolesPermissions?.locations?.write || 0;
const { t } = useI18n();

/**
 * headers
 */
const headers = computed(() => {
  const h = [
    { title: t('name'), key: 'name' },
    { title: t('status'), key: 'status' },
    { title: t('address'), value: 'address' },
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
 * color for severity
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
const addressRule = (v) => (!!v && v.toString().trim().length > 0) || t('required');

/**
 * fetchAll
 */
async function fetchAll({ page = 1, itemsPerPage = 50, sortBy = [] } = {}) {
  lastRequestParams.value = { page, itemsPerPage, sortBy };

  let timeoutID = setTimeout(() => {
    this.loading = true;
  }, 300); // Show loader if it takes more than 300ms

  try {
    const start = (page - 1) * itemsPerPage;
    let params = {
      skip: start,
      limit: itemsPerPage,
      projection: 'id,name,status,address,_lang_en',
      sort: 'name',
    };

    if (filter.value) {
      params = {
        ...params,
        'name,_lang_en.status,address': `/${filter.value}/i`,
      };
    }

    if (sortBy.length) {
      params.sort = '';
      sortBy.forEach((s) => {
        params.sort += `${s.order === 'desc' ? `-${s.key}` : s.key},`;
      });
      params.sort = params.sort.slice(0, -1);
    }

    const response = await Api.getLocations(new URLSearchParams(params).toString());
    totalItems.value = response.data?.meta?.count || 0;
    items.value = response.data?.data || [];
    nodatatext.value = '';
  } catch (e) {
    console.error('Error fetching all locations:', e);
    nodatatext.value = e.toString();
    totalItems.value = 0;
    items.value = [];

    snackbarText.value = t('locations.fetch.error') || 'Error fetching locations';
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
  // validate form
  if (editForm.value && typeof editForm.value.validate === 'function') {
    const ok = await editForm.value.validate();
    if (!ok) {
      return;
    }
  }

  if (itemData.name) {
    itemData.name = itemData.name.toString().trim();
  }
  if (itemData.address) {
    itemData.address = itemData.address.toString().trim();
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
    // ensure status is set (default to active)
    const payload = { ...itemData, status: itemData.status || 'active' };
    await Api.createLocation(payload);

    snackbarText.value = t('locations.add.success') || 'Location added';
    snackbarColor.value = 'success';
    snackbar.value = true;

    return true;
  } catch (e) {
    console.error('Error adding location:', e);

    snackbarText.value = e?.response?.data?.message || t('locations.add.error') || 'Error adding location';
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
    await Api.updateLocation(editingItemID.value, { ...itemData });

    snackbarText.value = t('locations.update.success') || 'Location updated';
    snackbarColor.value = 'success';
    snackbar.value = true;

    return true;
  } catch (e) {
    console.error('Error updating location:', e);

    snackbarText.value = e?.response?.data?.message || t('locations.update.error') || 'Error updating location';
    snackbarColor.value = 'error';
    snackbar.value = true;

    return false;
  }
}

/**
 * delete
 */
async function del(itemID) {
  try {
    await Api.deleteLocation(itemID);

    snackbarText.value = t('locations.delete.success') || 'Location deleted';
    snackbarColor.value = 'success';
    snackbar.value = true;

    await fetchAll(lastRequestParams.value);
  } catch (e) {
    console.error('Error deleting location:', e);

    snackbarText.value = e?.response?.data?.message || t('locations.delete.error') || 'Error deleting location';
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
  itemData.name = item.name;
  itemData.address = item.address;
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

// expose to template
</script>

<style scoped>
/* component styles */
</style>
