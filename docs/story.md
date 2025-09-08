# Development Story 1.2: Database Schema and Prisma Setup

## Story Overview
**Epic**: 1 - Foundation & Authentication  
**Story ID**: 1.2  
**Estimated Effort**: 2-4 hours  
**Status**: Ready for Development  
**Dependencies**: Story 1.1 (Project Infrastructure Setup)

## User Story
**As a developer,**  
**I want a normalized database schema with Prisma ORM fully configured,**  
**so that I have type-safe database access, proper migrations, and development seed data ready for building authentication and core features.**

## Background
Building on the infrastructure setup from Story 1.1, this story focuses on establishing the complete database schema following strict 3NF normalization principles. The schema supports the core business logic for Brazilian PIX-native expense splitting, including user management with multi-identifier support, bill management, expense tracking with flexible splitting, and settlement recording.

The database connects to the external PostgreSQL instance (192.168.7.101 for development, Supabase for production) established in the infrastructure setup.

## Acceptance Criteria

### ✅ Database Schema Design
1. **Entity Normalization (3NF Compliance)**
   - [ ] All entities follow Third Normal Form with no transitive dependencies
   - [ ] User and Participant entities properly separated to support placeholder system
   - [ ] Identifier management supports all Brazilian PIX key types with proper validation
   - [ ] Financial data (amounts) stored in cents to avoid floating-point precision issues
   - [ ] Audit trail maintained through immutable expense and settlement records

2. **Core Entity Relationships**
   - [ ] `users` table with Brazilian user registration requirements
   - [ ] `identifiers` table supporting CPF, CNPJ, email, phone, EVP with unique constraints
   - [ ] `participants` table for placeholder system supporting unregistered users
   - [ ] `bills` table with owner relationships and debt simplification settings
   - [ ] `expenses` table with flexible split type support (equal, percentage, shares)
   - [ ] `settlements` table for payment recording with PIX transaction references

3. **Performance Optimization**
   - [ ] Strategic indexes on performance-critical fields (user lookups, bill queries)
   - [ ] Proper foreign key constraints with cascade behavior
   - [ ] Optimized query patterns for balance calculations
   - [ ] Database connection pooling configuration

### ✅ Prisma Configuration
4. **Schema Configuration**
   - [ ] Prisma schema defines all entities with proper TypeScript types
   - [ ] Generator configuration for Prisma Client with full type safety
   - [ ] Database connection configuration for external PostgreSQL
   - [ ] Enum definitions for IdentifierType, BillRole, ShareType, SettlementMethod

5. **Migration System**
   - [ ] Initial migration creates complete schema structure
   - [ ] Migration naming follows descriptive conventions
   - [ ] Foreign key relationships properly established
   - [ ] Indexes created for all query-critical fields

### ✅ Development Data Setup
6. **Seed Script Implementation**
   - [ ] Sample users with various Brazilian identifier types (CPF, CNPJ, email, phone, EVP)
   - [ ] Sample bills demonstrating different scenarios (simple splits, percentage splits, share splits)
   - [ ] Sample expenses with realistic Brazilian monetary amounts
   - [ ] Sample settlements showing different payment methods (PIX, Cash, Other)
   - [ ] Placeholder participants to demonstrate claiming workflow

7. **Data Validation**
   - [ ] Brazilian identifier validation (CPF/CNPJ checksums, phone E.164 format)
   - [ ] Monetary precision preserved (all amounts in cents)
   - [ ] Referential integrity maintained across all relationships
   - [ ] Enum constraints properly enforced

## Technical Requirements

### Database Schema Details

#### Core Entities (Strict 3NF)
```sql
-- Users: Registered application users
users (
  id: UUID PRIMARY KEY,
  full_name: VARCHAR(100) NOT NULL,
  password_hash: VARCHAR(255) NOT NULL,
  created_at: TIMESTAMP NOT NULL DEFAULT now(),
  updated_at: TIMESTAMP NOT NULL DEFAULT now()
)

-- Identifiers: PIX keys and contact methods linked to users
identifiers (
  id: UUID PRIMARY KEY,
  user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type: IdentifierType NOT NULL,
  value: VARCHAR(255) NOT NULL UNIQUE,
  created_at: TIMESTAMP NOT NULL DEFAULT now(),
  INDEX(user_id),
  INDEX(value)
)

-- Participants: Placeholder system for unregistered users
participants (
  id: UUID PRIMARY KEY,
  display_name: VARCHAR(100),
  created_at: TIMESTAMP NOT NULL DEFAULT now()
)

-- Bills: Expense tracking containers
bills (
  id: UUID PRIMARY KEY,
  owner_user_id: UUID NOT NULL REFERENCES users(id),
  name: VARCHAR(100) NOT NULL,
  description: TEXT,
  currency: VARCHAR(3) NOT NULL DEFAULT 'BRL',
  simplify_debts: BOOLEAN NOT NULL DEFAULT false,
  created_at: TIMESTAMP NOT NULL DEFAULT now(),
  updated_at: TIMESTAMP NOT NULL DEFAULT now(),
  INDEX(owner_user_id)
)

-- Expenses: Individual spending records
expenses (
  id: UUID PRIMARY KEY,
  bill_id: UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  payer_participant_id: UUID NOT NULL REFERENCES participants(id),
  amount_cents: INTEGER NOT NULL CHECK (amount_cents > 0),
  description: VARCHAR(200),
  spent_at: DATE NOT NULL,
  created_at: TIMESTAMP NOT NULL DEFAULT now(),
  INDEX(bill_id),
  INDEX(payer_participant_id)
)
```

#### Performance Indexes
- **User Identifier Lookups**: Index on `identifiers.value` for authentication
- **Bill Member Queries**: Composite index on `bill_members(bill_id, participant_id)`
- **Balance Calculations**: Index on `expenses.bill_id` and `settlements.bill_id`
- **Audit Queries**: Index on `bill_changelog.created_at` for temporal queries

### Real-time WebSocket Integration
The database schema supports real-time bill collaboration through WebSocket-based change tracking:

- **Bill Changelog Table**: Central audit log for all bill modifications
  - Tracks expense additions, updates, deletions with full metadata
  - Records member additions and settlement transactions
  - Enables real-time broadcasting of changes to connected clients
  - Supports Brazilian Portuguese change descriptions for user-friendly notifications

- **WebSocket Event Structure**:
  ```typescript
  // Real-time change event broadcast to bill participants
  interface BillChangeEvent {
    type: 'BILL_UPDATED' | 'INITIAL_CHANGELOG';
    action: 'EXPENSE_ADDED' | 'EXPENSE_UPDATED' | 'EXPENSE_DELETED' | 
            'MEMBER_ADDED' | 'SETTLEMENT_ADDED';
    data: {
      billId: string;
      userId: string;
      userName: string;
      description: string; // Brazilian Portuguese user-friendly description
      metadata?: {
        amount?: number; // For expense/settlement changes
        changes?: object; // For update operations
      };
      createdAt: string;
    };
  }
  ```

- **Supported Real-time Operations**:
  - Expense management: Create, update, delete expenses with instant notification
  - Settlement tracking: PIX payments and other settlement methods
  - Member management: Adding participants to bills
  - Bill synchronization: All participants see changes immediately
  - Conflict resolution: Last-write-wins with full audit trail

### Brazilian Identifier Support
- **CPF**: 11-digit format with checksum validation (stored normalized)
- **CNPJ**: 14-digit format with checksum validation (stored normalized)
- **Phone**: E.164 format (+55XXXXXXXXXX) for storage, display formatting applied in UI
- **Email**: RFC 5322 compliant with domain validation
- **EVP**: UUID v4 format validation for Chave Aleatória

### LGPD Data Retention and Handling Policies
- **User Personal Data**: 5-year retention period from last account activity, with automatic anonymization
- **Financial Transaction Data**: 10-year retention period as required by Brazilian fiscal regulations
- **Consent Records**: Permanent retention for LGPD compliance audit purposes
- **Right to be Forgotten**: Immediate anonymization of personal identifiers while preserving financial audit trail
- **Data Processing Purposes**: 
  - CPF/CNPJ: PIX transaction identification and tax compliance
  - Email/Phone: User communication and account recovery
  - Financial data: Legal compliance and settlement tracking
- **Anonymization Strategy**: Replace personal identifiers with UUIDs while maintaining referential integrity

### Monetary Precision Requirements
- All monetary amounts stored as INTEGER in cents
- Brazilian Real currency formatting: R$ 1.234,56
- Split calculations use "largest remainder" method for fair rounding
- Mathematical consistency: all splits sum exactly to expense total

## Implementation Tasks

### Phase 1: Schema Design & Migration (1.5 hours)
1. **Review and Refine Prisma Schema**
   - [ ] Validate existing schema.prisma against 3NF requirements
   - [ ] Ensure all Brazilian business requirements are covered
   - [ ] Add missing indexes for performance optimization
   - [ ] Verify enum definitions match functional requirements

2. **Database Migration Setup**
   - [ ] Configure Prisma migrations against external PostgreSQL
   - [ ] Generate initial migration from schema
   - [ ] Test migration rollback capabilities
   - [ ] Validate foreign key constraints and indexes

### Phase 2: Seed Data Development (1 hour)
3. **Comprehensive Seed Script**
   - [ ] Create realistic Brazilian user data with proper identifiers
   - [ ] Generate sample bills with various splitting scenarios
   - [ ] Add expenses with proper monetary amounts in cents
   - [ ] Include settlements demonstrating different payment methods
   - [ ] Add placeholder participants for claiming workflow testing

4. **Data Validation Testing**
   - [ ] Verify Brazilian identifier validation works correctly
   - [ ] Test monetary precision in all calculations
   - [ ] Validate referential integrity across all relationships
   - [ ] Ensure enum constraints function properly

### Phase 3: Prisma Client Configuration (1 hour)
5. **Type Generation & Validation**
   - [ ] Generate Prisma Client with full TypeScript types
   - [ ] Verify type safety for all database operations
   - [ ] Test complex queries (joins, aggregations) for performance
   - [ ] Validate connection pooling configuration

6. **Integration Testing**
   - [ ] Test schema with external PostgreSQL database
   - [ ] Verify migrations work in both development and production environments
   - [ ] Test seed script execution and data integrity
   - [ ] Validate database connection pooling under load

### Phase 4: Documentation & Validation (0.5 hours)
7. **Schema Documentation**
   - [ ] Document all entity relationships and business rules
   - [ ] Create ERD (Entity Relationship Diagram) for visual reference
   - [ ] Document index strategy and performance considerations
   - [ ] Add migration workflow documentation

8. **Final Validation**
   - [ ] Run complete test suite against generated schema
   - [ ] Verify all acceptance criteria are met
   - [ ] Test with realistic data volumes
   - [ ] Validate cleanup and rollback procedures

## Definition of Done

### ✅ Functional Requirements
- [ ] All entities follow strict 3NF normalization with no redundancy
- [ ] Foreign key constraints properly defined with appropriate cascade behavior
- [ ] Indexes created on all performance-critical fields for sub-second query response
- [ ] Migration files generate clean, deployable schema structure
- [ ] Seed data covers all entity types with realistic Brazilian scenarios
- [ ] Prisma Client generates complete TypeScript types for all operations

### ✅ Quality Requirements
- [ ] Brazilian identifier validation (CPF/CNPJ checksums) implemented and tested
- [ ] Monetary precision maintained throughout (no floating-point errors)
- [ ] Database queries optimized for bills with 100+ participants
- [ ] Connection pooling properly configured for concurrent development
- [ ] All database operations are type-safe with Prisma Client

### ✅ Security Requirements  
- [ ] Sensitive data (password hashes) use appropriate column types
- [ ] Identifier values stored in normalized format for consistent lookups
- [ ] No hardcoded credentials in schema or migration files
- [ ] Audit trail structure prepared for immutable financial records

### ✅ LGPD Compliance Requirements
- [ ] Database schema supports explicit consent tracking for personal data collection
- [ ] User data retention policies implemented with automatic cleanup mechanisms
- [ ] Right to be forgotten (erasure) functionality supported at schema level
- [ ] Data processing purpose and legal basis clearly defined for each entity
- [ ] Personal data anonymization capabilities built into schema design
- [ ] Audit trail for data access and modifications to support LGPD compliance reporting

## Schema Validation Commands

### Migration and Schema Testing
```bash
# Generate and apply initial migration
cd backend
npx prisma migrate dev --name "initial_schema"

# Validate schema structure
npx prisma db pull
npx prisma validate

# Generate Prisma Client with types
npx prisma generate

# Run seed script
npx prisma db seed
```

### Data Integrity Verification
```sql
-- Verify 3NF compliance (no duplicate user data)
SELECT full_name, COUNT(*) FROM users GROUP BY full_name HAVING COUNT(*) > 1;

-- Test identifier uniqueness constraint
SELECT value, COUNT(*) FROM identifiers GROUP BY value HAVING COUNT(*) > 1;

-- Verify monetary precision (all amounts divisible by cents)
SELECT * FROM expenses WHERE amount_cents % 1 != 0;

-- Validate foreign key relationships
SELECT COUNT(*) FROM expenses e 
LEFT JOIN participants p ON e.payer_participant_id = p.id 
WHERE p.id IS NULL;
```

### Performance Testing
```sql
-- Test identifier lookup performance (should use index)
EXPLAIN ANALYZE SELECT * FROM identifiers WHERE value = '12345678901';

-- Test bill member query performance
EXPLAIN ANALYZE SELECT * FROM bill_members WHERE bill_id = 'uuid-here';

-- Test balance calculation query performance
EXPLAIN ANALYZE SELECT bill_id, SUM(amount_cents) FROM expenses GROUP BY bill_id;
```

## Files to Create/Modify

### New Files
- `/backend/prisma/migrations/001_initial_schema/` - Initial database migration
- `/docs/database-schema.md` - Complete schema documentation with ERD
- `/docs/SEEDING.md` - Guide for database seeding and test data

### Modified Files
- `/backend/prisma/schema.prisma` - Complete schema refinement
- `/backend/prisma/seed.ts` - Comprehensive seed data for development
- `/backend/package.json` - Add Prisma migration and seeding scripts
- `/backend/src/lib/prisma.ts` - Prisma Client configuration (prepare for next story)

## Success Metrics
- Schema migration completes successfully against external PostgreSQL (192.168.7.101)
- All 12+ entities created with proper relationships and constraints
- Seed script creates 100+ records across all entity types in under 5 seconds
- Type generation produces comprehensive TypeScript definitions
- Complex queries (bills with expenses and settlements) execute in under 100ms
- Zero data integrity issues across all relationships

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|---------|------------|
| 3NF design complexity affecting performance | Medium | Strategic indexing and query optimization testing |
| Brazilian identifier validation complexity | High | Comprehensive test suite with edge cases and invalid data |
| Migration issues with external PostgreSQL | High | Test migration process thoroughly, maintain rollback procedures |
| Seed data generation performance | Low | Optimize seed script with batch operations and transactions |
| Type safety issues with complex Prisma queries | Medium | Extensive testing of generated types and query patterns |

## Brazilian-Specific Considerations

### Data Localization
- All monetary amounts handled as integers (cents) to match Brazilian Real precision
- Phone numbers normalized to E.164 format (+55XXXXXXXXXX) for international compatibility
- CPF/CNPJ stored without formatting but validated with proper checksums
- Date storage in UTC with proper timezone handling for São Paulo (America/Sao_Paulo)

### Business Logic Support
- Placeholder participant system for unregistered PIX key recipients
- Flexible split types supporting Brazilian group payment patterns
- Settlement methods prioritizing PIX as primary payment method
- Audit trail supporting Brazilian financial compliance requirements

## Post-Completion Verification

After completing this story, verify the following capabilities:

1. **Database Creation**:
   ```bash
   # Connect to external PostgreSQL and verify schema
   psql "postgresql://postgres:tjq5uxt3@192.168.7.101:5432/fazopix_dev"
   \dt  # List all tables
   \di  # List all indexes
   ```

2. **Type Safety Verification**:
   ```typescript
   // TypeScript should autocomplete all Prisma operations
   const user = await prisma.user.create({
     data: {
       fullName: "Maria Silva",
       passwordHash: "hashed_password",
       identifiers: {
         create: {
           type: "PIX_CPF",
           value: "12345678901"
         }
       }
     }
   });
   ```

3. **Seed Data Verification**:
   ```bash
   # Verify seed data was created successfully  
   npx prisma studio  # Visual database browser
   ```

This story establishes the complete data foundation necessary for implementing authentication (Stories 1.3-1.5) and core bill management features (Epic 2), providing type-safe database access and comprehensive development data for testing all application workflows.