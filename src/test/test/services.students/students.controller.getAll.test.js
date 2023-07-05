const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const StudentsConstants = require('../../../services/students/students.constants.js');

describe('Students', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  afterEach(async function () {});

  /**
   * get all with success
   */
  it('should get all with success', async () => {
    // call
    let res = await chai.request(TestConstants.WebServer).get(`${StudentsConstants.StudentsApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res?.body, null, 2)}\n`);

    // check
    chai.expect(res.status).to.equal(200);
  }).timeout(10000);
});
