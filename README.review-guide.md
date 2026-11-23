# small-nodejs-service: review guide

How to review this project: what each kind of review protects, how to find problems, what evidence to bring, and how to report. It is written so that a person or an automated reviewer can pick it up cold, run a review, and get a result that can be compared with the last one.

Companion file: [README.design-invariants.md](README.design-invariants.md), the promises the design makes, each with its check. Every review ends by re-checking them.

## Contents

- [Principles for every review](#principles-for-every-review)
- [The attack surface of this project](#the-attack-surface-of-this-project)
- [Tools](#tools)
- [Process](#process)
- [Finding format and severity](#finding-format-and-severity)
- [Security review](#security-review)
- [Adversarial review](#adversarial-review)
- [Flow review](#flow-review)
- [Concurrency review](#concurrency-review)
- [Scalability review](#scalability-review)
- [Documentation review](#documentation-review)
- [Regression pass](#regression-pass)

## Principles for every review

1. **Evidence, not opinion.** A finding is CONFIRMED only if it is reproduced (a script, a test, a request and its answer) or is unambiguous from the code with `file:line`. Everything else is SUSPECTED and says what is missing to confirm it.
2. **Read-only.** A review changes nothing in the application. It writes only to its own report and its own scratch folder.
3. **Do not repeat.** Earlier findings are referenced by ID, not rewritten. A review that starts by reading the previous ones finds new things.
4. **Judge against the design, not against taste.** The reference is the promises in [README.design-invariants.md](README.design-invariants.md) and the principles in the [README](README.md). "It could be done differently" is not a finding; "it breaks a promise" is.
5. **Say what held.** Every review lists what it attacked and what survived. That list is as valuable as the findings, because it is what the next review must re-check.
6. **Be honest about the method.** State what the setup cannot show (for example: no real database, no real network, no browser).
7. **Label numbers.** In capacity work every number is MEASURED, derived from the CODE, or ASSUMED.

## The attack surface of this project

Where input and trust cross, and so where reviews should look:

| Surface                              | What is there                                                                          | Main risks                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Public routes (`/api/v1`)            | Every router, listed against `src/services/config.roles.json`                          | Missing or wrong role, route shadowing, missing tenant checks      |
| Internal routes (`/api/internal_v1`) | Service-to-service endpoints                                                           | Reachability from outside, token checks, replay                    |
| Request context                      | Cookie, `x-tenant-id`, and any other header the code reads                             | Spoofing, values used to build queries or patterns                 |
| Auth middleware wiring               | `src/core/web-server/web-server.utils.js` and `users-auth.middleware.js`               | Checked twice, not checked, checked with the wrong route           |
| Query strings and bodies             | `RestApiUtils`, Joi schemas                                                            | Operators, unknown fields, mass assignment, huge values            |
| Lookups built from user input        | The user lookup by email, tenant matching, `isValidRouteForParam`                      | Injection into a query string or a regular expression              |
| Notifications                        | Subscriptions in `config.services.js`, the handlers of each service, `db-ops`          | Wrong or partial changes, ordering, lost updates                   |
| Multi-step operations                | Signup, invite, role changes, account changes and deletion                             | Half-finished state, rollback, retry                               |
| Startup and timers                   | Portal School creation, first-portal-admin bootstrap, environment checks, the cleanups | Repeats, several pods, bad configuration                           |
| Email                                | Templates, token links                                                                 | Wrong recipient, link that cannot be used, injection into the text |
| Browser                              | Stores, router guard, tenant selector, tables, dialogs                                 | Stale data, double submit, client-only checks                      |
| Environment and dependencies         | `src/.env.example`, `npm audit`                                                        | Placeholder secrets, known advisories                              |

## Tools

| Tool                      | What it is                                                                                                                                                             | Use it for                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Unit and request tests    | `cd src && npm test`: the services, the controllers through the real web server, the shared utilities; no database, a coverage table at the end                        | A baseline before and after                                               |
| Functional tests          | `cd src && npm run testdb`: the operations and the flows of the accounts through the API, with a MongoDB (its test database is emptied first)                          | Behaviour that needs a real database: unique indexes, sessions, the flows |
| A request-level harness   | Write one: replace only the MongoDB driver and the mail transport, and run the real express app, middleware, `DbOpsUtils`, services and notifications with `supertest` | Request-level scenarios without a database                                |
| An interleaving simulator | Write one: an in-memory stub where a test controls when a read or a write completes                                                                                    | Proving a race instead of asserting it                                    |
| A micro-benchmark         | CPU per request with a stubbed database, and the hashing throughput                                                                                                    | Cost per operation (not a load test)                                      |

The tests do not depend on the machine: they set their own settings, and the unit tests never connect to a database or a mail server. Keep the scripts of a review in its own folder, outside the application code.

## Process

1. **Prepare.** Read the README files, [README.design-invariants.md](README.design-invariants.md), and the previous reports of the same kind. Run the tests for a baseline.
2. **One reviewer at a time.** Reviews run one after the other, not in parallel, so that usage limits and conflicts do not stop several at once.
3. **Create the report file first**, with a checklist of the areas at the top, and append each finding the moment it is confirmed. A review that is interrupted must be resumable from its checklist.
4. **Keep files where they belong.** The report and the scripts of a review in their own folders. Nothing else in the repository changes.
5. **Reproduce before reporting.** Keep the reproduction next to the finding, with the command to run it and the output.
6. **Finish with the regression pass** (below) and a "checked and held" list.
7. **Merge.** Combine the reports into a summary with a prioritised fix order, and group findings by shared cause.
8. **Record what gets fixed.** When a finding is resolved, keep it with a resolution note (how it was solved, where, which tests prove it), apart from the open ones, so the open list gets shorter.

## Finding format and severity

Every finding has: an **ID** with a prefix per review (`S-` security, `F-` adversarial, `L-` flows, `C-` concurrency, `P-` scalability), a **title**, a **severity**, a **status** (CONFIRMED or SUSPECTED), a **location** (`file:line`), **what happens** (concrete inputs and the result), **why it matters**, and a **suggested fix**. Security findings also name the **attacker** (who they must be). Concurrency findings give the **step-by-step interleaving** and the resulting bad state.

| Severity | Meaning                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Critical | Breaks a core promise for anyone who can reach the system: takeover, cross-tenant data access, leaking another person's token |
| High     | Breaks a promise for a realistic attacker or user, or loses data or access in a normal flow                                   |
| Medium   | Breaks a promise under specific conditions, or leaves wrong data that a later action can repair                               |
| Low      | Hardening, wrong status codes, rough edges with no loss                                                                       |
| Info     | An observation, or something correct that is worth knowing                                                                    |

For scalability, severity is about the capacity and availability question being asked, not about security.

## Security review

**What it protects.** The promises of zero trust: a person acts only inside schools they belong to and with the role the route allows; the portal sees the schools but not inside them; only admins invite; secrets and tokens never reach a person they do not belong to; internal calls are authenticated.

**Areas.**

1. **Authorization.** For every public route: who can call it, with which tenant? Compare each router with `config.roles.json` in both directions (routes missing from the matrix, matrix entries with no route). Look at route order: a specific path (`/users/portal-admins`) must not be handled as a parameter path (`/users/:id`). Look at the rules that grant extra, such as `current-user`, `self` and `deny-not-current-school`. Try every role against every route with the right tenant and with another tenant.
2. **Escalation.** Can a role give itself or someone else a stronger role (invite, role patches, profile updates)? Can a person change fields they should not (status, roles, schools, email)? Does a disabled user, a deleted account or a disabled school still act?
3. **Injection.** Find every place where a request value is put into a query string, a database filter, a regular expression, a path, an email, or HTML. Try operators (`$where`, `$ne`), nested keys, `__proto__`, characters that break the surrounding syntax (`&`, `=`, `%`, `(`), and very long values.
4. **Internal routes.** Can they be reached from outside? How is the service token checked (algorithm, expiry, binding to method and URL, replay)? Can the check that skips internal routes be fooled?
5. **Tokens and cookies.** What does the token prove, how long does it live, can it be revoked, is it the same token as a password reset? Cookie flags, logout, CSRF, CORS, login limits, user enumeration (messages, status codes, timing), reset and invite tokens (entropy, expiry, single use).
6. **Secrets, configuration, errors, logs.** What happens with the placeholder values of `src/.env.example`? What is logged? A log line must not carry a password, a token, an emailed link, or what a person typed in a public form (the email address); code scanners also flag a value read from a name with "password" in it. What do error bodies reveal in production and in debug mode?
7. **Browser.** Rendered HTML, stored data, redirects driven by query parameters, checks that exist only in the UI.
8. **Dependencies.** `npm audit --omit=dev` in `src` and `ui`; are the lockfiles committed?

**How to discover.** Build a table of every route with the roles that may call it and test the whole table, not a sample. Write tests that act as an attacker and stub only the database. For each place where input is interpolated, send the characters that mean something to the next layer. Read every `RegExp(` and every template string that builds a query. Diff what the code does against what the README promises.

## Adversarial review

**What it protects.** Behaviour under wrong, odd, and hostile use: the system should refuse clearly, change nothing when it refuses, and never answer "success" when it did nothing.

**Method.** Run scenarios through the full HTTP stack (a request-level harness, or the functional tests with a database). For each scenario write the expectation first, then record what happened (status and body), and mark it PASS, FAIL, or INCONCLUSIVE. Keep every FAIL as a runnable reproduction.

**Scenario groups to cover.**

1. Roles against routes (every role, every route, both directions).
2. Cross-tenant: admin of one school with another's tenant; a portal admin with a normal tenant; missing, garbage, upper-case, repeated tenant headers; a route without a school called with a school of someone else.
3. The Portal School: invite, grant, remove, disable, delete, rename, through every route (`PUT`, `PATCH`, `DELETE`, role patches).
4. Statuses: disabled and pending schools and users, deleted accounts; who can change a status; whether a refresh or login changes it back.
5. Path tricks: case, trailing and double slashes, encodings, dot segments, HEAD, OPTIONS, parameter values that look like other routes.
6. Query tricks: operators, huge or negative `limit` and `skip`, array and object parameters, projections of sensitive fields.
7. Body tricks: malformed or oversized JSON, wrong types, `null`, extra keys, `__proto__`, missing body.
8. Invites: emails that differ by case, spaces, and Unicode; repeated invites; odd roles; a deleted account invited again.
9. Role removal: yourself, others, non-members, the last role, the last admin; the role given again.
10. Signup: duplicate names, failure at each step, rollback.
11. Activation: the pending to active rule, including when the save fails.
12. Notifications: change a record and check every copy, at every level.
13. Browser-facing sequences at API level: login, tenant selection, the main pages' calls.

**What to look for besides "forbidden works".** Refusals that still change something; success answers when nothing happened; `500` for input mistakes; messages that leak; behaviour that differs between two routes that should agree.

## Flow review

**What it protects.** That each flow does the right thing by design, including when it fails halfway, and that the data left behind is correct.

**Flows to trace end to end, with failure and rollback.**

1. Signup of a school (creation, first invite, rollback, activation, expiry).
2. Invite into a school and into the Portal School (new user, existing user, pending user, deleted account, repeated invite, which email is sent and whether it can be used).
3. Role removal and account deletion: what each service does afterwards (by the setting of the school), what the person still sees, what stays in groups and schedules.
4. Login, session refresh, tenant selection, statuses, a person without any school.
5. Notification propagation: make a table of every declared reference (field, service, projection) and every subscription, and check that each reference has a subscription, a sufficient projection, and a handler for added, modified, and removed, at every level. Make one object of a notification fail: the handler must still do the next objects (and the next schools), notify what changed, and return the failure, because a notification is not delivered again.
6. Startup and timers: first run, repeated runs, wrong configuration, the cleanups of the expired invitations and signups.
7. Browser flows: tenant selector, dashboard, schools page, the people pages, the settings, the profile, dialogs. Look for success messages after a call that did nothing.
8. Onboarding as a person: can a new user, with nothing but the email, get to a working account?
9. Events: every change raises an event that names who did it, also when nobody is logged in (the start, the timers, a public form), and that has a message in every language. An event refused by its own validation is lost without an error: look for refusals in the logs of a full run.

**How to discover.** Trace the real code for each flow and write the trace as a numbered list of calls with the data at each step. Then break each step in turn (make the call fail, make the process stop) and check the state. Ask, for every action in the UI, what actually changed in the database.

## Concurrency review

**What it protects.** Correct data when two things happen at once, when a step fails between two others, and when several server processes run.

**Areas.**

1. **Check, then act.** Every place that reads and then writes on the basis of the read: invites, signups, role removal, activation, bootstrap on several pods. For each, find what makes the second request fail or succeed safely (a unique index, a conditional update) or show that nothing does.
2. **Read, modify, write and lost updates.** Copies read before a write and stored after it; arrays patched in place; counters; the order in which notifications arrive; handlers that fail halfway; whether retries are safe. A guard checked only in the read before a write (a version, a status) and not in the write itself.
3. **Reads after writes.** The reads go to the secondaries, which may not have a write yet. Every read of an object that the same request has just written: it must be the answer of the write, or a read on the primary (after a write that returns no object, and in the notification handlers, which run inside the request).
4. **Several steps without a transaction.** For each multi-step operation, list the steps and, for each point between two steps, the state left if the process stops there, and whether a retry repairs it.
5. **Shared state in one process.** Module-level caches, anything written at request time, `process.env`, the request context, objects passed by reference.
6. **The event loop.** Synchronous work in the request path, unbounded fan-out, loops with `await` over many items, missing timeouts and cancellation. A database call made outside `DbOpsUtils`, or without its time limit (`maxTimeMS`), can hold a connection for ever.
7. **The browser.** Double submits, answers arriving out of order, stores updated while navigation runs.

**How to discover.** Do not assert a race: **prove it** with a controlled interleaving. In a simulator, start two operations, make each wait at the point between its read and its write, release them in the bad order, and show the final state. For failure between steps, make the second step throw and look at what stays. For the event loop, measure how long the loop is blocked while operations run.

## Scalability review

**What it protects.** That the design degrades in a way you can predict and operate: you know the cost of each operation, what breaks first, and what to change.

**Method.**

1. **Cost per operation, from the code.** For login, a list, the session refresh, a write with fan-out, invite, and signup: database round trips, in-process and network hops, hashing, mail, logging, and what runs per request that could be cached.
2. **Measure what can be measured.** CPU per request with a stubbed database, hashing throughput, queueing behaviour (how another request's latency changes while logins run). Label it as a micro-benchmark.
3. **Capacity model.** State the assumptions (users, requests per user per minute, CPU per request, database node capacity). For several shapes of load (a login wave over 1, 10, and 60 minutes; steady traffic; a peak at the start of a lesson) compute cores, pods, database reads and writes per second, and connections. Show the arithmetic.
4. **Where it breaks first**, for each shape, in order. Include limits that are not capacity: rate limits, connection pools, timeouts.
5. **Failure mode.** What the user sees at the timeouts of each layer (browser, proxy, server, database), what retries do, and whether an error is turned into something worse (for example, a database error becoming "log in again").
6. **Improvements to the current design**, ranked by effect and effort, before any redesign.
7. **Alternatives**, judged fairly: say what they improve and what they do not. For queue designs: absorbing spikes, retries, ordering, isolation, against extra writes, polling traffic, delivery guarantees, and a new hot collection.
8. **A recommendation** by operation: which stays synchronous and which is queued, and why.

**Check these every time.** Rate limiter keys and stores; hashing (cost, sync or async, once or twice); the user lookup on every request; connection pool and timeouts; indexes against the real queries; list counts and default page sizes; logging volume; per-tenant collection and index counts; what happens at startup of a new process; the timers of every pod; whether there is a health endpoint and graceful shutdown.

## Documentation review

**What it protects.** That what the README files say is true.

**Method.** Take every factual statement in the README files (behaviour, numbers, commands, role tables, flows) and check it against the code or by running it. List what is not true, with the README line and the real behaviour. Check that the examples run, that the diagrams render, and that every link and anchor resolves.

## Regression pass

Every review ends here, and so does every change that touches a promise.

1. Open [README.design-invariants.md](README.design-invariants.md).
2. For each invariant in the area you reviewed, run its check. Mark the result: held, broken, or not checked.
3. A broken invariant is a finding (cite the invariant ID).
4. A new behaviour that the review found correct and worth protecting becomes a new invariant, with the check that proves it.
5. If something cannot be solved, document it as a **caveat** in the invariants and in the [detailed documentation](README.details.md#caveats), with the reason.
