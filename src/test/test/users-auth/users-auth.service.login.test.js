const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * login with success
   */
  it('should login with success', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.getOne called for ${JSON.stringify(objID, null, 2)}\n`);
      return { status: 200, value: { ...testAuthUser } };
    });

    let stubEvents = sinon
      .stub(EventsRest, 'raiseEventForObject')
      .callsFake((serviceName, action, objTarget, objArg, ctx, severity) => {
        console.log(
          `\nEventsRest.raiseEventForObject called for ${JSON.stringify(
            { serviceName, action, objTarget, objArg, severity },
            null,
            2
          )}\n`
        );
        chai.expect({ serviceName, action, objTarget, objArg, severity }).to.deep.equal({
          serviceName: UsersAuthService.Constants.ServiceName,
          action: 'login',
          objTarget: { id: testAuthUser.id, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          objArg: { id: testAuthUser.id, name: testAuthUser.id, type: UsersAuthService.Constants.Type },
          severity: undefined, // default info
        });
        return { status: 200, value: {} };
      });

    let stubUsers = sinon.stub(UsersRest, 'getOne').callsFake((objID) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(objID, null, 2)}\n`);

      chai.expect(objID).to.equal(testAuthUser.userID);
      return { status: 200, value: testInfoUser };
    });

    // call
    let res = await UsersAuthService.login({ id: testAuthUser.id, password: testAuthData.origPassword }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvents.callCount).to.equal(1);
    chai.expect(stubUsers.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testInfoUser.id,
        status: testInfoUser.status,
        email: testInfoUser.email,
        schools: testInfoUser.schools,
      },
    });
  }).timeout(10000);
});
