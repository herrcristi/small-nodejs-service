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
const SchoolsRest = require('../../../services/rest/schools.rest');

describe('Users Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllByIDs with success
   */
  it('should getAllByIDs with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testSchools = _.cloneDeep(TestConstants.Schools);

    // stub
    let stubDbGetAll = sinon.stub(BaseServiceUtils, 'getAllByIDs').callsFake((config, ids, projection) => {
      console.log(`\nBaseServiceUtils.getAllByIDs called\n`);
      return {
        status: 200,
        value: _.cloneDeep(testUsers),
      };
    });

    let stubSchoolRestGetAll = sinon.stub(SchoolsRest, 'getAllByIDs').callsFake((schoolIDs, projection) => {
      console.log(`\nSchoolsRest.getAllByIDs called\n`);
      chai.expect(schoolIDs).to.deep.equal(testSchools.map((item) => item.id));

      return { status: 200, value: [...testSchools] };
    });

    // call
    let res = await UsersService.getAllByIDs(['id1'], { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbGetAll.callCount).to.equal(1);
    chai.expect(stubSchoolRestGetAll.callCount).to.equal(1);

    chai.expect(res.status).to.equal(200);
    for (const user of res.value) {
      for (const school of user.schools) {
        chai.expect(school.name).to.be.a('string');
        chai.expect(school.status).to.be.a('string');
      }
    }
  }).timeout(10000);
});
