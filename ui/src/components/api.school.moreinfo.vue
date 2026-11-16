<template>
  <!--
        more info of a school: its admins (the same compact list as the more info of the other pages)
        the invitations of school admins are done by the school admins, a school is created with its first admin
        a portal admin can change the name and the status of an admin (see ApiUserEditDialog), and remove an admin
        (only the admin role on this school), except the last one
  -->
  <v-card>
    <v-card-text>
      <v-row class="d-flex justify-end">
        <v-col cols="12" md="10">
          <ApiTableData
            title="admins"
            :items="admins"
            :fields="adminsFields.fields"
            :sortFields="adminsFields.sortFields"
            :filterFields="adminsFields.filterFields"
            :apiFn="adminsApiFn"
            :read="1"
            :write="props.write"
            :loading="loading"
            :nodatatext="nodatatext"
            @editItem="openEdit($event)"
            @deleteItem="load()"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>

  <ApiUserEditDialog v-if="props.write" v-model="dialog" :user="editingUser" @saved="load()" />
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Api from '../api/api.js';
import ApiTableData from './api.base.table.data.vue';
import ApiUserEditDialog from './api.user.edit.dialog.vue';

/**
 * props
 */
const props = defineProps({
  itemID: { type: String, default: null }, // the school id
  write: { type: [Boolean, Number], default: 0 }, // the admins can be edited (portal admin)
});

/**
 * fields
 */
const adminsFields = {
  fields: ['name', 'email', 'status'],
  projectionFields: ['name', 'email', 'status'],
  sortFields: ['name', 'email', 'status'],
  filterFields: ['name', 'email'],
};

/**
 * the admins of the school
 */
const admins = ref([]);
const loading = ref(false);
const nodatatext = ref('');

async function load() {
  if (!props.itemID) {
    admins.value = [];
    return;
  }

  loading.value = true;
  try {
    const params = new URLSearchParams({
      projection: `id,_lang_en,${adminsFields.projectionFields}`,
      sort: 'name',
      limit: 100, // a school has a few admins
    });
    const response = await Api.getSchoolAdmins(props.itemID, params.toString());
    admins.value = response.data?.data || [];
    nodatatext.value = '';
  } catch (e) {
    console.error('Error fetching the admins of the school', e);
    admins.value = [];
    nodatatext.value = e.response?.data?.error?.toString() || e.toString();
  } finally {
    loading.value = false;
  }
}

watch(() => props.itemID, load, { immediate: true });

/**
 * the actions: edit (the dialog does the update) and delete, which is not offered for the last admin
 */
const adminsApiFn = computed(() => ({
  update: props.write ? 1 : 0,
  delete: props.write && admins.value.length > 1 ? (userID) => Api.removeSchoolAdmin(props.itemID, userID) : 0,
}));

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
