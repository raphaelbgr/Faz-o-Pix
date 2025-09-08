# Project Context and Technical Assumptions

## Overview
This document provides essential context and technical assumptions for the Faz-o-Pix application development. It serves as a reference for AI agents and developers to understand the project's background, technical decisions, and implementation guidelines.

## Goals and Background Context

### Primary Goals
- Enable Brazilian users to easily track and split shared expenses using familiar PIX identifiers
- Provide transparent calculation of who owes whom within expense groups
- Support flexible splitting methods (equal, percentage, custom shares) for diverse use cases
- Minimize payment transactions through optional debt simplification algorithm
- Allow inclusion of unregistered participants to reduce onboarding friction
- Deliver a mobile-first, pt-BR localized experience optimized for Brazilian users
- Maintain complete settlement history with PIX reference tracking

### Market Context
Faz-o-Pix addresses the widespread challenge of expense sharing in Brazil, where PIX has become the dominant payment method with over 140 million users. Current solutions either require complex manual calculations or rely on foreign apps that don't understand Brazilian payment identifiers (CPF, CNPJ, PIX keys) or local conventions.

### Value Proposition
By building a PIX-native expense splitting application, we're creating a tool that fits naturally into how Brazilians already handle money transfers, while removing the friction and disputes that arise from informal tracking methods. The product focuses exclusively on calculation and tracking rather than payment processing, allowing us to deliver value without regulatory complexity.

### Key Differentiators
- **PIX-Native**: Built specifically for Brazilian payment identifiers and conventions
- **Placeholder System**: Include unregistered participants without signup friction
- **Debt Simplification**: Mathematical optimization to reduce payment complexity
- **Mobile-First**: Optimized for Brazilian mobile usage patterns
- **Local Compliance**: LGPD compliant with Brazilian financial data standards

## Technical Architecture

### Repository Structure: Monorepo
Single repository containing frontend, backend, and infrastructure code organized as:

```
/backend    - Fastify API service with TypeScript
/frontend   - Next.js React application with TypeScript  
/prisma     - Database schema, migrations, and seeds
/docker     - Container configurations for all services
/shared     - Common TypeScript types and utilities
/docs       - Documentation including this PRD
/tests      - End-to-end and integration tests
```

**Benefits of Monorepo Structure**:
- Simplified dependency management and versioning
- Shared TypeScript types between frontend and backend
- Atomic commits across multiple services
- Single CI/CD pipeline for entire application
- Easier local development setup

### Service Architecture: Monolithic API
**Decision**: Single Node.js backend service handling all API endpoints

**Rationale**:
- Simplifies deployment and reduces operational complexity
- Appropriate for MVP and early growth scale
- Easier debugging and development workflows
- Lower infrastructure costs during initial phase
- Architecture supports future decomposition if needed

**Future Considerations**:
- Service boundaries already defined in codebase structure
- Database design supports future service extraction
- API versioning enables backward compatibility during transitions

### Database Design Philosophy
**Normalization Strategy**: Strict 3NF (Third Normal Form) with selective denormalization

**Core Principles**:
- Data integrity through proper normalization
- Performance optimization through strategic denormalization
- Foreign key constraints for referential integrity
- Audit trails for all financial data
- Immutable records for settlements and expenses

**Key Design Decisions**:
- Monetary amounts stored as integers (cents) to avoid floating-point precision issues
- Expense splits denormalized for query performance
- Participant placeholders enable unregistered user inclusion
- User identifiers normalized and hashed for privacy

## Technology Stack

### Backend Technologies
- **Framework**: Fastify (chosen over Express for performance advantages)
- **Language**: TypeScript with strict configuration and no-any rule
- **Database**: PostgreSQL 14+ with Prisma ORM for type-safe access
- **Validation**: Zod for runtime validation matching TypeScript types
- **Authentication**: Session-based with secure HTTP-only cookies
- **Caching**: Redis for session storage and calculation caching

### Frontend Technologies
- **Framework**: Next.js with React 18+ for SSR and optimization
- **Language**: TypeScript with strict configuration
- **State Management**: React Query for server state and optimistic updates
- **Styling**: Tailwind CSS for mobile-first responsive design
- **Validation**: Zod schemas shared with backend for consistency

### Development Tools
- **Containerization**: Docker Compose for consistent development environment
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Testing**: Jest for unit tests, Playwright for E2E testing
- **Code Quality**: ESLint, Prettier, Husky for pre-commit hooks
- **Monitoring**: Structured logging with correlation IDs

## Brazilian-Specific Requirements

### PIX Integration and Identifiers
**Supported PIX Key Types**:
- **CPF**: 11-digit Brazilian tax ID with checksum validation
- **CNPJ**: 14-digit company tax ID with checksum validation
- **Email**: RFC 5322 compliant email addresses
- **Phone**: Brazilian mobile numbers normalized to E.164 format (+55...)
- **EVP (Chave Aleatória)**: Random UUID v4 generated by banks

**Validation Requirements**:
```typescript
// CPF validation algorithm implementation required
function validateCPF(cpf: string): boolean;

// CNPJ validation algorithm implementation required  
function validateCNPJ(cnpj: string): boolean;

// Phone normalization to +55XXXXXXXXXX format
function normalizePhoneNumber(phone: string): string;

// EVP validation as proper UUID v4
function validateEVP(evp: string): boolean;
```

### Currency and Localization
**Brazilian Real (BRL) Formatting**:
- Display format: R$ 1.234,56
- Storage format: Integer cents (123456 for R$ 1.234,56)
- Thousands separator: . (period)
- Decimal separator: , (comma)
- Currency symbol: R$ with space

**Date and Time Formats**:
- Date display: DD/MM/YYYY
- Date input: Brazilian date pickers
- Time: 24-hour format (HH:MM)
- Timezone: Brazil/Sao_Paulo (BRT/BRST)

**Language Requirements**:
- All UI text in Brazilian Portuguese (pt-BR)
- Error messages with clear, helpful guidance in Portuguese
- Email communications in Portuguese
- Legal documents and privacy policy in Portuguese

### Regulatory Compliance
**LGPD (Lei Geral de Proteção de Dados) Requirements**:
- Explicit consent for data processing
- Right to access, modify, and delete personal data
- Data portability in structured formats
- Privacy by design in all features
- Incident response procedures
- Regular compliance audits

**Financial Data Handling**:
- Immutable audit trail for all financial transactions
- Encrypted storage of sensitive identifiers
- Secure transmission of all financial data
- Compliance with Central Bank data retention requirements

## Development Environment Requirements

### Docker Compose Configuration
**Required Services**:
- PostgreSQL 14+ database with persistent volumes
- Redis 7+ for caching and session storage  
- Backend Node.js service with hot reload
- Frontend Next.js service with hot reload
- Database administration tool (optional)

**Environment Variables**:
```bash
# Database
DATABASE_URL=postgresql://user:password@db:5432/fazopix
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=<secure-random-string>
ENCRYPTION_KEY=<32-byte-encryption-key>

# Application
NODE_ENV=development
PORT=3000
API_PORT=3001
```

### Development Workflow
**Hot Reload Requirements**:
- Backend code changes trigger automatic restart
- Frontend changes reflect immediately in browser
- Database schema changes apply through migrations
- Shared types update across frontend and backend

**Database Management**:
- Automatic migration execution on startup
- Seed data loading for development
- Database reset capability for testing
- Backup and restore procedures

## Performance Considerations

### Scale Requirements
- **Concurrent Users**: Support 1000+ active users during peak hours
- **Data Volume**: Efficiently handle bills with 50+ participants
- **Response Times**: Interactive responses within 100ms
- **Calculation Performance**: Real-time balance updates for large bills

### Optimization Strategies
- **Caching**: Redis for calculation results and session data
- **Database**: Strategic indexing on query-critical fields
- **Frontend**: Code splitting and lazy loading
- **API**: Request/response compression and efficient serialization

### Monitoring Requirements
- **Performance Metrics**: Response times, error rates, throughput
- **Business Metrics**: User engagement, calculation accuracy, feature usage
- **System Metrics**: Database performance, cache hit rates, memory usage
- **Security Metrics**: Authentication failures, suspicious activities

## Testing Strategy

### Test Categories
**Unit Testing**:
- All calculation logic with edge cases
- Brazilian identifier validation functions
- Business rule validation
- Database model methods

**Integration Testing**:
- API endpoints with database interactions
- Authentication and authorization flows
- Balance calculation with complex scenarios
- Settlement recording and balance updates

**End-to-End Testing**:
- Complete user journeys from registration to settlement
- Mobile responsive behavior validation
- Cross-browser compatibility testing
- Performance testing under load

### Test Data Requirements
- Sample Brazilian identifiers (CPF, CNPJ, phone numbers)
- Various bill configurations with different split types
- Edge cases for calculation testing
- Large datasets for performance testing

## Security Considerations

### Data Protection
- **Encryption at Rest**: Database encryption for sensitive data
- **Encryption in Transit**: TLS 1.3 for all communications
- **Identifier Privacy**: Masking of PIX identifiers in logs and APIs
- **Session Security**: HTTP-only cookies with CSRF protection

### Access Control
- **Authentication**: Multi-identifier login with secure password hashing
- **Authorization**: Role-based access to bills and financial data
- **Rate Limiting**: Protection against brute force and abuse
- **Audit Logging**: Comprehensive logging of security events

### Compliance
- **OWASP Top 10**: Address all major web application security risks
- **LGPD**: Implement privacy by design principles
- **Financial Regulations**: Comply with Brazilian financial data handling

## Deployment and Operations

### Environment Strategy
- **Development**: Local Docker Compose setup
- **Staging**: Production-like environment for testing
- **Production**: Scalable cloud deployment with redundancy

### CI/CD Pipeline
- **Code Quality**: Automated linting, testing, and security scanning
- **Build Process**: Docker image creation and optimization
- **Deployment**: Automated deployment with rollback capability
- **Monitoring**: Post-deployment health checks and alerting

### Scaling Considerations
- **Database**: Read replicas for query performance
- **Application**: Horizontal scaling with load balancers
- **Caching**: Distributed caching for improved performance
- **CDN**: Static asset delivery optimization

## Implementation Guidelines

### Code Standards
- **TypeScript**: Strict configuration with no-any rule
- **Formatting**: Prettier with consistent configuration
- **Linting**: ESLint with Brazilian Portuguese comment requirements
- **Testing**: Minimum 80% code coverage for business logic

### API Design Principles
- **RESTful**: Resource-based URLs with proper HTTP methods
- **Versioning**: API versioning from day one (/api/v1/)
- **Documentation**: OpenAPI/Swagger documentation auto-generated
- **Error Handling**: Consistent error response format

### Database Guidelines
- **Migrations**: All schema changes through migration files
- **Seeding**: Reproducible test data for development
- **Backup**: Regular automated backups with retention policy
- **Performance**: Query optimization and index management

## Risk Mitigation

### Technical Risks
- **Calculation Accuracy**: Comprehensive testing and validation
- **Performance**: Load testing and optimization
- **Security**: Regular security audits and penetration testing
- **Compliance**: Legal review and compliance monitoring

### Business Risks
- **User Adoption**: Focus on Brazilian user experience
- **Competition**: Continuous feature development and improvement
- **Regulatory Changes**: Monitoring of Brazilian financial regulations
- **Scale**: Architecture designed for growth and scalability

## Success Metrics

### Technical Metrics
- **Performance**: Page load times, API response times
- **Reliability**: Uptime, error rates, data accuracy
- **Security**: Zero security incidents, compliance audit results
- **Quality**: Code coverage, bug rates, technical debt

### Business Metrics
- **User Engagement**: Daily/monthly active users, session duration
- **Feature Usage**: Bill creation, expense tracking, settlement completion
- **Accuracy**: Calculation correctness, dispute resolution
- **Satisfaction**: User feedback, support ticket volume

This context document serves as the foundation for all development decisions and should be referenced throughout the implementation process to ensure consistency with project goals and technical requirements.