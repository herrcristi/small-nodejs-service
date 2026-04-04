const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const TranslationsUtils = require('../../../core/utils/translations.utils.js');

const TestConstants = require('../../test-constants.js');
const AdminsService = require('../../../services/admins/admins.service.js');

describe('Admins Service', function () {
  const tenantID = _.cloneDeep(TestConstants.Schools[0].id);
  const _ctx = { reqID: 'testReq', tenantID, lang: 'en', service: 'Admins' };

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
    const testAdmins = _.cloneDeep(TestConstants.Admins);
    const testAdmin = testAdmins[0];

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
    let res = await AdminsService.translate(testAdmin, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubString.callCount).to.equal(0);
    chai.expect(stubAddTranslations.callCount).to.equal(1);
  }).timeout(10000);
});
