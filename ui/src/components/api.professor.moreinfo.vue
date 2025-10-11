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
        get: Api.getProfessor,
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
        <v-col cols="12" md="10">
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
                <v-col cols="12" md="6">
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

          <v-card v-if="type == 'v-table'">
            <ApiFieldDetails
              ref="fieldDetailsClassesComponent"
              title="classes"
              :titleAdd="itemDetails.name"
              :items="fieldClasses"
              :fields="['name', 'status', 'description']"
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
      </v-row>
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
  type: { type: String, default: 'v-table' }, // v-table, v-chip, v-card
});

const detailsComponent = ref();
const itemDetails = ref({});
const loading = ref(false);
const nodatatext = ref('');

const app = useAppStore();
const read = app?.rolesPermissions?.professors?.read || 0;
const write = app?.rolesPermissions?.professors?.write || 0;

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

  fieldClasses.value = itemDetails.value.classes || [];
}

/**
 * ApiFieldDetails calling deleteField
 */
async function deleteFieldClass(classID) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateProfessorClasses(props.itemID, [], [classID]);

  // no need for server call
  fieldClasses.value = fieldClasses.value.filter((item) => item.id !== classID);
}

/**
 * ApiFieldDetails calling updateField
 */
async function updateFieldClasses(newIDs, removeIDs) {
  // if fail will throw error and be catch in ApiFieldDetails
  await Api.updateProfessorClasses(props.itemID, newIDs, removeIDs);

  // refresh
  await detailsComponent.value.refresh();
}
</script>

<style scoped></style>
