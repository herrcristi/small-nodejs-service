import { piniaAuthStore, piniaAppStore } from './pinia.stores.js';
import { localAuthStore, localAppStore } from './localstorage.stores.js';

export const useAuthStore = piniaAuthStore;
export const useAppStore = piniaAppStore;
