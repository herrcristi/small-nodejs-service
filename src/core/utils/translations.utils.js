/**
 * Translation utils
 */
const fs = require('fs');

const CommonUtils = require('./common.utils');

const Private = {
  Languages: {
    en: {},
  },

  /**
   * expand args {0}...
   */
  expandArgs: (val, args, _ctx) => {
    if (!val) {
      return val;
    }

    for (let i = 0; i < args.length; ++i) {
      val = val.replaceAll(`{${i}}`, args[i]);
    }
    return val;
  },
};

const Public = {
  /**
   * init language
   */
  initLanguage: async (language, file, _ctx) => {
    try {
      Private.Languages[language] = JSON.parse(fs.readFileSync(file));

      console.log(`Language added ${language} from file ${file}`);
      return Private.Languages;
    } catch (e) {
      console.log(`Failed to add language ${language} from file ${file}. Error: ${CommonUtils.getLogError(e)}`);
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
    for (const lang in Private.Languages) {
      const lval = val?.toLowerCase();
      r[lang] = Private.Languages[lang][lval] || Private.Languages['en'][lval] || val;
      r[lang] = Private.expandArgs(r[lang], args, _ctx);
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
    for (const lang in Private.Languages) {
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

      for (const lang in Private.Languages) {
        // added as _lang_en to be easily projected
        obj[`_lang_${lang}.${prop}`] = translations[prop][lang] || translations[prop]['en'];
      }
    }
    return obj;
  },
};

module.exports = { ...Public };
