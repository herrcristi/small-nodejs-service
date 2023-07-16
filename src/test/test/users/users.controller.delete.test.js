const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const UsersConstants = require('../../../services/users/users.constants.js');
const UsersService = require('../../../services/users/users.service.js');

describe('Users', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * delete one with success
   */
  it('should delete one with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubServiceDeleteOne = sinon.stub(UsersService, 'delete').callsFake(() => {
      console.log(`\nUserService.delete called\n`);
      return { value: testUser };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${UsersConstants.ApiPath}/${testUser.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubServiceDeleteOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * delete one not found
   */
  it('should delete one not found', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    let stubServiceDeleteOne = sinon.stub(UsersService, 'delete').callsFake((objID) => {
      console.log(`\nUserService.delete called\n`);
      console.log(objID);
      return { value: null };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${UsersConstants.ApiPath}/${testUser.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(404);
    chai.expect(stubServiceDeleteOne.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('Not found');
    chai.expect(res.body.error).to.include(testUser.id);
  }).timeout(10000);

  /**
   * delete one failed with exception
   */
  it('should delete one failed with exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    // stub
    sinon.stub(UsersService, 'delete').throws('Test exception');

    // call
    let res = await chai.request(TestConstants.WebServer).delete(`${UsersConstants.ApiPath}/${testUser.id}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test exception');
  }).timeout(10000);
});
