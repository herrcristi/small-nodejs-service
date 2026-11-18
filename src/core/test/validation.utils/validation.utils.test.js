const chai = require('chai');

const ValidationUtils = require('../../utils/validation.utils.js');

describe('Validation Utils', function () {
  /**
   * emails: normal ones pass, anything that can change a query string, a path or html is refused
   */
  it('should accept normal emails and refuse the ones with characters that change a query', async () => {
    const schema = ValidationUtils.email().required();

    // the normal emails are accepted
    for (const ok of ['big.ben@testdomain.test', 'john+tag@school.test', 'A_B-c.1@sub.domain-x.test']) {
      chai.expect(schema.validate(ok).error, ok).to.equal(undefined);
    }

    // the emails with query characters, quotes, spaces, too long or not an email are refused
    const bad = [
      'x&email=portal.admin%40example.test&sort=x@testdomain.test', // the injected filter
      'a&email!=zzz@testdomain.test',
      'a=b@testdomain.test',
      'a%40b@testdomain.test',
      'a b@testdomain.test',
      'a/b@testdomain.test',
      'a?b@testdomain.test',
      'a#b@testdomain.test',
      '<b>@testdomain.test',
      'a"b@testdomain.test',
      "a'b@testdomain.test",
      'a\\b@testdomain.test',
      'not-an-email',
      '',
      `${'a'.repeat(130)}@testdomain.test`,
    ];
    for (const val of bad) {
      chai.expect(schema.validate(val).error, val).to.not.equal(undefined);
    }
  });

  /**
   * one mailbox is one account: the validated email is normalized (NFKC, trimmed, lower case)
   */
  it('should normalize the emails', async () => {
    const schema = ValidationUtils.email();
    for (const [value, expected] of [
      ['John.Doe@TestDomain.TEST', 'john.doe@testdomain.test'],
      ['  john.doe@testdomain.test ', 'john.doe@testdomain.test'],
      ['ｊｏｈｎ@testdomain.test', 'john@testdomain.test'], // full width letters
      ['john+tag@testdomain.test', 'john+tag@testdomain.test'],
    ]) {
      const v = schema.validate(value);
      chai.expect(v.error).to.equal(undefined);
      chai.expect(v.value).to.equal(expected);
    }

    // the same for a value that is not validated by a schema (a lookup, a token)
    chai.expect(ValidationUtils.normalizeEmail(' John.Doe@TestDomain.TEST')).to.equal('john.doe@testdomain.test');
    chai.expect(ValidationUtils.normalizeEmail(undefined)).to.equal(undefined);
  });

  /**
   * ids from a header
   */
  it('should keep only well formed ids from a header', async () => {
    // the well formed ids are kept as they are
    chai
      .expect(ValidationUtils.safeID('C837AA4179CB45CDBF7D9AF5DAFFB59D'))
      .to.equal('C837AA4179CB45CDBF7D9AF5DAFFB59D');
    chai.expect(ValidationUtils.safeID('school-high2_x')).to.equal('school-high2_x');

    // anything else is dropped
    for (const bad of ['(a+)+$', 'a b', 'a/b', 'a.b', '', 'a'.repeat(65), undefined, null, 5, ['a'], { a: 1 }]) {
      chai.expect(ValidationUtils.safeID(bad), String(bad)).to.equal(undefined);
    }
  });

  /**
   * keys that change the prototype and values nested too deep
   */
  it('should find forbidden keys at any depth and values nested too deep', async () => {
    chai.expect(ValidationUtils.findUnsafe({ a: 1, b: { c: [1, 2, { d: 'x' }] } })).to.equal(null);
    chai.expect(ValidationUtils.findUnsafe('text')).to.equal(null);
    chai.expect(ValidationUtils.findUnsafe(null)).to.equal(null);
    chai.expect(ValidationUtils.findUnsafe(undefined)).to.equal(null);

    // JSON.parse creates an own '__proto__' key
    chai.expect(ValidationUtils.findUnsafe(JSON.parse('{"name":"x","__proto__":{"id":"y"}}'))).to.deep.equal({
      key: '__proto__',
    });
    chai.expect(ValidationUtils.findUnsafe({ a: [{ b: { constructor: 1 } }] })).to.deep.equal({ key: 'constructor' });
    chai.expect(ValidationUtils.findUnsafe({ prototype: 1 })).to.deep.equal({ key: 'prototype' });

    // deep: iterative, no stack overflow
    let deep = {};
    let p = deep;
    for (let i = 0; i < 20000; ++i) {
      p.a = {};
      p = p.a;
    }
    chai.expect(ValidationUtils.findUnsafe(deep)).to.deep.equal({ tooDeep: true });
    chai.expect(ValidationUtils.findUnsafe({ a: { b: { c: 1 } } }, 2)).to.deep.equal({ tooDeep: true });
  });
});
