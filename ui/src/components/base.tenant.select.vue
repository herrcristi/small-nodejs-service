<template>
  <v-container>
    <v-row>
      <v-col cols="6">
        <h2>{{ t('tenants') || 'Select Tenant' }}</h2>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="5" v-for="t in tenants" :key="t.id">
        <v-card
          class="tenant-card h-100"
          :class="{ 'tenant-selected': selected === t.id }"
          elevation="2"
          rounded="lg"
          hover
          @click="selectTenant(t)"
        >
          <v-card-title>
            <div>
              <div class="tenant-name">{{ t.name }}</div>
              <div class="tenant-desc">{{ t.description }}</div>
            </div>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getRolesPermissions } from '../auth.js';
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

async function loadTenants() {
  tenants.value =
    useAuthStore()?.raw?.schools?.map((tenant) => {
      return {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        description: tenant.description,
      };
    }) || [];

  // only active tenants
  tenants.value = tenants.value.filter((t) => t.status === 'active');
  // sort by name
  tenants.value.sort((a, b) => a.name.localeCompare(b.name));
}

function selectTenant(t) {
  selected.value = t.id;

  // persist via store helper
  appStore.saveTenant(t.id, getRolesPermissions(t.id, useAuthStore()?.raw));

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
