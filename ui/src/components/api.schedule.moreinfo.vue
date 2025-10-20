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
          <!-- list using v-chip -->
          <div class="pa-1" v-if="type == 'v-chip' && read && app?.rolesPermissions?.locations?.read">
            <v-card-title class="d-flex justify-space-between">
              <div>{{ t('schedules') }}</div>
            </v-card-title>

            <v-card-text>
              <v-chip-group selected-class="text-primary" column text="chip">
                <template v-for="s in fieldInnerSchedules" :key="s.id">
                  <v-chip> {{ s.frequency }}, {{ getInnerScheduleTime(s.timestamp) }}, {{ s.location.name }}</v-chip>
                </template>
              </v-chip-group>
            </v-card-text>
          </div>

          <!-- list using v-card -->

          <v-container fluid v-if="type == 'v-card' && read && app?.rolesPermissions?.locations?.read">
            <v-card-title class="d-flex justify-space-between">
              <div>{{ t('schedules') }}</div>
            </v-card-title>

            <v-row dense>
              <template v-for="s in fieldInnerSchedules" :key="s.id" small>
                <v-col cols="12" md="10">
                  <v-card>
                    <v-card-title> {{ s.location.name }} </v-card-title>
                    <v-card-subtitle> {{ s.frequency }}, {{ getInnerScheduleTime(s.timestamp) }} </v-card-subtitle>
                    <v-card-subtitle>
                      {{ s.location.address }}
                    </v-card-subtitle>
                  </v-card>
                </v-col>
              </template>
            </v-row>
          </v-container>

          <!-- list using table -->

          <v-card v-if="type == 'v-table'">
            <ApiFieldDetails
              ref="fieldDetailsInnerSchedulesComponent"
              title="schedules"
              :titleAdd="itemDetails.name"
              :items="fieldInnerSchedules"
              :fields="['frequency', 'status', 'timestamp', 'location.name', 'location.address']"
              :projectionFields="['frequency', 'status', 'timestamp', 'location']"
              :sortFields="['frequency', 'status', 'timestamp', 'location.name', 'location.address']"
              :filterFields="['frequency', 'status', 'timestamp', 'location.name', 'location.address']"
              :apiFn="{
                updateField: updateFieldInnerSchedules,
                deleteField: deleteFieldInnerSchedule,
              }"
              :emitEdit="true"
              @editItem="editInnerScheduleDialog.openEdit($event)"
              :read="read && app?.rolesPermissions?.locations?.read"
              :write="write && app?.rolesPermissions?.locations?.write"
              :loading="loading"
              :nodatatext="nodatatext"
            >
              <!-- timestamp -->
              <template v-slot:item.timestamp="{ item }">
                {{ getInnerScheduleTime(item.timestamp) }}
              </template>

              <!-- add -->
              <template v-slot:top.add>
                <v-btn
                  class="me-2 left"
                  color="primary"
                  prepend-icon="mdi-plus"
                  rounded="lg"
                  text=""
                  border
                  @click="editInnerScheduleDialog.openAdd()"
                  v-if="write && app?.rolesPermissions?.locations?.write"
                ></v-btn>
              </template>
            </ApiFieldDetails>
          </v-card>

          <!-- 
              edit dialog
          -->
          <ApiEditItem
            ref="editInnerScheduleDialog"
            title="schedules"
            :addFields="['frequency', 'status', 'frequencyTimestamp', 'location']"
            :editFields="['frequency', 'status', 'frequencyTimestamp', 'location']"
            :apiFn="{
              add: 1,
              create: addFieldInnerSchedule,
              update: updateFieldInnerSchedules,
              delete: 0,
            }"
            :write="write && app?.rolesPermissions?.locations?.write"
            @cancel=""
            @save="editInnerScheduleDialog.closeDialog()"
          >
            <!-- 
                add location 
            -->
            <template v-slot:edit.location="{ itemData, fieldsSet }">
              <ApiFieldDetails
                v-if="fieldsSet.has('location')"
                ref="fieldDetailsLocationsComponent"
                title="location"
                titleAdd="locations"
                :items="itemData.location?.id ? [itemData.location] : []"
                :fields="['name', 'status', 'address']"
                :apiFn="{
                  getAll: Api.getLocations,
                  deleteField: 0,
                  updateField: (newObjs, removeIDs) => onAddUpdateFieldLocation(itemData, newObjs, removeIDs),
                }"
                :read="read && app?.rolesPermissions?.locations?.read"
                :write="read && app?.rolesPermissions?.locations?.write"
                :loading="false"
                :nodatatext="''"
                :selectStrategy="'single'"
                :selectReturnObject="true"
              >
              </ApiFieldDetails>
              <v-input
                v-if="fieldsSet.has('location') && !itemData.location?.id"
                :messages="t('location.required')"
                error
              ></v-input>
            </template>
          </ApiEditItem>
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
import ApiFieldDetails from './api.base.field.details.vue';
import ApiEditItem from './api.base.edit.item.vue';
import ApiRefClasses from './api.references.classes.vue';
import ApiRefGroups from './api.references.groups.vue';
import ApiRefStudents from './api.references.students.vue';
import ApiRefProfessors from './api.references.professors.vue';
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
const editInnerScheduleDialog = ref();
const fieldDetailsLocationsComponent = ref();

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

  // inner schedules dont have id, create one from timestamp+frequency+location.id;
  fieldInnerSchedules.value.forEach(
    (item) =>
      (item.id = {
        frequency: item.frequency,
        timestamp: item.timestamp,
        location: item.location?.id,
      })
  );

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

function onAddUpdateFieldLocation(itemData, newObjs, removeIDs) {
  // on add schedules dialog
  // on add ApiFieldDetails calling updateField with actual objects instead of ids
  itemData.location = newObjs?.length > 0 ? newObjs[0] : { id: '', status: 'pending', name: '', address: '' };
}

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
