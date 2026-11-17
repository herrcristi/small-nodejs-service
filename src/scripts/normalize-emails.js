/**
 * Migration: normalize the stored emails (NFKC, trimmed, lower case), as the email rule does for new values
 *
 * one mailbox is one account: the logins and the lookups use the normalized email, so an account stored with
 * another case would not be found anymore
 *
 * what is changed:
 *  - users: email
 *  - users-auth: id (the email, the login)
 *  - the copies of the user in the schools: user.email in admins_*, students_*, professors_*
 * emails that differ only by the case (two accounts for one mailbox) are reported and NOT changed:
 * merge or remove one of them, then run this again
 *
 * run (settings from the environment, like the service):
 *   cd src && node scripts/normalize-emails.js           # dry run: prints what would change
 *   cd src && node scripts/normalize-emails.js --apply   # changes the data
 * exit code 1 when duplicates were found
 */
const ValidationUtils = require('../core/utils/validation.utils.js');

const Public = {
  /**
   * the changes of one collection: { changes: [ { key, from, to } ], duplicates: [ [emails] ] }
   * docs: [ { key, email } ]
   */
  planCollection: (docs) => {
    const groups = new Map();
    for (const doc of docs) {
      const normalized = ValidationUtils.normalizeEmail(doc.email);
      groups.set(normalized, [...(groups.get(normalized) || []), doc]);
    }

    const changes = [];
    const duplicates = [];
    for (const [normalized, group] of groups) {
      if (group.length > 1) {
        duplicates.push(group.map((doc) => doc.email));
        continue;
      }
      if (group[0].email !== normalized) {
        changes.push({ key: group[0].key, from: group[0].email, to: normalized });
      }
    }
    return { changes, duplicates };
  },

  /**
   * the plan for the database: { users, auth } (each { changes, duplicates })
   */
  plan: async (db) => {
    const users = await db
      .collection('users')
      .find({}, { projection: { _id: 0, id: 1, email: 1 } })
      .toArray();
    const auth = await db
      .collection('users-auth')
      .find({}, { projection: { _id: 0, id: 1 } })
      .toArray();

    return {
      users: Public.planCollection(users.map((user) => ({ key: user.id, email: user.email }))),
      auth: Public.planCollection(auth.map((item) => ({ key: item.id, email: item.id }))),
    };
  },

  /**
   * apply a plan
   * returns the number of changed documents { users, auth, copies }
   */
  apply: async (db, plan) => {
    const counts = { users: 0, auth: 0, copies: 0 };

    // the collections of the schools with a copy of the user
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const copies = collections.map((item) => item.name).filter((name) => /^(admins|students|professors)_/.test(name));

    for (const change of plan.users.changes) {
      const r = await db.collection('users').updateOne({ id: change.key }, { $set: { email: change.to } });
      counts.users += r.modifiedCount;

      for (const name of copies) {
        const rc = await db
          .collection(name)
          .updateMany({ 'user.id': change.key }, { $set: { 'user.email': change.to } });
        counts.copies += rc.modifiedCount;
      }
    }

    for (const change of plan.auth.changes) {
      const r = await db.collection('users-auth').updateOne({ id: change.from }, { $set: { id: change.to } });
      counts.auth += r.modifiedCount;
    }

    return counts;
  },

  /**
   * print a plan
   */
  print: (plan, log = console.log) => {
    for (const [name, part] of [
      ['users (email)', plan.users],
      ['users-auth (id)', plan.auth],
    ]) {
      log(`\n${name}: ${part.changes.length} to normalize, ${part.duplicates.length} duplicates`);
      part.changes.forEach((change) => log(`  ${change.from} -> ${change.to}`));
      part.duplicates.forEach((emails) => log(`  DUPLICATE (not changed): ${emails.join(', ')}`));
    }
  },

  /**
   * run from the command line
   */
  run: async (argv, MongoClient) => {
    const client = new MongoClient(process.env.SMALL_API_DATABASE_URL);
    try {
      await client.connect();
      const db = client.db(process.env.SMALL_API_DATABASE_DB);

      const plan = await Public.plan(db);
      Public.print(plan);

      if (argv.includes('--apply')) {
        const counts = await Public.apply(db, plan);
        console.log(`\nChanged: ${counts.users} users, ${counts.auth} logins, ${counts.copies} copies in the schools`);
      } else {
        console.log('\nDry run: nothing was changed (add --apply to change the data)');
      }

      return plan.users.duplicates.length || plan.auth.duplicates.length ? 1 : 0;
    } finally {
      await client.close();
    }
  },
};

/* istanbul ignore next: the command line entry */
if (require.main === module) {
  Public.run(process.argv, require('mongodb').MongoClient).then(
    (code) => process.exit(code),
    (e) => {
      console.error(e);
      process.exit(2);
    }
  );
}

module.exports = { ...Public };
