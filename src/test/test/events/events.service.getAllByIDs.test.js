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
   * getAllByIDs with success
   */
  it('should getAllByIDs with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEventsIDs = testEvents.map((item) => item.id);

    // stub
    let stubBase = sinon.stub(DbOpsUtils, 'getAllByIDs').callsFake(() => {
      console.log(`\nDbOpsUtils.getAllByIDs called\n`);
      return { status: 200, value: [...testEvents] };
    });

    // call
    let res = await EventsService.getAllByIDs(testEventsIDs, { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [...testEvents],
    });
  }).timeout(10000);
});
