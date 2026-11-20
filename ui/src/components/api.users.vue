<template>
  <v-card v-if="read || write">
    <!--
          all the users of the portal (portal admins only)
          a portal admin sees the name, the email and the status of a user, not its schools,
          and changes the name and the status (see ApiUserEditDialog)
    -->
    <ApiTableServer
      ref="tableServer"
      title="users"
      :fields="apiFields.fields"
      :projectionFields="apiFields.projectionFields"
      :sortFields="apiFields.sortFields"
      :filterFields="apiFields.filterFields"
      :apiFn="apiFn"
      :read="read"
      :write="write"
      :call="saveCall"
      @editItem="openEdit($event)"
    />

    <ApiUserEditDialog
      v-if="write"
      v-model="dialog"
      :user="editingUser"
      :call="saveCall"
      @saved="tableServer.refresh()"
    />
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import ApiTableServer from './api.base.table.server.vue';
import ApiUserEditDialog from './api.user.edit.dialog.vue';
import ComponentsUtils from './components.utils.js';

const tableServer = ref();

const app = useAppStore();
const read = app?.rolesPermissions?.users?.read;
const write = app?.rolesPermissions?.users?.write;

/**
 * fields
 */
const apiFields = {
  fields: ['name', 'email', 'status'],
  projectionFields: ['name', 'email', 'status'],
  sortFields: ['name', 'email', 'status'],
  filterFields: ['name', 'email'],
};

// the update is done by the edit dialog (the name and the status have different routes)
const apiFn = {
  getAll: Api.getUsers,
  update: Api.updateUser,
};

/**
 * the save of the edit dialog: one at a time, shown on the edit of the row (disabled, a spinner when it takes long)
 */
const saveCall = ComponentsUtils.useSingleCall();

/**
 * edit
 */
const dialog = ref(false);
const editingUser = ref(null);

function openEdit(item) {
  // not while a save is in progress
  if (!write || saveCall.inProgress) {
    return;
  }
  editingUser.value = { ...item };
  dialog.value = true;
}
</script>
