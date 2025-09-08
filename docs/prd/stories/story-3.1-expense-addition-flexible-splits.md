# Story 3.1: Expense Addition with Flexible Splits

## Story Overview

**As a bill participant,**  
**I want to add expenses with different splitting methods (equal, percentage, custom shares),**  
**so that I can accurately track various payment scenarios and fairly distribute costs.**

## Dependencies

- **Story 1.1**: Project Infrastructure Setup (Docker, environment setup)
- **Story 1.2**: Database Schema and Prisma Setup (expenses, expense_splits tables)
- **Story 1.3**: Fastify API Foundation (routing, validation, error handling)
- **Story 2.1**: Bill Creation and Management (bills must exist to add expenses)
- **Story 2.2**: Participant Addition with Placeholder Support (participants must exist)
- **Story 2.3**: Placeholder Account Claiming (participant system operational)

## Acceptance Criteria

### Core Expense Creation
1. **POST /api/bills/:id/expenses** accepts payer, amount, description, date, and splits configuration
2. **Brazilian Currency**: Amount stored in cents (R$ 12.34 = 1234 cents) to avoid floating-point errors
3. **Split Type Support**: Equal, percentage, and custom shares splitting methods
4. **Denormalized Storage**: Split amounts calculated and stored on write for optimal read performance
5. **Mathematical Accuracy**: Split amounts always sum exactly to expense total with proper rounding
6. **Audit Trail**: Complete expense creation history with timestamps and creator information

### Equal Split Implementation
1. **Automatic Distribution**: Divide expense amount equally among selected participants
2. **Remainder Handling**: Use "largest remainder" method to distribute rounding remainders fairly
3. **Participant Selection**: Allow selection of specific participants (not necessarily all bill members)
4. **Validation**: Ensure at least one participant selected and payer is included in splits
5. **Preview Calculation**: Show split amounts before saving for user confirmation

### Percentage Split Implementation
1. **Custom Percentages**: Allow custom percentage for each selected participant
2. **100% Validation**: Ensure percentages sum exactly to 100% before saving
3. **Decimal Support**: Support decimal percentages (e.g., 33.33%, 33.33%, 33.34%)
4. **Rounding Logic**: Handle percentage-based rounding to ensure exact total match
5. **Real-time Validation**: Show running percentage total as user enters values

### Custom Shares Split Implementation
1. **Proportional Distribution**: Allow custom shares/weights for each participant
2. **Flexible Ratios**: Support any positive integer shares (e.g., 2:3:1 ratio)
3. **Automatic Calculation**: Convert shares to proportional amounts automatically
4. **Rounding Consistency**: Ensure share-based amounts sum exactly to expense total
5. **Share Preview**: Show calculated amounts based on shares before saving

## Technical Specifications

### API Endpoint Design

#### Create Expense with Flexible Splits
```typescript
POST /api/bills/:billId/expenses
Authorization: Bearer {session_token}
Content-Type: application/json

Request Body:
{
  "payer_participant_id": string,        // Who paid for this expense
  "amount_cents": number,                // Amount in Brazilian Real cents
  "description": string,                 // Required, max 200 characters
  "expense_date": string,                // ISO 8601 date (YYYY-MM-DD)
  "split_type": "equal" | "percentage" | "shares",
  "splits": ExpenseSplit[]               // Array of participant splits
}

// Split configurations by type:

// Equal Split (amounts calculated automatically)
interface EqualSplit {
  participant_id: string;
  // No additional fields needed - amounts calculated equally
}

// Percentage Split (must sum to 100%)
interface PercentageSplit {
  participant_id: string;
  percentage: number;                    // Decimal percentage (e.g., 33.33)
}

// Custom Shares Split (proportional weights)
interface SharesSplit {
  participant_id: string;
  shares: number;                        // Positive integer weight
}

Success Response (201):
{
  "success": true,
  "data": {
    "id": string,
    "payer_participant_id": string,
    "payer_name": string,
    "amount_cents": number,
    "description": string,
    "expense_date": string,               // ISO 8601 date
    "split_type": "equal" | "percentage" | "shares",
    "splits": [
      {
        "participant_id": string,
        "participant_name": string,
        "amount_cents": number,           // Calculated/denormalized amount
        "percentage": number,             // Only for percentage splits
        "shares": number                  // Only for shares splits
      }
    ],
    "created_at": string,
    "created_by_user_id": string,
    "bill_balance_impact": {
      "participants_affected": number,
      "balance_changes": [
        {
          "participant_id": string,
          "old_balance": number,
          "new_balance": number,
          "change": number
        }
      ]
    }
  }
}

Error Response (400) - Validation Error:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados da despesa inválidos",
    "details": {
      "splits": "Percentuais devem somar 100%",
      "current_total": 95.5,
      "missing_percentage": 4.5
    }
  }
}

Error Response (409) - Business Logic Error:
{
  "success": false,
  "error": {
    "code": "INVALID_SPLIT_CONFIGURATION",
    "message": "Configuração de divisão inválida",
    "details": {
      "issue": "PAYER_NOT_IN_SPLITS",
      "suggestion": "O pagador deve estar incluído na divisão da despesa"
    }
  }
}
```

### Split Calculation Algorithms

#### Equal Split Algorithm
```typescript
const calculateEqualSplit = (totalCents: number, participantIds: string[]): ExpenseSplit[] => {
  const participantCount = participantIds.length;
  const baseAmount = Math.floor(totalCents / participantCount);
  const remainder = totalCents % participantCount;
  
  const splits: ExpenseSplit[] = [];
  
  // Distribute base amount to all participants
  for (let i = 0; i < participantCount; i++) {
    const participantId = participantIds[i];
    let amount = baseAmount;
    
    // Distribute remainder cents to first N participants
    // This ensures fair distribution of rounding
    if (i < remainder) {
      amount += 1;
    }
    
    splits.push({
      participant_id: participantId,
      amount_cents: amount,
      split_type: 'equal'
    });
  }
  
  // Verify total matches (should always be true)
  const calculatedTotal = splits.reduce((sum, split) => sum + split.amount_cents, 0);
  if (calculatedTotal !== totalCents) {
    throw new Error(`Split calculation error: ${calculatedTotal} !== ${totalCents}`);
  }
  
  return splits;
};
```

#### Percentage Split Algorithm
```typescript
const calculatePercentageSplit = (
  totalCents: number, 
  percentageSplits: { participant_id: string; percentage: number }[]
): ExpenseSplit[] => {
  // Validate percentages sum to 100%
  const totalPercentage = percentageSplits.reduce((sum, split) => sum + split.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100%, got ${totalPercentage}%`);
  }
  
  const splits: ExpenseSplit[] = [];
  let allocatedCents = 0;
  
  // Calculate amounts for all but last participant
  for (let i = 0; i < percentageSplits.length - 1; i++) {
    const split = percentageSplits[i];
    const amount = Math.round(totalCents * split.percentage / 100);
    
    splits.push({
      participant_id: split.participant_id,
      amount_cents: amount,
      percentage: split.percentage,
      split_type: 'percentage'
    });
    
    allocatedCents += amount;
  }
  
  // Last participant gets remainder to ensure exact total
  const lastSplit = percentageSplits[percentageSplits.length - 1];
  const lastAmount = totalCents - allocatedCents;
  
  splits.push({
    participant_id: lastSplit.participant_id,
    amount_cents: lastAmount,
    percentage: lastSplit.percentage,
    split_type: 'percentage'
  });
  
  // Verify total matches
  const calculatedTotal = splits.reduce((sum, split) => sum + split.amount_cents, 0);
  if (calculatedTotal !== totalCents) {
    throw new Error(`Percentage split calculation error: ${calculatedTotal} !== ${totalCents}`);
  }
  
  return splits;
};
```

#### Custom Shares Split Algorithm
```typescript
const calculateSharesSplit = (
  totalCents: number,
  sharesSplits: { participant_id: string; shares: number }[]
): ExpenseSplit[] => {
  // Calculate total shares
  const totalShares = sharesSplits.reduce((sum, split) => sum + split.shares, 0);
  if (totalShares <= 0) {
    throw new Error('Total shares must be positive');
  }
  
  const splits: ExpenseSplit[] = [];
  let allocatedCents = 0;
  
  // Calculate amounts for all but last participant
  for (let i = 0; i < sharesSplits.length - 1; i++) {
    const split = sharesSplits[i];
    const amount = Math.round(totalCents * split.shares / totalShares);
    
    splits.push({
      participant_id: split.participant_id,
      amount_cents: amount,
      shares: split.shares,
      split_type: 'shares'
    });
    
    allocatedCents += amount;
  }
  
  // Last participant gets remainder to ensure exact total
  const lastSplit = sharesSplits[sharesSplits.length - 1];
  const lastAmount = totalCents - allocatedCents;
  
  splits.push({
    participant_id: lastSplit.participant_id,
    amount_cents: lastAmount,
    shares: lastSplit.shares,
    split_type: 'shares'
  });
  
  // Verify total matches
  const calculatedTotal = splits.reduce((sum, split) => sum + split.amount_cents, 0);
  if (calculatedTotal !== totalCents) {
    throw new Error(`Shares split calculation error: ${calculatedTotal} !== ${totalCents}`);
  }
  
  return splits;
};
```

### Database Operations

#### Expense Creation Transaction
```sql
-- Complete expense creation with splits in a single transaction
BEGIN;
  -- 1. Insert expense record
  INSERT INTO expenses (
    id, bill_id, payer_participant_id, amount_cents, 
    description, expense_date, split_type, created_at, created_by_user_id
  ) VALUES (
    gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7
  ) RETURNING id;
  
  -- 2. Insert expense splits (batch insert for performance)
  INSERT INTO expense_splits (
    id, expense_id, participant_id, amount_cents, percentage, shares
  ) VALUES 
    (gen_random_uuid(), expense_id, $participant_id_1, $amount_cents_1, $percentage_1, $shares_1),
    (gen_random_uuid(), expense_id, $participant_id_2, $amount_cents_2, $percentage_2, $shares_2),
    -- ... additional splits
  ;
  
  -- 3. Update bill's last activity timestamp
  UPDATE bills SET updated_at = NOW() WHERE id = $1;
  
  -- 4. Invalidate cached balances for this bill
  DELETE FROM bill_balance_cache WHERE bill_id = $1;
  
COMMIT;
```

#### Optimized Expense Query with Splits
```sql
-- Efficient query to get expense with all splits
SELECT 
  e.id,
  e.bill_id,
  e.payer_participant_id,
  p_payer.display_name as payer_name,
  e.amount_cents,
  e.description,
  e.expense_date,
  e.split_type,
  e.created_at,
  e.created_by_user_id,
  -- Aggregate splits into JSON for easy handling
  COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'participant_id', es.participant_id,
        'participant_name', p_split.display_name,
        'amount_cents', es.amount_cents,
        'percentage', es.percentage,
        'shares', es.shares
      ) ORDER BY p_split.display_name
    ) FILTER (WHERE es.id IS NOT NULL),
    '[]'::json
  ) as splits
FROM expenses e
LEFT JOIN participants p_payer ON e.payer_participant_id = p_payer.id
LEFT JOIN expense_splits es ON e.id = es.expense_id
LEFT JOIN participants p_split ON es.participant_id = p_split.id
WHERE e.id = $1
GROUP BY e.id, e.bill_id, e.payer_participant_id, p_payer.display_name,
         e.amount_cents, e.description, e.expense_date, e.split_type,
         e.created_at, e.created_by_user_id;
```

### Input Validation and Business Rules

#### Comprehensive Expense Validation
```typescript
const validateExpenseRequest = async (
  billId: string,
  request: CreateExpenseRequest,
  currentUserId: string
): Promise<ValidationResult> => {
  const errors: ValidationError[] = [];
  
  // 1. Validate user can add expenses to this bill
  const billMember = await prisma.billMember.findFirst({
    where: {
      bill_id: billId,
      participant: {
        users_participants_link: {
          user_id: currentUserId
        }
      }
    }
  });
  
  if (!billMember) {
    return {
      isValid: false,
      error: "Você não tem permissão para adicionar despesas a esta conta"
    };
  }
  
  // 2. Validate amount
  if (!request.amount_cents || request.amount_cents <= 0) {
    errors.push({
      field: 'amount_cents',
      message: 'Valor deve ser maior que zero'
    });
  }
  
  if (request.amount_cents > 100000000) { // R$ 1,000,000.00 limit
    errors.push({
      field: 'amount_cents',
      message: 'Valor muito alto. Máximo: R$ 1.000.000,00'
    });
  }
  
  // 3. Validate description
  if (!request.description?.trim()) {
    errors.push({
      field: 'description',
      message: 'Descrição é obrigatória'
    });
  }
  
  if (request.description && request.description.length > 200) {
    errors.push({
      field: 'description',
      message: 'Descrição deve ter no máximo 200 caracteres'
    });
  }
  
  // 4. Validate expense date
  const expenseDate = new Date(request.expense_date);
  const today = new Date();
  const maxPastDate = new Date();
  maxPastDate.setFullYear(today.getFullYear() - 2); // Max 2 years ago
  
  if (expenseDate > today) {
    errors.push({
      field: 'expense_date',
      message: 'Data da despesa não pode ser no futuro'
    });
  }
  
  if (expenseDate < maxPastDate) {
    errors.push({
      field: 'expense_date',
      message: 'Data da despesa muito antiga (máximo 2 anos)'
    });
  }
  
  // 5. Validate payer is bill member
  const payerIsMember = await prisma.billMember.findFirst({
    where: {
      bill_id: billId,
      participant_id: request.payer_participant_id
    }
  });
  
  if (!payerIsMember) {
    errors.push({
      field: 'payer_participant_id',
      message: 'Pagador deve ser participante desta conta'
    });
  }
  
  // 6. Validate splits based on type
  const splitValidation = await validateSplits(
    billId, 
    request.amount_cents,
    request.split_type, 
    request.splits,
    request.payer_participant_id
  );
  
  if (!splitValidation.isValid) {
    errors.push(...splitValidation.errors);
  }
  
  if (errors.length > 0) {
    return {
      isValid: false,
      errors: errors
    };
  }
  
  return { isValid: true };
};
```

#### Split-Specific Validation
```typescript
const validateSplits = async (
  billId: string,
  totalCents: number,
  splitType: string,
  splits: any[],
  payerParticipantId: string
): Promise<SplitValidationResult> => {
  const errors: ValidationError[] = [];
  
  // 1. Basic splits validation
  if (!splits || splits.length === 0) {
    errors.push({
      field: 'splits',
      message: 'Pelo menos um participante deve ser incluído na divisão'
    });
    return { isValid: false, errors };
  }
  
  if (splits.length > 50) {
    errors.push({
      field: 'splits',
      message: 'Máximo de 50 participantes por despesa'
    });
  }
  
  // 2. Validate all participants are bill members
  const participantIds = splits.map(split => split.participant_id);
  const validParticipants = await prisma.billMember.findMany({
    where: {
      bill_id: billId,
      participant_id: { in: participantIds }
    }
  });
  
  if (validParticipants.length !== participantIds.length) {
    const invalidIds = participantIds.filter(id => 
      !validParticipants.some(vp => vp.participant_id === id)
    );
    errors.push({
      field: 'splits',
      message: `Participantes inválidos encontrados: ${invalidIds.length}`
    });
  }
  
  // 3. Validate payer is included in splits (business rule)
  if (!participantIds.includes(payerParticipantId)) {
    errors.push({
      field: 'splits',
      message: 'O pagador deve estar incluído na divisão da despesa'
    });
  }
  
  // 4. Type-specific validation
  switch (splitType) {
    case 'equal':
      // No additional validation needed for equal splits
      break;
      
    case 'percentage':
      const totalPercentage = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push({
          field: 'splits',
          message: `Percentuais devem somar 100%. Total atual: ${totalPercentage}%`
        });
      }
      
      for (const split of splits) {
        if (!split.percentage || split.percentage <= 0 || split.percentage > 100) {
          errors.push({
            field: 'splits',
            message: 'Todos os percentuais devem estar entre 0% e 100%'
          });
          break;
        }
      }
      break;
      
    case 'shares':
      for (const split of splits) {
        if (!split.shares || split.shares <= 0 || !Number.isInteger(split.shares)) {
          errors.push({
            field: 'splits',
            message: 'Todas as partes devem ser números inteiros positivos'
          });
          break;
        }
      }
      break;
      
    default:
      errors.push({
        field: 'split_type',
        message: 'Tipo de divisão deve ser: equal, percentage, ou shares'
      });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};
```

### Frontend Integration

#### Expense Creation Form Component
```typescript
interface CreateExpenseFormProps {
  billId: string;
  participants: BillParticipant[];
  onSuccess: (expense: Expense) => void;
  onCancel: () => void;
}

const CreateExpenseForm: React.FC<CreateExpenseFormProps> = ({
  billId,
  participants,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    payer_participant_id: '',
    amount_cents: 0,
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    split_type: 'equal' as SplitType,
    splits: []
  });
  
  const [splitPreview, setSplitPreview] = useState<SplitPreview | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  const createExpenseMutation = useMutation({
    mutationFn: async (data: CreateExpenseRequest) => {
      const response = await fetch(`/api/bills/${billId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message || 'Erro ao criar despesa');
      }
      
      return response.json();
    },
    onSuccess: (response) => {
      toast.success('Despesa criada com sucesso!');
      onSuccess(response.data);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  // Calculate split preview when inputs change
  useEffect(() => {
    if (formData.amount_cents > 0 && selectedParticipants.length > 0) {
      const preview = calculateSplitPreview(
        formData.amount_cents,
        formData.split_type,
        selectedParticipants,
        formData.splits,
        participants
      );
      setSplitPreview(preview);
    } else {
      setSplitPreview(null);
    }
  }, [formData.amount_cents, formData.split_type, selectedParticipants, formData.splits]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build splits array based on split type
    const splits = buildSplitsArray(
      formData.split_type,
      selectedParticipants,
      formData.splits
    );
    
    createExpenseMutation.mutate({
      ...formData,
      splits
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="create-expense-form">
      {/* Amount Input */}
      <div className="form-group">
        <label htmlFor="amount" className="required">
          Valor da Despesa
        </label>
        <div className="amount-input">
          <span className="currency-symbol">R$</span>
          <input
            id="amount"
            type="number"
            min="0.01"
            max="1000000.00"
            step="0.01"
            value={formData.amount_cents / 100}
            onChange={(e) => setFormData({
              ...formData, 
              amount_cents: Math.round(parseFloat(e.target.value || '0') * 100)
            })}
            placeholder="0,00"
            className="form-input amount"
            required
          />
        </div>
        <small className="form-hint">
          Digite o valor total da despesa
        </small>
      </div>
      
      {/* Description Input */}
      <div className="form-group">
        <label htmlFor="description" className="required">
          Descrição
        </label>
        <input
          id="description"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Para que foi essa despesa?"
          maxLength={200}
          className="form-input"
          required
        />
        <div className="character-count">
          {formData.description.length}/200
        </div>
      </div>
      
      {/* Date Input */}
      <div className="form-group">
        <label htmlFor="expense-date" className="required">
          Data da Despesa
        </label>
        <input
          id="expense-date"
          type="date"
          value={formData.expense_date}
          onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
          max={new Date().toISOString().split('T')[0]}
          className="form-input"
          required
        />
      </div>
      
      {/* Payer Selection */}
      <div className="form-group">
        <label htmlFor="payer" className="required">
          Quem Pagou
        </label>
        <select
          id="payer"
          value={formData.payer_participant_id}
          onChange={(e) => setFormData({...formData, payer_participant_id: e.target.value})}
          className="form-select"
          required
        >
          <option value="">Selecione quem pagou</option>
          {participants.map(participant => (
            <option key={participant.participant_id} value={participant.participant_id}>
              {participant.display_name}
              {participant.is_placeholder && ' (convidado)'}
            </option>
          ))}
        </select>
      </div>
      
      {/* Split Type Selection */}
      <div className="form-group">
        <label>Tipo de Divisão</label>
        <div className="split-type-options">
          <label className="radio-label">
            <input
              type="radio"
              name="split_type"
              value="equal"
              checked={formData.split_type === 'equal'}
              onChange={(e) => setFormData({...formData, split_type: e.target.value as SplitType})}
            />
            <span className="radio-custom"></span>
            Igual para todos
            <small>Divide o valor igualmente</small>
          </label>
          
          <label className="radio-label">
            <input
              type="radio"
              name="split_type"
              value="percentage"
              checked={formData.split_type === 'percentage'}
              onChange={(e) => setFormData({...formData, split_type: e.target.value as SplitType})}
            />
            <span className="radio-custom"></span>
            Por percentual
            <small>Define percentual para cada pessoa</small>
          </label>
          
          <label className="radio-label">
            <input
              type="radio"
              name="split_type"
              value="shares"
              checked={formData.split_type === 'shares'}
              onChange={(e) => setFormData({...formData, split_type: e.target.value as SplitType})}
            />
            <span className="radio-custom"></span>
            Por partes
            <small>Define proporção para cada pessoa</small>
          </label>
        </div>
      </div>
      
      {/* Participant Selection and Split Configuration */}
      <div className="form-group">
        <label className="required">
          Quem Deve Pagar
        </label>
        <ParticipantSplitSelector
          participants={participants}
          splitType={formData.split_type}
          selectedParticipants={selectedParticipants}
          onSelectionChange={setSelectedParticipants}
          splitConfiguration={formData.splits}
          onSplitConfigurationChange={(splits) => setFormData({...formData, splits})}
          payerParticipantId={formData.payer_participant_id}
        />
      </div>
      
      {/* Split Preview */}
      {splitPreview && (
        <div className="split-preview">
          <h4>Prévia da Divisão</h4>
          <div className="preview-list">
            {splitPreview.splits.map(split => (
              <div key={split.participant_id} className="preview-item">
                <span className="participant-name">
                  {split.participant_name}
                  {split.participant_id === formData.payer_participant_id && ' (pagou)'}
                </span>
                <span className="split-amount">
                  R$ {(split.amount_cents / 100).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
                {formData.split_type === 'percentage' && (
                  <span className="split-detail">({split.percentage}%)</span>
                )}
                {formData.split_type === 'shares' && (
                  <span className="split-detail">({split.shares} partes)</span>
                )}
              </div>
            ))}
          </div>
          <div className="preview-total">
            <strong>
              Total: R$ {(splitPreview.total_cents / 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </strong>
          </div>
        </div>
      )}
      
      {/* Form Actions */}
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="button-secondary">
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={!splitPreview || createExpenseMutation.isPending}
          className="button-primary"
        >
          {createExpenseMutation.isPending ? 'Criando...' : 'Criar Despesa'}
        </button>
      </div>
    </form>
  );
};
```

## Integration Points

### Balance Calculation System
- Immediate balance updates when expenses are created
- Integration with cached balance calculations
- Real-time balance impact preview

### WebSocket Integration
- Real-time notifications to other bill participants
- Live expense list updates when new expenses are added
- Automatic balance updates in connected clients

### Audit and History System
- Complete audit trail for expense creation
- Integration with bill activity tracking
- Historical expense modification tracking

## Testing Requirements

### Unit Tests
1. **Split Calculation Algorithms**: Test all three split types with edge cases and rounding scenarios
2. **Amount Validation**: Test Brazilian Real cent-based calculations and limits
3. **Business Rules**: Test payer inclusion, participant validation, and bill membership
4. **Mathematical Accuracy**: Property-based testing to ensure splits always sum to total

### Integration Tests
1. **Complete Expense Flow**: End-to-end expense creation with all split types
2. **Balance Impact**: Verify accurate balance calculations after expense creation
3. **Database Transactions**: Test transaction rollback on failures
4. **Concurrent Creation**: Test multiple users creating expenses simultaneously

### Performance Tests
1. **Large Split Lists**: Test expense creation with 50+ participants
2. **Calculation Performance**: Benchmark split calculation algorithms
3. **Database Performance**: Test expense insertion and query performance
4. **API Response Time**: Validate response times under load

## Performance Considerations

### Database Performance
- Denormalized split amounts for fast balance calculations
- Batch insert of expense splits in single transaction
- Optimized indexes for expense queries
- Efficient balance cache invalidation

### Calculation Performance
- Optimized algorithms with O(n) time complexity
- Minimized floating-point operations using integer cents
- Efficient rounding algorithms for split accuracy

## Security Considerations

### Input Validation
- Comprehensive validation of all expense parameters
- Protection against SQL injection through parameterized queries
- Amount limits to prevent abuse
- Date validation to prevent future-dated expenses

### Access Control
- Bill membership validation for expense creation
- Participant validation for all split assignments
- User authentication for all expense operations

## Success Metrics

### Functional Success
- ✅ All three split types (equal, percentage, shares) work correctly with proper rounding
- ✅ Split amounts always sum exactly to expense total (zero rounding errors)
- ✅ Expense creation completes successfully for all valid scenarios
- ✅ Real-time split preview provides accurate calculations
- ✅ Brazilian Real formatting and cent-based calculations work correctly

### Performance Success
- ✅ Expense creation completes within 1 second for normal scenarios
- ✅ Split calculations execute within 100ms for 50+ participants
- ✅ Database operations maintain ACID properties under concurrent access
- ✅ Real-time preview updates respond within 200ms

### Mathematical Success
- ✅ Split calculations maintain perfect accuracy with no floating-point errors
- ✅ Rounding distribution is fair and consistent across all scenarios
- ✅ Edge cases (single cent amounts, prime number distributions) handled correctly
- ✅ Large amounts (up to R$ 1,000,000) split accurately

## Definition of Done

### Implementation Complete
- [ ] POST /api/bills/:id/expenses endpoint with all three split types
- [ ] Split calculation algorithms with perfect mathematical accuracy
- [ ] Database transaction system for atomic expense creation
- [ ] Frontend expense creation form with real-time split preview
- [ ] Comprehensive input validation and error handling
- [ ] Integration with balance calculation and caching systems

### Testing Complete
- [ ] Unit tests achieve 95%+ coverage for all calculation logic
- [ ] Integration tests verify complete expense creation workflow
- [ ] Mathematical property tests ensure calculation accuracy
- [ ] Performance tests validate efficiency with large participant counts
- [ ] Security tests confirm proper validation and access control

### Documentation Complete
- [ ] API documentation with examples for all split types
- [ ] Algorithm documentation for split calculations
- [ ] Database schema documentation for expense storage
- [ ] Frontend component documentation and usage examples

## Estimated Effort

**Story Points**: 13  
**Time Estimate**: 10-12 hours  
**Complexity**: Very High (Complex mathematical algorithms, multiple split types, precision requirements)

### Breakdown
- **Split Calculation Algorithms**: 3 hours
- **API Endpoint Implementation**: 2 hours  
- **Database Transaction System**: 1.5 hours
- **Input Validation and Business Rules**: 2 hours
- **Frontend Form Implementation**: 2.5 hours
- **Testing and Mathematical Verification**: 1 hour

## Future Considerations

### Enhanced Features
- Advanced split types (progressive taxation, custom formulas)
- Split templates for common scenarios
- Bulk expense import from receipts/CSV
- Integration with receipt scanning OCR

### Mathematical Improvements
- Support for different rounding strategies
- Advanced precision handling for large amounts
- Integration with accounting standards
- Multi-currency support with conversion rates