<template>
  <v-card v-if="read || write">
    <!-- 
          table
    -->
    <!-- 
          the events of the selected school, or the global events (outside the schools: logins, password resets)
          for the portal admins
    -->
    <ApiTableServer
      ref="tableServer"
      :title="props.global ? 'events.global' : 'events'"
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
const props = defineProps({
  global: { type: Boolean, default: false }, // the global events (portal admins)
});

const tableServer = ref();
const details = null; // true for details column
const expand = true; // true for expand column

const app = useAppStore();
const permission = props.global ? app?.rolesPermissions?.globalEvents : app?.rolesPermissions?.events;
const read = permission?.read || 0;
const write = 0;

/**
 * fields
 */
const apiFields = {
  fields: ['severity', 'message', 'createdTimestamp'],
  projectionFields: ['severity', 'user', 'target', 'createdTimestamp'],
  sortFields: ['severity', 'user.username', 'target.name', '_lang_en.message', 'createdTimestamp'],
  filterFields: ['_lang.severity', 'user.username', 'target.name', '_lang.message', 'createdTimestamp'],
};

const apiFn = {
  getAll: props.global ? Api.getGlobalEvents : Api.getEvents,
};

/**
 * mounted
 */
function mounted() {}
</script>

<style scoped>
/* component styles */
</style>
