const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');

// due to 'require() of ES modules is not supported'
let querystring = null;
const loadEsOnlyModules = async () => {
  querystring = (await import('query-string')).default;
};

const RestApiUtils = require('../../utils/rest-api.utils.js');

describe('Rest Messages Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  before(async function () {
    await loadEsOnlyModules();
  });

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * buildMongoFilterFromReq test equal
   */
  it('should buildMongoFilterFromReq test equal', async () => {
    let req = {
      query: querystring.parse('?name=John&status!=active'),
    };

    let schema = {};

    // call
    let res = await RestApiUtils.buildMongoFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      filter: {
        name: 'John',
        status: { $ne: 'active' },
      },
    });
  }).timeout(10000);

  /**
   * buildMongoFilterFromReq test exists
   */
  it('should buildMongoFilterFromReq test exists', async () => {
    let req = {
      query: querystring.parse('?name&!status'),
    };

    let schema = {};

    // call
    let res = await RestApiUtils.buildMongoFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      filter: {
        status: { $exists: false },
        name: { $exists: true },
      },
    });
  }).timeout(10000);

  /**
   * buildMongoFilterFromReq test regexp
   */
  it('should buildMongoFilterFromReq test regexp', async () => {
    let req = {
      query: querystring.parse('?name=/john/i&status!=/active/i'),
    };

    let schema = {};

    // call
    let res = await RestApiUtils.buildMongoFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      filter: {
        name: /john/i,
        status: {
          $not: /active/i,
        },
      },
    });
  }).timeout(10000);

  /**
   * buildMongoFilterFromReq test numbers
   */
  it('should buildMongoFilterFromReq test numbers', async () => {
    let req = {
      query: querystring.parse('?count=1&value>10&value<=20'),
    };

    let schema = {};

    // call
    let res = await RestApiUtils.buildMongoFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      filter: {
        count: 1,
        value: { $gt: 10, $lte: 20 },
      },
    });
  }).timeout(10000);

  /**
   * buildMongoFilterFromReq test multiple values
   */
  it('should buildMongoFilterFromReq test multiple values', async () => {
    let req = {
      query: querystring.parse('?g.id=a1,2,3,4'),
    };

    let schema = {};

    // call
    let res = await RestApiUtils.buildMongoFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      filter: {
        'g.id': {
          $in: ['a1', 2, 3, 4],
        },
      },
    });
  }).timeout(10000);

  /**
   * buildMongoFilterFromReq test empty
   */
  it('should buildMongoFilterFromReq test empty', async () => {
    let req = {
      query: querystring.parse(''),
    };

    let schema = {};

    // call
    let res = await RestApiUtils.buildMongoFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      filter: {},
    });
  }).timeout(10000);

  /**
   * buildMongoFilterFromReq test limit, skip, sort
   */
  it('should buildMongoFilterFromReq test limit, skip, sort', async () => {
    let req = {
      query: querystring.parse('?name=John&limit=1&skip=1&sort=name,-date'),
    };

    let schema = {};

    // call
    let res = await RestApiUtils.buildMongoFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      filter: {
        name: 'John',
      },
      sort: {
        name: 1,
        date: -1,
      },
      skip: 1,
      limit: 1,
    });
  }).timeout(10000);

  /**
   * buildMongoFilterFromReq fail
   */
  it('should buildMongoFilterFromReq fail', async () => {
    let req = null;
    let schema = {};

    // call
    let res = await RestApiUtils.buildMongoFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error.message).to.include('Cannot read properties of null');
  }).timeout(10000);

  /**
   * buildMongoFilterFromReq fail exception
   */
  it('should buildMongoFilterFromReq fail exception', async () => {
    let req = {};
    let schema = {};

    // stub
    sinon.stub(JSON, 'stringify').callsFake(() => {
      throw 'Test String exception';
    });

    // call
    let res = await RestApiUtils.buildMongoFilterFromReq(req, schema, _ctx);
    sinon.restore();
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error.message).to.include('Failed to validate query');
  }).timeout(10000);
});
