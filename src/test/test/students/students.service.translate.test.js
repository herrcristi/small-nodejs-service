const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TranslationsUtils = require('../../../core/utils/translations.utils.js');

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
   * translate with success
   */
  /**
   * translate with success
   */
  it('should do translate with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // stub
    let stubString = sinon.stub(TranslationsUtils, 'string').callsFake(() => {
      console.log(`\nTranslationsUtils.string called\n`);
      return {};
    });

    let stubAddTranslations = sinon.stub(TranslationsUtils, 'addTranslations').callsFake((obj, translations) => {
      console.log(`\nTranslationsUtils.addTranslations called\n`);
      return {};
    });

    // call
    let res = await StudentsService.translate(testStudent, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubString.callCount).to.equal(0);
    chai.expect(stubAddTranslations.callCount).to.equal(1);
  }).timeout(10000);
});
