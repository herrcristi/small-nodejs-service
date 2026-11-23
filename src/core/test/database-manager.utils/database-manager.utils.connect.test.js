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

    // the limits of the application are not kept for the next tests
    DatabaseManagerUtils.init({});
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

    // check: the default limits (16 connections per member, a wait of 30 s for a free one, a call of 30 s at most)
    const options = mongoStub.firstCall.args[1];
    chai.expect(options.maxPoolSize).to.equal(16);
    chai.expect(options.waitQueueTimeoutMS).to.equal(30000);
    chai.expect(DatabaseManagerUtils.getTimeLimit()).to.deep.equal({ maxTimeMS: 30000 });

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
   * the limits of the application (its settings): the connections per member, the wait for a free one and the time of
   * a database call, in seconds; a missing or a wrong value is the default
   */
  it('should connect with the limits of the application', async () => {
    // stub
    sinon.stub(process, 'exit');
    const conn = { command: sinon.stub() };
    const client = {
      on: sinon.stub(),
      once: sinon.stub(),
      topology: { on: sinon.stub() },
      db: sinon.stub().returns(conn),
    };
    const mongoStub = sinon.stub(MongoDB.MongoClient, 'connect').returns(client);

    // call: the limits of the application
    DatabaseManagerUtils.init({ maxPoolSize: '8', waitQueueTimeout: '60', queryTimeout: '10' });
    await DatabaseManagerUtils.connect('mongodb://localhost:27017/p1', 'DBP1', _ctx);

    // check
    let options = mongoStub.firstCall.args[1];
    chai.expect(options.maxPoolSize).to.equal(8);
    chai.expect(options.waitQueueTimeoutMS).to.equal(60000);
    chai.expect(options.readPreference).to.equal('secondaryPreferred');
    chai.expect(DatabaseManagerUtils.getTimeLimit()).to.deep.equal({ maxTimeMS: 10000 });

    // case: wrong values, the defaults
    DatabaseManagerUtils.init({ maxPoolSize: '0', waitQueueTimeout: 'thirty', queryTimeout: '-5' });
    await DatabaseManagerUtils.connect('mongodb://localhost:27017/p2', 'DBP2', _ctx);
    options = mongoStub.secondCall.args[1];
    chai.expect(options.maxPoolSize).to.equal(DatabaseManagerUtils.Constants.MaxPoolSize);
    chai.expect(options.waitQueueTimeoutMS).to.equal(DatabaseManagerUtils.Constants.WaitQueueTimeout * 1000);
    chai.expect(DatabaseManagerUtils.getTimeLimit()).to.deep.equal({ maxTimeMS: 30000 });

    // case: some of them (1.5 is not a whole number: the default)
    DatabaseManagerUtils.init({ maxPoolSize: '1.5', waitQueueTimeout: '45' });
    await DatabaseManagerUtils.connect('mongodb://localhost:27017/p3', 'DBP3', _ctx);
    options = mongoStub.thirdCall.args[1];
    chai.expect(options.maxPoolSize).to.equal(16);
    chai.expect(options.waitQueueTimeoutMS).to.equal(45000);
    chai.expect(DatabaseManagerUtils.getTimeLimit()).to.deep.equal({ maxTimeMS: 30000 });

    // case: none given (the defaults)
    DatabaseManagerUtils.init();
    chai.expect(DatabaseManagerUtils.getTimeLimit()).to.deep.equal({ maxTimeMS: 30000 });
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
