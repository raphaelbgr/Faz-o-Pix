# Story 2.2: Participant Addition with Placeholder Support

## Story Overview

**As a bill owner,**  
**I want to add participants using their PIX keys or contact information,**  
**so that I can include anyone in expense sharing regardless of their registration status.**

## Dependencies

- **Story 1.1**: Project Infrastructure Setup (Docker, environment setup)
- **Story 1.2**: Database Schema and Prisma Setup (participants, user_identifiers tables)
- **Story 1.3**: Fastify API Foundation (routing, validation, error handling)
- **Story 1.4**: User Registration with Identifier Validation (identifier validation logic)
- **Story 1.5**: Multi-Identifier Authentication (user lookup by identifier)
- **Story 2.1**: Bill Creation and Management (bills must exist to add participants)

## Acceptance Criteria

### Participant Addition Core Features
1. **POST /api/bills/:id/members** accepts identifier type and value for participant addition
2. **Existing User Linking**: Automatically links to registered users when identifier matches
3. **Placeholder Creation**: Creates placeholder participant when identifier not found in system
4. **All Identifier Types**: Supports CPF, CNPJ, email, phone, and EVP with proper validation
5. **Display Names**: Optional custom display names for placeholder participants
6. **Duplicate Prevention**: Prevents adding same participant twice to the same bill

### Placeholder Participant System
1. **Unregistered User Support**: Placeholder participants can be included in expenses without accounts
2. **Identifier Storage**: Store hashed identifiers for future claiming during registration
3. **Privacy Protection**: Mask identifiers in responses to protect participant privacy
4. **Future Claiming**: Placeholders automatically claimed when matching user registers
5. **Expense Participation**: Placeholder participants fully functional for expense splitting

### Participant Management
1. **GET /api/bills/:id/members** returns complete participant list with status indicators
2. **Member Removal**: Remove participants who haven't incurred expenses (bill owner only)
3. **Role Management**: Track participant roles (owner, member) and permissions
4. **Activity Tracking**: Monitor participant activity and contribution to expenses
5. **Privacy Controls**: Appropriate identifier masking based on user permissions

## Technical Specifications

### API Endpoint Design

#### Add Participant to Bill
```typescript
POST /api/bills/:billId/members
Authorization: Bearer {session_token}
Content-Type: application/json

Request Body:
{
  "identifier_type": "cpf" | "cnpj" | "email" | "phone" | "evp",
  "identifier_value": string,     // Raw identifier value
  "display_name": string         // Optional, used for placeholders
}

Success Response (201) - Existing User:
{
  "success": true,
  "data": {
    "participant_id": string,
    "user_id": string,           // Real user ID
    "is_placeholder": false,
    "display_name": string,      // User's real name
    "identifier_type": string,
    "masked_identifier": string, // "***.***.***-01" for CPF
    "joined_at": string,
    "role": "member",
    "can_remove": boolean        // Based on expense history
  }
}

Success Response (201) - Placeholder Created:
{
  "success": true,
  "data": {
    "participant_id": string,
    "user_id": null,             // No real user yet
    "is_placeholder": true,
    "display_name": string,      // Custom or generated from identifier
    "identifier_type": string,
    "masked_identifier": string,
    "joined_at": string,
    "role": "member",
    "can_remove": true           // Placeholders can always be removed initially
  }
}

Error Response (400):
{
  "success": false,
  "error": {
    "code": "INVALID_IDENTIFIER",
    "message": "CPF deve ter formato válido",
    "details": {
      "identifier_type": "cpf",
      "expected_format": "000.000.000-00 ou 00000000000"
    }
  }
}

Error Response (409):
{
  "success": false,
  "error": {
    "code": "PARTICIPANT_ALREADY_EXISTS", 
    "message": "Esta pessoa já participa desta conta",
    "existing_participant": {
      "participant_id": string,
      "display_name": string,
      "is_placeholder": boolean
    }
  }
}
```

#### Get Bill Members
```typescript
GET /api/bills/:billId/members
Authorization: Bearer {session_token}

Success Response (200):
{
  "success": true,
  "data": {
    "members": [
      {
        "participant_id": string,
        "user_id": string | null,
        "is_placeholder": boolean,
        "display_name": string,
        "identifier_type": string,
        "masked_identifier": string,   // Privacy-masked version
        "role": "owner" | "member",
        "joined_at": string,
        "last_activity": string,      // Last expense or settlement
        "expense_count": number,      // Number of expenses involving this participant
        "settlement_count": number,   // Number of settlements involving this participant
        "current_balance": number,    // Current balance in cents
        "can_remove": boolean,        // Can this participant be removed?
        "can_edit": boolean          // Can current user edit this participant?
      }
    ],
    "summary": {
      "total_members": number,
      "registered_members": number,
      "placeholder_members": number,
      "active_members": number      // Members with expense activity
    }
  }
}
```

#### Remove Participant
```typescript
DELETE /api/bills/:billId/members/:participantId
Authorization: Bearer {session_token}

Success Response (200):
{
  "success": true,
  "data": {
    "message": "Participante removido da conta",
    "participant_name": string,
    "removed_at": string
  }
}

Error Response (409):
{
  "success": false,
  "error": {
    "code": "PARTICIPANT_HAS_EXPENSES",
    "message": "Não é possível remover participante com histórico de despesas",
    "details": {
      "expense_count": number,
      "settlement_count": number,
      "suggestion": "Liquide todas as dívidas antes de remover"
    }
  }
}
```

### Participant Lookup and Creation Logic

#### Identifier-Based User Lookup
```typescript
const findExistingUser = async (identifierType: string, identifierValue: string) => {
  // Normalize identifier for lookup
  const normalizedValue = normalizeIdentifier(identifierValue, identifierType);
  
  // Search in user_identifiers table
  const userIdentifier = await prisma.userIdentifier.findUnique({
    where: {
      type_value: {
        type: identifierType,
        normalized_value: normalizedValue
      }
    },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          created_at: true
        }
      }
    }
  });
  
  if (userIdentifier) {
    return {
      found: true,
      user: userIdentifier.user,
      identifier: {
        type: identifierType,
        value: normalizedValue,
        masked: maskIdentifier(identifierValue, identifierType)
      }
    };
  }
  
  return { found: false };
};
```

#### Placeholder Participant Creation
```typescript
const createPlaceholderParticipant = async (
  billId: string, 
  identifierType: string, 
  identifierValue: string,
  displayName?: string
) => {
  const normalizedValue = normalizeIdentifier(identifierValue, identifierType);
  const identifierHash = await hashIdentifier(normalizedValue);
  const defaultDisplayName = displayName || generateDisplayName(identifierValue, identifierType);
  
  return await prisma.$transaction(async (tx) => {
    // Create participant record
    const participant = await tx.participant.create({
      data: {
        display_name: defaultDisplayName,
        is_placeholder: true,
        created_at: new Date()
      }
    });
    
    // Store placeholder identifier (hashed for future claiming)
    await tx.placeholderIdentifier.create({
      data: {
        participant_id: participant.id,
        identifier_type: identifierType,
        identifier_hash: identifierHash,
        raw_identifier: normalizedValue, // Encrypted in practice
        created_at: new Date()
      }
    });
    
    // Add to bill as member
    await tx.billMember.create({
      data: {
        bill_id: billId,
        participant_id: participant.id,
        role: 'member',
        joined_at: new Date()
      }
    });
    
    return {
      participant_id: participant.id,
      user_id: null,
      is_placeholder: true,
      display_name: defaultDisplayName,
      identifier_type: identifierType,
      masked_identifier: maskIdentifier(identifierValue, identifierType),
      joined_at: new Date().toISOString(),
      role: 'member',
      can_remove: true
    };
  });
};
```

### Privacy and Security Implementation

#### Identifier Masking Logic
```typescript
const maskIdentifier = (value: string, type: string): string => {
  switch (type) {
    case 'cpf':
      // 12345678901 -> ***.***.***-01
      const cpf = value.replace(/\D/g, '');
      return `***.***.*${cpf.slice(-3)}-${cpf.slice(-2)}`;
      
    case 'cnpj':
      // 12345678000195 -> **.***.***/****-95
      const cnpj = value.replace(/\D/g, '');
      return `**.***.***/****-${cnpj.slice(-2)}`;
      
    case 'email':
      // usuario@exemplo.com -> u***@exemplo.com
      const [local, domain] = value.split('@');
      return `${local[0]}***@${domain}`;
      
    case 'phone':
      // +5511999887766 -> +55**9****7766
      const phone = value.replace(/\D/g, '');
      return `+55**${phone.slice(-4)}`;
      
    case 'evp':
      // UUID -> ********-****-****-****-*******ABC12
      return `********-****-****-****-*******${value.slice(-5)}`;
      
    default:
      return '***';
  }
};
```

#### Identifier Hashing for Future Claiming
```typescript
const hashIdentifier = async (normalizedValue: string): Promise<string> => {
  const crypto = await import('crypto');
  const salt = process.env.IDENTIFIER_SALT || 'default-salt';
  
  return crypto
    .createHash('sha256')
    .update(`${salt}:${normalizedValue}`)
    .digest('hex');
};
```

### Database Schema Integration

#### Placeholder Identifier Storage
```sql
-- Table for storing placeholder participant identifiers
CREATE TABLE placeholder_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  identifier_type VARCHAR(10) NOT NULL, -- 'cpf', 'cnpj', 'email', 'phone', 'evp'
  identifier_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash for claiming
  raw_identifier TEXT,                   -- Encrypted original value for claiming
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(identifier_hash)
);

CREATE INDEX idx_placeholder_identifiers_hash ON placeholder_identifiers(identifier_hash);
CREATE INDEX idx_placeholder_identifiers_participant ON placeholder_identifiers(participant_id);
```

#### Bill Members Relationship
```sql
-- Enhanced bill_members table with participant roles
CREATE TABLE bill_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'owner', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(bill_id, participant_id)
);

CREATE INDEX idx_bill_members_bill ON bill_members(bill_id);
CREATE INDEX idx_bill_members_participant ON bill_members(participant_id);
CREATE INDEX idx_bill_members_active ON bill_members(bill_id) WHERE removed_at IS NULL;
```

### Business Rules and Validation

#### Participant Addition Rules
```typescript
const validateParticipantAddition = async (
  billId: string, 
  identifierType: string, 
  identifierValue: string,
  currentUserId: string
): Promise<ValidationResult> => {
  // Check if user owns the bill
  const bill = await prisma.bill.findUnique({
    where: { id: billId }
  });
  
  if (bill.owner_user_id !== currentUserId) {
    return {
      isValid: false,
      error: "Apenas o dono da conta pode adicionar participantes"
    };
  }
  
  // Validate identifier format
  const identifierValidation = validateIdentifier(identifierValue, identifierType);
  if (!identifierValidation.isValid) {
    return identifierValidation;
  }
  
  // Check for duplicate participants
  const normalizedValue = normalizeIdentifier(identifierValue, identifierType);
  
  // Check existing registered users
  const existingUser = await prisma.userIdentifier.findFirst({
    where: {
      type: identifierType,
      normalized_value: normalizedValue
    },
    include: {
      user: {
        include: {
          users_participants_link: {
            include: {
              participant: {
                include: {
                  bill_members: {
                    where: { bill_id: billId }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  
  if (existingUser?.user.users_participants_link.some(
    link => link.participant.bill_members.length > 0
  )) {
    return {
      isValid: false,
      error: "Esta pessoa já participa desta conta",
      code: "PARTICIPANT_ALREADY_EXISTS"
    };
  }
  
  // Check placeholder participants
  const identifierHash = await hashIdentifier(normalizedValue);
  const existingPlaceholder = await prisma.placeholderIdentifier.findFirst({
    where: {
      identifier_hash: identifierHash
    },
    include: {
      participant: {
        include: {
          bill_members: {
            where: { bill_id: billId }
          }
        }
      }
    }
  });
  
  if (existingPlaceholder?.participant.bill_members.length > 0) {
    return {
      isValid: false,
      error: "Esta pessoa já participa desta conta como convidado",
      code: "PLACEHOLDER_ALREADY_EXISTS"
    };
  }
  
  return { isValid: true };
};
```

#### Participant Removal Rules
```typescript
const canRemoveParticipant = async (
  billId: string, 
  participantId: string,
  currentUserId: string
): Promise<RemovalCheck> => {
  // Check bill ownership
  const bill = await prisma.bill.findUnique({
    where: { id: billId }
  });
  
  if (bill.owner_user_id !== currentUserId) {
    return {
      canRemove: false,
      reason: "INSUFFICIENT_PERMISSIONS",
      message: "Apenas o dono da conta pode remover participantes"
    };
  }
  
  // Check if participant is the owner
  const billMember = await prisma.billMember.findFirst({
    where: {
      bill_id: billId,
      participant_id: participantId
    }
  });
  
  if (billMember.role === 'owner') {
    return {
      canRemove: false,
      reason: "CANNOT_REMOVE_OWNER",
      message: "Não é possível remover o dono da conta"
    };
  }
  
  // Check for expense history
  const expenseCount = await prisma.expense.count({
    where: {
      OR: [
        { payer_participant_id: participantId },
        { expense_splits: { some: { participant_id: participantId } } }
      ]
    }
  });
  
  if (expenseCount > 0) {
    const settlementCount = await prisma.settlement.count({
      where: {
        OR: [
          { payer_participant_id: participantId },
          { payee_participant_id: participantId }
        ]
      }
    });
    
    return {
      canRemove: false,
      reason: "PARTICIPANT_HAS_EXPENSES",
      message: "Não é possível remover participante com histórico de despesas",
      details: {
        expense_count: expenseCount,
        settlement_count: settlementCount
      }
    };
  }
  
  return { canRemove: true };
};
```

### Frontend Integration

#### Add Participant Form Component
```typescript
interface AddParticipantFormProps {
  billId: string;
  onSuccess: (participant: Participant) => void;
  onCancel: () => void;
}

const AddParticipantForm: React.FC<AddParticipantFormProps> = ({ 
  billId, 
  onSuccess, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    identifier_type: 'cpf' as IdentifierType,
    identifier_value: '',
    display_name: ''
  });
  
  const [identifierValidation, setIdentifierValidation] = useState<ValidationResult>({
    isValid: true
  });
  
  const addParticipantMutation = useMutation({
    mutationFn: async (data: AddParticipantRequest) => {
      const response = await fetch(`/api/bills/${billId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message || 'Erro ao adicionar participante');
      }
      
      return response.json();
    },
    onSuccess: (response) => {
      const participant = response.data;
      if (participant.is_placeholder) {
        toast.success(`${participant.display_name} adicionado como convidado`);
      } else {
        toast.success(`${participant.display_name} adicionado à conta`);
      }
      onSuccess(participant);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  // Real-time identifier validation
  useEffect(() => {
    if (formData.identifier_value.length > 0) {
      const validation = validateIdentifier(formData.identifier_value, formData.identifier_type);
      setIdentifierValidation(validation);
    } else {
      setIdentifierValidation({ isValid: true });
    }
  }, [formData.identifier_value, formData.identifier_type]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifierValidation.isValid) {
      addParticipantMutation.mutate(formData);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="add-participant-form">
      <div className="form-group">
        <label>Tipo de Identificação</label>
        <select
          value={formData.identifier_type}
          onChange={(e) => setFormData({
            ...formData, 
            identifier_type: e.target.value as IdentifierType,
            identifier_value: '' // Clear value when type changes
          })}
          className="form-select"
        >
          <option value="cpf">CPF</option>
          <option value="cnpj">CNPJ</option>
          <option value="email">Email</option>
          <option value="phone">Telefone</option>
          <option value="evp">Chave PIX Aleatória</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="identifier-value" className="required">
          {getIdentifierLabel(formData.identifier_type)}
        </label>
        <input
          id="identifier-value"
          type="text"
          value={formData.identifier_value}
          onChange={(e) => setFormData({...formData, identifier_value: e.target.value})}
          placeholder={getIdentifierPlaceholder(formData.identifier_type)}
          className={`form-input ${!identifierValidation.isValid ? 'error' : ''}`}
          required
        />
        {!identifierValidation.isValid && (
          <div className="error-message">
            {identifierValidation.error}
          </div>
        )}
        {identifierValidation.isValid && formData.identifier_value && (
          <div className="success-message">
            <CheckIcon className="icon" />
            {getIdentifierType(formData.identifier_type)} válido
          </div>
        )}
      </div>
      
      <div className="form-group">
        <label htmlFor="display-name">
          Nome para Exibição (Opcional)
        </label>
        <input
          id="display-name"
          type="text"
          value={formData.display_name}
          onChange={(e) => setFormData({...formData, display_name: e.target.value})}
          placeholder="Como identificar esta pessoa"
          maxLength={100}
          className="form-input"
        />
        <small className="form-hint">
          Se não informado, usaremos o identificador para criar um nome
        </small>
      </div>
      
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="button-secondary">
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={!identifierValidation.isValid || addParticipantMutation.isPending}
          className="button-primary"
        >
          {addParticipantMutation.isPending ? 'Adicionando...' : 'Adicionar'}
        </button>
      </div>
    </form>
  );
};
```

### Integration Points

#### Claim Process Integration (Story 1.4)
- Registration process checks for placeholder matches
- Automatic claiming when identifiers match
- Migration of expense and settlement history
- Notification about claimed accounts

#### Expense System Integration (Epic 3)
- Placeholder participants can be payers and payees
- Expense splits include placeholder participants
- Balance calculations work for all participant types

#### Settlement System Integration (Epic 4)
- Settlements can involve placeholder participants
- PIX payment suggestions show available identifiers
- Settlement history includes placeholder activity

## Testing Requirements

### Unit Tests
1. **Identifier Validation**: Test all Brazilian identifier types with edge cases
2. **User Lookup Logic**: Test existing user detection and linking
3. **Placeholder Creation**: Test placeholder participant creation and storage
4. **Privacy Masking**: Test identifier masking for different types

### Integration Tests
1. **Participant Addition Flow**: End-to-end participant addition for all identifier types
2. **Duplicate Prevention**: Test prevention of duplicate participants
3. **Permission Checks**: Test access control for participant management
4. **Database Consistency**: Test data integrity during participant operations

### Security Tests
1. **Access Control**: Test bill ownership validation
2. **Identifier Privacy**: Test proper masking in all responses
3. **Input Validation**: Test malicious input handling
4. **Rate Limiting**: Test protection against participant addition abuse

## Performance Considerations

### Database Performance
- Indexed lookups on identifier hashes for fast claiming
- Efficient participant listing queries with balance calculations
- Optimized duplicate detection across users and placeholders

### Privacy and Security
- Secure identifier hashing for future claiming
- Proper access control based on bill ownership
- Rate limiting on participant addition to prevent abuse

## Success Metrics

### Functional Success
- ✅ All Brazilian identifier types work for participant addition
- ✅ Existing users automatically linked when identifiers match
- ✅ Placeholder participants created for unregistered users
- ✅ Privacy masking protects participant identifiers appropriately
- ✅ Duplicate prevention works across all participant types

### Performance Success
- ✅ Participant addition completes within 1 second
- ✅ User lookup queries execute within 100ms
- ✅ Participant listing loads efficiently for bills with 50+ members
- ✅ Identifier validation provides immediate feedback

### Security Success
- ✅ Only bill owners can add/remove participants
- ✅ Identifier masking prevents privacy leaks
- ✅ Placeholder claiming process is secure and accurate
- ✅ Rate limiting prevents participant addition abuse

## Definition of Done

### Implementation Complete
- [ ] POST /api/bills/:id/members endpoint with full identifier support
- [ ] GET /api/bills/:id/members endpoint with privacy-conscious responses
- [ ] DELETE /api/bills/:id/members/:id endpoint with proper validation
- [ ] Placeholder participant creation and management system
- [ ] Identifier masking and privacy protection system
- [ ] Frontend participant addition and management interface

### Testing Complete
- [ ] Unit tests cover all identifier types and validation logic
- [ ] Integration tests verify complete participant lifecycle
- [ ] Security tests confirm access control and privacy protection
- [ ] Performance tests validate efficiency with large participant lists

### Documentation Complete
- [ ] API documentation with examples for all identifier types
- [ ] Privacy and masking strategy documentation
- [ ] Placeholder system architecture documentation
- [ ] Database schema changes for placeholder support

## Estimated Effort

**Story Points**: 8  
**Time Estimate**: 6-8 hours  
**Complexity**: High (Multi-identifier support, placeholder system, privacy requirements)

### Breakdown
- **Identifier Validation and User Lookup**: 2 hours
- **Placeholder Participant System**: 2 hours  
- **Privacy and Masking Implementation**: 1 hour
- **API Endpoints and Business Logic**: 2 hours
- **Frontend Integration**: 1 hour
- **Testing and Validation**: 1 hour

## Future Considerations

### Enhanced Features
- Bulk participant addition via CSV/contact import
- Participant invitation system with notifications
- Advanced permission roles (admin, viewer, contributor)
- Integration with contact lists for quick addition

### Advanced Privacy
- Granular privacy controls for identifier visibility
- Participant consent management for data sharing
- Enhanced audit trails for participant access
- LGPD compliance tools for participant data