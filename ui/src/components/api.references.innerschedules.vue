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
      :fields="apiFields.fields"
      :projectionFields="apiFields.projectionFields"
      :sortFields="apiFields.sortFields"
      :filterFields="apiFields.filterFields"
      :apiFn="{
        updateField: apiFn.updateField,
        deleteField: apiFn.deleteField,
      }"
      :emitEdit="true"
      @editItem="openEdit($event)"
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
          @click="openAdd()"
          v-if="write && app?.rolesPermissions?.locations?.write"
        ></v-btn>
      </template>
    </ApiFieldDetails>
  </v-card>

  <!-- 
      edit dialog
  -->
  <v-card v-if="props.write">
    <v-dialog
      v-model="dialog"
      max-width="800px"
      :title="title"
      v-if="props.write && app?.rolesPermissions?.locations?.write"
    >
      <v-card>
        <v-card-title>{{ editing ? t('edit') : t('add') }}</v-card-title>

        <v-card-text>
          <v-form ref="editForm" v-model="formValid">
            <slot name="edit.frequency" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-select
                v-if="fieldsSet.has('frequency')"
                v-model="itemData.frequency"
                :items="frequencyItems"
                item-title="title"
                item-value="value"
                :label="t('frequency')"
                :rules="[frequencyRule]"
                required
              />
            </slot>

            <slot name="edit.frequencyTimestamp" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-row v-if="fieldsSet.has('frequencyTimestamp')">
                <v-col v-if="itemData.frequency === 'once'">
                  <v-text-field
                    v-if="fieldsSet.has('frequencyTimestamp')"
                    v-model="itemData.frequencyTimestamp"
                    :label="t('frequencyTimestamp')"
                    required
                  />
                </v-col>
                <v-col v-if="itemData.frequency === 'monthly'">
                  <v-select
                    v-model="itemData.frequencyDate"
                    :items="frequencyDates"
                    item-title="title"
                    item-value="value"
                    :label="t('dayofmonth')"
                    :rules="[frequencyRule]"
                    required
                  />
                </v-col>
                <v-col v-if="itemData.frequency === 'weekly' || itemData.frequency === 'biWeekly'">
                  <v-select
                    v-model="itemData.frequencyDay"
                    :items="frequencyDays"
                    item-title="title"
                    item-value="value"
                    :label="t('dayofweek')"
                    :rules="[frequencyRule]"
                    required
                  />
                </v-col>
                <v-col v-if="itemData.frequency !== 'once'">
                  <v-select
                    v-model="itemData.frequencyTime"
                    :items="frequencyHours"
                    item-title="title"
                    item-value="value"
                    :label="t('timeofday')"
                    :rules="[frequencyRule]"
                    required
                  />
                </v-col>
              </v-row>
            </slot>

            <slot name="edit.status" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-select
                v-if="fieldsSet.has('status') || fieldsSet.has('user.status')"
                v-model="itemData.status"
                :items="statusItems"
                item-title="title"
                item-value="value"
                :label="t('status')"
                :rules="[statusRule]"
                required
              />
            </slot>

            <!-- 
                add location 
            -->
            <slot name="edit.location" :itemData="itemData" :fieldsSet="fieldsSet">
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
                :write="write && app?.rolesPermissions?.locations?.write"
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
            </slot>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">{{ t('cancel') }}</v-btn>
          <v-btn color="primary" :disabled="!formValid" @click="handleSubmit">{{ t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 
      snackbar for notifications
    -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
  </v-card>

  <!-- </ApiEditItem> -->
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ApiFieldDetails from './api.base.field.details.vue';
import ApiEditItem from './api.base.edit.item.vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
import ComponentsUtils from './components.utils.js';
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

/**
 * fields
 */
const apiFields = {
  fields: ['frequency', 'status', 'timestamp', 'location.name', 'location.address'],
  projectionFields: ['frequency', 'status', 'timestamp', 'location'],
  sortFields: ['frequency', 'status', 'timestamp', 'location.name', 'location.address'],
  filterFields: ['frequency', 'status', 'timestamp', 'location.name', 'location.address'],
  addFields: ['frequency', 'status', 'frequencyTimestamp', 'location'],
  editFields: ['frequency', 'status', 'frequencyTimestamp', 'location'],
};

const fieldsSet = ref(new Set([]));

const apiFnLocation = {
  add: 1,
  create: props.apiFn.addField,
  update: props.apiFn.updateField,
  delete: 0,
};

/**
 * edit
 */
const itemData = reactive({});
const editing = ref(false);
const editingItemID = ref(null);
const dialog = ref(false);
const editForm = ref(null);
const formValid = ref(false);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

const fieldDetailsComponent = ref();
const fieldDetailsLocationsComponent = ref();

/**
 * frequency items for the select - once, weekly, biWeekly, monthly
 */
const frequencyItems = computed(() => ComponentsUtils.Edit.frequencyItems(t));

const frequencyDates = computed(() => ComponentsUtils.Edit.frequencyDates(t));

const frequencyDays = computed(() => ComponentsUtils.Edit.frequencyDays(t));

const frequencyHours = computed(() => ComponentsUtils.Edit.frequencyHours(t));

/**
 * status items
 */
const statusItems = computed(() =>
  ComponentsUtils.Edit.statusItems(t, {
    skipPending: editing.value,
  })
);

/**
 * rules
 */
const statusRule = (v) => ComponentsUtils.Edit.Rules.status(v, t);
const locationRule = (v) => ComponentsUtils.Edit.Rules.required(v, t);
const frequencyRule = (v) => ComponentsUtils.Edit.Rules.required(v, t);

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
 * get the frequency hours and mins rounded at 15 mins
 */
function getFreqHoursMins(freqDate) {
  const hours = freqDate.getUTCHours();
  const mins = Math.floor((freqDate.getUTCMinutes() + 14) / 15) * 15;
  return (
    (mins === 60 ? (hours + 1) % 24 : hours).toString().padStart(2, '0') + ':' + (mins % 60).toString().padStart(2, '0')
  );
}

/**
 * handle submit
 */
async function handleSubmit() {
  if (editForm.value && typeof editForm.value.validate === 'function') {
    const ok = await editForm.value.validate();
    if (!ok) {
      return;
    }
  }

  // trim
  ComponentsUtils.Edit.trimFields(itemData, ['name']);

  // payload
  const payload = { ...itemData };
  const snackbarO = { ref: snackbar, text: snackbarText, color: snackbarColor };

  if (payload.location?.id) {
    payload.location = payload.location.id;
  }
  if (payload.frequencyTimestamp) {
    try {
      const d = new Date(payload.frequencyTimestamp || Date.now());
      let day = d.getUTCDate();
      switch (payload.frequency) {
        case 'monthly':
          d.setUTCDate(Number(payload.frequencyDate));
          d.setUTCHours(Number(payload.frequencyTime.substring(0, 2)));
          d.setUTCMinutes(Number(payload.frequencyTime.substring(3, 5)));
          break;

        case 'weekly':
        case 'biWeekly':
          day = d.getUTCDate() - 7 - d.getUTCDay() + Number(payload.frequencyDay);
          d.setUTCDate(day <= 0 ? day + 14 : day);
          d.setUTCHours(Number(payload.frequencyTime.substring(0, 2)));
          d.setUTCMinutes(Number(payload.frequencyTime.substring(3, 5)));
          break;

        case 'once':
        default:
          // nothing to change
          break;
      }
      payload.timestamp = d.toISOString();
    } catch (e) {
      console.log('Error parsing date:', e);
      const errText = e.response?.data?.error?.toString() || e.toString();

      snackbarO.text.value = (t('edit.error') || 'Error') + ' - ' + errText;
      snackbarO.color.value = 'error';
      snackbarO.ref.value = true;
      return;
    }

    delete payload.frequencyTimestamp;
  }

  // add/update
  let ok = false;
  if (editing.value) {
    ok = await ComponentsUtils.Edit.update(apiFnLocation, editingItemID.value, payload, snackbarO, t);
  } else {
    ok = await ComponentsUtils.Edit.add(apiFnLocation, payload, snackbarO, t);
  }

  if (ok) {
    dialog.value = false;
    resetForm();
  }
}

/**
 * open add dialog
 */
function openAdd() {
  if (!props.write) {
    return;
  }

  resetForm();
  fieldsSet.value = new Set(apiFields.addFields);

  // defaults for new
  // defaults for new
  if (fieldsSet.value.has('frequency')) {
    itemData.frequency = 'weekly';
  }
  if (fieldsSet.value.has('frequencyTimestamp')) {
    const d = new Date();
    itemData.frequencyTimestamp = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      seconds: 'numeric',
      timeZone: 'UTC',
    });
    const freqDate = new Date(itemData.frequencyTimestamp);
    itemData.frequencyDay = freqDate.getUTCDay() + '';
    itemData.frequencyDate = freqDate.getUTCDate() + '';
    itemData.frequencyTime = getFreqHoursMins(freqDate);
  }
  if (fieldsSet.value.has('status')) {
    itemData.status = 'active';
  }
  if (fieldsSet.value.has('location')) {
    itemData.location = { id: '', status: 'pending', name: '', address: '' };
  }

  editing.value = false;
  dialog.value = true;
}

/**
 * open edit dialog
 */
function openEdit(item) {
  if (!props.write) {
    return;
  }

  resetForm();
  fieldsSet.value = new Set(apiFields.editFields);

  // set
  if (fieldsSet.value.has('frequency')) {
    itemData.frequency = item.frequency || 'weekly';
  }
  if (fieldsSet.value.has('frequencyTimestamp')) {
    itemData.frequencyTimestamp = item.timestamp;
    const freqDate = new Date(itemData.frequencyTimestamp);
    itemData.frequencyDay = freqDate.getUTCDay() + '';
    itemData.frequencyDate = freqDate.getUTCDate() + '';
    itemData.frequencyTime = getFreqHoursMins(freqDate);
  }
  if (fieldsSet.value.has('status')) {
    itemData.status = item.status || 'active';
  }
  if (fieldsSet.value.has('location')) {
    itemData.location = item.location || { id: '', status: 'pending', name: '', address: '' };
  }

  editing.value = true;
  editingItemID.value = item.id;
  dialog.value = true;
}

/**
 * close dialog
 */
function closeDialog() {
  dialog.value = false;
  resetForm();
}

/**
 * reset form
 */
function resetForm() {
  Object.keys(itemData).forEach((k) => delete itemData[k]);
  fieldsSet.value = new Set([]);

  editing.value = false;
  editingItemID.value = null;
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
