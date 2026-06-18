# CareerOS Campus Intelligence — Test Credentials

Demo users seeded automatically on backend startup. No Google OAuth needed for testing — use the `/api/auth/dev-login` endpoint or the demo dropdown on the Login page.

## Pre-seeded accounts

| Email | Role | College | Approved | Use case |
| --- | --- | --- | --- | --- |
| admin@careeros.app | super_admin | – | yes | Approve TPOs, view all colleges, notification log |
| tpo@kmit.in | tpo | KMIT (col_kmit_main) | yes | Primary TPO command center (KMIT real data) |
| hod.cse@kmit.in | hod | KMIT | yes | Department-level view |
| coord@kmit.in | coordinator | KMIT | yes | Coordinator login |
| tpo@vasavi.ac.in | tpo | Vasavi (pending) | **no** | Demonstrates pending-approval flow |

## Dev login (testing)
```
POST /api/auth/dev-login   { "email": "tpo@kmit.in" }
→ Sets Set-Cookie: session_token=...; reuse cookie for all subsequent calls
```

## Google OAuth (real flow)
Frontend `/login` → "Continue with Google" → Emergent-managed Google Auth → `/app/overview#session_id=...`
Backend `/api/auth/session` exchanges session_id and sets cookie.

## Notes
- Backend seeds KMIT placement data (2017-18 → 2025-26) + 120 synthetic students + 5 cohorts + MOU.
- SendGrid + Telegram are wired but optional — without keys, notifications are logged as `simulated` in the admin Notification log.
