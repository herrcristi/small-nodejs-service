<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>Small App</v-app-bar-title>
    </v-app-bar>

    <v-navigation-drawer app permanent color="primary" dark>
      <v-list dense>
        <v-list-item link to="/">
          <v-list-item-title>Home</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/schools">
          <v-list-item-title>Schools</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/students">
          <v-list-item-title>Students</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/professors">
          <v-list-item-title>Professors</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/groups">
          <v-list-item-title>Groups</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/locations">
          <v-list-item-title>Locations</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/events">
          <v-list-item-title>Events</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/classes">
          <v-list-item-title>Classes</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/users">
          <v-list-item-title>Users</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid>
        <div v-if="breadcrumbs?.length" class="breadcrumbs mb-4">
          <RouterLink v-for="(b, i) in breadcrumbs" :key="i" :to="b.to || b.href" class="breadcrumb-link">
            {{ b.text }}
            <span v-if="i < breadcrumbs.length - 1" class="mx-2">/</span>
          </RouterLink>
        </div>

        <slot />
      </v-container>
    </v-main>

    <v-footer app padless>
      <v-col class="text-center">© Small NodeJS Service</v-col>
    </v-footer>
  </v-app>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export default {
  name: 'Layout',
  setup() {
    const route = useRoute();

    const breadcrumbs = computed(() => {
      // Prefer route.meta.breadcrumbs when provided as an array of { text, to }
      if (Array.isArray(route.meta?.breadcrumbs) && route.meta.breadcrumbs.length) {
        return route.meta.breadcrumbs;
      }

      // Fallback: build from path segments
      const parts = route.path.split('/').filter(Boolean);
      let accPath = '';
      return parts.map((p) => {
        accPath += `/${p}`;
        return { text: p.charAt(0).toUpperCase() + p.slice(1), to: accPath };
      });
    });

    return { breadcrumbs };
  },
};
</script>

<style scoped>
/* Add layout-specific styles here */
</style>
