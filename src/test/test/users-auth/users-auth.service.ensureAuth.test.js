const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const UsersAuthDatabase = require('../../../services/users-auth/users-local-auth.database.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthServiceFirebase = require('../../../services/users-auth/users-firebase-auth.service.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const JwtUtils = require('../../../core/utils/jwt.utils.js');
const EmailsUtils = require('../../../core/utils/emails.utils.js');

/**
 * ensureAuth: the auth record of a user exists, or it is created (an interrupted invite is completed)
 */
describe('Users Auth Service ensureAuth', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };
  const user = { username: 'jane.smith@testdomain.test', userID: 'user1' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * the auth record exists: nothing is created
   */
  it('should not create an auth record that exists', async () => {
    // stub: the record exists; no write is expected
    sinon.stub(UsersAuthDatabase, 'collection').resolves(null);
    const stubGet = sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: { id: user.username } });
    const stubPost = sinon.stub(DbOpsUtils, 'post');

    // call
    const res = await UsersAuthService.ensureAuth(user, _ctx);

    // check: read without the password, nothing written
    chai.expect(res.status).to.equal(200);
    chai.expect(stubGet.firstCall.args[1]).to.equal(user.username);
    chai.expect(stubGet.firstCall.args[2]).to.deep.equal({ _id: 0, id: 1, userID: 1 });
    chai.expect(stubPost.callCount).to.equal(0);

    // check: read on the primary (a record created by the request before is found)
    chai.expect(stubGet.firstCall.args[4]).to.deep.equal({ readPreference: DbOpsUtils.Constants.ReadPrimary });
  }).timeout(10000);

  /**
   * the auth record is missing: it is created, with a random password
   */
  it('should create a missing auth record with a random password', async () => {
    // stub: no record; the write, the event and the notification
    sinon.stub(UsersAuthDatabase, 'collection').resolves(null);
    sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 404, error: { message: 'Not found' } });
    const stubPost = sinon.stub(DbOpsUtils, 'post').callsFake((config, objInfo) => ({ status: 201, value: objInfo }));
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(UsersAuthRest, 'raiseNotification');

    // call
    const res = await UsersAuthService.ensureAuth(user, _ctx);

    // check: created for the user (the password is hashed, never the configured one)
    chai.expect(res.status).to.equal(201);
    chai.expect(stubPost.firstCall.args[1]).to.include({ id: user.username, userID: user.userID });
    chai.expect(stubPost.firstCall.args[1].salt).to.be.a('string');

    // case: the record can not be read: the error, nothing created
    DbOpsUtils.getOne.resolves({ status: 500, error: { message: 'Database failure' } });
    stubPost.resetHistory();
    const resFailed = await UsersAuthService.ensureAuth(user, _ctx);
    chai.expect(resFailed.status).to.equal(500);
    chai.expect(stubPost.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * another provider (firebase) keeps the accounts itself: nothing to do
   */
  it('should do nothing with another provider', async () => {
    const authProviderType = process.env.SMALL_API_AUTH_PROVIDER_TYPE;

    // switch the provider to firebase
    sinon.stub(JwtUtils, 'init');
    sinon.stub(EmailsUtils, 'init');
    sinon.stub(UsersAuthServiceFirebase, 'init').resolves();
    process.env.SMALL_API_AUTH_PROVIDER_TYPE = 'firebase';
    await UsersAuthService.init();

    try {
      // stub: no read is expected
      const stubGet = sinon.stub(DbOpsUtils, 'getOne');

      // call
      const res = await UsersAuthService.ensureAuth(user, _ctx);

      // check: nothing read
      chai.expect(res.status).to.equal(200);
      chai.expect(stubGet.callCount).to.equal(0);
    } finally {
      // back to the provider of the other tests
      process.env.SMALL_API_AUTH_PROVIDER_TYPE = authProviderType;
      await UsersAuthService.init();
    }
  }).timeout(10000);
});
