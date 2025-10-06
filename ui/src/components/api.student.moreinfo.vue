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

    <!-- 
      field groups 
    -->

    <!-- list using v-chip -->
    <div class="pa-1" v-if="type == 'v-chip' && read && app?.rolesPermissions?.groupss?.read">
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
    <v-card-text>
      <v-row v-if="type == 'table'" class="d-flex justify-end">
        <v-col cols="12" md="8">
          <v-card>
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
const read = app?.rolesPermissions?.students?.read || 0;
const write = app?.rolesPermissions?.students?.write || 0;

/**
 * field groups
 */
const fieldDetailsGroupsComponent = ref();
const fieldGroups = ref([]);

/**
 * ApiDetails events after get details
 */
async function onItemDetails(data) {
  Object.keys(itemDetails.value).forEach((k) => delete itemDetails[k]);
  Object.assign(itemDetails.value, data);

  fieldGroups.value = itemDetails.value.groups || [];
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
</script>

<style scoped></style>
