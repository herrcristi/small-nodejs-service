<template>
  <!--
        edit a user by a portal admin: the name and the status (active / disabled)
        the email is the login of the user and only the user can change it (with the password)
        a portal admin can not change its own status
  -->
  <v-dialog :model-value="modelValue" @update:modelValue="emit('update:modelValue', $event)" max-width="600px">
    <v-card>
      <v-card-title>{{ t('users.edit') }}</v-card-title>

      <v-card-text>
        <div class="mb-4 text-medium-emphasis">{{ props.user?.email }}</div>

        <v-form ref="editForm" v-model="formValid">
          <v-text-field v-model="itemData.name" :label="t('name')" :rules="[nameRule]" required />

          <v-select
            v-if="!isSelf"
            v-model="itemData.status"
            :items="statusItems"
            item-title="title"
            item-value="value"
            :label="t('status')"
            :rules="[statusRule]"
            required
          />
          <div v-else class="text-caption text-medium-emphasis">{{ t('users.status.self') }}</div>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="emit('update:modelValue', false)">{{ t('cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!formValid || saveCall.inProgress" @click="handleSave">{{ t('save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import Api from '../api/api.js';
import { useAuthStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
import ComponentsUtils from './components.utils.js';
const { t } = useI18n();

/**
 * props
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false }, // the dialog is open
  user: { type: Object, default: null }, // { id, name, email, status }
  // the call of the parent (ComponentsUtils.useSingleCall), shown on the button that opened the dialog (the edit of the
  // row: itemID is the user); without it the dialog has its own
  call: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue', 'saved']);

const auth = useAuthStore();
const isSelf = computed(() => !!props.user?.id && props.user.id === auth?.raw?.userID);

/**
 * edit
 */
const itemData = reactive({ name: '', status: '' });
const formValid = ref(false);
const editForm = ref(null);
const saveCall = props.call || ComponentsUtils.useSingleCall(); // one save at a time (handleSave)

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

// a pending user stays pending until the first login (pending is shown, but it can not be chosen)
const statusItems = computed(() => {
  const items = ComponentsUtils.Edit.statusItems(t, { skipPending: true });
  if (props.user?.status === 'pending') {
    return [{ title: t('pending'), value: 'pending', disabled: true }, ...items];
  }
  return items;
});

const nameRule = (v) => ComponentsUtils.Edit.Rules.name(v, t);
const statusRule = (v) => ComponentsUtils.Edit.Rules.status(v, t);

// fill the form each time the dialog is opened
watch(
  () => [props.modelValue, props.user],
  () => {
    if (props.modelValue) {
      itemData.name = props.user?.name || '';
      itemData.status = props.user?.status || '';
    }
  },
  { immediate: true }
);

/**
 * handle save: one call at a time (a second click sends nothing); the dialog closes when the call starts, and the
 * button that opened it shows the call until the answer; the snackbar tells the result
 */
async function handleSave() {
  await saveCall.run(save, props.user?.id);
}

/**
 * save only what was changed: the name (profile) and the status (its own route)
 */
async function save() {
  if (editForm.value && typeof editForm.value.validate === 'function') {
    const ok = await editForm.value.validate();
    if (!ok) {
      return;
    }
  }

  const id = props.user?.id;
  const name = `${itemData.name || ''}`.trim();

  // the dialog closes: the button that opened it shows the call
  emit('update:modelValue', false);

  try {
    if (name !== props.user?.name) {
      await Api.updateUser(id, { name });
    }
    if (!isSelf.value && itemData.status !== props.user?.status) {
      await Api.updateUserStatus(id, { status: itemData.status });
    }

    snackbarText.value = t('update.success');
    snackbarColor.value = 'success';
    snackbar.value = true;

    emit('saved');
  } catch (e) {
    console.error('Error updating user', e);
    const errText = ComponentsUtils.getErrorText(e, t);
    snackbarText.value = `${t('update.error')} - ${errText}`;
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}
</script>
