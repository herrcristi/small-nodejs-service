<template>
  <!--
        more info of a school: its admins (the same compact list as the more info of the other pages)
        the invitations of school admins are done by the school admins, a school is created with its first admin
        a portal admin invites an admin (+), changes the name and the status of an admin (see ApiUserEditDialog), and
        removes an admin (only the admin role on this school); all can be removed, a new one can be invited later
  -->
  <v-card>
    <v-card-text>
      <v-row class="d-flex justify-end">
        <v-col cols="12" md="10">
          <ApiTableData
            title="admins"
            :items="admins"
            :fields="adminsFields.fields"
            :sortFields="adminsFields.sortFields"
            :filterFields="adminsFields.filterFields"
            :apiFn="adminsApiFn"
            :read="1"
            :write="props.write"
            :loading="loading"
            :nodatatext="nodatatext"
            @addItem="openInvite()"
            @editItem="openEdit($event)"
            @deleteItem="load()"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>

  <!-- 
        invite an admin of the school (a new user gets the signup email, an existing user the invitation)
  -->
  <v-dialog v-if="props.write" v-model="inviteDialog" max-width="600px">
    <v-card>
      <v-card-title>{{ t('schools.admins.invite') }}</v-card-title>
      <v-card-text>
        <v-form ref="inviteForm" v-model="inviteFormValid">
          <v-text-field v-model="inviteEmail" :label="t('email')" :rules="[emailReqRule, emailValidRule]" required />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="inviteDialog = false">{{ t('cancel') }}</v-btn>
        <v-btn color="primary" :disabled="!inviteFormValid || inviting" :loading="inviting" @click="invite">
          {{ t('save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>

  <ApiUserEditDialog v-if="props.write" v-model="dialog" :user="editingUser" @saved="load()" />
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Api from '../api/api.js';
import ApiTableData from './api.base.table.data.vue';
import ApiUserEditDialog from './api.user.edit.dialog.vue';
import ComponentsUtils from './components.utils.js';
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();

/**
 * props
 */
const props = defineProps({
  itemID: { type: String, default: null }, // the school id
  write: { type: [Boolean, Number], default: 0 }, // the admins can be edited (portal admin)
});

/**
 * fields
 */
const adminsFields = {
  fields: ['name', 'email', 'status'],
  projectionFields: ['name', 'email', 'status'],
  sortFields: ['name', 'email', 'status'],
  filterFields: ['name', 'email'],
};

/**
 * the admins of the school
 */
const admins = ref([]);
const loading = ref(false);
const nodatatext = ref('');

async function load() {
  if (!props.itemID) {
    admins.value = [];
    return;
  }

  loading.value = true;
  try {
    const languages = ComponentsUtils.getServerLanguages(locale.value);
    const params = new URLSearchParams({
      projection: `id,${languages},${adminsFields.projectionFields}`,
      sort: 'name',
      limit: 100, // a school has a few admins
    });
    const query = params.toString();
    const response = await Api.getSchoolAdmins(props.itemID, query);
    admins.value = response.data?.data || [];
    nodatatext.value = '';
  } catch (e) {
    console.error('Error fetching the admins of the school', e);
    admins.value = [];
    nodatatext.value = e.response?.data?.error?.toString() || e.toString();
  } finally {
    loading.value = false;
  }
}

watch(() => props.itemID, load, { immediate: true });

/**
 * the actions: invite (+), edit (the dialog does the update) and delete (also the last admin: one can be invited later)
 */
const adminsApiFn = computed(() => ({
  add: props.write ? 1 : 0,
  update: props.write ? 1 : 0,
  delete: props.write ? (userID) => Api.removeSchoolAdmin(props.itemID, userID) : 0,
}));

/**
 * edit
 */
const dialog = ref(false);
const editingUser = ref(null);

function openEdit(item) {
  if (!props.write) {
    return;
  }
  editingUser.value = { ...item };
  dialog.value = true;
}

/**
 * invite an admin
 */
const inviteDialog = ref(false);
const inviteEmail = ref('');
const inviteForm = ref(null);
const inviteFormValid = ref(false);
const inviting = ref(false);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

const emailReqRule = (v) => ComponentsUtils.Edit.Rules.emailReq(v, t);
const emailValidRule = (v) => ComponentsUtils.Edit.Rules.emailValid(v, t);

function openInvite() {
  if (!props.write) {
    return;
  }
  inviteEmail.value = '';
  inviteDialog.value = true;
}

async function invite() {
  if (inviteForm.value && typeof inviteForm.value.validate === 'function') {
    const ok = await inviteForm.value.validate();
    if (!ok) {
      return;
    }
  }

  const apiFn = { create: (payload) => Api.inviteSchoolAdmin(props.itemID, payload.email) };
  const snackbarO = { ref: snackbar, text: snackbarText, color: snackbarColor };

  inviting.value = true;
  try {
    const payload = { email: inviteEmail.value.trim() };
    const ok = await ComponentsUtils.Edit.add(apiFn, payload, snackbarO, t);
    if (ok) {
      inviteDialog.value = false;
      await load();
    }
  } finally {
    inviting.value = false;
  }
}
</script>
