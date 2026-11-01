# UniEspaços Roadmap

This document outlines the strategic development plan for UniEspaços, organized by version milestones.

## 🎯 v1.x: Stabilization, Modernization & Pilot Consolidation
*Focus: Turning the MVP into a robust, high-performance, modern and reliable product for university campus pilot.*

*   **🛡️ Stability, Architecture & Quality**
    *   [x] **Bug Squashing & Reliability Campaign:**
        *   [x] Browser Tab Title (Title Tag) Not Updating Correctly (#110).
        *   [x] Reverb/Broadcasting Timeout and "Double Notification" Bug:
            *   Stabilized internal Docker broadcasting by forcing HTTP on port 9000 (`REVERB_SCHEME=http`).
            *   Implemented `ShouldQueue` on all notifications (`BaseNotification`) for resilient asynchronous queue delivery.
            *   Wrapped notification dispatches in `try-catch` to prevent external mail service failures from crashing core application jobs.
        *   [x] Reservation Week Link in Notifications: Fixed calendar navigation link parameter targeting the correct week (#222).
        *   [x] Soft Delete & Archive Separation: Implemented independent `modo_arquivo` (`ModoArquivoEnum`) distinct from evaluation status (`situacao`), with password confirmation on cancellation (#108).
        *   [x] IDOR Protection & Strict Authorization: Enforced Laravel Policies (`ReservaPolicy`, `EspacoPolicy`) + Spatie Permissions across all endpoints (#119).
    *   [x] **Stack Modernization (2026):**
        *   [x] Upgrade to React 19 (`^19.2.8`) with React DOM 19 and `@types/react: ^19.2.18`.
        *   [x] Upgrade to Tailwind CSS v4 (`^4.2.1`) using `@theme` and semantic Catppuccin color tokens (Latte / Frappé).
        *   [x] Upgrade to Inertia.js 2, Radix UI primitives, Vaul drawer, Lucide React icons, and Sonner notifications.
        *   [x] ESLint 9 Flat Config with `strict-type-checked` rules and 100% purged `eslint-suppressions.json` (Zero Tolerance Policy).
        *   [x] Strict TypeScript 5.8 type checking (`npx tsc --noEmit` passing with 0 errors).
    *   [x] **Frontend Atomic Design Restructuring:**
        *   [x] Reorganized UI codebase into `resources/js/presentation/{atoms,molecules,organisms,pages,templates}` and UI primitives in `resources/js/components/ui/`.
    *   [x] **Test Coverage & Quality Gates:**
        *   [x] Frontend test suite in Jest 30 + React Testing Library 16 (36 suites, 202 tests).
        *   [x] Backend test suite in PHPUnit 12 with `DatabaseTransactions` (190+ tests).
        *   [x] Code formatting standard with Laravel Pint 1.29.
    *   [x] **CI/CD Finalization:** Reliable GitHub Actions pipelines for automated testing, linting, and release-please versioning.

*   **⚡ Performance & Database**
    *   [x] **Database Optimization:** Optimized queries, added composite foreign keys and search indexes on `reservas`, `horarios`, `agendas` and `espacos`.
    *   [x] **N+1 Prevention:** Explicit Eager Loading and request-scoped static caching on computed model accessors (e.g. `is_favorited_by_user`).

*   **👥 User Experience & Mobile Ergonomics**
    *   [x] **Mobile-First Ergonomics:**
        *   [x] Implemented `<ResponsiveModal>`: Adaptive component switching between Vaul Bottom Drawer (mobile `< 768px`) and Radix Dialog (desktop `>= 768px`).
        *   [x] Implemented `<MobileBottomBar>`: Floating thumb-friendly bottom dock navigation with reactive notification indicators.
        *   [x] Implemented `<ReservaCard>` and touch-friendly interactive lists.
    *   [x] **Reservation Flow & Calendar UX:**
        *   [x] Fixed datepicker manual date selection and date-fns v4 localization (pt-BR).
        *   [x] Implemented "smart shift" for past slots and manual date adjustments.
        *   [x] Added dynamic alerts for recurrence and conflict detection in real time.
        *   [x] Improved weekly calendar UI with Monday start and shift grouping (Matutino, Vespertino, Noturno).
    *   [x] **Manager Auto-Approval:** Automatic approval when a space manager requests slots in their own managed spaces, suppressing redundant notification emails (#109).

---

## 🚀 v2.x: Expansion, Performance & Intelligence
*Focus: Scaling the platform, high-performance data handling, and ecosystem integrations.*

*   **⚡ High-Performance Data & UI Components**
    *   [ ] **TanStack Table Integration:** High-performance data table engine with virtualized scrolling for massive listings (spaces, audit logs, reservations).
    *   [ ] **Virtualized Search & Combobox:** Infinite scroll and debounced async virtualized selector for institutions with thousands of users and assets.
    *   [ ] **Unified Skeleton System:** Standardized loading skeleton states across all Inertia pages replacing full-page spinners.
    *   [ ] **Asynchronous Reporting Queue:** Background export generator for PDF and Excel reports with progress notifications via WebSocket.

*   **🔌 Integration & API**
    *   [ ] **RESTful API & Token Auth:**
        *   [ ] Secure API endpoints for integration with university Academic and HR management systems (#112).
        *   [ ] Standardized JSON error envelopes (`error_code`, `message`, `details`).
    *   [ ] **Calendar Synchronization:** 2-way sync with Google Calendar, Microsoft Outlook, and standard iCal feeds.

*   **📊 Analytics & Operational Insights**
    *   [x] **Manager Analytics Dashboard:** Real-time occupancy charts, peak hour distribution, and consolidated institutional indicators using Recharts.
    *   [ ] **Heatmap & Space Utilization Metrics:** Visual heatmap of underutilized spaces and recommendations for load balancing across campus modules.

---

## 🔭 v3.x: Innovation & Automation
*Focus: Autonomous resource optimization, mobile PWA capabilities, and intelligent allocation.*

*   **🧠 Intelligent & Automated Allocation**
    *   [ ] **Smart Distribution Engine:** Automatically suggest or allocate spaces based on academic departmental constraints, equipment needs, and capacity.
    *   [ ] **Customizable Availability Templates:** Manager slot template configuration (#104) and pre-approval rules for recurring academic semesters.

*   **📱 Progressive Web App (PWA) & Push**
    *   [ ] **PWA Offline Mode:** Service Worker caching for offline viewing of confirmed schedules and room details.
    *   [ ] **Web Push Notifications:** Real-time push notifications for reservation status changes, approvals, and reminders.

*   **🔮 Predictive Modeling**
    *   [ ] **Demand Forecasting:** Machine Learning models on historical booking series to forecast seasonal campus demand and optimize energy/space allocation.

---
*Last updated: August 25, 2026*
