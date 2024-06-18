const _ = require('lodash');
const mailer = require('nodemailer');
const crypto = require('crypto');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const EmailsService = require('../../../services/users-auth/emails.service.js');

describe('Emails Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

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
    let res = await EmailsService.init();

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
    let res = await EmailsService.init();

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
    let res = await EmailsService.init();

    chai.expect(stubMailer.callCount).to.equal(1);
  }).timeout(10000);
});
