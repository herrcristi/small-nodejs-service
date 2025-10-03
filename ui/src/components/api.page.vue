<template>
  <v-card v-if="props.read || props.write">
    <!-- 
          table
    -->
    <ApiTableServer
      ref="tableServer"
      :title="props.title"
      :fields="props.fields"
      :sortFields="props.sortFields"
      :projectionFields="props.projectionFields"
      :filterFields="props.filterFields"
      :apiFn="props.apiFn"
      :read="read"
      :write="write"
      :details="props.details"
      :expand="props.expand"
      @addItem="openAdd($event)"
      @editItem="openEdit($event)"
      @detailsItem="openDetails($event)"
    >
      <!-- 
        expose expanded content 
      -->
      <template v-slot:expanded-content="{ item, columns }">
        <slot name="expanded-content" :item="item" :columns="columns"></slot>
      </template>
    </ApiTableServer>

    <!-- 
          edit dialog
    -->
    <ApiEditItem
      ref="editDialog"
      :title="props.title"
      :fields="props.fields"
      :apiFn="props.apiFn"
      :write="write"
      @cancel="closeEdit($event)"
      @save="saveEdit($event)"
    ></ApiEditItem>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import ApiTableServer from './api.table.server.vue';
import ApiEditItem from './api.edit.item.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * state
 */
const props = defineProps({
  title: { type: [String], default: null },
  fields: { type: Array, default: [] },
  sortFields: { type: Array, default: [] },
  projectionFields: { type: Array, default: null },
  filterFields: { type: Array, default: null },

  read: { type: [Boolean, Number], default: null },
  write: { type: [Boolean, Number], default: null },
  details: { type: [Boolean, Number], default: null },
  expand: { type: [Boolean], default: null },

  apiFn: { type: Object, default: {} }, // getall, add, delete, update
});

const editDialog = ref();
const tableServer = ref();

/**
 * emit
 */
const emit = defineEmits(['openDetails']);

/**
 * ApiTableServer event open details
 */
function openDetails(itemID) {
  emit('openDetails', itemID);
}

/**
 * ApiTableServer event open add
 * open dialog ApiEditItem
 */
function openAdd() {
  editDialog.value.openAdd();
}

/**
 * ApiTableServer event open edit
 * open dialog ApiEditItem
 */
function openEdit(item) {
  editDialog.value.openEdit(item);
}

/**
 * ApiEditItem event cancel
 */
async function closeEdit() {}

/**
 * ApiEditItem event save
 */
async function saveEdit() {
  // refresh
  await tableServer.value.refresh();
}

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
