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
                  <v-icon
                    small
                    class="mr-2"
                    color="primary"
                    @click="openEdit"
                    :title="t('edit')"
                    size="small"
                    v-if="!loading"
                    >mdi-pencil</v-icon
                  >

                  <!-- icon-only button for extra-small screens (password) -->
                  <v-btn
                    small
                    icon
                    class="d-flex d-sm-none ml-2"
                    color="primary"
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
          edit dialog 
      -->
      <v-dialog v-model="editDialog" max-width="600px">
        <v-card>
          <v-card-title>{{ t('edit') }}</v-card-title>
          <v-card-text>
            <v-form ref="editForm" v-model="formValid">
              <v-text-field
                v-model="edit.name"
                :label="t('name')"
                :rules="[(v) => !!v || t('name.required') || 'Name is required']"
                required
              />

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

              <v-text-field v-model="edit.phoneNumber" :label="t('phoneNumber')" />
              <v-text-field v-model="edit.address" :label="t('address')" />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="editDialog = false">{{ t('cancel') }}</v-btn>
            <v-btn color="primary" :disabled="!formValid" @click="onSave">{{ t('save') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- 
          Change password dialog 
      -->
      <PasswordChange ref="passwordChangeComponent" @close="" @password-changed=""></PasswordChange>

      <!-- 
          Change email dialog 
      -->
      <EmailChange ref="emailChangeComponent" @close="" @email-changed="onEmailChanged($event)"></EmailChange>

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
import PasswordChange from './api.user.change.password.vue';
import EmailChange from './api.user.change.email.vue';
import Api from '../api/api.js';
import { useAuthStore } from '../stores/stores.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

/**
 * props
 */
const detailsComponent = ref();
const userID = ref('');
const profile = ref({});
const loading = ref(false);
const nodatatext = ref('');

const auth = useAuthStore();

// edit
const editDialog = ref(false);
const edit = ref({ ...profile.value });
const birthdaymenu = ref(false);
const formValid = ref(false);
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
  userID.value = auth?.raw?.id;
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
  ];
});

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
  if (loading.value) {
    return;
  }
  edit.value = { ...profile.value };
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

      const payload = {
        name: edit.value.name,
        birthday: datePicker.value ? getUTCISOString(datePicker.value) : null,
        phoneNumber: edit.value.phoneNumber,
        address: edit.value.address,
      };

      await Api.updateUser(profile.value.id, payload);

      // update store locally
      let auth = useAuthStore();
      auth.raw = { ...auth.raw, name: payload.name, email: auth.raw.email };
      useAuthStore()?.save(auth);

      // update local profile and close dialog
      profile.value = { ...profile.value, ...payload };
      editDialog.value = false;

      snackbarText.value = t('profile.update.success');
      snackbarColor.value = 'success';
      snackbar.value = true;
    }
  } catch (e) {
    console.error('Error saving profile', e);
    const errText = e.response?.data?.error?.toString() || e.toString();

    // keep dialog open and show error
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
      edit.value.birthday = getDateString(getUTCISOString(value));
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
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
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
