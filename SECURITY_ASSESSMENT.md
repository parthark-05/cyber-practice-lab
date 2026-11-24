# Security Assessment

**Date:** 2026-11-24  
**Target:** Cyber Practice Lab source code and a local API instance  
**Scope:** Defensive code review and non-destructive local request checks. No public host, production service, or live Supabase data was tested.

## Checks performed

- Reviewed authentication, one-time setup codes, session cookies, class join codes, input validation, CORS, API errors, and database access.
- Ran `npm audit --audit-level=moderate` for both frontend and backend: no reported dependency vulnerabilities.
- Ran frontend lint and production build, backend syntax checks, and Prisma schema validation: all passed.
- Sent local requests for health, unauthenticated progress, invalid activation input, malformed JSON, an oversized JSON body, disallowed-origin preflight, and repeated activation attempts.
- Local results: health `200`; protected progress `401`; invalid activation `400`; malformed JSON `400`; oversized body `413`; sixth repeated activation attempt `429`.

## Finding fixed

**One-time account activation could race — fixed in this assessment.** Two concurrent requests could both verify the same unused setup code before either saved a password. Student and faculty activation now consume the code through a conditional database update; only the request that changes the unused account can succeed.

## Remaining deployment risks

1. **Rate limiting is in memory (Medium).** Limits reset on restart and are separate on each server instance, so they are not a durable control on a multi-instance deployment. Use a shared limiter at the hosting edge or a shared store before exposing authentication publicly.
2. **Legacy class codes remain accepted (Low).** Eight-character codes are retained for compatibility; newly generated codes are longer. Regenerate any old codes before using real class data, and keep the lookup limiter shared in a public deployment.
3. **Production cookie and transport settings depend on deployment (High if misconfigured).** The session cookie gets `Secure` only when `NODE_ENV=production`. Host the app and API over HTTPS and set production mode, `FRONTEND_ORIGIN`, and the API URL correctly.
4. **Seed output contains one-time setup codes (Medium operational risk).** The seed command prints newly generated demo setup codes. Keep seed execution and its logs restricted; do not seed real student or faculty identities.
5. **Security response headers are not set by the API (Low).** Configure suitable browser security headers, including frame protection and a policy appropriate to the frontend, at the web host or reverse proxy.

## Limits

This is not a complete penetration test or a certification. The local probes used an unreachable dummy database URL and made no database writes. Successful login, session renewal/revocation, database authorization, HTTPS cookie behavior, hosted configuration, and browser-level testing against a deployed site were not exercised. Those checks require a dedicated test deployment and authorization for its host.
