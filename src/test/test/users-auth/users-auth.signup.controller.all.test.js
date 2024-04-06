const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthSignupService = require('../../../services/users-auth/users-auth.signup.service.js');

describe('Users Auth Signup Controller', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * signup with success
   */
  it('should signup with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthSignupService, 'signup').callsFake(() => {
      console.log(`\nUsersAuthSignupService.signup called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/signup`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * signup fail
   */
  it('should signup fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthSignupService, 'signup').callsFake(() => {
      console.log(`\nUsersAuthSignupService.signup called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/signup`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * signup fail exception
   */
  it('should signup fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthSignupService, 'signup').callsFake(() => {
      console.log(`\nUsersAuthSignupService.signup called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/signup`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);
});
