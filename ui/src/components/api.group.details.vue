<template>
  <v-card v-if="read || write">
    <!-- 
        dialog title     
    -->
    <v-card-title class="d-flex justify-space-between">
      <div>{{ group.name || t('groups') }}</div>
      <v-btn icon small @click="$emit('close')"><v-icon>mdi-close</v-icon></v-btn>
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
          current students list 
      -->
      <v-data-table
        :headers="headers"
        :items="students"
        :items-length="totalStudents"
        :loading="loading"
        :search="filter"
        :custom-filter="filterStudents"
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

        <template #item.name="{ item }">
          <div>
            {{ item.user.name }}
          </div>
          <v-spacer></v-spacer>

          <v-chip variant="plain" x-small color="grey">
            {{ item.user.email }}
          </v-chip>
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

    <!-- Add students modal -->
    <v-dialog v-model="addStudentDialog" max-width="900px">
      <v-card>
        <v-card-title>{{ t('students') }}</v-card-title>
        <v-card-text>
          <v-data-table-server
            :headers="[
              { title: '', value: 'selected', sortable: false },
              { title: t('name'), value: 'name' },
              { title: t('email'), value: 'email' },
            ]"
            :items="studentsItems"
            :items-length="studentTotal"
            :loading="studentLoading"
            @update:options="fetchStudents"
            hide-default-footer
          >
            <template #item.selected="{ item }">
              <v-checkbox v-model="selectedStudents" :value="item.id" hide-details></v-checkbox>
            </template>
            <template #top>
              <v-toolbar flat>
                <v-text-field
                  v-model="studentSearch"
                  :label="t('filter')"
                  class="me-2"
                  rounded
                  dense
                  prepend-inner-icon="mdi-magnify"
                  hide-details
                ></v-text-field>
              </v-toolbar>
            </template>
          </v-data-table-server>
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
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const props = defineProps({
  groupID: { type: [String, Number], default: null },
});
const emit = defineEmits(['close', 'update:students']);

const group = reactive({});
const students = ref([]);
const totalStudents = ref(0);
const filter = ref('');
const loading = ref(false);
const nodatatext = ref('');

const confirmDeleteDialog = ref(false);
const toDeleteID = ref(null);

const addStudentDialog = ref(false);
const studentsItems = ref([]);
const studentTotal = ref(0);
const studentLoading = ref(false);
const selectedStudents = ref([]);
const studentSearch = ref('');

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
  const h = [{ title: t('name'), key: 'name' }];
  if (write) {
    h.push({ title: t('actions'), value: 'actions', sortable: false });
  }
  return h;
});

/**
 * custom filter
 */
function filterStudents(value, query, item) {
  // alert(JSON.stringify(item));
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

    students.value = data.students || [];
    totalStudents.value = students.value.length;
  } catch (e) {
    console.error('Error fetching group details:', e);

    nodatatext.value = e.toString();
    students.value = [];
    totalStudents.value = 0;

    snackbarText.value = t('group.fetch.error') || 'Error fetching group details';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    clearTimeout(timeoutID);
    loading.value = false;
  }
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
    // TODO
    throw 'TODO delete student from group';
    // await Api.deleteGroup(itemID);

    snackbarText.value = t('groups.delete.student.success') || 'Student deleted from group';
    snackbarColor.value = 'success';
    snackbar.value = true;

    await fetchAll(lastRequestParams.value);
  } catch (e) {
    console.error('Error deleting student from group:', e);

    snackbarText.value =
      e?.response?.data?.message || t('groups.delete.student.error') || 'Error deleting student from group';
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

async function openAddStudents() {
  addStudentDialog.value = true;
  // fetch first page
  await fetchStudents({ page: 1, itemsPerPage: 25 });
  const existingIds = new Set((students.value || []).map((s) => s.id));
  selectedStudents.value = studentsItems.value.filter((s) => existingIds.has(s.id)).map((s) => s.id);
}

function closeAddStudents() {
  addStudentDialog.value = false;
}

function confirmAddStudents() {
  const selectedSet = new Set(selectedStudents.value);
  students.value = studentsItems.value.filter((s) => selectedSet.has(s.id));
  // persist to server
  if (group.id) {
    Api.updateGroup(group.id, { ...group, students: students.value })
      .then(() => {
        emit('update:students', students.value);
        // notify parent
        emit('saved');
      })
      .catch((e) => {
        console.error('Error saving group students', e);
      });
  } else {
    emit('update:students', students.value);
  }
  addStudentDialog.value = false;
}

/**
 * fetch students for selector (server-side pagination/search)
 */
async function fetchStudents({ page = 1, itemsPerPage = 25, sortBy = [] } = {}) {
  studentLoading.value = true;
  try {
    const start = (page - 1) * itemsPerPage;
    const params = {
      skip: start,
      limit: itemsPerPage,
    };
    if (studentSearch.value) {
      params['name,email'] = `/${studentSearch.value}/i`;
    }
    const resp = await Api.getStudents(new URLSearchParams(params).toString());
    studentsItems.value = resp.data?.data || [];
    studentTotal.value = resp.data?.meta?.count || studentsItems.value.length || 0;
  } catch (e) {
    console.error('Error fetching students page', e);
  } finally {
    studentLoading.value = false;
  }
}
</script>

<style scoped></style>
