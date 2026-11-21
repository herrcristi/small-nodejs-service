<template>
  <v-btn
    size="x-small"
    variant="text"
    class="text-none"
    :color="props.modelValue ? 'error' : 'medium-emphasis'"
    :prepend-icon="props.modelValue ? 'mdi-delete-off-outline' : 'mdi-delete-outline'"
    :text="props.modelValue ? t('delete.hide') : t('delete.show')"
    @click.stop="emit('update:modelValue', !props.modelValue)"
  />
</template>

<script setup>
/**
 * show delete: the delete buttons of a list (or of a page) are hidden until the user asks for them, so nothing is
 * deleted by an accidental click (a delete is also confirmed). A table with a header has it in the header of its actions
 * column; a list without a header (an inner table) next to its "+"; the profile in its toolbar
 */
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props: v-model, the delete buttons are shown
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

/**
 * emit
 */
const emit = defineEmits(['update:modelValue']);
</script>
