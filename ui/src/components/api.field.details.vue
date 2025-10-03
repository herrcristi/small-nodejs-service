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
      update: 0,
      delete: deleteField,
    }"
    :read="props.read"
    :write="false"
    :loading="props.loading"
    :nodatatext="props.nodatatext"
    @addItem="openAdd"
    @editItem="emit('editItem', $event)"
    @deleteItem="emit('deleteItem', $event)"
  ></ApiTableData>

  <!-- 
        Add modal     
    -->
  <v-dialog v-model="addDialog" max-width="900px" v-if="props.write">
    <v-card>
      <v-card-title>{{ props.titleAdd ? $t(props.titleAdd) : props.title ? $t(props.title) : 'Add' }}</v-card-title>

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
          }"
          :read="props.read"
          :write="false"
        ></ApiTableServer>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="closeAdd">{{ t('cancel') }}</v-btn>
        <v-btn color="primary" @click="saveAdd">{{ t('save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ApiTableServer from './api.table.server.vue';
import ApiTableData from './api.table.data.vue';
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
  filterFields: { type: Array, default: [] },

  loading: { type: [Boolean, Number], default: true },
  nodatatext: { type: String, default: '' },

  read: { type: [Boolean, Number], default: null },
  write: { type: [Boolean, Number], default: null },

  apiFn: { type: Object, default: {} }, // getAll, deleteField, updateField
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
  selectedItems.value = props.items.map((s) => s.id);

  addDialog.value = true;
}

async function closeAdd() {
  addDialog.value = false;
  selectedItems.value = [];
}

async function saveAdd() {
  const existingIDs = new Set(props.items.map((s) => s.id));
  const selectedIDs = new Set(selectedItems.value);

  const newIDs = selectedItems.value.filter((id) => !existingIDs.has(id));
  const removeIDs = [...existingIDs].filter((id) => !selectedIDs.has(id));

  if (newIDs.length == 0 && removeIDs.length == 0) {
    // no change
    addDialog.value = false;
    selectedItems.value = [];
    return;
  }

  try {
    // update, props.items should be update in the caller
    await props.apiFn.updateField(newIDs, removeIDs);

    snackbarText.value = t('update.success') || 'Updated';
    snackbarColor.value = 'success';
    snackbar.value = true;

    addDialog.value = false;
    selectedItems.value = [];

    emit('addItems', newIDs);
    emit('deleteItems', removeIDs);
  } catch (e) {
    console.error('Error updating field:', e);

    snackbarText.value = (t('update.error') || 'Error updating field') + ' ' + e.toString();
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
