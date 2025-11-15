<template>
  <v-card v-if="props.write">
    <!-- 
          dialog
    -->
    <v-dialog v-model="dialog" max-width="800px" v-if="props.write && (props.apiFn?.create || props.apiFn?.update)">
      <v-card>
        <v-card-title>{{ editing ? t('edit') : t('add') }}</v-card-title>

        <v-card-text>
          <v-form ref="editForm" v-model="formValid">
            <slot name="edit.name" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-text-field
                v-if="fieldsSet.has('name') || fieldsSet.has('user.name')"
                v-model="itemData.name"
                :label="t('name')"
                :rules="[nameRule]"
                required
              />
            </slot>

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

            <slot name="edit.email" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-text-field
                v-if="fieldsSet.has('email') || fieldsSet.has('user.email')"
                v-model="itemData.email"
                :label="t('email')"
                :rules="[emailRule]"
                required
              />
            </slot>

            <slot name="edit.credits" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-text-field
                v-if="fieldsSet.has('credits')"
                v-model.number="itemData.credits"
                type="number"
                :label="t('credits')"
                :rules="[creditsRule]"
                min="1"
                required
              />
            </slot>

            <slot name="edit.required" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-select
                v-if="fieldsSet.has('required')"
                v-model="itemData.required"
                :items="requiredItems"
                item-title="title"
                item-value="value"
                :label="t('required')"
                :rules="[requiredRule]"
                required
              />
            </slot>

            <slot name="edit.address" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-text-field
                v-if="fieldsSet.has('address')"
                v-model="itemData.address"
                :label="t('address')"
                :rules="[addressRule]"
                required
              />
            </slot>

            <slot name="edit.class" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-text-field
                v-if="fieldsSet.has('class')"
                v-model="itemData.class.id"
                :label="t('class')"
                :rules="[classRule]"
                required
              />
            </slot>

            <slot name="edit.location" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-text-field
                v-if="fieldsSet.has('location')"
                v-model="itemData.location.id"
                :label="t('location')"
                :rules="[locationRule]"
                required
              />
            </slot>

            <slot name="edit.description" :itemData="itemData" :fieldsSet="fieldsSet">
              <v-text-field
                v-if="fieldsSet.has('description')"
                v-model="itemData.description"
                :label="t('description')"
                required
              />
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
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ComponentsUtils from './components.utils.js';
const { t } = useI18n();

/**
 * state
 */
const props = defineProps({
  title: { type: [String], default: null },
  addFields: { type: Array, default: [] },
  editFields: { type: Array, default: [] },

  write: { type: [Boolean, Number], default: null },

  apiFn: { type: Object, default: {} }, // add, update
});

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

/**
 * emit
 */
const emit = defineEmits(['cancel', 'save']);

/**
 * fields
 */
const fieldsSet = ref(new Set([]));

/**
 * frequency items for the select - once, weekly, biWeekly, monthly
 */
const frequencyItems = computed(() => ComponentsUtils.Edit.frequencyItems(t));

const frequencyDates = computed(() => ComponentsUtils.Edit.frequencyDates(t));

const frequencyDays = computed(() => ComponentsUtils.Edit.frequencyDays(t));

const frequencyHours = computed(() => ComponentsUtils.Edit.frequencyHours(t));

/**
 * status items for the select
 */
const statusItems = computed(() =>
  ComponentsUtils.Edit.statusItems(t, {
    skipPending: editing.value,
  })
);

/**
 * required items for the select
 */
const requiredItems = computed(() => ComponentsUtils.Edit.requiredItems(t));

/**
 * rules
 */
const nameRule = (v) => ComponentsUtils.Edit.Rules.name(v, t);
const statusRule = (v) => ComponentsUtils.Edit.Rules.status(v, t);
const emailRule = (v) => ComponentsUtils.Edit.Rules.email(v, t);
const addressRule = (v) => ComponentsUtils.Edit.Rules.address(v, t);
const creditsRule = (v) => ComponentsUtils.Edit.Rules.credits(v, t);
const requiredRule = (v) => ComponentsUtils.Edit.Rules.required(v, t);
const classRule = (v) => ComponentsUtils.Edit.Rules.required(v, t);
const locationRule = (v) => ComponentsUtils.Edit.Rules.required(v, t);
const frequencyRule = (v) => ComponentsUtils.Edit.Rules.required(v, t);

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
  ComponentsUtils.Edit.trimFields(itemData, ['name', 'email', 'description']);

  // payload
  const payload = { ...itemData };
  const snackbarO = { ref: snackbar, text: snackbarText, color: snackbarColor };

  if (payload.class?.id) {
    payload.class = payload.class.id;
  }
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
    ok = await ComponentsUtils.Edit.update(props.apiFn, editingItemID.value, payload, snackbarO, t);
  } else {
    ok = await ComponentsUtils.Edit.add(props.apiFn, payload, snackbarO, t);
  }

  if (ok) {
    dialog.value = false;
    resetForm();

    emit('save');
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
  fieldsSet.value = new Set(props.addFields);

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
    itemData.frequencyDay = new Date(itemData.frequencyTimestamp).getUTCDay() + '';
    itemData.frequencyDate = new Date(itemData.frequencyTimestamp).getUTCDate() + '';
    itemData.frequencyTime = new Date(itemData.frequencyTimestamp).toISOString().substring(11, 16);
  }
  if (fieldsSet.value.has('status')) {
    itemData.status = 'active';
  }
  if (fieldsSet.value.has('user.status')) {
    itemData.status = 'pending';
  }
  if (fieldsSet.value.has('credits')) {
    itemData.credits = 0;
  }
  if (fieldsSet.value.has('required')) {
    itemData.required = 'required';
  }
  if (fieldsSet.value.has('class')) {
    itemData.class = { id: '', status: 'pending', name: '' };
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
  fieldsSet.value = new Set(props.editFields);

  // set
  if (fieldsSet.value.has('name') || fieldsSet.value.has('user.name')) {
    itemData.name = item.name || item.user?.name || '';
  }
  if (fieldsSet.value.has('email') || fieldsSet.value.has('user.email')) {
    itemData.email = item.email || item.user?.email || '';
  }
  if (fieldsSet.value.has('frequency')) {
    itemData.frequency = item.frequency || 'weekly';
  }
  if (fieldsSet.value.has('frequencyTimestamp')) {
    itemData.frequencyTimestamp = item.timestamp;
    itemData.frequencyDay = new Date(itemData.frequencyTimestamp).getUTCDay() + '';
    itemData.frequencyDate = new Date(itemData.frequencyTimestamp).getUTCDate() + '';
    itemData.frequencyTime = new Date(itemData.frequencyTimestamp).toISOString().substring(11, 16);
  }
  if (fieldsSet.value.has('status') || fieldsSet.value.has('user.status')) {
    itemData.status = item.status || item.user?.status || 'active';
  }
  if (fieldsSet.value.has('description')) {
    itemData.description = item.description || '';
  }
  if (fieldsSet.value.has('credits')) {
    itemData.credits = Number(item.credits || 0);
  }
  if (fieldsSet.value.has('required')) {
    itemData.required = item.required || 'required';
  }
  if (fieldsSet.value.has('address')) {
    itemData.address = item.address || '';
  }
  if (fieldsSet.value.has('class')) {
    itemData.class = item.class || { id: '', status: 'pending', name: '' };
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

  emit('cancel');
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
 * mounted
 */
function mounted() {}

/**
 * expose
 */
defineExpose({ openAdd, openEdit, closeDialog });
</script>

<style scoped>
/* component styles */
</style>
