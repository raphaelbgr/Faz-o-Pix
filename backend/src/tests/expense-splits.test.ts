import { describe, it, expect } from 'vitest'
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
} from '../services/expenseService'

describe('Expense Split Calculations', () => {
  describe('calculateEqualSplit', () => {
    it('should split evenly between 2 people', () => {
      const splits = calculateEqualSplit(10000, ['a', 'b'])
      expect(splits).toHaveLength(2)
      expect(splits[0]!.amountCents).toBe(5000)
      expect(splits[1]!.amountCents).toBe(5000)
      expect(splits.reduce((s, x) => s + x.amountCents, 0)).toBe(10000)
    })

    it('should handle remainder (R$100 / 3 = 3334 + 3333 + 3333)', () => {
      const splits = calculateEqualSplit(10000, ['a', 'b', 'c'])
      expect(splits).toHaveLength(3)
      // First gets the extra cent
      expect(splits[0]!.amountCents).toBe(3334)
      expect(splits[1]!.amountCents).toBe(3333)
      expect(splits[2]!.amountCents).toBe(3333)
      expect(splits.reduce((s, x) => s + x.amountCents, 0)).toBe(10000)
    })

    it('should handle R$1 split 3 ways (1 + 0 + 0)', () => {
      const splits = calculateEqualSplit(1, ['a', 'b', 'c'])
      expect(splits[0]!.amountCents).toBe(1)
      expect(splits[1]!.amountCents).toBe(0)
      expect(splits[2]!.amountCents).toBe(0)
      expect(splits.reduce((s, x) => s + x.amountCents, 0)).toBe(1)
    })

    it('should handle R$2 split 3 ways (1 + 1 + 0)', () => {
      const splits = calculateEqualSplit(2, ['a', 'b', 'c'])
      expect(splits[0]!.amountCents).toBe(1)
      expect(splits[1]!.amountCents).toBe(1)
      expect(splits[2]!.amountCents).toBe(0)
      expect(splits.reduce((s, x) => s + x.amountCents, 0)).toBe(2)
    })

    it('should handle single participant', () => {
      const splits = calculateEqualSplit(10000, ['a'])
      expect(splits).toHaveLength(1)
      expect(splits[0]!.amountCents).toBe(10000)
    })

    it('should handle large amount split many ways', () => {
      const ids = Array.from({ length: 50 }, (_, i) => `p${i}`)
      const splits = calculateEqualSplit(99999, ids)
      expect(splits).toHaveLength(50)
      expect(splits.reduce((s, x) => s + x.amountCents, 0)).toBe(99999)
    })

    it('should throw for empty participants', () => {
      expect(() => calculateEqualSplit(10000, [])).toThrow('At least one participant')
    })

    it('should throw for zero amount', () => {
      expect(() => calculateEqualSplit(0, ['a'])).toThrow('Total amount must be positive')
    })

    it('should throw for negative amount', () => {
      expect(() => calculateEqualSplit(-100, ['a'])).toThrow('Total amount must be positive')
    })
  })

  describe('calculatePercentageSplit', () => {
    it('should split 50/50', () => {
      const splits = calculatePercentageSplit(10000, [
        { participantId: 'a', percentage: 50 },
        { participantId: 'b', percentage: 50 },
      ])
      expect(splits[0]!.amountCents).toBe(5000)
      expect(splits[1]!.amountCents).toBe(5000)
      expect(splits.reduce((s, x) => s + x.amountCents, 0)).toBe(10000)
    })

    it('should split 70/30', () => {
      const splits = calculatePercentageSplit(10000, [
        { participantId: 'a', percentage: 70 },
        { participantId: 'b', percentage: 30 },
      ])
      expect(splits[0]!.amountCents).toBe(7000)
      expect(splits[1]!.amountCents).toBe(3000)
    })

    it('should handle rounding (33.33% + 33.33% + 33.34%)', () => {
      const splits = calculatePercentageSplit(10000, [
        { participantId: 'a', percentage: 33.33 },
        { participantId: 'b', percentage: 33.33 },
        { participantId: 'c', percentage: 33.34 },
      ])
      // Last participant gets the remainder to ensure exact total
      expect(splits.reduce((s, x) => s + x.amountCents, 0)).toBe(10000)
    })

    it('should throw if percentages dont sum to 100', () => {
      expect(() => calculatePercentageSplit(10000, [
        { participantId: 'a', percentage: 50 },
        { participantId: 'b', percentage: 40 },
      ])).toThrow('must sum to 100%')
    })

    it('should throw for zero percentage', () => {
      expect(() => calculatePercentageSplit(10000, [
        { participantId: 'a', percentage: 0 },
        { participantId: 'b', percentage: 100 },
      ])).toThrow('between 0% and 100%')
    })

    it('should throw for negative percentage', () => {
      expect(() => calculatePercentageSplit(10000, [
        { participantId: 'a', percentage: -10 },
        { participantId: 'b', percentage: 110 },
      ])).toThrow('between 0% and 100%')
    })

    it('should handle single participant at 100%', () => {
      const splits = calculatePercentageSplit(10000, [
        { participantId: 'a', percentage: 100 },
      ])
      expect(splits[0]!.amountCents).toBe(10000)
    })

    it('should handle small amounts with rounding', () => {
      const splits = calculatePercentageSplit(1, [
        { participantId: 'a', percentage: 50 },
        { participantId: 'b', percentage: 50 },
      ])
      // 1 cent can't split evenly - last person gets remainder
      expect(splits.reduce((s, x) => s + x.amountCents, 0)).toBe(1)
    })
  })

  describe('calculateSharesSplit', () => {
    it('should split equally with equal shares', () => {
      const splits = calculateSharesSplit(10000, [
        { participantId: 'a', shares: 1 },
        { participantId: 'b', shares: 1 },
      ])
      expect(splits[0]!.amountCents).toBe(5000)
      expect(splits[1]!.amountCents).toBe(5000)
    })

    it('should split 2:1 ratio', () => {
      const splits = calculateSharesSplit(9000, [
        { participantId: 'a', shares: 2 },
        { participantId: 'b', shares: 1 },
      ])
      expect(splits[0]!.amountCents).toBe(6000)
      expect(splits[1]!.amountCents).toBe(3000)
    })

    it('should handle uneven ratio with rounding', () => {
      const splits = calculateSharesSplit(10000, [
        { participantId: 'a', shares: 1 },
        { participantId: 'b', shares: 1 },
        { participantId: 'c', shares: 1 },
      ])
      expect(splits.reduce((s, x) => s + x.amountCents, 0)).toBe(10000)
    })

    it('should handle large share values', () => {
      const splits = calculateSharesSplit(10000, [
        { participantId: 'a', shares: 100 },
        { participantId: 'b', shares: 200 },
        { participantId: 'c', shares: 700 },
      ])
      expect(splits.reduce((s, x) => s + x.amountCents, 0)).toBe(10000)
      // 700/1000 of 10000 = 7000
      expect(splits[2]!.amountCents).toBe(7000)
    })

    it('should throw for zero shares', () => {
      expect(() => calculateSharesSplit(10000, [
        { participantId: 'a', shares: 0 },
        { participantId: 'b', shares: 1 },
      ])).toThrow('positive integers')
    })

    it('should throw for negative shares', () => {
      expect(() => calculateSharesSplit(10000, [
        { participantId: 'a', shares: -1 },
        { participantId: 'b', shares: 1 },
      ])).toThrow('positive integers')
    })

    it('should throw for fractional shares', () => {
      expect(() => calculateSharesSplit(10000, [
        { participantId: 'a', shares: 1.5 },
        { participantId: 'b', shares: 1 },
      ])).toThrow('positive integers')
    })

    it('should handle single participant', () => {
      const splits = calculateSharesSplit(10000, [
        { participantId: 'a', shares: 5 },
      ])
      expect(splits[0]!.amountCents).toBe(10000)
    })
  })

  describe('Mathematical Invariants', () => {
    it('equal split always sums to total for any amount and count', () => {
      for (let amount = 1; amount <= 100; amount++) {
        for (let count = 1; count <= 10; count++) {
          const ids = Array.from({ length: count }, (_, i) => `p${i}`)
          const splits = calculateEqualSplit(amount, ids)
          const total = splits.reduce((s, x) => s + x.amountCents, 0)
          expect(total).toBe(amount)
        }
      }
    })

    it('no split amount is negative in equal splits', () => {
      for (let amount = 1; amount <= 50; amount++) {
        for (let count = 1; count <= 20; count++) {
          const ids = Array.from({ length: count }, (_, i) => `p${i}`)
          const splits = calculateEqualSplit(amount, ids)
          for (const split of splits) {
            expect(split.amountCents).toBeGreaterThanOrEqual(0)
          }
        }
      }
    })
  })
})
