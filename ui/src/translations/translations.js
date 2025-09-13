/**
 * Translation utils
 */
import fs from 'fs';
import path from 'path';

const Private = {
  Strings: {
    en: {},
  },

  /**
   * expand args {0}...
   */
  expandArgs: (val, args, _ctx) => {
    if (!val) {
      return val;
    }

    // it works for array and for object with names too
    // [ 'a', 'b' ] and { a: valA, b: valB }
    for (let key in args) {
      val = val.replaceAll(`{${key}}`, args[key]);
    }

    return val;
  },
};

const Translations = {
  /**
   * init language strings
   */
  initStrings: async (language, file, _ctx) => {
    try {
      Private.Strings[language] = JSON.parse(fs.readFileSync(file));

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
};

export default Translations;
