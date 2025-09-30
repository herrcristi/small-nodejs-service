<template>
  <ApiPage
    title="groups"
    :fields="['details', 'name', 'status', 'description']"
    :apiFn="{
      getAll: Api.getGroups,
      create: Api.createGroup,
      update: Api.updateGroup,
      delete: Api.deleteGroup,
    }"
    :read="app?.rolesPermissions?.groups?.read"
    :write="app?.rolesPermissions?.groups?.write"
    :actions="true"
  ></ApiPage>

  <v-card v-if="app?.rolesPermissions?.groups?.read || app?.rolesPermissions?.groups?.write">
    <!-- Right drawer for details -->
    <v-navigation-drawer v-model="detailsOpen" right temporary width="520">
      <ApiGroupDetails :groupID="selectedGroupID" @close="closeDetailsPanel" />
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

/**
 * details panel state (moved to separate component)
 */

function selectDetails(groupID) {
  selectedGroupID.value = groupID;
  detailsOpen.value = true;
}

function closeDetailsPanel() {
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
