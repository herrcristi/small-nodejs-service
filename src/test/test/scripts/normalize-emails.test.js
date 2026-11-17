const sinon = require('sinon');
const chai = require('chai');

const NormalizeEmails = require('../../../scripts/normalize-emails.js');

/**
 * a small in-memory database: the operations the migration uses
 */
const getDb = (data) => {
  const get = (doc, path) => path.split('.').reduce((value, key) => value?.[key], doc);
  const set = (doc, path, value) => {
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((value, key) => value[key], doc)[last] = value;
  };
  const matches = (doc, filter) => Object.keys(filter).every((path) => get(doc, path) === filter[path]);
  const update = (docs, filter, change, many) => {
    let modifiedCount = 0;
    for (const doc of docs.filter((item) => matches(item, filter)).slice(0, many ? undefined : 1)) {
      Object.keys(change.$set).forEach((path) => set(doc, path, change.$set[path]));
      modifiedCount++;
    }
    return { modifiedCount };
  };

  return {
    data,
    collection: (name) => ({
      find: () => ({ toArray: async () => (data[name] || []).map((doc) => ({ ...doc })) }),
      updateOne: async (filter, change) => update(data[name], filter, change, false),
      updateMany: async (filter, change) => update(data[name], filter, change, true),
    }),
    listCollections: () => ({ toArray: async () => Object.keys(data).map((name) => ({ name })) }),
  };
};

describe('Script normalize emails', function () {
  const data = () => ({
    users: [
      { id: 'u1', email: 'John.Doe@TestDomain.test' },
      { id: 'u2', email: 'jane@testdomain.test' },
      { id: 'u3', email: 'Ann@testdomain.test' }, // two accounts for one mailbox
      { id: 'u4', email: 'ann@testdomain.test' },
    ],
    'users-auth': [{ id: 'John.Doe@TestDomain.test' }, { id: 'jane@testdomain.test' }],
    'admins_school-a': [{ id: 'u1', user: { id: 'u1', email: 'John.Doe@TestDomain.test' } }],
    'students_school-a': [{ id: 'u2', user: { id: 'u2', email: 'jane@testdomain.test' } }],
    'classes_school-a': [{ id: 'c1', name: 'John.Doe@TestDomain.test' }],
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should plan the changes and report the duplicates', async () => {
    const plan = await NormalizeEmails.plan(getDb(data()));

    chai
      .expect(plan.users.changes)
      .to.deep.equal([{ key: 'u1', from: 'John.Doe@TestDomain.test', to: 'john.doe@testdomain.test' }]);
    chai.expect(plan.users.duplicates).to.deep.equal([['Ann@testdomain.test', 'ann@testdomain.test']]);
    chai
      .expect(plan.auth.changes)
      .to.deep.equal([
        { key: 'John.Doe@TestDomain.test', from: 'John.Doe@TestDomain.test', to: 'john.doe@testdomain.test' },
      ]);
    chai.expect(plan.auth.duplicates).to.deep.equal([]);
  });

  it('should apply the changes to the users, the logins and the copies in the schools', async () => {
    const db = getDb(data());
    const plan = await NormalizeEmails.plan(db);

    const counts = await NormalizeEmails.apply(db, plan);

    chai.expect(counts).to.deep.equal({ users: 1, auth: 1, copies: 1 });
    chai.expect(db.data.users.map((user) => user.email)).to.deep.equal([
      'john.doe@testdomain.test',
      'jane@testdomain.test',
      'Ann@testdomain.test', // duplicates are not changed
      'ann@testdomain.test',
    ]);
    chai.expect(db.data['users-auth'][0].id).to.equal('john.doe@testdomain.test');
    chai.expect(db.data['admins_school-a'][0].user.email).to.equal('john.doe@testdomain.test');
    chai.expect(db.data['classes_school-a'][0].name).to.equal('John.Doe@TestDomain.test'); // not a copy of a user
  });

  it('should print the plan', async () => {
    const lines = [];
    NormalizeEmails.print(await NormalizeEmails.plan(getDb(data())), (line) => lines.push(line));

    chai.expect(lines.join('\n')).to.include('John.Doe@TestDomain.test -> john.doe@testdomain.test');
    chai.expect(lines.join('\n')).to.include('DUPLICATE (not changed): Ann@testdomain.test, ann@testdomain.test');
  });

  it('should run as a dry run unless --apply is given', async () => {
    sinon.stub(console, 'log');
    let db;
    class MongoClient {
      async connect() {}
      db() {
        return db;
      }
      async close() {}
    }

    // dry run: nothing changed, exit code 1 (duplicates)
    db = getDb(data());
    let code = await NormalizeEmails.run(['node', 'normalize-emails.js'], MongoClient);
    chai.expect(code).to.equal(1);
    chai.expect(db.data.users[0].email).to.equal('John.Doe@TestDomain.test');

    // apply, without duplicates: exit code 0
    db = getDb({ ...data(), users: data().users.slice(0, 2) });
    code = await NormalizeEmails.run(['node', 'normalize-emails.js', '--apply'], MongoClient);
    chai.expect(code).to.equal(0);
    chai.expect(db.data.users[0].email).to.equal('john.doe@testdomain.test');
  });
});
