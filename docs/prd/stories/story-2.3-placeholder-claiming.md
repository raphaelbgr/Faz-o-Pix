# Story 2.3: Placeholder Account Claiming

## Story Overview

**As an unregistered participant (placeholder),**  
**I want my placeholder account automatically claimed when I register,**  
**so that my complete expense history transfers to my new user account seamlessly.**

## Dependencies

- **Story 1.1**: Project Infrastructure Setup (Docker, environment setup)
- **Story 1.2**: Database Schema and Prisma Setup (users, participants, placeholder_identifiers tables)
- **Story 1.3**: Fastify API Foundation (routing, validation, error handling)
- **Story 1.4**: User Registration with Identifier Validation (signup process integration)
- **Story 2.1**: Bill Creation and Management (bills exist to claim participation)
- **Story 2.2**: Participant Addition with Placeholder Support (placeholders exist to be claimed)

## Acceptance Criteria

### Automatic Claiming During Registration
1. **Registration Integration**: Signup process automatically checks for matching placeholder identifiers
2. **Multi-Identifier Claiming**: User can claim multiple placeholder participants if they have multiple matching identifiers
3. **Data Preservation**: All expense history, settlements, and bill memberships transfer intact
4. **Seamless Transition**: User gains access to all bills where they participated as placeholders
5. **Audit Trail**: Complete audit trail of claiming process for transparency and debugging

### Claiming Process Logic
1. **Identifier Matching**: Hash-based matching of normalized identifiers during registration
2. **Transaction Safety**: Atomic claiming process ensures data consistency
3. **Historical Preservation**: All financial history (expenses, splits, settlements) remains unchanged
4. **Notification System**: User receives summary of claimed placeholder accounts after registration
5. **Multiple Claims**: Single registration can claim multiple placeholder participants across different bills

### Post-Claiming Experience
1. **Bill Access**: Immediate access to all bills where user participated as placeholder
2. **Balance Integration**: Accurate balance calculations including pre-registration activity
3. **History Visibility**: Complete transaction history visible from first placeholder participation
4. **Real-time Updates**: Other bill participants see placeholder converted to real user
5. **Retroactive Permissions**: Full participant permissions apply to historical activity

## Technical Specifications

### Enhanced Registration API Response

#### Modified Signup Response with Claiming Information
```typescript
POST /api/auth/signup
Content-Type: application/json

// Request body includes standard registration fields
{
  "name": string,
  "password": string,
  "identifiers": [
    {
      "type": "cpf" | "cnpj" | "phone" | "email" | "evp",
      "value": string
    }
  ],
  "lgpdConsent": {
    "accepted": boolean,
    "timestamp": string,
    "ipAddress": string
  }
}

// Enhanced success response with claiming information
Success Response (201):
{
  "success": true,
  "data": {
    "userId": string,
    "sessionId": string,
    "message": "Conta criada com sucesso",
    "claimed_placeholders": {
      "count": number,                    // Total placeholders claimed
      "total_bills": number,              // Number of bills joined
      "total_expenses": number,           // Total expense transactions
      "total_settlements": number,        // Total settlement transactions
      "bills": [
        {
          "bill_id": string,
          "bill_name": string,
          "bill_owner_name": string,
          "participant_since": string,    // When placeholder was first added
          "expense_count": number,        // Expenses involving this user
          "settlement_count": number,     // Settlements involving this user
          "current_balance": number,      // Current balance in cents
          "last_activity": string        // Most recent activity as placeholder
        }
      ],
      "financial_summary": {
        "total_paid": number,             // Total amount paid as placeholder (cents)
        "total_owed": number,             // Total amount owed as placeholder (cents)
        "net_balance": number,            // Net balance across all claimed accounts (cents)
        "active_debts": number,           // Number of bills with outstanding balances
        "settled_bills": number           // Number of bills with zero balance
      }
    }
  }
}
```

### Claiming Process Implementation

#### Identifier Hash Matching Logic
```typescript
const findClaimablePlaceholders = async (userIdentifiers: UserIdentifier[]): Promise<ClaimableMatch[]> => {
  const claimableMatches: ClaimableMatch[] = [];
  
  for (const identifier of userIdentifiers) {
    // Normalize and hash the identifier for matching
    const normalizedValue = normalizeIdentifier(identifier.value, identifier.type);
    const identifierHash = await hashIdentifier(normalizedValue);
    
    // Find placeholder participants with matching hash
    const placeholderIdentifiers = await prisma.placeholderIdentifier.findMany({
      where: {
        identifier_hash: identifierHash,
        claimed_at: null  // Only unclaimed placeholders
      },
      include: {
        participant: {
          include: {
            bill_members: {
              include: {
                bill: {
                  select: {
                    id: true,
                    name: true,
                    owner_user_id: true,
                    created_at: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    for (const placeholderIdentifier of placeholderIdentifiers) {
      claimableMatches.push({
        identifier_type: identifier.type,
        identifier_value: normalizedValue,
        placeholder_identifier_id: placeholderIdentifier.id,
        participant_id: placeholderIdentifier.participant_id,
        participant: placeholderIdentifier.participant,
        bills: placeholderIdentifier.participant.bill_members.map(bm => bm.bill),
        created_at: placeholderIdentifier.created_at
      });
    }
  }
  
  return claimableMatches;
};
```

#### Atomic Claiming Transaction
```typescript
const claimPlaceholderParticipants = async (
  userId: string,
  claimableMatches: ClaimableMatch[]
): Promise<ClaimingResult> => {
  return await prisma.$transaction(async (tx) => {
    const claimedBills: ClaimedBillInfo[] = [];
    let totalExpenses = 0;
    let totalSettlements = 0;
    
    for (const match of claimableMatches) {
      const participantId = match.participant_id;
      
      // 1. Create users_participants_link to claim the participant
      await tx.usersParticipantsLink.create({
        data: {
          user_id: userId,
          participant_id: participantId,
          linked_at: new Date()
        }
      });
      
      // 2. Update participant record to mark as claimed
      await tx.participant.update({
        where: { id: participantId },
        data: {
          is_placeholder: false,
          claimed_at: new Date(),
          claimed_by_user_id: userId
        }
      });
      
      // 3. Mark placeholder identifier as claimed
      await tx.placeholderIdentifier.update({
        where: { id: match.placeholder_identifier_id },
        data: {
          claimed_at: new Date(),
          claimed_by_user_id: userId
        }
      });
      
      // 4. Get financial activity for this participant
      const [expenseCount, settlementCount, balanceInfo] = await Promise.all([
        tx.expense.count({
          where: {
            OR: [
              { payer_participant_id: participantId },
              { expense_splits: { some: { participant_id: participantId } } }
            ]
          }
        }),
        tx.settlement.count({
          where: {
            OR: [
              { payer_participant_id: participantId },
              { payee_participant_id: participantId }
            ]
          }
        }),
        calculateParticipantBalance(participantId, tx)
      ]);
      
      totalExpenses += expenseCount;
      totalSettlements += settlementCount;
      
      // 5. Collect claimed bill information
      for (const bill of match.bills) {
        const billMember = await tx.billMember.findFirst({
          where: {
            bill_id: bill.id,
            participant_id: participantId
          }
        });
        
        const lastActivity = await getLastActivityForParticipant(
          bill.id, 
          participantId, 
          tx
        );
        
        claimedBills.push({
          bill_id: bill.id,
          bill_name: bill.name,
          bill_owner_name: await getUserName(bill.owner_user_id, tx),
          participant_since: billMember?.joined_at?.toISOString() || match.created_at.toISOString(),
          expense_count: await tx.expense.count({
            where: {
              bill_id: bill.id,
              OR: [
                { payer_participant_id: participantId },
                { expense_splits: { some: { participant_id: participantId } } }
              ]
            }
          }),
          settlement_count: await tx.settlement.count({
            where: {
              bill_id: bill.id,
              OR: [
                { payer_participant_id: participantId },
                { payee_participant_id: participantId }
              ]
            }
          }),
          current_balance: balanceInfo.net_balance,
          last_activity: lastActivity
        });
      }
      
      // 6. Create audit log entry
      await tx.auditLog.create({
        data: {
          action: 'PLACEHOLDER_CLAIMED',
          entity_type: 'PARTICIPANT',
          entity_id: participantId,
          user_id: userId,
          details: {
            original_placeholder_id: match.placeholder_identifier_id,
            identifier_type: match.identifier_type,
            bills_affected: match.bills.map(b => b.id),
            claiming_timestamp: new Date().toISOString()
          },
          created_at: new Date()
        }
      });
    }
    
    // Calculate financial summary across all claimed accounts
    const financialSummary = await calculateFinancialSummary(userId, tx);
    
    return {
      claimed_count: claimableMatches.length,
      bills: claimedBills,
      total_expenses: totalExpenses,
      total_settlements: totalSettlements,
      financial_summary: financialSummary
    };
  });
};
```

### Balance Calculation Integration

#### Participant Balance Calculation
```typescript
const calculateParticipantBalance = async (
  participantId: string,
  tx: Prisma.TransactionClient
): Promise<ParticipantBalanceInfo> => {
  // Calculate total paid (sum of all expenses where participant was payer)
  const totalPaidResult = await tx.expense.aggregate({
    where: { payer_participant_id: participantId },
    _sum: { amount_cents: true }
  });
  const totalPaid = totalPaidResult._sum.amount_cents || 0;
  
  // Calculate total owed (sum of all expense splits for this participant)
  const totalOwedResult = await tx.expenseSplit.aggregate({
    where: { participant_id: participantId },
    _sum: { amount_cents: true }
  });
  const totalOwed = totalOwedResult._sum.amount_cents || 0;
  
  // Calculate settlement adjustments
  const [settlementsPaid, settlementsReceived] = await Promise.all([
    tx.settlement.aggregate({
      where: { payer_participant_id: participantId },
      _sum: { amount_cents: true }
    }),
    tx.settlement.aggregate({
      where: { payee_participant_id: participantId },
      _sum: { amount_cents: true }
    })
  ]);
  
  const settlementAdjustments = 
    (settlementsReceived._sum.amount_cents || 0) - 
    (settlementsPaid._sum.amount_cents || 0);
  
  const netBalance = totalPaid - totalOwed + settlementAdjustments;
  
  return {
    total_paid: totalPaid,
    total_owed: totalOwed,
    settlement_adjustments: settlementAdjustments,
    net_balance: netBalance
  };
};
```

### Real-time Notification System

#### WebSocket Integration for Claiming
```typescript
const notifyBillMembersOfClaiming = async (
  claimedBills: ClaimedBillInfo[],
  newUserId: string,
  newUserName: string
) => {
  for (const billInfo of claimedBills) {
    // Get all bill members to notify
    const billMembers = await prisma.billMember.findMany({
      where: { 
        bill_id: billInfo.bill_id,
        removed_at: null 
      },
      include: {
        participant: {
          include: {
            users_participants_link: {
              include: { user: true }
            }
          }
        }
      }
    });
    
    // Notify each registered member about the placeholder claiming
    for (const member of billMembers) {
      const linkedUser = member.participant.users_participants_link?.user;
      if (linkedUser && linkedUser.id !== newUserId) {
        // Send WebSocket notification
        await sendWebSocketNotification(linkedUser.id, {
          type: 'PLACEHOLDER_CLAIMED',
          billId: billInfo.bill_id,
          billName: billInfo.bill_name,
          message: `${newUserName} se registrou e assumiu uma conta convidada`,
          data: {
            newUserId: newUserId,
            newUserName: newUserName,
            participantSince: billInfo.participant_since,
            expenseCount: billInfo.expense_count,
            settlementCount: billInfo.settlement_count
          },
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Update bill's last activity
    await prisma.bill.update({
      where: { id: billInfo.bill_id },
      data: { updated_at: new Date() }
    });
  }
};
```

### Frontend Integration

#### Claiming Notification Component
```typescript
interface ClaimingResultProps {
  claimingResult: ClaimingResult;
  onContinue: () => void;
}

const ClaimingResultNotification: React.FC<ClaimingResultProps> = ({
  claimingResult,
  onContinue
}) => {
  if (claimingResult.claimed_count === 0) {
    return null; // No claiming occurred
  }
  
  return (
    <Modal isOpen={true} className="claiming-result-modal">
      <div className="modal-header">
        <h2>🎉 Contas Encontradas!</h2>
        <p className="subtitle">
          Encontramos {claimingResult.claimed_count} conta{claimingResult.claimed_count > 1 ? 's' : ''} 
          {' '}onde você já participava como convidado
        </p>
      </div>
      
      <div className="modal-content">
        <div className="claiming-summary">
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-number">{claimingResult.bills.length}</span>
              <span className="stat-label">Contas</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{claimingResult.total_expenses}</span>
              <span className="stat-label">Despesas</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{claimingResult.total_settlements}</span>
              <span className="stat-label">Pagamentos</span>
            </div>
            <div className="stat-item">
              <span className={`stat-number ${claimingResult.financial_summary.net_balance >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(claimingResult.financial_summary.net_balance)}
              </span>
              <span className="stat-label">Saldo</span>
            </div>
          </div>
        </div>
        
        <div className="claimed-bills">
          <h3>Suas Contas</h3>
          <div className="bills-list">
            {claimingResult.bills.map(bill => (
              <div key={bill.bill_id} className="claimed-bill-card">
                <div className="bill-info">
                  <h4>{bill.bill_name}</h4>
                  <p className="bill-owner">Criada por {bill.bill_owner_name}</p>
                  <p className="participation-duration">
                    Participando desde {formatDate(bill.participant_since)}
                  </p>
                </div>
                <div className="bill-stats">
                  <div className="stat-group">
                    <span className="stat-value">{bill.expense_count}</span>
                    <span className="stat-label">despesas</span>
                  </div>
                  <div className="stat-group">
                    <span className="stat-value">{bill.settlement_count}</span>
                    <span className="stat-label">pagamentos</span>
                  </div>
                  <div className="stat-group">
                    <span className={`stat-value ${bill.current_balance >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(bill.current_balance)}
                    </span>
                    <span className="stat-label">saldo</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="claiming-explanation">
          <h4>O que isso significa?</h4>
          <ul>
            <li>Seu histórico completo de despesas e pagamentos foi preservado</li>
            <li>Você agora tem acesso total a todas essas contas</li>
            <li>Seus saldos foram calculados incluindo toda a atividade anterior</li>
            <li>Outros participantes verão seu nome real em vez de "convidado"</li>
          </ul>
        </div>
      </div>
      
      <div className="modal-actions">
        <button onClick={onContinue} className="button-primary full-width">
          Continuar para Dashboard
        </button>
      </div>
    </Modal>
  );
};
```

### Database Schema Updates

#### Enhanced Participant Table
```sql
-- Add claiming fields to participants table
ALTER TABLE participants ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_participants_claimed ON participants(claimed_at) WHERE claimed_at IS NOT NULL;
```

#### Enhanced Placeholder Identifiers Table
```sql
-- Add claiming fields to placeholder_identifiers table
ALTER TABLE placeholder_identifiers ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE placeholder_identifiers ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_placeholder_identifiers_claimed ON placeholder_identifiers(claimed_at) WHERE claimed_at IS NOT NULL;
```

#### Audit Log for Claiming Events
```sql
-- Enhanced audit log for claiming events
CREATE TABLE IF NOT EXISTS claiming_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  claimed_participant_id UUID NOT NULL REFERENCES participants(id),
  placeholder_identifier_id UUID NOT NULL REFERENCES placeholder_identifiers(id),
  identifier_type VARCHAR(10) NOT NULL,
  bills_affected UUID[] NOT NULL,
  financial_impact JSONB NOT NULL, -- Contains balance information
  claiming_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  registration_session_id VARCHAR(255), -- Link to registration session
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_claiming_audit_user ON claiming_audit_log(user_id);
CREATE INDEX idx_claiming_audit_timestamp ON claiming_audit_log(claiming_timestamp);
```

### Business Rules and Edge Cases

#### Multiple Identity Claiming
```typescript
const handleMultipleIdentityClaiming = async (
  userIdentifiers: UserIdentifier[]
): Promise<ConsolidationResult> => {
  // Find all claimable matches across all identifiers
  const allMatches = await findClaimablePlaceholders(userIdentifiers);
  
  // Group matches by participant to detect cross-identifier claiming
  const participantGroups = groupBy(allMatches, 'participant_id');
  
  // Handle cases where single participant has multiple identifiers
  const consolidatedMatches: ClaimableMatch[] = [];
  const consolidationIssues: ConsolidationIssue[] = [];
  
  for (const [participantId, matches] of Object.entries(participantGroups)) {
    if (matches.length === 1) {
      // Simple case: one identifier matches one participant
      consolidatedMatches.push(matches[0]);
    } else {
      // Complex case: multiple identifiers match same participant
      // This could happen if placeholder was added with different identifiers
      // Choose the earliest created placeholder identifier
      const earliestMatch = matches.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];
      
      consolidatedMatches.push(earliestMatch);
      
      consolidationIssues.push({
        type: 'MULTIPLE_IDENTIFIERS_SAME_PARTICIPANT',
        participant_id: participantId,
        conflicting_identifiers: matches.map(m => ({
          type: m.identifier_type,
          value: m.identifier_value,
          created_at: m.created_at
        })),
        resolution: `Using earliest identifier: ${earliestMatch.identifier_type}`,
        action_required: false
      });
    }
  }
  
  return {
    consolidated_matches: consolidatedMatches,
    consolidation_issues: consolidationIssues,
    requires_manual_review: consolidationIssues.some(issue => issue.action_required)
  };
};
```

## Integration Points

### Registration Process Integration
- Seamless integration with Story 1.4 signup endpoint
- No additional user action required for claiming
- Atomic transaction ensures data consistency

### Bill Management Integration
- Automatic bill access for claimed participants
- Real-time updates to bill member lists
- Balance recalculations include claimed history

### WebSocket Integration
- Real-time notifications to other bill members
- Automatic UI updates when placeholders are claimed
- Live participant list updates

## Testing Requirements

### Unit Tests
1. **Identifier Matching**: Test hash-based identifier matching accuracy
2. **Transaction Safety**: Test atomic claiming transaction rollback scenarios
3. **Balance Calculation**: Test accurate balance transfer from placeholder to user
4. **Edge Cases**: Test multiple identifier claiming and conflict resolution

### Integration Tests
1. **Registration Flow**: End-to-end registration with placeholder claiming
2. **Data Integrity**: Verify complete financial history preservation
3. **Notification System**: Test WebSocket notifications to bill members
4. **Multiple Bills**: Test claiming across multiple bills simultaneously

### Edge Case Tests
1. **Concurrent Claiming**: Test simultaneous registration attempts
2. **Partial Failures**: Test transaction rollback on claiming failures
3. **Invalid Claims**: Test handling of corrupted placeholder data
4. **Cross-Bill Conflicts**: Test complex scenarios with overlapping participants

## Performance Considerations

### Database Performance
- Efficient hash-based lookups for identifier matching
- Optimized transaction handling for atomic claiming
- Indexed queries for financial history calculations
- Batch notifications for multiple bill updates

### Memory Management
- Efficient processing of large claiming datasets
- Optimized balance calculation queries
- Minimal memory footprint for claiming transactions

## Security Considerations

### Data Integrity
- Atomic transactions prevent partial claiming states
- Comprehensive audit trail for all claiming events
- Cryptographic hash verification for identifier matching
- Immutable financial history preservation

### Privacy Protection
- Secure identifier hashing prevents reverse lookup
- Proper access control for claimed participant data
- LGPD compliance for claiming process and notifications

## Success Metrics

### Functional Success
- ✅ 100% accurate placeholder claiming based on identifier matching
- ✅ Complete financial history preservation during claiming
- ✅ Seamless user experience with no additional claiming steps required
- ✅ Real-time notifications to affected bill members
- ✅ Accurate balance calculations including pre-registration activity

### Performance Success
- ✅ Claiming process completes within 3 seconds for complex scenarios
- ✅ Registration with claiming completes within 5 seconds total
- ✅ Balance calculations remain accurate after claiming
- ✅ WebSocket notifications deliver within 1 second

### Data Integrity Success
- ✅ Zero financial data loss during claiming process
- ✅ Complete audit trail for all claiming events
- ✅ Atomic transaction safety prevents inconsistent states
- ✅ Accurate cross-bill claiming with no duplicates

## Definition of Done

### Implementation Complete
- [ ] Enhanced registration endpoint with claiming integration
- [ ] Atomic claiming transaction system
- [ ] Financial history preservation and balance calculation
- [ ] Real-time notification system for bill members
- [ ] Comprehensive audit logging for claiming events
- [ ] Frontend claiming result display with financial summary

### Testing Complete
- [ ] Unit tests cover all claiming scenarios with 95%+ coverage
- [ ] Integration tests verify complete claiming workflow
- [ ] Edge case tests handle complex claiming scenarios
- [ ] Performance tests validate claiming efficiency
- [ ] Security tests confirm data integrity and privacy protection

### Documentation Complete
- [ ] Enhanced API documentation with claiming examples
- [ ] Database schema changes for claiming support
- [ ] Claiming process architecture documentation
- [ ] Audit and compliance documentation for claiming events

## Estimated Effort

**Story Points**: 8  
**Time Estimate**: 6-8 hours  
**Complexity**: High (Transaction complexity, data integrity requirements, real-time notifications)

### Breakdown
- **Claiming Logic Implementation**: 2.5 hours
- **Database Transaction System**: 2 hours  
- **Balance Calculation Integration**: 1 hour
- **Notification System**: 1 hour
- **Frontend Integration**: 1 hour
- **Testing and Validation**: 0.5 hours

## Future Considerations

### Enhanced Features
- Manual claiming interface for complex scenarios
- Claiming conflict resolution dashboard
- Advanced claiming analytics and reporting
- Bulk claiming for organization accounts

### Advanced Security
- Multi-factor verification for high-value claims
- Enhanced audit trails with digital signatures
- Claiming fraud detection and prevention
- Advanced privacy controls for claiming notifications