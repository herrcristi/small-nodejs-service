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
      @loading="loading"
      @nodatatext="nodatatext"
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
          field students 
      -->
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
const read = app?.rolesPermissions?.groups?.read || 0;
const write = app?.rolesPermissions?.groups?.write || 0;

/**
 * field students
 */
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

  fieldStudents.value = itemDetails.value.students || [];
}

/**
 * close details dialog
 */
function closeDialog() {
  fieldDetailsStudentsComponent.value.clear();
  emit('close');
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
