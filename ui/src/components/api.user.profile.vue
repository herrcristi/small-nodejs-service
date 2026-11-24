<template>
  <v-card>
    <!-- 
        for details 
    -->
    <ApiDetails
      ref="detailsComponent"
      :itemID="userID"
      :read="true"
      :apiFn="{
        get: Api.getUser,
      }"
      @loading="loading = $event"
      @nodatatext="nodatatext = $event"
      @item="onItemDetails($event)"
    ></ApiDetails>

    <v-container>
      <v-row>
        <v-col cols="12" md="7">
          <!-- 
              profile 
          -->
          <v-card>
            <v-toolbar flat>
              <v-card-title class="d-flex justify-space-between align-center">
                {{ t('profile') }}
                <v-spacer />
                <v-toolbar-items class="d-flex align-center">
                  <ActionIcon
                    class="mr-2"
                    color="primary"
                    icon="mdi-pencil"
                    :title="t('edit')"
                    :disabled="saveCall.inProgress"
                    :loading="saveCall.loading"
                    @click="openEdit"
                    v-if="!loading"
                  />

                  <!-- icon-only button for extra-small screens (password) -->
                  <v-btn
                    small
                    icon
                    class="d-flex d-sm-none ml-2"
                    color="primary"
                    :disabled="passwordCall.inProgress"
                    :loading="passwordCall.loading"
                    @click="openPasswordDialog"
                    :title="t('password.edit')"
                    v-if="!loading"
                  >
                    <v-icon>mdi-lock-reset</v-icon>
                  </v-btn>

                  <!-- full text button for small and larger screens (password) -->
                  <v-btn
                    small
                    class="ml-2 d-none d-sm-flex"
                    color="primary"
                    :disabled="passwordCall.inProgress"
                    :loading="passwordCall.loading"
                    @click="openPasswordDialog"
                    :title="t('password.edit')"
                    v-if="!loading"
                    >{{ t('password.change') }}</v-btn
                  >

                  <!-- icon-only button for extra-small screens -->
                  <v-btn
                    small
                    icon
                    class="d-flex d-sm-none ml-2"
                    color="primary"
                    :disabled="emailCall.inProgress"
                    :loading="emailCall.loading"
                    @click="openEmailDialog"
                    :title="t('email.edit')"
                    v-if="!loading"
                  >
                    <v-icon>mdi-email</v-icon>
                  </v-btn>

                  <!-- full text button for small and larger screens -->
                  <v-btn
                    small
                    class="ml-2 d-none d-sm-flex"
                    color="primary"
                    :disabled="emailCall.inProgress"
                    :loading="emailCall.loading"
                    @click="openEmailDialog"
                    :title="t('email.edit')"
                    v-if="!loading"
                    >{{ t('email.change') }}</v-btn
                  >

                  <!-- email change buttons end -->
                </v-toolbar-items>
              </v-card-title>
            </v-toolbar>

            <!-- 
                key values 
            -->
            <key-value v-if="!nodatatext" :items="profileItems" :loading="loading"> </key-value>

            <v-card v-if="!!nodatatext">
              {{ nodatatext }}
            </v-card>
          </v-card>
        </v-col>

        <v-col cols="12" md="5">
          <!-- 
              schools 
          -->
          <v-card v-if="!nodatatext">
            <v-toolbar flat>
              <v-card-title class="d-flex justify-space-between">
                {{ t('status') }}
                <v-spacer />
              </v-card-title>
            </v-toolbar>

            <key-value :items="schoolRolesItems" :loading="loading"> </key-value>
          </v-card>
        </v-col>
      </v-row>

      <!-- 
          delete the account: shown on demand, here (no accidental delete), and confirmed (it can not be undone)
      -->
      <v-row v-if="!loading && !nodatatext">
        <v-col cols="12" md="7">
          <ShowDelete v-model="showDelete" />
        </v-col>
      </v-row>
      <v-row v-if="!loading && !nodatatext && showDelete">
        <v-col cols="12" md="7">
          <v-card variant="outlined" color="error">
            <v-card-title>{{ t('account.delete') }}</v-card-title>
            <v-card-text class="text-medium-emphasis">{{ t('account.delete.description') }}</v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="error"
                variant="flat"
                :disabled="deleteCall.inProgress"
                :loading="deleteCall.loading"
                @click="confirmDeleteAccount = true"
                >{{ t('account.delete') }}</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <ConfirmDialog
        v-model="confirmDeleteAccount"
        titleKey="account.delete"
        messageKey="account.delete.confirm"
        okKey="account.delete"
        @confirm="handleDeleteAccount"
      />

      <!-- 
          edit dialog 
      -->
      <v-dialog v-model="editDialog" max-width="600px">
        <v-card>
          <v-card-title>{{ t('edit') }}</v-card-title>
          <v-card-text>
            <v-form ref="editForm" v-model="formValid">
              <v-text-field v-model="edit.name" :label="t('name')" :rules="ProfileRules.name" required />

              <v-menu v-model="birthdaymenu" :close-on-content-click="false" transition="scale-transition" offset-y>
                <template #activator>
                  <v-text-field
                    v-model="edit.birthday"
                    :label="t('birthday')"
                    readonly
                    append-icon="mdi-calendar"
                    @click:append="birthdaymenu = true"
                  />
                </template>
                <v-date-picker v-model="datePicker" show-adjacent-months @update:modelValue="onDatePicked" />
              </v-menu>

              <v-text-field v-model="edit.phoneNumber" :label="t('phoneNumber')" :rules="ProfileRules.phoneNumber" />
              <v-text-field v-model="edit.address" :label="t('address')" :rules="ProfileRules.address" />

              <!-- the language of the UI (and of the emails of the user), with its flag -->
              <LanguageSelect v-model="edit.language" />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="editDialog = false">{{ t('cancel') }}</v-btn>
            <v-btn color="primary" :disabled="!formValid || saveCall.inProgress" @click="handleSave">
              {{ t('save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- 
          Change password dialog 
      -->
      <PasswordChange
        ref="passwordChangeComponent"
        :call="passwordCall"
        @close=""
        @password-changed=""
      ></PasswordChange>

      <!-- 
          Change email dialog 
      -->
      <EmailChange
        ref="emailChangeComponent"
        :call="emailCall"
        @close=""
        @email-changed="onEmailChanged($event)"
      ></EmailChange>

      <!-- 
          snackbar for notifications
      -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
    </v-container>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import ApiDetails from './api.base.details.vue';
import KeyValue from './base.keyvalue.vue';
import LanguageSelect from './base.language.select.vue';
import { Languages, setLanguage } from '../i18n.js';
import ActionIcon from './base.action.icon.vue';
import PasswordChange from './api.user.change.password.vue';
import EmailChange from './api.user.change.email.vue';
import ConfirmDialog from './base.confirm.dialog.vue';
import ShowDelete from './base.show.delete.vue';
import Api from '../api/api.js';
import ComponentsUtils from './components.utils.js';
import { useAuthStore, useAppStore } from '../stores/stores.js';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();

/**
 * props
 */
const detailsComponent = ref();
const userID = ref('');
const profile = ref({});
const loading = ref(false);
const nodatatext = ref('');

const auth = useAuthStore();
const router = useRouter();

// edit
const editDialog = ref(false);
const edit = ref({ ...profile.value });
const birthdaymenu = ref(false);

// the rules of the profile fields, the same as the server (Schema.UserProfile): a value it would refuse keeps the dialog
// open with its message; a field left empty is optional and is not sent
const ProfileRules = {
  name: [(v) => ComponentsUtils.Edit.Rules.name(v, t), (v) => ComponentsUtils.Edit.Rules.nameLength(v, t)],
  phoneNumber: [(v) => ComponentsUtils.Edit.Rules.phoneNumber(v, t)],
  address: [(v) => ComponentsUtils.Edit.Rules.addressLength(v, t)],
};
const formValid = ref(false);
// the calls of the dialogs, each shown on the button that opened its dialog (disabled, a spinner when it takes long)
const saveCall = ComponentsUtils.useSingleCall(); // the profile (handleSave)
const passwordCall = ComponentsUtils.useSingleCall(); // the password change (PasswordChange)
const emailCall = ComponentsUtils.useSingleCall(); // the email change (EmailChange)
const deleteCall = ComponentsUtils.useSingleCall(); // the delete of the account
const confirmDeleteAccount = ref(false);
const showDelete = ref(false); // the delete of the account is hidden until the user asks for it (ShowDelete)
const editForm = ref(null);
const datePicker = ref(null);

// password
const passwordChangeComponent = ref();

// email change
const emailChangeComponent = ref();

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

// fetch fresh profile from server when component mounts
onMounted(async () => {
  userID.value = auth?.raw?.userID;
});

/**
 * profileItems
 */
const profileItems = computed(() => {
  return [
    { key: 'id', value: profile.value.id, translate: true },
    { key: 'name', value: profile.value.name, translate: true },
    { key: 'email', value: profile.value.email, translate: true },
    {
      key: 'birthday',
      value: getDateString(profile.value.birthday),
      translate: true,
    },
    { key: 'phoneNumber', value: profile.value.phoneNumber, translate: true },
    { key: 'address', value: profile.value.address, translate: true },
    {
      key: 'language',
      value: getLanguageName(profile.value.language),
      language: profile.value.language,
      translate: true,
    },
  ];
});

/**
 * the name of a language (in its own language), none when the user has not chosen one
 */
function getLanguageName(code) {
  return Languages.find((language) => language.code === code)?.name;
}

/**
 * schoolRolesItems
 */
const schoolRolesItems = computed(() => {
  return (
    profile.value?.schools?.map((school) => {
      return { key: school.name, value: school.roles.join(', ') };
    }) || []
  );
});

/**
 * ApiDetails events after get details
 */
async function onItemDetails(data) {
  if (data) {
    auth.raw = { ...auth.raw, name: data.name, email: data.email };
    useAuthStore()?.save(auth);
    profile.value = { ...auth.raw, ...data };
  }
}

/**
 * openEdit
 */
function openEdit() {
  // not while loading, nor while a save is in progress (one at a time)
  if (loading.value || saveCall.inProgress) {
    return;
  }
  edit.value = { ...profile.value };
  edit.value.language ??= locale.value; // none chosen yet: the language shown
  if (edit.value.birthday) {
    try {
      // is in UTC format
      // console.log('openEdit birthday:', edit.value.birthday);
      datePicker.value = new Date(edit.value.birthday);
      edit.value.birthday = getDateString(edit.value.birthday);
    } catch (e) {
      // leave as-is
    }
  } else {
    datePicker.value = null;
  }
  editDialog.value = true;
}

/**
 * handle save: one save at a time (a second click sends nothing); the dialog closes when the call starts, and the edit
 * button shows the call until the answer; the snackbar tells the result
 */
async function handleSave() {
  await saveCall.run(onSave);
}

async function onSave() {
  // validate form
  if (editForm.value && typeof editForm.value.validate === 'function') {
    const ok = await editForm.value.validate();
    if (!ok) {
      return;
    }
  }
  await saveEdit();
}

async function saveEdit() {
  try {
    if (profile.value?.id) {
      // console.log('Saving profile, datePicker:', datePicker.value);
      // console.log('datePicker as ISO:', datePicker.value ? getUTCISOString(datePicker.value) : null);

      // the fields left empty are not sent (the server refuses an empty value: a birthday that was never picked)
      const payload = { name: edit.value.name.trim() };
      if (datePicker.value) {
        payload.birthday = getUTCISOString(datePicker.value);
      }
      if (edit.value.phoneNumber) {
        payload.phoneNumber = edit.value.phoneNumber;
      }
      if (edit.value.address) {
        payload.address = edit.value.address;
      }
      if (edit.value.language) {
        payload.language = edit.value.language;
      }

      // the dialog closes: the edit button shows the call until the answer
      editDialog.value = false;

      await Api.updateUser(profile.value.id, payload);

      // update store locally
      let auth = useAuthStore();
      auth.raw = { ...auth.raw, name: payload.name, email: auth.raw.username };
      useAuthStore()?.save(auth);

      // update local profile
      profile.value = { ...profile.value, ...payload };

      // the UI in the language chosen
      setLanguage(payload.language);

      snackbarText.value = t('profile.update.success');
      snackbarColor.value = 'success';
      snackbar.value = true;
    }
  } catch (e) {
    console.error('Error saving profile', e);
    const errText = ComponentsUtils.getErrorText(e, t);

    snackbarText.value = t('profile.update.error') + ' - ' + errText;
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

function onDatePicked(value) {
  // value is YYYY-MM-DD (date-picker v-model). Update display and close menu.
  if (value) {
    try {
      // console.log('On date picked:', value);
      const isoValue = getUTCISOString(value);
      edit.value.birthday = getDateString(isoValue);
      // console.log('On date picked set birthday:', edit.value.birthday);
    } catch (e) {
      console.log('Error parsing date:', e);
      edit.value.birthday = '';
    }
  } else {
    edit.value.birthday = '';
  }
  birthdaymenu.value = false;
}

/**
 * date
 */
function getDateString(date) {
  if (!date) {
    return '';
  }
  try {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch (e) {
    console.error('Error formatting date', e);
    return '';
  }
}

function getUTCISOString(date) {
  if (!date) {
    return '';
  }
  try {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();
    const utcTime = Date.UTC(year, month, day);
    return new Date(utcTime).toISOString();
  } catch (e) {
    console.error('Error formatting date', e);
    return '';
  }
}

/**
 * password
 */
function openPasswordDialog() {
  passwordChangeComponent.value.openDialog();
}

/**
 * email
 */
function openEmailDialog() {
  emailChangeComponent.value.openDialog();
}

/**
 * delete the account: one call at a time; then the session is gone, so the local data is cleared and the login is shown
 */
async function handleDeleteAccount() {
  await deleteCall.run(deleteAccount);
}

async function deleteAccount() {
  try {
    await Api.deleteAccount();

    auth.clear();
    useAppStore().clear();
    router.push('/login');
  } catch (e) {
    console.error('Error deleting the account', e);
    const errText = ComponentsUtils.getErrorText(e, t);

    snackbarText.value = t('account.delete.error') + ' - ' + errText;
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

async function onEmailChanged(emailNew) {
  profile.value = { ...profile.value, email: emailNew };

  // trigger a refresh
  setTimeout(() => {
    /* await */ detailsComponent.value.refresh();
  }, 1000);
}
</script>

<style scoped>
.tenant-name {
  font-weight: 600;
}
</style>
