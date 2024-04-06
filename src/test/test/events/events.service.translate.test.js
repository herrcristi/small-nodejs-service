const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TranslationsUtils = require('../../../core/utils/translations.utils.js');

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
   * translate with success
   */
  /**
   * translate with success
   */
  it('should do translate with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];
    testEvent.args = ['other'];

    // stub
    let stubString = sinon.stub(TranslationsUtils, 'string');
    stubString.onCall(0).callsFake((string, ctx, args) => {
      console.log(`\nTranslationsUtils.string called`);
      console.log(`args=${JSON.stringify(args, null, 2)}\n`);

      chai.expect(args).to.equal(undefined);
      return {};
    });
    stubString.onCall(1).callsFake((string, ctx, args) => {
      console.log(`\nTranslationsUtils.string called`);
      console.log(`args=${JSON.stringify(args, null, 2)}\n`);

      chai.expect(args).to.deep.equal(['GitHub University', 'big.ben@testdomain.test', 'other']);
      return {};
    });

    let stubAddTranslations = sinon.stub(TranslationsUtils, 'addTranslations').callsFake((obj, translations) => {
      console.log(`\nTranslationsUtils.addTranslations called\n`);
      return {};
    });

    // call
    let res = await EventsService.translate(testEvent, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubString.callCount).to.equal(2);
    chai.expect(stubAddTranslations.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * translate with success - obj with no args
   */
  it('should do translate with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];
    delete testEvent.args;

    // stub
    let stubString = sinon.stub(TranslationsUtils, 'string');
    stubString.onCall(0).callsFake((string, ctx, args) => {
      console.log(`\nTranslationsUtils.string called`);
      console.log(`args=${JSON.stringify(args, null, 2)}\n`);

      chai.expect(args).to.equal(undefined);
      return {};
    });
    stubString.onCall(1).callsFake((string, ctx, args) => {
      console.log(`\nTranslationsUtils.string called`);
      console.log(`args=${JSON.stringify(args, null, 2)}\n`);

      chai.expect(args).to.deep.equal(['GitHub University', 'big.ben@testdomain.test']);
      return {};
    });

    let stubAddTranslations = sinon.stub(TranslationsUtils, 'addTranslations').callsFake((obj, translations) => {
      console.log(`\nTranslationsUtils.addTranslations called\n`);
      return {};
    });

    // call
    let res = await EventsService.translate(testEvent, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubString.callCount).to.equal(2);
    chai.expect(stubAddTranslations.callCount).to.equal(1);
  }).timeout(10000);
});
