# Story 1.5: Multi-Identifier Authentication

## Story Overview

**As a registered user,**  
**I want to login using any of my registered identifiers and password,**  
**so that I can access my account flexibly using whichever identifier is most convenient.**

## Dependencies

- **Story 1.1**: Project Infrastructure Setup (Docker, environment setup)
- **Story 1.2**: Database Schema and Prisma Setup (users, user_identifiers, participants tables)
- **Story 1.3**: Fastify API Foundation (routing, validation, error handling)
- **Story 1.4**: User Registration with Identifier Validation (user creation, identifier storage)

## Acceptance Criteria

### Core Authentication Flow
1. **POST /api/auth/login** accepts any registered identifier (CPF, CNPJ, phone, email, EVP) with password
2. **Identifier Lookup**: Find user by any registered identifier regardless of type
3. **Password Verification**: Use Argon2id to verify password against stored hash
4. **Session Creation**: Generate secure HTTP-only session cookie on successful login
5. **Rate Limiting**: Prevent brute force attacks with progressive delays
6. **Audit Logging**: Record all authentication attempts for security monitoring

### Multi-Identifier Support
1. **Format Flexibility**: Accept identifiers in various formats (masked/unmasked CPF, formatted phone)
2. **Normalization**: Normalize input identifiers to match stored format for lookup
3. **Type Detection**: Automatically detect identifier type based on format patterns
4. **Universal Login**: Single endpoint handles all identifier types seamlessly
5. **Case Insensitivity**: Email and EVP identifiers matched case-insensitively

### Security Requirements
1. **Brute Force Protection**: Max 5 attempts per identifier per 15 minutes with progressive delays
2. **Account Lockout**: Temporary lockout after 10 failed attempts in 1 hour
3. **Secure Sessions**: HTTP-only, secure, SameSite cookies with 24-hour expiration
4. **Password Timing**: Constant-time password verification to prevent timing attacks
5. **IP Tracking**: Log client IP addresses for fraud detection patterns

### Error Handling and Messaging
1. **Generic Errors**: Same error message for invalid identifier or password (security)
2. **Rate Limiting**: Clear messaging about retry delays in Brazilian Portuguese
3. **Account Lockout**: Helpful guidance for locked accounts with recovery options
4. **System Errors**: Graceful handling of database or system failures
5. **HTTP Status Codes**: Proper REST API status codes (200 for success, 401 for auth failures, 429 for rate limits)

## Technical Specifications

### API Endpoint Design

```typescript
POST /api/auth/login
Content-Type: application/json

Request Body:
{
  "identifier": string,        // Any registered identifier
  "password": string,          // User password
  "rememberMe": boolean        // Optional: extend session duration
}

Success Response (200):
{
  "success": true,
  "data": {
    "userId": string,
    "sessionId": string,
    "message": "Login realizado com sucesso"
  }
}

Error Response (401):
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Identificador ou senha incorretos",
    "retryAfter": number?      // Seconds until next attempt allowed
  }
}

Rate Limit Response (429):
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Muitas tentativas. Tente novamente em {minutes} minutos",
    "retryAfter": number       // Seconds until next attempt allowed
  }
}
```

### Identifier Normalization Rules

#### CPF Normalization
- Input formats: `12345678901`, `123.456.789-01`
- Normalization: Remove all non-digits, validate length
- Storage lookup: Use normalized 11-digit format
- Validation: Apply checksum algorithm before lookup

#### CNPJ Normalization
- Input formats: `12345678000195`, `12.345.678/0001-95`
- Normalization: Remove all non-digits, validate length
- Storage lookup: Use normalized 14-digit format
- Validation: Apply checksum algorithm before lookup

#### Phone Normalization
- Input formats: `11999887766`, `(11) 99988-7766`, `+5511999887766`
- Normalization: Convert to E.164 format (+5511999887766)
- Storage lookup: Use E.164 format
- Validation: Ensure Brazilian mobile/landline patterns

#### Email Normalization
- Input formats: Any case variation
- Normalization: Convert to lowercase
- Storage lookup: Use lowercase format
- Validation: RFC 5322 compliance check

#### EVP Normalization
- Input formats: UUID with or without hyphens
- Normalization: Lowercase with standard UUID format
- Storage lookup: Use standard UUID format
- Validation: UUID v4 format verification

### Authentication Flow Logic

#### Step 1: Input Validation and Normalization
1. **Rate Limit Check**: Verify identifier hasn't exceeded attempt limits
2. **Format Detection**: Identify identifier type based on format patterns
3. **Input Normalization**: Convert identifier to normalized storage format
4. **Basic Validation**: Ensure identifier format is valid before lookup

#### Step 2: User Lookup and Verification
1. **Database Query**: Find user by normalized identifier value
2. **User Existence Check**: Return generic error if user not found
3. **Password Verification**: Use Argon2id to verify password hash
4. **Timing Attack Prevention**: Use constant-time comparison

#### Step 3: Session Management
1. **Session Generation**: Create secure session token
2. **Cookie Setting**: Set HTTP-only, secure session cookie
3. **Session Storage**: Store session in database with expiration
4. **User Context**: Include user ID and basic profile in session

#### Step 4: Security Logging
1. **Attempt Recording**: Log all authentication attempts with metadata
2. **Success Tracking**: Record successful logins with session info
3. **Failure Analysis**: Track failure patterns for fraud detection
4. **IP Monitoring**: Monitor for suspicious IP address patterns

### Rate Limiting Strategy

#### Progressive Delay Implementation
```typescript
const rateLimitConfig = {
  maxAttempts: 5,              // Per identifier per window
  windowMinutes: 15,           // Rolling window duration
  progressiveDelays: [         // Seconds between attempts
    0,      // 1st attempt: immediate
    30,     // 2nd attempt: 30s delay
    60,     // 3rd attempt: 1min delay
    300,    // 4th attempt: 5min delay
    900     // 5th attempt: 15min delay
  ],
  lockoutThreshold: 10,        // Total attempts before lockout
  lockoutDuration: 3600        // 1 hour lockout duration
}
```

#### Rate Limit Storage Schema
```sql
-- Authentication attempt tracking
CREATE TABLE auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX(identifier, created_at),
  INDEX(ip_address, created_at)
);
```

### Session Security Configuration

#### Session Cookie Attributes
```typescript
const sessionConfig = {
  name: 'fazopix_session',
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,           // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',       // CSRF protection
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    domain: process.env.COOKIE_DOMAIN
  },
  genid: () => crypto.randomUUID(),
  resave: false,
  saveUninitialized: false
}
```

#### Session Data Structure
```typescript
interface SessionData {
  userId: string;
  sessionId: string;
  createdAt: Date;
  lastActiveAt: Date;
  ipAddress: string;
  userAgent: string;
  identifierUsed: string;     // Which identifier was used to login
  identifierType: string;     // Type of identifier used
}
```

### Database Operations

#### Authentication Query Pattern
```sql
-- Single query to find user by any identifier
SELECT u.id, u.full_name, u.password_hash, ui.type as identifier_type
FROM users u
INNER JOIN user_identifiers ui ON u.id = ui.user_id
WHERE ui.normalized_value = $1
LIMIT 1;
```

#### Attempt Tracking Query
```sql
-- Count recent attempts for rate limiting
SELECT COUNT(*) as attempt_count,
       MAX(created_at) as last_attempt
FROM auth_attempts
WHERE identifier = $1
  AND created_at > NOW() - INTERVAL '15 minutes';
```

#### Session Creation Transaction
1. **Validate User**: Ensure user exists and password is correct
2. **Check Rate Limits**: Verify no rate limiting violations
3. **Create Session**: Insert session record with metadata
4. **Log Attempt**: Record successful authentication attempt
5. **Clean Old Sessions**: Remove expired sessions for user

### Error Messages (Portuguese)

#### Authentication Errors
- **Credenciais Inválidas**: "Identificador ou senha incorretos"
- **Conta Bloqueada**: "Conta temporariamente bloqueada por segurança. Tente novamente em {minutes} minutos"
- **Muitas Tentativas**: "Muitas tentativas de login. Tente novamente em {seconds} segundos"
- **Sessão Expirada**: "Sessão expirou. Faça login novamente"
- **Erro do Sistema**: "Erro temporário do sistema. Tente novamente em alguns minutos"

#### Validation Errors
- **Identificador Obrigatório**: "Identificador é obrigatório"
- **Senha Obrigatória**: "Senha é obrigatória"
- **Formato Inválido**: "Formato de identificador inválido"
- **Dados Incompletos**: "Todos os campos são obrigatórios"

### LGPD Compliance Logging

#### Authentication Audit Trail
```typescript
interface AuthAuditLog {
  userId?: string;              // null for failed attempts
  identifier: string;           // hashed for privacy
  identifierType: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  failureReason?: string;
  sessionId?: string;
  timestamp: Date;
  correlationId: string;
}
```

#### Privacy Protection
- **Identifier Hashing**: Store SHA-256 hash of identifier, not plain text
- **IP Anonymization**: Store only network portion of IP (last octet zeroed)
- **User Agent Sanitization**: Remove unique identifiers from user agent strings
- **Retention Policy**: Purge audit logs after 2 years
- **Access Control**: Restrict audit log access to security team only

## Integration Points

### Frontend Integration
- Login form with identifier type detection
- Real-time validation feedback
- Rate limiting user interface with countdown timers
- Error display with helpful recovery guidance
- Session management with automatic renewal

### Backend Services Integration
- User service for account validation
- Identifier service for normalization and lookup
- Session service for secure cookie management
- Audit service for LGPD compliance logging
- Rate limiting service for abuse prevention

### Database Integration
- Prisma ORM for type-safe authentication queries
- Transaction handling for session creation
- Efficient indexing for identifier lookups
- Connection pooling for concurrent authentication

## Testing Requirements

### Unit Tests
1. **Identifier Normalization**: Test all identifier format variations
2. **Password Verification**: Verify Argon2id integration and timing
3. **Rate Limiting Logic**: Test progressive delays and lockout thresholds
4. **Session Management**: Verify secure cookie generation and validation

### Integration Tests
1. **Authentication Flow**: End-to-end login process with various identifiers
2. **Rate Limiting**: Verify limits are enforced correctly across attempts
3. **Session Security**: Test cookie attributes and session lifecycle
4. **Error Handling**: Verify proper error responses for all failure scenarios

### Security Tests
1. **Brute Force Resistance**: Verify rate limiting prevents attacks
2. **Timing Attack Prevention**: Ensure constant-time password verification
3. **Session Hijacking**: Test session security measures
4. **Input Validation**: Test malicious input handling

### Performance Tests
1. **Concurrent Authentication**: Handle 100+ simultaneous login attempts
2. **Database Query Performance**: Sub-50ms identifier lookup times
3. **Rate Limiting Performance**: Efficient rate limit checking
4. **Session Creation Speed**: Fast session generation and storage

## Performance Considerations

### Database Performance
- **Identifier Lookups**: Optimize with proper indexing on normalized_value
- **Rate Limit Queries**: Efficient time-window queries with indexes
- **Session Queries**: Fast session validation with primary key lookups
- **Connection Pooling**: Leverage Prisma connection pool for concurrency

### Memory Management
- **Session Storage**: Efficient session data structure
- **Rate Limit Caching**: In-memory rate limit counters with database persistence
- **Password Verification**: Optimize Argon2id parameters for performance
- **Cleanup Processes**: Regular cleanup of expired sessions and old attempts

## Security Considerations

### Authentication Security
- **Password Storage**: Never store or log plain text passwords
- **Session Security**: HTTP-only, secure, SameSite cookies only
- **Timing Attacks**: Constant-time operations for all security checks
- **Audit Trail**: Comprehensive logging for security incident investigation

### Input Security
- **SQL Injection Prevention**: Use Prisma parameterized queries exclusively
- **Input Sanitization**: Clean all inputs before processing
- **Rate Limiting**: Prevent authentication abuse and account enumeration
- **Error Information**: Generic error messages to prevent account enumeration

## Success Metrics

### Functional Success
- ✅ All Brazilian identifier types work for authentication
- ✅ Rate limiting prevents brute force attacks effectively
- ✅ Session management follows security best practices
- ✅ Multi-identifier support provides seamless user experience
- ✅ Error handling provides helpful guidance without security leaks

### Performance Success
- ✅ Authentication completes within 200ms under normal load
- ✅ Rate limiting checks complete within 50ms
- ✅ Database queries execute efficiently with proper indexing
- ✅ System handles 100+ concurrent authentication attempts

### Security Success
- ✅ No timing attacks possible through password verification
- ✅ Rate limiting effectively prevents credential stuffing attacks
- ✅ Session cookies have appropriate security attributes
- ✅ Audit logs capture all required security information
- ✅ No sensitive data exposed in error messages or logs

## Definition of Done

### Implementation Complete
- [ ] POST /api/auth/login endpoint implemented with multi-identifier support
- [ ] All Brazilian identifier normalization working correctly
- [ ] Argon2id password verification with constant-time comparison
- [ ] Rate limiting with progressive delays and account lockout
- [ ] Secure session management with HTTP-only cookies
- [ ] LGPD-compliant audit logging with privacy protection

### Testing Complete
- [ ] Unit tests cover all authentication functions with 95%+ coverage
- [ ] Integration tests verify complete login flow for all identifier types
- [ ] Security tests confirm rate limiting and session security work correctly
- [ ] Performance tests validate response times under concurrent load
- [ ] Penetration testing confirms no authentication vulnerabilities

### Documentation Complete
- [ ] API documentation updated with authentication endpoint
- [ ] Error code reference available for frontend integration
- [ ] Security implementation notes documented
- [ ] Rate limiting behavior documented for frontend
- [ ] LGPD compliance procedures documented

## Estimated Effort

**Story Points**: 3  
**Time Estimate**: 2-3 hours  
**Complexity**: Medium (Multi-identifier complexity, security requirements)

### Breakdown
- **Authentication Logic Implementation**: 1 hour
- **Rate Limiting and Security**: 1 hour  
- **Session Management**: 0.5 hours
- **Error Handling & Logging**: 0.5 hours
- **Testing & Validation**: 0.5 hours

## Future Considerations

### Extensibility
- Multi-factor authentication (SMS, email) integration points
- Social login integration for additional convenience
- Biometric authentication for mobile applications
- Single sign-on (SSO) capabilities for business users

### Scalability
- Distributed session storage for multi-instance deployments
- Redis integration for high-performance rate limiting
- Database read replicas for authentication queries
- Horizontal scaling considerations for high-concurrency authentication

### Security Enhancements
- Advanced fraud detection based on behavioral patterns
- Machine learning for anomaly detection in authentication attempts
- Integration with external threat intelligence for IP reputation
- Enhanced audit capabilities for forensic investigation