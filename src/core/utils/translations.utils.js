/**
 * Translation utils
 */
const fs = require('fs');
const path = require('path');

const CommonUtils = require('./common.utils');

const Private = {
  Strings: {
    en: {},
  },
  Emails: {
    en: {},
  },

  /**
   * expand args {0}, {name}...
   * in one pass: an inserted value is never expanded again (a name that contains '{user}' stays as it is)
   * transform is applied to every value that is inserted (for example an escape)
   */
  expandArgs: (val, args, _ctx, transform = (v) => v) => {
    if (!val || !args) {
      return val;
    }

    // it works for array and for object with names too
    // [ 'a', 'b' ] and { a: valA, b: valB }; a placeholder without an argument stays as it is
    // a function replacement: the value is inserted as it is (a '$&' in it has no special meaning)
    return val.replaceAll(/\{([^{}]+)\}/g, (placeholder, key) => {
      if (!Object.hasOwn(args, key)) {
        return placeholder;
      }
      return transform(`${args[key]}`);
    });
  },

  /**
   * escape a value that is inserted in html (the body of an email)
   * the values are names and urls that come from users: they must stay text
   */
  escapeHtml: (val) => {
    return `${val}`
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },

  /**
   * a value that is inserted in a subject: a single line
   */
  singleLine: (val) => {
    return `${val}`.replace(/[\r\n]+/g, ' ');
  },
};

const Public = {
  /**
   * init language strings
   */
  initStrings: async (language, file, _ctx) => {
    try {
      const text = fs.readFileSync(file);
      Private.Strings[language] = JSON.parse(text);

      console.log(`\nLanguage strings added ${language} from file ${file}`);
      return Private.Strings;
    } catch (e) {
      console.log(
        `\nFailed to add language strings ${language} from file ${file}. Error: ${CommonUtils.getLogError(e)}`
      );
      return null;
    }
  },

  /**
   * init language emails
   */
  initEmails: async (language, file, _ctx) => {
    try {
      const text = fs.readFileSync(file);
      Private.Emails[language] = JSON.parse(text);

      for (const key in Private.Emails[language]) {
        const emailTemplate = Private.Emails[language][key];
        const folder = path.dirname(file);
        const emailFile = path.join(folder, emailTemplate.email);
        emailTemplate.email = fs.readFileSync(emailFile).toString();
      }

      console.log(`\nLanguage emails added ${language} from file ${file}`);
      return Private.Emails;
    } catch (e) {
      console.log(
        `\nFailed to add language emails ${language} from file ${file}. Error: ${CommonUtils.getLogError(e)}`
      );
      return null;
    }
  },

  /**
   * translate string
   */
  string: (val, _ctx, args = []) => {
    if (val === undefined) {
      return undefined;
    }

    let r = {};
    for (const lang in Private.Strings) {
      const lval = val?.toLowerCase();
      r[lang] = Private.Strings[lang][lval] || Private.Strings['en'][lval] || val;
      r[lang] = Private.expandArgs(r[lang], args, _ctx);
    }

    return r;
  },

  /**
   * translate email { subject, email }
   */
  email: (emailType, _ctx, args = []) => {
    if (emailType === undefined) {
      return undefined;
    }

    let r = {};
    for (const lang in Private.Emails) {
      const emailTypeLowercase = emailType?.toLowerCase();
      const template = Private.Emails[lang][emailTypeLowercase] || Private.Emails['en'][emailTypeLowercase];

      // expand subject, email into a NEW object
      // the template is cached and shared (also by the languages that fall back to 'en'), so it must never be changed,
      // otherwise the first expanded text (with its links and tokens) would be sent to every later recipient
      r[lang] = null;
      if (template) {
        r[lang] = {};
        for (const key in template) {
          // the subject is text (one line), the other parts (the body) are html: escape what is inserted
          const transform = key === 'subject' ? Private.singleLine : Private.escapeHtml;
          r[lang][key] = Private.expandArgs(template[key], args, _ctx, transform);
        }
      }
    }

    return r;
  },

  /**
   * translate number
   */
  number: (val, _ctx, args = []) => {
    if (val === undefined) {
      return undefined;
    }

    let r = {};
    for (const lang in Private.Strings) {
      const lval = `${val}`;
      r[lang] = val === null ? null : lval;
    }

    return r;
  },

  /**
   * add translations props to object (as patch to not override existing translations)
   */
  addTranslations: (obj, translations, _ctx) => {
    if (!obj) {
      return obj;
    }

    for (const prop in translations) {
      if (!translations[prop]) {
        continue;
      }

      for (const lang in Private.Strings) {
        // added as _lang_en to be easily projected
        obj[`_lang_${lang}.${prop}`] = translations[prop][lang] || translations[prop]['en'];
      }
    }
    return obj;
  },

  /**
   * add the translations of a referenced object to the object that references it, wherever the reference is written
   * (as patch, like addTranslations): its translated fields (ref.translations) are added as _lang_en.user.status,
   * searched in the language of the request like the fields of the object
   * only for a reference to one object at the top of the object (user, not classes[] or schedules[].location)
   * ref: { fieldName, translations?: [ the translated fields of the referenced object ] }, like { fieldName: 'user',
   *   translations: ['status'] }
   * refObj: the referenced object (or its changed fields), like { status: 'active' }
   */
  addReferenceTranslations: (obj, ref, refObj, _ctx) => {
    const translations = {};
    for (const field of ref.translations || []) {
      translations[`${ref.fieldName}.${field}`] = Public.string(refObj?.[field], _ctx);
    }
    return Public.addTranslations(obj, translations, _ctx);
  },
};

module.exports = { ...Public };
