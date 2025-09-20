<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h2>{{ $t('tenants.title') || 'Select Tenant' }}</h2>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" v-for="t in tenants" :key="t.id">
        <v-card
          class="tenant-card"
          :elevation="selected === t.id ? 8 : 2"
          :outlined="selected !== t.id"
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

<script>
import { ref, onMounted } from 'vue';
import Api from '../api/api.js';
import { useAppStore, useAuthStore } from '../stores/stores.js';
import { useRouter, useRoute } from 'vue-router';

export default {
  name: 'TenantSelect',
  setup() {
    const tenants = ref([]);
    const appStore = useAppStore();
    const router = useRouter();
    const route = useRoute();

    async function loadTenants() {
      tenants.value =
        useAuthStore()?.raw?.schools?.map((tenant) => {
          return { id: tenant.id, name: tenant.name };
        }) || [];
    }

    const selected = ref(appStore.tenantID || null);

    function selectTenant(t) {
      selected.value = t.id;

      // persist via store helper
      appStore.saveTenantID(t.id);

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

    return { tenants, selectTenant, selected };
  },
};
</script>

<style scoped>
.tenant-card {
  cursor: pointer;
  transition: transform 0.12s ease-in-out;
}
.tenant-card:hover {
  transform: translateY(-4px);
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
