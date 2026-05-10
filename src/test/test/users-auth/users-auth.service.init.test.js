const _ = require('lodash');
const crypto = require('crypto');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const JwtUtils = require('../../../core/utils/jwt.utils.js');
const EmailsUtils = require('../../../core/utils/emails.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  let authProviderType; // to restore after test

  before(async function () {});

  beforeEach(async function () {
    authProviderType = process.env.SMALL_API_AUTH_PROVIDER_TYPE;
  });

  afterEach(async function () {
    sinon.restore();
    process.env.SMALL_API_AUTH_PROVIDER_TYPE = authProviderType;
  });

  after(async function () {});

  /**
   * init with success
   */
  it('should init with success', async () => {
    // stub
    let stubJwt = sinon.stub(JwtUtils, 'init');
    let stubEmail = sinon.stub(EmailsUtils, 'init');

    // call
    let res = await UsersAuthService.init();

    chai.expect(stubJwt.callCount).to.equal(2);
  }).timeout(10000);

  /**
   * init failed due to invalid auth provider
   */
  it('should init failed due to invalid auth provider', async () => {
    // stub
    let stubExit = sinon.stub(process, 'exit');

    // set invalid auth provider type
    sinon.stub(process, 'env').value({});

    // call
    let res = await UsersAuthService.init();
    chai.expect(stubExit.calledOnceWith(1)).to.be.true;
  }).timeout(10000);
});
