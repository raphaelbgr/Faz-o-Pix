# Epic 3: Expense Tracking & Splitting

## Overview
Implement comprehensive expense management with flexible splitting options, real-time balance calculation, and clear visualization of who owes whom within each bill. This epic delivers the core value proposition of accurate expense splitting with Brazilian financial conventions.

## Success Criteria
- Flexible expense addition with multiple splitting methods (equal, percentage, shares)
- Real-time balance calculation with cent-accurate precision
- Clear expense history with full audit trail
- Intuitive mobile-first expense entry interface
- Visual balance representation with Brazilian currency formatting
- Performance optimized for bills with many expenses and participants

## Dependencies
- Epic 1: Foundation & Authentication (complete)
- Epic 2: Bill Management & Participants (complete)
- Bill and participant system must be functional
- User authentication and authorization

## Technical Context
- Brazilian currency (BRL) with proper formatting (R$ 1.234,56)
- Cent-based calculations to avoid floating point errors
- Denormalized split data for query performance
- Real-time balance updates with caching strategy
- Mobile-optimized input methods for quick expense entry

## Stories

### Story 3.1: Expense Addition with Flexible Splits

**As a bill participant,**  
**I want to add expenses with different splitting methods,**  
**so that I can accurately track various payment scenarios.**

#### Acceptance Criteria
1. POST /api/bills/:id/expenses accepts payer, amount, description, date, and splits array
2. Supports equal split among selected participants
3. Supports percentage split (must sum to 100%)
4. Supports custom shares for proportional distribution
5. Amount stored in cents to avoid floating point issues
6. Denormalizes split amounts on write for fast reads
7. Frontend provides intuitive split configuration UI
8. Shows real-time calculation preview before saving

#### API Specification

**POST /api/bills/:billId/expenses**
```typescript
interface CreateExpenseRequest {
  payer_participant_id: string;
  amount_cents: number;        // Amount in cents (R$ 12.34 = 1234)
  description: string;         // Max 200 characters
  expense_date: string;        // ISO 8601 date
  split_type: 'equal' | 'percentage' | 'shares';
  splits: ExpenseSplit[];
}

interface ExpenseSplit {
  participant_id: string;
  // For equal split: no additional fields needed
  // For percentage split: 
  percentage?: number;         // Must sum to 100 across all splits
  // For shares split:
  shares?: number;            // Proportional weight
  // Calculated fields (denormalized on write):
  amount_cents?: number;      // Calculated split amount
}

interface CreateExpenseResponse {
  id: string;
  payer_participant_id: string;
  amount_cents: number;
  description: string;
  expense_date: string;
  split_type: string;
  splits: Array<{
    participant_id: string;
    amount_cents: number;
    percentage?: number;
    shares?: number;
  }>;
  created_at: string;
}
```

#### Split Calculation Logic

**Equal Split**
```typescript
// Divide amount equally, handle remainders
const baseAmount = Math.floor(totalCents / participantCount);
const remainder = totalCents % participantCount;
// First N participants get baseAmount + 1, rest get baseAmount
```

**Percentage Split**
```typescript
// Validate percentages sum to 100%
const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
if (totalPercentage !== 100) throw new Error('Percentages must sum to 100%');

// Calculate amounts, handle rounding
splits.forEach(split => {
  split.amount_cents = Math.round(totalCents * split.percentage / 100);
});
// Adjust for rounding errors to ensure total matches
```

**Shares Split**
```typescript
// Calculate proportional amounts
const totalShares = splits.reduce((sum, split) => sum + split.shares, 0);
splits.forEach(split => {
  split.amount_cents = Math.round(totalCents * split.shares / totalShares);
});
// Adjust for rounding errors
```

#### Business Rules
- Only bill participants can be payers
- Only bill participants can be included in splits
- Split amounts must sum exactly to expense amount (handle rounding)
- Expense date cannot be in future
- Description is required and must be meaningful

#### Definition of Done
- All three split types work correctly with proper rounding
- API validates all input parameters
- Split calculations are mathematically accurate
- Frontend provides clear split configuration interface

---

### Story 3.2: Expense List and Management

**As a bill participant,**  
**I want to view and manage expenses in the bill,**  
**so that I can track spending and make corrections.**

#### Acceptance Criteria
1. GET /api/bills/:id returns expenses with full split details
2. Expenses sorted by date (newest first by default)
3. Shows payer, amount, description, and split summary
4. Visual indicators for user's involvement (paid by me, I owe)
5. Expense details expandable to show full split breakdown
6. Edit capability for expense creator (within 24 hours)
7. Delete capability with confirmation dialog
8. Running total display for all expenses

#### API Specification

**GET /api/bills/:billId/expenses**
```typescript
interface ExpenseListItem {
  id: string;
  payer_participant_id: string;
  payer_name: string;
  amount_cents: number;
  description: string;
  expense_date: string;
  split_type: 'equal' | 'percentage' | 'shares';
  participant_count: number;
  my_split_amount?: number;    // Current user's portion, if participating
  paid_by_me: boolean;
  i_owe: boolean;
  created_at: string;
  can_edit: boolean;          // True if current user created and < 24h old
  can_delete: boolean;
}

interface GetExpensesResponse {
  expenses: ExpenseListItem[];
  total_amount_cents: number;
  my_total_paid: number;
  my_total_owed: number;
}
```

**GET /api/bills/:billId/expenses/:expenseId**
```typescript
interface ExpenseDetail {
  id: string;
  payer_participant_id: string;
  payer_name: string;
  amount_cents: number;
  description: string;
  expense_date: string;
  split_type: 'equal' | 'percentage' | 'shares';
  splits: Array<{
    participant_id: string;
    participant_name: string;
    amount_cents: number;
    percentage?: number;
    shares?: number;
  }>;
  created_at: string;
  updated_at?: string;
  created_by_user_id: string;
}
```

#### UI/UX Design
- **Expense Cards**: Compact view showing key info
  - Payer name and amount (large, bold)
  - Description and date (smaller text)
  - Visual indicators: "You paid" badge, "You owe R$ X" indicator
  - Expand arrow for details
- **Expense Details**: Full breakdown when expanded
  - Complete split table with all participants
  - Edit/Delete buttons (if permitted)
  - Creation timestamp and creator info
- **List Features**:
  - Pull-to-refresh
  - Infinite scroll for large lists
  - Search by description
  - Filter by payer or date range

#### Edit/Delete Rules
- **Edit Permission**: Creator only, within 24 hours of creation
- **Delete Permission**: Creator only, within 24 hours of creation
- **Audit Trail**: All modifications logged with timestamps
- **Balance Recalculation**: Automatic after any expense change

#### Definition of Done
- Expense list loads efficiently with pagination
- Visual indicators clearly show user involvement
- Edit/delete permissions enforced correctly
- Responsive design works on mobile and desktop

---

### Story 3.3: Balance Calculation Engine

**As a bill participant,**  
**I want accurate balance calculations,**  
**so that I know exactly who owes whom.**

#### Acceptance Criteria
1. GET /api/bills/:id/balances returns net positions for all participants
2. Calculates total paid minus total owed per participant
3. Generates pairwise debts from net positions
4. Handles rounding to ensure zero-sum across all balances
5. Caches calculations with invalidation on changes
6. Includes settlement adjustments in calculations
7. Returns both individual balances and suggested payments

#### API Specification

**GET /api/bills/:billId/balances**
```typescript
interface ParticipantBalance {
  participant_id: string;
  participant_name: string;
  is_placeholder: boolean;
  total_paid_cents: number;      // Sum of all expenses paid by this participant
  total_owed_cents: number;      // Sum of all expense splits owed by this participant
  settlement_adjustments_cents: number; // Net settlement adjustments
  net_balance_cents: number;     // Positive = owed to them, Negative = they owe
}

interface PairwiseDebt {
  debtor_id: string;
  debtor_name: string;
  creditor_id: string;
  creditor_name: string;
  amount_cents: number;
}

interface GetBalancesResponse {
  participants: ParticipantBalance[];
  pairwise_debts: PairwiseDebt[];
  total_expenses_cents: number;
  is_balanced: boolean;          // True if all balances sum to zero
  last_calculated: string;       // Timestamp of calculation
}
```

#### Balance Calculation Algorithm
```typescript
// Step 1: Calculate net positions
participants.forEach(p => {
  p.net_balance_cents = p.total_paid_cents - p.total_owed_cents + p.settlement_adjustments_cents;
});

// Step 2: Separate creditors and debtors
const creditors = participants.filter(p => p.net_balance_cents > 0);
const debtors = participants.filter(p => p.net_balance_cents < 0);

// Step 3: Generate pairwise debts (greedy matching)
const pairwise_debts: PairwiseDebt[] = [];
creditors.forEach(creditor => {
  let remaining_credit = creditor.net_balance_cents;
  
  debtors.forEach(debtor => {
    if (remaining_credit > 0 && debtor.net_balance_cents < 0) {
      const payment_amount = Math.min(remaining_credit, -debtor.net_balance_cents);
      
      pairwise_debts.push({
        debtor_id: debtor.participant_id,
        creditor_id: creditor.participant_id,
        amount_cents: payment_amount
      });
      
      remaining_credit -= payment_amount;
      debtor.net_balance_cents += payment_amount;
    }
  });
});
```

#### Caching Strategy
- Cache balance calculations in Redis/memory
- Invalidate cache on any expense or settlement change
- Background recalculation for frequently accessed bills
- Fallback to real-time calculation if cache miss

#### Precision and Rounding
- All calculations maintain cent precision
- Rounding errors distributed using "largest remainder" method
- Validation ensures total balances always sum to zero
- Comprehensive test suite for edge cases

#### Definition of Done
- Balance calculations are mathematically accurate
- Performance acceptable for bills with 100+ participants and expenses
- Caching reduces calculation latency
- Comprehensive test coverage for rounding edge cases

---

### Story 3.4: Balance Visualization

**As a bill participant,**  
**I want clear visualization of balances and debts,**  
**so that I understand the financial situation at a glance.**

#### Acceptance Criteria
1. Balance view shows each participant's net position
2. Color coding: green for credit, red for debt, gray for settled
3. Detailed breakdown of who owes whom
4. Currency formatting in Brazilian standard (R$ 1.234,56)
5. Toggle between raw and simplified debt views
6. Visual flow diagram for payment suggestions
7. Mobile-optimized layout with collapsible sections

#### UI Layout Design

**Participant Balances Section**
```
┌─────────────────────────────────────┐
│ 👤 João Silva               +R$ 45,67 │ <- Green background
├─────────────────────────────────────┤
│ 👤 Maria Santos            -R$ 23,45  │ <- Red background  
├─────────────────────────────────────┤
│ 👤 Pedro Costa              R$ 0,00   │ <- Gray background
└─────────────────────────────────────┘
```

**Payment Suggestions Section**
```
┌─────────────────────────────────────┐
│ 💰 Payment Suggestions             │
├─────────────────────────────────────┤
│ Maria → João: R$ 23,45              │
│ [Mark as Paid] [Copy PIX]           │ 
└─────────────────────────────────────┘
```

**Detailed Breakdown (Expandable)**
```
┌─────────────────────────────────────┐
│ 📊 João Silva                       │
├─────────────────────────────────────┤
│ Paid: R$ 120,34                    │
│ Owes: R$ 74,67                     │
│ Net: +R$ 45,67                     │
│                                     │
│ Recent Activity:                    │
│ • Paid R$ 35,00 for lunch          │
│ • Owes R$ 12,50 for coffee         │
└─────────────────────────────────────┘
```

#### Brazilian Currency Formatting
- Use R$ symbol prefix
- Thousands separator: period (1.234)
- Decimal separator: comma (,56)
- Always show 2 decimal places
- Negative amounts: -R$ 12,34 (not (R$ 12,34))

#### Color Coding System
- **Green (#28a745)**: Positive balance (owed to participant)
- **Red (#dc3545)**: Negative balance (participant owes money)
- **Gray (#6c757d)**: Zero balance (settled)
- **Blue (#007bff)**: Current user highlight
- **Yellow (#ffc107)**: Placeholder participants

#### Responsive Design
- **Mobile**: Stack vertically, large touch targets
- **Tablet**: Two-column layout for balances
- **Desktop**: Three-column with detailed breakdown sidebar

#### Accessibility Features
- High contrast ratios (WCAG AA compliance)
- Screen reader friendly balance announcements
- Keyboard navigation for all interactive elements
- Focus indicators and ARIA labels

#### Definition of Done
- Balance visualization is immediately comprehensible
- Brazilian currency formatting throughout
- Responsive design works across device sizes
- Accessibility features tested with screen readers

## Advanced Features

### Story 3.5: Expense Search and Filtering

**As a bill participant,**  
**I want to search and filter expenses,**  
**so that I can quickly find specific transactions.**

#### Acceptance Criteria
1. Search by expense description with highlighting
2. Filter by payer, date range, or amount range
3. Filter by expenses involving current user
4. Save common filters for quick access
5. Export filtered results as PDF/CSV
6. Real-time search with debounced queries

### Story 3.6: Expense Categories and Tags

**As a bill participant,**  
**I want to categorize expenses,**  
**so that I can better understand spending patterns.**

#### Acceptance Criteria
1. Predefined categories (Food, Transport, Entertainment, etc.)
2. Custom tags for flexible organization
3. Category-based spending reports
4. Visual breakdown by category
5. Category defaults based on description keywords
6. Bulk categorization tools

### Story 3.7: Recurring Expenses

**As a bill participant,**  
**I want to set up recurring expenses,**  
**so that I don't have to manually enter regular costs.**

#### Acceptance Criteria
1. Create expense templates with recurrence rules
2. Automatic expense generation on schedule
3. Notification before auto-generation
4. Easy editing of recurring series
5. Support for monthly, weekly, and custom intervals
6. Automatic adjustment for different month lengths

## Technical Notes

### Performance Optimizations
- Denormalized expense split amounts for fast queries
- Database indexes on commonly filtered fields
- Pagination for large expense lists
- Background processing for balance calculations
- Efficient caching strategy for frequently accessed data

### Data Integrity
- Database constraints ensure split amounts sum correctly
- Audit trail for all expense modifications
- Soft deletes preserve data integrity
- Transaction isolation for balance calculations
- Comprehensive validation at API layer

### Security Considerations
- Authorization checks for expense creation/modification
- Rate limiting on expense addition
- Input sanitization and validation
- Audit logging for all financial data changes
- Data privacy compliance for expense details

## Testing Strategy

### Unit Tests
- Split calculation algorithms with edge cases
- Currency formatting and rounding logic
- Balance calculation accuracy
- Input validation and sanitization

### Integration Tests
- Complete expense addition flow
- Balance calculation with multiple scenarios
- Expense modification and deletion
- Cache invalidation and refresh

### Performance Tests
- Large bills with 100+ expenses and participants
- Concurrent expense additions
- Balance calculation performance
- API response time under load

### E2E Tests
- Mobile expense entry workflow
- Balance visualization accuracy
- Search and filtering functionality
- Responsive design validation

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|---------|------------|
| Floating point precision errors | High | Cent-based calculations with rounding validation |
| Performance with large expense lists | Medium | Pagination and efficient indexing |
| Complex balance calculation bugs | High | Comprehensive test suite and audit trail |
| Mobile UX for expense splitting | Medium | Extensive user testing and iteration |