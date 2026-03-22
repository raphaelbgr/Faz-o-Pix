import { IdentifierType } from '@prisma/client';
import { cpf, cnpj } from 'cpf-cnpj-validator';

export function validateCPF(cpfValue: string): boolean {
  return cpf.isValid(cpfValue);
}

export function validateCNPJ(cnpjValue: string): boolean {
  return cnpj.isValid(cnpjValue);
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
  
  // Check phone (10-11 digits Brazilian, or with country code) - always return PIX_PHONE for consistency
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    try {
      normalizePhone(identifier);
      return 'PIX_PHONE';
    } catch {
      // Not a valid phone
    }
  }
  
  // Check email - always return PIX_EMAIL for consistency
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
      return cpf.strip(value); // Use library's strip function
    
    case 'PIX_CNPJ':
      return cnpj.strip(value); // Use library's strip function
    
    case 'PIX_PHONE':
      return normalizePhone(value);
    
    case 'PIX_EMAIL':
      return value.toLowerCase().trim();
    
    case 'PIX_EVP':
      return value.toLowerCase();
    
    // Maintain backward compatibility but prefer PIX_ versions
    case 'PHONE':
      return normalizePhone(value);
    
    case 'EMAIL':
      return value.toLowerCase().trim();
    
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
      try {
        normalizePhone(value);
        return true;
      } catch {
        return false;
      }
    
    case 'PIX_EMAIL':
      return validateEmail(value);
    
    case 'PIX_EVP':
      return validateEVP(value);
    
    // Maintain backward compatibility but prefer PIX_ versions
    case 'PHONE':
      try {
        normalizePhone(value);
        return true;
      } catch {
        return false;
      }
    
    case 'EMAIL':
      return validateEmail(value);
    
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

export function maskIdentifier(value: string, type: IdentifierType): string {
  switch (type) {
    case 'PIX_CPF': {
      // 12345678901 -> ***.***.***-01
      const cpf = value.replace(/\D/g, '');
      if (cpf.length === 11) {
        return `***.***.*${cpf.slice(-3)}-${cpf.slice(-2)}`;
      }
      return `***.***.***-${cpf.slice(-2) || '**'}`;
    }
    
    case 'PIX_CNPJ': {
      // 12345678000195 -> **.***.***/****-95
      const cnpj = value.replace(/\D/g, '');
      if (cnpj.length === 14) {
        return `**.***.***/****-${cnpj.slice(-2)}`;
      }
      return `**.***.***/****-${cnpj.slice(-2) || '**'}`;
    }
    
    case 'PIX_EMAIL':
    case 'EMAIL': {
      // usuario@exemplo.com -> u***@exemplo.com
      const [local, domain] = value.split('@');
      if (local && domain) {
        return `${local[0] || ''}***@${domain}`;
      }
      return 'u***@***.***';
    }
    
    case 'PIX_PHONE':
    case 'PHONE': {
      // +5511999887766 -> +55(**) 9****-7766
      const phone = value.replace(/\D/g, '');
      if (phone.length >= 10) {
        const countryCode = phone.startsWith('55') ? '+55' : '+**';
        const lastFour = phone.slice(-4);
        return `${countryCode}(**) ****-${lastFour}`;
      }
      return '+**(**) ****-****';
    }
    
    case 'PIX_EVP': {
      // UUID -> ********-****-****-****-*******ABC12
      if (value.length >= 36) {
        return `********-****-****-****-*******${value.slice(-5)}`;
      }
      return '********-****-****-****-************';
    }
    
    default:
      return '***';
  }
}

export function generateDisplayName(identifierValue: string, identifierType: IdentifierType): string {
  switch (identifierType) {
    case 'PIX_CPF':
      return `CPF ${maskIdentifier(identifierValue, identifierType)}`;
    
    case 'PIX_CNPJ':
      return `CNPJ ${maskIdentifier(identifierValue, identifierType)}`;
    
    case 'PIX_EMAIL':
    case 'EMAIL':
      return maskIdentifier(identifierValue, identifierType);
    
    case 'PIX_PHONE':
    case 'PHONE':
      return maskIdentifier(identifierValue, identifierType);
    
    case 'PIX_EVP':
      return `Chave PIX ${maskIdentifier(identifierValue, identifierType)}`;
    
    default:
      return 'Participante';
  }
}

export async function hashIdentifier(normalizedValue: string): Promise<string> {
  const crypto = await import('crypto');
  const salt = process.env.IDENTIFIER_SALT || 'faz-o-pix-salt-2024';
  
  return crypto
    .createHash('sha256')
    .update(`${salt}:${normalizedValue}`)
    .digest('hex');
}