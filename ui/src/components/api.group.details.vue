<template>
  <v-card v-if="read || write">
    <!-- 
        dialog title
    -->
    <v-card-title class="d-flex justify-space-between">
      <div>{{ group.name || t('groups') }}</div>
      <v-btn icon small @click="closeGroup"><v-icon>mdi-close</v-icon></v-btn>
    </v-card-title>

    <v-card-text>
      <!-- 
          group students 
      -->
      <ApiFieldDetails
        ref="fieldDetailsStudents"
        title="students"
        :titleAdd="group.name"
        :items="groupStudents"
        :fields="['user.name', 'user.status', 'user.email']"
        :projectionFields="['user.name', 'user.status', 'user.email']"
        :sortFields="['user.name', 'user.status', 'user.email']"
        :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
        :apiFn="{
          getAll: Api.getStudents,
          updateField: updateGroupStudents,
          deleteField: deleteGroupStudent,
        }"
        :read="read && app?.rolesPermissions?.students?.read"
        :write="write && app?.rolesPermissions?.students?.write"
        :loading="loading"
        :nodatatext="nodatatext"
      ></ApiFieldDetails>
    </v-card-text>

    <!-- 
      snackbar for notifications
    -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ApiFieldDetails from './api.field.details.vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const props = defineProps({
  groupID: { type: [String, Number], default: null },
});
const emit = defineEmits(['close']);

const group = reactive({});
const loading = ref(false);
const nodatatext = ref('');

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

const app = useAppStore();
const read = app?.rolesPermissions?.groups?.read || 0;
const write = app?.rolesPermissions?.groups?.write || 0;

/**
 * group students
 */
const fieldDetailsStudents = ref();
const groupStudents = ref([]);

/**
 * monitor groupID
 */
watch(
  () => props.groupID,
  (id) => {
    if (id) {
      fetchGroup(id);
    }
  },
  { immediate: true }
);

/**
 * get group details
 */
async function fetchGroup(id) {
  let timeoutID = setTimeout(() => {
    loading.value = true;
  }, 300); // Show loader if it takes more than 300ms

  try {
    const resp = await Api.getGroup(id);
    const data = resp.data || {};
    Object.keys(group).forEach((k) => delete group[k]);
    Object.assign(group, data);

    groupStudents.value = data.students || [];
  } catch (e) {
    console.error('Error fetching group details:', e);

    nodatatext.value = e.toString();
    groupStudents.value = [];

    snackbarText.value = t('group.fetch.error') || 'Error fetching group details';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    clearTimeout(timeoutID);
    loading.value = false;
  }
}

/**
 * close
 */
function closeGroup() {
  fieldDetailsStudents.value.clear();
  emit('close');
}

/**
 * ApiFieldDetails calling deleteField
 */
async function deleteGroupStudent(studentID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateGroupStudents(props.groupID, [], [studentID]);

  // avoid server call
  groupStudents.value = groupStudents.value.filter((item) => item.id !== studentID);
}

/**
 * ApiFieldDetails calling updateField
 */
async function updateGroupStudents(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateGroupStudents(props.groupID, newIDs, removeIDs);

  // refresh
  await fetchGroup(props.groupID);
}
</script>

<style scoped></style>
