const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersService = require('../../../services/users/users.service.js');

describe('Users Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllByIDs with success, with the options of the caller
   */
  it('should getAllByIDs with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUsersIDs = testUsers.map((item) => item.id);

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake(() => {
      console.log(`\nDbOpsUtils.getAllByIDs called\n`);
      return { status: 200, value: [...testUsers] };
    });

    // call
    const options = { readPreference: DbOpsUtils.Constants.ReadPrimary };
    let res = await UsersService.getAllByIDs(testUsersIDs, { id: 1 }, _ctx, options);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the options of the caller go to the read (populateReferences asks the primary)
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubBase.firstCall.args[4]).to.deep.equal(options);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [...testUsers],
    });
  }).timeout(10000);
});
