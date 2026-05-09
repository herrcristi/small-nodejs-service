import { SMALL_AUTH_KEY, SMALL_APP_KEY } from './appkeys.stores.js';

// In-memory fallback store. This stops persisting sensitive auth tokens to memStorage
// while allowing the app to keep session state during the page lifecycle.
let _memoryAuth = null;
let _memoryApp = null;

export const localAuthStore = {
  /**
   * load
   */
  load() {
    try {
      if (!_memoryAuth) {
        return null;
      }
      if (!_memoryAuth.expires || new Date(_memoryAuth.expires) < new Date()) {
        this.clear();
        return null;
      }
      return _memoryAuth;
    } catch (e) {
      console.error('Failed to load auth in memory store', e);
      return null;
    }
  },

  /**
   * save
   */
  save(obj) {
    try {
      const payload = {
        expires: obj.expires || null,
        raw: obj.raw || obj || null,
      };

      if (!payload.expires || new Date(payload.expires) < new Date()) {
        this.clear();
        return null;
      }
      _memoryAuth = payload;
      return payload;
    } catch (e) {
      console.error('Failed to save auth in memory store', e);
    }
  },

  /**
   * clear
   */
  clear() {
    try {
      _memoryAuth = null;
    } catch (e) {
      console.error('Failed to clear memory auth store', e);
    }
  },
};

export const localAppStore = {
  /**
   * load
   */
  load() {
    try {
      return _memoryApp || null;
    } catch (e) {
      console.error('Failed to load app in memory store', e);
      return null;
    }
  },

  /**
   * save
   */
  save(obj) {
    try {
      const payload = {
        tenantID: obj.tenantID || null,
        rolesPermissions: obj.rolesPermissions || null,
      };
      _memoryApp = payload;
      return payload;
    } catch (e) {
      console.error('Failed to save app in memory store', e);
    }
  },

  /**
   * saveTenant
   */
  saveTenant(tenantID, rolesPermissions) {
    try {
      let payload = this.load() || {};
      payload = {
        ...payload,
        tenantID: tenantID || null,
        rolesPermissions: rolesPermissions || null,
      };
      this.save(payload);
    } catch (e) {
      console.error('Failed to save tenant in memory store', e);
    }
  },

  /**
   * clear
   */
  clear() {
    try {
      _memoryApp = null;
    } catch (e) {
      console.error('Failed to clear app memory store', e);
    }
  },
};
