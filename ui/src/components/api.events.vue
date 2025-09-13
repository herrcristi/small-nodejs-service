<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between">
      <div>{{ $t('events.title') }}</div>
      <v-btn color="primary" @click="openAdd"><v-icon left>mdi-plus</v-icon></v-btn>
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
    };
  },

  computed: {
    headers() {
      return [{ title: this.$t('name'), key: 'name' }];
    },
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
