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
            :call="saveCall"
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
        <v-btn color="primary" :disabled="!inviteFormValid || saveCall.inProgress" @click="handleInvite">
          {{ t('save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>

  <ApiUserEditDialog v-if="props.write" v-model="dialog" :user="editingUser" :call="saveCall" @saved="load()" />
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

// the calls of the list (a load after an invite, an edit or a delete): only the answer of the latest is shown
const adminsCalls = ComponentsUtils.useLatestCall();

async function load() {
  const callNumber = adminsCalls.next();
  if (!props.itemID) {
    admins.value = [];
    return;
  }

  // the loader only when the list takes long
  const timeoutID = setTimeout(() => {
    loading.value = true;
  }, ComponentsUtils.LoadingDelay);

  try {
    const languages = ComponentsUtils.getServerLanguages(locale.value);
    const params = new URLSearchParams({
      projection: `id,${languages},${adminsFields.projectionFields}`,
      sort: 'name',
      limit: 100, // a school has a few admins
    });
    const query = params.toString();
    const response = await Api.getSchoolAdmins(props.itemID, query);

    // a newer request was sent: its answer is the one to show
    if (!adminsCalls.isLatest(callNumber)) {
      return;
    }
    admins.value = response.data?.data || [];
    nodatatext.value = '';
  } catch (e) {
    console.error('Error fetching the admins of the school', e);

    // a newer request was sent: its answer is the one to show
    if (!adminsCalls.isLatest(callNumber)) {
      return;
    }
    admins.value = [];
    nodatatext.value = ComponentsUtils.getErrorText(e, t);
  } finally {
    clearTimeout(timeoutID);

    // the loader stays while the latest call is in progress
    if (adminsCalls.isLatest(callNumber)) {
      loading.value = false;
    }
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
 * the call of the panel (an invite from +, the edit of an admin from its row): one at a time; the button that opened
 * the dialog is disabled, with a spinner when it takes long, and the snackbar tells the result
 */
const saveCall = ComponentsUtils.useSingleCall();

/**
 * edit (the dialog saves with saveCall)
 */
const dialog = ref(false);
const editingUser = ref(null);

function openEdit(item) {
  // not while a call is in progress
  if (!props.write || saveCall.inProgress) {
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

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

const emailReqRule = (v) => ComponentsUtils.Edit.Rules.emailReq(v, t);
const emailValidRule = (v) => ComponentsUtils.Edit.Rules.emailValid(v, t);

function openInvite() {
  // not while a call is in progress
  if (!props.write || saveCall.inProgress) {
    return;
  }
  inviteEmail.value = '';
  inviteDialog.value = true;
}

/**
 * invite: one call at a time (a second click sends nothing); the dialog closes when the call starts, and the + shows
 * it until the answer; the snackbar tells the result
 */
async function handleInvite() {
  await saveCall.run(invite);
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

  // the dialog closes: the + shows the call
  inviteDialog.value = false;

  // the answer of an invite is the same for every case: the text says only that it was sent
  const payload = { email: inviteEmail.value.trim() };
  const ok = await ComponentsUtils.Edit.add(apiFn, payload, snackbarO, t, { successKey: 'invite.success' });
  if (ok) {
    await load();
  }
}
</script>
