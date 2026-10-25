# DevFlow — MongoDB + Next.js SaaS Starter

Responsive starter with:
- Next.js App Router + TypeScript
- MongoDB via Mongoose
- Registration/login with bcrypt password hashing and signed HTTP-only session cookie
- Dashboard, API Playground, request logs
- API key creation/revocation (secret shown once; only SHA-256 hash stored)
- Workflow creation, enable/pause, manual run and webhook endpoint
- Dark/light theme and mobile hamburger sidebar

## Requirements
- Node.js 20.9+ (newer LTS recommended)
- MongoDB local installation OR MongoDB Atlas account
- VS Code

## Setup
1. Extract the ZIP and open the `devflow-mongodb` folder in VS Code.
2. Open Terminal > New Terminal.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Set `MONGODB_URI`, `AUTH_SECRET`, and `CRON_SECRET`.
6. Start MongoDB locally, or create a MongoDB Atlas cluster and use its connection string.
7. Run `npm run dev`, then open http://localhost:3000.

## Local MongoDB example
```env
MONGODB_URI="mongodb://127.0.0.1:27017/devflow"
AUTH_SECRET="replace-with-a-random-secret-at-least-32-characters-long"
CRON_SECRET="replace-with-a-different-random-secret-at-least-32-characters"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
MongoDB creates the database and collections when the app first writes data; no Prisma migration is needed.

## MongoDB Atlas
- Create a project and cluster.
- Create a database user (do not use your Atlas account password unless it is specifically the database user's password).
- In Network Access, allow your current IP for development.
- Click Connect > Drivers > Node.js and copy the URI.
- Replace `<db_password>` with the database user's password and set a database name such as `devflow`.
- Keep credentials out of Git and do not use `0.0.0.0/0` permanently in production.

## Run
```bash
npm run dev
```
Open `http://localhost:3000`, create an account, then test the dashboard, API Playground, API Keys and Automations.

## Scheduler
A hosting cron service must call `GET /api/cron` with:
`Authorization: Bearer YOUR_CRON_SECRET`
Do not expose the secret. Local PowerShell example:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/cron" -Headers @{ Authorization = "Bearer YOUR_CRON_SECRET" }
```

## Important production notes
This is a foundational starter, not a production-audited SaaS:
- Add rate limiting on authentication, API keys, cron and webhook endpoints.
- Generated API keys are stored hashed, but a public API gateway that authenticates those keys and enforces per-key quotas is not implemented yet.
- Basic URL blocking is not enough for arbitrary public webhooks. Add DNS/IP resolution checks, block all private/reserved address ranges, and protect against DNS rebinding/SSRF before allowing untrusted users to submit target URLs.
- Add CSRF/origin protection, email verification, password reset, account deletion, pagination, retention policies, monitoring, backups, tests and privacy/legal pages.
- Scheduled execution requires a reliable scheduler/worker; a route alone does not run periodically.
- For production workloads, use a queue, job locks, retries, idempotency and concurrency limits.
- Never commit `.env` to source control.


## Security hardening included in this build

- Security response headers and `X-Powered-By` suppression.
- MongoDB-backed fixed-window throttling for login (8 attempts / 15 min per observed IP) and registration (5 / 15 min).
- Same-origin checks on login and registration; request-size check based on Content-Length.
- API keys are stored as hashes, not plaintext.

## Important production limitations

This is a hardened starter, not a guarantee of being unhackable. Before public production launch, add rate limiting to every expensive or state-changing endpoint, use a trusted reverse proxy that overwrites forwarded-IP headers, configure a managed Redis limiter for scale, implement verified DNS/IP egress controls for webhook targets to prevent SSRF/DNS rebinding, add CSRF checks to every cookie-authenticated mutation, enforce account verification and recovery, configure MongoDB least-privilege credentials/TLS/backups, run dependency/security scans and penetration tests, and set up monitoring/alerts. Do not expose MongoDB directly to the public internet.


## Combined build additions

This ZIP combines the MongoDB starter with the security-starter files and includes an authenticated `POST /api/v1/echo` endpoint. It validates the API key against its SHA-256 hash and applies a starter rate limit.

After creating an API key in the dashboard, copy the secret (it is displayed only once) and test with:

```bash
curl -X POST http://localhost:3000/api/v1/echo \
  -H "Authorization: Bearer YOUR_DEVFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"data\":{\"hello\":\"world\"}}"
```

The project is not a security-audited production release. Rate limiting is a starter implementation, and webhook URL validation does not fully prevent DNS rebinding/SSRF. Before public launch, apply origin/CSRF checks to every cookie-authenticated mutation, harden outbound network access, use a trusted proxy or managed distributed limiter, and run tests/security review.

## API Playground proxy (any real API)

The Playground now sends requests through `POST /api/proxy` (server-side), so any public API works without CORS errors, including APIs that need `Authorization` / `x-api-key` headers. Protections: login required, same-origin check, 30 req/min per user, 15s timeout, 1 MB response cap, and private/reserved IPs are blocked at connection time (DNS-rebinding safe). Headers, bodies and query strings are never logged. For local testing only, set `ALLOW_PRIVATE_PROXY="true"` in `.env` (ignored in production).

## Test everything with Postman

Import `DevFlow.postman_collection.json` and `DevFlow.postman_environment.json` into Postman, select the **DevFlow Local** environment, and follow the numbered folders. The full walkthrough — including error-case tests (401/413/429, SSRF blocking) — is in [POSTMAN_TESTING.md](./POSTMAN_TESTING.md).
