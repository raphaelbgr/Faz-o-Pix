# Story 1.4: User Registration with Identifier Validation

## Story Overview

**As a new user,**  
**I want to register with my name, password, and Brazilian identifiers,**  
**so that I can create an account using familiar credentials.**

## Dependencies

- **Story 1.1**: Project Infrastructure Setup (Docker, environment setup)
- **Story 1.2**: Database Schema and Prisma Setup (users, user_identifiers, participants tables)
- **Story 1.3**: Fastify API Foundation (routing, validation, error handling)

## Acceptance Criteria

### Core Registration Flow
1. **POST /api/auth/signup** accepts registration data with name, password, and array of identifiers
2. **User Creation**: Create user record with hashed password and generate participant record for user-participant linking
3. **Session Management**: Return user ID and set secure HTTP-only session cookie on successful registration
4. **LGPD Compliance**: Track consent timestamp and IP address for Brazilian privacy law compliance
5. **Duplicate Prevention**: Prevent registration with already claimed identifiers

### Brazilian Identifier Validation
1. **CPF Validation**: Validate 11-digit CPF with proper checksum algorithm (handle formatted and unformatted input)
2. **CNPJ Validation**: Validate 14-digit CNPJ with proper checksum algorithm (handle formatted and unformatted input)
3. **Phone Normalization**: Normalize Brazilian phone numbers to E.164 format (+55XXXXXXXXXXXX)
4. **Email Validation**: Validate email addresses according to RFC 5322 standards
5. **EVP Validation**: Validate Chave Aleatória (EVP) as proper UUID v4 format

### Security Requirements
1. **Password Hashing**: Use Argon2id algorithm with appropriate time/memory parameters
2. **Input Sanitization**: Clean and validate all inputs before processing
3. **Rate Limiting**: Implement protection against signup abuse (max 5 attempts per IP per hour)
4. **Secure Sessions**: Create HTTP-only, secure, SameSite cookies for session management

### Placeholder Participant Management
1. **Participant Linking**: Create participant record for the new user during registration
2. **Placeholder Claiming**: Check for existing placeholder participants with matching identifiers and link them to the new user account
3. **Identifier Association**: Store validated identifiers in user_identifiers table with proper type classification

### Error Handling and Messaging
1. **Validation Errors**: Return specific, actionable error messages in Brazilian Portuguese
2. **Duplicate Detection**: Clear messaging when identifier is already registered
3. **Format Guidance**: Helpful error messages with expected format examples
4. **HTTP Status Codes**: Proper REST API status codes (201 for success, 400 for validation errors, 409 for conflicts)

## Technical Specifications

### API Endpoint Design

```typescript
POST /api/auth/signup
Content-Type: application/json

Request Body:
{
  "name": string,           // Full name, 2-100 characters
  "password": string,       // Minimum 8 characters
  "identifiers": [          // Array of Brazilian identifiers
    {
      "type": "cpf" | "cnpj" | "phone" | "email" | "evp",
      "value": string
    }
  ],
  "lgpdConsent": {
    "accepted": boolean,    // Must be true
    "timestamp": string,    // ISO timestamp
    "ipAddress": string     // Client IP for audit
  }
}

Success Response (201):
{
  "success": true,
  "data": {
    "userId": string,
    "message": "Conta criada com sucesso"
  }
}

Error Response (400/409):
{
  "success": false,
  "error": {
    "code": string,
    "message": string,
    "details": object       // Field-specific errors
  }
}
```

### Validation Rules

#### CPF Validation
- Accept formats: `12345678901` or `123.456.789-01`
- Remove formatting characters before validation
- Apply Brazilian CPF checksum algorithm
- Reject known invalid sequences (111.111.111-11, etc.)

#### CNPJ Validation
- Accept formats: `12345678000195` or `12.345.678/0001-95`
- Remove formatting characters before validation
- Apply Brazilian CNPJ checksum algorithm
- Validate establishment number (0001-9999 range)

#### Phone Number Normalization
- Accept formats: `11999887766`, `(11) 99988-7766`, `11 99988-7766`
- Normalize to E.164: `+5511999887766`
- Validate Brazilian mobile patterns (9XXXXXXXX)
- Support landline patterns (XXXXXXXX) for major area codes

#### Email Validation
- RFC 5322 compliant validation
- Maximum length: 320 characters
- Case-insensitive storage (lowercase normalization)
- Basic disposable email domain filtering

#### EVP (Chave Aleatória) Validation
- UUID v4 format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- Case-insensitive matching
- Proper UUID structure validation

### Password Security

#### Argon2id Configuration
```typescript
const argon2Config = {
  type: argon2.argon2id,
  memoryCost: 65536,      // 64 MB
  timeCost: 3,            // 3 iterations
  parallelism: 4,         // 4 threads
  hashLength: 32          // 32 byte output
}
```

### Database Operations

#### User Creation Transaction
1. **Validate Identifiers**: Check all identifiers are valid and not already claimed
2. **Create User**: Insert user record with hashed password
3. **Store Identifiers**: Insert validated identifiers into user_identifiers table
4. **Create Participant**: Generate participant record for user
5. **Claim Placeholders**: Link any existing placeholder participants with matching identifiers
6. **Audit Log**: Record registration event with IP and timestamp

#### Identifier Storage Schema
```sql
-- user_identifiers table structure
CREATE TABLE user_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  identifier_type VARCHAR(10) NOT NULL, -- 'cpf', 'cnpj', 'phone', 'email', 'evp'
  identifier_value VARCHAR(255) NOT NULL,
  normalized_value VARCHAR(255) NOT NULL, -- Normalized format for lookups
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(identifier_type, normalized_value)
);
```

### Error Messages (Portuguese)

#### Validation Errors
- **CPF Inválido**: "CPF deve conter 11 dígitos válidos (ex: 123.456.789-01)"
- **CNPJ Inválido**: "CNPJ deve conter 14 dígitos válidos (ex: 12.345.678/0001-95)"
- **Telefone Inválido**: "Número deve seguir formato brasileiro (ex: 11 99988-7766)"
- **Email Inválido**: "Digite um email válido (ex: usuario@exemplo.com)"
- **EVP Inválido**: "Chave aleatória deve ser um UUID válido"
- **Senha Fraca**: "Senha deve ter no mínimo 8 caracteres"

#### Business Logic Errors
- **Identificador Já Cadastrado**: "Este {tipo} já está vinculado a outra conta"
- **Nome Obrigatório**: "Nome completo é obrigatório"
- **Consentimento LGPD**: "É necessário aceitar os termos de privacidade"

### Rate Limiting Strategy

#### Implementation Approach
- **IP-based Limiting**: Track attempts per IP address
- **Progressive Delays**: Increase delay after failed attempts
- **Cleanup Process**: Clear old attempt records periodically
- **Bypass Mechanism**: Allow configuration override for testing

```typescript
const rateLimitConfig = {
  maxAttempts: 5,
  windowMinutes: 60,
  progressiveDelay: [0, 1000, 2000, 5000, 10000], // milliseconds
  cleanupIntervalMinutes: 30
}
```

## Integration Points

### Frontend Integration
- Form validation hooks for real-time feedback
- Identifier type selection and formatting
- Password strength indicator
- Error display with field-specific messaging
- Success handling with automatic redirect

### Backend Services Integration
- User service for account creation
- Identifier service for validation logic
- Session service for cookie management
- Audit service for LGPD compliance logging
- Participant service for placeholder claiming

### Database Integration
- Prisma ORM for type-safe database operations
- Transaction handling for data consistency
- Proper indexing for identifier lookups
- Foreign key relationships with participants table

## Testing Requirements

### Unit Tests
1. **Identifier Validation**: Test all validation functions with valid/invalid inputs
2. **Password Hashing**: Verify Argon2id implementation and parameters
3. **Normalization**: Test phone number and email normalization logic
4. **Error Handling**: Verify proper error message generation

### Integration Tests
1. **Registration Flow**: End-to-end user creation process
2. **Duplicate Prevention**: Test identifier uniqueness enforcement
3. **Database Transactions**: Verify rollback on failures
4. **Session Management**: Test cookie creation and security attributes

### Edge Cases
1. **Malformed Input**: Various invalid identifier formats
2. **Boundary Values**: Maximum length inputs, special characters
3. **Rate Limiting**: Verify limits are enforced correctly
4. **Concurrent Registration**: Multiple users with same identifier simultaneously

## Performance Considerations

### Database Performance
- **Identifier Lookups**: Optimize queries with proper indexing on normalized_value
- **Connection Pooling**: Leverage existing Prisma connection pool
- **Transaction Optimization**: Minimize transaction scope and duration

### Memory Management
- **Password Hashing**: Balance Argon2id parameters for security vs. performance
- **Input Processing**: Handle large identifier arrays efficiently
- **Session Storage**: Optimize session data structure

## Security Considerations

### Input Security
- **SQL Injection Prevention**: Use Prisma parameterized queries
- **XSS Prevention**: Sanitize all string inputs
- **CSRF Protection**: Verify origin headers and tokens
- **Input Length Limits**: Prevent DoS through large payloads

### Authentication Security
- **Password Storage**: Never store plain text passwords
- **Session Security**: HTTP-only, secure, SameSite cookies
- **Audit Trail**: Log all registration attempts for security monitoring
- **IP Tracking**: Record client IP for fraud detection

## LGPD Compliance

### Data Collection
- **Explicit Consent**: Require explicit checkbox for data processing consent
- **Purpose Limitation**: Collect only necessary data for service provision
- **Data Minimization**: Store minimal required information
- **Retention Policy**: Define data retention periods

### Audit Requirements
- **Consent Records**: Store consent timestamp and IP address
- **Processing Logs**: Log all data processing activities
- **Access Records**: Track when and how user data is accessed
- **Deletion Tracking**: Record data deletion requests and completion

## Success Metrics

### Functional Success
- ✅ All Brazilian identifier types validate correctly
- ✅ Password security meets OWASP standards
- ✅ Duplicate registration attempts are rejected
- ✅ Session management follows security best practices
- ✅ LGPD consent is properly tracked and stored

### Performance Success
- ✅ Registration completes within 2 seconds under normal load
- ✅ Rate limiting prevents abuse without affecting legitimate users
- ✅ Database queries execute efficiently with proper indexing
- ✅ Memory usage remains within acceptable bounds during peak load

### Security Success
- ✅ No sensitive data exposed in error messages or logs
- ✅ All inputs properly validated and sanitized
- ✅ Session cookies have appropriate security attributes
- ✅ Audit logs capture all required compliance information

## Definition of Done

### Implementation Complete
- [ ] POST /api/auth/signup endpoint implemented with all validation
- [ ] All Brazilian identifier validation functions working correctly
- [ ] Password hashing with Argon2id properly configured
- [ ] Database transactions handling user and participant creation
- [ ] Placeholder participant claiming logic implemented
- [ ] LGPD consent tracking and audit logging functional

### Testing Complete
- [ ] Unit tests cover all validation functions with 90%+ coverage
- [ ] Integration tests verify complete registration flow
- [ ] Edge case testing demonstrates proper error handling
- [ ] Performance testing validates response times under load
- [ ] Security testing confirms no vulnerabilities

### Documentation Complete
- [ ] API documentation updated with endpoint specifications
- [ ] Error code reference available for frontend integration
- [ ] Database schema changes documented
- [ ] Security implementation notes provided
- [ ] LGPD compliance procedures documented

## Estimated Effort

**Story Points**: 5  
**Time Estimate**: 2-4 hours  
**Complexity**: Medium-High (Brazilian identifier validation complexity)

### Breakdown
- **Identifier Validation Logic**: 1.5 hours
- **API Endpoint Implementation**: 1 hour  
- **Database Integration**: 0.5 hours
- **Error Handling & Messages**: 0.5 hours
- **Testing & Validation**: 0.5 hours

## Future Considerations

### Extensibility
- Support for additional PIX key types (future regulatory changes)
- Integration with external identifier validation services
- Enhanced fraud detection based on registration patterns
- Multi-factor authentication integration points

### Scalability
- Horizontal scaling considerations for registration endpoints
- Distributed rate limiting for multi-instance deployments
- Caching strategies for validation results
- Database sharding considerations for user growth