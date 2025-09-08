import { IdentifierType } from '@prisma/client';

export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]!) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned[9]!)) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]!) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned[10]!)) return false;
  
  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]!) * weights1[i]!;
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned[12]!)) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]!) * weights2[i]!;
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned[13]!)) return false;
  
  return true;
}

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Brazilian phones
  if (cleaned.startsWith('55')) {
    // Already has country code
    if (cleaned.length === 12 || cleaned.length === 13) {
      return `+${cleaned}`;
    }
  } else if (cleaned.length === 10 || cleaned.length === 11) {
    // Missing country code, add Brazil's
    return `+55${cleaned}`;
  }
  
  // Try to preserve international format if it looks valid
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return `+${cleaned}`;
  }
  
  throw new Error('Invalid phone number format');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validateEVP(evp: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(evp);
}

export function detectIdentifierType(identifier: string): IdentifierType | null {
  const cleaned = identifier.replace(/\D/g, '');
  
  // Check CPF (11 digits)
  if (cleaned.length === 11 && validateCPF(cleaned)) {
    return 'PIX_CPF';
  }
  
  // Check CNPJ (14 digits)
  if (cleaned.length === 14 && validateCNPJ(cleaned)) {
    return 'PIX_CNPJ';
  }
  
  // Check phone (10-11 digits Brazilian, or with country code)
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    try {
      normalizePhone(identifier);
      return 'PIX_PHONE';
    } catch {
      // Not a valid phone
    }
  }
  
  // Check email
  if (identifier.includes('@') && validateEmail(identifier)) {
    return 'PIX_EMAIL';
  }
  
  // Check EVP (UUID v4)
  if (validateEVP(identifier)) {
    return 'PIX_EVP';
  }
  
  return null;
}

export function normalizeIdentifier(type: IdentifierType, value: string): string {
  switch (type) {
    case 'PIX_CPF':
    case 'PIX_CNPJ':
      return value.replace(/\D/g, '');
    
    case 'PIX_PHONE':
    case 'PHONE':
      return normalizePhone(value);
    
    case 'PIX_EMAIL':
    case 'EMAIL':
      return value.toLowerCase().trim();
    
    case 'PIX_EVP':
      return value.toLowerCase();
    
    default:
      return value.trim();
  }
}

export function validateIdentifier(type: IdentifierType, value: string): boolean {
  switch (type) {
    case 'PIX_CPF':
      return validateCPF(value);
    
    case 'PIX_CNPJ':
      return validateCNPJ(value);
    
    case 'PIX_PHONE':
    case 'PHONE':
      try {
        normalizePhone(value);
        return true;
      } catch {
        return false;
      }
    
    case 'PIX_EMAIL':
    case 'EMAIL':
      return validateEmail(value);
    
    case 'PIX_EVP':
      return validateEVP(value);
    
    default:
      return false;
  }
}

export function formatCurrency(cents: number): string {
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,-]/g, '').replace(',', '.');
  const reais = parseFloat(cleaned);
  if (isNaN(reais)) {
    throw new Error('Invalid currency value');
  }
  return Math.round(reais * 100);
}