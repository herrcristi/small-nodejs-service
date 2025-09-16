<template>
  <v-dialog v-model="visible" max-width="500px">
    <v-card>
      <v-card-title>{{ $t(titleKey) }}</v-card-title>
      <v-card-text>
        <div v-html="translatedMessage"></div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="onCancel">{{ $t(cancelKey) }}</v-btn>
        <v-btn :color="okColor" @click="onConfirm">{{ $t(okKey) }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { inject, computed } from 'vue';

export default {
  name: 'ConfirmDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    titleKey: { type: String, default: 'delete' },
    messageKey: { type: String, default: 'delete_confirm' },
    args: { type: Object, default: () => ({}) },
    okKey: { type: String, default: 'delete' },
    cancelKey: { type: String, default: 'cancel' },
    okColor: { type: String, default: 'error' },
  },
  emits: ['update:modelValue', 'confirm'],
  setup(props, { emit }) {
    const t = inject('t');

    const visible = computed({
      get: () => !!props.modelValue,
      set: (v) => emit('update:modelValue', v),
    });

    const rawMessage = computed(() => {
      const msg = this.$t(props.messageKey) || props.messageKey;
      return msg;
    });

    const translatedMessage = computed(() => {
      let msg = rawMessage.value;
      // simple interpolation {key}
      for (const k in props.args) {
        const re = new RegExp(`\\{${k}\\}`, 'g');
        msg = msg.replace(re, props.args[k]);
      }
      return msg;
    });

    const onCancel = () => {
      emit('update:modelValue', false);
    };

    const onConfirm = () => {
      emit('confirm');
      emit('update:modelValue', false);
    };

    return { visible, translatedMessage, onCancel, onConfirm };
  },
};
</script>

<style scoped>
/* small styling can be added here */
</style>
