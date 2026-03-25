import { describe, it, expect } from 'vitest';
import { signupSchema, loginSchema } from '../schemas/auth';
import { normalizeIdentifier, detectIdentifierType, validateCPF, validateEmail, validateCNPJ, validateEVP, normalizePhone } from '../utils/validation';

describe('Auth Route - Schema Validation', () => {
  describe('Signup Schema', () => {
    it('should validate a correct signup with CPF', () => {
      const result = signupSchema.safeParse({
        body: {
          fullName: 'João Silva',
          password: 'SenhaForte123!',
          identifiers: [
            { type: 'PIX_CPF', value: '529.982.247-25' },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate signup with multiple identifiers', () => {
      const result = signupSchema.safeParse({
        body: {
          fullName: 'Maria Santos',
          password: 'Outra$enha456',
          identifiers: [
            { type: 'PIX_EMAIL', value: 'maria@example.com' },
            { type: 'PIX_PHONE', value: '+5511999998888' },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject signup without fullName', () => {
      const result = signupSchema.safeParse({
        body: {
          fullName: '',
          password: 'SenhaForte123!',
          identifiers: [
            { type: 'PIX_EMAIL', value: 'test@test.com' },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject signup without password', () => {
      const result = signupSchema.safeParse({
        body: {
          fullName: 'Test User',
          password: '',
          identifiers: [
            { type: 'PIX_EMAIL', value: 'test@test.com' },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject signup with short password', () => {
      const result = signupSchema.safeParse({
        body: {
          fullName: 'Test User',
          password: '123',
          identifiers: [
            { type: 'PIX_EMAIL', value: 'test@test.com' },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject signup with empty identifiers', () => {
      const result = signupSchema.safeParse({
        body: {
          fullName: 'Test User',
          password: 'SenhaForte123!',
          identifiers: [],
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject signup with invalid identifier type', () => {
      const result = signupSchema.safeParse({
        body: {
          fullName: 'Test User',
          password: 'SenhaForte123!',
          identifiers: [
            { type: 'INVALID_TYPE', value: 'something' },
          ],
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Login Schema', () => {
    it('should validate a correct login', () => {
      const result = loginSchema.safeParse({
        body: {
          identifier: 'user@example.com',
          password: 'SenhaForte123!',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate login with CPF identifier', () => {
      const result = loginSchema.safeParse({
        body: {
          identifier: '529.982.247-25',
          password: 'senha123',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate login with phone identifier', () => {
      const result = loginSchema.safeParse({
        body: {
          identifier: '+5511999998888',
          password: 'mypassword',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject login without identifier', () => {
      const result = loginSchema.safeParse({
        body: {
          identifier: '',
          password: 'SenhaForte123!',
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject login without password', () => {
      const result = loginSchema.safeParse({
        body: {
          identifier: 'user@example.com',
          password: '',
        },
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Auth - Identifier Detection', () => {
  it('should detect CPF identifier', () => {
    expect(detectIdentifierType('529.982.247-25')).toBe('PIX_CPF');
    expect(detectIdentifierType('52998224725')).toBe('PIX_CPF');
  });

  it('should detect email identifier', () => {
    expect(detectIdentifierType('user@example.com')).toBe('PIX_EMAIL');
    expect(detectIdentifierType('test+tag@domain.co.br')).toBe('PIX_EMAIL');
  });

  it('should detect phone identifier', () => {
    expect(detectIdentifierType('+5511999998888')).toBe('PIX_PHONE');
    expect(detectIdentifierType('11999998888')).toBe('PIX_PHONE');
  });

  it('should detect EVP (random key) identifier', () => {
    expect(detectIdentifierType('123e4567-e89b-42d3-a456-426614174000')).toBe('PIX_EVP');
  });

  it('should detect CNPJ identifier', () => {
    expect(detectIdentifierType('11.222.333/0001-81')).toBe('PIX_CNPJ');
    expect(detectIdentifierType('11222333000181')).toBe('PIX_CNPJ');
  });

  it('should return null for unrecognized identifiers', () => {
    expect(detectIdentifierType('random string')).toBeNull();
    expect(detectIdentifierType('12345')).toBeNull();
  });
});

describe('Auth - Identifier Normalization', () => {
  it('should normalize CPF by removing formatting', () => {
    expect(normalizeIdentifier('PIX_CPF', '529.982.247-25')).toBe('52998224725');
  });

  it('should normalize CNPJ by removing formatting', () => {
    expect(normalizeIdentifier('PIX_CNPJ', '11.222.333/0001-81')).toBe('11222333000181');
  });

  it('should normalize email to lowercase', () => {
    expect(normalizeIdentifier('PIX_EMAIL', 'User@Example.COM')).toBe('user@example.com');
  });

  it('should normalize phone with country code', () => {
    const normalized = normalizeIdentifier('PIX_PHONE', '11999998888');
    expect(normalized).toBe('+5511999998888');
  });

  it('should normalize EVP to lowercase', () => {
    expect(normalizeIdentifier('PIX_EVP', '123E4567-E89B-42D3-A456-426614174000'))
      .toBe('123e4567-e89b-42d3-a456-426614174000');
  });
});

describe('Auth - Password Strength Validation', () => {
  it('should require minimum 8 characters', () => {
    const result = signupSchema.safeParse({
      body: {
        fullName: 'Test',
        password: 'Short1!',
        identifiers: [{ type: 'PIX_EMAIL', value: 'a@b.com' }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('should accept 8+ character passwords', () => {
    const result = signupSchema.safeParse({
      body: {
        fullName: 'Test User',
        password: 'Abcdefgh1!',
        identifiers: [{ type: 'PIX_EMAIL', value: 'a@b.com' }],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('Auth - Validation Functions', () => {
  describe('validateCPF', () => {
    it('should validate correct CPFs', () => {
      expect(validateCPF('529.982.247-25')).toBe(true);
      expect(validateCPF('52998224725')).toBe(true);
    });

    it('should reject invalid CPFs', () => {
      expect(validateCPF('111.111.111-11')).toBe(false); // all same digits
      expect(validateCPF('12345678900')).toBe(false); // invalid check digits
      expect(validateCPF('1234')).toBe(false); // too short
    });
  });

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('name+tag@domain.co.br')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
  });

  describe('validateCNPJ', () => {
    it('should validate correct CNPJs', () => {
      expect(validateCNPJ('11222333000181')).toBe(true);
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
    });

    it('should reject invalid CNPJs', () => {
      expect(validateCNPJ('11111111111111')).toBe(false);
      expect(validateCNPJ('12345')).toBe(false);
    });
  });

  describe('validateEVP', () => {
    it('should validate correct UUID v4', () => {
      expect(validateEVP('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    });

    it('should reject non-UUID strings', () => {
      expect(validateEVP('not-a-uuid')).toBe(false);
      expect(validateEVP('123e4567-e89b-12d3-c456-426614174000')).toBe(false); // wrong variant
    });
  });

  describe('normalizePhone', () => {
    it('should add +55 country code for Brazilian phones', () => {
      expect(normalizePhone('11999998888')).toBe('+5511999998888');
      expect(normalizePhone('1199999888')).toBe('+551199999888');
    });

    it('should keep existing +55 country code', () => {
      expect(normalizePhone('+5511999998888')).toBe('+5511999998888');
      expect(normalizePhone('5511999998888')).toBe('+5511999998888');
    });

    it('should throw for invalid phone numbers', () => {
      expect(() => normalizePhone('12345')).toThrow();
    });
  });
});
