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
    :details="true"
    @openDetails="openDetails($event)"
    :style="detailsOpen ? 'width:48%;display:inline-block;vertical-align:top;' : ''"
  ></ApiPage>

  <v-card v-if="read || write">
    <!-- Right drawer for details -->
    <v-navigation-drawer v-model="detailsOpen" right temporary width="520">
      <ApiGroupDetails :groupID="selectedGroupID" @close="closeDetails" />
    </v-navigation-drawer>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import ApiPage from './api.page.vue';
import ApiGroupDetails from './api.group.details.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const selectedGroupID = ref(null);
const detailsOpen = ref(false);

const app = useAppStore();
const read = app?.rolesPermissions?.groups?.read;
const write = app?.rolesPermissions?.groups?.write;

/**
 * details panel state (moved to separate component)
 */

function openDetails(groupID) {
  selectedGroupID.value = groupID;
  detailsOpen.value = true;
}

function closeDetails() {
  selectedGroupID.value = null;
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
