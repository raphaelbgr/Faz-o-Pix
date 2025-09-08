import { z } from 'zod';
import { IdentifierType } from '@prisma/client';
import { validateIdentifier } from '../utils/validation';

export const identifierSchema = z.object({
  type: z.nativeEnum(IdentifierType),
  value: z.string().min(1).max(255),
}).refine(
  (data) => validateIdentifier(data.type, data.value),
  { message: 'Invalid identifier format for the specified type' }
);

export const signupSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(255),
    password: z.string().min(8).max(255),
    identifiers: z.array(identifierSchema).min(1).max(10),
    defaultIdentifier: z.string().optional(),
  }).refine(
    (data) => {
      if (data.defaultIdentifier) {
        return data.identifiers.some(id => id.value === data.defaultIdentifier);
      }
      return true;
    },
    { message: 'Default identifier must be one of the provided identifiers' }
  ),
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1).max(255),
    password: z.string().min(1).max(255),
  }),
});

export type SignupInput = z.infer<typeof signupSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type IdentifierInput = z.infer<typeof identifierSchema>;