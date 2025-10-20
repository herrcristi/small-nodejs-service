<template v-if="props.read || props.write">
  <!-- 
        for showing details of a (foreign) field 
    -->
  <ApiTableData
    ref="tableData"
    :title="props.title"
    :items="props.items"
    :fields="props.fields"
    :sortFields="props.sortFields"
    :filterFields="props.filterFields"
    :apiFn="{
      add: 1,
      update: props.emitEdit,
      delete: props.apiFn.deleteField ? deleteField : 0,
    }"
    :read="props.read"
    :write="props.write"
    :loading="props.loading"
    :nodatatext="props.nodatatext"
    @addItem="openAdd"
    @editItem="emit('editItem', $event)"
    @deleteItem="emit('deleteItem', $event)"
  >
    <!-- 
          expose slots
      -->

    <!-- top of the table, title + add + filter -->
    <template v-slot:top>
      <slot name="top"> </slot>
    </template>
    <template v-slot:top.title>
      <slot name="top.title"> </slot>
    </template>
    <template v-slot:top.add>
      <slot name="top.add"> </slot>
    </template>
    <template v-slot:top.filter>
      <slot name="top.filter"> </slot>
    </template>

    <!-- loading-->
    <template v-slot:loading>
      <slot name="loading"> </slot>
    </template>

    <!-- details column (icon) -->
    <template v-slot:item.details="{ item }">
      <slot name="item.details" :item="item"> </slot>
    </template>

    <!-- name -->
    <template v-slot:item.name="{ item }">
      <slot name="item.name" :item="item"> </slot>
    </template>

    <!-- user.name -->
    <template v-slot:item.user.name="{ item }">
      <slot name="item.user.name" :item="item"> </slot>
    </template>

    <!-- status -->
    <template v-slot:item.status="{ item }">
      <slot name="item.status" :item="item"> </slot>
    </template>

    <!-- user.status -->
    <template v-slot:item.user.status="{ item }">
      <slot name="item.user.status" :item="item"> </slot>
    </template>

    <!-- email -->
    <template v-slot:item.email="{ item }">
      <slot name="item.email" :item="item"> </slot>
    </template>

    <!-- user.email -->
    <template v-slot:item.user.email="{ item }">
      <slot name="item.user.email" :item="item"> </slot>
    </template>

    <!-- severity -->
    <template v-slot:item.severity="{ item }">
      <slot name="item.severity" :item="item"> </slot>
    </template>

    <!-- credits -->
    <template v-slot:item.credits="{ item }">
      <slot name="item.credits" :item="item"> </slot>
    </template>

    <!-- required -->
    <template v-slot:item.required="{ item }">
      <slot name="item.required" :item="item"> </slot>
    </template>

    <!-- message -->
    <template v-slot:item.message="{ item }">
      <slot name="item.message" :item="item"> </slot>
    </template>

    <!-- address -->
    <template v-slot:item.address="{ item }">
      <slot name="item.address" :item="item"> </slot>
    </template>

    <!-- createdTimestamp-->
    <template v-slot:item.createdTimestamp="{ item }">
      <slot name="item.createdTimestamp" :item="item"> </slot>
    </template>

    <!-- timestamp-->
    <template v-slot:item.timestamp="{ item }">
      <slot name="item.timestamp" :item="item"> </slot>
    </template>

    <!-- description -->
    <template v-slot:item.description="{ item }">
      <slot name="item.description" :item="item"> </slot>
    </template>

    <!-- class.name -->
    <template v-slot:item.class.name="{ item }">
      <slot name="item.class.name" :item="item"> </slot>
    </template>

    <!-- frequency -->
    <template v-slot:item.frequency="{ item }">
      <slot name="item.frequency" :item="item"> </slot>
    </template>

    <!-- location.name -->
    <template v-slot:item.location.name="{ item }">
      <slot name="item.location.name" :item="item"> </slot>
    </template>

    <!-- location.address -->
    <template v-slot:item.location.address="{ item }">
      <slot name="item.location.address" :item="item"> </slot>
    </template>

    <!-- expand -->
    <template v-slot:item.data-table-expand="{ internalItem, isExpanded, toggleExpand }">
      <slot
        name="item.data-table-expand"
        :internalItem="internalItem"
        :isExpanded="isExpanded"
        :toggleExpand="toggleExpand"
      >
      </slot>
    </template>

    <template v-slot:expanded-row="{ columns, item }">
      <slot name="expanded-row" :item="item" :columns="columns"> </slot>
    </template>

    <!-- actions -->
    <template #item.actions="{ item }">
      <slot name="item.actions" :item="item"> </slot>
    </template>
  </ApiTableData>

  <!-- 
        Add modal     
    -->
  <v-dialog v-model="addDialog" max-width="900px" v-if="props.write">
    <v-card>
      <v-card-title>{{ props.titleAdd || (props.title ? t(props.title) : 'Add') }}</v-card-title>

      <v-card-text>
        <!-- 
              show from server
          -->
        <ApiTableServer
          :title="props.title"
          :fields="props.fields"
          :projectionFields="props.projectionFields"
          :sortFields="props.sortFields"
          :filterFields="props.filterFields"
          :apiFn="{
            getAll: apiFn.getAll,
            getAllParams: apiFn.getAllParams,
          }"
          :read="props.read"
          :write="false"
          :select="true"
          v-model="selectedItems"
          :selectStrategy="props.selectStrategy"
          :selectReturnObject="props.selectReturnObject"
        >
          <!-- 
          expose slots
      -->

          <!-- top of the table, title + add + filter -->
          <template v-slot:top>
            <slot name="server.top"> </slot>
          </template>
          <template v-slot:top.title>
            <slot name="server.top.title"> </slot>
          </template>
          <template v-slot:top.add>
            <slot name="server.top.add"> </slot>
          </template>
          <template v-slot:top.filter>
            <slot name="server.top.filter"> </slot>
          </template>

          <!-- loading-->
          <template v-slot:loading>
            <slot name="server.loading"> </slot>
          </template>

          <!-- details column (icon) -->
          <template v-slot:item.details="{ item }">
            <slot name="server.item.details" :item="item"> </slot>
          </template>

          <!-- name -->
          <template v-slot:item.name="{ item }">
            <slot name="server.item.name" :item="item"> </slot>
          </template>

          <!-- user.name -->
          <template v-slot:item.user.name="{ item }">
            <slot name="server.item.user.name" :item="item"> </slot>
          </template>

          <!-- status -->
          <template v-slot:item.status="{ item }">
            <slot name="server.item.status" :item="item"> </slot>
          </template>

          <!-- user.status -->
          <template v-slot:item.user.status="{ item }">
            <slot name="server.item.user.status" :item="item"> </slot>
          </template>

          <!-- email -->
          <template v-slot:item.email="{ item }">
            <slot name="server.item.email" :item="item"> </slot>
          </template>

          <!-- user.email -->
          <template v-slot:item.user.email="{ item }">
            <slot name="server.item.user.email" :item="item"> </slot>
          </template>

          <!-- severity -->
          <template v-slot:item.severity="{ item }">
            <slot name="server.item.severity" :item="item"> </slot>
          </template>

          <!-- credits-->
          <template v-slot:item.credits="{ item }">
            <slot name="server.item.credits" :item="item"> </slot>
          </template>

          <!-- required -->
          <template v-slot:item.required="{ item }">
            <slot name="server.item.required" :item="item"> </slot>
          </template>

          <!-- message -->
          <template v-slot:item.message="{ item }">
            <slot name="server.item.message" :item="item"> </slot>
          </template>

          <!-- address -->
          <template v-slot:item.address="{ item }">
            <slot name="server.item.address" :item="item"> </slot>
          </template>

          <!-- createdTimestamp-->
          <template v-slot:item.createdTimestamp="{ item }">
            <slot name="server.item.createdTimestamp" :item="item"> </slot>
          </template>

          <!-- timestamp-->
          <template v-slot:item.timestamp="{ item }">
            <slot name="server.item.timestamp" :item="item"> </slot>
          </template>

          <!-- description -->
          <template v-slot:item.description="{ item }">
            <slot name="server.item.description" :item="item"> </slot>
          </template>

          <!-- class.name -->
          <template v-slot:item.class.name="{ item }">
            <slot name="server.item.class.name" :item="item"> </slot>
          </template>

          <!-- frequency -->
          <template v-slot:item.frequency="{ item }">
            <slot name="server.item.frequency" :item="item"> </slot>
          </template>

          <!-- location.name -->
          <template v-slot:item.location.name="{ item }">
            <slot name="server.item.location.name" :item="item"> </slot>
          </template>

          <!-- location.address -->
          <template v-slot:item.location.address="{ item }">
            <slot name="server.item.location.address" :item="item"> </slot>
          </template>

          <!-- expand -->
          <template v-slot:item.data-table-expand="{ internalItem, isExpanded, toggleExpand }">
            <slot
              name="server.item.data-table-expand"
              :internalItem="internalItem"
              :isExpanded="isExpanded"
              :toggleExpand="toggleExpand"
            >
            </slot>
          </template>

          <template v-slot:expanded-row="{ columns, item }">
            <slot name="server.expanded-row" :item="item" :columns="columns"> </slot>
          </template>

          <!-- actions -->
          <template #item.actions="{ item }">
            <slot name="server.item.actions" :item="item"> </slot>
          </template>
        </ApiTableServer>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="closeAdd">{{ t('cancel') }}</v-btn>
        <v-btn color="primary" @click="saveAdd">{{ t('save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 
      snackbar for notifications
    -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ApiTableServer from './api.base.table.server.vue';
import ApiTableData from './api.base.table.data.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * state
 */
const props = defineProps({
  title: { type: String, default: null },
  titleAdd: { type: String, default: null },
  items: { type: Array, default: [] },

  fields: { type: Array, default: [] },
  sortFields: { type: Array, default: [] },
  projectionFields: { type: Array, default: null },
  filterFields: { type: Array, default: null },

  loading: { type: [Boolean, Number], default: true },
  nodatatext: { type: String, default: '' },

  read: { type: [Boolean, Number], default: null },
  write: { type: [Boolean, Number], default: null },

  apiFn: { type: Object, default: {} }, // getAll, getAllParams, deleteField, updateField

  emitEdit: { type: [Boolean, Number], default: null },
  selectStrategy: { type: [String], default: 'page' }, // single, page, all
  selectReturnObject: { type: [Boolean], default: false }, // default is to return ids since not all objects can be retreived on edit
});

/**
 * emit
 */
const emit = defineEmits(['editItem', 'deleteItem', 'deleteItems', 'addItems']);

/**
 * refs
 */
const tableData = ref();

const addDialog = ref(false);

const selectedItems = ref([]);

/**
 * snackbar
 */
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * ApiTableData calling deleteField
 */
async function deleteField(itemID) {
  // if fail will throw error and be catch in ApiTableData
  await props.apiFn.deleteField(itemID);
}

/**
 * ApiTableData event open add
 * open dialog for all
 */
async function openAdd() {
  // existing ids
  selectedItems.value = props.items.map((item) => (props.selectReturnObject ? item : item.id));

  addDialog.value = true;
}

async function closeAdd() {
  addDialog.value = false;
  selectedItems.value = [];
}

async function saveAdd() {
  const existingIDs = new Set(props.items.map((item) => item.id));

  // returned selected items can be ids or objects
  const selectedIDs = new Set(selectedItems.value.map((item) => item?.id || item));

  const newItems = selectedItems.value.filter((item) => !existingIDs.has(item?.id || item));
  const removeIDs = [...existingIDs].filter((id) => !selectedIDs.has(id));

  if (newItems.length == 0 && removeIDs.length == 0) {
    // no change
    addDialog.value = false;
    selectedItems.value = [];
    return;
  }

  try {
    // update, props.items should be update in the caller
    await props.apiFn.updateField(newItems, removeIDs);

    snackbarText.value = t('update.success') || 'Updated';
    snackbarColor.value = 'success';
    snackbar.value = true;

    addDialog.value = false;
    selectedItems.value = [];

    emit('addItems', newItems);
    emit('deleteItems', removeIDs);
  } catch (e) {
    console.error('Error updating field:', e);
    const errText = e.response?.data?.error?.toString() || e.toString();

    snackbarText.value = (t('update.error') || 'Error updating field') + ' - ' + errText;
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

/**
 * mounted
 */
function mounted() {}

/**
 * clear
 */
async function clear() {
  tableData.value.clear();
}

/**
 * expose
 */
defineExpose({ clear });
</script>

<style scoped></style>
