const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TranslationsUtils = require('../../../core/utils/translations.utils.js');

const TestConstants = require('../../test-constants.js');
const Index = require('../../../index.js');
const ConfigServices = require('../../../services/config.services.js');
const WebServer = require('../../../web-server/web-server.js');

describe('Index', function () {
  const _ctx = { reqID: 'testReq', lang: 'en' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * init success
   */
  it('should init with success', async () => {
    // stub
    let stubTranslations = sinon.stub(TranslationsUtils, 'initLanguage').callsFake(() => {
      console.log(`\nTranslationsUtils.initLanguage called`);
    });

    let stubConfig = sinon.stub(ConfigServices, 'init').callsFake(() => {
      console.log(`\nConfigServices.init called`);
    });

    let stubWebServer = sinon.stub(WebServer, 'init').callsFake(() => {
      console.log(`\nWebServer.init called`);
    });

    // call
    let res = await Index.init();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(true);
    chai.expect(stubTranslations.callCount).to.equal(Index.Languages.length);
    chai.expect(stubConfig.callCount).to.equal(1);
    chai.expect(stubWebServer.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * init fail
   */
  it('should init fail', async () => {
    // stub
    let stubProcess = sinon.stub(process, 'exit').callsFake(() => {
      console.log(`\nProcess exit called`);
    });

    let stubTranslations = sinon.stub(TranslationsUtils, 'initLanguage').callsFake(() => {
      console.log(`\nTranslationsUtils.initLanguage throws exception`);
      throw new Error('Test');
    });

    // call
    let res = await Index.init();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(undefined);
    chai.expect(stubTranslations.callCount).to.equal(1);
    chai.expect(stubProcess.callCount).to.equal(1);
  }).timeout(10000);
});
