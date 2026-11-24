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
   * buildFilterFromReq test equal
   */
  it('should buildFilterFromReq test equal', async () => {
    let req = {
      query: querystring.parse('?name=John&status!=active'),
    };

    let schema = {
      filter: ['name', 'status'],
    };

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        filter: {
          $and: [
            {
              name: 'John',
            },
            {
              status: { $ne: 'active' },
            },
          ],
        },
        projection: {
          _id: 0,
        },
        limit: 10000,
        skip: 0,
        sort: undefined,
      },
    });
  }).timeout(10000);

  /**
   * buildFilterFromReq test exists
   */
  it('should buildFilterFromReq test exists', async () => {
    let req = {
      query: querystring.parse('?name&!status'),
    };

    let schema = {
      filter: ['name', 'status'],
      sort: { name: 1 },
    };

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        filter: {
          $and: [
            {
              status: { $exists: false },
            },
            {
              name: { $exists: true },
            },
          ],
        },
        projection: {
          _id: 0,
        },
        limit: 10000,
        skip: 0,
        sort: {
          name: 1,
        },
      },
    });
  }).timeout(10000);

  /**
   * buildFilterFromReq test regexp
   */
  it('should buildFilterFromReq test regexp', async () => {
    let req = {
      query: querystring.parse('?name=/john/i&status!=/active/i'),
    };

    let schema = {
      filter: ['name', 'status'],
    };

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        filter: {
          $and: [
            {
              name: /john/i,
            },
            {
              status: { $not: /active/i },
            },
          ],
        },
        projection: {
          _id: 0,
        },
        limit: 10000,
        skip: 0,
        sort: undefined,
      },
    });
  }).timeout(10000);

  /**
   * buildFilterFromReq test numbers
   */
  it('should buildFilterFromReq test numbers', async () => {
    let req = {
      query: querystring.parse('?count=1&value>10&value<=20'),
    };

    let schema = {
      filter: ['count', 'value'],
    };

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        filter: {
          $and: [
            {
              count: 1,
            },
            {
              value: { $gt: 10, $lte: 20 },
            },
          ],
        },
        projection: {
          _id: 0,
        },
        limit: 10000,
        skip: 0,
        sort: undefined,
      },
    });
  }).timeout(10000);

  /**
   * buildFilterFromReq test multiple keys
   */
  it('should buildFilterFromReq test multiple keys', async () => {
    let req = {
      query: querystring.parse('?id,name,_lang_en.id=/a1/i'),
    };

    let schema = {
      filter: ['id', 'name'],
    };

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        filter: {
          $and: [
            {
              $or: [
                {
                  id: /a1/i,
                },
                {
                  name: /a1/i,
                },
                {
                  '_lang_en.id': /a1/i,
                },
              ],
            },
          ],
        },
        projection: {
          _id: 0,
        },
        limit: 10000,
        skip: 0,
        sort: undefined,
      },
    });
  }).timeout(10000);

  /**
   * buildFilterFromReq test multiple values
   */
  it('should buildFilterFromReq test multiple values', async () => {
    let req = {
      query: querystring.parse('?g.id=a1,2,3,4'),
    };

    let schema = {
      filter: ['g.id'],
    };

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        filter: {
          $and: [
            {
              'g.id': { $in: ['a1', 2, 3, 4] },
            },
          ],
        },
        projection: {
          _id: 0,
        },
        limit: 10000,
        skip: 0,
        sort: undefined,
      },
    });
  }).timeout(10000);

  /**
   * buildFilterFromReq test empty
   */
  it('should buildFilterFromReq test empty', async () => {
    let req = {
      query: querystring.parse(''),
    };

    let schema = {
      filter: ['name', 'status'],
    };

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        filter: {
          id: { $exists: true },
        },
        projection: {
          _id: 0,
        },
        limit: 10000,
        skip: 0,
        sort: undefined,
      },
    });
  }).timeout(10000);

  /**
   * buildFilterFromReq test limit, skip, sort, projection
   */
  it('should buildFilterFromReq test limit, skip, sort, projection', async () => {
    let req = {
      query: querystring.parse('?name=John&limit=1000000&skip=1&sort=name,-date&projection=id,name,type,status'),
    };

    let schema = {
      filter: ['name', 'status'],
    };

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        filter: {
          $and: [
            {
              name: 'John',
            },
          ],
        },
        sort: {
          name: 1,
          date: -1,
        },
        skip: 1,
        limit: 10000,
        projection: {
          _id: 0,
          id: 1,
          name: 1,
          type: 1,
          status: 1,
        },
      },
    });
  }).timeout(10000);

  /**
   * buildFilterFromReq fail req
   */
  it('should buildFilterFromReq fail req', async () => {
    let req = null;
    let schema = {};

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error.message).to.include('Cannot read properties of null');
  }).timeout(10000);

  /**
   * buildFilterFromReq test fail validate
   */
  it('should buildFilterFromReq test fail validate', async () => {
    let req = {
      query: querystring.parse('?unknown=John'),
    };

    let schema = {
      filter: ['name', 'status'],
    };

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 400,
      error: {
        message: 'Failed to validate schema. Error: "$and[0].unknown" is not allowed',
        error: new Error('Failed to validate schema. Error: "$and[0].unknown" is not allowed'),
      },
    });
  }).timeout(10000);

  /**
   * buildFilterFromReq test no config
   */
  it('should buildFilterFromReq test no config', async () => {
    let req = {
      query: querystring.parse('?name=John'),
    };

    let schema = undefined;

    // call
    let res = await RestApiUtils.buildFilterFromReq(req, schema, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.deep.equal({
      status: 200,
      value: {
        filter: {
          $and: [
            {
              name: 'John',
            },
          ],
        },
        projection: {
          _id: 0,
        },
        limit: 10000,
        skip: 0,
        sort: undefined,
      },
    });
  }).timeout(10000);

  /**
   * the limit: -1 (the "All" of the UI), 0 or none give the most (MaxLimit), a larger one is capped; a negative skip,
   * a negative limit or a value that is not a whole number are refused (MongoDB would answer one object, or an error)
   */
  it('should buildFilterFromReq take -1 as all and refuse a wrong limit or skip', async () => {
    const schema = { filter: ['name', 'status'] };
    const build = (query) => RestApiUtils.buildFilterFromReq({ query: querystring.parse(query) }, schema, _ctx);

    // call: all, nothing, a page, too many
    const limits = [];
    for (const query of ['?limit=-1', '?limit=0', '?name=John', '?limit=5', '?limit=20000']) {
      const res = await build(query);
      limits.push(res.value.limit);
    }

    // check: the most for all, the page, the cap
    chai.expect(limits).to.deep.equal([10000, 10000, 10000, 5, 10000]);

    // case: the values that are refused
    for (const query of ['?limit=-5', '?limit=abc', '?limit=2.5', '?skip=-5', '?skip=1.5']) {
      const res = await build(query);
      chai.expect(res.status, query).to.equal(400);
    }
  }).timeout(10000);

  /**
   * the value of a filter field: a text, a number, a regular expression (a search, also with escaped characters and
   * diacritics) or an object of the allowed operators; another operator ($where) is refused
   */
  it('should buildFilterFromReq refuse an operator that is not allowed in a field', async () => {
    const schema = { filter: ['name', 'status'] };
    const build = (query) => RestApiUtils.buildFilterFromReq({ query: querystring.parse(query) }, schema, _ctx);

    // call: the allowed ones (a list, not equal, a number, a search with escaped characters and with diacritics)
    // (the values are encoded as the UI sends them: a + in a query is a space)
    const cpp = `?name=${encodeURIComponent('/c\\+\\+/i')}`;
    const school = `?name=${encodeURIComponent('/[sșşSȘŞ]coala/i')}`;
    for (const query of ['?name=a,b', '?name!=x', '?status>1', cpp, school]) {
      const res = await build(query);

      // check: accepted
      chai.expect(res.status, query).to.equal(200);
    }

    // case: an operator that is not allowed, inside a field that is allowed
    const res = await build('?filter={"name":{"$where":"1"}}');
    chai.expect(res.status).to.equal(400);
    chai.expect(res.error.message).to.include('"$and[0].name"');

    // case: the search of the UI, as a regular expression
    const search = await build(cpp);
    chai.expect(search.value.filter.$and[0].name.test('C++ Programming')).to.equal(true);
  }).timeout(10000);

  /**
   * a translated field is searched in the language of the request (x-lang, the language shown by the UI): the text the
   * server translated in it (_lang_ro.user.status), the other languages are refused
   */
  it('should buildFilterFromReq search a translated field in the language of the request', async () => {
    const roCtx = { ..._ctx, lang: 'ro' };
    const schema = { filter: ['user.name', 'user.status'] };

    // call: the status shown in Romanian
    const req = { query: querystring.parse('?user.name,_lang_ro.user.status=/activ/i') };
    const res = await RestApiUtils.buildFilterFromReq(req, schema, roCtx);

    // check
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value.filter).to.deep.equal({
      $and: [{ $or: [{ 'user.name': /activ/i }, { '_lang_ro.user.status': /activ/i }] }],
    });

    // case: another language than the one of the request
    const reqOther = { query: querystring.parse('?_lang_en.user.status=/active/i') };
    const resOther = await RestApiUtils.buildFilterFromReq(reqOther, schema, roCtx);
    chai.expect(resOther.status).to.equal(400);
  }).timeout(10000);
});
