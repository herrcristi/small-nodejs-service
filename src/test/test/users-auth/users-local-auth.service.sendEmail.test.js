const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const EmailsUtils = require('../../../core/utils/emails.utils.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthDatabase = require('../../../services/users-auth/users-local-auth.database.js');
const UsersLocalAuthService = require('../../../services/users-auth/users-local-auth.service.js');

describe('Users Local Auth Service', function () {
  afterEach(async function () {
    sinon.restore();
  });

  /**
   * each recipient gets the email with their own link, not the link of the first email sent
   */
  it('should send to each recipient an email with their own link', async () => {
    sinon.stub(UsersAuthDatabase, 'collection').resolves(null);
    const sent = [];
    sinon.stub(EmailsUtils, 'sendEmail').callsFake((to, subject, body) => {
      sent.push({ to, subject, body });
    });

    const config = { serviceName: UsersAuthConstants.ServiceName };
    const ctx = { reqID: 'testReq', lang: 'en', tenantName: 'School One' };
    const args = { emailType: 'signup', resetType: 'signup' };

    await UsersLocalAuthService.sendEmail(config, 'user1@testdomain.test', { ...args, token: 'TOKEN_OF_USER_1' }, ctx);
    await UsersLocalAuthService.sendEmail(
      config,
      'user2@testdomain.test',
      { ...args, token: 'TOKEN_OF_USER_2' },
      { ...ctx, tenantName: 'School Two' }
    );

    chai.expect(sent.map((item) => item.to)).to.deep.equal(['user1@testdomain.test', 'user2@testdomain.test']);

    chai.expect(sent[0].body).to.include('TOKEN_OF_USER_1');
    // the link opens the page of the UI, with the token in the fragment (never sent to a server)
    chai
      .expect(sent[0].body)
      .to.include(`${process.env.SMALL_UI_URL}/reset-password#type=signup&amp;token=TOKEN_OF_USER_1`);
    chai.expect(sent[0].body).to.not.include('reset-token/validate');
    chai.expect(sent[0].body).to.not.include('TOKEN_OF_USER_2');
    chai.expect(sent[0].body).to.include('School One');

    chai.expect(sent[1].body).to.include('TOKEN_OF_USER_2');
    chai.expect(sent[1].body).to.not.include('TOKEN_OF_USER_1');
    chai.expect(sent[1].body).to.include('School Two');
    chai.expect(sent[1].body).to.not.include('School One');
  }).timeout(10000);

  /**
   * the email greets the recipient by its email ("Hi {user}"), in every email type
   */
  it('should greet the recipient by its email', async () => {
    // stub: keep the sent emails
    sinon.stub(UsersAuthDatabase, 'collection').resolves(null);
    const sent = [];
    sinon.stub(EmailsUtils, 'sendEmail').callsFake((to, subject, body) => {
      sent.push({ to, subject, body });
    });

    const config = { serviceName: UsersAuthConstants.ServiceName };
    const ctx = { reqID: 'testReq', lang: 'en', tenantName: 'GitHub University' };
    const email = 'john.doe@testdomain.test';

    // call: an invite, a signup and a reset password email
    await UsersLocalAuthService.sendEmail(config, email, { emailType: 'invite' }, ctx);
    await UsersLocalAuthService.sendEmail(
      config,
      email,
      { emailType: 'signup', resetType: 'signup', token: 'T1' },
      ctx
    );
    await UsersLocalAuthService.sendEmail(
      config,
      email,
      { emailType: 'reset-password', resetType: 'reset', token: 'T2' },
      ctx
    );

    // check: each one greets the email, the invite names the school
    for (const item of sent) {
      chai.expect(item.body).to.include(`<p>Hi ${email}</p>`);
    }
    chai.expect(sent[0].subject).to.equal('You have been invited to GitHub University');
    chai.expect(sent[0].body).to.include('You have been invited to GitHub University');
  }).timeout(10000);

  /**
   * the send returns its result (an invite reports a failed delivery)
   */
  it('should return the result of the send', async () => {
    // stub: the mail server refuses the email
    sinon.stub(UsersAuthDatabase, 'collection').resolves(null);
    sinon.stub(EmailsUtils, 'sendEmail').resolves({ status: 500, error: { message: 'Failed to send email' } });

    // call
    const config = { serviceName: UsersAuthConstants.ServiceName };
    const res = await UsersLocalAuthService.sendEmail(config, 'user1@testdomain.test', { emailType: 'invite' }, {});

    // check: the error of the send
    chai.expect(res.status).to.equal(500);
  }).timeout(10000);

  /**
   * put the email timestamp: the time of the last email of this type is written only if there is none, or it is
   * older than EmailInterval, in one write (409 when it is newer: not sent again)
   */
  it('should put the email timestamp at most once each email interval', async () => {
    // stub: the auth records, the write
    sinon.stub(UsersAuthDatabase, 'collection').resolves({});
    const stubPut = sinon.stub(DbOpsUtils, 'put').resolves({ status: 200, value: { id: 'user1@testdomain.test' } });
    const config = { serviceName: UsersAuthConstants.ServiceName };

    // call
    const before = Date.now();
    const res = await UsersLocalAuthService.putEmailTimestamp(config, 'user1@testdomain.test', 'invite', {});

    // check: the auth record of the user, the time of its invite email, only if none or older
    chai.expect(res.status).to.equal(200);
    chai.expect(stubPut.firstCall.args[1]).to.equal('user1@testdomain.test');
    const sentAt = stubPut.firstCall.args[2]['emailTimestamps.invite'];
    chai.expect(new Date(sentAt).getTime()).to.be.at.least(before);
    const conditions = stubPut.firstCall.args[5].filter.$or;
    chai.expect(conditions[0]).to.deep.equal({ 'emailTimestamps.invite': { $exists: false } });
    const sentBefore = new Date(conditions[1]['emailTimestamps.invite'].$lt).getTime();
    chai.expect(sentBefore).to.equal(new Date(sentAt).getTime() - UsersAuthConstants.EmailInterval * 1000);
  }).timeout(10000);
});
