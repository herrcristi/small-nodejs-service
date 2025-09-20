<template>
  <v-card>
    <v-container>
      <v-overlay :model-value="showLoading" absolute>
        <v-progress-circular indeterminate size="48" color="primary" />
      </v-overlay>

      <v-row :loading="showLoading">
        <v-col cols="12">
          <h2>{{ $t('profile') }}</h2>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>
              {{ $t('profile') }}
              <v-spacer />
              <v-btn small color="primary" @click="openEdit">{{ $t('edit') }}</v-btn>
            </v-card-title>
            <v-card-text>
              <v-simple-table>
                <tbody>
                  <tr>
                    <td>ID</td>
                    <td>{{ profile.id }}</td>
                  </tr>
                  <tr>
                    <td>{{ $t('name') }}</td>
                    <td>{{ profile.name }}</td>
                  </tr>
                  <tr>
                    <td>{{ $t('email') }}</td>
                    <td>{{ profile.email }}</td>
                  </tr>
                  <tr>
                    <td>{{ $t('birthday') }}</td>
                    <td>{{ profile.birthday ? new Date(profile.birthday).toLocaleDateString() : '' }}</td>
                  </tr>
                  <tr>
                    <td>{{ $t('phone') }}</td>
                    <td>{{ profile.phone }}</td>
                  </tr>
                  <tr>
                    <td>{{ $t('address') }}</td>
                    <td>{{ profile.address }}</td>
                  </tr>
                </tbody>
              </v-simple-table>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card>
            <v-card-title> {{ $t('schools') }} / {{ $t('role') }} </v-card-title>
            <v-card-text>
              <v-simple-table>
                <thead>
                  <tr>
                    <th>{{ $t('schools.title') }}</th>
                    <th>{{ $t('role') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in profile.schools || []" :key="s.name">
                    <td>{{ s.name }}</td>
                    <td>{{ s.role }}</td>
                  </tr>
                </tbody>
              </v-simple-table>
            </v-card-text>
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
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '../stores/stores.js';
import Api from '../api/api.js';

export default {
  name: 'Profile',
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
          auth.raw = { ...auth.raw, ...data };
          auth.save(auth);
          profile.value = auth.raw;
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
      try {
        if (profile.value?.id) {
          const payload = {
            name: edit.value.name,
            birthday: edit.value.birthday,
            phone: edit.value.phone,
            address: edit.value.address,
          };
          await Api.updateUser(profile.value.id, payload);

          // update store locally
          auth.raw = { ...auth.raw, ...edit.value };
          auth.save(auth);
        }
      } catch (e) {
        // ignore API errors for now
      }

      profile.value = auth.raw;
      editDialog.value = false;
    }

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
    };
  },
};
</script>

<style scoped>
.tenant-name {
  font-weight: 600;
}
</style>
