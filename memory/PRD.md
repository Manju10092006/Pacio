# CareerOS · Campus Intelligence — PRD (v2)

## Original problem statement
Build CareerOS — the operating system for placement intelligence. Multi-role (super_admin, institution_admin, tpo, faculty, student, recruiter), 13 modules (Student/Training/DSA/Aptitude/Mock Interview/ATS/Placement/Recruiter/Applications/Interview scheduling/Announcements/Reports), real KMIT placement data (2017-18 → 2025-26), editorial light-theme premium $100M-feel SaaS, GSAP cinematic landing, JWT auth + RBAC, distinct role-based workspaces. Fix the v1 bug where every role landed on the same dashboard.

## Roles → Workspaces
| Role | Home | Modules accessible |
| --- | --- | --- |
| super_admin | `/platform` | Institutions, Recruiter network, Placement layer, Broadcasts, Notification log |
| institution_admin | `/institution` | Overview, Profile, Departments, Programs, MOU, Announcements |
| tpo | `/tpo` | Mission control, Outcomes, Applications, Drives, Roster, Cohorts, Training, DSA, Aptitude, ATS, Interviews, Recruiters, MOU, Broadcasts |
| faculty | `/faculty` | My batches, Students, Training, DSA, Aptitude, Interviews |
| student | `/student` | Personal home, DSA tracker, Open drives, My applications, Announcements |
| recruiter | `/recruiter` | Overview, Open roles, Talent pool, Pipeline |

## What's been implemented (v2 — 2026-01-18)
### Backend (`/app/backend/`)
- `server.py` — 50+ endpoints across 13 modules, full RBAC, institution isolation
- `auth.py` — bcrypt + RBAC dependency (require_roles, require_same_institution)
- `seed_data.py` — 6 institutions across streams (Engineering, Management, Pharmacy, Medical, Degree, Diploma), 470 students with full profiles, 19 Striver A2Z topics (455 problems), 4 aptitude sections, 22 recruiters, ~70 jobs, ~880 applications, 7 announcements, MOU + comm log
- `notification_service.py` — SendGrid + Telegram fan-out (simulated when keys absent — logged to admin notification feed)
- Real KMIT placement records 2017-18 → 2025-26 (148 cos / 702 offers / ₹8.26L avg / ₹80L Amazon top in 2025-26)
- 7 seeded demo users (all password `careeros2026`): admin, institution, tpo, faculty, student, recruiter + tpo@vasavi.ac.in (pending, demos approval flow)

### Frontend (`/app/frontend/src/`)
- `pages/Landing.jsx` — cinematic light-theme landing with GSAP char-by-char hero reveal, pinned story section (4 pain points), 10-card module bento, decade-of-placements grid, recruiter ledger, dark CTA
- `pages/Login.jsx` — email+password + 6 demo buttons (one per role) + Google OAuth + 30ms wait fix for setState→navigate race
- `layouts/RoleLayout.jsx` + `layouts/roleConfig.js` — generic dashboard shell, sidebar configured per role with section groupings and role-tinted accent
- `App.js` — ROLE_HOME redirect map ensures each role lands in their own workspace
- Module pages: PlatformControl, Overview (TPO/Institution), StudentHome, StudentDSA (interactive +/-), DSAIntelligence, AptitudeIntelligence, ATSIntelligence, InterviewIntelligence, Applications (pipeline + stage PATCH), Jobs, Recruiters, RecruiterHome, TalentPool, Announcements, MOU, CollegeProfile, AdminPanel
- Typography: Cabinet Grotesk display, Fraunces serif, JetBrains Mono numerals, Satoshi body; accent #FF3B00 (light) or per-role tint

## Testing (`/app/test_reports/iteration_2.json`)
- Backend pytest: 32/32 PASS (after DSA_TOTAL fix)
- Frontend: All 6 role logins land on the correct workspace; role isolation enforced (TPO blocked from /platform); student DSA tracker fully interactive; KPI testids present

## Known issues
- Mobile sidebar exists but burger menu UX is rough
- MOU upload stores metadata only (no GridFS); fine for demos
- Recruiter pipeline only shows aggregate (not yet filtered per recruiter_id when multiple recruiter accounts exist)

## P1 backlog (next session)
- PDF/CSV exports for reports
- Real-time interview scheduling with calendar
- Faculty-scoped DSA/aptitude views (currently institution-wide)
- Multi-user invites per institution
- Direct chat between TPO ↔ Skill Tank account manager
- Wire actual SendGrid + Telegram keys to flip simulated → sent
- Mobile burger drawer polish

## P2 backlog
- Anonymized institution benchmarking
- Co-branded report templates
- Weekly digest emails
- MOU e-signature
- Workshop request flow from TPO portal
- Student drill-down route from any roster row

## Deployment
- Frontend → Vercel; Backend → Render/Railway; MongoDB → Atlas free
- Required env: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEFAULT_DEMO_PASSWORD`, `EMERGENT_AUTH_URL`. Optional: `SENDGRID_API_KEY`, `SENDER_EMAIL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
