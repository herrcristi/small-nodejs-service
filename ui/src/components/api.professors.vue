<template>
  <ApiPage
    title="professors"
    :fields="['user.name', 'user.status', 'user.email']"
    :projectionFields="['user.name', 'user.status', 'user.email']"
    :sortFields="['user.name', 'user.status', 'user.email']"
    :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
    :apiFn="{
      getAll: Api.getProfessors,
      create: Api.createProfessor,
      update: Api.updateProfessor,
      delete: Api.deleteProfessor,
    }"
    :read="read"
    :write="write"
    :expand="true"
  >
    <!-- 
      more info
    -->
    <template v-slot:expanded-content="{ item, columns }">
      <tr>
        <td :colspan="columns.length" class="py-2">
          <v-sheet rounded="lg" border>
            <ApiProfessorMoreInfo :itemID="item.id" type="table" />
          </v-sheet>
        </td>
      </tr>
    </template>
  </ApiPage>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import { useAppStore } from '../stores/stores.js';
import ApiPage from './api.base.page.vue';
import ApiProfessorMoreInfo from './api.professor.moreinfo.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const app = useAppStore();
const read = app?.rolesPermissions?.professors?.read;
const write = app?.rolesPermissions?.professors?.write;

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
