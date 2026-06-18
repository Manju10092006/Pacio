# CareerOS · Campus Intelligence — PRD

## Original problem statement
Build a world-class B2B SaaS product called **CareerOS Campus Intelligence** — an AI-powered Placement Intelligence Platform for colleges, TPOs, HODs, placement coordinators and Skill Tank administrators. Editorial light theme. Premium, GSAP-heavy landing. Real KMIT placement data (kmit.in/placements/placement.php) seeded across 2017–18 → 2025–26. Top 7 must-have features built end-to-end.

## User personas
1. **Super Admin** (Skill Tank platform team) — approves colleges, monitors fan-out, overrides data.
2. **TPO** (Training & Placement Officer) — operates the institutional command center.
3. **HOD** (Department Head) — department-scoped roster + outcomes view.
4. **Coordinator** — operational support for TPO.

## Core requirements (static)
- Light-theme, editorial, premium SaaS aesthetic.
- React + FastAPI + MongoDB stack.
- Emergent-managed Google OAuth + 4-role RBAC + admin approval gating.
- Real KMIT placement data seeded on first boot, no empty states.
- SendGrid + Telegram notification fan-out (simulated when keys absent, logged in admin panel).
- GSAP-driven landing page with progressive scroll storytelling.

## What's been implemented — v1.1 (2026-01-18 · evening)
- **DESIGN PIVOT 2** — Brought back the editorial light theme (per user feedback that orange-black wasn't premium enough) with a refined palette: warm cream `#F4F0E8` paper, rich near-black `#0E0E10` ink, **electric cobalt `#1538C8`** signature accent (not generic SaaS blue — single saturated solid), molten amber `#D97706` secondary. Headings use italic Fraunces serif inside Cabinet Grotesk display (e.g. "Good morning, *Dr. Neil*.")
- **LANDING UPGRADE** — Full rewrite:
  - GSAP twinkling **starfield** (90 animated cobalt stars) over the hero
  - Real **brand SVG logos** (Amazon, Google, Microsoft, Salesforce, Adobe, ServiceNow, Cisco, Oracle, Intuit, Deloitte, Accenture, Infosys, Walmart, Nvidia, SAP, Uber, Atlassian, TCS) via simpleicons CDN — monochromatic ink filter on the marquee
  - **Magnetic CTA buttons** that follow the cursor
  - Scroll-driven H1 scale-down + opacity fade
  - Parallax depth on the 9-year decade-of-data tiles
  - Pinned 7-feature reveal with staggered slide-in
  - Italic-serif word flourishes throughout ("placement intelligence.", "institutional", "the most selective", "outcomes.")
  - Animated NumberTickers (GSAP scroll-triggered)
- **DASHBOARD POLISH** — Cobalt + amber chart colors, italic serif name flourish in Overview greeting, sparkline gradient updated to cobalt.
## What's been implemented — v1.0 (2026-01-18 · morning)
- **Backend** (`/app/backend/server.py`) — 22/22 backend tests passing
  - Cookie-based session auth + `/api/auth/dev-login` for instant role testing
  - `/api/auth/session` exchanges Emergent OAuth `session_id` for cookie
  - Feature endpoints: signup, college, students (CRUD + search), cohorts, placements/overview, training/completion, MOU upload/get
  - Admin endpoints: pending-signups, approve/reject, all colleges, notification log, test-notification
  - Public `/api/public/landing-stats` for landing page
- **Notification service** (`notification_service.py`) — SendGrid + Telegram fan-out, logs every event to `notification_log` (status: sent/simulated)
- **Seed data** (`seed_data.py`) — KMIT real placement records (90+ rows across 9 academic years), aggregate year summaries, 120 synthetic students across CSE/IT/CSE-AIML/CSE-DS, 5 cohorts (CRT/IM/FDP/DSA/APT), MOU, communication log, 5 demo users
- **Frontend** — Editorial light theme, Fraunces + Cabinet Grotesk + JetBrains Mono typography, accent #FF3B00
  - Landing page (`Landing.jsx`) — full-screen hero with GSAP slice reveals, scramble text, recruiter marquee, parallax stats strip, pinned 7-feature reveal, recruiter ledger, dark CTA section
  - Auth: Login (Google + demo dropdown), AuthCallback, OnboardingPending (TPO signup form)
  - Dashboard shell (`DashboardLayout.jsx`) with sidebar nav
  - 7 feature pages: Overview (KPI bento + YoY bar chart + top recruiters + dept breakdown), CollegeProfile (editable), StudentRoster (search/filter/add), Cohorts (5 cards with progress rings), Outcomes (CTC line chart + recruiter ledger), Training (avg completion + 80-row student table), MOU (renewal countdown + upload + seat/revenue stats)
  - Super Admin Panel — pending approvals table, all colleges, live notification fan-out log, test-trigger button

## Testing
- Backend: 22/22 pytest tests pass (`/app/backend/tests/test_careeros_backend.py`)
- Frontend: All pages render with real data; demo login → dashboard works after AuthProvider state fix; super-admin approval flow works end-to-end

## Demo accounts (in `/app/memory/test_credentials.md`)
- `admin@careeros.app` (super_admin)
- `tpo@kmit.in` (TPO, KMIT)
- `hod.cse@kmit.in` (HOD)
- `coord@kmit.in` (Coordinator)
- `tpo@vasavi.ac.in` (pending TPO — demos approval flow)

## Prioritized backlog
### P0 (none)

### P1 — next session
- Add the remaining 8 must-have features per problem statement (revenue-share visibility detail screen, comm log UI, multi-user invites, renewal alerts cron, downloadable PDF/CSV reports, FDP session scheduler, automated triggers on placement/FDP events with real keys, central admin override for college rosters).
- Mobile burger menu for the dashboard sidebar (currently `hidden lg:flex`).
- Persist uploaded MOU file bytes (GridFS or S3) — current upload only stores metadata.
- Pydantic body model for `POST /api/students` to validate.

### P2 — good-to-haves
- Anonymized college benchmarking
- Direct chat between TPO and Skill Tank AM
- Event/workshop request flow
- Student drill-down route
- Co-branded report templates
- Weekly digest email
- Company-college historical join view
- College leaderboard
- MOU e-signature
- Seat/budget tracking widget

### Deploy
- Vercel for frontend, Render/Railway for backend, MongoDB Atlas free tier
- Set `SENDGRID_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` env vars to activate real notifications
