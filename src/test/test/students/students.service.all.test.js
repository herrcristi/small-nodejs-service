const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const BaseServiceUtils = require('../../../core/utils/base-service.utils');
const TranslationsUtils = require('../../../core/utils/translations.utils');

const TestConstants = require('../../test-constants.js');
const StudentsConstants = require('../../../services/students/students.constants.js');
const StudentsService = require('../../../services/students/students.service.js');

describe('Students Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Students' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * getAllForReq with success
   */
  it('should getAllForReq with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return {
        status: 200,
        value: {
          data: _.cloneDeep(testStudents),
          meta: { count: testStudents.length },
        },
      };
    });

    // call
    let res = await StudentsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);

    chai.expect(res.status).to.equal(200);
    chai.expect(res.value).to.deep.equal({
      data: _.cloneDeep(testStudents),
      meta: { count: testStudents.length },
    });
  }).timeout(10000);

  /**
   * getAllForReq failed
   */
  it('should getAllForReq failed', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllForReq').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllForReq called\n`);
      return { status: 400, error: { message: 'Test error message', error: new Error('Test error').toString() } };
    });

    // call
    let res = await StudentsService.getAllForReq({ query: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * getAll with success
   */
  it('should getAll with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAll').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAll called\n`);
      return {
        status: 200,
        value: _.cloneDeep(testStudents),
      };
    });

    // call
    let res = await StudentsService.getAll({ filter: {} }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: _.cloneDeep(testStudents),
    });
  }).timeout(10000);

  /**
   * getAllCount with success
   */
  it('should getAllCount with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllCount').callsFake((config, filter) => {
      console.log(`\nBaseServiceUtils.getAllCount called\n`);
      return { status: 200, value: 1 };
    });

    // call
    let res = await StudentsService.getAllCount({}, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: 1,
    });
  }).timeout(10000);

  /**
   * getAllByIDs with success
   */
  it('should getAllByIDs with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getAllByIDs').callsFake((config, ids, projection) => {
      console.log(`\nBaseServiceUtils.getAllByIDs called\n`);
      return {
        status: 200,
        value: _.cloneDeep(testStudents),
      };
    });

    // call
    let res = await StudentsService.getAllByIDs(['id1'], { id: 1 }, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);

    chai.expect(res).to.deep.equal({
      status: 200,
      value: _.cloneDeep(testStudents),
    });
  }).timeout(10000);

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'getOne').callsFake(() => {
      console.log(`\nBaseServiceUtils.getOne called\n`);
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

  /**
   * post with success
   */
  it('should post with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    const postReq = {
      ...testStudent,
      type: undefined,
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'post').callsFake((config, postObj) => {
      console.log(`\nBaseServiceUtils.post called\n`);
      return {
        status: 201,
        value: { ...postObj },
      };
    });

    // call
    let res = await StudentsService.post(postReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 201,
      value: { ...testStudent },
    });
  }).timeout(10000);

  /**
   * delete with success
   */
  it('should delete with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'delete').callsFake(() => {
      console.log(`\nBaseServiceUtils.delete called\n`);
      return { status: 200, value: { ...testStudent } };
    });

    // call
    let res = await StudentsService.delete(testStudent.id, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testStudent },
    });
  }).timeout(10000);

  /**
   * put with success
   */
  it('should put with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    const putReq = {
      ...testStudent,
      id: undefined,
      type: undefined,
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'put').callsFake(() => {
      console.log(`\nBaseServiceUtils.put called\n`);
      return {
        status: 200,
        value: { ...testStudent },
      };
    });

    // call
    let res = await StudentsService.put(putReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testStudent },
    });
  }).timeout(10000);

  /**
   * patch with success
   */
  it('should patch with success', async () => {
    const testStudents = _.cloneDeep(TestConstants.Students);
    const testStudent = testStudents[0];

    const patchReq = {
      set: {
        ...testStudent,
        id: undefined,
        type: undefined,
      },
    };

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'patch').callsFake(() => {
      console.log(`\nBaseServiceUtils.patch called\n`);
      return {
        status: 200,
        value: { ...testStudent },
      };
    });

    // call
    let res = await StudentsService.patch(patchReq, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: { ...testStudent },
    });
  }).timeout(10000);

  /**
   * notification with success
   */
  it('should do notification with success', async () => {
    const notifications = _.cloneDeep(TestConstants.StudentsNotifications);
    const notif = notifications[0];

    // stub
    let stubBase = sinon.stub(BaseServiceUtils, 'notification').callsFake((config, notification) => {
      console.log(`\nBaseServiceUtils.notification called\n`);
      return {
        status: 200,
        value: true,
      };
    });

    // call
    let res = await StudentsService.notification(notif, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: true,
    });
  }).timeout(10000);

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
