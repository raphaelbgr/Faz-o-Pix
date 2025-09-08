# Development Story 1.3: Fastify API Foundation

## Story Overview
**Epic**: 1 - Foundation & Authentication  
**Story ID**: 1.3  
**Estimated Effort**: 2-4 hours  
**Status**: Ready for Development  
**Dependencies**: Story 1.1 (Project Infrastructure Setup), Story 1.2 (Database Schema and Prisma Setup)

## User Story
**As a developer,**  
**I want a structured Fastify API server with routing, validation, and error handling,**  
**so that I can build authentication and business logic endpoints following consistent, secure patterns with proper Brazilian localization.**

## Background
Building on the infrastructure (Story 1.1) and database foundation (Story 1.2), this story establishes the complete API foundation using Fastify framework. The API server provides the structured foundation for authentication endpoints (Stories 1.4-1.5) and future business logic, with emphasis on Brazilian Portuguese error messages, LGPD compliance considerations, and performance optimized for Brazilian users.

The API connects to the external PostgreSQL database (192.168.7.101 for development, Supabase for production) and provides WebSocket support for real-time bill collaboration features.

## Acceptance Criteria

### ✅ Fastify Server Configuration
1. **Core Server Setup**
   - [ ] Fastify server configured with TypeScript and strict type checking
   - [ ] CORS configuration for development frontend (Next.js on port 3000)
   - [ ] Security headers middleware (helmet, rate limiting)
   - [ ] Environment-based configuration system supporting dev/production
   - [ ] Graceful shutdown handling for Docker containers

2. **Request/Response Architecture**
   - [ ] Global error handler with consistent Brazilian Portuguese error messages
   - [ ] Request correlation ID middleware for distributed logging
   - [ ] Structured logging with Winston supporting audit requirements
   - [ ] Request/response validation using Zod schemas
   - [ ] JSON serialization with Brazilian Real currency formatting

### ✅ Route Registration and OpenAPI
3. **Plugin-Based Architecture**
   - [ ] Route registration system using Fastify plugins for modularity
   - [ ] Automatic OpenAPI 3.0 specification generation with swagger-ui
   - [ ] API versioning strategy (/api/v1/) ready for future evolution
   - [ ] Health check endpoint with database connectivity status
   - [ ] Development debugging routes (only in development environment)

4. **Documentation and Testing Support**
   - [ ] OpenAPI schemas match Zod validation schemas exactly
   - [ ] API documentation includes Brazilian Portuguese descriptions
   - [ ] Request/response examples using Brazilian data formats
   - [ ] Swagger UI accessible for development API testing

### ✅ Validation and Error Handling
5. **Zod Schema Integration**
   - [ ] Shared Zod schemas between API validation and TypeScript types
   - [ ] Brazilian identifier validation schemas (CPF, CNPJ, phone, email, EVP)
   - [ ] Monetary amount validation (integer cents) with BRL formatting
   - [ ] Request payload validation with detailed error responses
   - [ ] Response serialization ensuring consistent data formats

6. **Brazilian Localized Error Handling**
   - [ ] Error messages in Brazilian Portuguese with helpful guidance
   - [ ] HTTP status codes properly mapped to business errors
   - [ ] Validation error responses include field-specific messages in Portuguese
   - [ ] Rate limiting errors with clear retry guidance
   - [ ] Security error messages that don't expose system internals

### ✅ Security and Performance
7. **Security Middleware**
   - [ ] Rate limiting per IP address and per route (Brazilian business hours consideration)
   - [ ] Request size limits appropriate for Brazilian mobile networks
   - [ ] Security headers preventing common attacks (XSS, CSRF, clickjacking)
   - [ ] CORS configuration for production (Supabase integration ready)
   - [ ] Request sanitization preventing injection attacks

8. **Performance Optimization**
   - [ ] Database connection pooling integration with Prisma
   - [ ] Response compression (gzip/brotli) for Brazilian mobile networks
   - [ ] Request timeout configuration appropriate for external database
   - [ ] Memory usage monitoring and garbage collection optimization
   - [ ] Async/await patterns optimized for I/O operations

### ✅ WebSocket Foundation
9. **Real-time Communication Setup**
   - [ ] WebSocket server integration with Fastify using @fastify/websocket
   - [ ] Connection authentication and authorization framework
   - [ ] Message routing system for bill-specific real-time events
   - [ ] Brazilian Portuguese real-time notification templates
   - [ ] Connection state management with graceful disconnection handling

### ✅ LGPD Compliance Foundation
10. **Data Privacy Architecture**
    - [ ] Request logging excludes sensitive identifiers (CPF, CNPJ, PIX keys)
    - [ ] Audit logging structure for LGPD compliance reporting
    - [ ] User consent tracking endpoints preparation
    - [ ] Data processing purpose logging for regulatory compliance
    - [ ] Personal data anonymization helpers for erasure requests

## Technical Requirements

### Server Configuration
```typescript
// Fastify server with optimized Brazilian configuration
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    redact: ['req.headers.authorization', 'req.body.password'],
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        correlationId: req.headers['x-correlation-id']
      })
    }
  },
  trustProxy: true, // For proper IP detection behind load balancers
  bodyLimit: 1048576, // 1MB limit appropriate for Brazilian mobile networks
  keepAliveTimeout: 30000 // 30s keep-alive for database connections
});
```

### Brazilian Portuguese Error Messages
```typescript
// Localized error message constants
export const ErrorMessages = {
  VALIDATION_FAILED: 'Os dados fornecidos são inválidos',
  CPF_INVALID: 'CPF deve conter 11 dígitos válidos',
  CNPJ_INVALID: 'CNPJ deve conter 14 dígitos válidos',
  EMAIL_INVALID: 'Email deve ter um formato válido',
  PHONE_INVALID: 'Telefone deve ter formato brasileiro válido (+55...)',
  EVP_INVALID: 'Chave PIX aleatória deve ser um UUID válido',
  AMOUNT_INVALID: 'Valor deve ser um número positivo em centavos',
  RATE_LIMITED: 'Muitas tentativas. Tente novamente em alguns minutos',
  SERVER_ERROR: 'Erro interno do servidor. Tente novamente mais tarde'
} as const;
```

### WebSocket Event Structure
```typescript
// Real-time event types for Brazilian users
interface WebSocketEvent {
  type: 'BILL_UPDATED' | 'EXPENSE_ADDED' | 'SETTLEMENT_RECORDED';
  billId: string;
  userId: string;
  message: string; // Brazilian Portuguese description
  data: {
    amount?: number; // Amount in cents (BRL)
    description?: string;
    timestamp: string; // ISO 8601 in America/Sao_Paulo timezone
  };
}
```

### LGPD Audit Structure
```typescript
// Data processing audit log structure
interface DataProcessingAudit {
  userId: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  dataType: 'PERSONAL' | 'FINANCIAL' | 'IDENTIFIER';
  purpose: 'AUTHENTICATION' | 'CALCULATION' | 'SETTLEMENT' | 'COMPLIANCE';
  legalBasis: 'CONSENT' | 'CONTRACT' | 'LEGAL_OBLIGATION';
  timestamp: Date;
  correlationId: string;
}
```

## Implementation Tasks

### Phase 1: Core Server Setup (1.5 hours)
1. **Fastify Configuration**
   - [ ] Install Fastify with TypeScript and essential plugins
   - [ ] Configure server with Brazilian-optimized settings
   - [ ] Set up environment variable configuration system
   - [ ] Implement graceful shutdown handling for containers

2. **Middleware Stack Setup**
   - [ ] Configure CORS for development and production environments
   - [ ] Implement security headers with @fastify/helmet
   - [ ] Set up rate limiting with Brazilian business hours consideration
   - [ ] Add request compression for mobile network optimization

### Phase 2: Validation and Error Handling (1 hour)
3. **Zod Schema Integration**
   - [ ] Create shared schema library for request/response validation
   - [ ] Implement Brazilian identifier validation schemas
   - [ ] Set up monetary amount validation (cents-based)
   - [ ] Create schema-to-OpenAPI transformation utilities

4. **Brazilian Error Handling**
   - [ ] Implement global error handler with Portuguese messages
   - [ ] Create validation error formatter for detailed feedback
   - [ ] Set up correlation ID middleware for request tracking
   - [ ] Configure structured logging with security redaction

### Phase 3: API Documentation and WebSockets (1 hour)
5. **OpenAPI Integration**
   - [ ] Configure @fastify/swagger with Brazilian Portuguese descriptions
   - [ ] Set up automatic schema generation from Zod schemas
   - [ ] Create API documentation with Brazilian data examples
   - [ ] Implement health check endpoint with database status

6. **WebSocket Foundation**
   - [ ] Integrate @fastify/websocket for real-time features
   - [ ] Set up message routing system for bill updates
   - [ ] Create connection authentication framework
   - [ ] Implement Brazilian Portuguese notification templates

### Phase 4: Security and LGPD Preparation (0.5 hours)
7. **Security Hardening**
   - [ ] Configure request sanitization and payload limits
   - [ ] Implement IP-based rate limiting with Brazilian timezone awareness
   - [ ] Set up audit logging structure for LGPD compliance
   - [ ] Create data processing tracking utilities

8. **Performance Optimization**
   - [ ] Configure Prisma connection pooling integration
   - [ ] Set up memory monitoring and optimization
   - [ ] Implement async/await patterns for database operations
   - [ ] Test server performance under Brazilian network conditions

## Definition of Done

### ✅ Functional Requirements
- [ ] Fastify server starts successfully and binds to configured port
- [ ] Health check endpoint returns proper database connectivity status
- [ ] All requests include correlation IDs in structured logs
- [ ] Error responses follow consistent format with Portuguese messages
- [ ] OpenAPI documentation auto-generates from Zod schemas
- [ ] WebSocket connections handle authentication and message routing

### ✅ Quality Requirements
- [ ] Request validation provides clear, helpful error messages in Portuguese
- [ ] Rate limiting prevents abuse while allowing normal Brazilian usage patterns
- [ ] Response times under 100ms for simple operations (health check)
- [ ] Memory usage remains stable under sustained connections
- [ ] All middleware properly handles errors and edge cases

### ✅ Security Requirements
- [ ] Security headers protect against common web vulnerabilities
- [ ] Sensitive data never appears in plain text logs
- [ ] Rate limiting prevents brute force attacks
- [ ] CORS configuration allows only authorized origins
- [ ] Request size limits prevent DoS attacks

### ✅ Brazilian Localization Requirements
- [ ] All error messages in natural Brazilian Portuguese
- [ ] Monetary formatting follows Brazilian standards (R$ 1.234,56)
- [ ] Date/time handling uses America/Sao_Paulo timezone
- [ ] Identifier validation supports all Brazilian PIX key types
- [ ] API documentation includes Brazilian business context

### ✅ LGPD Compliance Requirements
- [ ] Audit logging structure supports regulatory reporting
- [ ] Personal data handling follows privacy-by-design principles
- [ ] Data processing purposes clearly defined and logged
- [ ] User consent tracking framework ready for implementation
- [ ] Data anonymization utilities prepared for erasure requests

## Testing and Validation Commands

### Server Testing
```bash
# Start development server
cd backend
npm run dev

# Test health check
curl http://localhost:3001/api/v1/health

# Test validation with invalid CPF
curl -X POST http://localhost:3001/api/test/validate \
  -H "Content-Type: application/json" \
  -d '{"cpf": "invalid"}'

# Load test with Brazilian-style requests
npx autocannon -c 100 -d 30 http://localhost:3001/api/v1/health
```

### WebSocket Testing
```typescript
// Test WebSocket connection and authentication
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001/api/v1/ws');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'AUTHENTICATE',
    token: 'test-session-token'
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log('Received Brazilian notification:', event.message);
});
```

### LGPD Compliance Testing
```bash
# Verify sensitive data redaction in logs
grep -v "cpf\|cnpj\|password" logs/application.log

# Test audit log structure
curl -X GET http://localhost:3001/api/v1/audit/user/123 \
  -H "Authorization: Bearer test-token"
```

## Files to Create/Modify

### New Files
- `/backend/src/server.ts` - Main Fastify server configuration
- `/backend/src/plugins/` - Directory for Fastify plugins
- `/backend/src/plugins/cors.ts` - CORS configuration plugin
- `/backend/src/plugins/security.ts` - Security middleware plugin
- `/backend/src/plugins/validation.ts` - Zod validation plugin
- `/backend/src/plugins/websocket.ts` - WebSocket integration plugin
- `/backend/src/schemas/` - Directory for Zod validation schemas
- `/backend/src/schemas/common.ts` - Common Brazilian validation schemas
- `/backend/src/schemas/identifiers.ts` - Brazilian identifier validation
- `/backend/src/utils/errors.ts` - Brazilian Portuguese error messages
- `/backend/src/utils/audit.ts` - LGPD audit logging utilities
- `/backend/src/routes/health.ts` - Health check endpoint
- `/docs/api-architecture.md` - API design and patterns documentation

### Modified Files
- `/backend/package.json` - Add Fastify dependencies and scripts
- `/backend/src/lib/prisma.ts` - Database connection configuration
- `/backend/tsconfig.json` - TypeScript configuration for strict mode
- `/docker-compose.yml` - Ensure API service configuration is correct

## Success Metrics
- Fastify server starts in under 3 seconds with all plugins loaded
- Health check endpoint responds in under 50ms with database status
- API documentation generates successfully with 100% schema coverage
- WebSocket connections handle 100+ concurrent users in development
- All error messages display properly in Brazilian Portuguese
- Rate limiting effectively prevents abuse without blocking legitimate use
- LGPD audit logging captures all data processing activities

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|---------|------------|
| WebSocket performance with many connections | Medium | Connection limiting and efficient message broadcasting |
| Brazilian Portuguese message quality | High | Native speaker review and user testing |
| LGPD compliance complexity | High | Legal consultation and comprehensive audit logging |
| External database connectivity issues | Medium | Proper error handling and connection pooling |
| Rate limiting affecting legitimate users | Medium | Brazilian usage pattern analysis and dynamic limits |

## Brazilian-Specific Considerations

### Network Optimization
- Response compression for mobile data plans
- Connection keep-alive optimized for Brazilian latency
- Request timeouts appropriate for mobile network conditions
- Graceful degradation when external database is slow

### Business Context Integration
- Error messages that understand Brazilian financial terminology
- Validation that supports Brazilian business practices
- API design that matches Brazilian user expectations
- Performance optimization for peak Brazilian usage hours (19:00-22:00 BRT)

### LGPD Implementation Strategy
- Privacy-by-design approach in all API endpoints
- Data minimization principles in request/response handling
- Audit trail preparation for regulatory compliance
- User consent management framework integration points

## Post-Completion Verification

After completing this story, verify the following capabilities:

1. **Server Functionality**:
   ```bash
   # Verify server starts and health check works
   cd backend && npm run dev
   curl http://localhost:3001/api/v1/health
   ```

2. **API Documentation**:
   ```bash
   # Access Swagger UI with Brazilian descriptions
   open http://localhost:3001/documentation
   ```

3. **WebSocket Connection**:
   ```javascript
   // Test WebSocket connection with authentication
   const ws = new WebSocket('ws://localhost:3001/api/v1/ws');
   // Verify connection and Brazilian message handling
   ```

4. **Validation Testing**:
   ```bash
   # Test Brazilian identifier validation
   curl -X POST http://localhost:3001/api/test/validate \
     -H "Content-Type: application/json" \
     -d '{"cpf": "12345678901", "amount_cents": 15000}'
   ```

This story establishes the complete API foundation necessary for implementing authentication endpoints (Stories 1.4-1.5) and future business logic, providing a secure, performant, and Brazilian-localized foundation with proper LGPD compliance preparation and real-time WebSocket capabilities for collaborative bill management.