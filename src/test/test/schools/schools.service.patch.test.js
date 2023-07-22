const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils');

const TestConstants = require('../../test-constants.js');
const SchoolsConstants = require('../../../services/schools/schools.constants.js');
const SchoolsService = require('../../../services/schools/schools.service.js');

describe('Schools Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Schools' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * patch one with success
   */
  it('should patch one with success', async () => {
    const testSchools = _.cloneDeep(TestConstants.Schools);
    const testSchool = testSchools[0];

    const patchReq = {
      ...testSchool,
      id: undefined,
      type: undefined,
    };

    // stub
    let stubDbPatchOne = sinon.stub(BaseServiceUtils, 'patch').callsFake(() => {
      console.log(`\nBaseServiceUtils.patch called\n`);
      return {
        status: 200,
        value: { ...testSchool },
      };
    });

    // call
    let res = await SchoolsService.patch(patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubDbPatchOne.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testSchool },
    });
  }).timeout(10000);
});
