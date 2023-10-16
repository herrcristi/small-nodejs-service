const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');

const TestConstants = require('../../test-constants.js');
const EventsService = require('../../../services/events/events.service.js');

describe('Events Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Events' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllCount with success
   */
  it('should getAllCount with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getAllCount').callsFake(() => {
      console.log(`\nDbOpsUtils.getAllCount called\n`);
      return { status: 200, value: 1 };
    });

    // call
    let res = await EventsService.getAllCount({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 1,
    });
  }).timeout(10000);
});
