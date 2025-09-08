# Story 1.6: Frontend Authentication Flow

## Story Overview

**As a user,**  
**I want a seamless authentication experience on mobile and desktop with Brazilian Portuguese interface,**  
**so that I can quickly register and login using my preferred PIX identifiers with full LGPD transparency.**

## Dependencies

- **Story 1.1**: Project Infrastructure Setup (Docker, Next.js setup)
- **Story 1.2**: Database Schema and Prisma Setup (data structure understanding)
- **Story 1.3**: Fastify API Foundation (API endpoints available)
- **Story 1.4**: User Registration with Identifier Validation (POST /api/auth/signup)
- **Story 1.5**: Multi-Identifier Authentication (POST /api/auth/login)

## Acceptance Criteria

### Unified Authentication Interface
1. **Single Auth Page**: Combined login/register interface with tab switching
2. **Identifier Type Selection**: Radio buttons or dropdown for CPF, CNPJ, email, phone, EVP
3. **Input Formatting**: Real-time input masks for CPF (000.000.000-00), CNPJ (00.000.000/0000-00), phone ((00) 00000-0000)
4. **Smart Detection**: Automatic identifier type detection based on input patterns
5. **Responsive Design**: Mobile-first design with large touch targets (44px minimum)

### Real-Time Validation
1. **Identifier Validation**: Live validation with Brazilian Portuguese feedback
2. **Password Strength**: Visual password strength indicator for registration
3. **Form State Management**: Clear visual states (valid, invalid, loading, disabled)
4. **Error Display**: Field-specific error messages with helpful guidance
5. **Success Feedback**: Clear confirmation messages for successful operations

### LGPD Compliance Interface
1. **Privacy Notice**: Clear LGPD consent modal before registration
2. **Data Processing Transparency**: Explain what data is collected and why
3. **Consent Tracking**: Record user consent with timestamp for audit
4. **Opt-in Required**: No pre-checked consent boxes, explicit user action required
5. **Privacy Policy Access**: Easy access to full privacy policy in Portuguese

### Loading and Error States
1. **Loading Indicators**: Skeleton screens and spinners during API calls
2. **Progress Feedback**: Show registration/login progress steps
3. **Retry Mechanisms**: Allow users to retry failed operations
4. **Offline Handling**: Graceful handling of network connectivity issues
5. **Rate Limiting UI**: Show countdown timers when rate limited

### Session Management
1. **Persistent Sessions**: Remember authentication state across browser sessions
2. **Auto-Login**: Automatic login for returning users with valid sessions
3. **Session Expiration**: Clear warnings before session expires with renewal option
4. **Logout Functionality**: Clear logout with session invalidation
5. **Security Indicators**: Show security status (session active, secure connection)

## Technical Specifications

### Component Architecture

#### AuthPage Component Structure
```typescript
/src/pages/auth/index.tsx          // Main authentication page
/src/components/auth/
  ├── AuthTabs.tsx                 // Login/Register tab switching
  ├── LoginForm.tsx                // Login form component
  ├── RegisterForm.tsx             // Registration form component
  ├── IdentifierInput.tsx          // Smart identifier input with validation
  ├── PasswordInput.tsx            // Password input with strength indicator
  ├── LGPDConsent.tsx             // LGPD consent modal and checkbox
  ├── ValidationMessage.tsx        // Reusable validation feedback component
  └── AuthLoadingState.tsx        // Loading states and skeleton screens
```

#### State Management Structure
```typescript
// Authentication context for global state
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Form state management
interface AuthFormState {
  mode: 'login' | 'register';
  identifier: {
    type: IdentifierType;
    value: string;
    isValid: boolean;
    error: string | null;
  };
  password: {
    value: string;
    strength: PasswordStrength;
    isValid: boolean;
    error: string | null;
  };
  lgpdConsent: {
    accepted: boolean;
    timestamp: Date | null;
  };
  isSubmitting: boolean;
  errors: Record<string, string>;
}
```

### Brazilian Portuguese Localization

#### Interface Text (pt-BR)
```typescript
export const AuthStrings = {
  // Tab titles
  LOGIN_TAB: 'Entrar',
  REGISTER_TAB: 'Criar Conta',
  
  // Form labels
  IDENTIFIER_LABEL: 'CPF, CNPJ, Email, Telefone ou Chave PIX',
  PASSWORD_LABEL: 'Senha',
  CONFIRM_PASSWORD_LABEL: 'Confirmar Senha',
  FULL_NAME_LABEL: 'Nome Completo',
  
  // Identifier types
  IDENTIFIER_CPF: 'CPF',
  IDENTIFIER_CNPJ: 'CNPJ',
  IDENTIFIER_EMAIL: 'Email',
  IDENTIFIER_PHONE: 'Telefone',
  IDENTIFIER_EVP: 'Chave Aleatória PIX',
  
  // Placeholders
  PLACEHOLDER_CPF: '000.000.000-00',
  PLACEHOLDER_CNPJ: '00.000.000/0000-00',
  PLACEHOLDER_EMAIL: 'seu@email.com',
  PLACEHOLDER_PHONE: '(11) 99999-9999',
  PLACEHOLDER_EVP: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  PLACEHOLDER_NAME: 'Seu nome completo',
  PLACEHOLDER_PASSWORD: 'Mínimo 8 caracteres',
  
  // Validation messages
  REQUIRED_FIELD: 'Campo obrigatório',
  INVALID_CPF: 'CPF deve ter 11 dígitos válidos',
  INVALID_CNPJ: 'CNPJ deve ter 14 dígitos válidos',
  INVALID_EMAIL: 'Email deve ter formato válido',
  INVALID_PHONE: 'Telefone deve ter formato brasileiro',
  INVALID_EVP: 'Chave PIX deve ser um UUID válido',
  PASSWORD_TOO_SHORT: 'Senha deve ter no mínimo 8 caracteres',
  PASSWORD_MISMATCH: 'Senhas não coincidem',
  NAME_TOO_SHORT: 'Nome deve ter pelo menos 2 caracteres',
  
  // Success messages
  LOGIN_SUCCESS: 'Login realizado com sucesso!',
  REGISTER_SUCCESS: 'Conta criada com sucesso!',
  
  // Error messages
  AUTHENTICATION_FAILED: 'Identificador ou senha incorretos',
  RATE_LIMITED: 'Muitas tentativas. Tente novamente em {minutes} minutos',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet',
  SERVER_ERROR: 'Erro temporário. Tente novamente',
  
  // LGPD compliance
  LGPD_TITLE: 'Consentimento para Tratamento de Dados',
  LGPD_DESCRIPTION: 'Para criar sua conta, precisamos do seu consentimento para tratar seus dados pessoais conforme a LGPD.',
  LGPD_CONSENT_TEXT: 'Eu concordo com o tratamento dos meus dados pessoais conforme descrito na Política de Privacidade',
  LGPD_REQUIRED: 'É necessário concordar com o tratamento de dados',
  PRIVACY_POLICY_LINK: 'Política de Privacidade',
  LGPD_COMPLIANT_BADGE: '100% Conforme LGPD',
  
  // Loading states
  LOADING_LOGIN: 'Entrando...',
  LOADING_REGISTER: 'Criando conta...',
  LOADING_SESSION: 'Verificando sessão...',
  
  // Button labels
  BUTTON_LOGIN: 'Entrar',
  BUTTON_REGISTER: 'Criar Conta',
  BUTTON_CONTINUE: 'Continuar',
  BUTTON_CANCEL: 'Cancelar',
  BUTTON_RETRY: 'Tentar Novamente'
} as const;
```

### Input Validation and Formatting

#### Brazilian Identifier Input Masks
```typescript
// CPF input mask: 000.000.000-00
const cpfMask = [
  /[0-9]/, /[0-9]/, /[0-9]/, '.', 
  /[0-9]/, /[0-9]/, /[0-9]/, '.', 
  /[0-9]/, /[0-9]/, /[0-9]/, '-', 
  /[0-9]/, /[0-9]/
];

// CNPJ input mask: 00.000.000/0000-00
const cnpjMask = [
  /[0-9]/, /[0-9]/, '.', 
  /[0-9]/, /[0-9]/, /[0-9]/, '.', 
  /[0-9]/, /[0-9]/, /[0-9]/, '/', 
  /[0-9]/, /[0-9]/, /[0-9]/, /[0-9]/, '-', 
  /[0-9]/, /[0-9]/
];

// Phone input mask: (00) 00000-0000
const phoneMask = [
  '(', /[0-9]/, /[0-9]/, ')', ' ',
  /[0-9]/, /[0-9]/, /[0-9]/, /[0-9]/, /[0-9]/, '-',
  /[0-9]/, /[0-9]/, /[0-9]/, /[0-9]/
];
```

#### Real-Time Validation Logic
```typescript
const validateIdentifier = (value: string, type: IdentifierType): ValidationResult => {
  switch (type) {
    case 'cpf':
      return {
        isValid: validateCPF(value),
        error: validateCPF(value) ? null : AuthStrings.INVALID_CPF
      };
    
    case 'cnpj':
      return {
        isValid: validateCNPJ(value),
        error: validateCNPJ(value) ? null : AuthStrings.INVALID_CNPJ
      };
    
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(value);
      return {
        isValid: isValidEmail,
        error: isValidEmail ? null : AuthStrings.INVALID_EMAIL
      };
    
    case 'phone':
      const cleanPhone = value.replace(/\D/g, '');
      const isValidPhone = cleanPhone.length === 11 && cleanPhone.startsWith('1');
      return {
        isValid: isValidPhone,
        error: isValidPhone ? null : AuthStrings.INVALID_PHONE
      };
    
    case 'evp':
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isValidEVP = uuidRegex.test(value);
      return {
        isValid: isValidEVP,
        error: isValidEVP ? null : AuthStrings.INVALID_EVP
      };
    
    default:
      return { isValid: false, error: 'Tipo de identificador inválido' };
  }
};
```

### Responsive Design Implementation

#### Mobile-First Breakpoints
```css
/* Mobile: 320px - 767px (primary target) */
@media (max-width: 767px) {
  .auth-container {
    padding: 1rem;
    min-height: 100vh;
  }
  
  .auth-form {
    width: 100%;
    max-width: none;
  }
  
  .input-field {
    min-height: 44px; /* iOS touch target minimum */
    font-size: 16px; /* Prevent iOS zoom */
  }
  
  .button-primary {
    min-height: 44px;
    width: 100%;
    margin-top: 1rem;
  }
}

/* Tablet: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  .auth-container {
    padding: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .auth-form {
    width: 100%;
    max-width: 400px;
  }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .auth-container {
    padding: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  
  .auth-form {
    width: 400px;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
}
```

### LGPD Consent Implementation

#### Consent Modal Component
```typescript
interface LGPDConsentProps {
  isOpen: boolean;
  onAccept: (timestamp: Date) => void;
  onDecline: () => void;
}

const LGPDConsent: React.FC<LGPDConsentProps> = ({ isOpen, onAccept, onDecline }) => {
  return (
    <Modal isOpen={isOpen} className="lgpd-consent-modal">
      <div className="modal-header">
        <h2>{AuthStrings.LGPD_TITLE}</h2>
        <span className="lgpd-badge">{AuthStrings.LGPD_COMPLIANT_BADGE}</span>
      </div>
      
      <div className="modal-content">
        <p>{AuthStrings.LGPD_DESCRIPTION}</p>
        
        <div className="data-processing-info">
          <h3>Dados que Coletamos:</h3>
          <ul>
            <li>Nome completo (identificação)</li>
            <li>CPF/CNPJ (identificação PIX)</li>
            <li>Email (comunicação)</li>
            <li>Telefone (comunicação)</li>
            <li>Chaves PIX (transações)</li>
          </ul>
          
          <h3>Finalidade do Tratamento:</h3>
          <ul>
            <li>Identificação de usuários</li>
            <li>Divisão de contas</li>
            <li>Comunicação sobre transações</li>
            <li>Cumprimento de obrigações legais</li>
          </ul>
        </div>
        
        <label className="consent-checkbox">
          <input
            type="checkbox"
            onChange={(e) => e.target.checked && onAccept(new Date())}
          />
          <span className="checkmark"></span>
          {AuthStrings.LGPD_CONSENT_TEXT}
        </label>
        
        <a href="/privacidade" target="_blank" className="privacy-link">
          {AuthStrings.PRIVACY_POLICY_LINK}
        </a>
      </div>
      
      <div className="modal-actions">
        <button onClick={onDecline} className="button-secondary">
          {AuthStrings.BUTTON_CANCEL}
        </button>
        <button onClick={() => onAccept(new Date())} className="button-primary">
          {AuthStrings.BUTTON_CONTINUE}
        </button>
      </div>
    </Modal>
  );
};
```

### Form State Management

#### React Query Integration
```typescript
// Authentication mutations
const useLogin = () => {
  return useMutation({
    mutationFn: async ({ identifier, password }: LoginData) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message || 'Erro de autenticação');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update authentication context
      queryClient.setQueryData(['auth', 'user'], data.user);
      // Redirect to dashboard
      router.push('/dashboard');
    },
    onError: (error) => {
      // Handle rate limiting and other errors
      toast.error(error.message);
    }
  });
};

const useRegister = () => {
  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message || 'Erro no registro');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success(AuthStrings.REGISTER_SUCCESS);
      // Automatically log in the user after registration
      router.push('/dashboard');
    }
  });
};
```

### Error Handling and User Feedback

#### Toast Notification System
```typescript
// Success notifications
toast.success(AuthStrings.LOGIN_SUCCESS, {
  duration: 3000,
  position: 'top-center',
  style: {
    background: '#10B981',
    color: '#FFFFFF'
  }
});

// Error notifications with retry
toast.error(error.message, {
  duration: 5000,
  position: 'top-center',
  action: {
    label: AuthStrings.BUTTON_RETRY,
    onClick: () => retryLastOperation()
  }
});

// Rate limiting with countdown
toast.error(AuthStrings.RATE_LIMITED.replace('{minutes}', '5'), {
  duration: 300000, // 5 minutes
  position: 'top-center',
  style: {
    background: '#F59E0B',
    color: '#FFFFFF'
  }
});
```

### Accessibility Implementation

#### ARIA Labels and Screen Reader Support
```typescript
// Accessible form implementation
<form role="form" aria-labelledby="auth-title">
  <h1 id="auth-title">{mode === 'login' ? AuthStrings.LOGIN_TAB : AuthStrings.REGISTER_TAB}</h1>
  
  <div className="form-group">
    <label htmlFor="identifier-input" className="required">
      {AuthStrings.IDENTIFIER_LABEL}
    </label>
    <input
      id="identifier-input"
      type="text"
      value={identifier.value}
      onChange={handleIdentifierChange}
      aria-invalid={!identifier.isValid && identifier.value.length > 0}
      aria-describedby={identifier.error ? "identifier-error" : undefined}
      placeholder={getPlaceholderForType(identifier.type)}
      autoComplete="username"
    />
    {identifier.error && (
      <div id="identifier-error" role="alert" className="error-message">
        {identifier.error}
      </div>
    )}
  </div>
  
  <div className="form-group">
    <label htmlFor="password-input" className="required">
      {AuthStrings.PASSWORD_LABEL}
    </label>
    <input
      id="password-input"
      type="password"
      value={password.value}
      onChange={handlePasswordChange}
      aria-invalid={!password.isValid && password.value.length > 0}
      aria-describedby="password-strength password-error"
      placeholder={AuthStrings.PLACEHOLDER_PASSWORD}
      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
    />
    <div id="password-strength" className="password-strength">
      <PasswordStrengthIndicator strength={password.strength} />
    </div>
    {password.error && (
      <div id="password-error" role="alert" className="error-message">
        {password.error}
      </div>
    )}
  </div>
</form>
```

## Integration Points

### Backend API Integration
- Form submission to authentication endpoints
- Real-time validation against API schemas
- Session management with secure cookies
- Error handling with proper HTTP status codes
- Rate limiting integration with user feedback

### Routing and Navigation
- Protected route handling for authenticated users
- Automatic redirects after successful authentication
- Session persistence across page refreshes
- Logout functionality with proper cleanup
- Deep linking support for authentication flows

### Analytics Integration
- User registration funnel tracking
- Authentication success/failure rates
- LGPD consent tracking and compliance
- Error tracking for UX improvements
- Performance monitoring for form interactions

## Testing Requirements

### Unit Tests
1. **Component Rendering**: Test all authentication components render correctly
2. **Form Validation**: Test real-time validation for all identifier types
3. **Input Formatting**: Test input masks and formatting functions
4. **Error Handling**: Test error display and recovery mechanisms

### Integration Tests
1. **Authentication Flow**: End-to-end registration and login processes
2. **LGPD Compliance**: Test consent collection and tracking
3. **Session Management**: Test session persistence and expiration
4. **Responsive Design**: Test layout on different screen sizes

### Accessibility Tests
1. **Screen Reader**: Test compatibility with NVDA, JAWS, VoiceOver
2. **Keyboard Navigation**: Test complete keyboard accessibility
3. **ARIA Labels**: Verify proper ARIA labeling and roles
4. **Color Contrast**: Ensure WCAG AA compliance

### Performance Tests
1. **Page Load**: Test initial authentication page load performance
2. **Form Responsiveness**: Test form interaction response times
3. **Validation Speed**: Test real-time validation performance
4. **Bundle Size**: Optimize JavaScript bundle size for mobile

## Performance Considerations

### Code Splitting
- Lazy load authentication components
- Split validation logic into separate chunks
- Optimize bundle size with tree shaking
- Use dynamic imports for heavy dependencies

### Caching Strategy
- Cache validation results for repeated inputs
- Preload common validation patterns
- Cache session state in local storage
- Optimize image and asset loading

### Mobile Optimization
- Minimize JavaScript execution on mobile
- Optimize for touch interactions
- Reduce network requests
- Implement offline capabilities

## Security Considerations

### Client-Side Security
- Never store passwords in client-side state
- Secure session token handling
- XSS prevention in form inputs
- CSRF protection with form submissions

### Input Validation
- Client-side validation for UX only
- Server-side validation for security
- Sanitize all user inputs
- Prevent malicious code injection

## Success Metrics

### User Experience Success
- ✅ Authentication completion rate >95%
- ✅ Form validation provides immediate helpful feedback
- ✅ Mobile users can complete authentication easily
- ✅ LGPD consent process is clear and transparent
- ✅ Error messages help users recover from mistakes

### Performance Success
- ✅ Initial page load <3 seconds on 4G
- ✅ Form interactions respond <100ms
- ✅ Validation feedback appears instantly
- ✅ Bundle size optimized for mobile data usage

### Accessibility Success
- ✅ WCAG AA compliance achieved
- ✅ Screen reader compatibility verified
- ✅ Keyboard navigation fully functional
- ✅ High contrast mode supported

## Definition of Done

### Implementation Complete
- [ ] Unified authentication page with login/register tabs
- [ ] All Brazilian identifier input types with real-time validation
- [ ] LGPD consent modal with clear data processing explanation
- [ ] Responsive design working on all target screen sizes
- [ ] Session management with persistent authentication state
- [ ] Portuguese localization for all user-facing text

### Testing Complete
- [ ] Unit tests cover all form validation logic with 90%+ coverage
- [ ] Integration tests verify complete authentication flows
- [ ] Accessibility tests confirm WCAG AA compliance
- [ ] Performance tests validate mobile load times
- [ ] Cross-browser testing on Chrome, Safari, Firefox

### Documentation Complete
- [ ] Component documentation for frontend developers
- [ ] Accessibility implementation guide
- [ ] LGPD compliance implementation notes
- [ ] Brazilian localization style guide
- [ ] Mobile optimization best practices

## Estimated Effort

**Story Points**: 5  
**Time Estimate**: 4-6 hours  
**Complexity**: Medium-High (UI complexity, Brazilian localization, LGPD compliance)

### Breakdown
- **Authentication Components**: 2 hours
- **Brazilian Input Validation**: 1 hour  
- **LGPD Consent Interface**: 1 hour
- **Responsive Design**: 1 hour
- **Testing & Polish**: 1 hour

## Future Considerations

### Enhanced User Experience
- Biometric authentication support for mobile
- Social login integration (Google, Apple)
- Password manager integration
- Multi-language support beyond Portuguese

### Advanced Security Features
- Multi-factor authentication (SMS, email)
- Device recognition and trusted devices
- Advanced fraud detection UI
- Security settings management

### Accessibility Enhancements
- Voice input support
- High contrast themes
- Enlarged text options
- Simplified navigation modes