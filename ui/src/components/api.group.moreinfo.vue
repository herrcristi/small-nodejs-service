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
        <v-col cols="12" md="10">
          <!-- list using table -->

          <ApiRefStudents
            ref="fieldDetailsStudentsComponent"
            :titleAdd="itemDetails.name"
            :items="fieldStudents"
            :apiFn="{
              updateField: updateFieldStudents,
              deleteField: deleteFieldStudent,
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
import ApiRefStudents from './api.references.students.vue';
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
