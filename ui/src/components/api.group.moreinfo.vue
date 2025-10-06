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
        get: Api.getGroup,
      }"
      @loading="loading = $event"
      @nodatatext="nodatatext = $event"
      @item="onItemDetails($event)"
    ></ApiDetails>

    <!-- 
      field students 
    -->
    <v-card-text>
      <v-row class="d-flex justify-end">
        <v-col cols="12" md="8">
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
const read = app?.rolesPermissions?.groups?.read || 0;
const write = app?.rolesPermissions?.groups?.write || 0;

/**
 * field students
 */
const fieldDetailsStudentsComponent = ref();
const fieldStudents = ref([]);

/**
 * ApiDetails events after get details
 */
async function onItemDetails(data) {
  Object.keys(itemDetails.value).forEach((k) => delete itemDetails[k]);
  Object.assign(itemDetails.value, data);

  fieldStudents.value = itemDetails.value.students || [];
}

/**
 * ApiFieldDetails calling deleteField
 */
async function deleteFieldStudent(studentID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateGroupStudents(props.itemID, [], [studentID]);

  // no need for server call
  fieldStudents.value = fieldStudents.value.filter((item) => item.id !== studentID);
}

/**
 * ApiFieldDetails calling updateField
 */
async function updateFieldStudents(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateGroupStudents(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}
</script>

<style scoped></style>
