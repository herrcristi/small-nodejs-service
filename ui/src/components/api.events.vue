<template>
  <v-card>
    <!-- 
          table
    -->
    <v-data-table-server
      :headers="headers"
      :items="items"
      :items-length="totalItems"
      :loading="loading"
      :search="filter"
      :no-data-text="nodatatext"
      @update:options="fetchAll"
      item-key="id"
      class="elevation-1"
      striped="even"
      items-per-page="50"
    >
      <!-- 
          top of the table, title + add + filter 
      -->
      <template v-slot:top>
        <v-toolbar flat>
          <v-card-title class="d-flex justify-space-between">
            <!-- <v-toolbar-title> -->
            {{ $t('events') }}
            <!-- </v-toolbar-title> -->
          </v-card-title>

          <v-toolbar-title> </v-toolbar-title>

          <v-text-field
            v-model="filter"
            label="Filter"
            class="me-2"
            rounded="lg"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            hide-details
            single-line
          ></v-text-field>
        </v-toolbar>
      </template>

      <!-- 
          loading
      -->
      <template v-slot:loading>
        <v-skeleton-loader type="table-row@1"></v-skeleton-loader>
      </template>

      <template v-slot:item.severity="{ item }">
        <div class="text-end">
          <v-chip
            :color="getSeverityColor(item.severity)"
            :text="item._lang_en.severity"
            class="text-uppercase"
            size="small"
            label
          ></v-chip>
        </div>
      </template>
    </v-data-table-server>
  </v-card>
</template>

<script>
import Api from '../api/api.js';

export default {
  /**
   * data
   */
  data() {
    return {
      items: [],
      totalItems: 0,
      filter: '',
      loading: true,
      nodatatext: '',

      itemData: {
        id: '',
        createdTimestamp: '',
        severity: '',
        messageID: '',
        args: [],
        target: {},
        user: {},
        name: '',
        _lang_en: { severity: '', message: '' },
      },
      editing: false,
      editingItemID: null,
      dialog: false,
      text: '',

      lastRequestParams: {},
    };
  },

  computed: {
    headers() {
      return [
        { title: this.$t('severity'), key: 'severity' },
        { title: this.$t('user'), key: 'user.username' },
        { title: this.$t('target'), key: 'target.name' },
        { title: this.$t('message'), key: '_lang_en.message' },
        { title: this.$t('timestamp'), key: 'createdTimestamp' },
      ];
    },
  },

  /**
   * methods
   */
  methods: {
    /**
     * get all
     */
    async fetchAll({ page, itemsPerPage, sortBy }) {
      this.lastRequestParams = { page, itemsPerPage, sortBy };

      let timeoutID = setTimeout(() => {
        this.loading = true;
      }, 300); // Show loader if it takes more than 300ms

      try {
        const start = (page - 1) * itemsPerPage;

        let params = {
          skip: start,
          limit: itemsPerPage,
          projection: 'id,createdTimestamp,severity,messageID,args,target,user,name,_lang_en',
          sort: '-createdTimestamp',
        };

        // filter
        if (this.filter) {
          params = {
            ...params,
            'createdTimestamp,_lang_en.severity,user.username,target.name,_lang_en.message': `/${this.filter}/i`,
          };
        }

        if (sortBy.length) {
          params.sort = '';
          sortBy.map((s) => {
            params.sort += `${s.order === 'desc' ? `-${s.key}` : s.key},`;
          });
          params.sort = params.sort.slice(0, -1);
        }

        const response = await Api.getEvents(new URLSearchParams(params).toString());
        this.totalItems = response.data?.meta?.count || 0;
        this.items = response.data?.data || [];
        this.nodatatext = '';
      } catch (e) {
        console.error('Error fetching all events:', e);
        this.nodatatext = e.toString();
        this.totalItems = 0;
        this.items = [];
      }

      // reset loading
      clearTimeout(timeoutID);
      this.loading = false;
    },
    /**
     * color for severity
     */
    getSeverityColor(severity) {
      switch (severity) {
        case 'info':
          return 'green';
        case 'critical':
          return 'red';
        case 'warning':
          return 'orange';
        default:
          return 'orange'; // for any other values
      }
    },
  },

  /**
   * mounted
   */
  mounted() {},
};
</script>

<style scoped>
/* component styles */
</style>
