import { describe, it, expect } from 'vitest';

// Extract the calculateSplitAmounts function logic for testing
// Since it's a module-level function in bills.ts, we recreate it for unit testing
type ShareType = 'EQUAL' | 'PERCENT' | 'SHARES';

function calculateSplitAmounts(
  totalCents: number,
  splits: Array<{
    shareType: ShareType;
    participantId: string;
    shareValue?: number;
  }>
): Array<{
  participantId: string;
  shareType: ShareType;
  shareValue: number;
  amountCents: number;
}> {
  const result: Array<{
    participantId: string;
    shareType: ShareType;
    shareValue: number;
    amountCents: number;
  }> = [];
  let remainingCents = totalCents;

  if (splits[0]?.shareType === 'EQUAL') {
    const equalParticipants = splits.filter(s => s.shareType === 'EQUAL');
    const amountPerPerson = Math.floor(totalCents / equalParticipants.length);
    const remainder = totalCents % equalParticipants.length;

    for (let i = 0; i < equalParticipants.length; i++) {
      const amount = i < remainder ? amountPerPerson + 1 : amountPerPerson;
      result.push({
        participantId: equalParticipants[i]!.participantId,
        shareType: 'EQUAL',
        shareValue: 1,
        amountCents: amount,
      });
      remainingCents -= amount;
    }
  } else if (splits[0]?.shareType === 'PERCENT') {
    for (const split of splits) {
      const amount = Math.round((totalCents * (split.shareValue || 0)) / 100);
      result.push({
        participantId: split.participantId,
        shareType: 'PERCENT',
        shareValue: split.shareValue || 0,
        amountCents: amount,
      });
      remainingCents -= amount;
    }
    if (remainingCents !== 0 && result.length > 0) {
      result[0]!.amountCents += remainingCents;
    }
  } else if (splits[0]?.shareType === 'SHARES') {
    const totalShares = splits.reduce((sum, s) => sum + (s.shareValue || 0), 0);
    for (const split of splits) {
      const amount = Math.round((totalCents * (split.shareValue || 0)) / totalShares);
      result.push({
        participantId: split.participantId,
        shareType: 'SHARES',
        shareValue: split.shareValue || 0,
        amountCents: amount,
      });
      remainingCents -= amount;
    }
    if (remainingCents !== 0 && result.length > 0) {
      result[0]!.amountCents += remainingCents;
    }
  }

  return result;
}

describe('calculateSplitAmounts', () => {
  describe('equal split', () => {
    it('should split evenly between 2 people', () => {
      const result = calculateSplitAmounts(1000, [
        { shareType: 'EQUAL', participantId: 'p1' },
        { shareType: 'EQUAL', participantId: 'p2' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]!.amountCents).toBe(500);
      expect(result[1]!.amountCents).toBe(500);
      expect(result.reduce((sum, r) => sum + r.amountCents, 0)).toBe(1000);
    });

    it('should handle remainder correctly (3 way split of R$10)', () => {
      const result = calculateSplitAmounts(1000, [
        { shareType: 'EQUAL', participantId: 'p1' },
        { shareType: 'EQUAL', participantId: 'p2' },
        { shareType: 'EQUAL', participantId: 'p3' },
      ]);

      // 1000 / 3 = 333 remainder 1
      // First person gets 334, others get 333
      expect(result[0]!.amountCents).toBe(334);
      expect(result[1]!.amountCents).toBe(333);
      expect(result[2]!.amountCents).toBe(333);
      expect(result.reduce((sum, r) => sum + r.amountCents, 0)).toBe(1000);
    });

    it('should handle large remainder (7 way split of R$10)', () => {
      const result = calculateSplitAmounts(1000, [
        { shareType: 'EQUAL', participantId: 'p1' },
        { shareType: 'EQUAL', participantId: 'p2' },
        { shareType: 'EQUAL', participantId: 'p3' },
        { shareType: 'EQUAL', participantId: 'p4' },
        { shareType: 'EQUAL', participantId: 'p5' },
        { shareType: 'EQUAL', participantId: 'p6' },
        { shareType: 'EQUAL', participantId: 'p7' },
      ]);

      // 1000 / 7 = 142 remainder 6
      // First 6 get 143, last gets 142
      expect(result.filter(r => r.amountCents === 143)).toHaveLength(6);
      expect(result.filter(r => r.amountCents === 142)).toHaveLength(1);
      expect(result.reduce((sum, r) => sum + r.amountCents, 0)).toBe(1000);
    });

    it('should handle single person', () => {
      const result = calculateSplitAmounts(1000, [
        { shareType: 'EQUAL', participantId: 'p1' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]!.amountCents).toBe(1000);
    });

    it('should handle 1 cent total', () => {
      const result = calculateSplitAmounts(1, [
        { shareType: 'EQUAL', participantId: 'p1' },
        { shareType: 'EQUAL', participantId: 'p2' },
      ]);

      // 1 cent: first person gets 1, second gets 0
      expect(result[0]!.amountCents).toBe(1);
      expect(result[1]!.amountCents).toBe(0);
      expect(result.reduce((sum, r) => sum + r.amountCents, 0)).toBe(1);
    });
  });

  describe('percentage split', () => {
    it('should split by percentage', () => {
      const result = calculateSplitAmounts(1000, [
        { shareType: 'PERCENT', participantId: 'p1', shareValue: 60 },
        { shareType: 'PERCENT', participantId: 'p2', shareValue: 40 },
      ]);

      expect(result[0]!.amountCents).toBe(600);
      expect(result[1]!.amountCents).toBe(400);
      expect(result.reduce((sum, r) => sum + r.amountCents, 0)).toBe(1000);
    });

    it('should handle rounding and adjust first participant', () => {
      const result = calculateSplitAmounts(1000, [
        { shareType: 'PERCENT', participantId: 'p1', shareValue: 33.33 },
        { shareType: 'PERCENT', participantId: 'p2', shareValue: 33.33 },
        { shareType: 'PERCENT', participantId: 'p3', shareValue: 33.34 },
      ]);

      // Total must equal original amount
      expect(result.reduce((sum, r) => sum + r.amountCents, 0)).toBe(1000);
    });

    it('should handle 100% to one person', () => {
      const result = calculateSplitAmounts(5000, [
        { shareType: 'PERCENT', participantId: 'p1', shareValue: 100 },
      ]);

      expect(result[0]!.amountCents).toBe(5000);
    });
  });

  describe('shares split', () => {
    it('should split proportionally by shares', () => {
      const result = calculateSplitAmounts(1000, [
        { shareType: 'SHARES', participantId: 'p1', shareValue: 2 },
        { shareType: 'SHARES', participantId: 'p2', shareValue: 1 },
      ]);

      // 2/3 and 1/3 of 1000
      expect(result[0]!.amountCents).toBe(667);
      expect(result[1]!.amountCents).toBe(333);
      expect(result.reduce((sum, r) => sum + r.amountCents, 0)).toBe(1000);
    });

    it('should handle equal shares', () => {
      const result = calculateSplitAmounts(1000, [
        { shareType: 'SHARES', participantId: 'p1', shareValue: 1 },
        { shareType: 'SHARES', participantId: 'p2', shareValue: 1 },
        { shareType: 'SHARES', participantId: 'p3', shareValue: 1 },
      ]);

      expect(result.reduce((sum, r) => sum + r.amountCents, 0)).toBe(1000);
    });

    it('should handle large share ratios', () => {
      const result = calculateSplitAmounts(10000, [
        { shareType: 'SHARES', participantId: 'p1', shareValue: 10 },
        { shareType: 'SHARES', participantId: 'p2', shareValue: 5 },
        { shareType: 'SHARES', participantId: 'p3', shareValue: 1 },
      ]);

      // 10/16 = 6250, 5/16 = 3125, 1/16 = 625
      expect(result[0]!.amountCents).toBe(6250);
      expect(result[1]!.amountCents).toBe(3125);
      expect(result[2]!.amountCents).toBe(625);
      expect(result.reduce((sum, r) => sum + r.amountCents, 0)).toBe(10000);
    });
  });
});
