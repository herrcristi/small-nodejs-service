<template>
  <div>
    <h2>Students</h2>
    <v-row>
      <v-col cols="12" md="6">
        <v-form @submit.prevent="handleSubmit">
          <v-text-field v-model="itemData.name" label="Student Name" required />
          <v-btn color="primary" type="submit">{{ isEditing ? 'Update' : 'Add' }} Class</v-btn>
          <v-btn text @click="resetForm">Reset</v-btn>
        </v-form>
      </v-col>
    </v-row>

    <v-data-table :headers="headers" :items="items" item-key="id" class="elevation-1">
      <template #item.actions="{ item }">
        <v-btn small @click="edit(item)">Edit</v-btn>
        <v-btn small color="error" @click="del(item.id)">Delete</v-btn>
      </template>
    </v-data-table>
  </div>
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
      headers: [
        { title: 'Name', key: 'name', value: 'name' },
        { title: 'Actions', key: 'actions', value: 'actions' },
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
        this.items = response.data;
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
      this.resetForm();
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
        await Api.updateStudent(this.editingitemID, this.itemData);
      } catch (e) {
        console.error('Error updating student:', e);
      }
    },

    /**
     * edit
     */
    edit(item) {
      this.itemData.name = item.name;
      this.isEditing = true;
      this.editingItemID = item.id;
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
     * reset form
     */
    resetForm() {
      this.itemData.name = '';
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
/* Add your styles here */
</style>
