const sinon = require('sinon');
const chai = require('chai');

const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');

describe('Users Auth Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Users' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * activatePendingSchools makes active only the pending schools
   */
  it('should activatePendingSchools only for the pending schools', async () => {
    // a user with pending, active and disabled schools
    const user = {
      schools: [
        { id: 'school1', status: 'pending' },
        { id: 'school2', status: 'active' },
        { id: 'school3', status: 'disabled' },
        { id: 'school4', status: 'pending' },
      ],
    };
    // stub: the activation
    const stubPut = sinon.stub(SchoolsRest, 'activate').resolves({ status: 200, value: { status: 'active' } });

    // call
    const res = await UsersAuthService.activatePendingSchools(user, _ctx);

    // check: only the pending schools were activated
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubPut.callCount).to.equal(2);
    chai.expect(stubPut.firstCall.args[0]).to.equal('school1');
    chai.expect(stubPut.secondCall.args[0]).to.equal('school4');
    chai.expect(user.schools.map((item) => item.status)).to.deep.equal(['active', 'active', 'disabled', 'active']);
  }).timeout(10000);

  /**
   * activatePendingSchools without schools
   */
  it('should activatePendingSchools without schools', async () => {
    // stub: no activation is expected
    const stubPut = sinon.stub(SchoolsRest, 'activate');

    // call for a user without schools
    const res = await UsersAuthService.activatePendingSchools({}, _ctx);

    // check: nothing to do
    chai.expect(res).to.deep.equal({ status: 200, value: true });
    chai.expect(stubPut.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * activatePendingSchools fail keeps the status that is saved
   */
  it('should activatePendingSchools fail and keep the school pending', async () => {
    // stub: a pending school; the activation fails
    const user = { schools: [{ id: 'school1', status: 'pending' }] };
    sinon.stub(SchoolsRest, 'activate').resolves({ status: 500, error: { message: 'db down' } });

    // call
    const res = await UsersAuthService.activatePendingSchools(user, _ctx);

    // check: the error, the school stays pending
    chai.expect(res.status).to.equal(500);
    chai.expect(res.error.message).to.equal('Failed to make school active');
    chai.expect(user.schools[0].status).to.equal('pending');
  }).timeout(10000);

  /**
   * a school disabled in the meantime stays disabled: the copy takes the status of the school
   */
  it('should activatePendingSchools keep the status of a school that is not pending anymore', async () => {
    // a user with two pending schools
    const user = {
      schools: [
        { id: 'school1', status: 'pending' },
        { id: 'school2', status: 'pending' },
      ],
    };
    // stub: school1 was disabled in the meantime, school2 is activated
    sinon
      .stub(SchoolsRest, 'activate')
      .callsFake((id) => ({ status: 200, value: { id, status: id === 'school1' ? 'disabled' : 'active' } }));

    // call
    const res = await UsersAuthService.activatePendingSchools(user, _ctx);

    // check: each copy has the status of its school
    chai.expect(res.status).to.equal(200);
    chai.expect(user.schools.map((item) => item.status)).to.deep.equal(['disabled', 'active']);
  }).timeout(10000);
});
