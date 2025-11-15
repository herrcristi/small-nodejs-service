<template>
  <v-card v-if="read || write">
    <!-- 
          table
    -->
    <ApiTableServer
      ref="tableServer"
      title="classes"
      :fields="apiFields.fields"
      :projectionFields="apiFields.projectionFields"
      :sortFields="apiFields.sortFields"
      :filterFields="apiFields.filterFields"
      :apiFn="apiFn"
      :read="read"
      :write="write"
      :details="details"
      :expand="expand"
      @addItem="openAdd($event)"
      @editItem="openEdit($event)"
      @detailsItem="openDetails($event)"
    >
    </ApiTableServer>

    <!-- 
          edit dialog
    -->
    <v-card v-if="write">
      <v-dialog v-model="dialog" max-width="800px" v-if="write">
        <v-card>
          <v-card-title>
            {{ editing ? t('edit') : t('add') }}
          </v-card-title>

          <v-card-text>
            <v-form ref="editForm" v-model="formValid">
              <slot name="edit.name" :itemData="itemData" :fieldsSet="fieldsSet">
                <v-text-field
                  v-if="fieldsSet.has('name')"
                  v-model="itemData.name"
                  :label="t('name')"
                  :rules="[nameRule]"
                  required
                />
              </slot>

              <slot name="edit.status" :itemData="itemData" :fieldsSet="fieldsSet">
                <v-select
                  v-if="fieldsSet.has('status')"
                  v-model="itemData.status"
                  :items="statusItems"
                  item-title="title"
                  item-value="value"
                  :label="t('status')"
                  :rules="[statusRule]"
                  required
                />
              </slot>

              <slot name="edit.description" :itemData="itemData" :fieldsSet="fieldsSet">
                <v-text-field
                  v-if="fieldsSet.has('description')"
                  v-model="itemData.description"
                  :label="t('description')"
                  required
                />
              </slot>

              <slot name="edit.credits" :itemData="itemData" :fieldsSet="fieldsSet">
                <v-text-field
                  v-if="fieldsSet.has('credits')"
                  v-model.number="itemData.credits"
                  type="number"
                  :label="t('credits')"
                  :rules="[creditsRule]"
                  min="1"
                  required
                />
              </slot>

              <slot name="edit.required" :itemData="itemData" :fieldsSet="fieldsSet">
                <v-select
                  v-if="fieldsSet.has('required')"
                  v-model="itemData.required"
                  :items="requiredItems"
                  item-title="title"
                  item-value="value"
                  :label="t('required')"
                  :rules="[requiredRule]"
                  required
                />
              </slot>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn text @click="closeDialog">{{ t('cancel') }}</v-btn>
            <v-btn color="primary" :disabled="!formValid" @click="handleSubmit">{{ t('save') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- 
        snackbar for notifications
      -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
    </v-card>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import ApiTableServer from './api.base.table.server.vue';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
import ComponentsUtils from './components.utils.js';
const { t } = useI18n();

/**
 * props
 */
const tableServer = ref();
const details = null; // true for details column
const expand = null; // true for expand column

// const editDialog = ref();

const app = useAppStore();
const read = app?.rolesPermissions?.classes?.read || 0;
const write = app?.rolesPermissions?.classes?.write || 0;

/**
 * fields
 */
const apiFields = {
  fields: ['name', 'status', 'description', 'credits', 'required'],
  projectionFields: ['name', 'status', 'description', 'credits', 'required'],
  sortFields: ['name', 'status'],
  filterFields: ['name', '_lang_en.status', 'description', '_lang_en.credits', '_lang_en.required'],
  addFields: ['name', 'status', 'description', 'credits', 'required'],
  editFields: ['name', 'status', 'description', 'credits', 'required'],
};

const fieldsSet = ref(new Set([]));

const apiFn = {
  getAll: Api.getClasses,
  create: Api.createClass,
  update: Api.updateClass,
  delete: Api.deleteClass,
};

/**
 * edit
 */
const itemData = reactive({});
const editing = ref(false);
const editingItemID = ref(null);
const dialog = ref(false);
const editForm = ref(null);
const formValid = ref(false);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

const statusItems = computed(() =>
  ComponentsUtils.Edit.statusItems(t, {
    skipPending: editing.value,
  })
);

/**
 * required items for the select
 */
const requiredItems = computed(() => ComponentsUtils.Edit.requiredItems(t));

/**
 * rules
 */
const nameRule = (v) => ComponentsUtils.Edit.Rules.name(v, t);
const statusRule = (v) => ComponentsUtils.Edit.Rules.status(v, t);
const creditsRule = (v) => ComponentsUtils.Edit.Rules.credits(v, t);
const requiredRule = (v) => ComponentsUtils.Edit.Rules.required(v, t);

/**
 * ApiTableServer event open details
 */
function openDetails(itemID) {
  // noop
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
  ComponentsUtils.Edit.trimFields(itemData, ['name', 'description']);

  // payload
  const payload = { ...itemData };
  const snackbarO = { ref: snackbar, text: snackbarText, color: snackbarColor };

  // add/update
  let ok = false;
  if (editing.value) {
    ok = await ComponentsUtils.Edit.update(apiFn, editingItemID.value, payload, snackbarO, t);
  } else {
    ok = await ComponentsUtils.Edit.add(apiFn, payload, snackbarO, t);
  }

  if (ok) {
    dialog.value = false;
    resetForm();

    // refresh
    await tableServer.value.refresh();
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
  fieldsSet.value = new Set(apiFields.addFields);

  // defaults for new
  if (fieldsSet.value.has('status')) {
    itemData.status = 'active';
  }
  if (fieldsSet.value.has('credits')) {
    itemData.credits = 0;
  }
  if (fieldsSet.value.has('required')) {
    itemData.required = 'required';
  }

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

  resetForm();
  fieldsSet.value = new Set(apiFields.editFields);

  // set
  if (fieldsSet.value.has('name')) {
    itemData.name = item.name || '';
  }
  if (fieldsSet.value.has('status')) {
    itemData.status = item.status || 'active';
  }
  if (fieldsSet.value.has('description')) {
    itemData.description = item.description || '';
  }
  if (fieldsSet.value.has('credits')) {
    itemData.credits = Number(item.credits || 0);
  }
  if (fieldsSet.value.has('required')) {
    itemData.required = item.required || 'required';
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
  fieldsSet.value = new Set([]);

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
