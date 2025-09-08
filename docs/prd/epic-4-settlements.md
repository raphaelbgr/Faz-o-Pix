# Epic 4: Settlements & Debt Simplification

## Overview
Implement settlement recording with PIX reference tracking and the debt simplification algorithm to minimize payment transactions, providing users with optimal payment suggestions. This epic completes the expense sharing cycle by enabling users to record payments and reduce the complexity of settling debts within groups.

## Success Criteria
- Comprehensive settlement recording with PIX transaction references
- Debt simplification algorithm reducing payment complexity by 40-60%
- Clear payment suggestions with copy-to-clipboard PIX details
- Complete settlement history with audit trail and dispute resolution support
- Immutable settlement records for financial transparency
- Mobile-optimized settlement entry and payment tracking

## Dependencies
- Epic 1: Foundation & Authentication (complete)
- Epic 2: Bill Management & Participants (complete)
- Epic 3: Expense Tracking & Splitting (complete)
- Balance calculation system must be functional
- Participant system with PIX identifiers

## Technical Context
- Min-cash-flow algorithm implementation for debt optimization
- PIX integration for payment reference tracking
- Immutable audit trail for settlement history
- Real-time balance updates with settlement adjustments
- Brazilian payment method conventions (PIX primary, cash secondary)

## Stories

### Story 4.1: Settlement Recording

**As a bill participant,**  
**I want to record when I make or receive payments,**  
**so that I can track settlement progress.**

#### Acceptance Criteria
1. POST /api/bills/:id/settlements records payment from one participant to another
2. Accepts amount in cents, method (PIX/Cash/Other), and optional reference
3. PIX reference field for transaction ID tracking
4. Validates settlement doesn't exceed actual debt
5. Updates balance calculations immediately
6. Shows settlement in transaction history
7. Frontend provides quick settlement entry with participant selection
8. Confirmation screen shows balance impact

#### API Specification

**POST /api/bills/:billId/settlements**
```typescript
interface CreateSettlementRequest {
  payer_participant_id: string;    // Who made the payment
  payee_participant_id: string;    // Who received the payment
  amount_cents: number;            // Amount in cents
  method: 'pix' | 'cash' | 'bank_transfer' | 'other';
  pix_reference?: string;          // PIX transaction ID/reference
  description?: string;            // Optional notes
  settlement_date: string;         // ISO 8601 date, defaults to now
}

interface CreateSettlementResponse {
  id: string;
  payer_participant_id: string;
  payer_name: string;
  payee_participant_id: string;
  payee_name: string;
  amount_cents: number;
  method: string;
  pix_reference?: string;
  description?: string;
  settlement_date: string;
  created_at: string;
  balance_impact: {
    payer_old_balance: number;
    payer_new_balance: number;
    payee_old_balance: number;
    payee_new_balance: number;
  };
}
```

**Validation Rules**
- Settlement amount must be positive
- Payer and payee must be different participants
- Both participants must be members of the bill
- Settlement amount cannot exceed outstanding debt between participants
- PIX reference format validation (when provided)
- Settlement date cannot be in the future

#### PIX Reference Integration
- **Format Validation**: UUID or timestamp-based PIX IDs
- **Reference Storage**: Encrypted storage of PIX transaction IDs
- **Duplicate Detection**: Prevent double-recording of same PIX transaction
- **Verification Support**: Enable dispute resolution with PIX proof

#### Business Logic
```typescript
// Validate settlement doesn't exceed debt
const currentDebt = await calculateDebtBetween(payerId, payeeId, billId);
if (settlementAmount > currentDebt) {
  throw new Error('Settlement amount exceeds outstanding debt');
}

// Update balances immediately
await updateParticipantBalances(billId, [{
  participantId: payerId,
  settlementAdjustment: -settlementAmount // Reduces what they're owed or increases what they owe
}, {
  participantId: payeeId, 
  settlementAdjustment: +settlementAmount // Increases what they're owed or reduces what they owe
}]);

// Invalidate balance cache
await invalidateBalanceCache(billId);
```

#### Definition of Done
- Settlement recording API functions with full validation
- Balance calculations update immediately and correctly
- PIX references stored securely with proper validation
- UI provides clear settlement entry with balance preview

---

### Story 4.2: Debt Simplification Algorithm

**As a bill participant,**  
**I want the option to simplify debts,**  
**so that I can minimize the number of payments needed.**

#### Acceptance Criteria
1. Implements min-cash-flow greedy algorithm
2. Preserves total debt amounts (zero-sum maintained)
3. Reduces number of transactions without changing net positions
4. Handles edge cases (equal debts, circular debts)
5. Performance optimized for bills with 20+ participants
6. Returns both original and simplified payment plans
7. Algorithm covered by comprehensive test suite

#### Min-Cash-Flow Algorithm Implementation

```typescript
interface ParticipantBalance {
  participant_id: string;
  net_balance_cents: number; // Positive = credit, Negative = debt
}

interface Payment {
  from_participant_id: string;
  to_participant_id: string;
  amount_cents: number;
}

interface SimplificationResult {
  original_payments: Payment[];
  simplified_payments: Payment[];
  transaction_reduction: number;
  complexity_score: number; // Lower is better
}

async function simplifyDebts(participants: ParticipantBalance[]): Promise<SimplificationResult> {
  // Step 1: Separate creditors and debtors
  const creditors = participants
    .filter(p => p.net_balance_cents > 0)
    .sort((a, b) => b.net_balance_cents - a.net_balance_cents);
    
  const debtors = participants
    .filter(p => p.net_balance_cents < 0)
    .map(p => ({ ...p, net_balance_cents: -p.net_balance_cents }))
    .sort((a, b) => b.net_balance_cents - a.net_balance_cents);
    
  const simplified_payments: Payment[] = [];
  
  // Step 2: Greedy matching - match largest creditor with largest debtor
  let creditor_idx = 0;
  let debtor_idx = 0;
  
  while (creditor_idx < creditors.length && debtor_idx < debtors.length) {
    const creditor = creditors[creditor_idx];
    const debtor = debtors[debtor_idx];
    
    const payment_amount = Math.min(creditor.net_balance_cents, debtor.net_balance_cents);
    
    simplified_payments.push({
      from_participant_id: debtor.participant_id,
      to_participant_id: creditor.participant_id,
      amount_cents: payment_amount
    });
    
    creditor.net_balance_cents -= payment_amount;
    debtor.net_balance_cents -= payment_amount;
    
    if (creditor.net_balance_cents === 0) creditor_idx++;
    if (debtor.net_balance_cents === 0) debtor_idx++;
  }
  
  // Generate original payments for comparison
  const original_payments = generateOriginalPayments(participants);
  
  return {
    original_payments,
    simplified_payments,
    transaction_reduction: original_payments.length - simplified_payments.length,
    complexity_score: calculateComplexityScore(simplified_payments)
  };
}

function calculateComplexityScore(payments: Payment[]): number {
  // Lower score = simpler payment structure
  // Factors: number of transactions, amount variance, participant involvement
  const transaction_count = payments.length;
  const amounts = payments.map(p => p.amount_cents);
  const amount_variance = calculateVariance(amounts);
  const unique_participants = new Set([
    ...payments.map(p => p.from_participant_id),
    ...payments.map(p => p.to_participant_id)
  ]).size;
  
  return transaction_count + (amount_variance / 1000) + (unique_participants * 0.5);
}
```

#### Algorithm Performance
- **Time Complexity**: O(n log n) where n is number of participants
- **Space Complexity**: O(n) for participant arrays
- **Optimization**: Early termination when all balances settled
- **Edge Cases**: Handle zero balances, equal amounts, single creditor/debtor

#### Quality Metrics
- **Transaction Reduction**: Typically 40-60% fewer payments
- **Zero-Sum Preservation**: Total debts remain mathematically equivalent
- **Participant Neutrality**: No participant advantage/disadvantage
- **Complexity Reduction**: Lower cognitive load for users

#### Definition of Done
- Algorithm reduces transaction count while preserving total amounts
- Performance acceptable for bills with 50+ participants
- Comprehensive test suite covers edge cases
- Mathematical correctness verified through property-based testing

---

### Story 4.3: Payment Suggestions UI

**As a bill participant,**  
**I want clear payment suggestions when simplification is enabled,**  
**so that I know the optimal way to settle debts.**

#### Acceptance Criteria
1. Shows comparison of original vs simplified payment counts
2. Lists specific payment suggestions with amounts
3. Copy-to-clipboard for payment amounts
4. PIX key display for payment recipients
5. Mark as paid directly from suggestions
6. Explanation of how simplification works
7. Toggle to switch between original and simplified views

#### UI Layout Design

**Payment Suggestions Header**
```
┌─────────────────────────────────────────────────────┐
│ 💡 Smart Payment Suggestions                       │
│ ┌─────────┐ ┌─────────┐                           │
│ │ Simple  │ │Original │  [ⓘ How it works]        │
│ └─────────┘ └─────────┘                           │
│ 3 payments instead of 7 • Saves 4 transactions     │
└─────────────────────────────────────────────────────┘
```

**Payment List - Simplified View**
```
┌─────────────────────────────────────────────────────┐
│ 💳 Your Payments (3)                               │
├─────────────────────────────────────────────────────┤
│ Pay João Silva                            R$ 45,67  │
│ PIX: joao.silva@email.com                          │
│ [Copy Amount] [Copy PIX] [Mark as Paid]            │
├─────────────────────────────────────────────────────┤
│ Pay Maria Santos                          R$ 23,45  │
│ PIX: 12345678901                                   │
│ [Copy Amount] [Copy PIX] [Mark as Paid]            │
└─────────────────────────────────────────────────────┘
```

**Payment List - Original View**
```
┌─────────────────────────────────────────────────────┐
│ 📊 Original Debts (7)                              │
├─────────────────────────────────────────────────────┤
│ Pay João Silva                            R$ 15,50  │
│ Pay Maria Santos                          R$ 8,75   │
│ Pay Pedro Costa                           R$ 12,30  │
│ Pay Ana Lima                              R$ 9,12   │
│ [Show all payments...]                              │
└─────────────────────────────────────────────────────┘
```

#### Interactive Features
- **Copy to Clipboard**: One-tap copy for amounts and PIX keys
- **PIX Deep Linking**: Direct links to PIX apps when available
- **Payment Tracking**: Mark payments as completed
- **Progress Visualization**: Show settlement progress
- **Notification**: Alert when new suggestions available

#### Educational Content
```
┌─────────────────────────────────────────────────────┐
│ ❓ How Debt Simplification Works                    │
├─────────────────────────────────────────────────────┤
│ Instead of everyone paying everyone else,           │
│ we calculate the smartest payment path to           │
│ settle all debts with fewer transactions.           │
│                                                     │
│ Your total amount owed/received stays the same,     │
│ but you make fewer payments.                        │
│                                                     │
│ Example: If A owes B R$10, B owes C R$10,          │
│ A can pay C directly, eliminating B's transactions. │
└─────────────────────────────────────────────────────┘
```

#### Mobile Optimization
- Large touch targets for payment actions
- Swipe gestures for quick payment completion
- Haptic feedback for successful actions
- Offline capability for viewing suggestions
- Push notifications for payment reminders

#### Definition of Done
- Payment suggestions clearly display optimization benefits
- Copy-to-clipboard works reliably across browsers
- PIX integration enables seamless payment flow
- Educational content helps users understand simplification

---

### Story 4.4: Settlement History and Audit

**As a bill participant,**  
**I want to view complete settlement history,**  
**so that I can verify all payments and resolve disputes.**

#### Acceptance Criteria
1. Complete settlement history with timestamps
2. Filter by participant, date range, or method
3. Shows PIX references for verification
4. Export settlement history as PDF or CSV
5. Immutable audit trail (no settlement deletion)
6. Settlement notes for additional context
7. Visual timeline of settlement progress

#### API Specification

**GET /api/bills/:billId/settlements**
```typescript
interface SettlementHistoryQuery {
  participant_id?: string;        // Filter by payer or payee
  date_from?: string;            // ISO 8601 date
  date_to?: string;              // ISO 8601 date
  method?: 'pix' | 'cash' | 'bank_transfer' | 'other';
  limit?: number;                // Pagination limit
  offset?: number;               // Pagination offset
}

interface SettlementHistoryItem {
  id: string;
  payer_participant_id: string;
  payer_name: string;
  payee_participant_id: string;
  payee_name: string;
  amount_cents: number;
  method: string;
  pix_reference?: string;
  description?: string;
  settlement_date: string;
  created_at: string;
  created_by_user_id?: string;   // Who recorded the settlement
  verification_status: 'pending' | 'confirmed' | 'disputed';
}

interface GetSettlementsResponse {
  settlements: SettlementHistoryItem[];
  total_count: number;
  summary: {
    total_amount_cents: number;
    by_method: Record<string, number>;
    by_month: Array<{
      month: string;
      amount_cents: number;
      count: number;
    }>;
  };
}
```

#### Settlement Timeline View
```
┌─────────────────────────────────────────────────────┐
│ 📅 Settlement Timeline                              │
├─────────────────────────────────────────────────────┤
│ Dec 2024                                           │
│ ●─────○─────●─────○                                │
│ 15th  18th  22nd  25th                             │
│                                                     │
│ Dec 22 • PIX Payment                               │
│ João → Maria • R$ 45,67                            │
│ Reference: 1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6   │
│ [View Details] [Report Issue]                      │
└─────────────────────────────────────────────────────┘
```

#### Export Functionality
**PDF Export Features:**
- Professional formatting with bill header
- Complete settlement table with all details
- Summary statistics and totals
- PIX reference preservation
- Digital signature for authenticity

**CSV Export Features:**
- All settlement fields included
- Compatible with Excel/Google Sheets
- UTF-8 encoding for Brazilian characters
- Headers in Portuguese
- Sortable by all columns

#### Dispute Resolution Support
```typescript
interface SettlementDispute {
  settlement_id: string;
  reporter_user_id: string;
  dispute_reason: 'amount_incorrect' | 'payment_not_received' | 'wrong_participant' | 'other';
  description: string;
  evidence_urls?: string[];      // Screenshots, receipts
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  created_at: string;
  resolution?: string;
}
```

#### Audit Trail Features
- **Immutability**: Settlements cannot be deleted, only marked as disputed
- **Versioning**: Track any modifications with full history
- **Digital Signatures**: Cryptographic integrity verification
- **Access Logging**: Track who accessed settlement history when
- **Retention Policy**: Permanent storage for financial records

#### Definition of Done
- Complete settlement history with efficient filtering
- Export functionality works for large datasets
- Audit trail maintains data integrity
- Dispute resolution system supports conflict resolution

## Advanced Features

### Story 4.5: Recurring Settlement Automation

**As a bill participant,**  
**I want to automate recurring settlements,**  
**so that regular expenses are handled without manual intervention.**

#### Acceptance Criteria
1. Set up automatic settlement rules
2. Integration with PIX automatic payments
3. Notification before automatic settlements
4. Override capability for manual control
5. Audit trail for all automatic settlements
6. Smart scheduling to avoid insufficient funds

### Story 4.6: Settlement Predictions and Insights

**As a bill participant,**  
**I want insights into settlement patterns,**  
**so that I can better manage my finances.**

#### Acceptance Criteria
1. Predict upcoming settlement needs
2. Spending pattern analysis
3. Average settlement time metrics
4. Most frequent payment methods
5. Monthly expense forecasting
6. Budget variance alerts

### Story 4.7: Multi-Bill Settlement Optimization

**As a user with multiple bills,**  
**I want to optimize settlements across all my bills,**  
**so that I can minimize total payment transactions.**

#### Acceptance Criteria
1. Cross-bill debt calculation
2. Global payment optimization
3. Net position across all bills
4. Consolidated payment suggestions
5. Priority-based settlement ordering
6. Cash flow optimization recommendations

## Technical Notes

### Algorithm Complexity and Optimization
- **Debt Simplification**: O(n log n) complexity with early termination
- **Balance Calculation**: Cached results with smart invalidation
- **Settlement Validation**: Efficient debt verification queries
- **History Queries**: Optimized indexing for fast filtering

### Data Integrity and Security
- **Immutable Records**: Settlements never deleted, only marked as disputed
- **Cryptographic Integrity**: Hash chains for audit trail verification
- **PIX Reference Encryption**: Secure storage of payment references
- **Access Control**: Fine-grained permissions for settlement operations

### Performance Considerations
- **Caching Strategy**: Balance calculations cached with smart invalidation
- **Database Indexing**: Optimized for common query patterns
- **Batch Processing**: Efficient handling of multiple settlements
- **Real-time Updates**: WebSocket notifications for immediate balance updates

### Brazilian Compliance
- **Central Bank Reporting**: Structured data for regulatory requirements
- **PIX Integration**: Compliance with Brazilian instant payment standards
- **Financial Record Keeping**: Permanent audit trail as required by law
- **Privacy Protection**: LGPD compliance for financial data

## Testing Strategy

### Unit Tests
- Debt simplification algorithm with edge cases
- Settlement validation logic
- Balance calculation accuracy after settlements
- PIX reference format validation

### Integration Tests
- Complete settlement recording flow
- Balance update propagation
- Settlement history queries and filtering
- Export functionality with large datasets

### Performance Tests
- Debt simplification with large participant sets
- Concurrent settlement recording
- History query performance with years of data
- Export performance for comprehensive reports

### Security Tests
- Settlement authorization and access control
- PIX reference encryption and decryption
- Audit trail integrity verification
- Input validation for all settlement endpoints

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|---------|------------|
| Debt simplification algorithm errors | High | Comprehensive mathematical testing and validation |
| PIX reference format changes | Medium | Flexible validation with versioning support |
| Performance with large settlement history | Medium | Efficient indexing and pagination strategies |
| Settlement disputes and fraud | High | Immutable audit trail and dispute resolution system |
| Complex user interface for payment suggestions | Medium | Extensive usability testing and progressive disclosure |