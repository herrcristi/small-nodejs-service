<template>
  <ApiPage
    title="events"
    :fields="['severity', 'message', 'createdTimestamp']"
    :projectionFields="['severity', 'user', 'target', 'createdTimestamp']"
    :sortFields="['severity', 'user.username', 'target.name', '_lang_en.message', 'createdTimestamp']"
    :filterFields="['_lang_en.severity', 'user.username', 'target.name', '_lang_en.message', 'createdTimestamp']"
    :apiFn="{
      getAll: Api.getEvents,
    }"
    :read="read"
    :write="0"
    :expand="true"
  >
    <!-- 
      more info
    -->
    <template v-slot:expanded-content="{ item, columns }">
      <tr>
        <td :colspan="columns.length" class="py-2">
          <v-row class="d-flex justify-end">
            <v-col cols="12" md="8">
              <v-card>
                <v-sheet rounded="lg" border>
                  <key-value
                    :items="[
                      { key: 'user', value: item.user?.username, translate: true },
                      { key: 'target', value: item.target?.name, translate: true },
                    ]"
                    :loading="false"
                  >
                  </key-value>
                </v-sheet>
              </v-card>
            </v-col>
          </v-row>
        </td>
      </tr>
    </template>
  </ApiPage>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import ApiPage from './api.base.page.vue';
import KeyValue from './base.keyvalue.vue';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const app = useAppStore();
const read = app?.rolesPermissions?.locations?.read || 0;

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
