<template>
  <v-card v-if="read || write">
    <!-- 
        dialog title     
    -->
    <v-card-title class="d-flex justify-space-between">
      <div>{{ group.name || t('groups') }}</div>
      <v-btn icon small @click="closeGroup"><v-icon>mdi-close</v-icon></v-btn>
    </v-card-title>

    <!-- 
        table title 
    -->
    <v-toolbar flat>
      <v-card-title class="d-flex justify-space-between">
        <div>{{ t('students') }}</div>
      </v-card-title>

      <v-btn
        class="me-2 left"
        color="primary"
        prepend-icon="mdi-plus"
        rounded="lg"
        border
        small
        @click="openAddStudents"
        v-if="write"
      ></v-btn>

      <v-toolbar-title> </v-toolbar-title>

      <v-text-field
        v-model="filter"
        :label="t('filter')"
        class="me-2"
        rounded="lg"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        hide-details
        single-line
        dense
      ></v-text-field>
    </v-toolbar>

    <v-card-text>
      <v-row class="mb-2">
        <v-col cols="8"> </v-col>
        <v-col cols="4" class="text-right"> </v-col>
      </v-row>

      <!-- 
          current groupStudents list 
      -->
      <v-data-table
        :headers="headers"
        :items="groupStudents"
        :items-length="totalGroupStudents"
        :loading="loading"
        :search="filter"
        :custom-filter="filterGroupStudents"
        :no-data-text="nodatatext"
        item-key="id"
        striped="even"
        density="compact"
        hide-default-header
        items-per-page="50"
      >
        <template v-slot:loading>
          <v-skeleton-loader type="table-row@4"></v-skeleton-loader>
        </template>

        <!-- 
          actions
      -->
        <template #item.actions="{ item }" small right v-if="write">
          <v-icon small class="mr-2" @click="confirmDelete(item.id)" :title="$t('delete')" size="small"
            >mdi-delete</v-icon
          >
        </template>
      </v-data-table>
    </v-card-text>

    <!-- Confirm delete dialog -->
    <ConfirmDialog
      :model-value="confirmDeleteDialog"
      @update:modelValue="confirmDeleteDialog = $event"
      @confirm="doDelete"
      @cancel="cancelDelete"
      title-key="delete"
      message-key="delete_confirm"
      ok-key="delete"
      cancel-key="cancel"
      :args="{}"
    />

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
          <ApiPage
            title="students"
            :fields="['user.name', 'user.status', 'user.email']"
            :apiFn="{
              getAll: Api.getStudents,
            }"
            :read="read && app?.rolesPermissions?.students?.read"
            :write="false"
          ></ApiPage>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeAddStudents">{{ t('cancel') }}</v-btn>
          <v-btn color="primary" @click="confirmAddStudents">{{ t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ConfirmDialog from './confirm.dialog.vue';
import ApiPage from './api.page.vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const props = defineProps({
  groupID: { type: [String, Number], default: null },
});
const emit = defineEmits(['close']);

const group = reactive({});
const groupStudents = ref([]);
const totalGroupStudents = ref(0);
const filter = ref('');
const loading = ref(false);
const nodatatext = ref('');

const confirmDeleteDialog = ref(false);
const toDeleteID = ref(null);

const addStudentDialog = ref(false);
const studentsItems = ref([]);
const selectedStudents = ref([]);
const studentsFilter = ref('');

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
 * headers
 */
const headers = computed(() => {
  const h = [
    { title: t('name'), key: 'user.name' },
    { title: t('email'), key: 'user.email' },
  ];
  if (write) {
    h.push({ title: t('actions'), value: 'actions', sortable: false });
  }
  return h;
});

/**
 * custom filter
 */
function filterGroupStudents(value, query, item) {
  let q = query?.toLocaleUpperCase();
  let n = item?.raw?.user?.name?.toString().toLocaleUpperCase();
  let e = item?.raw?.user?.email?.toString().toLocaleUpperCase();
  return (
    // value != null &&
    q != null &&
    //
    (n.indexOf(query.toLocaleUpperCase()) !== -1 || e.indexOf(query.toLocaleUpperCase()) !== -1)
  );
}

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
    totalGroupStudents.value = groupStudents.value.length;
  } catch (e) {
    console.error('Error fetching group details:', e);

    nodatatext.value = e.toString();
    groupStudents.value = [];
    totalGroupStudents.value = 0;

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
 * delete
 */
function confirmDelete(itemID) {
  toDeleteID.value = itemID;
  confirmDeleteDialog.value = true;
}
function cancelDelete() {
  toDeleteID.value = null;
  confirmDeleteDialog.value = false;
}
async function doDelete() {
  if (!toDeleteID.value) {
    return;
  }
  try {
    await del(toDeleteID.value);
  } finally {
    toDeleteID.value = null;
    confirmDeleteDialog.value = false;
  }
}

async function del(itemID) {
  try {
    await Api.updateGroupStudents(props.groupID, [], [itemID]);

    snackbarText.value = t('groups.delete.student.success') || 'Student deleted from group';
    snackbarColor.value = 'success';
    snackbar.value = true;

    groupStudents.value = groupStudents.value.filter((item) => item.id !== itemID);
  } catch (e) {
    console.error('Error deleting student from group:', e);

    snackbarText.value =
      e?.response?.data?.message || t('groups.delete.student.error') || 'Error deleting student from group';
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

/**
 * open add students
 */
async function openAddStudents() {
  studentsFilter.value = '';
  addStudentDialog.value = true;
  // fetch first page
  // await fetchStudents({ page: 1, itemsPerPage: 25 });

  const existingIds = new Set((groupStudents.value || []).map((s) => s.id));
  selectedStudents.value = studentsItems.value.filter((s) => existingIds.has(s.id)).map((s) => s.id);
}

function closeAddStudents() {
  studentsFilter.value = '';
  addStudentDialog.value = false;
}

/**
 * add students
 */
async function confirmAddStudents() {
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
