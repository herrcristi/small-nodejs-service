const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const BaseServiceUtils = require('../../../core/utils/base-service.utils.js');
const TranslationsUtils = require('../../../core/utils/translations.utils.js');
const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const RestApiUtils = require('../../../core/utils/rest-api.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const AdminsConstants = require('../../../services/admins/admins.constants.js');
const AdminsService = require('../../../services/admins/admins.service.js');
const AdminsRest = require('../../../services/rest/admins.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

describe('Admins Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[1].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Admins' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    let stubBase = sinon.stub(DbOpsUtils, 'delete').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.delete called`);
      return {
        status: 200,
        value: { ...testAdmin },
      };
    });

    let stubEvent = sinon.stub(EventsRest, 'raiseEventForObject').callsFake(() => {
      console.log(`\nEventsRest.raiseEventForObject called`);
    });

    let stubAdminsRest = sinon.stub(AdminsRest, 'raiseNotification').callsFake(() => {
      console.log(`\nAdminsRest raiseNotification called`);
    });

    // call
    let res = await AdminsService.delete(testAdmin.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(stubEvent.callCount).to.equal(1);
    chai.expect(stubAdminsRest.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        id: testAdmin.id,
        user: testAdmin.user,
        type: testAdmin.type,
      },
    });
  }).timeout(10000);

  /**
   * delete failed no tenant
   */
  it('should delete failed tenant', async () => {
    // call
    let res = await AdminsService.delete('id', { ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('Missing tenant');
  }).timeout(10000);

  /**
   * delete fail
   */
  it('should delete fail ', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'delete').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.delete called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await AdminsService.delete(testAdmin.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * delete fail skipping current admin
   */
  it('should delete fail skipping current admin', async () => {
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'delete').callsFake((config, objID) => {
      console.log(`\nDbOpsUtils.delete called`);
      return { status: 500, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await AdminsService.delete(testAdmin.id, { ..._ctx, userID: testAdmin.id });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Skipping delete of current admin',
        error: new Error('Skipping delete of current admin'),
      },
    });
  }).timeout(10000);
});
