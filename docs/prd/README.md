# Faz-o-Pix PRD Documentation

## Overview
This directory contains the sharded Product Requirements Document (PRD) for the Faz-o-Pix application, organized for AI agent-driven development and Story Master (SM) agent execution.

## Document Structure

### Epic Documents
Comprehensive implementation guides for each major development phase:

- **[epic-1-foundation.md](./epic-1-foundation.md)** - Foundation & Authentication
  - Project infrastructure setup with Docker
  - Database schema and Prisma ORM configuration  
  - Fastify API foundation with TypeScript
  - Brazilian identifier validation and user registration
  - Multi-identifier authentication system
  - Mobile-responsive authentication UI

- **[epic-2-bills.md](./epic-2-bills.md)** - Bill Management & Participants
  - Bill creation and management functionality
  - Participant addition with placeholder support
  - Placeholder account claiming mechanism
  - Bill dashboard and navigation interface
  - Participant management features

- **[epic-3-expenses.md](./epic-3-expenses.md)** - Expense Tracking & Splitting
  - Flexible expense addition with multiple split types
  - Real-time balance calculation engine
  - Expense list management and editing
  - Brazilian currency formatting and precision
  - Balance visualization and reporting

- **[epic-4-settlements.md](./epic-4-settlements.md)** - Settlements & Debt Simplification
  - Settlement recording with PIX reference tracking
  - Min-cash-flow debt simplification algorithm
  - Payment suggestions and optimization UI
  - Settlement history and audit trail
  - Dispute resolution support

### Reference Documents
Essential reference materials for development:

- **[functional-requirements.md](./functional-requirements.md)** - Complete functional requirements (FR1-FR15)
- **[non-functional-requirements.md](./non-functional-requirements.md)** - Performance, security, and quality requirements (NFR1-NFR15)
- **[project-context.md](./project-context.md)** - Goals, technical assumptions, and implementation guidelines

## Usage Instructions

### For Story Master (SM) Agents
Each epic document is structured for AI agent consumption with:
- Clear success criteria and dependencies
- Detailed story breakdowns with acceptance criteria
- Technical specifications and API definitions
- Implementation guidelines and business rules
- Risk mitigation and testing strategies

### For Development Teams
The sharded structure enables:
- **Focused Implementation**: Work on specific epics without context switching
- **Clear Dependencies**: Understand prerequisite work before starting
- **Comprehensive Acceptance Criteria**: Detailed validation requirements
- **Technical Guidance**: Architecture decisions and implementation patterns

### Document Relationships
```
Epic 1 (Foundation) 
    ↓ Dependencies
Epic 2 (Bills) 
    ↓ Dependencies  
Epic 3 (Expenses)
    ↓ Dependencies
Epic 4 (Settlements)
```

Each epic builds upon the previous one, with clearly defined interfaces and handoff points.

## Key Features by Epic

### Epic 1: Foundation & Authentication
- Docker Compose development environment
- PostgreSQL + Prisma database setup
- Fastify API with TypeScript and Zod validation
- Brazilian identifier validation (CPF, CNPJ, PIX keys)
- Session-based authentication with security
- Mobile-responsive authentication UI

### Epic 2: Bill Management & Participants  
- Bill creation with debt simplification toggle
- PIX identifier-based participant addition
- Placeholder system for unregistered users
- Account claiming when placeholders register
- Bill dashboard with balance summaries
- Participant management interface

### Epic 3: Expense Tracking & Splitting
- Flexible expense addition (equal, percentage, shares splits)
- Cent-accurate balance calculations
- Real-time balance updates and caching
- Brazilian currency formatting (R$ 1.234,56)
- Mobile-optimized expense entry
- Comprehensive expense history

### Epic 4: Settlements & Debt Simplification
- Settlement recording with PIX references
- Min-cash-flow algorithm for payment optimization
- Payment suggestions with copy-to-clipboard
- Immutable settlement history
- Dispute resolution support
- Export functionality (PDF/CSV)

## Technical Specifications

### Technology Stack
- **Backend**: Fastify + TypeScript + Prisma + PostgreSQL
- **Frontend**: Next.js + React + TypeScript + Tailwind CSS
- **Development**: Docker Compose + GitHub Actions
- **Authentication**: Session-based with HTTP-only cookies
- **Caching**: Redis for sessions and calculations

### Brazilian Compliance
- **Localization**: Portuguese (pt-BR) interface and content
- **Currency**: Brazilian Real with proper formatting
- **Identifiers**: Full PIX key support with validation
- **Privacy**: LGPD compliance with audit trails
- **Security**: Financial data encryption and protection

### Performance Requirements
- **Load Time**: ≤ 3 seconds on 4G connection
- **Responsiveness**: ≤ 100ms for UI interactions
- **Scalability**: Support 1000+ concurrent users
- **Availability**: 99.9% uptime during business hours

## Development Workflow

1. **Setup**: Use Epic 1 to establish development environment
2. **Foundation**: Complete authentication and infrastructure
3. **Bills**: Implement bill and participant management
4. **Expenses**: Add expense tracking and splitting logic
5. **Settlements**: Complete with payment optimization
6. **Testing**: Comprehensive testing at each epic completion
7. **Deployment**: Production deployment with monitoring

## Quality Assurance

### Testing Strategy
- **Unit Tests**: Business logic and calculations (95% coverage)
- **Integration Tests**: API endpoints and database interactions
- **E2E Tests**: Complete user workflows on mobile and desktop
- **Performance Tests**: Load testing with realistic usage patterns

### Code Quality
- **TypeScript**: Strict configuration with no-any rule
- **Linting**: ESLint with Brazilian Portuguese requirements
- **Formatting**: Prettier with consistent configuration
- **Documentation**: Comprehensive API and code documentation

## Deployment Considerations

### Security
- TLS 1.3 encryption for all communications
- Database encryption at rest
- Secure session management
- Regular security audits and penetration testing

### Performance
- CDN for static asset delivery
- Database connection pooling
- Redis caching for calculations
- Code splitting and lazy loading

### Monitoring
- Application performance monitoring
- Business metrics tracking
- Security event logging
- Compliance monitoring and alerting

## Getting Started

1. Review [project-context.md](./project-context.md) for background and technical decisions
2. Start with [epic-1-foundation.md](./epic-1-foundation.md) for initial setup
3. Reference [functional-requirements.md](./functional-requirements.md) and [non-functional-requirements.md](./non-functional-requirements.md) as needed
4. Follow each epic sequentially, completing all stories before moving to the next
5. Use acceptance criteria for validation and testing

## Support and Maintenance

This documentation structure supports:
- **Iterative Development**: Clear epic boundaries enable phased delivery
- **Quality Assurance**: Detailed acceptance criteria ensure completeness
- **Knowledge Transfer**: Comprehensive documentation reduces onboarding time
- **Maintenance**: Clear architecture enables efficient bug fixing and feature additions

For questions or clarifications, refer to the detailed technical specifications within each epic document or the comprehensive requirement references.