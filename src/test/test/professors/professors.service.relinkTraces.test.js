const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const ProfessorsService = require('../../../services/professors/professors.service.js');
const ProfessorsRest = require('../../../services/rest/professors.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Professors Service relink traces', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Professors', tenantID: 'school1' };
  const fail = { status: 500, error: { message: 'Database failure' } };

  beforeEach(async function () {
    // the events and the notifications of the professors
    sinon.stub(EventsRest, 'raiseEventForObject');
    sinon.stub(ProfessorsRest, 'raiseNotification');
  });

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * the traces of a deleted account with the email of the invited user take its id (their user copy stays deleted)
   */
  it('should relink the traces of a deleted account to the invited user', async () => {
    // stub: one trace of the deleted account old1; its new id
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').resolves({ status: 200, value: [{ id: 'old1' }] });
    const linked = { id: 'user1', type: 'professor', user: { id: 'user1', name: 'Jane Smith', status: 'deleted' } };
    const stubPut = sinon.stub(DbOpsUtils, 'put').resolves({ status: 200, value: linked });

    // call
    const objInfo = { email: 'jane.smith@testdomain.test', userID: 'user1' };
    const res = await ProfessorsService.relinkTraces(objInfo, _ctx);

    // check: the traces of a deleted account with this email and another id
    chai.expect(res).to.deep.equal({ status: 200, value: ['old1'] });
    chai.expect(stubGetAll.firstCall.args[1].filter).to.deep.equal({
      'user.email': 'jane.smith@testdomain.test',
      'user.status': 'deleted',
      id: { $ne: 'user1' },
    });

    // check: the id of the record and of its user copy, with the event
    chai.expect(stubPut.firstCall.args[1]).to.equal('old1');
    chai.expect(stubPut.firstCall.args[2]).to.deep.equal({ id: 'user1', 'user.id': 'user1' });
    chai.expect(EventsRest.raiseEventForObject.firstCall.args[1]).to.equal('relink');
    chai.expect(EventsRest.raiseEventForObject.firstCall.args[3]).to.deep.equal({ previousID: 'old1' });

    // check: the groups and the schedules follow the new id (previousID), then the copy
    chai.expect(ProfessorsRest.raiseNotification.firstCall.args[0]).to.equal('modified');
    chai.expect(ProfessorsRest.raiseNotification.firstCall.args[1]).to.deep.equal([{ ...linked, previousID: 'old1' }]);
  }).timeout(10000);

  /**
   * relink fail: no school, an invalid request, the traces can not be read or changed
   */
  it('should relink the traces fail', async () => {
    // stub: the traces can not be read
    const stubGetAll = sinon.stub(DbOpsUtils, 'getAll').resolves(fail);
    const stubPut = sinon.stub(DbOpsUtils, 'put').resolves(fail);
    const objInfo = { email: 'jane.smith@testdomain.test', userID: 'user1' };

    // case: no school
    const resTenant = await ProfessorsService.relinkTraces(objInfo, { ..._ctx, tenantID: undefined });
    chai.expect(resTenant.status).to.equal(400);

    // case: not an email
    const resInvalid = await ProfessorsService.relinkTraces({ email: 'jane.smith', userID: 'user1' }, _ctx);
    chai.expect(resInvalid.status).to.equal(400);

    // case: the traces can not be read
    chai.expect(await ProfessorsService.relinkTraces(objInfo, _ctx)).to.deep.equal(fail);

    // case: a trace can not be changed
    stubGetAll.resolves({ status: 200, value: [{ id: 'old1' }] });
    chai.expect(await ProfessorsService.relinkTraces(objInfo, _ctx)).to.deep.equal(fail);
    chai.expect(stubPut.callCount).to.equal(1);
  }).timeout(10000);
});
