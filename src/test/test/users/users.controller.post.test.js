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
   * post one with success
   */
  it('should post one with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];
    const postReq = {
      ...testUser,
      id: undefined,
      name: undefined,
    };

    // stub
    let stubServicePostOne = sinon.stub(UsersService, 'post').callsFake(() => {
      console.log(`\nUserService.post called\n`);
      return { value: testUser };
    });

    // call
    let res = await chai.request(TestConstants.WebServer).post(`${UsersConstants.ApiPath}`).send(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubServicePostOne.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * post one failed with exception
   */
  it('should post one failed with exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    const postReq = {
      ...testUser,
      id: undefined,
      name: undefined,
      type: undefined,
    };

    // stub
    sinon.stub(UsersService, 'post').throws('Test exception');

    // call
    let res = await chai.request(TestConstants.WebServer).post(`${UsersConstants.ApiPath}`).send(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test exception');
  }).timeout(10000);
});
