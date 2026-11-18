const crypto = require('crypto');
const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');

/**
 * the records of the sessions and of the emailed links: only the hash of the secret is stored, a record is checked at
 * every use, and it is ended when it is not needed anymore
 */
describe('Users Auth Sessions Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en' };
  const user = { userID: 'user1', username: 'user@testdomain.test' };
  const hash = (secret) => crypto.createHash('sha256').update(secret).digest('hex');
  const later = () => new Date(Date.now() + 60 * 1000);

  afterEach(function () {
    sinon.restore();
  });

  /**
   * a session record keeps the hash of a new random secret, the user and the expiry; the secret is only returned
   */
  it('should create a session with the hash of its secret', async () => {
    // stub: the write; the earlier sessions are kept
    const stubPost = sinon.stub(DbOpsUtils, 'post').callsFake((config, record) => ({ status: 201, value: record }));
    const stubDeleteAll = sinon.stub(DbOpsUtils, 'deleteAll');

    // call twice
    const before = Date.now();
    const res = await UsersAuthSessionsService.create('session', user, _ctx);
    const res2 = await UsersAuthSessionsService.create('session', user, _ctx);

    // check: a 32 bytes secret, different each time; the record has only its hash
    chai.expect(res.status).to.equal(201);
    chai.expect(res.value.secret).to.match(/^[0-9a-f]{64}$/);
    chai.expect(res2.value.secret).to.not.equal(res.value.secret);
    const record = stubPost.firstCall.args[1];
    chai.expect(record).to.deep.equal({
      id: hash(res.value.secret),
      purpose: 'session',
      userID: 'user1',
      username: 'user@testdomain.test',
      expiresAt: res.value.expiresAt,
    });
    chai.expect(JSON.stringify(record)).to.not.include(res.value.secret);
    chai.expect(res.value.id).to.equal(record.id);

    // the expiry is a date (for the TTL index), after the session time
    const expiresIn = UsersAuthConstants.TokenExpiresIn.session * 1000;
    chai.expect(record.expiresAt).to.be.instanceOf(Date);
    chai.expect(record.expiresAt.getTime()).to.be.within(before + expiresIn, Date.now() + expiresIn);
    chai.expect(stubDeleteAll.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * a new link replaces the earlier links of the user (not its sessions)
   */
  it('should create a link and end the earlier links of the user', async () => {
    // stub: the earlier links are removed, the write
    const stubDeleteAll = sinon.stub(DbOpsUtils, 'deleteAll').resolves({ status: 200, value: 1 });
    const stubPost = sinon.stub(DbOpsUtils, 'post').callsFake((config, record) => ({ status: 201, value: record }));

    // call
    const res = await UsersAuthSessionsService.create('reset-password', user, _ctx);

    // check: the links of the user (all but the sessions) were removed before the new one
    chai.expect(res.status).to.equal(201);
    chai
      .expect(stubDeleteAll.firstCall.args[1])
      .to.deep.equal({ filter: { userID: 'user1', purpose: { $ne: 'session' } } });
    chai.expect(stubPost.firstCall.args[1].purpose).to.equal('reset-password');
    chai.expect(stubDeleteAll.calledBefore(stubPost)).to.equal(true);
  }).timeout(10000);

  /**
   * create fails without a user, or when the database fails
   */
  it('should create fail without a user or when the database fails', async () => {
    // stub: the database fails
    const stubDeleteAll = sinon.stub(DbOpsUtils, 'deleteAll').resolves({ status: 500, error: { message: 'Test' } });
    const stubPost = sinon.stub(DbOpsUtils, 'post').resolves({ status: 500, error: { message: 'Test' } });

    // no user, a user without an id: refused before any write
    for (const value of [undefined, { username: 'user@testdomain.test' }, { userID: 'user1' }]) {
      const res = await UsersAuthSessionsService.create('session', value, _ctx);
      chai.expect(res.status).to.equal(400);
    }
    chai.expect(stubPost.callCount).to.equal(0);

    // the earlier links can not be removed, the record can not be written: the real error
    let res = await UsersAuthSessionsService.create('signup', user, _ctx);
    chai.expect(res.status).to.equal(500);
    chai.expect(stubPost.callCount).to.equal(0);
    res = await UsersAuthSessionsService.create('session', user, _ctx);
    chai.expect(res.status).to.equal(500);
    chai.expect(stubDeleteAll.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * the record of a token is read by the hash of its secret, and must be open, of the same purpose and user
   */
  it('should check a token by the record of its secret', async () => {
    // stub: the record of the secret
    const record = { id: hash('secret1'), purpose: 'session', userID: 'user1', username: user.username };
    const stubGet = sinon
      .stub(DbOpsUtils, 'getOne')
      .resolves({ status: 200, value: { ...record, expiresAt: later() } });

    // call
    const tokenData = { purpose: 'session', username: user.username, secret: 'secret1' };
    const res = await UsersAuthSessionsService.check(tokenData, _ctx);

    // check: open, read by the hash
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value).to.include(record);
    chai.expect(stubGet.firstCall.args[1]).to.equal(hash('secret1'));
  }).timeout(10000);

  /**
   * a token without a record (ended), with an expired record, or of another purpose or user is refused
   */
  it('should check refuse a token whose record is ended, expired, or of another purpose or user', async () => {
    // stub: the record changes in the steps
    const stubGet = sinon.stub(DbOpsUtils, 'getOne');
    const record = { id: hash('secret1'), purpose: 'session', userID: 'user1', username: user.username };
    const tokenData = { purpose: 'session', username: user.username, secret: 'secret1' };

    // no secret: refused without reading
    let res = await UsersAuthSessionsService.check({ ...tokenData, secret: undefined }, _ctx);
    chai.expect(res.error.message).to.equal('The session has ended');
    res = await UsersAuthSessionsService.check(undefined, _ctx);
    chai.expect(res.status).to.equal(401);
    chai.expect(stubGet.callCount).to.equal(0);

    // no record: ended
    stubGet.resolves({ status: 404, error: { message: 'Not found' } });
    res = await UsersAuthSessionsService.check(tokenData, _ctx);
    chai.expect(res.status).to.equal(401);
    chai.expect(res.error.message).to.equal('The session has ended');

    // expired (also an invalid date), another purpose, another user: refused
    for (const value of [
      { ...record, expiresAt: new Date(Date.now() - 1000) },
      { ...record, expiresAt: 'not a date' },
      { ...record, purpose: 'reset-password', expiresAt: later() },
      { ...record, username: 'other.user@testdomain.test', expiresAt: later() },
    ]) {
      stubGet.resolves({ status: 200, value });
      res = await UsersAuthSessionsService.check(tokenData, _ctx);
      chai.expect(res.status).to.equal(401);
    }

    // a link has its own message
    stubGet.resolves({ status: 404, error: { message: 'Not found' } });
    res = await UsersAuthSessionsService.check({ ...tokenData, purpose: 'signup' }, _ctx);
    chai.expect(res.error.message).to.equal('The link is not valid anymore');

    // the database fails: the real error
    stubGet.resolves({ status: 500, error: { message: 'Test error message' } });
    res = await UsersAuthSessionsService.check(tokenData, _ctx);
    chai.expect(res.status).to.equal(500);
  }).timeout(10000);

  /**
   * end removes one record by its id; endAll removes all the records of a user
   */
  it('should end one record, or all the records of a user', async () => {
    // stub: the deletes
    const stubDelete = sinon.stub(DbOpsUtils, 'delete').resolves({ status: 200, value: { id: 'session-id1' } });
    const stubDeleteAll = sinon.stub(DbOpsUtils, 'deleteAll').resolves({ status: 200, value: 3 });

    // end one
    let res = await UsersAuthSessionsService.end('session-id1', _ctx);
    chai.expect(res.status).to.equal(200);
    chai.expect(stubDelete.firstCall.args[1]).to.equal('session-id1');

    // end all of the user
    res = await UsersAuthSessionsService.endAll('user1', _ctx);
    chai.expect(res).to.deep.equal({ status: 200, value: 3 });
    chai.expect(stubDeleteAll.firstCall.args[1]).to.deep.equal({ filter: { userID: 'user1' } });

    // without a user: refused (the filter would match the records without a user)
    res = await UsersAuthSessionsService.endAll(undefined, _ctx);
    chai.expect(res.status).to.equal(400);
    chai.expect(stubDeleteAll.callCount).to.equal(1);
  }).timeout(10000);
});
