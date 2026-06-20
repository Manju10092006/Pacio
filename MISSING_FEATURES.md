# Missing Features

Source Repository: `Nikhil03-hub/CareerOS-Partner-Intelligence`
Target Repository: Current CareerOS Platform

This file lists only source features that do not yet exist as first-class CareerOS features. Partial equivalents are included only when the missing piece affects feature parity.

## Must Implement Now

| Feature | Source File | Missing In CareerOS | Required Work |
|---|---|---|---|
| Workshop Request Flow | `src/app/college/workshops/page.tsx`, `WorkshopRequestForm.tsx`, `src/app/admin/workshops/page.tsx`, `WorkshopActionButtons.tsx`, `src/app/api/workshops/update/route.ts` | No CareerOS workshop request page, API, status workflow, or admin approval queue. | Add workshop request collection/endpoints, CareerOS-styled page, route/sidebar entries, status transitions, notifications, and audit logs. |
| Live Partner Chat | `src/app/college/comms/ChatPanel.tsx`, `src/app/api/chat/room/route.ts`, `src/app/api/chat/messages/route.ts` | CareerOS has communication logs and WebSocket infrastructure, but no chat room/message workflow. | Add chat room/message APIs and a CareerOS-styled live chat panel that reuses existing WebSocket/polling behavior. |
| Dedicated Partner Benchmarking | `src/app/college/benchmarking/page.tsx` | CareerOS has peer benchmarking inside `AnalyticsWorkbench.jsx`, but no dedicated route/page matching the source workflow. | Add dedicated benchmarking endpoint/page and sidebar entry while preserving existing analytics workbench. |

## Later Hardening

| Feature | Source File | Missing In CareerOS | Required Work |
|---|---|---|---|
| One-Click Demo Reset | `src/app/admin/settings/page.tsx`, `DemoResetButton.tsx` | Only a narrow test reset endpoint exists. | Add guarded super-admin reset that reseeds demo data or recomputes platform state. |
| Seat Allocation/Budget Page | `src/app/college/programs/page.tsx`, `seat_allocations` | Seats appear inside MOU/revenue but not as a dedicated seat allocation dashboard. | Add program seat allocation API/page or extend cohorts with seats purchased/used/remaining. |
| Report Digest Send Flow | `src/app/college/reports/DigestButton.tsx`, `src/app/api/digest/send/route.ts` | CareerOS can generate reports and notifications but lacks a one-click digest-send action. | Add digest endpoint that creates report summary and notification records. |
| MOU E-Sign Workflow | `src/app/api/mou/esign/route.ts`, `ESignButton.tsx` | CareerOS supports upload/download/renewal but not an e-sign state machine. | Add e-sign status fields and actions. |
| General AI Copilot | `src/app/college/copilot/page.tsx`, `CopilotChat.tsx` | CareerOS has AI modules but no cross-platform copilot chat. | Add scoped copilot interface over existing analytics/readiness/report data. |

