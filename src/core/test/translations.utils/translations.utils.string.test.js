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
   * translated string
   */
  it('should translate string', async () => {
    // undefined
    let res = TranslationsUtils.string(undefined, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.equal(undefined);

    // null
    res = TranslationsUtils.string(null, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({
      en: null,
      ro: null,
    });

    // found
    res = TranslationsUtils.string('active', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({
      en: 'Active',
      ro: 'Active',
    });

    // found (by lowercase)
    res = TranslationsUtils.string('Active', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({
      en: 'Active',
      ro: 'Active',
    });

    // not found
    res = TranslationsUtils.string('randomstring', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({
      en: 'randomstring',
      ro: 'randomstring',
    });

    // with arguments
    res = TranslationsUtils.string('{0} expanded', _ctx, ['arg']);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({
      en: 'arg expanded',
      ro: 'arg expanded',
    });
  }).timeout(10000);
});
