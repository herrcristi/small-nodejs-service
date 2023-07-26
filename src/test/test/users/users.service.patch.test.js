const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils');

const TestConstants = require('../../test-constants.js');
const UsersConstants = require('../../../services/users/users.constants.js');
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
   * patch one with success
   */
  it('should patch one with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const patchReq = {
      set: {
        ...testUser,
        id: undefined,
        type: undefined,
      },
    };

    // stub
    let stubDbPatchOne = sinon.stub(BaseServiceUtils, 'patch').callsFake(() => {
      console.log(`\nBaseServiceUtils.patch called\n`);
      return {
        status: 200,
        value: { ...testUser },
      };
    });

    // call
    let res = await UsersService.patch(patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbPatchOne.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testUser },
    });
  }).timeout(10000);
});
