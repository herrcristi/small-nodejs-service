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
      ro: 'Activ',
    });

    // found (by lowercase)
    res = TranslationsUtils.string('Active', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({
      en: 'Active',
      ro: 'Activ',
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

  /**
   * the placeholders are filled in one pass: an inserted value is never expanded again
   */
  it('should not expand the placeholders that are inside an inserted value', async () => {
    // named: a target name that looks like a placeholder
    let res = TranslationsUtils.string('{target} by {user}', _ctx, { target: '{user} {0}', user: 'admin' });
    chai.expect(res.en).to.equal('{user} {0} by admin');

    // numbered: the same
    res = TranslationsUtils.string('{0} by {1}', _ctx, ['{1}', 'admin']);
    chai.expect(res.en).to.equal('{1} by admin');

    // a placeholder without an argument, an inherited key, or without arguments stays as it is
    res = TranslationsUtils.string('{target} {toString} {}', _ctx, { target: 'x' });
    chai.expect(res.en).to.equal('x {toString} {}');
    res = TranslationsUtils.string('{target}', _ctx, null);
    chai.expect(res.en).to.equal('{target}');
  }).timeout(10000);
});
