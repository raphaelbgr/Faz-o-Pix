import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  parseCurrency,
  maskIdentifier,
  generateDisplayName,
  hashIdentifier,
  normalizePhone,
  validateEmail,
  validateEVP,
} from '../utils/validation'

describe('Currency Formatting', () => {
  it('should format zero cents', () => {
    expect(formatCurrency(0)).toBe('R$\u00a00,00')
  })

  it('should format single cent', () => {
    expect(formatCurrency(1)).toBe('R$\u00a00,01')
  })

  it('should format R$1.00', () => {
    expect(formatCurrency(100)).toBe('R$\u00a01,00')
  })

  it('should format with thousands separator', () => {
    const result = formatCurrency(123456789)
    expect(result).toContain('1.234.567')
    expect(result).toContain(',89')
  })

  it('should format negative amounts', () => {
    const result = formatCurrency(-5000)
    expect(result).toContain('50,00')
    expect(result).toContain('-')
  })
})

describe('Currency Parsing', () => {
  it('should parse R$ format', () => {
    expect(parseCurrency('R$ 1.234,56')).toBe(123456)
  })

  it('should parse simple decimal', () => {
    expect(parseCurrency('10,50')).toBe(1050)
  })

  it('should parse integer without decimals', () => {
    expect(parseCurrency('100')).toBe(10000)
  })

  it('should throw for empty string', () => {
    expect(() => parseCurrency('')).toThrow('Invalid currency value')
  })

  it('should throw for non-numeric', () => {
    expect(() => parseCurrency('abc')).toThrow('Invalid currency value')
  })

  it('should round to nearest cent', () => {
    expect(parseCurrency('10,555')).toBe(1056) // rounds
  })
})

describe('Identifier Masking', () => {
  it('should mask CPF showing last 3 digits and check digit', () => {
    const masked = maskIdentifier('12345678901', 'PIX_CPF')
    expect(masked).toContain('***')
    expect(masked).toContain('01')
  })

  it('should mask CNPJ showing last 2 digits', () => {
    const masked = maskIdentifier('12345678000195', 'PIX_CNPJ')
    expect(masked).toContain('***')
    expect(masked).toContain('95')
  })

  it('should mask email preserving first char and domain', () => {
    const masked = maskIdentifier('joao@example.com', 'PIX_EMAIL')
    expect(masked).toBe('j***@example.com')
  })

  it('should mask email with single char local part', () => {
    const masked = maskIdentifier('a@b.com', 'PIX_EMAIL')
    expect(masked).toBe('a***@b.com')
  })

  it('should mask phone showing last 4 digits', () => {
    const masked = maskIdentifier('+5511999887766', 'PIX_PHONE')
    expect(masked).toContain('7766')
    expect(masked).toContain('+55')
  })

  it('should mask EVP showing last 5 chars', () => {
    const evp = '550e8400-e29b-41d4-a716-446655440000'
    const masked = maskIdentifier(evp, 'PIX_EVP')
    expect(masked).toContain('40000')
    expect(masked).toContain('****')
  })

  it('should handle unknown type', () => {
    const masked = maskIdentifier('something', 'UNKNOWN' as any)
    expect(masked).toBe('***')
  })
})

describe('Display Name Generation', () => {
  it('should generate CPF display name', () => {
    const name = generateDisplayName('12345678901', 'PIX_CPF')
    expect(name).toContain('CPF')
    expect(name).toContain('***')
  })

  it('should generate CNPJ display name', () => {
    const name = generateDisplayName('12345678000195', 'PIX_CNPJ')
    expect(name).toContain('CNPJ')
  })

  it('should generate email display name (masked)', () => {
    const name = generateDisplayName('maria@test.com', 'PIX_EMAIL')
    expect(name).toBe('m***@test.com')
  })

  it('should generate EVP display name', () => {
    const name = generateDisplayName('550e8400-e29b-41d4-a716-446655440000', 'PIX_EVP')
    expect(name).toContain('Chave PIX')
  })

  it('should return default for unknown type', () => {
    const name = generateDisplayName('test', 'UNKNOWN' as any)
    expect(name).toBe('Participante')
  })
})

describe('Hash Identifier', () => {
  it('should produce consistent hashes', async () => {
    const hash1 = await hashIdentifier('test@example.com')
    const hash2 = await hashIdentifier('test@example.com')
    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different inputs', async () => {
    const hash1 = await hashIdentifier('a@example.com')
    const hash2 = await hashIdentifier('b@example.com')
    expect(hash1).not.toBe(hash2)
  })

  it('should return hex string of 64 chars (SHA-256)', async () => {
    const hash = await hashIdentifier('12345678901')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('Phone Normalization Edge Cases', () => {
  it('should handle phone with +55 prefix', () => {
    expect(normalizePhone('+5511999887766')).toBe('+5511999887766')
  })

  it('should add +55 to 11-digit number', () => {
    expect(normalizePhone('11999887766')).toBe('+5511999887766')
  })

  it('should add +55 to 10-digit landline', () => {
    expect(normalizePhone('1133334444')).toBe('+551133334444')
  })

  it('should handle number with formatting', () => {
    expect(normalizePhone('(11) 99988-7766')).toBe('+5511999887766')
  })

  it('should throw for too-short number', () => {
    expect(() => normalizePhone('123')).toThrow('Invalid phone number format')
  })
})

describe('Email Validation Edge Cases', () => {
  it('should accept standard email', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('should reject email without @', () => {
    expect(validateEmail('userexample.com')).toBe(false)
  })

  it('should reject email with spaces', () => {
    expect(validateEmail('user @example.com')).toBe(false)
  })

  it('should reject email exceeding 254 chars', () => {
    const longLocal = 'a'.repeat(250)
    expect(validateEmail(`${longLocal}@b.com`)).toBe(false)
  })

  it('should accept email with subdomain', () => {
    expect(validateEmail('user@sub.domain.com')).toBe(true)
  })
})

describe('EVP Validation Edge Cases', () => {
  it('should accept valid UUID v4', () => {
    expect(validateEVP('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('should reject UUID v1 (wrong version digit)', () => {
    expect(validateEVP('550e8400-e29b-11d4-a716-446655440000')).toBe(false)
  })

  it('should reject short string', () => {
    expect(validateEVP('550e8400')).toBe(false)
  })

  it('should be case insensitive', () => {
    expect(validateEVP('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })
})
