# Story 3.3: Balance Calculation Engine

## Story Overview

**As a bill participant,**  
**I want accurate real-time balance calculations showing who owes whom,**  
**so that I always know the current financial status and can settle debts appropriately.**

## Dependencies

- **Story 2.1**: Bill Creation and Management (bills exist)
- **Story 2.2**: Participant Addition (participants exist)
- **Story 3.1**: Expense Addition (expenses exist to calculate balances)
- **Story 3.2**: Expense List Management (expense data available)

## Acceptance Criteria

### Real-time Balance Calculations
1. **GET /api/bills/:id/balances** returns current net positions for all participants
2. **Mathematical Accuracy**: All balance calculations maintain cent precision with zero rounding errors
3. **Zero-Sum Validation**: Total of all participant balances always equals zero (mathematical consistency)
4. **Settlement Integration**: Balance calculations include settlement adjustments
5. **Performance Caching**: Calculations cached with smart invalidation on expense/settlement changes

### Pairwise Debt Generation
1. **Debt Simplification**: Generates optimal pairwise debts from net participant positions
2. **Minimal Transactions**: Uses greedy algorithm to minimize number of required payments
3. **Payment Suggestions**: Returns specific "Person A pays Person B: Amount" recommendations
4. **Simplification Toggle**: Respects bill's simplify_debts setting for calculation method

### Balance History and Trends
1. **Historical Balances**: Track balance changes over time for trend analysis
2. **Balance Snapshots**: Store balance state after significant changes
3. **Participant Activity**: Track individual participant financial activity within bill

## Technical Specifications

### Balance Calculation Algorithm

#### Core Balance Calculation
```typescript
interface ParticipantBalance {
  participant_id: string;
  participant_name: string;
  is_placeholder: boolean;
  total_paid_cents: number;      // Sum of expenses paid by participant
  total_owed_cents: number;      // Sum of expense splits owed by participant  
  settlement_adjustments_cents: number; // Net settlement adjustments
  net_balance_cents: number;     // Final balance: paid - owed + settlements
}

const calculateBillBalances = async (billId: string): Promise<BillBalanceResult> => {
  // Use single optimized query to get all financial data
  const balanceData = await prisma.$queryRaw`
    WITH participant_expenses AS (
      SELECT 
        p.id as participant_id,
        p.display_name,
        p.is_placeholder,
        COALESCE(SUM(CASE WHEN e.payer_participant_id = p.id THEN e.amount_cents ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(es.amount_cents), 0) as total_owed
      FROM participants p
      INNER JOIN bill_members bm ON p.id = bm.participant_id AND bm.bill_id = ${billId}
      LEFT JOIN expenses e ON e.payer_participant_id = p.id AND e.bill_id = ${billId}
      LEFT JOIN expense_splits es ON es.participant_id = p.id 
        AND es.expense_id IN (SELECT id FROM expenses WHERE bill_id = ${billId})
      GROUP BY p.id, p.display_name, p.is_placeholder
    ),
    participant_settlements AS (
      SELECT 
        participant_id,
        COALESCE(SUM(settlement_adjustment), 0) as settlement_adjustments
      FROM (
        SELECT payer_participant_id as participant_id, -amount_cents as settlement_adjustment
        FROM settlements WHERE bill_id = ${billId}
        UNION ALL
        SELECT payee_participant_id as participant_id, amount_cents as settlement_adjustment  
        FROM settlements WHERE bill_id = ${billId}
      ) settlement_data
      GROUP BY participant_id
    )
    SELECT 
      pe.*,
      COALESCE(ps.settlement_adjustments, 0) as settlement_adjustments,
      (pe.total_paid - pe.total_owed + COALESCE(ps.settlement_adjustments, 0)) as net_balance
    FROM participant_expenses pe
    LEFT JOIN participant_settlements ps ON pe.participant_id = ps.participant_id
    ORDER BY pe.display_name
  `;
  
  return {
    participants: balanceData,
    is_balanced: balanceData.reduce((sum, p) => sum + p.net_balance, 0) === 0,
    last_calculated: new Date().toISOString()
  };
};
```

#### Debt Simplification Algorithm (Min-Cash-Flow)
```typescript
interface PairwiseDebt {
  debtor_id: string;
  debtor_name: string;
  creditor_id: string; 
  creditor_name: string;
  amount_cents: number;
}

const generatePairwiseDebts = (participants: ParticipantBalance[]): PairwiseDebt[] => {
  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors = participants
    .filter(p => p.net_balance_cents > 0)
    .sort((a, b) => b.net_balance_cents - a.net_balance_cents); // Largest first
    
  const debtors = participants
    .filter(p => p.net_balance_cents < 0)
    .map(p => ({ ...p, debt_amount: -p.net_balance_cents }))
    .sort((a, b) => b.debt_amount - a.debt_amount); // Largest debt first
  
  const pairwiseDebts: PairwiseDebt[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;
  
  // Greedy algorithm: match largest creditor with largest debtor
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    
    const paymentAmount = Math.min(creditor.net_balance_cents, debtor.debt_amount);
    
    pairwiseDebts.push({
      debtor_id: debtor.participant_id,
      debtor_name: debtor.participant_name,
      creditor_id: creditor.participant_id,
      creditor_name: creditor.participant_name,
      amount_cents: paymentAmount
    });
    
    // Reduce remaining amounts
    creditor.net_balance_cents -= paymentAmount;
    debtor.debt_amount -= paymentAmount;
    
    // Move to next creditor/debtor if current one is settled
    if (creditor.net_balance_cents === 0) creditorIndex++;
    if (debtor.debt_amount === 0) debtorIndex++;
  }
  
  return pairwiseDebts;
};
```

### API Implementation

```typescript
GET /api/bills/:billId/balances

Response:
{
  "success": true,
  "data": {
    "participants": [
      {
        "participant_id": string,
        "participant_name": string,
        "is_placeholder": boolean,
        "total_paid_cents": number,
        "total_owed_cents": number,
        "settlement_adjustments_cents": number,
        "net_balance_cents": number
      }
    ],
    "pairwise_debts": [
      {
        "debtor_id": string,
        "debtor_name": string,
        "creditor_id": string,
        "creditor_name": string,
        "amount_cents": number
      }
    ],
    "summary": {
      "total_expenses_cents": number,
      "total_settlements_cents": number,
      "is_balanced": boolean,
      "outstanding_debt_count": number,
      "settled_participants": number
    },
    "last_calculated": string
  }
}
```

### Caching Strategy

```typescript
// Redis-based balance caching with smart invalidation
const BALANCE_CACHE_KEY = (billId: string) => `bill_balances:${billId}`;
const CACHE_TTL = 300; // 5 minutes

const getCachedBalances = async (billId: string): Promise<BillBalanceResult | null> => {
  const cached = await redis.get(BALANCE_CACHE_KEY(billId));
  return cached ? JSON.parse(cached) : null;
};

const setCachedBalances = async (billId: string, balances: BillBalanceResult): Promise<void> => {
  await redis.setex(BALANCE_CACHE_KEY(billId), CACHE_TTL, JSON.stringify(balances));
};

const invalidateBalanceCache = async (billId: string): Promise<void> => {
  await redis.del(BALANCE_CACHE_KEY(billId));
};

// Invalidate cache on expense or settlement changes
const onExpenseChange = async (billId: string) => {
  await invalidateBalanceCache(billId);
  // Trigger background recalculation for frequently accessed bills
  await scheduleBalanceRecalculation(billId);
};
```

### Frontend Integration

#### Balance Display Component
```typescript
const BalanceDisplay: React.FC<{ billId: string }> = ({ billId }) => {
  const { data: balances, isLoading } = useQuery({
    queryKey: ['balances', billId],
    queryFn: () => fetchBillBalances(billId),
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  if (isLoading) return <BalancesSkeleton />;
  
  return (
    <div className="balance-display">
      <div className="participant-balances">
        {balances.participants.map(participant => (
          <ParticipantBalanceCard 
            key={participant.participant_id}
            participant={participant}
            currency="BRL"
          />
        ))}
      </div>
      
      {balances.pairwise_debts.length > 0 && (
        <div className="payment-suggestions">
          <h3>Pagamentos Sugeridos</h3>
          {balances.pairwise_debts.map((debt, index) => (
            <PaymentSuggestion 
              key={index}
              debt={debt}
              onMarkAsPaid={() => handleMarkAsPaid(debt)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

## Success Metrics

- ✅ Balance calculations accurate to the cent with zero floating-point errors
- ✅ Debt simplification reduces transaction count by 40-60% on average
- ✅ Balance queries execute within 200ms for bills with 100+ participants
- ✅ Cache hit rate >80% for frequently accessed bills
- ✅ Real-time balance updates propagate within 2 seconds

## Estimated Effort: 8 Story Points (6-7 hours)