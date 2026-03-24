# Research Notes - autodev/mar24

## Current State Assessment

### Backend (Fastify + TypeScript + Prisma)
- **Routes implemented**: auth (signup/login/logout/me), bills (full CRUD), expenses, settlements, balances, participants, health
- **Services**: balanceCalculator, changelogService, claimingService, deleteService, expenseService
- **Tests**: 53/187 passing (74 blocked by missing PostgreSQL, rest need investigation)
- **Build**: TypeScript compiles

### Frontend (Next.js 14 + React 18 + Tailwind)
- **Pages**: login, signup, bills list, bill detail, privacy policy, test-theme
- **Components**: AddExpenseModal, AddExpenseModalV2, ChangelogPanel, PrivacyNotice, ThemeToggle
- **Build**: Clean (no warnings)
- **Stores**: authStore (Zustand)

### Infrastructure
- No PostgreSQL available locally (192.168.7.101 unreachable, no Docker)
- Frontend builds clean
- Backend tests for validation and auth integration pass

## Gap Analysis (PRD vs Implementation)

### Implemented (from code inspection)
- Epic 1: Foundation, DB schema, API foundation, auth, frontend auth
- Epic 2: Bill creation, participant management (add/remove), placeholder support
- Epic 3: Expense creation with splits, expense listing, balance calculation
- Epic 4: Settlement recording, balance display, settlement history

### Missing / Incomplete Features

#### Priority 1: Frontend Polish (no DB needed)
1. **Expense management UI** - AddExpenseModalV2 exists but may not be fully integrated
2. **Balance visualization** (Story 3.4) - Need to verify bill detail page shows balances properly
3. **Payment suggestions UI** (Story 4.3) - Copy-to-clipboard PIX details, suggested payments
4. **Settlement history UI** (Story 4.4) - Settlement audit trail in bill detail view

#### Priority 2: Backend Improvements (testable with unit tests)
1. **Balance calculator edge cases** - Verify cent-precision, zero-sum validation
2. **Debt simplification** - Verify min-cash-flow algorithm correctness
3. **Validation edge cases** - EVP format, phone normalization edge cases

#### Priority 3: New Features from README "Next Steps"
1. **Export to PDF/Excel** - Utility feature, can be implemented as frontend-only
2. **Recurring expenses** - Backend + frontend feature
3. **Analytics/reports** - Frontend data visualization
4. **Notifications** - Push/email (requires external service)

## Recommended Implementation Order

1. **Frontend: Complete balance visualization and payment suggestions** - High user value, no DB needed for development
2. **Unit tests: Balance calculator and debt simplification edge cases** - Can test without DB
3. **Frontend: Settlement history improvements** - Polish existing feature
4. **Frontend: PDF export** - Self-contained utility
5. **Backend: Recurring expenses** - New feature requiring DB
