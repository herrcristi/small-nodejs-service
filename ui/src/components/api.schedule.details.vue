<template>
  <v-card v-if="read || write">
    <!-- 
        for details 
    -->
    <ApiDetails
      ref="detailsComponent"
      :itemID="props.itemID"
      :read="read"
      :apiFn="{
        get: Api.getSchedule,
      }"
      @loading="loading = $event"
      @nodatatext="nodatatext = $event"
      @item="onItemDetails($event)"
    ></ApiDetails>

    <!-- 
        dialog title
    -->
    <v-card-title class="d-flex justify-space-between">
      <div>{{ itemDetails.name || t('details') }}</div>
      <v-btn icon small @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
    </v-card-title>

    <v-card-text>
      <!-- 
          field classes 
      -->
      <ApiFieldDetails
        ref="fieldDetailsClassesComponent"
        title="classes"
        :titleAdd="itemDetails.name"
        :items="fieldClasses"
        :fields="['name', 'status', 'description']"
        :apiFn="{}"
        :read="read && app?.rolesPermissions?.classes?.read"
        :write="false"
        :loading="loading"
        :nodatatext="nodatatext"
      ></ApiFieldDetails>
    </v-card-text>

    <v-card-text>
      <!-- 
          field professors 
      -->
      <ApiFieldDetails
        ref="fieldDetailsProfessorsComponent"
        title="professors"
        :titleAdd="itemDetails.name"
        :items="fieldProfessors"
        :fields="['user.name', 'user.status', 'user.email']"
        :projectionFields="['user.name', 'user.status', 'user.email']"
        :sortFields="['user.name', 'user.status', 'user.email']"
        :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
        :apiFn="{
          getAll: getAllFieldProfessors,
          updateField: updateFieldProfessors,
          deleteField: deleteFieldProfessor,
        }"
        :read="read && app?.rolesPermissions?.professors?.read"
        :write="write && app?.rolesPermissions?.professors?.write"
        :loading="loading"
        :nodatatext="nodatatext"
      ></ApiFieldDetails>
    </v-card-text>

    <v-card-text>
      <ApiFieldDetails
        ref="fieldDetailsInnerSchedulesComponent"
        title="schedules"
        :titleAdd="itemDetails.name"
        :items="fieldInnerSchedules"
        :fields="['frequency', 'status', 'timestamp', 'location.name', 'location.address']"
        :projectionFields="['frequency', 'status', 'timestamp', 'location']"
        :filterFields="['frequency', 'status', 'timestamp', 'location.name', 'location.address']"
        :apiFn="{
          getAll: getAllFieldInnerSchedules,
          updateField: updateFieldInnerSchedules,
          deleteField: deleteFieldInnerSchedule,
        }"
        :read="read && app?.rolesPermissions?.locations?.read"
        :write="write && app?.rolesPermissions?.locations?.write"
        :loading="loading"
        :nodatatext="nodatatext"
      >
        <!-- timestamp -->
        <template v-slot:item.timestamp="{ item }">
          {{ getInnerScheduleTime(item.timestamp) }}
        </template>
      </ApiFieldDetails>
    </v-card-text>

    <v-card-text>
      <!-- 
          field groups 
      -->
      <ApiFieldDetails
        ref="fieldDetailsGroupsComponent"
        title="groups"
        :titleAdd="itemDetails.name"
        :items="fieldGroups"
        :fields="['name', 'status', 'description']"
        :projectionFields="['name', 'status', 'description']"
        :sortFields="['name', 'status']"
        :filterFields="['name', '_lang_en.status', 'description']"
        :apiFn="{
          getAll: getAllFieldGroups,
          updateField: updateFieldGroups,
          deleteField: deleteFieldGroup,
        }"
        :read="read && app?.rolesPermissions?.groups?.read"
        :write="write && app?.rolesPermissions?.groups?.write"
        :loading="loading"
        :nodatatext="nodatatext"
      ></ApiFieldDetails>
    </v-card-text>

    <v-card-text>
      <!-- 
          field students from groups
      -->
      <ApiFieldDetails
        ref="fieldDetailsGroupsStudentsComponent"
        title="schedules.groups.students"
        :titleAdd="itemDetails.name"
        :items="fieldGroupsStudents"
        :fields="['user.name', 'user.status', 'user.email']"
        :projectionFields="['user.name', 'user.status', 'user.email']"
        :sortFields="['user.name', 'user.status', 'user.email']"
        :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
        :apiFn="{}"
        :read="read && app?.rolesPermissions?.students?.read"
        :write="false"
        :loading="loading"
        :nodatatext="nodatatext"
      ></ApiFieldDetails>
    </v-card-text>

    <v-card-text>
      <!-- 
          field students extra
      -->
      <ApiFieldDetails
        ref="fieldDetailsExtraStudentsComponent"
        title="schedules.extra.students"
        :titleAdd="itemDetails.name"
        :items="fieldExtraStudents"
        :fields="['user.name', 'user.status', 'user.email']"
        :projectionFields="['user.name', 'user.status', 'user.email']"
        :sortFields="['user.name', 'user.status', 'user.email']"
        :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
        :apiFn="{
          getAll: getAllFieldExtraStudents,
          updateField: updateFieldExtraStudents,
          deleteField: deleteFieldExtraStudent,
        }"
        :read="read && app?.rolesPermissions?.students?.read"
        :write="write && app?.rolesPermissions?.students?.write"
        :loading="loading"
        :nodatatext="nodatatext"
      ></ApiFieldDetails>
    </v-card-text>
  </v-card>

  <!-- add extra space -->
  <v-card>
    <v-card-text> &nbsp; </v-card-text>
  </v-card>
  <v-card>
    <v-card-text> &nbsp; </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ApiDetails from './api.base.details.vue';
import ApiFieldDetails from './api.base.field.details.vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const props = defineProps({
  itemID: { type: String, default: null },
});

const detailsComponent = ref();
const itemDetails = ref({});
const loading = ref(false);
const nodatatext = ref('');

const app = useAppStore();
const read = app?.rolesPermissions?.schedules?.read || 0;
const write = app?.rolesPermissions?.schedules?.write || 0;

/**
 * fields
 */
const fieldDetailsClassesComponent = ref();
const fieldClasses = ref([]);

const fieldDetailsProfessorsComponent = ref();
const fieldProfessors = ref([]);

const fieldDetailsInnerSchedulesComponent = ref();
const fieldInnerSchedules = ref([]);

const fieldDetailsGroupsComponent = ref();
const fieldGroups = ref([]);

const fieldDetailsGroupsStudentsComponent = ref();
const fieldGroupsStudents = ref([]);
const fieldDetailsExtraStudentsComponent = ref();
const fieldExtraStudents = ref([]);

/**
 * emit
 */
const emit = defineEmits(['close']);

/**
 * ApiDetails events after get details
 */
async function onItemDetails(data) {
  Object.keys(itemDetails.value).forEach((k) => delete itemDetails[k]);
  Object.assign(itemDetails.value, data);

  fieldClasses.value = [itemDetails.value.class];
  fieldProfessors.value = itemDetails.value.professors || [];
  fieldInnerSchedules.value = itemDetails.value.schedules || [];

  fieldGroups.value = itemDetails.value.groups || [];
  fieldGroupsStudents.value = getGroupsStudents(fieldGroups.value);
  fieldExtraStudents.value = itemDetails.value.students || [];
}

function getGroupsStudents(groups) {
  let students = [];
  groups.forEach((group) => students.push(...group.students));

  // eliminate duplicates
  let studentsIDs = new Set(students.map((item) => item.id));
  let uniqueStudents = [];
  for (const student of students) {
    if (studentsIDs.has(student.id)) {
      uniqueStudents.push(student);
      studentsIDs.delete(student.id);
    }
  }

  return uniqueStudents;
}

/**
 * close details dialog
 */
function closeDialog() {
  fieldDetailsClassesComponent.value.clear();
  fieldDetailsGroupsComponent.value.clear();
  fieldDetailsProfessorsComponent.value.clear();
  fieldDetailsGroupsStudentsComponent.value.clear();
  fieldDetailsExtraStudentsComponent.value.clear();
  emit('close');
}

/**
 * ApiFieldDetails calling inner schedules getAll / deleteField / updateField
 */
function getInnerScheduleTime(timestamp) {
  try {
    const d = new Date(timestamp);
    const time = d.toLocaleDateString(undefined, {
      weekday: 'short',
      // year: 'numeric',
      // month: 'short',
      // day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZone: 'UTC',
    });
    return time;
  } catch (e) {
    console.log('Error getting timestamp', e);
    return '';
  }
}

async function getAllFieldInnerSchedules(params) {
  // if fail will throw error and be catch in ApiFieldDetails
  return /* await */ Api.getLocations(params);
}

async function deleteFieldInnerSchedule(innerScheduleID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleInnerSchedules(props.itemID, [], [innerScheduleID]);

  // no need for server call
  fieldInnerSchedules.value = fieldInnerSchedules.value.filter((item) => item.id !== innerScheduleID);
}

async function updateFieldInnerSchedules(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleInnerSchedules(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}

/**
 * * ApiFieldDetails calling groups getAll / deleteField / updateField
 */
async function getAllFieldGroups(params) {
  // if fail will throw error and be catch in ApiFieldDetails
  // return /* await */ Api.getGroups(`${params ? params + '&' : ''}classes.id=${itemDetails.value.class.id}`);
  return /* await */ Api.getGroups(params);
}

async function deleteFieldGroup(groupID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleGroups(props.itemID, [], [groupID]);

  // no need for server call
  fieldGroups.value = fieldGroups.value.filter((item) => item.id !== groupID);
  fieldGroupsStudents.value = getGroupsStudents(fieldGroups.value);
}

async function updateFieldGroups(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleGroups(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}

/**
 * ApiFieldDetails calling professors getAll / deleteField / updateField
 */
async function getAllFieldProfessors(params) {
  // if fail will throw error and be catch in ApiFieldDetails
  return /* await */ Api.getProfessors(`${params ? params + '&' : ''}classes.id=${itemDetails.value.class.id}`);
}

async function deleteFieldProfessor(professorID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleProfessors(props.itemID, [], [professorID]);

  // no need for server call
  fieldProfessors.value = fieldProfessors.value.filter((item) => item.id !== professorID);
}

async function updateFieldProfessors(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleProfessors(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}

/**
 * ApiFieldDetails calling students getAll / deleteField / updateField
 */
async function getAllFieldExtraStudents(params) {
  // if fail will throw error and be catch in ApiFieldDetails
  return /* await */ Api.getStudents(`${params ? params + '&' : ''}classes.id=${itemDetails.value.class.id}`);
}

async function deleteFieldExtraStudent(studentID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleStudents(props.itemID, [], [studentID]);

  // no need for server call
  fieldExtraStudents.value = fieldExtraStudents.value.filter((item) => item.id !== studentID);
}

async function updateFieldExtraStudents(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleStudents(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}
</script>

<style scoped></style>
