# Story 4.2: Debt Simplification Algorithm

## Story Overview

**As a bill participant,**  
**I want optimal payment suggestions that minimize the total number of transactions,**  
**so that settling debts is as simple and efficient as possible.**

## Dependencies

- **Story 3.3**: Balance Calculation Engine (balance data available)
- **Story 4.1**: Settlement Recording (settlement system functional)

## Acceptance Criteria

### Min-Cash-Flow Algorithm Implementation
1. **Debt Optimization**: Implements greedy min-cash-flow algorithm to minimize payment transactions
2. **Mathematical Accuracy**: Preserves exact total debt amounts (zero-sum property maintained)
3. **Performance**: Optimized for bills with 50+ participants (O(n log n) complexity)
4. **Transaction Reduction**: Typically reduces payment count by 40-60%
5. **Edge Case Handling**: Handles circular debts, equal amounts, single creditor/debtor scenarios

### Simplification Results
1. **Comparison Display**: Shows original vs simplified payment counts
2. **Payment Instructions**: Generates specific "Person A → Person B: Amount" instructions
3. **Complexity Scoring**: Calculates and displays complexity reduction metrics
4. **Toggle Support**: Respects bill's simplify_debts setting for algorithm activation

## Technical Specifications

### Core Algorithm Implementation

```typescript
interface SimplificationResult {
  original_payments: Payment[];
  simplified_payments: Payment[];
  transaction_reduction: number;
  complexity_score: number;
  optimization_percentage: number;
}

const simplifyDebts = async (billId: string): Promise<SimplificationResult> => {
  // 1. Get current participant balances
  const balances = await calculateBillBalances(billId);
  
  // 2. Generate original pairwise payments (everyone pays their debtors directly)
  const originalPayments = generateOriginalPayments(balances.participants);
  
  // 3. Apply min-cash-flow algorithm
  const simplifiedPayments = applyMinCashFlowAlgorithm(balances.participants);
  
  // 4. Calculate optimization metrics
  const transactionReduction = originalPayments.length - simplifiedPayments.length;
  const optimizationPercentage = (transactionReduction / originalPayments.length) * 100;
  
  return {
    original_payments: originalPayments,
    simplified_payments: simplifiedPayments,
    transaction_reduction: transactionReduction,
    complexity_score: calculateComplexityScore(simplifiedPayments),
    optimization_percentage: Math.round(optimizationPercentage * 100) / 100
  };
};
```

### Min-Cash-Flow Algorithm
```typescript
const applyMinCashFlowAlgorithm = (participants: ParticipantBalance[]): Payment[] => {
  // Create working copies to avoid mutating original data
  const creditors = participants
    .filter(p => p.net_balance_cents > 0)
    .map(p => ({ ...p, remaining: p.net_balance_cents }))
    .sort((a, b) => b.remaining - a.remaining); // Largest creditor first
    
  const debtors = participants
    .filter(p => p.net_balance_cents < 0)
    .map(p => ({ ...p, remaining: -p.net_balance_cents }))
    .sort((a, b) => b.remaining - a.remaining); // Largest debtor first
  
  const payments: Payment[] = [];
  let creditorIdx = 0;
  let debtorIdx = 0;
  
  // Greedy matching: always match largest remaining amounts
  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx];
    const debtor = debtors[debtorIdx];
    
    // Payment amount is minimum of what creditor is owed and debtor owes
    const paymentAmount = Math.min(creditor.remaining, debtor.remaining);
    
    // Record the payment
    payments.push({
      from_participant_id: debtor.participant_id,
      from_participant_name: debtor.participant_name,
      to_participant_id: creditor.participant_id,
      to_participant_name: creditor.participant_name,
      amount_cents: paymentAmount
    });
    
    // Update remaining amounts
    creditor.remaining -= paymentAmount;
    debtor.remaining -= paymentAmount;
    
    // Move to next participant if current one is fully settled
    if (creditor.remaining === 0) creditorIdx++;
    if (debtor.remaining === 0) debtorIdx++;
  }
  
  // Verify mathematical correctness
  const totalOriginalDebt = participants
    .filter(p => p.net_balance_cents < 0)
    .reduce((sum, p) => sum + (-p.net_balance_cents), 0);
    
  const totalPayments = payments.reduce((sum, p) => sum + p.amount_cents, 0);
  
  if (totalOriginalDebt !== totalPayments) {
    throw new Error(`Algorithm error: debt mismatch ${totalOriginalDebt} !== ${totalPayments}`);
  }
  
  return payments;
};
```

### Performance Metrics Calculation
```typescript
const calculateComplexityScore = (payments: Payment[]): number => {
  // Lower score indicates simpler payment structure
  const transactionCount = payments.length;
  const uniqueParticipants = new Set([
    ...payments.map(p => p.from_participant_id),
    ...payments.map(p => p.to_participant_id)
  ]).size;
  
  const amounts = payments.map(p => p.amount_cents);
  const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length;
  
  // Complexity factors: transaction count, participant involvement, amount variance
  return transactionCount + (uniqueParticipants * 0.5) + (variance / 10000);
};
```

### API Integration
```typescript
GET /api/bills/:billId/debt-simplification

Response:
{
  "success": true,
  "data": {
    "is_enabled": boolean,              // Bill's simplify_debts setting
    "original_payments": [
      {
        "from_participant_id": string,
        "from_participant_name": string,
        "to_participant_id": string,
        "to_participant_name": string,
        "amount_cents": number
      }
    ],
    "simplified_payments": [...],       // Same structure as original_payments
    "metrics": {
      "transaction_reduction": number,   // Number of transactions saved
      "optimization_percentage": number, // Percentage reduction (0-100)
      "complexity_score": number,       // Lower is simpler
      "total_debt_amount": number       // Total debt being optimized
    },
    "recommendations": [
      {
        "priority": "high" | "medium" | "low",
        "description": string,
        "action": string
      }
    ]
  }
}
```

## Success Metrics

- ✅ Algorithm reduces transaction count by 40-60% on average
- ✅ Computation completes within 500ms for bills with 100+ participants
- ✅ Mathematical correctness: total debt amounts preserved exactly
- ✅ Zero edge case failures for complex debt scenarios
- ✅ Memory usage remains under 10MB for largest realistic bills

## Estimated Effort: 8 Story Points (6-7 hours)