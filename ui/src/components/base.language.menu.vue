<template>
  <!--
    the language of the UI: its flag, and a menu of the languages with their flags
    userID: the language chosen is also saved in the profile of the user (none: before a login, only this browser)
  -->
  <v-menu offset-y>
    <template #activator="{ props: menuProps }">
      <v-btn v-bind="menuProps" icon :title="t('language')" :loading="saving">
        <LanguageFlag :language="locale" />
      </v-btn>
    </template>

    <v-list density="compact">
      <v-list-item
        v-for="language in Languages"
        :key="language.code"
        :active="language.code === locale"
        @click="choose(language.code)"
      >
        <template #prepend><LanguageFlag :language="language.code" class="mr-3" /></template>
        <v-list-item-title>{{ language.name }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
import { defineProps, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Api from '../api/api.js';
import { useAuthStore } from '../stores/stores.js';
import { Languages, setLanguage } from '../i18n.js';
import LanguageFlag from './base.language.flag.vue';

const { t, locale } = useI18n();

/**
 * props
 */
const props = defineProps({
  userID: { type: String, default: null }, // the user logged in: its profile keeps the language
});

const saving = ref(false);

/**
 * the UI in the language chosen; the profile of the user keeps it (its next login opens in it)
 */
async function choose(code) {
  if (code === locale.value) {
    return;
  }
  setLanguage(code);
  if (!props.userID || saving.value) {
    return;
  }

  saving.value = true;
  try {
    await Api.updateUser(props.userID, { language: code });
    const auth = useAuthStore();
    auth.raw = { ...auth.raw, language: code };
    auth.save(auth);
  } catch (e) {
    // the UI stays in the language chosen; the profile keeps the previous one (the next login opens in it)
    console.error('Error saving the language of the user', e);
  } finally {
    saving.value = false;
  }
}
</script>
