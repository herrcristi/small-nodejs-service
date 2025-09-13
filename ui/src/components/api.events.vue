<template>
  <div>
    <h2>Events</h2>

    <v-data-table :headers="headers" :items="items" item-key="id" class="elevation-1">
      <template #item.actions="{ item }"> </template>
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
      headers: [{ title: 'Name', key: 'name', value: 'name' }],
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
        const response = await Api.getEvents();
        this.items = response.data;
      } catch (e) {
        console.error('Error fetching all events:', e);
      }
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
