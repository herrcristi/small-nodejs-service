<template>
  <!-- 
    field students 
  -->

  <!-- list using v-chip -->
  <div class="pa-1" v-if="type == 'v-chip' && read && readStudents">
    <v-card-title class="d-flex justify-space-between">
      <div>{{ t(title) }}</div>
    </v-card-title>

    <v-card-text>
      <v-chip-group selected-class="text-primary" column text="chip">
        <template v-for="s in items" :key="s.id">
          <v-chip>
            {{ s.user.name }}
          </v-chip>
        </template>
      </v-chip-group>
    </v-card-text>
  </div>

  <!-- list using v-card -->
  <v-container fluid v-if="type == 'v-card' && read && readStudents">
    <v-card-title class="d-flex justify-space-between">
      <div>{{ t(title) }}</div>
    </v-card-title>

    <v-row dense>
      <template v-for="s in items" :key="s.id" small>
        <v-col cols="12" md="6">
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
  <v-card v-if="type == 'v-table'">
    <ApiFieldDetails
      ref="fieldDetailsComponent"
      :title="title"
      :titleAdd="titleAdd"
      :items="items"
      :fields="['user.name', 'user.status', 'user.email']"
      :projectionFields="['user.name', 'user.status', 'user.email']"
      :sortFields="['user.name', 'user.status', 'user.email']"
      :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
      :apiFn="{
        getAll: Api.getStudents,
        getAllParams: apiFn.getAllParams,
        updateField: apiFn.updateField,
        deleteField: apiFn.deleteField,
      }"
      :read="read && readStudents"
      :write="write && writeStudents"
      :loading="loading"
      :nodatatext="nodatatext"
    ></ApiFieldDetails>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ApiFieldDetails from './api.base.field.details.vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const props = defineProps({
  items: { type: Array, default: [] },

  title: { type: String, default: 'students' },
  titleAdd: { type: String, default: '' },
  loading: { type: [Boolean, Number], default: true },
  nodatatext: { type: String, default: '' },

  read: { type: [Boolean, Number], default: null },
  write: { type: [Boolean, Number], default: null },

  apiFn: { type: Object, default: {} }, // getAllParams, updateField, deleteField

  type: { type: String, default: 'v-table' }, // v-table, v-chip, v-card
});

const app = useAppStore();
const readStudents = app?.rolesPermissions?.students?.read;
const writeStudents = app?.rolesPermissions?.students?.write;

const fieldDetailsComponent = ref();

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
