<template>
  <v-progress-circular v-if="props.loading" indeterminate size="16" width="2" color="primary" :title="props.title" />
  <v-icon
    v-else
    small
    size="small"
    :icon="props.icon"
    :disabled="props.disabled"
    :title="props.title"
    @click="onClick"
  />
</template>

<script setup>
/**
 * an action icon of a row (edit, delete): while its call is in progress it is disabled (a click does nothing), and when
 * the call takes longer than ComponentsUtils.LoadingDelay a spinner is shown in its place
 * (see ComponentsUtils.useSingleCall and useItemCalls)
 */

/**
 * props
 */
const props = defineProps({
  icon: { type: String, required: true },
  title: { type: String, default: '' },
  disabled: { type: Boolean, default: false }, // a call is in progress
  loading: { type: Boolean, default: false }, // the call takes long: a spinner instead of the icon
});

/**
 * emit
 */
const emit = defineEmits(['click']);

/**
 * click: nothing while a call is in progress
 */
function onClick() {
  if (props.disabled || props.loading) {
    return;
  }
  emit('click');
}
</script>
