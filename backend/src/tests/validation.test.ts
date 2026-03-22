import { describe, it, expect } from 'vitest'
import { 
  validateCPF, 
  validateCNPJ, 
  validateEmail, 
  validateEVP, 
  normalizePhone,
  detectIdentifierType,
  normalizeIdentifier,
  validateIdentifier
} from '../utils/validation.js'
import { IdentifierType } from '@prisma/client'

describe('Brazilian Validation Utils', () => {
  describe('validateCPF', () => {
    it('should validate correct CPF', () => {
      expect(validateCPF('11144477735')).toBe(true)
      expect(validateCPF('15435542022')).toBe(true)
    })

    it('should reject invalid CPF', () => {
      expect(validateCPF('12345678901')).toBe(false) // Invalid checksum
      expect(validateCPF('11111111111')).toBe(false) // Same digits
      expect(validateCPF('123456789')).toBe(false)   // Too short
      expect(validateCPF('123456789012')).toBe(false) // Too long
    })

    it('should handle formatted CPF', () => {
      expect(validateCPF('111.444.777-35')).toBe(true)
      expect(validateCPF('123.456.789-01')).toBe(false)
    })
  })

  describe('validateCNPJ', () => {
    it('should validate correct CNPJ', () => {
      expect(validateCNPJ('11222333000181')).toBe(true)
    })

    it('should reject invalid CNPJ', () => {
      expect(validateCNPJ('12345678000100')).toBe(false) // Invalid checksum
      expect(validateCNPJ('11111111111111')).toBe(false) // Same digits
      expect(validateCNPJ('123456789')).toBe(false)      // Too short
    })

    it('should handle formatted CNPJ', () => {
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true)
    })
  })

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('user@')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('validateEVP', () => {
    it('should validate correct UUID v4', () => {
      expect(validateEVP('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(validateEVP('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false) // Not v4
    })

    it('should reject invalid UUIDs', () => {
      expect(validateEVP('invalid-uuid')).toBe(false)
      expect(validateEVP('550e8400-e29b-41d4-a716')).toBe(false) // Incomplete
    })
  })

  describe('normalizePhone', () => {
    it('should normalize Brazilian phone numbers', () => {
      expect(normalizePhone('11999887766')).toBe('+5511999887766')
      expect(normalizePhone('(11) 99988-7766')).toBe('+5511999887766')
      expect(normalizePhone('11 99988-7766')).toBe('+5511999887766')
    })

    it('should handle international format', () => {
      expect(normalizePhone('5511999887766')).toBe('+5511999887766')
      expect(normalizePhone('+5511999887766')).toBe('+5511999887766')
    })

    it('should throw for invalid phone numbers', () => {
      expect(() => normalizePhone('123')).toThrow('Invalid phone number format')
      expect(() => normalizePhone('abc')).toThrow('Invalid phone number format')
    })
  })

  describe('detectIdentifierType', () => {
    it('should detect CPF', () => {
      expect(detectIdentifierType('11144477735')).toBe('PIX_CPF')
      expect(detectIdentifierType('111.444.777-35')).toBe('PIX_CPF')
    })

    it('should detect email', () => {
      expect(detectIdentifierType('user@example.com')).toBe('PIX_EMAIL')
    })

    it('should detect phone', () => {
      expect(detectIdentifierType('11999887766')).toBe('PIX_PHONE')
      expect(detectIdentifierType('(11) 99988-7766')).toBe('PIX_PHONE')
    })

    it('should detect EVP', () => {
      expect(detectIdentifierType('550e8400-e29b-41d4-a716-446655440000')).toBe('PIX_EVP')
    })

    it('should return null for invalid input', () => {
      expect(detectIdentifierType('invalid')).toBe(null)
      expect(detectIdentifierType('')).toBe(null)
    })
  })

  describe('normalizeIdentifier', () => {
    it('should normalize CPF', () => {
      expect(normalizeIdentifier('PIX_CPF', '111.444.777-35')).toBe('11144477735')
    })

    it('should normalize CNPJ', () => {
      expect(normalizeIdentifier('PIX_CNPJ', '11.222.333/0001-81')).toBe('11222333000181')
    })

    it('should normalize phone', () => {
      expect(normalizeIdentifier('PIX_PHONE', '(11) 99988-7766')).toBe('+5511999887766')
    })

    it('should normalize email', () => {
      expect(normalizeIdentifier('PIX_EMAIL', 'USER@EXAMPLE.COM')).toBe('user@example.com')
    })

    it('should normalize EVP', () => {
      expect(normalizeIdentifier('PIX_EVP', 'AAAAAAAA-BBBB-4CCC-9DDD-EEEEEEEEEEEE')).toBe('aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee')
    })
  })

  describe('validateIdentifier', () => {
    it('should validate all identifier types', () => {
      expect(validateIdentifier('PIX_CPF', '11144477735')).toBe(true)
      expect(validateIdentifier('PIX_EMAIL', 'test@example.com')).toBe(true)
      expect(validateIdentifier('PIX_PHONE', '11999887766')).toBe(true)
      expect(validateIdentifier('PIX_EVP', '550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })

    it('should reject invalid identifiers', () => {
      expect(validateIdentifier('PIX_CPF', '12345678901')).toBe(false)
      expect(validateIdentifier('PIX_EMAIL', 'invalid-email')).toBe(false)
      expect(validateIdentifier('PIX_PHONE', '123')).toBe(false)
      expect(validateIdentifier('PIX_EVP', 'invalid-uuid')).toBe(false)
    })
  })
})