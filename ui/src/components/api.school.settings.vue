<template>
  <v-card>
    <v-container>
      <v-row>
        <v-col cols="12" md="8">
          <!--
              the settings of the school, one line each: the current choice and its edit
          -->
          <v-card>
            <v-toolbar flat>
              <v-card-title>{{ t('settings') }}</v-card-title>
            </v-toolbar>

            <v-progress-linear v-if="loading" indeterminate color="primary" />

            <v-list density="compact">
              <!-- the removed members: kept as traces, or deleted with what they are part of -->
              <v-list-item :title="`${t('settings.removedMembers')}: ${removedMembersText}`">
                <template #append>
                  <ActionIcon
                    icon="mdi-pencil"
                    :title="t('edit')"
                    :disabled="loading || saveCall.inProgress"
                    :loading="saveCall.loading"
                    @click="openEdit"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>

      <!--
          edit dialog: the choice, explained (closes when the save starts, the pencil shows the call)
      -->
      <v-dialog v-model="editDialog" max-width="700px">
        <v-card>
          <v-card-title>{{ t('settings.removedMembers') }}</v-card-title>

          <v-card-text>
            <p class="mb-4">{{ t('settings.removedMembers.description') }}</p>

            <v-radio-group v-model="edit.removedMembers" hide-details>
              <!-- keep: the default -->
              <v-radio value="keep" color="primary">
                <template #label>
                  <div>
                    <div class="option-title">{{ t('settings.removedMembers.keep') }}</div>
                    <div class="option-description">{{ t('settings.removedMembers.keep.description') }}</div>
                  </div>
                </template>
              </v-radio>

              <!-- delete: the records and their places in the groups and the schedules, it can not be undone -->
              <v-radio value="delete" color="error" class="mt-4">
                <template #label>
                  <div>
                    <div class="option-title text-error">{{ t('settings.removedMembers.delete') }}</div>
                    <div class="option-description">{{ t('settings.removedMembers.delete.description') }}</div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>

            <v-alert v-if="edit.removedMembers === 'delete'" type="warning" variant="tonal" class="mt-4">
              {{ t('settings.removedMembers.delete.warning') }}
            </v-alert>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn text @click="editDialog = false">{{ t('cancel') }}</v-btn>
            <v-btn color="primary" :disabled="!changed || saveCall.inProgress" @click="onSaveClicked">
              {{ t('save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!--
          the confirmation of the delete choice
      -->
      <ConfirmDialog
        v-model="confirmDelete"
        titleKey="settings.removedMembers.delete"
        messageKey="settings.removedMembers.delete.confirm"
        okKey="save"
        @confirm="handleSave"
      />

      <!--
          snackbar for notifications
      -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
    </v-container>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Api from '../api/api.js';
import ActionIcon from './base.action.icon.vue';
import ConfirmDialog from './base.confirm.dialog.vue';
import ComponentsUtils from './components.utils.js';
import { useAppStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const appStore = useAppStore();
const loading = ref(false);
const saved = ref({ removedMembers: 'keep' }); // the settings of the school (the default until they are read)
const edit = ref({ ...saved.value });
const editDialog = ref(false);
const confirmDelete = ref(false);
const saveCall = ComponentsUtils.useSingleCall(); // one save at a time

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * the current choice, in one line
 */
const removedMembersText = computed(() => t(`settings.removedMembers.${saved.value.removedMembers}.short`));

/**
 * changed: the edited settings are not the saved ones
 */
const changed = computed(() => edit.value.removedMembers !== saved.value.removedMembers);

/**
 * show a message
 */
function showMessage(text, color) {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
}

/**
 * load the settings of the current school
 */
async function loadSettings() {
  loading.value = true;
  try {
    const response = await Api.getSchoolSettings(appStore.tenantID);
    saved.value = { removedMembers: response.data.removedMembers };
  } catch (e) {
    console.error('Error loading the settings', e);
    const errText = ComponentsUtils.getErrorText(e, t);
    showMessage(`${t('settings.fetch.error')} - ${errText}`, 'error');
  } finally {
    loading.value = false;
  }
}

/**
 * open the edit dialog with the saved settings (not while loading or while a save is in progress)
 */
function openEdit() {
  if (loading.value || saveCall.inProgress) {
    return;
  }
  edit.value = { ...saved.value };
  editDialog.value = true;
}

/**
 * save: the delete choice is confirmed first (it can not be undone for the members removed after it)
 */
function onSaveClicked() {
  if (edit.value.removedMembers === 'delete') {
    confirmDelete.value = true;
    return;
  }
  handleSave();
}

async function handleSave() {
  await saveCall.run(saveSettings);
}

async function saveSettings() {
  // the dialog closes: the pencil shows the call until the answer
  editDialog.value = false;

  try {
    const payload = { removedMembers: edit.value.removedMembers };
    const response = await Api.updateSchoolSettings(appStore.tenantID, payload);
    saved.value = { removedMembers: response.data.removedMembers };
    showMessage(t('settings.update.success'), 'success');
  } catch (e) {
    console.error('Error saving the settings', e);
    const errText = ComponentsUtils.getErrorText(e, t);
    showMessage(`${t('settings.update.error')} - ${errText}`, 'error');
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.option-title {
  font-weight: 600;
}
.option-description {
  font-size: 0.9rem;
  color: #666;
}
</style>
