<template v-if="props.read || props.write">
  <!-- 
          table
    -->
  <v-data-table
    :headers="headers"
    :items="props.items"
    :items-length="totalItems"
    :loading="props.loading"
    :search="filter"
    :custom-filter="customFilter"
    :no-data-text="props.nodatatext"
    :sort-by="[{ key: props.sortFields[0], order: 'asc' }]"
    item-key="id"
    v-model="selectedItems"
    :show-select="props.select"
    @update:model="emit('update:modelValue', $event)"
    :show-expand="props.expand"
    class="elevation-1"
    striped="even"
    density="compact"
    hide-default-header
    :hide-default-footer="props.items.length <= 10"
    items-per-page="50"
  >
    <!-- 
          top of the table, title + add + filter 
      -->
    <template v-slot:top>
      <slot name="top">
        <v-toolbar flat density="compact">
          <v-card-title class="d-flex justify-space-between">
            <slot name="top-title">
              {{ $t(props.title) }}
            </slot>
          </v-card-title>

          <slot name="top.add">
            <v-btn
              class="me-2 left"
              color="primary"
              prepend-icon="mdi-plus"
              rounded="lg"
              text=""
              border
              small
              @click="openAdd"
              v-if="props.write && props.apiFn?.add"
            ></v-btn>
          </slot>

          <v-toolbar-title> </v-toolbar-title>

          <slot name="top.filter">
            <v-text-field
              v-if="Array.isArray(props.filterFields)"
              v-model="filter"
              :label="t('filter')"
              class="me-2"
              rounded="lg"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              hide-details
              single-line
              dense
              clearable
              density="compact"
            ></v-text-field>
          </slot>
        </v-toolbar>
      </slot>
    </template>

    <!-- loading -->
    <template v-slot:loading>
      <slot name="loading">
        <v-skeleton-loader type="table-row@1"></v-skeleton-loader>
      </slot>
    </template>

    <!-- name -->
    <template v-slot:item.name="{ item }">
      <slot name="item.name" :item="item"> {{ item.name }} </slot>
    </template>

    <!-- user.name -->
    <template v-slot:item.user.name="{ item }">
      <slot name="item.user.name" :item="item"> {{ item.user?.name }} </slot>
    </template>

    <!-- status -->
    <template v-slot:item.status="{ item }">
      <slot name="item.status" :item="item">
        <div class="">
          <v-chip
            :color="ComponentUtils.getStatusColor(item.status)"
            :text="item._lang_en?.status || item.status"
            size="small"
            label
          ></v-chip>
        </div>
      </slot>
    </template>

    <!-- user.status -->
    <template v-slot:item.user.status="{ item }">
      <slot name="item.user.status" :item="item">
        <div class="">
          <v-chip
            :color="ComponentUtils.getStatusColor(item.user?.status)"
            :text="item._lang_en?.user?.status || item.user?.status"
            size="small"
            label
          ></v-chip>
        </div>
      </slot>
    </template>

    <!-- email -->
    <template v-slot:item.email="{ item }">
      <slot name="item.email" :item="item">
        {{ item.email }}
      </slot>
    </template>

    <!-- user.email -->
    <template v-slot:item.user.email="{ item }">
      <slot name="item.user.email" :item="item">
        {{ item.user?.email }}
      </slot>
    </template>

    <!-- severity -->
    <template v-slot:item.severity="{ item }">
      <slot name="item.severity" :item="item">
        <div class="">
          <v-chip
            :color="ComponentUtils.getSeverityColor(item.severity)"
            :text="item._lang_en?.severity || item.severity"
            class="text-uppercase"
            size="small"
            label
          ></v-chip>
        </div>
      </slot>
    </template>

    <!-- credits -->
    <template v-slot:item.credits="{ item }">
      <slot name="item.credits" :item="item">
        <div class="">{{ item.credits }}</div>
      </slot>
    </template>

    <!-- required -->
    <template v-slot:item.required="{ item }">
      <slot name="item.required" :item="item">
        <div class="">
          <v-chip
            :color="ComponentUtils.getRequiredColor(item.required)"
            :text="item._lang_en?.required || item.required"
            size="small"
            label
          ></v-chip>
        </div>
      </slot>
    </template>

    <!-- message -->
    <template v-slot:item.message="{ item }">
      <slot name="item.message" :item="item">
        <div class="">
          {{ item._lang_en?.message || item.message }}
        </div>
      </slot>
    </template>

    <!-- address -->
    <template v-slot:item.address="{ item }">
      <slot name="item.address" :item="item">
        <div class="">
          {{ item.address }}
        </div>
      </slot>
    </template>

    <!-- createdTimestamp -->
    <template v-slot:item.createdTimestamp="{ item }">
      <slot name="item.createdTimestamp" :item="item">
        <div class="">{{ item.createdTimestamp }}</div>
      </slot>
    </template>

    <!-- timestamp-->
    <template v-slot:item.timestamp="{ item }">
      <slot name="item.timestamp" :item="item">
        <div class="">{{ item.timestamp }}</div>
      </slot>
    </template>

    <!-- description -->
    <template v-slot:item.description="{ item }">
      <slot name="item.description" :item="item">
        <div class="">{{ item.description }}</div>
      </slot>
    </template>

    <!-- class.name -->
    <template v-slot:item.class.name="{ item }">
      <slot name="item.class.name" :item="item">
        <div class="">{{ item.class?.name }}</div>
      </slot>
    </template>

    <!-- frequency -->
    <template v-slot:item.frequency="{ item }">
      <slot name="item.frequency" :item="item">
        <div class="">{{ item.frequency }}</div>
      </slot>
    </template>

    <!-- location.name -->
    <template v-slot:item.location.name="{ item }">
      <slot name="item.location.name" :item="item">
        <div class="">{{ item.location?.name }}</div>
      </slot>
    </template>

    <!-- location.address -->
    <template v-slot:item.location.address="{ item }">
      <slot name="item.location.address" :item="item">
        <div class="">{{ item.location?.address }}</div>
      </slot>
    </template>

    <!-- 
        expand 
    -->
    <template v-slot:item.data-table-expand="{ internalItem, isExpanded, toggleExpand }">
      <slot
        name="item.data-table-expand"
        :internalItem="internalItem"
        :isExpanded="isExpanded"
        :toggleExpand="toggleExpand"
      >
        <v-btn
          :append-icon="isExpanded(internalItem) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          :text="isExpanded(internalItem) ? t('collapse') : t('more.info')"
          class="text-none"
          color="medium-emphasis"
          size="small"
          variant="text"
          width="105"
          border
          slim
          @click="toggleExpand(internalItem)"
        >
        </v-btn>
      </slot>
    </template>

    <template v-slot:expanded-row="{ columns, item }">
      <slot name="expanded-row" :item="item" :columns="columns">
        <tr>
          <td :colspan="columns.length" class="py-2">
            <v-sheet rounded="lg" border>
              <!-- Default content if no slot is provided -->
            </v-sheet>
          </td>
        </tr>
      </slot>
    </template>

    <!-- 
          actions
      -->
    <template #item.actions="{ item }">
      <slot name="item.actions" :item="item">
        <v-icon
          v-if="props.write && props.apiFn?.update"
          small
          class="mr-2"
          @click="openEdit(item)"
          :title="$t('edit')"
          size="small"
          >mdi-pencil</v-icon
        >
        <v-icon
          v-if="props.write && props.apiFn?.delete"
          small
          color="mr-2"
          @click="confirmDelete(item.id)"
          :title="$t('delete')"
          size="small"
          >mdi-delete</v-icon
        >
      </slot>
    </template>
  </v-data-table>

  <!-- Confirm delete dialog -->
  <ConfirmDialog
    :model-value="confirmDeleteDialog"
    @update:modelValue="confirmDeleteDialog = $event"
    @confirm="doDelete"
    @cancel="cancelDelete"
    title-key="delete"
    message-key="delete_confirm"
    ok-key="delete"
    cancel-key="cancel"
    :args="{}"
  />

  <!-- 
      snackbar for notifications
    -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ConfirmDialog from './base.confirm.dialog.vue';
import ComponentUtils from './components.utils.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * state
 */
const props = defineProps({
  title: { type: String, default: null },
  items: { type: Array, default: [] },

  fields: { type: Array, default: [] },
  sortFields: { type: Array, default: [] },
  filterFields: { type: Array, default: null },

  loading: { type: [Boolean, Number], default: false },
  nodatatext: { type: String, default: '' },

  read: { type: [Boolean, Number], default: null },
  write: { type: [Boolean, Number], default: null },
  select: { type: [Boolean], default: null },
  modelValue: { type: Array, default: [] },
  expand: { type: [Boolean], default: null },

  apiFn: { type: Object, default: {} }, // add:0/1, update:0/1, delete: fn
});

/**
 * table data
 */
const filter = ref('');

/**
 * delete
 */
const confirmDeleteDialog = ref(false);
const toDeleteID = ref(null);

/**
 * snackbar
 */
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * emit
 */
const emit = defineEmits(['addItem', 'editItem', 'deleteItem', 'update:modelValue']);

/**
 * model-value selectedItems
 */
const selectedItems = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

/**
 * totalItems
 */
const totalItems = computed({
  get: () => props.items.length,
});

/**
 * headers
 */
const headers = computed(() => {
  const addActions = props.write && (props.apiFn.update || props.apiFn.delete);
  return ComponentUtils.getHeaders(props.fields, props.sortFields, addActions, t);
});

/**
 * custom filter
 */
function customFilter(value, query, item) {
  return findValue(props.filterFields, value, query, item);
}

/**
 * delete
 */
function confirmDelete(itemID) {
  toDeleteID.value = itemID;
  confirmDeleteDialog.value = true;
}
function cancelDelete() {
  toDeleteID.value = null;
  confirmDeleteDialog.value = false;
}
async function doDelete() {
  if (!toDeleteID.value) {
    return;
  }
  try {
    await del(toDeleteID.value);
  } finally {
    toDeleteID.value = null;
    confirmDeleteDialog.value = false;
  }
}

async function del(itemID) {
  try {
    await props.apiFn.delete(itemID);

    snackbarText.value = t('delete.success') || 'Deleted';
    snackbarColor.value = 'success';
    snackbar.value = true;

    emit('deleteItem', toDeleteID.value);
  } catch (e) {
    console.error('Error deleting:', e);
    const errText = e.response?.data?.error?.toString() || e.toString();

    snackbarText.value = (t('delete.error') || 'Error deleting') + ' - ' + errText;
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

/**
 * open add dialog
 */
function openAdd() {
  if (!props.write) {
    return;
  }

  emit('addItem');
}

/**
 * open edit dialog
 */
function openEdit(item) {
  if (!props.write) {
    return;
  }

  emit('editItem', item);
}

/**
 * mounted
 */
function mounted() {}

/**
 * clear
 */
async function clear() {
  filter.value = '';
}

/**
 * expose
 */
defineExpose({ clear });
</script>

<style scoped></style>
