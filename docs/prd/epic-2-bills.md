# Epic 2: Bill Management & Participants

## Overview
Enable users to create and manage bills, invite participants using Brazilian identifiers, handle placeholder participants for unregistered users, and implement the claiming mechanism when placeholders register. This epic establishes the core group expense management functionality.

## Success Criteria
- Users can create and manage bills with descriptive metadata
- Flexible participant addition supporting all Brazilian identifier types
- Seamless placeholder participant system for unregistered users
- Automatic account claiming when placeholders register
- Intuitive bill dashboard with key metrics and navigation
- Mobile-optimized participant management interface

## Dependencies
- Epic 1: Foundation & Authentication (complete)
- User authentication system must be functional
- Database schema with user and bill entities

## Technical Context
- Builds on the Prisma schema from Epic 1
- Extends authentication system for participant management
- Implements placeholder/claiming mechanism for unregistered users
- Mobile-first UI design for bill and participant management

## Stories

### Story 2.1: Bill Creation and Management

**As a user,**  
**I want to create bills and manage their basic settings,**  
**so that I can organize different expense-sharing scenarios.**

#### Acceptance Criteria
1. POST /api/bills creates bill with name, description, and simplify_debts flag
2. GET /api/bills returns user's bills with participant counts and balance summaries
3. Bill owner automatically added as first participant
4. Bills list shows creation date and last activity
5. Frontend form validates bill name as required field
6. Toggle for simplify debts option with explanation tooltip
7. Visual distinction between bills user owns vs participates in

#### API Specification

**POST /api/bills**
```typescript
interface CreateBillRequest {
  name: string;           // Required, max 100 characters
  description?: string;   // Optional, max 500 characters
  simplify_debts: boolean; // Default false
}

interface CreateBillResponse {
  id: string;
  name: string;
  description?: string;
  simplify_debts: boolean;
  owner_id: string;
  created_at: string;
  participant_count: number;
}
```

**GET /api/bills**
```typescript
interface BillSummary {
  id: string;
  name: string;
  description?: string;
  simplify_debts: boolean;
  owner_id: string;
  is_owner: boolean;
  created_at: string;
  last_activity: string;
  participant_count: number;
  total_expenses: number; // in cents
  my_balance: number;     // in cents, positive = owed to me
}

interface GetBillsResponse {
  bills: BillSummary[];
}
```

#### Business Rules
- Bill name must be unique per user
- Owner automatically becomes first participant
- Simplify debts can be toggled by owner only
- Last activity updates on any expense or settlement change

#### Definition of Done
- API endpoints function correctly with validation
- Bills list shows all relevant summary information
- Bill creation form provides clear validation feedback
- Owner status clearly indicated in UI

---

### Story 2.2: Participant Addition with Placeholder Support

**As a bill owner,**  
**I want to add participants using their PIX keys or contact info,**  
**so that I can include anyone regardless of registration status.**

#### Acceptance Criteria
1. POST /api/bills/:id/members accepts identifier type and value
2. Creates participant record if identifier not found
3. Links to existing user if identifier matches
4. Supports all PIX key types with proper validation
5. Optional display name for placeholder participants
6. Returns participant ID and registration status
7. Frontend shows participant list with visual placeholder indicator
8. Prevents duplicate participants in same bill

#### API Specification

**POST /api/bills/:billId/members**
```typescript
interface AddParticipantRequest {
  identifier_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';
  identifier_value: string;
  display_name?: string; // Used for placeholders
}

interface AddParticipantResponse {
  participant_id: string;
  user_id?: string;      // null if placeholder
  is_placeholder: boolean;
  display_name: string;
  identifier_type: string;
  identifier_value: string; // masked for privacy
  added_at: string;
}
```

**GET /api/bills/:billId/members**
```typescript
interface BillMember {
  participant_id: string;
  user_id?: string;
  is_placeholder: boolean;
  display_name: string;
  identifier_type?: string;
  masked_identifier?: string; // e.g., "***.***.***-12"
  joined_at: string;
}

interface GetMembersResponse {
  members: BillMember[];
}
```

#### Placeholder Logic
- If identifier exists in system: Link to existing user
- If identifier not found: Create placeholder participant
- Store identifier hash for future claiming
- Display name defaults to masked identifier if not provided
- Placeholder participants can participate in expenses but cannot log in

#### Privacy Considerations
- Identifiers masked in API responses (show last 2 digits of CPF/CNPJ)
- Full identifiers only visible to bill owner
- Email addresses show domain only to other participants
- Phone numbers show last 4 digits only

#### Definition of Done
- All Brazilian identifier types supported
- Placeholder system creates unregistered participants
- UI clearly distinguishes placeholders from registered users
- Privacy masking protects participant identifiers

---

### Story 2.3: Placeholder Account Claiming

**As an unregistered participant,**  
**I want to claim my placeholder account when I register,**  
**so that my expense history transfers to my account.**

#### Acceptance Criteria
1. Registration process checks for matching placeholder identifiers
2. Creates users_participants_link record on match
3. Migrates all bill_members records to claimed user
4. Preserves all expense and settlement history
5. Notification shown about claimed placeholders after registration
6. Multiple placeholders can be claimed if identifiers match
7. Frontend updates to show claimed status

#### Claiming Process Flow
1. User completes registration with identifiers
2. System searches for placeholder participants with matching identifier hashes
3. For each match:
   - Create user_participants_link record
   - Update bill_members to reference real user_id
   - Preserve all historical data (expenses, settlements)
   - Mark placeholder as claimed
4. Return summary of claimed accounts to user

#### API Integration

**Enhanced POST /api/auth/signup Response**
```typescript
interface SignupResponse {
  user_id: string;
  session_token: string;
  claimed_placeholders?: {
    count: number;
    bills: Array<{
      bill_id: string;
      bill_name: string;
      expense_count: number;
      settlement_count: number;
    }>;
  };
}
```

#### Data Migration Rules
- All expense_splits referencing placeholder participant_id remain unchanged
- All settlements referencing placeholder remain unchanged
- bill_members.participant_id links to real user via users_participants_link
- Audit trail preserved for all historical data

#### Definition of Done
- Automatic claiming during registration
- All historical data preserved and accessible
- Clear notification about claimed accounts
- UI updates to reflect claimed status

---

### Story 2.4: Bill Dashboard and Navigation

**As a user,**  
**I want to view and navigate between my bills easily,**  
**so that I can manage multiple expense groups efficiently.**

#### Acceptance Criteria
1. Dashboard shows all bills with key metrics (balance, participants, last activity)
2. Color coding for bills with outstanding balances
3. Search/filter by bill name
4. Sort by creation date, last activity, or balance
5. Quick access to create new bill
6. Mobile-optimized list with swipe actions
7. Empty state with helpful guidance for new users

#### Dashboard Layout
- Header with user info and create bill button
- Search bar with real-time filtering
- Sort options: newest, oldest, most active, highest balance
- Bill cards showing:
  - Bill name and description
  - Participant count
  - My balance (color coded)
  - Last activity timestamp
  - Owner indicator

#### Mobile Interactions
- Pull-to-refresh for bill list
- Swipe right: Quick access to add expense
- Swipe left: Bill settings/management
- Long press: Multi-select mode for bulk actions
- Floating action button for create new bill

#### Balance Color Coding
- Green: I'm owed money (positive balance)
- Red: I owe money (negative balance)
- Gray: Settled/balanced (zero balance)
- Blue: No expenses yet

#### Empty States
- No bills: Welcome message with create bill CTA
- No recent activity: Encourage adding expenses
- All bills settled: Congratulatory message

#### Definition of Done
- Dashboard loads quickly with all bill summaries
- Search and sorting work smoothly
- Color coding provides immediate balance insight
- Mobile interactions feel native and responsive

## Advanced Features

### Story 2.5: Participant Management Interface

**As a bill owner,**  
**I want detailed participant management capabilities,**  
**so that I can maintain accurate group membership.**

#### Acceptance Criteria
1. Participant list with detailed view of each member
2. Remove participants (only if no expense history)
3. Edit placeholder display names
4. Send invitation reminders with bill details
5. View participant activity history
6. Bulk participant management for large groups

#### Participant Detail View
- Registration status and join date
- Expense activity summary
- Balance within this bill
- Contact method preferences
- Remove/edit options (if permitted)

### Story 2.6: Bill Settings and Preferences

**As a bill owner,**  
**I want to customize bill behavior and appearance,**  
**so that it matches our group's needs.**

#### Acceptance Criteria
1. Toggle debt simplification on/off
2. Set default currency (fixed to BRL for MVP)
3. Configure notification preferences
4. Set bill visibility (private/link sharing)
5. Export bill data as PDF or CSV
6. Archive completed bills

## Technical Notes

### Database Design Considerations
- Soft deletes for participants to preserve history
- Proper indexing on bill_members for performance
- Foreign key constraints with CASCADE rules
- Audit fields for all participant changes

### Performance Optimizations
- Bill dashboard uses denormalized balance calculations
- Participant counts cached and updated via triggers
- Lazy loading for detailed participant information
- Efficient queries for large participant lists

### Security Considerations
- Authorization checks on all bill/participant operations
- Identifier privacy masking in API responses
- Rate limiting for participant addition
- Audit logging for all membership changes

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|---------|------------|
| Placeholder claiming conflicts | High | Comprehensive test scenarios for edge cases |
| Privacy leak through identifier exposure | High | Multiple layers of data masking |
| Performance with large participant lists | Medium | Pagination and efficient indexing |
| Complex authorization rules | Medium | Clear ownership and permission model |

## Testing Strategy

### Unit Tests
- Brazilian identifier validation
- Placeholder creation and claiming logic
- Balance calculation accuracy
- Permission and authorization checks

### Integration Tests  
- Complete participant addition flow
- Placeholder claiming during registration
- Bill dashboard data accuracy
- API error handling

### E2E Tests
- Bill creation and participant invitation
- Placeholder registration and claiming
- Dashboard navigation and filtering
- Mobile responsive behavior