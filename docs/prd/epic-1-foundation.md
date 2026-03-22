# Epic 1: Foundation & Authentication

## Overview
Establish the core project infrastructure including Docker setup, database schema, API foundation, and authentication system supporting Brazilian identifiers (PIX keys, email, phone). This epic delivers a working application where users can register and login using their preferred identifiers.

## Success Criteria
- Complete development environment setup with single-command startup
- Type-safe database access with Prisma ORM
- Structured Fastify API with validation and error handling
- Full user registration and authentication flow
- Brazilian identifier validation and support
- Mobile-responsive authentication UI

## Dependencies
- None (foundational epic)

## Technical Context
- Repository structure: Monorepo with /backend, /frontend, /prisma, /docker, /shared
- Service architecture: Monolithic Node.js API service
- Database: PostgreSQL with Prisma ORM
- Backend: Fastify with TypeScript
- Frontend: Next.js with React Query
- Authentication: Session-based with HTTP-only cookies

## Stories

### Story 1.1: Project Infrastructure Setup

**As a developer,**  
**I want a fully configured development environment with Docker Compose,**  
**so that I can run the entire stack locally with a single command.**

#### Acceptance Criteria
1. Docker Compose configuration starts PostgreSQL, backend, and frontend services
2. Environment variables properly configured for all services
3. Hot reload working for both frontend and backend in development
4. Database automatically runs migrations on startup
5. Health check endpoints verify all services are running
6. README documents setup and run instructions
7. Git repository initialized with proper .gitignore

#### Technical Requirements
- Docker Compose version 3.8+
- PostgreSQL 14+ container
- Node.js 18+ for backend and frontend services
- Volume mounts for source code hot reload
- Environment variable templates (.env.example)

#### Definition of Done
- `docker-compose up` starts all services successfully
- Health check endpoints return 200 status
- Code changes trigger automatic reloads
- All environment variables documented

---

### Story 1.2: Database Schema and Prisma Setup

**As a developer,**  
**I want a normalized database schema with Prisma ORM configured,**  
**so that I have type-safe database access and migration management.**

#### Acceptance Criteria
1. Prisma schema defines all entities in strict 3NF: users, identifiers, participants, bills, expenses, settlements
2. Proper indexes created for performance-critical queries
3. Migration system initialized with initial schema
4. Seed script creates sample data for development
5. Database connection pooling configured
6. Prisma Client generated with full TypeScript types

#### Entity Relationships
- `users` 1:many `user_identifiers` (PIX keys, email, phone)
- `users` 1:many `participants` (placeholder or claimed)
- `bills` 1:many `bill_members` (participants in bills)
- `bills` 1:many `expenses` (spending records)
- `expenses` 1:many `expense_splits` (how expense is divided)
- `bills` 1:many `settlements` (payment records)

#### Definition of Done
- All entities follow 3NF normalization
- Foreign key constraints properly defined
- Indexes on query-critical fields
- Migration files generate clean schema
- Seed data covers all entity types

---

### Story 1.3: Fastify API Foundation

**As a developer,**  
**I want a structured Fastify API with routing, validation, and error handling,**  
**so that I can build endpoints following consistent patterns.**

#### Acceptance Criteria
1. Fastify server configured with TypeScript, CORS, and security headers
2. Route registration system with automatic OpenAPI generation
3. Zod schemas integrated for request/response validation
4. Global error handler with proper HTTP status codes
5. Structured logging with request correlation IDs
6. Environment-based configuration system
7. Basic health check endpoint returning service status

#### Technical Architecture
- Plugin-based architecture for modularity
- Request/response schemas using Zod
- JWT or session-based authentication hooks
- Rate limiting and security middleware
- Correlation ID middleware for request tracking

#### Definition of Done
- Server starts without errors
- Health endpoint returns service status
- All requests include correlation IDs in logs
- Error responses follow consistent format
- OpenAPI documentation auto-generated

---

### Story 1.4: User Registration with Identifier Validation

**As a new user,**  
**I want to register with my name, password, and Brazilian identifiers,**  
**so that I can create an account using familiar credentials.**

#### Acceptance Criteria
1. POST /api/auth/signup accepts name, password, and array of identifiers
2. Validates CPF/CNPJ with proper checksum verification
3. Normalizes phone numbers to E.164 format (+55...)
4. Validates email addresses per RFC standards
5. Validates EVP as proper UUID v4 format
6. Password hashed using Argon2id before storage
7. Returns user ID and session cookie on success
8. Prevents duplicate identifier registration

#### Brazilian Identifier Requirements
- **CPF**: 11 digits with checksum validation
- **CNPJ**: 14 digits with checksum validation  
- **Phone**: Normalize to +55XXXXXXXXXXXX format
- **Email**: RFC 5322 compliant validation
- **EVP**: UUID v4 format validation

#### Security Requirements
- Password hashing: Argon2id with appropriate parameters
- Rate limiting: Max 5 signup attempts per IP per hour
- Input sanitization: All inputs cleaned before validation
- Duplicate prevention: Unique constraint on identifiers

#### Definition of Done
- All Brazilian identifier types validated correctly
- Password security meets industry standards
- Duplicate registration attempts rejected
- Session created on successful registration

---

### Story 1.5: Multi-Identifier Authentication

**As a registered user,**  
**I want to login using any of my registered identifiers,**  
**so that I have flexibility in accessing my account.**

#### Acceptance Criteria
1. POST /api/auth/login accepts identifier and password
2. Identifier lookup works for all types (PIX keys, email, phone)
3. Phone number matching handles format variations
4. Password verification using Argon2id
5. Secure session cookie created on successful login
6. Rate limiting prevents brute force attacks
7. Returns appropriate error for invalid credentials

#### Authentication Flow
1. Accept identifier in any format
2. Normalize identifier for lookup
3. Find user by identifier
4. Verify password hash
5. Create session and return cookie
6. Log authentication event

#### Security Measures
- Rate limiting: Max 5 login attempts per identifier per 15 minutes
- Session management: HTTP-only, secure cookies
- Brute force protection: Progressive delays
- Audit logging: All authentication attempts logged

#### Definition of Done
- All identifier types work for login
- Security measures prevent abuse
- Session management follows best practices
- Clear error messages for failed attempts

---

### Story 1.6: Frontend Authentication Flow

**As a user,**  
**I want a seamless authentication experience on mobile and desktop,**  
**so that I can quickly access the application.**

#### Acceptance Criteria
1. Unified login/register page with identifier type selection
2. Input masks for CPF/CNPJ and phone numbers
3. Real-time validation feedback for identifiers
4. Password strength indicator on registration
5. Loading states during authentication requests
6. Error messages in Portuguese with clear guidance
7. Successful auth redirects to bills dashboard
8. Session persistence across page refreshes

#### UI/UX Requirements
- Mobile-first responsive design
- Large touch targets (44px minimum)
- Clear visual feedback for validation states
- Progressive disclosure of identifier options
- Accessible form labels and error messages

#### Brazilian Localization
- All text in Portuguese (pt-BR)
- CPF/CNPJ input masks: 000.000.000-00 / 00.000.000/0000-00
- Phone input mask: (00) 00000-0000
- Currency formatting: R$ 1.234,56
- Date formatting: DD/MM/YYYY

#### Definition of Done
- Forms work seamlessly on mobile and desktop
- All validation provides immediate feedback
- Authentication state persists across sessions
- Error handling provides helpful guidance

## Technical Notes

### Performance Considerations
- Database connection pooling for concurrent access
- Efficient indexing strategy for identifier lookups
- Caching of validation results where appropriate
- Optimized Docker layers for faster builds

### Security Considerations
- Environment variables for sensitive configuration
- Secure session management with CSRF protection
- Input validation at multiple layers
- Audit logging for security events

### Testing Strategy
- Unit tests for all validation functions
- Integration tests for authentication flows
- E2E tests for critical user journeys
- Performance tests for concurrent access

---

### Story 1.7: Database Constraint Optimization

**As a developer,**  
**I want optimized database relationship constraints to make deletion operations easier and more reliable,**  
**so that I can avoid foreign key constraint violations and improve test cleanup procedures.**

#### Acceptance Criteria
1. Consistent cascade behavior across all related entities
2. Simplified deletion order without circular dependencies
3. Soft delete support for entities with complex relationships
4. Test-friendly schema with easier cleanup procedures
5. Maintained data integrity through application logic
6. Backward compatibility during migration
7. Performance benchmarks met after optimization

#### Technical Requirements
- Soft delete implementation for Participant and BillMember models
- Updated foreign key constraints with SetNull behavior
- Application-level validation for data integrity
- Comprehensive migration strategy with rollback procedures
- Optimized test cleanup without foreign key dependencies

#### Database Changes
- Add `isDeleted` and `deletedAt` fields to Participant and BillMember
- Remove problematic `onDelete: Cascade` constraints
- Implement `onDelete: SetNull` for UserParticipantLink relationships
- Add proper indexes for soft delete queries

#### Definition of Done
- All foreign key constraints optimized for easier deletion
- Soft delete implementation complete and tested
- Test cleanup procedures simplified and reliable
- Migration scripts tested and documented
- Application logic updated to handle new constraints
- Performance benchmarks met
- Documentation updated with new patterns

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|---------|------------|
| Brazilian identifier validation complexity | High | Comprehensive test suite with edge cases |
| Session management security | High | Use established patterns and libraries |
| Development environment complexity | Medium | Detailed documentation and scripts |
| Performance with connection pooling | Medium | Load testing and monitoring |