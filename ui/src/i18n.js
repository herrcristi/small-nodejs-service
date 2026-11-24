import { createI18n } from 'vue-i18n';

import en from './translations/en.json';
import ro from './translations/ro.json';

/**
 * the languages of the UI (the same as the server: WebServerConstants.Languages), each with its name in its own
 * language; a language is shown with its flag (base.language.flag.vue)
 */
export const Languages = [
  { code: 'en', name: 'English' },
  { code: 'ro', name: 'Română' },
];

// the language used before a login (the login page, the page of an emailed link): the last one of this browser, kept
// only as a convenience (the language of a user is in its profile, given by the login)
const LastLanguageKey = 'language';
const DefaultLanguage = 'ro';

function getLastLanguage() {
  try {
    const code = localStorage.getItem(LastLanguageKey);
    return Languages.some((language) => language.code === code) ? code : DefaultLanguage;
  } catch (e) {
    return DefaultLanguage;
  }
}

/**
 * the translations of the UI
 * its language (the locale) is also the language of the requests (x-lang, see api.js): the server searches the texts
 * it translated (_lang_<language>) in the language shown
 */
const i18n = createI18n({
  legacy: false,
  locale: getLastLanguage(),
  fallbackLocale: 'en',
  formatFallbackMessages: true,
  silentFallbackWarn: true,
  messages: {
    en: en,
    ro: ro,
  },
});

export default i18n;

/**
 * show the UI in a language (the language of the user, given by the login, or chosen by it); an unknown language or
 * none changes nothing
 */
export function setLanguage(code) {
  if (!Languages.some((language) => language.code === code)) {
    return;
  }
  i18n.global.locale.value = code;
  try {
    localStorage.setItem(LastLanguageKey, code);
  } catch (e) {
    // ignore (a private window): the language of the user comes back with the next login
  }
}
