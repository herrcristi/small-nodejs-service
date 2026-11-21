<template>
  <v-container>
    <v-row>
      <v-col cols="6">
        <h2>{{ t('tenants') || 'Select Tenant' }}</h2>
      </v-col>
    </v-row>

    <!-- 
          the Portal School first (only for portal admins), then a separator, then the other schools
    -->
    <!-- 
          not in any school (all its roles were removed, or not added yet): only its profile and its password
    -->
    <v-row v-if="loaded && !tenants.length">
      <v-col cols="12" md="8">
        <v-alert type="info" variant="tonal">
          <div class="font-weight-bold">{{ t('tenants.none') }}</div>
          <div class="mt-2">{{ t('tenants.none.description') }}</div>
          <v-btn class="mt-4" color="primary" variant="flat" to="/profile">{{ t('profile') }}</v-btn>
        </v-alert>
      </v-col>
    </v-row>

    <v-row>
      <template v-for="(group, index) in tenantGroups" :key="index">
        <v-col cols="12" v-if="index > 0">
          <v-divider />
        </v-col>

        <v-col cols="12" md="5" v-for="tenant in group" :key="tenant.id">
          <v-card
            class="tenant-card h-100"
            :class="{ 'tenant-selected': selected === tenant.id }"
            elevation="2"
            rounded="lg"
            hover
            @click="selectTenant(tenant)"
          >
            <v-card-title>
              <div>
                <div class="tenant-name">{{ tenant.name }}</div>
                <div class="tenant-desc">{{ tenant.description }}</div>
              </div>
            </v-card-title>
          </v-card>
        </v-col>
      </template>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getRolesPermissions } from '../auth.js';
import { bootstrapAuthFromCookie } from '../api/api.js';
import { useAppStore, useAuthStore } from '../stores/stores.js';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const tenants = ref([]);
const appStore = useAppStore();
const router = useRouter();
const route = useRoute();
const selected = ref(appStore.tenantID || null);
const loaded = ref(false); // the schools were read (the empty text is not shown while they are read)

/**
 * the schools in groups: the Portal School first (the one where the user is portal admin), then the other schools
 * the portal school id is only known by the backend, so it is recognized by the role of the membership
 */
const tenantGroups = computed(() => {
  const isPortal = (tenant) => tenant.roles.includes('portal-admin');
  const portal = tenants.value.filter((tenant) => isPortal(tenant));
  const others = tenants.value.filter((tenant) => !isPortal(tenant));
  return [portal, others].filter((group) => group.length);
});

async function loadTenants() {
  // refresh the schools of the user, the list saved at login does not include the schools added after the login
  // (an invitation, or a new school that was pending). If it fails the saved list is used
  await bootstrapAuthFromCookie();
  selected.value = appStore.tenantID || null;

  tenants.value =
    useAuthStore()?.raw?.schools?.map((tenant) => {
      return {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        description: tenant.description,
        roles: tenant.roles || [],
      };
    }) || [];

  // only active tenants
  tenants.value = tenants.value.filter((t) => t.status === 'active');
  // sort by name
  tenants.value.sort((a, b) => a.name.localeCompare(b.name));
  loaded.value = true;
}

function selectTenant(t) {
  selected.value = t.id;

  // persist via store helper
  const authStore = useAuthStore();
  const permissions = getRolesPermissions(t.id, authStore?.raw);
  appStore.saveTenant(t.id, permissions);

  // reset next if tenantID changed
  if (route.query.tenantID && route.query.tenantID !== t.id) {
    route.query.next = '/';
  }

  // redirect
  const next = route.query.next ? decodeURIComponent(route.query.next) : '/';
  router.push(next || '/');
}

onMounted(() => {
  loadTenants();
});
</script>

<style scoped>
/* all the cards have the same shadow, the selected one is marked with a border (not with a different shadow) */
.tenant-card {
  cursor: pointer;
  border: 2px solid transparent;
}
.tenant-selected {
  border-color: rgb(var(--v-theme-primary));
}
.tenant-name {
  font-weight: 600;
  font-size: 1.1rem;
}
.tenant-desc {
  font-size: 0.9rem;
  color: #666;
}
</style>
