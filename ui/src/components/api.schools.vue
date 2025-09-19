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
            {{ $t('schools.title') }}
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
        <v-icon small class="mr-2" @click="openEdit(item)" :title="$t('schools.edit')" size="small">mdi-pencil</v-icon>
        <v-icon small color="mr-2" @click="confirmDelete(item.id)" :title="$t('delete')" size="small"
          >mdi-delete</v-icon
        >
      </template>
    </v-data-table-server>

    <!-- 
          dialog
    -->
    <v-dialog v-model="dialog" max-width="800px">
      <v-card>
        <v-card-title>{{ editing ? $t('schools.edit') : $t('schools.add') }}</v-card-title>

        <v-card-text>
          <v-form ref="form">
            <v-text-field v-model="itemData.name" :label="$t('name')" required />
            <v-text-field v-model="itemData.description" :label="$t('description')" required />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">{{ $t('cancel') }}</v-btn>
          <v-btn color="primary" @click="handleSubmit">{{ $t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm delete dialog -->
    <ConfirmDialog
      :model-value="confirmDeleteDialog"
      @update:modelValue="confirmDeleteDialog = $event"
      @confirm="doDelete"
      title-key="delete_confirm"
      message-key="delete_confirm"
      ok-key="delete"
      cancel-key="cancel"
      :args="{}"
    />
  </v-card>
</template>

<script>
import Api from '../api/api.js';
import ConfirmDialog from './confirm.dialog.vue';

export default {
  components: { ConfirmDialog },
  /**
   * data
   */
  data() {
    return {
      items: [
        // { id: 1, name: 'Test School', description: 'A test school', status: 'active' },
        // { id: 2, name: 'Another School', description: 'Another test school', status: 'inactive' },
      ],
      totalItems: 0,
      filter: '',
      loading: true,
      nodatatext: '',

      itemData: { id: '', name: '', description: '', status: '' },
      editing: false,
      editingItemID: null,
      dialog: false,
      text: '',
      confirmDeleteDialog: false,
      toDeleteID: null,

      lastRequestParams: {},
    };
  },

  computed: {
    headers() {
      return [
        { title: this.$t('name'), key: 'name' },
        { title: this.$t('status'), key: 'status' },
        { title: this.$t('description'), value: 'description' },
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
          projection: 'id,name,description,status',
          sort: 'name',
          filter: this.filter || '',
        };

        if (sortBy.length) {
          params.sort = '';
          sortBy.map((s) => {
            params.sort += `${s.order === 'desc' ? `-${s.key}` : s.key},`;
          });
          params.sort = params.sort.slice(0, -1);
        }

        console.log('Fetching schools with params:', new URLSearchParams(params).toString());

        const response = await Api.getSchools(new URLSearchParams(params).toString());
        this.totalItems = response.meta?.count || 0;
        this.items = response.data || response;
        this.nodatatext = '';
      } catch (e) {
        console.error('Error fetching all schools:', e);
        this.nodatatext = e.toString();
        this.totalItems = 0;
        this.items = [];
      }

      // reset loading
      clearTimeout(timeoutID);
      // setTimeout(async () => { // for testing loading indicator
      this.loading = false;
      // }, 100);
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
        await Api.createSchool(this.itemData);
      } catch (e) {
        console.error('Error adding school:', e);
      }
    },

    /**
     * update
     */
    async update() {
      try {
        await Api.updateSchool(this.editingItemID, this.itemData);
      } catch (e) {
        console.error('Error updating school:', e);
      }
    },

    /**
     * delete
     */
    async del(itemID) {
      try {
        await Api.deleteSchool(itemID);
        this.fetchAll(this.lastRequestParams);
      } catch (e) {
        console.error('Error deleting school:', e);
      }
    },

    confirmDelete(itemID) {
      this.toDeleteID = itemID;
      this.confirmDeleteDialog = true;
    },

    cancelDelete() {
      this.toDeleteID = null;
      this.confirmDeleteDialog = false;
    },

    async doDelete() {
      if (!this.toDeleteID) return;
      try {
        await this.del(this.toDeleteID);
      } finally {
        this.toDeleteID = null;
        this.confirmDeleteDialog = false;
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
      this.itemData = { id: '', name: '', description: '', status: '' };
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
