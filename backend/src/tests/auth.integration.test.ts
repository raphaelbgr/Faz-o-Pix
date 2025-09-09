import { describe, it, expect } from 'vitest'
import { validateCPF, validateCNPJ, validateEmail, detectIdentifierType, normalizeIdentifier } from '../utils/validation.js'

describe('Epic 1 - Authentication Integration', () => {
  describe('Brazilian Identifier Validation', () => {
    it('should validate real CPF correctly', () => {
      expect(validateCPF('11144477735')).toBe(true)
      expect(validateCPF('12345678900')).toBe(false) // Invalid checksum
      expect(validateCPF('111.444.777-35')).toBe(true) // Formatted
    })

    it('should validate CNPJ correctly', () => {
      expect(validateCNPJ('11222333000181')).toBe(true)
      expect(validateCNPJ('12345678000100')).toBe(false) // Invalid
    })

    it('should validate email correctly', () => {
      expect(validateEmail('user@example.com')).toBe(true)
      expect(validateEmail('invalid-email')).toBe(false)
    })

    it('should detect identifier types correctly', () => {
      expect(detectIdentifierType('11144477735')).toBe('PIX_CPF')
      expect(detectIdentifierType('user@example.com')).toBe('PIX_EMAIL')
      expect(detectIdentifierType('11999887766')).toBe('PIX_PHONE')
    })

    it('should normalize identifiers correctly', () => {
      expect(normalizeIdentifier('PIX_CPF', '111.444.777-35')).toBe('11144477735')
      expect(normalizeIdentifier('PIX_EMAIL', 'USER@EXAMPLE.COM')).toBe('user@example.com')
    })
  })

  describe('Authentication Flow Core', () => {
    it('should handle authentication workflow requirements', () => {
      // Test that we can validate and normalize all Brazilian identifier types
      const testCases = [
        { type: 'PIX_CPF', value: '11144477735', expected: true },
        { type: 'PIX_EMAIL', value: 'test@example.com', expected: true },
        { type: 'PIX_PHONE', value: '11999887766', expected: true },
        { type: 'PIX_EVP', value: '550e8400-e29b-41d4-a716-446655440000', expected: true },
      ]

      testCases.forEach(testCase => {
        const isValid = detectIdentifierType(testCase.value) === testCase.type
        expect(isValid).toBe(testCase.expected)
      })
    })

    it('should reject invalid identifiers', () => {
      expect(validateCPF('12345678900')).toBe(false) // Invalid checksum
      expect(validateEmail('invalid')).toBe(false)
      expect(detectIdentifierType('invalid')).toBe(null)
    })
  })
})