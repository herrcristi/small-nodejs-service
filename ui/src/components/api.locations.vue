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
            {{ $t('locations') }}
            <!-- </v-toolbar-title> -->
          </v-card-title>

          <v-btn
            class="me-2 left"
            color="primary"
            prepend-icon="mdi-plus"
            rounded="lg"
            text=""
            border
            @click="openAdd"
          ></v-btn>

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

      <!-- 
          actions
      -->
      <template #item.actions="{ item }">
        <v-icon small class="mr-2" @click="openEdit(item)" :title="$t('locations.edit')" size="small"
          >mdi-pencil</v-icon
        >
        <v-icon small color="mr-2" @click="del(item.id)" :title="$t('delete')" size="small">mdi-delete</v-icon>
      </template>
    </v-data-table-server>

    <!-- 
          dialog
    -->
    <v-dialog v-model="dialog" max-width="800px">
      <v-card>
        <v-card-title>{{ editing ? $t('locations.edit') : $t('locations.add') }}</v-card-title>

        <v-card-text>
          <v-form ref="form">
            <v-text-field v-model="itemData.name" :label="$t('name')" required />
            <v-text-field v-model="itemData.address" :label="$t('address')" required />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">{{ $t('cancel') }}</v-btn>
          <v-btn color="primary" @click="handleSubmit">{{ $t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

      itemData: { id: '', name: '', status: '', address: '', _lang_en: { status: '' } },
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
        { title: this.$t('name'), key: 'name' },
        { title: this.$t('status'), key: '_lang_en.status' },
        { title: this.$t('address'), value: 'address' },
        { title: this.$t('actions'), value: 'actions', sortable: false },
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
          projection: 'id,name,status,address,_lang_en',
          sort: 'name',
        };

        // filter
        if (this.filter) {
          params = {
            ...params,
            'name,_lang_en.status,address': `/${this.filter}/i`,
          };
        }

        if (sortBy.length) {
          params.sort = '';
          sortBy.map((s) => {
            params.sort += `${s.order === 'desc' ? `-${s.key}` : s.key},`;
          });
          params.sort = params.sort.slice(0, -1);
        }

        const response = await Api.getLocations(new URLSearchParams(params).toString());
        this.totalItems = response.data?.meta?.count || 0;
        this.items = response.data?.data || [];
        this.nodatatext = '';
      } catch (e) {
        console.error('Error fetching all locations:', e);
        this.nodatatext = e.toString();
        this.totalItems = 0;
        this.items = [];
      }

      // reset loading
      clearTimeout(timeoutID);
      this.loading = false;
    },

    /**
     * handle submit
     */
    async handleSubmit() {
      if (this.editing) {
        await this.update();
      } else {
        await this.add();
      }
      this.closeDialog();
      this.fetchAll(this.lastRequestParams);
    },

    /**
     * add
     */
    async add() {
      try {
        await Api.createLocation(this.itemData);
      } catch (e) {
        console.error('Error adding location:', e);
      }
    },

    /**
     * update
     */
    async update() {
      try {
        await Api.updateLocation(this.editingItemID, this.itemData);
      } catch (e) {
        console.error('Error updating location:', e);
      }
    },

    /**
     * delete
     */
    async del(itemID) {
      try {
        await Api.deleteLocation(itemID);
        this.fetchAll(this.lastRequestParams);
      } catch (e) {
        console.error('Error deleting location:', e);
      }
    },

    /**
     * open add dialog
     */
    openAdd() {
      this.resetForm();
      this.editing = false;
      this.dialog = true;
    },

    /**
     * open edit dialog
     */
    openEdit(item) {
      this.itemData = { ...item };
      this.editing = true;
      this.editingItemID = item.id;
      this.dialog = true;
    },

    /**
     * close dialog
     */
    closeDialog() {
      this.dialog = false;
      this.resetForm();
    },

    /**
     * reset form
     */
    resetForm() {
      this.itemData = { id: '', name: '', status: '', address: '', _lang_en: { status: '' } };
      this.editing = false;
      this.editingItemID = null;
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
