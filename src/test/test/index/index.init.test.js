const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const TranslationsUtils = require('../../../core/utils/translations.utils.js');

const TestConstants = require('../../test-constants.js');
const Index = require('../../../index.js');
const ConfigServices = require('../../../services/config.services.js');
const WebServer = require('../../../web-server/web-server.js');
const WebServerConstants = require('../../../web-server/web-server.constants.js');

describe('Index', function () {
  const _ctx = { reqID: 'testReq', lang: 'en' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * init: the service started once (when index.js was loaded), init waits for the same start
   */
  it('should init the service once', async () => {
    // stub: a start again would init the services
    const stubConfig = sinon.stub(ConfigServices, 'init').resolves(true);

    // call twice
    const res = await Index.init();
    const resAgain = await Index.init();

    // check: started, not again
    chai.expect(res).to.equal(true);
    chai.expect(resAgain).to.equal(true);
    chai.expect(stubConfig.callCount).to.equal(0);
  }).timeout(10000);

  /**
   * start success
   */
  it('should start with success', async () => {
    // stub
    let stubTranslations = sinon.stub(TranslationsUtils, 'initStrings').callsFake(() => {
      console.log(`\nTranslationsUtils.initStrings called`);
    });

    let stubConfig = sinon.stub(ConfigServices, 'init').callsFake(() => {
      console.log(`\nConfigServices.init called`);
    });

    let stubWebServer = sinon.stub(WebServer, 'init').callsFake(() => {
      console.log(`\nWebServer.init called`);
    });

    // call
    let res = await Index.start();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(true);
    chai.expect(stubTranslations.callCount).to.equal(WebServerConstants.Languages.length);
    chai.expect(stubConfig.callCount).to.equal(1);
    chai.expect(stubWebServer.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * start fail
   */
  it('should start fail', async () => {
    // stub
    let stubProcess = sinon.stub(process, 'exit').callsFake(() => {
      console.log(`\nProcess exit called`);
    });

    let stubTranslations = sinon.stub(TranslationsUtils, 'initStrings').callsFake(() => {
      console.log(`\nTranslationsUtils.initStrings throws exception`);
      throw new Error('Test');
    });

    // call
    let res = await Index.start();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(undefined);
    chai.expect(stubTranslations.callCount).to.equal(1);
    chai.expect(stubProcess.callCount).to.equal(1);
  }).timeout(10000);
});
