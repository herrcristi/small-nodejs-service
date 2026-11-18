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
    // stub: the write; the user has no sessions over the limit, so none is ended
    const stubPost = sinon.stub(DbOpsUtils, 'post').callsFake((config, record) => ({ status: 201, value: record }));
    sinon.stub(DbOpsUtils, 'getAll').resolves({ status: 200, value: [] });
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
      lastUsedAt: record.lastUsedAt,
    });
    chai.expect(JSON.stringify(record)).to.not.include(res.value.secret);
    chai.expect(res.value.id).to.equal(record.id);

    // the expiry is a date (for the TTL index), after the session time
    const expiresIn = UsersAuthConstants.TokenExpiresIn.session * 1000;
    chai.expect(record.expiresAt).to.be.instanceOf(Date);
    chai.expect(record.expiresAt.getTime()).to.be.within(before + expiresIn, Date.now() + expiresIn);
    chai.expect(stubDeleteAll.callCount).to.equal(0);

    // the last use is the creation (for the idle time)
    chai.expect(record.lastUsedAt).to.be.instanceOf(Date);
    chai.expect(record.lastUsedAt.getTime()).to.equal(record.expiresAt.getTime() - expiresIn);
  }).timeout(10000);

  /**
   * a new session ends the oldest sessions of the user over the limit
   */
  it('should create a session and end the oldest sessions over the limit', async () => {
    // stub: the write; two sessions after the newest ones
    sinon.stub(DbOpsUtils, 'post').callsFake((config, record) => ({ status: 201, value: record }));
    const stubGetAll = sinon
      .stub(DbOpsUtils, 'getAll')
      .resolves({ status: 200, value: [{ id: 'old1' }, { id: 'old2' }] });
    const stubDeleteAll = sinon.stub(DbOpsUtils, 'deleteAll').resolves({ status: 200, value: 2 });

    // call
    let res = await UsersAuthSessionsService.create('session', user, _ctx);

    // check: the sessions of the user, newest first, after the limit, are ended
    chai.expect(res.status).to.equal(201);
    chai.expect(stubGetAll.firstCall.args[1]).to.deep.equal({
      filter: { userID: 'user1', purpose: 'session' },
      projection: { _id: 0, id: 1 },
      sort: { createdTimestamp: -1 },
      skip: UsersAuthConstants.SessionLimits.MaxPerUser,
    });
    chai.expect(stubDeleteAll.firstCall.args[1]).to.deep.equal({ filter: { id: { $in: ['old1', 'old2'] } } });

    // the sessions can not be ended, or not read: the real error
    stubDeleteAll.resolves({ status: 500, error: { message: 'Test error message' } });
    res = await UsersAuthSessionsService.create('session', user, _ctx);
    chai.expect(res.status).to.equal(500);
    stubGetAll.resolves({ status: 500, error: { message: 'Test error message' } });
    res = await UsersAuthSessionsService.create('session', user, _ctx);
    chai.expect(res.status).to.equal(500);
    chai.expect(stubDeleteAll.callCount).to.equal(2);
  }).timeout(10000);

  /**
   * a new link replaces the earlier links of the user (not its sessions)
   */
  it('should create a link and end the earlier links of the user', async () => {
    // stub: the earlier links are removed, the write; the sessions are not limited for a link
    const stubDeleteAll = sinon.stub(DbOpsUtils, 'deleteAll').resolves({ status: 200, value: 1 });
    const stubPost = sinon.stub(DbOpsUtils, 'post').callsFake((config, record) => ({ status: 201, value: record }));
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll');

    // call
    const res = await UsersAuthSessionsService.create('reset-password', user, _ctx);

    // check: the links of the user (all but the sessions) were removed before the new one
    chai.expect(res.status).to.equal(201);
    chai
      .expect(stubDeleteAll.firstCall.args[1])
      .to.deep.equal({ filter: { userID: 'user1', purpose: { $ne: 'session' } } });
    chai.expect(stubPost.firstCall.args[1].purpose).to.equal('reset-password');
    chai.expect(stubDeleteAll.calledBefore(stubPost)).to.equal(true);
    chai.expect(stubGetAll.callCount).to.equal(0);
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
    // stub: the record of the secret, used a moment ago (no write is expected)
    const record = { id: hash('secret1'), purpose: 'session', userID: 'user1', username: user.username };
    const stubGet = sinon
      .stub(DbOpsUtils, 'getOne')
      .resolves({ status: 200, value: { ...record, expiresAt: later(), lastUsedAt: new Date() } });
    const stubPut = sinon.stub(DbOpsUtils, 'put');

    // call
    const tokenData = { purpose: 'session', username: user.username, secret: 'secret1' };
    const res = await UsersAuthSessionsService.check(tokenData, _ctx);

    // check: open, read by the hash, the last use is not saved again
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value).to.include(record);
    chai.expect(stubGet.firstCall.args[1]).to.equal(hash('secret1'));
    chai.expect(stubPut.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * a session without requests for the idle time ends (a computer left open); a link has no idle time
   */
  it('should check end a session that was idle for too long', async () => {
    // stub: the record changes in the steps; no write is expected
    const stubGet = sinon.stub(DbOpsUtils, 'getOne');
    const stubPut = sinon.stub(DbOpsUtils, 'put');
    const record = { id: hash('secret1'), purpose: 'session', userID: 'user1', username: user.username };
    const tokenData = { purpose: 'session', username: user.username, secret: 'secret1' };
    const idle = UsersAuthConstants.SessionLimits.IdleTimeout * 1000;

    // idle for longer than the idle time, an invalid or a missing last use: ended
    for (const lastUsedAt of [new Date(Date.now() - idle - 1000), 'not a date', undefined]) {
      stubGet.resolves({ status: 200, value: { ...record, expiresAt: later(), lastUsedAt } });
      const res = await UsersAuthSessionsService.check(tokenData, _ctx);
      chai.expect(res.status).to.equal(401);
      chai.expect(res.error.message).to.equal('The session has ended');
    }

    // a link used later than the idle time of a session: still valid
    const link = { ...record, purpose: 'signup', expiresAt: later(), lastUsedAt: new Date(Date.now() - 2 * idle) };
    stubGet.resolves({ status: 200, value: link });
    const res = await UsersAuthSessionsService.check({ ...tokenData, purpose: 'signup' }, _ctx);
    chai.expect(res.status).to.equal(200);

    // check: nothing was written
    chai.expect(stubPut.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * the last use of a session is saved at most every TouchInterval, so most requests do not write
   */
  it('should check save the last use of a session only after the touch interval', async () => {
    // stub: a session used before the touch interval, but not idle; the write changes in the steps
    const touch = UsersAuthConstants.SessionLimits.TouchInterval * 1000;
    const record = { id: hash('secret1'), purpose: 'session', userID: 'user1', username: user.username };
    const lastUsedAt = new Date(Date.now() - touch - 1000);
    sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: { ...record, expiresAt: later(), lastUsedAt } });
    const stubPut = sinon.stub(DbOpsUtils, 'put').resolves({ status: 200, value: { id: record.id } });
    const tokenData = { purpose: 'session', username: user.username, secret: 'secret1' };

    // call
    const before = Date.now();
    let res = await UsersAuthSessionsService.check(tokenData, _ctx);

    // check: open, the last use is now
    chai.expect(res.status).to.equal(200);
    chai.expect(stubPut.firstCall.args[1]).to.equal(record.id);
    chai.expect(stubPut.firstCall.args[2].lastUsedAt).to.be.instanceOf(Date);
    chai.expect(stubPut.firstCall.args[2].lastUsedAt.getTime()).to.be.at.least(before);
    chai.expect(res.value.lastUsedAt).to.equal(stubPut.firstCall.args[2].lastUsedAt);

    // ended in the meantime (a logout at the same time): ended
    stubPut.resolves({ status: 404, error: { message: 'Not found' } });
    res = await UsersAuthSessionsService.check(tokenData, _ctx);
    chai.expect(res.status).to.equal(401);
    chai.expect(res.error.message).to.equal('The session has ended');

    // the write fails: the real error
    stubPut.resolves({ status: 500, error: { message: 'Test error message' } });
    res = await UsersAuthSessionsService.check(tokenData, _ctx);
    chai.expect(res.status).to.equal(500);
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
