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

## Tenant and Role Rules

- The selected tenant is `_ctx.tenantID`; tenant-scoped services should reject missing tenant context and rely on auth middleware to validate membership, active status, role, and route.
- `src/services/config.roles.json` is the route-to-role access matrix. Keep its routes synchronized with Express routers and service behavior.
- User roles are stored on each school membership. `admin`, `professor`, and `student` are school roles. `portal-admin` is an isolated role on the configured Portal School, not a synonym for school `admin`; do not grant both unless a specific requirement needs both.
- The portal school UUID is backend configuration (`SMALL_API_PORTAL_SCHOOL_ID`). Never embed it in UI source or UI environment variables. The UI derives portal permissions from the selected membership's returned roles.
- The Portal School is a tenant like the others: inviting a user to it gives `portal-admin`, and `portal-admin` can be given only there (enforced in `UsersAuthSignupService.invite`). It must remain active and is excluded from `GET /schools`; it is read through the portal-admin-only `GET /schools/portal`. Keep those invariants enforced by backend services as well as the UI, which shows it as a separate single-entry list.
- Routes shared between `portal-admin` and school roles (for example `POST /users-auth/invite`): the portal-admin check in `validatePortalAdminRoute` only grants access; anything else falls through to the normal school-role validation.
- Startup creates the Portal School record only. Provision the first `portal-admin` membership through a trusted operator/bootstrap process; do not add anonymous self-promotion or infer the role from school `admin`.
- Never trust a client-provided role or permission flag. Enforce access through the authenticated user record and route-role configuration.

## Service Patterns

- Validate request bodies and query filters with the service's Joi schemas. List routes use `RestApiUtils.buildFilterFromReq` and return `{ data, meta }`.
- Service configuration declares references, projections, and notification payloads. Populate/expand references through `ReferencesUtils` and the corresponding `*Rest` service.
- Mutations generally follow validate, load config, populate references, translate, perform the database operation, raise an event, then raise a notification. Preserve rollback behavior for multi-step signup/invite flows.
- User invitations go through `UsersAuthSignupService.invite`: new users receive the signup/reset-password message; existing users receive the invite message. Every invitation (school roles and `portal-admin`) uses `UsersAuthRest.invite` / `POST /users-auth/invite` with the school taken from the selected tenant; do not add school-specific invite routes. The local-call mapping for `UsersAuthRest.signup`/`invite` is `users-auth.local.js`; the email sender is `UsersAuthService.sendInvite`.
- School creation stays in `UsersAuthSignupService.signup`, which creates the school through `SchoolsRest` and invites the first admin. Do not duplicate it with a public schools signup route or service.
- Status and role transitions should follow the owning service constants. Do not duplicate literal status policy across controllers and UI when a constant/helper already exists.
- Add short section comments in the existing block-comment style when they explain a boundary or non-obvious invariant; add comments for the next statements, with clear explainations; add if it separates flows.

## UI Patterns

- Derive page/menu permissions with `getRolesPermissions` from the selected active school membership. Also protect privileged routes with the router guard; backend checks remain authoritative.
- Reuse the `ApiTableServer` and `ComponentsUtils.Edit` patterns for CRUD pages. Use existing invite flows for user-backed records rather than making duplicate user-creation endpoints.
- Keep API methods in `ui/src/api/api.js` and use translations from `ui/src/translations/` for visible labels.

## Tests

- Service tests live in `src/test/test/<service>/`, use Sinon stubs, and are registered by the service's `*.all.tests.js` file. Add tests for success, validation, dependency failures, and authorization/invariants appropriate to the change.
- Auth route behavior belongs in `users-auth.service.validate.test.js`; public controller behavior belongs in the owning controller test suite.
- Run a focused Mocha file or suite first. The backend's complete unit suite is `cd src && npm test`; database-backed functional tests use `npm run testdb` and require MongoDB.
- UI scripts are in `ui/package.json`; validate Vue changes with `npm run build` if the lint command is unavailable.
