import { describe, it, expect } from 'vitest';
import {
  validateCPF,
  validateCNPJ,
  normalizePhone,
  validateEmail,
  validateEVP,
  detectIdentifierType,
  normalizeIdentifier,
  formatCurrency,
  parseCurrency,
  validateIdentifier,
} from './validation';

describe('validateCPF', () => {
  it('should validate correct CPFs', () => {
    expect(validateCPF('529.982.247-25')).toBe(true);
    expect(validateCPF('52998224725')).toBe(true);
    expect(validateCPF('111.444.777-35')).toBe(true);
  });

  it('should reject all-same-digit CPFs', () => {
    expect(validateCPF('111.111.111-11')).toBe(false);
    expect(validateCPF('000.000.000-00')).toBe(false);
  });

  it('should reject wrong length', () => {
    expect(validateCPF('1234567890')).toBe(false);
    expect(validateCPF('123456789012')).toBe(false);
  });

  it('should reject CPFs with wrong check digits', () => {
    expect(validateCPF('52998224726')).toBe(false);
    expect(validateCPF('52998224724')).toBe(false);
  });
});

describe('validateCNPJ', () => {
  it('should validate correct CNPJs', () => {
    expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
    expect(validateCNPJ('11222333000181')).toBe(true);
  });

  it('should reject all-same-digit CNPJs', () => {
    expect(validateCNPJ('11.111.111/1111-11')).toBe(false);
  });

  it('should reject wrong length', () => {
    expect(validateCNPJ('123')).toBe(false);
  });

  it('should reject CNPJs with wrong check digits', () => {
    expect(validateCNPJ('11222333000182')).toBe(false);
  });
});

describe('normalizePhone', () => {
  it('should add +55 for Brazilian phones without country code', () => {
    expect(normalizePhone('11987654321')).toBe('+5511987654321');
    expect(normalizePhone('1198765432')).toBe('+551198765432');
  });

  it('should preserve country code if already present', () => {
    expect(normalizePhone('5511987654321')).toBe('+5511987654321');
  });

  it('should handle formatted phones', () => {
    expect(normalizePhone('(11) 98765-4321')).toBe('+5511987654321');
  });

  it('should throw for invalid phone numbers', () => {
    expect(() => normalizePhone('123')).toThrow('Invalid phone number format');
  });
});

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user+tag@domain.co.br')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });
});

describe('validateEVP', () => {
  it('should accept valid UUID v4', () => {
    expect(validateEVP('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(validateEVP('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('should reject non-UUID strings', () => {
    expect(validateEVP('not-a-uuid')).toBe(false);
    expect(validateEVP('550e8400-e29b-31d4-a716-446655440000')).toBe(false); // v3 not v4
  });
});

describe('detectIdentifierType', () => {
  it('should detect CPF', () => {
    expect(detectIdentifierType('52998224725')).toBe('PIX_CPF');
  });

  it('should detect CNPJ', () => {
    expect(detectIdentifierType('11222333000181')).toBe('PIX_CNPJ');
  });

  it('should detect email', () => {
    expect(detectIdentifierType('user@example.com')).toBe('PIX_EMAIL');
  });

  it('should detect EVP', () => {
    expect(detectIdentifierType('550e8400-e29b-41d4-a716-446655440000')).toBe('PIX_EVP');
  });

  it('should return null for unrecognized', () => {
    expect(detectIdentifierType('random text')).toBeNull();
  });
});

describe('normalizeIdentifier', () => {
  it('should strip non-digits from CPF', () => {
    expect(normalizeIdentifier('PIX_CPF', '529.982.247-25')).toBe('52998224725');
  });

  it('should lowercase email', () => {
    expect(normalizeIdentifier('PIX_EMAIL', 'User@EXAMPLE.com')).toBe('user@example.com');
  });

  it('should normalize phone', () => {
    expect(normalizeIdentifier('PIX_PHONE', '11987654321')).toBe('+5511987654321');
  });

  it('should lowercase EVP', () => {
    expect(normalizeIdentifier('PIX_EVP', '550E8400-E29B-41D4-A716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});

describe('validateIdentifier', () => {
  it('should validate each type correctly', () => {
    expect(validateIdentifier('PIX_CPF', '52998224725')).toBe(true);
    expect(validateIdentifier('PIX_CPF', '00000000000')).toBe(false);
    expect(validateIdentifier('PIX_EMAIL', 'user@example.com')).toBe(true);
    expect(validateIdentifier('PIX_EMAIL', 'invalid')).toBe(false);
    expect(validateIdentifier('PIX_PHONE', '11987654321')).toBe(true);
    expect(validateIdentifier('PIX_EVP', '550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(validateIdentifier('PIX_CNPJ', '11222333000181')).toBe(true);
  });
});

describe('formatCurrency', () => {
  it('should format cents to BRL', () => {
    const result = formatCurrency(12345);
    // Should produce R$ 123,45 in some locale format
    expect(result).toContain('123');
    expect(result).toContain('45');
  });

  it('should handle zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });
});

describe('parseCurrency', () => {
  it('should parse BRL formatted strings to cents', () => {
    expect(parseCurrency('R$ 123,45')).toBe(12345);
    expect(parseCurrency('1.234,56')).toBe(123456);
  });

  it('should throw for invalid values', () => {
    expect(() => parseCurrency('abc')).toThrow('Invalid currency value');
  });
});
