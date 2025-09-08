# Story 4.3: Payment Suggestions and Manual Status Management

## Story Overview

**As a bill participant,**  
**I want clear payment suggestions with manual payment status management,**  
**so that I can track settlement progress and manually mark payments as completed or pending.**

## Dependencies

- **Story 4.1**: Settlement Recording (settlement system functional)
- **Story 4.2**: Debt Simplification Algorithm (payment suggestions available)
- **Story 3.4**: Balance Visualization (visual framework exists)

## Acceptance Criteria

### Payment Suggestions Interface
1. **Clear Payment Instructions**: Display specific "Pessoa A → Pessoa B: R$ Valor" format
2. **Simplified vs Original Toggle**: Switch between optimized and original payment views
3. **Payment Status Management**: Manual toggle between "Pendente", "Pago", and "Cancelado" states
4. **Status Indicators**: Visual status badges and colors for each payment suggestion
5. **Settlement Integration**: Mark as paid creates settlement record automatically

### Manual Status Management
1. **Payment Status Toggle**: Three-state system (Pending, Paid, Cancelled)
2. **Status Persistence**: Payment status saved and synced across all participants
3. **Settlement Creation**: "Mark as Paid" automatically creates settlement record
4. **Status History**: Track when status changes were made and by whom
5. **Bulk Status Updates**: Mark multiple payments as paid/cancelled simultaneously

## Technical Specifications

### Payment Status Management API

#### Payment Status Endpoints
```typescript
// Get payment suggestions with current status
GET /api/bills/:billId/payment-suggestions

Response:
{
  "success": true,
  "data": {
    "simplified_payments": [
      {
        "id": string,                    // Unique payment suggestion ID
        "from_participant_id": string,
        "from_participant_name": string,
        "to_participant_id": string,
        "to_participant_name": string,
        "amount_cents": number,
        "status": "pending" | "paid" | "cancelled",
        "status_updated_at": string,
        "status_updated_by": string,
        "settlement_id": string          // If status is "paid"
      }
    ],
    "original_payments": [...],          // Same structure
    "summary": {
      "total_suggestions": number,
      "pending_count": number,
      "paid_count": number,
      "cancelled_count": number,
      "completion_percentage": number
    }
  }
}

// Update payment status
PUT /api/bills/:billId/payment-suggestions/:suggestionId/status
Request Body:
{
  "status": "pending" | "paid" | "cancelled",
  "settlement_details": {             // Required when status = "paid"
    "method": "pix" | "cash" | "bank_transfer" | "other",
    "pix_reference": string,          // Optional
    "description": string,            // Optional
    "settlement_date": string         // Optional, defaults to now
  }
}

Success Response:
{
  "success": true,
  "data": {
    "suggestion_id": string,
    "new_status": string,
    "settlement_created": boolean,
    "settlement_id": string,           // If settlement was created
    "updated_at": string
  }
}
```

### Payment Suggestions Component
```typescript
interface PaymentSuggestionsProps {
  billId: string;
  simplificationResult: SimplificationResult;
  showSimplified: boolean;
  onToggleView: () => void;
}

const PaymentSuggestions: React.FC<PaymentSuggestionsProps> = ({
  billId,
  simplificationResult,
  showSimplified,
  onToggleView
}) => {
  const currentPayments = showSimplified 
    ? simplificationResult.simplified_payments 
    : simplificationResult.original_payments;
    
  const currentUserPayments = currentPayments.filter(p => 
    p.from_participant_id === getCurrentUserId()
  );
  
  const paymentsToReceive = currentPayments.filter(p => 
    p.to_participant_id === getCurrentUserId()
  );
  
  return (
    <div className="payment-suggestions">
      {/* Header with optimization stats */}
      <div className="suggestions-header">
        <h3>💡 Sugestões de Pagamento</h3>
        <div className="optimization-badge">
          <span className="reduction">
            {simplificationResult.transaction_reduction} pagamentos a menos
          </span>
          <span className="percentage">
            ({simplificationResult.optimization_percentage}% redução)
          </span>
        </div>
      </div>
      
      {/* View Toggle */}
      <div className="view-toggle">
        <button 
          className={`toggle-btn ${showSimplified ? 'active' : ''}`}
          onClick={() => onToggleView()}
        >
          <span className="icon">⚡</span>
          Otimizado ({simplificationResult.simplified_payments.length})
        </button>
        <button 
          className={`toggle-btn ${!showSimplified ? 'active' : ''}`}
          onClick={() => onToggleView()}
        >
          <span className="icon">📋</span>
          Original ({simplificationResult.original_payments.length})
        </button>
      </div>
      
      {/* User's payments section */}
      {currentUserPayments.length > 0 && (
        <div className="user-payments">
          <h4>💳 Seus Pagamentos ({currentUserPayments.length})</h4>
          {currentUserPayments.map((payment, index) => (
            <PaymentCard
              key={`${payment.to_participant_id}-${index}`}
              payment={payment}
              variant="outgoing"
              onMarkAsPaid={() => handleMarkAsPaid(payment)}
            />
          ))}
        </div>
      )}
      
      {/* Payments to receive section */}
      {paymentsToReceive.length > 0 && (
        <div className="incoming-payments">
          <h4>💰 Pagamentos para Você ({paymentsToReceive.length})</h4>
          {paymentsToReceive.map((payment, index) => (
            <PaymentCard
              key={`${payment.from_participant_id}-${index}`}
              payment={payment}
              variant="incoming"
              onSendReminder={() => handleSendReminder(payment)}
            />
          ))}
        </div>
      )}
      
      {/* Educational content */}
      <SimplificationExplanation 
        isVisible={showSimplified}
        transactionReduction={simplificationResult.transaction_reduction}
      />
    </div>
  );
};
```

### Payment Status Card Component
```typescript
const PaymentStatusCard: React.FC<{
  paymentSuggestion: PaymentSuggestion;
  variant: 'outgoing' | 'incoming';
  onStatusChange: (suggestionId: string, status: PaymentStatus, details?: SettlementDetails) => void;
}> = ({ paymentSuggestion, variant, onStatusChange }) => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  
  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">⏳ Pendente</span>;
      case 'paid':
        return <span className="status-badge paid">✅ Pago</span>;
      case 'cancelled':
        return <span className="status-badge cancelled">❌ Cancelado</span>;
    }
  };
  
  const handleStatusChange = (newStatus: PaymentStatus) => {
    if (newStatus === 'paid') {
      setSettlementModalOpen(true);
    } else {
      onStatusChange(paymentSuggestion.id, newStatus);
    }
    setStatusMenuOpen(false);
  };
  
  return (
    <div className={`payment-card ${variant}`}>
      <div className="payment-info">
        <div className="participants">
          {variant === 'outgoing' ? (
            <>
              <span className="payer you">Você</span>
              <span className="arrow">→</span>
              <span className="payee">{payment.to_participant_name}</span>
            </>
          ) : (
            <>
              <span className="payer">{payment.from_participant_name}</span>
              <span className="arrow">→</span>
              <span className="payee you">Você</span>
            </>
          )}
        </div>
        
        <div className="amount">
          <span className="currency">R$</span>
          <span className="value">
            {(payment.amount_cents / 100).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>
      </div>
      
      <div className="payment-actions">
        <div className="status-display">
          {getStatusBadge(paymentSuggestion.status)}
        </div>
        
        {variant === 'outgoing' && paymentSuggestion.status === 'pending' && (
          <div className="status-controls">
            <button
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className="status-btn"
            >
              ⚙️ Alterar Status
            </button>
            
            {statusMenuOpen && (
              <div className="status-menu">
                <button
                  onClick={() => handleStatusChange('paid')}
                  className="status-option paid"
                >
                  ✅ Marcar como Pago
                </button>
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  className="status-option cancelled"
                >
                  ❌ Cancelar Pagamento
                </button>
              </div>
            )}
          </div>
        )}
        
        {variant === 'incoming' && (
          <div className="incoming-status">
            {paymentSuggestion.status === 'pending' && (
              <span className="status-text">⏳ Aguardando pagamento</span>
            )}
            {paymentSuggestion.status === 'paid' && (
              <span className="status-text">✅ Pagamento recebido</span>
            )}
            {paymentSuggestion.status === 'cancelled' && (
              <span className="status-text">❌ Pagamento cancelado</span>
            )}
          </div>
        )}
      
      {paymentSuggestion.status_updated_at && (
        <div className="status-history">
          <small className="status-timestamp">
            Status alterado em {formatDateTime(paymentSuggestion.status_updated_at)}
            {paymentSuggestion.status_updated_by && ` por ${paymentSuggestion.status_updated_by}`}
          </small>
        </div>
      )}
    </div>
  );
};
```

### Educational Component
```typescript
const SimplificationExplanation: React.FC<{
  isVisible: boolean;
  transactionReduction: number;
}> = ({ isVisible, transactionReduction }) => {
  if (!isVisible || transactionReduction === 0) return null;
  
  return (
    <div className="simplification-explanation">
      <div className="explanation-header">
        <h4>❓ Como a Otimização Funciona</h4>
      </div>
      
      <div className="explanation-content">
        <p>
          Em vez de cada pessoa pagar individualmente suas dívidas,
          calculamos o caminho mais inteligente para liquidar tudo
          com o menor número de transações possível.
        </p>
        
        <div className="example">
          <h5>Exemplo:</h5>
          <div className="scenario">
            <div className="original">
              <strong>Original:</strong> A deve R$ 10 para B, B deve R$ 10 para C
              <br />
              <small>→ 2 pagamentos necessários</small>
            </div>
            <div className="optimized">
              <strong>Otimizado:</strong> A paga R$ 10 diretamente para C
              <br />
              <small>→ 1 pagamento necessário (50% menos!)</small>
            </div>
          </div>
        </div>
        
        <div className="benefits">
          <h5>Vantagens:</h5>
          <ul>
            <li>✅ Menos transações PIX</li>
            <li>✅ Menos trabalho para todos</li>
            <li>✅ Mesmo resultado final</li>
            <li>✅ Sem alterar valores devidos</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
```

### Settlement Modal for Manual Payment
```typescript
const SettlementModal: React.FC<{
  paymentSuggestion: PaymentSuggestion;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settlementDetails: SettlementDetails) => void;
}> = ({ paymentSuggestion, isOpen, onClose, onConfirm }) => {
  const [settlementDetails, setSettlementDetails] = useState<SettlementDetails>({
    method: 'pix',
    pix_reference: '',
    description: '',
    settlement_date: new Date().toISOString().split('T')[0]
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(settlementDetails);
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="settlement-modal">
      <div className="modal-header">
        <h3>✅ Confirmar Pagamento</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="modal-content">
        <div className="payment-summary">
          <p>
            <strong>Pagamento:</strong> {paymentSuggestion.from_participant_name} → {paymentSuggestion.to_participant_name}
          </p>
          <p>
            <strong>Valor:</strong> {formatCurrency(paymentSuggestion.amount_cents)}
          </p>
        </div>
        
        <div className="form-group">
          <label htmlFor="payment-method" className="required">
            Método de Pagamento
          </label>
          <select
            id="payment-method"
            value={settlementDetails.method}
            onChange={(e) => setSettlementDetails({
              ...settlementDetails, 
              method: e.target.value as PaymentMethod
            })}
            className="form-select"
            required
          >
            <option value="pix">PIX</option>
            <option value="bank_transfer">Transferência Bancária</option>
            <option value="cash">Dinheiro</option>
            <option value="other">Outro</option>
          </select>
        </div>
        
        {settlementDetails.method === 'pix' && (
          <div className="form-group">
            <label htmlFor="pix-reference">
              Referência PIX (Opcional)
            </label>
            <input
              id="pix-reference"
              type="text"
              value={settlementDetails.pix_reference}
              onChange={(e) => setSettlementDetails({
                ...settlementDetails,
                pix_reference: e.target.value
              })}
              placeholder="ID da transação PIX"
              className="form-input"
            />
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="settlement-date">
            Data do Pagamento
          </label>
          <input
            id="settlement-date"
            type="date"
            value={settlementDetails.settlement_date}
            onChange={(e) => setSettlementDetails({
              ...settlementDetails,
              settlement_date: e.target.value
            })}
            max={new Date().toISOString().split('T')[0]}
            className="form-input"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">
            Observações (Opcional)
          </label>
          <textarea
            id="description"
            value={settlementDetails.description}
            onChange={(e) => setSettlementDetails({
              ...settlementDetails,
              description: e.target.value
            })}
            placeholder="Notas sobre o pagamento..."
            className="form-textarea"
            rows={3}
          />
        </div>
        
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="button-secondary">
            Cancelar
          </button>
          <button type="submit" className="button-primary">
            Confirmar Pagamento
          </button>
        </div>
      </form>
    </Modal>
  );
};
```

### Mobile Optimizations
```scss
.payment-suggestions {
  @media (max-width: 767px) {
    .payment-card {
      .payment-actions {
        flex-direction: column;
        gap: 0.75rem;
        
        .action-btn {
          width: 100%;
          min-height: 44px;
          font-size: 16px; // Prevent iOS zoom
        }
      }
      
      .participants {
        font-size: 0.9rem;
        text-align: center;
        
        .arrow {
          display: block;
          font-size: 1.2rem;
          margin: 0.5rem 0;
        }
      }
    }
    
    .view-toggle {
      .toggle-btn {
        min-height: 44px;
        font-size: 14px;
      }
    }
  }
}
```

## Success Metrics

- ✅ Payment status management achieves >90% user engagement rate
- ✅ Manual status changes sync across all participants within 2 seconds
- ✅ "Mark as Paid" automatically creates settlement records with 100% accuracy
- ✅ Status history provides clear audit trail for all payment changes
- ✅ Mobile interface works seamlessly with 44px+ touch targets

## Estimated Effort: 5 Story Points (4-5 hours)