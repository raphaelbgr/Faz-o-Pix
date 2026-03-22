import { z } from 'zod';

// Base split schema for common fields
const baseSplitSchema = z.object({
  participantId: z.string().uuid('ID do participante deve ser um UUID válido')
});

// Equal split (no additional fields needed)
const equalSplitSchema = baseSplitSchema;

// Percentage split
const percentageSplitSchema = baseSplitSchema.extend({
  percentage: z.number()
    .min(0.01, 'Percentual deve ser maior que 0%')
    .max(100, 'Percentual deve ser no máximo 100%')
    .refine(
      (val) => Number.parseFloat(val.toFixed(2)) === val,
      'Percentual deve ter no máximo 2 casas decimais'
    )
});

// Shares split
const sharesSplitSchema = baseSplitSchema.extend({
  shares: z.number()
    .int('Partes devem ser números inteiros')
    .min(1, 'Partes devem ser pelo menos 1')
    .max(1000, 'Partes devem ser no máximo 1000')
});

// Create expense request schema
export const createExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID da conta deve ser um UUID válido')
  }),
  body: z.discriminatedUnion('splitType', [
    // Equal split
    z.object({
      payerParticipantId: z.string().uuid('ID do pagador deve ser um UUID válido').optional(),
      amountCents: z.number()
        .int('Valor deve ser um número inteiro de centavos')
        .min(1, 'Valor deve ser maior que zero')
        .max(100000000, 'Valor muito alto. Máximo: R$ 1.000.000,00'), // R$ 1M limit
      description: z.string()
        .min(1, 'Descrição é obrigatória')
        .max(200, 'Descrição deve ter no máximo 200 caracteres')
        .trim(),
      spentAt: z.string()
        .datetime('Data deve estar no formato ISO 8601')
        .refine((date) => {
          const spentDate = new Date(date);
          const now = new Date();
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(now.getFullYear() - 2);
          
          return spentDate <= now && spentDate >= twoYearsAgo;
        }, 'Data deve ser entre hoje e 2 anos atrás'),
      splitType: z.literal('equal'),
      splits: z.array(equalSplitSchema)
        .min(1, 'Pelo menos um participante deve ser incluído')
        .max(50, 'Máximo 50 participantes por despesa')
        .refine(
          (splits) => {
            const uniqueIds = new Set(splits.map(s => s.participantId));
            return uniqueIds.size === splits.length;
          },
          'Participantes duplicados encontrados'
        )
    }),
    
    // Percentage split
    z.object({
      payerParticipantId: z.string().uuid('ID do pagador deve ser um UUID válido').optional(),
      amountCents: z.number()
        .int('Valor deve ser um número inteiro de centavos')
        .min(1, 'Valor deve ser maior que zero')
        .max(100000000, 'Valor muito alto. Máximo: R$ 1.000.000,00'),
      description: z.string()
        .min(1, 'Descrição é obrigatória')
        .max(200, 'Descrição deve ter no máximo 200 caracteres')
        .trim(),
      spentAt: z.string()
        .datetime('Data deve estar no formato ISO 8601')
        .refine((date) => {
          const spentDate = new Date(date);
          const now = new Date();
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(now.getFullYear() - 2);
          
          return spentDate <= now && spentDate >= twoYearsAgo;
        }, 'Data deve ser entre hoje e 2 anos atrás'),
      splitType: z.literal('percentage'),
      splits: z.array(percentageSplitSchema)
        .min(1, 'Pelo menos um participante deve ser incluído')
        .max(50, 'Máximo 50 participantes por despesa')
        .refine(
          (splits) => {
            const uniqueIds = new Set(splits.map(s => s.participantId));
            return uniqueIds.size === splits.length;
          },
          'Participantes duplicados encontrados'
        )
        .refine(
          (splits) => {
            const total = splits.reduce((sum, split) => sum + split.percentage, 0);
            return Math.abs(total - 100) < 0.01; // Allow 0.01% tolerance
          },
          'Percentuais devem somar exatamente 100%'
        )
    }),
    
    // Shares split
    z.object({
      payerParticipantId: z.string().uuid('ID do pagador deve ser um UUID válido').optional(),
      amountCents: z.number()
        .int('Valor deve ser um número inteiro de centavos')
        .min(1, 'Valor deve ser maior que zero')
        .max(100000000, 'Valor muito alto. Máximo: R$ 1.000.000,00'),
      description: z.string()
        .min(1, 'Descrição é obrigatória')
        .max(200, 'Descrição deve ter no máximo 200 caracteres')
        .trim(),
      spentAt: z.string()
        .datetime('Data deve estar no formato ISO 8601')
        .refine((date) => {
          const spentDate = new Date(date);
          const now = new Date();
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(now.getFullYear() - 2);
          
          return spentDate <= now && spentDate >= twoYearsAgo;
        }, 'Data deve ser entre hoje e 2 anos atrás'),
      splitType: z.literal('shares'),
      splits: z.array(sharesSplitSchema)
        .min(1, 'Pelo menos um participante deve ser incluído')
        .max(50, 'Máximo 50 participantes por despesa')
        .refine(
          (splits) => {
            const uniqueIds = new Set(splits.map(s => s.participantId));
            return uniqueIds.size === splits.length;
          },
          'Participantes duplicados encontrados'
        )
    })
  ])
});

// Additional custom validation for business rules
export const validateExpenseBusinessRules = z.object({
  body: z.object({
    payerParticipantId: z.string().optional(),
    splits: z.array(z.object({
      participantId: z.string()
    }))
  })
});

// Response schema
export const expenseResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    expenseId: z.string().uuid(),
    totalAmount: z.number().int(),
    splits: z.array(z.object({
      participantId: z.string().uuid(),
      participantName: z.string(),
      amountCents: z.number().int(),
      percentage: z.number().optional(),
      shares: z.number().optional()
    })),
    balanceImpact: z.array(z.object({
      participantId: z.string().uuid(),
      participantName: z.string(),
      balanceChange: z.number().int()
    }))
  })
});

// TypeScript types
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateExpenseBody = CreateExpenseInput['body'];
export type CreateExpenseParams = CreateExpenseInput['params'];
export type ExpenseResponse = z.infer<typeof expenseResponseSchema>;

// Error response schemas
export const validationErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('VALIDATION_ERROR'),
    message: z.string(),
    details: z.record(z.any()).optional()
  })
});

export const businessRuleErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      'INSUFFICIENT_PERMISSIONS',
      'INVALID_PAYER',
      'INVALID_PARTICIPANTS',
      'PAYER_NOT_IN_SPLITS',
      'SPLIT_CALCULATION_ERROR'
    ]),
    message: z.string(),
    details: z.record(z.any()).optional()
  })
});

export type ValidationError = z.infer<typeof validationErrorSchema>;
export type BusinessRuleError = z.infer<typeof businessRuleErrorSchema>;