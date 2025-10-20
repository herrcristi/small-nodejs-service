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
      <ApiRefClasses
        ref="fieldDetailsClassesComponent"
        title="classes"
        :titleAdd="itemDetails.name"
        :items="fieldClasses"
        :apiFn="{}"
        :read="read"
        :write="false"
        :loading="loading"
        :nodatatext="nodatatext"
      >
      </ApiRefClasses>
    </v-card-text>

    <v-card-text>
      <!-- 
          field professors 
      -->
      <ApiRefProfessors
        ref="fieldDetailsProfessorsComponent"
        title="professors"
        :titleAdd="itemDetails.name"
        :items="fieldProfessors"
        :apiFn="{
          getAllParams: { 'classes.id': itemDetails.class?.id },
          updateField: updateFieldProfessors,
          deleteField: deleteFieldProfessor,
        }"
        :read="read"
        :write="write"
        :loading="loading"
        :nodatatext="nodatatext"
      >
      </ApiRefProfessors>
    </v-card-text>

    <v-card-text>
      <!-- 
          field inner schedules
      -->
      <ApiRefInnerSchedules
        ref="fieldDetailsInnerSchedulesComponent"
        title="schedules"
        :titleAdd="itemDetails.name"
        :items="fieldInnerSchedules"
        :apiFn="{
          addField: addFieldInnerSchedule,
          updateField: updateFieldInnerSchedules,
          deleteField: deleteFieldInnerSchedule,
        }"
        :read="read"
        :write="write"
        :loading="loading"
        :nodatatext="nodatatext"
      >
      </ApiRefInnerSchedules>
    </v-card-text>

    <v-card-text>
      <!-- 
          field groups 
      -->
      <ApiRefGroups
        ref="fieldDetailsGroupsComponent"
        title="groups"
        :titleAdd="itemDetails.name"
        :items="fieldGroups"
        :apiFn="{
          // getAllParams: { 'classes.id': itemDetails.class?.id },
          updateField: updateFieldGroups,
          deleteField: deleteFieldGroup,
        }"
        :read="read"
        :write="write"
        :loading="loading"
        :nodatatext="nodatatext"
      >
      </ApiRefGroups>
    </v-card-text>

    <v-card-text>
      <!-- 
          field students from groups
      -->
      <ApiRefStudents
        ref="fieldDetailsGroupsStudentsComponent"
        title="schedules.groups.students"
        :titleAdd="itemDetails.name"
        :items="fieldGroupsStudents"
        :apiFn="{}"
        :read="read"
        :write="false"
        :loading="loading"
        :nodatatext="nodatatext"
      >
      </ApiRefStudents>
    </v-card-text>

    <v-card-text>
      <!-- 
          field students extra
      -->
      <ApiRefStudents
        ref="fieldDetailsExtraStudentsComponent"
        title="schedules.extra.students"
        :titleAdd="itemDetails.name"
        :items="fieldExtraStudents"
        :apiFn="{
          getAllParams: { 'classes.id': itemDetails.class?.id },
          updateField: updateFieldExtraStudents,
          deleteField: deleteFieldExtraStudent,
        }"
        :read="read"
        :write="write"
        :loading="loading"
        :nodatatext="nodatatext"
      >
      </ApiRefStudents>
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
import ApiRefClasses from './api.references.classes.vue';
import ApiRefGroups from './api.references.groups.vue';
import ApiRefStudents from './api.references.students.vue';
import ApiRefProfessors from './api.references.professors.vue';
import ApiRefInnerSchedules from './api.references.innerschedules.vue';
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
 * ApiFieldDetails calling inner schedules addField / deleteField / updateField
 */
async function addFieldInnerSchedule(data) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleInnerSchedules(props.itemID, [data], null);

  // refresh
  await detailsComponent.value.refresh();
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
 * * ApiFieldDetails calling groups: deleteField / updateField
 */
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
 * ApiFieldDetails calling professors: deleteField / updateField
 */
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
 * ApiFieldDetails calling extra students: deleteField / updateField
 */
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
