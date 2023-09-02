const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const TranslationsUtils = require('../../utils/translations.utils.js');
const CommonUtils = require('../../utils/common.utils.js');

describe('Translations Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * add translations to object
   */
  it('should add translations to object', async () => {
    let obj = {
      prop: 'val',
    };

    let translations = {
      prop: {
        en: 'Prop',
      },
      val: {
        en: 'Val',
      },
      notExisting: undefined,
    };

    // call
    let res = TranslationsUtils.addTranslations(obj, translations, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      prop: 'val',
      '_lang_en.prop': 'Prop',
      '_lang_en.val': 'Val',
      '_lang_ro.prop': 'Prop',
      '_lang_ro.val': 'Val',
    });

    let newObj = CommonUtils.patch2obj(obj);
    console.log(`\nConversion: ${JSON.stringify(newObj, null, 2)}\n`);
    chai.expect(newObj).to.deep.equal({
      prop: 'val',
      _lang_en: {
        prop: 'Prop',
        val: 'Val',
      },
      _lang_ro: {
        prop: 'Prop',
        val: 'Val',
      },
    });
  }).timeout(10000);

  /**
   * add translations to null object
   */
  it('should add translations to null object', async () => {
    let obj = null;

    let translations = {
      prop: {
        en: 'Prop',
      },
    };

    // call
    let res = TranslationsUtils.addTranslations(obj, translations, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(null);
  }).timeout(10000);
});
