import { SMALL_AUTH_KEY, SMALL_APP_KEY } from './appkeys.stores.js';

// In-memory fallback store. This stops persisting sensitive auth tokens to memStorage
// while allowing the app to keep session state during the page lifecycle.
const memStorage = {
  [SMALL_AUTH_KEY]: null,
  [SMALL_APP_KEY]: null,

  getItem: (key) => {
    return this[key] || null;
  },

  setItem: (key, value) => {
    this[key] = value;
  },

  removeItem: (key) => {
    this[key] = null;
  },
};

const Store = {
  /**
   * load
   */
  load(key, storage /* = memStorage */, checkExpiry = true) {
    try {
      const raw = storage.getItem(key);
      if (!raw) {
        return null;
      }

      const obj = JSON.parse(raw);

      if (checkExpiry && (!obj.expires || new Date(obj.expires) < new Date())) {
        this.clear(key, storage);
        return null;
      }
      return obj;
    } catch (e) {
      console.error(`Failed to load ${key} in store`, e);
      return null;
    }
  },

  /**
   * save
   */
  save(obj, key, storage /* = memStorage */, checkExpiry = true) {
    try {
      const payload = {
        expires: obj.expires || null,
        raw: obj.raw || obj || null,
      };

      if (checkExpiry && (!payload.expires || new Date(payload.expires) < new Date())) {
        this.clear(key, storage);
        return null;
      }
      storage.setItem(key, JSON.stringify(payload));
      return payload;
    } catch (e) {
      console.error(`Failed to save ${key} in store`, e);
    }
  },

  /**
   * clear
   */
  clear(key, storage /* = memStorage */) {
    try {
      storage.removeItem(key);
    } catch (e) {
      console.error(`Failed to clear ${key} in store`, e);
    }
  },
};

export const localAuthStore = {
  load() {
    return Store.load(SMALL_AUTH_KEY, memStorage, true /* checkExpiry */);
  },

  save(obj) {
    return Store.save(obj, SMALL_AUTH_KEY, memStorage, true /* checkExpiry */);
  },

  clear() {
    Store.clear(SMALL_AUTH_KEY, memStorage);
  },
};

export const localAppStore = {
  /**
   * load
   */
  load() {
    let r = Store.load(SMALL_APP_KEY, memStorage, false /* checkExpiry */);

    // load tenantID from local storage
    const localData = Store.load(SMALL_APP_KEY, localStorage, false /* checkExpiry */);
    if (localData) {
      r = { ...r, ...localData };
    }
    return r;
  },

  /**
   * save
   */
  save(obj) {
    const payload = {
      tenantID: obj.tenantID || null,
      rolesPermissions: obj.rolesPermissions || null,
    };
    Store.save(payload, SMALL_APP_KEY, memStorage, false /* checkExpiry */);

    // persist tenantID to localStorage for F5 refresh recovery
    // (validated on bootstrap to ensure it's still in user's schools)
    const payloadForLocal = {
      tenantID: obj.tenantID || null,
    };
    Store.save(payloadForLocal, SMALL_APP_KEY, localStorage, false /* checkExpiry */);
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
    Store.clear(SMALL_APP_KEY, memStorage);

    // clear tenantID from localStorage on logout
    Store.clear(SMALL_APP_KEY, localStorage);
  },
};
