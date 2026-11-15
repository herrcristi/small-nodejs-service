const sinon = require('sinon');
const chai = require('chai');

const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * activatePendingSchools makes active only the pending schools
   */
  it('should activatePendingSchools only for the pending schools', async () => {
    const user = {
      schools: [
        { id: 'school1', status: 'pending' },
        { id: 'school2', status: 'active' },
        { id: 'school3', status: 'disabled' },
        { id: 'school4', status: 'pending' },
      ],
    };
    const stubPut = sinon.stub(SchoolsRest, 'put').resolves({ status: 200, value: {} });

    const res = await UsersAuthService.activatePendingSchools(user, _ctx);

    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubPut.callCount).to.equal(2);
    chai.expect(stubPut.firstCall.args.slice(0, 2)).to.deep.equal(['school1', { status: 'active' }]);
    chai.expect(stubPut.secondCall.args.slice(0, 2)).to.deep.equal(['school4', { status: 'active' }]);
    chai.expect(user.schools.map((item) => item.status)).to.deep.equal(['active', 'active', 'disabled', 'active']);
  }).timeout(10000);

  /**
   * activatePendingSchools without schools
   */
  it('should activatePendingSchools without schools', async () => {
    const stubPut = sinon.stub(SchoolsRest, 'put');

    const res = await UsersAuthService.activatePendingSchools({}, _ctx);

    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubPut.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * activatePendingSchools fail keeps the status that is saved
   */
  it('should activatePendingSchools fail and keep the school pending', async () => {
    const user = { schools: [{ id: 'school1', status: 'pending' }] };
    sinon.stub(SchoolsRest, 'put').resolves({ status: 500, error: { message: 'db down' } });

    const res = await UsersAuthService.activatePendingSchools(user, _ctx);

    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.equal('Failed to make school active');
    chai.expect(user.schools[0].status).to.equal('pending');
  }).timeout(10000);
});
