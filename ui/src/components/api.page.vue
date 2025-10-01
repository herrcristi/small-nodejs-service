<template>
  <v-card v-if="props.read || props.write">
    <!-- 
          table
    -->
    <ApiTableServer
      :title="props.title"
      :fields="props.fields"
      :sortFields="props.sortFields"
      :projectionFields="props.projectionFields"
      :filterFields="props.filterFields"
      :apiFn="props.apiFn"
      :read="read"
      :write="write"
      :details="props.details"
      @addItem="openAdd($event)"
      @editItem="openEdit($event)"
      @detailsItem="openDetails($event)"
    ></ApiTableServer>

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
import ApiTableServer from './api.table.server.vue';
import ConfirmDialog from './confirm.dialog.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * state
 */
const props = defineProps({
  title: { type: [String], default: null },
  fields: { type: Array, default: [] },
  sortFields: { type: Array, default: [] },
  projectionFields: { type: Array, default: null },
  filterFields: { type: Array, default: null },

  read: { type: [Boolean, Number], default: null },
  write: { type: [Boolean, Number], default: null },
  details: { type: [Boolean, Number], default: null },
  apiFn: { type: Object, default: {} }, // getall, add, delete, update
});

const fieldsSet = ref(new Set(props.fields));

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
const emit = defineEmits(['openDetails']);

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
 * rules
 */
const nameRule = (v) => (!!v && v.toString().trim().length > 0) || t('name.required');
const statusRule = (v) => !!v || t('required');
const emailRule = (v) => (!!v && v.toString().trim().length > 0) || t('email.required');

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
function openDetails(groupID) {
  emit('openDetails', groupID);
}

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
