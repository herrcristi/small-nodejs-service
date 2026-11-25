const _ = require('lodash');
const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersService = require('../../../services/users/users.service.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Users Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * put the agreements accepted by a user (internal, from users-auth): they are written on the user, with their event
   * (who accepted which versions) and the modified notification; agreements that are not valid are not written
   */
  it('should put the agreements of a user', async () => {
    const testUser = _.cloneDeep(TestConstants.Users[0]);
    const agreements = _.cloneDeep(TestConstants.AcceptedAgreements);

    // stub
    sinon.stub(ReferencesUtils, 'populateReferences').resolves({ status: 200, value: true });
    const stubBase = sinon.stub(DbOpsUtils, 'put').resolves({ status: 200, value: { ...testUser, agreements } });
    const stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').resolves();
    const stubNotification = sinon.stub(UsersRest, 'raiseNotification').resolves();

    // call
    const res = await UsersService.putAgreements(testUser.id, { agreements }, _ctx);

    // check: written on the user, its event has the accepted versions
    chai.expect(res.status).to.equal(200);
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubBase.firstCall.args[1]).to.equal(testUser.id);
    chai.expect(stubBase.firstCall.args[2]).to.deep.equal({ agreements });
    chai.expect(stubEvent.firstCall.args[1]).to.equal('putAgreements');
    chai.expect(stubEvent.firstCall.args[3]).to.deep.equal({ agreements });
    chai.expect(stubNotification.callCount).to.equal(1);

    // case: not valid (a version missing): nothing is written
    stubBase.resetHistory();
    const resWrong = await UsersService.putAgreements(testUser.id, { agreements: { terms: {} } }, _ctx);
    chai.expect(resWrong.status).to.equal(400);
    chai.expect(stubBase.callCount).to.equal(0);
  }).timeout(10000);
});
