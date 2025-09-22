<template>
  <v-card>
    <v-container>
      <v-row>
        <v-col cols="12" md="7">
          <!-- 
              profile 
          -->
          <v-card>
            <v-toolbar flat>
              <v-card-title class="d-flex justify-space-between">
                {{ $t('profile') }}
                <v-spacer />
                <v-icon
                  small
                  class="mr-2"
                  color="primary"
                  @click="openEdit"
                  :title="$t('edit')"
                  size="small"
                  v-if="!showLoading"
                  >mdi-pencil</v-icon
                >
              </v-card-title>
            </v-toolbar>

            <key-value :items="profileItems" :loading="showLoading"> </key-value>
          </v-card>
        </v-col>

        <v-col cols="12" md="5">
          <!-- 
              schools 
          -->
          <v-card>
            <v-toolbar flat>
              <v-card-title class="d-flex justify-space-between">
                {{ $t('status') }}
                <v-spacer />
              </v-card-title>
            </v-toolbar>

            <key-value :items="schoolRolesItems" :loading="showLoading"> </key-value>
          </v-card>
        </v-col>
      </v-row>

      <v-dialog v-model="editDialog" max-width="600px">
        <v-card>
          <v-card-title>{{ $t('edit') }}</v-card-title>
          <v-card-text>
            <v-form ref="editForm" v-model="formValid">
              <v-text-field
                v-model="edit.name"
                :label="$t('name')"
                :rules="[(v) => !!v || $t('name_required') || 'Name is required']"
                required
              />

              <v-menu ref="menu" v-model="menu" :close-on-content-click="false" transition="scale-transition" offset-y>
                <template #activator="{ props }">
                  <v-text-field v-bind="props" v-model="edit.birthday" :label="$t('birthday')" readonly />
                </template>
                <v-date-picker v-model="edit.birthday" @input="menu = false" />
              </v-menu>

              <v-text-field v-model="edit.phone" :label="$t('phone')" />
              <v-text-field v-model="edit.address" :label="$t('address')" />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="editDialog = false">{{ $t('cancel') }}</v-btn>
            <v-btn color="primary" :disabled="!formValid" @click="onSave">{{ $t('save') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </v-card>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useAuthStore } from '../stores/stores.js';
import Api from '../api/api.js';
import KeyValue from './keyvalue.vue';

export default {
  name: 'Profile',
  components: { KeyValue },
  /**
   * setup
   */
  setup() {
    const auth = useAuthStore();
    const profile = ref(auth.raw || {});

    const editDialog = ref(false);
    const edit = ref({ ...profile.value });
    const menu = ref(false);
    const formValid = ref(false);
    const editForm = ref(null);
    const showLoading = ref(false);
    let loadingTimer = null;

    // fetch fresh profile from server when component mounts
    onMounted(async () => {
      const userId = auth.raw?.id;
      if (!userId) {
        return;
      }

      // start timer to show spinner after 300ms
      loadingTimer = setTimeout(() => {
        showLoading.value = true;
      }, 300);

      try {
        const resp = await Api.getUser(userId);
        const data = resp?.data || resp?.value || resp;
        if (data) {
          auth.raw = { ...auth.raw, name: data.name, email: data.email };
          auth.save(auth);
          profile.value = { ...auth.raw, ...data };
        }
      } catch (e) {
        // ignore
      } finally {
        if (loadingTimer) {
          clearTimeout(loadingTimer);
          loadingTimer = null;
        }

        showLoading.value = false;
      }
    });

    /**
     * onBeforeUnmount
     */
    onBeforeUnmount(() => {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
      }
    });

    /**
     * openEdit
     */
    function openEdit() {
      if (showLoading.value) {
        return;
      }
      edit.value = { ...profile.value };
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
      let payload = {};
      try {
        if (profile.value?.id) {
          payload = {
            name: edit.value.name,
            birthday: edit.value.birthday,
            phone: edit.value.phone,
            address: edit.value.address,
          };
          await Api.updateUser(profile.value.id, payload);

          // update store locally
          payload = { ...auth.raw, ...edit.value };
          auth.raw = { ...auth.raw, name: payload.name, email: payload.email };
          auth.save(auth);
        }
      } catch (e) {
        // ignore API errors for now
      }

      profile.value = payload;
      editDialog.value = false;
    }

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
          value: profile.value.birthday
            ? new Date(profile.value.birthday).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '',
          translate: true,
        },
        { key: 'phone', value: profile.value.phone, translate: true },
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

    return {
      profile,
      editDialog,
      edit,
      openEdit,
      saveEdit,
      menu,
      formValid,
      editForm,
      onSave,
      showLoading,
      profileItems,
      schoolRolesItems,
    };
  },
};
</script>

<style scoped>
.tenant-name {
  font-weight: 600;
}
</style>
