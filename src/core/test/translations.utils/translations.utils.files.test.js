const fs = require('fs');
const path = require('path');
const chai = require('chai');

/**
 * the strings of the languages: every string exists in every language, with the same placeholders
 * (a missing string is shown in English, a missing placeholder loses a detail of the message)
 */
describe('Translations files', function () {
  const read = (lang) => {
    const file = path.join(__dirname, `../../../translations/${lang}.json`);
    const text = fs.readFileSync(file);
    return JSON.parse(text);
  };
  const placeholders = (text) => {
    const found = `${text}`.match(/\{[^}]+\}/g) || [];
    return found.sort();
  };

  /**
   * every language has the English keys, each with the same placeholders
   */
  it('should have every string in every language, with the same placeholders', () => {
    // English is the reference
    const en = read('en');

    for (const lang of ['ro']) {
      // the same keys
      const strings = read(lang);
      chai.expect(Object.keys(strings).sort(), lang).to.deep.equal(Object.keys(en).sort());

      // the same placeholders in each string
      for (const key of Object.keys(en)) {
        chai.expect(placeholders(strings[key]), `${lang} ${key}`).to.deep.equal(placeholders(en[key]));
      }
    }
  });

  /**
   * the keys are in lower case, so they are found
   */
  it('should keep the keys in lower case (the strings are looked up by the lower-cased id)', () => {
    for (const lang of ['en', 'ro']) {
      for (const key of Object.keys(read(lang))) {
        chai.expect(key, `${lang} ${key}`).to.equal(key.toLowerCase());
      }
    }
  });
});
