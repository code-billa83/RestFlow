# Postman Testing Guide — DevFlow API

This project ships with a ready-to-use Postman setup so you can test every endpoint
exactly like a real API consumer.

## Files included

| File | Purpose |
|------|---------|
| `DevFlow.postman_collection.json` | Complete collection — Auth, API Keys, Public API, Workflows, Webhooks, Proxy, Logs, Cron |
| `DevFlow.postman_environment.json` | Environment variables (`base_url`, `api_key`, `workflow_id`, `webhook_path`, `cron_secret`, ...) |

## Setup (2 minutes)

1. Start the app: `npm run dev` (make sure MongoDB is running and `.env` is configured).
2. Open Postman → **Import** → select both JSON files.
3. In the top-right environment picker, select **"DevFlow Local"**.
4. Set `base_url` to `http://localhost:3000` (already the default).

## Recommended test flow (follow the numbered folders)

1. **Auth → Register** — creates an account (sets the session cookie automatically in Postman).
2. **Auth → Login** — optional, re-authenticates with the same cookie jar.
3. **API Keys → Create API Key** — copy the `secret` from the response and paste it into the
   `api_key` environment variable. Also copy `key.id` into `key_id`.
4. **Public API (Bearer key) → Echo (v1)** — proves your key works against the public gateway.
   Try the `Authorization: Bearer {{api_key}}` header with a wrong key to see the 401.
5. **Workflows → Create Workflow** — the collection auto-saves `workflow_id` and
   `webhook_path` into your environment via a test script.
6. **Workflows → Toggle Workflow** — enable it (`{"action": "toggle"}`).
7. **Workflows → Run Workflow Now** — executes immediately (`{"action": "run"}`).
8. **Webhook Trigger → Trigger Webhook** — hits `/api/webhooks/{{webhook_path}}` directly.
9. **Server Proxy** — sends requests through `/api/proxy` (no CORS issues; private IPs blocked).
10. **Cron → Run Due Workflows** — set `cron_secret` in the environment first. This simulates
    the external scheduler calling `GET /api/cron` with `Authorization: Bearer <CRON_SECRET>`.

## Error cases worth testing

| Test | Expected result |
|------|---------------|
| Call `/api/v1/echo` with no `Authorization` header | `401 { "error": "Valid API key required." }` |
| Call `/api/v1/echo` with a revoked key | `401` |
| Send a body > 16 KB to `/api/v1/echo` | `413 Request too large` |
| 60+ echo requests in a minute with the same key | `429` with `Retry-After: 60` |
| 8 failed logins in 15 min from the same IP | `429` — login throttling |
| POST `/api/proxy` to `http://169.254.169.254/...` | Blocked (SSRF protection) |
| POST `/api/proxy` with an `Origin` header that does not match the host | `403` |

## Cookie sessions in Postman

Auth uses an HTTP-only cookie (`devflow_session`). Postman stores cookies per domain
automatically, so once you Register/Login, every subsequent request to `localhost:3000`
is authenticated — exactly like a browser.
