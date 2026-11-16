const sinon = require('sinon');
const chai = require('chai');

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
    chai.expect(sent[0].body).to.not.include('TOKEN_OF_USER_2');
    chai.expect(sent[0].body).to.include('School One');

    chai.expect(sent[1].body).to.include('TOKEN_OF_USER_2');
    chai.expect(sent[1].body).to.not.include('TOKEN_OF_USER_1');
    chai.expect(sent[1].body).to.include('School Two');
    chai.expect(sent[1].body).to.not.include('School One');
  }).timeout(10000);
});
