<template>
  <component :is="layoutComponent">
    <Layout>
      <!-- <router-view /> -->
    </Layout>
  </component>
  <component :is="loginComponent">
    <Login> </Login>
  </component>
  <component :is="tenantSelectComponent">
    <TenantSelect> </TenantSelect>
  </component>
</template>

<script>
import Layout from './components/layout.vue';
import Login from './components/login.vue';
import TenantSelect from './components/tenant.select.vue';
import { useRoute } from 'vue-router';

export default {
  name: 'App',
  components: { Layout, Login, TenantSelect },
  setup() {
    const route = useRoute();
    const layoutComponent = () => {
      // if route.meta.noLayout is true, render a simple fragment container
      return !route.meta?.noLayout ? Layout : null;
    };
    const loginComponent = () => {
      return route.path === '/login' ? Login : null;
    };
    const tenantSelectComponent = () => {
      return route.path === '/tenants' ? TenantSelect : null;
    };
    return { layoutComponent, loginComponent, tenantSelectComponent };
  },
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap');
html,
body,
#app {
  height: 100%;
}
body {
  font-family: 'Roboto', sans-serif;
}
</style>
