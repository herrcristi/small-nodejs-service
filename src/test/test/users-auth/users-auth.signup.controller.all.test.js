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
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const RestCommunicationsUtils = require('../../../core/utils/rest-communications.utils.js');

describe('Users Auth Signup Controller', function () {
  before(async function () {});

  beforeEach(async function () {
    sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 200, value: { userID: 'user.id', username: 'user.email' } };
    });
    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: true };
    });
  });

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
   * signup validation fail
   */
  it('should signup validation fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersSignup);
    const testUser = testUsers[0];

    // stub
    sinon.restore(); // restore validation
    let stubValidate = sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

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
    chai.expect(res.status).to.equal(401);
    chai.expect(stubValidate.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(0);
    chai.expect(res.body.error).to.include('Test error');
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

  /**
   * invite with success
   */
  it('should invite with success', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthSignupService, 'invite').callsFake(() => {
      console.log(`\nUsersAuthSignupService.invite called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/${testAuthUser.id}/invite`)
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
   * invite validation fail
   */
  it('should invite validation fail', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    // stub
    sinon.restore(); // restore validation
    let stubValidate = sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    let stubService = sinon.stub(UsersAuthSignupService, 'invite').callsFake(() => {
      console.log(`\nUsersAuthSignupService.invite called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/${testAuthUser.id}/invite`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubValidate.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(0);
    chai.expect(res.body.error).to.include('Test error');
  }).timeout(10000);

  /**
   * invite fail
   */
  it('should invite fail', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthSignupService, 'invite').callsFake(() => {
      console.log(`\nUsersAuthSignupService.invite called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/${testAuthUser.id}/invite`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * invite fail exception
   */
  it('should invite fail exception', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];
    const testUsers = _.cloneDeep(TestConstants.UsersInvite);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthSignupService, 'invite').callsFake(() => {
      console.log(`\nUsersAuthSignupService.invite called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await chai
      .request(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/${testAuthUser.id}/invite`)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);
});
