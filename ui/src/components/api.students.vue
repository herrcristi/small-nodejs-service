<template>
  <ApiPage
    title="students"
    :fields="['user.name', 'user.status', 'user.email']"
    :projectionFields="['user.name', 'user.status', 'user.email']"
    :sortFields="['user.name', 'user.status', 'user.email']"
    :filterFields="['user.name', '_lang_en.user.status', 'user.email']"
    :apiFn="{
      getAll: Api.getStudents,
      create: Api.createStudent,
      update: Api.updateStudent,
      delete: Api.deleteStudent,
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
            <ApiStudentMoreInfo :itemID="item.id" type="table" />
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
import ApiStudentMoreInfo from './api.student.moreinfo.vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const app = useAppStore();
const read = app?.rolesPermissions?.groups?.read;
const write = app?.rolesPermissions?.groups?.write;

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
