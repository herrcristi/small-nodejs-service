<template>
  <v-card v-if="read || write">
    <!-- 
          table
    -->
    <ApiTableServer
      ref="tableServer"
      title="professors"
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
      <!-- 
        more info
      -->
      <template v-slot:item.data-table-expand="{ internalItem, isExpanded, toggleExpand }">
        <!-- if admin or current user hide this to default to base class implementation -->
        <div v-if="!(write || currentUserID == internalItem.key) && internalItem.status != 'pending'"></div>
      </template>

      <template v-slot:expanded-row="{ item, columns }">
        <!-- <tr v-if="item.user?.status != 'pending'"> -->
        <td :colspan="columns.length" class="py-2">
          <v-sheet rounded="lg" border>
            <ApiProfessorMoreInfo :itemID="item.id" type="v-table" />
          </v-sheet>
        </td>
        <!-- </tr> -->
      </template>
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
import { useAppStore, useAuthStore } from '../stores/stores.js';
import ApiTableServer from './api.base.table.server.vue';
import ApiProfessorMoreInfo from './api.professor.moreinfo.vue';
import { useI18n } from 'vue-i18n';
import ComponentsUtils from './components.utils.js';
const { t } = useI18n();

/**
 * props
 */
const tableServer = ref();
const details = null; // true for details column
const expand = null; // true for expand column

const auth = useAuthStore();
const currentUserID = auth?.raw?.id;

const app = useAppStore();
const read = app?.rolesPermissions?.professors?.read;
const write = app?.rolesPermissions?.professors?.write;

/**
 * fields
 */
const apiFields = {
  fields: ['user.name', 'user.status', 'user.email'],
  projectionFields: ['user.name', 'user.status', 'user.email'],
  sortFields: ['user.name', 'user.status', 'user.email'],
  filterFields: ['user.name', '_lang_en.user.status', 'user.email'],
  addFields: ['user.email'],
  editFields: ['user.name', 'user.status'],
};

const fieldsSet = ref(new Set([]));

const apiFn = {
  getAll: Api.getProfessors,
  create: Api.createProfessor,
  update: Api.updateProfessor,
  delete: Api.deleteProfessor,
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
 * rules
 */
const nameRule = (v) => ComponentsUtils.Edit.Rules.name(v, t);
const statusRule = (v) => ComponentsUtils.Edit.Rules.status(v, t);
const creditsRule = (v) => ComponentsUtils.Edit.Rules.credits(v, t);
const requiredRule = (v) => ComponentsUtils.Edit.Rules.required(v, t);

/**
 * ApiTableServer event open details
 */
function openDetails(item) {
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
  ComponentsUtils.Edit.trimFields(itemData, ['name', 'email']);

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
