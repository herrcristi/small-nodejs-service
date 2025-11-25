<template>
  <v-card v-if="read || write" :style="detailsOpen ? 'width:48%;display:inline-block;vertical-align:top;' : ''">
    <!-- 
          table
    -->
    <ApiTableServer
      ref="tableServer"
      title="schedules"
      :fields="apiFields.fields"
      :projectionFields="apiFields.projectionFields"
      :sortFields="apiFields.sortFields"
      :filterFields="apiFields.filterFields"
      :apiFn="apiFn"
      :read="read"
      :write="write"
      :details="details"
      :expand="expand"
      @addItem="openAdd($event)"
      @editItem="openEdit($event)"
      @detailsItem="openDetails($event)"
    >
      <!-- 
      more info
    -->
      <template v-slot:expanded-row="{ item, columns }">
        <tr v-if="!detailsOpen">
          <td :colspan="columns.length" class="py-2">
            <v-sheet rounded="lg" border>
              <ApiScheduleMoreInfo :itemID="item.id" type="v-table" />
            </v-sheet>
          </td>
        </tr>
      </template>
    </ApiTableServer>

    <!-- 
          edit dialog
    -->
    <v-card v-if="write">
      <v-dialog v-model="dialog" max-width="800px" v-if="write">
        <v-card>
          <v-card-title>
            {{ editing ? t('edit') : t('add') }}
          </v-card-title>

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

              <slot name="edit.status" :itemData="itemData" :fieldsSet="fieldsSet">
                <v-select
                  v-if="fieldsSet.has('status')"
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
                  add class 
              -->
              <slot name="edit.class" :itemData="itemData" :fieldsSet="fieldsSet">
                <ApiFieldDetails
                  v-if="fieldsSet.has('class')"
                  ref="fieldDetailsClassesComponent"
                  title="class"
                  titleAdd="classes"
                  :items="itemData.class?.id ? [itemData.class] : []"
                  :fields="['name', 'status', 'description']"
                  :apiFn="{
                    getAll: Api.getClasses,
                    deleteField: 0,
                    updateField: (newObjs, removeIDs) => onAddUpdateFieldClass(itemData, newObjs, removeIDs),
                  }"
                  :read="read && app?.rolesPermissions?.classes?.read"
                  :write="write && app?.rolesPermissions?.classes?.write"
                  :loading="false"
                  :nodatatext="''"
                  :selectStrategy="'single'"
                  :selectReturnObject="true"
                >
                </ApiFieldDetails>
                <v-input
                  v-if="fieldsSet.has('class') && !itemData.class?.id"
                  :messages="t('class.required')"
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

    <!-- drawer for details -->
    <v-card v-if="read || write">
      <v-navigation-drawer v-model="detailsOpen" right temporary width="620">
        <ApiScheduleDetails :itemID="selectedItemID" :itemName="selectedItemName" @close="closeDetails" />
      </v-navigation-drawer>
    </v-card>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import ApiTableServer from './api.base.table.server.vue';
import ApiFieldDetails from './api.base.field.details.vue';
import ApiScheduleDetails from './api.schedule.details.vue';
import ApiScheduleMoreInfo from './api.schedule.moreinfo.vue';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
import ComponentsUtils from './components.utils.js';
const { t } = useI18n();

/**
 * props
 */
const tableServer = ref();
const details = true; // true for details column
const expand = true; // true for expand column

const app = useAppStore();
const read = app?.rolesPermissions?.schedules?.read || 0;
const write = app?.rolesPermissions?.schedules?.write || 0;

/**
 * fields
 */
const apiFields = {
  fields: ['name', 'status', 'class.name'],
  projectionFields: ['name', 'status', 'class'],
  sortFields: ['name', 'status'],
  filterFields: ['name', '_lang_en.status', 'class.name'],
  addFields: ['name', 'status', 'class'],
  editFields: ['name', 'status'],
};

const fieldsSet = ref(new Set([]));

const apiFn = {
  getAll: Api.getSchedules,
  create: Api.createSchedule,
  update: Api.updateSchedule,
  delete: Api.deleteSchedule,
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

const selectedItemID = ref(null);
const selectedItemName = ref(null);
const detailsOpen = ref(false);

const fieldDetailsClassesComponent = ref();

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
const nameRule = (v) => ComponentsUtils.Edit.Rules.name(v, t);
const statusRule = (v) => ComponentsUtils.Edit.Rules.status(v, t);

/**
 * ApiTableServer event open details
 */
function openDetails(item) {
  selectedItemID.value = item.id;
  selectedItemName.value = item.name;
  detailsOpen.value = true;
}

function closeDetails() {
  selectedItemID.value = null;
  selectedItemName.value = null;
  detailsOpen.value = false;
}

/**
 * on add ApiFieldDetails calling updateField with actual objects instead of ids
 */
function onAddUpdateFieldClass(itemData, newObjs, removeIDs) {
  itemData.class = newObjs?.length > 0 ? newObjs[0] : { id: '', status: 'pending', name: '' };
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

  if (payload.class?.id) {
    payload.class = payload.class.id;
  }

  // add/update
  let ok = false;
  if (editing.value) {
    ok = await ComponentsUtils.Edit.update(apiFn, editingItemID.value, payload, snackbarO, t);
  } else {
    ok = await ComponentsUtils.Edit.add(apiFn, payload, snackbarO, t);
  }

  if (ok) {
    dialog.value = false;
    resetForm();

    // refresh
    await tableServer.value.refresh();
  }
}

/**
 * open add dialog
 */
function openAdd() {
  if (!write) {
    return;
  }

  resetForm();
  fieldsSet.value = new Set(apiFields.addFields);

  // defaults for new
  if (fieldsSet.value.has('status')) {
    itemData.status = 'active';
  }

  if (fieldsSet.value.has('class')) {
    itemData.class = { id: '', status: 'pending', name: '' };
  }

  editing.value = false;
  dialog.value = true;
}

/**
 * open edit dialog
 */
function openEdit(item) {
  if (!write) {
    return;
  }

  resetForm();
  fieldsSet.value = new Set(apiFields.editFields);

  // set
  if (fieldsSet.value.has('name')) {
    itemData.name = item.name || '';
  }
  if (fieldsSet.value.has('status')) {
    itemData.status = item.status || 'active';
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
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
