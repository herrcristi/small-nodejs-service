<template>
  <router-view v-slot="{ Component, route }">
    <component :is="route.meta?.noLayout ? 'div' : 'Layout'">
      <component :is="Component" />
    </component>
  </router-view>
</template>

<script>
import Layout from './components/layout.vue';

export default {
  name: 'App',
  components: { Layout },
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
