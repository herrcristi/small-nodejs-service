<template>
  <div>
    <h2>Events</h2>
    <ul>
      <li v-for="item in items" :key="item.id">
        {{ item.name }}
      </li>
    </ul>
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
