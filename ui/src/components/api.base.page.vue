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

      <!-- status -->
      <template v-slot:item.status="{ item }">
        <slot name="item.status" :item="item"> </slot>
      </template>

      <!-- severity -->
      <template v-slot:item.severity="{ item }">
        <slot name="item.severity" :item="item"> </slot>
      </template>

      <!-- required -->
      <template v-slot:item.required="{ item }">
        <slot name="item.required" :item="item"> </slot>
      </template>

      <!-- message -->
      <template v-slot:item.message="{ item }">
        <slot name="item.message" :item="item"> </slot>
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
    </ApiTableServer>

    <!-- 
          edit dialog
    -->
    <ApiEditItem
      ref="editDialog"
      :title="props.title"
      :addFields="props.addFields || props.fields"
      :editFields="props.editFields || props.fields"
      :apiFn="props.apiFn"
      :write="write"
      @cancel="closeEdit($event)"
      @save="saveEdit($event)"
    ></ApiEditItem>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import ApiTableServer from './api.base.table.server.vue';
import ApiEditItem from './api.base.edit.item.vue';
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
  addFields: { type: Array, default: null },
  editFields: { type: Array, default: null },

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
