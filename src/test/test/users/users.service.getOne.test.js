const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils');

const TestConstants = require('../../test-constants.js');
const UsersConstants = require('../../../services/users/users.constants');
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
   * get one with success
   */
  it('should get one with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubDbGetOne = sinon.stub(BaseServiceUtils, 'getOne').callsFake(() => {
      console.log(`\nBaseServiceUtils.getOne called\n`);
      return { status: 200, value: { ...testUser } };
    });

    // call
    let res = await UsersService.getOne(testUser.id, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetOne.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testUser },
    });
  }).timeout(10000);
});
