const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TranslationsUtils = require('../../../core/utils/translations.utils.js');

const TestConstants = require('../../test-constants.js');
const ClassesService = require('../../../services/classes/classes.service.js');

describe('Classes Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Classes' };

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
    const testClasses = _.cloneDeep(TestConstants.Classes);
    const testClass = testClasses[0];

    // stub
    let stubString = sinon.stub(TranslationsUtils, 'string').callsFake((val) => {
      console.log(`\nTranslationsUtils.string called for ${JSON.stringify(val, null, 2)}\n`);
      return {};
    });
    let stubNumber = sinon.stub(TranslationsUtils, 'number').callsFake((val) => {
      console.log(`\nTranslationsUtils.number called ${JSON.stringify(val, null, 2)}\n`);
      return {};
    });

    let stubAddTranslations = sinon.stub(TranslationsUtils, 'addTranslations').callsFake((obj, translations) => {
      console.log(
        `\nTranslationsUtils.addTranslations called obj: ${JSON.stringify(
          obj,
          null,
          2
        )} with translations: ${JSON.stringify(translations, null, 2)}\n`
      );
      return {};
    });

    // call
    let res = await ClassesService.translate(testClass, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubString.callCount).to.equal(2);
    chai.expect(stubNumber.callCount).to.equal(1);
    chai.expect(stubAddTranslations.callCount).to.equal(1);
  }).timeout(10000);
});
