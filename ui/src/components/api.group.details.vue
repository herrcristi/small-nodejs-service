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
      <ApiTableData
        title="students"
        :items="groupStudents"
        :fields="['user.name', 'user.status', 'user.email']"
        :sortFields="['user.name', 'user.status', 'user.email']"
        :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
        :apiFn="{
          create: 1,
          edit: 0,
          delete: deleteGroupStudent,
        }"
        :read="read && app?.rolesPermissions?.students?.read"
        :write="false"
        @addItem="openAddStudents($event)"
      ></ApiTableData>
    </v-card-text>

    <!-- 
      snackbar for notifications
    -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>

    <!-- 
        Add students modal     
    -->
    <v-dialog v-model="addStudentDialog" max-width="900px" v-if="write">
      <v-card>
        <v-card-title>{{ group.name }}</v-card-title>

        <v-card-text>
          <!-- 
              all students 
          -->
          <ApiTableServer
            title="students"
            :fields="['user.name', 'user.status', 'user.email']"
            :projectionFields="['user.name', 'user.status', 'user.email']"
            :sortFields="['user.name', 'user.status', 'user.email']"
            :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
            :apiFn="{
              getAll: Api.getStudents,
            }"
            :read="read && app?.rolesPermissions?.students?.read"
            :write="false"
          ></ApiTableServer>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeAddStudents">{{ t('cancel') }}</v-btn>
          <v-btn color="primary" @click="saveAddStudents">{{ t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ApiTableServer from './api.table.server.vue';
import ApiTableData from './api.table.data.vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const props = defineProps({
  groupID: { type: [String, Number], default: null },
});
const emit = defineEmits(['close']);

const group = reactive({});

/**
 * group students
 */
const groupStudents = ref([]);

const filter = ref('');
const loading = ref(false);
const nodatatext = ref('');

const addStudentDialog = ref(false);
const studentsItems = ref([]);
const selectedStudents = ref([]);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

const app = useAppStore();
const read = app?.rolesPermissions?.groups?.read || 0;
const write = app?.rolesPermissions?.groups?.write || 0;

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
  filter.value = '';
  emit('close');
}

/**
 * ApiTableData calling delete
 */
async function deleteGroupStudent(studentID) {
  await Api.updateGroupStudents(props.groupID, [], [studentID]);

  groupStudents.value = groupStudents.value.filter((item) => item.id !== studentID);
}

/**
 * ApiTableData event open add
 * open dialog ApiEditItem
 */
async function openAddStudents() {
  const existingIds = new Set((groupStudents.value || []).map((s) => s.id));
  selectedStudents.value = studentsItems.value.filter((s) => existingIds.has(s.id)).map((s) => s.id);
  addStudentDialog.value = true;
}

function closeAddStudents() {
  addStudentDialog.value = false;
  selectedStudents.value = [];
}

/**
 * add students
 */
async function saveAddStudents() {
  const existingIds = new Set((groupStudents.value || []).map((s) => s.id));
  const newIds = (selectedStudents.value || []).filter((id) => !existingIds.has(id));

  if (!newIds.length) {
    addStudentDialog.value = false;
    return;
  }

  // persist to server
  try {
    await Api.updateGroupStudents(props.groupID, newIds, []);

    addStudentDialog.value = false;

    snackbarText.value = t('groups.delete.student.success') || 'Student deleted from group';
    snackbarColor.value = 'success';
    snackbar.value = true;

    const newIdsSet = new Set(newIds);
    studentsItems.value.forEach((item) => {
      if (newIdsSet.has(item.id)) {
        groupStudents.value.push({ id: item.id, user: { name: item.user.name, email: item.user.email } });
      }
    });
  } catch (e) {
    console.error('Error saving group students', e);

    snackbarText.value =
      e?.response?.data?.message || t('groups.delete.student.error') || 'Error deleting student from group';
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}
</script>

<style scoped></style>
