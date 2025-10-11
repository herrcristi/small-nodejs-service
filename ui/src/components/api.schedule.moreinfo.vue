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
        <!-- 
          field classes 
         -->
        <v-col cols="12" md="6">
          <!-- list using v-chip -->
          <div class="pa-1" v-if="type == 'v-chip' && read && app?.rolesPermissions?.classes?.read">
            <v-card-title class="d-flex justify-space-between">
              <div>{{ t('classes') }}</div>
            </v-card-title>

            <v-card-text>
              <v-chip-group selected-class="text-primary" column text="chip">
                <template v-for="s in fieldClasses" :key="s.id">
                  <v-chip>
                    {{ s.name }}
                  </v-chip>
                </template>
              </v-chip-group>
            </v-card-text>
          </div>

          <!-- list using v-card -->

          <v-container fluid v-if="type == 'v-card' && read && app?.rolesPermissions?.classes?.read">
            <v-card-title class="d-flex justify-space-between">
              <div>{{ t('classes') }}</div>
            </v-card-title>

            <v-row dense>
              <template v-for="s in fieldClasses" :key="s.id" small>
                <v-col cols="12" md="3">
                  <v-card>
                    <v-card-title>
                      {{ s.name }}
                    </v-card-title>
                  </v-card>
                </v-col>
              </template>
            </v-row>
          </v-container>

          <!-- list using table -->

          <v-card v-if="type == 'table'">
            <ApiFieldDetails
              ref="fieldDetailsClassesComponent"
              title="classes"
              :titleAdd="itemDetails.name"
              :items="fieldClasses"
              :fields="['name', 'status']"
              :projectionFields="['name', 'status', 'description']"
              :sortFields="['name', 'status']"
              :filterFields="['name', '_lang_en.status', 'description']"
              :apiFn="{
                getAll: Api.getClasses,
                updateField: updateFieldClasses,
                deleteField: deleteFieldClass,
              }"
              :read="read && app?.rolesPermissions?.classes?.read"
              :write="write && app?.rolesPermissions?.classes?.write"
              :loading="loading"
              :nodatatext="nodatatext"
            ></ApiFieldDetails>
          </v-card>
        </v-col>

        <!-- 
            field groups 
          -->
        <v-col cols="12" md="6">
          <!-- list using v-chip -->
          <div class="pa-1" v-if="type == 'v-chip' && read && app?.rolesPermissions?.groups?.read">
            <v-card-title class="d-flex justify-space-between">
              <div>{{ t('groups') }}</div>
            </v-card-title>

            <v-card-text>
              <v-chip-group selected-class="text-primary" column text="chip">
                <template v-for="s in fieldGroups" :key="s.id">
                  <v-chip>
                    {{ s.name }}
                  </v-chip>
                </template>
              </v-chip-group>
            </v-card-text>
          </div>

          <!-- list using v-card -->

          <v-container fluid v-if="type == 'v-card' && read && app?.rolesPermissions?.groups?.read">
            <v-card-title class="d-flex justify-space-between">
              <div>{{ t('groups') }}</div>
            </v-card-title>

            <v-row dense>
              <template v-for="s in fieldGroups" :key="s.id" small>
                <v-col cols="12" md="3">
                  <v-card>
                    <v-card-title>
                      {{ s.name }}
                    </v-card-title>
                  </v-card>
                </v-col>
              </template>
            </v-row>
          </v-container>

          <!-- list using table -->
          <v-card v-if="type == 'table'">
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
                getAll: Api.getGroups,
                updateField: updateFieldGroups,
                deleteField: deleteFieldGroup,
              }"
              :read="read && app?.rolesPermissions?.groups?.read"
              :write="write && app?.rolesPermissions?.groups?.write"
              :loading="loading"
              :nodatatext="nodatatext"
            ></ApiFieldDetails>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="d-flex justify-end">
        <!-- 
          field professors 
        -->
        <v-col cols="12" md="6">
          <!-- list using v-chip -->
          <div class="pa-1" v-if="type == 'v-chip' && read && app?.rolesPermissions?.professors?.read">
            <v-card-title class="d-flex justify-space-between">
              <div>{{ t('professors') }}</div>
            </v-card-title>

            <v-card-text>
              <v-chip-group selected-class="text-primary" column text="chip">
                <template v-for="s in fieldProfessors" :key="s.id">
                  <v-chip>
                    {{ s.user.name }}
                  </v-chip>
                </template>
              </v-chip-group>
            </v-card-text>
          </div>

          <!-- list using v-card -->

          <v-container fluid v-if="type == 'v-card' && read && app?.rolesPermissions?.professors?.read">
            <v-card-title class="d-flex justify-space-between">
              <div>{{ t('professors') }}</div>
            </v-card-title>

            <v-row dense>
              <template v-for="s in fieldProfessors" :key="s.id" small>
                <v-col cols="12" md="3">
                  <v-card>
                    <v-card-title>
                      {{ s.user.name }}
                    </v-card-title>
                    <v-card-subtitle>
                      {{ s.user.email }}
                    </v-card-subtitle>
                  </v-card>
                </v-col>
              </template>
            </v-row>
          </v-container>

          <!-- list using table -->

          <v-card v-if="type == 'table'">
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
                getAll: Api.getProfessors,
                updateField: updateFieldProfessors,
                deleteField: deleteFieldProfessor,
              }"
              :read="read && app?.rolesPermissions?.professors?.read"
              :write="write && app?.rolesPermissions?.professors?.write"
              :loading="loading"
              :nodatatext="nodatatext"
            ></ApiFieldDetails>
          </v-card>
        </v-col>

        <!-- 
          field students 
        -->
        <v-col cols="12" md="6">
          <!-- list using v-chip -->
          <div class="pa-1" v-if="type == 'v-chip' && read && app?.rolesPermissions?.students?.read">
            <v-card-title class="d-flex justify-space-between">
              <div>{{ t('students') }}</div>
            </v-card-title>

            <v-card-text>
              <v-chip-group selected-class="text-primary" column text="chip">
                <template v-for="s in fieldStudents" :key="s.id">
                  <v-chip>
                    {{ s.user.name }}
                  </v-chip>
                </template>
              </v-chip-group>
            </v-card-text>
          </div>

          <!-- list using v-card -->

          <v-container fluid v-if="type == 'v-card' && read && app?.rolesPermissions?.students?.read">
            <v-card-title class="d-flex justify-space-between">
              <div>{{ t('students') }}</div>
            </v-card-title>

            <v-row dense>
              <template v-for="s in fieldStudents" :key="s.id" small>
                <v-col cols="12" md="3">
                  <v-card>
                    <v-card-title>
                      {{ s.user.name }}
                    </v-card-title>
                    <v-card-subtitle>
                      {{ s.user.email }}
                    </v-card-subtitle>
                  </v-card>
                </v-col>
              </template>
            </v-row>
          </v-container>

          <!-- list using table -->

          <v-card v-if="type == 'table'">
            <ApiFieldDetails
              ref="fieldDetailsStudentsComponent"
              title="students"
              :titleAdd="itemDetails.name"
              :items="fieldStudents"
              :fields="['user.name', 'user.status', 'user.email']"
              :projectionFields="['user.name', 'user.status', 'user.email']"
              :sortFields="['user.name', 'user.status', 'user.email']"
              :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
              :apiFn="{
                getAll: Api.getStudents,
                updateField: updateFieldStudents,
                deleteField: deleteFieldStudent,
              }"
              :read="read && app?.rolesPermissions?.students?.read"
              :write="write && app?.rolesPermissions?.students?.write"
              :loading="loading"
              :nodatatext="nodatatext"
            ></ApiFieldDetails>
          </v-card> </v-col
      ></v-row>
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
  type: { type: String, default: 'table' }, // table, v-chip, v-card
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
 * ApiDetails events after get details
 */
async function onItemDetails(data) {
  Object.keys(itemDetails.value).forEach((k) => delete itemDetails[k]);
  Object.assign(itemDetails.value, data);

  fieldClasses.value = itemDetails.value.class ? [itemDetails.value.class] : null;
  fieldGroups.value = itemDetails.value.groups || [];
  fieldProfessors.value = itemDetails.value.professors || [];
  fieldStudents.value = itemDetails.value.students || [];
}

/**
 * ApiFieldDetails calling deleteField
 */
async function deleteFieldClass(classID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleClasses(props.itemID, [], [classID]);

  // no need for server call
  fieldClasses.value = fieldClasses.value.filter((item) => item.id !== classID);
}

/**
 * ApiFieldDetails calling updateField
 */
async function updateFieldClasses(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleClasses(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}

/**
 * ApiFieldDetails calling deleteField
 */
async function deleteFieldGroup(groupID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleGroups(props.itemID, [], [groupID]);

  // no need for server call
  fieldGroups.value = fieldGroups.value.filter((item) => item.id !== groupID);
}

/**
 * ApiFieldDetails calling updateField
 */
async function updateFieldGroups(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleGroups(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}
/**
 * ApiFieldDetails calling deleteField
 */
async function deleteFieldProfessor(professorID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleProfessors(props.itemID, [], [professorID]);

  // no need for server call
  fieldProfessors.value = fieldProfessors.value.filter((item) => item.id !== professorID);
}

/**
 * ApiFieldDetails calling updateField
 */
async function updateFieldProfessors(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleProfessors(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}
/**
 * ApiFieldDetails calling deleteField
 */
async function deleteFieldStudent(studentID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleStudents(props.itemID, [], [studentID]);

  // no need for server call
  fieldStudents.value = fieldStudents.value.filter((item) => item.id !== studentID);
}

/**
 * ApiFieldDetails calling updateField
 */
async function updateFieldStudents(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateScheduleStudents(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}
</script>

<style scoped></style>
