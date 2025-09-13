<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between">
      <div>Students</div>
      <v-btn color="primary" @click="openAdd"><v-icon left>mdi-plus</v-icon></v-btn>
    </v-card-title>

    <v-data-table :headers="headers" :items="items" item-key="id" class="elevation-1">
      <template #item.actions="{ item }">
        <v-icon small class="mr-2" @click="openEdit(item)" title="Edit">mdi-pencil</v-icon>
        <v-icon small color="error" @click="del(item.id)" title="Delete">mdi-delete</v-icon>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>{{ isEditing ? 'Edit' : 'Add' }}</v-card-title>
        <v-card-text>
          <v-form ref="form">
            <v-text-field v-model="itemData.name" label="Name" required />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" @click="handleSubmit">Save</v-btn>
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
      itemData: {
        name: '',
      },
      isEditing: false,
      editingItemID: null,
      isDialog: false,
      headers: [
        { text: 'Name', value: 'name' },
        { text: 'Actions', value: 'actions', sortable: false },
      ],
    };
  },

  /**
   * methods
   */
  methods: {
    /**
     * get all
     */
    async fetchAll() {
      try {
        const response = await Api.getStudents();
        this.items = response.data || response;
      } catch (e) {
        console.error('Error fetching all students:', e);
      }
    },

    /**
     * handle submit
     */
    async handleSubmit() {
      if (this.isEditing) {
        await this.update();
      } else {
        await this.add();
      }
      this.closeDialog();
      this.fetchAll();
    },

    /**
     * add
     */
    async add() {
      try {
        await Api.createStudent(this.itemData);
      } catch (e) {
        console.error('Error adding student:', e);
      }
    },

    /**
     * update
     */
    async update() {
      try {
        await Api.updateStudent(this.editingItemID, this.itemData);
      } catch (e) {
        console.error('Error updating student:', e);
      }
    },

    /**
     * delete
     */
    async del(itemID) {
      try {
        await Api.deleteStudent(itemID);
        this.fetchAll();
      } catch (e) {
        console.error('Error deleting student:', e);
      }
    },

    /**
     * open add dialog
     */
    openAdd() {
      this.resetForm();
      this.isEditing = false;
      this.isDialog = true;
    },

    /**
     * open edit dialog
     */
    openEdit(item) {
      this.itemData = { ...item };
      this.isEditing = true;
      this.editingItemID = item.id;
      this.isDialog = true;
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
      this.itemData = { name: '' };
      this.isEditing = false;
      this.editingItemID = null;
    },
  },

  /**
   * mounted
   */
  mounted() {
    this.fetchAll();
  },
};
</script>

<style scoped>
/* component styles */
</style>
