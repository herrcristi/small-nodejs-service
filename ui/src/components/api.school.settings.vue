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

              <!-- what a student sees of the other students of its groups and schedules -->
              <v-list-item :title="`${t('settings.classmates')}: ${classmatesText}`">
                <template #append>
                  <ActionIcon
                    icon="mdi-pencil"
                    :title="t('edit')"
                    :disabled="loading || saveCall.inProgress"
                    :loading="saveCall.loading"
                    @click="openClassmates"
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

            <!-- unchecked: keep (the default, traces); checked: delete (it can not be undone) -->
            <v-checkbox v-model="deleteRemoved" color="error" hide-details>
              <template #label>
                <div class="option-title">{{ t('settings.removedMembers.delete') }}</div>
              </template>
            </v-checkbox>
            <div class="option-description ms-10">
              {{
                deleteRemoved
                  ? t('settings.removedMembers.delete.description')
                  : t('settings.removedMembers.keep.description')
              }}
            </div>

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
          the classmates: a student sees the other students of its groups and schedules, or only itself (a professor
          sees all of them, a student always sees only itself in the list of the students)
      -->
      <v-dialog v-model="classmatesDialog" max-width="700px">
        <v-card>
          <v-card-title>{{ t('settings.classmates') }}</v-card-title>

          <v-card-text>
            <p class="mb-4">{{ t('settings.classmates.description') }}</p>
            <v-checkbox v-model="showClassmates" hide-details>
              <template #label>
                <div class="option-title">{{ t('settings.classmates.show') }}</div>
              </template>
            </v-checkbox>
            <div class="option-description ms-10">
              {{
                showClassmates ? t('settings.classmates.show.description') : t('settings.classmates.hide.description')
              }}
            </div>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn text @click="classmatesDialog = false">{{ t('cancel') }}</v-btn>
            <v-btn color="primary" :disabled="!changed || saveCall.inProgress" @click="handleSave">
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
const DefaultSettings = { removedMembers: 'keep', classmates: 'show' }; // the defaults of the server
const saved = ref({ ...DefaultSettings }); // the settings of the school (the defaults until they are read)
const edit = ref({ ...saved.value });
const editDialog = ref(false);
const classmatesDialog = ref(false);
const confirmDelete = ref(false);
const saveCall = ComponentsUtils.useSingleCall(); // one save at a time

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

/**
 * the current choice, in one line
 */
const removedMembersText = computed(() => t(`settings.removedMembers.${saved.value.removedMembers}.short`));
const classmatesText = computed(() => t(`settings.classmates.${saved.value.classmates}.short`));

/**
 * changed: the edited settings are not the saved ones
 */
const changed = computed(() => Object.keys(DefaultSettings).some((key) => edit.value[key] !== saved.value[key]));

// the checkbox of the delete choice (unchecked: keep)
const deleteRemoved = computed({
  get: () => edit.value.removedMembers === 'delete',
  set: (checked) => {
    edit.value.removedMembers = checked ? 'delete' : 'keep';
  },
});

// the checkbox of the classmates (unchecked: hide)
const showClassmates = computed({
  get: () => edit.value.classmates === 'show',
  set: (checked) => {
    edit.value.classmates = checked ? 'show' : 'hide';
  },
});

/**
 * the settings of an answer (all the settings, the defaults for the ones not set)
 */
function getSettings(data) {
  return { ...DefaultSettings, removedMembers: data.removedMembers, classmates: data.classmates };
}

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
    saved.value = getSettings(response.data);
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
 * open the classmates dialog with the saved settings (not while loading or while a save is in progress)
 */
function openClassmates() {
  if (loading.value || saveCall.inProgress) {
    return;
  }
  edit.value = { ...saved.value };
  classmatesDialog.value = true;
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
  classmatesDialog.value = false;

  try {
    // all the settings (a put replaces them)
    const payload = { removedMembers: edit.value.removedMembers, classmates: edit.value.classmates };
    const response = await Api.updateSchoolSettings(appStore.tenantID, payload);
    saved.value = getSettings(response.data);
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
