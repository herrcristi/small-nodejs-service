const _ = require('lodash');
const crypto = require('crypto');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const JwtUtils = require('../../../core/utils/jwt.utils.js');
const EmailsUtils = require('../../../core/utils/emails.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
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
});
