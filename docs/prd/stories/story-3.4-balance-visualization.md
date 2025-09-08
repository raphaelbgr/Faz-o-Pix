# Story 3.4: Balance Visualization

## Story Overview

**As a bill participant,**  
**I want clear visual representation of balances and payment flows,**  
**so that I can understand the financial situation at a glance and know exactly what actions to take.**

## Dependencies

- **Story 3.1**: Expense Addition (expenses exist)
- **Story 3.2**: Expense List Management (expense data)
- **Story 3.3**: Balance Calculation Engine (balance data available)

## Acceptance Criteria

### Visual Balance Overview
1. **Participant Balance Cards**: Color-coded cards showing each participant's net position
2. **Brazilian Currency Formatting**: All amounts displayed as R$ 1.234,56 with proper locale
3. **Status Indicators**: Green for credit, red for debt, gray for settled, blue for current user
4. **Balance Magnitude**: Visual indicators for balance size (small/medium/large debts)
5. **Responsive Layout**: Mobile-first design that works on all screen sizes

### Payment Flow Visualization
1. **Payment Suggestions**: Clear "Person A → Person B: R$ Amount" format
2. **Interactive Elements**: Copy PIX keys, mark as paid, send payment reminders
3. **Flow Diagram**: Visual representation of payment flow for complex scenarios
4. **Toggle Views**: Switch between simplified and original debt views
5. **Progress Indicators**: Show settlement progress as payments are made

### Brazilian Localization
1. **Currency Format**: R$ 1.234,56 (period for thousands, comma for decimals)
2. **Date Formatting**: DD/MM/YYYY for all dates
3. **Portuguese Interface**: All UI text in natural Brazilian Portuguese
4. **Number Formatting**: Brazilian decimal conventions throughout

## Technical Specifications

### Component Architecture

#### Balance Overview Component
```typescript
interface BalanceVisualizationProps {
  billId: string;
  balances: BillBalanceResult;
  showSimplified: boolean;
  onToggleView: () => void;
}

const BalanceVisualization: React.FC<BalanceVisualizationProps> = ({
  billId,
  balances,
  showSimplified,
  onToggleView
}) => {
  return (
    <div className="balance-visualization">
      <div className="view-toggle">
        <button 
          className={`toggle-btn ${showSimplified ? 'active' : ''}`}
          onClick={onToggleView}
        >
          Simplificado ({balances.pairwise_debts.length})
        </button>
        <button 
          className={`toggle-btn ${!showSimplified ? 'active' : ''}`}
          onClick={onToggleView}
        >
          Original ({balances.original_debts?.length || 0})
        </button>
      </div>
      
      <div className="balance-overview">
        <div className="participants-grid">
          {balances.participants.map(participant => (
            <ParticipantBalanceCard 
              key={participant.participant_id}
              participant={participant}
            />
          ))}
        </div>
      </div>
      
      {showSimplified ? (
        <SimplifiedPaymentFlow debts={balances.pairwise_debts} />
      ) : (
        <OriginalPaymentFlow participants={balances.participants} />
      )}
    </div>
  );
};
```

#### Participant Balance Card
```typescript
const ParticipantBalanceCard: React.FC<{ participant: ParticipantBalance }> = ({
  participant
}) => {
  const balanceClass = getBalanceClass(participant.net_balance_cents);
  const isCurrentUser = useCurrentUser()?.id === participant.user_id;
  
  return (
    <div className={`balance-card ${balanceClass} ${isCurrentUser ? 'current-user' : ''}`}>
      <div className="participant-info">
        <div className="avatar">
          {participant.is_placeholder ? '👤' : '👨‍💼'}
        </div>
        <div className="details">
          <h4 className="name">
            {participant.participant_name}
            {participant.is_placeholder && <span className="badge">Convidado</span>}
            {isCurrentUser && <span className="badge current">Você</span>}
          </h4>
          <div className="activity">
            Pagou: {formatCurrency(participant.total_paid_cents)} • 
            Deve: {formatCurrency(participant.total_owed_cents)}
          </div>
        </div>
      </div>
      
      <div className="balance-amount">
        <span className={`amount ${balanceClass}`}>
          {formatCurrency(participant.net_balance_cents)}
        </span>
        <div className="balance-bar">
          <div 
            className={`bar-fill ${balanceClass}`}
            style={{ width: `${getBalancePercentage(participant.net_balance_cents)}%` }}
          />
        </div>
      </div>
      
      {isCurrentUser && (
        <div className="user-actions">
          {participant.net_balance_cents > 0 && (
            <span className="status positive">💰 Devem para você</span>
          )}
          {participant.net_balance_cents < 0 && (
            <span className="status negative">⚠️ Você deve</span>
          )}
          {participant.net_balance_cents === 0 && (
            <span className="status neutral">✅ Quitado</span>
          )}
        </div>
      )}
    </div>
  );
};
```

#### Payment Suggestion Component
```typescript
const PaymentSuggestion: React.FC<{ debt: PairwiseDebt }> = ({ debt }) => {
  const [copied, setCopied] = useState<'amount' | 'pix' | null>(null);
  
  const copyToClipboard = async (text: string, type: 'amount' | 'pix') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };
  
  const handleMarkAsPaid = () => {
    // Navigate to settlement recording with pre-filled data
    router.push(`/bills/${billId}/settlements/new?` + 
      `payer=${debt.debtor_id}&payee=${debt.creditor_id}&amount=${debt.amount_cents}`);
  };
  
  return (
    <div className="payment-suggestion">
      <div className="payment-flow">
        <div className="debtor">
          <span className="name">{debt.debtor_name}</span>
        </div>
        <div className="arrow">→</div>
        <div className="creditor">
          <span className="name">{debt.creditor_name}</span>
        </div>
      </div>
      
      <div className="amount">
        <span className="currency">R$</span>
        <span className="value">
          {(debt.amount_cents / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </span>
      </div>
      
      <div className="actions">
        <button
          onClick={() => copyToClipboard(
            (debt.amount_cents / 100).toFixed(2).replace('.', ','), 'amount'
          )}
          className={`action-btn ${copied === 'amount' ? 'copied' : ''}`}
        >
          {copied === 'amount' ? '✓' : '📋'} {copied === 'amount' ? 'Copiado' : 'Valor'}
        </button>
        
        <button
          onClick={() => copyToClipboard('PIX_KEY_HERE', 'pix')}
          className={`action-btn ${copied === 'pix' ? 'copied' : ''}`}
        >
          {copied === 'pix' ? '✓' : '💳'} {copied === 'pix' ? 'Copiado' : 'PIX'}
        </button>
        
        <button
          onClick={handleMarkAsPaid}
          className="action-btn primary"
        >
          ✓ Marcar Pago
        </button>
      </div>
    </div>
  );
};
```

### Brazilian Currency Formatting

```typescript
const formatCurrency = (cents: number): string => {
  const reais = cents / 100;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(reais);
};

// Examples:
// formatCurrency(123456) → "R$ 1.234,56"
// formatCurrency(-500) → "-R$ 5,00" 
// formatCurrency(0) → "R$ 0,00"
```

### Color Coding System

```scss
// Brazilian-themed color palette
$colors: (
  positive: #28a745,  // Green for credit (money owed to user)
  negative: #dc3545,  // Red for debt (money user owes)
  neutral: #6c757d,   // Gray for settled/zero balance
  current: #007bff,   // Blue for current user highlight
  placeholder: #ffc107 // Yellow for placeholder participants
);

.balance-card {
  &.positive {
    border-left: 4px solid $colors-positive;
    background: linear-gradient(to right, rgba($colors-positive, 0.1), transparent);
  }
  
  &.negative {
    border-left: 4px solid $colors-negative;
    background: linear-gradient(to right, rgba($colors-negative, 0.1), transparent);
  }
  
  &.neutral {
    border-left: 4px solid $colors-neutral;
    background: rgba($colors-neutral, 0.05);
  }
  
  &.current-user {
    box-shadow: 0 0 0 2px $colors-current;
  }
}
```

### Responsive Design

```scss
.balance-visualization {
  // Mobile-first responsive design
  .participants-grid {
    display: grid;
    gap: 1rem;
    
    // Mobile: Single column
    @media (max-width: 767px) {
      grid-template-columns: 1fr;
    }
    
    // Tablet: Two columns
    @media (min-width: 768px) and (max-width: 1023px) {
      grid-template-columns: repeat(2, 1fr);
    }
    
    // Desktop: Three or more columns based on count
    @media (min-width: 1024px) {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
  }
  
  .payment-suggestion {
    // Mobile: Stack vertically
    @media (max-width: 767px) {
      flex-direction: column;
      
      .actions {
        flex-direction: column;
        gap: 0.5rem;
        
        .action-btn {
          width: 100%;
          min-height: 44px; // iOS touch target minimum
        }
      }
    }
    
    // Desktop: Horizontal layout
    @media (min-width: 768px) {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
}
```

## Success Metrics

- ✅ Balance visualization loads within 1 second after data fetch
- ✅ All currency amounts display in correct Brazilian format (R$ 1.234,56)
- ✅ Color coding provides immediate visual understanding of financial status
- ✅ Mobile layout works seamlessly on devices 320px and wider
- ✅ Copy-to-clipboard functionality works across all major browsers
- ✅ Payment suggestions generate 80%+ user action rate

## Estimated Effort: 5 Story Points (4-5 hours)