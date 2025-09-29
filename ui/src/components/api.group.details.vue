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

    <!-- 
        Add students modal     
    -->
    <v-dialog v-model="addStudentDialog" max-width="900px" v-if="write">
      <v-card>
        <v-card-title>{{ group.name }}</v-card-title>

        <v-card-text>
          <v-data-table-server
            :headers="studentsHeaders"
            :items="studentsItems"
            :items-length="totalStudentsItems"
            :loading="studentsLoading"
            :search="studentsFilter"
            :no-data-text="nodatatextStudents"
            v-model="selectedStudents"
            item-key="id"
            show-select
            @update:options="fetchStudents"
          >
            <!-- 
                top of the table, title + add + filter 
            -->
            <template v-slot:top>
              <v-toolbar flat>
                <v-card-title class="d-flex justify-space-between">
                  {{ $t('students') }}
                </v-card-title>

                <v-toolbar-title> </v-toolbar-title>

                <v-text-field
                  v-model="studentsFilter"
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
            </template>

            <!-- 
                loading
            -->
            <template v-slot:studentsLoading>
              <v-skeleton-loader type="table-row@1"></v-skeleton-loader>
            </template>

            <!-- <template #item.selected="{ item }">
              <v-checkbox v-model="selectedStudents" :value="item.id" hide-details></v-checkbox>
            </template> -->
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
const totalStudentsItems = ref(0);
const selectedStudents = ref([]);
const studentsLoading = ref(false);
const studentsFilter = ref('');
const nodatatextStudents = ref('');

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

/**
 s* student headers
 */
const studentsHeaders = computed(() => {
  const h = [
    { title: '', value: 'selected', sortable: false },
    { title: t('name'), key: 'user.name' },
    { title: t('email'), key: 'user.email' },
  ];

  return h;
});

/**
 * open add students
 */
async function openAddStudents() {
  studentsFilter.value = '';
  addStudentDialog.value = true;
  // fetch first page
  await fetchStudents({ page: 1, itemsPerPage: 25 });
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
function confirmAddStudents() {
  const selectedSet = new Set(selectedStudents.value);
  const newStudentsIds = studentsItems.value.filter((s) => selectedSet.has(s.id));

  // TODO
  // // persist to server
  // if (group.id) {
  //   Api.updateGroup(group.id, { ...group, students: newStudentsIds })
  //     .then(() => {
  //       emit('update:students', students.value);
  //       // notify parent
  //       emit('saved');
  //     })
  //     .catch((e) => {
  //       console.error('Error saving group students', e);
  //     });
  // } else {
  //   emit('update:students', students.value);
  // }
  addStudentDialog.value = false;
}

/**
 * fetch students for selector (server-side pagination/search)
 */
async function fetchStudents({ page, itemsPerPage, sortBy } = {}) {
  let timeoutID = setTimeout(() => {
    studentsLoading.value = true;
  }, 300); // Show loader if it takes more than 300ms

  try {
    const start = (page - 1) * itemsPerPage;
    let params = {
      skip: start,
      limit: itemsPerPage,
      projection: 'id,user.name,user.email',
      sort: 'user.name',
    };

    if (studentsFilter.value) {
      params = {
        ...params,
        'user.name,user.email': `/${studentsFilter.value}/i`,
      };
    }

    if (sortBy?.length) {
      params.sort = '';
      sortBy.forEach((s) => {
        params.sort += `${s.order === 'desc' ? `-${s.key}` : s.key},`;
      });
      params.sort = params.sort.slice(0, -1);
    }

    const response = await Api.getStudents(new URLSearchParams(params).toString());
    totalStudentsItems.value = response.data?.meta?.count || 0;
    studentsItems.value = response.data?.data || [];
  } catch (e) {
    console.error('Error fetching students page', e);

    nodatatextStudents.value = e.toString();
    studentsItems.value = [];
    totalStudentsItems.value = 0;

    snackbarText.value = t('students.fetch.error') || 'Error fetching students';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    clearTimeout(timeoutID);
    studentsLoading.value = false;
  }
}
</script>

<style scoped></style>
