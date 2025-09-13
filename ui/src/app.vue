<template>
  <!-- <h1>Small App</h1> -->
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/schools">Schools</RouterLink>
    <RouterLink to="/professors">Professors</RouterLink>
    <RouterLink to="/students">Students</RouterLink>
    <RouterLink to="/groups">Groups</RouterLink>
    <RouterLink to="/classes">Classes</RouterLink>
    <RouterLink to="/events">Events</RouterLink>
    <RouterLink to="/locations">Locations</RouterLink>
    <RouterLink to="/schedules">Schedules</RouterLink>
    <RouterLink to="/contact">Contact</RouterLink>
  </nav>
  <p><strong>Current route path:</strong> {{ $route.fullPath }}</p>

  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
