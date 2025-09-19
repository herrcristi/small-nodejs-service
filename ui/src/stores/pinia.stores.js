import { defineStore } from 'pinia';

import { SMALL_AUTH_KEY, SMALL_APP_KEY } from './appkeys.stores.js';

export const piniaAuthStore = defineStore('auth', {
  /**
   * state
   */
  state: () => ({
    token: null,
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
      try {
        const raw = localStorage.getItem(SMALL_AUTH_KEY);
        if (!raw) {
          return;
        }
        const obj = JSON.parse(raw);
        this.token = obj.token || null;
        this.raw = obj.raw || obj;
      } catch (e) {
        // ignore
        console.error('Failed to load auth in store', e);
      }
    },

    /**
     * save
     */
    save(obj) {
      try {
        const payload = { token: obj.token || obj?.access_token || null, raw: obj };
        localStorage.setItem(SMALL_AUTH_KEY, JSON.stringify(payload));
        this.token = payload.token;
        this.raw = payload.raw;
      } catch (e) {
        console.error('Failed to save auth in store', e);
      }
    },

    /**
     * clear
     */
    clear() {
      try {
        localStorage.removeItem(SMALL_AUTH_KEY);
      } catch (e) {
        console.error('Failed to clear in store', e);
      }
      this.token = null;
      this.raw = null;
    },
  },
});
