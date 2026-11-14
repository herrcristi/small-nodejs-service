<template>
  <v-card v-if="read || write">
    <!-- 
          table
    -->
    <ApiTableServer
      ref="tableServer"
      title="schools"
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
      <template #item.actions="{ item }">
        <v-btn
          v-if="item.status === 'active'"
          icon
          size="small"
          variant="text"
          :title="t('schools.invite_admin')"
          @click.stop="openInvite(item)"
        >
          <v-icon>mdi-account-plus</v-icon>
        </v-btn>
        <v-btn icon size="small" variant="text" :title="t('edit')" @click.stop="openEdit(item)">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
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

              <slot name="edit.email" :itemData="itemData" :fieldsSet="fieldsSet">
                <v-text-field
                  v-if="fieldsSet.has('email')"
                  v-model="itemData.email"
                  :label="t('email')"
                  :rules="[emailReqRule, emailValidRule]"
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
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn text @click="closeDialog">{{ t('cancel') }}</v-btn>
            <v-btn color="primary" :disabled="!formValid" @click="handleSubmit">{{ t('save') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="inviteDialog" max-width="480px">
        <v-card>
          <v-card-title>{{ t('schools.invite_admin') }}</v-card-title>
          <v-card-text>
            <v-form ref="inviteForm" v-model="inviteFormValid">
              <v-text-field
                v-model="inviteEmail"
                :label="t('email')"
                :rules="[emailReqRule, emailValidRule]"
                required
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="inviteDialog = false">{{ t('cancel') }}</v-btn>
            <v-btn color="primary" :disabled="!inviteFormValid" @click="handleInvite">{{ t('invite') }}</v-btn>
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
import { useAppStore } from '../stores/stores.js';
import ApiTableServer from './api.base.table.server.vue';
import { useI18n } from 'vue-i18n';
import ComponentsUtils from './components.utils.js';
const { t } = useI18n();

/**
 * props
 */
const tableServer = ref();
const details = null; // true for details column
const expand = null; // true for expand column

const app = useAppStore();
const read = app?.rolesPermissions?.schools?.read;
const write = app?.rolesPermissions?.schools?.write;

/**
 * fields
 */
const apiFields = {
  fields: ['name', 'status', 'description'],
  projectionFields: ['name', 'status', 'description'],
  sortFields: ['name', 'status'],
  filterFields: ['name', '_lang_en.status', 'description'],
  addFields: ['name', 'email', 'description'],
  editFields: ['name', 'status', 'description'],
};

const fieldsSet = ref(new Set([]));

const apiFn = {
  getAll: Api.getSchools,
  create: (data) =>
    Api.signup({
      email: data.email,
      school: { name: data.name, description: data.description },
    }),
  update: Api.updateSchool,
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
const inviteDialog = ref(false);
const inviteForm = ref(null);
const inviteFormValid = ref(false);
const inviteEmail = ref('');
const inviteSchoolID = ref(null);

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
const emailReqRule = (v) => ComponentsUtils.Edit.Rules.emailReq(v, t);
const emailValidRule = (v) => ComponentsUtils.Edit.Rules.emailValid(v, t);

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

  editing.value = true;
  editingItemID.value = item.id;
  dialog.value = true;
}

/**
 * open invite dialog
 */
function openInvite(item) {
  inviteSchoolID.value = item.id;
  inviteEmail.value = '';
  inviteFormValid.value = false;
  inviteDialog.value = true;
}

/**
 * handle invite for school admin
 */
async function handleInvite() {
  if (inviteForm.value && typeof inviteForm.value.validate === 'function') {
    const result = await inviteForm.value.validate();
    if (!result.valid) {
      return;
    }
  }

  try {
    await Api.inviteSchoolAdmin(inviteSchoolID.value, inviteEmail.value.trim());
    snackbarText.value = t('invite.sent');
    snackbarColor.value = 'success';
    snackbar.value = true;
    inviteDialog.value = false;
  } catch (e) {
    snackbarText.value = e.response?.data?.error || e.message || t('error');
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
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
