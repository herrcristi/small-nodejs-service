<template>
  <Layout>
    <router-view />
  </Layout>
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
