const mocha = require('mocha');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const MongoDB = require('mongodb');

const DbOpsUtils = require('../../utils/db-ops.utils.js');
const DatabaseManagerUtils = require('../../utils/database-manager.utils.js');

describe('Database Manager Utils', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * addIndexes success
   */
  it('should addIndexes with success', async () => {
    let dbName = 'DBS1';
    let collName = 'coll1';

    // call
    let res = await DatabaseManagerUtils.addIndexes(dbName, collName, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(true);

    // call again
    res = await DatabaseManagerUtils.addIndexes(dbName, collName, _ctx);
    console.log(`\nTest again returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res).to.equal(false);
  }).timeout(10000);

  /**
   * addIndexes no db
   */
  it('should addIndexes failed due to no db', async () => {
    let dbName = null;
    let collName = 'coll1';

    // call
    let res = await DatabaseManagerUtils.addIndexes(dbName, collName, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(null);
  }).timeout(10000);
});
