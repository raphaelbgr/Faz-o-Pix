# Functional Requirements Reference

## Overview
This document provides a comprehensive reference for all functional requirements in the Faz-o-Pix application. These requirements define what the system must do to deliver the core value proposition of Brazilian PIX-native expense splitting.

## User Authentication and Registration

### FR1: Multi-Identifier User Registration
**Requirement**: Users can register with a combination of full name, password, and at least one identifier (PIX key, email, or phone number)

**Details**:
- Support for Brazilian CPF (11 digits with checksum)
- Support for Brazilian CNPJ (14 digits with checksum)
- Support for email addresses (RFC 5322 compliant)
- Support for phone numbers (normalized to E.164 format)
- Support for EVP (Chave Aleatória - UUID v4 format)
- Password must meet security requirements (minimum 8 characters, complexity)
- Full name is required (minimum 2 characters, maximum 100 characters)

**Acceptance Criteria**:
- Registration form accepts all identifier types
- Brazilian identifiers validated with proper checksums
- Phone numbers normalized to +55XXXXXXXXXXXX format
- Email validation prevents invalid formats
- Password hashing using Argon2id
- Duplicate identifiers rejected with clear error messages

### FR2: Flexible User Authentication
**Requirement**: Users can authenticate using any of their registered identifiers plus password

**Details**:
- Support login with any registered identifier type
- Handle phone number format variations during login
- Case-insensitive email matching
- Secure session management with HTTP-only cookies
- Rate limiting to prevent brute force attacks

**Acceptance Criteria**:
- Login works with all identifier types
- Phone format variations handled (with/without formatting)
- Failed login attempts properly rate limited
- Session cookies secure and HTTP-only
- Clear error messages for authentication failures

## Bill Management

### FR3: Bill Creation and Configuration
**Requirement**: Users can create bills with name, optional description, and currency fixed to BRL

**Details**:
- Bill name required (1-100 characters)
- Optional description (up to 500 characters)
- Currency always BRL (Brazilian Real)
- Bill creator automatically becomes owner and first participant
- Timestamps for creation and last activity tracking

**Acceptance Criteria**:
- Bill creation form validates required fields
- Creator automatically added as participant
- Bills list shows creation date and last activity
- Currency locked to BRL with proper formatting

### FR4: Debt Simplification Toggle
**Requirement**: Bill creators can toggle "simplify debts" option to minimize payment transactions

**Details**:
- Boolean flag controlled by bill owner only
- When enabled, applies min-cash-flow algorithm to reduce payment count
- Can be toggled at any time during bill lifecycle
- Affects payment suggestions but not actual balances
- Clear explanation of how simplification works

**Acceptance Criteria**:
- Toggle available only to bill owners
- Setting persisted across sessions
- UI explains impact of simplification
- Payment suggestions update when toggled

### FR5: Participant Management with Placeholders
**Requirement**: Users can add participants to bills using PIX keys (CPF, CNPJ, email, phone, EVP), creating placeholders for unregistered users

**Details**:
- Support all PIX key types with validation
- Create placeholder participants for unregistered identifiers
- Link to existing users when identifier matches
- Optional display names for placeholder participants
- Prevent duplicate participants in same bill
- Privacy protection through identifier masking

**Acceptance Criteria**:
- All PIX key types accepted and validated
- Placeholder participants created for unknown identifiers
- Existing users linked automatically when identifier matches
- Display names editable for placeholders
- Duplicate prevention with clear error messages
- Identifiers masked in participant lists for privacy

## Expense Management

### FR6: Flexible Expense Addition
**Requirement**: Users can add expenses specifying payer, amount in cents, description, date, and split configuration

**Details**:
- Payer must be bill participant
- Amount stored in cents to avoid floating point precision issues
- Description required (1-200 characters)
- Date defaults to current date, cannot be future
- Multiple split configuration options supported
- Real-time validation and calculation preview

**Acceptance Criteria**:
- Expense form validates all required fields
- Amount entry supports Brazilian currency format (R$ 1.234,56)
- Payer selection limited to bill participants
- Date picker prevents future dates
- Split calculations shown in real-time preview

### FR7: Multiple Split Types
**Requirement**: System supports three split types: equal (divide evenly), percentage (must sum to 100%), and shares (proportional distribution)

**Details**:
- **Equal Split**: Divide amount evenly among selected participants, handle remainders
- **Percentage Split**: Custom percentages that must sum exactly to 100%
- **Shares Split**: Proportional weights that can be any positive numbers
- All split amounts calculated and stored in cents
- Rounding handled to ensure exact sum matching expense amount

**Acceptance Criteria**:
- Equal split distributes remainders fairly
- Percentage split validates 100% total
- Shares split handles any proportional weights
- All calculations preserve cent precision
- Split amounts always sum exactly to expense total

### FR8: Real-Time Balance Calculation
**Requirement**: System calculates real-time balances showing who owes whom for each bill

**Details**:
- Calculate net position for each participant (total paid minus total owed)
- Generate pairwise debts from net positions
- Include settlement adjustments in calculations
- Ensure zero-sum across all balances (mathematical consistency)
- Efficient caching with invalidation on changes

**Acceptance Criteria**:
- Balances update immediately after expense changes
- All participant balances sum to zero
- Pairwise debts accurately reflect net positions
- Performance acceptable for bills with 50+ participants
- Caching reduces calculation latency

### FR9: Debt Simplification Algorithm
**Requirement**: When simplify debts is enabled, system provides optimized payment suggestions using min-cash-flow algorithm

**Details**:
- Implement greedy min-cash-flow algorithm
- Reduce number of payment transactions without changing net positions
- Preserve total debt amounts (zero-sum maintained)
- Handle edge cases (circular debts, equal amounts)
- Provide comparison between original and simplified payment plans

**Acceptance Criteria**:
- Algorithm reduces payment count by 40-60% typically
- Net positions remain exactly the same
- Edge cases handled correctly
- Performance optimized for large participant groups
- Clear comparison shown between original and simplified plans

## Settlement Management

### FR10: Settlement Recording
**Requirement**: Users can record settlements between participants with amount, method (PIX/Cash/Other), and optional reference

**Details**:
- Record payments from one participant to another
- Support payment methods: PIX, Cash, Bank Transfer, Other
- Optional PIX reference for transaction ID tracking
- Validate settlement doesn't exceed outstanding debt
- Update balance calculations immediately
- Immutable records for audit trail

**Acceptance Criteria**:
- Settlement form validates against outstanding debts
- PIX references stored securely when provided
- Balance calculations update immediately
- Settlement history maintained permanently
- Payment methods clearly categorized

### FR11: Brazilian Identifier Validation
**Requirement**: System validates Brazilian identifiers: CPF/CNPJ checksums, phone normalization to E.164, email RFC compliance, EVP UUID format

**Details**:
- **CPF Validation**: 11-digit format with checksum algorithm verification
- **CNPJ Validation**: 14-digit format with checksum algorithm verification
- **Phone Normalization**: Convert to +55XXXXXXXXXX format, handle various input formats
- **Email Validation**: RFC 5322 compliant with domain verification
- **EVP Validation**: UUID v4 format verification
- Store normalized formats for consistent lookup

**Acceptance Criteria**:
- CPF validation rejects invalid checksums
- CNPJ validation rejects invalid checksums
- Phone numbers normalized to international format
- Email validation prevents invalid formats
- EVP validation ensures proper UUID v4 format
- All identifiers stored in normalized format

### FR12: Placeholder Account Claiming
**Requirement**: Unregistered participants can claim their placeholder accounts by registering with matching identifier

**Details**:
- Automatic detection during registration process
- Match registered identifiers against placeholder identifier hashes
- Migrate all historical data (expenses, settlements, bill memberships)
- Preserve complete audit trail
- Support claiming multiple placeholders if identifiers match
- Notify user about claimed accounts

**Acceptance Criteria**:
- Registration automatically detects and claims matching placeholders
- All historical data migrated to claimed account
- User notified about claimed accounts with bill details
- Audit trail preserved throughout claiming process
- Multiple placeholders claimed if identifiers match

### FR13: Automatic Membership Migration
**Requirement**: System automatically migrates bill memberships when placeholders are claimed by real users

**Details**:
- Update bill_members records to reference real user ID
- Create user_participants_link for historical data preservation
- Maintain expense and settlement references
- Update participant lists to show claimed status
- Preserve all permissions and roles

**Acceptance Criteria**:
- Bill memberships updated to real user accounts
- Historical data remains accessible and accurate
- Participant lists reflect claimed status
- No data loss during migration process
- Permissions and roles properly transferred

### FR14: Monetary Precision
**Requirement**: All monetary calculations preserve accuracy to the cent with proper rounding

**Details**:
- Store all amounts in cents as integers
- Use integer arithmetic for all calculations
- Handle rounding using "largest remainder" method for splits
- Ensure all split amounts sum exactly to expense total
- Brazilian currency formatting (R$ 1.234,56)
- Comprehensive validation of monetary precision

**Acceptance Criteria**:
- All amounts stored and calculated in cents
- Split calculations never lose or gain cents
- Rounding distributed fairly across participants
- Currency displayed in Brazilian format
- Mathematical consistency maintained across all operations

### FR15: Comprehensive Audit Trail
**Requirement**: System maintains audit trail of all expense and settlement modifications

**Details**:
- Immutable record of all financial transactions
- Track creation, modification, and deletion attempts
- Store user ID, timestamp, and change details for all modifications
- Maintain historical versions of modified records
- Cryptographic integrity verification
- Permanent retention of audit data

**Acceptance Criteria**:
- All expense and settlement changes logged
- Audit records include user, timestamp, and change details
- Historical versions preserved for reference
- Audit trail cannot be modified or deleted
- Integrity verification prevents tampering

## Cross-Cutting Requirements

### Brazilian Localization
- All user-facing text in Brazilian Portuguese (pt-BR)
- Currency formatting: R$ 1.234,56 (period for thousands, comma for decimals)
- Date formatting: DD/MM/YYYY
- Phone number formatting: (XX) XXXXX-XXXX for display
- CPF formatting: XXX.XXX.XXX-XX for display
- CNPJ formatting: XX.XXX.XXX/XXXX-XX for display

### Data Privacy and Security
- Identifier masking in API responses (show only last 2-4 digits)
- Secure storage of all sensitive data with encryption at rest
- LGPD compliance for personal data handling
- Session management with secure HTTP-only cookies
- Rate limiting on all sensitive operations
- Audit logging for security events

### Mobile-First Design
- Responsive design working from 320px to desktop
- Touch-friendly interface with 44px minimum touch targets
- Mobile-optimized forms with appropriate keyboard types
- Swipe gestures for common operations
- Pull-to-refresh functionality
- Progressive Web App capabilities

### Performance Requirements
- Real-time balance calculation for bills with 100+ participants
- Efficient caching of frequently accessed data
- Pagination for large data sets
- Optimized database queries with proper indexing
- Background processing for intensive calculations
- Client-side caching for improved responsiveness

## Implementation Priority
1. **High Priority**: FR1, FR2, FR3, FR5, FR6, FR7, FR8, FR11
2. **Medium Priority**: FR4, FR9, FR10, FR14, FR15
3. **Lower Priority**: FR12, FR13 (dependent on placeholder system usage)

## Traceability Matrix

| Requirement | Epic | Story | Acceptance Criteria Count |
|-------------|------|-------|---------------------------|
| FR1 | Epic 1 | Story 1.4 | 8 |
| FR2 | Epic 1 | Story 1.5 | 7 |
| FR3 | Epic 2 | Story 2.1 | 7 |
| FR4 | Epic 2 | Story 2.1 | 6 |
| FR5 | Epic 2 | Story 2.2 | 8 |
| FR6 | Epic 3 | Story 3.1 | 8 |
| FR7 | Epic 3 | Story 3.1 | 8 |
| FR8 | Epic 3 | Story 3.3 | 7 |
| FR9 | Epic 4 | Story 4.2 | 7 |
| FR10 | Epic 4 | Story 4.1 | 8 |
| FR11 | Epic 1 | Story 1.4 | 8 |
| FR12 | Epic 2 | Story 2.3 | 7 |
| FR13 | Epic 2 | Story 2.3 | 7 |
| FR14 | Epic 3 | Story 3.1, 3.3 | 6 |
| FR15 | Epic 4 | Story 4.4 | 7 |