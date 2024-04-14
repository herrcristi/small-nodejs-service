const _ = require('lodash');
const crypto = require('crypto');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

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
    const clock = sinon.useFakeTimers();

    const time = new Date();

    const one_day = 24 * 60 * 60 * 1000;

    // stub
    let stubPass = sinon.stub(crypto, 'randomBytes').callThrough();

    // call
    let res = await UsersAuthService.init();

    clock.tick(one_day + 10);

    // check
    const endTime = new Date();
    console.log(`Elapsed time: ${endTime - time}`);

    chai.expect(stubPass.callCount).to.equal(2);
    chai.expect(endTime - time).to.be.greaterThanOrEqual(one_day); // 1 day
  }).timeout(10000);
});
