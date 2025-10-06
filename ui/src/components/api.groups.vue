<template>
  <ApiPage
    title="groups"
    :fields="['name', 'status', 'description']"
    :projectionFields="['name', 'status', 'description']"
    :sortFields="['name', 'status']"
    :filterFields="['name', '_lang_en.status', 'description']"
    :apiFn="{
      getAll: Api.getGroups,
      create: Api.createGroup,
      update: Api.updateGroup,
      delete: Api.deleteGroup,
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
      <tr>
        <td :colspan="columns.length" class="py-2">
          <v-sheet rounded="lg" border>
            <ApiGroupMoreInfo :itemID="item.id" type="table" />
          </v-sheet>
        </td>
      </tr>
    </template>
  </ApiPage>

  <v-card v-if="read || write">
    <!-- drawer for details -->
    <v-navigation-drawer v-model="detailsOpen" right temporary width="620">
      <ApiGroupDetails :itemID="selectedItemID" @close="closeDetails" />
    </v-navigation-drawer>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import ApiPage from './api.base.page.vue';
import ApiGroupDetails from './api.group.details.vue';
import ApiGroupMoreInfo from './api.group.moreinfo.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const selectedItemID = ref(null);
const detailsOpen = ref(false);

const app = useAppStore();
const read = app?.rolesPermissions?.groups?.read;
const write = app?.rolesPermissions?.groups?.write;

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
