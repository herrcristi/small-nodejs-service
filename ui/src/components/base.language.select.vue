<template>
  <!--
    the choice of a language, each with its flag (the language of a user, of an invitation)
  -->
  <v-select
    :model-value="props.modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
    :label="props.label || t('language')"
    :items="Languages"
    item-title="name"
    item-value="code"
  >
    <template #selection="{ item }">
      <LanguageFlag :language="item.raw.code" class="mr-2" />{{ item.raw.name }}
    </template>
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps">
        <template #prepend><LanguageFlag :language="item.raw.code" class="mr-3" /></template>
      </v-list-item>
    </template>
  </v-select>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { useI18n } from 'vue-i18n';
import { Languages } from '../i18n.js';
import LanguageFlag from './base.language.flag.vue';

const { t } = useI18n();

/**
 * props
 */
const props = defineProps({
  modelValue: { type: String, default: null }, // the code of the language (en, ro)
  label: { type: String, default: null }, // none: "Language"
});

const emit = defineEmits(['update:modelValue']);
</script>
