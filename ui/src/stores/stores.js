import { piniaAuthStore, piniaAppStore } from './pinia.stores.js';
import { localAuthStore, localAppStore } from './appstorage.stores.js';

export const useAuthStore = piniaAuthStore;
export const useAppStore = piniaAppStore;
