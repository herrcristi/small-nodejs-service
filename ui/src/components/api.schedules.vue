<template>
  <ApiPage
    title="schedules"
    :fields="['name', 'status', 'class.name']"
    :projectionFields="['name', 'status', 'class']"
    :sortFields="['name', 'status']"
    :filterFields="['name', '_lang_en.status', 'class.name']"
    :addFields="['name', 'status', 'class']"
    :editFields="['name', 'status']"
    :apiFn="{
      getAll: Api.getSchedules,
      create: Api.createSchedule,
      update: Api.updateSchedule,
      delete: Api.deleteSchedule,
    }"
    :read="read"
    :write="write"
    :expand="true"
    :details="true"
    @openDetails="openDetails($event)"
    :style="detailsOpen ? 'width:48%;display:inline-block;vertical-align:top;' : ''"
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

    <!-- 
        add class 
    -->
    <template v-slot:edit.class="{ itemData, fieldsSet }">
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
        :write="read && app?.rolesPermissions?.classes?.write"
        :loading="false"
        :nodatatext="''"
        :selectStrategy="'single'"
        :selectReturnObject="true"
      >
      </ApiFieldDetails>
      <v-input v-if="fieldsSet.has('class') && !itemData.class?.id" :messages="t('class.required')" error></v-input>
    </template>
  </ApiPage>

  <!-- drawer for details -->
  <v-card v-if="read || write">
    <v-navigation-drawer v-model="detailsOpen" right temporary width="620">
      <ApiScheduleDetails :itemID="selectedItemID" @close="closeDetails" />
    </v-navigation-drawer>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import ApiPage from './api.base.page.vue';
import ApiFieldDetails from './api.base.field.details.vue';
import ApiScheduleDetails from './api.schedule.details.vue';
import ApiScheduleMoreInfo from './api.schedule.moreinfo.vue';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const selectedItemID = ref(null);
const detailsOpen = ref(false);

const fieldDetailsClassesComponent = ref();

const app = useAppStore();
const read = app?.rolesPermissions?.schedules?.read || 0;
const write = app?.rolesPermissions?.schedules?.write || 0;

/**
 * details panel state (moved to separate component)
 */

function openDetails(item) {
  selectedItemID.value = item.id;
  detailsOpen.value = true;
}

function closeDetails() {
  selectedItemID.value = null;
  detailsOpen.value = false;
}

/**
 * on add ApiFieldDetails calling updateField with actual objects instead of ids
 */
function onAddUpdateFieldClass(itemData, newObjs, removeIDs) {
  itemData.class = newObjs?.length > 0 ? newObjs[0] : { id: '', status: 'pending', name: '' };
}

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
