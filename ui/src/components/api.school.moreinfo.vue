<template>
  <!-- 
        more info of a school: its admins (read only)
        the invitations of school admins are done by the school admins, a school is created with its first admin
  -->
  <ApiTableServer
    title="admins"
    :fields="adminsFields.fields"
    :projectionFields="adminsFields.projectionFields"
    :sortFields="adminsFields.sortFields"
    :apiFn="adminsApiFn"
    :read="1"
    :write="0"
  />
</template>

<script setup>
import Api from '../api/api.js';
import ApiTableServer from './api.base.table.server.vue';

/**
 * props
 */
const props = defineProps({
  itemID: { type: String, default: null }, // the school id
});

/**
 * fields
 */
const adminsFields = {
  fields: ['name', 'email', 'status'],
  projectionFields: ['name', 'email', 'status'],
  sortFields: ['name'],
};

const adminsApiFn = {
  getAll: (params) => Api.getSchoolAdmins(props.itemID, params),
};
</script>
