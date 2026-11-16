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

  /**
   * the cached template is never changed: every call expands the original text
   */
  it('should expand the email template for each call without changing the cached template', async () => {
    const original = TranslationsUtils.email('signup', _ctx);

    // two recipients, each with its own link
    const first = TranslationsUtils.email('signup', _ctx, { resetUrl: 'https://link/TOKEN_OF_USER_1' });
    const second = TranslationsUtils.email('signup', _ctx, { resetUrl: 'https://link/TOKEN_OF_USER_2' });

    for (const lang of ['en', 'ro']) {
      chai.expect(first[lang].email).to.include('TOKEN_OF_USER_1');
      chai.expect(first[lang].email).to.not.include('TOKEN_OF_USER_2');

      chai.expect(second[lang].email).to.include('TOKEN_OF_USER_2');
      chai.expect(second[lang].email).to.not.include('TOKEN_OF_USER_1');
    }

    // the cached template still has the placeholders
    const after = TranslationsUtils.email('signup', _ctx);
    chai.expect(after).to.deep.equal(original);
    chai.expect(after.en.email).to.include('{resetUrl}');

    // the languages that fall back to the same template do not share the returned object
    chai.expect(first.en).to.not.equal(first.ro);
  }).timeout(10000);

  /**
   * a school name in one email does not stay in the next one
   */
  it('should not keep the arguments of a previous email', async () => {
    const first = TranslationsUtils.email('invite', _ctx, { school: 'School One' });
    const second = TranslationsUtils.email('invite', _ctx, { school: 'School Two' });

    chai.expect(first.en.subject).to.equal('You have been invited to School One');
    chai.expect(second.en.subject).to.equal('You have been invited to School Two');
  }).timeout(10000);

  /**
   * the values inserted in an email are text: markup is escaped in the body, the subject is one line
   */
  it('should escape the arguments in the body and keep the subject on one line', async () => {
    const school = '<a href="https://link.testdomain.test">Sign in</a> & "more" \'x\'';
    const res = TranslationsUtils.email('invite', _ctx, { school });

    for (const lang of ['en', 'ro']) {
      // body: no markup from the argument
      chai.expect(res[lang].email).to.not.include('<a href="https://link.testdomain.test">');
      chai
        .expect(res[lang].email)
        .to.include(
          '&lt;a href=&quot;https://link.testdomain.test&quot;&gt;Sign in&lt;/a&gt; &amp; &quot;more&quot; &#39;x&#39;'
        );

      // subject: text as it is (not html), one line
      chai.expect(res[lang].subject).to.equal(`You have been invited to ${school}`);
    }

    // a line break in a value can not add a header to the subject
    const res2 = TranslationsUtils.email('invite', _ctx, { school: 'School\r\nBcc: other.user@testdomain.test' });
    chai.expect(res2.en.subject).to.equal('You have been invited to School Bcc: other.user@testdomain.test');
    chai.expect(res2.en.subject).to.not.match(/[\r\n]/);
  }).timeout(10000);

  /**
   * a value with a special replacement pattern is inserted as it is
   */
  it('should insert values that look like replacement patterns as they are', async () => {
    const res = TranslationsUtils.email('invite', _ctx, { school: "$& $1 $' $`" });

    chai.expect(res.en.subject).to.equal("You have been invited to $& $1 $' $`");
  }).timeout(10000);
});
