const fs = require('fs');
const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');
const EmailsUtils = require('../../../core/utils/emails.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  // the session of the token is open (the sessions service has its own tests)
  const session = { id: 'session-id1', purpose: 'session', expiresAt: new Date(Date.now() + 60 * 1000) };

  beforeEach(async function () {
    sinon.stub(UsersAuthSessionsService, 'check').resolves({ status: 200, value: session });
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * validate all route with success
   */
  it('should validate all route with success', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.name = school.id;
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testInfoUser.id,
        username: testAuthUser.id,
        sessionID: session.id, // the record of the session (not its secret)
        sessionExpiresAt: session.expiresAt,
        status: testInfoUser.status,
        tenantName: testInfoUser.schools[0].name,
        tenantVerified: true,
        name: testInfoUser.name,
        schools: testInfoUser.schools,
      },
    });
  }).timeout(10000);

  /**
   * validate portal routes by portal-admin membership
   */
  it('should validate portal routes by portal-admin membership', async () => {
    // a configured portal school, and a user that is a portal admin
    const portalSchoolID = 'portal-school-test';
    const previousPortalSchoolID = process.env.SMALL_API_PORTAL_SCHOOL_ID;
    process.env.SMALL_API_PORTAL_SCHOOL_ID = portalSchoolID;

    const testAuthUser = _.cloneDeep(TestConstants.UsersAuth[0]);
    const testInfoUser = _.cloneDeep(TestConstants.Users[0]);
    testInfoUser.schools = [
      {
        id: portalSchoolID,
        name: 'Portal School',
        status: SchoolsRest.Constants.Status.Active,
        roles: [UsersRest.Constants.Roles.PortalAdmin],
      },
    ];

    // stub: the user and a valid session token
    sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 200, value: testInfoUser });
    sinon.stub(JwtUtils, 'decrypt').returns({ status: 200, value: 'decoded' });
    sinon.stub(UsersLocalAuthService, 'validateToken').returns({
      status: 200,
      value: { username: testAuthUser.id, userID: testInfoUser.id },
    });

    _ctx.tenantID = portalSchoolID;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    // call a portal route on the portal school
    _ctx.reqUrl = '/api/v1/schools';
    const result = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools' }, _ctx);

    if (previousPortalSchoolID === undefined) {
      delete process.env.SMALL_API_PORTAL_SCHOOL_ID;
    } else {
      process.env.SMALL_API_PORTAL_SCHOOL_ID = previousPortalSchoolID;
    }

    // check: accepted, as a portal admin
    chai.expect(result.status).to.equal(200);
    chai.expect(result.value.tenantName).to.equal('Portal School');
    chai.expect(result.value.schools[0].roles).to.deep.equal([UsersRest.Constants.Roles.PortalAdmin]);

    // another school (not a member): refused
    _ctx.tenantID = 'another-school';
    const wrongTenantResult = await UsersAuthService.validate(
      { token: 'token', method: 'get', route: '/api/v1/schools' },
      _ctx
    );
    chai.expect(wrongTenantResult.status).to.equal(401);
    chai.expect(wrongTenantResult.error.message).to.equal('Failed to validate school');

    // a membership of the portal school without roles (left by an earlier version): not a membership, refused
    _ctx.tenantID = portalSchoolID;
    testInfoUser.schools[0].roles = [];
    const nonAdminResult = await UsersAuthService.validate(
      { token: 'token', method: 'get', route: '/api/v1/schools' },
      _ctx
    );
    chai.expect(nonAdminResult.status).to.equal(401);
    chai.expect(nonAdminResult.error.message).to.equal('Failed to validate school');
  }).timeout(10000);

  /**
   * validate a global route (for all, no tenant role needed)
   */
  it('should validate a global route for any role', async () => {
    const testAuthUser = _.cloneDeep(TestConstants.UsersAuth[0]);
    const testInfoUser = _.cloneDeep(TestConstants.Users[0]);

    // stub: the user and a valid session token
    sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 200, value: testInfoUser });
    sinon.stub(JwtUtils, 'decrypt').returns({ status: 200, value: 'decoded' });
    sinon.stub(UsersLocalAuthService, 'validateToken').returns({
      status: 200,
      value: { username: testAuthUser.id, userID: testInfoUser.id },
    });

    // call a global route with a tenant the user is not a member of
    _ctx.tenantID = 'tenant-without-membership';
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = '/api/v1/users-auth/me';
    const res = await UsersAuthService.validate(
      { token: 'token', method: 'get', route: '/api/v1/users-auth/me' },
      _ctx
    );

    // check: accepted, the tenant is not used (not a member of it)
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.tenantVerified).to.equal(false);
  }).timeout(10000);

  /**
   * the own user record (the profile) is valid also without a school (a user left without schools); the record of
   * another user is checked by the roles in the school
   */
  it('should validate the own user record also without a school', async () => {
    const testAuthUser = _.cloneDeep(TestConstants.UsersAuth[0]);
    const testInfoUser = _.cloneDeep(TestConstants.Users[0]);

    // stub: a user without schools, and a valid session token
    sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 200, value: { ...testInfoUser, schools: [] } });
    sinon.stub(JwtUtils, 'decrypt').returns({ status: 200, value: 'decoded' });
    sinon.stub(UsersLocalAuthService, 'validateToken').returns({
      status: 200,
      value: { username: testAuthUser.id, userID: testInfoUser.id },
    });

    // call: its own record, without a school
    _ctx.tenantID = undefined;
    _ctx.reqUrl = `/api/v1/users/${testInfoUser.id}`;
    const route = { token: 'token', method: 'put', route: '/api/v1/users/:id' };
    const res = await UsersAuthService.validate(route, _ctx);

    // check: accepted, without a school
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.tenantVerified).to.equal(false);

    // case: the record of another user: the roles in the school decide (no school: refused)
    _ctx.reqUrl = '/api/v1/users/other-user';
    const resOther = await UsersAuthService.validate(route, _ctx);
    chai.expect(resOther.status).to.equal(401);

    // case: its own record with a school of the user: the school is used, unless it is disabled
    const school = { ...testInfoUser.schools[0], status: 'active' };
    UsersRest.getOneByEmail.returns({ status: 200, value: { ...testInfoUser, schools: [school] } });
    _ctx.tenantID = school.id;
    _ctx.reqUrl = `/api/v1/users/${testInfoUser.id}`;
    const resSchool = await UsersAuthService.validate(route, _ctx);
    chai.expect(resSchool.value.tenantVerified).to.equal(true);
    UsersRest.getOneByEmail.returns({
      status: 200,
      value: { ...testInfoUser, schools: [{ ...school, status: 'disabled' }] },
    });
    const resDisabled = await UsersAuthService.validate(route, _ctx);
    chai.expect(resDisabled.status).to.equal(200);
    chai.expect(resDisabled.value.tenantVerified).to.equal(false);
  }).timeout(10000);

  /**
   * the memberships of the answer: only the schools with a role (none for a user without schools)
   */
  it('should answer only the memberships with a role', async () => {
    const testAuthUser = _.cloneDeep(TestConstants.UsersAuth[0]);
    const testInfoUser = _.cloneDeep(TestConstants.Users[0]);

    // stub: a user with a membership left without roles, and a valid session token
    testInfoUser.schools = [{ ...testInfoUser.schools[0], roles: [] }, ...testInfoUser.schools.slice(1)];
    const stubUser = sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 200, value: testInfoUser });
    sinon.stub(JwtUtils, 'decrypt').returns({ status: 200, value: 'decoded' });
    sinon.stub(UsersLocalAuthService, 'validateToken').returns({
      status: 200,
      value: { username: testAuthUser.id, userID: testInfoUser.id },
    });

    // call a global route
    _ctx.reqUrl = '/api/v1/users-auth/me';
    const route = { token: 'token', method: 'get', route: '/api/v1/users-auth/me' };
    const res = await UsersAuthService.validate(route, _ctx);

    // check: the membership without roles is not in the answer
    const schoolIDs = res.value.schools.map((school) => school.id);
    chai.expect(schoolIDs).to.not.include(testInfoUser.schools[0].id);
    chai.expect(schoolIDs.length).to.equal(testInfoUser.schools.length - 1);

    // case: a user without schools: no memberships
    stubUser.returns({ status: 200, value: { ...testInfoUser, schools: undefined } });
    const resNone = await UsersAuthService.validate(route, _ctx);
    chai.expect(resNone.value.schools).to.deep.equal([]);
  }).timeout(10000);

  /**
   * validate a current-user route for users-auth :id (the id is the username), only for the current user
   */
  it('should validate a current-user users-auth route only for the current user', async () => {
    const testAuthUser = _.cloneDeep(TestConstants.UsersAuth[0]);
    const testInfoUser = _.cloneDeep(TestConstants.Users[0]);
    for (const school of testInfoUser.schools) {
      school.name = school.id;
      school.status = SchoolsRest.Constants.Status.Active;
    }

    // there is no users-auth/:id route for current-user in config.roles.json, so add one when the roles are loaded
    const route = '/api/v1/users-auth/:id';
    const readFileSync = fs.readFileSync;
    sinon.stub(fs, 'readFileSync').callsFake((...args) => {
      const content = readFileSync(...args);
      if (!`${args[0]}`.endsWith('config.roles.json')) {
        return content;
      }
      const roles = JSON.parse(content);
      roles.roles['current-user']['users-auth'] = { GET: [route] };
      return JSON.stringify(roles);
    });
    sinon.stub(JwtUtils, 'init');
    sinon.stub(EmailsUtils, 'init');
    await UsersAuthService.init();
    fs.readFileSync.restore();

    try {
      sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 200, value: testInfoUser });
      sinon.stub(JwtUtils, 'decrypt').returns({ status: 200, value: 'decoded' });
      sinon.stub(UsersLocalAuthService, 'validateToken').returns({
        status: 200,
        value: { username: testAuthUser.id, userID: testInfoUser.id },
      });

      _ctx.tenantID = testInfoUser.schools[0].id;
      _ctx.userID = testInfoUser.id;
      _ctx.username = testAuthUser.id;

      // the current user
      _ctx.reqUrl = `/api/v1/users-auth/${encodeURIComponent(testAuthUser.id)}`;
      let res = await UsersAuthService.validate({ token: 'token', method: 'get', route }, _ctx);
      chai.expect(res.status).to.equal(200);

      // another user
      _ctx.reqUrl = '/api/v1/users-auth/another.user@testdomain.test';
      res = await UsersAuthService.validate({ token: 'token', method: 'get', route }, _ctx);
      chai.expect(res.status).to.equal(403);
    } finally {
      // load back the roles from config.roles.json for the other tests
      await UsersAuthService.init();
    }
  }).timeout(10000);

  /**
   * validate invite route (shared with portal-admin) for a normal school admin
   */
  it('should validate invite route for a school admin', async () => {
    const testAuthUser = _.cloneDeep(TestConstants.UsersAuth[0]);
    const testInfoUser = _.cloneDeep(TestConstants.Users[0]);
    for (const school of testInfoUser.schools) {
      school.name = school.id;
      school.status = SchoolsRest.Constants.Status.Active;
    }

    // stub: the user (active schools) and a valid session token
    sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 200, value: testInfoUser });
    sinon.stub(JwtUtils, 'decrypt').returns({ status: 200, value: 'decoded' });
    sinon.stub(UsersLocalAuthService, 'validateToken').returns({
      status: 200,
      value: { username: testAuthUser.id, userID: testInfoUser.id },
    });

    // call the invite route on a school where the user is admin
    _ctx.tenantID = testInfoUser.schools[1].id; // where is admin
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = '/api/v1/users-auth/invite';
    const res = await UsersAuthService.validate(
      { token: 'token', method: 'post', route: '/api/v1/users-auth/invite' },
      _ctx
    );

    // check: accepted, with the school name
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.tenantName).to.equal(_ctx.tenantID);
  }).timeout(10000);

  /**
   * validate role school route with success
   */
  it('should validate role school route with success', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.name = school.id;
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[1].id; // where is admin
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/schools/${_ctx.tenantID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testInfoUser.id,
        username: testAuthUser.id,
        sessionID: session.id, // the record of the session (not its secret)
        sessionExpiresAt: session.expiresAt,
        status: testInfoUser.status,
        tenantName: 'school-high2',
        tenantVerified: true,
        name: testInfoUser.name,
        schools: testInfoUser.schools,
      },
    });
  }).timeout(10000);

  /**
   * validate role route with success
   */
  it('should validate role route with success', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.name = school.id;
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[1].id; // where is admin
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/students/${testInfoUser.id}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/students/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        userID: testInfoUser.id,
        username: testAuthUser.id,
        sessionID: session.id, // the record of the session (not its secret)
        sessionExpiresAt: session.expiresAt,
        status: testInfoUser.status,
        tenantName: 'school-high2',
        tenantVerified: true,
        name: testInfoUser.name,
        schools: testInfoUser.schools,
      },
    });
  }).timeout(10000);

  /**
   * validate fail validation
   */
  it('should validate fail validation', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ id: testAuthUser.id }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Failed to validate schema. Error: "token" is required',
        error: new Error('Failed to validate schema. Error: "token" is required'),
      },
    });
  }).timeout(10000);

  /**
   * validate fail decrypt token
   */
  it('should validate fail decrypt token', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.name = school.id;
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 401, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Test error message',
        error: new Error('Test error'),
      },
    });
  }).timeout(10000);

  /**
   * validate fail validate token
   */
  it('should validate fail validate token', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return { status: 500, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Failed to validate token',
        error: new Error('Failed to validate token'),
      },
    });
  }).timeout(10000);

  /**
   * validate fail get user
   */
  it('should validate fail get user', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 404, error: { message: 'Test error message', error: new Error('Test error') } };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Test error message',
        error: new Error('Test error'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate user is disabled
   */
  it('should validate fail user is disabled', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    testInfoUser.status = UsersRest.Constants.Status.Disabled;
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    // call
    _ctx.tenantID = 'schoolID';
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'User is disabled',
        error: new Error('User is disabled'),
      },
    });

    // case: a deleted account: refused the same way
    testInfoUser.status = UsersRest.Constants.Status.Deleted;
    res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);
    chai.expect(res.status).to.equal(401);
  }).timeout(10000);

  /**
   * fail validate GET user auth
   */
  it('should fail validate GET user auth', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users-auth`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users-auth' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 403,
      error: {
        message: 'Route is not accesible: get /api/v1/users-auth',
        error: new Error('Route is not accesible: get /api/v1/users-auth'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate user-auth :id prefix
   */
  it('should fail validate user-auth :id prefix', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users-auth/something`;
    let res = await UsersAuthService.validate(
      { token: 'token', method: 'delete', route: '/api/v1/users-auth/something' },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    // even if the prefix is for users-auth the route actually is not in the list
    chai.expect(res).to.deep.equal({
      status: 403,
      error: {
        message: 'Route is not accesible: delete /api/v1/users-auth/something',
        error: new Error('Route is not accesible: delete /api/v1/users-auth/something'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate user :id prefix
   */
  it('should fail validate user :id prefix', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/diffid/something`;
    let res = await UsersAuthService.validate(
      { token: 'token', method: 'get', route: '/api/v1/users/:id/something' },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);

    // even if the prefix is for users-auth the route actually is not in the list
    chai.expect(res).to.deep.equal({
      status: 403,
      error: {
        message: 'Route is not accesible: get /api/v1/users/:id/something',
        error: new Error('Route is not accesible: get /api/v1/users/:id/something'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate school :id
   */
  it('should fail validate school :id', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/schools/diffid`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 403,
      error: {
        message: 'school :id restriction applied',
        error: new Error('school :id restriction applied'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate school :id prefix
   */
  it('should fail validate school :id prefix', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/schools/diffid/something`;
    let res = await UsersAuthService.validate(
      { token: 'token', method: 'get', route: '/api/v1/schools/:id/something' },
      _ctx
    );
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    // even if the prefix is for users-auth the route actually is not in the list
    chai.expect(res).to.deep.equal({
      status: 403,
      error: {
        message: 'Route is not accesible: get /api/v1/schools/:id/something',
        error: new Error('Route is not accesible: get /api/v1/schools/:id/something'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate school
   */
  it('should fail validate school', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Active;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    // call
    _ctx.tenantID = 'schoolID';
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/schools/${_ctx.tenantID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'Failed to validate school',
        error: new Error('Failed to validate school'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate school is disabled
   */
  it('should fail school is disabled', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];
    for (const school of testInfoUser.schools) {
      school.status = SchoolsRest.Constants.Status.Disabled;
    }

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/schools/${_ctx.tenantID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 401,
      error: {
        message: 'School is disabled',
        error: new Error('School is disabled'),
      },
    });
  }).timeout(10000);

  /**
   * fail validate route is not accesible
   */
  it('should fail route is not accesible', async () => {
    const testAuthUsers = _.cloneDeep(TestConstants.UsersAuth);
    const testAuthUser = testAuthUsers[0];

    const testInfoUsers = _.cloneDeep(TestConstants.Users);
    const testInfoUser = testInfoUsers[0];

    const testAuthData = testAuthUser._test_data;
    delete testAuthUser._test_data;

    // stub
    let stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail').callsFake((email) => {
      console.log(`\nUsersRest.getOne called for ${JSON.stringify(email, null, 2)}\n`);

      chai.expect(email).to.equal(testAuthUser.id);
      return { status: 200, value: testInfoUser };
    });

    let stubDecrypt = sinon.stub(JwtUtils, 'decrypt').callsFake((data) => {
      console.log(`\nJwtUtils.decrypt called for ${JSON.stringify(data, null, 2)}\n`);

      return { status: 200, value: data };
    });

    let stubToken = sinon.stub(JwtUtils, 'validateJwt').callsFake((jwtToken) => {
      console.log(`\nJwtUtils.validateJwt called for ${JSON.stringify(jwtToken, null, 2)}\n`);

      return {
        status: 200,
        value: { purpose: 'session', username: testAuthUser.id, userID: testInfoUser.id, secret: 'secret1' },
      };
    });

    // call
    _ctx.tenantID = testInfoUser.schools[0].id;
    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.reqUrl = `/api/v1/users/${_ctx.userID}`;
    let res = await UsersAuthService.validate({ token: 'token', method: 'invalid', route: '/api/v1/users/:id' }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubUsersGet.callCount).to.equal(1);
    chai.expect(stubDecrypt.callCount).to.equal(1);
    chai.expect(stubToken.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 403,
      error: {
        message: 'Route is not accesible: invalid /api/v1/users/:id',
        error: new Error('Route is not accesible: invalid /api/v1/users/:id'),
      },
    });
  }).timeout(10000);

  /**
   * a tenant header that looks like a regular expression is only compared as text (it must not block the process)
   */
  it('should not run a regular expression from the tenant on a route that depends on the school', async () => {
    const testAuthUser = _.cloneDeep(TestConstants.UsersAuth[0]);
    const testInfoUser = _.cloneDeep(TestConstants.Users[0]);
    for (const school of testInfoUser.schools) {
      school.name = school.id;
      school.status = SchoolsRest.Constants.Status.Active;
    }
    sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 200, value: testInfoUser });
    sinon.stub(JwtUtils, 'decrypt').returns({ status: 200, value: 'decoded' });
    sinon.stub(UsersLocalAuthService, 'validateToken').returns({
      status: 200,
      value: { username: testAuthUser.id, userID: testInfoUser.id },
    });

    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.tenantID = '(a+)+$'; // catastrophic when compiled as a pattern
    _ctx.reqUrl = `/api/v1/schools/${'a'.repeat(40)}!`;

    const started = Date.now();
    const res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
    const elapsed = Date.now() - started;

    chai.expect(elapsed).to.be.lessThan(500);
    chai.expect(res.status).to.equal(403);
    chai.expect(res.error.message).to.equal('school :id restriction applied');

    // characters that are special in a pattern or in a replacement are only text
    for (const tenant of ['(', '.*', 'a|b', '$&', '[', '\\']) {
      _ctx.tenantID = tenant;
      _ctx.reqUrl = `/api/v1/schools/${tenant}`;
      const r = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
      chai.expect([401, 403], tenant).to.include(r.status);
    }
  }).timeout(10000);

  /**
   * the own school url is valid with a query string
   */
  it('should validate the url of the own school with a query string', async () => {
    const testAuthUser = _.cloneDeep(TestConstants.UsersAuth[0]);
    const testInfoUser = _.cloneDeep(TestConstants.Users[0]);
    for (const school of testInfoUser.schools) {
      school.name = school.id;
      school.status = SchoolsRest.Constants.Status.Active;
    }
    sinon.stub(UsersRest, 'getOneByEmail').returns({ status: 200, value: testInfoUser });
    sinon.stub(JwtUtils, 'decrypt').returns({ status: 200, value: 'decoded' });
    sinon.stub(UsersLocalAuthService, 'validateToken').returns({
      status: 200,
      value: { username: testAuthUser.id, userID: testInfoUser.id },
    });

    _ctx.userID = testInfoUser.id;
    _ctx.username = testAuthUser.id;
    _ctx.tenantID = testInfoUser.schools[1].id; // where is admin

    // with a query string, with a sub path, and with the id as a prefix of another id (must be refused)
    for (const [url, expected] of [
      [`/api/v1/schools/${_ctx.tenantID}?x=1`, 200],
      [`/api/v1/schools/${_ctx.tenantID}/`, 200],
      [`/api/v1/schools/${_ctx.tenantID}x`, 403],
      [`/api/v1/schools/other-school`, 403],
    ]) {
      _ctx.reqUrl = url;
      const r = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/schools/:id' }, _ctx);
      chai.expect(r.status, url).to.equal(expected);
    }
  }).timeout(10000);

  /**
   * a session ended (logout, password change, password reset, email change) is refused
   */
  it('should validate fail for an ended session', async () => {
    // stub: a valid session token whose key is not the key of the account anymore; the user is not read
    UsersAuthSessionsService.check.resolves({ status: 401, error: { message: 'The session has ended' } });
    sinon.stub(JwtUtils, 'decrypt').returns({ status: 200, value: 'token' });
    sinon.stub(JwtUtils, 'validateJwt').returns({
      status: 200,
      value: { purpose: 'session', username: 'user@testdomain.test', userID: 'user1', secret: 'old' },
    });
    const stubUsersGet = sinon.stub(UsersRest, 'getOneByEmail');

    // call
    const res = await UsersAuthService.validate({ token: 'token', method: 'get', route: '/api/v1/users/:id' }, _ctx);

    // check: refused before reading the user
    chai.expect(res.status).to.equal(401);
    chai.expect(res.error.message).to.equal('The session has ended');
    chai.expect(stubUsersGet.callCount).to.equal(0);
  }).timeout(10000);
});
