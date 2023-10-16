const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const ReferencesUtils = require('../../../core/utils/base-service.references.utils.js');

const TestConstants = require('../../test-constants.js');
const StudentsService = require('../../../services/students/students.service.js');

describe('Students Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Students' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake(() => {
      console.log(`\nDbOpsUtils.getOne called\n`);
      return { status: 200, value: { ...testStudent } };
    });

    // call
    let res = await StudentsService.getOne(testStudent.id, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testStudent },
    });
  }).timeout(10000);
});
