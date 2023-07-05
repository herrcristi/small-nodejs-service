const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../../test-constants.js');
const WebConstants = require('../../../../web-server/web-server.constants.js');

describe('Tests', function () {
  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  afterEach(async function () {});

  /**
   * test
   */
  it('should get all students with success', async () => {
    let res = await chai.request(TestConstants.WebServer).get(`${WebConstants.StudentsApiPath}`);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    chai.expect(res.status).to.equal(200);
  }).timeout(10000);
});
