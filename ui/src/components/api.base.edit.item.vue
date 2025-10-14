<template>
  <v-card v-if="props.write">
    <!-- 
          dialog
    -->
    <v-dialog v-model="dialog" max-width="800px" v-if="props.write && (props.apiFn?.create || props.apiFn?.update)">
      <v-card>
        <v-card-title>{{ editing ? t('edit') : t('add') }}</v-card-title>

        <v-card-text>
          <v-form ref="editForm" v-model="formValid">
            <slot name="edit.name" :itemData="itemData">
              <v-text-field
                v-if="fieldsSet.has('name') || fieldsSet.has('user.name')"
                v-model="itemData.name"
                :label="t('name')"
                :rules="[nameRule]"
                required
              />
            </slot>

            <slot name="edit.status" :itemData="itemData">
              <v-select
                v-if="fieldsSet.has('status') || fieldsSet.has('user.status')"
                v-model="itemData.status"
                :items="statusItems"
                item-title="title"
                item-value="value"
                :label="t('status')"
                :rules="[statusRule]"
                required
              />
            </slot>

            <slot name="edit.email" :itemData="itemData">
              <v-text-field
                v-if="fieldsSet.has('email') || fieldsSet.has('user.email')"
                v-model="itemData.email"
                :label="t('email')"
                :rules="[emailRule]"
                required
              />
            </slot>

            <slot name="edit.credits" :itemData="itemData">
              <v-text-field
                v-if="fieldsSet.has('credits')"
                v-model.number="itemData.credits"
                type="number"
                :label="t('credits')"
                :rules="[creditsRule]"
                min="1"
                required
              />
            </slot>

            <slot name="edit.required" :itemData="itemData">
              <v-select
                v-if="fieldsSet.has('required')"
                v-model="itemData.required"
                :items="requiredItems"
                item-title="title"
                item-value="value"
                :label="t('required')"
                :rules="[requiredRule]"
                required
              />
            </slot>

            <slot name="edit.address" :itemData="itemData">
              <v-text-field
                v-if="fieldsSet.has('address')"
                v-model="itemData.address"
                :label="t('address')"
                :rules="[addressRule]"
                required
              />
            </slot>

            <slot name="edit.class" :itemData="itemData">
              <v-text-field
                v-if="fieldsSet.has('class')"
                v-model="itemData.class.id"
                :label="t('class')"
                :rules="[requiredRule]"
                required
              />
            </slot>

            <slot name="edit.description" :itemData="itemData">
              <v-text-field
                v-if="fieldsSet.has('description')"
                v-model="itemData.description"
                :label="t('description')"
                required
              />
            </slot>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">{{ t('cancel') }}</v-btn>
          <v-btn color="primary" :disabled="!formValid" @click="handleSubmit">{{ t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 
      snackbar for notifications
    -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * state
 */
const props = defineProps({
  title: { type: [String], default: null },
  addFields: { type: Array, default: [] },
  editFields: { type: Array, default: [] },

  write: { type: [Boolean, Number], default: null },

  apiFn: { type: Object, default: {} }, // add, update
});

/**
 * edit
 */
const itemData = reactive({});
const editing = ref(false);
const editingItemID = ref(null);
const dialog = ref(false);
const editForm = ref(null);
const formValid = ref(false);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * emit
 */
const emit = defineEmits(['cancel', 'save']);

/**
 * fields
 */
const fieldsSet = ref(new Set([]));

/**
 * status items for the select
 */
const statusItems = computed(() => {
  // base items
  // when adding add pending too
  let items = [];

  if (!editing.value) {
    items.push({ title: t('pending'), value: 'pending' });
  }

  items = [
    ...items,
    { title: t('active'), value: 'active' },
    { title: t('disabled'), value: 'disabled', disabled: false },
  ];

  return items;
});

/**
 * required items for the select
 */
const requiredItems = computed(() => {
  return [
    { title: t('required'), value: 'required' },
    { title: t('optional'), value: 'optional' },
  ];
});

/**
 * rules
 */
const nameRule = (v) => (!!v && v.toString().trim().length > 0) || t('name.required');
const statusRule = (v) => !!v || t('required');
const emailRule = (v) => (!!v && v.toString().trim().length > 0) || t('email.required');
const addressRule = (v) => (!!v && v.toString().trim().length > 0) || t('required');
// credits must be a number greater than or equal to zero
const creditsRule = (v) => {
  const n = Number(v);
  return (n != null && !Number.isNaN(n) && n >= 0 && n <= 1024) || t('credits.limits') || t('required');
};
const requiredRule = (v) => !!v || t('required');

/**
 * handle submit
 */
async function handleSubmit() {
  if (editForm.value && typeof editForm.value.validate === 'function') {
    const ok = await editForm.value.validate();
    if (!ok) {
      return;
    }
  }

  // trim
  if (itemData.name) {
    itemData.name = itemData.name.toString().trim();
  }
  if (itemData.email) {
    itemData.email = itemData.email.toString().trim();
  }
  if (itemData.description) {
    itemData.description = itemData.description.toString().trim();
  }

  let ok = false;
  if (editing.value) {
    ok = await update();
  } else {
    ok = await add();
  }

  if (ok) {
    dialog.value = false;
    resetForm();

    emit('save');
  }
}

/**
 * add
 */
async function add() {
  try {
    const payload = { ...itemData };
    await props.apiFn.create(payload);

    snackbarText.value = t('add.success') || 'Added';
    snackbarColor.value = 'success';
    snackbar.value = true;

    return true;
  } catch (e) {
    console.error('Error adding:', e);
    const errText = e.response?.data?.error?.toString() || e.toString();

    snackbarText.value = (t('add.error') || 'Error adding') + ' - ' + errText;
    snackbarColor.value = 'error';
    snackbar.value = true;

    return false;
  }
}

/**
 * update
 */
async function update() {
  try {
    await props.apiFn.update(editingItemID.value, itemData);

    snackbarText.value = t('update.success') || 'Updated';
    snackbarColor.value = 'success';
    snackbar.value = true;

    return true;
  } catch (e) {
    console.error('Error updating:', e);
    const errText = e.response?.data?.error?.toString() || e.toString();

    snackbarText.value = (t('update.error') || 'Error updating') + ' - ' + errText;
    snackbarColor.value = 'error';
    snackbar.value = true;

    return false;
  }
}

/**
 * open add dialog
 */
function openAdd() {
  if (!props.write) {
    return;
  }

  resetForm();
  fieldsSet.value = new Set(props.addFields);

  // default status for new
  if (fieldsSet.value.has('status')) {
    itemData.status = 'active';
  }
  if (fieldsSet.value.has('user.status')) {
    itemData.status = 'pending';
  }
  if (fieldsSet.value.has('credits')) {
    itemData.credits = 0;
  }
  if (fieldsSet.value.has('required')) {
    itemData.required = 'required';
  }
  if (fieldsSet.value.has('class')) {
    itemData.class = { id: '', status: 'pending', name: '' };
  }

  editing.value = false;
  dialog.value = true;
}

/**
 * open edit dialog
 */
function openEdit(item) {
  if (!props.write) {
    return;
  }

  resetForm();
  fieldsSet.value = new Set(props.editFields);
  Object.keys(itemData).forEach((k) => delete itemData[k]);

  // set
  if (fieldsSet.value.has('name') || fieldsSet.value.has('user.name')) {
    itemData.name = item.name || item.user?.name || '';
  }
  if (fieldsSet.value.has('email') || fieldsSet.value.has('user.email')) {
    itemData.email = item.email || item.user?.email || '';
  }
  if (fieldsSet.value.has('status') || fieldsSet.value.has('user.status')) {
    itemData.status = item.status || item.user?.status || 'active';
  }
  if (fieldsSet.value.has('description')) {
    itemData.description = item.description || '';
  }
  if (fieldsSet.value.has('credits')) {
    itemData.credits = Number(item.credits || 0);
  }
  if (fieldsSet.value.has('required')) {
    itemData.required = item.required || 'required';
  }
  if (fieldsSet.value.has('address')) {
    itemData.address = item.address || '';
  }
  if (fieldsSet.value.has('class')) {
    itemData.class = item.class || { id: '', status: 'pending', name: '' };
  }

  editing.value = true;
  editingItemID.value = item.id;
  dialog.value = true;
}

/**
 * close dialog
 */
function closeDialog() {
  dialog.value = false;
  resetForm();
  fieldsSet.value = new Set([]);

  emit('cancel');
}

/**
 * reset form
 */
function resetForm() {
  Object.keys(itemData).forEach((k) => delete itemData[k]);

  editing.value = false;
  editingItemID.value = null;
}

/**
 * mounted
 */
function mounted() {}

/**
 * expose
 */
defineExpose({ openAdd, openEdit });
</script>

<style scoped>
/* component styles */
</style>
