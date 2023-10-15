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

describe('Rest Api Utils', function () {
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
   * getMetaInfo full
   */
  it('should getMetaInfo full', async () => {
    let count = 20;

    let filter = {
      filter: {},
      projection: { _id: 0 },
      limit: 0,
      skip: 0,
      sort: {},
    };

    // call
    let res = RestApiUtils.getMetaInfo(filter, count, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      meta: {
        count,
        limit: filter.limit,
        skip: filter.skip,
        sort: filter.sort,
      },
    });
  }).timeout(10000);

  /**
   * getMetaInfo partial
   */
  it('should getMetaInfo partial', async () => {
    let count = 20;

    let filter = {
      filter: {},
      projection: { _id: 0 },
      limit: 1,
      skip: 0,
      sort: {},
    };

    // call
    let res = RestApiUtils.getMetaInfo(filter, count, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 206,
      meta: {
        count,
        limit: filter.limit,
        skip: filter.skip,
        sort: filter.sort,
      },
    });
  }).timeout(10000);
});
