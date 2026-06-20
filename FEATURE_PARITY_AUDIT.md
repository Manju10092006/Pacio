# Feature Parity Audit

Source Repository: `Nikhil03-hub/CareerOS-Partner-Intelligence`
Target Repository: Current CareerOS Platform

Audit date: 2026-06-20

## Summary

The source repository is a Next.js 14 + Supabase partner-intelligence platform. The target CareerOS platform is a React + FastAPI + Mongo/in-memory fallback platform with a broader placement-intelligence scope. Parity should therefore be judged by product capability, not by matching framework files.

CareerOS already implements most mandatory partner-intelligence capabilities through FastAPI endpoints, role pages, notification logs, audit logs, document storage, reports, health scores, FDP management, MOU workflows, revenue workflows, team invites, and placement/recruiter/student intelligence.

Remaining gaps are focused on source-specific partner workflows:

- Workshop request flow
- Dedicated benchmarking route
- Live account-manager chat equivalent
- One-click demo/reset control
- Seat allocation and budget tracking as a first-class page

## Repository-Wide Comparison

| Feature Name | Source File | Purpose | Current Status in CareerOS | Required Migration Work |
|---|---|---|---|---|
| College/TPO signup and admin approval | `src/app/(public)/signup/page.tsx`, `src/app/admin/colleges/ApproveCollegeButton.tsx` | Capture institution onboarding requests and approve them centrally. | Fully Implemented | CareerOS has `/api/signup`, `/api/admin/pending-signups`, `/api/admin/approve/{user_id}`, `/api/admin/reject/{user_id}`, onboarding pending UI, and institution approval pages. |
| Login and role redirect | `src/app/(public)/login/page.tsx`, `src/middleware.ts`, `src/app/auth/callback/route.ts` | Authenticate and redirect users by role/status. | Fully Implemented | CareerOS has bcrypt auth, session cookies, role redirect, protected routes, password reset, and Google OAuth endpoints. Supabase-specific auth is not migrated because CareerOS uses FastAPI sessions. |
| College profile management | `src/app/admin/colleges/[id]/page.tsx` | View institution details, departments, partnership metadata, health score. | Fully Implemented | CareerOS has `CollegeProfile.jsx`, institution APIs, department APIs, and admin institution detail endpoints. |
| Student roster management | `src/app/college/students/page.tsx`, `src/app/admin/students/page.tsx` | Search/filter students by college, risk, readiness, department. | Fully Implemented | CareerOS has `StudentRoster.jsx`, `/api/students`, `/api/students/{student_id}`, institution isolation, student creation, and analytics. |
| Student 360 drill-down | `src/app/college/students/[id]/page.tsx` | Show student readiness, ATS, training progress, risk and activity timeline. | Partially Implemented | CareerOS has student readiness, ATS, DSA, aptitude, interviews, resume, and applications. A single unified Student 360 admin page can be enhanced later; student-facing views already cover the core data. |
| Program and cohort tracking | `src/app/college/training/page.tsx`, `src/app/admin/training/page.tsx` | Track CRT/training programs, cohorts, enrollment progress. | Fully Implemented | CareerOS has `Training.jsx`, `Cohorts.jsx`, `/api/cohorts`, `/api/training/completion`, seed cohorts, and readiness integration. |
| Per-student training completion | `src/app/college/students/[id]/page.tsx` | Show completion progress per student. | Fully Implemented | CareerOS computes training completion through `/api/training/completion` and readiness scoring. |
| Placement outcomes dashboard | `src/app/college/placements/page.tsx`, `src/app/admin/placements/page.tsx` | Track offers, CTC, companies, trends, year summaries. | Fully Implemented | CareerOS has `PlacementIntelligence.jsx`, `/api/placements/overview`, `/api/placements/intelligence`, reports, and placement records. |
| Recruiter/Promtal hiring view | `src/app/college/placements/page.tsx` | Aggregate recruiter hiring history and repeat-recruiter insight. | Fully Implemented | CareerOS has recruiter network pages, recruiter talent pool, analytics, recommendations, shortlists, saved filters, and hiring trends. |
| MOU document management | `src/app/college/mou/page.tsx`, `src/app/admin/mous/page.tsx`, `MOUUploadButton.tsx` | Store MOU documents, expiry, seats, revenue metadata. | Fully Implemented | CareerOS has `MOU.jsx`, GridFS-backed uploads/downloads, `/api/mou`, `/api/mou/upload`, `/api/mou/renew`, countdowns and revenue metadata. |
| MOU renewal history and expiry alerts | `supabase/functions/renewal-cron/index.ts` | Detect expiring MOUs and create alerts. | Fully Implemented | CareerOS has `/api/notifications/generate-alerts`, MOU renewal endpoint, notification log, and admin notification center. A scheduled external cron can call the endpoint. |
| FDP scheduling | `src/app/college/fdp/page.tsx`, `ScheduleFDPButton.tsx` | Schedule FDP sessions with date, speaker/topic, mode and capacity. | Fully Implemented | CareerOS has `FDPManagement.jsx`, `/api/fdp/sessions`, `/api/fdp/schedule`, and role routes. |
| FDP attendance | `src/app/admin/fdp/MarkAttendanceButton.tsx` | Mark and analyze attendance for FDP sessions. | Fully Implemented | CareerOS has `/api/fdp/attendance`, attendance percent calculation, session detail UI. |
| Downloadable reports | `src/app/college/reports/page.tsx`, `src/app/api/reports/generate/route.ts` | Generate placement/training/revenue/executive reports. | Fully Implemented | CareerOS has PDF and CSV report endpoints, manifests, board packet JSON, and reports UI. |
| Co-branded report option | `GenerateReportButton.tsx` | Generate partner-branded report templates. | Partially Implemented | CareerOS report PDFs use CareerOS institutional branding. A per-report co-brand toggle is not first-class yet. |
| Automated digest report | `DigestButton.tsx`, `src/app/api/digest/send/route.ts` | Generate and notify a periodic executive digest. | Partially Implemented | CareerOS has reports, notifications, analytics, and AI summaries. A dedicated digest-send endpoint/page is missing. |
| Revenue share visibility | `src/app/college/revenue/page.tsx`, `src/app/admin/revenue/page.tsx` | Show share amount, payouts, approval status. | Fully Implemented | CareerOS has `Revenue.jsx`, `/api/revenue/me`, `/api/revenue/share`, `/api/revenue/approve-payout`, MOU payout metadata. |
| Payout approval | `ApprovePayoutButton.tsx` | Admin approves pending payouts. | Fully Implemented | CareerOS has `/api/revenue/approve-payout` with audit logging. |
| Communication log | `src/app/college/comms/page.tsx`, `LogCommButton.tsx` | Log meetings, notes, calls, follow-ups. | Fully Implemented | CareerOS has `CommLog.jsx`, `/api/comm-log` CRUD endpoints, filters, timeline/table views. |
| Live chat | `ChatPanel.tsx`, `src/app/api/chat/room/route.ts`, `src/app/api/chat/messages/route.ts` | Real-time TPO/account-manager chat via Supabase Realtime. | Missing | Implement CareerOS-native chat/messages endpoints and UI using existing FastAPI/WebSocket architecture. |
| Multi-user RBAC | `src/app/admin/users/page.tsx`, `InviteUserButton.tsx`, `ToggleStatusButton.tsx` | Invite and manage users by role/status. | Fully Implemented | CareerOS has `TeamInvites.jsx`, `/api/invite`, `/api/institution/users`, `/api/users/toggle-status`, protected routes, JWT claims. |
| Account manager role | `users.role`, admin layout files | Skill Tank manager responsible for assigned colleges. | Partially Implemented | CareerOS roles differ: `super_admin`, `institution_admin`, `tpo`, `faculty`, `student`, `recruiter`. Account-manager behavior maps mostly to super admin/platform. A dedicated role could be added later if needed. |
| Notifications center | `src/app/admin/notifications/page.tsx`, `src/app/college/notifications/page.tsx` | In-app notifications, broadcasts, read status. | Fully Implemented | CareerOS has `Announcements.jsx`, `/api/admin/notifications`, `/api/notifications/broadcast`, `/api/notifications/mark-read`, platform notification cards. |
| Email and Telegram dispatch | `supabase/functions/notify-dispatch/index.ts` | Send external alerts and log delivery status. | Fully Implemented | CareerOS has `notification_service.py` with email/Telegram fan-out and `notification_log`. |
| Renewal cron/background job | `supabase/functions/renewal-cron/index.ts` | Scheduled expiry scan. | Partially Implemented | CareerOS has callable alert generation. Vercel/Scheduler cron wiring is not in repository. |
| Central admin panel | `src/app/admin/page.tsx` and admin subroutes | Executive command center for all platform operations. | Fully Implemented | CareerOS has `PlatformControl.jsx`, admin institution panel, analytics, placements, notifications, reports, MOU/FDP/revenue/team routes. |
| Platform activity feed | `activity_events` consumers | Event stream for timelines and audit context. | Fully Implemented | CareerOS has `audit_logs`, `notification_log`, platform activity cards, and WebSocket broadcast events. |
| College health score | `src/app/api/health-score/[collegeId]/route.ts`, `college_health_history` | Compute health score from readiness/training/placement/revenue. | Fully Implemented | CareerOS has `/api/health-score/{institution_id}`, `/api/admin/recompute-health`, `college_health_history`. |
| Benchmarking vs partner colleges | `src/app/college/benchmarking/page.tsx` | Compare institution metrics against partner averages/top bands. | Partially Implemented | CareerOS includes peer benchmarking inside `AnalyticsWorkbench.jsx`; dedicated benchmark page and API are missing. |
| College leaderboard | `src/app/admin/analytics/page.tsx` | Rank colleges by health and outcomes. | Fully Implemented | CareerOS analytics engine and platform stats expose institution/recruiter/placement intelligence. |
| Department analytics | `src/app/college/department-analytics/page.tsx` | Compare departments by readiness, CGPA, placement and risk. | Fully Implemented | CareerOS analytics, roster, outcomes, DSA, aptitude and ATS pages support department-level intelligence. |
| Budget/seat tracking | `src/app/college/programs/page.tsx` | Show seats purchased/used/remaining by program. | Partially Implemented | CareerOS exposes seats in MOU and revenue data. A dedicated budget/seat table is not first-class. |
| Workshop request flow | `src/app/college/workshops/page.tsx`, `WorkshopRequestForm.tsx`, `src/app/admin/workshops/page.tsx`, `WorkshopActionButtons.tsx`, `src/app/api/workshops/update/route.ts` | Let colleges request workshops and platform admins approve/review/schedule them. | Missing | Implement CareerOS-native workshop API, page, navigation entries and notifications. |
| Global search Cmd+K | `src/components/shared/GlobalSearch.tsx` | Search across students, colleges, MOUs, placements. | Partially Implemented | CareerOS has command palette UI in `RoleLayout.jsx`; a backend global-search endpoint can be added later for deeper search. |
| One-click demo reset | `src/app/admin/settings/page.tsx`, `DemoResetButton.tsx` | Restore demo data for judging. | Missing | Implement admin demo reset API/UI if needed; current `/api/test/reset-pending` is test-only and narrow. |
| AI copilot | `src/app/college/copilot/page.tsx`, `CopilotChat.tsx` | Ask questions over partner data. | Partially Implemented | CareerOS has AI service, readiness engine, ATS/interview feedback, career recommendations. A general copilot chat UI is not first-class. |
| AI interview simulator | `src/app/college/interview/page.tsx` | Mock interview scoring and feedback. | Fully Implemented | CareerOS has student interview room, history, AI feedback, and interview intelligence. |
| ATS analyzer | `src/app/api/ats/analyze/route.ts`, `ATSAnalyzer.tsx` | Analyze resumes and produce ATS recommendations. | Fully Implemented | CareerOS has ATS upload, resume versions, heatmap, latest report, student ATS UI, and readiness integration. |
| Student prediction | `src/app/api/students/predict/route.ts`, `PlacementPredictorModal.tsx` | Predict student placement risk/readiness. | Fully Implemented | CareerOS has readiness engine, `/api/students/{student_id}/prediction`, `/api/students/predict`. |
| Reports create/generate APIs | `src/app/api/reports/create/route.ts`, `src/app/api/reports/generate/route.ts` | Persist generated report metadata and summaries. | Fully Implemented | CareerOS has `/api/reports/create`, `/api/reports/generate`, PDF/CSV exports. |
| MOU e-sign action | `src/app/api/mou/esign/route.ts`, `ESignButton.tsx` | Start or mark e-sign process. | Partially Implemented | CareerOS has MOU renew/upload/download. E-sign is not a dedicated workflow. |
| Supabase schema and RLS | `supabase/migrations/*.sql`, `src/lib/supabase/*` | PostgreSQL schema, RLS, auth helpers, storage buckets. | Not Applicable | CareerOS uses FastAPI auth/RBAC and Mongo-style collections. Do not migrate Supabase stack; preserve CareerOS architecture. |
| Supabase realtime subscriptions | `ChatPanel.tsx` | Live chat updates. | Missing | Implement via CareerOS WebSocket or polling endpoints. |
| Supabase Edge Functions | `supabase/functions/*` | Background notification and renewal jobs. | Not Applicable | CareerOS uses FastAPI endpoints and notification service. Cron wiring can be added via Vercel cron later. |
| Seed scripts and demo users | `scripts/seed.ts`, `scripts/create-demo-users.ts` | Populate rich partner data. | Fully Implemented | CareerOS has `seed_data.py` with institutions, students, placements, recruiters, DSA, aptitude, and partner data. |

## Category Status

| Category | Status |
|---|---|
| Frontend pages | Mostly implemented; missing workshop page, dedicated benchmarking page, chat panel. |
| React components | Mostly implemented in CareerOS visual system; source components should not be copied directly. |
| Dashboards | Fully implemented; CareerOS has broader dashboards than source. |
| Hooks | Not applicable; target uses React state/effects and API client instead of source Supabase hooks. |
| Utilities | Partially equivalent; target API/auth utilities replace Supabase helpers. |
| API integrations | Mostly implemented; missing workshop and chat APIs. |
| Supabase usage | Not migrated by design; target architecture is FastAPI/Mongo. |
| Authentication flows | Fully implemented plus Google/password reset. |
| Database schemas | Mostly implemented as Mongo collections; Supabase RLS schema not copied. |
| Realtime subscriptions | Partially implemented via WebSocket manager; chat-specific realtime missing. |
| Notification systems | Fully implemented. |
| Analytics engines | Fully implemented with placement/readiness/recruiter/institution analytics. |
| AI modules | Fully implemented for readiness, ATS, interviews, recommendations; generic copilot partial. |
| Placement intelligence | Fully implemented. |
| Recruiter intelligence | Fully implemented. |
| Institution intelligence | Fully implemented. |
| Student intelligence | Fully implemented and broader than source. |
| Communication systems | Partially implemented; communication log exists, live chat missing. |
| Workflow automations | Partially implemented; alert generation exists, scheduled cron not configured in repo. |
| Background jobs | Partially implemented as callable endpoints; Vercel cron/worker layer not configured. |

