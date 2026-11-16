<template>
  <!-- 
        more info of a school: its admins
        the invitations of school admins are done by the school admins, a school is created with its first admin
        a portal admin can change the name and the status of an admin (see ApiUserEditDialog)
  -->
  <ApiTableServer
    ref="tableServer"
    title="admins"
    :fields="adminsFields.fields"
    :projectionFields="adminsFields.projectionFields"
    :sortFields="adminsFields.sortFields"
    :apiFn="adminsApiFn"
    :read="1"
    :write="props.write"
    @editItem="openEdit($event)"
  />

  <ApiUserEditDialog v-if="props.write" v-model="dialog" :user="editingUser" @saved="tableServer.refresh()" />
</template>

<script setup>
import { ref } from 'vue';
import Api from '../api/api.js';
import ApiTableServer from './api.base.table.server.vue';
import ApiUserEditDialog from './api.user.edit.dialog.vue';

/**
 * props
 */
const props = defineProps({
  itemID: { type: String, default: null }, // the school id
  write: { type: [Boolean, Number], default: 0 }, // the admins can be edited (portal admin)
});

const tableServer = ref();

/**
 * fields
 */
const adminsFields = {
  fields: ['name', 'email', 'status'],
  projectionFields: ['name', 'email', 'status'],
  sortFields: ['name'],
};

// the update is done by the edit dialog (the name and the status have different routes)
const adminsApiFn = {
  getAll: (params) => Api.getSchoolAdmins(props.itemID, params),
  update: Api.updateUser,
};

/**
 * edit
 */
const dialog = ref(false);
const editingUser = ref(null);

function openEdit(item) {
  if (!props.write) {
    return;
  }
  editingUser.value = { ...item };
  dialog.value = true;
}
</script>
