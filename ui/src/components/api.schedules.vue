<template>
  <ApiPage
    title="schedules"
    :fields="['name', 'status', 'class.name']"
    :projectionFields="['name', 'status', 'class']"
    :sortFields="['name', 'status']"
    :filterFields="['name', '_lang_en.status', 'class.name']"
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
    <template v-slot:expanded-content="{ item, columns }">
      <tr v-if="!detailsOpen">
        <td :colspan="columns.length" class="py-2">
          <v-sheet rounded="lg" border>
            <ApiScheduleMoreInfo :itemID="item.id" type="table" />
          </v-sheet>
        </td>
      </tr>
    </template>
  </ApiPage>

  <v-card v-if="read || write">
    <!-- drawer for details -->
    <v-navigation-drawer v-model="detailsOpen" right temporary width="620">
      <ApiScheduleDetails :itemID="selectedItemID" @close="closeDetails" />
    </v-navigation-drawer>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import ApiPage from './api.base.page.vue';
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

const app = useAppStore();
const read = app?.rolesPermissions?.schedules?.read || 0;
const write = app?.rolesPermissions?.schedules?.write || 0;

/**
 * details panel state (moved to separate component)
 */

function openDetails(itemID) {
  selectedItemID.value = itemID;
  detailsOpen.value = true;
}

function closeDetails() {
  selectedItemID.value = null;
  detailsOpen.value = false;
}

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
