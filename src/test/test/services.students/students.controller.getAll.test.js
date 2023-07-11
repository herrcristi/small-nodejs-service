const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const StudentsConstants = require('../../../services/students/students.constants.js');
const StudentsService = require('../../../services/students/students.service.js');

describe('Students', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * get all with success
   */
  it('should get all with success', async () => {
    // call
    let res = await chai.request(TestConstants.WebServer).get(`${StudentsConstants.StudentsApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.body).to.deep.equal({
      data: [],
      meta: {
        count: 0,
        limit: 0,
        skip: 0,
      },
    });
  }).timeout(10000);

  /**
   * get all failed with exception
   */
  it('should get all failed with exception', async () => {
    // stub
    sinon.stub(StudentsService, 'getAll').throws('Test exception');

    // call
    let res = await chai.request(TestConstants.WebServer).get(`${StudentsConstants.StudentsApiPath}`);
    sinon.restore();
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(500);
    chai.expect(res.body.error).to.include('Test exception');
  }).timeout(10000);
});
