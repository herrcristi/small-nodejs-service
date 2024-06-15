const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const TranslationsUtils = require('../../utils/translations.utils.js');

describe('Translations Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * initLangStrings
   */
  it('should init Language', async () => {
    let translations = {
      active: 'Active',
    };

    let stub = sinon.stub(fs, 'readFileSync').returns(JSON.stringify(translations));

    // call
    let res = await TranslationsUtils.initLangStrings('en', 'filename', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    res = await TranslationsUtils.initLangStrings('ro', 'filename', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(2);
    chai.expect(res).to.deep.equal({
      en: translations,
      ro: translations,
    });
  }).timeout(10000);

  /**
   * fail to initLangStrings
   */
  it('should fail to init Language', async () => {
    let translations = {
      active: 'Active',
    };

    let stub = sinon.stub(fs, 'readFileSync').callsFake(() => {
      throw new Error('Test error');
    });

    // call
    let res = await TranslationsUtils.initLangStrings('en', 'filename', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stub.callCount).to.equal(1);
    chai.expect(res).to.equal(null);
  }).timeout(10000);
});
