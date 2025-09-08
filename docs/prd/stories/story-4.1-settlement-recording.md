# Story 4.1: Settlement Recording

## Story Overview

**As a bill participant,**  
**I want to record when payments are made between participants,**  
**so that balances are updated accurately and settlement progress is tracked.**

## Dependencies

- **Epic 2**: Bill Management & Participants (complete)
- **Epic 3**: Expense Tracking & Splitting (complete balance calculations)

## Acceptance Criteria

### Settlement Recording
1. **POST /api/bills/:id/settlements** records payments between participants
2. **PIX Integration**: Store PIX transaction references for payment verification
3. **Payment Methods**: Support PIX, bank transfer, cash, and other methods
4. **Validation**: Prevent settlements exceeding actual debt between participants
5. **Balance Updates**: Immediate balance recalculation after settlement recording
6. **Audit Trail**: Immutable settlement records for financial transparency

### PIX Reference Support
1. **Transaction ID Storage**: Secure storage of PIX transaction references
2. **Format Validation**: Validate PIX reference formats (UUID, timestamp-based)
3. **Duplicate Prevention**: Prevent recording same PIX transaction multiple times
4. **Verification Support**: Enable dispute resolution with PIX proof

## Technical Specifications

### API Implementation

```typescript
POST /api/bills/:billId/settlements
Content-Type: application/json

Request Body:
{
  "payer_participant_id": string,    // Who made the payment
  "payee_participant_id": string,    // Who received the payment
  "amount_cents": number,            // Amount in Brazilian Real cents
  "method": "pix" | "bank_transfer" | "cash" | "other",
  "pix_reference": string,           // Optional: PIX transaction ID
  "description": string,             // Optional: Payment notes
  "settlement_date": string          // ISO 8601 date, defaults to now
}

Success Response (201):
{
  "success": true,
  "data": {
    "id": string,
    "payer_participant_id": string,
    "payer_name": string,
    "payee_participant_id": string,
    "payee_name": string,
    "amount_cents": number,
    "method": string,
    "pix_reference": string,
    "description": string,
    "settlement_date": string,
    "created_at": string,
    "balance_impact": {
      "payer_old_balance": number,
      "payer_new_balance": number,
      "payee_old_balance": number,
      "payee_new_balance": number
    }
  }
}
```

### Settlement Validation Logic

```typescript
const validateSettlement = async (
  billId: string,
  settlementData: CreateSettlementRequest
): Promise<ValidationResult> => {
  // 1. Validate participants are bill members
  const [payer, payee] = await Promise.all([
    prisma.billMember.findFirst({
      where: { bill_id: billId, participant_id: settlementData.payer_participant_id }
    }),
    prisma.billMember.findFirst({
      where: { bill_id: billId, participant_id: settlementData.payee_participant_id }
    })
  ]);
  
  if (!payer || !payee) {
    return { isValid: false, error: "Participantes devem ser membros da conta" };
  }
  
  // 2. Calculate current debt between participants
  const currentDebt = await calculateDebtBetween(
    settlementData.payer_participant_id,
    settlementData.payee_participant_id,
    billId
  );
  
  if (settlementData.amount_cents > currentDebt) {
    return {
      isValid: false,
      error: `Valor excede dívida atual de ${formatCurrency(currentDebt)}`
    };
  }
  
  // 3. Validate PIX reference if provided
  if (settlementData.pix_reference) {
    const duplicate = await prisma.settlement.findFirst({
      where: { pix_reference: settlementData.pix_reference }
    });
    
    if (duplicate) {
      return { isValid: false, error: "Referência PIX já foi registrada" };
    }
  }
  
  return { isValid: true };
};
```

### Database Transaction

```sql
-- Atomic settlement recording with balance updates
BEGIN;
  -- 1. Insert settlement record
  INSERT INTO settlements (
    id, bill_id, payer_participant_id, payee_participant_id,
    amount_cents, method, pix_reference, description, settlement_date
  ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING id;
  
  -- 2. Invalidate balance cache
  DELETE FROM bill_balance_cache WHERE bill_id = $1;
  
  -- 3. Update bill activity
  UPDATE bills SET updated_at = NOW() WHERE id = $1;
COMMIT;
```

## Success Metrics

- ✅ Settlement recording completes within 1 second
- ✅ Balance calculations update immediately after settlement
- ✅ PIX reference validation prevents duplicate recordings
- ✅ Settlement history provides complete audit trail

## Estimated Effort: 5 Story Points (4-5 hours)