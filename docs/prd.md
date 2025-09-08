# Faz-o-Pix Product Requirements Document (PRD)

## Goals and Background Context

### Goals
- Enable Brazilian users to easily track and split shared expenses using familiar PIX identifiers
- Provide transparent calculation of who owes whom within expense groups
- Support flexible splitting methods (equal, percentage, custom shares) for diverse use cases
- Minimize payment transactions through optional debt simplification algorithm
- Allow inclusion of unregistered participants to reduce onboarding friction
- Deliver a mobile-first, pt-BR localized experience optimized for Brazilian users
- Maintain complete settlement history with PIX reference tracking

### Background Context
Faz-o-Pix addresses the widespread challenge of expense sharing in Brazil, where PIX has become the dominant payment method with over 140 million users. Current solutions either require complex manual calculations or rely on foreign apps that don't understand Brazilian payment identifiers (CPF, CNPJ, PIX keys) or local conventions. By building a PIX-native expense splitting application, we're creating a tool that fits naturally into how Brazilians already handle money transfers, while removing the friction and disputes that arise from informal tracking methods.

The product focuses exclusively on calculation and tracking rather than payment processing, allowing us to deliver value without regulatory complexity. The ability to add unregistered participants as placeholders ensures groups can start using the app immediately without waiting for everyone to sign up, addressing a key adoption barrier in existing solutions.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-08 | 1.0 | Initial PRD creation | Agilis Master |

## Requirements

### Functional

- FR1: Users can register with a combination of full name, password, and at least one identifier (PIX key, email, or phone number)
- FR2: Users can authenticate using any of their registered identifiers plus password
- FR3: Users can create bills with name, optional description, and currency fixed to BRL
- FR4: Bill creators can toggle "simplify debts" option to minimize payment transactions
- FR5: Users can add participants to bills using PIX keys (CPF, CNPJ, email, phone, EVP), creating placeholders for unregistered users
- FR6: Users can add expenses specifying payer, amount in cents, description, date, and split configuration
- FR7: System supports three split types: equal (divide evenly), percentage (must sum to 100%), and shares (proportional distribution)
- FR8: System calculates real-time balances showing who owes whom for each bill
- FR9: When simplify debts is enabled, system provides optimized payment suggestions using min-cash-flow algorithm
- FR10: Users can record settlements between participants with amount, method (PIX/Cash/Other), and optional reference
- FR11: System validates Brazilian identifiers: CPF/CNPJ checksums, phone normalization to E.164, email RFC compliance, EVP UUID format
- FR12: Unregistered participants can claim their placeholder accounts by registering with matching identifier
- FR13: System automatically migrates bill memberships when placeholders are claimed by real users
- FR14: All monetary calculations preserve accuracy to the cent with proper rounding
- FR15: System maintains audit trail of all expense and settlement modifications

### Non Functional

- NFR1: Initial page load must complete within 3 seconds on 4G connection
- NFR2: Interactive responses must occur within 100ms for optimal user experience
- NFR3: System must support concurrent access by 1000+ active users
- NFR4: All sensitive data must be encrypted at rest and in transit using industry standards
- NFR5: System must comply with LGPD (Brazilian General Data Protection Law) requirements
- NFR6: Application must be fully responsive, working on screens from 320px to 4K resolution
- NFR7: All user-facing text must be in Brazilian Portuguese with proper currency formatting (R$ 1.234,56)
- NFR8: System must maintain 99.9% uptime during Brazilian business hours (8:00-22:00 BRT)
- NFR9: Database must enforce strict 3NF normalization for data integrity
- NFR10: API must follow RESTful principles with proper HTTP status codes and JSON responses
- NFR11: All API endpoints must include request validation using Zod schemas
- NFR12: System must never log or expose raw identifier values in plain text
- NFR13: Calculation engine must pass comprehensive test suite covering all split scenarios
- NFR14: Docker Compose setup must enable single-command local development environment
- NFR15: Session management must use secure HTTP-only cookies with CSRF protection

## User Interface Design Goals

### Overall UX Vision
The interface should feel as simple and intuitive as WhatsApp or PIX apps that Brazilian users already know. Every interaction should be optimized for mobile use with large touch targets, minimal typing, and clear visual feedback. The design should prioritize clarity over density, showing only essential information with progressive disclosure for details.

### Key Interaction Paradigms
- **Mobile-first navigation**: Bottom tab bar for primary actions, swipe gestures for common operations
- **Quick add flows**: Single-tap expense addition with smart defaults
- **Real-time updates**: Instant balance recalculation as expenses are added
- **Visual debt representation**: Color-coded balances (green for credit, red for debt)
- **One-thumb operation**: Critical actions reachable with thumb on mobile devices

### Core Screens and Views
- **Login/Register Screen**: Unified auth with identifier selection
- **Bills Dashboard**: List of active bills with balance summaries
- **Bill Detail View**: Expenses list, participants, and current balances
- **Add Expense Modal**: Quick entry with participant selection and split options
- **Balances View**: Who owes whom with optional simplification toggle
- **Settlement Recording**: PIX reference capture and confirmation
- **Participant Management**: Add/remove participants, view placeholder status
- **User Profile**: Manage identifiers and account settings

### Accessibility: WCAG AA
- Proper semantic HTML for screen readers
- Sufficient color contrast ratios (4.5:1 minimum)
- Keyboard navigation support for all interactions
- Focus indicators and ARIA labels where needed

### Branding
Clean, modern Brazilian aesthetic inspired by PIX's visual language. Use of green as primary color (associated with money/PIX in Brazil), with high contrast for financial data. Sans-serif typography optimized for readability on small screens. Subtle animations for state changes and feedback.

### Target Device and Platforms: Web Responsive
- Primary: Mobile web browsers (iOS Safari, Chrome Android)
- Secondary: Desktop browsers for detailed review/management
- Progressive Web App capabilities for app-like mobile experience

## Technical Assumptions

### Repository Structure: Monorepo
Single repository containing frontend, backend, and infrastructure code. Organized as:
```
/backend    - Fastify API service
/frontend   - Next.js application  
/prisma     - Database schema and migrations
/docker     - Container configurations
/shared     - Common types and utilities
```

### Service Architecture
**Monolithic API Service**: Single Node.js backend service handling all API endpoints. This simplifies deployment, reduces operational complexity, and is appropriate for MVP scale. The architecture supports future decomposition if needed.

### Testing Requirements
**Unit + Integration Testing**:
- Unit tests for all calculation logic, validation functions, and business rules
- Integration tests for API endpoints using test database
- Critical path E2E tests for core user flows
- Manual testing convenience endpoints for development

### Additional Technical Assumptions and Requests
- Use Fastify for performance advantages over Express
- Implement strict TypeScript with no-any rule
- Prisma for type-safe database access and migrations
- Zod for runtime validation matching TypeScript types
- React Query for optimistic updates and cache management
- Docker Compose for consistent development environment
- GitHub Actions for CI/CD pipeline
- Environment-based configuration (dev/staging/prod)
- Structured logging with correlation IDs
- API versioning strategy from day one
- Database seeding for development/testing
- Hot reload in development for both frontend and backend

## Epic List

- **Epic 1: Foundation & Authentication**: Establish project infrastructure, database, and user authentication with Brazilian identifier support
- **Epic 2: Bill Management & Participants**: Create bills, manage participants including placeholders, and handle account claiming
- **Epic 3: Expense Tracking & Splitting**: Add expenses with flexible splitting options and real-time balance calculation
- **Epic 4: Settlements & Debt Simplification**: Record settlements, implement debt simplification algorithm, and provide payment suggestions

## Epic 1: Foundation & Authentication

Establish the core project infrastructure including Docker setup, database schema, API foundation, and authentication system supporting Brazilian identifiers (PIX keys, email, phone). This epic delivers a working application where users can register and login using their preferred identifiers.

### Story 1.1: Project Infrastructure Setup

As a developer,
I want a fully configured development environment with Docker Compose,
so that I can run the entire stack locally with a single command.

#### Acceptance Criteria
1. Docker Compose configuration starts PostgreSQL, backend, and frontend services
2. Environment variables properly configured for all services
3. Hot reload working for both frontend and backend in development
4. Database automatically runs migrations on startup
5: Health check endpoints verify all services are running
6. README documents setup and run instructions
7. Git repository initialized with proper .gitignore

### Story 1.2: Database Schema and Prisma Setup

As a developer,
I want a normalized database schema with Prisma ORM configured,
so that I have type-safe database access and migration management.

#### Acceptance Criteria
1. Prisma schema defines all entities in strict 3NF: users, identifiers, participants, bills, expenses, settlements
2. Proper indexes created for performance-critical queries
3. Migration system initialized with initial schema
4. Seed script creates sample data for development
5. Database connection pooling configured
6. Prisma Client generated with full TypeScript types

### Story 1.3: Fastify API Foundation

As a developer,
I want a structured Fastify API with routing, validation, and error handling,
so that I can build endpoints following consistent patterns.

#### Acceptance Criteria
1. Fastify server configured with TypeScript, CORS, and security headers
2. Route registration system with automatic OpenAPI generation
3. Zod schemas integrated for request/response validation
4. Global error handler with proper HTTP status codes
5. Structured logging with request correlation IDs
6. Environment-based configuration system
7. Basic health check endpoint returning service status

### Story 1.4: User Registration with Identifier Validation

As a new user,
I want to register with my name, password, and Brazilian identifiers,
so that I can create an account using familiar credentials.

#### Acceptance Criteria
1. POST /api/auth/signup accepts name, password, and array of identifiers
2. Validates CPF/CNPJ with proper checksum verification
3. Normalizes phone numbers to E.164 format (+55...)
4. Validates email addresses per RFC standards
5. Validates EVP as proper UUID v4 format
6. Password hashed using Argon2id before storage
7. Returns user ID and session cookie on success
8. Prevents duplicate identifier registration

### Story 1.5: Multi-Identifier Authentication

As a registered user,
I want to login using any of my registered identifiers,
so that I have flexibility in accessing my account.

#### Acceptance Criteria
1. POST /api/auth/login accepts identifier and password
2. Identifier lookup works for all types (PIX keys, email, phone)
3. Phone number matching handles format variations
4. Password verification using Argon2id
5. Secure session cookie created on successful login
6. Rate limiting prevents brute force attacks
7. Returns appropriate error for invalid credentials

### Story 1.6: Frontend Authentication Flow

As a user,
I want a seamless authentication experience on mobile and desktop,
so that I can quickly access the application.

#### Acceptance Criteria
1. Unified login/register page with identifier type selection
2. Input masks for CPF/CNPJ and phone numbers
3. Real-time validation feedback for identifiers
4. Password strength indicator on registration
5. Loading states during authentication requests
6. Error messages in Portuguese with clear guidance
7. Successful auth redirects to bills dashboard
8. Session persistence across page refreshes

## Epic 2: Bill Management & Participants

Enable users to create and manage bills, invite participants using Brazilian identifiers, handle placeholder participants for unregistered users, and implement the claiming mechanism when placeholders register.

### Story 2.1: Bill Creation and Management

As a user,
I want to create bills and manage their basic settings,
so that I can organize different expense-sharing scenarios.

#### Acceptance Criteria
1. POST /api/bills creates bill with name, description, and simplify_debts flag
2. GET /api/bills returns user's bills with participant counts and balance summaries
3. Bill owner automatically added as first participant
4. Bills list shows creation date and last activity
5. Frontend form validates bill name as required field
6. Toggle for simplify debts option with explanation tooltip
7. Visual distinction between bills user owns vs participates in

### Story 2.2: Participant Addition with Placeholder Support

As a bill owner,
I want to add participants using their PIX keys or contact info,
so that I can include anyone regardless of registration status.

#### Acceptance Criteria
1. POST /api/bills/:id/members accepts identifier type and value
2. Creates participant record if identifier not found
3. Links to existing user if identifier matches
4. Supports all PIX key types with proper validation
5. Optional display name for placeholder participants
6. Returns participant ID and registration status
7. Frontend shows participant list with visual placeholder indicator
8. Prevents duplicate participants in same bill

### Story 2.3: Placeholder Account Claiming

As an unregistered participant,
I want to claim my placeholder account when I register,
so that my expense history transfers to my account.

#### Acceptance Criteria
1. Registration process checks for matching placeholder identifiers
2. Creates users_participants_link record on match
3. Migrates all bill_members records to claimed user
4. Preserves all expense and settlement history
5. Notification shown about claimed placeholders after registration
6. Multiple placeholders can be claimed if identifiers match
7. Frontend updates to show claimed status

### Story 2.4: Bill Dashboard and Navigation

As a user,
I want to view and navigate between my bills easily,
so that I can manage multiple expense groups efficiently.

#### Acceptance Criteria
1. Dashboard shows all bills with key metrics (balance, participants, last activity)
2. Color coding for bills with outstanding balances
3. Search/filter by bill name
4. Sort by creation date, last activity, or balance
5. Quick access to create new bill
6. Mobile-optimized list with swipe actions
7. Empty state with helpful guidance for new users

## Epic 3: Expense Tracking & Splitting

Implement comprehensive expense management with flexible splitting options, real-time balance calculation, and clear visualization of who owes whom within each bill.

### Story 3.1: Expense Addition with Flexible Splits

As a bill participant,
I want to add expenses with different splitting methods,
so that I can accurately track various payment scenarios.

#### Acceptance Criteria
1. POST /api/bills/:id/expenses accepts payer, amount, description, date, and splits array
2. Supports equal split among selected participants
3. Supports percentage split (must sum to 100%)
4. Supports custom shares for proportional distribution
5. Amount stored in cents to avoid floating point issues
6. Denormalizes split amounts on write for fast reads
7. Frontend provides intuitive split configuration UI
8. Shows real-time calculation preview before saving

### Story 3.2: Expense List and Management

As a bill participant,
I want to view and manage expenses in the bill,
so that I can track spending and make corrections.

#### Acceptance Criteria
1. GET /api/bills/:id returns expenses with full split details
2. Expenses sorted by date (newest first by default)
3. Shows payer, amount, description, and split summary
4. Visual indicators for user's involvement (paid by me, I owe)
5. Expense details expandable to show full split breakdown
6. Edit capability for expense creator (within 24 hours)
7. Delete capability with confirmation dialog
8. Running total display for all expenses

### Story 3.3: Balance Calculation Engine

As a bill participant,
I want accurate balance calculations,
so that I know exactly who owes whom.

#### Acceptance Criteria
1. GET /api/bills/:id/balances returns net positions for all participants
2. Calculates total paid minus total owed per participant
3. Generates pairwise debts from net positions
4. Handles rounding to ensure zero-sum across all balances
5. Caches calculations with invalidation on changes
6. Includes settlement adjustments in calculations
7. Returns both individual balances and suggested payments

### Story 3.4: Balance Visualization

As a bill participant,
I want clear visualization of balances and debts,
so that I understand the financial situation at a glance.

#### Acceptance Criteria
1. Balance view shows each participant's net position
2. Color coding: green for credit, red for debt, gray for settled
3. Detailed breakdown of who owes whom
4. Currency formatting in Brazilian standard (R$ 1.234,56)
5. Toggle between raw and simplified debt views
6. Visual flow diagram for payment suggestions
7. Mobile-optimized layout with collapsible sections

## Epic 4: Settlements & Debt Simplification

Implement settlement recording with PIX reference tracking and the debt simplification algorithm to minimize payment transactions, providing users with optimal payment suggestions.

### Story 4.1: Settlement Recording

As a bill participant,
I want to record when I make or receive payments,
so that I can track settlement progress.

#### Acceptance Criteria
1. POST /api/bills/:id/settlements records payment from one participant to another
2. Accepts amount in cents, method (PIX/Cash/Other), and optional reference
3. PIX reference field for transaction ID tracking
4. Validates settlement doesn't exceed actual debt
5. Updates balance calculations immediately
6. Shows settlement in transaction history
7. Frontend provides quick settlement entry with participant selection
8. Confirmation screen shows balance impact

### Story 4.2: Debt Simplification Algorithm

As a bill participant,
I want the option to simplify debts,
so that I can minimize the number of payments needed.

#### Acceptance Criteria
1. Implements min-cash-flow greedy algorithm
2. Preserves total debt amounts (zero-sum maintained)
3. Reduces number of transactions without changing net positions
4. Handles edge cases (equal debts, circular debts)
5. Performance optimized for bills with 20+ participants
6. Returns both original and simplified payment plans
7. Algorithm covered by comprehensive test suite

### Story 4.3: Payment Suggestions UI

As a bill participant,
I want clear payment suggestions when simplification is enabled,
so that I know the optimal way to settle debts.

#### Acceptance Criteria
1. Shows comparison of original vs simplified payment counts
2. Lists specific payment suggestions with amounts
3. Copy-to-clipboard for payment amounts
4. PIX key display for payment recipients
5. Mark as paid directly from suggestions
6. Explanation of how simplification works
7. Toggle to switch between original and simplified views

### Story 4.4: Settlement History and Audit

As a bill participant,
I want to view complete settlement history,
so that I can verify all payments and resolve disputes.

#### Acceptance Criteria
1. Complete settlement history with timestamps
2. Filter by participant, date range, or method
3. Shows PIX references for verification
4. Export settlement history as PDF or CSV
5. Immutable audit trail (no settlement deletion)
6. Settlement notes for additional context
7. Visual timeline of settlement progress

## Checklist Results Report

_Note: This section would be populated after running the pm-checklist validation tool_

## Next Steps

With the PRD finalized, proceed to implementation with focus on:
1. Complete LGPD compliance implementation
2. 100% Brazilian Portuguese user interface
3. Rigorous Brazilian data validation
4. Transparent personal data handling processes