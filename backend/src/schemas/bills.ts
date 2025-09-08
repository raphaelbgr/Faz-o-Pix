import { z } from 'zod';
import { IdentifierType, ShareType, SettlementMethod } from '@prisma/client';
import { validateIdentifier } from '../utils/validation';

export const createBillSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    simplifyDebts: z.boolean().optional().default(false),
  }),
});

export const addMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    identifierType: z.nativeEnum(IdentifierType),
    identifierValue: z.string().min(1).max(255),
    displayName: z.string().min(1).max(255).optional(),
  }).refine(
    (data) => validateIdentifier(data.identifierType, data.identifierValue),
    { message: 'Invalid identifier format for the specified type' }
  ),
});

export const splitSchema = z.discriminatedUnion('shareType', [
  z.object({
    shareType: z.literal(ShareType.EQUAL),
    participantId: z.string().uuid(),
  }),
  z.object({
    shareType: z.literal(ShareType.PERCENT),
    participantId: z.string().uuid(),
    shareValue: z.number().min(0).max(100),
  }),
  z.object({
    shareType: z.literal(ShareType.SHARES),
    participantId: z.string().uuid(),
    shareValue: z.number().positive(),
  }),
]);

export const addExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    payerParticipantId: z.string().uuid(),
    amountCents: z.number().int().positive(),
    description: z.string().max(1000).optional(),
    spentAt: z.string().datetime().or(z.date()).transform(val => new Date(val)),
    splits: z.array(splitSchema).min(1),
  }).refine(
    (data) => {
      // For percentage splits, ensure they sum to 100
      const percentSplits = data.splits.filter(s => s.shareType === ShareType.PERCENT);
      if (percentSplits.length > 0) {
        const totalPercent = percentSplits.reduce((sum, split) => {
          return sum + (split.shareType === ShareType.PERCENT ? split.shareValue : 0);
        }, 0);
        return Math.abs(totalPercent - 100) < 0.01; // Allow small floating point errors
      }
      return true;
    },
    { message: 'Percentage splits must sum to 100%' }
  ),
});

export const recordSettlementSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    fromParticipantId: z.string().uuid(),
    toParticipantId: z.string().uuid(),
    amountCents: z.number().int().positive(),
    method: z.nativeEnum(SettlementMethod),
    reference: z.string().max(255).optional(),
    note: z.string().max(1000).optional(),
  }),
});

export const getBillSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getBalancesSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export type CreateBillInput = z.infer<typeof createBillSchema>['body'];
export type AddMemberInput = z.infer<typeof addMemberSchema>['body'];
export type AddExpenseInput = z.infer<typeof addExpenseSchema>['body'];
export type RecordSettlementInput = z.infer<typeof recordSettlementSchema>['body'];
export type SplitInput = z.infer<typeof splitSchema>;