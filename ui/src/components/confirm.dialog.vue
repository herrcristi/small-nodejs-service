<template>
  <v-dialog v-model="visible" max-width="500px">
    <v-card>
      <v-card-title>{{ $t(titleKey) }}</v-card-title>

      <v-spacer />

      <v-card-text>
        <div v-html="translatedMessage"></div>
      </v-card-text>

      <v-spacer />

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="onCancel">{{ $t(cancelKey) }}</v-btn>
        <v-btn :color="okColor" @click="onConfirm">{{ $t(okKey) }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  titleKey: { type: String, default: 'delete' },
  messageKey: { type: String, default: 'delete_confirm' },
  args: { type: Object, default: () => ({}) },
  okKey: { type: String, default: 'delete' },
  cancelKey: { type: String, default: 'cancel' },
  okColor: { type: String, default: 'error' },
});

/**
 * emit
 */
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

/**
 * visible
 */
const visible = computed({
  get: () => !!props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

/**
 * raw message
 */
const rawMessage = computed(() => {
  return t(props.messageKey) || props.messageKey;
});

/**
 * translated message
 */
const translatedMessage = computed(() => {
  let msg = rawMessage.value || '';
  // simple interpolation {key}
  if (props.args) {
    for (const k in props.args) {
      const re = new RegExp(`\\{${k}\\}`, 'g');
      msg = msg.replace(re, props.args[k]);
    }
  }
  return msg;
});

/**
 * on cancel
 */
function onCancel() {
  emit('cancel');
  emit('update:modelValue', false);
}

/**
 * on confirm
 */
function onConfirm() {
  emit('confirm');
  emit('update:modelValue', false);
}
</script>

<style scoped>
/* small styling can be added here */
</style>
