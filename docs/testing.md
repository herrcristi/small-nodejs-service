# Testing

How to test the project: the kinds of tests, how to run them, how they are organised, how to write them, and what a change must cover. For the design see [design.md](design.md).

## Contents

- [Kinds of tests](#kinds-of-tests)
- [Running the tests](#running-the-tests)
- [How the tests are organised](#how-the-tests-are-organised)
- [Writing a test](#writing-a-test)
- [What a change must cover](#what-a-change-must-cover)
- [Functional tests with MongoDB](#functional-tests-with-mongodb)
- [Testing the UI](#testing-the-ui)
- [Trying the API by hand](#trying-the-api-by-hand)
- [Placeholders](#placeholders)

## Kinds of tests

| Kind                       | What it checks                                                                                                                | Needs a database | Command                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------- |
| **Unit and request tests** | Services, controllers (through the real web server with `supertest`), REST wrappers, the shared utilities, and the web server | No               | `cd src && npm test`                                  |
| **Functional tests**       | Whole operations against a real MongoDB: creation, changes, the copies kept by notifications, and removal                     | Yes              | `cd src && npm run testdb`                            |
| **UI build**               | That the Vue application compiles                                                                                             | No               | `cd ui && npm run build`                              |
| **By hand**                | The running API and UI                                                                                                        | Yes              | see [Trying the API by hand](#trying-the-api-by-hand) |

The unit and request tests stub their dependencies with Sinon, so they run anywhere and take a few seconds. The suite is kept above 99% coverage of the application code, and a change comes with its tests.

## Running the tests

```sh
cd src
npm test                      # the whole unit suite, with a coverage table
```

Run a single file or suite while you work:

```sh
cd src
npx mocha --require test/hooks.js --timeout 15000 --exit test/test/schools/schools.service.getAll.test.js
```

Notes:

- Run the suite **without `SMALL_API_PORTAL_ADMIN_EMAIL` exported** in your shell. The tests set up their own environment; an exported value for the first portal admin is not wanted there. If it is set, run `env -u SMALL_API_PORTAL_ADMIN_EMAIL npm test`.
- `npm test` prints the coverage table at the end. A new file at less than full coverage should have a reason.
- Add `.only` to a test while debugging, and remove it before committing.

## How the tests are organised

```text
src/
  core/test/<util>/            tests of the shared utilities (database operations, references, notifications, web server, ...)
  test/
    tests.js                   loads every suite, in order
    hooks.js                   global setup: environment, stubs for the database connection and the mailer
    test-constants.js          fixtures (users, schools, tokens, ...)
    tests.utils.js             helpers
    test/<service>/            one folder per service
      <service>.all.tests.js   registers the suite of the service
      <service>.controller.all.test.js   routes through the real web server
      <service>.rest.test.js             the REST wrapper
      <service>.service.*.test.js        one file per operation (getAll, post, put, patch, delete, notification, ...)
      <service>.service.schema.test.js   the Joi validators
    test/functional/           the tests against a real MongoDB
```

- `tests.js` requires each service's `*.all.tests.js`, and each of those requires its test files. A new test file must be registered in the `*.all.tests.js` of its folder, or it will not run.
- `hooks.js` runs once before everything. Unless the functional tests are on, it replaces the database connection and the mail transport with stubs, so no test needs a database or a mail server.
- Fixtures are in `test-constants.js`. Clone them (`_.cloneDeep`) before changing them.

## Writing a test

The shape of a service test, to copy:

```js
describe('Schools Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Schools' };

  afterEach(async function () {
    sinon.restore(); // always, so stubs never leak into the next test
  });

  /**
   * getOne with success
   */
  it('should getOne with success', async () => {
    const testSchool = _.cloneDeep(TestConstants.Schools[0]);

    // stub what the service depends on
    const stubBase = sinon.stub(DbOpsUtils, 'getOne').callsFake(() => ({ status: 200, value: { ...testSchool } }));

    // call
    const res = await SchoolsService.getOne(testSchool.id, null, _ctx);

    // check the result and that the dependency was used as expected
    chai.expect(stubBase.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({ status: 200, value: testSchool });
  }).timeout(10000);
});
```

- **Stub the layer below**, not the thing under test: a service test stubs `DbOpsUtils` and the `*Rest` wrappers; a controller test stubs the service and goes through the real web server with `supertest`; a REST wrapper test stubs the communication layer.
- **Check calls, not only results**: how many times a dependency was called, and with what.
- **One behaviour per test**, named `should <do something> [with success | fail ...]`.
- **Controller tests** replace the authentication call so the request reaches the controller, then assert the status and the body. See any `*.controller.all.test.js`.

## What a change must cover

| Change                                             | Add tests for                                                                                                                                                                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any operation                                      | Success; invalid input (the Joi validator); a failing dependency (the error is passed on and nothing is left half done); the status codes                                                                                     |
| A route                                            | The controller (success, error result, exception), the REST wrapper, **and the role check**: a role that is allowed gets through, one that is not is refused. Auth behaviour belongs in `users-auth.service.validate.test.js` |
| A write                                            | That the event and the notification are raised, with the right payload                                                                                                                                                        |
| A relationship or notification                     | `added`, `modified`, and `removed`, at each level of copy, and delivering the same notification twice                                                                                                                         |
| A multi-step operation                             | Each step failing in turn, and the undo of the earlier steps                                                                                                                                                                  |
| A rule or invariant (a status, a role restriction) | The rule holding, and the case that must be refused                                                                                                                                                                           |
| Start-up                                           | A repeated start, and a wrong configuration                                                                                                                                                                                   |
| A shared utility                                   | Its own folder in `src/core/test/`, including the error branches                                                                                                                                                              |

## Functional tests with MongoDB

The functional tests run the real services against a real database.

1. Start MongoDB: `cd src && npm run up` (uses `tools/local/docker-compose.yaml`; set `MONGODB_ROOT_USERNAME` and `MONGODB_ROOT_PASSWORD` in your environment first; the data is kept in a Docker volume, or in the folder named by `MONGODB_DATA_DIR` if you set it).
2. Point the tests at a **dedicated test database**: they create and delete data. The database URL and name come from the test constants.
3. `cd src && npm run testdb`.

Never run them against a database that holds data you need.

## Testing the UI

- `cd ui && npm run build` must pass for every UI change.
- Try the changed screens by hand against a local API: log in, choose a school, and go through the flow you changed with each role that can reach it.
- Check the screen as a role that must **not** have access: the menu entry should be hidden and the route should not open (the API refuses anyway).

## Trying the API by hand

The detailed README has the login and the request examples with `curl`: [Authentication](../README.details.md#authentication) and [Services and examples](../README.details.md#services-and-examples). A useful routine after a change:

1. Log in as a user of the school and keep the cookie.
2. Call the route with the right role and the right `x-tenant-id`: it should work.
3. Call it with another role, with another school's id, and without the cookie: it should be refused, and nothing should change.

## Placeholders

These sections will be added.

- **Security testing**: how to attack the API locally, what to try for each route and role, and what to record. _To be added._
- **Adversarial testing**: scenario groups and how to write them. _To be added._
- **Concurrency testing**: how to prove a race with a controlled interleaving. _To be added._
- **Load and sizing tests**: how to measure the cost of an operation and model the capacity. _To be added._
- **Test data**: how to seed a school with people, classes, groups, and a schedule for manual testing. _To be added._
