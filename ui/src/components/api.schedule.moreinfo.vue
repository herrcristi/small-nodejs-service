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

    <v-card-text>
      <v-row class="d-flex justify-end">
        <v-col cols="12" md="10">
          <!-- 
              field classes 
         -->
          <ApiRefClasses
            ref="fieldDetailsClassesComponent"
            :titleAdd="itemDetails.name"
            :items="fieldClasses"
            :apiFn="{}"
            :type="type"
            :read="read"
            :write="false"
            :loading="loading"
            :nodatatext="nodatatext"
          >
          </ApiRefClasses>
        </v-col>
      </v-row>

      <v-row class="d-flex justify-end">
        <v-col cols="12" md="10">
          <!-- 
              field professors 
          -->
          <ApiRefProfessors
            ref="fieldDetailsProfessorsComponent"
            :titleAdd="itemDetails.name"
            :items="fieldProfessors"
            :apiFn="{
              getAllParams: { 'classes.id': itemDetails.class?.id },
              updateField: updateFieldProfessors,
              deleteField: deleteFieldProfessor,
            }"
            :type="type"
            :read="read"
            :write="write"
            :loading="loading"
            :nodatatext="nodatatext"
          >
          </ApiRefProfessors>
        </v-col>
      </v-row>

      <v-row class="d-flex justify-end">
        <v-col cols="12" md="10">
          <!-- 
              field (inner) schedules 
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
            :type="type"
            :read="read"
            :write="write"
            :loading="loading"
            :nodatatext="nodatatext"
          >
          </ApiRefInnerSchedules>
        </v-col>
      </v-row>

      <v-row class="d-flex justify-end">
        <v-col cols="12" md="10">
          <!-- 
              field groups 
          -->
          <ApiRefGroups
            ref="fieldDetailsGroupsComponent"
            :titleAdd="itemDetails.name"
            :items="fieldGroups"
            :apiFn="{
              // getAllParams: { 'classes.id': itemDetails.class?.id }, // TODO
              updateField: updateFieldGroups,
              deleteField: deleteFieldGroup,
            }"
            :type="type"
            :read="read"
            :write="write"
            :loading="loading"
            :nodatatext="nodatatext"
          >
          </ApiRefGroups>
        </v-col>
      </v-row>

      <v-row class="d-flex justify-end">
        <v-col cols="12" md="10">
          <!-- 
              field students from groups
          -->
          <ApiRefStudents
            ref="fieldDetailsGroupsStudentsComponent"
            title="schedules.groups.students"
            :titleAdd="itemDetails.name"
            :items="fieldGroupsStudents"
            :apiFn="{}"
            :type="type"
            :read="read"
            :write="false"
            :loading="loading"
            :nodatatext="nodatatext"
          >
          </ApiRefStudents>
        </v-col>
      </v-row>

      <v-row class="d-flex justify-end">
        <v-col cols="12" md="10">
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
            :type="type"
            :read="read"
            :write="write"
            :loading="loading"
            :nodatatext="nodatatext"
          >
          </ApiRefStudents>
        </v-col>
      </v-row>
    </v-card-text>
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
  type: { type: String, default: 'v-table' }, // v-table, v-chip, v-card
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

const fieldDetailsInnerSchedulesComponent = ref();
const fieldInnerSchedules = ref([]);

const fieldDetailsGroupsComponent = ref();
const fieldGroups = ref([]);

const fieldDetailsProfessorsComponent = ref();
const fieldProfessors = ref([]);

const fieldDetailsGroupsStudentsComponent = ref();
const fieldGroupsStudents = ref([]);

const fieldDetailsExtraStudentsComponent = ref();
const fieldExtraStudents = ref([]);

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

  // refresh
  await detailsComponent.value.refresh();
}

async function updateFieldInnerSchedules(innerScheduleID, payload) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleInnerSchedules(props.itemID, [payload], [innerScheduleID]);

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

/**
 * clear
 */
function clear() {
  fieldDetailsClassesComponent.value.clear();
  fieldClasses = [];

  fieldDetailsInnerSchedulesComponent.value.clear();
  fieldInnerSchedules = [];

  fieldDetailsGroupsComponent.value.clear();
  fieldGroups = [];

  fieldDetailsProfessorsComponent.value.clear();
  fieldProfessors = [];

  fieldDetailsGroupsStudentsComponent.value.clear();
  fieldGroupsStudents = [];

  fieldDetailsExtraStudentsComponent.value.clear();
  fieldExtraStudents = [];
}

/**
 * expose
 */
defineExpose({ clear });
</script>

<style scoped></style>
