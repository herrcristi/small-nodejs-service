---
name: small-nodejs-service
description: 'Use when creating, reviewing, testing, or documenting backend or UI changes in this multi-tenant school portal, including services, auth roles, REST APIs, notifications, MongoDB references, and Vue UI calls.'
---

# Small Node.js Service

## Architecture

- Backend service modules live in `src/services/<service>/` and normally separate constants, router, controller, service, and database concerns. REST wrappers live in `src/services/rest/`.
- Public routes use `/api/v1`; service-to-service routes use `/api/internal_v1`. Use `RestCommsUtils` and the existing REST wrapper instead of calling another service's controller or database directly.
- A controller may call only the service owned by its microservice. Services must use the target microservice's `*Rest` wrapper for cross-service calls; do not import another microservice's service directly. Configure internal REST aliases for internal-only operations.
- Controllers adapt HTTP requests and responses. Joi validation and business orchestration belong in service modules. Mongo operations use `DbOpsUtils` and the shared database utilities.
- The Vue UI calls APIs through `ui/src/api/api.js`. Its Axios interceptor sends the HttpOnly cookie and selected `x-tenant-id`.

## Routes and Naming

- A resource that gets a `PUT` route also gets the matching `PATCH` route (patch body `{ set, unset, add, remove }`), with the same role entries in `config.roles.json`.
- Name service and controller functions of public routes after the operation: `getOne`, `put`, `patch`, `putStatus`, `patchStatus`. Use the `ForReq` suffix only for functions that take `req` (like `getAllForReq(req, _ctx)`).
- Internal routes reached through `RestCommsUtils.put` / `RestCommsUtils.patch` with a field map to the local functions `put<Field>` / `patch<Field>` (for example `/:id/email` -> `putEmail`), so keep those names. When an internal route would share a name with a public one, give the internal function the `Internal` suffix (for example controller `getAllInternal`, service `getAllInternalForReq`). `putInternal` / `patchInternal` are the shared implementation helpers of a service, not routes.
- An action without a body (for example activating a user or a school) is an internal `POST /api/internal_v1/<service>/:id/<action>`. Its REST wrapper builds the config itself and calls `RestCommsUtils.call` with `localCall.fn` set to the action name.
- Keep `DbOpsUtils` generic: do not add options such as extra filter conditions to its operations. When a change (like a status) can come from several callers, give each caller its own route and service function with its own rules, and check where each one is called from.

## Tenant and Role Rules

- The selected tenant is `_ctx.tenantID`; tenant-scoped services should reject missing tenant context and rely on auth middleware to validate membership, active status, role, and route.
- `src/services/config.roles.json` is the route-to-role access matrix. Keep its routes synchronized with Express routers and service behavior.
- User roles are stored on each school membership. `admin`, `professor`, and `student` are school roles. `portal-admin` is an isolated role on the configured Portal School, not a synonym for school `admin`; do not grant both unless a specific requirement needs both.
- The portal school UUID is backend configuration (`SMALL_API_PORTAL_SCHOOL_ID`). Never embed it in UI source or UI environment variables. The UI derives portal permissions from the selected membership's returned roles.
- The Portal School is a tenant like the others: inviting a user to it gives `portal-admin`, and `portal-admin` can be given only there (enforced in `UsersAuthSignupService.invite`). It must remain active and is excluded from `GET /schools`; its admins are listed with the portal-admin-only `GET /users/portal-admins`. Keep those invariants enforced by backend services as well as the UI, which does not show the Portal School itself, only its admins.
- Routes shared between `portal-admin` and school roles (for example `POST /users-auth/invite`): the portal-admin check in `validatePortalAdminRoute` only grants access; anything else falls through to the normal school-role validation.
- Startup creates the Portal School record and, if `SMALL_API_PORTAL_ADMIN_EMAIL` is set and the Portal School has no portal admin, invites that email as the first `portal-admin` through the normal invite flow (`users-auth.setup.service.js`). Do not add anonymous self-promotion, initial passwords, or infer the role from school `admin`. Portal admins are listed with `GET /users/portal-admins` and removed with `PATCH /users-auth/school/user/:uid` (a portal admin cannot remove themself).
- `/users/:id` (`GET`, `PUT`, `PATCH`) is scoped in the users service, not only by the route roles: the user itself sees and changes its own profile with all its schools; a school admin reaches only members of the selected tenant and sees only that school in `schools`; a portal admin (on the Portal School) reaches any user, reads only id, name, email and status (not the schools or the personal profile fields), and changes only the name. Anything else answers `404`, so the existence of a user is not disclosed.
- The email of a user is its login and is changed only by the user, with the password (`/users-auth/id`). No admin route changes it.
- A portal admin removes a school admin with `DELETE /users/school-admins/:schoolId/:id` (`UsersService.deleteSchoolAdmin`): only the `admin` role on that school is removed, the user and its other roles are kept, and the last admin of a school is never removed (checked in the service; the UI also hides the delete action when a school has one admin). School admins change roles in their own school with `PATCH /users-auth/school/user/:uid`.
- Lists for portal admins (`GET /users`, `/users/portal-admins`, `/users/school-admins/:schoolId`) use the portal filter schema: no filter on the schools of the users, and a projection without them.
- Never trust a client-provided role or permission flag. Enforce access through the authenticated user record and route-role configuration.

## Service Patterns

- Validate request bodies and query filters with the service's Joi schemas. List routes use `RestApiUtils.buildFilterFromReq` and return `{ data, meta }`.
- Service configuration declares references, projections, and notification payloads. Populate/expand references through `ReferencesUtils` and the corresponding `*Rest` service.
- Mutations generally follow validate, load config, populate references, translate, perform the database operation, raise an event, then raise a notification. Preserve rollback behavior for multi-step signup/invite flows.
- User invitations go through `UsersAuthSignupService.invite`: new users receive the signup/reset-password message; existing users receive the invite message. Every invitation (school roles and `portal-admin`) uses `UsersAuthRest.invite` / `POST /users-auth/invite` with the school taken from the selected tenant; do not add school-specific invite routes. The local-call mapping that exposes `signup` and `invite` on the users-auth local service is in `src/services/config.services.js`; the email sender is `UsersAuthService.sendInvite`.
- School creation stays in `UsersAuthSignupService.signup`, which creates the school through `SchoolsRest` and invites the first admin. Do not duplicate it with a public schools signup route or service.
- Status and role transitions should follow the owning service constants. Do not duplicate literal status policy across controllers and UI when a constant/helper already exists.
- The status of a user is global (all its schools). `pending` is only the initial state: a user becomes `active` at its first login (internal `POST /users/:id/activate`) or is set `active` / `disabled` by a portal admin (`PUT|PATCH /users/:id/status`), and never goes back to `pending`. The profile routes (`PUT|PATCH /users/:id`) refuse `status`. A portal admin cannot disable itself.
- The activation (`UsersService.activate`, `SchoolsService.activate`) reads the user or the school itself and changes only a `pending` one; an active or disabled one is returned unchanged, and the caller uses the returned status (a disabled user is refused at login, a disabled school stays disabled). Never decide on a membership copy or on a snapshot taken earlier in the flow.
- Add short section comments in the existing block-comment style when they explain a boundary or non-obvious invariant; add comments for the next statements, with clear explainations; add if it separates flows.

## UI Patterns

- Derive page/menu permissions with `getRolesPermissions` from the selected active school membership. Also protect privileged routes with the router guard; backend checks remain authoritative.
- Reuse the `ApiTableServer` and `ComponentsUtils.Edit` patterns for CRUD pages. A "more info" panel (the expanded row of a page's table) is compact like the other pages: a `v-card` with `v-card-text`, a right-aligned `v-col cols="12" md="10"`, and the dense `ApiTableData` (directly, or through `ApiFieldDetails` / the `api.references.*` components) with the items loaded by the panel; do not nest a full `ApiTableServer` (toolbar, paging) in it. Use existing invite flows for user-backed records rather than making duplicate user-creation endpoints.
- Keep API methods in `ui/src/api/api.js` and use translations from `ui/src/translations/` for visible labels.
- Show a status with the UI translations (`ComponentUtils.getStatusText`, the same keys as the edit dialogs), not with the label translated by the server (`_lang_en`), which is always English; the server label is only a fallback for a value the UI does not know.
- The Admins, Students and Professors pages edit only the name of a person, never its status. Portal admins edit users (name and status) with the shared `ApiUserEditDialog` (`api.user.edit.dialog.vue`), which calls the profile route for the name and the status route for the status, and hides the status for the current user. It is used by the Users page (`/users`, permission `users`), the portal admins list, and the admins of a school on the Schools page.

## Tests

- Service tests live in `src/test/test/<service>/`, use Sinon stubs, and are registered by the service's `*.all.tests.js` file. Add tests for success, validation, dependency failures, and authorization/invariants appropriate to the change.
- Auth route behavior belongs in `users-auth.service.validate.test.js`; public controller behavior belongs in the owning controller test suite.
- Run a focused Mocha file or suite first. The backend's complete unit suite is `cd src && npm test`; database-backed functional tests use `npm run testdb` and require MongoDB. Run both with `env -u SMALL_API_PORTAL_ADMIN_EMAIL` when that variable is exported in the shell (otherwise the startup bootstrap stops the run). When functional tests fail, compare with the same run on the base commit before concluding that a change caused it.
- Test data uses normal, realistic values (names, emails on `testdomain.test`, ids), not words like `evil` or `attacker`, even in security tests.
- Format only the files that were changed (`npx prettier --write <files>`), and check the diff: if the formatter changes lines that were not part of the change, restore the file and re-apply only the change.
- UI scripts are in `ui/package.json`; validate Vue changes with `npm run build` if the lint command is unavailable.
