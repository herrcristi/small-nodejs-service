import { defineStore } from 'pinia';
import { localAuthStore, localAppStore } from './localstorage.stores.js';

export const piniaAuthStore = defineStore('auth', {
  /**
   * state
   */
  state: () => ({
    token: null,
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

      this.token = obj?.token || null;
      this.expires = obj?.expires || null;
      this.raw = obj?.raw || null;
      return obj;
    },

    /**
     * save
     */
    save(obj) {
      const payload = localAuthStore.save(obj);

      this.token = payload?.token || null;
      this.expires = payload?.expires || null;
      this.raw = payload?.raw || null;
    },

    /**
     * clear
     */
    clear() {
      localAuthStore.clear();

      this.token = null;
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
      return obj;
    },

    /**
     * save
     */
    save() {
      const payload = {
        tenantID: this.tenantID || null,
      };

      localAppStore.save(payload);
    },

    /**
     * clear
     */
    clear() {
      localAppStore.clear();

      this.tenantID = null;
    },

    /**
     * save
     */
    saveTenantID(tenantID) {
      this.load();

      this.tenantID = tenantID || null;

      this.save();
    },
  },
});
