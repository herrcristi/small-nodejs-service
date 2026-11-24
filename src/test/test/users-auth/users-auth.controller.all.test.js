const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const RestCommunicationsUtils = require('../../../core/utils/rest-communications.utils.js');

describe('Users Auth Controller', function () {
  before(async function () {});

  beforeEach(async function () {
    sinon.stub(UsersAuthRest, 'validate').callsFake((objInfo) => {
      console.log(`\nUsersAuthRest.validate called`);
      return { status: 200, value: { userID: 'user.id', username: 'user.email' } };
    });
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * login with success
   */
  it('should login with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'login').callsFake(() => {
      console.log(`\nUsersAuthService.login called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/login`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect({ ...res.body, expires: '' }).to.deep.equal({
      ...testUser,
      expires: '', // ignore expires
    });
  }).timeout(10000);

  /**
   * the auth cookie: HttpOnly, SameSite, Secure outside of debug mode, and cleared with the same attributes
   */
  it('should set the auth cookie with its security attributes', async () => {
    const testUser = _.cloneDeep(TestConstants.UsersAuth)[0];
    sinon.stub(UsersAuthService, 'login').returns({ status: 200, value: { ...testUser }, token: 'TOKEN' });
    sinon.stub(UsersAuthService, 'logout').returns({ status: 200, value: true });
    const previous = { env: process.env.NODE_ENV, sameSite: process.env.SMALL_API_COOKIE_SAMESITE };
    const login = () =>
      supertest(TestConstants.WebServer)
        .post(`${UsersAuthConstants.ApiPath}/login`)
        .set('Origin', TestConstants.WebServer)
        .send({ username: 'user@testdomain.test', password: 'Password1!' });

    try {
      // debug mode (http): not Secure, SameSite=Lax
      let res = await login();
      let cookie = res.headers['set-cookie'][0];
      chai.expect(cookie).to.match(/^SmallApp-token=TOKEN;/);
      chai.expect(cookie).to.include('HttpOnly').and.include('SameSite=Lax').and.include('Path=/');
      chai.expect(cookie).to.not.include('Secure');

      // production: Secure
      process.env.NODE_ENV = 'production';
      res = await login();
      cookie = res.headers['set-cookie'][0];
      chai.expect(cookie).to.include('Secure').and.include('SameSite=Lax');

      // UI on another site: SameSite=None (always Secure)
      process.env.NODE_ENV = previous.env;
      process.env.SMALL_API_COOKIE_SAMESITE = 'none';
      res = await login();
      cookie = res.headers['set-cookie'][0];
      chai.expect(cookie).to.include('SameSite=None').and.include('Secure');

      // logout clears it with the same attributes
      res = await supertest(TestConstants.WebServer)
        .post(`${UsersAuthConstants.ApiPath}/logout`)
        .set('Origin', TestConstants.WebServer);
      cookie = res.headers['set-cookie'][0];
      chai.expect(cookie).to.include('SameSite=None').and.include('Secure').and.include('HttpOnly');
      chai.expect(new Date(cookie.match(/Expires=([^;]+)/)[1]).getTime()).to.be.below(Date.now());
    } finally {
      process.env.NODE_ENV = previous.env;
      if (previous.sameSite === undefined) {
        delete process.env.SMALL_API_COOKIE_SAMESITE;
      } else {
        process.env.SMALL_API_COOKIE_SAMESITE = previous.sameSite;
      }
    }
  }).timeout(10000);

  /**
   * login fail
   */
  it('should login fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'login').callsFake(() => {
      console.log(`\nUsersAuthService.login called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/login`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check: the same answer for every failed login (here an invalid request)
    chai.expect(res.status).to.equal(401);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Invalid username/password');
    chai.expect(res.body.error).to.not.include('Test error message');
  }).timeout(10000);

  /**
   * login: the user sees the same answer whatever the real reason; a server error stays a server error
   */
  it('should login answer the same for every reason of a failed login', async () => {
    // stub: the answer of the service changes in the loop
    const stubService = sinon.stub(UsersAuthService, 'login');
    const login = () =>
      supertest(TestConstants.WebServer)
        .post(`${UsersAuthConstants.ApiPath}/login`)
        .set('Origin', TestConstants.WebServer)
        .send({ username: 'user@testdomain.test', password: 'Password1!' });

    // each reason of a failed login: the same 401, the real reason is not shown
    for (const [status, message] of [
      [404, 'Not found user@testdomain.test'], // no such account
      [401, 'Invalid password'], // wrong password
      [403, 'User is disabled'],
    ]) {
      stubService.returns({ status, error: { message, error: new Error(message) } });
      const res = await login();
      chai.expect(res.status).to.equal(401);
      chai.expect(res.body.error).to.include('Invalid username/password').and.not.include(message);
    }

    // a server error stays a server error
    stubService.returns({ status: 500, error: { message: 'Database error', error: new Error('Database error') } });
    const res = await login();
    chai.expect(res.status).to.equal(500);
  }).timeout(10000);

  /**
   * login fail exception
   */
  it('should login fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'login').callsFake(() => {
      console.log(`\nUsersAuthService.login called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/login`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * logout with success
   */
  it('should logout with success', async () => {
    // stub
    let stubService = sinon.stub(UsersAuthService, 'logout').callsFake(() => {
      console.log(`\nUsersAuthService.logout called\n`);
      return {
        status: 200,
        value: {},
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/logout`)
      .set('Origin', TestConstants.WebServer)
      .send({});
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect({ ...res.body, expires: '' }).to.deep.equal({
      expires: '', // ignore expires for testing
    });
  }).timeout(10000);

  /**
   * logout fail
   */
  it('should logout fail', async () => {
    // stub
    let stubService = sinon.stub(UsersAuthService, 'logout').callsFake(() => {
      console.log(`\nUsersAuthService.logout called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/logout`)
      .set('Origin', TestConstants.WebServer)
      .send({});
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * logout fail exception
   */
  it('should logout fail exception', async () => {
    // stub
    let stubService = sinon.stub(UsersAuthService, 'logout').callsFake(() => {
      console.log(`\nUsersAuthService.logout called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/logout`)
      .set('Origin', TestConstants.WebServer)
      .send({});
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * get current user with success
   */
  it('should get current user with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];
    const testToken = _.cloneDeep(TestConstants.UsersToken)[0];

    sinon.restore(); // restore validation to override the validate again in this test

    // stub
    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      return {
        status: 200,
        value: {
          userID: testUser.id,
          username: testUser.email,
          name: testUser.name,
          language: 'ro', // the language of the UI chosen by the user
          schools: testUser.schools,
          sessionExpiresAt: new Date(Date.now() + 60 * 1000), // the end of the session
        },
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/me`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testToken.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect({ ...res.body, expires: '' }).to.deep.equal({
      userID: testUser.id,
      username: testUser.email,
      name: testUser.name,
      language: 'ro',
      schools: testUser.schools,
      expires: '', // ignore expires for testing
    });
    // the expiry is the end of the session
    chai.expect(new Date(res.body.expires).getTime()).to.be.greaterThan(Date.now());
  }).timeout(10000);

  /**
   * get current user makes the pending schools active (schools added after the login)
   */
  it('should get current user and make the pending schools active', async () => {
    const testUser = _.cloneDeep(TestConstants.Users)[0];
    const testToken = _.cloneDeep(TestConstants.UsersToken)[0];
    const schools = [{ id: 'school1', name: 'School 1', status: 'pending', roles: ['admin'] }];

    // stub: a valid session with a pending school, and the activation of the pending schools
    sinon.stub(UsersAuthService, 'validate').resolves({
      status: 200,
      value: { userID: testUser.id, username: testUser.email, name: testUser.name, schools },
    });
    const stubActive = sinon.stub(UsersAuthService, 'activatePendingSchools').callsFake((user) => {
      user.schools.forEach((school) => (school.status = 'active'));
      return { status: 200, value: true };
    });

    // call
    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/me`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testToken.token}`)
      .set('Origin', TestConstants.WebServer);

    // check: the school is active in the answer
    chai.expect(res.status).to.equal(200);
    chai.expect(stubActive.callCount).to.equal(1);
    chai.expect(res.body.schools[0].status).to.equal('active');
  }).timeout(10000);

  /**
   * get current user does not fail when the schools cannot be made active
   */
  it('should get current user even if the pending schools cannot be made active', async () => {
    const testUser = _.cloneDeep(TestConstants.Users)[0];
    const testToken = _.cloneDeep(TestConstants.UsersToken)[0];
    const schools = [{ id: 'school1', name: 'School 1', status: 'pending', roles: ['admin'] }];

    // stub: a valid session with a pending school; its activation fails (logged by the service, the school stays
    // pending)
    sinon.stub(UsersAuthService, 'validate').resolves({
      status: 200,
      value: { userID: testUser.id, username: testUser.email, name: testUser.name, schools },
    });
    const stubActive = sinon.stub(UsersAuthService, 'activatePendingSchools').resolves({ status: 200, value: true });

    // call
    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/me`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testToken.token}`)
      .set('Origin', TestConstants.WebServer);

    // check: answered, the school stays pending
    chai.expect(res.status).to.equal(200);
    chai.expect(stubActive.callCount).to.equal(1);
    chai.expect(res.body.schools[0].status).to.equal('pending');
  }).timeout(10000);

  /**
   * get current user with no token
   */
  it('should get current user fail with no token', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];

    sinon.restore(); // restore validation

    // call - no cookie set
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/me`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(res.body.error).to.include('No auth token');
  }).timeout(10000);

  /**
   * get current user with validation failure
   */
  it('should get current user fail with validation error', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];
    const testToken = _.cloneDeep(TestConstants.UsersToken)[0];

    sinon.restore(); // restore validation

    // stub
    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      return {
        status: 401,
        error: { message: 'Invalid token', error: new Error('Token validation failed') },
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/me`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testToken.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Invalid token');
  }).timeout(10000);

  /**
   * get current user with exception
   */
  it('should get current user fail with exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];
    const testToken = _.cloneDeep(TestConstants.UsersToken)[0];

    sinon.restore(); // restore validation to override the validate again in this test

    // stub
    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/me`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testToken.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * get current user with empty schools
   */
  it('should get current user with empty schools', async () => {
    const testUsers = _.cloneDeep(TestConstants.Users);
    const testUser = testUsers[0];
    const testToken = _.cloneDeep(TestConstants.UsersToken)[0];

    sinon.restore(); // restore validation to override the validate again in this test

    // stub
    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      return {
        status: 200,
        value: {
          userID: testUser.id,
          username: testUser.email,
          name: testUser.name,
          // no schools provided
          sessionExpiresAt: new Date(Date.now() + 60 * 1000), // the end of the session
        },
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/me`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testToken.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect({ ...res.body, expires: '' }).to.deep.equal({
      userID: testUser.id,
      username: testUser.email,
      name: testUser.name,
      schools: [], // default to empty array if not provided
      expires: '', // ignore expires for testing
    });
    chai.expect(res.body.expires).to.exist;
  }).timeout(10000);

  /**
   * s2s + token validate with success with cookie
   */
  it('should s2s+token validate with success with cookie', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * s2s + token validate with success with authorization header
   */
  it('should s2s+token validate with success with authorization header', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('authorization', `Bearer ${UsersAuthConstants.AuthToken}=${testUser.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(201);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * s2s middleware validate fail
   */
  it('should s2s middleware validate fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('Request is not authorized');
    chai.expect(res.body.error).to.include('Test error');
  }).timeout(10000);

  /**
   * s2s middleware validate fail exception
   */
  it('should s2s middleware validate fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * token middleware validate fail
   */
  it('should token middleware validate fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    sinon.restore(); // restore validation

    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthRest, 'validate').callsFake(() => {
      console.log(`\UsersAuthRest.validate called\n`);
      return { status: 401, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/logout`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubRest.callCount).to.equal(0);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('Request is not authorized');
    chai.expect(res.body.error).to.include('Test error');
  }).timeout(10000);

  /**
   * token middleware validate fail exception
   */
  it('should token middleware validate fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    sinon.restore(); // restore validation

    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthRest, 'validate').callsFake(() => {
      console.log(`\nUsersAuthRest.validate called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/logout`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubRest.callCount).to.equal(0);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * token service validate fail
   */
  it('should token service validate fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * token service validate fail exception
   */
  it('should token service validate fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersToken);
    const testUser = testUsers[0];

    // stub
    sinon.restore(); // restore validation

    let stubRest = sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    let stubService = sinon.stub(UsersAuthService, 'validate').callsFake(() => {
      console.log(`\nUsersAuthService.validate called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPathInternal}/validate`)
      .set('cookie', `${UsersAuthConstants.AuthToken}=${testUser.token}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(401);
    chai.expect(stubRest.callCount).to.equal(1);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'post').callsFake(() => {
      console.log(`\nUsersAuthService.post called\n`);
      return {
        status: 201,
        value: { ...testUser },
      };
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}`)
      .set('Origin', TestConstants.WebServer)
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
   * post fail
   */
  it('should post fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'post').callsFake(() => {
      console.log(`\nUsersAuthService.post called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * post fail exception
   */
  it('should post fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'post').callsFake(() => {
      console.log(`\nUsersAuthService.post called\n`);
      throw new Error('Test error message');
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'delete').callsFake(() => {
      console.log(`\nUsersAuthService.delete called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .delete(`${UsersAuthConstants.ApiPath}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * delete fail
   */
  it('should delete fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'delete').callsFake(() => {
      console.log(`\nUsersAuthService.delete called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .delete(`${UsersAuthConstants.ApiPath}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * delete fail exception
   */
  it('should delete fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'delete').callsFake(() => {
      console.log(`\nUsersAuthService.delete called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .delete(`${UsersAuthConstants.ApiPath}`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put password with success
   */
  it('should put password with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putPassword called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/password`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * put password fail
   */
  it('should put password fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putPassword called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/password`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put password fail exception
   */
  it('should put password fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putPassword called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/password`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * reset password with success
   */
  it('should reset password with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'resetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.resetPassword called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/reset-password`)
      .set('Origin', TestConstants.WebServer)
      .send({ id: testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * reset password for an unknown address: the same answer as for a known one
   */
  it('should reset password answer the same for an unknown address', async () => {
    // stub: no such account
    sinon.stub(UsersAuthService, 'resetPassword').returns({ status: 404, error: { message: 'Not found x' } });

    // call
    const res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/reset-password`)
      .set('Origin', TestConstants.WebServer)
      .send({ username: 'nobody@testdomain.test' });

    // check: the answer of a known address
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({ username: 'nobody@testdomain.test', type: UsersAuthConstants.Type });
  }).timeout(10000);

  /**
   * reset password fail
   */
  it('should reset password fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'resetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.resetPassword called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/reset-password`)
      .set('Origin', TestConstants.WebServer)
      .send({ id: testUser.id });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * reset password fail exception
   */
  it('should reset password fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'resetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.resetPassword called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPath}/reset-password`)
      .set('Origin', TestConstants.WebServer)
      .send({ id: testUser.id });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * validate reset token  with success
   */
  it('should validate reset token with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'validateResetToken').callsFake(() => {
      console.log(`\nUsersAuthService.validateResetToken called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/reset-token/validate?token=token`)
      .set('Origin', TestConstants.WebServer)
      .send({ id: testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * validate reset token fail
   */
  it('should validate reset token fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'validateResetToken').callsFake(() => {
      console.log(`\nUsersAuthService.validateResetToken called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/reset-token/validate?token=token`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * validate reset token fail exception
   */
  it('should validate reset token fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'validateResetToken').callsFake(() => {
      console.log(`\nUsersAuthService.validateResetToken called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/reset-token/validate?token=token`)
      .set('Origin', TestConstants.WebServer);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put reset password with success
   */
  it('should put reset password with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putResetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putResetPassword called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/reset-token/password`)
      .set('x-reset-token', 'token')
      .set('Origin', TestConstants.WebServer)
      .send({ password: 'password' });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * put reset password fail
   */
  it('should put reset password fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putResetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putResetPassword called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/reset-token/password`)
      .set('x-reset-token', 'token')
      .set('Origin', TestConstants.WebServer)
      .send({ password: 'password' });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put reset password fail exception
   */
  it('should put reset password fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putResetPassword').callsFake(() => {
      console.log(`\nUsersAuthService.putResetPassword called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/reset-token/password`)
      .set('x-reset-token', 'token')
      .set('Origin', TestConstants.WebServer)
      .send({ password: 'password' });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put id (email) with success
   */
  it('should put id (email) with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putID').callsFake(() => {
      console.log(`\nUsersAuthService.putID called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/id`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect({ ...res.body, expires: '' }).to.deep.equal({
      ...testUser,
      expires: '', // ignore expires for testing
    });
  }).timeout(10000);

  /**
   * put id (email)  fail
   */
  it('should put id (email) fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putID').callsFake(() => {
      console.log(`\nUsersAuthService.putID called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/id`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * put id (email) fail exception
   */
  it('should put id (email) fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'putID').callsFake(() => {
      console.log(`\nUsersAuthService.putID called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .put(`${UsersAuthConstants.ApiPath}/id`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...testUser });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch password with success
   */
  it('should patch password with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchPassword').callsFake(() => {
      console.log(`\nUsersAuthService.patchPassword called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/password`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * patch password fail
   */
  it('should patch password fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchPassword').callsFake(() => {
      console.log(`\nUsersAuthService.patchPassword called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/password`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch password fail exception
   */
  it('should patch password fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchPassword').callsFake(() => {
      console.log(`\nUsersAuthService.patchPassword called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/password`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch id (email) with success
   */
  it('should patch id (email) with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchID').callsFake(() => {
      console.log(`\nUsersAuthService.patchID called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/id`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect({ ...res.body, expires: '' }).to.deep.equal({
      ...testUser,
      expires: '', // ignore expires for testing
    });
  }).timeout(10000);

  /**
   * patch id (email) fail
   */
  it('should patch id (email) fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchID').callsFake(() => {
      console.log(`\nUsersAuthService.patchID called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/id`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch id (email) fail exception
   */
  it('should patch id (email) fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchID').callsFake(() => {
      console.log(`\nUsersAuthService.patchID called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/id`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch user school with success
   */
  it('should patch user school with success', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchUserSchool').callsFake(() => {
      console.log(`\nUsersAuthService.patchUserSchool called\n`);
      return {
        status: 200,
        value: testUser,
      };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/school/user/userID`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal({
      ...testUser,
    });
  }).timeout(10000);

  /**
   * patch user school fail
   */
  it('should patch user school fail', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchUserSchool').callsFake(() => {
      console.log(`\nUsersAuthService.patchUserSchool called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/school/user/userID`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * patch user school fail exception
   */
  it('should patch user school fail exception', async () => {
    const testUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testUser = testUsers[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'patchUserSchool').callsFake(() => {
      console.log(`\nUsersAuthService.patchUserSchool called\n`);
      throw new Error('Test error message');
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .patch(`${UsersAuthConstants.ApiPath}/school/user/userID`)
      .set('Origin', TestConstants.WebServer)
      .send({ set: { ...testUser } });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * notification with success
   */
  it('should do notification with success', async () => {
    const notifications = _.cloneDeep(TestConstants.UsersNotifications);
    const notif = notifications[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'notification').callsFake(() => {
      console.log(`\nUsersAuthService.notification called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}/notifications`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body).to.deep.equal(true);
  }).timeout(10000);

  /**
   * notification fail
   */
  it('should notification fail', async () => {
    const notifications = _.cloneDeep(TestConstants.UsersNotifications);
    const notif = notifications[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'notification').callsFake(() => {
      console.log(`\nUsersAuthService.notification called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}/notifications`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * notification fail exception
   */
  it('should notification fail exception', async () => {
    const notifications = _.cloneDeep(TestConstants.UsersNotifications);
    const notif = notifications[0];

    // stub
    let stubService = sinon.stub(UsersAuthService, 'notification').callsFake(() => {
      console.log(`\nUsersAuthService.notification called\n`);
      throw new Error('Test error message');
    });

    sinon.stub(RestCommunicationsUtils, 'restValidation').callsFake(() => {
      console.log(`\nRestCommunicationsUtils.restValidation called`);
      return { status: 200, value: {} };
    });

    // call
    let res = await supertest(TestConstants.WebServer)
      .post(`${UsersAuthConstants.ApiPathInternal}/notifications`)
      .set('Origin', TestConstants.WebServer)
      .send({ ...notif });
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(stubService.callCount).to.equal(1);
    chai.expect(res.body.message).to.include('An unknown error has occured');
    chai.expect(res.body.error).to.include('Test error message');
  }).timeout(10000);

  /**
   * a password change ends the other sessions: this session gets the new token as the cookie
   */
  for (const [method, fn] of [
    ['put', 'putPassword'],
    ['patch', 'patchPassword'],
  ]) {
    /**
     * the new token of the password change is the new session cookie
     */
    it(`should ${method} password set the new session cookie`, async () => {
      // stub: the password is changed, with a new token
      sinon
        .stub(UsersAuthService, fn)
        .returns({ status: 200, value: { username: 'user@testdomain.test' }, token: 'NEW' });

      // call
      const res = await supertest(TestConstants.WebServer)
        [method](`${UsersAuthConstants.ApiPath}/password`)
        .set('Origin', TestConstants.WebServer)
        .send({});

      // check: the cookie has the new token, http only
      chai.expect(res.status).to.equal(200);
      chai
        .expect(res.headers['set-cookie'][0])
        .to.match(/^SmallApp-token=NEW;/)
        .and.include('HttpOnly');
    }).timeout(10000);
  }

  /**
   * the reset token is read from a header, never from the url
   */
  it('should validate the reset token from the header', async () => {
    // stub: a valid token
    const stub = sinon.stub(UsersAuthService, 'validateResetToken').returns({ status: 200, value: { username: 'u' } });

    // call with a token in the url and another in the header
    const res = await supertest(TestConstants.WebServer)
      .get(`${UsersAuthConstants.ApiPath}/reset-token/validate?token=FROM_URL`)
      .set('Origin', TestConstants.WebServer)
      .set('x-reset-token', 'FROM_HEADER');

    // check: only the header is used
    chai.expect(res.status).to.equal(200);
    chai.expect(stub.firstCall.args[0]).to.deep.equal({ token: 'FROM_HEADER' });
  }).timeout(10000);
});
