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
   * connect success
   */
  it('should connect with success', async () => {
    let mongoUrl = 'mongodb://localhost:27017/s1';
    let dbName = 'DBS1';

    // stub
    const processStub = sinon.stub(process, 'exit');

    const eventStub = sinon.stub().callsFake((event, callback) => {
      console.log(`\nListen Event: ${JSON.stringify(event, null, 2)}`);

      callback('test');
    });

    const conn = {
      command: sinon.stub(),
    };

    const db = {
      on: eventStub,
      once: eventStub,
      topology: { on: eventStub },
      db: sinon.stub().callsFake((name) => {
        console.log(`\nDB: ${JSON.stringify(name, null, 2)}\n`);
        chai.expect(name).to.equal(dbName);

        return conn;
      }),
      close: sinon.stub().callsFake(() => {
        console.log(`\nDb Close called`);
      }),
    };

    // stub
    let mongoStub = sinon.stub(MongoDB.MongoClient, 'connect').returns(db);

    // call
    let res = await DatabaseManagerUtils.connect(mongoUrl, dbName, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(conn);
    chai.expect(mongoStub.callCount).to.equal(1);
    chai.expect(db.db.callCount).to.equal(2);
    chai.expect(eventStub.callCount).to.equal(5);
    chai.expect(processStub.callCount).to.equal(1);
    chai.expect(conn.command.callCount).to.equal(1);

    // call again, served from cache
    res = await DatabaseManagerUtils.connect(mongoUrl, dbName, _ctx);
    console.log(`\nTest again returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(conn);
    chai.expect(mongoStub.callCount).to.equal(1);
    chai.expect(db.db.callCount).to.equal(3);
    chai.expect(eventStub.callCount).to.equal(5);
    chai.expect(processStub.callCount).to.equal(1);
    chai.expect(conn.command.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * connect failed
   */
  it('should connect failed', async () => {
    let mongoUrl = 'mongodb://localhost:27017/f1';
    let dbName = 'DBF1';

    // stub
    let mongoStub = sinon.stub(MongoDB.MongoClient, 'connect').returns(null);
    let processStub = sinon.stub(process, 'exit');

    // call
    let res = await DatabaseManagerUtils.connect(mongoUrl, dbName, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res).to.equal(undefined);
    chai.expect(mongoStub.callCount).to.equal(1);
    chai.expect(processStub.callCount).to.equal(1);
  }).timeout(10000);
});
