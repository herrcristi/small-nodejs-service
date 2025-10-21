<template>
  <!-- 
      field (inner) schedules 
  -->

  <!-- list using v-chip -->
  <div class="pa-1" v-if="type == 'v-chip' && read && app?.rolesPermissions?.locations?.read">
    <v-card-title class="d-flex justify-space-between">
      <div>{{ t(title) }}</div>
    </v-card-title>

    <v-card-text>
      <v-chip-group selected-class="text-primary" column text="chip">
        <template v-for="s in fieldInnerSchedules" :key="s.id">
          <v-chip>
            {{ s.frequency }}, {{ getInnerScheduleTime(s.frequency, s.timestamp) }}, {{ s.location.name }}</v-chip
          >
        </template>
      </v-chip-group>
    </v-card-text>
  </div>

  <!-- list using v-card -->
  <v-container fluid v-if="type == 'v-card' && read && app?.rolesPermissions?.locations?.read">
    <v-card-title class="d-flex justify-space-between">
      <div>{{ t(title) }}</div>
    </v-card-title>

    <v-row dense>
      <template v-for="s in fieldInnerSchedules" :key="s.id" small>
        <v-col cols="12" md="10">
          <v-card>
            <v-card-title> {{ s.location.name }} </v-card-title>
            <v-card-subtitle> {{ s.frequency }}, {{ getInnerScheduleTime(s.frequency, s.timestamp) }} </v-card-subtitle>
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
      ref="fieldDetailsComponent"
      :title="title"
      :titleAdd="titleAdd"
      :items="items"
      :fields="['frequency', 'status', 'timestamp', 'location.name', 'location.address']"
      :projectionFields="['frequency', 'status', 'timestamp', 'location']"
      :sortFields="['frequency', 'status', 'timestamp', 'location.name', 'location.address']"
      :filterFields="['frequency', 'status', 'timestamp', 'location.name', 'location.address']"
      :apiFn="{
        updateField: apiFn.updateField,
        deleteField: apiFn.deleteField,
      }"
      :emitEdit="true"
      @editItem="editInnerScheduleDialog.openEdit($event)"
      :read="read && readSchedules"
      :write="write && writeSchedules"
      :loading="loading"
      :nodatatext="nodatatext"
    >
      <!-- timestamp -->
      <template v-slot:item.timestamp="{ item }">
        {{ getInnerScheduleTime(item.frequency, item.timestamp) }}
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
    :title="title"
    :addFields="['frequency', 'status', 'frequencyTimestamp', 'location']"
    :editFields="['frequency', 'status', 'frequencyTimestamp', 'location']"
    :apiFn="{
      add: 1,
      create: apiFn.addField,
      update: apiFn.updateField,
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
        :projectionFields="['name', 'status', 'address']"
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
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ApiFieldDetails from './api.base.field.details.vue';
import ApiEditItem from './api.base.edit.item.vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const props = defineProps({
  items: { type: Array, default: [] },

  title: { type: String, default: 'schedules' },
  titleAdd: { type: String, default: '' },
  loading: { type: [Boolean, Number], default: true },
  nodatatext: { type: String, default: '' },

  read: { type: [Boolean, Number], default: null },
  write: { type: [Boolean, Number], default: null },

  apiFn: { type: Object, default: {} }, // getAllParams, updateField, deleteField

  type: { type: String, default: 'v-table' }, // v-table, v-chip, v-card
});

const app = useAppStore();
const readSchedules = app?.rolesPermissions?.schedules?.read;
const writeSchedules = app?.rolesPermissions?.schedules?.write;

const fieldDetailsComponent = ref();

const editInnerScheduleDialog = ref();
const fieldDetailsLocationsComponent = ref();

/**
 * ApiFieldDetails calling inner schedules getAll / deleteField / updateField
 */
function onAddUpdateFieldLocation(itemData, newObjs, removeIDs) {
  // on add schedules dialog
  // on add ApiFieldDetails calling updateField with actual objects instead of ids
  itemData.location = newObjs?.length > 0 ? newObjs[0] : { id: '', status: 'pending', name: '', address: '' };
}

function getInnerScheduleTime(frequency, timestamp) {
  try {
    const d = new Date(timestamp);

    let options = {};
    switch (frequency) {
      case 'weekly':
      case 'biweekly':
        // weekday + time
        options = {
          weekday: 'short',
          hour: 'numeric',
          minute: 'numeric',
          timeZone: 'UTC',
        };
        break;

      case 'monthly':
        // date + time
        options = {
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          timeZone: 'UTC',
        };
        break;

      case 'once':
      default:
        // full date + time
        options = {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          timeZone: 'UTC',
        };
        break;
    }

    const rtime = d.toLocaleDateString(undefined, options);
    return rtime;
  } catch (e) {
    console.log('Error getting timestamp', e);
    return '';
  }
}

/**
 * clear
 */
async function clear() {
  fieldDetailsComponent.value.clear();
}

/**
 * expose
 */
defineExpose({ clear });
</script>

<style scoped></style>
