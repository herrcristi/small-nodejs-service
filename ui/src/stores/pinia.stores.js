import { defineStore } from 'pinia';
import { localAuthStore, localAppStore } from './appstorage.stores.js';

export const piniaAuthStore = defineStore('auth', {
  /**
   * state
   */
  state: () => ({
    expires: null,
    raw: null,
  }),

  /**
   * actions
   */
  actions: {
    /**
     * load
     */
    load() {
      const obj = localAuthStore.load();

      this.expires = obj?.expires || null;
      this.raw = obj?.raw || null;
      return obj;
    },

    /**
     * save
     */
    save(obj) {
      const payload = localAuthStore.save(obj);

      this.expires = payload?.expires || null;
      this.raw = payload?.raw || null;
    },

    /**
     * clear
     */
    clear() {
      localAuthStore.clear();

      this.expires = null;
      this.raw = null;
    },
  },
});

export const piniaAppStore = defineStore('app', {
  /**
   * state
   */
  state: () => ({
    tenantID: null,
    rolesPermissions: null,
  }),

  /**
   * actions
   */
  actions: {
    /**
     * load
     */
    load() {
      const obj = localAppStore.load();

      this.tenantID = obj?.tenantID || null;
      this.rolesPermissions = obj?.rolesPermissions || null;
      return obj;
    },

    /**
     * save
     */
    save() {
      const payload = {
        tenantID: this.tenantID || null,
        rolesPermissions: this.rolesPermissions || null,
      };

      localAppStore.save(payload);
    },

    /**
     * clear
     */
    clear() {
      localAppStore.clear();

      this.tenantID = null;
      this.rolesPermissions = null;
    },

    /**
     * save
     */
    saveTenant(tenantID, rolesPermissions) {
      this.load();

      this.tenantID = tenantID || null;
      this.rolesPermissions = rolesPermissions || null;

      this.save();
    },
  },
});
