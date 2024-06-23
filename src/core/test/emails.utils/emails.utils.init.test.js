const _ = require('lodash');
const mailer = require('nodemailer');
const crypto = require('crypto');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

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
    // stub
    let stubMailer = sinon.stub(mailer, 'createTransport').returns({
      verify: async () => {
        return false;
      },
    });

    let stubProcess = sinon.stub(process, 'exit');

    // call
    let res = await EmailsUtils.init(smtpConfig);

    chai.expect(stubMailer.callCount).to.equal(1);
    chai.expect(stubProcess.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * init with fail exception
   */
  it('should init with fail exception', async () => {
    // stub
    let stubMailer = sinon.stub(mailer, 'createTransport').returns({
      verify: async () => {
        throw 'Test error';
      },
    });

    let stubProcess = sinon.stub(process, 'exit');

    // call
    let res = await EmailsUtils.init(smtpConfig);

    chai.expect(stubMailer.callCount).to.equal(1);
    chai.expect(stubProcess.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * init with success
   */
  it('should init with success', async () => {
    // stub
    let stubMailer = sinon.stub(mailer, 'createTransport').returns({
      verify: async () => {
        return true;
      },
    });

    // call
    let res = await EmailsUtils.init(smtpConfig);

    chai.expect(stubMailer.callCount).to.equal(1);
  }).timeout(10000);
});
