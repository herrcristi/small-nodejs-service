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
      <!-- 
          field students 
      -->
      <ApiFieldDetails
        ref="fieldDetailsStudentsComponent"
        title="schedules.students"
        :titleAdd="itemDetails.name"
        :items="fieldStudents"
        :fields="['user.name', 'user.status', 'user.email']"
        :projectionFields="['user.name', 'user.status', 'user.email']"
        :sortFields="['user.name', 'user.status', 'user.email']"
        :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
        :apiFn="{
          getAll: getAllFieldStudents,
          updateField: updateFieldStudents,
          deleteField: deleteFieldStudent,
        }"
        :read="read && app?.rolesPermissions?.students?.read"
        :write="write && app?.rolesPermissions?.students?.write"
        :loading="loading"
        :nodatatext="nodatatext"
      ></ApiFieldDetails>
    </v-card-text>
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

const fieldDetailsGroupsComponent = ref();
const fieldGroups = ref([]);

const fieldDetailsProfessorsComponent = ref();
const fieldProfessors = ref([]);

const fieldDetailsStudentsComponent = ref();
const fieldStudents = ref([]);

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
  fieldGroups.value = itemDetails.value.groups || [];
  fieldProfessors.value = itemDetails.value.professors || [];
  fieldStudents.value = itemDetails.value.students || [];
}

/**
 * close details dialog
 */
function closeDialog() {
  fieldDetailsClassesComponent.value.clear();
  fieldDetailsGroupsComponent.value.clear();
  fieldDetailsProfessorsComponent.value.clear();
  fieldDetailsStudentsComponent.value.clear();
  emit('close');
}

/**
 * * ApiFieldDetails calling professors getAll / deleteField / updateField
 */
async function getAllFieldGroups() {
  // if fail will throw error and be catch in ApiFieldDetails
  // return /* await */ Api.getGroups(`classes.id=${itemDetails.value.class.id}`);
  return /* await */ Api.getGroups('');
}

async function deleteFieldGroup(groupID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleGroups(props.itemID, [], [groupID]);

  // no need for server call
  fieldGroups.value = fieldGroups.value.filter((item) => item.id !== groupID);
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
async function getAllFieldProfessors() {
  // if fail will throw error and be catch in ApiFieldDetails
  return /* await */ Api.getProfessors(`classes.id=${itemDetails.value.class.id}`);
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
async function getAllFieldStudents() {
  // if fail will throw error and be catch in ApiFieldDetails
  return /* await */ Api.getStudents(`classes.id=${itemDetails.value.class.id}`);
}

async function deleteFieldStudent(studentID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleStudents(props.itemID, [], [studentID]);

  // no need for server call
  fieldStudents.value = fieldStudents.value.filter((item) => item.id !== studentID);
}

async function updateFieldStudents(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleStudents(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}
</script>

<style scoped></style>
