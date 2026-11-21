<template>
  <!-- only the icon (the tables): its text is the title -->
  <v-btn
    v-if="props.iconOnly"
    icon
    size="x-small"
    variant="text"
    :color="props.modelValue ? 'error' : 'medium-emphasis'"
    :title="toggleText"
    @click.stop="toggle"
  >
    <v-icon>{{ toggleIcon }}</v-icon>
  </v-btn>

  <!-- the icon and the text -->
  <v-btn
    v-else
    size="small"
    variant="text"
    class="text-none"
    :color="props.modelValue ? 'error' : 'medium-emphasis'"
    :prepend-icon="toggleIcon"
    :text="toggleText"
    @click.stop="toggle"
  />
</template>

<script setup>
/**
 * show delete: the delete buttons of a list (or of a page) are hidden until the user asks for them, so nothing is
 * deleted by an accidental click (a delete is also confirmed). A table with a header has its icon in the header of its
 * actions column; a list without a header (an inner table) its icon next to its "+"; the profile has it with its text
 * where the delete of the account is shown
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props: v-model, the delete buttons are shown
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  iconOnly: { type: Boolean, default: false }, // only the icon (its text is the title)
});

/**
 * emit
 */
const emit = defineEmits(['update:modelValue']);

/**
 * the icon and the text of the next action (show or hide)
 */
const toggleIcon = computed(() => (props.modelValue ? 'mdi-delete-off-outline' : 'mdi-delete-outline'));
const toggleText = computed(() => (props.modelValue ? t('delete.hide') : t('delete.show')));

/**
 * show or hide the delete buttons
 */
function toggle() {
  emit('update:modelValue', !props.modelValue);
}
</script>
