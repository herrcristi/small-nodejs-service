const fs = require('fs');
const _ = require('lodash');
const sinon = require('sinon');
const chai = require('chai');

const JwtUtils = require('../../../core/utils/jwt.utils.js');
const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const UsersAuthAgreementsService = require('../../../services/users-auth/users-auth.agreements.service.js');
const UsersAuthSessionsService = require('../../../services/users-auth/users-auth.sessions.service.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');
const WebServerConstants = require('../../../web-server/web-server.constants.js');

describe('Users Auth Agreements', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  // the versions of the agreements, as a user accepts them (all the checkboxes)
  const versions = _.mapValues(UsersAuthConstants.Agreements, (agreement) => agreement.version);
  const names = Object.keys(UsersAuthConstants.Agreements);

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * the documents of the agreements, in each language: every agreement has its documents, with a title and their
   * blocks; the operator details and the effective date are filled in (no placeholder is left), and a language without
   * documents gets the default one
   */
  it('should get the documents of the agreements in each language', async () => {
    const legal = JSON.parse(TestConstants.LegalConfig);
    for (const lang of WebServerConstants.Languages) {
      // call
      const res = await UsersAuthAgreementsService.get({ ..._ctx, lang });

      // check: the agreements, their versions and their documents
      chai.expect(res.status).to.equal(200);
      chai.expect(res.value.language).to.equal(lang);
      chai.expect(res.value.agreements.map((agreement) => agreement.name)).to.deep.equal(names);
      for (const agreement of res.value.agreements) {
        const expected = UsersAuthConstants.Agreements[agreement.name];
        chai.expect(agreement.version).to.equal(expected.version);
        chai.expect(agreement.documents.map((document) => document.name)).to.deep.equal(expected.documents);

        for (const document of agreement.documents) {
          // check: a title (its first heading), and blocks of the known types, as text
          chai.expect(document.title, `${lang} ${document.name}`).to.be.a('string').that.is.not.empty;
          chai.expect(document.blocks[0]).to.deep.equal({ type: 'h1', text: document.title });
          for (const block of document.blocks) {
            chai.expect(block.type).to.be.oneOf(['h1', 'h2', 'p', 'ul']);
            const texts = block.type === 'ul' ? block.items : [block.text];
            for (const text of texts) {
              chai.expect(text).to.be.a('string').that.is.not.empty;
              chai.expect(text).to.not.include('\n'); // the lines of a paragraph or of a list item are joined
            }
          }

          // check: the placeholders are filled in (the operator, its contact, the effective date)
          const text = JSON.stringify(document.blocks);
          chai.expect(text, `${lang} ${document.name}`).to.not.match(/\{[A-Za-z]+\}/);
          chai.expect(text).to.include(legal.name);
          chai.expect(text).to.include(legal.email);
          chai.expect(text).to.include(expected.version);
        }
      }
    }

    // check: a list is a block with its items (the restrictions of the license)
    const res = await UsersAuthAgreementsService.get(_ctx);
    const eula = res.value.agreements[0].documents.find((document) => document.name === 'eula');
    chai.expect(eula.blocks.some((block) => block.type === 'ul' && block.items.length > 1)).to.equal(true);

    // case: a language without documents: the default one
    const resOther = await UsersAuthAgreementsService.get({ ..._ctx, lang: 'de' });
    chai.expect(resOther.value.language).to.equal(WebServerConstants.Languages[0]);
    const resNone = await UsersAuthAgreementsService.get({});
    chai.expect(resNone.value.language).to.equal(WebServerConstants.Languages[0]);
  }).timeout(10000);

  /**
   * the documents are read at the start: the lines of a paragraph or of a list item are joined, a placeholder without
   * a value stays as it is, and a language without a document gets the one of the default language
   */
  it('should read the documents at the start', async () => {
    const defaultLanguage = WebServerConstants.Languages[0];
    const text = [
      '# Title {operatorName}',
      '',
      'A paragraph',
      'on two lines {unknown}.',
      '## Section',
      '- an item',
      '  on two lines',
      '- another item',
      '',
      'Another paragraph.',
    ].join('\n');

    // stub: every document has this text, only the default language has documents
    const readFileSync = fs.readFileSync;
    const existsSync = fs.existsSync;
    sinon.stub(fs, 'existsSync').callsFake((file) => existsSync(file) && file.includes(`${defaultLanguage}.legal.`));
    sinon.stub(fs, 'readFileSync').callsFake((file, ...args) => {
      return `${file}`.includes('.legal.') ? Buffer.from(text) : readFileSync(file, ...args);
    });

    try {
      // call
      await UsersAuthAgreementsService.init();
      const res = await UsersAuthAgreementsService.get({ ..._ctx, lang: 'ro' });

      // check: the blocks, the lines joined, the unknown placeholder kept
      const document = res.value.agreements[0].documents[0];
      chai.expect(document.title).to.equal(`Title ${JSON.parse(TestConstants.LegalConfig).name}`);
      chai.expect(document.blocks.slice(1)).to.deep.equal([
        { type: 'p', text: 'A paragraph on two lines {unknown}.' },
        { type: 'h2', text: 'Section' },
        { type: 'ul', items: ['an item on two lines', 'another item'] },
        { type: 'p', text: 'Another paragraph.' },
      ]);

      // check: the language without documents has the ones of the default language
      const resDefault = await UsersAuthAgreementsService.get({ ..._ctx, lang: defaultLanguage });
      chai.expect(res.value.agreements).to.deep.equal(resDefault.value.agreements);
    } finally {
      // the real documents again
      sinon.restore();
      await UsersAuthAgreementsService.init();
    }
  }).timeout(10000);

  /**
   * the agreements that a user still has to accept: all of them for an account created before them, the ones with an
   * older version (a changed document), none when the current versions are accepted
   */
  it('should get the pending agreements of a user', async () => {
    // case: an account created before the agreements
    chai.expect(UsersAuthAgreementsService.getPending({})).to.deep.equal(names);
    chai.expect(UsersAuthAgreementsService.getPending(null)).to.deep.equal(names);

    // case: one document changed after it was accepted
    const older = _.cloneDeep(TestConstants.AcceptedAgreements);
    older.privacy.version = '2000-01-01';
    chai.expect(UsersAuthAgreementsService.getPending({ agreements: older })).to.deep.equal(['privacy']);

    // case: the current versions
    const current = { agreements: TestConstants.AcceptedAgreements };
    chai.expect(UsersAuthAgreementsService.getPending(current)).to.deep.equal([]);
  }).timeout(10000);

  /**
   * the versions accepted by a user: all the agreements are required (400), each in its current version (409: a
   * document changed after it was read); the result is what is kept on the user (each version and when)
   */
  it('should check the accepted versions', async () => {
    // call
    const res = UsersAuthAgreementsService.check(versions, _ctx);

    // check: each agreement with its version and the time of the acceptance
    chai.expect(res.status).to.equal(200);
    chai.expect(Object.keys(res.value)).to.deep.equal(names);
    for (const name of names) {
      chai.expect(res.value[name].version).to.equal(versions[name]);
      chai.expect(new Date(res.value[name].acceptedAt).toISOString()).to.equal(res.value[name].acceptedAt);
    }

    // case: missing, not all of them, not a version, an unknown agreement
    for (const wrong of [
      undefined,
      {},
      _.omit(versions, 'terms'),
      { ...versions, privacy: 1 },
      { ...versions, x: 'a' },
    ]) {
      chai.expect(UsersAuthAgreementsService.check(wrong, _ctx).status, JSON.stringify(wrong)).to.equal(400);
    }

    // case: an older version (the document changed after it was read)
    const resOld = UsersAuthAgreementsService.check({ ...versions, terms: '2000-01-01' }, _ctx);
    chai.expect(resOld.status).to.equal(409);
    chai.expect(resOld.error.message).to.equal('The documents were changed, read them again');
  }).timeout(10000);

  /**
   * the current user accepts the agreements: they are kept on its own user (never on another one); a version that is
   * not valid is not kept, and a failure to keep them is returned
   */
  it('should accept the agreements for the current user', async () => {
    // stub
    const stubPut = sinon.stub(UsersRest, 'putAgreements').resolves({ status: 200, value: { id: 'user1' } });

    // call
    const res = await UsersAuthAgreementsService.accept(versions, { ..._ctx, userID: 'user1' });

    // check: kept on the current user, nothing left to accept
    chai.expect(res).to.deep.equal({ status: 200, value: { agreementsPending: [] } });
    chai.expect(stubPut.callCount).to.equal(1);
    chai.expect(stubPut.firstCall.args[0]).to.equal('user1');
    const saved = stubPut.firstCall.args[1].agreements;
    chai.expect(_.mapValues(saved, (agreement) => agreement.version)).to.deep.equal(versions);

    // case: an older version: refused, nothing is kept
    stubPut.resetHistory();
    const resOld = await UsersAuthAgreementsService.accept({ ...versions, privacy: '2000-01-01' }, _ctx);
    chai.expect(resOld.status).to.equal(409);
    chai.expect(stubPut.callCount).to.equal(0);

    // case: they can not be kept
    stubPut.resolves({ status: 500, error: { message: 'Database failure' } });
    const resFail = await UsersAuthAgreementsService.accept(versions, { ..._ctx, userID: 'user1' });
    chai.expect(resFail.status).to.equal(500);
  }).timeout(10000);

  /**
   * a session of a user that has not accepted the current agreements (an account created before them, or a changed
   * document): only the routes to accept them, read the current user, log out and delete its account are allowed (with
   * the pending agreements in the answer); the other routes are refused (403), also the ones of its roles
   */
  it('should allow only the agreements routes until the agreements are accepted', async () => {
    // a student, without agreements (an account created before them)
    const user = {
      id: 'user1',
      email: 'big.ben@testdomain.test',
      name: 'Big Ben',
      status: 'active',
      schools: [{ id: 'school-univ1', name: 'University One', status: 'active', roles: ['student'] }],
    };
    const stubUser = sinon.stub(UsersRest, 'getOneByEmail').resolves({ status: 200, value: user });
    sinon.stub(JwtUtils, 'decrypt').returns({ status: 200, value: 'decoded' });
    sinon.stub(UsersLocalAuthService, 'validateToken').returns({
      status: 200,
      value: { username: user.email, userID: user.id },
    });
    const session = { id: 'session1', purpose: 'session', expiresAt: new Date(Date.now() + 60 * 1000) };
    sinon.stub(UsersAuthSessionsService, 'check').resolves({ status: 200, value: session });
    const validate = (method, route, tenantID) =>
      UsersAuthService.validate({ token: 'token', method, route }, { ..._ctx, tenantID });

    // check: the routes of the agreements, with the pending agreements in the answer
    for (const [method, route] of [
      ['GET', '/api/v1/users-auth/me'],
      ['PUT', '/api/v1/users-auth/agreements/accept'],
      ['POST', '/api/v1/users-auth/logout'],
      ['DELETE', '/api/v1/users-auth'],
    ]) {
      const res = await validate(method, route);
      chai.expect(res.status, `${method} ${route}`).to.equal(200);
      chai.expect(res.value.agreementsPending).to.deep.equal(names);
    }

    // check: the other routes are refused, also a route of its role in its school and its own profile
    for (const [method, route, tenantID] of [
      ['GET', '/api/v1/schedules', user.schools[0].id],
      ['GET', '/api/v1/users/:id', user.schools[0].id],
      ['PUT', '/api/v1/users-auth/password'],
    ]) {
      const res = await validate(method, route, tenantID);
      chai.expect(res.status, `${method} ${route}`).to.equal(403);
      chai.expect(res.error.message).to.equal('The agreements must be accepted');
    }

    // case: one document changed after it was accepted: only that one is pending, the session is still limited
    const older = _.cloneDeep(TestConstants.AcceptedAgreements);
    older.terms.version = '2000-01-01';
    user.agreements = older;
    const resOlder = await validate('GET', '/api/v1/users-auth/me');
    chai.expect(resOlder.value.agreementsPending).to.deep.equal(['terms']);
    chai.expect((await validate('GET', '/api/v1/schedules', user.schools[0].id)).status).to.equal(403);

    // case: the current agreements are accepted: the routes of its roles, nothing pending
    user.agreements = _.cloneDeep(TestConstants.AcceptedAgreements);
    const resAccepted = await validate('GET', '/api/v1/schedules', user.schools[0].id);
    chai.expect(resAccepted.status).to.equal(200);
    chai.expect(resAccepted.value.agreementsPending).to.deep.equal([]);

    // case: a read on a secondary that does not see the acceptance yet (the replication lag): checked again on the
    // primary, where it is accepted
    stubUser.resetHistory();
    stubUser.onFirstCall().resolves({ status: 200, value: { ...user, agreements: undefined } });
    const accepted = { ...user, agreements: _.cloneDeep(TestConstants.AcceptedAgreements) };
    stubUser.onSecondCall().resolves({ status: 200, value: accepted });
    const resLag = await validate('GET', '/api/v1/schedules', user.schools[0].id);
    chai.expect(resLag.status).to.equal(200);
    chai.expect(stubUser.callCount).to.equal(2);
    chai.expect(stubUser.secondCall.args[3]).to.deep.equal({ readPreference: DbOpsUtils.Constants.ReadPrimary });
  }).timeout(10000);

  /**
   * the login of a user that has not accepted the agreements is not refused: its answer has the pending agreements (the
   * application asks for them), the current ones: none
   */
  it('should login with the pending agreements', async () => {
    // a student, without agreements (an account created before them)
    const user = {
      id: 'user1',
      email: 'big.ben@testdomain.test',
      name: 'Big Ben',
      status: 'active',
      schools: [{ id: 'school-univ1', name: 'University One', status: 'active', roles: ['student'] }],
    };

    // stub: the password, the user, the session and its token, the event
    sinon.stub(UsersLocalAuthService, 'login').resolves({ status: 200, value: 'provider-token' });
    const stubUser = sinon.stub(UsersRest, 'getOneByEmail').resolves({ status: 200, value: user });
    sinon
      .stub(UsersAuthSessionsService, 'create')
      .resolves({ status: 201, value: { id: 'session1', secret: 'secret1', expiresAt: new Date() } });
    sinon.stub(UsersLocalAuthService, 'getToken').resolves({ status: 200, value: 'token' });
    sinon.stub(JwtUtils, 'encrypt').returns({ status: 200, value: 'encrypted' });
    sinon.stub(EventsRest, 'raiseEventForObject').resolves();

    // call
    const res = await UsersAuthService.login({ username: user.email, password: 'Password1!' }, { ..._ctx });

    // check: logged in, with all the agreements to accept
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.agreementsPending).to.deep.equal(names);
    chai.expect(stubUser.firstCall.args[1].agreements).to.equal(1); // read with the user

    // case: the current agreements are accepted
    user.agreements = _.cloneDeep(TestConstants.AcceptedAgreements);
    const resAccepted = await UsersAuthService.login({ username: user.email, password: 'Password1!' }, { ..._ctx });
    chai.expect(resAccepted.value.agreementsPending).to.deep.equal([]);
  }).timeout(10000);
});
