const _ = require('lodash');
const mailer = require('nodemailer');
const crypto = require('crypto');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const CommonUtils = require('../../utils/common.utils.js');
const EmailsUtils = require('../../utils/emails.utils.js');

describe('Emails Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  const smtpConfig =
    '{ "host": "host", "port": "465", "user": "user", "password": "password", "from": "small@localhost" }';

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * init with fail
   */
  it('should init with fail', async () => {
    const testMail = {
      verify: async () => {
        return true;
      },

      sendMail: sinon.stub().callsFake((msg) => {
        console.log(`\nsendMail called with ${JSON.stringify(msg, null, 2)}`);

        throw new Error('Test error');
      }),
    };

    // stub
    let stubMailer = sinon.stub(mailer, 'createTransport').returns(testMail);

    // call
    let res = await EmailsUtils.init(smtpConfig);

    res = await EmailsUtils.sendEmail('to', 'subject', 'body', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(stubMailer.callCount).to.equal(1);
    chai.expect(testMail.sendMail.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: { message: 'Failed to send email to: to', error: new Error('Failed to send email to: to') },
    });
  }).timeout(10000);

  /**
   * init with success dev and override to
   */
  it('should init with success dev and override to', async () => {
    const testMail = {
      verify: async () => {
        return true;
      },

      sendMail: sinon.stub().callsFake((msg) => {
        console.log(`\nsendMail called with ${JSON.stringify(msg, null, 2)}`);

        chai.expect(msg).to.deep.equal({
          from: 'small@localhost',
          to: 'tooverride',
          subject: 'subject',
          html: 'body',
        });

        return { messageId: 'messageID' };
      }),
    };

    // stub
    let stubMailer = sinon.stub(mailer, 'createTransport').returns(testMail);

    // call
    const newSmtpConfig = JSON.stringify({ ...JSON.parse(smtpConfig), to: 'tooverride' });
    let res = await EmailsUtils.init(newSmtpConfig);

    res = await EmailsUtils.sendEmail('to', 'subject', 'body', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(stubMailer.callCount).to.equal(1);
    chai.expect(testMail.sendMail.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { messageID: 'messageID' },
    });
  }).timeout(10000);

  /**
   * init with success dev and no override to
   */
  it('should init with success dev and no override to', async () => {
    const testMail = {
      verify: async () => {
        return true;
      },

      sendMail: sinon.stub().callsFake((msg) => {
        console.log(`\nsendMail called with ${JSON.stringify(msg, null, 2)}`);

        chai.expect(msg).to.deep.equal({
          from: 'small@localhost',
          to: 'to',
          subject: 'subject',
          html: 'body',
        });

        return { messageId: 'messageID' };
      }),
    };

    // stub
    let stubMailer = sinon.stub(mailer, 'createTransport').returns(testMail);

    // call
    let res = await EmailsUtils.init(smtpConfig);

    res = await EmailsUtils.sendEmail('to', 'subject', 'body', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(stubMailer.callCount).to.equal(1);
    chai.expect(testMail.sendMail.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { messageID: 'messageID' },
    });
  }).timeout(10000);

  /**
   * init with success prod
   */
  it('should init with success prod', async () => {
    const testMail = {
      verify: async () => {
        return true;
      },

      sendMail: sinon.stub().callsFake((msg) => {
        console.log(`\nsendMail called with ${JSON.stringify(msg, null, 2)}`);

        chai.expect(msg).to.deep.equal({
          from: 'small@localhost',
          to: 'to',
          subject: 'subject',
          html: 'body',
        });

        return { messageId: 'messageID' };
      }),
    };

    // stub
    let stubMailer = sinon.stub(mailer, 'createTransport').returns(testMail);
    let stubDebug = sinon.stub(CommonUtils, 'isDebug').returns(false);

    // call
    let res = await EmailsUtils.init(smtpConfig);

    res = await EmailsUtils.sendEmail('to', 'subject', 'body', _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(stubMailer.callCount).to.equal(1);
    chai.expect(testMail.sendMail.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { messageID: 'messageID' },
    });
  }).timeout(10000);
});
