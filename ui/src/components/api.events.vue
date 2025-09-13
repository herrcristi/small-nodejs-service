<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between">
      <div>Events</div>
    </v-card-title>

    <v-data-table :headers="headers" :items="items" item-key="id" class="elevation-1">
      <template #item.actions="{ item }"> </template>
    </v-data-table>
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
      headers: [{ text: 'Name', value: 'name' }],
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
        this.items = response.data || response;
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
/* component styles */
</style>
