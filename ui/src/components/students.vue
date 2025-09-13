<template>
  <div>
    <h1>Students</h1>
    <form @submit.prevent="handleSubmit">
      <input v-model="itemData.name" placeholder="Student Name" required />
      <button type="submit">{{ isEditing ? 'Update' : 'Add' }} Student</button>
    </form>
    <ul>
      <li v-for="item in items" :key="item.id">
        {{ item.name }}
        <button @click="edit(item)">Edit</button>
        <button @click="delete item.id">Delete</button>
      </li>
    </ul>
  </div>
</template>

<script>
import Api from '../api/index';

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
    async delete(itemID) {
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
