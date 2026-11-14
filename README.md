# small-nodejs-service

A Node.js microservice and Vue application for managing multiple schools from one portal.

The service demonstrates a multi-tenant school domain where users can hold different roles in different schools. Its backend provides REST controllers, service-to-service communication, MongoDB persistence, role-based authentication, reference expansion, notifications, translations, email flows, and unit tests.

## Project Overview

The backend is an Express application in `src/`. The Vue 3 frontend is in `ui/`. Backend services use MongoDB; user-facing authentication uses an HttpOnly cookie. The selected school is sent as `x-tenant-id` on tenant-scoped requests.

```mermaid
flowchart LR
  Browser[Vue UI] -->|Cookie + x-tenant-id| API[Express API]
  API --> Auth[Auth middleware]
  Auth --> Roles[Route and membership checks]
  Roles --> Controllers[Service controllers]
  Controllers --> Services[Domain services]
  Services --> Mongo[(MongoDB)]
  Services --> Rest[REST communication layer]
  Rest --> Services
  Services --> Events[Events and notifications]
```

## Domain Model

Users are global identities. Their roles are attached to school memberships, not to the user globally. Students, professors, and admins are user-backed school records. Classes, locations, groups, and schedules belong to a school; groups and schedules refer to other records by ID.

```mermaid
erDiagram
  SCHOOL ||--o{ USER_SCHOOL : has
  USER ||--o{ USER_SCHOOL : joins
  USER ||--o| ADMIN : may_have
  USER ||--o| STUDENT : may_have
  USER ||--o| PROFESSOR : may_have
  SCHOOL ||--o{ CLASS : contains
  SCHOOL ||--o{ LOCATION : contains
  SCHOOL ||--o{ GROUP : contains
  SCHOOL ||--o{ SCHEDULE : contains
  CLASS ||--o{ SCHEDULE : scheduled_as
  LOCATION ||--o{ SCHEDULE_LOCATION : hosts
  SCHEDULE ||--o{ SCHEDULE_LOCATION : has_times
  PROFESSOR ||--o{ SCHEDULE : teaches
  GROUP ||--o{ SCHEDULE : participates
  STUDENT ||--o{ GROUP : member_of
  STUDENT ||--o{ SCHEDULE : attends
```

`USER_SCHOOL` and `SCHEDULE_LOCATION` describe embedded membership/reference data, not separate MongoDB collections.

`admin`, `professor`, and `student` are school roles. `portal-admin` is a separate role stored on a membership in the Portal School. A portal admin does not also need the school-level `admin` role. The Portal School is a tenant like any other school (users select it after login and invite users into it), but it is configured only on the backend, must remain active, and is omitted from the managed-school list. Inviting a user to the Portal School gives that user the `portal-admin` role; `portal-admin` cannot be given on any other school, and nothing else can be given on the Portal School.

## Design Principles

- **Tenant context:** authenticated tenant requests must include an active school membership in `x-tenant-id`. Controllers receive the resolved context as `req._ctx`; tenant-scoped services validate required context before database access.
- **Authorization:** `src/services/config.roles.json` maps HTTP routes to roles. The auth service checks both the route and the user's role in the selected school. The UI hides privileged navigation and guards routes for usability, but backend authorization is authoritative.
- **Layered services:** routers register routes, controllers translate HTTP, services validate and orchestrate domain behavior, database modules provide collections/indexes, and `src/services/rest/` wraps inter-service calls.
- **Shared persistence helpers:** services use Joi schemas, `RestApiUtils` for list filters, `DbOpsUtils` for MongoDB operations, and reference utilities for resolving related records.
- **Events and notifications:** successful mutations raise domain events and notifications. Subscribers update dependent service records; internal notification routes are not public client APIs. See [Data Modes](#data-modes-joins-or-notifications) for when to join on read and when to copy on write.
- **Internal communication:** services call other services through `RestCommsUtils`, using local dispatch or the internal REST route and service-to-service authentication.
- **Status lifecycle:** records use `pending`, `active`, and `disabled` states where applicable. A first successful login activates pending user/school records. The tenant selector offers only active schools.
- **Translations and email:** response fields are translated through the translation utilities; localized strings and email templates live in `src/translations/`.
- **Authentication:** browser clients send the HttpOnly cookie automatically. Do not copy the auth token into a JavaScript `Authorization` header.
- **Transport and abuse controls:** CORS uses the configured origin allowlist with credentials; the web server adds security headers; login is limited to three attempts per IP per 15-minute window outside debug mode.
- **Password policy:** newly set passwords require at least eight characters with uppercase, lowercase, a digit, and a special character. Password and email changes require the current password.
- **Tests:** Mocha tests use Sinon stubs for service dependencies and follow the per-service suites in `src/test/test/`. Database-backed functional tests are separate from the default unit suite.

## Data Modes: Joins or Notifications

Records refer to each other (a schedule refers to a class, professors, groups, and students; a group refers to students; a user lists its school memberships). A `GET` that must show the referenced names and statuses can get them in two ways. The project supports both, and they are configured with the same `references` declaration of each service.

|                        | Mode 1: joins on read (classical)                      | Mode 2: notifications (read-optimized)                                                    |
| ---------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Stored in the document | only the referenced ids                                | the ids **plus a projected copy** of the referenced record (for example `name`, `status`) |
| Work done by `GET`     | extra lookups to resolve the references on every read  | none: one read of one collection                                                          |
| Work done by a change  | none: only the changed record is written               | the owner raises a notification and every subscribed service updates its copies           |
| Freshness              | always current                                         | current once the notification was processed (see the caveats below)                       |
| Duplicated data        | none                                                   | yes, limited to the declared projection                                                   |
| Best when              | data changes often, reads are rare or need every field | data changes rarely and the system is optimized for `GET`                                 |

A rule of thumb: Mode 2 pays on writes to make reads cheap. If a record is read hundreds of times for every change (a class name, a location address, a user's name), copy it. If it changes about as often as it is read, join it.

### Mode 1: joins on read

Documents hold only ids. The read path resolves the references in bulk: one `getAllByIDs` call per reference field for the whole page of results, not one call per row.

```mermaid
sequenceDiagram
  participant UI as Vue UI
  participant S as Schedules service
  participant DB as schedules collection
  participant C as Classes service
  participant P as Professors service
  UI->>S: GET /schedules?limit=20
  S->>DB: find (documents with ids only)
  DB-->>S: [{ class: { id }, professors: [{ id }] }]
  S->>C: getAllByIDs(class ids)
  C-->>S: [{ id, name, status }]
  S->>P: getAllByIDs(professor ids)
  P-->>S: [{ id, name, user }]
  S-->>UI: schedules with class and professors filled in
```

What is stored and returned:

```jsonc
// stored in schedules: ids only
{ "id": "sch-1", "name": "Mathematics 1A - Monday", "class": { "id": "class-1" }, "professors": [{ "id": "prof-1" }] }

// returned by GET after the joins
{ "id": "sch-1", "name": "Mathematics 1A - Monday",
  "class": { "id": "class-1", "name": "Mathematics 1A", "status": "active" },
  "professors": [{ "id": "prof-1", "name": "Ada Lovelace" }] }
```

Renaming the class touches only the `classes` collection; the next `GET /schedules` already shows the new name. The cost is that every `GET /schedules` also queries classes, professors, groups, students, and locations, so its latency depends on all of those services.

A second cost is that the database cannot filter or sort on a field that is not stored. Today `GET /students` can be sorted by `user.name` and filtered by `user.email` or `classes.name` because those copies are stored in the student document; in Mode 1 such a query would have to be resolved in the service (or dropped).

> **Current state:** the shipped services are wired for Mode 2. Mode 1 uses the same building blocks (the `references` configuration and `ReferencesUtils.populateReferences`), but the call has to be moved from the write path to the read path of a service. There is no global switch yet. For a service that should use Mode 1:
>
> 1. Do not call `ReferencesUtils.populateReferences({ ...config, fillReferences: true }, ...)` in `post`/`put`/`patch`, so only ids are stored.
> 2. Call it on the results of `getAll`/`getOne` (and on the values returned by the write calls, if the response must be expanded), so the references are joined on read:
>
>    ```js
>    const r = await Public.getAll(filter, _ctx);
>    await ReferencesUtils.populateReferences({ ...config, fillReferences: true }, r.value, _ctx);
>    ```
>
> 3. Do not register the service as a subscriber in `src/services/config.services.js`, so no copies need to be maintained.

### Mode 2: notifications

The referenced data is copied into the referring document when it is written, and kept current by notifications. `GET` does no joins.

```mermaid
flowchart LR
  subgraph write [Write path]
    direction LR
    W[PUT /classes/class-1] --> CS[Classes service]
    CS -->|1. update class| CDB[(classes)]
    CS -->|2. raiseNotification modified| N{{Subscribers from config.services.js}}
    N -->|3. update copies| SS[Schedules service]
    N -->|3. update copies| PS[Professors service]
    N -->|3. update copies| STS[Students service]
    SS --> SDB[(schedules)]
    PS --> PDB[(professors)]
    STS --> STDB[(students)]
  end
  subgraph read [Read path]
    direction LR
    R[GET /schedules] --> SS2[Schedules service] --> SDB2[(schedules)]
  end
```

What is stored: the projection declared in the service's `references` (here, the schedule keeps `id`, `name`, `type`, `status`, `description`, `credits`, and `required` of its class):

```jsonc
// stored in schedules: ids plus the projected copy; GET returns it as it is
{
  "id": "sch-1",
  "name": "Mathematics 1A - Monday",
  "class": { "id": "class-1", "name": "Mathematics 1A", "status": "active", "credits": 3, "required": "required" },
  "professors": [
    {
      "id": "prof-1",
      "name": "Ada Lovelace",
      "status": "active",
      "user": { "id": "user-1", "email": "ada@example.test" },
    },
  ],
}
```

How it is configured, in three places:

1. **What to copy:** the `references` of the service that stores the copy, in its `getConfig`. `fieldName` is the field that holds the reference (`class`, `professors[]`, `schedules[].location`) and `projection` selects the copied fields.

   ```js
   // src/services/schedules/schedules.service.js
   references: [
     { fieldName: 'class', service: ClassesRest, projection: { id: 1, name: 1, type: 1, status: 1, description: 1, credits: 1, required: 1 } },
     { fieldName: 'professors[]', service: ProfessorsRest, projection: { id: 1, name: 1, type: 1, status: 1, user: 1 } },
   ],
   ```

2. **Who is told:** the owner raises a notification after each successful `post`, `put`, `patch`, and `delete` (`ClassesRest.raiseNotification('modified', [class])`), and `config.services.js` subscribes the dependent services to it. The projection of the subscription selects what is sent:

   ```js
   // src/services/config.services.js
   for (const rest of [StudentsRest, ProfessorsRest, SchedulesRest]) {
     const projection = { ...notifyProjection, description: 1, credits: 1, required: 1 };
     await ClassesRest.subscribe({ callback: rest.notification, projection });
   }
   ```

3. **What happens on receipt:** each subscriber's `notification` handler calls `ReferencesUtils.onNotificationReferences`, which applies `added`, `modified`, and `removed` to every stored copy with one `updateMany` per changed record and reference (`DbOpsUtils.updateManyReferences`, and the matching add/delete helpers).

Real chains in this project: a class rename updates the copies in schedules, students, and professors; a student change updates groups and schedules; a school rename or status change updates the school memberships stored in each user, which is why the login response and the tenant selector need no school lookup.

```mermaid
flowchart LR
  Schools --> Users
  Users --> Admins & Students & Professors & UsersAuth[Users auth]
  Classes --> Students & Professors & Schedules
  Groups --> Students & Schedules
  Students --> Groups & Schedules
  Professors --> Schedules
  Locations --> Schedules
  Schedules --> Professors & Groups & Students
```

An arrow means "raises notifications that the target uses to update its copies" (the exact lists are in `src/services/config.services.js`).

Things to know before choosing Mode 2:

- **Write amplification:** one change fans out to every collection that copies it, and the copies can chain (user → student → group → schedule). Keep projections small; the notification projection of the owner limits what is sent.
- **Consistency:** notifications are delivered synchronously, in the same process, right after the write. Errors in a subscriber are logged and not rolled back, so a failed propagation leaves a stale copy. The queue-based asynchronous delivery (`broadcast` and `consume` in `base-service.notifications.utils.js`) is a placeholder and is not implemented yet.
- **Copy only what lists need:** fields that are read in `GET` and almost never change (names, statuses, addresses). Fields that change often should be joined (Mode 1) or fetched with the detail request.
- **Mixed use is fine:** the choice is made per reference. A service may copy the class (rarely changes, shown in every row) and join the students (large, change often).

## Local Development

Use Node.js, npm, Docker Compose, and MongoDB. Backend and frontend dependencies are installed separately:

```sh
cd src && npm install
cd ../ui && npm install
```

The backend requires the values shown in [src/.env.example](src/.env.example). That file is a template: `src/index.js` reads values from the process environment and does not load `.env` itself. Configure the values in your shell, container, or process manager. In particular:

- Set `SMALL_API_AUTH_PROVIDER_TYPE=local` for local username/password authentication.
- Set database URL, database name, signing secrets, SMTP configuration, port, URL, and CORS origin.
- Set `SMALL_API_PORTAL_SCHOOL_ID` to a UUID. Startup creates the active Portal School record if it is missing.
- Set `SMALL_API_PORTAL_ADMIN_EMAIL` to the email of the first portal admin. At startup, if the Portal School has no portal admin yet, that email is invited with the normal invite flow: the user receives the password setup email and nothing secret is configured. It is skipped when a portal admin already exists, so it is safe on every restart; if the address was wrong, fix the variable and restart while there is still no portal admin. There is intentionally no anonymous portal-admin signup and no initial password setting (SMTP must be configured to deliver the email).

Start the local MongoDB container from `src/`:

```sh
cd src && npm run up
```

After supplying the backend environment values, start the API:

```sh
cd src && npm start
```

For UI development, configure [ui/.env.example](ui/.env.example) and run:

```sh
cd ui && npm run serve
```

The Vue development server uses the configured UI port and API URL. For a production frontend build, run `npm run build` in `ui/`.

Run backend tests from `src/`:

```sh
npm test
```

The database-backed suite is `npm run testdb` and requires a running MongoDB test database. Local test fixture credentials in `src/test/test-constants.js` are for tests only; they are not provisioned application accounts.

## Authentication First

The local provider authenticates a username and password against the local auth collection. A user must already exist, normally through an invitation or a trusted bootstrap. Login does not require a tenant header. It returns the user's school memberships and their current statuses, then sets the HttpOnly `SmallApp-token` cookie; the token itself is not returned in JSON.

### UI Login

The login component uses the shared API wrapper and processes the response before navigating to the tenant selector:

```js
import Api from '../api/api.js';
import { processLoginResponse } from '../auth.js';

const response = await Api.login({ username, password });
const result = await processLoginResponse(response);
```

`Api.login` enables credentialed requests. If the user has one active school, the UI selects it; otherwise the user chooses an active school. The API wrapper then adds that school ID as `x-tenant-id` on subsequent requests.

### Local Login with curl

Set the API URL for your local backend, then save the cookie returned by login:

```sh
API='http://localhost:8080/api/v1'
ORIGIN='http://localhost:8081'

curl --include --cookie-jar cookies.txt \
  --header "Origin: $ORIGIN" \
  --header 'Content-Type: application/json' \
  --data '{"username":"user@example.test","password":"your-password"}' \
  "$API/users-auth/login"
```

The response body includes `userID`, `username`, `status`, `name`, and `schools`. Choose an active membership ID from `schools`; use it on every tenant-scoped request:

```sh
TENANT_ID='school-id-from-login'

curl --cookie cookies.txt \
  --header "Origin: $ORIGIN" \
  --header "x-tenant-id: $TENANT_ID" \
  "$API/students?limit=20&skip=0"
```

To restore the current session, call `GET /users-auth/me` with the cookie. To log out, call `POST /users-auth/logout` with the cookie.

## API Conventions

- Public routes use the `/api/v1` prefix. Internal service routes use `/api/internal_v1` and are not for browser or third-party clients.
- Authenticated requests use the HttpOnly cookie and, for tenant-scoped routes, `x-tenant-id`.
- Collection GET responses contain `data` and `meta` (`count`, `limit`, `skip`, and `sort`). A partial collection may return HTTP `206`.
- List queries support the `api-query-params` syntax used by the backend, including `limit`, `skip`, `sort`, `projection`, and supported field filters.
- JSON request bodies are validated by the owning service. Unknown fields and invalid relationships are rejected.
- `PATCH` uses service-specific `set`, `add`, `remove`, or `unset` structures. See the examples below for relationship updates.

## Services and Examples

All UI examples use the shared `Api` object from `ui/src/api/api.js`. Its Axios instance sends the cookie and selected tenant header automatically. Curl examples use the `API`, `TENANT_ID`, and `cookies.txt` values from the login section.

### Schools

There are two kinds of schools, kept apart in the API and in the UI:

| Kind              | How it is listed                                                  | How users are invited                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Managed schools   | `GET /schools` (portal admins only; the Portal School is omitted) | A new school is created with `POST /users-auth/signup`, which invites its first admin. Later admins are invited by that school's admins with `POST /users-auth/invite` |
| The Portal School | `GET /schools/portal` (a single entry, portal admins only)        | `POST /users-auth/invite` with the role `portal-admin`; the selected tenant must be the Portal School                                                                  |

There is no school-specific "invite admin" route: every invitation goes through the same `UsersAuthRest.invite` / `POST /users-auth/invite` flow, and the school comes from the selected tenant (`x-tenant-id`). New users receive the signup/password setup email, while existing users receive the invite email.

Portal admins must have the Portal School selected as their tenant. In the UI, the Schools page therefore shows separate lists: the Portal School as a list with one entry (with the "Invite Portal Admin" action), the portal admins (with remove), and the managed schools list (add through signup, edit).

Portal admins are listed with `GET /users/portal-admins` (portal admins only, with the usual `limit`, `skip`, `sort`, and filters; only `id`, `name`, `email`, and `status` are returned) and removed with the existing `PATCH /users-auth/school/user/:uid` using `{"remove":{"roles":["portal-admin"]}}`, which removes the role, not the account. A portal admin cannot remove their own role, so the Portal School always keeps an admin. The first portal admin is created at startup from `SMALL_API_PORTAL_ADMIN_EMAIL` (see Local Development).

```js
// managed schools
await Api.getSchools('limit=20&skip=0');
await Api.signup({ email: 'admin@example.test', school: { name: 'North School', description: 'North campus' } });
await Api.updateSchool('school-id', { name: 'North School', status: 'active' });

// the Portal School (the selected tenant is the Portal School)
await Api.getPortalSchool();
await Api.invitePortalAdmin('another-portal-admin@example.test');
await Api.getPortalAdmins('limit=20&skip=0');
await Api.removePortalAdmin('user-id');
```

```sh
# managed schools
curl --cookie cookies.txt -H "Origin: $ORIGIN" -H "x-tenant-id: $TENANT_ID" "$API/schools?limit=20&skip=0"

curl --cookie cookies.txt -H "x-tenant-id: $TENANT_ID" \
  -H "Origin: $ORIGIN" \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@example.test","school":{"name":"North School","description":"North campus"}}' \
  "$API/users-auth/signup"

# the Portal School ($TENANT_ID is the Portal School)
curl --cookie cookies.txt -H "Origin: $ORIGIN" -H "x-tenant-id: $TENANT_ID" "$API/schools/portal"

curl --cookie cookies.txt -H "x-tenant-id: $TENANT_ID" \
  -H "Origin: $ORIGIN" \
  -H 'Content-Type: application/json' \
  --data '{"email":"another-portal-admin@example.test","school":{"role":"portal-admin"}}' \
  "$API/users-auth/invite"

curl --cookie cookies.txt -H "Origin: $ORIGIN" -H "x-tenant-id: $TENANT_ID" "$API/users/portal-admins?limit=20&skip=0"

curl --cookie cookies.txt -H "x-tenant-id: $TENANT_ID" \
  -H "Origin: $ORIGIN" \
  -H 'Content-Type: application/json' -X PATCH \
  --data '{"remove":{"roles":["portal-admin"]}}' \
  "$API/users-auth/school/user/user-id"
```

School status can be edited so disabled schools are unavailable in tenant selection. The Portal School cannot be deleted or disabled. School deletion is not granted to portal admins.

### Admins, Students, and Professors

These records are linked to users. The UI's add action uses the invite endpoint; it does not create an unlinked person record. Invite bodies require the role and selected school context.

| Record    | UI call                                                       | Collection curl                         | Invite role |
| --------- | ------------------------------------------------------------- | --------------------------------------- | ----------- |
| Admin     | `Api.getAdmins(query)` / `Api.createAdmin({ email })`         | `GET "$API/admins?limit=20&skip=0"`     | `admin`     |
| Student   | `Api.getStudents(query)` / `Api.createStudent({ email })`     | `GET "$API/students?limit=20&skip=0"`   | `student`   |
| Professor | `Api.getProfessors(query)` / `Api.createProfessor({ email })` | `GET "$API/professors?limit=20&skip=0"` | `professor` |

Example student invite and collection request:

```sh
curl --cookie cookies.txt -H "x-tenant-id: $TENANT_ID" \
  -H "Origin: $ORIGIN" \
  -H 'Content-Type: application/json' \
  --data '{"email":"student@example.test","school":{"role":"student"}}' \
  "$API/users-auth/invite"

curl --cookie cookies.txt -H "Origin: $ORIGIN" -H "x-tenant-id: $TENANT_ID" "$API/students?limit=20&skip=0"
```

Use the same curl request with `"role":"professor"` or `"role":"admin"` for the other invite types. The table shows each collection request. The entity routers also expose `GET /:id`, `POST /`, `PUT /:id`, `PATCH /:id`, and `DELETE /:id` where allowed by the role matrix; the UI add action intentionally uses invites because these records are linked to user accounts.

Students and professors can be attached to classes through patch operations:

```js
await Api.updateStudentClasses('student-id', ['class-id-to-add'], ['class-id-to-remove']);
await Api.updateProfessorClasses('professor-id', ['class-id-to-add'], []);
```

```sh
curl --cookie cookies.txt -H "x-tenant-id: $TENANT_ID" \
  -H "Origin: $ORIGIN" \
  -H 'Content-Type: application/json' -X PATCH \
  --data '{"add":{"classes":[{"id":"class-id"}]},"remove":{"classes":[]}}' \
  "$API/students/student-id"
```

### Classes

Classes are school-scoped. `required` accepts `required` or `optional`; credits default to zero and status defaults to pending.

```js
await Api.getClasses('limit=20&skip=0');
await Api.createClass({
  name: 'Mathematics 1A',
  description: 'Introductory mathematics',
  credits: 3,
  required: 'required',
});
```

```sh
curl --cookie cookies.txt -H "x-tenant-id: $TENANT_ID" \
  -H "Origin: $ORIGIN" \
  -H 'Content-Type: application/json' \
  --data '{"name":"Mathematics 1A","description":"Introductory mathematics","credits":3,"required":"required"}' \
  "$API/classes"
```

### Locations

Locations require a name and address. Schedules reference a location by ID.

```js
await Api.getLocations('limit=20&skip=0');
await Api.createLocation({ name: 'Room 12', address: 'North building, floor 2' });
```

```sh
curl --cookie cookies.txt -H "x-tenant-id: $TENANT_ID" \
  -H "Origin: $ORIGIN" \
  -H 'Content-Type: application/json' \
  --data '{"name":"Room 12","address":"North building, floor 2"}' \
  "$API/locations"
```

### Groups

Groups contain student references. Membership changes use `add.students` and `remove.students`.

```js
await Api.getGroups('limit=20&skip=0');
await Api.createGroup({ name: 'Group A', description: 'Morning group', students: [{ id: 'student-id' }] });
await Api.updateGroupStudents('group-id', ['student-id-to-add'], []);
```

```sh
curl --cookie cookies.txt -H "x-tenant-id: $TENANT_ID" \
  -H "Origin: $ORIGIN" \
  -H 'Content-Type: application/json' \
  --data '{"name":"Group A","description":"Morning group","students":[{"id":"student-id"}]}' \
  "$API/groups"
```

### Schedules

A schedule belongs to one class and can refer to professors, groups, and students. Each schedule time includes an ISO timestamp, frequency, location ID, and optional status. Supported frequencies are `once`, `weekly`, `biWeekly`, and `monthly`.

```js
await Api.getSchedules('limit=20&skip=0');
await Api.createSchedule({
  name: 'Mathematics 1A - Monday',
  class: 'class-id',
  schedules: [
    { timestamp: '2026-11-16T09:00:00.000Z', frequency: 'weekly', location: 'location-id', status: 'active' },
  ],
  professors: [{ id: 'professor-id' }],
  groups: [{ id: 'group-id' }],
  students: [],
});
```

```sh
curl --cookie cookies.txt -H "x-tenant-id: $TENANT_ID" \
  -H "Origin: $ORIGIN" \
  -H 'Content-Type: application/json' \
  --data '{"name":"Mathematics 1A - Monday","class":"class-id","schedules":[{"timestamp":"2026-11-16T09:00:00.000Z","frequency":"weekly","location":"location-id","status":"active"}],"professors":[{"id":"professor-id"}],"groups":[{"id":"group-id"}],"students":[]}' \
  "$API/schedules"
```

Relationship changes use `Api.updateScheduleInnerSchedules`, `Api.updateScheduleGroups`, `Api.updateScheduleProfessors`, and `Api.updateScheduleStudents`; each helper issues a `PATCH /schedules/:id` with `add` and `remove` arrays.

### Users

Users are global profile records referenced by school-backed person records. Access to other users is role-limited; a user can also access their own profile.

```js
await Api.getUser('user-id');
await Api.updateUser('user-id', { name: 'Updated Name' });
```

```sh
curl --cookie cookies.txt -H "Origin: $ORIGIN" -H "x-tenant-id: $TENANT_ID" "$API/users/user-id"
```

### Users Auth

In addition to login, logout, and `GET /users-auth/me`, the service provides `POST /users-auth/invite`, `POST /users-auth/reset-password`, `PUT /users-auth/password`, `PUT /users-auth/id`, and `PATCH /users-auth/school/user/:uid`. Signup is restricted to portal admins; invite is available to school admins (for their selected school) and to portal admins (for the Portal School). Internal auth routes are not public APIs.

```js
await Api.invite({ email: 'student@example.test', school: { role: 'student' } });
await Api.updateUserPassword({ oldPassword, newPassword });
```

```sh
curl --cookie cookies.txt -H "x-tenant-id: $TENANT_ID" \
  -H "Origin: $ORIGIN" \
  -H 'Content-Type: application/json' \
  --data '{"username":"user@example.test"}' \
  "$API/users-auth/reset-password"
```

The local auth provider sends a signup/password setup message to a newly created user and an invitation message to an existing user. SMTP settings and localized email templates are required for delivery.

### Events

Events are raised by services after mutations. Public clients can query events but cannot create them directly; event creation and notification endpoints are internal.

```js
await Api.getEvents('limit=20&skip=0');
```

```sh
curl --cookie cookies.txt -H "Origin: $ORIGIN" -H "x-tenant-id: $TENANT_ID" "$API/events?limit=20&skip=0"
```

## Code Map

| Area                                                          | Location                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| Service startup and configuration                             | `src/index.js`, `src/services/config.services.js`            |
| Role-to-route policy                                          | `src/services/config.roles.json`                             |
| Domain service modules                                        | `src/services/<service>/`                                    |
| Service-to-service REST wrappers                              | `src/services/rest/`                                         |
| Shared MongoDB, validation, references, events, notifications | `src/core/utils/`                                            |
| Authentication and invitation flows                           | `src/services/users-auth/`                                   |
| Web server, middleware, and security headers                  | `src/web-server/`, `src/core/web-server/`                    |
| Backend tests                                                 | `src/test/test/` and `src/core/test/`                        |
| Vue API client and role-derived permissions                   | `ui/src/api/`, `ui/src/auth.js`                              |
| Vue pages and shared tables                                   | `ui/src/components/`                                         |
| Vue routing and tenant selection                              | `ui/src/router/`, `ui/src/components/base.tenant.select.vue` |
