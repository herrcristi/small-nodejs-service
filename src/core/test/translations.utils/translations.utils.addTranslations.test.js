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

  /**
   * the translations of a referenced object (a reference to one object, user): its translated fields
   * (ref.translations) are added to the object that references it, as _lang_en.user.status, with the translations of
   * the object itself
   */
  it('should add the translations of a referenced object', async () => {
    const ref = { fieldName: 'user', translations: ['status'] };
    const obj = { id: 'student1', '_lang_en.status': 'Active', '_lang_ro.status': 'Activ' };

    // call
    const res = TranslationsUtils.addReferenceTranslations(obj, ref, { id: 'user1', status: 'removed' }, _ctx);

    // check: with the translations of the object
    chai.expect(CommonUtils.patch2obj(res)).to.deep.equal({
      id: 'student1',
      _lang_en: { status: 'Active', user: { status: 'Removed' } },
      _lang_ro: { status: 'Activ', user: { status: 'Eliminat' } },
    });

    // case: the referenced object is not there (the object does not change its reference): nothing is added
    chai.expect(TranslationsUtils.addReferenceTranslations({ id: 'student1' }, ref, undefined, _ctx)).to.deep.equal({
      id: 'student1',
    });

    // case: a reference without translated fields: nothing is added
    const other = { fieldName: 'class' };
    chai.expect(TranslationsUtils.addReferenceTranslations({}, other, { status: 'active' }, _ctx)).to.deep.equal({});
  }).timeout(10000);
});
