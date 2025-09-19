import { SMALL_AUTH_KEY, SMALL_APP_KEY } from './appkeys.stores.js';

export const localAuthStore = {
  /**
   * load
   */
  load() {
    try {
      const raw = localStorage.getItem(SMALL_AUTH_KEY);
      if (!raw) {
        return null;
      }
      const obj = JSON.parse(raw);

      if (!obj.expires || new Date(obj.expires) < new Date()) {
        this.clear();
        return null;
      }
      return obj;
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
      const payload = {
        token: obj.token || obj?.access_token || null,
        expires: obj.expires || null,
        raw: obj.raw || obj || null,
      };

      if (!obj.expires || new Date(obj.expires) < new Date()) {
        this.clear();
        return null;
      } else {
        localStorage.setItem(SMALL_AUTH_KEY, JSON.stringify(payload));
        return payload;
      }
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
  },
};

export const localAppStore = {
  /**
   * load
   */
  load() {
    try {
      const raw = localStorage.getItem(SMALL_APP_KEY);
      if (!raw) {
        return null;
      }
      const obj = JSON.parse(raw);
      return obj;
    } catch (e) {
      // ignore
      console.error('Failed to load app in store', e);
    }
  },

  /**
   * save
   */
  save(obj) {
    try {
      const payload = {
        tenantID: obj.tenantID || null,
      };
      localStorage.setItem(SMALL_APP_KEY, JSON.stringify(payload));
      return payload;
    } catch (e) {
      console.error('Failed to save auth in store', e);
    }
  },

  /**
   * clear
   */
  clear() {
    try {
      localStorage.removeItem(SMALL_APP_KEY);
    } catch (e) {
      console.error('Failed to clear app in store', e);
    }
  },

  /**
   * save
   */
  saveTenantID(tenantID) {
    try {
      let payload = this.load() || {};
      payload = {
        ...payload,
        tenantID: tenantID || null,
      };
      this.save(payload);
    } catch (e) {
      console.error('Failed to save auth in store', e);
    }
  },
};
