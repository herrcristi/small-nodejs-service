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
        get: Api.getStudent,
      }"
      @loading="loading = $event"
      @nodatatext="nodatatext = $event"
      @item="onItemDetails($event)"
    ></ApiDetails>

    <v-card-text>
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
        <!-- 
          field classes 
         -->
        <v-col cols="12" md="10">
          <ApiRefClasses
            ref="fieldDetailsClassesComponent"
            :titleAdd="itemDetails.name"
            :items="fieldClasses"
            :apiFn="{
              updateField: updateFieldClasses,
              deleteField: deleteFieldClass,
            }"
            :type="type"
            :read="read"
            :write="write"
            :loading="loading"
            :nodatatext="nodatatext"
          >
          </ApiRefClasses>
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
const read = app?.rolesPermissions?.students?.read || 0;
const write = app?.rolesPermissions?.students?.write || 0;

/**
 * field groups
 */
const fieldDetailsGroupsComponent = ref();
const fieldGroups = ref([]);

/**
 * field classes
 */
const fieldDetailsClassesComponent = ref();
const fieldClasses = ref([]);

/**
 * ApiDetails events after get details
 */
async function onItemDetails(data) {
  Object.keys(itemDetails.value).forEach((k) => delete itemDetails[k]);
  Object.assign(itemDetails.value, data);

  fieldGroups.value = itemDetails.value.groups || [];
  fieldClasses.value = itemDetails.value.classes || [];
}

/**
 * ApiFieldDetails calling deleteField
 */
async function deleteFieldGroup(groupID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateGroupStudents(groupID, [], [props.itemID]);

  // no need for server call
  fieldGroups.value = fieldGroups.value.filter((item) => item.id !== groupID);
}

/**
 * ApiFieldDetails calling updateField
 */
async function updateFieldGroups(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  for (const groupID of newIDs) {
    await Api.updateGroupStudents(groupID, [props.itemID], []);
  }
  for (const groupID of removeIDs) {
    await Api.updateGroupStudents(groupID, [], [props.itemID]);
  }

  // refresh
  await detailsComponent.value.refresh();
}

/**
 * ApiFieldDetails calling deleteField
 */
async function deleteFieldClass(classID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateStudentClasses(props.itemID, [], [classID]);

  // no need for server call
  fieldClasses.value = fieldClasses.value.filter((item) => item.id !== classID);
}

/**
 * ApiFieldDetails calling updateField
 */
async function updateFieldClasses(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateStudentClasses(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}
</script>

<style scoped></style>
