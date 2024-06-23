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
   * translated email
   */
  it('should translate email', async () => {
    // undefined
    let res = TranslationsUtils.email(undefined, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.equal(undefined);

    // null
    res = TranslationsUtils.email(null, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({
      en: null,
      ro: null,
    });

    // found
    res = TranslationsUtils.email('reset-password', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.en.subject).to.equal('Reset password');
    chai.expect(res.en.email).to.include('<!DOCTYPE html>');
    chai.expect(res.ro.subject).to.equal('Reset password');
    chai.expect(res.ro.email).to.include('<!DOCTYPE html>');

    // found (by lowercase)
    res = TranslationsUtils.email('Reset-Password', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.en.subject).to.equal('Reset password');
    chai.expect(res.en.email).to.include('<!DOCTYPE html>');
    chai.expect(res.ro.subject).to.equal('Reset password');
    chai.expect(res.ro.email).to.include('<!DOCTYPE html>');

    // not found
    res = TranslationsUtils.email('randomstring', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.deep.equal({
      en: null,
      ro: null,
    });

    // with arguments
    res = TranslationsUtils.email('invite', _ctx, { school: 'test-school' });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.en.subject).to.equal('You have been invited to test-school');
    chai.expect(res.ro.subject).to.equal('You have been invited to test-school');
  }).timeout(10000);
});
