<template>
  <v-card v-if="read || write">
    <!-- 
          table
    -->
    <ApiTableServer
      ref="tableServer"
      title="classes"
      :fields="apiFields.fields"
      :projectionFields="apiFields.projectionFields"
      :sortFields="apiFields.sortFields"
      :filterFields="apiFields.filterFields"
      :apiFn="apiFn"
      :read="read"
      :write="write"
      :details="details"
      :expand="expand"
    >
      <!-- 
        createdTimestamp
      -->
      <template v-slot:item.createdTimestamp="{ item }">
        <slot name="item.createdTimestamp" :item="item">
          {{ item.createdTimestamp }}
        </slot>
      </template>

      <!-- 
        more info
      -->
      <template v-slot:expanded-row="{ item, columns }">
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
    </ApiTableServer>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import Api from '../api/api.js';
import ApiTableServer from './api.base.table.server.vue';
import KeyValue from './base.keyvalue.vue';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
import ComponentsUtils from './components.utils.js';
const { t } = useI18n();

/**
 * props
 */
const tableServer = ref();
const details = null; // true for details column
const expand = true; // true for expand column

const app = useAppStore();
const read = app?.rolesPermissions?.locations?.read || 0;
const write = 0;

/**
 * fields
 */
const apiFields = {
  fields: ['severity', 'message', 'createdTimestamp'],
  projectionFields: ['severity', 'user', 'target', 'createdTimestamp'],
  sortFields: ['severity', 'user.username', 'target.name', '_lang_en.message', 'createdTimestamp'],
  filterFields: ['_lang_en.severity', 'user.username', 'target.name', '_lang_en.message', 'createdTimestamp'],
};

const apiFn = {
  getAll: Api.getEvents,
};

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
