# Security

The security model of the project. The short version is in the [project README](../README.md#security-first), and each layer is listed in the [detailed README](../README.details.md#security-model). This page is the home for the longer guides.

## The model in one paragraph

**Zero trust.** Nothing is trusted because of where it comes from, what the UI shows, or what an earlier request proved. Every request is authenticated (an HttpOnly cookie) and authorized (membership of the school in `x-tenant-id`, then the role's permission for the exact route). Services authenticate each other. A school's data is separate from every other school's. Only admins invite, and a portal admin cannot see inside the schools.

## Where things are enforced

| Concern                           | Where                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Which role may call which route   | `src/services/config.roles.json`, checked by `src/services/users-auth/`                                               |
| The tenant of a request           | The auth middleware resolves it from the verified membership into `req._ctx`                                          |
| Service-to-service calls          | `src/core/utils/rest-communications.utils.js`, with the service token checked by `service2service-auth.middleware.js` |
| Input validation                  | Joi validators in each service; list filters in `src/core/utils/rest-api.utils.js`                                    |
| Cookie and token                  | `src/core/utils/jwt.utils.js` and `src/services/users-auth/`                                                          |
| Web server hardening              | `src/core/web-server/` (CORS, security headers, HTTPS redirect, rate limits)                                          |
| Who may invite or hold which role | `src/services/users-auth/users-auth.signup.service.js` and `users-auth.service.js`                                    |
| Logs                              | `CommonUtils.protectData` masks the secrets of what is logged; a public form logs its decision, not the address       |

## Review method and design guarantees

- **Review method** (what to examine, how to attack the API locally, how to report): [README.review-guide.md](../README.review-guide.md).
- **Design guarantees and how they are checked**: [README.design-invariants.md](../README.design-invariants.md).

## Reporting a problem

Please do not open a public issue for a security problem. Contact the maintainer privately. _The contact address and the disclosure process: to be added._

## Placeholders

These sections will be added.

- **Hardening checklist for a deployment** (secrets, cookie and HTTPS settings, proxy and rate-limit settings, mail, database access, dependencies): _to be added._
- **Threat model** (assets, actors, trust boundaries, and what each layer is meant to stop): _to be added._
