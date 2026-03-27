const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');


const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const ProfessorsService = require('../../../services/professors/professors.service.js');
const ProfessorsDatabase = require('../../../services/professors/professors.database.js');

describe('Professors Database', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Professors' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * collection failed no tenant
   */
  it('should collection failed tenant', async () => {
    // call
    let res = await ProfessorsDatabase.collection({ ..._ctx, tenantID: undefined });
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(null);
  }).timeout(10000);
});
