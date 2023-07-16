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
   * get all with success
   */
  it('should get all with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubServiceGetAll = sinon.stub(UsersService, 'getAll').callsFake((filter) => {
      console.log(`\nUserService.getAll called\n`);
      return { value: testUsers };
    });

    let stubServiceGetAllCount = sinon.stub(UsersService, 'getAllCount').callsFake((filter) => {
      console.log(`\nUserService.getAllCount called\n`);
      return { value: testUsers.length };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubServiceGetAll.callCount).to.equal(1);
    chai.expect(stubServiceGetAllCount.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      data: [...testUsers],
      meta: {
        count: testUsers.length,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * get all partial data applying filter with success
   */
  it('should get all partial data applying filter with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);

    // stub
    let stubServiceGetAll = sinon.stub(UsersService, 'getAll').callsFake((filter) => {
      console.log(`\nUserService.getAll called\n`);
      return { value: testUsers };
    });

    let stubServiceGetAllCount = sinon.stub(UsersService, 'getAllCount').callsFake((filter) => {
      console.log(`\nUserService.getAllCount called\n`);
      return { value: testUsers.length + 1 };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .get(`${UsersConstants.ApiPath}?firstName!=John&lastName=/ben/i&skip=1&limit=1`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(206);
    chai.expect(stubServiceGetAll.callCount).to.equal(1);
    chai.expect(stubServiceGetAllCount.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      data: [...testUsers],
      meta: {
        count: testUsers.length + 1,
        limit: 1,
        skip: 1,
      },
    });
  }).timeout(10000);

  /**
   * get all failed with exception
   */
  it('should get all failed with exception', async () => {
    // stub
    sinon.stub(UsersService, 'getAll').throws('Test exception');

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${UsersConstants.ApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test exception');
  }).timeout(10000);
});
