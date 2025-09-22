<template>
  <v-card>
    <!-- can add striped="odd/even" -->
    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      item-key="key"
      class="elevation-1"
      density="compact"
      hide-default-header
      hide-default-footer
    >
      <template v-slot:loading>
        <v-skeleton-loader type="table-row@4"></v-skeleton-loader>
      </template>

      <template #item.key="{ item }">{{ item.translate ? $t(item.key) : item.key }}</template>
      <template #item.value="{ item }">{{ item.value }}</template>
    </v-data-table>
  </v-card>
</template>

<script>
export default {
  name: 'KeyValue',
  props: {
    items: { type: Array, default: () => [] },
    title: { type: String, default: 'Properties' },
    loading: { type: Boolean, default: false },
  },

  mounted() {
    // also log after mount to capture runtime changes
    // console.log('[KeyValue] mounted - current items:', this.items);
  },

  computed: {
    headers() {
      return [
        { title: this.$t('key'), value: 'key' },
        { title: this.$t('value'), value: 'value' },
      ];
    },
  },
};
</script>

<style scoped>
/* small helper styles can be added here if needed */
</style>
