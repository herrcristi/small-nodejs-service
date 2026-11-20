<template>
  <v-card v-if="read || write">
    <!-- 
          portal admins: the users of the portal school (the portal school is always the same, so it is not shown)
          the + invites a user as portal admin, an admin can be edited (name, status) and removed (not the current user)
    -->
    <ApiTableServer
      ref="portalAdminsTable"
      class="mb-6"
      title="schools.portal.admins"
      :fields="portalAdminsFields.fields"
      :projectionFields="portalAdminsFields.projectionFields"
      :sortFields="portalAdminsFields.sortFields"
      :filterFields="portalAdminsFields.filterFields"
      :apiFn="portalAdminsApiFn"
      :read="read"
      :write="write"
      :call="portalAdminsCall"
      @addItem="openInvitePortalAdmin"
    >
      <template #item.actions="{ item, deleteCalls }">
        <ActionIcon
          v-if="write"
          class="mr-2"
          icon="mdi-pencil"
          :title="t('edit')"
          :disabled="portalAdminsCall.inProgress"
          :loading="portalAdminsCall.loading && portalAdminsCall.itemID === item.id"
          @click="openEditUser(item)"
        />
        <ActionIcon
          v-if="canRemovePortalAdmin(item)"
          class="mr-2"
          icon="mdi-delete"
          :title="t('delete')"
          :disabled="deleteCalls.isInProgress(item.id)"
          :loading="deleteCalls.isLoading(item.id)"
          @click="portalAdminsTable.confirmDelete(item.id)"
        />
      </template>
    </ApiTableServer>

    <!-- 
          managed schools (the portal school is not part of this list)
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
      :call="schoolsCall"
      :details="details"
      :expand="expand"
      @addItem="openAdd($event)"
      @editItem="openEdit($event)"
      @detailsItem="openDetails($event)"
    >
      <!-- 
        more info: the admins of the school
      -->
      <template v-slot:expanded-row="{ item, columns }">
        <tr>
          <td :colspan="columns.length" class="py-2">
            <v-sheet rounded="lg" border>
              <ApiSchoolMoreInfo :itemID="item.id" :write="write" />
            </v-sheet>
          </td>
        </tr>
      </template>
    </ApiTableServer>

    <!-- 
          edit dialog
    -->
    <v-card v-if="write">
      <v-dialog v-model="dialog" max-width="800px" v-if="write">
        <v-card>
          <v-card-title>
            {{ dialogTitle }}
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
            <v-btn color="primary" :disabled="!formValid || dialogCall.inProgress" @click="handleSubmit">
              {{ t('save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- 
        edit a portal admin (name, status)
      -->
      <ApiUserEditDialog
        v-model="userDialog"
        :user="editingUser"
        :call="portalAdminsCall"
        @saved="portalAdminsTable.refresh()"
      />

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
import ApiSchoolMoreInfo from './api.school.moreinfo.vue';
import ApiUserEditDialog from './api.user.edit.dialog.vue';
import ActionIcon from './base.action.icon.vue';
import { useI18n } from 'vue-i18n';
import ComponentsUtils from './components.utils.js';
const { t } = useI18n();

/**
 * props
 */
const tableServer = ref();
const portalAdminsTable = ref();
const details = null; // true for details column
const expand = true; // true for expand column

const auth = useAuthStore();
// read from the store when used (computed), not when the component is created
const currentUserID = computed(() => auth?.raw?.userID);

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

const portalAdminsFields = {
  fields: ['name', 'email', 'status'],
  projectionFields: ['name', 'email', 'status'],
  sortFields: ['name'],
  filterFields: ['name', 'email'],
  inviteFields: ['email'],
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

// the portal admins: create invites the user to the portal school (the user becomes portal admin)
// and delete removes only the portal-admin role (the user account is kept)
const portalAdminsCount = ref(0);
const portalAdminsApiFn = {
  getAll: async (params) => {
    const response = await Api.getPortalAdmins(params);
    portalAdminsCount.value = response.data?.meta?.count ?? response.data?.data?.length ?? 0;
    return response;
  },
  create: (data) => Api.invitePortalAdmin(data.email),
  delete: Api.removePortalAdmin,
};

/**
 * a portal admin can be removed only by another portal admin, and the last one cannot be removed
 */
function canRemovePortalAdmin(item) {
  return !!write && portalAdminsCount.value > 1 && item.id !== currentUserID.value;
}

/**
 * edit a portal admin (name, status), the status of the current user can not be changed
 */
const userDialog = ref(false);
const editingUser = ref(null);

function openEditUser(item) {
  // not while a call of the portal admins is in progress (one at a time)
  if (!write || portalAdminsCall.inProgress) {
    return;
  }
  editingUser.value = { ...item };
  userDialog.value = true;
}

/**
 * edit
 */
const itemData = reactive({});
const editing = ref(false);
const editingItemID = ref(null);
const dialog = ref(false);
const editForm = ref(null);
const formValid = ref(false);
// the calls of the dialog, one per table: shown on the button that opened the dialog (handleSubmit)
const schoolsCall = ComponentsUtils.useSingleCall(); // add / edit a school
const portalAdminsCall = ComponentsUtils.useSingleCall(); // invite / edit a portal admin
const dialogCall = computed(() => (dialogMode.value === 'portal' ? portalAdminsCall : schoolsCall));
const dialogMode = ref('school'); // 'school' (add/edit managed school) or 'portal' (invite portal admin)

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

const dialogTitle = computed(() => {
  if (dialogMode.value === 'portal') {
    return t('schools.portal.invite');
  }
  return editing.value ? t('edit') : t('add');
});

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
 * handle submit: one save at a time (a second click or Enter sends nothing); the dialog closes when the call starts,
 * and the button that opened it (+, or the edit of the row) is disabled until the answer, with a spinner when it takes
 * long; the snackbar tells the result
 */
async function handleSubmit() {
  await dialogCall.value.run(submit, editingItemID.value);
}

/**
 * submit: validate, then add or update
 */
async function submit() {
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

  // the dialog closes (its form is cleared): the button that opened it shows the call until the answer
  const isPortal = dialogMode.value === 'portal';
  const isEditing = editing.value;
  const itemID = editingItemID.value;
  dialog.value = false;
  resetForm();

  // add/update (or invite portal admin)
  let ok = false;
  if (isPortal) {
    ok = await ComponentsUtils.Edit.add(portalAdminsApiFn, payload, snackbarO, t, { successKey: 'invite.success' });
  } else if (isEditing) {
    ok = await ComponentsUtils.Edit.update(apiFn, itemID, payload, snackbarO, t);
  } else {
    ok = await ComponentsUtils.Edit.add(apiFn, payload, snackbarO, t);
  }

  // refresh
  if (ok) {
    const table = isPortal ? portalAdminsTable : tableServer;
    await table.value.refresh();
  }
}

/**
 * open add dialog
 */
function openAdd() {
  // not while a call of its table is in progress (one at a time)
  if (!write || schoolsCall.inProgress) {
    return;
  }

  resetForm();
  dialogMode.value = 'school';
  fieldsSet.value = new Set(apiFields.addFields);

  editing.value = false;
  dialog.value = true;
}

/**
 * open edit dialog
 */
function openEdit(item) {
  // not while a call of its table is in progress (one at a time)
  if (!write || schoolsCall.inProgress) {
    return;
  }

  resetForm();
  dialogMode.value = 'school';
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
 * open invite portal admin dialog (the user is invited to the portal school, which is the selected tenant)
 */
function openInvitePortalAdmin() {
  // not while a call of its table is in progress (one at a time)
  if (!write || portalAdminsCall.inProgress) {
    return;
  }

  resetForm();
  dialogMode.value = 'portal';
  fieldsSet.value = new Set(portalAdminsFields.inviteFields);

  editing.value = false;
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
