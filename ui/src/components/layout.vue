<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>Small App</v-app-bar-title>

      <v-spacer />

      <div class="d-flex align-center">
        <v-menu offset-y>
          <template #activator="{ props }">
            <v-btn v-bind="props" class="d-flex align-center" text>
              <v-avatar class="me-2" size="32" color="secondary">
                <span class="avatar-initials">{{ initials }}</span>
              </v-avatar>
              <div class="me-2">{{ $t('hi_user', { user: userName }) }}</div>
            </v-btn>
          </template>

          <v-list>
            <v-list-item link @click="goProfile">
              <v-list-item-title>{{ $t('profile') }}</v-list-item-title>
            </v-list-item>
            <v-list-item link @click="goTenants">
              <v-list-item-title>{{ $t('tenants') }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="doLogout">
              <v-list-item-title>{{ $t('logout') }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </v-app-bar>

    <v-navigation-drawer app permanent color="primary" dark>
      <v-list dense>
        <v-list-item link to="/">
          <v-list-item-title>{{ $t('home') }} </v-list-item-title>
        </v-list-item>
        <v-list-item link to="/schools">
          <v-list-item-title>{{ $t('schools') }}</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/students">
          <v-list-item-title>{{ $t('students') }}</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/professors">
          <v-list-item-title>{{ $t('professors') }}</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/groups">
          <v-list-item-title>{{ $t('groups') }}</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/locations">
          <v-list-item-title>{{ $t('locations') }}</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/events">
          <v-list-item-title>{{ $t('events') }}</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/classes">
          <v-list-item-title>{{ $t('classes') }}</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/schedules">
          <v-list-item-title>{{ $t('schedules') }}</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/users">
          <v-list-item-title>{{ $t('users') }}</v-list-item-title>
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
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore, useAppStore } from '../stores/stores.js';
import Api from '../api/api.js';

export default {
  name: 'Layout',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const authStore = useAuthStore();
    const appStore = useAppStore();

    /**
     * breadcrumbs
     */
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

    /**
     * userName
     */
    const userName = computed(() => {
      return authStore?.raw?.name || authStore?.raw?.email || 'User';
    });

    /**
     * initials
     */
    const initials = computed(() => {
      const n = userName.value || '';
      return n
        .split(' ')
        .map((p) => p.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    });

    /**
     * profile
     */
    function goProfile() {
      router.push('/profile');
    }

    /**
     * tenants
     */
    function goTenants() {
      const current = window.location.pathname + window.location.search;
      const tenantID = appStore?.tenantID;
      router.push(`/tenants?tenantID=${encodeURIComponent(tenantID || '')}&next=${encodeURIComponent(current)}`);
    }

    /**
     * logout
     */
    async function doLogout() {
      // save next and tenant to re-use after logout redirect
      const current = window.location.pathname + window.location.search;
      const tenantID = appStore?.tenantID;
      try {
        await Api.logout(true);
      } catch (e) {
        // ignore logout errors
      } finally {
        authStore.clear();
        router.push(`/login?tenantID=${encodeURIComponent(tenantID || '')}&next=${encodeURIComponent(current)}`);
      }
    }

    return { breadcrumbs, userName, initials, goProfile, goTenants, doLogout };
  },
};
</script>

<style scoped>
.avatar-initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: white;
  font-weight: 600;
}
/* Add layout-specific styles here */
</style>
